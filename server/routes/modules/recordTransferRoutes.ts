import { Router, Request, Response } from "express";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { db } from "../../db.js";
import { 
  materialPurchases, supplierPayments, transportationExpenses, 
  workerTransfers, workerMiscExpenses, workerAttendance, projects, workers,
  projectFundTransfers, fundTransfers
} from "../../../shared/schema.js";
import { eq, and, ne, sql } from "drizzle-orm";
import crypto from "crypto";
import { storage } from "../../storage.js";
import { invalidateBalanceCache } from "./projectRoutes.js";

const router = Router();
router.use(requireAuth as any);

const TABLE_MAP: Record<string, any> = {
  fundTransfers,
  materialPurchases,
  supplierPayments,
  transportationExpenses,
  workerTransfers,
  workerMiscExpenses,
  attendance: workerAttendance,
};

const DATE_COLUMN_MAP: Record<string, any> = {
  fundTransfers: fundTransfers.transferDate,
  materialPurchases: materialPurchases.purchaseDate,
  supplierPayments: supplierPayments.paymentDate,
  transportationExpenses: transportationExpenses.date,
  workerTransfers: workerTransfers.transferDate,
  workerMiscExpenses: workerMiscExpenses.date,
  attendance: workerAttendance.attendanceDate,
};

const DATE_PROP_MAP: Record<string, string> = {
  fundTransfers: "transferDate",
  materialPurchases: "purchaseDate",
  supplierPayments: "paymentDate",
  transportationExpenses: "date",
  workerTransfers: "transferDate",
  workerMiscExpenses: "date",
  attendance: "attendanceDate",
  fundTransferOut: "transferDate",
  fundTransferIn: "transferDate",
};

const TABLE_LABELS: Record<string, string> = {
  fundTransfers: "العهدة",
  materialPurchases: "مشتريات المواد",
  supplierPayments: "مدفوعات الموردين",
  transportationExpenses: "أجور المواصلات",
  workerTransfers: "حوالات العمال",
  workerMiscExpenses: "نثريات العمال",
  attendance: "الحضور",
  fundTransferOut: "ترحيل أموال صادر",
  fundTransferIn: "ترحيل أموال وارد",
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
    case "fundTransfers":
      parts.push(normalize(record.amount));
      parts.push(normalize(record.senderName));
      parts.push(normalize(record.transferType));
      parts.push(normalize(record.transferNumber));
      break;
    case "fundTransferOut":
    case "fundTransferIn":
      parts.push(normalize(record.fromProjectId));
      parts.push(normalize(record.toProjectId));
      parts.push(normalize(record.amount));
      parts.push(normalize(record.description));
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
    case "fundTransfers":
      fields["المبلغ"] = normalize(record.amount);
      fields["المرسل"] = normalize(record.senderName);
      fields["نوع التحويل"] = normalize(record.transferType);
      fields["رقم الحوالة"] = normalize(record.transferNumber);
      break;
    case "fundTransferOut":
    case "fundTransferIn":
      fields["من مشروع"] = normalize(record._fromProjectName || record.fromProjectId);
      fields["إلى مشروع"] = normalize(record._toProjectName || record.toProjectId);
      fields["المبلغ"] = normalize(record.amount);
      fields["الوصف"] = normalize(record.description);
      break;
  }
  return fields;
}

