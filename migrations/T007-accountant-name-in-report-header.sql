-- ===================================================================
-- T007: إضافة عمود accountant_name إلى report_header_settings
-- يخزن اسم المحاسب الافتراضي ليظهر في تذييل التوقيعات بكل التقارير
-- ===================================================================

ALTER TABLE report_header_settings
  ADD COLUMN IF NOT EXISTS accountant_name text;
