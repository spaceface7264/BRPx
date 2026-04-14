# Phase 2: Wire the MVP Together (Execution Spec)

## Goal

Ship a real, demo-ready BRP-backed MVP by wiring checkout + admin to the Worker proxy and tenant config, with safe fallbacks, clear observability, and no dead-end UX.

## Definition of Done

- A tenant with valid BRP credentials can complete an end-to-end checkout against a real BRP account.
- A tenant without valid BRP credentials still works in mock mode locally.
- Admin can test BRP connection, save branding, publish/unpublish, and preview.
- Checkout supports DA/SV/NO UI chrome translations and passes tenant language to BRP.
- All critical loading/error states are handled (no blank screens, no silent failures).

## Source References

- `docs:brp-production-integration-reference.md` for proven production flow details.
- `docs/brp-api-reference.md` for BRP v3 request/response shapes (if not present locally, use your BRP internal spec copy).

---

## 0) Guardrails and assumptions

- Keep mock-mode behavior intact for localhost/demo development.
- Do not transform BRP payloads unless required for UI compatibility.
- Centralize BRP proxy logic in Worker to avoid credential handling in frontends.
- Add structured logs around BRP calls (method, path, status, latency, tenant id, correlation id).
- All new functionality behind existing tenant config; no global feature flag required.

---

## 1) Worker: real BRP proxy mode

### 1.1 Routing rule

Use real BRP mode when tenant has `brp_api_url` and it is not localhost/mock. Otherwise, route to mock handlers.

```ts
const isRealBrp = Boolean(
  tenant.brp_api_url &&
  !/localhost|127\.0\.0\.1|mock/i.test(tenant.brp_api_url)
)
```

### 1.2 Endpoint map (local -> BRP v3)

- `GET /api/business-units` -> `GET {brp_api_url}/api/ver3/businessunits`
- `GET /api/products/subscriptions` -> `GET {brp_api_url}/api/ver3/products/subscriptions`
- `GET /api/products/valuecards` -> `GET {brp_api_url}/api/ver3/products/valuecards`
- `GET /api/products/entries` -> `GET {brp_api_url}/api/ver3/products/entries`
- `GET /api/products/subscriptions/:id/additions` -> `GET {brp_api_url}/api/ver3/products/subscriptions/{id}/additions`
- `GET /api/webcategories` -> `GET {brp_api_url}/api/ver3/webcategories`
- `GET /api/webcategories/:id/products` -> `GET {brp_api_url}/api/ver3/webcategories/{id}/products`
- `GET /api/customertypes` -> `GET {brp_api_url}/api/ver3/customertypes`
- `GET /api/personinformations` -> `GET {brp_api_url}/api/ver3/personinformations`
- `GET /api/owndefinedparameters` -> `GET {brp_api_url}/api/ver3/owndefinedparameters`
- `POST /api/auth/login` -> `POST {brp_api_url}/api/ver3/auth/login`
- `GET /api/customers` -> `GET {brp_api_url}/api/ver3/customers`
- `POST /api/customers` -> `POST {brp_api_url}/api/ver3/customers`
- `PUT /api/customers/:id` -> `PUT {brp_api_url}/api/ver3/customers/{id}`
- `POST /api/orders` -> `POST {brp_api_url}/api/ver3/orders`
- `GET /api/orders/:id` -> `GET {brp_api_url}/api/ver3/orders/{id}`
- `POST /api/orders/:id/items/subscriptions` -> `POST {brp_api_url}/api/ver3/orders/{id}/items/subscriptions`
- `POST /api/orders/:id/items/valuecards` -> `POST {brp_api_url}/api/ver3/orders/{id}/items/valuecards`
- `POST /api/orders/:id/items/entries` -> `POST {brp_api_url}/api/ver3/orders/{id}/items/entries`
- `POST /api/orders/:id/items/articles` -> `POST {brp_api_url}/api/ver3/orders/{id}/items/articles`
- `PUT /api/orders/:id/coupons` -> `PUT {brp_api_url}/api/ver3/orders/{id}/coupons`
- `POST /api/payment/generate-link` -> `POST {brp_api_url}/api/ver3/services/generatelink/payment`
- `GET /api/consenttypes` -> `GET {brp_api_url}/api/ver3/consenttypes`

