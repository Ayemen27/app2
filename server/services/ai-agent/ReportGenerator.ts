/**
 * Report Generator - مولد التقارير
 * يُنشئ تقارير Excel و Word و PDF
 */

import * as fs from "fs";
import * as path from "path";
import * as ExcelJS from "exceljs";
import { getDatabaseActions, ActionResult } from "./DatabaseActions";

export interface ReportOptions {
  type: "worker_statement" | "project_expenses" | "daily_summary" | "attendance";
  format: "excel" | "word" | "pdf" | "json";
  workerId?: string;
  projectId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface ReportResult {
  success: boolean;
  filePath?: string;
  data?: any;
  message: string;
}

export class ReportGenerator {
  private dbActions = getDatabaseActions();
  private reportsDir = path.join(process.cwd(), "reports");

  constructor() {
    // إنشاء مجلد التقارير إذا لم يكن موجوداً
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * إنشاء تقرير تصفية حساب عامل بتنسيق Excel - تفصيلي كامل
   */
  async generateWorkerStatementExcel(workerId: string): Promise<ReportResult> {
    try {
      const result = await this.dbActions.getWorkerStatement(workerId);
      if (!result.success) return { success: false, message: result.message };

      const data = result.data;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'نظام إدارة المشاريع';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('تصفية حساب عامل');
      worksheet.views = [{ rightToLeft: true }];

      // تحديد عرض الأعمدة
      worksheet.columns = [
        { key: 'A', width: 14 },
        { key: 'B', width: 30 },
        { key: 'C', width: 12 },
        { key: 'D', width: 12 },
        { key: 'E', width: 12 },
        { key: 'F', width: 14 },
      ];

      const primaryColor = 'FF1E3A5F';
      const secondaryColor = 'FF2E86AB';
      const lightGray = 'FFF5F5F5';
      const creditColor = 'FF1B7E4E';
      const debitColor = 'FFC0392B';
      const white = 'FFFFFFFF';

      const applyBorder = (row: ExcelJS.Row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          };
        });
      };

      // ─── رأس التقرير ───
      worksheet.mergeCells('A1:F1');
      const logoCell = worksheet.getCell('A1');
      logoCell.value = 'نظام إدارة المشاريع الإنشائية';
      logoCell.font = { size: 13, bold: true, color: { argb: white } };
      logoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
      logoCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 28;

      worksheet.mergeCells('A2:F2');
      const titleCell = worksheet.getCell('A2');
      titleCell.value = `كشف حساب تفصيلي: ${data.worker.name}`;
      titleCell.font = { size: 14, bold: true, color: { argb: white } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondaryColor } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(2).height = 26;

