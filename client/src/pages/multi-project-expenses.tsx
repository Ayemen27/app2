import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ChevronRight, Calendar, Building2, Users, Car,
  DollarSign, Receipt, Send, Package, Wallet, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, Banknote
} from "lucide-react";
import { formatCurrency, getCurrentDate } from "@/lib/utils";

interface Summary {
  project_id: string;
  project_name: string;
  total_income: string;
  total_expenses: string;
  remaining_balance: string;
  total_fund_transfers: string;
  total_worker_wages: string;
  total_transportation_costs: string;
  total_worker_misc_expenses: string;
  total_worker_transfers: string;
  total_material_costs: string;
  carried_forward_amount: string;
  cumulative_funds?: string;
  cumulative_expenses?: string;
  cumulative_balance?: string;
}

interface Worker {
  project_id: string;
  project_name: string;
  worker_name: string;
  paid_amount: string;
  work_days: string;
  daily_wage: string;
  actual_wage: string;
  notes: string;
}

interface Transport {
  project_id: string;
  project_name: string;
  amount: string;
  description: string;
  transport_type: string;
}

interface MiscItem {
  project_id: string;
  project_name: string;
  amount: string;
  description: string;
  expense_type: string;
}

interface Fund {
  project_id: string;
  project_name: string;
  amount: string;
  sender_name: string;
  transfer_number: string;
}

interface Purchase {
  project_id: string;
  project_name: string;
  total_amount: string;
  paid_amount: string;
  supplier_name: string;
  notes: string;
}

interface WorkerTransfer {
  project_id: string;
  project_name: string;
  amount: string;
  worker_name: string;
  transfer_number: string;
  notes: string;
}

interface GlobalTotals {
  total_cumulative_funds: string;
  total_cumulative_expenses: string;
  total_cumulative_balance: string;
  carried_forward_all: string;
  today_total_funds: string;
  today_total_expenses: string;
}

interface ApiData {
  summaries: Summary[];
  globalTotals?: GlobalTotals;
  workers: Worker[];
  transport: Transport[];
  misc: MiscItem[];
  funds: Fund[];
  purchases: Purchase[];
  workerTransfers: WorkerTransfer[];
}

const num = (v: string | number | null | undefined) => parseFloat(v as string) || 0;

const allowedProjectIds = [
  '00735182-397d-4d04-8205-d3e11f1dec77',
  'b23ad9a5-bed2-43c7-8193-2261c76358cb',
];

