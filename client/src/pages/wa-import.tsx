import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import {
  Upload, CheckCircle, XCircle, AlertTriangle, Eye, ThumbsUp, ThumbsDown,
  Play, BarChart3, Users, Wallet, FileText, Package, TrendingUp, Clock,
  RefreshCw, Shield, Hash,
} from "lucide-react";

const PROJECT_MAP: Record<string, string> = {
  '6c9d8a97': 'زين-الجراحي',
  '7212655c': 'زين-التحيتا',
  '00735182': 'محمد-الجراحي',
  'b23ad9a5': 'محمد-التحيتا',
};

function confidenceColor(c: number): string {
  if (c >= 0.9) return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  if (c >= 0.7) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
}

function matchStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    exact_match: { label: "مطابق", variant: "secondary" },
    near_match: { label: "قريب", variant: "outline" },
    conflict: { label: "تعارض", variant: "destructive" },
    new_entry: { label: "جديد", variant: "default" },
  };
  const info = map[status] || { label: status, variant: "outline" as const };
  return <Badge variant={info.variant} data-testid={`badge-match-${status}`}>{info.label}</Badge>;
}

function statusLabel(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    completed: { label: "مكتمل", variant: "default" },
    pending: { label: "قيد الانتظار", variant: "secondary" },
    processing: { label: "جاري المعالجة", variant: "outline" },
    failed: { label: "فشل", variant: "destructive" },
  };
  const info = map[status] || { label: status, variant: "outline" as const };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

