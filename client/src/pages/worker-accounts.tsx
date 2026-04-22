/**
 * الوصف: صفحة إدارة حسابات العمال والحوالات المالية
 * المدخلات: بيانات العمال والحوالات المالية
 * المخرجات: عرض أرصدة العمال وإدارة الحوالات
 * المالك: عمار
 * آخر تعديل: 2025-12-07
 * الحالة: نشط - إدارة مالية العمال - تصميم موحد
 */

import { DatePickerField } from "@/components/ui/date-picker-field";
import SelectedProjectBadge from "@/components/selected-project-badge";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkerSelect, ProjectSelect } from '@/components/ui/searchable-select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useFloatingButton } from '@/components/layout/floating-button-context';
import { useSelectedProject, ALL_PROJECTS_ID } from '@/hooks/use-selected-project';
import { UnifiedFilterDashboard } from '@/components/ui/unified-filter-dashboard';
import type { StatsRowConfig, FilterConfig } from '@/components/ui/unified-filter-dashboard/types';
import { UnifiedCard, UnifiedCardGrid } from '@/components/ui/unified-card';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  User, 
  Phone, 
  CreditCard, 
  Calendar,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Users,
  Wallet,
  TrendingUp,
  FileText,
  Download,
  Building2,
  Briefcase,
  Split,
  ArrowRightLeft,
  Layers
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { downloadExcelFile } from '@/utils/webview-download';
import { AutocompleteInput } from '@/components/ui/autocomplete-input-database';
import { FinancialGuardDialog, type FinancialGuardData } from '@/components/financial-guard-dialog';
import '@/styles/unified-print-styles.css';
import { QUERY_KEYS } from "@/constants/queryKeys";

interface Worker {
  id: string;
  name: string;
  type: string;
  dailyWage: string;
  is_active: boolean;
}

interface Project {
  id: string;
  name: string;
  status: string;
}

interface WorkerTransfer {
  id: string;
  worker_id: string;
  project_id: string;
  amount: number;
  recipientName: string;
  recipientPhone?: string;
  transferMethod: 'cash' | 'bank' | 'hawaleh';
  transferNumber?: string;
  transferDate: string;
  notes?: string;
}

interface TransferFormData {
  worker_id: string;
  project_id: string;
  amount: number;
  recipientName: string;
  recipientPhone: string;
  transferMethod: 'cash' | 'bank' | 'hawaleh';
  transferNumber: string;
  transferDate: string;
  notes: string;
}

interface AllocationItem {
  projectId: string;
  projectName: string;
  balance: number;
  amount: number;
}

interface OpenBalanceItem {
  projectId: string;
  projectName: string;
  balance: number;
}

