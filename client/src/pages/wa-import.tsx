import { useState, useMemo, useCallback, useRef, useEffect, Fragment } from "react";

async function pollJob(jobId: string, intervalMs = 2000, timeoutMs = 600000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`/api/wa-import/job/${jobId}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Job polling failed: ${res.status}`);
    const job = await res.json();
    if (job.status === 'completed') return job.result;
    if (job.status === 'failed') throw new Error(job.error || 'Job failed');
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error('Job timed out');
}
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
  UserCheck, Loader2, CheckCircle2, ChevronDown, ChevronUp, Calendar,
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

  const [editDialog, setEditDialog] = useState<{ candidateId: number; amount: string; description: string; candidateType: string; category: string } | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCandidateType, setEditCandidateType] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const [autoLinkFilter, setAutoLinkFilter] = useState('all');
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelected, setMergeSelected] = useState<number[]>([]);
  const [mergeProjectId, setMergeProjectId] = useState("");

  const [splitDialog, setSplitDialog] = useState<{ candidateId: number; amount: string; description: string } | null>(null);
  const [splitProjectId, setSplitProjectId] = useState("");
  const [splitItems, setSplitItems] = useState<{ amount: string; description: string }[]>([{ amount: '', description: '' }, { amount: '', description: '' }]);

  const [mediaPreviewDialog, setMediaPreviewDialog] = useState<{ candidateId: number; description: string } | null>(null);

  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  const [aliasDialog, setAliasDialog] = useState(false);
  const [newAliasName, setNewAliasName] = useState("");
  const [newAliasWorkerId, setNewAliasWorkerId] = useState("");
  const [workerSearchQuery, setWorkerSearchQuery] = useState("");

  const [nameLinkingDialog, setNameLinkingDialog] = useState(false);
  const [nameLinkingBatchId, setNameLinkingBatchId] = useState<number | null>(null);
  const [nameLinkingSearch, setNameLinkingSearch] = useState("");
  const [linkSelections, setLinkSelections] = useState<Record<number, { entityId: string; entityTable: string }>>({});
  const [workerSearchPerAlias, setWorkerSearchPerAlias] = useState<Record<number, string>>({});

  type PipelineStage = 'idle' | 'media' | 'names' | 'autolink' | 'linking' | 'ai_check' | 'extract' | 'done' | 'error';
  const [pipelineDialog, setPipelineDialog] = useState(false);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>('idle');
  const [pipelineResults, setPipelineResults] = useState<Record<string, any>>({});
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [pipelineBatchId, setPipelineBatchId] = useState<number | null>(null);
  const [aiStatusData, setAiStatusData] = useState<any>(null);

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

  const autoLinksQuery = useQuery<{ links: any[]; summary: any }>({
    queryKey: ['/api/wa-import/batch', selectedBatchId, 'auto-links'],
    queryFn: () => apiRequest(`/api/wa-import/batch/${selectedBatchId}/auto-links`),
    enabled: activeTab === 'autolinks' && !!selectedBatchId,
  });

  const mediaQuery = useQuery<any[]>({
    queryKey: ['/api/wa-import/batch', selectedBatchId, 'media'],
    queryFn: () => apiRequest(`/api/wa-import/batch/${selectedBatchId}/media`),
    enabled: activeTab === 'media' && !!selectedBatchId,
  });

  const verifyAutoLinkMutation = useMutation({
    mutationFn: (data: { linkId: number; decision: 'accepted' | 'rejected' }) =>
      apiRequest(`/api/wa-import/auto-links/${data.linkId}/verify?batchId=${selectedBatchId}`, 'POST', { decision: data.decision }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'auto-links'] });
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const bulkVerifyAutoLinksMutation = useMutation({
    mutationFn: (minConfidence: number) =>
      apiRequest(`/api/wa-import/batch/${selectedBatchId}/auto-links/bulk-verify`, 'POST', { minConfidence }),
    onSuccess: (data: any) => {
      toast({ title: "تمت الموافقة الجماعية", description: `تمت الموافقة على ${data.accepted || 0} رابط` });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'auto-links'] });
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const regenerateAutoLinksMutation = useMutation({
    mutationFn: () => apiRequest(`/api/wa-import/batch/${selectedBatchId}/auto-links/generate`, 'POST'),
    onSuccess: () => {
      toast({ title: "تم التحديث", description: "تم إعادة توليد الروابط التلقائية" });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'auto-links'] });
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const workersSearchQuery = useQuery<{ workers: any[]; projects: any[]; accounts: any[]; all: any[] }>({
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
    mutationFn: async (batchId: number) => {
      const resp = await apiRequest(`/api/wa-import/batches/${batchId}/extract-names`, 'POST', {});
      if (resp.jobId) return { ...(await pollJob(resp.jobId)), _batchId: batchId };
      return { ...resp, _batchId: batchId };
    },
    onSuccess: (data: any) => {
      const batchId = data._batchId;
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
    onSuccess: (_data: any, variables: { aliasId: number; entityId: string; entityTable: string }) => {
      toast({ title: "تم الربط بنجاح" });
      if (nameLinkingBatchId) {
        queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batches', nameLinkingBatchId, 'discovered-names'] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/aliases'] });
      setLinkSelections(prev => { const next = { ...prev }; delete next[variables.aliasId]; return next; });
    },
    onError: (err: any) => toast({ title: "خطأ في الربط", description: err.message, variant: "destructive" }),
  });

  const dismissNameMutation = useMutation({
    mutationFn: (aliasId: number) =>
      apiRequest(`/api/wa-import/names/${aliasId}/dismiss`, 'POST', {}),
    onSuccess: () => {
      toast({ title: "تم تجاهل الاسم" });
      if (nameLinkingBatchId) {
        queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batches', nameLinkingBatchId, 'discovered-names'] });
      }
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const unlinkNameMutation = useMutation({
    mutationFn: (aliasId: number) =>
      apiRequest(`/api/wa-import/names/${aliasId}/unlink`, 'POST', { reason: 'مراجعة يدوية - ربط تلقائي خاطئ' }),
    onSuccess: () => {
      toast({ title: "تم فك الربط — الاسم انتقل للربط اليدوي" });
      if (nameLinkingBatchId) {
        queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batches', nameLinkingBatchId, 'discovered-names'] });
      }
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const [showAutoLinked, setShowAutoLinked] = useState(true);

  const runFullPipeline = useCallback(async (batchId: number) => {
    setPipelineBatchId(batchId);
    setPipelineDialog(true);
    setPipelineStage('media');
    setPipelineResults({});
    setPipelineError(null);

    try {
      let mediaResult: any = { skipped: 0, processed: 0, failed: 0, previouslyProcessed: 0, totalAssets: 0, newlyProcessed: 0 };
      try {
        const mediaJob = await apiRequest(`/api/wa-import/batch/${batchId}/process-media`, 'POST', {});
        if (mediaJob.jobId) {
          mediaResult = await pollJob(mediaJob.jobId);
        } else {
          mediaResult = mediaJob;
        }
      } catch (_e) { /* non-blocking */ }
      setPipelineResults(prev => ({ ...prev, media: mediaResult }));

      setPipelineStage('names');
      const namesJob = await apiRequest(`/api/wa-import/batches/${batchId}/extract-names`, 'POST', {});
      let namesResult: any;
      if (namesJob.jobId) {
        namesResult = await pollJob(namesJob.jobId);
      } else {
        namesResult = namesJob;
      }
      setPipelineResults(prev => ({ ...prev, names: namesResult }));

      setPipelineStage('autolink');
      let autoLinkResult: any = { linked: 0 };
      try {
        autoLinkResult = await apiRequest(`/api/wa-import/names/auto-link`, 'POST', { batchId });
      } catch (_e) { /* non-blocking */ }
      setPipelineResults(prev => ({ ...prev, autoLink: autoLinkResult }));

      if ((namesResult?.unlinkedNames || 0) - (autoLinkResult.linked || 0) > 0) {
        setNameLinkingBatchId(batchId);
        setPipelineStage('linking');
        setLinkSelections({});
        setWorkerSearchPerAlias({});
        setNameLinkingSearch("");
      } else {
        await checkAIAndExtract(batchId);
      }
    } catch (err: any) {
      setPipelineError(err.message || 'حدث خطأ');
      setPipelineStage('error');
    }
  }, [queryClient]);

  const checkAIAndExtract = useCallback(async (batchId: number) => {
    let aiAvailable = false;
    let aiActiveModel = '';
    try {
      const aiStatus = await apiRequest(`/api/wa-import/ai-status`, 'GET');
      setAiStatusData(aiStatus);
      aiAvailable = !!aiStatus.available;
      aiActiveModel = aiStatus.activeModel || '';
      if (!aiStatus.available) {
        setPipelineStage('ai_check');
        return;
      }
    } catch (_e) {}
    setPipelineStage('extract');
    setPipelineResults(prev => ({ ...prev, extractEngine: aiAvailable ? { method: 'ai', model: aiActiveModel || 'AI' } : { method: 'regex' } }));
    try {
      const extJob = await apiRequest(`/api/wa-import/batch/${batchId}/extract`, 'POST', {});
      let extResult: any;
      if (extJob.jobId) {
        extResult = await pollJob(extJob.jobId);
      } else {
        extResult = extJob;
      }
      setPipelineResults(prev => ({ ...prev, extract: extResult }));
      setPipelineStage('done');
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', batchId, 'candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batches'] });
    } catch (err: any) {
      setPipelineError(err.message || 'حدث خطأ');
      setPipelineStage('error');
    }
  }, [queryClient]);

  const proceedWithoutAI = useCallback(async () => {
    if (!pipelineBatchId) return;
    setPipelineStage('extract');
    setPipelineResults(prev => ({ ...prev, extractEngine: { method: 'regex' } }));
    setPipelineError(null);
    try {
      const extJob = await apiRequest(`/api/wa-import/batch/${pipelineBatchId}/extract`, 'POST', {});
      let extResult: any;
      if (extJob.jobId) {
        extResult = await pollJob(extJob.jobId);
      } else {
        extResult = extJob;
      }
      setPipelineResults(prev => ({ ...prev, extract: extResult }));
      setPipelineStage('done');
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', pipelineBatchId, 'candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batches'] });
    } catch (err: any) {
      setPipelineError(err.message || 'حدث خطأ');
      setPipelineStage('error');
    }
  }, [pipelineBatchId, queryClient]);

  const continuePipelineAfterLinking = useCallback(async () => {
    if (!pipelineBatchId) return;
    setPipelineError(null);
    await checkAIAndExtract(pipelineBatchId);
  }, [pipelineBatchId, checkAIAndExtract]);

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
    mutationFn: async (batchId: number) => {
      const resp = await apiRequest(`/api/wa-import/batch/${batchId}/reconcile`, 'POST', {});
      if (resp.jobId) return await pollJob(resp.jobId);
      return resp;
    },
    onSuccess: (data: any) => {
      toast({ title: "تمت المطابقة", description: `${data.totalCandidates} مرشح, ${data.newEntries} جديد` });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'verification-queue'] });
    },
    onError: (err: any) => toast({ title: "خطأ في المطابقة", description: err.message, variant: "destructive" }),
  });

  const extractMutation = useMutation({
    mutationFn: async (batchId: number) => {
      const resp = await apiRequest(`/api/wa-import/batch/${batchId}/extract`, 'POST', {});
      if (resp.jobId) return await pollJob(resp.jobId);
      return resp;
    },
    onSuccess: () => {
      toast({ title: "تم الاستخراج بنجاح" });
      queryClient.invalidateQueries({ queryKey: ['/api/wa-import/batch', selectedBatchId, 'candidates'] });
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const processMediaMutation = useMutation({
    mutationFn: async (batchId: number) => {
      const resp = await apiRequest(`/api/wa-import/batch/${batchId}/process-media`, 'POST', {});
      if (resp.jobId) return { ...(await pollJob(resp.jobId)), _batchId: batchId };
      return { ...resp, _batchId: batchId };
    },
    onSuccess: (data: any) => {
      const batchId = data._batchId;
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
    mutationFn: (data: { candidateId: number; amount?: string; description?: string; candidateType?: string; category?: string }) =>
      apiRequest(`/api/wa-import/candidate/${data.candidateId}`, 'PATCH', {
        amount: data.amount,
        description: data.description,
        candidateType: data.candidateType,
        category: data.category,
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

  const getCandidateDateKey = useCallback((c: any) => {
    if (!c.messageDate) return 'unknown';
    const d = new Date(c.messageDate);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const availableDates = useMemo(() => {
    const dateSet = new Set<string>();
    candidates.forEach((c: any) => dateSet.add(getCandidateDateKey(c)));
    return Array.from(dateSet).sort().reverse();
  }, [candidates, getCandidateDateKey]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c: any) => {
      if (filterStatus !== 'all' && c.matchStatus !== filterStatus) return false;
      if (confidenceFilter !== 'all') {
        const conf = parseFloat(c.confidence || '0');
        if (confidenceFilter === 'high' && conf < 0.8) return false;
        if (confidenceFilter === 'medium' && (conf < 0.5 || conf >= 0.8)) return false;
        if (confidenceFilter === 'low' && conf >= 0.5) return false;
      }
      if (dateFilter !== 'all' && getCandidateDateKey(c) !== dateFilter) return false;
      if (searchValue) {
        const s = searchValue.toLowerCase();
        return (c.description || '').toLowerCase().includes(s)
          || (c.candidateType || '').toLowerCase().includes(s)
          || (c.category || '').toLowerCase().includes(s);
      }
      return true;
    });
  }, [candidates, filterStatus, confidenceFilter, searchValue, dateFilter, getCandidateDateKey]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredCandidates.forEach((c: any) => {
      const key = getCandidateDateKey(c);
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredCandidates, getCandidateDateKey]);

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
        onReset={() => { setFilterStatus('all'); setConfidenceFilter('all'); setSearchValue(''); setDateFilter('all'); }}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-main">
        <TabsList className="w-full justify-start gap-0.5" data-testid="tabs-list">
          {[
            { value: 'batches', label: 'الدُفعات', icon: Upload, badge: 0 },
            { value: 'review', label: 'المراجعة', icon: Eye, badge: statsCount.total - statsCount.reviewed },
            { value: 'media', label: 'الوسائط', icon: Image, badge: mediaQuery.data?.length || 0 },
            { value: 'reconciliation', label: 'المطابقة', icon: BarChart3, badge: 0 },
            { value: 'custodians', label: 'أمناء العُهد', icon: Wallet, badge: 0 },
            { value: 'aliases', label: 'الأسماء المستعارة', icon: Users, badge: 0 },
            { value: 'autolinks', label: 'الربط التلقائي', icon: UserCheck, badge: (autoLinksQuery.data?.summary?.pending || 0) },
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
                  actions={([
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
                        color: 'blue' as const,
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
                  ] as any)}
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
                  {availableDates.length > 1 && (
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger className="w-44 h-8 text-xs" data-testid="select-date-filter">
                        <Calendar className="w-3.5 h-3.5 ml-1 opacity-60" />
                        <SelectValue placeholder="فلترة حسب التاريخ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع التواريخ</SelectItem>
                        {availableDates.map(d => (
                          <SelectItem key={d} value={d}>
                            {d === 'unknown' ? 'بدون تاريخ' : new Date(d + 'T00:00:00').toLocaleDateString('ar-YE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
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
                  <Button variant="outline" onClick={() => { setFilterStatus('all'); setConfidenceFilter('all'); setSearchValue(''); setDateFilter('all'); }}>
                    مسح الفلاتر
                  </Button>
                </div>
              </Card>
            )}

            {selectedBatchId && filteredCandidates.length > 0 && (
              <div className="space-y-3" data-testid="table-candidates">
              {groupedByDate.map(([dateKey, groupCandidates]) => {
                const isCollapsed = collapsedDates.has(dateKey);
                const toggleCollapse = () => {
                  setCollapsedDates(prev => {
                    const next = new Set(prev);
                    if (next.has(dateKey)) next.delete(dateKey); else next.add(dateKey);
                    return next;
                  });
                };
                const dateLabel = dateKey === 'unknown'
                  ? 'بدون تاريخ'
                  : new Date(dateKey + 'T00:00:00').toLocaleDateString('ar-YE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
                const groupTotal = groupCandidates.reduce((s: number, c: any) => s + parseFloat(c.amount || '0'), 0);

                return (
                  <div key={dateKey} className="border rounded-lg overflow-hidden bg-card" data-testid={`date-group-${dateKey}`}>
                    <button
                      onClick={toggleCollapse}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/50 hover:bg-muted transition-colors text-sm font-medium"
                      data-testid={`button-toggle-date-${dateKey}`}
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        <Calendar className="w-4 h-4 opacity-60" />
                        <span>{dateLabel}</span>
                        <Badge variant="secondary" className="text-xs">{groupCandidates.length} مرشح</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground font-normal">
                        إجمالي: {groupTotal.toLocaleString('ar')} ر.ي
                      </span>
                    </button>

                    {!isCollapsed && (
                      <UnifiedCardGrid columns={1} className="p-2 gap-2">
                {groupCandidates.map((c: any) => {
                  const confidence = parseFloat(c.confidence || '0');
                  const isExpanded = selectedCandidateId === c.id;
                  const hasActions = !c.canonicalTransactionId || !['confirmed', 'posted', 'excluded'].includes(c.canonicalStatus || '');

                  const typeAr: Record<string, string> = { expense: 'مصروف', transfer: 'تحويل', loan: 'قرض', custodian_receipt: 'أمانة', settlement: 'تسوية', salary: 'راتب', inline_expense: 'مصروف', structured_receipt: 'إيصال' };
                  const catAr: Record<string, string> = { meals: 'وجبات', miscellaneous: 'متنوع', transport: 'نقل', materials: 'مواد', labor: 'أجور', fuel: 'وقود', equipment: 'معدات', utilities: 'مرافق', rent: 'إيجار', maintenance: 'صيانة', communication: 'اتصالات', other: 'أخرى' };
                  const typeLabel = typeAr[c.candidateType] || c.candidateType;
                  const catLabel = c.category ? (catAr[c.category] || c.category) : '';

                  const candidateBadges: { label: string; variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"; className?: string }[] = [
                    { label: typeLabel, variant: 'outline' as const },
                    { label: `${(confidence * 100).toFixed(0)}%`, variant: 'outline' as const, className: confidenceColor(confidence) },
                    ...(c.matchStatus ? [(() => {
                      const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
                        exact_match: { label: "مطابق", variant: "secondary" },
                        near_match: { label: "قريب", variant: "outline" },
                        conflict: { label: "تعارض", variant: "destructive" },
                        new_entry: { label: "جديد", variant: "default" },
                      };
                      const info = map[c.matchStatus] || { label: c.matchStatus, variant: "outline" as const };
                      return { label: info.label, variant: info.variant };
                    })()] : []),
                    ...(catLabel ? [{ label: catLabel, variant: 'secondary' as const }] : []),
                    ...(c.canonicalTransactionId ? [{ label: 'تمت المراجعة', variant: 'success' as const }] : []),
                  ];

                  const candidateActions: { icon: any; label: string; onClick: () => void; variant?: "default" | "destructive" | "outline" | "secondary" | "ghost"; disabled?: boolean; hidden?: boolean; color?: "default" | "blue" | "green" | "yellow" | "red" | "orange" }[] = hasActions ? [
                    {
                      icon: ThumbsUp, label: 'موافقة', color: 'green' as const,
                      onClick: () => { setApproveDialog({ candidateId: c.id, description: c.description || '' }); setApproveProjectId(''); setApproveNotes(''); },
                    },
                    {
                      icon: ThumbsDown, label: 'رفض', color: 'red' as const,
                      onClick: () => { setRejectDialog({ candidateId: c.id, description: c.description || '' }); setRejectReason(''); },
                    },
                    {
                      icon: Pencil, label: 'تعديل', color: 'default' as const,
                      onClick: () => { setEditDialog({ candidateId: c.id, amount: c.amount || '0', description: c.description || '', candidateType: c.candidateType || 'expense', category: c.category || '' }); setEditAmount(c.amount || '0'); setEditDescription(c.description || ''); setEditCandidateType(c.candidateType || 'expense'); setEditCategory(c.category || ''); },
                    },
                    {
                      icon: Split, label: 'تقسيم', color: 'orange' as const,
                      onClick: () => {
                        setSplitDialog({ candidateId: c.id, amount: c.amount || '0', description: c.description || '' });
                        setSplitProjectId('');
                        setSplitItems([{ amount: '', description: '' }, { amount: '', description: '' }]);
                      },
                    },
                    {
                      icon: Paperclip, label: 'وسائط', color: 'blue' as const,
                      onClick: () => setMediaPreviewDialog({ candidateId: c.id, description: c.description || '' }),
                    },
                  ] : [];

                  const expandedSection = isExpanded ? (
                    <div className="mt-3 pt-3 border-t" data-testid={`row-detail-${c.id}`}>
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
                    </div>
                  ) : null;

                  const mergeCheckbox = mergeMode ? (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox"
                        checked={mergeSelected.includes(c.id)}
                        onChange={() => toggleMergeCandidate(c.id)}
                        disabled={!!c.canonicalTransactionId}
                        data-testid={`checkbox-merge-${c.id}`}
                        className="w-4 h-4" />
                      <span className="text-xs text-muted-foreground">تحديد للدمج</span>
                    </div>
                  ) : null;

                  const msgDate = c.messageDate ? new Date(c.messageDate).toLocaleDateString('ar-YE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

                  return (
                    <UnifiedCard
                      key={c.id}
                      title={c.description || `مرشح #${c.id}`}
                      subtitle={`${parseFloat(c.amount || '0').toLocaleString('ar')} ر.ي`}
                      compact
                      badges={candidateBadges}
                      fields={[
                        { label: 'المبلغ', value: `${parseFloat(c.amount || '0').toLocaleString('ar')} ر.ي`, emphasis: true, icon: Wallet },
                        { label: 'النوع', value: typeLabel, icon: FileText },
                        { label: 'الثقة', value: `${(confidence * 100).toFixed(0)}%`, color: confidence >= 0.9 ? 'success' : confidence >= 0.7 ? 'warning' : 'danger', icon: TrendingUp },
                        { label: 'المطابقة', value: (() => { const map: Record<string, string> = { exact_match: 'مطابق', near_match: 'قريب', conflict: 'تعارض', new_entry: 'جديد' }; return map[c.matchStatus] || c.matchStatus || '-'; })(), icon: Search },
                        { label: 'الفئة', value: catLabel || '-', icon: Package },
                        ...(c.senderName ? [{ label: 'المرسل', value: c.senderName, icon: Users }] : []),
                        ...(msgDate ? [{ label: 'التاريخ', value: msgDate, icon: Clock }] : []),
                      ]}
                      actions={candidateActions}
                      onClick={() => setSelectedCandidateId(isExpanded ? null : c.id)}
                      className={mergeSelected.includes(c.id) ? 'ring-2 ring-blue-400 dark:ring-blue-600' : ''}
                      customSection={<>{expandedSection}{mergeCheckbox}</>}
                      data-testid={`row-candidate-${c.id}`}
                    />
                  );
                })}
                      </UnifiedCardGrid>
                    )}
                  </div>
                );
              })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="media" className="mt-4">
          {!selectedBatchId ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <Image className="h-12 w-12 opacity-20" />
                <p className="text-lg">اختر دُفعة أولاً لعرض الوسائط</p>
              </div>
            </Card>
          ) : mediaQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : mediaQuery.isError ? (
            <Card className="p-8 text-center border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
              <div className="flex flex-col items-center gap-3 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-10 w-10" />
                <p className="text-lg font-medium">فشل تحميل الوسائط</p>
                <Button variant="outline" size="sm" onClick={() => mediaQuery.refetch()}>
                  <RefreshCw className="w-4 h-4 ml-1.5" /> إعادة المحاولة
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {(() => {
                const mediaItems = mediaQuery.data || [];
                const statusMap: Record<string, { label: string; color: string }> = {
                  ocr_completed: { label: 'تم OCR', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
                  ai_analyzed: { label: 'تم التحليل بالذكاء', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
                  pending: { label: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
                  error: { label: 'خطأ', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
                  ocr_failed: { label: 'فشل OCR', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
                  skipped_unsupported: { label: 'غير مدعوم', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
                  skipped_too_large: { label: 'كبير جداً', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
                  processed: { label: 'تمت المعالجة', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
                };
                const processed = mediaItems.filter((m: any) => ['ocr_completed', 'ai_analyzed', 'processed'].includes(m.mediaStatus));
                const pending = mediaItems.filter((m: any) => m.mediaStatus === 'pending');
                const failed = mediaItems.filter((m: any) => ['error', 'ocr_failed'].includes(m.mediaStatus));
                const skipped = mediaItems.filter((m: any) => ['skipped_unsupported', 'skipped_too_large'].includes(m.mediaStatus));

                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Card className="p-3 text-center">
                        <p className="text-2xl font-bold text-primary" data-testid="media-stat-total">{mediaItems.length}</p>
                        <p className="text-[10px] text-muted-foreground">إجمالي الملفات</p>
                      </Card>
                      <Card className="p-3 text-center">
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="media-stat-processed">{processed.length}</p>
                        <p className="text-[10px] text-muted-foreground">تمت المعالجة</p>
                      </Card>
                      <Card className="p-3 text-center">
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400" data-testid="media-stat-pending">{pending.length}</p>
                        <p className="text-[10px] text-muted-foreground">قيد الانتظار</p>
                      </Card>
                      <Card className="p-3 text-center">
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="media-stat-failed">{failed.length + skipped.length}</p>
                        <p className="text-[10px] text-muted-foreground">فشل / تخطي</p>
                      </Card>
                    </div>

                    {mediaItems.length === 0 ? (
                      <Card className="p-12 text-center">
                        <div className="flex flex-col items-center gap-4 text-muted-foreground">
                          <Image className="h-12 w-12 opacity-20" />
                          <p className="text-lg">لا توجد وسائط في هذه الدُفعة</p>
                        </div>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {mediaItems.map((m: any) => {
                          const isImage = (m.mimeType || '').startsWith('image/');
                          const status = statusMap[m.mediaStatus] || { label: m.mediaStatus, color: 'bg-gray-100 text-gray-600' };
                          const hasText = !!m.ocrText;
                          return (
                            <Card key={m.id} className="overflow-hidden" data-testid={`media-card-${m.id}`}>
                              {isImage && m.fileAvailable && (
                                <div className="h-32 bg-muted flex items-center justify-center overflow-hidden">
                                  <img
                                    src={`/api/wa-import/media/${m.id}/file`}
                                    alt={m.originalFilename}
                                    className="max-h-full max-w-full object-contain"
                                    loading="lazy"
                                  />
                                </div>
                              )}
                              {!isImage && (
                                <div className="h-20 bg-muted/50 flex items-center justify-center">
                                  <File className="w-8 h-8 text-muted-foreground/50" />
                                </div>
                              )}
                              <CardContent className="p-3 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-xs font-medium truncate flex-1" title={m.originalFilename} dir="ltr">
                                    {m.originalFilename}
                                  </p>
                                  <Badge className={`text-[10px] shrink-0 ${status.color}`}>
                                    {status.label}
                                  </Badge>
                                </div>
                                {m.fileSizeBytes && (
                                  <p className="text-[10px] text-muted-foreground">
                                    الحجم: {(m.fileSizeBytes / 1024).toFixed(0)} KB
                                  </p>
                                )}
                                {hasText && (
                                  <details className="text-xs">
                                    <summary className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline" data-testid={`media-text-toggle-${m.id}`}>
                                      عرض النص المستخرج
                                    </summary>
                                    <pre className="mt-1 p-2 bg-muted rounded text-[10px] max-h-32 overflow-auto whitespace-pre-wrap" dir="auto">
                                      {m.ocrText}
                                    </pre>
                                  </details>
                                )}
                                {m.skipReason && (
                                  <p className="text-[10px] text-red-500 dark:text-red-400">السبب: {m.skipReason}</p>
                                )}
                                {m.fileAvailable && (
                                  <a href={`/api/wa-import/media/${m.id}/file`} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                    data-testid={`media-download-${m.id}`}>
                                    <Download className="w-3 h-3" /> تحميل الملف
                                  </a>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
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
                    <div data-testid="table-verification" className="p-3">
                      {(verificationQuery.data || []).length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          لا توجد عناصر في طابور التحقق
                        </div>
                      ) : (
                        <UnifiedCardGrid columns={1}>
                          {(verificationQuery.data || []).map((item: any, i: number) => (
                            <UnifiedCard
                              key={i}
                              compact
                              title={`مرشح #${item.wa_verification_queue?.candidateId || '-'}`}
                              badges={[
                                {
                                  label: item.wa_verification_queue?.priority || '-',
                                  variant: item.wa_verification_queue?.priority === 'P1_critical' ? 'destructive' as const :
                                    item.wa_verification_queue?.priority === 'P2_high' ? 'default' as const : 'secondary' as const,
                                },
                              ]}
                              fields={[
                                {
                                  label: 'السبب',
                                  value: item.wa_verification_queue?.reason || '-',
                                },
                              ]}
                              data-testid={`row-verification-${i}`}
                            />
                          ))}
                        </UnifiedCardGrid>
                      )}
                    </div>
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
              <UnifiedCardGrid columns={1}>
                {(aliasesQuery.data || []).map((alias: any) => (
                  <UnifiedCard
                    key={alias.id}
                    compact
                    title={alias.aliasName}
                    titleIcon={Users}
                    data-testid={`row-alias-${alias.id}`}
                    fields={[
                      { label: "معرف العامل", value: alias.canonicalWorkerId, icon: Hash },
                      { label: "تاريخ الإنشاء", value: alias.createdAt ? new Date(alias.createdAt).toLocaleDateString('ar') : '-', icon: Clock },
                    ]}
                    actions={[
                      {
                        icon: Trash2,
                        label: "حذف",
                        variant: "destructive" as const,
                        color: "red" as const,
                        disabled: deleteAliasMutation.isPending,
                        onClick: () => {
                          if (confirm('هل أنت متأكد من حذف هذا الاسم المستعار؟')) {
                            deleteAliasMutation.mutate(alias.id);
                          }
                        },
                      },
                    ]}
                  />
                ))}
              </UnifiedCardGrid>
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
              <UnifiedCardGrid columns={1}>
                {(loansQuery.data || []).map((loan: any) => {
                  const conf = parseFloat(loan.confidence || '0');
                  const matchInfo: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
                    exact_match: { label: "مطابق", variant: "secondary" },
                    near_match: { label: "قريب", variant: "outline" },
                    conflict: { label: "تعارض", variant: "destructive" },
                    new_entry: { label: "جديد", variant: "default" },
                  };
                  const mInfo = matchInfo[loan.matchStatus || 'new_entry'] || { label: loan.matchStatus || 'جديد', variant: "outline" as const };
                  const confVariant = conf >= 0.9 ? "success" : conf >= 0.7 ? "warning" : "destructive";
                  return (
                    <UnifiedCard
                      key={loan.id}
                      compact
                      title={`${parseFloat(loan.amount || '0').toLocaleString('ar')} ر.ي`}
                      subtitle={loan.description || '-'}
                      titleIcon={Wallet}
                      data-testid={`row-loan-${loan.id}`}
                      badges={[
                        { label: mInfo.label, variant: mInfo.variant as any },
                        { label: `${(conf * 100).toFixed(0)}%`, variant: confVariant as any },
                      ]}
                      fields={[
                        { label: "الحالة", value: mInfo.label, icon: Shield },
                        { label: "الثقة", value: `${(conf * 100).toFixed(0)}%`, color: conf >= 0.9 ? "success" : conf >= 0.7 ? "warning" : "danger" },
                        { label: "الفئة", value: loan.category || '-', icon: FileText, color: "muted" as const },
                      ]}
                    />
                  );
                })}
              </UnifiedCardGrid>
            )}
          </div>
        </TabsContent>

        <TabsContent value="autolinks" className="mt-4">
          <div className="space-y-4">
            {!selectedBatchId ? (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <UserCheck className="h-12 w-12 opacity-20" />
                  <p className="text-lg" data-testid="text-select-batch-autolinks">اختر دُفعة أولاً من تبويب الدُفعات</p>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('batches')} data-testid="btn-go-batches-autolinks">
                    <Upload className="w-4 h-4 ml-1.5" /> الذهاب للدُفعات
                  </Button>
                </div>
              </Card>
            ) : autoLinksQuery.isError ? (
              <Card className="p-8 text-center border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
                <div className="flex flex-col items-center gap-3 text-red-600 dark:text-red-400" data-testid="error-autolinks">
                  <AlertTriangle className="h-10 w-10" />
                  <p className="text-lg font-medium">فشل تحميل الروابط التلقائية</p>
                  <p className="text-sm text-red-500">{(autoLinksQuery.error as any)?.message || 'خطأ غير معروف'}</p>
                  <Button variant="outline" size="sm" onClick={() => autoLinksQuery.refetch()} data-testid="btn-retry-autolinks">
                    <RefreshCw className="w-4 h-4 ml-1.5" /> إعادة المحاولة
                  </Button>
                </div>
              </Card>
            ) : autoLinksQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : (() => {
              const links = autoLinksQuery.data?.links || [];
              const summary = autoLinksQuery.data?.summary || { total: 0, verified: 0, pending: 0, rejected: 0, highConfidence: 0, mediumConfidence: 0, lowConfidence: 0 };

              const filteredLinks = links.filter((link: any) => {
                if (autoLinkFilter === 'all') return true;
                if (autoLinkFilter === 'pending') return link.status === 'pending';
                if (autoLinkFilter === 'accepted') return link.status === 'accepted';
                if (autoLinkFilter === 'rejected') return link.status === 'rejected';
                if (autoLinkFilter === 'high') return link.confidence > 0.85;
                if (autoLinkFilter === 'medium') return link.confidence >= 0.60 && link.confidence <= 0.85;
                if (autoLinkFilter === 'low') return link.confidence < 0.60;
                return true;
              });

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2" data-testid="autolinks-summary">
                    {[
                      { label: 'الإجمالي', value: summary.total, color: 'text-foreground' },
                      { label: 'تم التحقق', value: summary.verified, color: 'text-green-600 dark:text-green-400' },
                      { label: 'قيد الانتظار', value: summary.pending, color: 'text-yellow-600 dark:text-yellow-400' },
                      { label: 'مرفوض', value: summary.rejected, color: 'text-red-600 dark:text-red-400' },
                      { label: 'ثقة عالية', value: summary.highConfidence, color: 'text-green-600 dark:text-green-400' },
                      { label: 'ثقة متوسطة', value: summary.mediumConfidence, color: 'text-yellow-600 dark:text-yellow-400' },
                      { label: 'ثقة منخفضة', value: summary.lowConfidence, color: 'text-red-600 dark:text-red-400' },
                    ].map((stat, idx) => (
                      <Card key={idx} className="p-3 text-center">
                        <p className={`text-xl font-bold ${stat.color}`} data-testid={`stat-autolink-${idx}`}>{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </Card>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select value={autoLinkFilter} onValueChange={setAutoLinkFilter}>
                        <SelectTrigger className="w-[160px]" data-testid="select-autolink-filter">
                          <SelectValue placeholder="تصفية" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          <SelectItem value="pending">قيد الانتظار</SelectItem>
                          <SelectItem value="accepted">مقبول</SelectItem>
                          <SelectItem value="rejected">مرفوض</SelectItem>
                          <SelectItem value="high">ثقة عالية (&gt;85%)</SelectItem>
                          <SelectItem value="medium">ثقة متوسطة (60-85%)</SelectItem>
                          <SelectItem value="low">ثقة منخفضة (&lt;60%)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Badge variant="outline" data-testid="badge-autolink-count">{filteredLinks.length} رابط</Badge>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => regenerateAutoLinksMutation.mutate()}
                        disabled={regenerateAutoLinksMutation.isPending}
                        data-testid="btn-regenerate-autolinks"
                      >
                        {regenerateAutoLinksMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-1.5" /> : <RefreshCw className="w-4 h-4 ml-1.5" />}
                        إعادة التوليد
                      </Button>
                      {summary.pending > 0 && (
                        <Button
                          size="sm"
                          onClick={() => bulkVerifyAutoLinksMutation.mutate(0.90)}
                          disabled={bulkVerifyAutoLinksMutation.isPending}
                          data-testid="btn-bulk-approve-autolinks"
                        >
                          {bulkVerifyAutoLinksMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-1.5" /> : <CheckCircle2 className="w-4 h-4 ml-1.5" />}
                          موافقة جماعية (&gt;90%)
                        </Button>
                      )}
                    </div>
                  </div>

                  {filteredLinks.length === 0 ? (
                    <Card className="p-12 text-center">
                      <div className="flex flex-col items-center gap-4 text-muted-foreground">
                        <UserCheck className="h-12 w-12 opacity-20" />
                        <p className="text-lg" data-testid="text-no-autolinks">لا توجد روابط تلقائية {autoLinkFilter !== 'all' ? 'بهذا الفلتر' : 'لهذه الدُفعة'}</p>
                      </div>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {filteredLinks.map((link: any) => {
                        const confPercent = Math.round(link.confidence * 100);
                        const confBadgeClass = confPercent > 85
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                          : confPercent >= 60
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
                        const statusBadge = link.status === 'accepted'
                          ? <Badge variant="default" className="bg-green-600" data-testid={`badge-status-${link.id}`}><CheckCircle className="w-3 h-3 ml-1" /> مقبول</Badge>
                          : link.status === 'rejected'
                            ? <Badge variant="destructive" data-testid={`badge-status-${link.id}`}><XCircle className="w-3 h-3 ml-1" /> مرفوض</Badge>
                            : <Badge variant="secondary" data-testid={`badge-status-${link.id}`}><Clock className="w-3 h-3 ml-1" /> قيد الانتظار</Badge>;

                        const linkTypeLabel = link.linkType === 'worker' ? 'عامل'
                          : link.linkType === 'supplier' ? 'مورد'
                            : link.linkType === 'project' ? 'مشروع'
                              : link.linkType;

                        return (
                          <Card key={link.id} className="p-4" data-testid={`autolink-card-${link.id}`}>
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="text-xs" data-testid={`badge-type-${link.id}`}>
                                    {linkTypeLabel}
                                  </Badge>
                                  <Badge className={`text-xs ${confBadgeClass}`} data-testid={`badge-confidence-${link.id}`}>
                                    {confPercent}%
                                  </Badge>
                                  {statusBadge}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                  <div>
                                    <span className="text-muted-foreground text-xs">المصدر:</span>
                                    <p className="font-medium truncate" dir="rtl" data-testid={`text-source-${link.id}`}>{link.sourceText}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground text-xs">الكيان المطابق:</span>
                                    <p className="font-medium truncate" dir="rtl" data-testid={`text-entity-${link.id}`}>{link.linkedEntityName}</p>
                                  </div>
                                </div>

                                <div className="text-xs text-muted-foreground" data-testid={`text-reason-${link.id}`}>
                                  <span className="font-medium">السبب:</span> {link.matchReason}
                                </div>

                                {link.evidence && link.evidence.length > 0 && (
                                  <div className="text-xs text-muted-foreground space-y-0.5" data-testid={`text-evidence-${link.id}`}>
                                    {link.evidence.map((ev: any, i: number) => (
                                      <p key={i}><span className="font-medium">{ev.method}:</span> {ev.detail}</p>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {link.status === 'pending' && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 border-green-200 dark:border-green-800"
                                    onClick={() => verifyAutoLinkMutation.mutate({ linkId: link.id, decision: 'accepted' })}
                                    disabled={verifyAutoLinkMutation.isPending}
                                    data-testid={`btn-accept-autolink-${link.id}`}
                                  >
                                    <ThumbsUp className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 border-red-200 dark:border-red-800"
                                    onClick={() => verifyAutoLinkMutation.mutate({ linkId: link.id, decision: 'rejected' })}
                                    disabled={verifyAutoLinkMutation.isPending}
                                    data-testid={`btn-reject-autolink-${link.id}`}
                                  >
                                    <ThumbsDown className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
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
        <DialogContent data-testid="dialog-edit" dir="rtl">
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
            <div>
              <label className="text-sm font-medium mb-1 block">النوع</label>
              <Select value={editCandidateType} onValueChange={setEditCandidateType}>
                <SelectTrigger data-testid="select-edit-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">مصروف</SelectItem>
                  <SelectItem value="transfer">تحويل</SelectItem>
                  <SelectItem value="loan">قرض</SelectItem>
                  <SelectItem value="custodian_receipt">أمانة</SelectItem>
                  <SelectItem value="settlement">تسوية</SelectItem>
                  <SelectItem value="salary">راتب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">الفئة</label>
              <Select value={editCategory || '_none'} onValueChange={(v: string) => setEditCategory(v === '_none' ? '' : v)}>
                <SelectTrigger data-testid="select-edit-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">بدون فئة</SelectItem>
                  <SelectItem value="meals">وجبات</SelectItem>
                  <SelectItem value="materials">مواد</SelectItem>
                  <SelectItem value="transport">نقل</SelectItem>
                  <SelectItem value="labor">أجور</SelectItem>
                  <SelectItem value="fuel">وقود</SelectItem>
                  <SelectItem value="equipment">معدات</SelectItem>
                  <SelectItem value="utilities">مرافق</SelectItem>
                  <SelectItem value="rent">إيجار</SelectItem>
                  <SelectItem value="maintenance">صيانة</SelectItem>
                  <SelectItem value="communication">اتصالات</SelectItem>
                  <SelectItem value="miscellaneous">متنوع</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)} data-testid="button-cancel-edit">إلغاء</Button>
            <Button onClick={() => {
              if (editDialog) editCandidateMutation.mutate({
                candidateId: editDialog.candidateId,
                amount: editAmount,
                description: editDescription,
                candidateType: editCandidateType,
                category: editCategory,
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
            {workersSearchQuery.data?.all && workersSearchQuery.data.all.length > 0 && (
              <div className="max-h-40 overflow-y-auto border rounded-md">
                {workersSearchQuery.data.all.map((w: any) => (
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

      <Dialog open={pipelineDialog} onOpenChange={(open) => { if (!open && (pipelineStage === 'done' || pipelineStage === 'error' || pipelineStage === 'linking' || pipelineStage === 'ai_check')) setPipelineDialog(false); }}>
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
            const stageOrder = ['media', 'names', 'autolink', 'linking', 'ai_check', 'extract', 'done', 'error'];
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
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-xs text-muted-foreground">
                                إجمالي: {pipelineResults.media.totalAssets || 0} ملف
                              </span>
                              <div className="flex items-center gap-2 text-[10px]">
                                {(pipelineResults.media.previouslyProcessed > 0) && (
                                  <span className="text-blue-600 dark:text-blue-400">سابق: {pipelineResults.media.previouslyProcessed}</span>
                                )}
                                {(pipelineResults.media.newlyProcessed > 0) && (
                                  <span className="text-green-600 dark:text-green-400">جديد: {pipelineResults.media.newlyProcessed}</span>
                                )}
                                {(pipelineResults.media.failed > 0) && (
                                  <span className="text-red-600 dark:text-red-400">فشل: {pipelineResults.media.failed}</span>
                                )}
                              </div>
                            </div>
                          )}
                          {isDone && stage.key === 'names' && pipelineResults.names && (
                            <span className="text-xs text-muted-foreground">{pipelineResults.names.totalNames || 0} اسم ({pipelineResults.names.newNames || 0} جديد)</span>
                          )}
                          {isDone && stage.key === 'autolink' && pipelineResults.autoLink && (
                            <span className="text-xs text-muted-foreground">تم ربط {pipelineResults.autoLink.linked || 0} تلقائياً</span>
                          )}
                          {isDone && stage.key === 'extract' && pipelineResults.extract && (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-xs text-muted-foreground">
                                {pipelineResults.extract.candidatesCreated || 0} مرشح
                                {pipelineResults.extract.resumed && ` (استئناف، ${pipelineResults.extract.previousCandidates || 0} سابق)`}
                              </span>
                              {pipelineResults.extractEngine && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${pipelineResults.extractEngine.method === 'ai' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                                  {pipelineResults.extractEngine.method === 'ai'
                                    ? `🤖 ${pipelineResults.extractEngine.model}`
                                    : '⚡ Regex'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {isActive && stage.key !== 'linking' && (
                          <div className="mt-2 space-y-1.5">
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
                            </div>
                            {stage.key === 'extract' && pipelineResults.extractEngine && (
                              <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${pipelineResults.extractEngine.method === 'ai' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                                <span className={`w-2 h-2 rounded-full animate-pulse ${pipelineResults.extractEngine.method === 'ai' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                                {pipelineResults.extractEngine.method === 'ai'
                                  ? `🤖 ذكاء اصطناعي: ${pipelineResults.extractEngine.model}`
                                  : '⚡ نظام Regex (تعبيرات نمطية)'}
                              </div>
                            )}
                            {stage.key === 'media' && (
                              <span className="text-[10px] text-muted-foreground">جارٍ تحليل الصور والمستندات بـ OCR...</span>
                            )}
                            {stage.key === 'names' && (
                              <span className="text-[10px] text-muted-foreground">جارٍ استخراج الأسماء من الرسائل...</span>
                            )}
                          </div>
                        )}

                        {(isDone || isActive) && stage.key === 'extract' && pipelineResults.extract?.aiStatus && (
                          <div className="mt-2 space-y-1">
                            {pipelineResults.extract.aiStatus.models.map((m: any) => (
                              <div key={m.provider} className={`flex items-center gap-2 text-xs rounded px-2 py-1 ${m.isAvailable ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'}`}>
                                <span className={`w-2 h-2 rounded-full ${m.isAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="font-medium">{m.provider}/{m.model}</span>
                                {m.error && <span className="mr-auto">({m.error})</span>}
                                {m.isAvailable && pipelineResults.extract.aiStatus.activeModel === `${m.provider}/${m.model}` && <span className="mr-auto text-green-600">(نشط)</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {pipelineStage === 'linking' && (() => {
                  const allNames = discoveredNamesQuery.data || [];
                  const autoLinkedNames = allNames.filter((n: any) => n.canonicalEntityId && n.isActive !== false);
                  return autoLinkedNames.length > 0 ? (
                    <div className="border rounded-lg p-4 space-y-3 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" data-testid="auto-linked-review">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-green-800 dark:text-green-300">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">مراجعة الربط التلقائي ({autoLinkedNames.length} اسم)</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAutoLinked(!showAutoLinked)}
                          className="text-sm"
                          data-testid="btn-toggle-auto-linked"
                        >
                          {showAutoLinked ? 'إخفاء' : 'عرض'}
                        </Button>
                      </div>
                      {showAutoLinked && (
                        <div className="max-h-[35vh] overflow-y-auto space-y-1.5">
                          {autoLinkedNames.map((name: any) => {
                            const entityLabel = name.entityTable === 'projects' ? 'مشروع' : name.entityTable === 'account_types' ? 'حساب' : 'عامل';
                            const badgeColor = name.entityTable === 'projects' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : name.entityTable === 'account_types' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
                            return (
                              <div key={name.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-white dark:bg-gray-900 border flex-wrap" data-testid={`auto-linked-row-${name.id}`}>
                                <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                                  <span className="font-medium text-sm truncate">{name.aliasName}</span>
                                  <ArrowLeftRight className="w-3 h-3 text-muted-foreground shrink-0" />
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${badgeColor} shrink-0`}>{entityLabel}</span>
                                  <span className="text-sm text-green-700 dark:text-green-400 truncate">{name.linkedEntityName || name.canonicalEntityId}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="الربط صحيح"
                                    data-testid={`btn-confirm-link-${name.id}`}
                                    disabled
                                  >
                                    <ThumbsUp className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="فك الربط — نقل للربط اليدوي"
                                    onClick={() => unlinkNameMutation.mutate(name.id)}
                                    disabled={unlinkNameMutation.isPending}
                                    data-testid={`btn-unlink-${name.id}`}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null;
                })()}

                {pipelineStage === 'linking' && (
                  <div className="border rounded-lg p-4 space-y-3 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">توجد أسماء غير مربوطة تحتاج ربط يدوي</span>
                    </div>

                    {(() => {
                      const allNames = discoveredNamesQuery.data || [];
                      const totalCount = allNames.length;
                      const linkedCount = allNames.filter((n: any) => n.canonicalEntityId).length;
                      const dismissedCount = allNames.filter((n: any) => n.isActive === false).length;
                      const unlinkedCount = allNames.filter((n: any) => !n.canonicalEntityId && n.isActive !== false).length;
                      const linkedPercent = totalCount > 0 ? Math.round((linkedCount / totalCount) * 100) : 0;

                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center" data-testid="linking-stats">
                          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2">
                            <div className="text-lg font-bold text-blue-700 dark:text-blue-300" data-testid="stat-total">{totalCount}</div>
                            <div className="text-[10px] text-blue-600 dark:text-blue-400">إجمالي مكتشف</div>
                          </div>
                          <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-2">
                            <div className="text-lg font-bold text-green-700 dark:text-green-300" data-testid="stat-linked">{linkedCount}</div>
                            <div className="text-[10px] text-green-600 dark:text-green-400">تم ربطه</div>
                          </div>
                          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2">
                            <div className="text-lg font-bold text-amber-700 dark:text-amber-300" data-testid="stat-unlinked">{unlinkedCount}</div>
                            <div className="text-[10px] text-amber-600 dark:text-amber-400">بانتظار الربط</div>
                          </div>
                          <div className="rounded-lg bg-gray-50 dark:bg-gray-950/30 p-2">
                            <div className="text-lg font-bold text-gray-700 dark:text-gray-300" data-testid="stat-dismissed">{dismissedCount}</div>
                            <div className="text-[10px] text-gray-600 dark:text-gray-400">تم تجاهله</div>
                          </div>
                          <div className="col-span-2 sm:col-span-4">
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
                              {linkedPercent > 0 && <div className="h-full bg-green-500 transition-all" style={{ width: `${linkedPercent}%` }} />}
                              {dismissedCount > 0 && <div className="h-full bg-gray-400 transition-all" style={{ width: `${Math.round((dismissedCount / totalCount) * 100)}%` }} />}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{linkedPercent}% مكتمل</p>
                          </div>
                        </div>
                      );
                    })()}

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
                          .filter((n: any) => !n.canonicalEntityId && n.isActive !== false)
                          .filter((n: any) => !nameLinkingSearch || n.aliasName?.includes(nameLinkingSearch) || n.entityType?.includes(nameLinkingSearch));

                        if (names.length === 0) return (
                          <div className="text-center py-4 text-sm text-muted-foreground">
                            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-60" />
                            جميع الأسماء مربوطة
                          </div>
                        );

                        return names.map((name: any) => {
                          const searchTerm = workerSearchPerAlias[name.id] || '';
                          const allEntities = (allWorkersQuery.data as any)?.all || allWorkersQuery.data || [];
                          const filteredEntities = searchTerm.length > 0
                            ? allEntities.filter((w: any) => w.name?.includes(searchTerm) || w.id?.toString().includes(searchTerm))
                            : allEntities.slice(0, 15);
                          const selected = linkSelections[name.id];

                          const entityLabelColors: Record<string, string> = {
                            'عامل': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                            'مشروع': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                            'حساب': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
                          };

                          return (
                            <div key={name.id} className="rounded-lg border bg-white dark:bg-gray-900 p-3 space-y-2" data-testid={`unlinked-name-${name.id}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">{name.aliasName}</span>
                                  <Badge variant="outline" className="text-[10px]">{name.entityType}</Badge>
                                  {name.occurrenceCount > 1 && <Badge variant="secondary" className="text-[10px]">{name.occurrenceCount}×</Badge>}
                                </div>
                                <div className="flex items-center gap-1">
                                  {selected && (
                                    <Button size="sm" variant="default" className="h-7 text-xs" data-testid={`button-link-${name.id}`}
                                      onClick={() => linkNameMutation.mutate({ aliasId: name.id, entityId: selected.entityId, entityTable: selected.entityTable })}
                                      disabled={linkNameMutation.isPending}>
                                      <Link2 className="w-3 h-3 ml-1" /> ربط
                                    </Button>
                                  )}
                                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" data-testid={`button-dismiss-${name.id}`}
                                    onClick={() => dismissNameMutation.mutate(name.id)}
                                    disabled={dismissNameMutation.isPending}
                                    title="تجاهل — ليس اسم صحيح">
                                    <XCircle className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {(name.sourceMessageText || name.context) && (
                                <div className="text-[11px] text-muted-foreground bg-muted/50 rounded px-2 py-1.5 space-y-0.5">
                                  {name.sourceSender && <span className="font-medium text-primary/70">{name.sourceSender}: </span>}
                                  <p className="line-clamp-3 whitespace-pre-wrap">
                                    {(name.sourceMessageText || name.context || '').split(/(\d[\d,،.]+)/g).map((part: string, pi: number) =>
                                      /^\d[\d,،.]+$/.test(part) ? (
                                        <mark key={pi} className="bg-yellow-200 dark:bg-yellow-800 font-bold px-0.5 rounded text-foreground">{part}</mark>
                                      ) : (
                                        <Fragment key={pi}>{part}</Fragment>
                                      )
                                    )}
                                  </p>
                                </div>
                              )}

                              <div className="flex gap-2 items-center">
                                <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <Input
                                  placeholder="ابحث عن عامل / مشروع / حساب..."
                                  value={searchTerm}
                                  onChange={e => setWorkerSearchPerAlias(prev => ({ ...prev, [name.id]: e.target.value }))}
                                  className="h-8 text-xs"
                                  data-testid={`input-search-worker-${name.id}`}
                                />
                              </div>

                              {filteredEntities.length > 0 && (
                                <div className="max-h-32 overflow-y-auto border rounded">
                                  {filteredEntities.map((w: any) => (
                                    <div
                                      key={`${w.entityTable}-${w.id}`}
                                      className={`px-2.5 py-1.5 text-xs cursor-pointer hover:bg-primary/10 flex items-center justify-between ${selected?.entityId === w.id && selected?.entityTable === w.entityTable ? 'bg-primary/15 font-medium' : ''}`}
                                      onClick={() => setLinkSelections(prev => ({ ...prev, [name.id]: { entityId: w.id, entityTable: w.entityTable } }))}
                                      data-testid={`entity-option-${name.id}-${w.entityTable}-${w.id}`}
                                    >
                                      <span>{w.name}</span>
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${entityLabelColors[w.entityLabel] || 'bg-gray-100 text-gray-600'}`}>{w.entityLabel}</span>
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

                {pipelineStage === 'ai_check' && aiStatusData && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-3" data-testid="ai-check-panel">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <span className="text-sm font-semibold">نماذج الذكاء الاصطناعي غير متاحة حالياً</span>
                    </div>
                    <div className="space-y-1.5">
                      {aiStatusData.models?.map((m: any) => (
                        <div key={m.provider} className="flex items-center gap-2 text-xs rounded px-2 py-1.5 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-800">
                          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                          <span className="font-medium">{m.provider}/{m.model}</span>
                          {m.error && <span className="mr-auto">- {m.error}</span>}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      يمكنك المتابعة بالاستخراج العادي (Regex) بدون ذكاء اصطناعي. النتائج ستكون أقل دقة لكن تبقى مفيدة.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={proceedWithoutAI} data-testid="btn-proceed-without-ai">
                        <Play className="w-3.5 h-3.5 ml-1" /> متابعة بدون AI
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setPipelineStage('error'); setPipelineError('تم الإلغاء: نماذج AI غير متاحة'); }} data-testid="btn-cancel-ai">
                        إلغاء
                      </Button>
                    </div>
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
