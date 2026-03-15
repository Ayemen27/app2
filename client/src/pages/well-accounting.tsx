import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { UnifiedStats } from "@/components/ui/unified-stats";
import { UnifiedSearchFilter, useUnifiedFilter } from "@/components/ui/unified-search-filter";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { apiRequest } from "@/lib/queryClient";
import { performLocalOperation } from "@/offline/db";
import { formatCurrency } from "@/lib/utils";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { Plus, CheckCircle2, Clock, AlertCircle, MapPin, TrendingUp, Wrench, DollarSign, Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSelectedProject } from "@/hooks/use-selected-project";

const REGIONS = [
  'دار حمدين', 'بيت الشعيب', 'الشبيطا', 'الحندج',
  'محيران', 'جربياح', 'الربعي', 'بيت الزين'
];

const WELL_STATUS_MAP: Record<string, { label: string; color: string; badgeClass: string }> = {
  pending: { label: 'لم يبدأ', color: '#9ca3af', badgeClass: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600' },
  in_progress: { label: 'قيد التنفيذ', color: '#f59e0b', badgeClass: 'bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-600' },
  completed: { label: 'منجز', color: '#22c55e', badgeClass: 'bg-green-100 text-green-800 border-green-400 dark:bg-green-900/40 dark:text-green-300 dark:border-green-600' },
};

const WELL_STATUS_OPTIONS = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'pending', label: 'لم يبدأ', dotColor: '#9ca3af' },
  { value: 'in_progress', label: 'قيد التنفيذ', dotColor: '#f59e0b' },
  { value: 'completed', label: 'منجز', dotColor: '#22c55e' }
];

import { AdminMonitoringUI } from "@/components/admin-monitoring-ui";
import { QUERY_KEYS } from "@/constants/queryKeys";

