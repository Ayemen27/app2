import { useState, useMemo, useCallback, useEffect } from "react";
import SelectedProjectBadge from "@/components/selected-project-badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig } from "@/components/ui/unified-filter-dashboard/types";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { useSelectedProject, ALL_PROJECTS_ID } from "@/hooks/use-selected-project";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Scale,
  Users,
  ArrowLeftRight,
  DollarSign,
  Loader2,
  Play,
  AlertTriangle,
  Plus,
  X,
  Building,
  User,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Calendar,
  History,
  FileText,
  Trash2,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  status: string;
}

interface WorkerProjectBalance {
  projectId: string;
  projectName: string;
  earned: number;
  paid: number;
  transferred: number;
  balance: number;
  isSettlementProject?: boolean;
}

interface WorkerPreview {
  workerId: string;
  workerName: string;
  projects: WorkerProjectBalance[];
  totalBalance: number;
}

interface FundTransferPreview {
  fromProjectId: string;
  fromProjectName: string;
  toProjectId: string;
  amount: number;
}

interface SettlementPreview {
  workers: WorkerPreview[];
  fundTransfers: FundTransferPreview[];
  totalSettlementAmount: number;
  warnings: string[];
}

interface SettlementRecord {
  id: string;
  settlement_project_id: string;
  settlement_project_name: string;
  worker_count: number;
  total_amount: number;
  status: string;
  created_at: string;
  lines?: SettlementLine[];
}

interface SettlementLine {
  worker_id: string;
  worker_name: string;
  from_project_id: string;
  from_project_name: string;
  to_project_id: string;
  to_project_name: string;
  amount: number;
}

