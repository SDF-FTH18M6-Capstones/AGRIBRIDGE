# Deploy AgriBridge yourself: Railway + Neon

This guide deploys the existing Node SSR frontend, Flask API and durable worker. Product pages remain server rendered. New images and verification documents remain in Neon; no Railway volume or Cloudinary account is needed for new uploads.

## 1. Publish the prepared branch

Preparation is on `feature/railway-deployment`. It is not committed or pushed automatically. Review and test, then publish it:

```bash
git status
git add .gitignore README.md client server deploy docs
git commit -m "Prepare Railway frontend, API and worker deployment"
git push -u origin feature/railway-deployment
```

Deploy this branch for staging, or merge it into `development` first and deploy that branch. All three services must use the same release commit. For a later production release, use your team's reviewed release branch. Existing `development` does not contain these deployment files until you publish/merge them.

## 2. Prepare Neon

Use a separate Neon branch/database for staging. Keep the current development database intact. Select the exact database intentionally before migrations; back up any database containing data you need.

Copy the Neon connection string and change only the driver prefix from `postgresql://` to `postgresql+psycopg://` for this SQLAlchemy/Psycopg 3 application. Preserve credentials, database name and `sslmode=require`. Use Neon-provided connection settings; the pooled endpoint is appropriate for application connections. Give API and worker the same staging `DATABASE_URL`.

Do not run the demonstration seed on a database containing real accounts. If starting with an empty database, create the initial administrator deliberately using the operator command below; deployment does not create default staff credentials.

## 3. Create the Railway services before deploying

Create an empty Railway project and use an environment named `staging`. Add three empty services named `web`, `api` and `worker`. Set the following configuration and variables before connecting a source. Connect the GitHub source for `api` first in step 5, then `web` in step 6, and `worker` in step 7; attaching a source can immediately trigger a build.

| Service | Root directory | Config file path (repository absolute path) | Purpose |
| --- | --- | --- | --- |
| web | `/client` | `/client/railway.json` | Node SSR + browser assets + same-origin API proxy |
| api | `/server` | `/server/railway.json` | Gunicorn API; migration before startup |
| worker | `/server` | `/server/railway.worker.json` | Durable worker; no migrations and no HTTP health check |

The root directory determines the Docker build context. Each context has its own `Dockerfile` and `.dockerignore`. Dockerfile paths in the JSON are relative to that context; Railway config file paths above refer to the repository root. Do not select a static Vite deployment, add a Publish Directory, or replace the frontend start command with a static file server.

The worker's custom config path is essential: using the API config for it would run migrations and apply an HTTP health check to a process that has no HTTP server.

Docker performs installation and builds. Leave manual Build Command and Start Command overrides empty unless intentionally overriding the supplied config. The API Docker default starts Gunicorn. The worker config overrides that default with `flask --app run.py v1-worker`. The frontend Docker default starts `node server.js --production`.

Keep one worker replica initially; keep the worker always running rather than sleeping or using a cron schedule. The API and frontend should also remain running for the first staging release.

## 4. Configure variables

Use `server/.env.railway.example` and `client/.env.railway.example` as references. Do not upload your local `.env` or copy secrets into GitHub.

Generate two independent secrets locally, for example by running this command twice:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

Set the same generated application secrets on API and worker. Keep them stable across redeployments; changing JWT secrets invalidates existing logins, and changing the application secret invalidates outstanding signed/reset links.

API and worker:

```dotenv
ENVIRONMENT=production
PORT=8080
SECRET_KEY=YOUR_RANDOM_APPLICATION_SECRET
JWT_SECRET_KEY=YOUR_DIFFERENT_RANDOM_JWT_SECRET
DATABASE_URL=YOUR_STAGING_NEON_SQLALCHEMY_URL
NOTIFICATION_EMAILS_ENABLED=false
WORKER_INTERVAL_SECONDS=30
```

