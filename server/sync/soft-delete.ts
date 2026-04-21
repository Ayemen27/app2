/**
 * 🪦 Soft Delete Helper
 *
 * يحوّل DELETE إلى UPDATE deleted_at + hlc_timestamp
 * - لا يكسر cascades في DB لأن السجل ما زال موجوداً
 * - العملاء يستلمونه كـ tombstone في الـ pull التالي
 * - GET helpers تستخدم `activeOnly` لإخفاء المحذوفات
 *
 * الاستخدام:
 *   await softDelete('workers', id);
 *   await softDelete('projects', id, { hardDelete: true }); // override
 */

import { pool } from "../db";
import { newHlc } from "./hlc-singleton";

const TOMBSTONE_TABLES = new Set<string>([
  "projects",
  "workers",
  "wells",
  "fund_transfers",
  "worker_attendance",
  "suppliers",
  "materials",
  "material_purchases",
  "supplier_payments",
  "transportation_expenses",
  "worker_transfers",
  "worker_balances",
  "daily_expense_summaries",
  "worker_misc_expenses",
  "project_fund_transfers",
  "well_tasks",
  "well_expenses",
  "equipment",
  "equipment_movements",
  "well_work_crews",
  "well_crew_workers",
  "well_solar_components",
  "well_transport_details",
  "well_receptions",
  "worker_settlements",
  "worker_settlement_lines",
  "autocomplete_data",
  "material_categories",
  "project_types",
  "worker_types",
  "print_settings",
]);

export function tableSupportsTombstone(table: string): boolean {
  return TOMBSTONE_TABLES.has(table);
}

export interface SoftDeleteResult {
  affected: number;
  hlc: string;
  mode: "soft" | "hard";
}

/**
 * احذف صفّاً ناعماً (إن دعم الجدول tombstones) أو صلباً.
 * @param table اسم الجدول snake_case
 * @param id قيمة المفتاح الرئيسي
 * @param opts.pkColumn اسم العمود (افتراضي: id)
 * @param opts.hardDelete فرض حذف صلب (مثلاً جداول مؤقتة)
 * @param opts.clientHlc طابع HLC وارد من العميل لدمجه
 */
export async function softDelete(
  table: string,
  id: string | number,
  opts: { pkColumn?: string; hardDelete?: boolean; clientHlc?: string } = {}
): Promise<SoftDeleteResult> {
  const pk = opts.pkColumn || "id";

  if (opts.hardDelete || !TOMBSTONE_TABLES.has(table)) {
    const r = await pool.query(
      `DELETE FROM "${table}" WHERE "${pk}" = $1`,
      [id]
    );
    return { affected: r.rowCount || 0, hlc: "", mode: "hard" };
  }

  const hlc = newHlc();
  const r = await pool.query(
    `UPDATE "${table}"
       SET deleted_at = NOW(),
           hlc_timestamp = $2
     WHERE "${pk}" = $1
       AND deleted_at IS NULL`,
    [id, hlc]
  );
  return { affected: r.rowCount || 0, hlc, mode: "soft" };
}

/**
 * استرجع سجلاً محذوفاً (undelete)
 */
export async function undelete(
  table: string,
  id: string | number,
  opts: { pkColumn?: string } = {}
): Promise<boolean> {
  const pk = opts.pkColumn || "id";
  if (!TOMBSTONE_TABLES.has(table)) return false;
  const hlc = newHlc();
  const r = await pool.query(
    `UPDATE "${table}"
       SET deleted_at = NULL,
           hlc_timestamp = $2
     WHERE "${pk}" = $1
       AND deleted_at IS NOT NULL`,
    [id, hlc]
  );
  return (r.rowCount || 0) > 0;
}

/**
 * اضف WHERE deleted_at IS NULL لـ Drizzle queries
 * استخدام: .where(and(...conds, activeFilter()))
 */
export const ACTIVE_FILTER_SQL = `deleted_at IS NULL`;
