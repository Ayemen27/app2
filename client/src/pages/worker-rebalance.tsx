import { useState } from 'react';
import SelectedProjectBadge from "@/components/selected-project-badge";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { UnifiedFilterDashboard } from '@/components/ui/unified-filter-dashboard';
import type { StatsRowConfig } from '@/components/ui/unified-filter-dashboard/types';
import { UnifiedCard, UnifiedCardGrid } from '@/components/ui/unified-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle,
  CheckCircle2,
  ArrowRightLeft,
  Eye,
  Play,
  Users,
  Building2,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  Loader2,
  RefreshCw,
  Calendar
} from 'lucide-react';

interface WorkerProject {
  projectId: string;
  projectName: string;
  earned: number;
  paid: number;
  transferred: number;
  balance: number;
}

interface ImbalancedWorker {
  workerId: string;
  workerName: string;
  projectCount: number;
  positiveProjects: number;
  negativeProjects: number;
  totalBalance: number;
  projects: WorkerProject[];
}

interface PreviewLine {
  fromProjectId: string;
  fromProjectName: string;
  fromWorkerBalanceBefore: number;
  fromWorkerBalanceAfter: number;
  toProjectId: string;
  toProjectName: string;
  toWorkerBalanceBefore: number;
  toWorkerBalanceAfter: number;
  amount: number;
}

interface ProjectFundBalance {
  projectId: string;
  projectName: string;
  totalIncome: number;
  totalExpenses: number;
  fundBalance: number;
}

interface RebalancePreview {
  workerId: string;
  workerName: string;
  lines: PreviewLine[];
  totalRebalanced: number;
  projectFundsBefore: ProjectFundBalance[];
  projectFundsAfter: ProjectFundBalance[];
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function formatDateBritish(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface PaymentDate {
  date: string;
  totalAmount: number;
  count: number;
  sources: string;
}

export default function WorkerRebalancePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWorker, setSelectedWorker] = useState<ImbalancedWorker | null>(null);
  const [previewData, setPreviewData] = useState<RebalancePreview | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [completedWorkers, setCompletedWorkers] = useState<Set<string>>(new Set());
  const [searchValue, setSearchValue] = useState('');
  const [rebalanceDate, setRebalanceDate] = useState(getTodayDate());
  const [paymentDates, setPaymentDates] = useState<PaymentDate[]>([]);

  const { data: workers = [], isLoading, isError, refetch, isRefetching } = useQuery<ImbalancedWorker[]>({
    queryKey: ['/api/worker-rebalance/imbalanced-workers'],
  });

  const filteredWorkers = workers.filter(w =>
    !searchValue || w.workerName.includes(searchValue)
  );

