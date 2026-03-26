import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface ApiData {
  summaries: Summary[];
  workers: Worker[];
  transport: Transport[];
  misc: MiscItem[];
  funds: Fund[];
  purchases: Purchase[];
  workerTransfers: WorkerTransfer[];
}

const num = (v: string | number | null | undefined) => parseFloat(v as string) || 0;

function ProjectCard({
  summary,
  workers,
  transport,
  misc,
  funds,
  purchases,
  workerTransfers,
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
  const remaining = num(summary.remaining_balance);
  const totalIncome = num(summary.total_income);
  const carried = num(summary.carried_forward_amount);
  const newFunds = num(summary.total_fund_transfers);
  const cumFunds = num(summary.cumulative_funds);
  const cumExpenses = num(summary.cumulative_expenses);
  const cumBalance = num(summary.cumulative_balance);

  return (
    <Card className="overflow-hidden" data-testid={`project-card-${summary.project_id}`}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors border-b border-border"
        onClick={() => setExpanded(!expanded)}
        data-testid={`toggle-project-${summary.project_id}`}
      >
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-bold text-lg" data-testid={`project-name-${summary.project_id}`}>{summary.project_name}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant={remaining >= 0 ? "default" : "destructive"} className="text-xs">
                {remaining >= 0 ? "رصيد موجب" : "عجز"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">مصروف اليوم</div>
            <div className="font-bold text-red-600" data-testid={`expense-${summary.project_id}`}>{formatCurrency(totalExp)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">الرصيد التراكمي</div>
            <div className={`font-bold text-lg ${cumBalance >= 0 ? "text-green-600" : "text-red-600"}`} data-testid={`cumulative-${summary.project_id}`}>
              {formatCurrency(cumBalance)}
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {expanded && (
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-xs text-muted-foreground">إجمالي الحوالات (تراكمي)</div>
                <div className="font-bold text-sm text-green-700">{formatCurrency(cumFunds)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <div>
                <div className="text-xs text-muted-foreground">إجمالي المصروفات (تراكمي)</div>
                <div className="font-bold text-sm text-red-700">{formatCurrency(cumExpenses)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-300 dark:border-blue-700">
              <Wallet className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-xs text-muted-foreground font-bold">الرصيد التراكمي</div>
                <div className={`font-black text-base ${cumBalance >= 0 ? "text-blue-700" : "text-red-700"}`}>{formatCurrency(cumBalance)}</div>
              </div>
            </div>
          </div>

          {(newFunds > 0 || totalExp > 0) && (
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50/50 dark:bg-green-950/10">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <div>
                  <div className="text-[10px] text-muted-foreground">حوالات اليوم</div>
                  <div className="font-semibold text-xs">{formatCurrency(newFunds)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50/50 dark:bg-red-950/10">
                <TrendingDown className="h-3 w-3 text-red-500" />
                <div>
                  <div className="text-[10px] text-muted-foreground">مصروف اليوم</div>
                  <div className="font-semibold text-xs">{formatCurrency(totalExp)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-950/10">
                <Wallet className="h-3 w-3 text-slate-500" />
                <div>
                  <div className="text-[10px] text-muted-foreground">متبقي اليوم</div>
                  <div className="font-semibold text-xs">{formatCurrency(remaining)}</div>
                </div>
              </div>
            </div>
          )}

          {funds.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-sm">الحوالات الواردة ({funds.length})</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse" data-testid={`funds-table-${summary.project_id}`}>
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-right p-2">المرسل</th>
                      <th className="text-center p-2">المبلغ</th>
                      <th className="text-center p-2">رقم الحوالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {funds.map((f, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="text-right p-2">{f.sender_name}</td>
                        <td className="text-center p-2 font-bold text-green-600">{formatCurrency(num(f.amount))}</td>
                        <td className="text-center p-2 text-xs text-muted-foreground">{f.transfer_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {workers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-sm">أجور العمال ({workers.length})</span>
                <Badge variant="outline" className="text-xs">{formatCurrency(num(summary.total_worker_wages))}</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse" data-testid={`workers-table-${summary.project_id}`}>
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-right p-2">العامل</th>
                      <th className="text-center p-2">الأيام</th>
                      <th className="text-center p-2">اليومية</th>
                      <th className="text-center p-2">المستحق</th>
                      <th className="text-center p-2">المدفوع</th>
                      <th className="text-right p-2">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.map((w, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="text-right p-2 font-medium">{w.worker_name}</td>
                        <td className="text-center p-2">{w.work_days}</td>
                        <td className="text-center p-2">{formatCurrency(num(w.daily_wage))}</td>
                        <td className="text-center p-2">{formatCurrency(num(w.actual_wage))}</td>
                        <td className="text-center p-2 font-bold">{formatCurrency(num(w.paid_amount))}</td>
                        <td className="text-right p-2 text-xs text-muted-foreground max-w-[150px] truncate">{w.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {workerTransfers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Send className="h-4 w-4 text-orange-600" />
                <span className="font-semibold text-sm">حوالات العمال ({workerTransfers.length})</span>
                <Badge variant="outline" className="text-xs">{formatCurrency(num(summary.total_worker_transfers))}</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse" data-testid={`transfers-table-${summary.project_id}`}>
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-right p-2">العامل</th>
                      <th className="text-center p-2">المبلغ</th>
                      <th className="text-center p-2">رقم الحوالة</th>
                      <th className="text-right p-2">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workerTransfers.map((wt, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="text-right p-2 font-medium">{wt.worker_name}</td>
                        <td className="text-center p-2 font-bold text-orange-600">{formatCurrency(num(wt.amount))}</td>
                        <td className="text-center p-2 text-xs">{wt.transfer_number}</td>
                        <td className="text-right p-2 text-xs text-muted-foreground">{wt.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {transport.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Car className="h-4 w-4 text-purple-600" />
                <span className="font-semibold text-sm">المواصلات ({transport.length})</span>
                <Badge variant="outline" className="text-xs">{formatCurrency(num(summary.total_transportation_costs))}</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse" data-testid={`transport-table-${summary.project_id}`}>
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-right p-2">الوصف</th>
                      <th className="text-center p-2">المبلغ</th>
                      <th className="text-center p-2">النوع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transport.map((t, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="text-right p-2">{t.description}</td>
                        <td className="text-center p-2 font-bold">{formatCurrency(num(t.amount))}</td>
                        <td className="text-center p-2 text-xs">{t.transport_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {misc.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="h-4 w-4 text-amber-600" />
                <span className="font-semibold text-sm">النثريات ({misc.length})</span>
                <Badge variant="outline" className="text-xs">{formatCurrency(num(summary.total_worker_misc_expenses))}</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse" data-testid={`misc-table-${summary.project_id}`}>
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-right p-2">الوصف</th>
                      <th className="text-center p-2">المبلغ</th>
                      <th className="text-center p-2">النوع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {misc.map((m, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="text-right p-2">{m.description}</td>
                        <td className="text-center p-2 font-bold">{formatCurrency(num(m.amount))}</td>
                        <td className="text-center p-2 text-xs">{m.expense_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {purchases.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-teal-600" />
                <span className="font-semibold text-sm">المشتريات ({purchases.length})</span>
                <Badge variant="outline" className="text-xs">{formatCurrency(num(summary.total_material_costs))}</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse" data-testid={`purchases-table-${summary.project_id}`}>
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-right p-2">المورد</th>
                      <th className="text-center p-2">الإجمالي</th>
                      <th className="text-center p-2">المدفوع</th>
                      <th className="text-right p-2">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((p, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="text-right p-2">{p.supplier_name}</td>
                        <td className="text-center p-2">{formatCurrency(num(p.total_amount))}</td>
                        <td className="text-center p-2 font-bold">{formatCurrency(num(p.paid_amount))}</td>
                        <td className="text-right p-2 text-xs text-muted-foreground">{p.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function MultiProjectExpenses() {
  const [selectedDate, setSelectedDate] = useState<string>(getCurrentDate());
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());

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

  const allowedProjectIds = [
    '00735182-397d-4d04-8205-d3e11f1dec77',
    'b23ad9a5-bed2-43c7-8193-2261c76358cb',
  ];

  const { data: projectsData } = useQuery<{ data: any[] }>({
    queryKey: ["/api/projects"],
  });
  const allProjects: { id: string; name: string }[] = useMemo(() => {
    return (projectsData?.data || [])
      .filter((p: any) => allowedProjectIds.includes(p.id))
      .map((p: any) => ({ id: p.id, name: p.name }));
  }, [projectsData]);

  const { data, isLoading } = useQuery<{ data: ApiData }>({
    queryKey: ["/api/multi-project-expenses", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/multi-project-expenses?date=${selectedDate}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const apiData = data?.data;
  const allSummaries = useMemo(() => {
    return (apiData?.summaries || []).filter((s: Summary) => allowedProjectIds.includes(s.project_id));
  }, [apiData]);

  const summaries = useMemo(() => {
    if (selectedProjectIds.size === 0) return allSummaries;
    return allSummaries.filter((s) => selectedProjectIds.has(s.project_id));
  }, [allSummaries, selectedProjectIds]);

  const toggleProject = (projectId: string) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedProjectIds(new Set());
  };

  const grandTotalExpenses = summaries.reduce((s, r) => s + num(r.total_expenses), 0);
  const grandCumFunds = summaries.reduce((s, r) => s + num(r.cumulative_funds), 0);
  const grandCumExpenses = summaries.reduce((s, r) => s + num(r.cumulative_expenses), 0);
  const grandCumBalance = summaries.reduce((s, r) => s + num(r.cumulative_balance), 0);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6" dir="rtl" data-testid="multi-project-expenses-page">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={prevDate}
            data-testid="btn-prev-date"
          >
            <ChevronRight className="h-6 w-6 text-slate-600 dark:text-slate-400" />
          </Button>

          <div className="flex flex-col items-center flex-1 gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">مصروفات جميع المشاريع</span>
              <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={goToToday} data-testid="btn-today">
                اليوم
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-lg font-black text-slate-900 dark:text-white" data-testid="text-selected-date">
                {format(new Date(selectedDate), "EEEE, d MMMM yyyy", { locale: ar })}
              </span>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded px-2 py-1 text-xs text-center bg-muted/50"
              data-testid="input-date-picker"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={nextDate}
            data-testid="btn-next-date"
          >
            <ChevronLeft className="h-6 w-6 text-slate-600 dark:text-slate-400" />
          </Button>
        </div>

        {allProjects.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <Button
              variant={selectedProjectIds.size === 0 ? "default" : "outline"}
              size="sm"
              className="h-9 text-sm font-bold"
              onClick={selectAll}
              data-testid="btn-select-all"
            >
              <Building2 className="h-4 w-4 ml-1" />
              الكل ({allProjects.length})
            </Button>
            {allProjects.map((p) => {
              const isSelected = selectedProjectIds.has(p.id);
              const hasData = allSummaries.some((s) => s.project_id === p.id);
              return (
                <Button
                  key={p.id}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className={`h-9 text-sm ${isSelected ? "" : hasData ? "opacity-90" : "opacity-50"}`}
                  onClick={() => toggleProject(p.id)}
                  data-testid={`filter-project-${p.id}`}
                >
                  {p.name}
                  {hasData && <span className="mr-1 h-2 w-2 rounded-full bg-green-500 inline-block" />}
                </Button>
              );
            })}
          </div>
        )}

        {summaries.length > 1 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <div className="text-xs text-muted-foreground mb-1">إجمالي الحوالات (تراكمي)</div>
              <div className="text-xl font-bold text-green-600" data-testid="grand-cum-funds">{formatCurrency(grandCumFunds)}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <div className="text-xs text-muted-foreground mb-1">إجمالي المصروفات (تراكمي)</div>
              <div className="text-xl font-bold text-red-600" data-testid="grand-cum-expenses">{formatCurrency(grandCumExpenses)}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-300 dark:border-blue-700">
              <div className="text-xs text-muted-foreground mb-1 font-bold">الرصيد التراكمي</div>
              <div className={`text-xl font-black ${grandCumBalance >= 0 ? "text-blue-600" : "text-red-600"}`} data-testid="grand-cum-balance">
                {formatCurrency(grandCumBalance)}
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-20" data-testid="loading-state">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="mr-3 text-muted-foreground">جاري التحميل...</span>
          </div>
        )}

        {!isLoading && summaries.length === 0 && (
          <div className="text-center py-20" data-testid="empty-state">
            <Banknote className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-lg text-muted-foreground">لا توجد مصروفات مسجلة لهذا التاريخ</p>
            <p className="text-sm text-muted-foreground/60 mt-1">جرب تاريخ آخر</p>
          </div>
        )}

        {!isLoading && summaries.length > 0 && (
          <div className="space-y-4" data-testid="projects-list">
            {summaries.map((summary) => (
              <ProjectCard
                key={summary.project_id}
                summary={summary}
                workers={(apiData?.workers || []).filter((w) => w.project_id === summary.project_id)}
                transport={(apiData?.transport || []).filter((t) => t.project_id === summary.project_id)}
                misc={(apiData?.misc || []).filter((m) => m.project_id === summary.project_id)}
                funds={(apiData?.funds || []).filter((f) => f.project_id === summary.project_id)}
                purchases={(apiData?.purchases || []).filter((p) => p.project_id === summary.project_id)}
                workerTransfers={(apiData?.workerTransfers || []).filter((wt) => wt.project_id === summary.project_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
