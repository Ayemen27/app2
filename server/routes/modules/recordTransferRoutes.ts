import { Router } from "express";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { db } from "../../db.js";
import { 
  materialPurchases, supplierPayments, transportationExpenses, 
  workerTransfers, workerMiscExpenses, workerAttendance, projects
} from "../../../shared/schema.js";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();
router.use(requireAuth as any);

const TABLE_MAP: Record<string, any> = {
  materialPurchases,
  supplierPayments,
  transportationExpenses,
  workerTransfers,
  workerMiscExpenses,
  attendance: workerAttendance,
};

const DATE_FIELD_MAP: Record<string, string> = {
  materialPurchases: "purchase_date",
  supplierPayments: "payment_date",
  transportationExpenses: "date",
  workerTransfers: "transfer_date",
  workerMiscExpenses: "date",
  attendance: "attendance_date",
};

const TABLE_LABELS: Record<string, string> = {
  materialPurchases: "مشتريات المواد",
  supplierPayments: "مدفوعات الموردين",
  transportationExpenses: "أجور المواصلات",
  workerTransfers: "حوالات العمال",
  workerMiscExpenses: "نثريات العمال",
  attendance: "الحضور",
};

function normalize(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val).trim().toLowerCase();
}

function makeFingerprint(table: string, record: any): string {
  let parts: string[] = [table];
  const dateField = DATE_FIELD_MAP[table];
  parts.push(normalize(record[dateField]));

  switch (table) {
    case "materialPurchases":
      parts.push(normalize(record.material_name));
      parts.push(normalize(record.quantity));
      parts.push(normalize(record.unit));
      parts.push(normalize(record.unit_price));
      parts.push(normalize(record.total_amount));
      parts.push(normalize(record.supplier_id));
      parts.push(normalize(record.invoice_number));
      break;
    case "supplierPayments":
      parts.push(normalize(record.supplier_id));
      parts.push(normalize(record.amount));
      parts.push(normalize(record.payment_method));
      parts.push(normalize(record.reference_number));
      parts.push(normalize(record.purchase_id));
      break;
    case "transportationExpenses":
      parts.push(normalize(record.amount));
      parts.push(normalize(record.description));
      parts.push(normalize(record.category));
      parts.push(normalize(record.worker_id));
      break;
    case "workerTransfers":
      parts.push(normalize(record.worker_id));
      parts.push(normalize(record.amount));
      parts.push(normalize(record.recipient_name));
      parts.push(normalize(record.transfer_method));
      parts.push(normalize(record.transfer_number));
      break;
    case "workerMiscExpenses":
      parts.push(normalize(record.amount));
      parts.push(normalize(record.description));
      break;
    case "attendance":
      parts.push(normalize(record.worker_id));
      parts.push(normalize(record.daily_wage));
      parts.push(normalize(record.work_days));
      parts.push(normalize(record.total_pay));
      break;
  }

  const key = parts.join("|");
  return crypto.createHash("sha256").update(key).digest("hex").substring(0, 24);
}

function formatRecord(table: string, record: any) {
  const dateField = DATE_FIELD_MAP[table];
  let amount = 0;
  let description = "";

  switch (table) {
    case "materialPurchases":
      amount = parseFloat(record.total_amount || "0");
      description = `${record.material_name || ""} - ${record.supplier_name || ""} (${record.quantity} ${record.unit})`;
      break;
    case "supplierPayments":
      amount = parseFloat(record.amount || "0");
      description = `دفعة ${record.payment_method || ""} - مرجع: ${record.reference_number || "-"}`;
      break;
    case "transportationExpenses":
      amount = parseFloat(record.amount || "0");
      description = record.description || "";
      break;
    case "workerTransfers":
      amount = parseFloat(record.amount || "0");
      description = `حوالة لـ ${record.recipient_name || ""} - ${record.transfer_method || ""}`;
      break;
    case "workerMiscExpenses":
      amount = parseFloat(record.amount || "0");
      description = record.description || record.notes || "";
      break;
    case "attendance":
      amount = parseFloat(record.total_pay || record.daily_wage || "0");
      description = `حضور - أيام العمل: ${record.work_days || "0"}`;
      break;
  }

  return {
    id: record.id,
    table,
    tableLabel: TABLE_LABELS[table],
    date: record[dateField],
    amount,
    description,
    workerId: record.worker_id || null,
    supplierId: record.supplier_id || null,
    fingerprint: makeFingerprint(table, record),
    raw: record,
  };
}

router.get("/review", requireAdmin as any, async (req, res) => {
  try {
    const { projectId, date } = req.query;
    if (!projectId || !date) {
      return res.status(400).json({ error: "projectId و date مطلوبان" });
    }

    const dateStr = String(date);
    const pid = String(projectId);
    const results: any[] = [];
    const tableErrors: { table: string; error: string }[] = [];

    for (const [tableName, table] of Object.entries(TABLE_MAP)) {
      const dateCol = DATE_FIELD_MAP[tableName];
      try {
        const rows = await db.select().from(table).where(
          and(
            eq(table.project_id, pid),
            eq((table as any)[dateCol], dateStr)
          )
        );
        for (const row of rows) {
          results.push(formatRecord(tableName, row));
        }
      } catch (e: any) {
        console.error(`[RecordTransfer] خطأ في قراءة ${tableName}:`, e.message);
        tableErrors.push({ table: TABLE_LABELS[tableName], error: "فشل في قراءة البيانات من هذا الجدول" });
      }
    }

    results.sort((a, b) => (TABLE_LABELS[a.table] || "").localeCompare(TABLE_LABELS[b.table] || ""));
    res.json({ 
      date: dateStr, 
      projectId: pid, 
      records: results, 
      count: results.length,
      tableErrors: tableErrors.length > 0 ? tableErrors : undefined,
    });
  } catch (error: any) {
    console.error("[RecordTransfer] /review error:", error.message);
    res.status(500).json({ error: "حدث خطأ أثناء جلب السجلات" });
  }
});