function formatRecord(table: string, record: any) {
  const dateProp = DATE_PROP_MAP[table];
  let amount = 0;
  let description = "";

  switch (table) {
    case "fundTransfers":
      amount = parseFloat(record.amount || "0");
      description = `${record.senderName || ""} - ${record.transferType || ""}${record.notes ? ` | ${record.notes}` : ""}`;
      break;
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
    case "fundTransferOut":
      amount = parseFloat(record.amount || "0");
      description = `صادر إلى: ${record._toProjectName || record.toProjectId}${record.description ? ` - ${record.description}` : ""}`;
      break;
    case "fundTransferIn":
      amount = parseFloat(record.amount || "0");
      description = `وارد من: ${record._fromProjectName || record.fromProjectId}${record.description ? ` - ${record.description}` : ""}`;
      break;
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

router.get("/review", requireAdmin as any, async (req: Request, res: Response) => {
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

    try {
      const outRows = await db.select().from(projectFundTransfers).where(
        and(eq(projectFundTransfers.fromProjectId, pid), eq(projectFundTransfers.transferDate, dateStr))
      );
      for (const row of outRows) {
        let toName = row.toProjectId;
        try { const [p] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, row.toProjectId)); if (p) toName = p.name; } catch (_) {}
        results.push(formatRecord("fundTransferOut", { ...row, _toProjectName: toName }));
      }
    } catch (e: any) {
      tableErrors.push({ table: TABLE_LABELS["fundTransferOut"], error: "فشل في قراءة البيانات" });
    }

    try {
      const inRows = await db.select().from(projectFundTransfers).where(
        and(eq(projectFundTransfers.toProjectId, pid), eq(projectFundTransfers.transferDate, dateStr))
      );
      for (const row of inRows) {
        let fromName = row.fromProjectId;
        try { const [p] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, row.fromProjectId)); if (p) fromName = p.name; } catch (_) {}
        results.push(formatRecord("fundTransferIn", { ...row, _fromProjectName: fromName }));
      }
    } catch (e: any) {
      tableErrors.push({ table: TABLE_LABELS["fundTransferIn"], error: "فشل في قراءة البيانات" });
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

router.post("/preview", requireAdmin as any, async (req: Request, res: Response) => {
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

    try {
      const outRows = await db.select().from(projectFundTransfers).where(
        and(eq(projectFundTransfers.fromProjectId, String(targetProjectId)), eq(projectFundTransfers.transferDate, String(date)))
      );
      for (const row of outRows) {
        let toName = row.toProjectId;
        try { const [p] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, row.toProjectId)); if (p) toName = p.name; } catch (_) {}
        targetRecords.push(formatRecord("fundTransferOut", { ...row, _toProjectName: toName }));
      }
      const inRows = await db.select().from(projectFundTransfers).where(
        and(eq(projectFundTransfers.toProjectId, String(targetProjectId)), eq(projectFundTransfers.transferDate, String(date)))
      );
      for (const row of inRows) {
        let fromName = row.fromProjectId;
        try { const [p] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, row.fromProjectId)); if (p) fromName = p.name; } catch (_) {}
        targetRecords.push(formatRecord("fundTransferIn", { ...row, _fromProjectName: fromName }));
      }
    } catch (e: any) {
      console.error(`[RecordTransfer] preview target read fundTransfers:`, e.message);
    }

    const targetFpMap = new Map<string, any>();
    for (const tr of targetRecords) {
      targetFpMap.set(tr.fingerprint, tr);
    }

    const WORKER_TABLES: { tableName: string; table: any; dateCol: any; amountProp: string }[] = [
      { tableName: "attendance", table: workerAttendance, dateCol: workerAttendance.attendanceDate, amountProp: "paidAmount" },
      { tableName: "workerTransfers", table: workerTransfers, dateCol: workerTransfers.transferDate, amountProp: "amount" },
      { tableName: "transportationExpenses", table: transportationExpenses, dateCol: transportationExpenses.date, amountProp: "amount" },
      { tableName: "workerMiscExpenses", table: workerMiscExpenses, dateCol: workerMiscExpenses.date, amountProp: "amount" },
    ];

    async function findWorkerPaymentsInOtherProjects(workerId: string, dateStr: string, excludeProjectId: string): Promise<any[]> {
      const results: any[] = [];
      for (const wt of WORKER_TABLES) {
        try {
          const rows = await db.select().from(wt.table).where(
            and(
              eq(wt.table.worker_id, workerId),
              eq(wt.dateCol, dateStr),
              ne(wt.table.project_id, excludeProjectId)
            )
          );
          for (const row of rows) {
            const amt = parseFloat(String(row[wt.amountProp] || row.amount || "0"));
            let projName = row.project_id;
            try {
              const [p] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, row.project_id));
              if (p) projName = p.name;
            } catch (_) { /* skip */ }
            results.push({
              table: wt.tableName,
              tableLabel: TABLE_LABELS[wt.tableName],
              projectName: projName,
              projectId: row.project_id,
              amount: amt,
            });
          }
        } catch (e: any) { /* skip */ }
      }
      return results;
    }

    const transferable: any[] = [];
    const duplicates: any[] = [];
    const crossWarnings: any[] = [];
    let totalAmount = 0;

    for (const sel of selections) {
      const isFundTransfer = sel.table === "fundTransferOut" || sel.table === "fundTransferIn";

      if (isFundTransfer) {
        try {
          const [record] = await db.select().from(projectFundTransfers).where(eq(projectFundTransfers.id, sel.id));
          if (!record) continue;

          const isOut = sel.table === "fundTransferOut";
          const belongsToSource = isOut
            ? record.fromProjectId === String(sourceProjectId)
            : record.toProjectId === String(sourceProjectId);
          if (!belongsToSource) continue;

          const postMoveRecord = { ...record };
          if (isOut) {
            postMoveRecord.fromProjectId = String(targetProjectId);
          } else {
            postMoveRecord.toProjectId = String(targetProjectId);
          }

          if (postMoveRecord.fromProjectId === postMoveRecord.toProjectId) {
            duplicates.push({
              ...formatRecord(sel.table, record),
              matchInfo: {
                targetProjectName: tProjectName,
                targetRecordId: record.id,
                targetDate: record.transferDate,
                targetDescription: "النقل سيُنتج تحويل ذاتي (من/إلى نفس المشروع)",
                targetAmount: parseFloat(String(record.amount || "0")),
                matchedFields: { "تحذير": "fromProjectId === toProjectId بعد النقل" },
              }
            });
            continue;
          }

          let fromName = record.fromProjectId, toName = record.toProjectId;
          try { const [p] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, record.fromProjectId)); if (p) fromName = p.name; } catch (_) {}
          try { const [p] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, record.toProjectId)); if (p) toName = p.name; } catch (_) {}

          const formatted = formatRecord(sel.table, { ...record, _fromProjectName: fromName, _toProjectName: toName });

          const postMoveFp = makeFingerprint(sel.table, postMoveRecord);
          const matchingTarget = targetFpMap.get(postMoveFp) || targetFpMap.get(formatted.fingerprint);
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
        continue;
      }

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

        if (record.worker_id) {
          const otherPayments = await findWorkerPaymentsInOtherProjects(record.worker_id, String(date), sourceProjectId);
          if (otherPayments.length > 0) {
            let workerName = record.worker_id;
            try {
              const [w] = await db.select({ name: workers.name }).from(workers).where(eq(workers.id, record.worker_id));
              if (w) workerName = w.name;
            } catch (_) { /* skip */ }
            
            const totalOther = otherPayments.reduce((s: number, p: any) => s + p.amount, 0);
            crossWarnings.push({
              recordId: formatted.id,
              table: sel.table,
              tableLabel: formatted.tableLabel,
              workerName,
              workerId: record.worker_id,
              recordAmount: formatted.amount,
              otherPayments,
              totalOtherAmount: totalOther,
            });
          }
        }
      } catch (e: any) {
        console.error(`[RecordTransfer] preview selection read ${sel.table}:`, e.message);
      }
    }

    console.log(`[RecordTransfer] preview: ${transferable.length} transferable, ${duplicates.length} duplicates, ${crossWarnings.length} cross-warnings`);

    res.json({
      transferableCount: transferable.length,
      duplicateCount: duplicates.length,
      totalAmount,
      transferable,
      duplicates,
      crossWarnings,
      targetRecordCount: targetRecords.length,
    });
  } catch (error: any) {
    console.error("[RecordTransfer] /preview error:", error.message);
    res.status(500).json({ error: "حدث خطأ أثناء معاينة النقل" });
  }
});