function SectionTable({ icon, title, count, total, headers, rows, testId }: {
  icon: React.ReactNode;
  title: string;
  count: number;
  total?: number;
  headers: string[];
  rows: React.ReactNode[][];
  testId: string;
}) {
  const [open, setOpen] = useState(true);
  if (count === 0) return null;
  return (
    <div>
      <div
        className="flex items-center gap-2 mb-2 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        {icon}
        <span className="font-semibold text-sm">{title} ({count})</span>
        {total !== undefined && <Badge variant="outline" className="text-xs">{formatCurrency(total)}</Badge>}
        {open ? <ChevronUp className="h-3 w-3 mr-auto" /> : <ChevronDown className="h-3 w-3 mr-auto" />}
      </div>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse" data-testid={testId}>
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {headers.map((h, i) => (
                  <th key={i} className={`p-2 ${i === 0 ? 'text-right' : 'text-center'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((cells, ri) => (
                <tr key={ri} className="border-b border-border/30">
                  {cells.map((cell, ci) => (
                    <td key={ci} className={`p-2 ${ci === 0 ? 'text-right' : 'text-center'}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function MultiProjectExpenses() {
  const [selectedDate, setSelectedDate] = useState<string>(getCurrentDate());

  const nextDate = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  const prevDate = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  const goToToday = () => {
    setSelectedDate(getCurrentDate());
  };

  const { data, isLoading } = useQuery<{ data: ApiData }>({
    queryKey: ["/api/multi-project-expenses", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/multi-project-expenses?date=${selectedDate}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const apiData = data?.data;
  const summaries = useMemo(() => {
    return (apiData?.summaries || []).filter((s: Summary) => allowedProjectIds.includes(s.project_id));
  }, [apiData]);

  const gt = apiData?.globalTotals;
  const carriedForward = num(gt?.carried_forward_all);
  const todayFunds = num(gt?.today_total_funds);
  const todayExpenses = num(gt?.today_total_expenses);
  const cumBalance = num(gt?.total_cumulative_balance);

  const allWorkers = (apiData?.workers || []).filter(w => allowedProjectIds.includes(w.project_id));
  const allTransport = (apiData?.transport || []).filter(t => allowedProjectIds.includes(t.project_id));
  const allMisc = (apiData?.misc || []).filter(m => allowedProjectIds.includes(m.project_id));
  const allFunds = (apiData?.funds || []).filter(f => allowedProjectIds.includes(f.project_id));
  const allPurchases = (apiData?.purchases || []).filter(p => allowedProjectIds.includes(p.project_id));
  const allWorkerTransfers = (apiData?.workerTransfers || []).filter(wt => allowedProjectIds.includes(wt.project_id));

  const totalWorkerWages = allWorkers.reduce((s, w) => s + num(w.paid_amount), 0);
  const totalTransport = allTransport.reduce((s, t) => s + num(t.amount), 0);
  const totalMisc = allMisc.reduce((s, m) => s + num(m.amount), 0);
  const totalFundsAmount = allFunds.reduce((s, f) => s + num(f.amount), 0);
  const totalPurchases = allPurchases.reduce((s, p) => s + num(p.paid_amount), 0);
  const totalWTransfers = allWorkerTransfers.reduce((s, wt) => s + num(wt.amount), 0);

  const hasData = summaries.length > 0 || carriedForward !== 0 || cumBalance !== 0;

  return (
    <div className="min-h-screen bg-background p-3 md:p-6" dir="rtl" data-testid="multi-project-expenses-page">
      <div className="max-w-4xl mx-auto space-y-3">

        <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border shadow-sm">
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full" onClick={prevDate} data-testid="btn-prev-date">
            <ChevronRight className="h-6 w-6" />
          </Button>
          <div className="flex flex-col items-center flex-1 gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-bold">مصروفات المشاريع</span>
              <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={goToToday} data-testid="btn-today">اليوم</Button>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-base font-black" data-testid="text-selected-date">
                {format(new Date(selectedDate), "EEEE, d MMMM yyyy", { locale: ar })}
              </span>
            </div>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded px-2 py-1 text-xs text-center bg-muted/50" data-testid="input-date-picker" />
          </div>
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full" onClick={nextDate} data-testid="btn-next-date">
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20" data-testid="loading-state">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="mr-3 text-muted-foreground">جاري التحميل...</span>
          </div>
        )}

        {!isLoading && !hasData && (
          <div className="text-center py-20" data-testid="empty-state">
            <Banknote className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-lg text-muted-foreground">لا توجد مصروفات مسجلة لهذا التاريخ</p>
          </div>
        )}

        {!isLoading && hasData && (
          <>
            <Card className="overflow-hidden border-2 border-primary/20" data-testid="global-summary-card">
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
                    <div className="text-[10px] text-muted-foreground font-medium">المرحّل من سابق</div>
                    <div className={`font-black text-lg ${carriedForward >= 0 ? "text-amber-700" : "text-red-700"}`} data-testid="carried-forward">
                      {formatCurrency(carriedForward)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-center">
                    <div className="text-[10px] text-muted-foreground font-medium">+ حوالات اليوم</div>
                    <div className="font-black text-lg text-green-700" data-testid="today-funds">
                      {formatCurrency(todayFunds)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-center">
                    <div className="text-[10px] text-muted-foreground font-medium">- مصروف اليوم</div>
                    <div className="font-black text-lg text-red-700" data-testid="today-expenses">
                      {formatCurrency(todayExpenses)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-400 dark:border-blue-600 text-center">
                    <div className="text-[10px] text-muted-foreground font-bold">= الرصيد</div>
                    <div className={`font-black text-lg ${cumBalance >= 0 ? "text-blue-700" : "text-red-700"}`} data-testid="cumulative-balance">
                      {formatCurrency(cumBalance)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  <span>ابار التحيتا + ابار الجراحي — المهندس محمد</span>
                </div>
              </div>
            </Card>

            {summaries.map((summary) => {
              const projWorkers = allWorkers.filter(w => w.project_id === summary.project_id);
              const projTransport = allTransport.filter(t => t.project_id === summary.project_id);
              const projMisc = allMisc.filter(m => m.project_id === summary.project_id);
              const projFunds = allFunds.filter(f => f.project_id === summary.project_id);
              const projPurchases = allPurchases.filter(p => p.project_id === summary.project_id);
              const projWTransfers = allWorkerTransfers.filter(wt => wt.project_id === summary.project_id);
              const projExpense = num(summary.total_expenses);
              const projCum = num(summary.cumulative_balance);
              const hasAnyDetail = projWorkers.length > 0 || projTransport.length > 0 || projMisc.length > 0 || projFunds.length > 0 || projPurchases.length > 0 || projWTransfers.length > 0;

              if (!hasAnyDetail && projExpense === 0 && num(summary.total_fund_transfers) === 0) return null;

              return (
                <ProjectSection
                  key={summary.project_id}
                  summary={summary}
                  workers={projWorkers}
                  transport={projTransport}
                  misc={projMisc}
                  funds={projFunds}
                  purchases={projPurchases}
                  workerTransfers={projWTransfers}
                />
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function ProjectSection({
  summary, workers, transport, misc, funds, purchases, workerTransfers,
}: {
  summary: Summary;
  workers: Worker[];
  transport: Transport[];
  misc: MiscItem[];
  funds: Fund[];
  purchases: Purchase[];
  workerTransfers: WorkerTransfer[];
}) {
  const [expanded, setExpanded] = useState(true);
  const totalExp = num(summary.total_expenses);
  const projFunds = num(summary.total_fund_transfers);
  const cumBal = num(summary.cumulative_balance);

  return (
    <Card className="overflow-hidden" data-testid={`project-card-${summary.project_id}`}>
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors border-b"
        onClick={() => setExpanded(!expanded)}
        data-testid={`toggle-project-${summary.project_id}`}
      >
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm" data-testid={`project-name-${summary.project_id}`}>{summary.project_name}</h3>
        </div>
        <div className="flex items-center gap-3 text-center">
          {projFunds > 0 && (
            <div>
              <div className="text-[9px] text-muted-foreground">حوالات</div>
              <div className="font-bold text-xs text-green-600">{formatCurrency(projFunds)}</div>
            </div>
          )}
          <div>
            <div className="text-[9px] text-muted-foreground">مصروف</div>
            <div className="font-bold text-xs text-red-600">{formatCurrency(totalExp)}</div>
          </div>
          <div>
            <div className="text-[9px] text-muted-foreground">رصيد</div>
            <div className={`font-bold text-xs ${cumBal >= 0 ? "text-blue-600" : "text-red-600"}`}>{formatCurrency(cumBal)}</div>
          </div>
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </div>
      </div>

      {expanded && (
        <CardContent className="p-3 space-y-3">
          <SectionTable
            icon={<DollarSign className="h-4 w-4 text-green-600" />}
            title="الحوالات الواردة"
            count={funds.length}
            total={funds.reduce((s, f) => s + num(f.amount), 0)}
            headers={["المرسل", "المبلغ", "رقم الحوالة"]}
            rows={funds.map(f => [
              f.sender_name,
              <span className="font-bold text-green-600">{formatCurrency(num(f.amount))}</span>,
              <span className="text-xs text-muted-foreground">{f.transfer_number}</span>,
            ])}
            testId={`funds-table-${summary.project_id}`}
          />

          <SectionTable
            icon={<Users className="h-4 w-4 text-blue-600" />}
            title="أجور العمال"
            count={workers.length}
            total={workers.reduce((s, w) => s + num(w.paid_amount), 0)}
            headers={["العامل", "الأيام", "اليومية", "المستحق", "المدفوع", "ملاحظات"]}
            rows={workers.map(w => [
              <span className="font-medium">{w.worker_name}</span>,
              w.work_days,
              formatCurrency(num(w.daily_wage)),
              formatCurrency(num(w.actual_wage)),
              <span className="font-bold">{formatCurrency(num(w.paid_amount))}</span>,
              <span className="text-xs text-muted-foreground max-w-[120px] truncate block">{w.notes}</span>,
            ])}
            testId={`workers-table-${summary.project_id}`}
          />

          <SectionTable
            icon={<Send className="h-4 w-4 text-orange-600" />}
            title="حوالات العمال"
            count={workerTransfers.length}
            total={workerTransfers.reduce((s, wt) => s + num(wt.amount), 0)}
            headers={["العامل", "المبلغ", "رقم الحوالة", "ملاحظات"]}
            rows={workerTransfers.map(wt => [
              <span className="font-medium">{wt.worker_name}</span>,
              <span className="font-bold text-orange-600">{formatCurrency(num(wt.amount))}</span>,
              <span className="text-xs">{wt.transfer_number}</span>,
              <span className="text-xs text-muted-foreground">{wt.notes}</span>,
            ])}
            testId={`transfers-table-${summary.project_id}`}
          />

          <SectionTable
            icon={<Car className="h-4 w-4 text-purple-600" />}
            title="المواصلات"
            count={transport.length}
            total={transport.reduce((s, t) => s + num(t.amount), 0)}
            headers={["الوصف", "المبلغ", "النوع"]}
            rows={transport.map(t => [
              t.description,
              <span className="font-bold">{formatCurrency(num(t.amount))}</span>,
              <span className="text-xs">{t.transport_type}</span>,
            ])}
            testId={`transport-table-${summary.project_id}`}
          />

          <SectionTable
            icon={<Receipt className="h-4 w-4 text-amber-600" />}
            title="النثريات"
            count={misc.length}
            total={misc.reduce((s, m) => s + num(m.amount), 0)}
            headers={["الوصف", "المبلغ", "النوع"]}
            rows={misc.map(m => [
              m.description,
              <span className="font-bold">{formatCurrency(num(m.amount))}</span>,
              <span className="text-xs">{m.expense_type}</span>,
            ])}
            testId={`misc-table-${summary.project_id}`}
          />

          <SectionTable
            icon={<Package className="h-4 w-4 text-teal-600" />}
            title="المشتريات"
            count={purchases.length}
            total={purchases.reduce((s, p) => s + num(p.paid_amount), 0)}
            headers={["المورد", "الإجمالي", "المدفوع", "ملاحظات"]}
            rows={purchases.map(p => [
              p.supplier_name,
              formatCurrency(num(p.total_amount)),
              <span className="font-bold">{formatCurrency(num(p.paid_amount))}</span>,
              <span className="text-xs text-muted-foreground">{p.notes}</span>,
            ])}
            testId={`purchases-table-${summary.project_id}`}
          />
        </CardContent>
      )}
    </Card>
  );
}
