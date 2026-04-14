# Production BRP integration reference (real-world implementation)

Source: example-client client implementation guide. This documents a working BRP integration in production.

## Base URL

`https://api-example-client` (proxied BRP API, not raw BRP endpoints)

All requests require:
- `Accept-Language: da-DK` header (API3 uses this for translations)
- `Content-Type: application/json`
- Auth token in `Authorization` header after login

---

## Flow sequence

### 1. Business unit selection (locations)
- `GET /api/reference/business-units`
- User must pick one. No default fallback.
- Store selected unit in state. Every subsequent request references it.

### 2. Product selection
- Memberships: `GET /api/products/subscriptions` (with active business unit)
- Punch cards: `GET /api/products/valuecards`
- After selecting a membership, fetch add-ons: `GET /api/products/subscriptions/{productId}/additions`
- User can select add-on products ("add to your membership" step, e.g. towel service, locker, parking)
- Store: access type, product ID, and selected addition IDs

### 3. Authentication / account creation
- Login: `POST /api/auth/login` returns access + refresh tokens
- New user: `POST /api/customers` (include active business unit)
- Token refresh: `POST /api/auth/refresh`
- Token validation: `POST /api/auth/validate`
- Password reset: `POST /api/auth/reset-password`
- Update customer: `PUT /api/customers/:id`
- Guardian/child: `POST /api/customers` with `isGuardianPurchase: true`, includes both guardian and customer objects

### 4. Order creation
- Create order: `POST /api/orders`
- Add membership: `POST /api/orders/{orderId}/items/subscriptions`
- Add punch card: `POST /api/orders/{orderId}/items/valuecards`
- Add extras/additions: `POST /api/orders/{orderId}/items/articles` (for each addition)
- Review order: `GET /api/orders/{orderId}`
- Update order: `PUT /api/orders/{orderId}` (include active business unit)

### 5. Payment
- Generate payment link: `POST /api/payment/generate-link`
- Payload: order ID, payment method, business unit, return URL
- Store generated link in state, redirect user to it

---

## Auth token management

- Store access + refresh tokens in memory-first session store
- Helper functions: `saveTokens`, `getAccessToken`, `clearTokens`
- HTTP helper auto-injects tokens
- On app reload with saved credentials: call `/api/auth/validate`
- If access token expired + refresh token exists: call `/api/auth/refresh`
- Otherwise clear session, return to auth step

---

## GA4 analytics integration

Server-side analytics uses two identifiers sent from the client:
- `x-ga-client-id` header: GA4 client ID (captured after consent opt-in)
- `x-ga-user-id` header: BRP customer ID (after authentication)

These headers go on: `POST /api/orders`, `POST /api/orders/{orderId}/items/*`, `POST /api/payment/generate-link`

Skip both headers when consent is denied.

---

## Guardian / child purchases

- `POST /api/customers` with `isGuardianPurchase: true`
- Include both `guardian` and `customer` objects (email, name, DOB, business unit, contact)
- Response returns both account IDs
- Link relationships: `POST /api/customers/:customerId/other-user` with `otherUserId` and role `PAYER`
- Order payloads reference correct guardian/child IDs

---

## Key differences from raw BRP API

This proxy layer uses cleaner paths than raw BRP:
- `/api/products/subscriptions` instead of `/api/ver3/products/subscriptions`
- `/api/payment/generate-link` instead of `/api/ver3/services/generatelink/payment`
- `/api/auth/login` instead of `/api/ver3/auth/login`

The proxy likely normalizes response shapes and handles credential injection server-side.

---

## Implications for our platform

1. **Subscription additions** are a real product step. After selecting a membership, offer add-ons. Fetch from `products/subscriptions/{id}/additions`.
2. **Articles endpoint** is used for add-on items on orders, not just for standalone products.
3. **Payment link generation** is a single POST with order ID, payment method, business unit, and return URLs.
4. **Token-based auth** with refresh flow is the standard BRP pattern.
5. **Guardian/child flow** is a v2 feature but the API supports it.
6. **Business unit is required everywhere**. Not optional. Must be selected first and passed in every request.