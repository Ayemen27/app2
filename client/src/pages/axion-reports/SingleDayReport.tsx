import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
          <Badge variant="secondary">{filteredMaterials.length}</Badge>
        </CardHeader>
        <CardContent>
          <ReportTable
            testId="table-daily-materials"
            headers={["#", "اسم المادة", "الصنف", "الكمية", "الوحدة", "سعر الوحدة", "الإجمالي", "المورد"]}
            rows={filteredMaterials.map((r: any, i: number) => [
              i + 1, r.materialName, r.category || "-", r.quantity, r.unit || "-",
              formatCurrency(r.unitPrice), formatCurrency(r.totalAmount), r.supplierName || "-",
            ])}
            totalsRow={filteredMaterials.length > 1 ? ["الإجمالي", null, null, null, null, null, formatCurrency(matTotal), null] : undefined}
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
    </>
  );
}
