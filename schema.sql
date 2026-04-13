-- BRP Platform D1 Schema
-- Run: wrangler d1 execute brp-platform --file=schema.sql

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  brp_api_url TEXT,
  brp_api_key TEXT,
  brp_api_connected BOOLEAN DEFAULT FALSE,
  template TEXT DEFAULT 'minimal',
  branding_logo_url TEXT,
  branding_primary_color TEXT DEFAULT '#000000',
  branding_secondary_color TEXT DEFAULT '#ffffff',
  branding_font TEXT DEFAULT 'system',
  branding_business_name TEXT,
  custom_domain TEXT,
  domain_verified BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT FALSE,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(id),
  skip_location_step BOOLEAN DEFAULT FALSE,
  default_location_id TEXT,
  product_display TEXT DEFAULT 'cards',
  show_product_descriptions BOOLEAN DEFAULT TRUE,
  featured_product_ids TEXT,
  custom_signup_fields TEXT,
  terms_url TEXT,
  privacy_url TEXT,
  success_redirect_url TEXT,
  ga_measurement_id TEXT,
  consent_toggles TEXT
);
