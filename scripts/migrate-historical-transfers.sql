-- ═══════════════════════════════════════════════════════════════════
-- Migration: قيود تسوية محاسبية تاريخية لنقل المخزون بين المشاريع
-- ═══════════════════════════════════════════════════════════════════
-- الغرض: إنشاء قيود "تسوية نقل صادر" و "تسوية نقل وارد" لكل عمليات
-- النقل التاريخية المسجلة في inventory_transactions، لتصحيح ازدواج
-- المصروف في تقارير المشاريع.
-- 
-- المرجع المحاسبي: AICPA Construction Contractors Guide — WIP-to-WIP Transfer
-- 
-- آمن للتشغيل المتكرر (idempotent): يستخدم WHERE NOT EXISTS لمنع التكرار.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- إنشاء قيود التسوية لكل سجل IN في inventory_transactions بنوع project_transfer
-- نستخدم IN فقط لتفادي ازدواج (IN+OUT يمثلان نفس النقلة)
WITH transfers_to_migrate AS (
  SELECT
    it.id                                    AS transaction_id,
    it.from_project_id,
    it.to_project_id,
    it.transaction_date,
    it.quantity,
    it.unit_cost,
    it.total_cost,
    ii.name                                  AS material_name,
    ii.unit                                  AS material_unit,
    ii.category                              AS material_category,
    pf.name                                  AS from_project_name,
    pt.name                                  AS to_project_name
  FROM inventory_transactions it
  JOIN inventory_items ii ON ii.id = it.item_id
  JOIN projects pf       ON pf.id = it.from_project_id
  JOIN projects pt       ON pt.id = it.to_project_id
  WHERE it.reference_type = 'project_transfer'
    AND it.type = 'IN'
    AND CAST(it.total_cost AS numeric) > 0
    AND NOT EXISTS (
      SELECT 1 FROM material_purchases mp
      WHERE mp.purchase_type IN ('تسوية نقل صادر', 'تسوية نقل وارد')
        AND mp.notes LIKE '%[migration_ref:' || it.id::text || ']%'
    )
),
-- 1) قيد "تسوية نقل صادر" في المشروع المصدر (يخفض المصروف)
inserted_outgoing AS (
  INSERT INTO material_purchases (
    project_id, material_name, material_category, material_unit,
    quantity, unit, unit_price, total_amount,
    purchase_type, paid_amount, remaining_amount,
    supplier_name, notes, purchase_date
  )
  SELECT
    from_project_id,
    material_name,
    material_category,
    material_unit,
    quantity,
    material_unit,
    unit_cost,
    total_cost,
    'تسوية نقل صادر',
    total_cost,
    0,
    'مشروع: ' || to_project_name,
    'تسوية محاسبية تاريخية: تخفيض مصروف بقيمة مواد منقولة إلى مشروع: ' || to_project_name 
      || ' (الكمية: ' || quantity || ' ' || material_unit || ') [migration_ref:' || transaction_id::text || ']',
    transaction_date
  FROM transfers_to_migrate
  RETURNING id, project_id
),
-- 2) قيد "تسوية نقل وارد" في المشروع المستلم (يضيف القيمة كمصروف)
inserted_incoming AS (
  INSERT INTO material_purchases (
    project_id, material_name, material_category, material_unit,
    quantity, unit, unit_price, total_amount,
    purchase_type, paid_amount, remaining_amount,
    supplier_name, notes, purchase_date
  )
  SELECT
    to_project_id,
    material_name,
    material_category,
    material_unit,
    quantity,
    material_unit,
    unit_cost,
    total_cost,
    'تسوية نقل وارد',
    total_cost,
    0,
    'مشروع: ' || from_project_name,
    'تسوية محاسبية تاريخية: إضافة قيمة مواد مستلمة من مشروع: ' || from_project_name
      || ' (الكمية: ' || quantity || ' ' || material_unit || ') [migration_ref:' || transaction_id::text || ']',
    transaction_date
  FROM transfers_to_migrate
  RETURNING id, project_id
)
SELECT
  (SELECT COUNT(*) FROM inserted_outgoing) AS outgoing_inserted,
  (SELECT COUNT(*) FROM inserted_incoming) AS incoming_inserted,
  (SELECT COUNT(*) FROM transfers_to_migrate) AS transfers_processed;

-- إبطال الملخصات اليومية للمشاريع المتأثرة (لإعادة الحساب لاحقاً)
DELETE FROM daily_expense_summaries
WHERE (project_id, date) IN (
  SELECT DISTINCT mp.project_id, mp.purchase_date::text
  FROM material_purchases mp
  WHERE mp.purchase_type IN ('تسوية نقل صادر', 'تسوية نقل وارد')
    AND mp.notes LIKE '%[migration_ref:%'
);

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- التحقق: عرض القيود الجديدة
-- ═══════════════════════════════════════════════════════════════════
SELECT
  purchase_type,
  COUNT(*) as cnt,
  SUM(CAST(total_amount AS numeric)) as total
FROM material_purchases
WHERE purchase_type IN ('تسوية نقل صادر', 'تسوية نقل وارد')
GROUP BY purchase_type
ORDER BY purchase_type;