Also set `PUBLIC_FRONTEND_URL`, `PASSWORD_RESET_URL`, `PAYSTACK_CALLBACK_URL`, and `CORS_ORIGINS` once the frontend domain is known (see below). Set your Paystack **test** secret on the API and worker if testing payments. `PAYSTACK_WEBHOOK_SECRET` is needed only for the matching modern webhook-signature configuration. Leave it blank for the existing legacy signature scheme.

For SMTP, set `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_DEFAULT_SENDER`, `MAIL_USE_TLS` and `MAIL_USE_SSL`. Enable `NOTIFICATION_EMAILS_ENABLED=true` after testing delivery. Password recovery also needs working SMTP. A staging environment should use a test mailbox/provider and avoid sending messages to copied real customer accounts.

Frontend:

```dotenv
HOST=0.0.0.0
PORT=8080
SSR_API_URL=https://YOUR-API-DOMAIN/api
PUBLIC_ORIGIN=https://YOUR-FRONTEND-DOMAIN
```

The Docker build fixes `VITE_API_BASE_URL=/api`. This keeps browser requests, authentication headers and private file previews on the frontend origin. Do not put database credentials, JWT secrets or Paystack secrets in frontend variables.

## 5. Deploy the API first

Deploy only `api` initially. Its pre-deploy command runs:

```bash
flask --app run.py db upgrade
```

If the migration fails, fix the database/connection/migration issue before retrying. Do not stamp an unknown schema to bypass the error. Do not copy this migration command to the worker.

Check deploy logs and confirm the database reached revision `e56b8c2fd005` using `flask --app run.py db current` through Railway's service command/SSH facilities if needed. Railway runs the command inside the deployed service environment; a local CLI environment command alone does not guarantee Railway-internal networking.

Generate a public domain for the API, targeting port **8080**. Verify:

```bash
curl https://YOUR-API-DOMAIN/api/health
curl https://YOUR-API-DOMAIN/api/ready
```

Both should return `status: ok`. `/health` checks the process; `/ready` also checks the database. It does not certify migrations or external payment/email credentials, so review migration logs too. The API health check uses `/api/ready`.

## 6. Deploy the frontend

Set `SSR_API_URL` to the working API domain plus `/api`, then deploy `web`. Generate its public domain, targeting port **8080**. Set `PUBLIC_ORIGIN` to that exact HTTPS frontend origin and redeploy.

Update API and worker variables to that exact origin:

```dotenv
PUBLIC_FRONTEND_URL=https://YOUR-FRONTEND-DOMAIN
PASSWORD_RESET_URL=https://YOUR-FRONTEND-DOMAIN/reset-password
PAYSTACK_CALLBACK_URL=https://YOUR-FRONTEND-DOMAIN/buyer/payments
CORS_ORIGINS=https://YOUR-FRONTEND-DOMAIN
```

Redeploy the API after changing these settings. Do not leave localhost URLs. Use the same hostname for login and the Paystack return: tab sessions are scoped to the browser origin.

Check:

```bash
curl https://YOUR-FRONTEND-DOMAIN/healthz
curl https://YOUR-FRONTEND-DOMAIN/api/ready
```

The frontend health check `/healthz` checks Node itself, independently of API availability. Open `/marketplace` and a real product URL; View Source must include product data without waiting for JavaScript.

The public API domain is the simplest initial server-to-server connection. Later, within the same Railway environment, `SSR_API_URL` can use `http://api.railway.internal:8080/api`. The API listens on dual-stack `[::]` for private/public networking. Keep the public API endpoint for Paystack webhooks if using it there; do not change browser API calls away from `/api`.

## 7. Deploy the worker

Only after migrations and API checks pass, deploy `worker` with `/server/railway.worker.json`. It needs the same Neon database and application settings as the API. Do not assign a public domain or configure an HTTP health check.

Normal operation may be quiet; check for repeated batch failures. It reconciles payments, expires reservations/orders, sends configured emails and removes deleted draft/product file contents. Closing a browser must not stop this work.

## 8. Configure Paystack TEST mode

In Paystack's test settings, set the webhook URL:

```text
https://YOUR-API-DOMAIN/api/payments/paystack/webhook
```