### 1.3 Header policy

- Inject `Authorization` from tenant BRP API key.
- Inject `Accept-Language` from tenant language (default `da-DK`).
- Set `Content-Type: application/json` for `POST`/`PUT`.
- Forward incoming query params and request body unchanged.

### 1.4 Caching policy (KV)

Cache only idempotent catalog-like endpoints for 15 minutes:

- `GET /api/business-units`
- `GET /api/webcategories`
- `GET /api/webcategories/:id/products`
- `GET /api/products/subscriptions`
- `GET /api/products/valuecards`
- `GET /api/products/entries`
- `GET /api/customertypes`

Do not cache customer/order/payment endpoints.

### 1.5 Error normalization

On BRP non-2xx or fetch/network timeout, return:

```json
{ "error": true, "status": 502, "message": "BRP request failed" }
```

Rules:

- Preserve BRP status code if available.
- If BRP error body has message/title, surface it as `message`.
- Include a request correlation id in response headers for support/debug.

### 1.6 Acceptance checks

- Valid credentials: `GET /api/business-units` returns real units.
- Invalid key: normalized 401/403 response returned to client.
- BRP down/timeout: normalized 5xx response with stable shape.
- Mock tenant still returns mock data for all mapped routes.

---

## 2) Checkout: adapt to real BRP flow

### 2.1 Location step

- Fetch `GET /api/business-units`.
- Render nested BRP address fields safely (null-safe).
- Auto-advance when exactly one business unit.

### 2.2 Product selection

Preferred strategy:

1. `GET /api/webcategories`
2. `GET /api/webcategories/{id}/products` per category

Fallback:

- Use `/products/subscriptions`, `/products/valuecards`, `/products/entries` and group client-side.

UI notes:

- Product badge by type: `subscription`, `valueCard`, `entry`.
- Price from BRP price objects (`amount` in minor units) with tenant currency.

### 2.3 Customer type pricing

- If selected product has `applicableCustomerTypes`, show selector.
- Fetch `GET /api/customertypes` for labels + age windows.
- Store selected `customerType.id` and use it during order creation.

### 2.4 Subscription additions (conditional step)

- For subscription products, call `GET /api/products/subscriptions/{id}/additions`.
- Show additions as multi-select cards.
- Skip entire step when additions list is empty.

### 2.5 Signup / identity flow

Support both:

- CPR/personnummer lookup: `GET /api/customers?ssn={cpr}`
- Email lookup: `GET /api/customers?email={email}`

Behavior:

- Found -> show welcome-back summary, continue.
- Not found -> full signup form.

Fetch `GET /api/personinformations` to determine required fields per tenant before submit validation.

### 2.6 Consent + coupon + order + payment

- Consent checkboxes from `GET /api/consenttypes`.
- Create order: `POST /api/orders`.
- Add main item via correct type endpoint.
- Add selected additions as articles.
- Coupon apply: `PUT /api/orders/{id}/coupons`.
- Refresh with `GET /api/orders/{id}` after each pricing mutation.
- Generate payment link: `POST /api/payment/generate-link`.
- Redirect to payment URL, then show return confirmation state.

### 2.7 Acceptance checks

- New + existing customer flows both succeed.
- Subscription with additions produces expected final order lines.
- Invalid coupon shows non-blocking inline error.
- Payment link failure keeps user on checkout with retry path.

---

## 3) Admin: wire real API actions

### 3.1 BRP connection test

