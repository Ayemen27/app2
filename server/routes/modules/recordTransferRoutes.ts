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

const DATE_COLUMN_MAP: Record<string, any> = {
  materialPurchases: materialPurchases.purchaseDate,
  supplierPayments: supplierPayments.paymentDate,
  transportationExpenses: transportationExpenses.date,
  workerTransfers: workerTransfers.transferDate,
  workerMiscExpenses: workerMiscExpenses.date,
  attendance: workerAttendance.attendanceDate,
};

const DATE_PROP_MAP: Record<string, string> = {
  materialPurchases: "purchaseDate",
  supplierPayments: "paymentDate",
  transportationExpenses: "date",
  workerTransfers: "transferDate",
  workerMiscExpenses: "date",
  attendance: "attendanceDate",
};

const TABLE_LABELS: Record<string, string> = {
  materialPurchases: "مشتريات المواد",
  supplierPayments: "مدفوعات الموردين",
  transportationExpenses: "أجور المواصلات",
  workerTransfers: "حوالات العمال",
  workerMiscExpenses: "نثريات العمال",
  attendance: "الحضور",
};

function formatNum(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function normalize(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val).trim().toLowerCase();
}

function makeFingerprint(table: string, record: any): string {
  let parts: string[] = [table];
  const dateProp = DATE_PROP_MAP[table];
  parts.push(normalize(record[dateProp]));

  switch (table) {
    case "materialPurchases":
      parts.push(normalize(record.materialName));
      parts.push(normalize(record.quantity));
      parts.push(normalize(record.unit));
      parts.push(normalize(record.unitPrice));
      parts.push(normalize(record.totalAmount));
      parts.push(normalize(record.supplier_id));
      parts.push(normalize(record.invoiceNumber));
      break;
    case "supplierPayments":
      parts.push(normalize(record.supplier_id));
      parts.push(normalize(record.amount));
      parts.push(normalize(record.paymentMethod));
      parts.push(normalize(record.referenceNumber));
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
      parts.push(normalize(record.recipientName));
      parts.push(normalize(record.transferMethod));
      parts.push(normalize(record.transferNumber));
      break;
    case "workerMiscExpenses":
      parts.push(normalize(record.amount));
      parts.push(normalize(record.description));
      break;
    case "attendance":
      parts.push(normalize(record.worker_id));
      parts.push(normalize(record.dailyWage));
      parts.push(normalize(record.workDays));
      parts.push(normalize(record.totalPay));
      parts.push(normalize(record.paidAmount));
      break;
  }

  const key = parts.join("|");
  return crypto.createHash("sha256").update(key).digest("hex").substring(0, 24);
}

function getFingerprintFields(table: string, record: any): Record<string, string> {
  const dateProp = DATE_PROP_MAP[table];
  const fields: Record<string, string> = { "التاريخ": normalize(record[dateProp]) };

  switch (table) {
    case "materialPurchases":
      fields["اسم المادة"] = normalize(record.materialName);
      fields["الكمية"] = normalize(record.quantity);
      fields["الوحدة"] = normalize(record.unit);
      fields["سعر الوحدة"] = normalize(record.unitPrice);
      fields["المبلغ"] = normalize(record.totalAmount);
      fields["المورد"] = normalize(record.supplier_id);
      fields["رقم الفاتورة"] = normalize(record.invoiceNumber);
      break;
    case "supplierPayments":
      fields["المورد"] = normalize(record.supplier_id);
      fields["المبلغ"] = normalize(record.amount);
      fields["طريقة الدفع"] = normalize(record.paymentMethod);
      fields["رقم المرجع"] = normalize(record.referenceNumber);
      break;
    case "transportationExpenses":
      fields["المبلغ"] = normalize(record.amount);
      fields["الوصف"] = normalize(record.description);
      fields["الفئة"] = normalize(record.category);
      fields["العامل"] = normalize(record.worker_id);
      break;
    case "workerTransfers":
      fields["العامل"] = normalize(record.worker_id);
      fields["المبلغ"] = normalize(record.amount);
      fields["المستلم"] = normalize(record.recipientName);
      fields["طريقة التحويل"] = normalize(record.transferMethod);
      break;
    case "workerMiscExpenses":
      fields["المبلغ"] = normalize(record.amount);
      fields["الوصف"] = normalize(record.description);
      break;
    case "attendance":
      fields["العامل"] = normalize(record.worker_id);
      fields["الأجر اليومي"] = normalize(record.dailyWage);
      fields["أيام العمل"] = normalize(record.workDays);
      fields["إجمالي الأجر"] = normalize(record.totalPay);
      fields["المدفوع"] = normalize(record.paidAmount);
      break;
  }
  return fields;
}

