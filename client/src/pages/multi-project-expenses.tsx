import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  ChevronLeft, ChevronRight, Calendar, Building2, Users, Car,
  DollarSign, Receipt, Send, Package, Wallet, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, Banknote, CheckCircle2, Circle, Layers
} from "lucide-react";
import { UnifiedCard, UnifiedCardField } from "@/components/ui/unified-card";
import { StatsCard } from "@/components/ui/stats-card";
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
  globalTotals?: any;
  workers: Worker[];
  transport: Transport[];
  misc: MiscItem[];
  funds: Fund[];
  purchases: Purchase[];
  workerTransfers: WorkerTransfer[];
}

const num = (v: string | number | null | undefined) => parseFloat(v as string) || 0;

export default function MultiProjectExpenses() {
  const [selectedDate, setSelectedDate] = useState<string>(getCurrentDate());
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());

  const nextDate = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };
  const prevDate = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };
  const goToToday = () => setSelectedDate(getCurrentDate());

  const { data: projectsData } = useQuery<{ data: any[] }>({ queryKey: ["/api/projects"] });
  const allProjects: { id: string; name: string }[] = useMemo(() => {
    return (projectsData?.data || []).map((p: any) => ({ id: p.id, name: p.name }));
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

  const activeIds = useMemo(() => {
    if (selectedProjectIds.size === 0) return new Set<string>();
    return selectedProjectIds;
  }, [selectedProjectIds]);

  const summaries = useMemo(() => {
    const all = apiData?.summaries || [];
    if (activeIds.size === 0) return all;
    return all.filter(s => activeIds.has(s.project_id));
  }, [apiData, activeIds]);

  const projectsWithData = useMemo(() => {
    const ids = new Set((apiData?.summaries || []).map(s => s.project_id));
    return ids;
  }, [apiData]);

  const toggleProject = (id: string) => {
    setSelectedProjectIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalFunds = summaries.reduce((s, r) => s + num(r.total_fund_transfers), 0);
  const totalExpenses = summaries.reduce((s, r) => s + num(r.total_expenses), 0);
  const cumFunds = summaries.reduce((s, r) => s + num(r.cumulative_funds), 0);
  const cumExpenses = summaries.reduce((s, r) => s + num(r.cumulative_expenses), 0);
  const cumBalance = cumFunds - cumExpenses;
  const carriedForward = cumBalance - totalFunds + totalExpenses;

  const filterItems = (items: any[]) => {
    if (activeIds.size === 0) return items;
    return items.filter((i: any) => activeIds.has(i.project_id));
  };

  const allWorkers = filterItems(apiData?.workers || []);
  const allTransport = filterItems(apiData?.transport || []);
  const allMisc = filterItems(apiData?.misc || []);
  const allFundsData = filterItems(apiData?.funds || []);
  const allPurchases = filterItems(apiData?.purchases || []);
  const allWorkerTransfers = filterItems(apiData?.workerTransfers || []);

  const hasSelection = activeIds.size > 0;
  const selectedNames = summaries.map(s => s.project_name).join(" + ");

  return (
    <div className="min-h-screen bg-background p-3 md:p-6" dir="rtl" data-testid="multi-project-expenses-page">
      <div className="max-w-4xl mx-auto space-y-3">

        <div className="bg-card rounded-2xl border-2 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full" onClick={prevDate} data-testid="btn-prev-date">
              <ChevronRight className="h-5 w-5" />
            </Button>
            <div className="flex flex-col items-center flex-1 gap-1">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">مصروفات المشاريع</span>
                <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 rounded-full" onClick={goToToday} data-testid="btn-today">اليوم</Button>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-base font-black" data-testid="text-selected-date">
                  {format(new Date(selectedDate), "EEEE, d MMMM yyyy", { locale: ar })}
                </span>
              </div>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded-lg px-3 py-1 text-xs text-center bg-muted/50 w-40" data-testid="input-date-picker" />
            </div>
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full" onClick={nextDate} data-testid="btn-next-date">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {allProjects.length > 0 && (
          <div className="bg-card rounded-2xl border-2 shadow-sm p-3">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-muted-foreground">اختر المشاريع للدمج</span>
              {activeIds.size > 0 && (
                <Badge variant="default" className="text-[10px] h-5 px-1.5">
                  {activeIds.size} مختار
                </Badge>
              )}
              {activeIds.size > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 mr-auto" onClick={() => setSelectedProjectIds(new Set())} data-testid="btn-clear-selection">
                  إلغاء التحديد
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allProjects.map((p) => {
                const isSelected = activeIds.has(p.id);
                const hasData = projectsWithData.has(p.id);
                return (
                  <Button
                    key={p.id}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className={`h-8 text-xs gap-1.5 rounded-full transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-md"
                        : hasData
                          ? "border-primary/30 hover:border-primary/60"
                          : "opacity-50"
                    }`}
                    onClick={() => toggleProject(p.id)}
                    data-testid={`filter-project-${p.id}`}
                  >
                    {isSelected ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                    {p.name}
                    {hasData && !isSelected && <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-20" data-testid="loading-state">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="mr-3 text-muted-foreground">جاري التحميل...</span>
          </div>
        )}

        {!isLoading && summaries.length === 0 && !hasSelection && (
          <div className="text-center py-16 bg-card rounded-2xl border-2 shadow-sm" data-testid="empty-state">
            <Banknote className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-base text-muted-foreground font-medium">لا توجد مصروفات مسجلة لهذا التاريخ</p>
            <p className="text-xs text-muted-foreground/60 mt-1">اختر مشاريع من القائمة أعلاه أو جرب تاريخ آخر</p>
          </div>
        )}

        {!isLoading && hasSelection && (
          <>
            <div className="bg-card rounded-2xl border-2 border-primary/20 shadow-sm p-4 space-y-3" data-testid="global-summary-card">
              <div className="grid grid-cols-2 gap-2">
                <StatsCard
                  title="المرحّل من سابق"
                  value={formatCurrency(carriedForward)}
                  icon={Wallet}
                  color={carriedForward >= 0 ? "amber" : "red"}
                  data-testid="carried-forward"
                />
                <StatsCard
                  title="حوالات اليوم"
                  value={formatCurrency(totalFunds)}
                  icon={TrendingUp}
                  color="green"
                  data-testid="today-funds"
                />
                <StatsCard
                  title="مصروف اليوم"
                  value={formatCurrency(totalExpenses)}
                  icon={TrendingDown}
                  color="red"
                  data-testid="today-expenses"
                />
                <StatsCard
                  title="الرصيد التراكمي"
                  value={formatCurrency(cumBalance)}
                  icon={DollarSign}
                  color={cumBalance >= 0 ? "blue" : "red"}
                  data-testid="cumulative-balance"
                />
              </div>

              <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground pt-1 border-t">
                <Building2 className="h-3 w-3" />
                <span>{selectedNames || "لم يتم اختيار مشاريع"}</span>
              </div>
            </div>

            {summaries.map((summary) => {
              const projWorkers = allWorkers.filter((w: Worker) => w.project_id === summary.project_id);
              const projTransport = allTransport.filter((t: Transport) => t.project_id === summary.project_id);
              const projMisc = allMisc.filter((m: MiscItem) => m.project_id === summary.project_id);
              const projFunds = allFundsData.filter((f: Fund) => f.project_id === summary.project_id);
              const projPurchases = allPurchases.filter((p: Purchase) => p.project_id === summary.project_id);
              const projWTransfers = allWorkerTransfers.filter((wt: WorkerTransfer) => wt.project_id === summary.project_id);
              const projExp = num(summary.total_expenses);
              const projFundsTotal = num(summary.total_fund_transfers);
              const hasAny = projWorkers.length > 0 || projTransport.length > 0 || projMisc.length > 0 || projFunds.length > 0 || projPurchases.length > 0 || projWTransfers.length > 0;

              if (!hasAny && projExp === 0 && projFundsTotal === 0) return null;

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

        {!isLoading && !hasSelection && summaries.length > 0 && (
          <div className="space-y-3" data-testid="projects-list">
            {summaries.map((summary) => {
              const projWorkers = (apiData?.workers || []).filter((w: Worker) => w.project_id === summary.project_id);
              const projTransport = (apiData?.transport || []).filter((t: Transport) => t.project_id === summary.project_id);
              const projMisc = (apiData?.misc || []).filter((m: MiscItem) => m.project_id === summary.project_id);
              const projFunds = (apiData?.funds || []).filter((f: Fund) => f.project_id === summary.project_id);
              const projPurchases = (apiData?.purchases || []).filter((p: Purchase) => p.project_id === summary.project_id);
              const projWTransfers = (apiData?.workerTransfers || []).filter((wt: WorkerTransfer) => wt.project_id === summary.project_id);

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
          </div>
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

  const fields: UnifiedCardField[] = [
    { label: "حوالات", value: formatCurrency(projFunds), icon: TrendingUp, color: "success", emphasis: projFunds > 0 },
    { label: "مصروف", value: formatCurrency(totalExp), icon: TrendingDown, color: "danger", emphasis: true },
    { label: "أجور عمال", value: formatCurrency(num(summary.total_worker_wages)), icon: Users, color: "info" },
    { label: "مواصلات", value: formatCurrency(num(summary.total_transportation_costs)), icon: Car, color: "warning" },
    { label: "نثريات", value: formatCurrency(num(summary.total_worker_misc_expenses)), icon: Receipt, color: "muted", hidden: num(summary.total_worker_misc_expenses) === 0 },
    { label: "حوالات عمال", value: formatCurrency(num(summary.total_worker_transfers)), icon: Send, color: "warning", hidden: num(summary.total_worker_transfers) === 0 },
    { label: "مشتريات", value: formatCurrency(num(summary.total_material_costs)), icon: Package, color: "info", hidden: num(summary.total_material_costs) === 0 },
    { label: "الرصيد", value: formatCurrency(cumBal), icon: Wallet, color: cumBal >= 0 ? "success" : "danger", emphasis: true },
  ];

  return (
    <div className="space-y-0" data-testid={`project-card-${summary.project_id}`}>
      <UnifiedCard
        title={summary.project_name}
        titleIcon={Building2}
        headerColor="#3b82f6"
        badges={[
          { label: cumBal >= 0 ? "رصيد موجب" : "عجز", variant: cumBal >= 0 ? "success" : "destructive" },
        ]}
        fields={fields}
        compact
        className="rounded-b-none border-b-0"
        data-testid={`summary-card-${summary.project_id}`}
      />

      <div className="bg-card border-2 border-t-0 rounded-b-2xl overflow-hidden">
        <div
          className="flex items-center justify-center gap-2 p-2 cursor-pointer hover:bg-muted/30 transition-colors border-t border-dashed"
          onClick={() => setExpanded(!expanded)}
          data-testid={`toggle-details-${summary.project_id}`}
        >
          <span className="text-xs text-muted-foreground font-medium">التفاصيل</span>
          {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </div>

        {expanded && (
          <div className="p-3 pt-0 space-y-2">
            <DetailSection
              icon={<DollarSign className="h-4 w-4 text-green-600" />}
              title="الحوالات الواردة"
              count={funds.length}
              total={funds.reduce((s, f) => s + num(f.amount), 0)}
              pid={summary.project_id}
            >
              <table className="w-full text-sm border-collapse" data-testid={`funds-table-${summary.project_id}`}>
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-right p-2 text-xs font-medium">المرسل</th>
                    <th className="text-center p-2 text-xs font-medium">المبلغ</th>
                    <th className="text-center p-2 text-xs font-medium">رقم الحوالة</th>
                  </tr>
                </thead>
                <tbody>
                  {funds.map((f, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="text-right p-2 text-sm">{f.sender_name}</td>
                      <td className="text-center p-2 font-bold text-green-600 text-sm">{formatCurrency(num(f.amount))}</td>
                      <td className="text-center p-2 text-xs text-muted-foreground">{f.transfer_number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DetailSection>

            <DetailSection
              icon={<Users className="h-4 w-4 text-blue-600" />}
              title="أجور العمال"
              count={workers.length}
              total={workers.reduce((s, w) => s + num(w.paid_amount), 0)}
              pid={summary.project_id}
            >
              <table className="w-full text-sm border-collapse" data-testid={`workers-table-${summary.project_id}`}>
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-right p-2 text-xs font-medium">العامل</th>
                    <th className="text-center p-2 text-xs font-medium">الأيام</th>
                    <th className="text-center p-2 text-xs font-medium">اليومية</th>
                    <th className="text-center p-2 text-xs font-medium">المستحق</th>
                    <th className="text-center p-2 text-xs font-medium">المدفوع</th>
                    <th className="text-right p-2 text-xs font-medium">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map((w, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="text-right p-2 font-medium text-sm">{w.worker_name}</td>
                      <td className="text-center p-2 text-sm">{w.work_days}</td>
                      <td className="text-center p-2 text-sm">{formatCurrency(num(w.daily_wage))}</td>
                      <td className="text-center p-2 text-sm">{formatCurrency(num(w.actual_wage))}</td>
                      <td className="text-center p-2 font-bold text-sm">{formatCurrency(num(w.paid_amount))}</td>
                      <td className="text-right p-2 text-xs text-muted-foreground max-w-[100px] truncate">{w.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DetailSection>

            <DetailSection
              icon={<Send className="h-4 w-4 text-orange-600" />}
              title="حوالات العمال"
              count={workerTransfers.length}
              total={workerTransfers.reduce((s, wt) => s + num(wt.amount), 0)}
              pid={summary.project_id}
            >
              <table className="w-full text-sm border-collapse" data-testid={`transfers-table-${summary.project_id}`}>
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-right p-2 text-xs font-medium">العامل</th>
                    <th className="text-center p-2 text-xs font-medium">المبلغ</th>
                    <th className="text-center p-2 text-xs font-medium">رقم الحوالة</th>
                    <th className="text-right p-2 text-xs font-medium">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {workerTransfers.map((wt, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="text-right p-2 font-medium text-sm">{wt.worker_name}</td>
                      <td className="text-center p-2 font-bold text-orange-600 text-sm">{formatCurrency(num(wt.amount))}</td>
                      <td className="text-center p-2 text-xs">{wt.transfer_number}</td>
                      <td className="text-right p-2 text-xs text-muted-foreground">{wt.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DetailSection>

            <DetailSection
              icon={<Car className="h-4 w-4 text-purple-600" />}
              title="المواصلات"
              count={transport.length}
              total={transport.reduce((s, t) => s + num(t.amount), 0)}
              pid={summary.project_id}
            >
              <table className="w-full text-sm border-collapse" data-testid={`transport-table-${summary.project_id}`}>
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-right p-2 text-xs font-medium">الوصف</th>
                    <th className="text-center p-2 text-xs font-medium">المبلغ</th>
                    <th className="text-center p-2 text-xs font-medium">النوع</th>
                  </tr>
                </thead>
                <tbody>
                  {transport.map((t, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="text-right p-2 text-sm">{t.description}</td>
                      <td className="text-center p-2 font-bold text-sm">{formatCurrency(num(t.amount))}</td>
                      <td className="text-center p-2 text-xs">{t.transport_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DetailSection>

            <DetailSection
              icon={<Receipt className="h-4 w-4 text-amber-600" />}
              title="النثريات"
              count={misc.length}
              total={misc.reduce((s, m) => s + num(m.amount), 0)}
              pid={summary.project_id}
            >
              <table className="w-full text-sm border-collapse" data-testid={`misc-table-${summary.project_id}`}>
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-right p-2 text-xs font-medium">الوصف</th>
                    <th className="text-center p-2 text-xs font-medium">المبلغ</th>
                    <th className="text-center p-2 text-xs font-medium">النوع</th>
                  </tr>
                </thead>
                <tbody>
                  {misc.map((m, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="text-right p-2 text-sm">{m.description}</td>
                      <td className="text-center p-2 font-bold text-sm">{formatCurrency(num(m.amount))}</td>
                      <td className="text-center p-2 text-xs">{m.expense_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DetailSection>

            <DetailSection
              icon={<Package className="h-4 w-4 text-teal-600" />}
              title="المشتريات"
              count={purchases.length}
              total={purchases.reduce((s, p) => s + num(p.paid_amount), 0)}
              pid={summary.project_id}
            >
              <table className="w-full text-sm border-collapse" data-testid={`purchases-table-${summary.project_id}`}>
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-right p-2 text-xs font-medium">المورد</th>
                    <th className="text-center p-2 text-xs font-medium">الإجمالي</th>
                    <th className="text-center p-2 text-xs font-medium">المدفوع</th>
                    <th className="text-right p-2 text-xs font-medium">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="text-right p-2 text-sm">{p.supplier_name}</td>
                      <td className="text-center p-2 text-sm">{formatCurrency(num(p.total_amount))}</td>
                      <td className="text-center p-2 font-bold text-sm">{formatCurrency(num(p.paid_amount))}</td>
                      <td className="text-right p-2 text-xs text-muted-foreground">{p.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DetailSection>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailSection({ icon, title, count, total, pid, children }: {
  icon: React.ReactNode;
  title: string;
  count: number;
  total: number;
  pid: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  if (count === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted/30 transition-colors">
        {icon}
        <span className="font-semibold text-sm">{title} ({count})</span>
        <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-bold">{formatCurrency(total)}</Badge>
        {open ? <ChevronUp className="h-3 w-3 mr-auto text-muted-foreground" /> : <ChevronDown className="h-3 w-3 mr-auto text-muted-foreground" />}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="overflow-x-auto rounded-lg border mt-1">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
