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

function makeFingerprint(table: string, record: any): string {
  const dateField = DATE_FIELD_MAP[table];
  const key = `${table}|${record[dateField]}|${record.amount || record.total_amount || record.daily_rate || "0"}|${record.worker_id || record.supplier_id || ""}|${record.description || record.material_name || record.notes || ""}`;
  return crypto.createHash("md5").update(key).digest("hex").substring(0, 12);
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
      amount = parseFloat(record.daily_rate || "0");
      description = `حضور - حالة: ${record.status || ""}`;
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
      } catch {}
    }

    results.sort((a, b) => (TABLE_LABELS[a.table] || "").localeCompare(TABLE_LABELS[b.table] || ""));
    res.json({ date: dateStr, projectId: pid, records: results, count: results.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/preview", requireAdmin as any, async (req, res) => {
  try {
    const { sourceProjectId, targetProjectId, date, selections } = req.body;
    if (!sourceProjectId || !targetProjectId || !selections?.length) {
      return res.status(400).json({ error: "بيانات غير مكتملة" });
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
    res.status(500).json({ error: error.message });
  }
});

router.post("/confirm", requireAdmin as any, async (req, res) => {
  try {
    const { sourceProjectId, targetProjectId, selections } = req.body;
    if (!sourceProjectId || !targetProjectId || !selections?.length) {
      return res.status(400).json({ error: "بيانات غير مكتملة" });
    }

    let movedCount = 0;
    let totalAmountMoved = 0;
    const errors: string[] = [];

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
            errors.push(`سجل غير موجود: ${sel.id}`);
            continue;
          }

          await tx.update(table)
            .set({ project_id: String(targetProjectId) })
            .where(and(eq(table.id, sel.id), eq(table.project_id, String(sourceProjectId))));

          movedCount++;
          const amt = parseFloat(existing.amount || existing.total_amount || existing.daily_rate || "0");
          totalAmountMoved += amt;
        } catch (e: any) {
          errors.push(`فشل نقل ${sel.id}: ${e.message}`);
        }
      }
    });

    res.json({ movedCount, totalAmountMoved, errors });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
