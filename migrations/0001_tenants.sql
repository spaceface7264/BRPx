-- Tenants for admin panel (auth + storefront config)

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  business_name TEXT,

  brp_api_url TEXT,
  brp_api_key TEXT,
  brp_connected INTEGER NOT NULL DEFAULT 0,
  brp_last_sync TEXT,

  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#4F46E5',
  secondary_color TEXT NOT NULL DEFAULT '#F9FAFB',
  font TEXT NOT NULL DEFAULT 'system',
  template TEXT NOT NULL DEFAULT 'minimal',

  product_settings TEXT NOT NULL DEFAULT '{}',

  custom_domain TEXT,
  domain_verified INTEGER NOT NULL DEFAULT 0,
  platform_subdomain TEXT UNIQUE,

  is_live INTEGER NOT NULL DEFAULT 0,

  terms_url TEXT,
  privacy_url TEXT,
  ga_measurement_id TEXT,
  post_purchase_redirect_url TEXT,

  onboarding_step INTEGER NOT NULL DEFAULT 0,
  preview_token TEXT UNIQUE,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tenants_preview_token ON tenants (preview_token);
CREATE INDEX IF NOT EXISTS idx_tenants_platform_subdomain ON tenants (platform_subdomain);