export default function WellAccounting() {
  const [, setLocation] = useLocation();
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

  // إدارة المناطق
  const [regions] = useState<string[]>(REGIONS);

  // استخدام UnifiedFilter للبحث
  const {
    searchValue,
    filterValues,
    onSearchChange,
    onFilterChange,
    onReset,
  } = useUnifiedFilter({
    status: 'all',
    region: 'all',
    depthRange: 'all'
  });


  // جلب الآبار
  const { data: wells = [] } = useQuery({
    queryKey: QUERY_KEYS.wellsByProject(selectedProjectId),
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const response = await apiRequest(`/api/wells?project_id=${selectedProjectId}`);
      return response.data || [];
    },
    enabled: !!selectedProjectId
  });

  // جلب وصف المهام للإكمال التلقائي
  const { data: taskDescriptions = [] } = useQuery({
    queryKey: QUERY_KEYS.autocompleteTaskDescriptions(selectedProjectId),
    queryFn: async () => {
      const response = await apiRequest('/api/autocomplete?category=workerMiscDescriptions');
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: !!selectedProjectId,
    staleTime: 5 * 60 * 1000
  });

  // جلب مهام البئر
  const { data: tasks = [] } = useQuery({
    queryKey: QUERY_KEYS.wellTasks(selectedWellId != null ? String(selectedWellId) : ''),
    queryFn: async () => {
      if (!selectedWellId) return [];
      const response = await apiRequest(`/api/wells/${selectedWellId}/tasks`);
      return response.data || [];
    },
    enabled: !!selectedWellId
  });

  // إنشاء مهمة جديدة
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
      toast({ title: "نجاح", description: "تم إنشاء المهمة بنجاح (محلياً)" });
      setTaskForm({ description: '', amount: '', status: 'pending' });
      setShowTaskDialog(false);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wellTasks(selectedWellId != null ? String(selectedWellId) : '') });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: any) => {
      return performLocalOperation('wellTasks', 'update', {
        id: taskId,
        status
      }, `/api/wells/tasks/${taskId}/status`);
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم تحديث حالة المهمة (محلياً)" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wellTasks(selectedWellId != null ? String(selectedWellId) : '') });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // محاسبة المهمة
  const accountTaskMutation = useMutation({
    mutationFn: async ({ taskId, amount }: any) => {
      return performLocalOperation('wellTaskAccounts', 'create', {
        taskId,
        amount: parseFloat(amount) || 0,
        project_id: selectedProjectId,
        created_at: new Date().toISOString()
      }, `/api/wells/tasks/${taskId}/account`);
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم محاسبة المهمة (محلياً)" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wellTasks(selectedWellId != null ? String(selectedWellId) : '') });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const { summary, isLoading: isLoadingSummary } = useFinancialSummary();

  const pendingTasks = useMemo(() => tasks.filter((t: any) => t.status === 'pending'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t: any) => t.status === 'completed'), [tasks]);

  // فلترة الآبار
  const filteredWells = useMemo(() => {
    return wells.filter((well: any) => {
      const matchesSearch = 
        (well.ownerName || '').toLowerCase().includes(searchValue.toLowerCase()) ||
        (well.wellNumber || '').toString().includes(searchValue);
      const matchesStatus = filterValues.status === 'all' || well.status === filterValues.status;
      const matchesRegion = filterValues.region === 'all' || well.region === filterValues.region;
      const depth = Number(well.wellDepth) || 0;
      const matchesDepth = filterValues.depthRange === 'all' ||
        (filterValues.depthRange === '0-50' && depth <= 50) ||
        (filterValues.depthRange === '51-100' && depth >= 51 && depth <= 100) ||
        (filterValues.depthRange === '101+' && depth >= 101);
      
      return matchesSearch && matchesStatus && matchesRegion && matchesDepth;
    });
  }, [wells, searchValue, filterValues]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {/* شريط البحث والفلترة الموحد */}
          <div>
            <UnifiedSearchFilter
              searchValue={searchValue}
              onSearchChange={onSearchChange}
              searchPlaceholder="ابحث باسم المالك أو رقم البئر..."
              showSearch={true}
              filters={[
                {
                  key: 'region',
                  label: 'المنطقة',
                  type: 'select',
                  placeholder: 'اختر المنطقة',
                  options: [{ value: 'all', label: 'جميع المناطق' }, ...regions.map(r => ({ value: r, label: r }))],
                  defaultValue: 'all'
                },
                {
                  key: 'status',
                  label: 'الحالة',
                  type: 'select',
                  placeholder: 'اختر الحالة',
                  options: WELL_STATUS_OPTIONS,
                  defaultValue: 'all'
                },
                {
                  key: 'depthRange',
                  label: 'عمق البئر',
                  type: 'select',
                  placeholder: 'اختر النطاق',
                  options: [
                    { value: 'all', label: 'الكل' },
                    { value: '0-50', label: '0 - 50 م' },
                    { value: '51-100', label: '51 - 100 م' },
                    { value: '101+', label: '101 م فأكثر' },
                  ],
                  defaultValue: 'all'
                },
              ]}
              filterValues={filterValues}
              onFilterChange={onFilterChange}
              onReset={onReset}
              showResetButton={true}
              showActiveFilters={true}
              compact={false}
            />
            <div className="flex justify-end mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (filteredWells.length === 0) return;
                  const { createProfessionalReport } = await import('@/utils/axion-export');
                  const getStatusText = (s: string) => s === 'completed' ? 'منجز' : s === 'in_progress' ? 'قيد التنفيذ' : 'لم يبدأ';
                  const allData: any[] = [];
                  let idx = 0;
                  filteredWells.forEach((well: any) => {
                    const wellTasks = tasks.filter((t: any) => t.well_id === well.id);
                    if (wellTasks.length > 0) {
                      wellTasks.forEach((task: any) => {
                        idx++;
                        allData.push({
                          index: idx,
                          wellNumber: well.wellNumber,
                          ownerName: well.ownerName,
                          region: well.region || '-',
                          description: task.description || '-',
                          amount: Number(task.amount || 0),
                          paidAmount: Number(task.paidAmount || 0),
                          status: getStatusText(task.status),
                          balance: Number(task.amount || 0) - Number(task.paidAmount || 0),
                        });
                      });
                    } else {
                      idx++;
                      allData.push({
                        index: idx,
                        wellNumber: well.wellNumber,
                        ownerName: well.ownerName,
                        region: well.region || '-',
                        description: '-',
                        amount: 0,
                        paidAmount: 0,
                        status: getStatusText(well.status),
                        balance: 0,
                      });
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
                      { header: '#', key: 'index', width: 5 },
                      { header: 'رقم البئر', key: 'wellNumber', width: 10 },
                      { header: 'المالك', key: 'ownerName', width: 18 },
                      { header: 'المنطقة', key: 'region', width: 14 },
                      { header: 'وصف المهمة', key: 'description', width: 22 },
                      { header: 'المبلغ', key: 'amount', width: 12, numFmt: '#,##0' },
                      { header: 'المدفوع', key: 'paidAmount', width: 12, numFmt: '#,##0' },
                      { header: 'الحالة', key: 'status', width: 12 },
                      { header: 'الرصيد', key: 'balance', width: 12, numFmt: '#,##0' },
                    ],
                    data: allData,
                    totals: { label: 'الإجماليات', values: { amount: totalAmount, paidAmount: totalPaid, balance: totalAmount - totalPaid } },
                    fileName: `محاسبة_الآبار_${new Date().toISOString().split('T')[0]}.xlsx`,
                  });
                }}
                disabled={filteredWells.length === 0}
                className="gap-2"
                data-testid="button-export-well-accounting"
              >
                <Download className="h-4 w-4" />
                تصدير Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const getStatusText = (s: string) => s === 'completed' ? 'منجز' : s === 'in_progress' ? 'قيد التنفيذ' : 'لم يبدأ';
                  const allData: any[] = [];
                  let idx = 0;
                  filteredWells.forEach((well: any) => {
                    const tasks = well.tasks || [];
                    if (tasks.length > 0) {
                      tasks.forEach((task: any) => {
                        idx++;
                        allData.push({
                          index: idx,
                          wellNumber: well.wellNumber,
                          ownerName: well.ownerName,
                          region: well.region || '-',
                          description: task.description || '-',
                          amount: Number(task.amount || 0),
                          paidAmount: Number(task.paidAmount || 0),
                          status: getStatusText(well.status),
                          balance: Number(task.amount || 0) - Number(task.paidAmount || 0),
                        });
                      });
                    } else {
                      idx++;
                      allData.push({
                        index: idx,
                        wellNumber: well.wellNumber,
                        ownerName: well.ownerName,
                        region: well.region || '-',
                        description: '-',
                        amount: 0,
                        paidAmount: 0,
                        status: getStatusText(well.status),
                        balance: 0,
                      });
                    }
                  });
                  const totalAmount = allData.reduce((s, r) => s + r.amount, 0);
                  const totalPaid = allData.reduce((s, r) => s + r.paidAmount, 0);
                  const { generateTablePDF } = await import('@/utils/pdfGenerator');
                  await generateTablePDF({
                    reportTitle: 'تقرير محاسبة الآبار',
                    subtitle: `تاريخ الإصدار: ${new Date().toLocaleDateString('en-GB')}`,
                    infoItems: [
                      { label: 'عدد الآبار', value: filteredWells.length },
                      { label: 'إجمالي المبالغ', value: `${totalAmount.toLocaleString('en-US')} ريال` },
                      { label: 'المدفوع', value: `${totalPaid.toLocaleString('en-US')} ريال`, color: '#16a34a' },
                    ],
                    columns: [
                      { header: '#', key: 'index', width: 5 },
                      { header: 'رقم البئر', key: 'wellNumber', width: 10 },
                      { header: 'المالك', key: 'ownerName', width: 18 },
                      { header: 'المنطقة', key: 'region', width: 14 },
                      { header: 'وصف المهمة', key: 'description', width: 22 },
                      { header: 'المبلغ', key: 'amount', width: 12 },
                      { header: 'المدفوع', key: 'paidAmount', width: 12 },
                      { header: 'الحالة', key: 'status', width: 12 },
                      { header: 'الرصيد', key: 'balance', width: 12 },
                    ],
                    data: allData,
                    totals: { label: 'الإجماليات', values: { amount: totalAmount, paidAmount: totalPaid, balance: totalAmount - totalPaid } },
                    filename: `محاسبة_الآبار_${new Date().toISOString().split('T')[0]}`,
                  });
                }}
                disabled={filteredWells.length === 0}
                className="gap-2"
                data-testid="button-export-well-accounting-pdf"
              >
                <FileText className="h-4 w-4" />
                تصدير PDF
              </Button>
            </div>
          </div>

          {/* قائمة الآبار */}
          <div>
            <div className="text-lg font-semibold mb-3">اختر البئر ({filteredWells.length})</div>
            <UnifiedCardGrid columns={selectedWellId ? 2 : 4}>
              {filteredWells.map((well: any) => (
                <UnifiedCard
                  key={well.id}
                  title={`بئر #${well.wellNumber}`}
                  subtitle={well.ownerName}
                  titleIcon={MapPin}
                  headerColor={WELL_STATUS_MAP[well.status]?.color || '#9ca3af'}
                  badges={[
                    {
                      label: WELL_STATUS_MAP[well.status]?.label || 'لم يبدأ',
                      className: WELL_STATUS_MAP[well.status]?.badgeClass || WELL_STATUS_MAP.pending.badgeClass,
                    }
                  ]}
                  fields={[
                    { label: 'المنطقة', value: well.region, icon: MapPin, color: 'info' as const },
                    { label: 'الألواح', value: well.numberOfPanels, icon: Wrench, color: 'success' as const },
                    { label: 'المواسير', value: (well.numberOfPipes || 0) + (well.extraPipes || 0), icon: Wrench, color: 'success' as const },
                    { label: 'العمق', value: `${well.wellDepth}م`, icon: TrendingUp, color: 'warning' as const },
                    { label: 'التقدم', value: `${well.completionPercentage}%`, emphasis: true, color: 'info' as const, icon: TrendingUp }
                  ]}
                  onClick={() => setSelectedWellId(well.id)}
                  className={selectedWellId === well.id ? 'ring-2 ring-primary' : ''}
                  compact
                />
              ))}
            </UnifiedCardGrid>
          </div>

          {selectedWellId && (
            <>
              {/* شريط الإحصائيات الموحد */}
              <UnifiedStats
                title="إحصائيات المهام"
                hideHeader={false}
                stats={[
                  {
                    title: 'إجمالي التكاليف',
                    value: formatCurrency(summary?.totalBalance || 0),
                    icon: DollarSign,
                    color: 'blue'
                  },
                  {
                    title: 'إجمالي المهام',
                    value: tasks.length,
                    icon: Clock,
                    color: 'blue'
                  },
                  {
                    title: 'مهام معلقة',
                    value: pendingTasks.length,
                    icon: Clock,
                    color: 'amber',
                    status: pendingTasks.length > 0 ? 'warning' : undefined
                  },
                  {
                    title: 'مهام منجزة',
                    value: completedTasks.length,
                    icon: CheckCircle2,
                    color: 'green'
                  }
                ]}
                columns={3}
                showStatus={true}
              />

              {/* بطاقات الإحصائيات الإضافية */}
              <UnifiedCardGrid columns={4}>
                <UnifiedCard
                  title='إجمالي المهام'
                  titleIcon={Clock}
                  fields={[{ label: 'العدد', value: tasks.length, emphasis: true, color: 'info' }]}
                  compact
                />
                <UnifiedCard
                  title='مهام معلقة'
                  titleIcon={Clock}
                  fields={[{ label: 'العدد', value: pendingTasks.length, emphasis: true, color: 'warning' }]}
                  compact
                />
                <UnifiedCard
                  title='مهام منجزة'
                  titleIcon={CheckCircle2}
                  fields={[{ label: 'العدد', value: completedTasks.length, emphasis: true, color: 'success' }]}
                  compact
                />
                <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                  <DialogTrigger asChild>
                    <div className="relative rounded-xl border bg-card text-card-foreground shadow-sm p-4 hover:shadow-md hover:border-primary/20 cursor-pointer">
                      <Button className="w-full h-20" variant="outline">
                        <Plus className="h-5 w-5 ml-2" />
                        مهمة جديدة
                      </Button>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>إضافة مهمة جديدة</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>وصف المهمة</Label>
                        <Input
                          value={taskForm.description}
                          onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                          placeholder="مثال: إنشاء القاعدة"
                          autoWidth
                          maxWidth={400}
                          className="min-h-11"
                        />
                      </div>
                      <div>
                        <Label>المبلغ المتوقع</Label>
                        <Input
                          type="number"
                          value={taskForm.amount}
                          onChange={(e) => setTaskForm({ ...taskForm, amount: e.target.value })}
                          placeholder="0"
                          autoWidth
                          maxWidth={150}
                          className="min-h-11"
                        />
                      </div>
                      <Button
                        onClick={() => createTaskMutation.mutate(taskForm)}
                        disabled={createTaskMutation.isPending}
                        className="w-full"
                      >
                        {createTaskMutation.isPending ? "جاري..." : "إضافة المهمة"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </UnifiedCardGrid>

              {/* المهام المعلقة */}
              {pendingTasks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    المهام المعلقة ({pendingTasks.length})
                  </h3>
                  <UnifiedCardGrid columns={1}>
                    {pendingTasks.map((task: any) => (
                      <UnifiedCard
                        key={task.id}
                        title={task.description}
                        subtitle={`المبلغ: ${formatCurrency(task.expectedAmount || 0)}`}
                        titleIcon={Clock}
                        badges={[{ label: 'معلقة', variant: 'warning' }]}
                        fields={[
                          { label: 'الحالة', value: 'معلقة', icon: Clock, color: 'warning' as const },
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

              {/* المهام المنجزة */}
              {completedTasks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    المهام المنجزة ({completedTasks.length})
                  </h3>
                  <UnifiedCardGrid columns={1}>
                    {completedTasks.map((task: any) => (
                      <UnifiedCard
                        key={task.id}
                        title={task.description}
                        subtitle={`المبلغ: ${formatCurrency(task.expectedAmount || 0)}`}
                        titleIcon={CheckCircle2}
                        badges={[{ label: 'منجزة', variant: 'success' }]}
                        fields={[
                          { label: 'الحالة', value: 'منجزة', icon: CheckCircle2, color: 'success' as const },
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
                <UnifiedCard
                  title='لا توجد مهام'
                  subtitle='البئر بدون مهام'
                  titleIcon={AlertCircle}
                  fields={[{ label: 'الحالة', value: 'في انتظار إضافة مهام' }]}
                />
              )}
            </>
          )}
        </div>
        
        <div className="lg:col-span-1 space-y-6">
          <AdminMonitoringUI />
        </div>
      </div>
    </div>
  );
}
