import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload, CheckCircle, XCircle, AlertTriangle, Eye, ThumbsUp, ThumbsDown,
  FileUp, Play, BarChart3, Users, Wallet,
} from "lucide-react";

const PROJECT_MAP: Record<string, string> = {
  '6c9d8a97': 'زين-الجراحي',
  '7212655c': 'زين-التحيتا',
  '00735182': 'محمد-الجراحي',
  'b23ad9a5': 'محمد-التحيتا',
};

function confidenceColor(c: number): string {
  if (c >= 0.9) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  if (c >= 0.7) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
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

export default function WAImportDashboard() {
  const { toast } = useToast();
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("batches");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
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
  const filteredCandidates = candidates.filter(c => {
    if (filterStatus !== 'all' && c.matchStatus !== filterStatus) return false;
    return true;
  });

  return (
    <div className="p-4 space-y-4" data-testid="wa-import-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">استيراد واتساب - لوحة المراجعة</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-main">
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="batches" data-testid="tab-batches">
            <Upload className="w-4 h-4 ml-1" /> الدُفعات
          </TabsTrigger>
          <TabsTrigger value="review" data-testid="tab-review">
            <Eye className="w-4 h-4 ml-1" /> المراجعة
          </TabsTrigger>
          <TabsTrigger value="reconciliation" data-testid="tab-reconciliation">
            <BarChart3 className="w-4 h-4 ml-1" /> المطابقة
          </TabsTrigger>
          <TabsTrigger value="custodians" data-testid="tab-custodians">
            <Wallet className="w-4 h-4 ml-1" /> أمناء العُهد
          </TabsTrigger>
        </TabsList>

        <TabsContent value="batches">
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-batches-title">دُفعات الاستيراد</CardTitle>
            </CardHeader>
            <CardContent>
              {batchesQuery.isLoading && <p>جاري التحميل...</p>}
              <Table data-testid="table-batches">
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>المصدر</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الرسائل</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(batchesQuery.data || []).map((batch: any) => (
                    <TableRow key={batch.id} data-testid={`row-batch-${batch.id}`}>
                      <TableCell>{batch.id}</TableCell>
                      <TableCell>{batch.chatSource || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={batch.status === 'completed' ? 'default' : 'secondary'}
                          data-testid={`badge-status-${batch.id}`}>
                          {batch.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{batch.totalMessages || 0}</TableCell>
                      <TableCell>{batch.createdAt ? new Date(batch.createdAt).toLocaleDateString('ar') : '-'}</TableCell>
                      <TableCell className="space-x-1 space-x-reverse">
                        <Button size="sm" variant="outline" data-testid={`button-view-${batch.id}`}
                          onClick={() => { setSelectedBatchId(batch.id); setActiveTab('review'); }}>
                          <Eye className="w-3 h-3 ml-1" /> عرض
                        </Button>
                        {batch.status === 'completed' && (
                          <>
                            <Button size="sm" variant="outline" data-testid={`button-extract-${batch.id}`}
                              onClick={() => extractMutation.mutate(batch.id)}
                              disabled={extractMutation.isPending}>
                              <Play className="w-3 h-3 ml-1" /> استخراج
                            </Button>
                            <Button size="sm" variant="outline" data-testid={`button-reconcile-${batch.id}`}
                              onClick={() => reconcileMutation.mutate(batch.id)}
                              disabled={reconcileMutation.isPending}>
                              <BarChart3 className="w-3 h-3 ml-1" /> مطابقة
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle data-testid="text-review-title">
                  مراجعة المرشحين {selectedBatchId ? `- دُفعة #${selectedBatchId}` : ''}
                </CardTitle>
                <div className="flex gap-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus} data-testid="select-filter-status">
                    <SelectTrigger className="w-32" data-testid="trigger-filter-status">
                      <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="new_entry">جديد</SelectItem>
                      <SelectItem value="exact_match">مطابق</SelectItem>
                      <SelectItem value="near_match">قريب</SelectItem>
                      <SelectItem value="conflict">تعارض</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedBatchId && (
                    <Button size="sm" data-testid="button-bulk-approve"
                      onClick={() => {
                        const pid = prompt('أدخل معرف المشروع للموافقة الجماعية');
                        if (pid) bulkApproveMutation.mutate({ batchId: selectedBatchId, projectId: pid, minConfidence: 0.95 });
                      }}
                      disabled={bulkApproveMutation.isPending}>
                      <ThumbsUp className="w-3 h-3 ml-1" /> موافقة جماعية (≥95%)
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedBatchId && <p className="text-muted-foreground" data-testid="text-no-batch">اختر دُفعة من تبويب الدُفعات</p>}
              {candidatesQuery.isLoading && <p>جاري التحميل...</p>}
              {selectedBatchId && (
                <Table data-testid="table-candidates">
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الوصف</TableHead>
                      <TableHead>الثقة</TableHead>
                      <TableHead>المطابقة</TableHead>
                      <TableHead>الفئة</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCandidates.map((c: any) => {
                      const confidence = parseFloat(c.confidence || '0');
                      return (
                        <TableRow key={c.id} data-testid={`row-candidate-${c.id}`}>
                          <TableCell>{c.id}</TableCell>
                          <TableCell data-testid={`text-type-${c.id}`}>
                            <Badge variant="outline">{c.candidateType}</Badge>
                          </TableCell>
                          <TableCell data-testid={`text-amount-${c.id}`}>
                            {parseFloat(c.amount || '0').toLocaleString('ar')} ر.ي
                          </TableCell>
                          <TableCell className="max-w-xs truncate" dir="rtl" data-testid={`text-desc-${c.id}`}>
                            {c.description || '-'}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-0.5 rounded text-xs ${confidenceColor(confidence)}`}
                              data-testid={`text-confidence-${c.id}`}>
                              {(confidence * 100).toFixed(0)}%
                            </span>
                          </TableCell>
                          <TableCell data-testid={`text-match-${c.id}`}>
                            {matchStatusBadge(c.matchStatus)}
                          </TableCell>
                          <TableCell data-testid={`text-category-${c.id}`}>
                            {c.category || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {!c.canonicalTransactionId && (
                                <>
                                  <Button size="sm" variant="default" data-testid={`button-approve-${c.id}`}
                                    onClick={() => { setApproveDialog({ candidateId: c.id, description: c.description || '' }); setApproveProjectId(''); setApproveNotes(''); }}>
                                    <ThumbsUp className="w-3 h-3" />
                                  </Button>
                                  <Button size="sm" variant="destructive" data-testid={`button-reject-${c.id}`}
                                    onClick={() => { setRejectDialog({ candidateId: c.id, description: c.description || '' }); setRejectReason(''); }}>
                                    <ThumbsDown className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                              {c.canonicalTransactionId && (
                                <Badge variant="secondary" data-testid={`badge-reviewed-${c.id}`}>
                                  <CheckCircle className="w-3 h-3 ml-1" /> تمت المراجعة
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation">
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-reconciliation-title">ملخص المطابقة</CardTitle>
            </CardHeader>
            <CardContent>
              {verificationQuery.isLoading && <p>جاري التحميل...</p>}
              {!selectedBatchId && <p className="text-muted-foreground">اختر دُفعة أولاً</p>}
              {selectedBatchId && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">إجمالي المرشحين</p>
                        <p className="text-2xl font-bold" data-testid="text-total-candidates">{candidates.length}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">جديد</p>
                        <p className="text-2xl font-bold text-green-600" data-testid="text-new-entries">
                          {candidates.filter((c: any) => c.matchStatus === 'new_entry').length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">مطابق</p>
                        <p className="text-2xl font-bold text-blue-600" data-testid="text-matched">
                          {candidates.filter((c: any) => c.matchStatus === 'exact_match').length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">تعارض</p>
                        <p className="text-2xl font-bold text-red-600" data-testid="text-conflicts">
                          {candidates.filter((c: any) => c.matchStatus === 'conflict').length}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  <Card>
                    <CardHeader><CardTitle className="text-sm">طابور التحقق</CardTitle></CardHeader>
                    <CardContent>
                      <Table data-testid="table-verification">
                        <TableHeader>
                          <TableRow>
                            <TableHead>المرشح</TableHead>
                            <TableHead>الأولوية</TableHead>
                            <TableHead>السبب</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(verificationQuery.data || []).map((item: any, i: number) => (
                            <TableRow key={i} data-testid={`row-verification-${i}`}>
                              <TableCell>{item.wa_verification_queue?.candidateId || '-'}</TableCell>
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
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custodians">
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-custodians-title">كشف حسابات أمناء العُهد</CardTitle>
            </CardHeader>
            <CardContent>
              {custodianQuery.isLoading && <p>جاري التحميل...</p>}
              <div className="space-y-4">
                {(custodianQuery.data || []).map((stmt: any, i: number) => (
                  <Card key={i} data-testid={`card-custodian-${i}`}>
                    <CardHeader>
                      <CardTitle className="text-lg" data-testid={`text-custodian-name-${i}`}>
                        <Users className="w-4 h-4 inline ml-1" />
                        {stmt.custodianName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="text-center p-2 bg-green-50 dark:bg-green-950 rounded">
                          <p className="text-xs text-muted-foreground">مُستلم</p>
                          <p className="font-bold text-green-700 dark:text-green-300" data-testid={`text-received-${i}`}>
                            {stmt.totalReceived?.toLocaleString('ar')}
                          </p>
                        </div>
                        <div className="text-center p-2 bg-red-50 dark:bg-red-950 rounded">
                          <p className="text-xs text-muted-foreground">مصروف</p>
                          <p className="font-bold text-red-700 dark:text-red-300" data-testid={`text-disbursed-${i}`}>
                            {stmt.totalDisbursed?.toLocaleString('ar')}
                          </p>
                        </div>
                        <div className="text-center p-2 bg-blue-50 dark:bg-blue-950 rounded">
                          <p className="text-xs text-muted-foreground">مُصفّى</p>
                          <p className="font-bold text-blue-700 dark:text-blue-300" data-testid={`text-settled-${i}`}>
                            {stmt.totalSettled?.toLocaleString('ar')}
                          </p>
                        </div>
                        <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                          <p className="text-xs text-muted-foreground">رصيد معلق</p>
                          <p className="font-bold text-yellow-700 dark:text-yellow-300" data-testid={`text-unsettled-${i}`}>
                            {stmt.unsettledBalance?.toLocaleString('ar')}
                          </p>
                        </div>
                        <div className="text-center p-2 bg-purple-50 dark:bg-purple-950 rounded">
                          <p className="text-xs text-muted-foreground">حساب شخصي</p>
                          <p className="font-bold text-purple-700 dark:text-purple-300" data-testid={`text-personal-${i}`}>
                            {stmt.personalAccountTotal?.toLocaleString('ar')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!approveDialog} onOpenChange={() => setApproveDialog(null)}>
        <DialogContent data-testid="dialog-approve">
          <DialogHeader>
            <DialogTitle>الموافقة على المرشح</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm" dir="rtl">{approveDialog?.description}</p>
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
              <ThumbsUp className="w-3 h-3 ml-1" /> موافقة
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
            <p className="text-sm" dir="rtl">{rejectDialog?.description}</p>
            <Textarea placeholder="سبب الرفض (مطلوب)" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              data-testid="input-reject-reason" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)} data-testid="button-cancel-reject">إلغاء</Button>
            <Button variant="destructive" onClick={() => {
              if (!rejectReason.trim()) { toast({ title: "أدخل سبب الرفض", variant: "destructive" }); return; }
              if (rejectDialog) rejectMutation.mutate({ candidateId: rejectDialog.candidateId, reason: rejectReason });
            }} disabled={rejectMutation.isPending} data-testid="button-confirm-reject">
              <ThumbsDown className="w-3 h-3 ml-1" /> رفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
