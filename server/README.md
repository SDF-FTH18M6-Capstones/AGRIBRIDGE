# AgriBridge V1 API

Python 3.12, Flask, SQLAlchemy and Neon PostgreSQL. Existing secrets and Neon
connection details stay in `server/.env`; do not replace them with test settings.
Use `postgresql+psycopg://...?...sslmode=require` for the Psycopg 3 driver.

## Start V1

```sh
cd server
source .venv/bin/activate
pip install -r requirements.txt
flask --app run.py db current
flask --app run.py db upgrade
python run.py
```

`db upgrade` changes the database selected by `DATABASE_URL`. Back up the intended
Neon branch before applying it. The current revision is `c34f6a0db003` (Paystack checkout), following
`b23e5f9ca002` (V1 lifecycle) and `a12d4e8b9001`; its code was tested on disposable SQLite and PostgreSQL databases.
It has not been applied automatically to your Neon data.

If an old database was created using `create_all()` without Alembic tracking,
inspect its schema before stamping a revision. Do not stamp an unknown schema.
Migrations preserve products/orders and backfill product name/unit snapshots from
existing records. Legacy paid orders enter the V1 paid state. Existing pending and
confirmed orders receive initial 12-hour/2-hour deadlines when V1 is migrated.

Run the worker in a second backend terminal (required even when no browser is open):

```sh
cd server
source .venv/bin/activate
flask --app run.py v1-worker
```

For one batch use `flask --app run.py v1-worker --once`. The loop reconciles known
pending provider requests, expires due orders and delivers notification emails.
`WORKER_INTERVAL_SECONDS` defaults to 30. Deploy it as a supervised process; adapt
`v1-worker.service.example` to your installation. Multiple PostgreSQL workers use
row locks/skip-locked processing. Monitor worker logs and restart failures.

Start the frontend in a third terminal using `npm run dev` in `client`.
The Node SSR server renders product pages and proxies `/api/*` to Flask.
See `../client/README.md` for production commands.

## Account and trading rules

- Registration creates a general account and returns a login session. The frontend
  opens the marketplace. The legacy registration role input does not grant access.
- Buyer details immediately enable purchasing. Farmer details start a separate
  verification journey: request -> assigned officer -> report -> admin decision.
- A rejected farmer sees feedback and can correct/reapply. An approved farmer can
  sell. Changing farm name/location requires verification again. Suspension blocks
  new sales while preserving existing transaction records for resolution.
- Buyer/farmer capabilities coexist; saving either profile does not replace the
  other. Staff roles remain independently controlled. Backend checks are authoritative.
- An order snapshots its product name/unit/price. It reserves stock and starts
  pending. A farmer can confirm or reject with a reason; payment is blocked first.
- Confirmation starts the payment deadline. Active admins configure new windows
  under Marketplace settings (defaults 12h and 2h); existing deadlines do not change.
- A cart creates a separate order per farmer, atomically. Retrying a checkout key
  returns its existing orders without reserving stock twice. Self-purchase is blocked.
- Rejection, eligible cancellation and expiry release stock exactly once. The worker
  must reconcile an uncertain remote charge before releasing its stock reservation.
- Provider-verified payment moves an order to paid. Only the buyer confirms receipt,
  which moves it to completed and enables a review. Delivery and collection management
  are deferred; this receipt confirmation does not schedule or track fulfilment.

## Payments and exceptions

V1 uses **Paystack hosted checkout in test mode**, in KES. Keep the existing Neon
`DATABASE_URL`, application secrets and SMTP settings. Add these to `server/.env`:

```dotenv
PAYSTACK_SECRET_KEY=sk_test_REPLACE_WITH_YOUR_TEST_SECRET
PAYSTACK_CALLBACK_URL=http://localhost:5173/buyer/payments
# Only when using the modern Paystack-Signature scheme:
PAYSTACK_WEBHOOK_SECRET=whsec_REPLACE_WITH_YOUR_SIGNING_SECRET
```

Get the test secret key from your Kenyan Paystack account's test-mode API settings.
Do not put it in frontend variables or commit it. No frontend public key is needed
for this server-initialized hosted checkout. Restart both Flask and the worker after
changing configuration. Daraja keys, shortcodes and passkeys are no longer used.
The callback hostname must match the frontend you logged into: if using
`http://127.0.0.1:5173`, use that in `PAYSTACK_CALLBACK_URL` too. Set the HTTPS
frontend callback URL when deploying.

Run `flask --app run.py db upgrade` against your intended database to add the
nullable checkout URL column. This preserves historical payments. An unstarted
legacy attempt switches to Paystack when initiated; an already started legacy
provider attempt requires merchant review and cannot be reinterpreted as Paystack.

