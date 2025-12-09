
-- ✅ سكريبت التحقق من صحة الحسابات المالية
-- Financial Data Verification Script
-- التاريخ: 2025-12-09

-- ======================================
-- تحليل مفصل لمشروع ابار الجراحي
-- ======================================

-- 1️⃣ إجمالي الأجور المدفوعة
SELECT 
  'الأجور المدفوعة' as category,
  COALESCE(SUM(CAST(paid_amount AS DECIMAL)), 0) as total_amount,
  COUNT(*) as record_count
FROM worker_attendance 
WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%الجراحي%')
AND is_present = true;

-- 2️⃣ إجمالي تكاليف المواد
SELECT 
  'تكاليف المواد' as category,
  COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total_amount,
  COUNT(*) as record_count
FROM material_purchases 
WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%الجراحي%');

-- 3️⃣ إجمالي مصاريف النقل
SELECT 
  'مصاريف النقل' as category,
  COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount,
  COUNT(*) as record_count
FROM transportation_expenses 
WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%الجراحي%');

-- 4️⃣ إجمالي حوالات العمال
SELECT 
  'حوالات العمال' as category,
  COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount,
  COUNT(*) as record_count
FROM worker_transfers 
WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%الجراحي%');

-- 5️⃣ إجمالي المصاريف المتنوعة
SELECT 
  'المصاريف المتنوعة' as category,
  COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount,
  COUNT(*) as record_count
FROM worker_misc_expenses 
WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%الجراحي%');

-- 6️⃣ التحويلات الصادرة إلى مشاريع أخرى
SELECT 
  'التحويلات الصادرة' as category,
  COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount,
  COUNT(*) as record_count
FROM project_fund_transfers 
WHERE from_project_id = (SELECT id FROM projects WHERE name LIKE '%الجراحي%');

-- 7️⃣ التحويلات الواردة من مشاريع أخرى
SELECT 
  'التحويلات الواردة' as category,
  COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount,
  COUNT(*) as record_count
FROM project_fund_transfers 
WHERE to_project_id = (SELECT id FROM projects WHERE name LIKE '%الجراحي%');

-- 8️⃣ تحويلات العهدة (الدخل)
SELECT 
  'تحويلات العهدة' as category,
  COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount,
  COUNT(*) as record_count
FROM fund_transfers 
WHERE project_id = (SELECT id FROM projects WHERE name LIKE '%الجراحي%');

-- ======================================
-- الملخص النهائي - يجب أن يتطابق مع جميع الصفحات
-- ======================================

WITH project_id AS (
  SELECT id FROM projects WHERE name LIKE '%الجراحي%' LIMIT 1
),
expenses AS (
  SELECT 
    COALESCE(SUM(CAST(paid_amount AS DECIMAL)), 0) as wages
  FROM worker_attendance 
  WHERE project_id = (SELECT id FROM project_id)
  AND is_present = true
),
materials AS (
  SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as amount
  FROM material_purchases WHERE project_id = (SELECT id FROM project_id)
),
transport AS (
  SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as amount
  FROM transportation_expenses WHERE project_id = (SELECT id FROM project_id)
),
transfers AS (
  SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as amount
  FROM worker_transfers WHERE project_id = (SELECT id FROM project_id)
),
misc AS (
  SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as amount
  FROM worker_misc_expenses WHERE project_id = (SELECT id FROM project_id)
),
outgoing AS (
  SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as amount
  FROM project_fund_transfers WHERE from_project_id = (SELECT id FROM project_id)
),
incoming AS (
  SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as amount
  FROM project_fund_transfers WHERE to_project_id = (SELECT id FROM project_id)
),
fund_income AS (
  SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as amount
  FROM fund_transfers WHERE project_id = (SELECT id FROM project_id)
)

SELECT 
  p.name as project_name,
  -- المصروفات الفرعية
  e.wages as worker_wages,
  m.amount as material_costs,
  t.amount as transport_expenses,
  tr.amount as worker_transfers,
  misc.amount as misc_expenses,
  o.amount as outgoing_transfers,
  -- الإجماليات
  (e.wages + m.amount + t.amount + tr.amount + misc.amount + o.amount) as total_expenses,
  (f.amount + i.amount) as total_income,
  ((f.amount + i.amount) - (e.wages + m.amount + t.amount + tr.amount + misc.amount + o.amount)) as current_balance
FROM projects p
CROSS JOIN expenses e
CROSS JOIN materials m
CROSS JOIN transport t
CROSS JOIN transfers tr
CROSS JOIN misc
CROSS JOIN outgoing o
CROSS JOIN incoming i
CROSS JOIN fund_income f
WHERE p.id = (SELECT id FROM project_id);