function formatRecord(table: string, record: any) {
  const dateProp = DATE_PROP_MAP[table];
  let amount = 0;
  let description = "";

  switch (table) {
    case "materialPurchases":
      amount = parseFloat(record.totalAmount || "0");
      description = `${record.materialName || ""} - ${record.supplierName || ""} (${record.quantity} ${record.unit})`;
      break;
    case "supplierPayments":
      amount = parseFloat(record.amount || "0");
      description = `دفعة ${record.paymentMethod || ""} - مرجع: ${record.referenceNumber || "-"}`;
      break;
    case "transportationExpenses":
      amount = parseFloat(record.amount || "0");
      description = record.description || "";
      break;
    case "workerTransfers":
      amount = parseFloat(record.amount || "0");
      description = `حوالة لـ ${record.recipientName || ""} - ${record.transferMethod || ""}`;
      break;
    case "workerMiscExpenses":
      amount = parseFloat(record.amount || "0");
      description = record.description || record.notes || "";
      break;
    case "attendance": {
      const paid = parseFloat(record.paidAmount || "0");
      const total = parseFloat(record.totalPay || "0");
      const wage = parseFloat(record.dailyWage || "0");
      amount = paid > 0 ? paid : total;
      const parts = [`أيام: ${record.workDays || "0"}`];
      parts.push(`يومي: ${formatNum(wage)}`);
      parts.push(`مستحق: ${formatNum(total)}`);
      if (paid > 0) parts.push(`مدفوع: ${formatNum(paid)}`);
      const rem = parseFloat(record.remainingAmount || "0");
      if (rem > 0) parts.push(`متبقي: ${formatNum(rem)}`);
      description = parts.join(" | ");
      break;
    }
  }

  return {
    id: record.id,
    table,
    tableLabel: TABLE_LABELS[table],
    date: record[dateProp],
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
      const dateColumn = DATE_COLUMN_MAP[tableName];
      if (!dateColumn) continue;
      try {
        const rows = await db.select().from(table).where(
          and(
            eq(table.project_id, pid),
            eq(dateColumn, dateStr)
          )
        );
        for (const row of rows) {
          results.push(formatRecord(tableName, row));
        }
      } catch (e: any) {
        console.error(`[RecordTransfer] خطأ في قراءة ${tableName}:`, e.message);
        tableErrors.push({ table: TABLE_LABELS[tableName], error: "فشل في قراءة البيانات" });
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

    const targetProjectName = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, String(targetProjectId)));
    const tProjectName = targetProjectName[0]?.name || "المشروع الهدف";

    const targetRecords: any[] = [];
    for (const [tableName, table] of Object.entries(TABLE_MAP)) {
      const dateColumn = DATE_COLUMN_MAP[tableName];
      if (!dateColumn) continue;
      try {
        const rows = await db.select().from(table).where(
          and(
            eq(table.project_id, String(targetProjectId)),
            eq(dateColumn, String(date))
          )
        );
        for (const row of rows) {
          targetRecords.push(formatRecord(tableName, row));
        }
      } catch (e: any) {
        console.error(`[RecordTransfer] preview target read ${tableName}:`, e.message);
      }
    }

    const targetFpMap = new Map<string, any>();
    for (const tr of targetRecords) {
      targetFpMap.set(tr.fingerprint, tr);
    }

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

        const matchingTarget = targetFpMap.get(formatted.fingerprint);
        if (matchingTarget) {
          duplicates.push({
            ...formatted,
            matchInfo: {
              targetProjectName: tProjectName,
              targetRecordId: matchingTarget.id,
              targetDate: matchingTarget.date,
              targetDescription: matchingTarget.description,
              targetAmount: matchingTarget.amount,
              matchedFields: getFingerprintFields(sel.table, record),
            }
          });
        } else {
          transferable.push(formatted);
          totalAmount += formatted.amount;
        }
      } catch (e: any) {
        console.error(`[RecordTransfer] preview selection read ${sel.table}:`, e.message);
      }
    }

    console.log(`[RecordTransfer] preview: ${transferable.length} transferable, ${duplicates.length} duplicates, target had ${targetRecords.length} records`);

    res.json({
      transferableCount: transferable.length,
      duplicateCount: duplicates.length,
      totalAmount,
      transferable,
      duplicates,
      targetRecordCount: targetRecords.length,
    });
  } catch (error: any) {
    console.error("[RecordTransfer] /preview error:", error.message);
    res.status(500).json({ error: "حدث خطأ أثناء معاينة النقل" });
  }
});

