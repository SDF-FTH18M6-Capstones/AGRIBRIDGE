# AgriBridge client

React + Tailwind with Vite SSR for `/marketplace` and `/marketplace/:id`.
The existing authenticated portals are React client routes backed by the Flask API.
Node 20.19+ is required (Node 22 LTS recommended).

## Development

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`. Keep Flask running on `127.0.0.1:5000`.
The Node server proxies `/api/*` to Flask, so browser API requests are same-origin.
Set `SSR_API_URL` on the Node process if Flask runs elsewhere (include `/api`).
Leave `VITE_API_BASE_URL` unset or use `/api`; set it only when intentionally using
an externally hosted API with matching Flask `CORS_ORIGINS`.

## Production

```sh
npm run build
npm start
```

Set `PUBLIC_ORIGIN=https://your-domain.example`, `HOST=0.0.0.0`, `PORT`, and
`SSR_API_URL` in the process manager. Serve HTTPS through the deployment proxy.
Deploy the Node server, `dist/client`, `dist/server`, and runtime dependencies.
Static-only hosting cannot render the product pages on the server.

Product filters, view mode, sorting and pagination are URL parameters. Product
pages include real HTML before JavaScript, canonical links, metadata and product
structured data. Missing products return HTTP 404. React hydrates the product
interactions. Cart entries travel by product/quantity URL parameters; saved
products, orders and payments persist in the API.

## Checks

```sh
npm run lint
npm run build
```

Payment initiation requires a Paystack test secret key and frontend return URL on Flask. An order or
pending payment record is not proof of payment. The API reconciles the provider
status before marking a payment paid. Paystack returns to `/buyer/payments` for server verification;
the page also supports resuming an existing checkout. Use the same frontend hostname
for login and the configured return URL to preserve the session. SMTP settings are required for password
reset email delivery. No credentials belong in `VITE_*` variables.

## V1 onboarding and checkout

Register without choosing a buyer/farmer role. Registration automatically signs in
and opens the marketplace. `/profile` contains independent Buyer and Farmer setup:
buyer details immediately enable buying; farmer inspection/admin approval enables
selling. A dual-profile account can access both dashboards. Permissions refresh on
focus and periodically, and the API always validates access independently.

The cart at `/cart` preserves selected produce through login/profile completion and
refreshes within the browser tab. It is account-scoped temporary state; orders,
payments, notifications and verification records persist in Neon. Checkout separates
farmers into individual orders. Payment becomes available after farmer confirmation;
only the buyer can confirm receipt and leave a review. The UI includes admin deadline
settings, audit history and resolution requests. Requests/offers and delivery/collection
management are outside V1 navigation.

Run the backend worker alongside Flask for deadlines, provider reconciliation and
outbound email. The worker is not a browser timer; see `server/README.md`.