In the Paystack dashboard's **test-mode** settings, set the webhook URL to
`https://YOUR-PUBLIC-API/api/payments/paystack/webhook`. For local webhook testing,
expose backend port 5000 using an HTTPS tunnel, e.g. `ngrok http 5000`, and use its
HTTPS origin in this webhook URL. The browser return can still point to localhost.
Webhooks are optional for local checkout testing: the running worker and the
buyer's Check Paystack status action can independently verify payments.

- `GET /api/payments/availability`: authenticated test-configuration readiness.
  This does not validate the key with Paystack or check merchant KES eligibility.
- `POST /api/payments`: pending attempt for an owned, farmer-confirmed order.
  Send `payment_method: "paystack"` and the exact stored order total.
- `POST /api/payments/:id/initiate`: empty JSON object `{}`. Returns a hosted
  `authorization_url`; repeated calls resume that same checkout without creating
  another transaction. No phone number is required by AgriBridge.
- `POST /api/payments/:id/reconcile`: server verifies the saved reference with
  Paystack, matching amount in minor units, KES currency, test domain and buyer email.
- `POST /api/payments/paystack/webhook`: validates signatures against raw bytes.
  Modern signatures use the signing secret and a 300-second timestamp window;
  legacy signatures use HMAC-SHA512 with the API secret. Invalid modern signatures
  cannot fall back to legacy validation. Valid events are acknowledged promptly;
  the durable pending-reference worker queue independently verifies settlement.
- A browser return/query string, webhook payload or pending record cannot mark an
  order paid. Repeated verification does not duplicate order changes/notifications.

The provider amount comes from the stored order. Amounts such as KSh 100.50 are
supported by conversion to 10050 minor units; each farmer's total must be at least
KSh 3.00. Smaller totals are rejected before stock is reserved.

A transport timeout keeps the same server-generated reference and inventory
reservation. Use Check Paystack status or admin reconciliation, rather than starting
another charge. If Paystack has no matching record or the verification fields do
not match, the attempt remains pending for merchant investigation; the app does
not guess that an uncertain transaction failed. An incomplete initialization response
may require merchant support to recover the checkout. Terminal failed/abandoned
provider results allow a new attempt before the order expires.

To test the complete buyer flow: submit an order, confirm it as the farmer, open
Buyer -> Payments, continue to Paystack, and use Paystack's test payment details.
After redirect, the API verifies the payment before the order becomes paid. Also
try closing checkout, resuming it and testing a failed payment. Keep the worker
running. Automated tests mock provider HTTP; a real test-mode checkout requires
working Paystack credentials and merchant access to KES.

If checkout returns HTTP 403 despite a valid test key, ensure the backend is
running the latest code and restart both API and worker processes. Requests send
an explicit `AgriBridge/1.0` user agent and accept JSON; Paystack can reject
Python urllib's default user agent. A 401 indicates an unaccepted API key;
a persistent 403 can also indicate restricted-key permissions or access filtering.

Official references: [transaction initialization and verification](https://paystack.com/docs/api/transaction/),
[webhook signatures](https://paystack.com/docs/payments/webhooks/),
[supported currencies/minor units](https://paystack.com/docs/api/), and
[test payment details](https://paystack.com/docs/payments/test-payments/).

Cancellation/refund requests are stored under `/api/order-issues`. Admins investigate
and record their decision. A refund decision requires an externally verified refund
reference and explicit confirmation. It records the refund; **it does not send money**.
Restocking after a paid refund requires separate explicit confirmation that the
produce can return to sale. Processing charges cannot be cancelled blindly.

Live merchant onboarding, direct farmer settlement, payouts and automated refunds
are outside the test-mode V1. Configure those before a real-money launch.

## Notifications and email

V1 notifications and audit records are persisted with transaction changes. Users can
read/mark their own alerts. Configure SMTP, TLS/SSL settings, sender and
`PUBLIC_FRONTEND_URL` for the worker's outbound emails. Delivery failures retry with
backoff up to five attempts, then remain recorded as failed. SMTP delivery is tested
with a mock; real delivery requires your configuration.

Password reset uses SMTP without logging reset links. Resetting a password consumes
all reset tokens and invalidates existing sessions using the account token version.

## Tests and scope

```sh
cd server
PYTHONDONTWRITEBYTECODE=1 .venv/bin/python -m pytest -p no:cacheprovider -q
```

The default suite uses isolated databases and ignores Neon URLs in `.env`. Existing
route assertions were updated for the agreed V1 approval/confirmation requirements.
V1 acceptance tests cover onboarding, dual profiles, approval, stock/deadlines,
checkout replay, payment gating, receipt/reviews, notifications, worker and refunds.

The previous requests/offers API is retained for compatibility but removed from V1
navigation. Delivery/collection management is deferred. No new image assets were
introduced; existing project imagery remains in use, with placeholders on product
image failure. Browser visual verification depends on a connected browser session.