router.post("/confirm", requireAdmin as any, async (req, res) => {
  try {
    const { sourceProjectId, targetProjectId, selections, force } = req.body;
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
        const dateColumn = DATE_COLUMN_MAP[sel.table];
        if (!table || !dateColumn) {
          errors.push(`جدول غير معروف: ${sel.table}`);
          continue;
        }
        try {
          const [existing] = await tx.select().from(table).where(
            and(eq(table.id, sel.id), eq(table.project_id, String(sourceProjectId)))
          );
          if (!existing) {
            errors.push(`سجل غير موجود في ${TABLE_LABELS[sel.table] || sel.table}`);
            continue;
          }

          if (!force) {
            const formatted = formatRecord(sel.table, existing);
            const dateProp = DATE_PROP_MAP[sel.table];
            const dateVal = existing[dateProp];

            if (dateVal) {
              const targetRows = await tx.select().from(table).where(
                and(
                  eq(table.project_id, String(targetProjectId)),
                  eq(dateColumn, dateVal)
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
          }

          await tx.update(table)
            .set({ project_id: String(targetProjectId) })
            .where(and(eq(table.id, sel.id), eq(table.project_id, String(sourceProjectId))));

          movedCount++;
          const amt = parseFloat(existing.amount || existing.totalAmount || existing.totalPay || existing.dailyWage || "0");
          totalAmountMoved += amt;
          movedItems.push({ table: sel.table, id: sel.id });
        } catch (e: any) {
          console.error(`[RecordTransfer] confirm error for ${sel.table}:`, e.message);
          errors.push(`فشل نقل سجل من ${TABLE_LABELS[sel.table] || sel.table}`);
        }
      }
    });

    res.json({ movedCount, totalAmountMoved, errors, movedItems });
  } catch (error: any) {
    console.error("[RecordTransfer] /confirm error:", error.message);
    res.status(500).json({ error: "حدث خطأ أثناء عملية النقل - لم يتم نقل أي سجل" });
  }
});

router.post("/delete", requireAdmin as any, async (req, res) => {
  try {
    const { projectId, selections } = req.body;
    if (!projectId || !selections?.length) {
      return res.status(400).json({ error: "بيانات غير مكتملة" });
    }

    let deletedCount = 0;
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
            and(eq(table.id, sel.id), eq(table.project_id, String(projectId)))
          );
          if (!existing) {
            errors.push(`سجل غير موجود: ${sel.id}`);
            continue;
          }

          await tx.delete(table).where(
            and(eq(table.id, sel.id), eq(table.project_id, String(projectId)))
          );
          deletedCount++;
        } catch (e: any) {
          console.error(`[RecordTransfer] delete error for ${sel.table}:`, e.message);
          errors.push(`فشل حذف سجل من ${TABLE_LABELS[sel.table] || sel.table}`);
        }
      }
    });

    res.json({ deletedCount, errors });
  } catch (error: any) {
    console.error("[RecordTransfer] /delete error:", error.message);
    res.status(500).json({ error: "حدث خطأ أثناء الحذف" });
  }
});

export default router;
