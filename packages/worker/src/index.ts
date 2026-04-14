import { createMockBrpService } from "@brp/brp-api";
import type {
  BrpAddOrderItemRequest,
  BrpCreateMemberRequest,
  BrpCreateOrderRequest,
  BrpPaymentLinkRequest,
  TenantConfig
} from "@brp/types";
import { handleAdmin, type Env } from "./admin-routes";

const mockBrp = createMockBrpService();
const catalogCache = new Map<string, { expiresAt: number; payload: string; status: number }>();

export type { Env } from "./admin-routes";

const json = (data: unknown, init?: ResponseInit): Response => {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {})
    }
  });
};

const notFound = (): Response => json({ error: "Not found" }, { status: 404 });

const badRequest = (message: string): Response => json({ error: message }, { status: 400 });
const normalizedError = (status: number, message: string): Response =>
  json({ error: true, status, message }, { status });

type CheckoutTenant = {
  id: string;
  brp_api_url: string | null;
  brp_api_key: string | null;
  is_live: number;
  business_name: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  font: string;
  template: string;
  language?: string | null;
};

const CACHEABLE_PATHS = new Set([
  "/api/business-units",
  "/api/webcategories",
  "/api/products/subscriptions",
  "/api/products/valuecards",
  "/api/products/entries",
  "/api/customertypes"
]);

const BRP_PATHS = new Map<string, string>([
  ["GET /api/business-units", "/api/ver3/businessunits"],
  ["GET /api/products/subscriptions", "/api/ver3/products/subscriptions"],
  ["GET /api/products/valuecards", "/api/ver3/products/valuecards"],
  ["GET /api/products/entries", "/api/ver3/products/entries"],
  ["GET /api/webcategories", "/api/ver3/webcategories"],
  ["GET /api/customertypes", "/api/ver3/customertypes"],
  ["GET /api/personinformations", "/api/ver3/personinformations"],
  ["GET /api/owndefinedparameters", "/api/ver3/owndefinedparameters"],
  ["POST /api/auth/login", "/api/ver3/auth/login"],
  ["GET /api/customers", "/api/ver3/customers"],
  ["POST /api/customers", "/api/ver3/customers"],
  ["POST /api/orders", "/api/ver3/orders"],
  ["POST /api/payment/generate-link", "/api/ver3/services/generatelink/payment"],
  ["GET /api/consenttypes", "/api/ver3/consenttypes"]
]);

const dynamicToBrpPath = (method: string, pathname: string): string | null => {
  const subAdditions = pathname.match(/^\/api\/products\/subscriptions\/([^/]+)\/additions$/);
  if (subAdditions && method === "GET") return `/api/ver3/products/subscriptions/${subAdditions[1]}/additions`;
  const webCatProducts = pathname.match(/^\/api\/webcategories\/([^/]+)\/products$/);
  if (webCatProducts && method === "GET") return `/api/ver3/webcategories/${webCatProducts[1]}/products`;
  const customerById = pathname.match(/^\/api\/customers\/([^/]+)$/);
  if (customerById && method === "PUT") return `/api/ver3/customers/${customerById[1]}`;
  const orderById = pathname.match(/^\/api\/orders\/([^/]+)$/);
  if (orderById && method === "GET") return `/api/ver3/orders/${orderById[1]}`;
  const orderSub = pathname.match(/^\/api\/orders\/([^/]+)\/items\/subscriptions$/);
  if (orderSub && method === "POST") return `/api/ver3/orders/${orderSub[1]}/items/subscriptions`;
  const orderValue = pathname.match(/^\/api\/orders\/([^/]+)\/items\/valuecards$/);
  if (orderValue && method === "POST") return `/api/ver3/orders/${orderValue[1]}/items/valuecards`;
  const orderEntries = pathname.match(/^\/api\/orders\/([^/]+)\/items\/entries$/);
  if (orderEntries && method === "POST") return `/api/ver3/orders/${orderEntries[1]}/items/entries`;
  const orderArticles = pathname.match(/^\/api\/orders\/([^/]+)\/items\/articles$/);
  if (orderArticles && method === "POST") return `/api/ver3/orders/${orderArticles[1]}/items/articles`;
  const orderCoupons = pathname.match(/^\/api\/orders\/([^/]+)\/coupons$/);
  if (orderCoupons && method === "PUT") return `/api/ver3/orders/${orderCoupons[1]}/coupons`;
  return null;
};