export default function WorkerAccountsPage() {
  const [, setLocation] = useLocation();
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<WorkerTransfer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState('all');
  const [transferMethodFilter, setTransferMethodFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [specificDate, setSpecificDate] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showGuardDialog, setShowGuardDialog] = useState(false);
  const [guardData, setGuardData] = useState<FinancialGuardData | null>(null);
  const [allocationMode, setAllocationMode] = useState(false);
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();
  const { selectedProjectId, getProjectIdForApi, isAllProjects } = useSelectedProject();
  
  const selectedProject = getProjectIdForApi() || '';

  const saveAutocompleteValue = async (field: string, value: string) => {
    if (!value || value.trim().length < 2) return;
    
    try {
      await apiRequest('/api/autocomplete', 'POST', {
        category: field,
        value: value.trim(),
        usageCount: 1
      });
    } catch (error) {
    }
  };

  const [formData, setFormData] = useState<TransferFormData>({
    worker_id: '',
    project_id: '',
    amount: 0,
    recipientName: '',
    recipientPhone: '',
    transferMethod: 'hawaleh',
    transferNumber: '',
    transferDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const saveAllTransferAutocompleteValues = async () => {
    const promises = [];
    
    if (formData.recipientName && formData.recipientName.trim().length >= 2) {
      promises.push(saveAutocompleteValue('recipientNames', formData.recipientName));
    }
    
    if (formData.recipientPhone && formData.recipientPhone.trim().length >= 3) {
      promises.push(saveAutocompleteValue('recipientPhones', formData.recipientPhone));
    }
    
    if (formData.transferNumber && formData.transferNumber.trim().length >= 1) {
      promises.push(saveAutocompleteValue('workerTransferNumbers', formData.transferNumber));
    }
    
    if (formData.notes && formData.notes.trim().length >= 2) {
      promises.push(saveAutocompleteValue('workerTransferNotes', formData.notes));
    }
    
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  };

  const urlParams = new URLSearchParams(window.location.search);
  const editTransferId = urlParams.get('edit');
  const preselectedWorker = urlParams.get('worker');

  const { data: workers = [], isLoading: isLoadingWorkers } = useQuery<Worker[]>({
    queryKey: QUERY_KEYS.workers,
    select: (data: Worker[]) => Array.isArray(data) ? data.filter(w => w.is_active) : []
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: QUERY_KEYS.projects,
    select: (data) => Array.isArray(data) ? data : []
  });

  const { data: transfers = [], isLoading: isLoadingTransfers } = useQuery<WorkerTransfer[]>({
    queryKey: QUERY_KEYS.workerTransfers(selectedProjectId),
    queryFn: async () => {
      const url = selectedProject 
        ? `/api/worker-transfers?project_id=${selectedProject}` 
        : '/api/worker-transfers';
      const response = await apiRequest(url, 'GET');
      return Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
    }
  });

  const { data: projectWagesData } = useQuery<any>({
    queryKey: QUERY_KEYS.workerProjectWagesByProject(selectedProject || 'all'),
    queryFn: async () => {
      if (!selectedProject) return [];
      const response = await apiRequest(`/api/worker-project-wages/by-project/${selectedProject}`, 'GET');
      return response?.data || (Array.isArray(response) ? response : []);
    },
    enabled: !!selectedProject,
  });

  const projectWages: any[] = Array.isArray(projectWagesData) ? projectWagesData : [];

  const getWorkerProjectWage = (workerId: string) => {
    return projectWages.find((w: any) => w.worker_id === workerId && w.is_active);
  };

  const dialogWorkerId = formData.worker_id;

  const { data: openBalancesData } = useQuery<{ data: OpenBalanceItem[] }>({
    queryKey: ['/api/workers', dialogWorkerId, 'open-balances'],
    queryFn: () => apiRequest(`/api/workers/${dialogWorkerId}/open-balances`, 'GET'),
    enabled: !!dialogWorkerId && showTransferDialog,
  });

  const openBalances: OpenBalanceItem[] = useMemo(() => {
    const raw = openBalancesData?.data || (Array.isArray(openBalancesData) ? openBalancesData : []);
    return (raw as OpenBalanceItem[]).filter(b => b.balance > 0);
  }, [openBalancesData]);

  const hasMultipleProjects = openBalances.length > 1;

  useEffect(() => {
    if (!showTransferDialog) {
      setAllocationMode(false);
      setAllocations([]);
    }
  }, [showTransferDialog]);

  useEffect(() => {
    if (allocationMode && openBalances.length > 0) {
      setAllocations(openBalances.map(b => ({
        projectId: b.projectId,
        projectName: b.projectName,
        balance: b.balance,
        amount: 0,
      })));
    } else if (!allocationMode) {
      setAllocations([]);
    }
  }, [allocationMode, openBalances]);

  const allocationTotal = useMemo(() => {
    return allocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  }, [allocations]);

  const isAllocationMatched = allocationTotal === formData.amount && formData.amount > 0;

  const handleProportionalAllocation = () => {
    if (!formData.amount || openBalances.length === 0) return;
    const totalBalance = openBalances.reduce((sum, b) => sum + b.balance, 0);
    if (totalBalance <= 0) return;
    const newAllocations = openBalances.map(b => ({
      projectId: b.projectId,
      projectName: b.projectName,
      balance: b.balance,
      amount: Math.round((b.balance / totalBalance) * formData.amount),
    }));
    const diff = formData.amount - newAllocations.reduce((s, a) => s + a.amount, 0);
    if (diff !== 0 && newAllocations.length > 0) {
      newAllocations[0].amount += diff;
    }
    setAllocations(newAllocations);
  };

  const suggestAllocationMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/worker-transfers/suggest-allocation', 'POST', {
        workerId: formData.worker_id,
        amount: formData.amount,
      });
    },
    onSuccess: (result: any) => {
      const suggested = result?.data?.suggestedAllocations || result?.data || [];
      if (Array.isArray(suggested) && suggested.length > 0) {
        setAllocations(suggested.map((s: any) => ({
          projectId: s.projectId,
          projectName: s.projectName || openBalances.find(b => b.projectId === s.projectId)?.projectName || '',
          balance: s.balance ?? s.currentBalance ?? openBalances.find(b => b.projectId === s.projectId)?.balance ?? 0,
          amount: Number(s.amount) || 0,
        })));
      }
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في اقتراح التوزيع", variant: "destructive" });
    }
  });

  const allocateTransferMutation = useMutation({
    mutationFn: async (data: any) => {
      await saveAllTransferAutocompleteValues();
      return apiRequest('/api/worker-transfers/allocate', 'POST', data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.workerTransfers(selectedProjectId) });
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.autocomplete });
      setShowTransferDialog(false);
      setAllocationMode(false);
      setAllocations([]);
      resetForm();
      toast({ title: "تم بنجاح", description: "تم توزيع الحوالة على المشاريع بنجاح" });
    },
    onError: (error: any) => {
      let errorMessage = "فشل في توزيع الحوالة";
      if (error?.responseData?.message) errorMessage = error.responseData.message;
      else if (error?.message) errorMessage = error.message;
      toast({ title: "خطأ", description: errorMessage, variant: "destructive" });
    }
  });

  useEffect(() => {
    const handleAddNew = () => {
      setEditingTransfer(null);
      setFormData({
        worker_id: preselectedWorker || '',
        project_id: '',
        amount: 0,
        recipientName: '',
        recipientPhone: '',
        transferMethod: 'hawaleh',
        transferNumber: '',
        transferDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setShowTransferDialog(true);
    };

    setFloatingAction(handleAddNew, 'إضافة حولة جديدة');

    return () => {
      setFloatingAction(null);
    };
  }, [setFloatingAction, preselectedWorker]);

  const createTransferMutation = useMutation({
    mutationFn: async (data: TransferFormData) => {
      await saveAllTransferAutocompleteValues();
      return apiRequest('/api/worker-transfers', 'POST', data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.workerTransfers(selectedProjectId) });
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.autocomplete });
      setShowTransferDialog(false);
      resetForm();
      toast({
        title: "تم بنجاح",
        description: "تم إرسال الحولة بنجاح"
      });
    },
    onError: async (error: any) => {
      await saveAllTransferAutocompleteValues();
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.autocomplete });
      
      if (error?.status === 422 && error?.responseData?.requiresConfirmation) {
        const gd = error.responseData.guardData;
        const suggestions = error.responseData.suggestions || [];
        setGuardData({
          type: 'negative_balance',
          title: 'تنبيه: التحويل يتجاوز رصيد العامل',
          workerName: gd?.workerName,
          enteredAmount: gd?.transferAmount || 0,
          currentBalance: gd?.currentBalance || 0,
          resultingBalance: gd?.resultingBalance || 0,
          suggestions,
          details: [
            { label: 'العامل', value: gd?.workerName || '' },
            { label: 'الرصيد الحالي', value: formatCurrency(gd?.currentBalance ?? 0), color: (gd?.currentBalance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600' },
            { label: 'مبلغ التحويل', value: formatCurrency(gd?.transferAmount ?? 0), color: 'text-amber-600' },
            { label: 'الرصيد بعد التحويل', value: formatCurrency(gd?.resultingBalance ?? 0), color: 'text-red-600 font-bold' },
          ],
          originalData: error.responseData._originalBody || {},
        });
        setShowGuardDialog(true);
        return;
      }
      
      let errorMessage = "فشل في إرسال الحولة";
      if (error?.responseData?.message) {
        errorMessage = error.responseData.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const updateTransferMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<TransferFormData> }) => {
      await saveAllTransferAutocompleteValues();
      return apiRequest(`/api/worker-transfers/${data.id}`, 'PATCH', data.updates);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.workerTransfers(selectedProjectId) });
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.autocomplete });
      setShowTransferDialog(false);
      setEditingTransfer(null);
      resetForm();
      toast({
        title: "تم بنجاح",
        description: "تم تحديث الحولة بنجاح"
      });
    },
    onError: async (error: any) => {
      await saveAllTransferAutocompleteValues();
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.autocomplete });
      
      if (error?.status === 422 && error?.responseData?.requiresConfirmation) {
        const gd = error.responseData.guardData;
        const suggestions = error.responseData.suggestions || [];
        setGuardData({
          type: 'negative_balance',
          title: 'تنبيه: تحديث التحويل يتجاوز رصيد العامل',
          workerName: gd?.workerName,
          enteredAmount: gd?.transferAmount || 0,
          currentBalance: gd?.currentBalance || 0,
          resultingBalance: gd?.resultingBalance || 0,
          suggestions,
          details: [
            { label: 'العامل', value: gd?.workerName || '' },
            { label: 'الرصيد الحالي', value: formatCurrency(gd?.currentBalance ?? 0), color: (gd?.currentBalance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600' },
            { label: 'المبلغ الجديد', value: formatCurrency(gd?.transferAmount ?? 0), color: 'text-amber-600' },
            { label: 'الرصيد بعد التحديث', value: formatCurrency(gd?.resultingBalance ?? 0), color: 'text-red-600 font-bold' },
          ],
          originalData: { ...error.responseData._originalBody, _editId: editingTransfer?.id },
        });
        setShowGuardDialog(true);
        return;
      }

      let errorMessage = "فشل في تحديث الحولة";
      if (error?.responseData?.message) {
        errorMessage = error.responseData.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const deleteTransferMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/worker-transfers/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.workerTransfers(selectedProjectId) });
      toast({
        title: "تم بنجاح",
        description: "تم حذف الحولة بنجاح"
      });
    },
    onError: (error: any) => {
      let errorMessage = "فشل في حذف الحولة";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    if (editTransferId && transfers.length > 0) {
      const transfer = transfers.find(t => t.id === editTransferId);
      if (transfer) {
        setEditingTransfer(transfer);
        setFormData({
          worker_id: transfer.worker_id,
          project_id: transfer.project_id,
          amount: transfer.amount,
          recipientName: transfer.recipientName,
          recipientPhone: transfer.recipientPhone || '',
          transferMethod: transfer.transferMethod,
          transferNumber: transfer.transferNumber || '',
          transferDate: transfer.transferDate,
          notes: transfer.notes || ''
        });
        setShowTransferDialog(true);
      }
    }
  }, [editTransferId, transfers]);

  const resetForm = () => {
    setFormData({
      worker_id: '',
      project_id: '',
      amount: 0,
      recipientName: '',
      recipientPhone: '',
      transferMethod: 'hawaleh',
      transferNumber: '',
      transferDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const handleSubmit = () => {
    if (allocationMode) {
      if (!formData.worker_id || !formData.amount || !formData.recipientName || !formData.transferDate) {
        toast({ title: "خطأ", description: "الرجاء ملء جميع الحقول المطلوبة", variant: "destructive" });
        return;
      }
      if (!isAllocationMatched) {
        toast({ title: "خطأ", description: "مجموع التوزيع لا يطابق المبلغ الكلي", variant: "destructive" });
        return;
      }
      allocateTransferMutation.mutate({
        workerId: formData.worker_id,
        payerProjectId: formData.project_id || selectedProject,
        totalAmount: formData.amount,
        recipientName: formData.recipientName,
        recipientPhone: formData.recipientPhone,
        transferDate: formData.transferDate,
        transferMethod: formData.transferMethod,
        transferNumber: formData.transferNumber,
        notes: formData.notes,
        allocations: allocations.filter(a => a.amount > 0).map(a => ({
          projectId: a.projectId,
          amount: a.amount,
        })),
      });
      return;
    }

    if (!formData.worker_id || !formData.project_id || !formData.amount || !formData.recipientName || !formData.transferDate) {
      toast({
        title: "خطأ",
        description: "الرجاء ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    if (editingTransfer) {
      updateTransferMutation.mutate({
        id: editingTransfer.id,
        updates: formData
      });
    } else {
      createTransferMutation.mutate(formData);
    }
  };

  const handleEdit = (transfer: WorkerTransfer) => {
    setEditingTransfer(transfer);
    setFormData({
      worker_id: transfer.worker_id,
      project_id: transfer.project_id,
      amount: transfer.amount,
      recipientName: transfer.recipientName,
      recipientPhone: transfer.recipientPhone || '',
      transferMethod: transfer.transferMethod,
      transferNumber: transfer.transferNumber || '',
      transferDate: transfer.transferDate,
      notes: transfer.notes || ''
    });
    setShowTransferDialog(true);
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${Math.round(num).toLocaleString('en-US')} ر.ي`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getTransferMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'نقداً';
      case 'bank': return 'تحويل بنكي';
      case 'hawaleh': return 'حولة';
      default: return method;
    }
  };

  const filteredTransfers = useMemo(() => {
    let result = [...transfers];
    
    if (selectedProject && selectedProject !== 'all') {
      result = result.filter(t => t.project_id === selectedProject);
    }
    
    if (selectedWorkerId && selectedWorkerId !== 'all') {
      result = result.filter(t => t.worker_id === selectedWorkerId);
    }
    
    if (transferMethodFilter && transferMethodFilter !== 'all') {
      result = result.filter(t => t.transferMethod === transferMethodFilter);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t => {
        const worker = workers.find(w => w.id === t.worker_id);
        return (
          worker?.name.toLowerCase().includes(term) ||
          t.recipientName.toLowerCase().includes(term) ||
          t.notes?.toLowerCase().includes(term)
        );
      });
    }
    
    if (dateFrom) {
      result = result.filter(t => new Date(t.transferDate) >= new Date(dateFrom));
    }
    
    if (dateTo) {
      result = result.filter(t => new Date(t.transferDate) <= new Date(dateTo));
    }

    if (specificDate) {
      result = result.filter(t => {
        const tDate = new Date(t.transferDate);
        const sDate = new Date(specificDate);
        return tDate.getFullYear() === sDate.getFullYear() &&
               tDate.getMonth() === sDate.getMonth() &&
               tDate.getDate() === sDate.getDate();
      });
    }
    
    return result;
  }, [transfers, selectedProject, selectedWorkerId, transferMethodFilter, searchTerm, dateFrom, dateTo, specificDate, workers]);

  const { summary, isLoading: isLoadingSummary } = useFinancialSummary();

  const stats = useMemo(() => {
    const totalAmount = filteredTransfers.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const cashTransfers = filteredTransfers.filter(t => t.transferMethod === 'cash');
    const bankTransfers = filteredTransfers.filter(t => t.transferMethod === 'bank');
    const hawalehTransfers = filteredTransfers.filter(t => t.transferMethod === 'hawaleh');
    
    const cashAmount = cashTransfers.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const bankAmount = bankTransfers.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const hawalehAmount = hawalehTransfers.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    
    const uniqueWorkers = new Set(filteredTransfers.map(t => t.worker_id)).size;
    
    // استخدام البيانات الموحدة للحوالات الكلية إذا لم يكن هناك فلتر
    const isFiltered = (selectedProject && selectedProject !== 'all') || 
                      (selectedWorkerId && selectedWorkerId !== 'all') || 
                      (transferMethodFilter && transferMethodFilter !== 'all') ||
                      searchTerm || dateFrom || dateTo || specificDate;

    return {
      totalTransfers: filteredTransfers.length,
      totalAmount: isFiltered ? totalAmount : ((summary as any)?.totalWorkerTransfers || totalAmount),
      cashAmount,
      bankAmount,
      hawalehAmount,
      uniqueWorkers,
      averageTransfer: filteredTransfers.length > 0 ? totalAmount / filteredTransfers.length : 0
    };
  }, [filteredTransfers, summary, selectedProject, selectedWorkerId, transferMethodFilter, searchTerm, dateFrom, dateTo, specificDate]);

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'totalTransfers',
          label: 'إجمالي الحوالات',
          value: stats.totalTransfers.toString(),
          icon: Send,
          color: 'blue',
        },
        {
          key: 'totalAmount',
          label: 'إجمالي المبالغ',
          value: formatCurrency(stats.totalAmount),
          icon: DollarSign,
          color: 'green',
        },
        {
          key: 'uniqueWorkers',
          label: 'عدد العمال',
          value: stats.uniqueWorkers.toString(),
          icon: Users,
          color: 'purple',
        },
        {
          key: 'cashAmount',
          label: 'نقداً',
          value: formatCurrency(stats.cashAmount),
          icon: Wallet,
          color: 'emerald',
        },
        {
          key: 'bankAmount',
          label: 'تحويل بنكي',
          value: formatCurrency(stats.bankAmount),
          icon: CreditCard,
          color: 'orange',
        },
        {
          key: 'hawalehAmount',
          label: 'حوالات',
          value: formatCurrency(stats.hawalehAmount),
          icon: TrendingUp,
          color: 'teal',
        },
      ]
    }
  ], [stats, formatCurrency]);

  const filtersConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'worker',
      label: 'العامل',
      type: 'select',
      placeholder: 'اختر العامل',
      options: [
        { value: 'all', label: 'جميع العمال' },
        ...workers.map(w => ({
          value: w.id,
          label: `${w.name} (${w.type})`
        }))
      ],
    },
    {
      key: 'transferMethod',
      label: 'طريقة التحويل',
      type: 'select',
      placeholder: 'طريقة التحويل',
      options: [
        { value: 'all', label: 'جميع الطرق' },
        { value: 'cash', label: 'نقداً' },
        { value: 'bank', label: 'تحويل بنكي' },
        { value: 'hawaleh', label: 'حولة' }
      ],
    },
    {
      key: 'dateFrom',
      label: 'من تاريخ',
      type: 'date',
      placeholder: 'من تاريخ',
    },
    {
      key: 'dateTo',
      label: 'إلى تاريخ',
      type: 'date',
      placeholder: 'إلى تاريخ',
    },
    {
      key: 'specificDate',
      label: 'تاريخ يوم محدد',
      type: 'date',
      placeholder: 'تاريخ يوم محدد',
    }
  ], [workers]);

  const handleFilterChange = useCallback((key: string, value: any) => {
    if (key === 'worker') {
      setSelectedWorkerId(value);
    } else if (key === 'transferMethod') {
      setTransferMethodFilter(value);
    } else if (key === 'dateFrom') {
      setDateFrom(value);
    } else if (key === 'dateTo') {
      setDateTo(value);
    } else if (key === 'specificDate') {
      setSpecificDate(value);
    }
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedWorkerId('all');
    setTransferMethodFilter('all');
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setSpecificDate('');
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.refetchQueries({ queryKey: QUERY_KEYS.workerTransfers(selectedProjectId) });
    setIsRefreshing(false);
  }, [queryClient, selectedProjectId]);

  const exportToExcel = async () => {
    if (filteredTransfers.length === 0) return;

    const { createProfessionalReport } = await import('@/utils/axion-export');
    const totalAmount = filteredTransfers.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const data = filteredTransfers.map((transfer, index) => {
      const worker = workers.find(w => w.id === transfer.worker_id);
      const project = projects.find(p => p.id === transfer.project_id);
      return {
        index: index + 1,
        date: formatDate(transfer.transferDate),
        worker: worker?.name || 'غير معروف',
        project: project?.name || 'غير معروف',
        amount: Number(transfer.amount),
        transferMethod: getTransferMethodLabel(transfer.transferMethod),
        recipient: transfer.recipientName || '-',
        phone: transfer.recipientPhone || '-',
        notes: transfer.notes || '-'
      };
    });

    const downloadResult = await createProfessionalReport({
      sheetName: 'حوالات العمال',
      reportTitle: 'تقرير حوالات العمال',
      subtitle: `تاريخ الإصدار: ${new Date().toLocaleDateString('en-GB')}`,
      infoLines: [`إجمالي الحوالات: ${filteredTransfers.length}`, `إجمالي المبالغ: ${totalAmount.toLocaleString('en-US')} ريال`],
      columns: [
        { header: '#', key: 'index', width: 5 },
        { header: 'التاريخ', key: 'date', width: 13 },
        { header: 'العامل', key: 'worker', width: 16 },
        { header: 'المشروع', key: 'project', width: 16 },
        { header: 'المبلغ', key: 'amount', width: 13, numFmt: '#,##0' },
        { header: 'طريقة التحويل', key: 'transferMethod', width: 14 },
        { header: 'المستلم', key: 'recipient', width: 16 },
        { header: 'رقم الهاتف', key: 'phone', width: 13 },
        { header: 'ملاحظات', key: 'notes', width: 22 }
      ],
      data,
      totals: { label: 'الإجماليات', values: { amount: totalAmount } },
      signatures: [
        { title: 'توقيع المحاسب' },
        { title: 'توقيع المهندس المشرف' },
        { title: 'توقيع المدير العام' }
      ],
      fileName: `حوالات-العمال-${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.xlsx`,
    });
  };

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <SelectedProjectBadge />
      <UnifiedFilterDashboard
        statsRows={statsRowsConfig}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="ابحث عن عامل أو مستلم..."
        showSearch={true}
        filters={filtersConfig}
        filterValues={{
          worker: selectedWorkerId,
          transferMethod: transferMethodFilter
        }}
        onFilterChange={handleFilterChange}
        onReset={resetFilters}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        actions={[
          {
            key: 'export',
            icon: Download,
            label: 'تصدير Excel',
            onClick: exportToExcel,
            variant: 'outline',
            disabled: filteredTransfers.length === 0,
            tooltip: 'تصدير إلى Excel'
          }
        ]}
      />

      {isLoadingTransfers ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">جاري تحميل الحوالات...</p>
          </CardContent>
        </Card>
      ) : filteredTransfers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">لا توجد حوالات</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedWorkerId !== 'all' || transferMethodFilter !== 'all'
                ? 'لا توجد نتائج مطابقة للفلاتر المحددة'
                : 'لم يتم إرسال أي حوالات بعد'}
            </p>
            <Button 
              onClick={() => {
                setEditingTransfer(null);
                resetForm();
                setShowTransferDialog(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 ml-2" />
              إرسال حولة جديدة
            </Button>
          </CardContent>
        </Card>
      ) : (
        <UnifiedCardGrid columns={2}>
          {filteredTransfers.map((transfer) => {
            const worker = workers.find(w => w.id === transfer.worker_id);
            const project = projects.find(p => p.id === transfer.project_id);
            const workerProjWage = worker ? getWorkerProjectWage(worker.id) : null;
            
            return (
              <UnifiedCard
                key={transfer.id}
                title={worker?.name || 'عامل غير معروف'}
                subtitle={project?.name || 'مشروع غير معروف'}
                titleIcon={User}
                badges={[
                  {
                    label: worker?.type || 'غير محدد',
                    variant: 'secondary'
                  },
                  {
                    label: getTransferMethodLabel(transfer.transferMethod),
                    variant: transfer.transferMethod === 'cash' ? 'success' : 
                             transfer.transferMethod === 'bank' ? 'warning' : 'default'
                  },
                  ...(workerProjWage 
                    ? [{
                        label: `أجر المشروع: ${formatCurrency(workerProjWage.dailyWage)}`,
                        variant: 'outline' as const,
                      }]
                    : []
                  ),
                ]}
                fields={[
                  {
                    label: 'المبلغ',
                    value: formatCurrency(transfer.amount),
                    icon: DollarSign,
                    color: 'success',
                    emphasis: true
                  },
                  {
                    label: 'التاريخ',
                    value: formatDate(transfer.transferDate),
                    icon: Calendar,
                    color: 'muted'
                  },
                  {
                    label: 'المستلم',
                    value: transfer.recipientName,
                    icon: User,
                    color: 'info'
                  },
                  {
                    label: 'الهاتف',
                    value: transfer.recipientPhone || '-',
                    icon: Phone,
                    color: 'muted'
                  },
                  ...(workerProjWage ? [{
                    label: 'الأجر اليومي (المشروع)',
                    value: formatCurrency(workerProjWage.dailyWage),
                    icon: Briefcase,
                    color: 'info' as const,
                  }] : worker ? [{
                    label: 'الأجر اليومي (افتراضي)',
                    value: formatCurrency(worker.dailyWage),
                    icon: DollarSign,
                    color: 'muted' as const,
                  }] : []),
                ]}
                actions={[
                  {
                    icon: Edit2,
                    label: 'تعديل',
                    onClick: () => handleEdit(transfer),
                    color: 'blue'
                  },
                  {
                    icon: Trash2,
                    label: 'حذف',
                    onClick: () => deleteTransferMutation.mutate(transfer.id),
                    color: 'red'
                  }
                ]}
                footer={transfer.notes ? (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">ملاحظات:</span> {transfer.notes}
                  </p>
                ) : undefined}
                compact
              />
            );
          })}
        </UnifiedCardGrid>
      )}

      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className={allocationMode ? "max-w-2xl max-h-[90vh] overflow-y-auto" : "max-w-md"} dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingTransfer ? 'تعديل الحولة' : allocationMode ? 'حولة موزعة على المشاريع' : 'حولة جديدة'}
            </DialogTitle>
            <DialogDescription>
              {editingTransfer ? 'قم بتعديل بيانات الحولة المالية' : allocationMode ? 'توزيع الحوالة على مشاريع متعددة' : 'إنشاء حولة مالية جديدة للعامل'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>العامل *</Label>
                <WorkerSelect
                  value={formData.worker_id}
                  onValueChange={(value) => {
                    setFormData({...formData, worker_id: value});
                    setAllocationMode(false);
                    setAllocations([]);
                  }}
                  workers={workers}
                  placeholder="اختر العامل"
                  data-testid="select-worker-transfer"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{allocationMode ? 'المشروع الدافع' : 'المشروع *'}</Label>
                <ProjectSelect
                  value={formData.project_id}
                  onValueChange={(value) => setFormData({...formData, project_id: value})}
                  projects={projects}
                  placeholder="اختر المشروع"
                  data-testid="select-project-transfer"
                />
              </div>
            </div>

            {hasMultipleProjects && !editingTransfer && (
              <Card className="border-dashed">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-sm">
                      <Layers className="h-4 w-4 text-blue-500" />
                      <span className="text-muted-foreground">العامل لديه أرصدة في {openBalances.length} مشاريع</span>
                    </div>
                    <Button
                      size="sm"
                      variant={allocationMode ? "default" : "outline"}
                      onClick={() => setAllocationMode(!allocationMode)}
                      data-testid="button-toggle-allocation"
                    >
                      <Split className="h-4 w-4 ml-1" />
                      {allocationMode ? 'إلغاء التوزيع' : 'وضع التوزيع'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المبلغ (ر.ي) *</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  step="1"
                  value={formData.amount || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({...formData, amount: value ? parseFloat(value) : 0});
                  }}
                  placeholder="0.00"
                  autoWidth
                  maxWidth={200}
                  min="0"
                  className="text-center arabic-numbers"
                  data-testid="input-transfer-amount"
                />
              </div>
              <div>
                <Label>التاريخ *</Label>
                <DatePickerField
                  value={formData.transferDate}
                  onChange={(date) => setFormData({...formData, transferDate: date ? format(date, "yyyy-MM-dd") : ""})}
                  className="w-full"
                  data-testid="input-transfer-date"
                />
              </div>
            </div>

            {allocationMode && allocations.length > 0 && (
              <Card data-testid="card-allocation-table">
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <ArrowRightLeft className="h-4 w-4" />
                      <span>توزيع المبلغ على المشاريع</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleProportionalAllocation}
                        disabled={!formData.amount}
                        data-testid="button-proportional-allocation"
                      >
                        <Split className="h-3.5 w-3.5 ml-1" />
                        توزيع نسبي
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => suggestAllocationMutation.mutate()}
                        disabled={!formData.amount || suggestAllocationMutation.isPending}
                        data-testid="button-suggest-allocation"
                      >
                        {suggestAllocationMutation.isPending ? (
                          <div className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full ml-1" />
                        ) : (
                          <Layers className="h-3.5 w-3.5 ml-1" />
                        )}
                        توزيع يدوي
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-md">
                    <div className="grid grid-cols-3 gap-2 p-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                      <span>المشروع</span>
                      <span className="text-center">المتبقي الحالي</span>
                      <span className="text-center">المبلغ المخصص</span>
                    </div>
                    {allocations.map((alloc, index) => (
                      <div
                        key={alloc.projectId}
                        className="grid grid-cols-3 gap-2 p-2 items-center border-b last:border-b-0"
                        data-testid={`row-allocation-${alloc.projectId}`}
                      >
                        <span className="text-sm truncate" title={alloc.projectName}>
                          {alloc.projectName}
                        </span>
                        <span className={`text-sm text-center font-medium ${alloc.balance > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {Math.round(alloc.balance).toLocaleString('en-US')}
                        </span>
                        <Input
                          type="number"
                          inputMode="numeric"
                          step="1"
                          min="0"
                          value={alloc.amount || ''}
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : 0;
                            setAllocations(prev => prev.map((a, i) =>
                              i === index ? { ...a, amount: val } : a
                            ));
                          }}
                          className="text-center text-sm"
                          data-testid={`input-allocation-amount-${alloc.projectId}`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className={`flex items-center justify-between p-2 rounded-md text-sm font-medium ${isAllocationMatched ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`} data-testid="text-allocation-summary">
                    <span>المجموع: {Math.round(allocationTotal).toLocaleString('en-US')} ر.ي</span>
                    <span>المبلغ الكلي: {Math.round(formData.amount).toLocaleString('en-US')} ر.ي</span>
                    {isAllocationMatched ? (
                      <Badge variant="default" className="bg-green-600 text-white">متطابق</Badge>
                    ) : (
                      <Badge variant="destructive">غير متطابق</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المستلم *</Label>
                <AutocompleteInput
                  category="recipientNames"
                  value={formData.recipientName}
                  onChange={(value) => setFormData({...formData, recipientName: value})}
                  placeholder="اسم المستلم"
                  data-testid="input-recipient-name"
                />
              </div>
              <div>
                <Label>طريقة التحويل *</Label>
                <Select
                  value={formData.transferMethod}
                  onValueChange={(value: 'cash' | 'bank' | 'hawaleh') => setFormData({...formData, transferMethod: value})}
                >
                  <SelectTrigger data-testid="select-transfer-method">
                    <SelectValue placeholder="اختر الطريقة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hawaleh">حولة</SelectItem>
                    <SelectItem value="cash">نقداً</SelectItem>
                    <SelectItem value="bank">تحويل بنكي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>رقم الهاتف</Label>
                <AutocompleteInput
                  category="recipientPhones"
                  value={formData.recipientPhone}
                  onChange={(value) => setFormData({...formData, recipientPhone: value})}
                  placeholder="رقم الهاتف"
                  data-testid="input-recipient-phone"
                />
              </div>
              <div>
                <Label>رقم التحويل</Label>
                <AutocompleteInput
                  category="workerTransferNumbers"
                  value={formData.transferNumber}
                  onChange={(value) => setFormData({...formData, transferNumber: value})}
                  placeholder="رقم التحويل"
                  data-testid="input-transfer-number"
                />
              </div>
            </div>

            <div>
              <Label>ملاحظات</Label>
              <AutocompleteInput
                category="workerTransferNotes"
                value={formData.notes}
                onChange={(value) => setFormData({...formData, notes: value})}
                placeholder="ملاحظات إضافية..."
                autoWidth
                maxWidth={400}
                data-testid="input-transfer-notes"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={createTransferMutation.isPending || updateTransferMutation.isPending || allocateTransferMutation.isPending || (allocationMode && !isAllocationMatched)}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                data-testid="button-submit-transfer"
              >
                {createTransferMutation.isPending || updateTransferMutation.isPending || allocateTransferMutation.isPending ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full ml-2" />
                ) : allocationMode ? (
                  <Split className="h-4 w-4 ml-2" />
                ) : (
                  <Send className="h-4 w-4 ml-2" />
                )}
                {editingTransfer ? 'تحديث الحولة' : allocationMode ? 'توزيع وإرسال' : 'إرسال الحولة'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowTransferDialog(false);
                  setEditingTransfer(null);
                  setAllocationMode(false);
                  setAllocations([]);
                  resetForm();
                }}
                data-testid="button-cancel-transfer"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <FinancialGuardDialog
        open={showGuardDialog}
        onClose={() => {
          setShowGuardDialog(false);
          setGuardData(null);
        }}
        data={guardData}
        onConfirm={({ adjustedAmount, guardNote }) => {
          setShowGuardDialog(false);
          const editId = guardData?.originalData?._editId;
          setGuardData(null);
          if (editId) {
            updateTransferMutation.mutate({
              id: editId,
              updates: {
                ...formData,
                amount: adjustedAmount,
                notes: guardNote || formData.notes,
                confirmGuard: true,
                guardNote,
              } as any,
            });
          } else {
            createTransferMutation.mutate({
              ...formData,
              amount: adjustedAmount,
              notes: guardNote || formData.notes,
              confirmGuard: true,
              guardNote,
            } as any);
          }
        }}
      />
    </div>
  );
}
