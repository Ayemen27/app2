-- ===================================================================
-- T006: Report Header Settings (إعدادات ترويسة التقارير)
-- Per-user report branding (company name, contact, colors)
-- One row per user (UNIQUE on user_id)
-- ===================================================================

CREATE TABLE IF NOT EXISTS report_header_settings (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL,
  company_name text NOT NULL,
  company_name_en text,
  address text,
  phone text,
  email text,
  website text,
  logo_url text,
  footer_text text,
  primary_color text NOT NULL DEFAULT '#1B2A4A',
  secondary_color text NOT NULL DEFAULT '#2E5090',
  accent_color text NOT NULL DEFAULT '#4A90D9',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  created_by varchar,
  last_modified_by varchar,
  CONSTRAINT report_header_settings_user_id_key UNIQUE (user_id),
  CONSTRAINT report_header_settings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_report_header_settings_user_id
  ON report_header_settings(user_id);
