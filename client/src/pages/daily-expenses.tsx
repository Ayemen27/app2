/**
 * الوصف: صفحة إدارة المصاريف اليومية والتحويلات المالية
 * المدخلات: تاريخ محدد ومعرف المشروع
 * المخرجات: عرض وإدارة جميع المصاريف والتحويلات اليومية
 * المالك: عمار
 * آخر تعديل: 2025-08-20
 * الحالة: نشط - الصفحة الأساسية لإدارة المصاريف
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { ArrowRight, Save, Users, Car, Plus, Edit2, Trash2, ChevronDown, ChevronUp, ArrowLeftRight, RefreshCw, Wallet, Banknote, Package, Truck, Receipt, Building2, Send, TrendingDown, Calculator, FileSpreadsheet, ChevronRight, ChevronLeft, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { UnifiedCard, UnifiedCardField } from "@/components/ui/unified-card";
import { DollarSign, Calendar, Building, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { MultiWellSelector } from "@/components/multi-well-selector";
import { CrewTypeSelector } from "@/components/crew-type-selector";
import { TeamSelector } from "@/components/team-selector";
import ExpenseSummary from "@/components/expense-summary";
import { OverpaymentSplitDialog, type OverpaymentData } from "@/components/overpayment-split-dialog";
import { FinancialGuardDialog, type FinancialGuardData } from "@/components/financial-guard-dialog";
import WorkerMiscExpenses from "./worker-misc-expenses";
import { getCurrentDate, formatCurrency, formatDate, cleanNumber, fmtNum } from "@/lib/utils";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { WellCrewBadges } from "@/components/well-crew-badges";
import { apiRequest } from "@/lib/queryClient";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedSearchFilter } from "@/components/ui/unified-search-filter";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
import { exportTransactionsToExcel } from "@/components/ui/export-transactions-excel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { queueForSync } from "@/offline/offline";
import type { 
  WorkerAttendance, 
  TransportationExpense, 
  FundTransfer,
  MaterialPurchase,
  WorkerTransfer,
  Worker,
  Project,
  Supplier,
  InsertFundTransfer,
  InsertTransportationExpense,
  InsertDailyExpenseSummary,
  ProjectFundTransfer 
} from "@shared/schema";

// إزالة تعريف ErrorBoundary المحلي لتجنب التكرار - يتم استيراده من components/ErrorBoundary

function DailyExpensesContent() {
  const { toast } = useToast();
  const { selectedProjectId, selectProject, isAllProjects, isWellsProject } = useSelectedProject();
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [carriedForward, setCarriedForward] = useState<string>("0");
  const [showProjectTransfers, setShowProjectTransfers] = useState<boolean>(true);
  const [searchValue, setSearchValue] = useState<string>("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    dateRange: undefined,
    type: 'all',
    transportCategory: 'all',
    miscCategory: 'all'
  });

  // دوال معالجة الفلاتر
  const handleFilterChange = useCallback((key: string, value: any) => {
    if (key === 'date') {
      if (value instanceof Date) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        setSelectedDate(`${year}-${month}-${day}`);
      } else {
        setSelectedDate(undefined);
      }
    } else if (key === 'dateRange') {
      setFilterValues(prev => ({ ...prev, [key]: value }));
      if (value?.from) {
        setSelectedDate(undefined);
      }
    } else {
      setFilterValues(prev => ({ ...prev, [key]: value }));
    }
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchValue("");
    setFilterValues({
      dateRange: undefined,
      type: 'all'
    });
    setSelectedDate(getCurrentDate());
    toast({
      title: "تم إعادة التعيين",
      description: "تم مسح جميع الفلاتر وتعيين تاريخ اليوم",
    });
  }, [toast]);
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedWellIds, setSelectedWellIds] = useState<number[]>([]);
  const [selectedCrewTypes, setSelectedCrewTypes] = useState<string[]>([]);
  const [selectedTeamNames, setSelectedTeamNames] = useState<string[]>([]);
  const [purchaseCrewTypes, setPurchaseCrewTypes] = useState<string[]>([]);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isFundTransfersExpanded, setIsFundTransfersExpanded] = useState(false);
  const [isTransportationExpanded, setIsTransportationExpanded] = useState(false);
  const [isAttendanceExpanded, setIsAttendanceExpanded] = useState(false);
  const [isMaterialsExpanded, setIsMaterialsExpanded] = useState(false);
  const [isWorkerTransfersExpanded, setIsWorkerTransfersExpanded] = useState(false);
  const [isProjectTransfersExpanded, setIsProjectTransfersExpanded] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [isMiscExpanded, setIsMiscExpanded] = useState(false);

  const { data: dynamicTransportCategories = [] } = useQuery<{ value: string; label: string }[]>({
    queryKey: QUERY_KEYS.autocompleteTransportCategories,
    queryFn: async () => {
      const res = await apiRequest("/api/autocomplete/transport-categories", "GET");
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      return list.map((item: any) => ({
        value: typeof item === 'string' ? item : (item.value || ''),
        label: typeof item === 'string' ? item : (item.label || item.value || '')
      })).filter((item: any) => item.value);
    }
  });

  useEffect(() => {
    if (dynamicTransportCategories.length > 0 && !transportCategory) {
      setTransportCategory(dynamicTransportCategories[0].value);
    }
  }, [dynamicTransportCategories]);

  const { 
    data: workerMiscExpenses = [], 
    isLoading: miscLoading 
  } = useQuery({
    queryKey: QUERY_KEYS.workerMiscExpensesFiltered(selectedProjectId, selectedDate),
    queryFn: async () => {
      if ((!selectedProjectId && !isAllProjects) || !selectedDate) return [];
      const project_id = isAllProjects ? "all" : selectedProjectId;
      const response = await apiRequest(`/api/worker-misc-expenses?project_id=${project_id}&date=${selectedDate}`, "GET");
      return Array.isArray(response) ? response : (response?.data || []);
    },
    enabled: (!!selectedProjectId || isAllProjects) && !!selectedDate
  });

  useEffect(() => {
    if (!miscLoading && workerMiscExpenses.length > 0) {
      setIsMiscExpanded(true);
    } else {
      setIsMiscExpanded(false);
    }
  }, [workerMiscExpenses.length, miscLoading, selectedDate]);

  // Fund transfer form
  const [fundAmount, setFundAmount] = useState<string>("");
  const [senderName, setSenderName] = useState<string>("");
  const [transferNumber, setTransferNumber] = useState<string>("");
  const [transferType, setTransferType] = useState<string>("");
  const [editingFundTransferId, setEditingFundTransferId] = useState<string | null>(null);
  const [fundTransferWellId, setFundTransferWellId] = useState<number | undefined>();
  const [transportDescription, setTransportDescription] = useState<string>("");
  const [transportAmount, setTransportAmount] = useState<string>("");
  const [transportNotes, setTransportNotes] = useState<string>("");
  const [editingTransportationId, setEditingTransportationId] = useState<string | null>(null);
  const [transportCategory, setTransportCategory] = useState<string>("");

  // Material purchase form
  const [purchaseMaterialName, setPurchaseMaterialName] = useState<string>("");
  const [purchaseQuantity, setPurchaseQuantity] = useState<string>("");
  const [purchaseUnit, setPurchaseUnit] = useState<string>("");
  const [purchaseUnitPrice, setPurchaseUnitPrice] = useState<string>("");
  const [purchaseTotalAmount, setPurchaseTotalAmount] = useState<string>("");
  const [purchaseType, setPurchaseType] = useState<string>("نقد");
  const [purchaseSupplierName, setPurchaseSupplierName] = useState<string>("");
  const [purchaseNotes, setPurchaseNotes] = useState<string>("");
  const [purchaseWellIds, setPurchaseWellIds] = useState<number[]>([]);
  const [purchaseTeamNames, setPurchaseTeamNames] = useState<string[]>([]);
  const [editingMaterialPurchaseId, setEditingMaterialPurchaseId] = useState<string | null>(null);

  // Worker transfer form
  const [workerTransferWorkerId, setWorkerTransferWorkerId] = useState<string>("");
  const [workerTransferAmount, setWorkerTransferAmount] = useState<string>("");
  const [workerTransferRecipientName, setWorkerTransferRecipientName] = useState<string>("");
  const [workerTransferRecipientPhone, setWorkerTransferRecipientPhone] = useState<string>("");
  const [workerTransferMethod, setWorkerTransferMethod] = useState<string>("hawaleh");
  const [workerTransferNumber, setWorkerTransferNumber] = useState<string>("");
  const [workerTransferSenderName, setWorkerTransferSenderName] = useState<string>("");
  const [workerTransferNotes, setWorkerTransferNotes] = useState<string>("");
  const [editingWorkerTransferId, setEditingWorkerTransferId] = useState<string | null>(null);

  // Worker attendance form
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
  const [workerDays, setWorkerDays] = useState<string>("");
  const [workerAmount, setWorkerAmount] = useState<string>("");
  const [workerNotes, setWorkerNotes] = useState<string>("");
  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null);
  const [showOverpaymentDialog, setShowOverpaymentDialog] = useState(false);
  const [overpaymentData, setOverpaymentData] = useState<OverpaymentData | null>(null);
  const [showGuardTransferDialog, setShowGuardTransferDialog] = useState(false);
  const [guardTransferData, setGuardTransferData] = useState<FinancialGuardData | null>(null);
  const [showGuardPurchaseDialog, setShowGuardPurchaseDialog] = useState(false);
  const [guardPurchaseData, setGuardPurchaseData] = useState<FinancialGuardData | null>(null);

  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();

  const nextDate = () => {
    if (!selectedDate) return;
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const prevDate = () => {
    if (!selectedDate) return;
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };
  // دالة مساعدة لحفظ قيم الإكمال التلقائي
  const saveAutocompleteValue = async (field: string, value: string) => {
    if (!value || value.trim().length < 2) return;

    try {
      await apiRequest('/api/autocomplete', 'POST', {
        category: field,
        value: value.trim(),
        usageCount: 1
      });
      console.log(`✅ تم حفظ قيمة الإكمال التلقائي: ${field} = ${value.trim()}`);
    } catch (error) {
      console.warn(`Failed to save autocomplete value for ${field}:`, error);
    }
  };

  // تعيين تاريخ اليوم تلقائياً عند فتح الصفحة
  useEffect(() => {
    setSelectedDate(getCurrentDate());
  }, []);

  // تعيين إجراء الزر العائم لحفظ المصاريف
  useEffect(() => {
    setFloatingAction(null);
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  // دالة لحفظ جميع قيم الإكمال التلقائي للحولة
  const saveAllFundTransferAutocompleteValues = async () => {
    const promises = [];

    if (senderName && senderName.trim().length >= 2) {
      promises.push(saveAutocompleteValue('senderNames', senderName));
    }

    if (transferNumber && transferNumber.trim().length >= 1) {
      promises.push(saveAutocompleteValue('transferNumbers', transferNumber));
    }

    if (transferType && transferType.trim().length >= 2) {
      promises.push(saveAutocompleteValue('transferTypes', transferType));
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }
  };

  const queryOptions = {
    staleTime: 1000 * 60 * 60, // 60 minutes
    gcTime: 1000 * 60 * 180, // 180 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData: any) => previousData,
  };

  // جلب معلومات العمال
  const { data: workers = [], error: workersError } = useQuery<Worker[]>({
    queryKey: QUERY_KEYS.workers,
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/workers", "GET");
        return Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
      } catch (error) {
        return [];
      }
    },
    ...queryOptions
  });

  const { data: projectWells = [] } = useQuery<any[]>({
    queryKey: QUERY_KEYS.wellsByProject(selectedProjectId ?? ''),
    queryFn: async () => {
      if (!selectedProjectId) return [];
      try {
        const response = await apiRequest(`/api/wells?project_id=${selectedProjectId}`);
        if (response && response.success && Array.isArray(response.data)) return response.data;
        return Array.isArray(response) ? response : (response?.data || []);
      } catch { return []; }
    },
    enabled: !!selectedProjectId,
    staleTime: 5 * 60 * 1000
  });

  const { data: attendanceData = [], refetch: refetchAttendance } = useQuery<WorkerAttendance[]>({
    queryKey: QUERY_KEYS.workerAttendance(selectedProjectId, selectedDate),
    queryFn: async () => {
      if (!selectedProjectId || !selectedDate) return [];
      const response = await apiRequest(`/api/worker-attendance?project_id=${selectedProjectId}&date=${selectedDate}`, "GET");
      return Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
    },
    enabled: !!selectedProjectId && !!selectedDate
  });

  // العمال المتاحين للإضافة (الذين ليس لديهم سجل حضور في هذا اليوم)
  const availableWorkers = useMemo(() => {
    return workers.filter(worker => {
      if (editingAttendanceId && worker.id === selectedWorkerId) return true;
      return !attendanceData.some(attendance => attendance.worker_id === worker.id);
    });
  }, [workers, attendanceData, editingAttendanceId, selectedWorkerId]);

  const { data: projects = [], error: projectsError } = useQuery<Project[]>({
    queryKey: QUERY_KEYS.projects,
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/projects", "GET");
        return Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
      } catch (error) {
        return [];
      }
    },
    ...queryOptions
  });

  // سيتم تعريف المتغيرات الآمنة بعد جلب البيانات من dailyExpensesData

  const addWorkerAttendanceMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/worker-attendance", "POST", data),
    onSuccess: () => {
      refreshAllData();
      setWorkerDays("");
      setWorkerAmount("");
      setWorkerNotes("");
      setSelectedWorkerId("");
      toast({ title: "تم إضافة الحضور", description: "تم تسجيل أجر العامل بنجاح" });
    },
    onError: async (error: any) => {
      if (error?.status === 422 && error?.responseData?.requiresConfirmation) {
        const suggestedAction = error.responseData.suggestedAction;
        const worker = workers.find((w: any) => w.id === selectedWorkerId);
        const dailyWage = parseFloat(worker?.dailyWage?.toString() || '0');
        const workDaysVal = parseFloat(workerDays || '0');
        setOverpaymentData({
          workerName: worker?.name || 'عامل',
          workerId: selectedWorkerId,
          projectId: selectedProjectId,
          date: selectedDate || getCurrentDate(),
          totalAmount: parseFloat(workerAmount || '0'),
          actualWage: suggestedAction?.attendancePaidAmount ?? parseFloat((dailyWage * workDaysVal).toFixed(2)),
          workDays: workDaysVal,
          originalRecord: {
            worker_id: selectedWorkerId,
            project_id: selectedProjectId,
            attendanceDate: selectedDate || getCurrentDate(),
            workDays: workDaysVal,
            dailyWage: dailyWage.toString(),
            actualWage: (dailyWage * workDaysVal).toString(),
            totalPay: (dailyWage * workDaysVal).toString(),
            paidAmount: workerAmount || '0',
            workDescription: workerNotes || (workDaysVal > 0 ? 'أيام عمل' : 'مصروف بدون عمل'),
            notes: workerNotes,
            well_id: selectedWellIds[0] || null,
            well_ids: selectedWellIds.length > 0 ? JSON.stringify(selectedWellIds) : null,
            crew_type: selectedCrewTypes.length > 0 ? JSON.stringify(selectedCrewTypes) : null,
            team_name: selectedTeamNames.length > 0 ? JSON.stringify(selectedTeamNames) : null,
          },
        });
        setShowOverpaymentDialog(true);
        return;
      }
      try {
        const attendanceData = {
          worker_id: selectedWorkerId,
          days: workerDays ? parseFloat(workerDays) : 0,
          amount: workerAmount ? parseFloat(workerAmount) : 0,
          notes: workerNotes,
          selectedDate,
          project_id: selectedProjectId
        };
        await queueForSync('create', '/api/worker-attendance', attendanceData);
        toast({
          title: "تم الحفظ محليًا",
          description: "خطأ في الاتصال - سيتم المزامنة عند الاتصال",
          variant: "default",
        });
      } catch (queueError) {
        toast({ 
          title: "خطأ", 
          description: error?.message || "حدث خطأ أثناء إضافة الحضور", 
          variant: "destructive" 
        });
      }
    }
  });

  const updateWorkerAttendanceMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/worker-attendance/${data.id}`, "PATCH", data),
    onSuccess: () => {
      refreshAllData();
      setEditingAttendanceId(null);
      setSelectedWorkerId("");
      setWorkerDays("");
      setWorkerAmount("");
      setWorkerNotes("");
      setSelectedWellIds([]);
      setSelectedCrewTypes([]);
      toast({ title: "تم التحديث", description: "تم تحديث بيانات الحضور بنجاح" });
    },
    onError: (error: any) => {
      if (error?.status === 422 && error?.responseData?.requiresConfirmation) {
        const suggestedAction = error.responseData.suggestedAction;
        const worker = workers.find((w: any) => w.id === selectedWorkerId);
        const dailyWage = parseFloat(worker?.dailyWage?.toString() || '0');
        const workDaysVal = parseFloat(workerDays || '0');
        setOverpaymentData({
          workerName: worker?.name || 'عامل',
          workerId: selectedWorkerId,
          projectId: selectedProjectId,
          date: selectedDate || getCurrentDate(),
          totalAmount: parseFloat(workerAmount || '0'),
          actualWage: suggestedAction?.attendancePaidAmount ?? parseFloat((dailyWage * workDaysVal).toFixed(2)),
          workDays: workDaysVal,
          originalRecord: { id: editingAttendanceId, workDays: workerDays, paidAmount: workerAmount, notes: workerNotes },
          recordId: editingAttendanceId || undefined,
        });
        setShowOverpaymentDialog(true);
        return;
      }
      toast({ 
        title: "خطأ", 
        description: error?.responseData?.message || error?.message || "حدث خطأ أثناء تحديث الحضور", 
        variant: "destructive" 
      });
    }
  });

  const handleQuickAddAttendance = () => {
    if (!selectedProjectId || selectedProjectId === "all" || isAllProjects) {
      toast({
        title: "يرجى تحديد مشروع",
        description: "لا يمكن إضافة حضور عند اختيار 'جميع المشاريع'. يرجى اختيار مشروع محدد أولاً.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedWorkerId || (!workerDays && !workerAmount)) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى اختيار العامل وتحديد الأيام أو المبلغ على الأقل",
        variant: "destructive",
      });
      return;
    }

    const worker = workers.find(w => w.id === selectedWorkerId);
    if (!worker) {
      toast({
        title: "خطأ",
        description: "لم يتم العثور على بيانات العامل",
        variant: "destructive",
      });
      return;
    }

    const dailyWageNum = parseFloat(String(worker.dailyWage || "0"));
    const workDaysNum = parseFloat(workerDays || "0");
    const paidAmountNum = parseFloat(workerAmount || "0");
    const actualWage = dailyWageNum * workDaysNum;

    const attendanceData = {
      worker_id: selectedWorkerId,
      project_id: selectedProjectId,
      attendanceDate: selectedDate || getCurrentDate(),
      workDays: workDaysNum,
      dailyWage: dailyWageNum.toString(),
      actualWage: actualWage.toString(),
      totalPay: actualWage.toString(),
      paidAmount: workerAmount || "0",
      remainingAmount: (actualWage - paidAmountNum).toString(),
      workDescription: workerNotes || (workDaysNum > 0 ? "أيام عمل" : "مصروف بدون عمل"),
      notes: workerNotes,
      well_id: selectedWellIds[0] || null,
      well_ids: selectedWellIds.length > 0 ? JSON.stringify(selectedWellIds) : null,
      crew_type: selectedCrewTypes.length > 0 ? JSON.stringify(selectedCrewTypes) : null,
      team_name: selectedTeamNames.length > 0 ? JSON.stringify(selectedTeamNames) : null,
      paymentType: paidAmountNum > 0 ? (paidAmountNum >= actualWage && actualWage > 0 ? "full" : "partial") : "credit",
    };

    console.log('📝 [DailyExpenses] إرسال بيانات الحضور:', attendanceData);
    addWorkerAttendanceMutation.mutate(attendanceData);
  };

  // جلب معلومات المواد مع معالجة آمنة للأخطاء
  const { data: materials = [] } = useQuery({
    queryKey: QUERY_KEYS.materials,
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/materials", "GET");
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        return [];
      } catch (error) {
        console.warn('⚠️ لم يتمكن من جلب المواد:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 30, // 30 دقيقة
    gcTime: 1000 * 60 * 60, // ساعة كاملة
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: QUERY_KEYS.suppliers,
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/suppliers", "GET");
        if (response && Array.isArray(response)) return response;
        if (response && response.data && Array.isArray(response.data)) return response.data;
        return [];
      } catch (error) {
        console.warn('⚠️ لم يتمكن من جلب الموردين:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  const activeSuppliers = Array.isArray(suppliers) ? suppliers.filter((s: any) => s.is_active !== false) : [];

  // جلب عمليات ترحيل الأموال بين المشاريع مع أسماء المشاريع - استعلام منفصل للصفحة اليومية
  const { data: projectTransfers = [], refetch: refetchProjectTransfers } = useQuery<(ProjectFundTransfer & { fromProjectName?: string; toProjectName?: string })[]>({
    queryKey: QUERY_KEYS.dailyProjectTransfers(isAllProjects ? "all" : selectedProjectId, selectedDate),
    queryFn: async () => {
      try {
        const project_id = isAllProjects ? "all" : selectedProjectId;
        const response = await apiRequest(`/api/daily-project-transfers?project_id=${project_id}&date=${selectedDate || ""}`, "GET");
        console.log('📊 [ProjectTransfers] استجابة API للصفحة اليومية:', response);

        let transferData = [];
        if (response && response.data && Array.isArray(response.data)) {
          transferData = response.data;
        } else if (Array.isArray(response)) {
          transferData = response;
        }

        if (!Array.isArray(transferData)) return [];

        console.log(`✅ [ProjectTransfers] تم جلب ${transferData.length} ترحيل لليوم ${selectedDate} في الصفحة اليومية`);
        
        return transferData;
      } catch (error) {
        console.error("Error fetching daily project transfers:", error);
        return [];
      }
    },
    enabled: !!selectedProjectId && !!selectedDate && showProjectTransfers,
    staleTime: 1000 * 60 * 60, // 60 minutes
    gcTime: 1000 * 60 * 180, // 180 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // معالجة آمنة لترحيل المشاريع
  const safeProjectTransfers = Array.isArray(projectTransfers) ? projectTransfers : [];

  // استخدام useFinancialSummary الموحد لتحسين الأداء وتجنب اختلاف البيانات
  const { 
    summary: financialSummary, 
    allProjects,
    totals,
    isLoading: summaryLoading, 
    refetch: refetchFinancial 
  } = useFinancialSummary({
    project_id: selectedProjectId === 'all' ? 'all' : selectedProjectId,
    date: selectedDate && selectedDate !== "null" ? selectedDate : undefined,
    dateFrom: filterValues.dateRange?.from ? formatDate(filterValues.dateRange.from) : undefined,
    dateTo: filterValues.dateRange?.to ? formatDate(filterValues.dateRange.to) : undefined,
    enabled: isAllProjects || !!selectedProjectId
  });

  const totalsValue = useMemo(() => {
    if (isAllProjects) {
      return totals;
    }
    
    // حساب totals للمشروع الفردي بناءً على financialSummary
    return {
      totalIncome: financialSummary?.income?.totalIncome || 0,
      totalCashExpenses: financialSummary?.expenses?.totalCashExpenses || 0,
      totalAllExpenses: financialSummary?.expenses?.totalAllExpenses || 0,
      totalExpenses: financialSummary?.expenses?.totalAllExpenses || 0,
      cashBalance: financialSummary?.cashBalance || 0,
      totalBalance: financialSummary?.totalBalance || 0,
      currentBalance: financialSummary?.totalBalance || 0,
      totalWorkers: financialSummary?.workers?.totalWorkers || 0,
      activeWorkers: financialSummary?.workers?.activeWorkers || 0,
      materialExpensesCredit: financialSummary?.expenses?.materialExpensesCredit || 0,
      carriedForwardBalance: financialSummary?.income?.carriedForwardBalance || 0,
      
      // الحقول الإضافية التي يحتاجها المكون
      totalWorkerWages: financialSummary?.expenses?.workerWages || 0,
      totalTransportation: financialSummary?.expenses?.transportExpenses || 0,
      totalMaterialCosts: financialSummary?.expenses?.materialExpenses || 0,
      totalWorkerTransfers: financialSummary?.expenses?.workerTransfers || 0,
      totalMiscExpenses: financialSummary?.expenses?.miscExpenses || 0,
      totalFundTransfers: financialSummary?.income?.fundTransfers || 0,
      incomingProjectTransfers: financialSummary?.income?.incomingProjectTransfers || 0,
      outgoingProjectTransfers: financialSummary?.expenses?.outgoingProjectTransfers || 0,
      remainingBalance: financialSummary?.totalBalance || 0
    };
  }, [isAllProjects, totals, financialSummary]);

  const displayIncome = useMemo(() => {
    return totalsValue.totalIncome;
  }, [totalsValue]);

  const displayAvailableBalance = useMemo(() => {
    // المتبقي من سابق يجمع إذا كان موجباً ويطرح إذا كان سالباً
    return totalsValue.totalIncome + (parseFloat(String(totalsValue.carriedForwardBalance || 0)));
  }, [totalsValue]);

  const displayExpenses = useMemo(() => {
    return totalsValue.totalCashExpenses;
  }, [totalsValue]);

  const displayBalance = useMemo(() => {
    // الرصيد المتبقي = (الدخل المتاح) - المصروفات النقدية
    return displayAvailableBalance - totalsValue.totalCashExpenses;
  }, [displayAvailableBalance, totalsValue.totalCashExpenses]);

  const { 
    data: dailyExpensesData, 
    isLoading: dailyExpensesLoading, 
    error: dailyExpensesError,
    refetch: refetchDailyExpenses 
  } = useQuery<any>({
    queryKey: QUERY_KEYS.dailyExpensesComplex(isAllProjects ? "all-projects" : selectedProjectId, selectedDate ? "daily-expenses" : "all-expenses", selectedDate),
    queryFn: async () => {
      try {
        if (isAllProjects) {
          // جلب بيانات الإجمالي لجميع المشاريع بما في ذلك الرصيد المرحل
          const totalUrl = selectedDate && selectedDate !== "null"
            ? `/api/projects/all-projects-total?date=${selectedDate}`
            : `/api/projects/all-projects-total`;
            
          const totalResponse = await apiRequest(totalUrl, "GET");
          
          const url = selectedDate && selectedDate !== "null"
            ? `/api/projects/all-projects-expenses?date=${selectedDate}`
            : `/api/projects/all-projects-expenses`;
          const response = await apiRequest(url, "GET");
          
          if (response && response.success && response.data) {
            // دمج بيانات الرصيد المرحل من الاستجابة الجديدة
            if (totalResponse && totalResponse.success && totalResponse.data) {
              return {
                ...response.data,
                carriedForwardBalance: totalResponse.data.carriedForwardBalance
              };
            }
            return response.data;
          }
          return null;
        }

        if (!selectedProjectId) {
          return null;
        }

        if (!selectedDate || selectedDate === "null") {
          const response = await apiRequest(`/api/projects/${selectedProjectId}/all-expenses`, "GET");
          if (response && response.success && response.data) {
            return response.data;
          }
          return null;
        }

        const response = await apiRequest(`/api/projects/${selectedProjectId}/daily-expenses/${selectedDate}`, "GET");
        if (response && response.success && response.data) {
          return response.data;
        }

        return null;
      } catch (error) {
        console.error("خطأ في جلب المصروفات:", error);
        throw error;
      }
    },
    enabled: isAllProjects || !!selectedProjectId,
    retry: 1,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (previousData: any) => previousData,
  });

  const carriedForwardDisplay = useMemo(() => {
    // الأولوية لبيانات dailyExpensesData إذا كانت متوفرة (لجميع المشاريع)
    if (dailyExpensesData?.carriedForwardBalance !== undefined) {
      return dailyExpensesData.carriedForwardBalance;
    }
    // وإلا نستخدم القيمة من totalsValue (للمشروع الفردي)
    return totalsValue.carriedForwardBalance || 0;
  }, [totalsValue.carriedForwardBalance, dailyExpensesData]);

  const totalRemainingWithCarried = useMemo(() => {
    const carried = dailyExpensesData?.carriedForwardBalance !== undefined 
      ? dailyExpensesData.carriedForwardBalance 
      : (totalsValue.carriedForwardBalance || 0);
    return (totalsValue.totalIncome + carried) - totalsValue.totalCashExpenses;
  }, [totalsValue.totalIncome, totalsValue.totalCashExpenses, totalsValue.carriedForwardBalance, dailyExpensesData]);

  // إعداد البيانات لملخص المصاريف
  const summaryData = useMemo(() => ({
    totalIncome: totalsValue.totalIncome,
    totalExpenses: totalsValue.totalCashExpenses,
    remainingBalance: totalRemainingWithCarried,
    materialExpensesCredit: totalsValue.materialExpensesCredit,
    carriedForward: carriedForwardDisplay,
    details: {
      workerWages: totalsValue.totalWorkerWages,
      materialCosts: totalsValue.totalMaterialCosts,
      transportation: totalsValue.totalTransportation,
      miscExpenses: totalsValue.totalMiscExpenses,
      workerTransfers: totalsValue.totalWorkerTransfers,
      outgoingProjectTransfers: totalsValue.outgoingProjectTransfers
    }
  }), [totalsValue, totalRemainingWithCarried, carriedForwardDisplay]);

  // تحديث البيانات عند الحفظ أو الحذف
  const refreshAllData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectsWithStats });
    refetchDailyExpenses();
    refetchProjectTransfers();
    refetchFinancial();
    refetchAttendance();
  }, [queryClient, refetchDailyExpenses, refetchProjectTransfers, refetchFinancial, refetchAttendance]);

  // استخلاص البيانات من dailyExpensesData - محسّن
  const { 
    todayFundTransfers, 
    todayWorkerAttendance, 
    todayTransportation, 
    todayMaterialPurchases, 
    todayWorkerTransfers, 
    todayMiscExpenses 
  } = useMemo(() => {
    // إذا لم تكن البيانات موجودة، نستخدم مصفوفات فارغة
    if (!dailyExpensesData) {
      return {
        todayFundTransfers: [],
        todayWorkerAttendance: [],
        todayTransportation: [],
        todayMaterialPurchases: [],
        todayWorkerTransfers: [],
        todayMiscExpenses: []
      };
    }

    // استخراج البيانات مع التأكد من أنها مصفوفات
    const data = dailyExpensesData.data || dailyExpensesData;
    
    return {
      todayFundTransfers: Array.isArray(data.fundTransfers) ? data.fundTransfers : [],
      todayWorkerAttendance: Array.isArray(data.workerAttendance) ? data.workerAttendance : [],
      todayTransportation: Array.isArray(data.transportationExpenses) ? data.transportationExpenses : [],
      todayMaterialPurchases: Array.isArray(data.materialPurchases) ? data.materialPurchases : [],
      todayWorkerTransfers: Array.isArray(data.workerTransfers) ? data.workerTransfers : [],
      todayMiscExpenses: Array.isArray(data.miscExpenses) ? data.miscExpenses : []
    };
  }, [dailyExpensesData]);

  // معالجة آمنة للبيانات - التأكد من أن البيانات مصفوفات
  const safeAttendance = Array.isArray(todayWorkerAttendance) ? todayWorkerAttendance : [];
  const safeTransportation = Array.isArray(todayTransportation) ? todayTransportation : [];
  const safeMaterialPurchases = Array.isArray(todayMaterialPurchases) ? todayMaterialPurchases : [];
  const safeWorkerTransfers = Array.isArray(todayWorkerTransfers) ? todayWorkerTransfers : [];
  const safeMiscExpenses = Array.isArray(todayMiscExpenses) ? todayMiscExpenses : [];
  const safeFundTransfers = Array.isArray(todayFundTransfers) ? todayFundTransfers : [];

  // تصفير البئر عند تغيير المشروع
  useEffect(() => {
    setSelectedWellIds([]);
    setSelectedCrewTypes([]);
    setFundTransferWellId(undefined);
    setPurchaseWellIds([]);
    setPurchaseCrewTypes([]);
  }, [selectedProjectId]);

  // تحديث حالة توسع الفئات عند تغير البيانات
  useEffect(() => {
    // نجعلها مطوية تلقائياً (false) عندما لا توجد بيانات، ومفتوحة (true) عندما توجد بيانات
    setIsFundTransfersExpanded(safeFundTransfers.length > 0);
    setIsTransportationExpanded(safeTransportation.length > 0);
    setIsAttendanceExpanded(safeAttendance.length > 0);
    setIsMaterialsExpanded(safeMaterialPurchases.length > 0);
    setIsWorkerTransfersExpanded(safeWorkerTransfers.length > 0);
    setIsProjectTransfersExpanded(safeProjectTransfers.length > 0);
    setIsMiscExpanded(safeMiscExpenses.length > 0);
  }, [
    safeFundTransfers.length, 
    safeTransportation.length, 
    safeAttendance.length,
    safeMaterialPurchases.length,
    safeWorkerTransfers.length,
    safeProjectTransfers.length,
    safeMiscExpenses.length
  ]);

  // فلترة البيانات حسب نص البحث
  const filteredFundTransfers = useMemo(() => {
    if (!searchValue.trim()) return safeFundTransfers;
    const searchLower = searchValue.toLowerCase().trim();
    return safeFundTransfers.filter((transfer: any) => 
      transfer.senderName?.toLowerCase().includes(searchLower) ||
      transfer.transferType?.toLowerCase().includes(searchLower) ||
      transfer.transferNumber?.toLowerCase().includes(searchLower) ||
      transfer.amount?.toString().includes(searchLower)
    );
  }, [safeFundTransfers, searchValue]);

  const filteredAttendance = useMemo(() => {
    if (!searchValue.trim()) return safeAttendance;
    const searchLower = searchValue.toLowerCase().trim();
    return safeAttendance.filter((record: any) => {
      const worker = workers.find((w: any) => w.id === record.worker_id);
      return (
        worker?.name?.toLowerCase().includes(searchLower) ||
        record.workDescription?.toLowerCase().includes(searchLower) ||
        record.notes?.toLowerCase().includes(searchLower)
      );
    });
  }, [safeAttendance, workers, searchValue]);

  const filteredTransportation = useMemo(() => {
    if (!searchValue.trim()) return safeTransportation;
    const searchLower = searchValue.toLowerCase().trim();
    return safeTransportation.filter((expense: any) => 
      expense.description?.toLowerCase().includes(searchLower) ||
      expense.notes?.toLowerCase().includes(searchLower) ||
      expense.amount?.toString().includes(searchLower)
    );
  }, [safeTransportation, searchValue]);

  const filteredMaterialPurchases = useMemo(() => {
    if (!searchValue.trim()) return safeMaterialPurchases;
    const searchLower = searchValue.toLowerCase().trim();
    return safeMaterialPurchases.filter((purchase: any) => {
      const material = materials.find((m: any) => m.id === purchase.material_id);
      return (
        material?.name?.toLowerCase().includes(searchLower) ||
        purchase.supplier?.toLowerCase().includes(searchLower) ||
        purchase.notes?.toLowerCase().includes(searchLower) ||
        purchase.totalAmount?.toString().includes(searchLower)
      );
    });
  }, [safeMaterialPurchases, materials, searchValue]);

  const filteredWorkerTransfers = useMemo(() => {
    if (!searchValue.trim()) return safeWorkerTransfers;
    const searchLower = searchValue.toLowerCase().trim();
    return safeWorkerTransfers.filter((transfer: any) => {
      const worker = workers.find((w: any) => w.id === transfer.worker_id);
      return (
        worker?.name?.toLowerCase().includes(searchLower) ||
        transfer.notes?.toLowerCase().includes(searchLower) ||
        transfer.amount?.toString().includes(searchLower)
      );
    });
  }, [safeWorkerTransfers, workers, searchValue]);

  const filteredMiscExpenses = useMemo(() => {
    if (!searchValue.trim()) return safeMiscExpenses;
    const searchLower = searchValue.toLowerCase().trim();
    return safeMiscExpenses.filter((expense: any) => 
      expense.description?.toLowerCase().includes(searchLower) ||
      expense.notes?.toLowerCase().includes(searchLower) ||
      expense.amount?.toString().includes(searchLower)
    );
  }, [safeMiscExpenses, searchValue]);

  // جلب الرصيد المتبقي من اليوم السابق - فقط للمشاريع المحددة
  const { data: previousBalance } = useQuery({
    queryKey: QUERY_KEYS.previousBalance(selectedProjectId, selectedDate),
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/projects/${selectedProjectId}/previous-balance/${selectedDate}`, "GET");
        // معالجة الهيكل المتداخل للاستجابة
        if (response && response.data && response.data.balance !== undefined) {
          return response.data.balance || "0";
        }
        return response?.balance || "0";
      } catch (error) {
        console.error("Error fetching previous balance:", error);
        return "0";
      }
    },
    enabled: !!selectedProjectId && !!selectedDate && !isAllProjects,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: undefined,
  });

  // تحديث المبلغ المرحل تلقائياً عند جلب الرصيد السابق
  useEffect(() => {
    if (previousBalance !== null && previousBalance !== undefined) {
      console.log('🔄 تحديث carriedForward:', { previousBalance, type: typeof previousBalance });
      setCarriedForward(previousBalance);
    }
  }, [previousBalance]);

  // ⚡ تحديث ذكي عند تغيير التاريخ أو المشروع
  useEffect(() => {
    // فقط إبطال الكاش دون إعادة جلب فورية - سيتم الجلب عند الحاجة
    if (selectedProjectId || isAllProjects) {
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.projects,
        refetchType: 'none' // لا تعيد الجلب تلقائياً
      });
    }
  }, [selectedProjectId, selectedDate, isAllProjects, queryClient]);

  // تهيئة قيم الإكمال التلقائي الافتراضية لنوع التحويل
  useEffect(() => {
    const initializeDefaultTransferTypes = async () => {
      const defaultTypes = ['حولة بنكية', 'تسليم يدوي', 'صراف آلي', 'تحويل داخلي', 'شيك', 'نقدية'];

      for (const type of defaultTypes) {
        try {
          await saveAutocompleteValue('transferTypes', type);
        } catch (error) {
          // تجاهل الأخطاء بهدوء
          console.log(`Type ${type} initialization skipped:`, error);
        }
      }
    };

    // تهيئة القيم مرة واحدة فقط عند تحميل المكون
    initializeDefaultTransferTypes();
  }, []);

  const addFundTransferMutation = useMutation({
    mutationFn: async (data: InsertFundTransfer) => {
      await saveAllFundTransferAutocompleteValues();
      // أضف well_id إلى البيانات
      const dataWithWell = { ...data, well_id: fundTransferWellId || null };
      return apiRequest("/api/fund-transfers", "POST", dataWithWell);
    },
    onSuccess: async (newTransfer) => {
      refreshAllData();
      
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });

      toast({
        title: "تم إضافة العهدة",
        description: "تم إضافة تحويل العهدة بنجاح",
      });

      setFundAmount("");
      setSenderName("");
      setTransferNumber("");
      setTransferType("");
    },
    onError: async (error: any) => {
      // حفظ جميع قيم الإكمال التلقائي حتى في حالة الخطأ
      await saveAllFundTransferAutocompleteValues();

      // تحديث كاش autocomplete
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });

      console.error("خطأ في إضافة الحولة:", error);

      let errorMessage = "حدث خطأ أثناء إضافة الحولة";

      // معالجة أنواع مختلفة من الأخطاء
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      // ✅ حفظ محلي في قائمة الانتظار عند الفشل
      try {
        const dataWithWell = { 
          fundAmount: fundAmount ? parseFloat(fundAmount) : 0, 
          senderName,
          transferNumber,
          transferType,
          selectedDate,
          project_id: selectedProjectId,
          well_id: fundTransferWellId || null 
        };
        await queueForSync('create', '/api/fund-transfers', dataWithWell);
        toast({
          title: "تم الحفظ محليًا",
          description: `${errorMessage} - سيتم المزامنة عند الاتصال`,
          variant: "default",
        });
      } catch (queueError) {
        toast({
          title: "فشل في إضافة الحولة",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  const addTransportationMutation = useMutation({
    mutationFn: async (data: InsertTransportationExpense) => {
      // حفظ الوصف والملاحظات في نظام الإكمال التلقائي
      if (transportDescription && transportDescription.trim().length >= 2) {
        await saveAutocompleteValue('transportDescriptions', transportDescription);
      }
      if (transportNotes && transportNotes.trim().length >= 2) {
        await saveAutocompleteValue('notes', transportNotes);
      }
      
      // أضف well_id إلى البيانات
      const dataWithWell = { ...data, well_id: selectedWellIds[0] || null, well_ids: selectedWellIds.length > 0 ? JSON.stringify(selectedWellIds) : null, crew_type: selectedCrewTypes.length > 0 ? JSON.stringify(selectedCrewTypes) : null, team_name: selectedTeamNames.length > 0 ? JSON.stringify(selectedTeamNames) : null };
      return apiRequest("/api/transportation-expenses", "POST", dataWithWell);
    },
    onSuccess: async (newExpense) => {
      refreshAllData();
      queryClient.invalidateQueries({ queryKey: ['/api/autocomplete', 'transportDescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/autocomplete', 'notes'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });

      toast({
        title: "تم إضافة المواصلات",
        description: "تم إضافة مصروف المواصلات بنجاح",
      });

      setTransportDescription("");
      setTransportAmount("");
      setTransportNotes("");
    },
    onError: async (error) => {
      // محاولة الحفظ حتى عند الفشل في الإكمال التلقائي لضمان تجربة مستخدم سلسة
      if (transportDescription && transportDescription.trim().length >= 2) {
        saveAutocompleteValue('transportDescriptions', transportDescription).catch(() => {});
      }
      
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });

      // ✅ حفظ محلي في قائمة الانتظار عند الفشل
      try {
        const dataWithWell = {
          description: transportDescription,
          amount: transportAmount ? parseFloat(transportAmount) : 0,
          notes: transportNotes,
          selectedDate,
          project_id: selectedProjectId,
          well_id: selectedWellIds[0] || null,
          well_ids: selectedWellIds.length > 0 ? JSON.stringify(selectedWellIds) : null,
          crew_type: selectedCrewTypes.length > 0 ? JSON.stringify(selectedCrewTypes) : null,
          team_name: selectedTeamNames.length > 0 ? JSON.stringify(selectedTeamNames) : null
        };
        await queueForSync('create', '/api/transportation-expenses', dataWithWell);
        toast({
          title: "تم الحفظ محليًا",
          description: "خطأ في الاتصال - سيتم المزامنة عند الاتصال",
          variant: "default",
        });
      } catch (queueError) {
        toast({
          title: "خطأ في إضافة المواصلات",
          description: error?.message || "حدث خطأ أثناء إضافة مصروف المواصلات",
          variant: "destructive",
        });
      }
    },
  });

  const saveDailySummaryMutation = useMutation({
    mutationFn: (data: InsertDailyExpenseSummary) => apiRequest("/api/daily-expense-summaries", "POST", data),
    onSuccess: () => {
      refreshAllData();
      toast({
        title: "تم الحفظ",
        description: "تم حفظ ملخص المصروفات اليومية بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الملخص",
        variant: "destructive",
      });
    },
  });

  const deleteFundTransferMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/fund-transfers/${id}`, "DELETE"),
    onSuccess: (_, id) => {
      queryClient.setQueryData(QUERY_KEYS.dailyExpenses(selectedProjectId, selectedDate), (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          fundTransfers: oldData.fundTransfers?.filter((transfer: any) => transfer.id !== id) || []
        };
      });
      
      refreshAllData();
      
      toast({ 
        title: "تم الحذف", 
        description: "تم حذف العهدة بنجاح" 
      });
    },
    onError: (error: any) => {
      console.error("خطأ في حذف الحولة:", error);
      let errorMessage = "حدث خطأ أثناء حذف الحولة";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      toast({ 
        title: "فشل في حذف الحولة", 
        description: errorMessage, 
        variant: "destructive" 
      });
    }
  });

  const deleteTransportationMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/transportation-expenses/${id}`, "DELETE"),
    onSuccess: (_, id) => {
      queryClient.setQueryData(QUERY_KEYS.dailyExpenses(selectedProjectId, selectedDate), (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          transportationExpenses: oldData.transportationExpenses?.filter((expense: any) => expense.id !== id) || []
        };
      });
      
      refreshAllData();
      
      toast({ 
        title: "تم الحذف", 
        description: "تم حذف مصروف المواصلات بنجاح" 
      });
    },
    onError: (error: any) => {
      console.error("خطأ في حذف مصروف المواصلات:", error);

      let errorMessage = "حدث خطأ أثناء حذف مصروف المواصلات";

      // معالجة محسنة للأخطاء
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast({ 
        title: "فشل في حذف مصروف المواصلات", 
        description: errorMessage, 
        variant: "destructive" 
      });
    }
  });

  const deleteMaterialPurchaseMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/material-purchases/${id}`, "DELETE"),
    onMutate: () => {
      // حفظ القيم الحالية لتجنب Race Condition
      return {
        project_id: selectedProjectId,
        date: selectedDate
      };
    },
    onSuccess: (_, id, context) => {
      // استخدام القيم المحفوظة من onMutate
      const { project_id, date } = context || { project_id: selectedProjectId, date: selectedDate };
      
      // تحديث فوري للقائمة باستخدام setQueryData
      queryClient.setQueryData(QUERY_KEYS.dailyExpenses(project_id, date), (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          materialPurchases: oldData.materialPurchases?.filter((purchase: any) => purchase.id !== id) || []
        };
      });
      
      // إبطال الكاش للتأكد من التحديث الكامل
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.dailyExpenses(project_id, date) 
      });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.materialPurchases(project_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.previousBalance(project_id) 
      });
      
      toast({ 
        title: "تم الحذف", 
        description: "تم حذف شراء المواد بنجاح" 
      });
    },
    onError: (error: any) => {
      console.error("خطأ في حذف شراء المواد:", error);

      let errorMessage = "حدث خطأ أثناء حذف شراء المواد";

      // معالجة محسنة للأخطاء
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast({ 
        title: "فشل في حذف شراء المواد", 
        description: errorMessage, 
        variant: "destructive" 
      });
    }
  });

  // Material Purchase Add Mutation
  const addMaterialPurchaseMutation = useMutation({
    mutationFn: async (data: any) => {
      if (purchaseMaterialName && purchaseMaterialName.trim().length >= 2) {
        await saveAutocompleteValue('materialNames', purchaseMaterialName);
      }
      if (purchaseSupplierName && purchaseSupplierName.trim().length >= 2) {
        await saveAutocompleteValue('supplierNames', purchaseSupplierName);
      }
      if (purchaseUnit && purchaseUnit.trim().length >= 1) {
        await saveAutocompleteValue('materialUnits', purchaseUnit);
      }
      return apiRequest("/api/material-purchases", "POST", data);
    },
    onSuccess: () => {
      refreshAllData();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.materialPurchases(selectedProjectId) });
      resetMaterialPurchaseForm();
      toast({
        title: "تم إضافة الشراء",
        description: "تم إضافة شراء المواد بنجاح",
      });
    },
    onError: async (error: any) => {
      if (purchaseMaterialName) saveAutocompleteValue('materialNames', purchaseMaterialName).catch(() => {});
      if (purchaseSupplierName) saveAutocompleteValue('supplierNames', purchaseSupplierName).catch(() => {});
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });

      if (error?.status === 422 && error?.responseData?.requiresConfirmation) {
        const rd = error.responseData;
        setGuardPurchaseData({
          type: rd.guardType === 'budget_overrun' ? 'overpaid_purchase' : rd.guardType === 'duplicate_purchase' ? 'large_amount' : 'large_amount',
          title: rd.title || 'تنبيه مالي',
          enteredAmount: rd.guardData?.totalAmount || 0,
          suggestions: rd.suggestions || [],
          details: rd.details || [],
          originalData: {
            project_id: selectedProjectId,
            materialName: purchaseMaterialName,
            quantity: purchaseQuantity ? parseFloat(purchaseQuantity) : 0,
            unit: purchaseUnit,
            unitPrice: purchaseUnitPrice ? parseFloat(purchaseUnitPrice) : 0,
            totalAmount: purchaseTotalAmount ? parseFloat(purchaseTotalAmount) : 0,
            purchaseType: purchaseType,
            supplierName: purchaseSupplierName || null,
            purchaseDate: selectedDate,
            notes: purchaseNotes || null,
            well_id: purchaseWellIds[0] || null,
            well_ids: purchaseWellIds.length > 0 ? JSON.stringify(purchaseWellIds) : null,
            crew_type: purchaseCrewTypes.length > 0 ? JSON.stringify(purchaseCrewTypes) : null,
            team_name: selectedTeamNames.length > 0 ? JSON.stringify(selectedTeamNames) : null,
            paidAmount: purchaseType === 'نقد' ? (purchaseTotalAmount ? parseFloat(purchaseTotalAmount) : 0).toString() : '0',
            remainingAmount: purchaseType === 'آجل' ? (purchaseTotalAmount ? parseFloat(purchaseTotalAmount) : 0).toString() : '0',
          },
        });
        setShowGuardPurchaseDialog(true);
        return;
      }

      try {
        const purchaseData = {
          project_id: selectedProjectId,
          materialName: purchaseMaterialName,
          quantity: purchaseQuantity ? parseFloat(purchaseQuantity) : 0,
          unit: purchaseUnit,
          unitPrice: purchaseUnitPrice ? parseFloat(purchaseUnitPrice) : 0,
          totalAmount: purchaseTotalAmount ? parseFloat(purchaseTotalAmount) : 0,
          purchaseType: purchaseType,
          supplierName: purchaseSupplierName || null,
          purchaseDate: selectedDate,
          notes: purchaseNotes || null,
          well_id: purchaseWellIds[0] || null,
          well_ids: purchaseWellIds.length > 0 ? JSON.stringify(purchaseWellIds) : null,
          crew_type: purchaseCrewTypes.length > 0 ? JSON.stringify(purchaseCrewTypes) : null,
          team_name: selectedTeamNames.length > 0 ? JSON.stringify(selectedTeamNames) : null,
          paidAmount: purchaseType === 'نقد' ? (purchaseTotalAmount ? parseFloat(purchaseTotalAmount) : 0).toString() : '0',
          remainingAmount: purchaseType === 'آجل' ? (purchaseTotalAmount ? parseFloat(purchaseTotalAmount) : 0).toString() : '0',
        };
        await queueForSync('create', '/api/material-purchases', purchaseData);
        toast({
          title: "تم الحفظ محليًا",
          description: "خطأ في الاتصال - سيتم المزامنة عند الاتصال",
          variant: "default",
        });
      } catch (queueError) {
        toast({
          title: "فشل في إضافة الشراء",
          description: error?.message || "حدث خطأ أثناء إضافة شراء المواد",
          variant: "destructive",
        });
      }
    },
  });

  // Material Purchase Update Mutation
  const updateMaterialPurchaseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`/api/material-purchases/${id}`, "PATCH", data),
    onSuccess: async () => {
      refreshAllData();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.materialPurchases(selectedProjectId) });

      if (purchaseMaterialName) await saveAutocompleteValue('materialNames', purchaseMaterialName);
      if (purchaseSupplierName) await saveAutocompleteValue('supplierNames', purchaseSupplierName);
      if (purchaseUnit) await saveAutocompleteValue('materialUnits', purchaseUnit);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });

      resetMaterialPurchaseForm();
      toast({
        title: "تم التحديث",
        description: "تم تحديث شراء المواد بنجاح",
      });
    },
    onError: (error: any) => {
      if (error?.status === 422 && error?.responseData?.requiresConfirmation) {
        const rd = error.responseData;
        setGuardPurchaseData({
          type: rd.guardType === 'budget_overrun' ? 'overpaid_purchase' : 'large_amount',
          title: rd.title || 'تنبيه مالي',
          enteredAmount: rd.guardData?.totalAmount || 0,
          suggestions: rd.suggestions || [],
          details: rd.details || [],
          originalData: { ...(rd._originalBody || {}), _editId: editingMaterialPurchaseId },
        });
        setShowGuardPurchaseDialog(true);
        return;
      }
      toast({
        title: "فشل في تحديث الشراء",
        description: error?.message || "حدث خطأ أثناء تحديث شراء المواد",
        variant: "destructive",
      });
    }
  });

  const resetMaterialPurchaseForm = () => {
    setPurchaseMaterialName("");
    setPurchaseQuantity("");
    setPurchaseUnit("");
    setPurchaseUnitPrice("");
    setPurchaseTotalAmount("");
    setPurchaseType("نقد");
    setPurchaseSupplierName("");
    setPurchaseNotes("");
    setPurchaseWellIds([]);
    setPurchaseCrewTypes([]);
    setEditingMaterialPurchaseId(null);
  };

  const handleEditMaterialPurchase = (purchase: any) => {
    setPurchaseMaterialName(purchase.materialName || "");
    setPurchaseQuantity(purchase.quantity?.toString() || "");
    setPurchaseUnit(purchase.unit || purchase.materialUnit || "");
    setPurchaseUnitPrice(purchase.unitPrice?.toString() || "");
    setPurchaseTotalAmount(purchase.totalAmount?.toString() || "");
    setPurchaseType(purchase.purchaseType || "نقد");
    setPurchaseSupplierName(purchase.supplierName || "");
    setPurchaseNotes(purchase.notes || "");
    setPurchaseWellIds(purchase.well_ids ? JSON.parse(purchase.well_ids) : (purchase.well_id ? [Number(purchase.well_id)] : []));
    setPurchaseCrewTypes(purchase.crew_type ? (purchase.crew_type.startsWith('[') ? JSON.parse(purchase.crew_type) : [purchase.crew_type]) : []);
    setEditingMaterialPurchaseId(purchase.id);
    setIsMaterialsExpanded(true);
  };

  const handleAddMaterialPurchase = () => {
    if (!selectedProjectId || isAllProjects) {
      toast({
        title: "يرجى تحديد مشروع",
        description: "لا يمكن إضافة شراء مواد على جميع المشاريع. يرجى اختيار مشروع محدد أولاً",
        variant: "destructive",
      });
      return;
    }

    if (!purchaseMaterialName || purchaseMaterialName.trim() === "") {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم المادة",
        variant: "destructive",
      });
      return;
    }

    if (!purchaseQuantity || parseFloat(purchaseQuantity) <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال كمية صحيحة",
        variant: "destructive",
      });
      return;
    }

    const isPriceRequired = purchaseType !== 'مخزن';
    if (isPriceRequired && (!purchaseUnitPrice || parseFloat(purchaseUnitPrice) <= 0)) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال سعر الوحدة",
        variant: "destructive",
      });
      return;
    }

    const qty = parseFloat(purchaseQuantity) || 0;
    const price = isPriceRequired ? (parseFloat(purchaseUnitPrice) || 0) : (parseFloat(purchaseUnitPrice || "0"));
    const total = purchaseTotalAmount ? parseFloat(purchaseTotalAmount) : qty * price;

    const purchaseData: any = {
      project_id: selectedProjectId,
      materialName: purchaseMaterialName.trim(),
      quantity: qty.toString(),
      unit: purchaseUnit.trim() || "وحدة",
      unitPrice: price.toString(),
      totalAmount: total.toString(),
      purchaseType: purchaseType,
      supplierName: purchaseSupplierName.trim() || null,
      purchaseDate: selectedDate,
      notes: purchaseNotes.trim() || null,
      well_id: purchaseWellIds[0] || null,
      well_ids: purchaseWellIds.length > 0 ? JSON.stringify(purchaseWellIds) : null,
      crew_type: purchaseCrewTypes.length > 0 ? JSON.stringify(purchaseCrewTypes) : null,
      team_name: selectedTeamNames.length > 0 ? JSON.stringify(selectedTeamNames) : null,
      paidAmount: purchaseType === 'نقد' ? total.toString() : '0',
      remainingAmount: purchaseType === 'آجل' ? total.toString() : '0',
    };

    if (editingMaterialPurchaseId) {
      updateMaterialPurchaseMutation.mutate({
        id: editingMaterialPurchaseId,
        data: purchaseData
      });
    } else {
      addMaterialPurchaseMutation.mutate(purchaseData);
    }
  };

  const deleteProjectTransferMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/project-fund-transfers/${id}`, "DELETE"),
    onSuccess: () => {
      refreshAllData();
      refetchProjectTransfers();
      toast({ title: "تم الحذف", description: "تم حذف ترحيل الأموال بنجاح" });
    },
    onError: (error: any) => {
      toast({ 
        title: "خطأ", 
        description: error?.message || "حدث خطأ أثناء حذف الترحيل", 
        variant: "destructive" 
      });
    }
  });

  const [editingProjectTransferId, setEditingProjectTransferId] = useState<string | null>(null);
  const [projectTransferFromId, setProjectTransferFromId] = useState<string>("");
  const [projectTransferToId, setProjectTransferToId] = useState<string>("");
  const [projectTransferAmount, setProjectTransferAmount] = useState<string>("");
  const [projectTransferReason, setProjectTransferReason] = useState<string>("");
  const [projectTransferDescription, setProjectTransferDescription] = useState<string>("");

  const addProjectTransferMutation = useMutation({
    mutationFn: async (data: any) => {
      if (projectTransferReason) {
        await saveAutocompleteValue('transferReasons', projectTransferReason);
      }
      return apiRequest("/api/project-fund-transfers", "POST", data);
    },
    onSuccess: () => {
      refreshAllData();
      refetchProjectTransfers();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });
      resetProjectTransferForm();
      toast({ title: "تم إضافة الترحيل", description: "تم ترحيل الأموال بين المشاريع بنجاح" });
    },
    onError: async (error: any) => {
      try {
        const transferData = {
          fromProjectId: projectTransferFromId,
          toProjectId: projectTransferToId,
          amount: projectTransferAmount,
          transferDate: selectedDate,
          transferReason: projectTransferReason,
          description: projectTransferDescription,
        };
        await queueForSync('create', '/api/project-fund-transfers', transferData);
        toast({
          title: "تم الحفظ محليًا",
          description: "خطأ في الاتصال - سيتم المزامنة عند الاتصال",
          variant: "default",
        });
      } catch (queueError) {
        toast({
          title: "خطأ",
          description: error?.message || "حدث خطأ أثناء إضافة ترحيل الأموال",
          variant: "destructive",
        });
      }
    }
  });

  const updateProjectTransferMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`/api/project-fund-transfers/${id}`, "PATCH", data),
    onSuccess: async () => {
      refreshAllData();
      refetchProjectTransfers();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dailyExpenses(selectedProjectId, selectedDate) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.previousBalance(selectedProjectId) });
      if (projectTransferReason) await saveAutocompleteValue('transferReasons', projectTransferReason);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });
      resetProjectTransferForm();
      toast({ title: "تم التحديث", description: "تم تحديث ترحيل الأموال بنجاح" });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error?.message || "حدث خطأ أثناء تحديث ترحيل الأموال",
        variant: "destructive",
      });
    }
  });

  const resetProjectTransferForm = () => {
    setProjectTransferFromId("");
    setProjectTransferToId("");
    setProjectTransferAmount("");
    setProjectTransferReason("");
    setProjectTransferDescription("");
    setEditingProjectTransferId(null);
  };

  const handleEditProjectTransfer = (transfer: any) => {
    setProjectTransferFromId(transfer.fromProjectId || "");
    setProjectTransferToId(transfer.toProjectId || "");
    setProjectTransferAmount(String(transfer.amount || ""));
    setProjectTransferReason(transfer.transferReason || "");
    setProjectTransferDescription(transfer.description || "");
    setEditingProjectTransferId(transfer.id);
    setIsProjectTransfersExpanded(true);
  };

  const handleAddProjectTransfer = () => {
    if (!projectTransferFromId) {
      toast({ title: "خطأ", description: "يرجى اختيار المشروع المصدر", variant: "destructive" });
      return;
    }
    if (!projectTransferToId) {
      toast({ title: "خطأ", description: "يرجى اختيار المشروع المستلم", variant: "destructive" });
      return;
    }
    if (projectTransferFromId === projectTransferToId) {
      toast({ title: "خطأ", description: "لا يمكن ترحيل الأموال لنفس المشروع", variant: "destructive" });
      return;
    }
    if (!projectTransferAmount || parseFloat(projectTransferAmount) <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال مبلغ صحيح", variant: "destructive" });
      return;
    }

    const transferData = {
      fromProjectId: projectTransferFromId,
      toProjectId: projectTransferToId,
      amount: projectTransferAmount.toString(),
      transferDate: selectedDate || getCurrentDate(),
      transferReason: projectTransferReason.trim() || "ترحيل أموال",
      description: projectTransferDescription.trim() || null,
    };

    if (editingProjectTransferId) {
      updateProjectTransferMutation.mutate({ id: editingProjectTransferId, data: transferData });
    } else {
      addProjectTransferMutation.mutate(transferData);
    }
  };

  const deleteWorkerAttendanceMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/worker-attendance/${id}`, "DELETE"),
    onMutate: () => {
      // حفظ القيم الحالية لتجنب Race Condition
      return {
        project_id: selectedProjectId,
        date: selectedDate
      };
    },
    onSuccess: (_, id, context) => {
      // استخدام القيم المحفوظة من onMutate
      const { project_id, date } = context || { project_id: selectedProjectId, date: selectedDate };
      
      // تحديث فوري للقائمة باستخدام setQueryData
      queryClient.setQueryData(QUERY_KEYS.dailyExpenses(project_id, date), (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          workerAttendance: oldData.workerAttendance?.filter((attendance: any) => attendance.id !== id) || []
        };
      });
      
      // إبطال الكاش للتأكد من التحديث الكامل
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.dailyExpenses(project_id, date) 
      });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.projectAttendance(project_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.previousBalance(project_id) 
      });
      
      toast({ 
        title: "تم الحذف", 
        description: "تم حذف حضور العامل بنجاح" 
      });
    },
    onError: (error: any) => {
      console.error("خطأ في حذف حضور العامل:", error);

      let errorMessage = "حدث خطأ أثناء حذف حضور العامل";

      // معالجة محسنة للأخطاء
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast({ 
        title: "فشل في حذف حضور العامل", 
        description: errorMessage, 
        variant: "destructive" 
      });
    }
  });

  const deleteWorkerTransferMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/worker-transfers/${id}`, "DELETE"),
    onMutate: () => {
      // حفظ القيم الحالية لتجنب Race Condition
      return {
        project_id: selectedProjectId,
        date: selectedDate
      };
    },
    onSuccess: (_, id, context) => {
      // استخدام القيم المحفوظة من onMutate
      const { project_id, date } = context || { project_id: selectedProjectId, date: selectedDate };
      
      // تحديث فوري للقائمة باستخدام setQueryData
      queryClient.setQueryData(QUERY_KEYS.dailyExpenses(project_id, date), (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          workerTransfers: oldData.workerTransfers?.filter((transfer: any) => transfer.id !== id) || []
        };
      });
      
      // إبطال الكاش للتأكد من التحديث الكامل
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.dailyExpenses(project_id, date) 
      });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.previousBalance(project_id) 
      });
      
      toast({ 
        title: "تم الحذف", 
        description: "تم حذف حوالة العامل بنجاح" 
      });
    },
    onError: (error: any) => {
      console.error("خطأ في حذف حوالة العامل:", error);

      let errorMessage = "حدث خطأ أثناء حذف حوالة العامل";

      // معالجة محسنة للأخطاء
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast({ 
        title: "فشل في حذف حوالة العامل", 
        description: errorMessage, 
        variant: "destructive" 
      });
    }
  });

  // Worker Transfer Add Mutation
  const addWorkerTransferMutation = useMutation({
    mutationFn: async (data: any) => {
      if (workerTransferRecipientName && workerTransferRecipientName.trim().length >= 2) {
        await saveAutocompleteValue('recipientNames', workerTransferRecipientName);
      }
      if (workerTransferRecipientPhone && workerTransferRecipientPhone.trim().length >= 2) {
        await saveAutocompleteValue('recipientPhones', workerTransferRecipientPhone);
      }
      return apiRequest("/api/worker-transfers", "POST", data);
    },
    onSuccess: () => {
      refreshAllData();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });
      resetWorkerTransferForm();
      toast({
        title: "تم إرسال الحوالة",
        description: "تم إرسال حوالة العامل بنجاح",
      });
    },
    onError: async (error: any) => {
      if (workerTransferRecipientName && workerTransferRecipientName.trim().length >= 2) {
        saveAutocompleteValue('recipientNames', workerTransferRecipientName).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });

      if (error?.status === 422 && error?.responseData?.requiresConfirmation) {
        const gd = error.responseData.guardData;
        const suggestions = error.responseData.suggestions || [];
        setGuardTransferData({
          type: 'negative_balance',
          title: 'تنبيه: التحويل يتجاوز رصيد العامل',
          workerName: gd?.workerName,
          enteredAmount: gd?.transferAmount || 0,
          currentBalance: gd?.currentBalance || 0,
          resultingBalance: gd?.resultingBalance || 0,
          suggestions,
          details: [
            { label: 'العامل', value: gd?.workerName || '' },
            { label: 'الرصيد الحالي', value: `${gd?.currentBalance ?? 0}`, color: (gd?.currentBalance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600' },
            { label: 'مبلغ التحويل', value: `${gd?.transferAmount ?? 0}`, color: 'text-amber-600' },
            { label: 'الرصيد بعد التحويل', value: `${gd?.resultingBalance ?? 0}`, color: 'text-red-600 font-bold' },
          ],
          originalData: {
            worker_id: workerTransferWorkerId,
            project_id: selectedProjectId,
            amount: workerTransferAmount ? parseFloat(workerTransferAmount) : 0,
            recipientName: workerTransferRecipientName,
            recipientPhone: workerTransferRecipientPhone,
            transferMethod: workerTransferMethod,
            transferNumber: workerTransferNumber,
            senderName: workerTransferSenderName,
            transferDate: selectedDate,
            notes: workerTransferNotes,
          },
        });
        setShowGuardTransferDialog(true);
        return;
      }

      try {
        const transferData = {
          worker_id: workerTransferWorkerId,
          project_id: selectedProjectId,
          amount: workerTransferAmount ? parseFloat(workerTransferAmount) : 0,
          recipientName: workerTransferRecipientName,
          recipientPhone: workerTransferRecipientPhone,
          transferMethod: workerTransferMethod,
          transferNumber: workerTransferNumber,
          senderName: workerTransferSenderName,
          transferDate: selectedDate,
          notes: workerTransferNotes,
        };
        await queueForSync('create', '/api/worker-transfers', transferData);
        toast({
          title: "تم الحفظ محليًا",
          description: "خطأ في الاتصال - سيتم المزامنة عند الاتصال",
          variant: "default",
        });
      } catch (queueError) {
        toast({
          title: "فشل في إرسال الحوالة",
          description: error?.message || "حدث خطأ أثناء إرسال حوالة العامل",
          variant: "destructive",
        });
      }
    },
  });

  // Worker Transfer Update Mutation
  const updateWorkerTransferMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`/api/worker-transfers/${id}`, "PATCH", data),
    onSuccess: async () => {
      refreshAllData();

      if (workerTransferRecipientName) await saveAutocompleteValue('recipientNames', workerTransferRecipientName);
      if (workerTransferRecipientPhone) await saveAutocompleteValue('recipientPhones', workerTransferRecipientPhone);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });

      resetWorkerTransferForm();
      toast({
        title: "تم التحديث",
        description: "تم تحديث حوالة العامل بنجاح",
      });
    },
    onError: (error: any) => {
      if (error?.status === 422 && error?.responseData?.requiresConfirmation) {
        const rd = error.responseData;
        setGuardTransferData({
          type: 'negative_balance',
          title: rd.title || 'تنبيه: رصيد سالب',
          enteredAmount: rd.guardData?.transferAmount || parseFloat(workerTransferAmount) || 0,
          currentBalance: rd.guardData?.currentBalance,
          suggestions: rd.suggestions || [],
          details: rd.details || [],
          originalData: {
            ...(rd._originalBody || {}),
            _patchId: editingWorkerTransferId,
          },
        });
        setShowGuardTransferDialog(true);
        return;
      }
      toast({
        title: "فشل في تحديث الحوالة",
        description: error?.message || "حدث خطأ أثناء تحديث حوالة العامل",
        variant: "destructive",
      });
    }
  });

  const resetWorkerTransferForm = () => {
    setWorkerTransferWorkerId("");
    setWorkerTransferAmount("");
    setWorkerTransferRecipientName("");
    setWorkerTransferRecipientPhone("");
    setWorkerTransferMethod("hawaleh");
    setWorkerTransferNumber("");
    setWorkerTransferSenderName("");
    setWorkerTransferNotes("");
    setEditingWorkerTransferId(null);
  };

  const handleEditWorkerTransfer = (transfer: any) => {
    setWorkerTransferWorkerId(transfer.worker_id || "");
    setWorkerTransferAmount(transfer.amount || "");
    setWorkerTransferRecipientName(transfer.recipientName || "");
    setWorkerTransferRecipientPhone(transfer.recipientPhone || "");
    setWorkerTransferMethod(transfer.transferMethod || "hawaleh");
    setWorkerTransferNumber(transfer.transferNumber || "");
    setWorkerTransferSenderName(transfer.senderName || "");
    setWorkerTransferNotes(transfer.notes || "");
    setEditingWorkerTransferId(transfer.id);
    setIsWorkerTransfersExpanded(true);
  };

  const handleAddWorkerTransfer = () => {
    if (!selectedProjectId || isAllProjects) {
      toast({
        title: "يرجى تحديد مشروع",
        description: "لا يمكن إرسال حوالة عامل على جميع المشاريع. يرجى اختيار مشروع محدد أولاً",
        variant: "destructive",
      });
      return;
    }

    if (!workerTransferWorkerId) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار العامل",
        variant: "destructive",
      });
      return;
    }

    if (!workerTransferAmount || parseFloat(workerTransferAmount) <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال مبلغ صحيح",
        variant: "destructive",
      });
      return;
    }

    if (!workerTransferRecipientName || workerTransferRecipientName.trim() === "") {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم المستقبل",
        variant: "destructive",
      });
      return;
    }

    const transferData = {
      worker_id: workerTransferWorkerId,
      project_id: selectedProjectId,
      amount: workerTransferAmount.toString(),
      recipientName: workerTransferRecipientName.trim(),
      recipientPhone: workerTransferRecipientPhone.trim() || null,
      transferMethod: workerTransferMethod,
      transferNumber: workerTransferNumber.trim() || null,
      senderName: workerTransferSenderName.trim() || null,
      transferDate: selectedDate,
      notes: workerTransferNotes.trim() || null,
    };

    if (editingWorkerTransferId) {
      updateWorkerTransferMutation.mutate({
        id: editingWorkerTransferId,
        data: transferData
      });
    } else {
      addWorkerTransferMutation.mutate(transferData);
    }
  };

  // Fund Transfer Update Mutation
  const updateFundTransferMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest(`/api/fund-transfers/${id}`, "PATCH", data),
    onSuccess: async (updatedTransfer, { id }) => {
      refreshAllData();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dailyExpenses(selectedProjectId, selectedDate) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.previousBalance(selectedProjectId) });

      if (senderName) await saveAutocompleteValue('senderNames', senderName);
      if (transferNumber) await saveAutocompleteValue('transferNumbers', transferNumber);

      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });

      resetFundTransferForm();
      toast({
        title: "تم التحديث",
        description: "تم تحديث العهدة بنجاح",
      });
    },
    onError: (error: any) => {
      console.error("خطأ في تحديث الحولة:", error);

      let errorMessage = "حدث خطأ أثناء تحديث الحولة";

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "فشل في تحديث الحولة",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const resetFundTransferForm = () => {
    setFundAmount("");
    setSenderName("");
    setTransferNumber("");
    setTransferType("");
    setEditingFundTransferId(null);
  };

  const handleEditFundTransfer = (transfer: FundTransfer) => {
    setFundAmount(transfer.amount);
    setSenderName(transfer.senderName || "");
    setTransferNumber(transfer.transferNumber || "");
    setTransferType(transfer.transferType);
    setEditingFundTransferId(transfer.id);
  };

  const handleAddFundTransfer = () => {
    // التحقق من البيانات المطلوبة
    if (!selectedProjectId || isAllProjects) {
      toast({
        title: "يرجى تحديد مشروع",
        description: "لا يمكن إضافة تحويل عهدة على جميع المشاريع. يرجى اختيار مشروع محدد من الشريط العلوي أولاً",
        variant: "destructive",
      });
      return;
    }

    if (!fundAmount || fundAmount.trim() === "" || parseFloat(fundAmount) <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال مبلغ صحيح",
        variant: "destructive",
      });
      return;
    }

    if (!transferType || transferType.trim() === "") {
      toast({
        title: "خطأ",
        description: "يرجى اختيار نوع التحويل",
        variant: "destructive",
      });
      return;
    }

    const fundTransferData = {
      project_id: selectedProjectId,
      amount: fundAmount.toString(),
      senderName: senderName.trim() || "غير محدد",
      transferNumber: transferNumber.trim() || null,
      transferType: transferType,
      transferDate: selectedDate || new Date().toISOString().split('T')[0],
      notes: "",
    };

    if (editingFundTransferId) {
      updateFundTransferMutation.mutate({
        id: editingFundTransferId,
        data: fundTransferData
      });
    } else {
      addFundTransferMutation.mutate(fundTransferData);
    }
  };

  // Transportation Update Mutation
  const updateTransportationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest(`/api/transportation-expenses/${id}`, "PATCH", data),
    onSuccess: async (updatedExpense, { id }) => {
      refreshAllData();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dailyExpenses(selectedProjectId, selectedDate) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.previousBalance(selectedProjectId) });

      if (transportDescription && transportDescription.trim().length >= 2) {
        await saveAutocompleteValue('transportDescriptions', transportDescription);
      }
      if (transportNotes && transportNotes.trim().length >= 2) {
        await saveAutocompleteValue('notes', transportNotes);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/autocomplete', 'transportDescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/autocomplete', 'notes'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });

      resetTransportationForm();
      toast({
        title: "تم التحديث",
        description: "تم تحديث مصروف المواصلات بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث المصروف",
        variant: "destructive",
      });
    }
  });

  const resetTransportationForm = () => {
    setTransportDescription("");
    setTransportAmount("");
    setTransportNotes("");
    setTransportCategory(dynamicTransportCategories.length > 0 ? dynamicTransportCategories[0].value : "");
    setSelectedWellIds([]);
    setSelectedCrewTypes([]);
    setEditingTransportationId(null);
  };

  const handleEditTransportation = (expense: TransportationExpense) => {
    setTransportDescription(expense.description);
    setTransportAmount(expense.amount);
    setTransportNotes(expense.notes || "");
    setTransportCategory(expense.category || "");
    setSelectedWellIds((expense as any).well_ids ? JSON.parse((expense as any).well_ids) : ((expense as any).well_id ? [Number((expense as any).well_id)] : []));
    setSelectedCrewTypes((expense as any).crew_type ? ((expense as any).crew_type.startsWith('[') ? JSON.parse((expense as any).crew_type) : [(expense as any).crew_type]) : []);
    setEditingTransportationId(expense.id);
  };

  const handleAddTransportation = () => {
    if (!selectedProjectId || isAllProjects) {
      toast({
        title: "يرجى تحديد مشروع",
        description: "لا يمكن إضافة مصروف مواصلات على جميع المشاريع. يرجى اختيار مشروع محدد من الشريط العلوي أولاً",
        variant: "destructive",
      });
      return;
    }

    if (!transportDescription || !transportAmount) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع البيانات المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const transportData = {
      project_id: selectedProjectId,
      description: transportDescription,
      amount: transportAmount,
      date: selectedDate || new Date().toISOString().split('T')[0],
      category: transportCategory,
      notes: transportNotes,
      well_id: selectedWellIds[0] || null,
      well_ids: selectedWellIds.length > 0 ? JSON.stringify(selectedWellIds) : null,
      crew_type: selectedCrewTypes.length > 0 ? JSON.stringify(selectedCrewTypes) : null,
      team_name: selectedTeamNames.length > 0 ? JSON.stringify(selectedTeamNames) : null,
    };

    if (editingTransportationId) {
      updateTransportationMutation.mutate({
        id: editingTransportationId,
        data: transportData
      });
    } else {
      addTransportationMutation.mutate(transportData);
    }
  };


  const handleSaveSummary = () => {
    if (!selectedProjectId) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار المشروع أولاً",
        variant: "destructive",
      });
      return;
    }

    saveDailySummaryMutation.mutate({
      project_id: selectedProjectId,
      date: selectedDate || new Date().toISOString().split('T')[0],
      carriedForwardAmount: carriedForward,
      totalFundTransfers: (totalsValue.totalFundTransfers || 0).toString(),
      totalWorkerWages: (totalsValue.totalWorkerWages || 0).toString(),
      totalMaterialCosts: (totalsValue.totalMaterialCosts || 0).toString(),
      totalTransportationCosts: (totalsValue.totalTransportation || 0).toString(),

      totalIncome: (totalsValue.totalIncome || 0).toString(),
      totalExpenses: (totalsValue.totalCashExpenses || totalsValue.totalExpenses || 0).toString(),
      remainingBalance: (totalsValue.remainingBalance || totalsValue.totalBalance || 0).toString(),
    });
  };


  // تكوين صفوف الإحصائيات الموحدة (3x3)
  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'workerWages',
          label: 'أجور العمال',
          value: formatCurrency(totalsValue.totalWorkerWages),
          icon: Users,
          color: 'blue',
        },
        {
          key: 'fundTransfers',
          label: 'تحويلات العهدة',
          value: formatCurrency(totalsValue.totalFundTransfers),
          icon: Banknote,
          color: 'green',
        },
        {
          key: 'materials',
          label: 'المواد',
          value: formatCurrency(totalsValue.totalMaterialCosts),
          icon: Package,
          color: 'purple',
        },
      ]
    },
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'transportation',
          label: 'المواصلات',
          value: formatCurrency(totalsValue.totalTransportation),
          icon: Truck,
          color: 'orange',
        },
        {
          key: 'miscExpenses',
          label: 'النثريات',
          value: formatCurrency(totalsValue.totalMiscExpenses),
          icon: Receipt,
          color: 'amber',
        },
        {
          key: 'projectTransfers',
          label: 'الترحيل',
          splitValue: {
            incoming: totalsValue.incomingProjectTransfers,
            outgoing: totalsValue.outgoingProjectTransfers
          },
          value: formatCurrency(totalsValue.incomingProjectTransfers - totalsValue.outgoingProjectTransfers),
          icon: Building2,
          color: 'teal',
          isSplitCard: true,
        },
      ]
    },
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'workerTransfers',
          label: 'الحوالات',
          value: formatCurrency(totalsValue.totalWorkerTransfers),
          icon: Send,
          color: 'indigo',
        },
        {
          key: 'totalExpenses',
          label: 'المنصرف',
          value: formatCurrency(totalsValue.totalExpenses),
          icon: TrendingDown,
          color: 'red',
        },
        {
          key: 'remainingBalance',
          label: 'المتبقي',
          value: formatCurrency(totalsValue.totalBalance),
          icon: Calculator,
          color: totalsValue.totalBalance >= 0 ? 'emerald' : 'rose',
        },
      ]
    }
  ], [totalsValue]);

  
  // فئات النثريات (يمكن جعلها من قاعدة البيانات لاحقاً)
  const miscCategories = ["قرطاسية", "ضيافة", "اتصالات", "صيانة مكتب", "أخرى"];

  // تكوين الفلاتر للوحة الإحصائيات
  const filtersConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'date',
      label: 'التاريخ',
      type: 'date',
      placeholder: 'اختر التاريخ',
    },
    {
      key: 'dateRange',
      label: 'نطاق التاريخ',
      type: 'date-range',
      placeholder: 'اختر نطاق التاريخ',
    },
    {
      key: 'type',
      label: 'نوع العملية',
      type: 'select',
      placeholder: 'جميع العمليات',
      options: [
        { value: 'all', label: 'جميع العمليات' },
        { value: 'wages', label: 'أجور عمال' },
        { value: 'transport', label: 'مواصلات' },
        { value: 'materials', label: 'مواد' },
        { value: 'misc', label: 'نثريات' },
        { value: 'fund', label: 'عهد' }
      ]
    },
    {
      key: 'transportCategory',
      label: 'فئة المواصلات',
      type: 'select',
      placeholder: 'جميع الفئات',
      options: [
        { value: 'all', label: 'جميع الفئات' },
        ...dynamicTransportCategories
      ]
    },
    {
      key: 'miscCategory',
      label: 'فئة النثريات',
      type: 'select',
      placeholder: 'جميع الفئات',
      options: [
        { value: 'all', label: 'جميع الفئات' },
        ...miscCategories.map(cat => ({ value: cat, label: cat }))
      ]
    }
  ], [dynamicTransportCategories]);

  // دوال معالجة الفلاتر
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.dailyExpenses(selectedProjectId, selectedDate) 
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // دالة تصدير البيانات المعروضة إلى Excel
  const handleExportToExcel = useCallback(async () => {
    setIsExporting(true);
    try {
      // تحويل البيانات المفلترة إلى شكل Transaction
      const transactions: any[] = [];
      
      console.log('📊 [Excel Export] بدء التصدير:', {
        fundTransfers: filteredFundTransfers.length,
        attendance: filteredAttendance.length,
        transportation: filteredTransportation.length,
        materials: filteredMaterialPurchases.length,
        workerTransfers: filteredWorkerTransfers.length,
        miscExpenses: filteredMiscExpenses.length
      });
      
      // إضافة الرصيد المتبقي السابق (دخل)
      const carriedAmount = cleanNumber(carriedForward);
      if (carriedAmount !== 0) {
        transactions.push({
          id: 'previous-balance',
          date: selectedDate || new Date().toISOString().split('T')[0],
          type: 'income',
          category: 'رصيد سابق',
          amount: Math.abs(carriedAmount),
          description: carriedAmount > 0 ? 'رصيد مرحل (موجب)' : 'عجز مرحل (سالب)',
          projectName: projects.find(p => p.id === selectedProjectId)?.name || 'غير محدد',
        });
      }

      // إضافة تحويلات العهدة (دخل)
      filteredFundTransfers.forEach((transfer: any) => {
        transactions.push({
          id: transfer.id,
          date: transfer.date || selectedDate || new Date().toISOString().split('T')[0],
          type: 'income',
          category: 'عهدة',
          amount: cleanNumber(transfer.amount),
          description: `عهدة من ${transfer.senderName || 'غير محدد'}`,
          project_id: transfer.project_id,
          projectName: projects.find(p => p.id === transfer.project_id)?.name || 'غير محدد',
          transferMethod: transfer.transferType,
          recipientName: transfer.senderName,
        });
      });

      // إضافة ترحيل الأموال بين المشاريع (واردة وصادرة)
      safeProjectTransfers.forEach((transfer: any) => {
        const isIncoming = transfer.toProjectId === selectedProjectId;
        const fromProject = projects.find(p => p.id === transfer.fromProjectId);
        const toProject = projects.find(p => p.id === transfer.toProjectId);
        
        transactions.push({
          id: transfer.id,
          date: transfer.date || selectedDate || new Date().toISOString().split('T')[0],
          type: isIncoming ? 'transfer_from_project' : 'expense',
          category: isIncoming ? 'ترحيل وارد' : 'ترحيل صادر',
          amount: cleanNumber(transfer.amount),
          description: isIncoming 
            ? `ترحيل من ${fromProject?.name || 'مشروع آخر'}`
            : `ترحيل إلى ${toProject?.name || 'مشروع آخر'}`,
          project_id: isIncoming ? transfer.fromProjectId : transfer.toProjectId,
          projectName: isIncoming ? fromProject?.name : toProject?.name,
        });
      });

      // إضافة حضور العمال (مصروف أو مؤجل)
      filteredAttendance.forEach((record: any) => {
        const worker = workers.find((w: any) => w.id === record.worker_id);
        const paidAmount = cleanNumber(record.paidAmount);
        const payableAmount = cleanNumber(record.payableAmount);
        const isDeferred = paidAmount === 0 && payableAmount > 0;
        
        transactions.push({
          id: record.id,
          date: record.date || selectedDate || new Date().toISOString().split('T')[0],
          type: isDeferred ? 'deferred' : 'expense',
          category: 'أجور عمال',
          amount: paidAmount,
          description: record.workDescription || 'أجر يومي',
          project_id: record.project_id,
          projectName: projects.find(p => p.id === record.project_id)?.name || 'غير محدد',
          workerName: worker?.name || 'غير محدد',
          workDays: cleanNumber(record.workDays) || undefined,
          dailyWage: cleanNumber(record.dailyWage) || undefined,
          payableAmount: payableAmount || undefined,
        });
      });

      // إضافة مصاريف المواصلات (مصروف)
      filteredTransportation.forEach((expense: any) => {
        transactions.push({
          id: expense.id,
          date: expense.date || selectedDate || new Date().toISOString().split('T')[0],
          type: 'expense',
          category: 'مواصلات',
          amount: cleanNumber(expense.amount),
          description: expense.description || 'مصروف مواصلات',
          project_id: expense.project_id,
          projectName: projects.find(p => p.id === expense.project_id)?.name || 'غير محدد',
        });
      });

      // إضافة مشتريات المواد (نقد / آجل / مخزن)
      filteredMaterialPurchases.forEach((purchase: any) => {
        const material = materials.find((m: any) => m.id === purchase.material_id);
        const pType = purchase.purchaseType || 'نقد';
        const isCash = pType === 'نقد';
        const isStorage = pType === 'مخزن' || pType === 'توريد' || pType === 'مخزني';
        
        let transactionType: string = 'deferred';
        let transactionAmount = 0;
        if (isCash) {
          transactionType = 'expense';
          transactionAmount = cleanNumber(purchase.paidAmount) > 0 ? cleanNumber(purchase.paidAmount) : cleanNumber(purchase.totalAmount);
        } else if (isStorage) {
          transactionType = 'storage';
          transactionAmount = cleanNumber(purchase.totalAmount);
        }
        
        transactions.push({
          id: purchase.id,
          date: purchase.date || selectedDate || new Date().toISOString().split('T')[0],
          type: transactionType,
          category: isStorage ? 'توريد مخزن' : 'مشتريات مواد',
          amount: transactionAmount,
          description: `شراء ${material?.name || 'مادة'}`,
          project_id: purchase.project_id,
          projectName: projects.find(p => p.id === purchase.project_id)?.name || 'غير محدد',
          materialName: material?.name || purchase.materialName,
          quantity: cleanNumber(purchase.quantity) || undefined,
          unitPrice: cleanNumber(purchase.unitPrice) || undefined,
          paymentType: purchase.purchaseType,
          supplierName: purchase.supplier || purchase.supplierName,
        });
      });

      // إضافة تحويلات العمال (مصروف)
      filteredWorkerTransfers.forEach((transfer: any) => {
        const worker = workers.find((w: any) => w.id === transfer.worker_id);
        transactions.push({
          id: transfer.id,
          date: transfer.date || selectedDate || new Date().toISOString().split('T')[0],
          type: 'expense',
          category: 'حوالات عمال',
          amount: cleanNumber(transfer.amount),
          description: transfer.notes || 'حوالة للعامل',
          project_id: transfer.project_id,
          projectName: projects.find(p => p.id === transfer.project_id)?.name || 'غير محدد',
          workerName: worker?.name || 'غير محدد',
          recipientName: worker?.name,
        });
      });

      // إضافة المصاريف المتنوعة (مصروف)
      filteredMiscExpenses.forEach((expense: any) => {
        transactions.push({
          id: expense.id,
          date: expense.date || selectedDate || new Date().toISOString().split('T')[0],
          type: 'expense',
          category: 'نثريات',
          amount: cleanNumber(expense.amount),
          description: expense.description || 'مصروف متنوع',
          project_id: expense.project_id,
          projectName: projects.find(p => p.id === expense.project_id)?.name || 'غير محدد',
        });
      });

      const exportTotals = {
        totalIncome: totalsValue.totalIncome || 0,
        totalExpenses: totalsValue.totalCashExpenses || totalsValue.totalExpenses || 0,
        balance: totalsValue.remainingBalance || totalsValue.totalBalance || 0
      };

      // الحصول على اسم المشروع
      const currentProjectName = isAllProjects 
        ? 'جميع المشاريع' 
        : projects.find(p => p.id === selectedProjectId)?.name || 'المشروع';

      // تصدير إلى Excel
      const downloadResult = await exportTransactionsToExcel(
        transactions,
        exportTotals,
        formatCurrency,
        `${currentProjectName}${selectedDate ? ` - ${selectedDate}` : ''}`
      );

      if (downloadResult) {
        toast({
          title: "تم التصدير بنجاح",
          description: `تم تصدير ${transactions.length} عملية إلى ملف Excel`,
        });
      } else {
        toast({ title: "تعذر التنزيل", description: "تم تجهيز الملف لكن فشل التنزيل. حاول مرة أخرى.", variant: "destructive" });
      }
    } catch (error) {
      console.error('خطأ في التصدير:', error);
      toast({
        title: "فشل التصدير",
        description: "حدث خطأ أثناء تصدير البيانات",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [
    filteredFundTransfers,
    filteredAttendance,
    filteredTransportation,
    filteredMaterialPurchases,
    filteredWorkerTransfers,
    filteredMiscExpenses,
    safeProjectTransfers,
    workers,
    materials,
    projects,
    selectedProjectId,
    selectedDate,
    isAllProjects,
    toast
  ]);

  // تكوين أزرار الإجراءات
  const actionsConfig: ActionButton[] = useMemo(() => [
    {
      key: 'export',
      icon: FileSpreadsheet,
      label: 'تصدير Excel',
      onClick: handleExportToExcel,
      variant: 'outline',
      loading: isExporting,
      tooltip: 'تصدير البيانات المعروضة إلى ملف Excel',
    }
  ], [isExporting, handleExportToExcel]);

  // حساب مؤشرات البيانات المتوفرة مع معالجة آمنة
  const dataIndicators = {
    fundTransfers: Array.isArray(todayFundTransfers) && todayFundTransfers.length > 0,
    attendance: Array.isArray(todayWorkerAttendance) && todayWorkerAttendance.length > 0,
    transportation: Array.isArray(todayTransportation) && todayTransportation.length > 0,
    materials: Array.isArray(todayMaterialPurchases) && todayMaterialPurchases.length > 0,
    workerTransfers: Array.isArray(todayWorkerTransfers) && todayWorkerTransfers.length > 0,
    miscExpenses: Array.isArray(todayMiscExpenses) && todayMiscExpenses.length > 0
  };

  const totalDataSections = Object.keys(dataIndicators).length;
  const sectionsWithData = Object.values(dataIndicators).filter(Boolean).length;

  return (
    <div className="p-4 slide-in space-y-4">

      {/* لوحة الإحصائيات والفلترة الموحدة */}
      <UnifiedFilterDashboard
        hideHeader={true}
        title=""
        statsRows={statsRowsConfig}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="ابحث في المصروفات..."
        showSearch={true}
        filters={filtersConfig}
        filterValues={{ 
          date: selectedDate ? (() => {
            const [year, month, day] = selectedDate.split('-').map(Number);
            return new Date(year, month - 1, day, 12, 0, 0, 0);
          })() : undefined,
          dateRange: filterValues.dateRange,
          type: filterValues.type,
          transportCategory: filterValues.transportCategory,
          miscCategory: filterValues.miscCategory
        }}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        actions={actionsConfig}
      />

      {/* شريط تنقل التاريخ - يظهر فقط في حالة المشروع المحدد وتاريخ واحد */}
      {!isAllProjects && !filterValues.dateRange?.from && selectedDate && (
        <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mx-auto w-full max-w-md">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={prevDate}
            title="اليوم السابق"
          >
            <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </Button>
          
          <div className="flex flex-col items-center flex-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">سجل مصروفات</span>
            <span className="text-sm font-black text-slate-900 dark:text-white arabic-numbers flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              {format(new Date(selectedDate), "EEEE, d MMMM yyyy", { locale: ar })}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={nextDate}
            title="اليوم التالي"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </Button>
        </div>
      )}


      {/* بطاقات ملخص المصروفات - عرض بطاقة لكل تاريخ (سواء اختيار جميع المشاريع أو مشروع محدد) */}
      {dailyExpensesData?.groupedByProjectDate && dailyExpensesData.groupedByProjectDate.length > 0 ? (
        <div className="space-y-4">
          {dailyExpensesData.groupedByProjectDate.map((cardData: any, index: number) => (
            <UnifiedCard
              key={`${cardData.project_id}-${cardData.date}-${index}`}
              title={cardData.projectName}
              subtitle={`مصروفات يوم ${formatDate(cardData.date)}`}
              titleIcon={Building}
              headerColor="#3b82f6"
              badges={[
                { label: formatDate(cardData.date), variant: "default" },
                { 
                  label: cardData.remainingBalance >= 0 ? "رصيد موجب" : "عجز", 
                  variant: cardData.remainingBalance >= 0 ? "success" : "destructive" 
                }
              ]}
              fields={[
                { 
                  label: "إجمالي الدخل", 
                  value: formatCurrency(cardData.totalIncome || 0), 
                  icon: TrendingUp, 
                  color: "success",
                  emphasis: true
                },
                { 
                  label: "إجمالي المصروفات", 
                  value: formatCurrency(cardData.totalExpenses || 0), 
                  icon: TrendingDown, 
                  color: "danger",
                  emphasis: true
                },
                { 
                  label: "أجور العمال", 
                  value: formatCurrency(cardData.totalWorkerWages || 0), 
                  icon: Users, 
                  color: "info"
                },
                { 
                  label: "المواصلات", 
                  value: formatCurrency(cardData.totalTransportation || 0), 
                  icon: Truck, 
                  color: "warning"
                },
                { 
                  label: "المواد", 
                  value: formatCurrency(cardData.totalMaterialCosts || 0), 
                  icon: Package, 
                  color: "info"
                },
                { 
                  label: "النثريات", 
                  value: formatCurrency(cardData.totalMiscExpenses || 0), 
                  icon: Receipt, 
                  color: "muted"
                },
                { 
                  label: "حوالات العمال", 
                  value: formatCurrency(cardData.totalWorkerTransfers || 0), 
                  icon: Send, 
                  color: "warning"
                },
                { 
                  label: "المتبقي", 
                  value: formatCurrency(cardData.remainingBalance || 0), 
                  icon: Calculator, 
                  color: (cardData.remainingBalance || 0) >= 0 ? "success" : "danger",
                  emphasis: true
                },
              ]}
            />
          ))}
        </div>
      ) : selectedProjectId && selectedDate && (
        <UnifiedCard
          title={projects?.find(p => p.id === selectedProjectId)?.name || "المشروع"}
          subtitle={`مصروفات يوم ${formatDate(selectedDate)}`}
          titleIcon={Building}
          headerColor="#3b82f6"
          badges={[
            { label: formatDate(selectedDate), variant: "default" },
            { 
              label: totals.remainingBalance >= 0 ? "رصيد موجب" : "عجز", 
              variant: totals.remainingBalance >= 0 ? "success" : "destructive" 
            }
          ]}
          fields={[
            { 
              label: "إجمالي الدخل", 
              value: formatCurrency(totals.totalIncome), 
              icon: TrendingUp, 
              color: "success",
              emphasis: true
            },
            { 
              label: "إجمالي المصروفات", 
              value: formatCurrency(totals.totalExpenses), 
              icon: TrendingDown, 
              color: "danger",
              emphasis: true
            },
            { 
              label: "أجور العمال", 
              value: formatCurrency(totals.totalWorkerWages), 
              icon: Users, 
              color: "info"
            },
            { 
              label: "المواصلات", 
              value: formatCurrency(totals.totalTransportation), 
              icon: Truck, 
              color: "warning"
            },
            { 
              label: "المواد", 
              value: formatCurrency(totals.totalMaterialCosts), 
              icon: Package, 
              color: "info"
            },
            { 
              label: "النثريات", 
              value: formatCurrency(totals.totalMiscExpenses), 
              icon: Receipt, 
              color: "muted"
            },
            { 
              label: "حوالات العمال", 
              value: formatCurrency(totals.totalWorkerTransfers), 
              icon: Send, 
              color: "warning"
            },
            { 
              label: "المتبقي", 
              value: formatCurrency(totals.remainingBalance), 
              icon: Calculator, 
              color: totals.remainingBalance >= 0 ? "success" : "danger",
              emphasis: true
            },
          ]}
        />
      )}

      {/* نموذج الإضافة القابل للطي - مع الطي الذكية */}
      <Collapsible open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
        <Card className="mb-4">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                <span className="font-medium text-foreground">إضافة مصروفات جديدة</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {isAddFormOpen ? "اضغط للإخفاء" : "اضغط للعرض"}
                </span>
                {isAddFormOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <DatePickerField
                    label="التاريخ"
                    value={selectedDate || ""}
                    onChange={(date: Date | undefined) => setSelectedDate(date ? format(date, "yyyy-MM-dd") : undefined)}
                  />
                </div>
                  <div className="flex-1">
                    <Label className="block text-sm font-medium text-foreground">المبلغ المتبقي السابق</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={carriedForward}
                      onChange={(e) => setCarriedForward(e.target.value)}
                      placeholder="0"
                      className="text-center arabic-numbers min-h-11"
                      autoWidth
                      maxWidth={200}
                    />
                  </div>
              </div>

              {/* Fund Transfer Section - الطي الذكية */}
              <div className="border-t pt-3">
                <Collapsible open={isFundTransfersExpanded} onOpenChange={setIsFundTransfersExpanded}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-1 rounded-sm">
                      <h4 className="font-medium text-foreground">تحويل عهدة جديدة</h4>
                      <div className="flex items-center gap-1">
                        {safeFundTransfers.length > 0 && <Badge variant="outline" className="h-5 text-[10px]">{safeFundTransfers.length}</Badge>}
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    {dailyExpensesError && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700 text-sm">
                          خطأ في جلب البيانات: {dailyExpensesError.message}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="flex flex-col">
                            <Label className="block text-sm font-medium text-foreground mb-1">المبلغ *</Label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              value={fundAmount}
                              onChange={(e) => setFundAmount(e.target.value)}
                              placeholder="المبلغ *"
                              className="text-center arabic-numbers"
                              min="0"
                              step="1"
                            />
                          </div>
                      <div>
                        <Label className="block text-sm font-medium text-foreground mb-1">اسم المرسل</Label>
                        <AutocompleteInput
                          value={senderName}
                          onChange={setSenderName}
                          category="senderNames"
                          placeholder="اسم المرسل"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <Label className="block text-sm font-medium text-foreground mb-1">رقم الحولة</Label>
                        <AutocompleteInput
                          type="number"
                          inputMode="numeric"
                          value={transferNumber}
                          onChange={setTransferNumber}
                          category="transferNumbers"
                          placeholder="رقم الحولة"
                          className="w-full arabic-numbers"
                        />
                      </div>
                      <div>
                        <Label className="block text-sm font-medium text-foreground mb-1">نوع التحويل *</Label>
                        <AutocompleteInput
                          value={transferType}
                          onChange={setTransferType}
                          category="transferTypes"
                          placeholder="نوع التحويل *"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleAddFundTransfer} 
                        size="sm" 
                        className="flex-1 bg-primary"
                        disabled={addFundTransferMutation.isPending || updateFundTransferMutation.isPending}
                        data-testid="button-add-fund-transfer"
                      >
                        {addFundTransferMutation.isPending || updateFundTransferMutation.isPending ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : editingFundTransferId ? (
                          <><Save className="h-4 w-4 ml-2" /> حفظ التعديل</>
                        ) : (
                          <><Plus className="h-4 w-4 ml-2" /> إضافة العهدة</>
                        )}
                      </Button>
                      {editingFundTransferId && (
                        <Button onClick={resetFundTransferForm} size="sm" variant="outline">
                          إلغاء
                        </Button>
                      )}
                    </div>

                    {/* عرض العهد المضافة لهذا اليوم */}
                    <div className="mt-3 pt-3 border-t">
                      <h5 className="text-sm font-medium text-muted-foreground">العهد المضافة اليوم:</h5>

                      {dailyExpensesLoading ? (
                        <div className="text-center text-muted-foreground">جاري التحميل...</div>
                      ) : safeFundTransfers.length > 0 ? (
                        <div className="space-y-2">
                          {safeFundTransfers.map((transfer: any, index) => (
                            <div key={transfer.id || index} className="p-3 bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900/20 rounded-lg shadow-sm hover:shadow-md transition-all">
                              <div className="flex justify-between items-start gap-3">
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-foreground text-sm">{transfer.senderName || 'غير محدد'}</h4>
                                    <Badge variant="secondary" className="text-[10px] px-1.5 h-4 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-none">
                                      {transfer.transferType}
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                                    {transfer.transferNumber && (
                                      <div className="flex items-center gap-1">
                                        <span className="opacity-70">رقم الحولة:</span>
                                        <span className="font-medium text-foreground">{transfer.transferNumber}</span>
                                      </div>
                                    )}
                                    {isAllProjects && transfer.projectName && (
                                      <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                        <span>📁</span>
                                        <span className="font-medium">{transfer.projectName}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <span className="font-bold text-primary arabic-numbers text-sm">{formatCurrency(transfer.amount)}</span>
                                  <div className="flex gap-1">
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                      onClick={() => handleEditFundTransfer(transfer)}
                                      data-testid="button-edit-fund-transfer"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                      onClick={() => deleteFundTransferMutation.mutate(transfer.id)}
                                      disabled={deleteFundTransferMutation.isPending}
                                      data-testid="button-delete-fund-transfer"
                                    >
                                      {deleteFundTransferMutation.isPending ? (
                                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                                      ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              {transfer.notes && (
                                <p className="text-[10px] text-muted-foreground mt-1 pt-1 border-t border-dashed border-gray-200 dark:border-gray-700" data-testid="text-fund-transfer-notes">
                                  {transfer.notes.includes('مستورد من محادثة الواتساب') ? '📱 ' : 'الملاحظات: '}{transfer.notes}
                                </p>
                              )}
                            </div>
                          ))}
                          <div className="text-left pt-2 border-t mt-2">
                            <span className="text-sm font-medium text-muted-foreground">إجمالي العهد: </span>
                            <span className="font-bold text-primary arabic-numbers text-base">
                              {formatCurrency(totals.totalFundTransfers)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                          <DollarSign className="mx-auto h-8 w-8 text-gray-400" />
                          <p className="text-sm text-gray-600">
                            لا توجد تحويلات عهد للتاريخ {selectedDate}
                          </p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

      {/* Transportation Input Section + Display */}
      <div className="border-t pt-3 mt-3">
        <Collapsible open={isTransportationExpanded} onOpenChange={setIsTransportationExpanded}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-1 rounded-sm">
              <h4 className="font-medium text-foreground flex items-center">
                <Car className="text-secondary ml-2 h-5 w-5" />
                إضافة مواصلات جديدة
              </h4>
              <div className="flex items-center gap-1">
                {safeTransportation.length > 0 && <Badge variant="outline" className="h-5 text-[10px]">{safeTransportation.length}</Badge>}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <Label className="block text-sm font-medium text-foreground mb-1">الوصف *</Label>
                  <AutocompleteInput
                    value={transportDescription}
                    onChange={setTransportDescription}
                    category="transportDescriptions"
                    placeholder="الوصف"
                  />
                </div>
                <div className="flex flex-col">
                  <Label className="block text-sm font-medium text-foreground mb-1">الفئة *</Label>
                  <Select value={transportCategory} onValueChange={setTransportCategory}>
                    <SelectTrigger className="arabic-numbers">
                      <SelectValue placeholder="اختر الفئة" />
                    </SelectTrigger>
                    <SelectContent>
                      {dynamicTransportCategories.length > 0 ? (
                        dynamicTransportCategories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="other">أخرى</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <Label className="block text-sm font-medium text-foreground mb-1">المبلغ *</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={transportAmount}
                    onChange={(e) => setTransportAmount(e.target.value)}
                    placeholder="المبلغ"
                    className="text-center arabic-numbers"
                  />
                </div>
                <div className="flex flex-col">
                  <Label className="block text-sm font-medium text-foreground mb-1">الملاحظات</Label>
                  <AutocompleteInput
                    value={transportNotes}
                    onChange={setTransportNotes}
                    category="notes"
                    placeholder="ملاحظات"
                    className="flex-1"
                  />
                </div>
              </div>
              {isWellsProject && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <MultiWellSelector
                    project_id={selectedProjectId}
                    value={selectedWellIds}
                    onChange={setSelectedWellIds}
                    optional={true}
                  />
                  <TeamSelector
                    project_id={selectedProjectId}
                    value={selectedTeamNames}
                    onChange={setSelectedTeamNames}
                  />
                  <CrewTypeSelector
                    value={selectedCrewTypes}
                    onChange={setSelectedCrewTypes}
                  />
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Button 
                  onClick={handleAddTransportation} 
                  size="sm" 
                  className="w-full bg-secondary"
                  disabled={addTransportationMutation.isPending || updateTransportationMutation.isPending}
                  data-testid="button-add-transportation"
                >
                  {addTransportationMutation.isPending || updateTransportationMutation.isPending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border border-white border-t-transparent" />
                  ) : (
                    editingTransportationId ? <><Save className="h-4 w-4 ml-2" /> حفظ التعديل</> : <><Plus className="h-4 w-4 ml-2" /> إضافة المواصلات</>
                  )}
                </Button>
                {editingTransportationId && (
                  <Button onClick={resetTransportationForm} size="sm" variant="outline">
                    إلغاء
                  </Button>
                )}
              </div>
            </div>
            
            {/* Transportation Display - يظهر فقط عند وجود بيانات */}
            {safeTransportation.length > 0 && (
              <div className="mt-3 space-y-2">
                {safeTransportation.map((expense: any, index) => (
                  <div key={index} className="p-3 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900/30 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-foreground text-sm">{expense.description}</h4>
                                    <span className="font-bold text-orange-600 dark:text-orange-400 arabic-numbers text-base">{formatCurrency(expense.amount)}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline" className="text-[10px] bg-orange-100/50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                            {dynamicTransportCategories.find(opt => opt.value === expense.category)?.label || expense.category || "أخرى"}
                          </Badge>
                          {expense.notes && expense.notes.startsWith('📱 واتساب') ? (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-900/50">
                              <span className="text-[10px] text-green-700 dark:text-green-400 font-medium whitespace-nowrap">📱 واتساب</span>
                              <span className="text-[10px] text-green-600 dark:text-green-500">{expense.notes.replace('📱 واتساب | ', '')}</span>
                            </div>
                          ) : expense.notes ? (
                            <p className="text-xs text-muted-foreground">الملاحظات: {expense.notes}</p>
                          ) : null}
                        </div>
                        <WellCrewBadges wellIds={expense.well_ids} wellId={expense.well_id} crewType={expense.crew_type} teamName={(expense as any).team_name} projectWells={projectWells} isWellsProject={isWellsProject} />
                        {isAllProjects && expense.projectName && (
                          <div className="text-xs font-medium text-blue-600 dark:text-blue-400">📁 {expense.projectName}</div>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                          onClick={() => handleEditTransportation(expense)}
                          data-testid="button-edit-transportation"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => deleteTransportationMutation.mutate(expense.id)}
                          disabled={deleteTransportationMutation.isPending}
                          data-testid="button-delete-transportation"
                        >
                          {deleteTransportationMutation.isPending ? (
                            <div className="h-4 w-4 animate-spin rounded-full border border-red-600 border-t-transparent" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="text-left mt-3 pt-3 border-t bg-orange-100 dark:bg-orange-900/40 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                  <span className="text-sm font-bold text-orange-900 dark:text-orange-100">إجمالي المواصلات: </span>
                  <span className="font-bold text-orange-600 dark:text-orange-400 arabic-numbers text-lg">
                    {formatCurrency(totals.totalTransportation)}
                  </span>
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* إضافة أجور العمال - حقول الإدخال السريعة */}
      <div className="border-t pt-3 mt-3">
        <Collapsible open={isAttendanceExpanded} onOpenChange={setIsAttendanceExpanded}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-1 rounded-sm">
              <h4 className="font-medium text-foreground flex items-center">
                <Users className="text-primary ml-2 h-5 w-5" />
                {editingAttendanceId ? "تعديل أجور العامل" : "إضافة أجور عامل جديد"}
              </h4>
              <div className="flex items-center gap-1">
                {safeAttendance.length > 0 && <Badge variant="outline" className="h-5 text-[10px]">{safeAttendance.length}</Badge>}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            {editingAttendanceId && (
              <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-lg flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">وضع التعديل — قم بتعديل البيانات ثم اضغط "حفظ التعديلات"</span>
              </div>
            )}
            <div className="grid grid-cols-12 gap-2 mb-3 items-end">
              <div className="col-span-6">
                <Label className="text-[10px] font-bold text-foreground mb-1 block">العامل *</Label>
                <Select 
                  value={selectedWorkerId || "none"} 
                  onValueChange={(val: string) => setSelectedWorkerId(val === "none" ? "" : val)}
                  disabled={!!editingAttendanceId}
                >
                  <SelectTrigger className={`h-9 text-xs ${editingAttendanceId ? 'opacity-70 cursor-not-allowed' : ''}`} data-testid="select-worker">
                    <SelectValue placeholder="اختر العامل" />
                  </SelectTrigger>
                  <SelectContent className="p-0 overflow-hidden">
                    <div className="p-2 border-b sticky top-0 bg-popover z-50">
                      <Input
                        placeholder="بحث عن عامل..."
                        className="h-8 w-full text-xs"
                        onChange={(e) => setSearchValue(e.target.value)}
                        value={searchValue}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === ' ') {
                            e.stopPropagation();
                          }
                        }}
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto p-1">
                      <SelectItem value="none" className="text-xs">اختر العامل</SelectItem>
                      {availableWorkers && availableWorkers.length > 0 ? (
                        availableWorkers
                          .filter(w => !searchValue || (w.name && w.name.toLowerCase().includes(searchValue.toLowerCase())))
                          .map((worker) => (
                            <SelectItem key={`worker-select-${worker.id}`} value={worker.id?.toString() || "none"} className="text-xs">
                              {worker.name}
                            </SelectItem>
                          ))
                      ) : (
                        <SelectItem value="none" disabled className="text-xs">
                          لا يوجد عمال متاحين (الكل مسجل)
                        </SelectItem>
                      )}
                    </div>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-3">
                <Label className="text-[10px] font-bold text-foreground mb-1 block">الأيام *</Label>
                <Input
                  type="number"
                  value={workerDays}
                  onChange={(e) => setWorkerDays(e.target.value)}
                  placeholder="0"
                  className="text-center h-9 text-xs"
                  min="0"
                  step="0.5"
                  data-testid="input-worker-days"
                />
              </div>

              <div className="col-span-3">
                <Label className="text-[10px] font-bold text-foreground mb-1 block">المبلغ *</Label>
                <Input
                  type="number"
                  value={workerAmount}
                  onChange={(e) => setWorkerAmount(e.target.value)}
                  placeholder="0"
                  className="text-center arabic-numbers h-9 text-xs"
                  min="0"
                  step="1"
                  data-testid="input-worker-amount"
                />
              </div>
            </div>

            <div className="mb-3">
              <Label className="text-xs font-bold text-foreground mb-1">الملاحظات</Label>
              <Input
                type="text"
                value={workerNotes}
                onChange={(e) => setWorkerNotes(e.target.value)}
                placeholder="ملاحظات إضافية"
                className="h-9"
                data-testid="input-worker-notes"
              />
            </div>

            {isWellsProject && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                <MultiWellSelector
                  project_id={selectedProjectId}
                  value={selectedWellIds}
                  onChange={setSelectedWellIds}
                  optional={true}
                />
                <TeamSelector
                  project_id={selectedProjectId}
                  value={selectedTeamNames}
                  onChange={setSelectedTeamNames}
                />
                <CrewTypeSelector
                  value={selectedCrewTypes}
                  onChange={setSelectedCrewTypes}
                />
              </div>
            )}

            <div className="flex gap-2">
              {editingAttendanceId ? (
                <>
                  <Button 
                    onClick={() => {
                      const worker = workers.find(w => w.id === selectedWorkerId);
                      if (!worker) return;
                      const dailyWageNum = parseFloat(String(worker.dailyWage || "0"));
                      const workDaysNum = parseFloat(workerDays || "0");
                      const actualWage = dailyWageNum * workDaysNum;
                      updateWorkerAttendanceMutation.mutate({
                        id: editingAttendanceId,
                        workDays: workerDays,
                        paidAmount: workerAmount,
                        notes: workerNotes,
                        dailyWage: dailyWageNum.toString(),
                        actualWage: actualWage.toString(),
                        totalPay: actualWage.toString(),
                        remainingAmount: (actualWage - parseFloat(workerAmount || "0")).toString(),
                        well_id: selectedWellIds[0] || null,
                        well_ids: selectedWellIds.length > 0 ? JSON.stringify(selectedWellIds) : null,
                        crew_type: selectedCrewTypes.length > 0 ? JSON.stringify(selectedCrewTypes) : null,
                        team_name: selectedTeamNames.length > 0 ? JSON.stringify(selectedTeamNames) : null,
                      });
                    }}
                    className="bg-primary h-9 flex-1"
                    disabled={updateWorkerAttendanceMutation.isPending}
                    data-testid="button-save-edit-worker-attendance"
                  >
                    {updateWorkerAttendanceMutation.isPending ? (
                      <div className="h-4 w-4 animate-spin rounded-full border border-white border-t-transparent" />
                    ) : (
                      <>
                        <Save className="h-4 w-4 ml-1" />
                        حفظ التعديلات
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingAttendanceId(null);
                      setSelectedWorkerId("");
                      setWorkerDays("");
                      setWorkerAmount("");
                      setWorkerNotes("");
                      setSelectedWellIds([]);
                      setSelectedCrewTypes([]);
                    }}
                    variant="outline"
                    className="h-9"
                    data-testid="button-cancel-edit-worker-attendance"
                  >
                    إلغاء
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={handleQuickAddAttendance}
                  className="bg-primary h-9 flex-1"
                  disabled={addWorkerAttendanceMutation.isPending}
                  data-testid="button-add-worker-attendance"
                >
                  {addWorkerAttendanceMutation.isPending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border border-white border-t-transparent" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4 ml-1" />
                      إضافة الحضور السريع
                    </>
                  )}
                </Button>
              )}
            </div>


            {/* أجور العمال - عرض البطاقات */}
            {safeAttendance.length > 0 && (
              <div className="mt-3">
                <h5 className="text-sm font-medium text-muted-foreground mb-2">أجور العمال المضافة اليوم:</h5>
                <div className="space-y-2">
                  {safeAttendance.map((attendance: any, index) => {
                    const worker = workers.find(w => w.id === attendance.worker_id);
                    const payableAmount = cleanNumber(attendance.payableAmount);
                    const paidAmount = cleanNumber(attendance.paidAmount);
                    const deferredAmount = payableAmount - paidAmount;
                    return (
                      <div key={index} className="p-3 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900/30 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-foreground text-sm">{attendance.workerName || worker?.name || `عامل ${index + 1}`}</h4>
                                {worker?.type && (
                                  <Badge 
                                    variant="outline" 
                                    className={`text-[10px] px-1.5 h-4 flex items-center border-none ${
                                      worker.type.includes("معلم") ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                      worker.type.includes("حداد") ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                                      worker.type.includes("بلاط") ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                      worker.type.includes("دهان") ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                                      worker.type.includes("عامل") ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                      worker.type.includes("نجار") ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                      worker.type.includes("كهربائي") ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                      worker.type.includes("سباك") ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" :
                                      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                                    }`}
                                  >
                                    {worker.type}
                                  </Badge>
                                )}
                              </div>
                              <span className="font-bold text-primary arabic-numbers text-base">{formatCurrency(paidAmount)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="text-muted-foreground">
                                <span>الأيام: </span>
                                <span className="font-medium text-foreground">{fmtNum(cleanNumber(attendance.workDays) || 0)}</span>
                              </div>
                              <div className="text-muted-foreground">
                                <span>الأجر اليومي: </span>
                                <span className="font-medium text-foreground">{formatCurrency(cleanNumber(attendance.dailyWage || worker?.dailyWage))}</span>
                              </div>
                            </div>
                            <WellCrewBadges wellIds={attendance.well_ids} wellId={attendance.well_id} crewType={attendance.crew_type} teamName={(attendance as any).team_name} projectWells={projectWells} isWellsProject={isWellsProject} />
                            {deferredAmount > 0 && (
                              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">مؤجل: {formatCurrency(deferredAmount)}</p>
                            )}
                            {attendance.workDescription && (
                              <p className="text-xs text-muted-foreground">ملاحظات: {attendance.workDescription}</p>
                            )}
                            <div className="flex flex-col gap-1">
                              {attendance.notes && attendance.notes.startsWith('📱 واتساب') ? (
                                <div className="flex items-center gap-1.5 mt-1 px-2 py-1 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-900/50">
                                  <span className="text-[10px] text-green-700 dark:text-green-400 font-medium whitespace-nowrap">📱 واتساب</span>
                                  <span className="text-[10px] text-green-600 dark:text-green-500">{attendance.notes.replace('📱 واتساب | ', '')}</span>
                                </div>
                              ) : attendance.notes ? (
                                <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 p-2 rounded-md border border-amber-200 dark:border-amber-900/50 mt-1">
                                  <span className="font-bold text-amber-700 dark:text-amber-400">الملاحظات: </span>
                                  {attendance.notes}
                                </p>
                              ) : null}
                            </div>
                            {isAllProjects && attendance.projectName && (
                              <div className="text-xs font-medium text-blue-600 dark:text-blue-400">📁 {attendance.projectName}</div>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              onClick={() => {
                                setEditingAttendanceId(attendance.id);
                                setSelectedWorkerId(attendance.worker_id || "");
                                setWorkerDays(cleanNumber(attendance.workDays).toString());
                                setWorkerAmount(cleanNumber(attendance.paidAmount).toString());
                                setWorkerNotes(attendance.notes || "");
                                try {
                                  const wellIds = attendance.well_ids ? JSON.parse(attendance.well_ids) : (attendance.well_id ? [attendance.well_id] : []);
                                  setSelectedWellIds(wellIds);
                                } catch { setSelectedWellIds([]); }
                                try {
                                  const crewTypes = attendance.crew_type ? JSON.parse(attendance.crew_type) : [];
                                  setSelectedCrewTypes(crewTypes);
                                } catch { setSelectedCrewTypes([]); }
                                setIsAttendanceExpanded(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                              onClick={() => deleteWorkerAttendanceMutation.mutate(attendance.id)}
                              disabled={deleteWorkerAttendanceMutation.isPending}
                              data-testid="button-delete-worker-attendance"
                            >
                              {deleteWorkerAttendanceMutation.isPending ? (
                                <div className="h-4 w-4 animate-spin rounded-full border border-red-600 border-t-transparent" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="text-left mt-3 pt-3 border-t bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                    <span className="text-sm font-medium text-foreground">إجمالي أجور العمال: </span>
                    <span className="font-bold text-primary arabic-numbers">
                      {formatCurrency(totals.totalWorkerWages)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

              {/* شراء مواد - القسم المطوي */}
              <div className="border-t pt-3 mt-3">
                <Collapsible open={isMaterialsExpanded} onOpenChange={setIsMaterialsExpanded}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-1 rounded-sm">
                      <h4 className="font-medium text-foreground flex items-center">
                        <Package className="text-green-600 ml-2 h-5 w-5" />
                        المشتريات المضافة اليوم
                      </h4>
                      <div className="flex items-center gap-1">
                        {safeMaterialPurchases.length > 0 && <Badge variant="outline" className="h-5 text-[10px]">{safeMaterialPurchases.length}</Badge>}
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="space-y-3 mb-3 p-3 bg-muted/20 rounded-lg border border-dashed border-green-300">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">اسم المادة *</Label>
                          <AutocompleteInput
                            value={purchaseMaterialName}
                            onChange={setPurchaseMaterialName}
                            category="materialNames"
                            placeholder="اسم المادة"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">المورد</Label>
                          <SearchableSelect
                            value={purchaseSupplierName}
                            onValueChange={setPurchaseSupplierName}
                            options={activeSuppliers.map((supplier: any) => ({
                              value: supplier.name,
                              label: supplier.name,
                              description: supplier.contactPerson || undefined
                            }))}
                            placeholder="اختر المورد..."
                            searchPlaceholder="ابحث عن مورد..."
                            emptyText="لا توجد موردين مسجلين"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">الكمية *</Label>
                          <Input
                            data-testid="input-purchase-quantity"
                            type="number"
                            value={purchaseQuantity}
                            onChange={(e) => {
                              setPurchaseQuantity(e.target.value);
                              const qty = parseFloat(e.target.value) || 0;
                              const price = parseFloat(purchaseUnitPrice) || 0;
                              setPurchaseTotalAmount(Math.round(qty * price).toString());
                            }}
                            placeholder="الكمية"
                            min="0"
                            step="0.001"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">الوحدة</Label>
                          <AutocompleteInput
                            value={purchaseUnit}
                            onChange={setPurchaseUnit}
                            category="materialUnits"
                            placeholder="طن، كيس..."
                          />
                        </div>
                        <div>
                          <Label className="text-xs">سعر الوحدة {purchaseType !== 'مخزن' ? '*' : ''}</Label>
                          <Input
                            data-testid="input-purchase-unit-price"
                            type="number"
                            value={purchaseUnitPrice}
                            onChange={(e) => {
                              setPurchaseUnitPrice(e.target.value);
                              const qty = parseFloat(purchaseQuantity) || 0;
                              const price = parseFloat(e.target.value) || 0;
                              setPurchaseTotalAmount(Math.round(qty * price).toString());
                            }}
                            placeholder="سعر الوحدة"
                            min="0"
                            step="1"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">الإجمالي</Label>
                          <Input
                            data-testid="input-purchase-total-amount"
                            type="number"
                            value={purchaseTotalAmount}
                            onChange={(e) => setPurchaseTotalAmount(e.target.value)}
                            placeholder="المبلغ الإجمالي"
                            min="0"
                            step="1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">نوع الشراء *</Label>
                          <Select value={purchaseType} onValueChange={setPurchaseType}>
                            <SelectTrigger data-testid="select-purchase-type">
                              <SelectValue placeholder="نوع الشراء" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="نقد">نقد</SelectItem>
                              <SelectItem value="آجل">آجل</SelectItem>
                              <SelectItem value="مخزن">مخزن</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">ملاحظات</Label>
                        <Input
                          data-testid="input-purchase-notes"
                          value={purchaseNotes}
                          onChange={(e) => setPurchaseNotes(e.target.value)}
                          placeholder="ملاحظات (اختياري)"
                        />
                      </div>
                      {isWellsProject && (
                        <div className="grid grid-cols-3 gap-2">
                          <MultiWellSelector
                            project_id={selectedProjectId}
                            value={purchaseWellIds}
                            onChange={setPurchaseWellIds}
                            optional
                          />
                          <TeamSelector
                            project_id={selectedProjectId}
                            value={purchaseTeamNames}
                            onChange={setPurchaseTeamNames}
                          />
                          <CrewTypeSelector
                            value={purchaseCrewTypes}
                            onChange={setPurchaseCrewTypes}
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          data-testid="button-add-material-purchase"
                          onClick={handleAddMaterialPurchase}
                          disabled={addMaterialPurchaseMutation.isPending || updateMaterialPurchaseMutation.isPending}
                          className="flex-1"
                        >
                          {(addMaterialPurchaseMutation.isPending || updateMaterialPurchaseMutation.isPending) ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent ml-2" />
                          ) : (
                            <Plus className="ml-2 h-4 w-4" />
                          )}
                          {editingMaterialPurchaseId ? "حفظ التعديل" : "إضافة شراء مواد جديدة"}
                        </Button>
                        {editingMaterialPurchaseId && (
                          <Button
                            data-testid="button-cancel-edit-material-purchase"
                            variant="outline"
                            onClick={resetMaterialPurchaseForm}
                          >
                            إلغاء
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {safeMaterialPurchases.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {safeMaterialPurchases.map((purchase: any, index: number) => {
                          const materialName = purchase.materialName || purchase.material?.name || 'مادة غير محددة';
                          const materialUnit = purchase.materialUnit || purchase.unit || purchase.material?.unit || 'وحدة';
                          const pType = purchase.purchaseType || 'نقد';
                          const isCash = pType === 'نقد';
                          const isStorage = pType === 'مخزن' || pType === 'توريد' || pType === 'مخزني';
                          const isCredit = pType === 'آجل' || pType === 'أجل';
                          
                          let borderColor = 'border-orange-200 dark:border-orange-900/30';
                          let priceColor = 'text-orange-600 dark:text-orange-400';
                          let badgeStyle = 'bg-orange-100/50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
                          
                          if (isCash) {
                            borderColor = 'border-green-200 dark:border-green-900/30';
                            priceColor = 'text-green-600 dark:text-green-400';
                            badgeStyle = 'bg-green-100/50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
                          } else if (isStorage) {
                            borderColor = 'border-blue-200 dark:border-blue-900/30';
                            priceColor = 'text-blue-600 dark:text-blue-400';
                            badgeStyle = 'bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
                          }
                          
                          return (
                            <div key={purchase.id || index} data-testid={`card-material-purchase-${purchase.id || index}`} className={`p-3 bg-white dark:bg-slate-800 border ${borderColor} rounded-lg shadow-sm hover:shadow-md transition-shadow`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-foreground text-sm" data-testid={`text-material-name-${purchase.id || index}`}>{materialName}</h4>
                                    <span className={`font-bold arabic-numbers text-base ${priceColor}`} data-testid={`text-material-total-${purchase.id || index}`}>
                                      {formatCurrency(purchase.totalAmount)}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline" className={`text-[10px] ${badgeStyle}`}>
                                      {pType}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {purchase.quantity} {materialUnit} × {formatCurrency(purchase.unitPrice)}
                                    </span>
                                  </div>
                                  {purchase.supplierName && (
                                    <p className="text-xs text-muted-foreground">المورد: {purchase.supplierName}</p>
                                  )}
                                  {purchase.notes && (
                                    <p className="text-[10px] text-muted-foreground mt-1 pt-1 border-t border-dashed border-gray-200 dark:border-gray-700">
                                      {purchase.notes.includes('مستورد من محادثة الواتساب') ? '📱 ' : 'الملاحظات: '}{purchase.notes}
                                    </p>
                                  )}
                                  <WellCrewBadges wellIds={purchase.well_ids} wellId={purchase.well_id} crewType={purchase.crew_type} teamName={(purchase as any).team_name} projectWells={projectWells} isWellsProject={isWellsProject} />
                                  {isAllProjects && purchase.projectName && (
                                    <div className="text-xs font-medium text-blue-600 dark:text-blue-400">📁 {purchase.projectName}</div>
                                  )}
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <Button
                                    data-testid={`button-edit-material-purchase-${purchase.id || index}`}
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                    onClick={() => handleEditMaterialPurchase(purchase)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    data-testid={`button-delete-material-purchase-${purchase.id || index}`}
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                    onClick={() => deleteMaterialPurchaseMutation.mutate(purchase.id)}
                                    disabled={deleteMaterialPurchaseMutation.isPending}
                                  >
                                    {deleteMaterialPurchaseMutation.isPending ? (
                                      <div className="h-4 w-4 animate-spin rounded-full border border-red-600 border-t-transparent" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div className="text-left mt-3 pt-3 border-t space-y-2">
                          <div className="bg-green-100 dark:bg-green-900/40 p-2 rounded-lg border border-green-200 dark:border-green-800">
                            <span className="text-sm font-bold text-green-900 dark:text-green-100">المشتريات النقدية: </span>
                            <span className="font-bold text-green-600 dark:text-green-400 arabic-numbers">
                              {formatCurrency(totals.totalMaterialCosts)}
                            </span>
                          </div>
                          {(() => {
                            const deferredAmount = Array.isArray(todayMaterialPurchases) ? 
                              todayMaterialPurchases
                                .filter((purchase: any) => purchase.purchaseType === "آجل")
                                .reduce((sum: number, purchase: any) => sum + parseFloat(purchase.totalAmount || "0"), 0) : 0;
                            const storageAmount = Array.isArray(todayMaterialPurchases) ?
                              todayMaterialPurchases
                                .filter((purchase: any) => purchase.purchaseType === "مخزن" || purchase.purchaseType === "توريد" || purchase.purchaseType === "مخزني")
                                .reduce((sum: number, purchase: any) => sum + parseFloat(purchase.totalAmount || "0"), 0) : 0;
                            return (
                              <>
                                {deferredAmount > 0 && (
                                  <div className="bg-orange-100 dark:bg-orange-900/40 p-2 rounded-lg border border-orange-200 dark:border-orange-800">
                                    <span className="text-sm font-bold text-orange-900 dark:text-orange-100">المشتريات الآجلة: </span>
                                    <span className="font-bold text-orange-600 dark:text-orange-400 arabic-numbers">
                                      {formatCurrency(deferredAmount)}
                                    </span>
                                  </div>
                                )}
                                {storageAmount > 0 && (
                                  <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <span className="text-sm font-bold text-blue-900 dark:text-blue-100">توريد المخزن: </span>
                                    <span className="font-bold text-blue-600 dark:text-blue-400 arabic-numbers">
                                      {formatCurrency(storageAmount)}
                                    </span>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* إرسال حولة عامل - القسم المطوي */}
              <div className="border-t pt-3 mt-3">
                <Collapsible open={isWorkerTransfersExpanded} onOpenChange={setIsWorkerTransfersExpanded}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-1 rounded-sm">
                      <h4 className="font-medium text-foreground flex items-center">
                        <DollarSign className="text-yellow-600 ml-2 h-5 w-5" />
                        إرسال حوالة عامل
                      </h4>
                      <div className="flex items-center gap-1">
                        {safeWorkerTransfers.length > 0 && <Badge variant="outline" className="h-5 text-[10px]">{safeWorkerTransfers.length}</Badge>}
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="space-y-3 mb-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col">
                          <Label className="block text-sm font-medium text-foreground mb-1">العامل *</Label>
                          <Select value={workerTransferWorkerId} onValueChange={setWorkerTransferWorkerId}>
                            <SelectTrigger data-testid="select-worker-transfer-worker">
                              <SelectValue placeholder="اختر العامل" />
                            </SelectTrigger>
                            <SelectContent>
                              {workers.map((worker: any) => (
                                <SelectItem key={worker.id} value={worker.id}>{worker.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-col">
                          <Label className="block text-sm font-medium text-foreground mb-1">المبلغ *</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            value={workerTransferAmount}
                            onChange={(e) => setWorkerTransferAmount(e.target.value)}
                            placeholder="المبلغ"
                            className="text-center arabic-numbers"
                            min="0"
                            step="1"
                            data-testid="input-worker-transfer-amount"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="block text-sm font-medium text-foreground mb-1">اسم المستقبل *</Label>
                          <AutocompleteInput
                            value={workerTransferRecipientName}
                            onChange={setWorkerTransferRecipientName}
                            category="recipientNames"
                            placeholder="اسم المستقبل"
                            data-testid="input-worker-transfer-recipient"
                          />
                        </div>
                        <div>
                          <Label className="block text-sm font-medium text-foreground mb-1">هاتف المستقبل</Label>
                          <AutocompleteInput
                            value={workerTransferRecipientPhone}
                            onChange={setWorkerTransferRecipientPhone}
                            category="recipientPhones"
                            placeholder="رقم الهاتف"
                            data-testid="input-worker-transfer-phone"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="block text-sm font-medium text-foreground mb-1">طريقة التحويل *</Label>
                          <Select value={workerTransferMethod} onValueChange={setWorkerTransferMethod}>
                            <SelectTrigger data-testid="select-worker-transfer-method">
                              <SelectValue placeholder="اختر الطريقة" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hawaleh">حولة</SelectItem>
                              <SelectItem value="bank">تحويل بنكي</SelectItem>
                              <SelectItem value="cash">نقداً</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="block text-sm font-medium text-foreground mb-1">رقم الحوالة</Label>
                          <Input
                            value={workerTransferNumber}
                            onChange={(e) => setWorkerTransferNumber(e.target.value)}
                            placeholder="رقم الحوالة"
                            className="arabic-numbers"
                            data-testid="input-worker-transfer-number"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="block text-sm font-medium text-foreground mb-1">ملاحظات</Label>
                        <Input
                          value={workerTransferNotes}
                          onChange={(e) => setWorkerTransferNotes(e.target.value)}
                          placeholder="ملاحظات"
                          data-testid="input-worker-transfer-notes"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mb-3">
                      <Button
                        onClick={handleAddWorkerTransfer}
                        size="sm"
                        className="flex-1 bg-primary"
                        disabled={addWorkerTransferMutation.isPending || updateWorkerTransferMutation.isPending}
                        data-testid="button-add-worker-transfer"
                      >
                        {addWorkerTransferMutation.isPending || updateWorkerTransferMutation.isPending ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : editingWorkerTransferId ? (
                          <><Save className="h-4 w-4 ml-2" /> حفظ التعديل</>
                        ) : (
                          <><Plus className="h-4 w-4 ml-2" /> إرسال حوالة عامل جديدة</>
                        )}
                      </Button>
                      {editingWorkerTransferId && (
                        <Button onClick={resetWorkerTransferForm} size="sm" variant="outline" data-testid="button-cancel-worker-transfer">
                          إلغاء
                        </Button>
                      )}
                    </div>
                    
                    <div className="mt-3 pt-3 border-t">
                      <h5 className="text-sm font-medium text-muted-foreground">حوالات العمال المضافة اليوم:</h5>
                    {safeWorkerTransfers.length > 0 ? (
                      <div className="space-y-2 mt-2">
                        {safeWorkerTransfers.map((transfer: any, index: number) => {
                          const worker = workers.find((w: any) => w.id === transfer.worker_id);
                          const methodLabel = transfer.transferMethod === "hawaleh" ? "حولة" : transfer.transferMethod === "bank" ? "تحويل بنكي" : "نقداً";
                          return (
                            <div key={transfer.id || index} className="p-3 bg-white dark:bg-slate-800 border border-yellow-200 dark:border-yellow-900/30 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-foreground text-sm">{worker?.name || 'عامل غير معروف'}</h4>
                                    <span className="font-bold text-yellow-600 dark:text-yellow-500 arabic-numbers text-base">{formatCurrency(transfer.amount)}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="text-muted-foreground">
                                      <span>المستقبل: </span>
                                      <span className="font-medium text-foreground">{transfer.recipientName}</span>
                                    </div>
                                    <div className="text-muted-foreground">
                                      <span>الطريقة: </span>
                                      <span className="font-medium text-foreground">{methodLabel}</span>
                                    </div>
                                  </div>
                                  {transfer.transferNumber && (
                                    <p className="text-xs text-muted-foreground">
                                      <span className="opacity-70">رقم الحوالة: </span>
                                      <span className="font-medium text-foreground">{transfer.transferNumber}</span>
                                    </p>
                                  )}
                                  {transfer.notes && (
                                    <p className="text-[10px] text-muted-foreground mt-1 pt-1 border-t border-dashed border-gray-200 dark:border-gray-700" data-testid="text-worker-transfer-notes">
                                      {transfer.notes.includes('مستورد من محادثة الواتساب') ? '📱 ' : 'الملاحظات: '}{transfer.notes}
                                    </p>
                                  )}
                                  {isAllProjects && transfer.projectName && (
                                    <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                      <Building2 className="inline h-3 w-3 ml-1" />
                                      {transfer.projectName}
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    onClick={() => handleEditWorkerTransfer(transfer)}
                                    data-testid={`button-edit-worker-transfer-${transfer.id}`}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={() => {
                                      if (window.confirm('هل أنت متأكد من حذف حوالة العامل؟')) {
                                        deleteWorkerTransferMutation.mutate(transfer.id);
                                      }
                                    }}
                                    disabled={deleteWorkerTransferMutation.isPending}
                                    data-testid={`button-delete-worker-transfer-${transfer.id}`}
                                  >
                                    {deleteWorkerTransferMutation.isPending ? (
                                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div className="text-left mt-2 pt-2 border-t bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded">
                          <span className="text-sm text-muted-foreground">إجمالي الحوالات: </span>
                          <span className="font-bold text-warning arabic-numbers">
                            {formatCurrency(totalsValue.totalWorkerTransfers)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 mt-2">
                        <DollarSign className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-no-worker-transfers">
                          لا توجد حوالات عمال للتاريخ {selectedDate}
                        </p>
                      </div>
                    )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* إدارة ترحيل الأموال - القسم المطوي */}
              <div className="border-t pt-3 mt-3">
                <Collapsible open={isProjectTransfersExpanded} onOpenChange={setIsProjectTransfersExpanded}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-1 rounded-sm">
                      <h4 className="font-medium text-foreground flex items-center">
                        <ArrowLeftRight className="text-orange-600 ml-2 h-5 w-5" />
                        ترحيل الأموال المضافة اليوم
                      </h4>
                      <div className="flex items-center gap-1">
                        {safeProjectTransfers.length > 0 && <Badge variant="outline" className="h-5 text-[10px]">{safeProjectTransfers.length}</Badge>}
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="space-y-3 mb-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="block text-sm font-medium text-foreground mb-1">المشروع المصدر *</Label>
                          <Select value={projectTransferFromId} onValueChange={setProjectTransferFromId}>
                            <SelectTrigger data-testid="select-project-transfer-from">
                              <SelectValue placeholder="اختر المشروع المصدر" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.filter((p: Project) => p.id !== projectTransferToId).map((project: Project) => (
                                <SelectItem key={project.id} value={project.id} data-testid={`select-item-from-project-${project.id}`}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="block text-sm font-medium text-foreground mb-1">المشروع المستلم *</Label>
                          <Select value={projectTransferToId} onValueChange={setProjectTransferToId}>
                            <SelectTrigger data-testid="select-project-transfer-to">
                              <SelectValue placeholder="اختر المشروع المستلم" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.filter((p: Project) => p.id !== projectTransferFromId).map((project: Project) => (
                                <SelectItem key={project.id} value={project.id} data-testid={`select-item-to-project-${project.id}`}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="block text-sm font-medium text-foreground mb-1">المبلغ *</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            placeholder="المبلغ"
                            value={projectTransferAmount}
                            onChange={(e) => setProjectTransferAmount(e.target.value)}
                            className="text-center arabic-numbers"
                            min="0"
                            step="1"
                            data-testid="input-project-transfer-amount"
                          />
                        </div>
                        <div>
                          <Label className="block text-sm font-medium text-foreground mb-1">سبب الترحيل</Label>
                          <AutocompleteInput
                            value={projectTransferReason}
                            onChange={setProjectTransferReason}
                            placeholder="سبب الترحيل"
                            category="transferReasons"
                            data-testid="input-project-transfer-reason"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="block text-sm font-medium text-foreground mb-1">الوصف</Label>
                          <Input
                            placeholder="وصف إضافي (اختياري)"
                            value={projectTransferDescription}
                            onChange={(e) => setProjectTransferDescription(e.target.value)}
                            data-testid="input-project-transfer-description"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleAddProjectTransfer}
                          size="sm"
                          className="flex-1 bg-primary"
                          disabled={addProjectTransferMutation.isPending || updateProjectTransferMutation.isPending}
                          data-testid="button-add-project-transfer"
                        >
                          {addProjectTransferMutation.isPending || updateProjectTransferMutation.isPending ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : editingProjectTransferId ? (
                            <><Save className="h-4 w-4 ml-2" /> حفظ التعديل</>
                          ) : (
                            <><Plus className="h-4 w-4 ml-2" /> إضافة ترحيل أموال</>
                          )}
                        </Button>
                        {editingProjectTransferId && (
                          <Button onClick={resetProjectTransferForm} size="sm" variant="outline" data-testid="button-cancel-edit-project-transfer">
                            إلغاء
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {safeProjectTransfers.length > 0 && (
                      <div className="space-y-3">
                        {safeProjectTransfers.map((transfer: any) => (
                          <div 
                            key={transfer.id} 
                            className={`p-3 rounded border-r-4 ${
                              transfer.toProjectId === selectedProjectId 
                                ? 'bg-green-50 dark:bg-green-950/30 border-green-500' 
                                : 'bg-red-50 dark:bg-red-950/30 border-red-500'
                            }`}
                            data-testid={`card-project-transfer-${transfer.id}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-sm font-medium truncate">
                                {transfer.toProjectId === selectedProjectId ? (
                                  <span className="text-green-700 dark:text-green-400" data-testid={`text-transfer-direction-${transfer.id}`}>واردة من: {transfer.fromProjectName}</span>
                                ) : (
                                  <span className="text-red-700 dark:text-red-400" data-testid={`text-transfer-direction-${transfer.id}`}>صادرة إلى: {transfer.toProjectName}</span>
                                )}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className={`font-bold text-sm arabic-numbers ${
                                  transfer.toProjectId === selectedProjectId ? 'text-green-600' : 'text-red-600'
                                }`} data-testid={`text-transfer-amount-${transfer.id}`}>
                                  {transfer.toProjectId === selectedProjectId ? '+' : '-'}{formatCurrency(transfer.amount)}
                                </span>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditProjectTransfer(transfer)} data-testid={`button-edit-project-transfer-${transfer.id}`}>
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("هل أنت متأكد من حذف هذا الترحيل؟")) { deleteProjectTransferMutation.mutate(transfer.id); } }} disabled={deleteProjectTransferMutation.isPending} data-testid={`button-delete-project-transfer-${transfer.id}`}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[11px]">
                              <div className="bg-white/60 dark:bg-gray-900/40 rounded px-2 py-1.5">
                                <span className="text-muted-foreground block mb-0.5">السبب</span>
                                <span className="font-medium text-foreground">{transfer.transferReason === 'settlement' ? 'تصفية حساب العمال' : transfer.transferReason === 'legacy_worker_rebalance' ? 'تسوية أرصدة عمال' : (transfer.transferReason || 'ترحيل أموال')}</span>
                              </div>
                              <div className="bg-white/60 dark:bg-gray-900/40 rounded px-2 py-1.5">
                                <span className="text-muted-foreground block mb-0.5">التاريخ</span>
                                <span className="font-medium text-foreground">{formatDate(transfer.transferDate)}</span>
                              </div>
                              <div className="bg-white/60 dark:bg-gray-900/40 rounded px-2 py-1.5">
                                <span className="text-muted-foreground block mb-0.5">النوع</span>
                                {transfer.transferReason === 'settlement' ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">تصفية عمال</span>
                                ) : transfer.transferReason === 'legacy_worker_rebalance' ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">تسوية أرصدة</span>
                                ) : (
                                  <span className="font-medium text-foreground">ترحيل يدوي</span>
                                )}
                              </div>
                            </div>
                            {transfer.description && (
                              <div className="mt-2 text-[11px] bg-white/60 dark:bg-gray-900/40 rounded px-2 py-1.5">
                                <span className="text-muted-foreground">الوصف: </span>
                                <span className="font-medium text-foreground">{
                                  transfer.transferReason === 'legacy_worker_rebalance' && transfer.description
                                    ? transfer.description.replace(/\s*\[[^\]]*\]\s*/g, ' ').replace(/\s*\(rebalance:[^)]*\)\s*/g, '').trim()
                                    : transfer.description
                                }</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Worker Miscellaneous Expenses - القسم المطوي */}
              {selectedProjectId && (
                <div className="border-t pt-3 mt-3">
                  <Collapsible open={isMiscExpanded} onOpenChange={setIsMiscExpanded}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-1 rounded-sm">
                        <h4 className="font-medium text-foreground flex items-center">
                          <Package className="text-purple-600 ml-2 h-5 w-5" />
                          نثريات العمال المضافة اليوم
                        </h4>
                        <div className="flex items-center gap-1">
                          {workerMiscExpenses.length > 0 && <Badge variant="outline" className="h-5 text-[10px]">{workerMiscExpenses.length}</Badge>}
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isMiscExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <WorkerMiscExpenses 
                        project_id={selectedProjectId} 
                        selectedDate={selectedDate || new Date().toISOString().split('T')[0]}
                        isWellsProject={isWellsProject}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}

              {/* الملخص اليومي - القسم المطوي */}
              <div className="border-t pt-3 mt-3">
                <Collapsible open={isSummaryExpanded} onOpenChange={setIsSummaryExpanded}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-1 rounded-sm">
                      <h4 className="font-medium text-foreground flex items-center">
                        <BarChart3 className="text-primary ml-2 h-5 w-5" />
                        الملخص المالي لليوم
                      </h4>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isSummaryExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <ExpenseSummary
                      totalIncome={totalsValue.totalIncome}
                      totalExpenses={totalsValue.totalCashExpenses}
                      remainingBalance={displayBalance}
                      details={{
                        workerWages: totalsValue.totalWorkerWages,
                        materialCosts: totalsValue.totalMaterialCosts,
                        transportation: totalsValue.totalTransportation,
                        miscExpenses: totalsValue.totalMiscExpenses,
                        workerTransfers: totalsValue.totalWorkerTransfers,
                        outgoingProjectTransfers: totalsValue.outgoingProjectTransfers,
                      }}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Save Button */}
              <div className="mt-4">
                <Button
                  onClick={handleSaveSummary}
                  disabled={saveDailySummaryMutation.isPending}
                  className="w-full bg-success hover:bg-success/90 text-success-foreground"
                >
                  <Save className="ml-2 h-4 w-4" />
                  {saveDailySummaryMutation.isPending ? "جاري الحفظ..." : "حفظ المصروفات"}
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
      </Card>
    </Collapsible>
      <OverpaymentSplitDialog
        open={showOverpaymentDialog}
        onClose={() => {
          setShowOverpaymentDialog(false);
          setOverpaymentData(null);
        }}
        data={overpaymentData}
        onConfirm={({ wageAmount, advanceAmount, advanceNotes, originalRecord, recordId }) => {
          setShowOverpaymentDialog(false);
          setOverpaymentData(null);
          if (recordId) {
            updateWorkerAttendanceMutation.mutate({
              ...originalRecord,
              id: recordId,
              confirmOverpayment: true,
              wageAmount,
              advanceAmount,
              advanceNotes,
            });
          } else {
            addWorkerAttendanceMutation.mutate({
              ...originalRecord,
              confirmOverpayment: true,
              wageAmount,
              advanceAmount,
              advanceNotes,
            });
          }
        }}
      />
      <FinancialGuardDialog
        open={showGuardTransferDialog}
        onClose={() => {
          setShowGuardTransferDialog(false);
          setGuardTransferData(null);
        }}
        data={guardTransferData}
        onConfirm={({ adjustedAmount, guardNote }) => {
          setShowGuardTransferDialog(false);
          const origData = guardTransferData?.originalData || {};
          const patchId = origData._patchId;
          setGuardTransferData(null);
          if (patchId) {
            updateWorkerTransferMutation.mutate({
              id: patchId,
              data: { ...origData, amount: adjustedAmount, notes: guardNote || origData.notes || '', confirmGuard: true, guardNote },
            });
          } else {
            addWorkerTransferMutation.mutate({
              ...origData,
              amount: adjustedAmount,
              notes: guardNote || origData.notes || '',
              confirmGuard: true,
              guardNote,
            });
          }
        }}
      />
      <FinancialGuardDialog
        open={showGuardPurchaseDialog}
        onClose={() => {
          setShowGuardPurchaseDialog(false);
          setGuardPurchaseData(null);
        }}
        data={guardPurchaseData}
        onConfirm={({ adjustedAmount, guardNote }) => {
          setShowGuardPurchaseDialog(false);
          const origData = guardPurchaseData?.originalData || {};
          const editId = origData._editId;
          setGuardPurchaseData(null);
          if (editId) {
            updateMaterialPurchaseMutation.mutate({
              id: editId,
              data: { ...origData, totalAmount: adjustedAmount, notes: guardNote || origData.notes || '', confirmGuard: true },
            });
          } else {
            addMaterialPurchaseMutation.mutate({
              ...origData,
              totalAmount: adjustedAmount,
              notes: guardNote || origData.notes || '',
              confirmGuard: true,
            });
          }
        }}
      />
    </div>
  );
}

// Export default مع Error Boundary
export default function DailyExpenses() {
  return (
    <ErrorBoundary>
      <DailyExpensesContent />
    </ErrorBoundary>
  );
}