router.post("/preview", requireAdmin as any, async (req, res) => {
  try {
    const { sourceProjectId, targetProjectId, date, selections } = req.body;
    if (!sourceProjectId || !targetProjectId || !selections?.length) {
      return res.status(400).json({ error: "بيانات غير مكتملة" });
    }
    if (sourceProjectId === targetProjectId) {
      return res.status(400).json({ error: "المشروع المصدر والهدف يجب أن يكونا مختلفين" });
    }

    const targetRecords: any[] = [];
    for (const [tableName, table] of Object.entries(TABLE_MAP)) {
      const dateCol = DATE_FIELD_MAP[tableName];
      try {
        const rows = await db.select().from(table).where(
          and(
            eq(table.project_id, String(targetProjectId)),
            eq((table as any)[dateCol], String(date))
          )
        );
        for (const row of rows) {
          targetRecords.push(formatRecord(tableName, row));
        }
      } catch {}
    }

    const targetFingerprints = new Set(targetRecords.map(r => r.fingerprint));

    const transferable: any[] = [];
    const duplicates: any[] = [];
    let totalAmount = 0;

    for (const sel of selections) {
      const table = TABLE_MAP[sel.table];
      if (!table) continue;
      try {
        const [record] = await db.select().from(table).where(
          and(eq(table.id, sel.id), eq(table.project_id, String(sourceProjectId)))
        );
        if (!record) continue;
        const formatted = formatRecord(sel.table, record);

        if (targetFingerprints.has(formatted.fingerprint)) {
          duplicates.push(formatted);
        } else {
          transferable.push(formatted);
          totalAmount += formatted.amount;
        }
      } catch {}
    }

    res.json({
      transferableCount: transferable.length,
      duplicateCount: duplicates.length,
      totalAmount,
      transferable,
      duplicates,
    });
  } catch (error: any) {
    console.error("[RecordTransfer] /preview error:", error.message);
    res.status(500).json({ error: "حدث خطأ أثناء معاينة النقل" });
  }
});

router.post("/confirm", requireAdmin as any, async (req, res) => {
  try {
    const { sourceProjectId, targetProjectId, selections } = req.body;
    if (!sourceProjectId || !targetProjectId || !selections?.length) {
      return res.status(400).json({ error: "بيانات غير مكتملة" });
    }
    if (sourceProjectId === targetProjectId) {
      return res.status(400).json({ error: "المشروع المصدر والهدف يجب أن يكونا مختلفين" });
    }

    let movedCount = 0;
    let totalAmountMoved = 0;
    const errors: string[] = [];
    const movedItems: { table: string; id: string }[] = [];

    await db.transaction(async (tx) => {
      for (const sel of selections) {
        const table = TABLE_MAP[sel.table];
        if (!table) {
          errors.push(`جدول غير معروف: ${sel.table}`);
          continue;
        }
        try {
          const [existing] = await tx.select().from(table).where(
            and(eq(table.id, sel.id), eq(table.project_id, String(sourceProjectId)))
          );
          if (!existing) {
            errors.push(`سجل غير موجود: ${sel.id} في ${TABLE_LABELS[sel.table] || sel.table}`);
            continue;
          }

          const formatted = formatRecord(sel.table, existing);
          const dateField = DATE_FIELD_MAP[sel.table];
          const dateVal = existing[dateField];

          if (dateVal) {
            const targetRows = await tx.select().from(table).where(
              and(
                eq(table.project_id, String(targetProjectId)),
                eq((table as any)[dateField], dateVal)
              )
            );
            const hasDuplicate = targetRows.some((r: any) => {
              const fp = makeFingerprint(sel.table, r);
              return fp === formatted.fingerprint;
            });

            if (hasDuplicate) {
              errors.push(`سجل مكرر تم تخطيه: ${formatted.description}`);
              continue;
            }
          }

          await tx.update(table)
            .set({ project_id: String(targetProjectId) })
            .where(and(eq(table.id, sel.id), eq(table.project_id, String(sourceProjectId))));

          movedCount++;
          const amt = parseFloat(existing.amount || existing.total_amount || existing.total_pay || existing.daily_wage || "0");
          totalAmountMoved += amt;
          movedItems.push({ table: sel.table, id: sel.id });
        } catch (e: any) {
          errors.push(`فشل نقل ${TABLE_LABELS[sel.table] || sel.table} (${sel.id}): ${e.message}`);
        }
      }
    });

    res.json({ movedCount, totalAmountMoved, errors, movedItems });
  } catch (error: any) {
    console.error("[RecordTransfer] /confirm error:", error.message);
    res.status(500).json({ error: "حدث خطأ أثناء عملية النقل - لم يتم نقل أي سجل" });
  }
});

export default router;