router.post("/confirm", requireAdmin as any, async (req: Request, res: Response) => {
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
    const affectedDates = new Set<string>();

    await db.transaction(async (tx: any) => {
      for (const sel of selections) {
        const isFundTransfer = sel.table === "fundTransferOut" || sel.table === "fundTransferIn";

        if (isFundTransfer) {
          try {
            const isOut = sel.table === "fundTransferOut";
            const ownerCol = isOut ? projectFundTransfers.fromProjectId : projectFundTransfers.toProjectId;
            const [existing] = await tx.select().from(projectFundTransfers).where(
              and(eq(projectFundTransfers.id, sel.id), eq(ownerCol, String(sourceProjectId)))
            );
            if (!existing) {
              errors.push(`سجل ترحيل أموال غير موجود أو لا ينتمي للمشروع المصدر`);
              continue;
            }

            const postFrom = isOut ? String(targetProjectId) : existing.fromProjectId;
            const postTo = isOut ? existing.toProjectId : String(targetProjectId);
            if (postFrom === postTo) {
              errors.push(`تم تخطي سجل: النقل سيُنتج تحويل ذاتي (من/إلى نفس المشروع)`);
              continue;
            }

            if (!force) {
              const postMoveRecord = { ...existing, fromProjectId: postFrom, toProjectId: postTo };
              const postMoveFp = makeFingerprint(sel.table, postMoveRecord);
              const targetRows = await tx.select().from(projectFundTransfers).where(
                and(
                  eq(projectFundTransfers.transferDate, existing.transferDate),
                  isOut
                    ? eq(projectFundTransfers.fromProjectId, String(targetProjectId))
                    : eq(projectFundTransfers.toProjectId, String(targetProjectId))
                )
              );
              const hasDuplicate = targetRows.some((r: any) => {
                if (r.id === sel.id) return false;
                const fp = makeFingerprint(sel.table, r);
                return fp === postMoveFp;
              });
              if (hasDuplicate) {
                errors.push(`سجل ترحيل أموال مكرر تم تخطيه`);
                continue;
              }
            }

            if (isOut) {
              await tx.update(projectFundTransfers)
                .set({ fromProjectId: String(targetProjectId) })
                .where(and(eq(projectFundTransfers.id, sel.id), eq(projectFundTransfers.fromProjectId, String(sourceProjectId))));
            } else {
              await tx.update(projectFundTransfers)
                .set({ toProjectId: String(targetProjectId) })
                .where(and(eq(projectFundTransfers.id, sel.id), eq(projectFundTransfers.toProjectId, String(sourceProjectId))));
            }

            movedCount++;
            totalAmountMoved += parseFloat(String(existing.amount || "0"));
            movedItems.push({ table: sel.table, id: sel.id });
            if (existing.transferDate) affectedDates.add(existing.transferDate);
          } catch (e: any) {
            console.error(`[RecordTransfer] confirm error for ${sel.table}:`, e.message);
            errors.push(`فشل نقل سجل من ${TABLE_LABELS[sel.table] || sel.table}`);
          }
          continue;
        }

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
          const dateProp = DATE_PROP_MAP[sel.table];
          if (dateProp && existing[dateProp]) affectedDates.add(existing[dateProp]);
        } catch (e: any) {
          console.error(`[RecordTransfer] confirm error for ${sel.table}:`, e.message);
          errors.push(`فشل نقل سجل من ${TABLE_LABELS[sel.table] || sel.table}`);
        }
      }
    });

    if (movedCount > 0) {
      try {
        const sortedDates = [...affectedDates].sort();
        console.log(`[RecordTransfer] إعادة حساب الملخصات للمشروعين، تواريخ: ${sortedDates.join(", ")}`);
        for (const date of sortedDates) {
          await storage.updateDailySummaryForDate(String(sourceProjectId), date);
          await storage.updateDailySummaryForDate(String(targetProjectId), date);
        }
        invalidateBalanceCache(String(sourceProjectId));
        invalidateBalanceCache(String(targetProjectId));
        console.log(`[RecordTransfer] ✅ تم إعادة حساب الملخصات ومسح الكاش`);
      } catch (recalcErr: any) {
        console.error(`[RecordTransfer] ⚠️ خطأ في إعادة حساب الملخصات:`, recalcErr.message);
        errors.push("تم النقل بنجاح لكن فشل تحديث الملخصات المالية");
      }
    }

    res.json({ movedCount, totalAmountMoved, errors, movedItems, recalculationDone: movedCount > 0 });
  } catch (error: any) {
    console.error("[RecordTransfer] /confirm error:", error.message);
    res.status(500).json({ error: "حدث خطأ أثناء عملية النقل - لم يتم نقل أي سجل" });
  }
});

