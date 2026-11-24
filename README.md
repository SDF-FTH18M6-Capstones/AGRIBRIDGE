# AgriBridge V1

A marketplace connecting buyers with verified farmers. The frontend is React +
Tailwind, product pages are server-rendered by the Node/Vite server, and the Flask
API persists business data in **Neon PostgreSQL**.

## V1 journey

Register a general account -> automatically sign in -> marketplace -> complete
buyer details to buy, or submit farm details for officer inspection/admin approval
to sell. One account can hold both profiles without replacing either capability.

Orders follow: awaiting farmer confirmation -> awaiting payment -> verified paid
-> buyer confirms receipt -> completed. Rejection, cancellation and expiry are
separate outcomes. A cart creates separate orders per farmer. Inventory reservations,
price snapshots, permissions and payment transitions are enforced by Flask.

V1 uses Paystack hosted checkout in **test mode** only. Delivery/collection management, live farmer payouts
and buying requests/offers are outside V1 navigation. Admins investigate order
exceptions and record externally verified refunds; the app does not execute refunds.

## Run locally

Keep your existing Neon connection and secrets in `server/.env`. Back up/check the
intended database before applying migrations; the implementation did not alter your
Neon data. See the [API setup](server/README.md) for migration details and SMTP/Paystack
configuration.

Terminal 1 — API:

```sh
cd server
source .venv/bin/activate
pip install -r requirements.txt
flask --app run.py db current
flask --app run.py db upgrade
python run.py
```

Terminal 2 — background worker (required for expiry, reconciliation and email):

```sh
cd server
source .venv/bin/activate
flask --app run.py v1-worker
```

Terminal 3 — frontend (Node 20.19+, preferably Node 22):

```sh
cd client
npm ci
npm run dev
```

Open `http://localhost:5173`. Flask runs at `http://127.0.0.1:5000`; the Node server
proxies `/api/*` to it. Use `SSR_API_URL` to select a different API address. Production
requires the Node SSR server, not static-only frontend hosting.

Optional **development-only** sample data: `flask --app run.py seed` in `server`.
This writes to the configured database. Demo users use `AgriBridgeDemo123!`:
`amina.farmer@example.com`, `peter.farmer@example.com`,
`grace.buyer@example.com`, `kisumu.buyer@example.com`, `admin@example.com`.
Do not use demo credentials for a real launch.

## Checks

```sh
cd server
PYTHONDONTWRITEBYTECODE=1 .venv/bin/python -m pytest -p no:cacheprovider -q
```

The test suite uses disposable databases and does not write to Neon.

```sh
cd client
npm run lint
npm run build
```

Further details: [API and worker](server/README.md), [SSR frontend](client/README.md).
