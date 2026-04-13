import type { MockBrpService } from "@brp/brp-api";
import { hashPassword, signJwt, verifyJwt, verifyPassword } from "./crypto-auth";

export type Env = {
  DB: D1Database;
  JWT_SECRET: string;
};

const json = (data: unknown, init?: ResponseInit): Response =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {})
    }
  });

const badRequest = (message: string): Response => json({ error: message }, { status: 400 });
const unauthorized = (): Response => json({ error: "Unauthorized" }, { status: 401 });
const notFound = (): Response => json({ error: "Not found" }, { status: 404 });

const JWT_TTL_SECONDS = 7 * 24 * 60 * 60;

type TenantRow = {
  id: string;
  email: string;
  password_hash: string;
  business_name: string | null;
  brp_api_url: string | null;
  brp_api_key: string | null;
  brp_connected: number;
  brp_last_sync: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  font: string;
  template: string;
  product_settings: string;
  custom_domain: string | null;
  domain_verified: number;
  platform_subdomain: string | null;
  is_live: number;
  terms_url: string | null;
  privacy_url: string | null;
  ga_measurement_id: string | null;
  post_purchase_redirect_url: string | null;
  onboarding_step: number;
  preview_token: string | null;
  created_at: string;
  updated_at: string;
};

function parseJsonObject(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function defaultProductSettings(): Record<string, unknown> {
  return {
    displayMode: "cards",
    showDescriptions: true,
    categoryOrder: [] as number[],
    productOrder: [] as number[],
    hiddenProducts: [] as number[],
    featuredProducts: [] as number[],
    showPrices: true,
    hiddenCategories: [] as number[]
  };
}

function mergeProductSettings(raw: string): Record<string, unknown> {
  const d = defaultProductSettings();
  const o = parseJsonObject(raw);
  if (o.displayMode === "cards" || o.displayMode === "list") d.displayMode = o.displayMode;
  if (typeof o.showDescriptions === "boolean") d.showDescriptions = o.showDescriptions;
  if (typeof o.showPrices === "boolean") d.showPrices = o.showPrices;
  if (Array.isArray(o.categoryOrder)) d.categoryOrder = o.categoryOrder.filter((x) => typeof x === "number");
  if (Array.isArray(o.hiddenProducts)) d.hiddenProducts = o.hiddenProducts.filter((x) => typeof x === "number");
  if (Array.isArray(o.featuredProducts)) d.featuredProducts = o.featuredProducts.filter((x) => typeof x === "number");
  if (Array.isArray(o.hiddenCategories)) d.hiddenCategories = o.hiddenCategories.filter((x) => typeof x === "number");
  if (Array.isArray(o.productOrder)) d.productOrder = o.productOrder.filter((x) => typeof x === "number");
  return d;
}

function tenantPublic(row: TenantRow): Record<string, unknown> {
  const productSettings = mergeProductSettings(row.product_settings);
  return {
    id: row.id,
    email: row.email,
    businessName: row.business_name,
    brpApiUrl: row.brp_api_url,
    brpApiKeySet: Boolean(row.brp_api_key && row.brp_api_key.length > 0),
    brpConnected: row.brp_connected === 1,
    brpLastSync: row.brp_last_sync,
    logoUrl: row.logo_url,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    font: row.font,
    template: row.template,
    productSettings,
    customDomain: row.custom_domain,
    domainVerified: row.domain_verified === 1,
    platformSubdomain: row.platform_subdomain,
    isLive: row.is_live === 1,
    termsUrl: row.terms_url,
    privacyUrl: row.privacy_url,
    gaMeasurementId: row.ga_measurement_id,
    postPurchaseRedirectUrl: row.post_purchase_redirect_url,
    onboardingStep: row.onboarding_step,
    previewToken: row.preview_token
  };
}

function previewTenantPayload(row: TenantRow): Record<string, unknown> {
  return {
    businessName: row.business_name ?? "Butik",
    logoUrl: row.logo_url ?? "/logo.svg",
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    font: row.font,
    template: row.template,
    fontFamily: fontToCssStack(row.font)
  };
}

function fontToCssStack(font: string): string {
  switch (font) {
    case "inter":
      return "'Inter', ui-sans-serif, system-ui, sans-serif";
    case "dm-sans":
      return "'DM Sans', ui-sans-serif, system-ui, sans-serif";
    case "space-grotesk":
      return "'Space Grotesk', ui-sans-serif, system-ui, sans-serif";
    default:
      return "ui-sans-serif, system-ui, sans-serif";
  }
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = (await request.json()) as unknown;
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "butik";
}

async function uniqueSubdomain(db: D1Database, businessName: string): Promise<string> {
  const base = slugify(businessName);
  for (let i = 0; i < 12; i++) {
    const suffix = i === 0 ? "" : `-${Math.random().toString(36).slice(2, 6)}`;
    const candidate = `${base}${suffix}`;
    const row = await db.prepare("SELECT id FROM tenants WHERE platform_subdomain = ?").bind(candidate).first();
    if (!row) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function randomPreviewToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function authTenantId(request: Request, env: Env): Promise<string | null> {
  const header = request.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!m) return null;
  const parsed = await verifyJwt(m[1], env.JWT_SECRET);
  return parsed?.sub ?? null;
}

async function loadTenant(db: D1Database, id: string): Promise<TenantRow | null> {
  const row = await db.prepare("SELECT * FROM tenants WHERE id = ?").bind(id).first<TenantRow>();
  return row ?? null;
}

async function testBrpFetch(baseUrl: string, apiKey: string | undefined): Promise<{ ok: true; units: { id: number; name: string }[] } | { ok: false; error: string }> {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return { ok: false, error: "URL skal starte med http:// eller https://" };
  }
  const target = `${trimmed}/businessunits`;
  const headers = new Headers({ accept: "application/json" });
  if (apiKey) {
    headers.set("authorization", `Bearer ${apiKey}`);
    headers.set("x-api-key", apiKey);
  }
  let res: Response;
  try {
    res = await fetch(target, { method: "GET", headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Netværksfejl";
    return { ok: false, error: `Kunne ikke nå BRP: ${msg}` };
  }
  if (!res.ok) {
    return { ok: false, error: `BRP returnerede HTTP ${res.status}. Tjek URL og nøgle.` };
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: "Ugyldigt JSON-svar fra BRP." };
  }
  const obj = data as { businessunits?: { id?: number; name?: string }[] };
  if (!obj.businessunits || !Array.isArray(obj.businessunits)) {
    return { ok: false, error: "Forventede feltet businessunits i svaret." };
  }
  const units = obj.businessunits
    .filter((u) => typeof u.id === "number" && typeof u.name === "string")
    .map((u) => ({ id: u.id as number, name: u.name as string }));
  return { ok: true, units };
}

export async function handleAdmin(
  request: Request,
  env: Env,
  mockBrp: MockBrpService
): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/admin/preview-config" && request.method === "GET") {
    const token = url.searchParams.get("token");
    if (!token) return badRequest("token er påkrævet");
    const row = await env.DB.prepare("SELECT * FROM tenants WHERE preview_token = ?").bind(token).first<TenantRow>();
    if (!row) return notFound();
    return json(previewTenantPayload(row));
  }

  if (path === "/admin/auth/register" && request.method === "POST") {
    const body = await readJson(request);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const businessName = typeof body.businessName === "string" ? body.businessName.trim() : "";
    if (!email || !email.includes("@")) return badRequest("Ugyldig e-mail");
    if (password.length < 8) return badRequest("Adgangskode skal være mindst 8 tegn");
    if (!businessName) return badRequest("Virksomhedsnavn er påkrævet");
    const existing = await env.DB.prepare("SELECT id FROM tenants WHERE email = ?").bind(email).first();
    if (existing) return badRequest("E-mail er allerede registreret");
    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const platformSubdomain = await uniqueSubdomain(env.DB, businessName);
    const previewToken = randomPreviewToken();
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO tenants (
        id, email, password_hash, business_name, platform_subdomain, preview_token, product_settings, onboarding_step, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
    )
      .bind(
        id,
        email,
        passwordHash,
        businessName,
        platformSubdomain,
        previewToken,
        JSON.stringify(defaultProductSettings()),
        now
      )
      .run();
    const token = await signJwt(id, env.JWT_SECRET, JWT_TTL_SECONDS);
    const tenant = await loadTenant(env.DB, id);
    return json({ token, tenant: tenant ? tenantPublic(tenant) : null });
  }

  if (path === "/admin/auth/login" && request.method === "POST") {
    const body = await readJson(request);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) return badRequest("E-mail og adgangskode er påkrævet");
    const row = await env.DB.prepare("SELECT * FROM tenants WHERE email = ?").bind(email).first<TenantRow>();
    if (!row) return unauthorized();
    const ok = await verifyPassword(password, row.password_hash);
    if (!ok) return unauthorized();
    const jwt = await signJwt(row.id, env.JWT_SECRET, JWT_TTL_SECONDS);
    return json({ token: jwt, tenant: tenantPublic(row) });
  }

  if (path === "/admin/auth/logout" && request.method === "POST") {
    return new Response(null, { status: 204 });
  }

  // Only handle authenticated /admin/* API; let other paths (e.g. /mock) fall through to the worker.
  if (!path.startsWith("/admin")) {
    return null;
  }

  const tenantId = await authTenantId(request, env);
  if (!tenantId) return unauthorized();

  const tenant = await loadTenant(env.DB, tenantId);
  if (!tenant) return unauthorized();

  if (path === "/admin/tenant" && request.method === "GET") {
    return json({ tenant: tenantPublic(tenant) });
  }

  if (path === "/admin/tenant" && request.method === "PUT") {
    const body = await readJson(request);
    const sets: string[] = [];
    const values: unknown[] = [];
    const str = (k: string, v: unknown) => {
      if (typeof v === "string") {
        sets.push(`${k} = ?`);
        values.push(v);
      }
    };
    const num = (k: string, v: unknown) => {
      if (typeof v === "number" && Number.isFinite(v)) {
        sets.push(`${k} = ?`);
        values.push(v);
      }
    };
    if ("businessName" in body) str("business_name", body.businessName);
    if ("termsUrl" in body) str("terms_url", body.termsUrl);
    if ("privacyUrl" in body) str("privacy_url", body.privacyUrl);
    if ("gaMeasurementId" in body) str("ga_measurement_id", body.gaMeasurementId);
    if ("postPurchaseRedirectUrl" in body) str("post_purchase_redirect_url", body.postPurchaseRedirectUrl);
    if ("onboardingStep" in body) num("onboarding_step", body.onboardingStep);
    if (sets.length === 0) return json({ tenant: tenantPublic(tenant) });
    sets.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(tenantId);
    const sql = `UPDATE tenants SET ${sets.join(", ")} WHERE id = ?`;
    await env.DB.prepare(sql)
      .bind(...values)
      .run();
    const next = await loadTenant(env.DB, tenantId);
    return json({ tenant: next ? tenantPublic(next) : null });
  }

  if (path === "/admin/tenant/brp" && request.method === "PUT") {
    const body = await readJson(request);
    const brpUrl = typeof body.brpApiUrl === "string" ? body.brpApiUrl.trim() : "";
    let nextKey: string | null = tenant.brp_api_key;
    if ("brpApiKey" in body) {
      nextKey =
        typeof body.brpApiKey === "string" && body.brpApiKey.length > 0 ? body.brpApiKey : null;
    }
    if (!brpUrl) return badRequest("BRP API URL er påkrævet");
    const test = await testBrpFetch(brpUrl, nextKey ?? undefined);
    if (!test.ok) return badRequest(test.error);
    const now = new Date().toISOString();
    await env.DB.prepare(
      "UPDATE tenants SET brp_api_url = ?, brp_api_key = ?, brp_connected = 1, brp_last_sync = ?, updated_at = ? WHERE id = ?"
    )
      .bind(brpUrl, nextKey, now, now, tenantId)
      .run();
    const next = await loadTenant(env.DB, tenantId);
    return json({ tenant: next ? tenantPublic(next) : null, businessUnits: test.units });
  }

  if (path === "/admin/tenant/brp/test" && request.method === "POST") {
    const body = await readJson(request);
    const brpUrl = typeof body.brpApiUrl === "string" ? body.brpApiUrl.trim() : "";
    const brpKey = typeof body.brpApiKey === "string" ? body.brpApiKey : undefined;
    if (!brpUrl) return badRequest("BRP API URL er påkrævet");
    const test = await testBrpFetch(brpUrl, brpKey);
    if (!test.ok) return json({ ok: false, error: test.error }, { status: 400 });
    return json({ ok: true, businessUnits: test.units });
  }

  if (path === "/admin/tenant/branding" && request.method === "PUT") {
    const body = await readJson(request);
    const sets: string[] = [];
    const values: unknown[] = [];
    if (typeof body.logoUrl === "string") {
      sets.push("logo_url = ?");
      values.push(body.logoUrl);
    }
    if (typeof body.primaryColor === "string") {
      sets.push("primary_color = ?");
      values.push(body.primaryColor);
    }
    if (typeof body.secondaryColor === "string") {
      sets.push("secondary_color = ?");
      values.push(body.secondaryColor);
    }
    if (typeof body.font === "string") {
      sets.push("font = ?");
      values.push(body.font);
    }
    if (typeof body.template === "string") {
      sets.push("template = ?");
      values.push(body.template);
    }
    if (typeof body.businessName === "string") {
      sets.push("business_name = ?");
      values.push(body.businessName.trim());
    }
    if (sets.length === 0) return json({ tenant: tenantPublic(tenant) });
    sets.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(tenantId);
    await env.DB.prepare(`UPDATE tenants SET ${sets.join(", ")} WHERE id = ?`)
      .bind(...values)
      .run();
    const next = await loadTenant(env.DB, tenantId);
    return json({ tenant: next ? tenantPublic(next) : null });
  }

  if (path === "/admin/tenant/products" && request.method === "PUT") {
    const body = await readJson(request);
    const ps = body.productSettings;
    if (!ps || typeof ps !== "object" || Array.isArray(ps)) return badRequest("productSettings skal være et objekt");
    const merged = mergeProductSettings(JSON.stringify(ps));
    await env.DB.prepare("UPDATE tenants SET product_settings = ?, updated_at = ? WHERE id = ?")
      .bind(JSON.stringify(merged), new Date().toISOString(), tenantId)
      .run();
    const next = await loadTenant(env.DB, tenantId);
    return json({ tenant: next ? tenantPublic(next) : null });
  }

  if (path === "/admin/tenant/domain" && request.method === "PUT") {
    const body = await readJson(request);
    const domain = typeof body.customDomain === "string" ? body.customDomain.trim().toLowerCase() : "";
    if (!domain) return badRequest("Domæne er påkrævet");
    await env.DB.prepare("UPDATE tenants SET custom_domain = ?, domain_verified = 0, updated_at = ? WHERE id = ?")
      .bind(domain, new Date().toISOString(), tenantId)
      .run();
    const next = await loadTenant(env.DB, tenantId);
    return json({ tenant: next ? tenantPublic(next) : null });
  }

  if (path === "/admin/tenant/status" && request.method === "GET") {
    const t = tenant;
    return json({
      isLive: t.is_live === 1,
      brpConnected: t.brp_connected === 1,
      brpLastSync: t.brp_last_sync,
      customDomain: t.custom_domain,
      domainVerified: t.domain_verified === 1,
      platformSubdomain: t.platform_subdomain,
      sslStatus: t.custom_domain ? (t.domain_verified === 1 ? "ready" : "pending") : "n/a"
    });
  }

  if (path === "/admin/tenant/publish" && request.method === "POST") {
    await env.DB.prepare("UPDATE tenants SET is_live = 1, updated_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), tenantId)
      .run();
    const next = await loadTenant(env.DB, tenantId);
    return json({ tenant: next ? tenantPublic(next) : null });
  }

  if (path === "/admin/tenant/unpublish" && request.method === "POST") {
    await env.DB.prepare("UPDATE tenants SET is_live = 0, updated_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), tenantId)
      .run();
    const next = await loadTenant(env.DB, tenantId);
    return json({ tenant: next ? tenantPublic(next) : null });
  }

  if (path === "/admin/tenant/sync" && request.method === "POST") {
    if (!tenant.brp_api_url) return badRequest("Tilslut BRP først");
    const test = await testBrpFetch(tenant.brp_api_url, tenant.brp_api_key ?? undefined);
    if (!test.ok) return badRequest(test.error);
    const now = new Date().toISOString();
    await env.DB.prepare("UPDATE tenants SET brp_connected = 1, brp_last_sync = ?, updated_at = ? WHERE id = ?")
      .bind(now, now, tenantId)
      .run();
    const next = await loadTenant(env.DB, tenantId);
    return json({ tenant: next ? tenantPublic(next) : null, businessUnits: test.units });
  }

  if (path === "/admin/tenant/domain/check" && request.method === "POST") {
    // MVP: mark verified if domain string looks like fqdn (real DNS check out of scope)
    const t = await loadTenant(env.DB, tenantId);
    if (!t?.custom_domain) return badRequest("Angiv et domæne først");
    const looksOk = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(t.custom_domain);
    if (looksOk) {
      await env.DB.prepare("UPDATE tenants SET domain_verified = 1, updated_at = ? WHERE id = ?")
        .bind(new Date().toISOString(), tenantId)
        .run();
    }
    const next = await loadTenant(env.DB, tenantId);
    return json({
      verified: looksOk,
      tenant: next ? tenantPublic(next) : null,
      cnameTarget: `${t.platform_subdomain ?? "dit-butik"}.brpfront.dk`
    });
  }

  if (path === "/admin/tenant/account" && request.method === "DELETE") {
    const body = await readJson(request);
    const password = typeof body.password === "string" ? body.password : "";
    if (!password) return badRequest("Adgangskode er påkrævet for at slette");
    const ok = await verifyPassword(password, tenant.password_hash);
    if (!ok) return badRequest("Forkert adgangskode");
    await env.DB.prepare("DELETE FROM tenants WHERE id = ?").bind(tenantId).run();
    return new Response(null, { status: 204 });
  }

  if (path === "/admin/brp/catalog" && request.method === "GET") {
    const unitsRes = await mockBrp.getBusinessUnits();
    const businessunits = unitsRes.businessunits;
    const categoriesByUnit: Record<number, { id: number; name: string; sortorder: number }[]> = {};
    const productsByUnit: Record<number, unknown[]> = {};
    for (const u of businessunits) {
      const ids = String(u.id);
      const cats = await mockBrp.getWebCategories(ids);
      categoriesByUnit[u.id] = cats.webcategories;
      const prods = await mockBrp.getProducts({ businessunitids: ids, bookablefrominternet: "true" });
      productsByUnit[u.id] = prods.products;
    }
    return json({ businessunits, categoriesByUnit, productsByUnit });
  }

  return null;
}
