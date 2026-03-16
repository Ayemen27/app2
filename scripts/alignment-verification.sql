-- =====================================================
-- خطة اختبار التطابق الشاملة - المرحلة الثالثة
-- تنفيذ آمن بدون فقدان بيانات (جميع الاختبارات قراءة فقط أو ROLLBACK)
-- =====================================================

-- ============================================================
-- القسم 1: التحقق من أنواع البيانات (Type Verification)
-- ============================================================

SELECT '=== القسم 1: التحقق من أنواع البيانات ===' AS section;

SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE (table_name, column_name) IN (
  ('audit_logs', 'user_id'),
  ('users', 'is_active'),
  ('fund_transfers', 'transfer_date'),
  ('metrics', 'metric_value'),
  ('well_work_crews', 'workers_count'),
  ('well_work_crews', 'masters_count'),
  ('monitoring_data', 'key'),
  ('monitoring_data', 'value'),
  ('system_logs', 'level'),
  ('backup_settings', 'key'),
  ('refresh_tokens', 'parent_id')
)
ORDER BY table_name, column_name;

-- ============================================================
-- القسم 2: التحقق من عدم وجود أعمدة قديمة (Schema Drift)
-- ============================================================

SELECT '=== القسم 2: فحص Schema Drift ===' AS section;

SELECT
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='metrics' AND column_name='metric_value') AS has_metric_value_correct,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='metrics' AND column_name='value') AS has_old_value_wrong;

-- ============================================================
-- القسم 3: تغطية أعمدة المزامنة (35 جدول)
-- ============================================================

SELECT '=== القسم 3: تغطية أعمدة المزامنة ===' AS section;

SELECT table_name,
  bool_and(CASE WHEN column_name='is_local' THEN true END) AS has_is_local,
  bool_and(CASE WHEN column_name='synced' THEN true END) AS has_synced,
  bool_and(CASE WHEN column_name='pending_sync' THEN true END) AS has_pending_sync
FROM information_schema.columns
WHERE table_schema='public'
  AND column_name IN ('is_local','synced','pending_sync')
GROUP BY table_name
HAVING COUNT(DISTINCT column_name) = 3
ORDER BY table_name;

-- ============================================================
-- القسم 4: فحص سلامة البيانات الحالية
-- ============================================================

SELECT '=== القسم 4: سلامة البيانات ===' AS section;

SELECT 'audit_logs' AS tbl, COUNT(*) AS total, COUNT(user_id) AS non_null_user_id FROM audit_logs
UNION ALL
SELECT 'users', COUNT(*), COUNT(is_active) FROM users
UNION ALL
SELECT 'fund_transfers', COUNT(*), COUNT(transfer_date) FROM fund_transfers
UNION ALL
SELECT 'metrics', COUNT(*), COUNT(metric_value) FROM metrics
UNION ALL
SELECT 'well_work_crews', COUNT(*), COUNT(workers_count) FROM well_work_crews;

-- ============================================================
-- القسم 5: التحقق من قيم is_active (boolean)
-- ============================================================

SELECT '=== القسم 5: قيم is_active ===' AS section;

SELECT is_active, pg_typeof(is_active) AS actual_type, COUNT(*) AS cnt
FROM users
GROUP BY is_active
ORDER BY is_active;

-- ============================================================
-- القسم 6: التحقق من transfer_date (timestamp)
-- ============================================================

SELECT '=== القسم 6: قيم transfer_date ===' AS section;

SELECT pg_typeof(transfer_date) AS actual_type, COUNT(*) AS cnt
FROM fund_transfers
WHERE transfer_date IS NOT NULL
GROUP BY pg_typeof(transfer_date);

-- ============================================================
-- القسم 7: التحقق من well_work_crews counts (decimal)
-- ============================================================

SELECT '=== القسم 7: قيم أعداد الطواقم ===' AS section;

SELECT pg_typeof(workers_count) AS workers_type,
       pg_typeof(masters_count) AS masters_type,
       COUNT(*) AS cnt
FROM well_work_crews
GROUP BY pg_typeof(workers_count), pg_typeof(masters_count);

-- ============================================================
-- القسم 8: التحقق من عدد الجداول (83)
-- ============================================================

SELECT '=== القسم 8: عدد الجداول ===' AS section;

SELECT COUNT(*) AS total_tables
FROM information_schema.tables
WHERE table_schema='public' AND table_type='BASE TABLE';

-- ============================================================
-- القسم 9: فحص القيود الأجنبية الموجودة حالياً
-- ============================================================

SELECT '=== القسم 9: القيود الأجنبية الحالية ===' AS section;

SELECT COUNT(*) AS total_fk_constraints
FROM pg_constraint
WHERE contype = 'f'
AND conrelid IN (SELECT oid FROM pg_class WHERE relnamespace = 'public'::regnamespace);

-- ============================================================
-- القسم 10: اختبارات الكتابة/القراءة الآمنة (ROLLBACK)
-- ============================================================

SELECT '=== القسم 10: اختبارات RW مع ROLLBACK ===' AS section;

-- Test 1: metrics metricValue
BEGIN;
INSERT INTO metrics(device_id, metric_name, metric_value, recorded_at)
VALUES('__test_alignment__', 'latency', 123.45, NOW());
SELECT 'metrics_insert' AS test, metric_value, pg_typeof(metric_value) AS type
FROM metrics WHERE device_id = '__test_alignment__';
ROLLBACK;

-- Test 2: users is_active boolean
BEGIN;
UPDATE users SET is_active = false WHERE id = (SELECT id FROM users LIMIT 1);
SELECT 'users_is_active' AS test, is_active, pg_typeof(is_active) AS type
FROM users WHERE id = (SELECT id FROM users LIMIT 1);
ROLLBACK;

-- Test 3: audit_logs user_id integer
BEGIN;
INSERT INTO audit_logs(user_id, action, meta, created_at)
VALUES(NULL, '__test_alignment__', '{}', NOW());
SELECT 'audit_logs_null_user' AS test, user_id, pg_typeof(user_id) AS type
FROM audit_logs WHERE action = '__test_alignment__';
ROLLBACK;

-- Test 4: audit_logs with integer user_id
BEGIN;
INSERT INTO audit_logs(user_id, action, meta, created_at)
VALUES(12345, '__test_alignment_int__', '{}', NOW());
SELECT 'audit_logs_int_user' AS test, user_id, pg_typeof(user_id) AS type
FROM audit_logs WHERE action = '__test_alignment_int__';
ROLLBACK;
