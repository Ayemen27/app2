import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { StatsCard } from "@/components/ui/stats-card";
import {
  ChevronLeft, ChevronRight, Calendar, Building2, Users, Car,
  DollarSign, Receipt, Send, Package, Wallet, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, Banknote, CheckCircle2, Circle, Layers
} from "lucide-react";
import { formatCurrency, getCurrentDate } from "@/lib/utils";

interface Summary {
  project_id: string;
  project_name: string;
  total_expenses: string;
  total_fund_transfers: string;
  total_worker_wages: string;
  total_transportation_costs: string;
  total_worker_misc_expenses: string;
  total_worker_transfers: string;
  total_material_costs: string;
  cumulative_funds?: string;
  cumulative_expenses?: string;
  cumulative_balance?: string;
}

interface Worker { project_id: string; project_name: string; worker_name: string; paid_amount: string; work_days: string; daily_wage: string; actual_wage: string; notes: string; }
interface Transport { project_id: string; project_name: string; amount: string; description: string; transport_type: string; }
interface MiscItem { project_id: string; project_name: string; amount: string; description: string; expense_type: string; }
interface Fund { project_id: string; project_name: string; amount: string; sender_name: string; transfer_number: string; }
interface Purchase { project_id: string; project_name: string; total_amount: string; paid_amount: string; supplier_name: string; notes: string; }
interface WorkerTransfer { project_id: string; project_name: string; amount: string; worker_name: string; transfer_number: string; notes: string; }

interface DataFreshness {
  stale: boolean;
  staleProjectIds?: string[];
  warning?: string;
}

interface ApiData {
  summaries: Summary[];
  workers: Worker[];
  transport: Transport[];
  misc: MiscItem[];
  funds: Fund[];
  purchases: Purchase[];
  workerTransfers: WorkerTransfer[];
  dataFreshness?: DataFreshness;
}

const num = (v: string | number | null | undefined) => parseFloat(v as string) || 0;

