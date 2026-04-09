import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Wallet, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ReportTable } from "./utils";
import type { DailyReportData } from "@shared/report-types";

export function SingleDayReport({ report, searchValue }: { report: DailyReportData; searchValue: string }) {
  const q = searchValue.trim().toLowerCase();
  const filteredAttendance = (report.attendance || []).filter((r: any) =>
    !q || [r.workerName, r.workerType, r.workDescription].some((v: string) => v?.toLowerCase().includes(q))
  );
  const filteredMaterials = (report.materials || []).filter((r: any) =>
    !q || [r.materialName, r.category, r.supplierName].some((v: string) => v?.toLowerCase().includes(q))
  );
  const filteredTransport = (report.transport || []).filter((r: any) =>
    !q || [r.description, r.workerName].some((v: string) => v?.toLowerCase().includes(q))
  );
  const filteredMisc = (report.miscExpenses || []).filter((r: any) =>
    !q || [r.description, r.notes].some((v: string) => v?.toLowerCase().includes(q))
  );
  const filteredFundTransfers = (report.fundTransfers || []).filter((r: any) =>
    !q || [r.senderName, r.transferType, r.transferNumber].some((v: string) => v?.toLowerCase().includes(q))
  );

  const attTotalWage = filteredAttendance.reduce((s: number, r: any) => s + parseFloat(r.totalWage || '0'), 0);
  const attTotalPaid = filteredAttendance.reduce((s: number, r: any) => s + parseFloat(r.paidAmount || '0'), 0);
  const attTotalRemaining = filteredAttendance.reduce((s: number, r: any) => s + parseFloat(r.remainingAmount || '0'), 0);

  const matTotal = filteredMaterials.reduce((s: number, r: any) => s + parseFloat(r.totalAmount || '0'), 0);
  const transTotal = filteredTransport.reduce((s: number, r: any) => s + parseFloat(r.amount || '0'), 0);
  const miscTotal = filteredMisc.reduce((s: number, r: any) => s + parseFloat(r.amount || '0'), 0);
  const fundTotal = filteredFundTransfers.reduce((s: number, r: any) => s + parseFloat(r.amount || '0'), 0);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base">سجل الحضور</CardTitle>
          <Badge variant="secondary">{filteredAttendance.length}</Badge>
        </CardHeader>
        <CardContent>
          <ReportTable
            testId="table-daily-attendance"
            headers={["#", "اسم العامل", "نوع العامل", "أيام العمل", "الأجر اليومي", "إجمالي الأجر", "المدفوع", "المتبقي", "وصف العمل"]}
            rows={filteredAttendance.map((r: any, i: number) => [
              i + 1, r.workerName, r.workerType, r.workDays, formatCurrency(r.dailyWage),
              formatCurrency(r.totalWage), formatCurrency(r.paidAmount), formatCurrency(r.remainingAmount), r.workDescription || "-",
            ])}
            totalsRow={filteredAttendance.length > 1 ? ["الإجمالي", null, null, null, null, formatCurrency(attTotalWage), formatCurrency(attTotalPaid), formatCurrency(attTotalRemaining), null] : undefined}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base">المواد والمشتريات</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{filteredMaterials.filter((r: any) => r.purchaseType === 'نقد' || r.purchaseType === 'نقداً').length} نقد</Badge>
            <Badge variant="secondary">{filteredMaterials.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ReportTable
            testId="table-daily-materials"
            headers={["#", "اسم المادة", "الصنف", "الكمية", "الوحدة", "سعر الوحدة", "الإجمالي", "نوع الشراء", "المدفوع", "المورد"]}
            rows={filteredMaterials.map((r: any, i: number) => {
              const isNaqd = r.purchaseType === 'نقد' || r.purchaseType === 'نقداً';
              const paid = parseFloat(r.paidAmount || '0');
              return [
                i + 1, r.materialName, r.category || "-", r.quantity, r.unit || "-",
                formatCurrency(r.unitPrice), formatCurrency(r.totalAmount),
                r.purchaseType || "-",
                isNaqd ? formatCurrency(paid > 0 ? paid : r.totalAmount) : "آجل",
                r.supplierName || "-",
              ];
            })}
            totalsRow={filteredMaterials.length > 1 ? ["الإجمالي", null, null, null, null, null, formatCurrency(matTotal), null, null, null] : undefined}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base">مصاريف النقل</CardTitle>
          <Badge variant="secondary">{filteredTransport.length}</Badge>
        </CardHeader>
        <CardContent>
          <ReportTable
            testId="table-daily-transport"
            headers={["#", "المبلغ", "الوصف", "اسم العامل"]}
            rows={filteredTransport.map((r: any, i: number) => [
              i + 1, formatCurrency(r.amount), r.description || "-", r.workerName || "-",
            ])}
            totalsRow={filteredTransport.length > 1 ? ["الإجمالي", formatCurrency(transTotal), null, null] : undefined}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base">مصاريف متنوعة</CardTitle>
          <Badge variant="secondary">{filteredMisc.length}</Badge>
        </CardHeader>
        <CardContent>
          <ReportTable
            testId="table-daily-misc"
            headers={["#", "المبلغ", "الوصف", "ملاحظات"]}
            rows={filteredMisc.map((r: any, i: number) => [
              i + 1, formatCurrency(r.amount), r.description || "-", r.notes || "-",
            ])}
            totalsRow={filteredMisc.length > 1 ? ["الإجمالي", formatCurrency(miscTotal), null, null] : undefined}
          />
        </CardContent>
      </Card>

      {filteredFundTransfers.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base">تحويلات الصناديق</CardTitle>
            <Badge variant="secondary">{filteredFundTransfers.length}</Badge>
          </CardHeader>
          <CardContent>
            <ReportTable
              testId="table-daily-fund-transfers"
              headers={["#", "المبلغ", "المرسل", "نوع التحويل", "رقم التحويل"]}
              rows={filteredFundTransfers.map((r: any, i: number) => [
                i + 1, formatCurrency(r.amount), r.senderName || "-", r.transferType || "-", r.transferNumber || "-",
              ])}
              totalsRow={filteredFundTransfers.length > 1 ? ["الإجمالي", formatCurrency(fundTotal), null, null, null] : undefined}
            />
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/30 bg-primary/5" data-testid="card-daily-summary">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            الملخص المالي لليوم
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
              <Users className="h-4 w-4 mx-auto mb-1 text-blue-600" />
              <p className="text-xs text-muted-foreground">عدد العمال</p>
              <p className="font-bold text-blue-700 dark:text-blue-400 text-sm mt-0.5" data-testid="summary-worker-count">{filteredAttendance.length}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/50">
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-600" />
              <p className="text-xs text-muted-foreground">العهدة الواردة</p>
              <p className="font-bold text-green-700 dark:text-green-400 text-sm mt-0.5" data-testid="summary-fund-in">{formatCurrency(fundTotal)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50">
              <TrendingDown className="h-4 w-4 mx-auto mb-1 text-red-600" />
              <p className="text-xs text-muted-foreground">إجمالي المصروفات</p>
              <p className="font-bold text-red-700 dark:text-red-400 text-sm mt-0.5" data-testid="summary-total-expenses">
                {formatCurrency(attTotalPaid + matTotal + transTotal + miscTotal)}
              </p>
            </div>
            <div className={`text-center p-3 rounded-lg border ${(fundTotal - attTotalPaid - matTotal - transTotal - miscTotal) >= 0 ? 'bg-green-100 dark:bg-green-950/50 border-green-300 dark:border-green-700' : 'bg-red-100 dark:bg-red-950/50 border-red-300 dark:border-red-700'}`}>
              <Wallet className="h-4 w-4 mx-auto mb-1 text-purple-600" />
              <p className="text-xs text-muted-foreground">الرصيد</p>
              <p className={`font-bold text-sm mt-0.5 ${(fundTotal - attTotalPaid - matTotal - transTotal - miscTotal) >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} data-testid="summary-balance">
                {formatCurrency(fundTotal - attTotalPaid - matTotal - transTotal - miscTotal)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