router.post("/delete", requireAdmin as any, async (req: Request, res: Response) => {
  try {
    const { projectId, selections } = req.body;
    if (!projectId || !selections?.length) {
      return res.status(400).json({ error: "بيانات غير مكتملة" });
    }

    let deletedCount = 0;
    const errors: string[] = [];
    const affectedDates = new Set<string>();

    await db.transaction(async (tx: any) => {
      for (const sel of selections) {
        const isFundTransfer = sel.table === "fundTransferOut" || sel.table === "fundTransferIn";

        if (isFundTransfer) {
          try {
            const isOut = sel.table === "fundTransferOut";
            const ownerCol = isOut ? projectFundTransfers.fromProjectId : projectFundTransfers.toProjectId;
            const [existing] = await tx.select().from(projectFundTransfers).where(
              and(eq(projectFundTransfers.id, sel.id), eq(ownerCol, String(projectId)))
            );
            if (!existing) {
              errors.push(`سجل ترحيل أموال غير موجود أو لا ينتمي للمشروع: ${sel.id}`);
              continue;
            }
            if (existing.transferDate) affectedDates.add(existing.transferDate);
            await tx.delete(projectFundTransfers).where(
              and(eq(projectFundTransfers.id, sel.id), eq(ownerCol, String(projectId)))
            );
            deletedCount++;
          } catch (e: any) {
            errors.push(`فشل حذف سجل من ${TABLE_LABELS[sel.table] || sel.table}`);
          }
          continue;
        }

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

          const dateProp = DATE_PROP_MAP[sel.table];
          if (dateProp && existing[dateProp]) affectedDates.add(existing[dateProp]);

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

    if (deletedCount > 0) {
      try {
        const sortedDates = [...affectedDates].sort();
        for (const date of sortedDates) {
          await storage.updateDailySummaryForDate(String(projectId), date);
        }
        invalidateBalanceCache(String(projectId));
      } catch (recalcErr: any) {
        console.error(`[RecordTransfer] ⚠️ خطأ في إعادة حساب الملخصات بعد الحذف:`, recalcErr.message);
      }
    }

    res.json({ deletedCount, errors });
  } catch (error: any) {
    console.error("[RecordTransfer] /delete error:", error.message);
    res.status(500).json({ error: "حدث خطأ أثناء الحذف" });
  }
});

export default router;