export default function MultiProjectExpenses() {
  const [selectedDate, setSelectedDate] = useState<string>(getCurrentDate());
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());

  const nextDate = () => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split("T")[0]); };
  const prevDate = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split("T")[0]); };
  const goToToday = () => setSelectedDate(getCurrentDate());

  const { data, isLoading } = useQuery<{ data: ApiData }>({
    queryKey: ["/api/multi-project-expenses", selectedDate],
    queryFn: async () => { const r = await fetch(`/api/multi-project-expenses?date=${selectedDate}`, { credentials: 'include' }); if (!r.ok) throw new Error("fail"); return r.json(); },
  });

  const apiData = data?.data;
  const hasSelection = selectedProjectIds.size > 0;

  const allProjects = useMemo(() => {
    const all = apiData?.summaries || [];
    const map = new Map<string, string>();
    for (const s of all) map.set(s.project_id, s.project_name);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [apiData]);

  const summaries = useMemo(() => {
    const all = apiData?.summaries || [];
    if (!hasSelection) return [];
    return all.filter(s => selectedProjectIds.has(s.project_id));
  }, [apiData, selectedProjectIds, hasSelection]);

  const toggleProject = (id: string) => {
    setSelectedProjectIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const totalFunds = summaries.reduce((s, r) => s + num(r.total_fund_transfers), 0);
  const totalExpenses = summaries.reduce((s, r) => s + num(r.total_expenses), 0);
  const cumFunds = summaries.reduce((s, r) => s + num(r.cumulative_funds), 0);
  const cumExpenses = summaries.reduce((s, r) => s + num(r.cumulative_expenses), 0);
  const cumBalance = cumFunds - cumExpenses;
  const carriedForward = cumBalance - totalFunds + totalExpenses;

  const fil = (items: any[]) => hasSelection ? items.filter((i: any) => selectedProjectIds.has(i.project_id)) : [];
  const workers = fil(apiData?.workers || []) as Worker[];
  const transport = fil(apiData?.transport || []) as Transport[];
  const misc = fil(apiData?.misc || []) as MiscItem[];
  const funds = fil(apiData?.funds || []) as Fund[];
  const purchases = fil(apiData?.purchases || []) as Purchase[];
  const workerTransfers = fil(apiData?.workerTransfers || []) as WorkerTransfer[];

  const selectedNames = summaries.map(s => s.project_name).join(" + ");

  return (
    <div className="min-h-screen bg-background p-3 md:p-6" dir="rtl" data-testid="multi-project-expenses-page">
      <div className="max-w-4xl mx-auto space-y-3">

        <div className="bg-card rounded-2xl border-2 shadow-sm p-4">
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

        <div className="bg-card rounded-2xl border-2 shadow-sm p-3">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-muted-foreground">اختر المشاريع للدمج</span>
            {hasSelection && (
              <Badge variant="default" className="text-[10px] h-5 px-1.5">{selectedProjectIds.size} مختار</Badge>
            )}
            {hasSelection && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 mr-auto" onClick={() => setSelectedProjectIds(new Set())} data-testid="btn-clear-selection">إلغاء</Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allProjects.map((p: { id: string; name: string }) => {
              const isSel = selectedProjectIds.has(p.id);
              const s = (apiData?.summaries || []).find((s: Summary) => s.project_id === p.id);
              const hasData = s ? (num(s.total_expenses) > 0 || num(s.total_fund_transfers) > 0) : false;
              return (
                <Button key={p.id} variant={isSel ? "default" : "outline"} size="sm"
                  className={`h-8 text-xs gap-1.5 rounded-full transition-all ${isSel ? "shadow-md" : hasData ? "border-primary/30" : "opacity-40"}`}
                  onClick={() => toggleProject(p.id)} data-testid={`filter-project-${p.id}`}
                >
                  {isSel ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                  {p.name}
                  {hasData && !isSel && <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />}
                </Button>
              );
            })}
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20" data-testid="loading-state">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="mr-3 text-muted-foreground">جاري التحميل...</span>
          </div>
        )}

        {!isLoading && !hasSelection && (
          <div className="text-center py-16 bg-card rounded-2xl border-2 shadow-sm" data-testid="empty-state">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-base text-muted-foreground font-medium">اختر مشروع أو أكثر من القائمة أعلاه</p>
            <p className="text-xs text-muted-foreground/60 mt-1">سيتم دمج بيانات المشاريع المختارة في عرض موحد</p>
          </div>
        )}

        {!isLoading && hasSelection && (
          <>
            {apiData?.dataFreshness?.stale && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700 rounded-2xl p-3 flex items-center gap-2" data-testid="stale-data-warning">
                <Wallet className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  ⚠️ بعض البيانات قد تكون غير محدثة - يرجى تحديث الصفحة أو المحاولة لاحقاً
                </span>
              </div>
            )}
            <div className="bg-card rounded-2xl border-2 border-primary/20 shadow-sm p-4 space-y-3" data-testid="global-summary-card">
              <div className="grid grid-cols-2 gap-2">
                <StatsCard title="المرحّل من سابق" value={formatCurrency(carriedForward)} icon={Wallet} color={carriedForward >= 0 ? "amber" : "red"} data-testid="carried-forward" />
                <StatsCard title="حوالات اليوم" value={formatCurrency(totalFunds)} icon={TrendingUp} color="green" data-testid="today-funds" />
                <StatsCard title="مصروف اليوم" value={formatCurrency(totalExpenses)} icon={TrendingDown} color="red" data-testid="today-expenses" />
                <StatsCard title="الرصيد التراكمي" value={formatCurrency(cumBalance)} icon={DollarSign} color={cumBalance >= 0 ? "blue" : "red"} data-testid="cumulative-balance" />
              </div>
              {selectedNames && (
                <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground pt-1 border-t">
                  <Building2 className="h-3 w-3" />
                  <span>{selectedNames}</span>
                </div>
              )}
            </div>

            <DetailSection icon={<DollarSign className="h-4 w-4 text-green-600" />} title="الحوالات الواردة" count={funds.length} total={funds.reduce((s, f) => s + num(f.amount), 0)}>
              <table className="w-full text-sm border-collapse" data-testid="funds-table">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-right p-2 text-xs font-medium">المرسل</th>
                  <th className="text-center p-2 text-xs font-medium">المبلغ</th>
                  <th className="text-center p-2 text-xs font-medium">رقم الحوالة</th>
                  <th className="text-right p-2 text-xs font-medium">المشروع</th>
                </tr></thead>
                <tbody>{funds.map((f, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="text-right p-2">{f.sender_name}</td>
                    <td className="text-center p-2 font-bold text-green-600">{formatCurrency(num(f.amount))}</td>
                    <td className="text-center p-2 text-xs text-muted-foreground">{f.transfer_number}</td>
                    <td className="text-right p-2 text-xs text-muted-foreground">{f.project_name}</td>
                  </tr>
                ))}</tbody>
              </table>
            </DetailSection>

            <DetailSection icon={<Users className="h-4 w-4 text-blue-600" />} title="أجور العمال" count={workers.length} total={workers.reduce((s, w) => s + num(w.paid_amount), 0)}>
              <table className="w-full text-sm border-collapse" data-testid="workers-table">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-right p-2 text-xs font-medium">العامل</th>
                  <th className="text-center p-2 text-xs font-medium">الأيام</th>
                  <th className="text-center p-2 text-xs font-medium">اليومية</th>
                  <th className="text-center p-2 text-xs font-medium">المستحق</th>
                  <th className="text-center p-2 text-xs font-medium">المدفوع</th>
                  <th className="text-right p-2 text-xs font-medium">المشروع</th>
                </tr></thead>
                <tbody>{workers.map((w, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="text-right p-2 font-medium">{w.worker_name}</td>
                    <td className="text-center p-2">{w.work_days}</td>
                    <td className="text-center p-2">{formatCurrency(num(w.daily_wage))}</td>
                    <td className="text-center p-2">{formatCurrency(num(w.actual_wage))}</td>
                    <td className="text-center p-2 font-bold">{formatCurrency(num(w.paid_amount))}</td>
                    <td className="text-right p-2 text-xs text-muted-foreground">{w.project_name}</td>
                  </tr>
                ))}</tbody>
              </table>
            </DetailSection>

            <DetailSection icon={<Send className="h-4 w-4 text-orange-600" />} title="حوالات العمال" count={workerTransfers.length} total={workerTransfers.reduce((s, wt) => s + num(wt.amount), 0)}>
              <table className="w-full text-sm border-collapse" data-testid="worker-transfers-table">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-right p-2 text-xs font-medium">العامل</th>
                  <th className="text-center p-2 text-xs font-medium">المبلغ</th>
                  <th className="text-center p-2 text-xs font-medium">رقم الحوالة</th>
                  <th className="text-right p-2 text-xs font-medium">المشروع</th>
                </tr></thead>
                <tbody>{workerTransfers.map((wt, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="text-right p-2 font-medium">{wt.worker_name}</td>
                    <td className="text-center p-2 font-bold text-orange-600">{formatCurrency(num(wt.amount))}</td>
                    <td className="text-center p-2 text-xs">{wt.transfer_number}</td>
                    <td className="text-right p-2 text-xs text-muted-foreground">{wt.project_name}</td>
                  </tr>
                ))}</tbody>
              </table>
            </DetailSection>

            <DetailSection icon={<Car className="h-4 w-4 text-purple-600" />} title="المواصلات" count={transport.length} total={transport.reduce((s, t) => s + num(t.amount), 0)}>
              <table className="w-full text-sm border-collapse" data-testid="transport-table">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-right p-2 text-xs font-medium">الوصف</th>
                  <th className="text-center p-2 text-xs font-medium">المبلغ</th>
                  <th className="text-center p-2 text-xs font-medium">النوع</th>
                  <th className="text-right p-2 text-xs font-medium">المشروع</th>
                </tr></thead>
                <tbody>{transport.map((t, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="text-right p-2">{t.description}</td>
                    <td className="text-center p-2 font-bold">{formatCurrency(num(t.amount))}</td>
                    <td className="text-center p-2 text-xs">{t.transport_type}</td>
                    <td className="text-right p-2 text-xs text-muted-foreground">{t.project_name}</td>
                  </tr>
                ))}</tbody>
              </table>
            </DetailSection>

            <DetailSection icon={<Receipt className="h-4 w-4 text-amber-600" />} title="النثريات" count={misc.length} total={misc.reduce((s, m) => s + num(m.amount), 0)}>
              <table className="w-full text-sm border-collapse" data-testid="misc-table">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-right p-2 text-xs font-medium">الوصف</th>
                  <th className="text-center p-2 text-xs font-medium">المبلغ</th>
                  <th className="text-right p-2 text-xs font-medium">المشروع</th>
                </tr></thead>
                <tbody>{misc.map((m, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="text-right p-2">{m.description}</td>
                    <td className="text-center p-2 font-bold">{formatCurrency(num(m.amount))}</td>
                    <td className="text-right p-2 text-xs text-muted-foreground">{m.project_name}</td>
                  </tr>
                ))}</tbody>
              </table>
            </DetailSection>

            <DetailSection icon={<Package className="h-4 w-4 text-teal-600" />} title="المشتريات" count={purchases.length} total={purchases.reduce((s, p) => s + num(p.paid_amount), 0)}>
              <table className="w-full text-sm border-collapse" data-testid="purchases-table">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-right p-2 text-xs font-medium">المورد</th>
                  <th className="text-center p-2 text-xs font-medium">الإجمالي</th>
                  <th className="text-center p-2 text-xs font-medium">المدفوع</th>
                  <th className="text-right p-2 text-xs font-medium">المشروع</th>
                </tr></thead>
                <tbody>{purchases.map((p, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="text-right p-2">{p.supplier_name}</td>
                    <td className="text-center p-2">{formatCurrency(num(p.total_amount))}</td>
                    <td className="text-center p-2 font-bold">{formatCurrency(num(p.paid_amount))}</td>
                    <td className="text-right p-2 text-xs text-muted-foreground">{p.project_name}</td>
                  </tr>
                ))}</tbody>
              </table>
            </DetailSection>
          </>
        )}
      </div>
    </div>
  );
}

function DetailSection({ icon, title, count, total, children }: {
  icon: React.ReactNode; title: string; count: number; total: number; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  if (count === 0) return null;
  return (
    <div className="bg-card rounded-2xl border-2 shadow-sm overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 hover:bg-muted/30 transition-colors">
          {icon}
          <span className="font-bold text-sm">{title} ({count})</span>
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-bold">{formatCurrency(total)}</Badge>
          {open ? <ChevronUp className="h-3 w-3 mr-auto text-muted-foreground" /> : <ChevronDown className="h-3 w-3 mr-auto text-muted-foreground" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="overflow-x-auto border-t">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