The callback belongs to the frontend; the webhook belongs to the API. A browser GET to the webhook can return 405 because the endpoint expects signed POST requests. A successful unsigned POST is not expected either.

Use Paystack's official test payment details and confirm payment via backend verification. Never mark an order paid solely because the browser returned from checkout. V1 intentionally rejects live keys: hosting the application does not make it ready for real money.

## 9. Create the first administrator

Open an interactive terminal in the deployed API container. If you do not have Railway CLI installed, you can invoke it using npm:

```bash
npx @railway/cli login
npx @railway/cli link
npx @railway/cli ssh
```

In `link`, select the intended project, `staging` environment and **api** service. These are operator commands for you to run after deployment; they were not executed during preparation. Inside that remote terminal, run:

```bash
flask --app run.py create-admin
```

Enter the administrator email and full name, then a strong password twice at the hidden prompts. It creates a new active administrator; it refuses to change or promote an existing account. It does not create demo products or other accounts. Sign in through the normal frontend login page, then provision field officers through the admin interface.

If your intended admin email already belongs to a general account, stop and decide an explicit promotion process rather than changing its password or using a seed.

## 10. Acceptance checks before sharing the link

- Register a general account and confirm marketplace onboarding.
- Verify independent tabs, logout, strong passwords and buyer profile completion.
- Save a farm pin and upload a photo/PDF from a device; refresh and open the stored file again.
- Verify unrelated users cannot access submitted documents; assigned officer/admin manual reviews work.
- Test farmer approval, product creation/images, search/filter/grid/list and server-rendered product HTML.
- Place an order, confirm as farmer, complete Paystack test checkout and confirm receipt.
- Verify expiry/worker activity, notifications and password reset when SMTP is configured.
- Reopen private files after a service restart to confirm they persisted in Neon.
- Test the deployed desktop/mobile UI and camera permissions over HTTPS.

Create staff accounts intentionally. Do not deploy seeded demo administrators with publicly known passwords or run a seed against existing shared data. Sample testimonials are still labelled design examples.

## 11. Updating and rollback

Publish reviewed commits; deploy API (migrations) first, followed by frontend and worker from the same release. Coordinate or pause automatic deployments for schema-changing releases so a push does not start the worker against the old schema. For this first release, do not trigger all three services against an unmigrated database simultaneously.

An application rollback does not automatically undo database migrations. Preserve backups and prefer compatible schema changes. The binary-upload migration refuses a downgrade that would discard stored file bytes.

For production, repeat staging configuration with separate database/secrets/provider settings, then add the final domain and repeat acceptance checks. Monitor Railway service usage and Neon storage, including uploaded documents and backups.

## Local production-container check

From the repository root, with Docker running:

```bash
docker build -t agribridge-deploy-api:local server
docker build -t agribridge-deploy-web:local client
python3 deploy/smoke.py
```

The script creates a disposable local PostgreSQL 16 container and uniquely named application containers/network. It never loads `.env`, connects to shared Neon, or calls payment/email providers. It verifies migrations, Gunicorn, non-root users, SSR, proxying, tab login, private file roundtrip and a worker batch, then removes only its own test resources. Built images remain for reuse.

## Official references

- Monorepo root/config paths: https://docs.railway.com/deployments/monorepo
- Docker builds: https://docs.railway.com/builds/dockerfiles
- Config-as-code: https://docs.railway.com/config-as-code/reference
- Pre-deploy migrations: https://docs.railway.com/deployments/pre-deploy-command
- Private networking: https://docs.railway.com/networking/private-networking

## Preparation verification

Frontend lint and all three frontend test files passed. The backend suite passed
422 tests (one existing PDF-fixture deprecation warning). All three Railway JSON
files validated against Railway's published schema. Both production Docker images built successfully. The local container smoke check
passed against disposable PostgreSQL 16, including non-root execution, migrations,
Gunicorn readiness, SSR, assets, tab login, private database file roundtrip and a
worker batch. Its temporary containers/network/database volume were removed.
Hosted Railway, live Neon, SMTP and Paystack calls were not tested or changed.