const tenantLanguage = (): string => "da-DK";

async function loadCheckoutTenant(env: Env, url: URL): Promise<CheckoutTenant | null> {
  const requestedTenantId = url.searchParams.get("tenantId");
  const query = requestedTenantId
    ? env.DB.prepare("SELECT * FROM tenants WHERE id = ?").bind(requestedTenantId)
    : env.DB.prepare("SELECT * FROM tenants ORDER BY created_at ASC LIMIT 1");
  return (await query.first<CheckoutTenant>()) ?? null;
}

function isRealBrpTenant(tenant: CheckoutTenant | null): tenant is CheckoutTenant {
  if (!tenant?.brp_api_url) return false;
  return !/localhost|127\.0\.0\.1|mock/i.test(tenant.brp_api_url);
}

async function proxyBrpRequest(
  request: Request,
  url: URL,
  tenant: CheckoutTenant
): Promise<Response | null> {
  const routeKey = `${request.method.toUpperCase()} ${url.pathname}`;
  const staticPath = BRP_PATHS.get(routeKey);
  const brpPath = staticPath ?? dynamicToBrpPath(request.method.toUpperCase(), url.pathname);
  if (!brpPath) return null;

  const endpoint = `${tenant.brp_api_url?.replace(/\/+$/, "")}${brpPath}${url.search}`;
  const cacheKey = `${tenant.id}:${request.method}:${url.pathname}:${url.search}`;
  const canCache = request.method === "GET" && (CACHEABLE_PATHS.has(url.pathname) || /\/api\/webcategories\/[^/]+\/products$/.test(url.pathname));
  if (canCache) {
    const hit = catalogCache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) {
      return new Response(hit.payload, {
        status: hit.status,
        headers: { "content-type": "application/json; charset=utf-8", "x-cache": "HIT" }
      });
    }
  }

  const headers = new Headers();
  headers.set("accept", "application/json");
  headers.set("accept-language", tenantLanguage());
  if (tenant.brp_api_key) {
    headers.set("authorization", `Bearer ${tenant.brp_api_key}`);
    headers.set("x-api-key", tenant.brp_api_key);
  }
  if (request.method === "POST" || request.method === "PUT") {
    headers.set("content-type", "application/json");
  }

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  let res: Response;
  try {
    res = await fetch(endpoint, init);
  } catch {
    return normalizedError(502, "BRP request failed");
  }

  const text = await res.text();
  if (!res.ok) {
    let message = "BRP request failed";
    try {
      const parsed = JSON.parse(text) as { message?: string; title?: string; error?: string };
      message = parsed.message ?? parsed.title ?? parsed.error ?? message;
    } catch {
      if (text) message = text;
    }
    return normalizedError(res.status, message);
  }

  if (canCache) {
    catalogCache.set(cacheKey, { payload: text, status: res.status, expiresAt: Date.now() + 15 * 60 * 1000 });
  }

  return new Response(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json; charset=utf-8" }
  });
}

/* ──────────────────────────────────────────────────────────
   Mock BRP API routes (raw BRP shape, for direct testing)
   ────────────────────────────────────────────────────────── */

