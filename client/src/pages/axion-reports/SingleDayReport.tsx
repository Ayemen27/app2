import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Store, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { DailyReportData } from "@shared/report-types";
import {
  buildDailyTransactions,
  orderDailyTransactions,
  getAccountTypeLabel,
  getEntryName,
  getRowColors,
  computeRunningBalance,
} from "@shared/daily-transactions";

const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];
const DAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function gregorianToHijri(date: Date) {
  const dayName = DAY_NAMES_AR[date.getDay()];
  const jd = Math.floor((date.getTime() / 86400000) + 2440587.5);
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
            Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
      Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { day, month, year, monthName: HIJRI_MONTHS[month - 1] || '', dayName };
}

function fmt(n: number): string {
  return Number(n || 0).toLocaleString('en-US');
}

function useIsDark() {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

export function SingleDayReport({ report, searchValue }: { report: DailyReportData; searchValue: string }) {
  const isDark = useIsDark();
  const q = searchValue.trim().toLowerCase();

  const allTxs = buildDailyTransactions(report, report.date);
  const ordered = orderDailyTransactions(allTxs);
  const filtered = q
    ? ordered.filter(t =>
        [getEntryName(t), getAccountTypeLabel(t.type, t.category), t.notes, t.description, t.workerName]
          .some(v => v && String(v).toLowerCase().includes(q))
      )
    : ordered;

  const { rows, finalBalance } = computeRunningBalance(filtered);

  const totalIncome = filtered
    .filter(t => t.type === 'income' || t.type === 'transfer_from_project')
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered
    .filter(t => t.type !== 'income' && t.type !== 'transfer_from_project')
    .reduce((s, t) => s + t.amount, 0);

  const supplierBalances = (report.supplierBalances || []).filter(s =>
    !q || s.supplierName.toLowerCase().includes(q)
  );

  const dateObj = (() => {
    const [y, m, d] = report.date.split('-').map(Number);
    return new Date(y, m - 1, d, 12);
  })();
  const hijri = gregorianToHijri(dateObj);
  const gFormatted = dateObj.toLocaleDateString('en-GB').replace(/\//g, '-');
  const projectName = report.project?.name || '';

  return (
    <div className="space-y-3">
      {/* رأس التقرير - مطابق للقالب */}
      <Card className="overflow-hidden border-0 shadow-md" data-testid="card-report-header">
        <div className="bg-gradient-to-l from-emerald-700 to-emerald-600 dark:from-emerald-800 dark:to-emerald-700 text-white px-5 py-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <FileText className="h-5 w-5" />
            <h2 className="text-base sm:text-lg font-bold" data-testid="text-report-title">
              كشف مصروفات مشروع {projectName}
            </h2>
          </div>
          <div className="text-xs sm:text-sm opacity-95 flex flex-wrap items-center justify-center gap-x-4 gap-y-1" data-testid="text-report-date">
            <span>الموافق {gFormatted}</span>
            <span className="opacity-75">|</span>
            <span>{hijri.dayName} {hijri.day} {hijri.monthName} {hijri.year}هـ</span>
          </div>
        </div>
        {/* مفتاح الألوان */}
        <div className="bg-muted/30 dark:bg-muted/10 px-3 py-2 border-t flex flex-wrap gap-x-4 gap-y-1 text-[10px] sm:text-xs text-muted-foreground" data-testid="legend-colors">
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm border" style={{ background: '#d6ead7' }} /> رصيد مرحل موجب</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm border" style={{ background: '#fce4e4' }} /> رصيد مرحل سالب</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm border" style={{ background: '#daeaf5' }} /> دخل / عهدة</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm border" style={{ background: '#fff0cc' }} /> ترحيل مشاريع</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm border" style={{ background: '#eee8f8' }} /> مشتريات مواد</span>
        </div>
      </Card>

      {/* الجدول الرئيسي - كشف الحساب الموحد */}
      <Card className="overflow-hidden shadow-md" data-testid="card-statement">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm border-collapse" data-testid="table-daily-statement">
            <thead>
              <tr className="bg-emerald-700 dark:bg-emerald-800 text-white">
                <th className="px-2 py-2.5 border border-emerald-800 dark:border-emerald-900 font-bold whitespace-nowrap" style={{ width: '12%' }}>المبلغ</th>
                <th className="px-2 py-2.5 border border-emerald-800 dark:border-emerald-900 font-bold whitespace-nowrap" style={{ width: '14%' }}>نوع الحساب</th>
                <th className="px-2 py-2.5 border border-emerald-800 dark:border-emerald-900 font-bold" style={{ width: '22%' }}>الاسم</th>
                <th className="px-2 py-2.5 border border-emerald-800 dark:border-emerald-900 font-bold whitespace-nowrap" style={{ width: '9%' }}>عدد الأيام</th>
                <th className="px-2 py-2.5 border border-emerald-800 dark:border-emerald-900 font-bold whitespace-nowrap" style={{ width: '14%' }}>الرصيد التجميعي</th>
                <th className="px-2 py-2.5 border border-emerald-800 dark:border-emerald-900 font-bold" style={{ width: '29%' }}>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground border" data-testid="row-empty">
                    لا توجد عمليات لهذا اليوم
                  </td>
                </tr>
              )}
              {rows.map((t, idx) => {
                const colors = getRowColors(t.type, t.category, t.isNegOpening);
                const bg = colors
                  ? (isDark ? colors.bgDark : colors.bg)
                  : (idx % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.025)' : '#fafafa'));
                const runColor = t.running < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400';
                const fontW = t.isOpening ? 'font-bold' : '';
                const name = getEntryName(t);
                const acctType = getAccountTypeLabel(t.type, t.category);
                const notesVal = t.notes || (t.description && t.description !== name ? t.description : '') || '';
                return (
                  <tr key={idx} className={`transition-colors ${fontW}`} style={{ background: bg }} data-testid={`row-tx-${idx}`}>
                    <td className="px-2 py-2 border text-center tabular-nums" data-testid={`text-amount-${idx}`}>{fmt(t.amount)}</td>
                    <td className="px-2 py-2 border text-center text-xs">{acctType}</td>
                    <td className="px-2 py-2 border text-right" data-testid={`text-name-${idx}`}>{name}</td>
                    <td className="px-2 py-2 border text-center tabular-nums">{t.workDays != null ? t.workDays : ''}</td>
                    <td className={`px-2 py-2 border text-center font-bold tabular-nums ${runColor}`} data-testid={`text-running-${idx}`}>{fmt(t.running)}</td>
                    <td className="px-2 py-2 border text-right text-[11px] sm:text-xs text-muted-foreground">{notesVal}</td>
                  </tr>
                );
              })}
              {rows.length > 0 && (
                <tr className="bg-rose-300 dark:bg-rose-900/50 font-bold" data-testid="row-final-balance">
                  <td colSpan={4} className="px-2 py-3 border-2 border-rose-400 dark:border-rose-700 text-center text-sm sm:text-base text-rose-900 dark:text-rose-100">
                    المبلغ المتبقي
                  </td>
                  <td className={`px-2 py-3 border-2 border-rose-400 dark:border-rose-700 text-center text-sm sm:text-base tabular-nums ${finalBalance < 0 ? 'text-red-700 dark:text-red-300' : 'text-amber-900 dark:text-amber-200'}`} data-testid="text-final-balance">
                    {fmt(finalBalance)}
                  </td>
                  <td className="px-2 py-3 border-2 border-rose-400 dark:border-rose-700 bg-rose-300 dark:bg-rose-900/50"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* بطاقة الإجماليات أسفل الجدول */}
        <div className="grid grid-cols-3 gap-px bg-border" data-testid="summary-bar">
          <div className="bg-blue-50 dark:bg-blue-950/30 px-3 py-3 text-center">
            <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">إجمالي الدخل</div>
            <div className="text-sm sm:text-base font-bold text-blue-700 dark:text-blue-400 tabular-nums" data-testid="text-total-income">{formatCurrency(totalIncome)}</div>
          </div>
          <div className="bg-red-50 dark:bg-red-950/30 px-3 py-3 text-center">
            <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">إجمالي المصروفات</div>
            <div className="text-sm sm:text-base font-bold text-red-700 dark:text-red-400 tabular-nums" data-testid="text-total-expense">{formatCurrency(totalExpense)}</div>
          </div>
          <div className={`px-3 py-3 text-center ${finalBalance >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-rose-50 dark:bg-rose-950/30'}`}>
            <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
              <Wallet className="h-3 w-3" />
              المتبقي
            </div>
            <div className={`text-sm sm:text-base font-bold tabular-nums ${finalBalance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`} data-testid="text-summary-balance">
              {formatCurrency(finalBalance)}
            </div>
          </div>
        </div>
      </Card>

      {/* أرصدة الموردين الآجلة - معلومات إضافية لا تدخل في كشف اليوم */}
      {supplierBalances.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-900/40 shadow-sm" data-testid="card-supplier-balances">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Store className="h-4 w-4" />
              أرصدة الموردين (آجل)
            </CardTitle>
            <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              {formatCurrency(supplierBalances.reduce((s, b) => s + b.totalDebt, 0))}
            </Badge>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-amber-100/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
                    <th className="px-2 py-2 border border-amber-200 dark:border-amber-900/40 text-center">#</th>
                    <th className="px-2 py-2 border border-amber-200 dark:border-amber-900/40 text-right">المورد</th>
                    <th className="px-2 py-2 border border-amber-200 dark:border-amber-900/40 text-center">دين سابق</th>
                    <th className="px-2 py-2 border border-amber-200 dark:border-amber-900/40 text-center">مشتريات اليوم</th>
                    <th className="px-2 py-2 border border-amber-200 dark:border-amber-900/40 text-center">مدفوع اليوم</th>
                    <th className="px-2 py-2 border border-amber-200 dark:border-amber-900/40 text-center">إجمالي المستحق</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierBalances.map((s, i) => (
                    <tr key={i} className="hover-elevate" data-testid={`row-supplier-${i}`}>
                      <td className="px-2 py-2 border text-center tabular-nums">{i + 1}</td>
                      <td className="px-2 py-2 border text-right">{s.supplierName}</td>
                      <td className="px-2 py-2 border text-center tabular-nums">{formatCurrency(s.previousDebt)}</td>
                      <td className="px-2 py-2 border text-center tabular-nums">{formatCurrency(s.todayPurchases)}</td>
                      <td className="px-2 py-2 border text-center tabular-nums">{s.todayPayments > 0 ? formatCurrency(s.todayPayments) : '-'}</td>
                      <td className="px-2 py-2 border text-center font-bold tabular-nums text-amber-700 dark:text-amber-400">{formatCurrency(s.totalDebt)}</td>
                    </tr>
                  ))}
                  {supplierBalances.length > 1 && (
                    <tr className="bg-amber-50 dark:bg-amber-950/20 font-bold">
                      <td colSpan={2} className="px-2 py-2 border text-right">الإجمالي</td>
                      <td className="px-2 py-2 border text-center tabular-nums">{formatCurrency(supplierBalances.reduce((s, b) => s + b.previousDebt, 0))}</td>
                      <td className="px-2 py-2 border text-center tabular-nums">{formatCurrency(supplierBalances.reduce((s, b) => s + b.todayPurchases, 0))}</td>
                      <td className="px-2 py-2 border text-center tabular-nums">{formatCurrency(supplierBalances.reduce((s, b) => s + b.todayPayments, 0))}</td>
                      <td className="px-2 py-2 border text-center tabular-nums text-amber-700 dark:text-amber-400">{formatCurrency(supplierBalances.reduce((s, b) => s + b.totalDebt, 0))}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ملاحظة المستحقات غير المدفوعة */}
      {(() => {
        const unpaidWages = (report.attendance || []).reduce((s: number, r: any) => s + parseFloat(r.remainingAmount || '0'), 0);
        if (unpaidWages <= 0) return null;
        return (
          <div className="text-xs bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 rounded-md px-3 py-2 flex flex-wrap items-center gap-2" data-testid="note-unpaid">
            <span>ملاحظة:</span>
            <span>مستحقات عمال معلقة (غير مدفوعة)</span>
            <span className="font-bold">{formatCurrency(unpaidWages)}</span>
            <span className="text-muted-foreground mr-auto">— لا تُحسب ضمن المصروفات النقدية</span>
          </div>
        );
      })()}
    </div>
  );
}