export default function WAImportDashboard() {
  const { toast } = useToast();
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("batches");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [approveDialog, setApproveDialog] = useState<{ candidateId: number; description: string } | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ candidateId: number; description: string } | null>(null);
  const [approveProjectId, setApproveProjectId] = useState("");
  const [approveNotes, setApproveNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const batchesQuery = useQuery<any[]>({ queryKey: ['/api/wa-import/batches'] });

  const candidatesQuery = useQuery<any[]>({
    queryKey: ['/api/wa-import/batch', selectedBatchId, 'candidates'],
    queryFn: () => fetch(`/api/wa-import/batch/${selectedBatchId}/candidates`).then(r => r.json()),
    enabled: !!selectedBatchId,
  });

  const verificationQuery = useQuery<any[]>({
    queryKey: ['/api/wa-import/batch', selectedBatchId, 'verification-queue'],
    queryFn: () => fetch(`/api/wa-import/batch/${selectedBatchId}/verification-queue`).then(r => r.json()),
    enabled: !!selectedBatchId,
  });

  const custodianQuery = useQuery<any[]>({
    queryKey: ['/api/wa-import/custodian-statements'],
    queryFn: () => fetch(`/api/wa-import/custodian-statements`).then(r => r.json()),
    enabled: activeTab === 'custodians',
  });

  const approveMutation = useMutation({
    mutationFn: (data: { candidateId: number; projectId: string; notes: string }) =>
      apiRequest('POST', `/api/wa-import/candidate/${data.candidateId}/approve`, {
        projectId: data.projectId,
        notes: data.notes,
      }),
    onSuccess: () => {
      toast({ title: "تمت الموافقة بنجاح" });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'verification-queue'] });
      setApproveDialog(null);
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: (data: { candidateId: number; reason: string }) =>
      apiRequest('POST', `/api/wa-import/candidate/${data.candidateId}/reject`, { reason: data.reason }),
    onSuccess: () => {
      toast({ title: "تم الرفض" });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'candidates'] });
      setRejectDialog(null);
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const bulkApproveMutation = useMutation({
    mutationFn: (data: { batchId: number; projectId: string; minConfidence: number }) =>
      apiRequest('POST', `/api/wa-import/batch/${data.batchId}/bulk-approve`, {
        projectId: data.projectId,
        minConfidence: data.minConfidence,
      }),
    onSuccess: (data: any) => {
      toast({ title: `تمت الموافقة الجماعية: ${data.approved || 0} عنصر` });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'candidates'] });
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const reconcileMutation = useMutation({
    mutationFn: (batchId: number) =>
      apiRequest('POST', `/api/wa-import/batch/${batchId}/reconcile`, {}),
    onSuccess: (data: any) => {
      toast({ title: "تمت المطابقة", description: `${data.totalCandidates} مرشح, ${data.newEntries} جديد` });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'verification-queue'] });
    },
    onError: (err: any) => toast({ title: "خطأ في المطابقة", description: err.message, variant: "destructive" }),
  });

  const extractMutation = useMutation({
    mutationFn: (batchId: number) =>
      apiRequest('POST', `/api/wa-import/batch/${batchId}/extract`, {}),
    onSuccess: () => {
      toast({ title: "تم الاستخراج بنجاح" });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'candidates'] });
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const candidates = candidatesQuery.data || [];
  const batches = batchesQuery.data || [];

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c: any) => {
      if (filterStatus !== 'all' && c.matchStatus !== filterStatus) return false;
      if (searchValue) {
        const s = searchValue.toLowerCase();
        return (c.description || '').toLowerCase().includes(s)
          || (c.candidateType || '').toLowerCase().includes(s)
          || (c.category || '').toLowerCase().includes(s);
      }
      return true;
    });
  }, [candidates, filterStatus, searchValue]);

  const statsCount = useMemo(() => ({
    total: candidates.length,
    newEntry: candidates.filter((c: any) => c.matchStatus === 'new_entry').length,
    matched: candidates.filter((c: any) => c.matchStatus === 'exact_match').length,
    nearMatch: candidates.filter((c: any) => c.matchStatus === 'near_match').length,
    conflict: candidates.filter((c: any) => c.matchStatus === 'conflict').length,
    reviewed: candidates.filter((c: any) => c.canonicalTransactionId).length,
  }), [candidates]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batches'] });
    if (selectedBatchId) {
      await queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'candidates'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'verification-queue'] });
    }
    setIsRefreshing(false);
  }, [selectedBatchId]);

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [{
    items: [
      { key: 'batches', label: 'الدُفعات', value: batches.length, icon: Upload, color: 'blue' as const },
      { key: 'candidates', label: 'المرشحين', value: statsCount.total, icon: FileText, color: 'indigo' as const },
      { key: 'reviewed', label: 'تمت مراجعته', value: statsCount.reviewed, icon: CheckCircle, color: 'green' as const },
      { key: 'conflicts', label: 'تعارضات', value: statsCount.conflict, icon: AlertTriangle, color: 'red' as const },
      { key: 'pending', label: 'بانتظار المراجعة', value: statsCount.total - statsCount.reviewed, icon: Clock, color: 'orange' as const },
    ],
    columns: 5 as const,
  }], [batches.length, statsCount]);

  const filtersConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'matchStatus',
      label: 'حالة المطابقة',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'الكل' },
        { value: 'new_entry', label: 'جديد' },
        { value: 'exact_match', label: 'مطابق' },
        { value: 'near_match', label: 'قريب' },
        { value: 'conflict', label: 'تعارض' },
      ],
      defaultValue: 'all',
    },
  ], []);

  const handleFilterChange = useCallback((key: string, value: any) => {
    if (key === 'matchStatus') setFilterStatus(value);
  }, []);

  return (
    <div className="container mx-auto p-4 space-y-4" data-testid="wa-import-page">
      <UnifiedFilterDashboard
        hideHeader={true}
        statsRows={statsRowsConfig}
        filters={filtersConfig}
        filterValues={{ matchStatus: filterStatus }}
        onFilterChange={handleFilterChange}
        onSearchChange={setSearchValue}
        searchValue={searchValue}
        searchPlaceholder="بحث في المرشحين..."
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onReset={() => { setFilterStatus('all'); setSearchValue(''); }}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-main">
        <TabsList className="w-full justify-start" data-testid="tabs-list">
          <TabsTrigger value="batches" className="gap-1.5" data-testid="tab-batches">
            <Upload className="w-4 h-4" /> الدُفعات
          </TabsTrigger>
          <TabsTrigger value="review" className="gap-1.5" data-testid="tab-review">
            <Eye className="w-4 h-4" /> المراجعة
            {statsCount.total - statsCount.reviewed > 0 && (
              <Badge variant="secondary" className="mr-1 text-xs px-1.5 py-0">
                {statsCount.total - statsCount.reviewed}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="gap-1.5" data-testid="tab-reconciliation">
            <BarChart3 className="w-4 h-4" /> المطابقة
          </TabsTrigger>
          <TabsTrigger value="custodians" className="gap-1.5" data-testid="tab-custodians">
            <Wallet className="w-4 h-4" /> أمناء العُهد
          </TabsTrigger>
        </TabsList>

        <TabsContent value="batches" className="mt-4">
          {batchesQuery.isLoading ? (
            <UnifiedCardGrid columns={3}>
              {Array.from({ length: 3 }).map((_, i) => (
                <UnifiedCard key={i} title="" fields={[]} isLoading={true} compact />
              ))}
            </UnifiedCardGrid>
          ) : batches.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <Upload className="h-12 w-12 opacity-20" />
                <p className="text-lg">لا توجد دُفعات مستوردة</p>
              </div>
            </Card>
          ) : (
            <UnifiedCardGrid columns={3}>
              {batches.map((batch: any) => (
                <UnifiedCard
                  key={batch.id}
                  data-testid={`card-batch-${batch.id}`}
                  title={`دُفعة #${batch.id}`}
                  titleIcon={Package}
                  badges={[
                    {
                      label: batch.status === 'completed' ? 'مكتمل' : batch.status === 'pending' ? 'قيد الانتظار' : batch.status,
                      variant: batch.status === 'completed' ? 'success' as any : 'secondary',
                    }
                  ]}
                  fields={[
                    { label: 'المصدر', value: batch.chatSource || '-', icon: FileText },
                    { label: 'الرسائل', value: batch.totalMessages || 0, icon: Hash },
                    { label: 'التاريخ', value: batch.createdAt ? new Date(batch.createdAt).toLocaleDateString('ar') : '-', icon: Clock },
                  ]}
                  actions={[
                    {
                      icon: Eye,
                      label: 'عرض',
                      onClick: () => { setSelectedBatchId(batch.id); setActiveTab('review'); },
                    },
                    ...(batch.status === 'completed' ? [
                      {
                        icon: Play,
                        label: 'استخراج',
                        onClick: () => extractMutation.mutate(batch.id),
                        disabled: extractMutation.isPending,
                        color: 'blue' as const,
                      },
                      {
                        icon: BarChart3,
                        label: 'مطابقة',
                        onClick: () => reconcileMutation.mutate(batch.id),
                        disabled: reconcileMutation.isPending,
                        color: 'green' as const,
                      },
                    ] : []),
                  ]}
                  compact
                />
              ))}
            </UnifiedCardGrid>
          )}
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          <div className="space-y-4">
            {selectedBatchId && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">
                    دُفعة #{selectedBatchId}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {filteredCandidates.length} من {candidates.length} مرشح
                  </span>
                </div>
                <Button size="sm" data-testid="button-bulk-approve"
                  onClick={() => {
                    const pid = prompt('أدخل معرف المشروع للموافقة الجماعية');
                    if (pid) bulkApproveMutation.mutate({ batchId: selectedBatchId, projectId: pid, minConfidence: 0.95 });
                  }}
                  disabled={bulkApproveMutation.isPending}>
                  <ThumbsUp className="w-3.5 h-3.5 ml-1.5" /> موافقة جماعية (≥95%)
                </Button>
              </div>
            )}

            {!selectedBatchId && (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <Eye className="h-12 w-12 opacity-20" />
                  <p className="text-lg" data-testid="text-no-batch">اختر دُفعة من تبويب الدُفعات للبدء بالمراجعة</p>
                </div>
              </Card>
            )}

            {candidatesQuery.isLoading && (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            )}

            {selectedBatchId && !candidatesQuery.isLoading && filteredCandidates.length === 0 && (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 opacity-20" />
                  <p className="text-lg">لا توجد نتائج مطابقة للفلاتر</p>
                  <Button variant="outline" onClick={() => { setFilterStatus('all'); setSearchValue(''); }}>
                    مسح الفلاتر
                  </Button>
                </div>
              </Card>
            )}

            {selectedBatchId && filteredCandidates.length > 0 && (
              <Card>
                <CardContent className="p-0">
                  <Table data-testid="table-candidates">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>الوصف</TableHead>
                        <TableHead>الثقة</TableHead>
                        <TableHead>المطابقة</TableHead>
                        <TableHead>الفئة</TableHead>
                        <TableHead className="w-28">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCandidates.map((c: any) => {
                        const confidence = parseFloat(c.confidence || '0');
                        return (
                          <TableRow key={c.id} data-testid={`row-candidate-${c.id}`}>
                            <TableCell className="font-medium text-muted-foreground">{c.id}</TableCell>
                            <TableCell data-testid={`text-type-${c.id}`}>
                              <Badge variant="outline">{c.candidateType}</Badge>
                            </TableCell>
                            <TableCell data-testid={`text-amount-${c.id}`} className="font-semibold tabular-nums">
                              {parseFloat(c.amount || '0').toLocaleString('ar')} ر.ي
                            </TableCell>
                            <TableCell className="max-w-xs truncate" dir="rtl" data-testid={`text-desc-${c.id}`}>
                              {c.description || '-'}
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${confidenceColor(confidence)}`}
                                data-testid={`text-confidence-${c.id}`}>
                                {(confidence * 100).toFixed(0)}%
                              </span>
                            </TableCell>
                            <TableCell data-testid={`text-match-${c.id}`}>
                              {matchStatusBadge(c.matchStatus)}
                            </TableCell>
                            <TableCell data-testid={`text-category-${c.id}`}>
                              <span className="text-sm text-muted-foreground">{c.category || '-'}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {!c.canonicalTransactionId && (
                                  <>
                                    <Button size="sm" variant="default" className="h-7 w-7 p-0" data-testid={`button-approve-${c.id}`}
                                      onClick={() => { setApproveDialog({ candidateId: c.id, description: c.description || '' }); setApproveProjectId(''); setApproveNotes(''); }}>
                                      <ThumbsUp className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button size="sm" variant="destructive" className="h-7 w-7 p-0" data-testid={`button-reject-${c.id}`}
                                      onClick={() => { setRejectDialog({ candidateId: c.id, description: c.description || '' }); setRejectReason(''); }}>
                                      <ThumbsDown className="w-3.5 h-3.5" />
                                    </Button>
                                  </>
                                )}
                                {c.canonicalTransactionId && (
                                  <Badge variant="secondary" className="gap-1" data-testid={`badge-reviewed-${c.id}`}>
                                    <CheckCircle className="w-3 h-3" /> تمت المراجعة
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reconciliation" className="mt-4">
          {!selectedBatchId ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <BarChart3 className="h-12 w-12 opacity-20" />
                <p className="text-lg">اختر دُفعة أولاً لعرض ملخص المطابقة</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              <UnifiedCardGrid columns={4}>
                <UnifiedCard
                  title="إجمالي المرشحين"
                  titleIcon={FileText}
                  fields={[{ label: 'العدد', value: statsCount.total, emphasis: true }]}
                  compact
                  data-testid="card-stat-total"
                />
                <UnifiedCard
                  title="جديد"
                  titleIcon={TrendingUp}
                  fields={[{ label: 'العدد', value: statsCount.newEntry, emphasis: true, color: 'success' }]}
                  compact
                  data-testid="card-stat-new"
                />
                <UnifiedCard
                  title="مطابق"
                  titleIcon={CheckCircle}
                  fields={[{ label: 'العدد', value: statsCount.matched, emphasis: true, color: 'info' }]}
                  compact
                  data-testid="card-stat-matched"
                />
                <UnifiedCard
                  title="تعارض"
                  titleIcon={AlertTriangle}
                  fields={[{ label: 'العدد', value: statsCount.conflict, emphasis: true, color: 'danger' }]}
                  compact
                  data-testid="card-stat-conflicts"
                />
              </UnifiedCardGrid>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4" /> طابور التحقق
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {verificationQuery.isLoading ? (
                    <div className="p-4 space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : (
                    <Table data-testid="table-verification">
                      <TableHeader>
                        <TableRow>
                          <TableHead>المرشح</TableHead>
                          <TableHead>الأولوية</TableHead>
                          <TableHead>السبب</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(verificationQuery.data || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                              لا توجد عناصر في طابور التحقق
                            </TableCell>
                          </TableRow>
                        ) : (
                          (verificationQuery.data || []).map((item: any, i: number) => (
                            <TableRow key={i} data-testid={`row-verification-${i}`}>
                              <TableCell className="font-medium">{item.wa_verification_queue?.candidateId || '-'}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  item.wa_verification_queue?.priority === 'P1_critical' ? 'destructive' :
                                  item.wa_verification_queue?.priority === 'P2_high' ? 'default' : 'secondary'
                                } data-testid={`badge-priority-${i}`}>
                                  {item.wa_verification_queue?.priority}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-sm truncate" data-testid={`text-reason-${i}`}>
                                {item.wa_verification_queue?.reason}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="custodians" className="mt-4">
          {custodianQuery.isLoading ? (
            <UnifiedCardGrid columns={1}>
              {Array.from({ length: 2 }).map((_, i) => (
                <UnifiedCard key={i} title="" fields={[]} isLoading={true} />
              ))}
            </UnifiedCardGrid>
          ) : (custodianQuery.data || []).length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <Users className="h-12 w-12 opacity-20" />
                <p className="text-lg">لا توجد بيانات أمناء عُهد</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {(custodianQuery.data || []).map((stmt: any, i: number) => (
                <Card key={i} data-testid={`card-custodian-${i}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2" data-testid={`text-custodian-name-${i}`}>
                      <Users className="w-5 h-5 text-primary" />
                      {stmt.custodianName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-xs text-muted-foreground mb-1">مُستلم</p>
                        <p className="font-bold text-green-700 dark:text-green-300 tabular-nums" data-testid={`text-received-${i}`}>
                          {stmt.totalReceived?.toLocaleString('ar')}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                        <p className="text-xs text-muted-foreground mb-1">مصروف</p>
                        <p className="font-bold text-red-700 dark:text-red-300 tabular-nums" data-testid={`text-disbursed-${i}`}>
                          {stmt.totalDisbursed?.toLocaleString('ar')}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-muted-foreground mb-1">مُصفّى</p>
                        <p className="font-bold text-blue-700 dark:text-blue-300 tabular-nums" data-testid={`text-settled-${i}`}>
                          {stmt.totalSettled?.toLocaleString('ar')}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <p className="text-xs text-muted-foreground mb-1">رصيد معلق</p>
                        <p className="font-bold text-yellow-700 dark:text-yellow-300 tabular-nums" data-testid={`text-unsettled-${i}`}>
                          {stmt.unsettledBalance?.toLocaleString('ar')}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-xs text-muted-foreground mb-1">حساب شخصي</p>
                        <p className="font-bold text-purple-700 dark:text-purple-300 tabular-nums" data-testid={`text-personal-${i}`}>
                          {stmt.personalAccountTotal?.toLocaleString('ar')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!approveDialog} onOpenChange={() => setApproveDialog(null)}>
        <DialogContent data-testid="dialog-approve">
          <DialogHeader>
            <DialogTitle>الموافقة على المرشح</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground" dir="rtl">{approveDialog?.description}</p>
            <Select value={approveProjectId} onValueChange={setApproveProjectId}>
              <SelectTrigger data-testid="select-approve-project">
                <SelectValue placeholder="اختر المشروع" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROJECT_MAP).map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea placeholder="ملاحظات (اختياري)" value={approveNotes} onChange={e => setApproveNotes(e.target.value)}
              data-testid="input-approve-notes" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(null)} data-testid="button-cancel-approve">إلغاء</Button>
            <Button onClick={() => {
              if (!approveProjectId) { toast({ title: "اختر المشروع", variant: "destructive" }); return; }
              if (approveDialog) approveMutation.mutate({ candidateId: approveDialog.candidateId, projectId: approveProjectId, notes: approveNotes });
            }} disabled={approveMutation.isPending} data-testid="button-confirm-approve">
              <ThumbsUp className="w-3.5 h-3.5 ml-1.5" /> موافقة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent data-testid="dialog-reject">
          <DialogHeader>
            <DialogTitle>رفض المرشح</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground" dir="rtl">{rejectDialog?.description}</p>
            <Textarea placeholder="سبب الرفض (مطلوب)" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              data-testid="input-reject-reason" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)} data-testid="button-cancel-reject">إلغاء</Button>
            <Button variant="destructive" onClick={() => {
              if (!rejectReason.trim()) { toast({ title: "أدخل سبب الرفض", variant: "destructive" }); return; }
              if (rejectDialog) rejectMutation.mutate({ candidateId: rejectDialog.candidateId, reason: rejectReason });
            }} disabled={rejectMutation.isPending} data-testid="button-confirm-reject">
              <ThumbsDown className="w-3.5 h-3.5 ml-1.5" /> رفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
