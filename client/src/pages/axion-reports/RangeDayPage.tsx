import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ReportTable, EmptyState } from "./utils";
import type { DailyReportData } from "@shared/report-types";

export function RangeDayPage({ report, searchValue, carryForward = 0 }: { report: DailyReportData; searchValue: string; carryForward?: number }) {
  const q = searchValue.trim().toLowerCase();

  const allExpenses: { category: string; description: string; amount: number; workDays: string; paidAmount: string; notes: string }[] = [];

  (report.attendance || []).forEach((r: any) => {
    if (!q || [r.workerName, r.workerType].some((v: string) => v?.toLowerCase().includes(q))) {
      const days = parseFloat(r.workDays || '0');
      const paid = parseFloat(r.paidAmount || '0');
      allExpenses.push({
        category: "أجور عمال",
        description: r.workerName + (r.workerType ? ` (${r.workerType})` : ""),
        amount: paid,
        workDays: days > 0 ? days.toFixed(1) : "0",
        paidAmount: paid > 0 ? formatCurrency(paid) : "-",
        notes: r.workDescription || (days === 0 && paid > 0 ? "مبلغ بدون عمل" : days > 0 && paid === 0 ? "عمل بدون صرف" : days === 0 ? "بدون عمل" : "-"),
      });
    }
  });
  (report.materials || []).forEach((r: any) => {
    if (!q || [r.materialName, r.supplierName].some((v: string) => v?.toLowerCase().includes(q)))
      allExpenses.push({ category: "مواد", description: r.materialName + (r.quantity ? ` × ${r.quantity}` : ""), amount: parseFloat(r.totalAmount || '0'), workDays: "-", paidAmount: "-", notes: r.supplierName || "-" });
  });
  (report.transport || []).forEach((r: any) => {
    if (!q || [r.description, r.workerName].some((v: string) => v?.toLowerCase().includes(q)))
      allExpenses.push({ category: "نقل", description: r.description || "نقل", amount: parseFloat(r.amount || '0'), workDays: "-", paidAmount: "-", notes: r.workerName || "-" });
  });
  (report.miscExpenses || []).forEach((r: any) => {
    if (!q || [r.description, r.notes].some((v: string) => v?.toLowerCase().includes(q)))
      allExpenses.push({ category: "مصاريف متنوعة", description: r.description || "-", amount: parseFloat(r.amount || '0'), workDays: "-", paidAmount: "-", notes: r.notes || "-" });
  });
  (report.workerTransfers || []).forEach((r: any) => {
    if (!q || [r.workerName, r.recipientName].some((v: string) => v?.toLowerCase().includes(q))) {
      const noteParts: string[] = [];
      if (r.recipientName) noteParts.push(`المستلم: ${r.recipientName}`);
      if (r.transferMethod) noteParts.push(r.transferMethod);
      if (r.transferNumber) noteParts.push(`رقم: ${r.transferNumber}`);
      allExpenses.push({ category: "حوالات عمال", description: r.workerName || "-", amount: parseFloat(r.amount || '0'), workDays: "-", paidAmount: "-", notes: noteParts.join(' | ') || "-" });
    }
  });
  (report.projectTransfersOut || []).forEach((r: any) => {
    if (!q || [r.toProjectName, r.description].some((v: string) => v?.toLowerCase().includes(q)))
      allExpenses.push({ category: "ترحيل لمشروع", description: r.toProjectName || "مشروع آخر", amount: parseFloat(r.amount || '0'), workDays: "-", paidAmount: "-", notes: r.description || "-" });
  });

  const totalExpenses = allExpenses.reduce((s, e) => s + e.amount, 0);

  const fundTransfers = (report.fundTransfers || []).filter((r: any) =>
    !q || [r.senderName, r.transferType].some((v: string) => v?.toLowerCase().includes(q))
  );
  const totalFundTransfers = fundTransfers.reduce((s: number, r: any) => s + (r.amount || 0), 0);

  const workerTransfers = (report.workerTransfers || []).filter((r: any) =>
    !q || [r.workerName, r.transferType].some((v: string) => v?.toLowerCase().includes(q))
  );

  return (
    <div className="space-y-4">
      {fundTransfers.length > 0 && (
        <Card className="border-green-200 dark:border-green-800/50">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
              <Wallet className="h-4 w-4" />
              العهدة (الوارد للصندوق)
            </CardTitle>
            <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">{formatCurrency(totalFundTransfers)}</Badge>
          </CardHeader>
          <CardContent>
            <ReportTable
              testId="table-range-fund-transfers"
              headers={["#", "المبلغ", "المرسل", "نوع التحويل", "رقم التحويل"]}
              rows={fundTransfers.map((r: any, i: number) => [
                i + 1, formatCurrency(r.amount), r.senderName || "-", r.transferType || "-", r.transferNumber || "-",
              ])}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            جدول المصروفات
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{allExpenses.length} عملية</Badge>
            <Badge className="bg-primary/10 text-primary border-primary/20">{formatCurrency(totalExpenses)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {allExpenses.length > 0 ? (
            <ReportTable
              testId="table-range-expenses"
              headers={["#", "القسم", "البيان", "أيام العمل", "المبلغ", "ملاحظات"]}
              rows={allExpenses.map((e, i) => [
                i + 1, e.category, e.description, e.workDays, formatCurrency(e.amount), e.notes,
              ])}
              rowClassNames={allExpenses.map((e) =>
                e.category === "حوالات عمال" ? "bg-red-50 dark:bg-red-950/30" :
                e.category === "ترحيل لمشروع" ? "bg-orange-50 dark:bg-orange-950/30" :
                undefined
              )}
            />
          ) : (
            <EmptyState message="لا توجد مصروفات لهذا اليوم" />
          )}
          {allExpenses.length > 0 && (
            <div className="flex justify-end mt-3 pt-3 border-t">
              <div className="text-sm font-bold text-foreground">
                إجمالي المصروفات: <span className="text-primary mr-1">{formatCurrency(totalExpenses)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {carryForward !== 0 && (
        <Card className={`border-2 ${carryForward >= 0 ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20' : 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20'}`}>
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm font-bold">ترحيل من اليوم السابق</span>
            <span className={`text-lg font-bold ${carryForward >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} data-testid="text-carry-forward">
              {formatCurrency(carryForward)}
            </span>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
              <p className="text-[10px] text-muted-foreground font-medium">عدد العمال</p>
              <p className="font-bold text-blue-700 dark:text-blue-400 text-sm mt-0.5">{report.totals?.workerCount || 0}</p>
            </div>
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/50">
              <p className="text-[10px] text-muted-foreground font-medium">العهدة الواردة</p>
              <p className="font-bold text-green-700 dark:text-green-400 text-sm mt-0.5">{formatCurrency(totalFundTransfers)}</p>
            </div>
            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50">
              <p className="text-[10px] text-muted-foreground font-medium">إجمالي المتاح</p>
              <p className="font-bold text-orange-700 dark:text-orange-400 text-sm mt-0.5">{formatCurrency(carryForward + totalFundTransfers)}</p>
            </div>
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50">
              <p className="text-[10px] text-muted-foreground font-medium">إجمالي المصروفات</p>
              <p className="font-bold text-red-700 dark:text-red-400 text-sm mt-0.5">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className={`p-2 rounded-lg border col-span-2 sm:col-span-1 ${(carryForward + totalFundTransfers - totalExpenses) >= 0 ? 'bg-green-100 dark:bg-green-950/50 border-green-300 dark:border-green-700' : 'bg-red-100 dark:bg-red-950/50 border-red-300 dark:border-red-700'}`}>
              <p className="text-[10px] text-muted-foreground font-medium">المتبقي</p>
              <p className={`font-bold text-sm mt-0.5 ${(carryForward + totalFundTransfers - totalExpenses) >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} data-testid="text-day-balance">
                {formatCurrency(carryForward + totalFundTransfers - totalExpenses)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