  const previewMutation = useMutation({
    mutationFn: async (workerId: string) => {
      return await apiRequest(`/api/worker-rebalance/preview/${workerId}`, 'GET');
    },
    onSuccess: (response: any) => {
      const payload = response?.data ?? response;
      if (payload && Array.isArray(payload.lines)) {
        setPreviewData(payload);
      } else {
        toast({ title: 'خطأ', description: response?.message || 'لم يتم استلام بيانات المعاينة', variant: 'destructive' });
      }
    },
    onError: (error: any) => {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (params: { workerId: string; lines: any[]; date: string }) => {
      return await apiRequest('/api/worker-rebalance/execute', 'POST', params);
    },
    onSuccess: (response: any) => {
      const msg = response?.message || response?.data?.note || 'تمت العملية';
      toast({ title: 'تمت التسوية بنجاح', description: msg });
      if (previewData?.workerId) {
        setCompletedWorkers(prev => new Set(prev).add(previewData.workerId));
      }
      setShowConfirmDialog(false);
      setPreviewData(null);
      setSelectedWorker(null);
      queryClient.invalidateQueries({ queryKey: ['/api/worker-rebalance/imbalanced-workers'] });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    },
  });

  const handlePreview = async (worker: ImbalancedWorker) => {
    setSelectedWorker(worker);
    previewMutation.mutate(worker.workerId);
    try {
      const resp = await apiRequest(`/api/worker-rebalance/payment-dates/${worker.workerId}`, 'GET');
      const dates = resp?.data ?? resp;
      setPaymentDates(Array.isArray(dates) ? dates : []);
    } catch {
      setPaymentDates([]);
    }
  };

  const handleExecute = () => {
    if (!previewData?.lines?.length) return;
    executeMutation.mutate({
      workerId: previewData.workerId,
      lines: previewData.lines.map(l => ({
        fromProjectId: l.fromProjectId,
        toProjectId: l.toProjectId,
        amount: l.amount,
      })),
      date: rebalanceDate,
    });
  };

  const totalPositive = workers.reduce((sum, w) => sum + w.positiveProjects, 0);
  const totalNegative = workers.reduce((sum, w) => sum + w.negativeProjects, 0);

  const statsRows: StatsRowConfig[] = [
    {
      items: [
        {
          key: 'total-workers',
          label: 'عمال متضاربون',
          value: workers.length,
          icon: Users,
          color: workers.length > 0 ? 'amber' : 'green',
        },
        {
          key: 'positive-projects',
          label: 'أرصدة موجبة',
          value: totalPositive,
          icon: TrendingUp,
          color: 'green',
        },
        {
          key: 'negative-projects',
          label: 'أرصدة سالبة',
          value: totalNegative,
          icon: TrendingDown,
          color: 'red',
        },
        {
          key: 'completed',
          label: 'تمت تسويتهم',
          value: completedWorkers.size,
          icon: CheckCircle2,
          color: 'blue',
        },
      ],
      columns: 4,
    }
  ];

  return (
    <div className="space-y-4 pb-24" dir="rtl">
      <SelectedProjectBadge />
      <UnifiedFilterDashboard
        statsRows={statsRows}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="بحث بالاسم..."
        showSearch={workers.length > 0}
        onRefresh={() => refetch()}
        isRefreshing={isRefetching}
        resultsSummary={workers.length > 0 ? {
          totalCount: workers.length,
          filteredCount: filteredWorkers.length,
          filteredLabel: 'عامل بأرصدة متضاربة',
        } : undefined}
      />

      {workers.length > 0 && (
        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            هذه الأداة مخصصة لإصلاح الأرصدة المتضاربة القديمة. كل عملية تُنشئ ترحيلات مالية بين المشاريع مع ملاحظات توضيحية تلقائية وقيود محاسبية.
            <strong> التنفيذ يدوي — عامل بعامل مع معاينة قبل/بعد.</strong>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="mr-2 text-muted-foreground">جارٍ تحميل البيانات...</span>
        </div>
      ) : isError ? (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">فشل في تحميل البيانات</h3>
            <p className="text-muted-foreground mt-1">تأكد من صلاحيات المدير وأعد المحاولة</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()} data-testid="btn-retry">
              <RefreshCw className="h-4 w-4 ml-2" />
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      ) : workers.length === 0 ? (
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">لا توجد أرصدة متضاربة</h3>
            <p className="text-muted-foreground mt-1">جميع حسابات العمال متوازنة</p>
          </CardContent>
        </Card>
      ) : (
        <UnifiedCardGrid columns={1}>
          {filteredWorkers.map((worker) => {
            const isCompleted = completedWorkers.has(worker.workerId);
            return (
              <UnifiedCard
                key={worker.workerId}
                title={worker.workerName}
                titleIcon={Users}
                data-testid={`card-worker-${worker.workerId}`}
                className={isCompleted ? 'opacity-50 border-green-300' : ''}
                badges={[
                  ...(isCompleted ? [{
                    label: 'تمت التسوية',
                    variant: 'success' as const,
                  }] : []),
                  {
                    label: `${worker.projectCount} مشاريع`,
                    variant: 'outline' as const,
                  },
                  {
                    label: `الرصيد: ${formatNumber(worker.totalBalance)}`,
                    variant: 'secondary' as const,
                  },
                ]}
                fields={[
                  {
                    label: 'مشاريع موجبة',
                    value: worker.positiveProjects,
                    icon: TrendingUp,
                    color: 'success',
                  },
                  {
                    label: 'مشاريع سالبة',
                    value: worker.negativeProjects,
                    icon: TrendingDown,
                    color: 'danger',
                  },
                ]}
                actions={[
                  {
                    icon: Eye,
                    label: 'معاينة التسوية',
                    onClick: () => handlePreview(worker),
                    disabled: isCompleted || previewMutation.isPending,
                    color: 'blue',
                  },
                ]}
                customSection={
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                    {worker.projects.map((proj) => (
                      <div
                        key={proj.projectId}
                        className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                          proj.balance < -0.01
                            ? 'bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800'
                            : proj.balance > 0.01
                            ? 'bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800'
                            : 'bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                        }`}
                        data-testid={`project-balance-${worker.workerId}-${proj.projectId}`}
                      >
                        {proj.balance < -0.01 ? (
                          <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />
                        ) : proj.balance > 0.01 ? (
                          <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{proj.projectName}</div>
                          <div className={`font-bold ${
                            proj.balance < -0.01 ? 'text-red-600' : proj.balance > 0.01 ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {formatNumber(proj.balance)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                }
              />
            );
          })}
        </UnifiedCardGrid>
      )}

      <Dialog open={!!previewData} onOpenChange={(open) => { if (!open) { setPreviewData(null); setSelectedWorker(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-blue-600" />
              معاينة تسوية — {previewData?.workerName}
            </DialogTitle>
            <DialogDescription>
              مراجعة الأرصدة قبل وبعد التسوية — تأكد من صحة البيانات قبل التنفيذ
            </DialogDescription>
          </DialogHeader>

          {previewData && (previewData.lines?.length ?? 0) > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                إجمالي المبالغ المرحّلة: <strong className="text-foreground">{formatNumber(previewData.totalRebalanced)}</strong>
              </div>

              <div className="text-sm font-semibold text-muted-foreground mt-2">رصيد العامل في المشاريع:</div>
              {previewData.lines.map((line, idx) => (
                <Card key={idx} className="border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                      <div className="text-center flex-1 min-w-[140px]">
                        <div className="text-xs text-muted-foreground mb-1">المصدر (موجب)</div>
                        <div className="font-semibold text-sm truncate" data-testid={`text-from-project-${idx}`}>
                          {line.fromProjectName}
                        </div>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <span className="text-green-600 text-sm">{formatNumber(line.fromWorkerBalanceBefore)}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-blue-600 font-bold text-sm">{formatNumber(line.fromWorkerBalanceAfter)}</span>
                        </div>
                      </div>

                      <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full px-4 py-2 text-center" data-testid={`text-amount-${idx}`}>
                        <div className="text-xs text-blue-600 dark:text-blue-400">ترحيل</div>
                        <div className="font-bold text-blue-700 dark:text-blue-300">{formatNumber(line.amount)}</div>
                      </div>

                      <div className="text-center flex-1 min-w-[140px]">
                        <div className="text-xs text-muted-foreground mb-1">الهدف (سالب)</div>
                        <div className="font-semibold text-sm truncate" data-testid={`text-to-project-${idx}`}>
                          {line.toProjectName}
                        </div>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <span className="text-red-600 text-sm">{formatNumber(line.toWorkerBalanceBefore)}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-blue-600 font-bold text-sm">{formatNumber(line.toWorkerBalanceAfter)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {previewData.projectFundsBefore.length > 0 && (
                <>
                  <div className="text-sm font-semibold text-muted-foreground mt-4 flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    أرصدة صناديق المشاريع (قبل ← بعد):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {previewData.projectFundsBefore.map((pf) => {
                      const after = previewData.projectFundsAfter.find(a => a.projectId === pf.projectId);
                      const diff = (after?.fundBalance || 0) - pf.fundBalance;
                      return (
                        <Card key={pf.projectId} className="border-gray-200 dark:border-gray-700">
                          <CardContent className="p-3">
                            <div className="font-semibold text-sm truncate mb-2" data-testid={`fund-project-${pf.projectId}`}>
                              {pf.projectName}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">الدخل: </span>
                                <span className="font-medium">{formatNumber(pf.totalIncome)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">المصروفات: </span>
                                <span className="font-medium">{formatNumber(pf.totalExpenses)}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t">
                              <div className="text-sm">
                                <span className="text-muted-foreground">الصندوق: </span>
                                <span className={`font-bold ${pf.fundBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatNumber(pf.fundBalance)}
                                </span>
                              </div>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <div className="text-sm">
                                <span className={`font-bold ${(after?.fundBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatNumber(after?.fundBalance || 0)}
                                </span>
                                <span className={`mr-1 text-xs ${diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : ''}`}>
                                  ({diff > 0 ? '+' : ''}{formatNumber(diff)})
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Label htmlFor="rebalance-date" className="text-sm font-medium whitespace-nowrap">تاريخ التسوية:</Label>
                  <Input
                    id="rebalance-date"
                    type="date"
                    value={rebalanceDate}
                    onChange={(e) => setRebalanceDate(e.target.value)}
                    className="w-auto text-sm"
                    data-testid="input-rebalance-date"
                  />
                </div>
                {paymentDates.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">تواريخ دفعات العامل السابقة (اضغط للاختيار):</p>
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                      {paymentDates.map((pd) => (
                        <button
                          key={pd.date}
                          type="button"
                          onClick={() => setRebalanceDate(pd.date)}
                          className={`w-full flex items-center justify-between gap-2 text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
                            rebalanceDate === pd.date
                              ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200'
                              : 'bg-background hover:bg-muted/60 border-border'
                          }`}
                          data-testid={`btn-date-${pd.date}`}
                        >
                          <span className="font-medium">{formatDateBritish(pd.date)}</span>
                          <span className="text-muted-foreground">{formatNumber(pd.totalAmount)} ر.ي — {pd.sources}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                  <strong>ملاحظة تلقائية ستُضاف:</strong> &quot;تسوية رصيد قديم — ترحيل مستحقات العامل &quot;{previewData.workerName}&quot;&quot;
                  <br />
                  سيتم إنشاء {previewData.lines?.length ?? 0} ترحيل(ات) مالية + قيود محاسبية مزدوجة + مزامنة أرصدة العامل
                </AlertDescription>
              </Alert>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => { setPreviewData(null); setSelectedWorker(null); }}
                  data-testid="btn-cancel-preview"
                >
                  إلغاء
                </Button>
                <Button
                  variant="default"
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={() => setShowConfirmDialog(true)}
                  data-testid="btn-confirm-step1"
                >
                  <Play className="h-4 w-4 ml-2" />
                  تنفيذ التسوية
                </Button>
              </div>
            </div>
          ) : previewData && (previewData.lines?.length ?? 0) === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
              <p>لا توجد عمليات ترحيل مطلوبة لهذا العامل</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              تأكيد التنفيذ
            </DialogTitle>
            <DialogDescription>
              هل أنت متأكد من تنفيذ التسوية للعامل <strong>{previewData?.workerName}</strong>؟
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <p>سيتم ترحيل <strong>{formatNumber(previewData?.totalRebalanced || 0)}</strong> عبر <strong>{previewData?.lines?.length ?? 0}</strong> عمليات</p>
            <p className="text-muted-foreground">هذه العملية قابلة للعكس عبر معرف التسوية (rebalanceId)</p>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} data-testid="btn-cancel-confirm">
              تراجع
            </Button>
            <Button
              variant="destructive"
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleExecute}
              disabled={executeMutation.isPending}
              data-testid="btn-execute-final"
            >
              {executeMutation.isPending ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 ml-2" />
              )}
              تأكيد ونفذ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