- `PUT /admin/tenant/brp` with URL + key.
- Worker validates by calling BRP `businessunits`.
- Persist only on successful validation.
- Return explicit failure reason: auth, URL invalid, timeout.

### 3.2 Product sync

- Add `POST /admin/tenant/sync`.
- Pull categories + all product types from BRP.
- Persist snapshot metadata in D1/KV:
  - `lastSyncedAt`
  - count by category/type
  - sync status/error

### 3.3 Branding + publish controls

- `PUT /admin/tenant/branding` updates tenant branding.
- `POST /admin/tenant/publish` sets `is_live = true`.
- `POST /admin/tenant/unpublish` sets `is_live = false`.
- Checkout reads `is_live` and shows branded "Coming soon" when false.

### 3.4 Preview iframe

- Load checkout with `?preview=true`.
- Preview uses draft config; published checkout uses live config.
- Apply live editing via `postMessage`.
- Ensure same-origin/CORS configuration allows iframe rendering.

### 3.5 Acceptance checks

- Connection test result is deterministic and user-friendly.
- Sync returns usable summary and timestamp.
- Publish/unpublish effect visible on checkout reload.

---

## 4) i18n: UI chrome translations

Create `shared/i18n/` with DA/SV/NO dictionaries and fallback to DA.

Requirements:

- `tenant.language` supports `'da' | 'sv' | 'no'`.
- Hook API: `const { t } = useTranslation()`.
- Missing key behavior: return DA value; if missing in DA, return key.
- Worker maps tenant language to BRP `Accept-Language` header.

Acceptance:

- Switching tenant language updates step labels/buttons/errors.
- Product names continue to come from BRP localization.

---

## 5) Templates and styling system

All templates share one React flow; style differences only via root `data-template`.

- **Minimal**: polished existing style, clean neutral defaults.
- **Bold**: complete stub with stronger color and denser card hierarchy.
- **Branded**: hero section, optional image, premium spacing/typography.

Constraints:

- No conditional rendering forks for template business logic.
- Keep token usage centralized (`--primary`, text contrast helpers).

Acceptance:

- Same checkout flow functions identically under all 3 templates.
- Responsive behavior consistent (mobile and desktop).

---

## 6) Error/loading UX baseline

### Checkout

- Skeletons for business units, products, order summary.
- Retryable fallback for BRP/network errors.
- Clear state for invalid tenant or unpublished tenant.
- Never dead-end after payment-link generation errors.

### Admin

- Toasts for save/sync/publish actions.
- Inline status for BRP connection test lifecycle.
- Form state machine: `idle -> saving -> saved|error`.

---

## 7) UX polish requirements

- Back navigation via browser history + step state sync.
- Progress bar allows backward navigation only.
- Mobile sticky CTA (continue/pay).
- 44x44 minimum touch targets.
- Type-safe input types (`email`, `tel`, numeric postal input pattern).
- Automatic text-contrast on brand color backgrounds.

---

## 8) Implementation order (optimized)

1. Worker BRP proxy + normalized errors + cache.
2. Checkout fetch layer for real BRP shapes.
3. Customer type selector + pricing integration.
4. Subscription additions conditional step.
5. Signup lookup flows + dynamic required fields.
6. Order, coupon, payment-link flow hardening.
7. Admin BRP test + branding + publish/unpublish + sync.
8. i18n DA/SV/NO and Worker language mapping.
9. Template completion (bold, branded) with shared flow.
10. Loading/error states and mobile UX polish.

---

## 9) Demo script (must pass)

Run this exact scenario before calling phase complete:

1. Admin configures BRP URL/key and sees successful test.
2. Admin publishes tenant and picks template + language.
3. Checkout loads real business units/products from BRP.
4. User selects subscription + customer type + addition.
5. User goes through new-customer signup with required fields.
6. User applies coupon (valid or invalid path handled).
7. Order summary updates correctly; payment link redirects.
8. Return flow lands on confirmation state.

If any step fails, phase is not complete.