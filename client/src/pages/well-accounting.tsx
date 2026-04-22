import { useState, useMemo, useCallback } from "react";
import SelectedProjectBadge from "@/components/selected-project-badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
import { apiRequest } from "@/lib/queryClient";
import { performLocalOperation } from "@/offline/db";
import { formatCurrency } from "@/lib/utils";
import { Plus, CheckCircle2, Clock, AlertCircle, MapPin, TrendingUp, Wrench, DollarSign, Download, FileText, BarChart3, Loader } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toUserMessage } from "@/lib/error-utils";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { QUERY_KEYS } from "@/constants/queryKeys";

const REGIONS = [
  'دار حمدين', 'بيت الشعيب', 'الشبيطا', 'الحندج',
  'محيران', 'جربياح', 'الربعي', 'بيت الزين'
];

const WELL_STATUS_MAP: Record<string, { label: string; color: string; badgeClass: string }> = {
  pending: { label: 'لم يبدأ', color: '#9ca3af', badgeClass: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600' },
  in_progress: { label: 'قيد التنفيذ', color: '#f59e0b', badgeClass: 'bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-600' },
  completed: { label: 'منجز', color: '#22c55e', badgeClass: 'bg-green-100 text-green-800 border-green-400 dark:bg-green-900/40 dark:text-green-300 dark:border-green-600' },
};

export default function WellAccounting() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedProjectId } = useSelectedProject();
  const [selectedWellId, setSelectedWellId] = useState<number | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskForm, setTaskForm] = useState({
    description: '',
    amount: '',
    status: 'pending'
  });
  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    status: 'all',
    region: 'all',
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const { data: wells = [] } = useQuery({
    queryKey: QUERY_KEYS.wellsByProject(selectedProjectId),
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const response = await apiRequest(`/api/wells?project_id=${selectedProjectId}`);
      return response.data || [];
    },
    enabled: !!selectedProjectId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: QUERY_KEYS.wellTasks(selectedWellId != null ? String(selectedWellId) : ''),
    queryFn: async () => {
      if (!selectedWellId) return [];
      const response = await apiRequest(`/api/wells/${selectedWellId}/tasks`);
      return response.data || [];
    },
    enabled: !!selectedWellId
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedWellId) throw new Error('البئر غير محددة');
      return performLocalOperation('wellTasks', 'create', {
        ...data,
        well_id: selectedWellId,
        project_id: selectedProjectId,
        paidAmount: 0,
        expectedAmount: parseFloat(data.amount) || 0,
        created_at: new Date().toISOString()
      }, `/api/wells/${selectedWellId}/tasks`);
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم إنشاء المهمة بنجاح" });
      setTaskForm({ description: '', amount: '', status: 'pending' });
      setShowTaskDialog(false);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wellTasks(selectedWellId != null ? String(selectedWellId) : '') });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: toUserMessage(error), variant: "destructive" });
    }
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: any) => {
      return performLocalOperation('wellTasks', 'update', { id: taskId, status }, `/api/wells/tasks/${taskId}/status`);
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم تحديث حالة المهمة" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wellTasks(selectedWellId != null ? String(selectedWellId) : '') });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: toUserMessage(error), variant: "destructive" });
    }
  });

  const pendingTasks = useMemo(() => tasks.filter((t: any) => t.status === 'pending'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t: any) => t.status === 'completed'), [tasks]);

  const filteredWells = useMemo(() => {
    return wells.filter((well: any) => {
      const matchesSearch =
        (well.ownerName || '').toLowerCase().includes(searchValue.toLowerCase()) ||
        (well.wellNumber || '').toString().includes(searchValue);
      const matchesStatus = filterValues.status === 'all' || well.status === filterValues.status;
      const matchesRegion = filterValues.region === 'all' || well.region === filterValues.region;
      return matchesSearch && matchesStatus && matchesRegion;
    });
  }, [wells, searchValue, filterValues]);

  const taskStats = useMemo(() => {
    const totalTasks = tasks.length;
    const totalExpected = tasks.reduce((s: number, t: any) => s + (Number(t.expectedAmount) || 0), 0);
    const totalPaid = tasks.reduce((s: number, t: any) => s + (Number(t.paidAmount) || 0), 0);
    return { totalTasks, totalExpected, totalPaid, balance: totalExpected - totalPaid };
  }, [tasks]);

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 3,
      items: [
        { key: 'totalWells', label: 'إجمالي الآبار', value: wells.length, icon: BarChart3, color: 'blue' },
        { key: 'totalExpected', label: 'المبالغ المتوقعة', value: formatCurrency(taskStats.totalExpected), icon: DollarSign, color: 'blue' },
        { key: 'totalPaid', label: 'المدفوع', value: formatCurrency(taskStats.totalPaid), icon: DollarSign, color: 'green' },
      ]
    },
    {
      columns: 3,
      items: [
        { key: 'balance', label: 'المتبقي', value: formatCurrency(taskStats.balance), icon: DollarSign, color: 'amber' },
        { key: 'pendingTasks', label: 'مهام معلقة', value: pendingTasks.length, icon: Clock, color: 'orange' },
        { key: 'completedTasks', label: 'مهام منجزة', value: completedTasks.length, icon: CheckCircle2, color: 'green' },
      ]
    },
  ], [wells.length, taskStats, pendingTasks.length, completedTasks.length]);

  const filtersConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'region',
      label: 'المنطقة',
      type: 'select' as const,
      placeholder: 'اختر المنطقة',
      options: [{ value: 'all', label: 'جميع المناطق' }, ...REGIONS.map(r => ({ value: r, label: r }))],
      defaultValue: 'all'
    },
    {
      key: 'status',
      label: 'الحالة',
      type: 'select' as const,
      placeholder: 'اختر الحالة',
      options: [
        { value: 'all', label: 'جميع الحالات' },
        { value: 'pending', label: 'لم يبدأ', dotColor: '#9ca3af' },
        { value: 'in_progress', label: 'قيد التنفيذ', dotColor: '#f59e0b' },
        { value: 'completed', label: 'منجز', dotColor: '#22c55e' }
      ],
      defaultValue: 'all'
    },
  ], []);

  const handleExportExcel = useCallback(async () => {
    if (filteredWells.length === 0) return;
    setIsExporting(true);
    try {
      const { createProfessionalReport } = await import('@/utils/axion-export');
      const getStatusText = (s: string) => s === 'completed' ? 'منجز' : s === 'in_progress' ? 'قيد التنفيذ' : 'لم يبدأ';
      const allData: any[] = [];
      let idx = 0;
      filteredWells.forEach((well: any) => {
        const wellTasks = tasks.filter((t: any) => t.well_id === well.id);
        if (wellTasks.length > 0) {
          wellTasks.forEach((task: any) => {
            idx++;
            allData.push({ index: idx, wellNumber: well.wellNumber, ownerName: well.ownerName, region: well.region || '-', description: task.description || '-', amount: Number(task.amount || 0), paidAmount: Number(task.paidAmount || 0), status: getStatusText(task.status), balance: Number(task.amount || 0) - Number(task.paidAmount || 0) });
          });
        } else {
          idx++;
          allData.push({ index: idx, wellNumber: well.wellNumber, ownerName: well.ownerName, region: well.region || '-', description: '-', amount: 0, paidAmount: 0, status: getStatusText(well.status), balance: 0 });
        }
      });
      const totalAmount = allData.reduce((s, r) => s + r.amount, 0);
      const totalPaid = allData.reduce((s, r) => s + r.paidAmount, 0);
      await createProfessionalReport({
        sheetName: 'محاسبة الآبار',
        reportTitle: 'تقرير محاسبة الآبار',
        subtitle: `تاريخ الإصدار: ${new Date().toLocaleDateString('en-GB')}`,
        infoLines: [`عدد الآبار: ${filteredWells.length}`, `إجمالي المبالغ: ${totalAmount.toLocaleString('en-US')} ريال`, `المدفوع: ${totalPaid.toLocaleString('en-US')} ريال`],
        columns: [
          { header: '#', key: 'index', width: 5 }, { header: 'رقم البئر', key: 'wellNumber', width: 10 },
          { header: 'المالك', key: 'ownerName', width: 18 }, { header: 'المنطقة', key: 'region', width: 14 },
          { header: 'وصف المهمة', key: 'description', width: 22 }, { header: 'المبلغ', key: 'amount', width: 12, numFmt: '#,##0' },
          { header: 'المدفوع', key: 'paidAmount', width: 12, numFmt: '#,##0' }, { header: 'الحالة', key: 'status', width: 12 },
          { header: 'الرصيد', key: 'balance', width: 12, numFmt: '#,##0' },
        ],
        data: allData,
        totals: { label: 'الإجماليات', values: { amount: totalAmount, paidAmount: totalPaid, balance: totalAmount - totalPaid } },
        fileName: `محاسبة_الآبار_${new Date().toISOString().split('T')[0]}.xlsx`,
      });
      toast({ title: "نجاح", description: "تم تصدير تقرير Excel بنجاح" });
    } catch (err) {
      toast({ title: "خطأ", description: "فشل التصدير", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  }, [filteredWells, tasks, toast]);

  const handleExportPdf = useCallback(async () => {
    if (filteredWells.length === 0) return;
    setIsExportingPdf(true);
    try {
      const getStatusText = (s: string) => s === 'completed' ? 'منجز' : s === 'in_progress' ? 'قيد التنفيذ' : 'لم يبدأ';
      const allData: any[] = [];
      let idx = 0;
      filteredWells.forEach((well: any) => {
        const wTasks = well.tasks || [];
        if (wTasks.length > 0) {
          wTasks.forEach((task: any) => { idx++; allData.push({ index: idx, wellNumber: well.wellNumber, ownerName: well.ownerName, region: well.region || '-', description: task.description || '-', amount: Number(task.amount || 0), paidAmount: Number(task.paidAmount || 0), status: getStatusText(well.status), balance: Number(task.amount || 0) - Number(task.paidAmount || 0) }); });
        } else {
          idx++; allData.push({ index: idx, wellNumber: well.wellNumber, ownerName: well.ownerName, region: well.region || '-', description: '-', amount: 0, paidAmount: 0, status: getStatusText(well.status), balance: 0 });
        }
      });
      const totalAmount = allData.reduce((s, r) => s + r.amount, 0);
      const totalPaid = allData.reduce((s, r) => s + r.paidAmount, 0);
      const { generateTablePDF } = await import('@/utils/pdfGenerator');
      await generateTablePDF({
        reportTitle: 'تقرير محاسبة الآبار',
        subtitle: `تاريخ الإصدار: ${new Date().toLocaleDateString('en-GB')}`,
        infoItems: [{ label: 'عدد الآبار', value: filteredWells.length }, { label: 'إجمالي المبالغ', value: `${totalAmount.toLocaleString('en-US')} ريال` }, { label: 'المدفوع', value: `${totalPaid.toLocaleString('en-US')} ريال`, color: '#16a34a' }],
        columns: [
          { header: '#', key: 'index', width: 5 }, { header: 'رقم البئر', key: 'wellNumber', width: 10 },
          { header: 'المالك', key: 'ownerName', width: 18 }, { header: 'المنطقة', key: 'region', width: 14 },
          { header: 'وصف المهمة', key: 'description', width: 22 }, { header: 'المبلغ', key: 'amount', width: 12 },
          { header: 'المدفوع', key: 'paidAmount', width: 12 }, { header: 'الحالة', key: 'status', width: 12 },
          { header: 'الرصيد', key: 'balance', width: 12 },
        ],
        data: allData,
        totals: { label: 'الإجماليات', values: { amount: totalAmount, paidAmount: totalPaid, balance: totalAmount - totalPaid } },
        filename: `محاسبة_الآبار_${new Date().toISOString().split('T')[0]}`,
      });
      toast({ title: "نجاح", description: "تم تصدير تقرير PDF بنجاح" });
    } catch (err) {
      toast({ title: "خطأ", description: "فشل التصدير", variant: "destructive" });
    } finally {
      setIsExportingPdf(false);
    }
  }, [filteredWells, toast]);

  const actionsConfig: ActionButton[] = useMemo(() => [
    { key: 'export-excel', label: 'تصدير Excel', icon: Download, onClick: handleExportExcel, loading: isExporting, disabled: filteredWells.length === 0, tooltip: 'تصدير تقرير Excel' },
    { key: 'export-pdf', label: 'تصدير PDF', icon: FileText, onClick: handleExportPdf, loading: isExportingPdf, disabled: filteredWells.length === 0, tooltip: 'تصدير تقرير PDF' },
  ], [handleExportExcel, handleExportPdf, isExporting, isExportingPdf, filteredWells.length]);

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <SelectedProjectBadge />
      <UnifiedFilterDashboard
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="بحث باسم المالك أو رقم البئر..."
        statsRows={statsRowsConfig}
        filters={filtersConfig}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        actions={actionsConfig}
        resultsSummary={{
          totalCount: wells.length,
          filteredCount: filteredWells.length,
          totalLabel: 'إجمالي الآبار',
          filteredLabel: 'نتائج البحث',
        }}
      />

      <UnifiedCardGrid columns={2}>
        {filteredWells.map((well: any) => (
          <UnifiedCard
            key={well.id}
            data-testid={`card-well-accounting-${well.id}`}
            title={`بئر #${well.wellNumber} - ${well.ownerName}`}
            subtitle={well.region}
            titleIcon={MapPin}
            headerColor={WELL_STATUS_MAP[well.status]?.color || '#9ca3af'}
            badges={[{
              label: WELL_STATUS_MAP[well.status]?.label || 'لم يبدأ',
              className: WELL_STATUS_MAP[well.status]?.badgeClass || WELL_STATUS_MAP.pending.badgeClass,
            }]}
            fields={[
              { label: 'المنطقة', value: well.region, icon: MapPin, color: 'info' as const },
              { label: 'الألواح', value: well.numberOfPanels, icon: Wrench, color: 'success' as const },
              { label: 'المواسير', value: (well.numberOfPipes || 0) + (well.extraPipes || 0), icon: Wrench, color: 'success' as const },
              { label: 'العمق', value: `${well.wellDepth}م`, icon: TrendingUp, color: 'warning' as const },
              { label: 'التقدم', value: `${well.completionPercentage || 0}%`, emphasis: true, color: 'info' as const, icon: TrendingUp }
            ]}
            onClick={() => setSelectedWellId(well.id)}
            className={selectedWellId === well.id ? 'ring-2 ring-primary' : ''}
          />
        ))}
      </UnifiedCardGrid>

      {selectedWellId && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              مهام البئر المحددة
            </h3>
            <Button size="sm" onClick={() => setShowTaskDialog(true)} className="gap-1" data-testid="button-add-task">
              <Plus className="h-4 w-4" /> مهمة جديدة
            </Button>
          </div>

          {pendingTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-600">
                <Clock className="h-4 w-4" /> المهام المعلقة ({pendingTasks.length})
              </h4>
              <UnifiedCardGrid columns={2}>
                {pendingTasks.map((task: any) => (
                  <UnifiedCard
                    key={task.id}
                    title={task.description}
                    subtitle={`المبلغ: ${formatCurrency(task.expectedAmount || 0)}`}
                    titleIcon={Clock}
                    headerColor="#f59e0b"
                    badges={[{ label: 'معلقة', className: 'bg-amber-100 text-amber-800 border-amber-400' }]}
                    fields={[
                      { label: 'المبلغ المتوقع', value: formatCurrency(task.expectedAmount || 0), emphasis: true, icon: DollarSign, color: 'info' as const },
                      { label: 'المبلغ المدفوع', value: formatCurrency(task.paidAmount || 0), icon: DollarSign, color: 'success' as const }
                    ]}
                    actions={[{
                      icon: CheckCircle2,
                      label: 'انتهت',
                      onClick: () => updateTaskStatusMutation.mutate({ taskId: task.id, status: 'completed' }),
                      color: 'green' as const
                    }]}
                    compact
                  />
                ))}
              </UnifiedCardGrid>
            </div>
          )}

          {completedTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" /> المهام المنجزة ({completedTasks.length})
              </h4>
              <UnifiedCardGrid columns={2}>
                {completedTasks.map((task: any) => (
                  <UnifiedCard
                    key={task.id}
                    title={task.description}
                    subtitle={`المبلغ: ${formatCurrency(task.expectedAmount || 0)}`}
                    titleIcon={CheckCircle2}
                    headerColor="#22c55e"
                    badges={[{ label: 'منجزة', className: 'bg-green-100 text-green-800 border-green-400' }]}
                    fields={[
                      { label: 'المبلغ المتوقع', value: formatCurrency(task.expectedAmount || 0), emphasis: true, icon: DollarSign, color: 'info' as const },
                      { label: 'المبلغ المدفوع', value: formatCurrency(task.paidAmount || 0), icon: DollarSign, color: 'success' as const }
                    ]}
                    compact
                  />
                ))}
              </UnifiedCardGrid>
            </div>
          )}

          {tasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>لا توجد مهام - أضف مهمة جديدة</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة مهمة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm">وصف المهمة</Label>
              <Input value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="مثال: إنشاء القاعدة" data-testid="input-task-description" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">المبلغ المتوقع</Label>
              <Input type="number" value={taskForm.amount} onChange={(e) => setTaskForm({ ...taskForm, amount: e.target.value })} placeholder="0" data-testid="input-task-amount" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowTaskDialog(false)}>إلغاء</Button>
              <Button className="flex-1" onClick={() => createTaskMutation.mutate(taskForm)} disabled={createTaskMutation.isPending || !taskForm.description} data-testid="button-submit-task">
                {createTaskMutation.isPending ? <Loader className="h-4 w-4 animate-spin" /> : "إضافة المهمة"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