      // ─── معلومات العامل ───
      worksheet.addRow([]);
      const infoTitleRow = worksheet.addRow(['معلومات العامل', '', '', '', '', '']);
      infoTitleRow.getCell(1).font = { bold: true, size: 11, color: { argb: primaryColor } };
      infoTitleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightGray } };
      worksheet.mergeCells(`A4:F4`);

      const workerInfo = [
        ['الاسم', data.worker.name, '', 'النوع', data.worker.type || '-', ''],
        ['الأجر اليومي', `${parseFloat(data.worker.dailyWage || '0').toLocaleString('ar')} ريال`, '', 'تاريخ التقرير', new Date().toLocaleDateString('ar-SA'), ''],
        ['الهاتف', data.worker.phone || '-', '', 'حالة الحساب', data.statement.finalBalance >= 0 ? 'لا توجد مستحقات متأخرة' : 'يوجد رصيد متبقي', ''],
      ];

      for (const info of workerInfo) {
        const row = worksheet.addRow(info);
        row.getCell(1).font = { bold: true, size: 10 };
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightGray } };
        row.getCell(4).font = { bold: true, size: 10 };
        row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightGray } };
        applyBorder(row);
        row.height = 20;
      }

      // ─── قسم الحضور ───
      worksheet.addRow([]);
      const attendanceTitleRow = worksheet.addRow(['📋 تفاصيل الحضور والأجور', '', '', '', '', '']);
      worksheet.mergeCells(`A${attendanceTitleRow.number}:F${attendanceTitleRow.number}`);
      attendanceTitleRow.getCell(1).font = { bold: true, size: 11, color: { argb: white } };
      attendanceTitleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
      attendanceTitleRow.getCell(1).alignment = { horizontal: 'center' };
      attendanceTitleRow.height = 22;

      const attHeaderRow = worksheet.addRow(['التاريخ', 'المشروع / الوصف', 'أيام العمل', 'الأجر اليومي', 'المستحق', 'المدفوع']);
      attHeaderRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { bold: true, size: 10, color: { argb: white } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondaryColor } };
        cell.alignment = { horizontal: 'center' };
      });
      applyBorder(attHeaderRow);
      attHeaderRow.height = 20;

      const attendanceRecords = data.attendance?.records || [];
      let runningBalance = 0;
      for (const rec of attendanceRecords) {
        const earned = parseFloat(rec.totalPay || '0');
        const paid = parseFloat(rec.paidAmount || '0');
        runningBalance += earned - paid;
        const row = worksheet.addRow([
          rec.attendanceDate || rec.date || '-',
          rec.workDescription || 'حضور عمل',
          parseFloat(rec.workDays || '0'),
          parseFloat(rec.dailyWage || '0'),
          earned,
          paid,
        ]);
        row.getCell(3).numFmt = '#,##0.00';
        row.getCell(4).numFmt = '#,##0.00';
        row.getCell(5).numFmt = '#,##0.00';
        row.getCell(6).numFmt = '#,##0.00';
        row.getCell(5).font = { color: { argb: creditColor } };
        row.getCell(6).font = { color: { argb: debitColor } };
        applyBorder(row);
        row.height = 18;
      }

      if (attendanceRecords.length === 0) {
        const emptyRow = worksheet.addRow(['لا توجد سجلات حضور', '', '', '', '', '']);
        worksheet.mergeCells(`A${emptyRow.number}:F${emptyRow.number}`);
        emptyRow.getCell(1).alignment = { horizontal: 'center' };
        emptyRow.getCell(1).font = { italic: true, color: { argb: 'FF888888' } };
      }

      const attSummaryRow = worksheet.addRow([
        '', 'إجمالي الحضور',
        data.attendance?.summary?.totalDays || 0,
        '',
        data.attendance?.summary?.totalEarned || 0,
        data.attendance?.summary?.totalPaid || 0,
      ]);
      attSummaryRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { bold: true, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightGray } };
      });
      attSummaryRow.getCell(5).font = { bold: true, color: { argb: creditColor } };
      attSummaryRow.getCell(6).font = { bold: true, color: { argb: debitColor } };
      applyBorder(attSummaryRow);

      // ─── قسم الحوالات ───
      worksheet.addRow([]);
      const transfersTitleRow = worksheet.addRow(['💸 الحوالات والتحويلات', '', '', '', '', '']);
      worksheet.mergeCells(`A${transfersTitleRow.number}:F${transfersTitleRow.number}`);
      transfersTitleRow.getCell(1).font = { bold: true, size: 11, color: { argb: white } };
      transfersTitleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
      transfersTitleRow.getCell(1).alignment = { horizontal: 'center' };
      transfersTitleRow.height = 22;

      const trHeaderRow = worksheet.addRow(['التاريخ', 'المستلم', 'طريقة التحويل', 'رقم الحوالة', 'المبلغ', 'ملاحظات']);
      trHeaderRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { bold: true, size: 10, color: { argb: white } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondaryColor } };
        cell.alignment = { horizontal: 'center' };
      });
      applyBorder(trHeaderRow);
      trHeaderRow.height = 20;

      const transfers = data.transfers?.transfers || [];
      for (const tr of transfers) {
        const row = worksheet.addRow([
          tr.transferDate || '-',
          tr.recipientName || '-',
          tr.transferMethod || '-',
          tr.transferNumber || '-',
          parseFloat(tr.amount || '0'),
          tr.notes || '',
        ]);
        row.getCell(5).numFmt = '#,##0.00';
        row.getCell(5).font = { color: { argb: debitColor } };
        applyBorder(row);
        row.height = 18;
      }

      if (transfers.length === 0) {
        const emptyRow = worksheet.addRow(['لا توجد حوالات مسجلة', '', '', '', '', '']);
        worksheet.mergeCells(`A${emptyRow.number}:F${emptyRow.number}`);
        emptyRow.getCell(1).alignment = { horizontal: 'center' };
        emptyRow.getCell(1).font = { italic: true, color: { argb: 'FF888888' } };
      }

      const trSummaryRow = worksheet.addRow(['', 'إجمالي الحوالات', '', '', data.transfers?.totalTransferred || 0, '']);
      trSummaryRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { bold: true, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightGray } };
      });
      trSummaryRow.getCell(5).font = { bold: true, color: { argb: debitColor } };
      applyBorder(trSummaryRow);

      // ─── الملخص النهائي ───
      worksheet.addRow([]);
      const finalTitleRow = worksheet.addRow(['📊 الملخص النهائي', '', '', '', '', '']);
      worksheet.mergeCells(`A${finalTitleRow.number}:F${finalTitleRow.number}`);
      finalTitleRow.getCell(1).font = { bold: true, size: 12, color: { argb: white } };
      finalTitleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
      finalTitleRow.getCell(1).alignment = { horizontal: 'center' };
      finalTitleRow.height = 24;

      const summaryData = [
        ['إجمالي المستحقات (له)', data.statement.totalEarned, '', '', '', ''],
        ['إجمالي المدفوعات النقدية', data.statement.totalPaid, '', '', '', ''],
        ['إجمالي الحوالات', data.statement.totalTransferred, '', '', '', ''],
        ['صافي الرصيد المتبقي', data.statement.finalBalance, '', '', '', ''],
      ];

      for (let i = 0; i < summaryData.length; i++) {
        const row = worksheet.addRow(summaryData[i]);
        worksheet.mergeCells(`A${row.number}:A${row.number}`);
        worksheet.mergeCells(`B${row.number}:F${row.number}`);
        row.getCell(1).font = { bold: true, size: 11 };
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightGray } };
        const isLast = i === summaryData.length - 1;
        const val = parseFloat(String(summaryData[i][1] || '0'));
        row.getCell(2).value = val;
        row.getCell(2).numFmt = '#,##0.00 "ريال"';
        row.getCell(2).font = {
          bold: isLast,
          size: isLast ? 12 : 11,
          color: { argb: isLast ? (val >= 0 ? creditColor : debitColor) : 'FF333333' },
        };
        if (isLast) {
          row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: val >= 0 ? 'FFE8F5E9' : 'FFFCE4EC' } };
        }
        applyBorder(row);
        row.height = isLast ? 24 : 20;
      }

      // ─── تذييل ───
      worksheet.addRow([]);
      const footerRow = worksheet.addRow([`تم إنشاء هذا التقرير بتاريخ: ${new Date().toLocaleDateString('ar-SA')} - نظام إدارة المشاريع`, '', '', '', '', '']);
      worksheet.mergeCells(`A${footerRow.number}:F${footerRow.number}`);
      footerRow.getCell(1).font = { size: 9, italic: true, color: { argb: 'FF888888' } };
      footerRow.getCell(1).alignment = { horizontal: 'center' };

      const fileName = `worker_statement_${workerId}_${Date.now()}.xlsx`;
      const filePath = path.join(this.reportsDir, fileName);
      await workbook.xlsx.writeFile(filePath);

      return {
        success: true,
        filePath: `/reports/${fileName}`,
        message: `تم إنشاء تقرير Excel تفصيلي للعامل ${data.worker.name} بنجاح`,
      };
    } catch (error: any) {
      console.error("Excel Generation Error:", error);
      return { success: false, message: `خطأ في إنشاء Excel: ${error.message}` };
    }
  }

  /**
   * إنشاء تقرير شامل للمشروع (مصروفات، عمال، مواد)
   */
  async generateProjectFullExcel(projectId: string): Promise<ReportResult> {
    try {
      const result = await this.dbActions.getProjectExpensesSummary(projectId);
      if (!result.success) return { success: false, message: result.message };

      const data = result.data;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('تقرير المشروع الشامل');

      worksheet.views = [{ rightToLeft: true }];

      // تنسيق العناوين
      worksheet.mergeCells('A1:F1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `تقرير مصروفات مشروع: ${data.project?.name || projectId}`;
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: 'center' };

      worksheet.addRow(['التاريخ', new Date().toLocaleDateString('en-GB')]);
      worksheet.addRow([]);

      // جدول المصروفات
      const headerRow = worksheet.addRow(['البند', 'القيمة الإجمالية']);
      headerRow.font = { bold: true };

      const summary = data.summary;
      worksheet.addRow(['إجمالي العهدة المستلمة', summary.totalFunds]);
      worksheet.addRow(['أجور العمال', summary.totalWages]);
      worksheet.addRow(['المواد والمشتريات', summary.totalMaterials]);
      worksheet.addRow(['النقل والشحن', summary.totalTransport]);
      worksheet.addRow(['النثريات', summary.totalMisc]);
      worksheet.addRow(['إجمالي المصروفات', summary.totalExpenses]);
      
      const balanceRow = worksheet.addRow(['الرصيد المتبقي', summary.balance]);
      balanceRow.font = { bold: true };
      if (summary.balance < 0) {
        balanceRow.getCell(2).font = { color: { argb: 'FFFF0000' } };
      }

      const fileName = `project_full_${projectId}_${Date.now()}.xlsx`;
      const filePath = path.join(this.reportsDir, fileName);
      await workbook.xlsx.writeFile(filePath);

      return {
        success: true,
        filePath: `/reports/${fileName}`,
        message: "تم إنشاء تقرير المشروع الشامل بنجاح",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ في إنشاء Excel: ${error.message}` };
    }
  }

  /**
   * تقرير كشف حساب مورد Excel احترافي
   */
  async generateSupplierStatementExcel(supplierId: string): Promise<ReportResult> {
    try {
      const result = await this.dbActions.getSupplierStatement(supplierId);
      if (!result.success) return { success: false, message: result.message };
      if (Array.isArray(result.data)) {
        return { success: false, message: `تم العثور على ${result.data.length} مورد. يرجى تحديد المورد بالمعرّف (ID).` };
      }

      const data = result.data;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'نظام إدارة المشاريع';
      workbook.created = new Date();

      const ws = workbook.addWorksheet('كشف حساب مورد');
      ws.views = [{ rightToLeft: true }];

      ws.columns = [
        { key: 'A', width: 14 },
        { key: 'B', width: 28 },
        { key: 'C', width: 14 },
        { key: 'D', width: 14 },
        { key: 'E', width: 14 },
        { key: 'F', width: 16 },
      ];

      const primary = 'FF1E3A5F';
      const secondary = 'FF2E86AB';
      const light = 'FFF5F5F5';
      const green = 'FF1B7E4E';
      const red = 'FFC0392B';
      const white = 'FFFFFFFF';

      const border = (row: ExcelJS.Row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          };
        });
      };

      ws.mergeCells('A1:F1');
      const h1 = ws.getCell('A1');
      h1.value = 'نظام إدارة المشاريع الإنشائية';
      h1.font = { size: 13, bold: true, color: { argb: white } };
      h1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primary } };
      h1.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 28;

      ws.mergeCells('A2:F2');
      const h2 = ws.getCell('A2');
      h2.value = `كشف حساب المورد: ${data.supplier.name}`;
      h2.font = { size: 14, bold: true, color: { argb: white } };
      h2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondary } };
      h2.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(2).height = 26;

      ws.addRow([]);
      const infoRow = ws.addRow(['معلومات المورد', '', '', '', '', '']);
      ws.mergeCells(`A4:F4`);
      infoRow.getCell(1).font = { bold: true, size: 11, color: { argb: primary } };
      infoRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: light } };

      const infos = [
        ['الاسم', data.supplier.name, '', 'الهاتف', data.supplier.phone || '-', ''],
        ['شروط الدفع', data.supplier.paymentTerms || '-', '', 'تاريخ التقرير', new Date().toLocaleDateString('ar-SA'), ''],
      ];
      for (const info of infos) {
        const r = ws.addRow(info);
        r.getCell(1).font = { bold: true };
        r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: light } };
        r.getCell(4).font = { bold: true };
        r.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: light } };
        border(r);
      }

      ws.addRow([]);
      const purchTitle = ws.addRow(['📦 المشتريات', '', '', '', '', '']);
      ws.mergeCells(`A${purchTitle.number}:F${purchTitle.number}`);
      purchTitle.getCell(1).font = { bold: true, size: 11, color: { argb: white } };
      purchTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primary } };
      purchTitle.getCell(1).alignment = { horizontal: 'center' };
      purchTitle.height = 22;

      const phdr = ws.addRow(['التاريخ', 'الصنف', 'الكمية', 'السعر', 'الإجمالي', 'المدفوع']);
      phdr.eachCell({ includeEmpty: true }, (c) => {
        c.font = { bold: true, size: 10, color: { argb: white } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondary } };
        c.alignment = { horizontal: 'center' };
      });
      border(phdr);

      for (const p of data.purchases) {
        const r = ws.addRow([
          p.purchaseDate || '-',
          p.materialName || 'مواد',
          parseFloat(p.quantity || '0'),
          parseFloat(p.unitPrice || '0'),
          parseFloat(p.totalAmount || '0'),
          parseFloat(p.paidAmount || '0'),
        ]);
        r.getCell(3).numFmt = '#,##0';
        r.getCell(4).numFmt = '#,##0';
        r.getCell(5).numFmt = '#,##0';
        r.getCell(6).numFmt = '#,##0';
        border(r);
      }

      if (data.purchases.length === 0) {
        const emptyRow = ws.addRow(['لا توجد مشتريات مسجلة', '', '', '', '', '']);
        ws.mergeCells(`A${emptyRow.number}:F${emptyRow.number}`);
        emptyRow.getCell(1).alignment = { horizontal: 'center' };
        emptyRow.getCell(1).font = { italic: true, color: { argb: 'FF888888' } };
      }

      ws.addRow([]);
      const payTitle = ws.addRow(['💰 المدفوعات', '', '', '', '', '']);
      ws.mergeCells(`A${payTitle.number}:F${payTitle.number}`);
      payTitle.getCell(1).font = { bold: true, size: 11, color: { argb: white } };
      payTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primary } };
      payTitle.getCell(1).alignment = { horizontal: 'center' };
      payTitle.height = 22;

      const payhdr = ws.addRow(['التاريخ', 'طريقة الدفع', 'المبلغ', 'رقم المرجع', 'ملاحظات', '']);
      payhdr.eachCell({ includeEmpty: true }, (c) => {
        c.font = { bold: true, size: 10, color: { argb: white } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondary } };
        c.alignment = { horizontal: 'center' };
      });
      border(payhdr);

      for (const p of data.payments) {
        const r = ws.addRow([
          p.paymentDate || '-',
          p.paymentMethod || '-',
          parseFloat(p.amount || '0'),
          p.referenceNumber || '-',
          p.notes || '',
          '',
        ]);
        r.getCell(3).numFmt = '#,##0';
        border(r);
      }

      if (data.payments.length === 0) {
        const emptyRow = ws.addRow(['لا توجد مدفوعات مسجلة', '', '', '', '', '']);
        ws.mergeCells(`A${emptyRow.number}:F${emptyRow.number}`);
        emptyRow.getCell(1).alignment = { horizontal: 'center' };
        emptyRow.getCell(1).font = { italic: true, color: { argb: 'FF888888' } };
      }

      ws.addRow([]);
      const sumTitle = ws.addRow(['📊 الملخص النهائي', '', '', '', '', '']);
      ws.mergeCells(`A${sumTitle.number}:F${sumTitle.number}`);
      sumTitle.getCell(1).font = { bold: true, size: 12, color: { argb: white } };
      sumTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primary } };
      sumTitle.getCell(1).alignment = { horizontal: 'center' };
      sumTitle.height = 24;

      const summaryItems = [
        ['إجمالي المشتريات', data.summary.totalPurchases],
        ['إجمالي المدفوعات', data.summary.totalPayments],
        ['الرصيد المتبقي (دين)', data.summary.balance],
      ];

      for (let i = 0; i < summaryItems.length; i++) {
        const r = ws.addRow([summaryItems[i][0], '', summaryItems[i][1], '', '', '']);
        ws.mergeCells(`A${r.number}:B${r.number}`);
        ws.mergeCells(`C${r.number}:F${r.number}`);
        r.getCell(1).font = { bold: true, size: 11 };
        r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: light } };
        const val = parseFloat(String(summaryItems[i][1] || '0'));
        r.getCell(3).value = val;
        r.getCell(3).numFmt = '#,##0 "ريال"';
        const isLast = i === summaryItems.length - 1;
        r.getCell(3).font = {
          bold: isLast,
          size: isLast ? 12 : 11,
          color: { argb: isLast ? (val > 0 ? red : green) : 'FF333333' },
        };
        border(r);
        r.height = isLast ? 24 : 20;
      }

      ws.addRow([]);
      const footer = ws.addRow([`تم إنشاء هذا التقرير بتاريخ: ${new Date().toLocaleDateString('ar-SA')} - نظام إدارة المشاريع`, '', '', '', '', '']);
      ws.mergeCells(`A${footer.number}:F${footer.number}`);
      footer.getCell(1).font = { size: 9, italic: true, color: { argb: 'FF888888' } };
      footer.getCell(1).alignment = { horizontal: 'center' };

      const fileName = `supplier_statement_${supplierId}_${Date.now()}.xlsx`;
      const filePath = path.join(this.reportsDir, fileName);
      await workbook.xlsx.writeFile(filePath);

      return {
        success: true,
        filePath: `/reports/${fileName}`,
        message: `تم إنشاء كشف حساب المورد ${data.supplier.name} بنجاح`,
      };
    } catch (error: any) {
      console.error("Supplier Excel Error:", error);
      return { success: false, message: `خطأ في إنشاء Excel: ${error.message}` };
    }
  }

  /**
   * تقرير لوحة المعلومات Excel احترافي
   */
  async generateDashboardExcel(): Promise<ReportResult> {
    try {
      const result = await this.dbActions.getDashboardSummary();
      if (!result.success) return { success: false, message: result.message };

      const data = result.data;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'نظام إدارة المشاريع';
      workbook.created = new Date();

      const ws = workbook.addWorksheet('لوحة المعلومات');
      ws.views = [{ rightToLeft: true }];

      ws.columns = [
        { key: 'A', width: 22 },
        { key: 'B', width: 18 },
        { key: 'C', width: 18 },
        { key: 'D', width: 18 },
        { key: 'E', width: 18 },
      ];

      const primary = 'FF1E3A5F';
      const secondary = 'FF2E86AB';
      const light = 'FFF5F5F5';
      const white = 'FFFFFFFF';
      const green = 'FF1B7E4E';
      const red = 'FFC0392B';

      const border = (row: ExcelJS.Row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          };
        });
      };

      ws.mergeCells('A1:E1');
      const h1 = ws.getCell('A1');
      h1.value = 'لوحة المعلومات الشاملة — نظام إدارة المشاريع';
      h1.font = { size: 14, bold: true, color: { argb: white } };
      h1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primary } };
      h1.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 30;

      ws.mergeCells('A2:E2');
      const h2 = ws.getCell('A2');
      h2.value = `تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}`;
      h2.font = { size: 11, color: { argb: white } };
      h2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondary } };
      h2.alignment = { horizontal: 'center' };
      ws.getRow(2).height = 22;

      ws.addRow([]);
      const secTitle = (title: string) => {
        const r = ws.addRow([title, '', '', '', '']);
        ws.mergeCells(`A${r.number}:E${r.number}`);
        r.getCell(1).font = { bold: true, size: 12, color: { argb: white } };
        r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primary } };
        r.getCell(1).alignment = { horizontal: 'center' };
        r.height = 24;
      };

      const addKV = (label: string, value: any, fmt?: string) => {
        const r = ws.addRow([label, '', value, '', '']);
        ws.mergeCells(`A${r.number}:B${r.number}`);
        ws.mergeCells(`C${r.number}:E${r.number}`);
        r.getCell(1).font = { bold: true, size: 10 };
        r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: light } };
        if (fmt) r.getCell(3).numFmt = fmt;
        border(r);
      };

      secTitle('📊 ملخص النظام');
      addKV('عدد المشاريع', `${data.projects.total} (${data.projects.active} نشط)`);
      addKV('عدد العمال', `${data.workers.total} (${data.workers.active} نشط)`);
      addKV('عدد الموردين', data.suppliers.total);
      addKV('عدد المعدات', data.equipment.total);
      addKV('عدد الآبار', data.wells.total);

      ws.addRow([]);
      secTitle('💰 الملخص المالي');
      addKV('إجمالي التمويل', data.finance.totalFunds, '#,##0 "ريال"');
      addKV('أجور العمال', data.finance.totalWages, '#,##0 "ريال"');
      addKV('المواد والمشتريات', data.finance.totalMaterials, '#,##0 "ريال"');
      addKV('النقل والشحن', data.finance.totalTransport, '#,##0 "ريال"');
      addKV('إجمالي المصروفات', data.finance.totalExpenses, '#,##0 "ريال"');

      const balRow = ws.addRow(['الرصيد', '', data.finance.balance, '', '']);
      ws.mergeCells(`A${balRow.number}:B${balRow.number}`);
      ws.mergeCells(`C${balRow.number}:E${balRow.number}`);
      balRow.getCell(1).font = { bold: true, size: 12 };
      balRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: light } };
      balRow.getCell(3).numFmt = '#,##0 "ريال"';
      balRow.getCell(3).font = {
        bold: true,
        size: 12,
        color: { argb: data.finance.balance >= 0 ? green : red },
      };
      balRow.getCell(3).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: data.finance.balance >= 0 ? 'FFE8F5E9' : 'FFFCE4EC' },
      };
      border(balRow);
      balRow.height = 26;

      ws.addRow([]);
      const footer = ws.addRow([`تم إنشاء هذا التقرير بتاريخ: ${new Date().toLocaleDateString('ar-SA')} — نظام إدارة المشاريع`, '', '', '', '']);
      ws.mergeCells(`A${footer.number}:E${footer.number}`);
      footer.getCell(1).font = { size: 9, italic: true, color: { argb: 'FF888888' } };
      footer.getCell(1).alignment = { horizontal: 'center' };

      const fileName = `dashboard_report_${Date.now()}.xlsx`;
      const filePath = path.join(this.reportsDir, fileName);
      await workbook.xlsx.writeFile(filePath);

      return {
        success: true,
        filePath: `/reports/${fileName}`,
        message: 'تم إنشاء تقرير لوحة المعلومات بنجاح',
      };
    } catch (error: any) {
      console.error("Dashboard Excel Error:", error);
      return { success: false, message: `خطأ في إنشاء Excel: ${error.message}` };
    }
  }

  /**
   * إنشاء تقرير تصفية حساب عامل
   */
  async generateWorkerStatement(
    workerId: string,
    allowedProjectIds?: string[],
    format: "excel" | "json" = "json"
  ): Promise<ReportResult> {
    try {
      if (format === "excel") {
        return await this.generateWorkerStatementExcel(workerId);
      }
      
      const result = await this.dbActions.getWorkerStatement(workerId, allowedProjectIds);

      if (!result.success) {
        return {
          success: false,
          message: result.message,
        };
      }

      if (format === "json") {
        return {
          success: true,
          data: result.data,
          message: "تم إنشاء تقرير تصفية الحساب",
        };
      }

      return {
        success: true,
        data: result.data,
        message: "تم إنشاء تقرير تصفية الحساب (JSON)",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في إنشاء التقرير: ${error.message}`,
      };
    }
  }

  /**
   * إنشاء تقرير ملخص مصروفات مشروع
   */
  async generateProjectExpensesSummary(
    projectId: string,
    format: "excel" | "json" = "json"
  ): Promise<ReportResult> {
    try {
      const result = await this.dbActions.getProjectExpensesSummary(projectId);

      if (!result.success) {
        return {
          success: false,
          message: result.message,
        };
      }

      if (format === "json") {
        return {
          success: true,
          data: result.data,
          message: "تم إنشاء تقرير ملخص المصروفات",
        };
      }

      return {
        success: true,
        data: result.data,
        message: "تم إنشاء تقرير ملخص المصروفات (JSON)",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في إنشاء التقرير: ${error.message}`,
      };
    }
  }

  /**
   * إنشاء تقرير مصروفات يومية
   */
  async generateDailyExpensesReport(
    projectId: string,
    date: string,
    format: "excel" | "json" = "json"
  ): Promise<ReportResult> {
    try {
      const result = await this.dbActions.getDailyExpenses(projectId, date);

      if (!result.success || !result.data) {
        return {
          success: false,
          message: result.message || "لا توجد بيانات لهذا التاريخ",
        };
      }

      // حساب الإجماليات
      const data = result.data;
      const totalWages = (data.wages || []).reduce(
        (sum: number, r: any) => sum + parseFloat(r.paidAmount || "0"),
        0
      );
      const totalPurchases = (data.purchases || []).reduce(
        (sum: number, r: any) => sum + parseFloat(r.paidAmount || "0"),
        0
      );
      const totalTransport = (data.transport || []).reduce(
        (sum: number, r: any) => sum + parseFloat(r.amount || "0"),
        0
      );
      const totalMisc = (data.misc || []).reduce(
        (sum: number, r: any) => sum + parseFloat(r.amount || "0"),
        0
      );

      const grandTotal = totalWages + totalPurchases + totalTransport + totalMisc;

      if (grandTotal === 0 && (!data.wages?.length && !data.purchases?.length && !data.transport?.length && !data.misc?.length)) {
        return {
          success: true,
          data: { ...data, summary: { totalWages: 0, totalPurchases: 0, totalTransport: 0, totalMisc: 0, grandTotal: 0 } },
          message: `لا توجد أي مصروفات مسجلة بتاريخ ${date}`,
        };
      }

      const report = {
        date,
        projectId,
        details: data,
        summary: {
          totalWages,
          totalPurchases,
          totalTransport,
          totalMisc,
          grandTotal: totalWages + totalPurchases + totalTransport + totalMisc,
        },
      };

      return {
        success: true,
        data: report,
        message: `تم إنشاء تقرير مصروفات ${date}`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في إنشاء التقرير: ${error.message}`,
      };
    }
  }

  /**
   * إنشاء تقرير حضور
   */
  async generateAttendanceReport(
    projectId: string,
    fromDate: string,
    toDate: string,
    format: "excel" | "json" = "json"
  ): Promise<ReportResult> {
    try {
      // TODO: تنفيذ تقرير الحضور
      return {
        success: true,
        data: {
          projectId,
          fromDate,
          toDate,
          message: "سيتم تنفيذ تقرير الحضور قريباً",
        },
        message: "تم إنشاء تقرير الحضور",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في إنشاء التقرير: ${error.message}`,
      };
    }
  }

  /**
   * تنسيق البيانات كنص للعرض
   */
  formatAsText(data: any, title: string): string {
    if (!data) return "لا توجد بيانات متاحة لهذا التقرير.";

    let text = `📊 **${title}**\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;

    if (title === "تصفية حساب العامل" || data.worker) {
      const w = data.worker || {};
      const s = data.statement || {};
      text += `👤 **العامل:** ${w.name || "غير معروف"}\n`;
      text += `💰 **الإجمالي المستحق:** ${s.totalEarned || 0} ريال\n`;
      text += `💸 **إجمالي المدفوع:** ${s.totalPaid || 0} ريال\n`;
      text += `🏦 **إجمالي المحول:** ${s.totalTransferred || 0} ريال\n`;
      text += `📉 **الرصيد المتبقي:** ${s.finalBalance || 0} ريال\n`;
    } else if (title === "ملخص مصروفات المشروع" || data.totalExpenses !== undefined) {
      const summary = data.summary || data;
      text += `🏗️ **إجمالي العهد المستلمة:** ${summary.totalFunds || 0} ريال\n`;
      text += `👷 **إجمالي الأجور:** ${summary.totalWages || 0} ريال\n`;
      text += `📦 **إجمالي المواد:** ${summary.totalMaterials || 0} ريال\n`;
      text += `🚚 **إجمالي النقل:** ${summary.totalTransport || 0} ريال\n`;
      text += `📝 **إجمالي متنوعة:** ${summary.totalMisc || 0} ريال\n`;
      text += `━━━━━━━━━━━━━━━━━━━━\n`;
      text += `📉 **إجمالي المصروفات:** ${summary.totalExpenses || 0} ريال\n`;
      text += `💰 **الرصيد المتبقي:** ${summary.balance || 0} ريال\n`;
    } else if (title === "تقرير المصروفات اليومية" || data.date) {
      text += `📅 **التاريخ:** ${data.date}\n`;
      const s = data.summary || {};
      text += `👷 **الأجور اليومية:** ${s.totalWages || 0} ريال\n`;
      text += `📦 **المشتريات:** ${s.totalPurchases || 0} ريال\n`;
      text += `🚚 **النقل:** ${s.totalTransport || 0} ريال\n`;
      text += `📝 **متنوعة:** ${s.totalMisc || 0} ريال\n`;
      text += `━━━━━━━━━━━━━━━━━━━━\n`;
      text += `💰 **الإجمالي اليومي:** ${s.grandTotal || 0} ريال\n`;
      
      if ((s.grandTotal || 0) === 0) {
        text += `\n⚠️ لا توجد أي مصروفات مسجلة في هذا التاريخ.`;
      }
    }

    return text;
  }

  private translateKey(key: string): string {
    const translations: Record<string, string> = {
      totalFunds: "إجمالي العهدة",
      totalWages: "أجور العمال",
      totalMaterials: "المواد",
      totalTransport: "النقل",
      totalMisc: "النثريات",
      totalExpenses: "إجمالي المصروفات",
      balance: "الرصيد",
      totalEarned: "المكتسب",
      totalPaid: "المدفوع",
      totalTransferred: "المحول",
      finalBalance: "الرصيد النهائي",
      grandTotal: "الإجمالي الكلي",
      totalPurchases: "المشتريات",
    };
    return translations[key] || key;
  }
}

// Singleton instance
let reportGeneratorInstance: ReportGenerator | null = null;

export function getReportGenerator(): ReportGenerator {
  if (!reportGeneratorInstance) {
    reportGeneratorInstance = new ReportGenerator();
  }
  return reportGeneratorInstance;
}