const handleMockRoute = async (request: Request, url: URL): Promise<Response | null> => {
  if (url.pathname === "/mock/brp/businessunits" && request.method === "GET") {
    const data = await mockBrp.getBusinessUnits();
    return json(data);
  }

  if (url.pathname === "/mock/brp/webcategories" && request.method === "GET") {
    const businessunitids = url.searchParams.get("businessunitids");
    if (!businessunitids) return badRequest("businessunitids is required");
    const data = await mockBrp.getWebCategories(businessunitids);
    return json(data);
  }

  if (url.pathname === "/mock/brp/products" && request.method === "GET") {
    const businessunitids = url.searchParams.get("businessunitids");
    if (!businessunitids) return badRequest("businessunitids is required");
    const bookablefrominternet = url.searchParams.get("bookablefrominternet") ?? undefined;
    const data = await mockBrp.getProducts({ businessunitids, bookablefrominternet });
    return json(data);
  }

  if (url.pathname === "/mock/brp/orders" && request.method === "POST") {
    const body = (await request.json()) as BrpCreateOrderRequest;
    const data = await mockBrp.createOrder(body);
    return json(data);
  }

  const itemsMatch = url.pathname.match(/^\/mock\/brp\/orders\/(\d+)\/items$/);
  if (itemsMatch && request.method === "POST") {
    const orderid = Number.parseInt(itemsMatch[1], 10);
    const body = (await request.json()) as BrpAddOrderItemRequest;
    if (!body.productid) return badRequest("productid is required");
    try {
      const data = await mockBrp.addOrderItem(orderid, body);
      return json(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "UNKNOWN";
      if (msg === "ORDER_NOT_FOUND") return badRequest("order not found");
      if (msg === "PRODUCT_NOT_FOUND") return badRequest("product not found");
      if (msg === "PRODUCT_NOT_ON_BUSINESS_UNIT") return badRequest("product not available on this business unit");
      return json({ error: msg }, { status: 500 });
    }
  }

  const payMatch = url.pathname.match(/^\/mock\/brp\/orders\/(\d+)\/payment-link$/);
  if (payMatch && request.method === "POST") {
    const orderid = Number.parseInt(payMatch[1], 10);
    const body = (await request.json()) as BrpPaymentLinkRequest;
    if (!body.email) return badRequest("email is required");
    try {
      const data = await mockBrp.generatePaymentLink(orderid, body);
      return json(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "UNKNOWN";
      if (msg === "ORDER_NOT_FOUND") return badRequest("order not found");
      if (msg === "ORDER_HAS_NO_ITEMS") return badRequest("order has no items");
      return json({ error: msg }, { status: 500 });
    }
  }

  if (url.pathname === "/mock/brp/persons/verify" && request.method === "POST") {
    const body = (await request.json()) as { email?: string };
    if (!body.email) return badRequest("email is required");
    const data = await mockBrp.verifyPerson(body.email);
    return json(data);
  }

  if (url.pathname === "/mock/brp/member/lookup" && request.method === "POST") {
    const body = (await request.json()) as { email?: string };
    if (!body.email) return badRequest("email is required");
    const data = await mockBrp.verifyPerson(body.email);
    return json({ found: data.found, email: body.email });
  }

  return null;
};

/* ──────────────────────────────────────────────────────────
   Normalized /api/* routes (what the checkout SPA uses)
   In dev these forward to the mock service; in production
   these will proxy to the tenant's real BRP API.
   ────────────────────────────────────────────────────────── */

const handleApiRoute = async (request: Request, url: URL, env: Env): Promise<Response | null> => {
  const tenant = await loadCheckoutTenant(env, url);
  const useRealBrp = isRealBrpTenant(tenant);

  if (useRealBrp) {
    const proxied = await proxyBrpRequest(request, url, tenant);
    if (proxied) return proxied;
  }

  // GET /api/config -- tenant branding + settings
  if (url.pathname === "/api/config" && request.method === "GET") {
    const config: TenantConfig = tenant
      ? {
          tenantId: tenant.id,
          businessName: tenant.business_name ?? "Checkout",
          template: tenant.template === "bold" ? "bold" : "minimal",
          logoUrl: tenant.logo_url,
          primaryColor: tenant.primary_color,
          secondaryColor: tenant.secondary_color,
          font: tenant.font,
          language: tenant.language ?? "da",
          skipLocationStep: false,
          defaultLocationId: null,
          productDisplay: "cards",
          showProductDescriptions: true,
          termsUrl: null,
          privacyUrl: null,
          successRedirectUrl: null
        }
      : {
          tenantId: "demo",
          businessName: "Demo Gym A/S",
          template: "minimal",
          logoUrl: null,
          primaryColor: "#000000",
          secondaryColor: "#ffffff",
          font: "system-ui",
          language: "da",
          skipLocationStep: false,
          defaultLocationId: null,
          productDisplay: "cards",
          showProductDescriptions: true,
          termsUrl: null,
          privacyUrl: null,
          successRedirectUrl: null
        };
    if (tenant && tenant.is_live !== 1) {
      return json({ ...config, isLive: false });
    }
    return json(config);
  }

  if (url.pathname === "/api/business-units" && request.method === "GET") {
    const data = await mockBrp.getBusinessUnits();
    return json(data.businessunits);
  }

  if (url.pathname === "/api/webcategories" && request.method === "GET") {
    const businessunitids = url.searchParams.get("businessunitids");
    if (!businessunitids) return badRequest("businessunitids is required");
    const data = await mockBrp.getWebCategories(businessunitids);
    return json(data.webcategories);
  }

  // GET /api/locations
  if (url.pathname === "/api/locations" && request.method === "GET") {
    const data = await mockBrp.getBusinessUnits();
    return json(data);
  }

  // GET /api/products?locationId=X
  if (url.pathname === "/api/products" && request.method === "GET") {
    const locationId = url.searchParams.get("locationId") ?? url.searchParams.get("businessunitids");
    if (!locationId) return badRequest("locationId is required");
    if (useRealBrp && tenant) {
      const endpoints = [
        `${url.origin}/api/products/subscriptions`,
        `${url.origin}/api/products/valuecards`,
        `${url.origin}/api/products/entries`
      ];
      const responses = await Promise.all(
        endpoints.map(async (endpoint) => {
          const req = new Request(endpoint, { method: "GET" });
          const proxied = await proxyBrpRequest(req, new URL(endpoint), tenant);
          if (!proxied || !proxied.ok) throw new Error("Could not load products");
          return (await proxied.json()) as unknown;
        })
      );
      const allProducts = responses.flatMap((value) => (Array.isArray(value) ? value : [])) as Array<Record<string, unknown>>;
      const filtered = allProducts.filter((product) => {
        const businessUnits = product.businessunits;
        if (!Array.isArray(businessUnits)) return true;
        return businessUnits.some((u) => {
          if (!u || typeof u !== "object") return false;
          return String((u as { id?: number }).id ?? "") === String(locationId);
        });
      });
      const shaped = filtered.map((p) => ({
        ...p,
        priceincvat:
          typeof p.priceincvat === "number"
            ? p.priceincvat
            : typeof p.price === "object" && p.price && "amount" in p.price
              ? Number((p.price as { amount?: number }).amount ?? 0)
              : typeof p.priceWithInterval === "object" && p.priceWithInterval && "amount" in p.priceWithInterval
                ? Number((p.priceWithInterval as { amount?: number }).amount ?? 0)
                : 0
      }));
      return json({ products: shaped });
    }
    const [cats, prods] = await Promise.all([
      mockBrp.getWebCategories(locationId),
      mockBrp.getProducts({ businessunitids: locationId, bookablefrominternet: "true" })
    ]);
    return json({ webcategories: cats.webcategories, products: prods.products });
  }

  // POST /api/member/lookup
  if (url.pathname === "/api/member/lookup" && request.method === "POST") {
    const body = (await request.json()) as { email?: string };
    if (!body.email) return badRequest("email is required");
    if (useRealBrp && tenant) {
      const q = new URLSearchParams({ email: body.email });
      const customerReq = new Request(`${url.origin}/api/customers?${q.toString()}`, {
        method: "GET"
      });
      const customerRes = await proxyBrpRequest(customerReq, new URL(customerReq.url), tenant);
      if (!customerRes) return normalizedError(500, "Customer lookup route is unavailable");
      if (!customerRes.ok) return customerRes;
      const raw = (await customerRes.json()) as unknown;
      const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" && "customers" in raw ? (raw as { customers?: unknown[] }).customers ?? [] : [];
      const first = Array.isArray(list) && list.length > 0 ? (list[0] as Record<string, unknown>) : null;
      return json({
        found: Boolean(first),
        email: body.email,
        person: first
          ? {
              id: Number(first.id ?? 0),
              email: String(first.email ?? body.email),
              firstname: String(first.firstname ?? ""),
              lastname: String(first.lastname ?? "")
            }
          : null
      });
    }
    const data = await mockBrp.verifyPerson(body.email);
    return json({ found: data.found, email: body.email, person: data.person });
  }

  // POST /api/member/create
  if (url.pathname === "/api/member/create" && request.method === "POST") {
    const body = (await request.json()) as BrpCreateMemberRequest;
    if (!body.email || !body.firstname || !body.lastname) {
      return badRequest("firstname, lastname, and email are required");
    }
    const data = await mockBrp.createMember(body);
    return json(data);
  }

  // POST /api/orders
  if (url.pathname === "/api/orders" && request.method === "POST") {
    const body = (await request.json()) as BrpCreateOrderRequest;
    const data = await mockBrp.createOrder(body);
    return json(data);
  }

  // POST /api/orders/:id/items
  const apiItemsMatch = url.pathname.match(/^\/api\/orders\/(\d+)\/items$/);
  if (apiItemsMatch && request.method === "POST") {
    const orderid = Number.parseInt(apiItemsMatch[1], 10);
    const body = (await request.json()) as BrpAddOrderItemRequest;
    if (!body.productid) return badRequest("productid is required");
    if (useRealBrp && tenant) {
      const req = new Request(`${url.origin}/api/orders/${orderid}/items/articles`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productid: body.productid, quantity: body.quantity })
      });
      return (await proxyBrpRequest(req, new URL(req.url), tenant)) ?? normalizedError(500, "Order item route is unavailable");
    }
    try {
      const data = await mockBrp.addOrderItem(orderid, body);
      return json(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "UNKNOWN";
      if (msg === "ORDER_NOT_FOUND") return badRequest("order not found");
      if (msg === "PRODUCT_NOT_FOUND") return badRequest("product not found");
      if (msg === "PRODUCT_NOT_ON_BUSINESS_UNIT") return badRequest("product not available on this business unit");
      return json({ error: msg }, { status: 500 });
    }
  }

  // POST /api/orders/:id/payment-link
  const apiPayMatch = url.pathname.match(/^\/api\/orders\/(\d+)\/payment-link$/);
  if (apiPayMatch && request.method === "POST") {
    const orderid = Number.parseInt(apiPayMatch[1], 10);
    const body = (await request.json()) as BrpPaymentLinkRequest;
    if (!body.email) return badRequest("email is required");
    if (useRealBrp && tenant) {
      const req = new Request(`${url.origin}/api/payment/generate-link`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orderId: orderid,
          paymentMethodId: body.paymentmethodid ?? 1,
          returnUrl: `${url.origin}/?payment=success`,
          cancelUrl: `${url.origin}/?payment=cancelled`
        })
      });
      return (
        (await proxyBrpRequest(req, new URL(req.url), tenant)) ??
        normalizedError(500, "Payment link route is unavailable")
      );
    }
    try {
      const data = await mockBrp.generatePaymentLink(orderid, body);
      return json(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "UNKNOWN";
      if (msg === "ORDER_NOT_FOUND") return badRequest("order not found");
      if (msg === "ORDER_HAS_NO_ITEMS") return badRequest("order has no items");
      return json({ error: msg }, { status: 500 });
    }
  }

  return null;
};

/* ──────────────────────────────────────────────────────────
   Worker entry
   ────────────────────────────────────────────────────────── */

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true, service: "worker" });
    }

    // Admin API routes (/admin/*)
    const adminRes = await handleAdmin(request, env, mockBrp);
    if (adminRes) return adminRes;

    // Normalized API routes (checkout SPA)
    if (url.pathname.startsWith("/api/")) {
      const apiResponse = await handleApiRoute(request, url, env);
      if (apiResponse) return apiResponse;
    }

    // Mock BRP routes (direct testing)
    if (url.pathname.startsWith("/mock/")) {
      const mockResponse = await handleMockRoute(request, url);
      if (mockResponse) return mockResponse;
    }

    return notFound();
  }
};
