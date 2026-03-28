import { useState, useMemo, useCallback, useRef, useEffect, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  RefreshCw, Shield, Hash, Pencil, Merge, Split, Search, Plus, Trash2,
  Link2, ArrowLeftRight, Paperclip, Image, Download, File,
} from "lucide-react";

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

  const [editDialog, setEditDialog] = useState<{ candidateId: number; amount: string; description: string } | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelected, setMergeSelected] = useState<number[]>([]);
  const [mergeProjectId, setMergeProjectId] = useState("");

  const [splitDialog, setSplitDialog] = useState<{ candidateId: number; amount: string; description: string } | null>(null);
  const [splitProjectId, setSplitProjectId] = useState("");
  const [splitItems, setSplitItems] = useState<{ amount: string; description: string }[]>([{ amount: '', description: '' }, { amount: '', description: '' }]);

  const [mediaPreviewDialog, setMediaPreviewDialog] = useState<{ candidateId: number; description: string } | null>(null);

  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const [aliasDialog, setAliasDialog] = useState(false);
  const [newAliasName, setNewAliasName] = useState("");
  const [newAliasWorkerId, setNewAliasWorkerId] = useState("");
  const [workerSearchQuery, setWorkerSearchQuery] = useState("");

  const [nameLinkingDialog, setNameLinkingDialog] = useState(false);
  const [nameLinkingBatchId, setNameLinkingBatchId] = useState<number | null>(null);
  const [nameLinkingSearch, setNameLinkingSearch] = useState("");
  const [linkSelections, setLinkSelections] = useState<Record<number, { entityId: string; entityTable: string }>>({});
  const [workerSearchPerAlias, setWorkerSearchPerAlias] = useState<Record<number, string>>({});

  type PipelineStage = 'idle' | 'media' | 'names' | 'autolink' | 'linking' | 'extract' | 'done' | 'error';
  const [pipelineDialog, setPipelineDialog] = useState(false);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>('idle');
  const [pipelineResults, setPipelineResults] = useState<Record<string, any>>({});
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [pipelineBatchId, setPipelineBatchId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setFloatingAction, setRefreshAction } = useFloatingButton();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const headers: Record<string, string> = {};
      try {
        const { shouldUseBearerAuth: checkBearer, getAccessToken: getToken } = await import('@/lib/auth-token-store');
        if (checkBearer()) {
          const token = getToken();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (_e) { /* cookie auth fallback */ }
      const res = await fetch('/api/wa-import/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'فشل الرفع' }));
        throw new Error(err.error || err.message || 'فشل الرفع');
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "تم الاستيراد بنجاح", description: `دُفعة #${data.batch?.id || ''} — ${data.batch?.totalMessages || 0} رسالة` });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batches'] });
      setActiveTab('batches');
    },
    onError: (err: any) => toast({ title: "خطأ في الاستيراد", description: err.message, variant: "destructive" }),
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast({ title: "نوع ملف غير مدعوم", description: "يرجى اختيار ملف .zip من تصدير واتساب", variant: "destructive" });
      return;
    }
    uploadMutation.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [uploadMutation, toast]);

  const projectsQuery = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/wa-import/projects'],
    queryFn: () => apiRequest('/api/wa-import/projects'),
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const projectsList = projectsQuery.data || [];

  const batchesQuery = useQuery<any[]>({
    queryKey: ['/api/wa-import/batches'],
    queryFn: () => apiRequest('/api/wa-import/batches'),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const candidatesQuery = useQuery<any[]>({
    queryKey: ['/api/wa-import/batch', selectedBatchId, 'candidates'],
    queryFn: () => apiRequest(`/api/wa-import/batch/${selectedBatchId}/candidates`),
    enabled: !!selectedBatchId,
  });

  const verificationQuery = useQuery<any[]>({
    queryKey: ['/api/wa-import/batch', selectedBatchId, 'verification-queue'],
    queryFn: () => apiRequest(`/api/wa-import/batch/${selectedBatchId}/verification-queue`),
    enabled: !!selectedBatchId,
  });

  const custodianQuery = useQuery<any[]>({
    queryKey: ['/api/wa-import/custodian-statements'],
    queryFn: () => apiRequest(`/api/wa-import/custodian-statements`),
    enabled: activeTab === 'custodians',
  });

  const aliasesQuery = useQuery<any[]>({
    queryKey: ['/api/wa-import/aliases'],
    queryFn: () => apiRequest(`/api/wa-import/aliases`),
    enabled: activeTab === 'aliases',
  });

  const batchMediaQuery = useQuery<any[]>({
    queryKey: ['/api/wa-import/batch', selectedBatchId, 'media'],
    queryFn: () => apiRequest(`/api/wa-import/batch/${selectedBatchId}/media`),
    enabled: !!selectedBatchId,
  });

  const candidateEvidenceQuery = useQuery<any>({
    queryKey: ['/api/wa-import/candidate', mediaPreviewDialog?.candidateId],
    queryFn: () => apiRequest(`/api/wa-import/candidate/${mediaPreviewDialog!.candidateId}`),
    enabled: !!mediaPreviewDialog?.candidateId,
  });

  const loansQuery = useQuery<any[]>({
    queryKey: ['/api/wa-import/inter-contractor-loans'],
    queryFn: () => apiRequest(`/api/wa-import/inter-contractor-loans`),
    enabled: activeTab === 'loans',
  });

  const workersSearchQuery = useQuery<any[]>({
    queryKey: ['/api/wa-import/workers-search', workerSearchQuery],
    queryFn: () => apiRequest(`/api/wa-import/workers-search?q=${encodeURIComponent(workerSearchQuery)}`),
    enabled: aliasDialog && workerSearchQuery.length > 0,
  });

  const nameLinkingActive = (nameLinkingDialog || pipelineStage === 'linking') && !!nameLinkingBatchId;

  const discoveredNamesQuery = useQuery<any[]>({
    queryKey: ['/api/wa-import/batches', nameLinkingBatchId, 'discovered-names'],
    queryFn: () => apiRequest(`/api/wa-import/batches/${nameLinkingBatchId}/discovered-names`),
    enabled: nameLinkingActive,
  });

  const allWorkersQuery = useQuery<any[]>({
    queryKey: ['/api/wa-import/workers-search', '_all_'],
    queryFn: () => apiRequest(`/api/wa-import/workers-search?q=`),
    enabled: nameLinkingActive,
  });

  const extractNamesMutation = useMutation({
    mutationFn: (batchId: number) =>
      apiRequest(`/api/wa-import/batches/${batchId}/extract-names`, 'POST', {}),
    onSuccess: (data: any, batchId: number) => {
      const msg = `تم استخراج ${data.totalNames || 0} اسم (${data.newNames || 0} جديد، ${data.unlinkedNames || 0} غير مربوط)`;
      toast({ title: "تم استخراج الأسماء", description: msg });
      if ((data.unlinkedNames || 0) > 0) {
        setNameLinkingBatchId(batchId);
        setNameLinkingDialog(true);
        setLinkSelections({});
        setWorkerSearchPerAlias({});
        setNameLinkingSearch("");
      }
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batches', batchId, 'discovered-names'] });
    },
    onError: (err: any) => toast({ title: "خطأ في استخراج الأسماء", description: err.message, variant: "destructive" }),
  });

  const autoLinkMutation = useMutation({
    mutationFn: () => apiRequest(`/api/wa-import/names/auto-link`, 'POST', {}),
    onSuccess: (data: any) => {
      toast({ title: "تم الربط التلقائي", description: `تم ربط ${data.linked || 0} اسم` });
      if (nameLinkingBatchId) {
        queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batches', nameLinkingBatchId, 'discovered-names'] });
      }
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const linkNameMutation = useMutation({
    mutationFn: (data: { aliasId: number; entityId: string; entityTable: string }) =>
      apiRequest(`/api/wa-import/names/${data.aliasId}/link`, 'POST', { entityId: data.entityId, entityTable: data.entityTable }),
    onSuccess: (_data: any, variables: { aliasId: number }) => {
      toast({ title: "تم الربط بنجاح" });
      if (nameLinkingBatchId) {
        queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batches', nameLinkingBatchId, 'discovered-names'] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/aliases'] });
      setLinkSelections(prev => { const next = { ...prev }; delete next[variables.aliasId]; return next; });
    },
    onError: (err: any) => toast({ title: "خطأ في الربط", description: err.message, variant: "destructive" }),
  });

  const runFullPipeline = useCallback(async (batchId: number) => {
    setPipelineBatchId(batchId);
    setPipelineDialog(true);
    setPipelineStage('media');
    setPipelineResults({});
    setPipelineError(null);

    try {
      let mediaResult: any = { skipped: 0, processed: 0, failed: 0 };
      try {
        mediaResult = await apiRequest(`/api/wa-import/batch/${batchId}/process-media`, 'POST', {});
      } catch (_e) { /* non-blocking */ }
      setPipelineResults(prev => ({ ...prev, media: mediaResult }));

      setPipelineStage('names');
      const namesResult = await apiRequest(`/api/wa-import/batches/${batchId}/extract-names`, 'POST', {});
      setPipelineResults(prev => ({ ...prev, names: namesResult }));

      setPipelineStage('autolink');
      let autoLinkResult: any = { linked: 0 };
      try {
        autoLinkResult = await apiRequest(`/api/wa-import/names/auto-link`, 'POST', { batchId });
      } catch (_e) { /* non-blocking */ }
      setPipelineResults(prev => ({ ...prev, autoLink: autoLinkResult }));

      if ((namesResult.unlinkedNames || 0) - (autoLinkResult.linked || 0) > 0) {
        setNameLinkingBatchId(batchId);
        setPipelineStage('linking');
        setLinkSelections({});
        setWorkerSearchPerAlias({});
        setNameLinkingSearch("");
      } else {
        setPipelineStage('extract');
        const extResult = await apiRequest(`/api/wa-import/batch/${batchId}/extract`, 'POST', {});
        setPipelineResults(prev => ({ ...prev, extract: extResult }));
        setPipelineStage('done');
        queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', batchId, 'candidates'] });
        queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batches'] });
      }
    } catch (err: any) {
      setPipelineError(err.message || 'حدث خطأ');
      setPipelineStage('error');
    }
  }, [queryClient]);

  const continuePipelineAfterLinking = useCallback(async () => {
    if (!pipelineBatchId) return;
    setPipelineStage('extract');
    setPipelineError(null);
    try {
      const extResult = await apiRequest(`/api/wa-import/batch/${pipelineBatchId}/extract`, 'POST', {});
      setPipelineResults(prev => ({ ...prev, extract: extResult }));
      setPipelineStage('done');
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', pipelineBatchId, 'candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batches'] });
    } catch (err: any) {
      setPipelineError(err.message || 'حدث خطأ');
      setPipelineStage('error');
    }
  }, [pipelineBatchId, queryClient]);

  const bulkLinkMutation = useMutation({
    mutationFn: (data: { links: Array<{ aliasId: number; entityId: string; entityTable: string }> }) =>
      apiRequest(`/api/wa-import/names/bulk-link`, 'POST', data),
    onSuccess: () => {
      toast({ title: "تم الربط الجماعي بنجاح" });
      if (nameLinkingBatchId) {
        queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batches', nameLinkingBatchId, 'discovered-names'] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/aliases'] });
      setLinkSelections({});
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: (data: { candidateId: number; projectId: string; notes: string }) =>
      apiRequest(`/api/wa-import/candidate/${data.candidateId}/approve`, 'POST', {
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
      apiRequest(`/api/wa-import/candidate/${data.candidateId}/reject`, 'POST', { reason: data.reason }),
    onSuccess: () => {
      toast({ title: "تم الرفض" });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'candidates'] });
      setRejectDialog(null);
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const bulkApproveMutation = useMutation({
    mutationFn: (data: { batchId: number; projectId: string; minConfidence: number }) =>
      apiRequest(`/api/wa-import/batch/${data.batchId}/bulk-approve`, 'POST', {
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
      apiRequest(`/api/wa-import/batch/${batchId}/reconcile`, 'POST', {}),
    onSuccess: (data: any) => {
      toast({ title: "تمت المطابقة", description: `${data.totalCandidates} مرشح, ${data.newEntries} جديد` });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'verification-queue'] });
    },
    onError: (err: any) => toast({ title: "خطأ في المطابقة", description: err.message, variant: "destructive" }),
  });

  const extractMutation = useMutation({
    mutationFn: (batchId: number) =>
      apiRequest(`/api/wa-import/batch/${batchId}/extract`, 'POST', {}),
    onSuccess: () => {
      toast({ title: "تم الاستخراج بنجاح" });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'candidates'] });
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const processMediaMutation = useMutation({
    mutationFn: (batchId: number) =>
      apiRequest(`/api/wa-import/batch/${batchId}/process-media`, 'POST', {}),
    onSuccess: (data: any, batchId: number) => {
      toast({
        title: "تمت معالجة الوسائط",
        description: `تمت المعالجة: ${data.processed || 0} | فشل: ${data.failed || 0} | تم تخطيه: ${data.skipped || 0}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', batchId, 'media'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', batchId, 'candidates'] });
    },
    onError: (err: any) => toast({ title: "خطأ في معالجة الوسائط", description: err.message, variant: "destructive" }),
  });

  const deleteBatchMutation = useMutation({
    mutationFn: (batchId: number) =>
      apiRequest(`/api/wa-import/batches/${batchId}`, 'DELETE'),
    onSuccess: (_data: any, batchId: number) => {
      toast({ title: "تم حذف الدُفعة بنجاح" });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batches'] });
      if (selectedBatchId === batchId) setSelectedBatchId(null);
    },
    onError: (err: any) => toast({ title: "خطأ في حذف الدُفعة", description: err.message, variant: "destructive" }),
  });

  const editCandidateMutation = useMutation({
    mutationFn: (data: { candidateId: number; amount?: string; description?: string }) =>
      apiRequest(`/api/wa-import/candidate/${data.candidateId}`, 'PATCH', {
        amount: data.amount,
        description: data.description,
      }),
    onSuccess: () => {
      toast({ title: "تم التعديل بنجاح" });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'candidates'] });
      setEditDialog(null);
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const mergeMutation = useMutation({
    mutationFn: (data: { candidateIds: number[]; projectId: string }) =>
      apiRequest(`/api/wa-import/candidates/merge`, 'POST', data),
    onSuccess: () => {
      toast({ title: "تم الدمج بنجاح" });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'candidates'] });
      setMergeMode(false);
      setMergeSelected([]);
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const splitMutation = useMutation({
    mutationFn: (data: { candidateId: number; projectId: string; splits: { amount: string; description: string }[] }) =>
      apiRequest(`/api/wa-import/candidate/${data.candidateId}/split`, 'POST', {
        projectId: data.projectId,
        splits: data.splits,
      }),
    onSuccess: () => {
      toast({ title: "تم التقسيم بنجاح" });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'candidates'] });
      setSplitDialog(null);
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const createAliasMutation = useMutation({
    mutationFn: (data: { aliasName: string; canonicalWorkerId: string }) =>
      apiRequest(`/api/wa-import/aliases`, 'POST', data),
    onSuccess: () => {
      toast({ title: "تمت إضافة الاسم المستعار" });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/aliases'] });
      setAliasDialog(false);
      setNewAliasName("");
      setNewAliasWorkerId("");
      setWorkerSearchQuery("");
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteAliasMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/wa-import/aliases/${id}`, 'DELETE'),
    onSuccess: () => {
      toast({ title: "تم الحذف" });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/aliases'] });
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const candidates = candidatesQuery.data || [];
  const batches = batchesQuery.data || [];

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c: any) => {
      if (filterStatus !== 'all' && c.matchStatus !== filterStatus) return false;
      if (confidenceFilter !== 'all') {
        const conf = parseFloat(c.confidence || '0');
        if (confidenceFilter === 'high' && conf < 0.8) return false;
        if (confidenceFilter === 'medium' && (conf < 0.5 || conf >= 0.8)) return false;
        if (confidenceFilter === 'low' && conf >= 0.5) return false;
      }
      if (searchValue) {
        const s = searchValue.toLowerCase();
        return (c.description || '').toLowerCase().includes(s)
          || (c.candidateType || '').toLowerCase().includes(s)
          || (c.category || '').toLowerCase().includes(s);
      }
      return true;
    });
  }, [candidates, filterStatus, confidenceFilter, searchValue]);

  const statsCount = useMemo(() => ({
    total: candidates.length,
    newEntry: candidates.filter((c: any) => c.matchStatus === 'new_entry').length,
    matched: candidates.filter((c: any) => c.matchStatus === 'exact_match').length,
    nearMatch: candidates.filter((c: any) => c.matchStatus === 'near_match').length,
    conflict: candidates.filter((c: any) => c.matchStatus === 'conflict').length,
    reviewed: candidates.filter((c: any) => c.canonicalTransactionId).length,
  }), [candidates]);

  const reviewStats = useMemo(() => {
    const byType = { transfer: 0, expense: 0, special: 0, other: 0 };
    const byConfidence = { high: 0, medium: 0, low: 0 };
    const byStatus = { pending: 0, approved: 0, rejected: 0 };
    candidates.forEach((c: any) => {
      const t = (c.candidateType || '').toLowerCase();
      if (t.includes('transfer')) byType.transfer++;
      else if (t.includes('expense')) byType.expense++;
      else if (t.includes('special')) byType.special++;
      else byType.other++;

      const conf = parseFloat(c.confidence || '0');
      if (conf >= 0.8) byConfidence.high++;
      else if (conf >= 0.5) byConfidence.medium++;
      else byConfidence.low++;

      if (c.canonicalTransactionId) {
        if (['confirmed', 'posted'].includes(c.canonicalStatus || '')) byStatus.approved++;
        else if (c.canonicalStatus === 'excluded') byStatus.rejected++;
        else byStatus.approved++;
      } else {
        byStatus.pending++;
      }
    });
    return { byType, byConfidence, byStatus };
  }, [candidates]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batches'] });
    if (selectedBatchId) {
      await queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'candidates'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'verification-queue'] });
    }
    setIsRefreshing(false);
  }, [selectedBatchId]);

  useEffect(() => {
    if (activeTab === 'aliases') {
      setFloatingAction(() => { setAliasDialog(true); setNewAliasName(""); setNewAliasWorkerId(""); setWorkerSearchQuery(""); }, 'إضافة اسم مستعار', 'cyan');
    } else {
      const triggerUpload = () => fileInputRef.current?.click();
      setFloatingAction(triggerUpload, 'استيراد محادثة', 'cyan');
    }
    return () => {
      setFloatingAction(null);
      setRefreshAction(null);
    };
  }, [activeTab, setFloatingAction, setRefreshAction]);

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [{
    items: [
      { key: 'batches', label: 'الدُفعات', value: batches.length, icon: Upload, color: 'blue' as const },
      { key: 'candidates', label: 'المرشحين', value: statsCount.total, icon: FileText, color: 'indigo' as const },
      { key: 'reviewed', label: 'تمت مراجعته', value: statsCount.reviewed, icon: CheckCircle, color: 'green' as const },
    ],
    columns: 3 as const,
  }, {
    items: [
      { key: 'conflicts', label: 'تعارضات', value: statsCount.conflict, icon: AlertTriangle, color: 'red' as const },
      { key: 'pending', label: 'بانتظار المراجعة', value: statsCount.total - statsCount.reviewed, icon: Clock, color: 'orange' as const },
    ],
    columns: 3 as const,
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

  const toggleMergeCandidate = (id: number) => {
    setMergeSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

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
        onReset={() => { setFilterStatus('all'); setConfidenceFilter('all'); setSearchValue(''); }}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-main">
        <TabsList className="w-full justify-start gap-0.5" data-testid="tabs-list">
          {[
            { value: 'batches', label: 'الدُفعات', icon: Upload, badge: 0 },
            { value: 'review', label: 'المراجعة', icon: Eye, badge: statsCount.total - statsCount.reviewed },
            { value: 'reconciliation', label: 'المطابقة', icon: BarChart3, badge: 0 },
            { value: 'custodians', label: 'أمناء العُهد', icon: Wallet, badge: 0 },
            { value: 'aliases', label: 'الأسماء المستعارة', icon: Users, badge: 0 },
            { value: 'loans', label: 'قروض المقاولين', icon: ArrowLeftRight, badge: 0 },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-1 px-2.5 py-1.5 transition-all duration-200"
                data-testid={`tab-${tab.value}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {isActive && <span className="text-xs whitespace-nowrap">{tab.label}</span>}
                {tab.badge > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 min-w-[18px] h-[18px] flex items-center justify-center">
                    {tab.badge}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="batches" className="mt-4">
          {batchesQuery.isError ? (
            <Card className="p-8 text-center border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
              <div className="flex flex-col items-center gap-3 text-red-600 dark:text-red-400" data-testid="error-batches">
                <AlertTriangle className="h-10 w-10" />
                <p className="text-lg font-medium">فشل تحميل الدُفعات</p>
                <p className="text-sm text-red-500 dark:text-red-400/80">{(batchesQuery.error as any)?.message || 'خطأ غير معروف'}</p>
                <Button variant="outline" size="sm" onClick={() => batchesQuery.refetch()} data-testid="btn-retry-batches">
                  <RefreshCw className="w-4 h-4 ml-1.5" /> إعادة المحاولة
                </Button>
              </div>
            </Card>
          ) : batchesQuery.isLoading ? (
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
                        icon: FileText,
                        label: 'معالجة الوسائط',
                        onClick: () => processMediaMutation.mutate(batch.id),
                        disabled: processMediaMutation.isPending,
                        color: 'purple' as const,
                      },
                      {
                        icon: Play,
                        label: 'تحليل كامل',
                        onClick: () => runFullPipeline(batch.id),
                        disabled: pipelineDialog,
                        color: 'blue' as const,
                      },
                      {
                        icon: Users,
                        label: 'استخراج أسماء فقط',
                        onClick: () => extractNamesMutation.mutate(batch.id),
                        disabled: extractNamesMutation.isPending,
                        color: 'orange' as const,
                      },
                      {
                        icon: BarChart3,
                        label: 'مطابقة',
                        onClick: () => reconcileMutation.mutate(batch.id),
                        disabled: reconcileMutation.isPending,
                        color: 'green' as const,
                      },
                    ] : []),
                    {
                      icon: Trash2,
                      label: 'حذف الدُفعة',
                      onClick: () => { if (confirm(`هل تريد حذف الدُفعة #${batch.id}؟ سيتم حذف جميع البيانات المرتبطة.`)) deleteBatchMutation.mutate(batch.id); },
                      disabled: deleteBatchMutation.isPending,
                      color: 'red' as const,
                    },
                  ]}
                  compact
                />
              ))}
            </UnifiedCardGrid>
          )}
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          <div className="space-y-4">
            {selectedBatchId && candidates.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2" data-testid="review-stats-summary">
                <Card className="p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">الإجمالي</p>
                  <p className="text-lg font-bold" data-testid="stat-total">{candidates.length}</p>
                </Card>
                <Card className="p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">تحويلات</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400" data-testid="stat-transfers">{reviewStats.byType.transfer}</p>
                </Card>
                <Card className="p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">مصروفات</p>
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400" data-testid="stat-expenses">{reviewStats.byType.expense}</p>
                </Card>
                <Card className="p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">خاصة</p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400" data-testid="stat-special">{reviewStats.byType.special}</p>
                </Card>
                <Card className="p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">ثقة عالية</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400" data-testid="stat-high-conf">{reviewStats.byConfidence.high}</p>
                </Card>
                <Card className="p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">ثقة متوسطة</p>
                  <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400" data-testid="stat-med-conf">{reviewStats.byConfidence.medium}</p>
                </Card>
                <Card className="p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">ثقة منخفضة</p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400" data-testid="stat-low-conf">{reviewStats.byConfidence.low}</p>
                </Card>
                <Card className="p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">بانتظار</p>
                  <p className="text-lg font-bold" data-testid="stat-pending">{reviewStats.byStatus.pending}</p>
                </Card>
              </div>
            )}

            {selectedBatchId && (
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-sm">
                    دُفعة #{selectedBatchId}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {filteredCandidates.length} من {candidates.length} مرشح
                  </span>
                  <div className="flex items-center gap-1" data-testid="confidence-filter-group">
                    {([
                      { key: 'all' as const, label: 'الكل' },
                      { key: 'high' as const, label: 'عالية الثقة' },
                      { key: 'medium' as const, label: 'متوسطة' },
                      { key: 'low' as const, label: 'منخفضة' },
                    ]).map(f => (
                      <Button key={f.key} size="sm" variant={confidenceFilter === f.key ? 'default' : 'outline'}
                        onClick={() => setConfidenceFilter(f.key)}
                        data-testid={`button-conf-filter-${f.key}`}>
                        {f.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {mergeMode ? (
                    <>
                      <span className="text-sm text-muted-foreground">
                        تم تحديد {mergeSelected.length} للدمج
                      </span>
                      <Select value={mergeProjectId} onValueChange={setMergeProjectId}>
                        <SelectTrigger className="w-40" data-testid="select-merge-project">
                          <SelectValue placeholder="المشروع" />
                        </SelectTrigger>
                        <SelectContent>
                          {projectsList.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" data-testid="button-confirm-merge"
                        onClick={() => {
                          if (mergeSelected.length < 2) { toast({ title: "اختر على الأقل 2 مرشحين", variant: "destructive" }); return; }
                          if (!mergeProjectId) { toast({ title: "اختر المشروع", variant: "destructive" }); return; }
                          mergeMutation.mutate({ candidateIds: mergeSelected, projectId: mergeProjectId });
                        }}
                        disabled={mergeMutation.isPending}>
                        <Merge className="w-3.5 h-3.5 ml-1.5" /> دمج ({mergeSelected.length})
                      </Button>
                      <Button size="sm" variant="outline" data-testid="button-cancel-merge"
                        onClick={() => { setMergeMode(false); setMergeSelected([]); }}>
                        إلغاء
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" data-testid="button-start-merge"
                        onClick={() => setMergeMode(true)}>
                        <Merge className="w-3.5 h-3.5 ml-1.5" /> دمج
                      </Button>
                      <Button size="sm" data-testid="button-bulk-approve"
                        onClick={() => {
                          const pid = prompt('أدخل معرف المشروع للموافقة الجماعية');
                          if (pid) bulkApproveMutation.mutate({ batchId: selectedBatchId, projectId: pid, minConfidence: 0.95 });
                        }}
                        disabled={bulkApproveMutation.isPending}>
                        <ThumbsUp className="w-3.5 h-3.5 ml-1.5" /> موافقة جماعية
                      </Button>
                    </>
                  )}
                </div>
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

            {candidatesQuery.isError && (
              <Card className="p-8 text-center border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
                <div className="flex flex-col items-center gap-3 text-red-600 dark:text-red-400" data-testid="error-candidates">
                  <AlertTriangle className="h-10 w-10" />
                  <p className="text-lg font-medium">فشل تحميل المرشحين</p>
                  <p className="text-sm text-red-500 dark:text-red-400/80">{(candidatesQuery.error as any)?.message || 'خطأ غير معروف'}</p>
                  <Button variant="outline" size="sm" onClick={() => candidatesQuery.refetch()} data-testid="btn-retry-candidates">
                    <RefreshCw className="w-4 h-4 ml-1.5" /> إعادة المحاولة
                  </Button>
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
                  <Button variant="outline" onClick={() => { setFilterStatus('all'); setConfidenceFilter('all'); setSearchValue(''); }}>
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
                        {mergeMode && <TableHead className="w-10"></TableHead>}
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>الوصف</TableHead>
                        <TableHead>الثقة</TableHead>
                        <TableHead>المطابقة</TableHead>
                        <TableHead>الفئة</TableHead>
                        <TableHead className="w-36">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCandidates.map((c: any) => {
                        const confidence = parseFloat(c.confidence || '0');
                        const isExpanded = selectedCandidateId === c.id;
                        const colCount = mergeMode ? 9 : 8;
                        return (
                          <Fragment key={c.id}>
                          <TableRow data-testid={`row-candidate-${c.id}`}
                            className={`cursor-pointer ${mergeSelected.includes(c.id) ? 'bg-blue-50 dark:bg-blue-950/30' : ''} ${isExpanded ? 'border-b-0' : ''}`}
                            onClick={() => setSelectedCandidateId(isExpanded ? null : c.id)}>
                            {mergeMode && (
                              <TableCell>
                                <input type="checkbox"
                                  checked={mergeSelected.includes(c.id)}
                                  onChange={(e) => { e.stopPropagation(); toggleMergeCandidate(c.id); }}
                                  disabled={!!c.canonicalTransactionId}
                                  data-testid={`checkbox-merge-${c.id}`}
                                  className="w-4 h-4" />
                              </TableCell>
                            )}
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
                              <div className="flex gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                {(!c.canonicalTransactionId || !['confirmed', 'posted', 'excluded'].includes(c.canonicalStatus || '')) && (
                                  <>
                                    <Button size="icon" variant="default" data-testid={`button-approve-${c.id}`}
                                      onClick={() => { setApproveDialog({ candidateId: c.id, description: c.description || '' }); setApproveProjectId(''); setApproveNotes(''); }}>
                                      <ThumbsUp className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button size="icon" variant="destructive" data-testid={`button-reject-${c.id}`}
                                      onClick={() => { setRejectDialog({ candidateId: c.id, description: c.description || '' }); setRejectReason(''); }}>
                                      <ThumbsDown className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button size="icon" variant="outline" data-testid={`button-edit-${c.id}`}
                                      onClick={() => { setEditDialog({ candidateId: c.id, amount: c.amount || '0', description: c.description || '' }); setEditAmount(c.amount || '0'); setEditDescription(c.description || ''); }}>
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button size="icon" variant="outline" data-testid={`button-split-${c.id}`}
                                      onClick={() => {
                                        setSplitDialog({ candidateId: c.id, amount: c.amount || '0', description: c.description || '' });
                                        setSplitProjectId('');
                                        setSplitItems([{ amount: '', description: '' }, { amount: '', description: '' }]);
                                      }}>
                                      <Split className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button size="icon" variant="outline" data-testid={`button-media-${c.id}`}
                                      onClick={() => setMediaPreviewDialog({ candidateId: c.id, description: c.description || '' })}>
                                      <Paperclip className="w-3.5 h-3.5" />
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
                          {isExpanded && (
                            <TableRow data-testid={`row-detail-${c.id}`}>
                              <TableCell colSpan={colCount} className="bg-muted/30 p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
                                  <div className="space-y-3">
                                    <div>
                                      <p className="text-xs font-semibold text-muted-foreground mb-1">الرسالة الأصلية</p>
                                      <div className="bg-background rounded-md p-3 text-sm border" data-testid={`text-source-msg-${c.id}`}>
                                        {c.sourceMessageText || c.description || 'لا يوجد نص'}
                                      </div>
                                    </div>
                                    {c.projectHypothesesJson && (() => {
                                      try {
                                        const hypotheses = typeof c.projectHypothesesJson === 'string' ? JSON.parse(c.projectHypothesesJson) : c.projectHypothesesJson;
                                        if (Array.isArray(hypotheses) && hypotheses.length > 0) {
                                          return (
                                            <div>
                                              <p className="text-xs font-semibold text-muted-foreground mb-1">فرضيات المشروع</p>
                                              <div className="flex gap-1 flex-wrap">
                                                {hypotheses.map((h: any, i: number) => (
                                                  <Badge key={i} variant="outline" data-testid={`badge-hypothesis-${c.id}-${i}`}>
                                                    {h.projectName || h.projectId || h} {h.confidence ? `(${(h.confidence * 100).toFixed(0)}%)` : ''}
                                                  </Badge>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        }
                                        return null;
                                      } catch { return null; }
                                    })()}
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground mb-1">تفاصيل الثقة</p>
                                    <div className="bg-background rounded-md p-3 border space-y-1.5" data-testid={`detail-confidence-${c.id}`}>
                                      {(() => {
                                        try {
                                          const breakdown = c.confidenceBreakdownJson
                                            ? (typeof c.confidenceBreakdownJson === 'string' ? JSON.parse(c.confidenceBreakdownJson) : c.confidenceBreakdownJson)
                                            : null;
                                          if (breakdown) {
                                            return (
                                              <>
                                                {breakdown.baseScore != null && (
                                                  <div className="flex items-center justify-between text-sm">
                                                    <span>النقاط الأساسية</span>
                                                    <span className="font-medium tabular-nums">{(breakdown.baseScore * 100).toFixed(0)}%</span>
                                                  </div>
                                                )}
                                                {breakdown.bonuses && Array.isArray(breakdown.bonuses) && breakdown.bonuses.map((b: any, i: number) => (
                                                  <div key={`b-${i}`} className="flex items-center justify-between text-sm text-green-700 dark:text-green-400">
                                                    <span>+ {b.reason || b.label || 'مكافأة'}</span>
                                                    <span className="font-medium tabular-nums">+{((b.value || b.amount || 0) * 100).toFixed(0)}%</span>
                                                  </div>
                                                ))}
                                                {breakdown.penalties && Array.isArray(breakdown.penalties) && breakdown.penalties.map((p: any, i: number) => (
                                                  <div key={`p-${i}`} className="flex items-center justify-between text-sm text-red-700 dark:text-red-400">
                                                    <span>- {p.reason || p.label || 'خصم'}</span>
                                                    <span className="font-medium tabular-nums">-{((p.value || p.amount || 0) * 100).toFixed(0)}%</span>
                                                  </div>
                                                ))}
                                                <div className="border-t pt-1.5 mt-1.5 flex items-center justify-between text-sm font-bold">
                                                  <span>النتيجة النهائية</span>
                                                  <span className={`tabular-nums ${confidenceColor(confidence)} px-2 py-0.5 rounded-full`}>
                                                    {(confidence * 100).toFixed(0)}%
                                                  </span>
                                                </div>
                                              </>
                                            );
                                          }
                                          return (
                                            <div className="flex items-center justify-between text-sm">
                                              <span>النتيجة النهائية</span>
                                              <span className={`tabular-nums font-bold ${confidenceColor(confidence)} px-2 py-0.5 rounded-full`}>
                                                {(confidence * 100).toFixed(0)}%
                                              </span>
                                            </div>
                                          );
                                        } catch {
                                          return (
                                            <div className="flex items-center justify-between text-sm">
                                              <span>النتيجة النهائية</span>
                                              <span className={`tabular-nums font-bold ${confidenceColor(confidence)} px-2 py-0.5 rounded-full`}>
                                                {(confidence * 100).toFixed(0)}%
                                              </span>
                                            </div>
                                          );
                                        }
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                          </Fragment>
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
                  {verificationQuery.isError ? (
                    <div className="p-4 text-center text-red-600 dark:text-red-400" data-testid="error-verification">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm font-medium">فشل تحميل طابور التحقق</p>
                      <p className="text-xs text-red-500 mt-1">{(verificationQuery.error as any)?.message || 'خطأ غير معروف'}</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => verificationQuery.refetch()} data-testid="btn-retry-verification">
                        <RefreshCw className="w-3.5 h-3.5 ml-1" /> إعادة المحاولة
                      </Button>
                    </div>
                  ) : verificationQuery.isLoading ? (
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
          {custodianQuery.isError ? (
            <Card className="p-8 text-center border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
              <div className="flex flex-col items-center gap-3 text-red-600 dark:text-red-400" data-testid="error-custodians">
                <AlertTriangle className="h-10 w-10" />
                <p className="text-lg font-medium">فشل تحميل بيانات أمناء العُهد</p>
                <p className="text-sm text-red-500">{(custodianQuery.error as any)?.message || 'خطأ غير معروف'}</p>
                <Button variant="outline" size="sm" onClick={() => custodianQuery.refetch()} data-testid="btn-retry-custodians">
                  <RefreshCw className="w-4 h-4 ml-1.5" /> إعادة المحاولة
                </Button>
              </div>
            </Card>
          ) : custodianQuery.isLoading ? (
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
                      <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-800">
                        <p className="text-xs text-muted-foreground mb-1">مُستلم</p>
                        <p className="font-bold text-green-700 dark:text-green-300 tabular-nums" data-testid={`text-received-${i}`}>
                          {stmt.totalReceived?.toLocaleString('ar')}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-200 dark:border-red-800">
                        <p className="text-xs text-muted-foreground mb-1">مصروف</p>
                        <p className="font-bold text-red-700 dark:text-red-300 tabular-nums" data-testid={`text-disbursed-${i}`}>
                          {stmt.totalDisbursed?.toLocaleString('ar')}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-muted-foreground mb-1">مُصفّى</p>
                        <p className="font-bold text-blue-700 dark:text-blue-300 tabular-nums" data-testid={`text-settled-${i}`}>
                          {stmt.totalSettled?.toLocaleString('ar')}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-md border border-yellow-200 dark:border-yellow-800">
                        <p className="text-xs text-muted-foreground mb-1">رصيد معلق</p>
                        <p className="font-bold text-yellow-700 dark:text-yellow-300 tabular-nums" data-testid={`text-unsettled-${i}`}>
                          {stmt.unsettledBalance?.toLocaleString('ar')}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-md border border-purple-200 dark:border-purple-800">
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

        <TabsContent value="aliases" className="mt-4">
          <div className="space-y-4">
            {aliasesQuery.isError ? (
              <Card className="p-8 text-center border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
                <div className="flex flex-col items-center gap-3 text-red-600 dark:text-red-400" data-testid="error-aliases">
                  <AlertTriangle className="h-10 w-10" />
                  <p className="text-lg font-medium">فشل تحميل الأسماء المستعارة</p>
                  <p className="text-sm text-red-500">{(aliasesQuery.error as any)?.message || 'خطأ غير معروف'}</p>
                  <Button variant="outline" size="sm" onClick={() => aliasesQuery.refetch()} data-testid="btn-retry-aliases">
                    <RefreshCw className="w-4 h-4 ml-1.5" /> إعادة المحاولة
                  </Button>
                </div>
              </Card>
            ) : aliasesQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : (aliasesQuery.data || []).length === 0 ? (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <Users className="h-12 w-12 opacity-20" />
                  <p className="text-lg" data-testid="text-no-aliases">لا توجد أسماء مستعارة</p>
                </div>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table data-testid="table-aliases">
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>الاسم المستعار</TableHead>
                        <TableHead>معرف العامل</TableHead>
                        <TableHead>تاريخ الإنشاء</TableHead>
                        <TableHead className="w-20">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(aliasesQuery.data || []).map((alias: any) => (
                        <TableRow key={alias.id} data-testid={`row-alias-${alias.id}`}>
                          <TableCell className="text-muted-foreground">{alias.id}</TableCell>
                          <TableCell className="font-medium" data-testid={`text-alias-name-${alias.id}`}>
                            {alias.aliasName}
                          </TableCell>
                          <TableCell data-testid={`text-alias-worker-${alias.id}`}>
                            <Badge variant="outline">{alias.canonicalWorkerId}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {alias.createdAt ? new Date(alias.createdAt).toLocaleDateString('ar') : '-'}
                          </TableCell>
                          <TableCell>
                            <Button size="icon" variant="destructive" data-testid={`button-delete-alias-${alias.id}`}
                              onClick={() => {
                                if (confirm('هل أنت متأكد من حذف هذا الاسم المستعار؟')) {
                                  deleteAliasMutation.mutate(alias.id);
                                }
                              }}
                              disabled={deleteAliasMutation.isPending}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="loans" className="mt-4">
          <div className="space-y-4">
            {loansQuery.isError ? (
              <Card className="p-8 text-center border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
                <div className="flex flex-col items-center gap-3 text-red-600 dark:text-red-400" data-testid="error-loans">
                  <AlertTriangle className="h-10 w-10" />
                  <p className="text-lg font-medium">فشل تحميل القروض</p>
                  <p className="text-sm text-red-500">{(loansQuery.error as any)?.message || 'خطأ غير معروف'}</p>
                  <Button variant="outline" size="sm" onClick={() => loansQuery.refetch()} data-testid="btn-retry-loans">
                    <RefreshCw className="w-4 h-4 ml-1.5" /> إعادة المحاولة
                  </Button>
                </div>
              </Card>
            ) : loansQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : (loansQuery.data || []).length === 0 ? (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <ArrowLeftRight className="h-12 w-12 opacity-20" />
                  <p className="text-lg" data-testid="text-no-loans">لا توجد قروض بين المقاولين</p>
                </div>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table data-testid="table-loans">
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>الوصف</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>الثقة</TableHead>
                        <TableHead>الفئة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(loansQuery.data || []).map((loan: any) => (
                        <TableRow key={loan.id} data-testid={`row-loan-${loan.id}`}>
                          <TableCell className="text-muted-foreground">{loan.id}</TableCell>
                          <TableCell className="font-semibold tabular-nums" data-testid={`text-loan-amount-${loan.id}`}>
                            {parseFloat(loan.amount || '0').toLocaleString('ar')} ر.ي
                          </TableCell>
                          <TableCell className="max-w-xs truncate" dir="rtl" data-testid={`text-loan-desc-${loan.id}`}>
                            {loan.description || '-'}
                          </TableCell>
                          <TableCell data-testid={`text-loan-status-${loan.id}`}>
                            {matchStatusBadge(loan.matchStatus || 'new_entry')}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${confidenceColor(parseFloat(loan.confidence || '0'))}`}
                              data-testid={`text-loan-confidence-${loan.id}`}>
                              {(parseFloat(loan.confidence || '0') * 100).toFixed(0)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground" data-testid={`text-loan-category-${loan.id}`}>
                            {loan.category || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
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
                {projectsList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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

      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent data-testid="dialog-edit">
          <DialogHeader>
            <DialogTitle>تعديل المرشح</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">المبلغ</label>
              <Input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                data-testid="input-edit-amount" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">الوصف</label>
              <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)}
                data-testid="input-edit-description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)} data-testid="button-cancel-edit">إلغاء</Button>
            <Button onClick={() => {
              if (editDialog) editCandidateMutation.mutate({
                candidateId: editDialog.candidateId,
                amount: editAmount,
                description: editDescription,
              });
            }} disabled={editCandidateMutation.isPending} data-testid="button-confirm-edit">
              <Pencil className="w-3.5 h-3.5 ml-1.5" /> حفظ التعديل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!splitDialog} onOpenChange={() => setSplitDialog(null)}>
        <DialogContent data-testid="dialog-split" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تقسيم المرشح</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground" dir="rtl">
              المبلغ الأصلي: {parseFloat(splitDialog?.amount || '0').toLocaleString('ar')} ر.ي — {splitDialog?.description}
            </p>
            <Select value={splitProjectId} onValueChange={setSplitProjectId}>
              <SelectTrigger data-testid="select-split-project">
                <SelectValue placeholder="اختر المشروع" />
              </SelectTrigger>
              <SelectContent>
                {projectsList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {splitItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">المبلغ {idx + 1}</label>
                  <Input type="number" value={item.amount}
                    onChange={e => {
                      const updated = [...splitItems];
                      updated[idx] = { ...updated[idx], amount: e.target.value };
                      setSplitItems(updated);
                    }}
                    data-testid={`input-split-amount-${idx}`} />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">الوصف {idx + 1}</label>
                  <Input value={item.description}
                    onChange={e => {
                      const updated = [...splitItems];
                      updated[idx] = { ...updated[idx], description: e.target.value };
                      setSplitItems(updated);
                    }}
                    data-testid={`input-split-desc-${idx}`} />
                </div>
                {splitItems.length > 2 && (
                  <Button size="icon" variant="outline" data-testid={`button-remove-split-${idx}`}
                    onClick={() => setSplitItems(prev => prev.filter((_, i) => i !== idx))}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" data-testid="button-add-split-row"
              onClick={() => setSplitItems(prev => [...prev, { amount: '', description: '' }])}>
              <Plus className="w-3.5 h-3.5 ml-1.5" /> إضافة جزء
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSplitDialog(null)} data-testid="button-cancel-split">إلغاء</Button>
            <Button onClick={() => {
              if (!splitProjectId) { toast({ title: "اختر المشروع", variant: "destructive" }); return; }
              const validSplits = splitItems.filter(s => s.amount && parseFloat(s.amount) > 0);
              if (validSplits.length < 2) { toast({ title: "أدخل على الأقل جزئين", variant: "destructive" }); return; }
              if (splitDialog) splitMutation.mutate({
                candidateId: splitDialog.candidateId,
                projectId: splitProjectId,
                splits: validSplits,
              });
            }} disabled={splitMutation.isPending} data-testid="button-confirm-split">
              <Split className="w-3.5 h-3.5 ml-1.5" /> تقسيم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aliasDialog} onOpenChange={setAliasDialog}>
        <DialogContent data-testid="dialog-add-alias">
          <DialogHeader>
            <DialogTitle>إضافة اسم مستعار</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">الاسم المستعار</label>
              <Input value={newAliasName} onChange={e => setNewAliasName(e.target.value)}
                placeholder="مثال: ابو فارس"
                data-testid="input-new-alias-name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">بحث عن عامل</label>
              <Input value={workerSearchQuery} onChange={e => setWorkerSearchQuery(e.target.value)}
                placeholder="اكتب اسم العامل..."
                data-testid="input-worker-search" />
            </div>
            {workersSearchQuery.data && workersSearchQuery.data.length > 0 && (
              <div className="max-h-40 overflow-y-auto border rounded-md">
                {workersSearchQuery.data.map((w: any) => (
                  <div key={w.id}
                    className={`p-2 cursor-pointer text-sm hover-elevate ${newAliasWorkerId === w.id ? 'bg-primary/10' : ''}`}
                    onClick={() => setNewAliasWorkerId(w.id)}
                    data-testid={`option-worker-${w.id}`}>
                    <span className="font-medium">{w.name}</span>
                    <span className="text-xs text-muted-foreground mr-2">({w.id})</span>
                  </div>
                ))}
              </div>
            )}
            {newAliasWorkerId && (
              <div className="text-sm">
                <Badge variant="outline" data-testid="badge-selected-worker">
                  <Link2 className="w-3 h-3 ml-1" /> {newAliasWorkerId}
                </Badge>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAliasDialog(false)} data-testid="button-cancel-alias">إلغاء</Button>
            <Button onClick={() => {
              if (!newAliasName.trim()) { toast({ title: "أدخل الاسم المستعار", variant: "destructive" }); return; }
              if (!newAliasWorkerId) { toast({ title: "اختر العامل", variant: "destructive" }); return; }
              createAliasMutation.mutate({ aliasName: newAliasName.trim(), canonicalWorkerId: newAliasWorkerId });
            }} disabled={createAliasMutation.isPending} data-testid="button-confirm-alias">
              <Plus className="w-3.5 h-3.5 ml-1.5" /> إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pipelineDialog} onOpenChange={(open) => { if (!open && (pipelineStage === 'done' || pipelineStage === 'error' || pipelineStage === 'linking')) setPipelineDialog(false); }}>
        <DialogContent data-testid="dialog-pipeline" className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Play className="w-5 h-5" />
              تحليل الدُفعة #{pipelineBatchId}
            </DialogTitle>
          </DialogHeader>

          {(() => {
            const stages = [
              { key: 'media', label: 'معالجة الوسائط والصور', icon: Image },
              { key: 'names', label: 'استخراج الأسماء', icon: Users },
              { key: 'autolink', label: 'ربط تلقائي', icon: Link2 },
              { key: 'linking', label: 'ربط يدوي', icon: Pencil },
              { key: 'extract', label: 'استخراج مالي', icon: Wallet },
            ];
            const stageOrder = ['media', 'names', 'autolink', 'linking', 'extract', 'done', 'error'];
            const currentIndex = stageOrder.indexOf(pipelineStage);
            const overallProgress = pipelineStage === 'done' ? 100 : pipelineStage === 'error' ? currentIndex * 20 : Math.min(currentIndex * 20, 95);

            return (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>التقدم الإجمالي</span>
                    <span>{overallProgress}%</span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-700 ease-out" style={{ width: `${overallProgress}%` }} data-testid="progress-overall" />
                  </div>
                </div>

                <div className="space-y-2">
                  {stages.map((stage, idx) => {
                    const StageIcon = stage.icon;
                    const stageIndex = stageOrder.indexOf(stage.key);
                    const isDone = currentIndex > stageIndex || pipelineStage === 'done';
                    const isActive = pipelineStage === stage.key;
                    const isPending = currentIndex < stageIndex && pipelineStage !== 'done';

                    return (
                      <div key={stage.key} className={`rounded-lg border p-3 transition-all duration-300 ${isActive ? 'border-primary bg-primary/5 shadow-sm' : isDone ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30' : 'border-muted opacity-50'}`} data-testid={`pipeline-stage-${stage.key}`}>
                        <div className="flex items-center gap-3">
                          <div className={`rounded-full p-1.5 ${isDone ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            {isDone ? <CheckCircle className="w-4 h-4" /> : isActive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <StageIcon className="w-4 h-4" />}
                          </div>
                          <span className={`text-sm font-medium flex-1 ${isDone ? 'text-green-700 dark:text-green-300' : isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                            {stage.label}
                          </span>

                          {isDone && stage.key === 'media' && pipelineResults.media && (
                            <span className="text-xs text-muted-foreground">تمت معالجة {pipelineResults.media.processed || 0} ملف</span>
                          )}
                          {isDone && stage.key === 'names' && pipelineResults.names && (
                            <span className="text-xs text-muted-foreground">{pipelineResults.names.totalNames || 0} اسم ({pipelineResults.names.newNames || 0} جديد)</span>
                          )}
                          {isDone && stage.key === 'autolink' && pipelineResults.autoLink && (
                            <span className="text-xs text-muted-foreground">تم ربط {pipelineResults.autoLink.linked || 0} تلقائياً</span>
                          )}
                          {isDone && stage.key === 'extract' && pipelineResults.extract && (
                            <span className="text-xs text-muted-foreground">{pipelineResults.extract.totalCandidates || pipelineResults.extract.total || 0} مرشح</span>
                          )}
                        </div>

                        {isActive && stage.key !== 'linking' && (
                          <div className="mt-2">
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {pipelineStage === 'linking' && (
                  <div className="border rounded-lg p-4 space-y-3 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">توجد أسماء غير مربوطة تحتاج ربط يدوي</span>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="بحث في الأسماء..."
                        value={nameLinkingSearch}
                        onChange={e => setNameLinkingSearch(e.target.value)}
                        className="text-sm"
                        data-testid="input-name-linking-search"
                      />
                    </div>

                    <div className="max-h-[40vh] overflow-y-auto space-y-2">
                      {discoveredNamesQuery.isLoading ? (
                        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
                      ) : (() => {
                        const names = (discoveredNamesQuery.data || [])
                          .filter((n: any) => !n.canonicalEntityId)
                          .filter((n: any) => !nameLinkingSearch || n.aliasName?.includes(nameLinkingSearch) || n.entityType?.includes(nameLinkingSearch));
                        const allWorkers = allWorkersQuery.data || [];

                        if (names.length === 0) return (
                          <div className="text-center py-4 text-sm text-muted-foreground">
                            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-60" />
                            جميع الأسماء مربوطة
                          </div>
                        );

                        return names.map((name: any) => {
                          const searchTerm = workerSearchPerAlias[name.id] || '';
                          const filteredWorkers = searchTerm.length > 0
                            ? allWorkers.filter((w: any) => w.name?.includes(searchTerm) || w.id?.includes(searchTerm))
                            : allWorkers.slice(0, 10);
                          const selected = linkSelections[name.id];

                          return (
                            <div key={name.id} className="rounded-lg border bg-white dark:bg-gray-900 p-3 space-y-2" data-testid={`unlinked-name-${name.id}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">{name.aliasName}</span>
                                  <Badge variant="outline" className="text-[10px]">{name.entityType}</Badge>
                                  {name.occurrenceCount > 1 && <Badge variant="secondary" className="text-[10px]">{name.occurrenceCount}×</Badge>}
                                </div>
                                {selected && (
                                  <Button size="sm" variant="default" className="h-7 text-xs" data-testid={`button-link-${name.id}`}
                                    onClick={() => linkNameMutation.mutate({ aliasId: name.id, entityId: selected.entityId, entityTable: selected.entityTable })}
                                    disabled={linkNameMutation.isPending}>
                                    <Link2 className="w-3 h-3 ml-1" /> ربط
                                  </Button>
                                )}
                              </div>

                              {(name.sourceMessageText || name.context) && (
                                <div className="text-[11px] text-muted-foreground bg-muted/50 rounded px-2 py-1.5 space-y-0.5">
                                  {name.sourceSender && <span className="font-medium text-primary/70">{name.sourceSender}: </span>}
                                  <p className="line-clamp-3 whitespace-pre-wrap" dangerouslySetInnerHTML={{
                                    __html: (name.sourceMessageText || name.context || '').replace(
                                      /(\d[\d,،.]+)/g,
                                      '<mark class="bg-yellow-200 dark:bg-yellow-800 font-bold px-0.5 rounded text-foreground">$1</mark>'
                                    )
                                  }} />
                                </div>
                              )}

                              <div className="flex gap-2 items-center">
                                <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <Input
                                  placeholder="ابحث عن العامل / الكيان..."
                                  value={searchTerm}
                                  onChange={e => setWorkerSearchPerAlias(prev => ({ ...prev, [name.id]: e.target.value }))}
                                  className="h-8 text-xs"
                                  data-testid={`input-search-worker-${name.id}`}
                                />
                              </div>

                              {filteredWorkers.length > 0 && (
                                <div className="max-h-28 overflow-y-auto border rounded">
                                  {filteredWorkers.map((w: any) => (
                                    <div
                                      key={w.id}
                                      className={`px-2.5 py-1.5 text-xs cursor-pointer hover:bg-primary/10 flex items-center justify-between ${selected?.entityId === w.id ? 'bg-primary/15 font-medium' : ''}`}
                                      onClick={() => setLinkSelections(prev => ({ ...prev, [name.id]: { entityId: w.id, entityTable: 'workers' } }))}
                                      data-testid={`worker-option-${name.id}-${w.id}`}
                                    >
                                      <span>{w.name}</span>
                                      <span className="text-muted-foreground">{w.type || ''}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>

                    <DialogFooter className="flex gap-2 pt-2">
                      {Object.keys(linkSelections).length > 0 && (
                        <Button variant="default" size="sm" data-testid="button-bulk-link"
                          onClick={() => {
                            const links = Object.entries(linkSelections).map(([aliasId, sel]) => ({
                              aliasId: parseInt(aliasId), entityId: sel.entityId, entityTable: sel.entityTable,
                            }));
                            bulkLinkMutation.mutate({ links });
                          }}
                          disabled={bulkLinkMutation.isPending}>
                          <Link2 className="w-3.5 h-3.5 ml-1" /> ربط {Object.keys(linkSelections).length} أسماء دفعة واحدة
                        </Button>
                      )}
                      <Button variant="outline" size="sm" data-testid="button-skip-linking"
                        onClick={continuePipelineAfterLinking}>
                        تخطي ومتابعة الاستخراج المالي
                      </Button>
                    </DialogFooter>
                  </div>
                )}

                {pipelineStage === 'error' && pipelineError && (
                  <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/20 p-3 flex items-center gap-2 text-red-700 dark:text-red-300">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span className="text-sm">{pipelineError}</span>
                  </div>
                )}

                {pipelineStage === 'done' && (
                  <div className="rounded-lg border border-green-300 bg-green-50 dark:bg-green-950/20 p-4 text-center space-y-2">
                    <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400 mx-auto" />
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">تم التحليل الكامل بنجاح</p>
                    <Button size="sm" onClick={() => { setPipelineDialog(false); if (pipelineBatchId) { setSelectedBatchId(pipelineBatchId); setActiveTab('review'); } }} data-testid="button-go-review">
                      <Eye className="w-3.5 h-3.5 ml-1" /> عرض النتائج
                    </Button>
                  </div>
                )}

                {(pipelineStage === 'done' || pipelineStage === 'error') && (
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPipelineDialog(false)} data-testid="button-close-pipeline">إغلاق</Button>
                  </DialogFooter>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!mediaPreviewDialog} onOpenChange={() => setMediaPreviewDialog(null)}>
        <DialogContent data-testid="dialog-media-preview" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="w-4 h-4" /> المرفقات
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground" dir="rtl">{mediaPreviewDialog?.description}</p>
            {candidateEvidenceQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : (() => {
              const evidence = candidateEvidenceQuery.data?.evidence || [];
              const mediaAssetIds = evidence
                .filter((e: any) => e.mediaAssetId)
                .map((e: any) => e.mediaAssetId);
              const batchMedia = batchMediaQuery.data || [];
              const linkedMedia = batchMedia.filter((m: any) => mediaAssetIds.includes(m.id));

              if (linkedMedia.length === 0) {
                return (
                  <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                    <Paperclip className="h-10 w-10 opacity-20" />
                    <p className="text-sm">لا توجد مرفقات مرتبطة بهذا المرشح</p>
                  </div>
                );
              }

              const isImage = (mime: string) => mime?.startsWith('image/');

              return (
                <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
                  {linkedMedia.map((media: any) => (
                    <Card key={media.id} className="overflow-visible" data-testid={`card-media-${media.id}`}>
                      <CardContent className="p-3 space-y-2">
                        {isImage(media.mimeType) && media.fileAvailable ? (
                          <a href={`/api/wa-import/media/${media.id}/file`} target="_blank" rel="noopener noreferrer">
                            <img
                              src={`/api/wa-import/media/${media.id}/file`}
                              alt={media.originalFilename}
                              className="w-full h-40 object-cover rounded-md cursor-pointer"
                              data-testid={`img-media-${media.id}`}
                            />
                          </a>
                        ) : (
                          <div className="w-full h-40 flex items-center justify-center rounded-md bg-muted">
                            <File className="h-10 w-10 text-muted-foreground opacity-40" />
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground truncate flex-1" dir="ltr" data-testid={`text-filename-${media.id}`}>
                            {media.originalFilename}
                          </span>
                          {media.fileAvailable ? (
                            <a href={`/api/wa-import/media/${media.id}/file`} target="_blank" rel="noopener noreferrer" data-testid={`link-download-${media.id}`}>
                              <Button size="icon" variant="outline">
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                            </a>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]" data-testid={`badge-unavailable-${media.id}`}>غير متوفر</Badge>
                          )}
                        </div>
                        {media.ocrText && (
                          <details className="mt-1" data-testid={`details-ocr-${media.id}`}>
                            <summary className="text-xs font-medium cursor-pointer text-muted-foreground flex items-center gap-1">
                              <FileText className="w-3 h-3" /> النص المستخرج
                            </summary>
                            <p className="mt-1 text-xs whitespace-pre-wrap bg-muted/50 rounded-md p-2 max-h-40 overflow-y-auto" dir="rtl"
                              data-testid={`text-ocr-${media.id}`}>
                              {media.ocrText}
                            </p>
                          </details>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMediaPreviewDialog(null)} data-testid="button-close-media">إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleFileSelect}
        data-testid="input-file-upload"
      />

      {uploadMutation.isPending && (
        <div className="fixed bottom-[calc(160px+env(safe-area-inset-bottom,0px))] right-6 z-[120] bg-background border rounded-lg px-4 py-2 shadow-lg flex items-center gap-2" data-testid="status-upload-progress">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm">جاري استيراد المحادثة...</span>
        </div>
      )}
      {processMediaMutation.isPending && (
        <div className="fixed bottom-[calc(200px+env(safe-area-inset-bottom,0px))] right-6 z-[120] bg-background border rounded-lg px-4 py-2 shadow-lg flex items-center gap-2" data-testid="status-media-processing">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm">جاري معالجة الوسائط...</span>
        </div>
      )}
    </div>
  );
}