function formatCurrency(amount: number | string) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0 ر.ي";
  return `${Math.round(num).toLocaleString("en-US")} ر.ي`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function WorkerSettlementsPage() {
  const { toast } = useToast();
  const { selectedProjectId } = useSelectedProject();
  const { setFloatingAction } = useFloatingButton();
  const [activeView, setActiveView] = useState<"new" | "history">("new");
  const [searchValue, setSearchValue] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [historyDate, setHistoryDate] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const nextHistoryDate = useCallback(() => {
    const [y, m, d] = historyDate.split('-').map(Number);
    const date = new Date(y, m - 1, d + 1);
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, '0');
    const nd = String(date.getDate()).padStart(2, '0');
    setHistoryDate(`${ny}-${nm}-${nd}`);
    setHistoryPage(1);
  }, [historyDate]);

  const prevHistoryDate = useCallback(() => {
    const [y, m, d] = historyDate.split('-').map(Number);
    const date = new Date(y, m - 1, d - 1);
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, '0');
    const nd = String(date.getDate()).padStart(2, '0');
    setHistoryDate(`${ny}-${nm}-${nd}`);
    setHistoryPage(1);
  }, [historyDate]);

  const settlementProjectId = selectedProjectId && selectedProjectId !== ALL_PROJECTS_ID ? selectedProjectId : "";
  const [preview, setPreview] = useState<SettlementPreview | null>(null);
  const [selectedWorkers, setSelectedWorkers] = useState<Set<string>>(new Set());
  const [excludedProjects, setExcludedProjects] = useState<Map<string, Set<string>>>(new Map());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [expandedSettlement, setExpandedSettlement] = useState<string | null>(null);
  const [deleteSettlementId, setDeleteSettlementId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [historyPage, setHistoryPage] = useState(1);

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: QUERY_KEYS.projects,
    queryFn: async () => {
      const res = await apiRequest("/api/projects", "GET");
      if (res?.data && Array.isArray(res.data)) return res.data;
      if (Array.isArray(res)) return res;
      return [];
    },
  });

  const previewMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const res = await apiRequest(
        `/api/worker-settlements/preview?settlement_project_id=${projectId}&worker_ids=all`,
        "GET"
      );
      return (res?.data || res) as SettlementPreview;
    },
    onSuccess: (data) => {
      setPreview(data);
      setExcludedProjects(new Map());
      if (data?.workers) {
        const uniqueWorkers = new Set(data.workers.map((w: WorkerPreview) => w.workerId));
        setSelectedWorkers(uniqueWorkers);
      }
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error?.message || "فشل في تحميل معاينة التصفية",
        variant: "destructive",
      });
    },
  });

  const executeMutation = useMutation({
    mutationFn: async () => {
      const workerExclusions: Record<string, string[]> = {};
      excludedProjects.forEach((projectIds, workerId) => {
        if (projectIds.size > 0 && selectedWorkers.has(workerId)) {
          workerExclusions[workerId] = Array.from(projectIds);
        }
      });
      const idempotencyKey = `settle-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      return apiRequest("/api/worker-settlements/execute", "POST", {
        settlement_project_id: settlementProjectId,
        worker_ids: Array.from(selectedWorkers),
        excluded_projects: workerExclusions,
        settlement_date: historyDate,
      }, 0, { 'x-idempotency-key': idempotencyKey });
    },
    onSuccess: () => {
      toast({
        title: "تم بنجاح",
        description: "تمت تصفية حسابات العمال بنجاح",
        className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-100",
      });
      setPreview(null);
      setSelectedWorkers(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/worker-settlements"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workers });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      setActiveView("history");
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في التصفية",
        description: error?.message || "فشل في تنفيذ التصفية",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (settlementId: string) => {
      return apiRequest(`/api/worker-settlements/${settlementId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "تم الحذف",
        description: "تم حذف التصفية وعكس جميع التحويلات المرتبطة بها",
        className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-100",
      });
      setShowDeleteDialog(false);
      setDeleteSettlementId(null);
      setExpandedSettlement(null);
      queryClient.invalidateQueries({ queryKey: ["/api/worker-settlements"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workers });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في الحذف",
        description: error?.message || "فشل في حذف التصفية",
        variant: "destructive",
      });
    },
  });

  const { data: settlementsData, isLoading: settlementsLoading } = useQuery<SettlementRecord[]>({
    queryKey: ["/api/worker-settlements", historyPage, historyDate],
    queryFn: async () => {
      const res = await apiRequest(
        `/api/worker-settlements?page=${historyPage}&limit=20&date=${historyDate}`,
        "GET"
      );
      const raw = res?.data || res;
      if (raw?.settlements && Array.isArray(raw.settlements)) return raw.settlements;
      if (Array.isArray(raw)) return raw;
      return [];
    },
    enabled: activeView === "history",
  });

  const settlements = settlementsData || [];

  const { data: detailData, isLoading: detailLoading } = useQuery<{ settlement: SettlementRecord; lines: SettlementLine[] }>({
    queryKey: ["/api/worker-settlements", expandedSettlement],
    queryFn: async () => {
      const res = await apiRequest(`/api/worker-settlements/${expandedSettlement}`, "GET");
      const raw = res?.data || res;
      return raw as { settlement: SettlementRecord; lines: SettlementLine[] };
    },
    enabled: !!expandedSettlement,
  });

  const filteredWorkers = useMemo(() => {
    if (!preview?.workers) return [];
    if (!searchValue.trim()) return preview.workers;
    return preview.workers.filter((w) =>
      w.workerName.toLowerCase().includes(searchValue.toLowerCase()) ||
      w.projects.some((p) => p.projectName.toLowerCase().includes(searchValue.toLowerCase()))
    );
  }, [preview, searchValue]);

  const isProjectExcluded = useCallback((workerId: string, projectId: string) => {
    return excludedProjects.get(workerId)?.has(projectId) || false;
  }, [excludedProjects]);

  const toggleProjectForWorker = useCallback((workerId: string, projectId: string) => {
    setExcludedProjects(prev => {
      const newMap = new Map(prev);
      const workerExcluded = new Set(newMap.get(workerId) || []);
      if (workerExcluded.has(projectId)) {
        workerExcluded.delete(projectId);
      } else {
        workerExcluded.add(projectId);
      }
      newMap.set(workerId, workerExcluded);
      return newMap;
    });
  }, []);

  const getActiveProjects = useCallback((worker: WorkerPreview) => {
    const workerExcluded = excludedProjects.get(worker.workerId);
    return worker.projects.filter(p =>
      p.balance > 0 && !(workerExcluded?.has(p.projectId))
    );
  }, [excludedProjects]);

  const selectedSummary = useMemo(() => {
    if (!preview?.workers) return { amount: 0, count: 0 };
    const selected = preview.workers.filter((w) => selectedWorkers.has(w.workerId));
    let count = 0;
    const amount = selected.reduce((sum, w) => {
      const activeProjects = getActiveProjects(w);
      if (activeProjects.length > 0) count++;
      return sum + activeProjects.reduce((s, p) => s + p.balance, 0);
    }, 0);
    return { amount, count };
  }, [preview, selectedWorkers, excludedProjects, getActiveProjects]);

  const settlementProjectName = useMemo(() => {
    return projects.find(p => p.id === settlementProjectId)?.name || "مشروع التصفية";
  }, [projects, settlementProjectId]);

  const selectedFundTransfers = useMemo(() => {
    if (!preview?.workers) return [];
    const selected = preview.workers.filter((w) => selectedWorkers.has(w.workerId));
    const totals = new Map<string, { fromProjectId: string; fromProjectName: string; toProjectId: string; toProjectName: string; amount: number }>();
    for (const w of selected) {
      const active = getActiveProjects(w);
      for (const p of active) {
        if (p.isSettlementProject) continue;
        const existing = totals.get(p.projectId);
        if (existing) {
          existing.amount += p.balance;
        } else {
          totals.set(p.projectId, {
            fromProjectId: settlementProjectId,
            fromProjectName: settlementProjectName,
            toProjectId: p.projectId,
            toProjectName: p.projectName,
            amount: p.balance,
          });
        }
      }
    }
    return Array.from(totals.values());
  }, [preview, selectedWorkers, excludedProjects, getActiveProjects, settlementProjectId, settlementProjectName]);

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => {
    if (activeView === "new") {
      return [
        {
          columns: 3,
          gap: "sm",
          items: [
            {
              key: "totalAmount",
              label: "إجمالي التصفية",
              value: formatCurrency(preview?.totalSettlementAmount || 0),
              icon: DollarSign,
              color: "green",
            },
            {
              key: "workerCount",
              label: "عدد العمال",
              value: preview?.workers?.length || 0,
              icon: Users,
              color: "blue",
            },
            {
              key: "transferCount",
              label: "عدد التحويلات",
              value: selectedFundTransfers.length,
              icon: ArrowLeftRight,
              color: "purple",
            },
          ],
        },
      ];
    }
    if (activeView === "history") {
      return [
        {
          columns: 3,
          gap: "sm",
          items: [
            {
              key: "totalSettlements",
              label: "عدد التصفيات",
              value: settlements.length,
              icon: Scale,
              color: "blue",
            },
            {
              key: "totalSettled",
              label: "إجمالي المبالغ",
              value: formatCurrency(settlements.reduce((s, r) => s + (parseFloat(String(r.total_amount)) || 0), 0)),
              icon: DollarSign,
              color: "green",
            },
            {
              key: "totalWorkers",
              label: "إجمالي العمال",
              value: settlements.reduce((s, r) => s + (r.worker_count || 0), 0),
              icon: Users,
              color: "purple",
            },
          ],
        },
      ];
    }
    return [];
  }, [activeView, preview, settlements]);

  const handleResetFilters = useCallback(() => {
    setFilterValues({ view: "new" });
    setActiveView("new");
    setSearchValue("");
  }, []);

  useEffect(() => {
    if (settlementProjectId && activeView === "new") {
      setPreview(null);
      setSelectedWorkers(new Set());
      setExcludedProjects(new Map());
      previewMutation.mutate(settlementProjectId);
    } else if (!settlementProjectId) {
      setPreview(null);
      setSelectedWorkers(new Set());
    }
  }, [settlementProjectId]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (activeView === "history") {
        await queryClient.invalidateQueries({ queryKey: ["/api/worker-settlements"] });
      }
      if (settlementProjectId && activeView === "new") {
        previewMutation.mutate(settlementProjectId);
      }
      toast({ title: "تم التحديث", description: "تم تحديث البيانات بنجاح" });
    } finally {
      setIsRefreshing(false);
    }
  }, [activeView, settlementProjectId]);

  const toggleWorker = useCallback((workerId: string) => {
    setSelectedWorkers((prev) => {
      const next = new Set(prev);
      if (next.has(workerId)) next.delete(workerId);
      else next.add(workerId);
      return next;
    });
  }, []);

  const toggleAllWorkers = useCallback(() => {
    if (!preview?.workers) return;
    const allWorkerIds = new Set(preview.workers.map((w) => w.workerId));
    if (selectedWorkers.size === allWorkerIds.size) {
      setSelectedWorkers(new Set());
    } else {
      setSelectedWorkers(allWorkerIds);
    }
  }, [preview, selectedWorkers]);

  const handleNewSettlement = useCallback(() => {
    setActiveView("new");
    setPreview(null);
    setSelectedWorkers(new Set());
    if (settlementProjectId) {
      previewMutation.mutate(settlementProjectId);
    }
  }, [settlementProjectId]);

  useEffect(() => {
    setFloatingAction(handleNewSettlement, "تصفية جديدة");
    return () => setFloatingAction(null);
  }, [setFloatingAction, handleNewSettlement]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 no-default-hover-elevate no-default-active-elevate">
            مكتملة
          </Badge>
        );
      case "reversed":
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 no-default-hover-elevate no-default-active-elevate">
            ملغاة
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-4" dir="rtl">
      <SelectedProjectBadge />
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "new" | "history")} className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-11 mb-4">
          <TabsTrigger value="new" className="gap-1.5 text-sm" data-testid="tab-new-settlement">
            <FileText className="h-4 w-4" />
            تصفية جديدة
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-sm" data-testid="tab-settlement-history">
            <History className="h-4 w-4" />
            سجل التصفيات
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mx-auto w-full max-w-md" data-testid="date-navigator">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={prevHistoryDate}
          title="اليوم السابق"
          data-testid="button-prev-date"
        >
          <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </Button>
        
        <div className="flex flex-col items-center flex-1">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            {activeView === "new" ? "تصفية حساب العمال" : "سجل التصفيات"}
          </span>
          <span className="text-sm font-black text-slate-900 dark:text-white arabic-numbers flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            {(() => { const [y,m,d] = historyDate.split('-').map(Number); return format(new Date(y, m-1, d), "EEEE, d MMMM yyyy", { locale: ar }); })()}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={nextHistoryDate}
          title="اليوم التالي"
          data-testid="button-next-date"
        >
          <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </Button>
      </div>

      <UnifiedFilterDashboard
        hideHeader={true}
        title=""
        subtitle=""
        statsRows={statsRowsConfig}
        filters={[]}
        filterValues={filterValues}
        onFilterChange={() => {}}
        onSearchChange={setSearchValue}
        searchValue={searchValue}
        searchPlaceholder="ابحث عن عامل أو مشروع..."
        showSearch={true}
        onReset={handleResetFilters}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {activeView === "new" && (
        <div className="space-y-4">
          {!settlementProjectId && (
            <Card>
              <CardContent className="text-center py-12">
                <Scale className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">اختر مشروع التصفية من الشريط العلوي للبدء</p>
              </CardContent>
            </Card>
          )}

          {settlementProjectId && previewMutation.isPending && (
            <Card>
              <CardContent className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">جاري تحميل معاينة التصفية...</p>
              </CardContent>
            </Card>
          )}

          {preview && !previewMutation.isPending && (
            <>
              {preview.warnings && preview.warnings.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
                  <span className="text-xs text-yellow-700 dark:text-yellow-300">
                    {preview.warnings.length} عامل لديهم أرصدة سالبة (لن يتم تصفيتها)
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={
                      filteredWorkers.length > 0 &&
                      selectedWorkers.size === new Set(preview.workers.map((w) => w.workerId)).size
                    }
                    onCheckedChange={toggleAllWorkers}
                    data-testid="checkbox-select-all-workers"
                  />
                  <span className="text-sm font-medium">تحديد الكل ({preview.workers.length} عامل)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                    المحدد: {selectedSummary.count} عمال
                  </Badge>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 no-default-hover-elevate no-default-active-elevate">
                    {formatCurrency(selectedSummary.amount)}
                  </Badge>
                </div>
              </div>

              <UnifiedCardGrid columns={2}>
                {filteredWorkers.map((worker) => {
                  const isSelected = selectedWorkers.has(worker.workerId);
                  const totalEarned = worker.projects.reduce((s, p) => s + p.earned, 0);
                  const totalPaidTransferred = worker.projects.reduce((s, p) => s + p.paid + p.transferred, 0);

                  return (
                    <div key={worker.workerId} className="relative">
                      <div
                        className="absolute top-3 right-3 z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleWorker(worker.workerId)}
                          data-testid={`checkbox-worker-${worker.workerId}`}
                        />
                      </div>
                      <UnifiedCard
                        title={worker.workerName}
                        subtitle={`${worker.projects.length} ${worker.projects.length === 1 ? "مشروع" : "مشاريع"}`}
                        titleIcon={User}
                        headerColor={isSelected ? "#3b82f6" : "#94a3b8"}
                        badges={[
                          {
                            label: worker.totalBalance >= 0 ? "رصيد موجب" : "رصيد سالب",
                            variant: worker.totalBalance >= 0 ? "success" : "destructive",
                          },
                        ]}
                        fields={[]}
                        footer={
                          <div className="space-y-2">
                            <div className="space-y-1">
                              {worker.projects.map((p) => {
                                const excluded = isProjectExcluded(worker.workerId, p.projectId);
                                const canToggle = p.balance > 0;
                                return (
                                  <div
                                    key={p.projectId}
                                    className={`flex items-center justify-between gap-1 py-1.5 px-2 rounded-md transition-all ${
                                      excluded
                                        ? "bg-gray-100 dark:bg-gray-800 opacity-50"
                                        : p.isSettlementProject
                                        ? "bg-gray-50 dark:bg-gray-800/50"
                                        : "bg-white dark:bg-gray-900/30"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      {canToggle && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleProjectForWorker(worker.workerId, p.projectId);
                                          }}
                                          className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                                            excluded
                                              ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                                              : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                          }`}
                                          data-testid={`toggle-project-${worker.workerId}-${p.projectId}`}
                                        >
                                          {excluded ? (
                                            <Plus className="h-3 w-3" />
                                          ) : (
                                            <X className="h-3 w-3" />
                                          )}
                                        </button>
                                      )}
                                      <Building className="h-3 w-3 text-muted-foreground shrink-0" />
                                      <span className={`text-[11px] truncate ${excluded ? "line-through text-muted-foreground" : ""}`}>
                                        {p.isSettlementProject ? `${p.projectName} ⭐` : p.projectName}
                                      </span>
                                    </div>
                                    <span
                                      className={`text-[11px] font-bold shrink-0 ${
                                        excluded
                                          ? "text-muted-foreground line-through"
                                          : p.isSettlementProject
                                          ? "text-muted-foreground"
                                          : p.balance > 0
                                          ? "text-green-600 dark:text-green-400"
                                          : p.balance < 0
                                          ? "text-red-600 dark:text-red-400"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      {formatCurrency(p.balance)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">المستحقات</p>
                                <p className="text-xs font-bold text-green-600 dark:text-green-400">
                                  {formatCurrency(totalEarned)}
                                </p>
                              </div>
                              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2 text-center">
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">المدفوع</p>
                                <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400">
                                  {formatCurrency(totalPaidTransferred)}
                                </p>
                              </div>
                              <div
                                className={`${worker.totalBalance >= 0 ? "bg-blue-50 dark:bg-blue-900/20" : "bg-red-50 dark:bg-red-900/20"} rounded-lg p-2 text-center`}
                              >
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">المتبقي</p>
                                <p
                                  className={`text-xs font-bold ${worker.totalBalance >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}
                                >
                                  {formatCurrency(worker.totalBalance)}
                                </p>
                              </div>
                            </div>
                          </div>
                        }
                        data-testid={`card-worker-settlement-${worker.workerId}`}
                      />
                    </div>
                  );
                })}
              </UnifiedCardGrid>

              {filteredWorkers.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <p className="text-muted-foreground">لا توجد أرصدة للتصفية</p>
                  </CardContent>
                </Card>
              )}

              {selectedFundTransfers.length > 0 && (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <ArrowLeftRight className="h-4 w-4" />
                      تحويلات الصناديق بين المشاريع
                    </div>
                    <div className="space-y-2">
                      {selectedFundTransfers.map((ft, i) => {
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/30 border"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                              <Badge variant="outline" className="shrink-0 no-default-hover-elevate no-default-active-elevate">
                                {ft.fromProjectName}
                              </Badge>
                              <ArrowLeftRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              <Badge variant="outline" className="shrink-0 no-default-hover-elevate no-default-active-elevate">
                                {ft.toProjectName || "مشروع العمل"}
                              </Badge>
                            </div>
                            <span className="font-bold text-sm text-primary shrink-0">
                              {formatCurrency(ft.amount)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center justify-between flex-wrap gap-3 p-3 rounded-lg bg-muted/30 border">
                <p className="text-sm text-muted-foreground">
                  تم اختيار{" "}
                  <span className="font-bold text-foreground">{selectedSummary.count}</span> عمال بإجمالي{" "}
                  <span className="font-bold text-foreground">{formatCurrency(selectedSummary.amount)}</span>
                </p>
                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={selectedWorkers.size === 0 || executeMutation.isPending}
                  data-testid="button-execute-settlement"
                >
                  {executeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <Play className="h-4 w-4 ml-2" />
                  )}
                  تنفيذ التصفية
                </Button>
              </div>

              <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>تأكيد التصفية</AlertDialogTitle>
                    <AlertDialogDescription>
                      هل أنت متأكد من تصفية حساب {selectedSummary.count} عمال بإجمالي{" "}
                      {formatCurrency(selectedSummary.amount)}؟
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex gap-2 flex-row-reverse">
                    <AlertDialogAction
                      onClick={() => executeMutation.mutate()}
                      disabled={executeMutation.isPending}
                      data-testid="button-confirm-settlement"
                    >
                      {executeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                      تأكيد
                    </AlertDialogAction>
                    <AlertDialogCancel data-testid="button-cancel-settlement">إلغاء</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      )}

      {activeView === "history" && (
        <div className="space-y-4">
          {settlementsLoading ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">جاري تحميل سجل التصفيات...</p>
              </CardContent>
            </Card>
          ) : settlements.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-foreground mb-2">لا توجد تصفيات سابقة</h3>
                <p className="text-muted-foreground mb-4">لم يتم إجراء أي تصفيات بعد</p>
                <Button
                  onClick={handleNewSettlement}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-start-new-settlement"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  تصفية جديدة
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <UnifiedCardGrid columns={2}>
                {settlements.map((s) => (
                  <div key={s.id}>
                    <UnifiedCard
                      title={s.settlement_project_name || "مشروع غير معروف"}
                      subtitle={formatDate(s.created_at)}
                      titleIcon={Building}
                      headerColor={s.status === "completed" ? "#22c55e" : s.status === "reversed" ? "#ef4444" : "#94a3b8"}
                      badges={[
                        {
                          label: s.status === "completed" ? "مكتملة" : s.status === "reversed" ? "ملغاة" : s.status,
                          variant: s.status === "completed" ? "success" : s.status === "reversed" ? "destructive" : "secondary",
                        },
                      ]}
                      fields={[
                        {
                          label: "عدد العمال",
                          value: `${s.worker_count} عامل`,
                          icon: Users,
                          color: "info",
                        },
                        {
                          label: "إجمالي المبلغ",
                          value: formatCurrency(s.total_amount),
                          icon: DollarSign,
                          emphasis: true,
                          color: "success",
                        },
                      ]}
                      actions={[
                        {
                          icon: expandedSettlement === s.id ? ChevronUp : ChevronDown,
                          label: expandedSettlement === s.id ? "إخفاء التفاصيل" : "عرض التفاصيل",
                          onClick: () => setExpandedSettlement((prev) => (prev === s.id ? null : s.id)),
                          color: "blue",
                        },
                        {
                          icon: Trash2,
                          label: "حذف التصفية",
                          onClick: () => {
                            setDeleteSettlementId(s.id);
                            setShowDeleteDialog(true);
                          },
                          color: "red",
                        },
                      ]}
                      footer={
                        expandedSettlement === s.id ? (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">تفاصيل التصفية:</p>
                            {detailLoading ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              </div>
                            ) : detailData?.lines && detailData.lines.length > 0 ? (
                              <div className="space-y-1">
                                {detailData.lines.map((line: SettlementLine, i: number) => (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between p-2 rounded bg-muted/40 text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      <User className="h-3 w-3 text-muted-foreground" />
                                      <span className="font-medium">{line.worker_name}</span>
                                      <span className="text-muted-foreground">• {line.from_project_name}</span>
                                    </div>
                                    <span className="font-bold text-primary">{formatCurrency(line.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground text-center py-2">لا توجد تفاصيل</p>
                            )}
                          </div>
                        ) : undefined
                      }
                      data-testid={`card-settlement-${s.id}`}
                    />
                  </div>
                ))}
              </UnifiedCardGrid>

              {settlements.length > 0 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={historyPage <= 1}
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    data-testid="button-prev-page"
                  >
                    السابق
                  </Button>
                  <span className="text-sm text-muted-foreground">صفحة {historyPage}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage((p) => p + 1)}
                    disabled={settlements.length < 20}
                    data-testid="button-next-page"
                  >
                    التالي
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">حذف التصفية</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل أنت متأكد من حذف هذه التصفية؟ سيتم عكس جميع التحويلات المرتبطة بها (تحويلات العمال وتحويلات الصناديق). هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel data-testid="button-cancel-delete">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (deleteSettlementId) {
                  deleteMutation.mutate(deleteSettlementId);
                }
              }}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 ml-2" />
                  حذف التصفية
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
