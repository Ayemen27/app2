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
import { useLocation } from "wouter";
import { ArrowRight, Save, Users, Car, Plus, Edit2, Trash2, ChevronDown, ChevronUp, ArrowLeftRight, RefreshCw, Wallet, Banknote, Package, Truck, Receipt, Building2, Send, TrendingDown, Calculator, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { UnifiedCard, UnifiedCardField } from "@/components/ui/unified-card";
import { DollarSign, Calendar, Building, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { WellSelector } from "@/components/well-selector";
import ExpenseSummary from "@/components/expense-summary";
import WorkerMiscExpenses from "./worker-misc-expenses";
import { getCurrentDate, formatCurrency, formatDate, cleanNumber } from "@/lib/utils";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { apiRequest } from "@/lib/queryClient";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedSearchFilter } from "@/components/ui/unified-search-filter";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
import { exportTransactionsToExcel } from "@/components/ui/export-transactions-excel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import type { 
  WorkerAttendance, 
  TransportationExpense, 
  FundTransfer,
  MaterialPurchase,
  WorkerTransfer,
  Worker,
  Project,
  InsertFundTransfer,
  InsertTransportationExpense,
  InsertDailyExpenseSummary,
  ProjectFundTransfer 
} from "@shared/schema";

// إزالة تعريف ErrorBoundary المحلي لتجنب التكرار - يتم استيراده من components/ErrorBoundary

function DailyExpensesContent() {
  const [, setLocation] = useLocation();
  const { selectedProjectId, selectProject, isAllProjects } = useSelectedProject();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [carriedForward, setCarriedForward] = useState<string>("0");
  const [showProjectTransfers, setShowProjectTransfers] = useState<boolean>(true);
  const [activeFilters, setActiveFilters] = useState({});
  const [isAddFormOpen, setIsAddFormOpen] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedWellId, setSelectedWellId] = useState<number | undefined>();

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

  // Worker attendance form
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
  const [workerDays, setWorkerDays] = useState<string>("");
  const [workerAmount, setWorkerAmount] = useState<string>("");
  const [workerNotes, setWorkerNotes] = useState<string>("");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();

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
    const handleSaveExpenses = () => {
      // محاكاة كليك زر الحفظ
      const saveButton = document.querySelector('[type="submit"]') as HTMLButtonElement;
      if (saveButton) {
        saveButton.click();
      }
    };

    setFloatingAction(handleSaveExpenses, "حفظ المصاريف");
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

  const { data: workers = [], error: workersError } = useQuery<Worker[]>({
    queryKey: ["/api/workers"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/workers", "GET");

        let workers = [];
        if (response && typeof response === 'object') {
          if (response.success !== undefined && response.data !== undefined) {
            workers = Array.isArray(response.data) ? response.data : [];
          } else if (Array.isArray(response)) {
            workers = response;
          } else if (response.id) {
            workers = [response];
          } else if (response.data) {
            workers = Array.isArray(response.data) ? response.data : [];
          }
        }

        if (!Array.isArray(workers)) {
          workers = [];
        }

        return workers as Worker[];
      } catch (error) {
        console.error('❌ [DailyExpenses] خطأ في جلب العمال:', error);
        return [] as Worker[];
      }
    },
    staleTime: 1000 * 60 * 30, // 30 دقيقة - بيانات العمال لا تتغير كثيراً
    gcTime: 1000 * 60 * 60, // ساعة كاملة
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  // جلب قائمة المشاريع لعرض أسماء المشاريع في ترحيل الأموال مع معالجة محسنة
  const { data: projects = [], error: projectsError } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/projects", "GET");

        let projects = [];
        if (response && typeof response === 'object') {
          if (response.success !== undefined && response.data !== undefined) {
            projects = Array.isArray(response.data) ? response.data : [];
          } else if (Array.isArray(response)) {
            projects = response;
          } else if (response.id) {
            projects = [response];
          } else if (response.data) {
            projects = Array.isArray(response.data) ? response.data : [];
          }
        }

        if (!Array.isArray(projects)) {
          projects = [];
        }

        return projects as Project[];
      } catch (error) {
        console.error('❌ [DailyExpenses] خطأ في جلب المشاريع:', error);
        return [] as Project[];
      }
    },
    staleTime: 1000 * 60 * 30, // 30 دقيقة
    gcTime: 1000 * 60 * 60, // ساعة كاملة
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
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
    onError: (error: any) => {
      toast({ 
        title: "خطأ", 
        description: error?.message || "حدث خطأ أثناء إضافة الحضور", 
        variant: "destructive" 
      });
    }
  });

  const handleQuickAddAttendance = () => {
    if (!selectedProjectId || isAllProjects) {
      toast({
        title: "يرجى تحديد مشروع",
        description: "يرجى اختيار مشروع محدد أولاً",
        variant: "destructive",
      });
      return;
    }

    if (!selectedWorkerId || !workerDays || !workerAmount) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى اختيار العامل وتحديد الأيام والمبلغ",
        variant: "destructive",
      });
      return;
    }

    const attendanceData = {
      workerId: parseInt(selectedWorkerId),
      projectId: selectedProjectId,
      date: selectedDate || getCurrentDate(),
      workDays: workerDays,
      paidAmount: workerAmount,
      payableAmount: workerAmount, // الحقل السريع يفترض الدفع الكامل
      workDescription: "أجر يومي (إضافة سريعة)",
      notes: workerNotes,
      wellId: selectedWellId || null,
    };

    addWorkerAttendanceMutation.mutate(attendanceData);
  };

  // جلب معلومات المواد مع معالجة آمنة للأخطاء
  const { data: materials = [] } = useQuery({
    queryKey: ["/api/materials"],
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

  // سيتم تعريف المتغيرات الآمنة بعد جلب البيانات من dailyExpensesData

  // جلب عمليات ترحيل الأموال بين المشاريع مع أسماء المشاريع - استعلام منفصل للصفحة اليومية
  const { data: projectTransfers = [], refetch: refetchProjectTransfers } = useQuery<(ProjectFundTransfer & { fromProjectName?: string; toProjectName?: string })[]>({
    queryKey: ["/api/daily-project-transfers", selectedProjectId, selectedDate],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/daily-project-transfers?projectId=${selectedProjectId}&date=${selectedDate}`, "GET");
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
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    placeholderData: undefined,
  });

  // معالجة آمنة لترحيل المشاريع
  const safeProjectTransfers = Array.isArray(projectTransfers) ? projectTransfers : [];

  // استخدام useFinancialSummary الموحد لتحسين الأداء
  const { summary: financialSummary, isLoading: summaryLoading } = useFinancialSummary({
    projectId: selectedProjectId,
    date: selectedDate || undefined,
    enabled: !!selectedProjectId && !isAllProjects
  });

  // جلب البيانات التفصيلية فقط عند الحاجة - محسّن للأداء
  const { data: dailyExpensesData, isLoading: dailyExpensesLoading, error: dailyExpensesError, refetch: refetchDailyExpenses } = useQuery({
    queryKey: ["/api/projects", isAllProjects ? "all-projects" : selectedProjectId, selectedDate ? "daily-expenses" : "all-expenses", selectedDate],
    queryFn: async () => {
      try {
        if (isAllProjects) {
          const url = selectedDate 
            ? `/api/projects/all-projects-expenses?date=${selectedDate}`
            : `/api/projects/all-projects-expenses`;
          const response = await apiRequest(url, "GET");
          if (response && response.success && response.data) {
            return response.data;
          }
          return null;
        }

        if (!selectedProjectId) {
          return null;
        }

        if (!selectedDate) {
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
    retry: 2,
    staleTime: 1000 * 60 * 10, // 10 دقائق كاش بدلاً من 5
    gcTime: 1000 * 60 * 20, // 20 دقيقة
    refetchOnMount: true, // الجلب عند التحميل فقط إذا انتهى الكاش
    refetchOnWindowFocus: false,
    refetchInterval: false,
    placeholderData: (previousData: any) => previousData,
  });

  // استخراج البيانات من الاستجابة الموحدة
  const todayFundTransfers = dailyExpensesData?.fundTransfers || [];
  const todayWorkerAttendance = dailyExpensesData?.workerAttendance || [];
  const todayTransportation = dailyExpensesData?.transportationExpenses || [];
  const todayMaterialPurchases = dailyExpensesData?.materialPurchases || [];
  const todayWorkerTransfers = dailyExpensesData?.workerTransfers || [];
  const todayMiscExpenses = dailyExpensesData?.miscExpenses || [];

  // معالجة آمنة للبيانات - التأكد من أن البيانات مصفوفات
  const safeAttendance = Array.isArray(todayWorkerAttendance) ? todayWorkerAttendance : [];
  const safeTransportation = Array.isArray(todayTransportation) ? todayTransportation : [];
  const safeMaterialPurchases = Array.isArray(todayMaterialPurchases) ? todayMaterialPurchases : [];
  const safeWorkerTransfers = Array.isArray(todayWorkerTransfers) ? todayWorkerTransfers : [];
  const safeMiscExpenses = Array.isArray(todayMiscExpenses) ? todayMiscExpenses : [];
  const safeFundTransfers = Array.isArray(todayFundTransfers) ? todayFundTransfers : [];

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
      const worker = workers.find((w: any) => w.id === record.workerId);
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
      const material = materials.find((m: any) => m.id === purchase.materialId);
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
      const worker = workers.find((w: any) => w.id === transfer.workerId);
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

  // جلب الرصيد المتبقي من اليوم السابق
  const { data: previousBalance } = useQuery({
    queryKey: ["/api/projects", selectedProjectId, "previous-balance", selectedDate],
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
    enabled: !!selectedProjectId && !!selectedDate,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
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
        queryKey: ["/api/projects"],
        refetchType: 'none' // لا تعيد الجلب تلقائياً
      });
    }
  }, [selectedProjectId, selectedDate, isAllProjects, queryClient]);

  // دالة مساعدة لتحديث جميع البيانات - محسّنة
  const refreshAllData = useCallback(() => {
    const currentProjectId = selectedProjectId;
    const currentDate = selectedDate || getCurrentDate();
    
    // تحديث فقط الاستعلامات النشطة
    if (isAllProjects) {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", "all-projects"],
        exact: false
      });
    } else if (currentProjectId && currentProjectId !== 'all') {
      // تحديث مجمّع للمشروع المحدد
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", currentProjectId],
        exact: false
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/financial-summary", currentProjectId],
        exact: false
      });
    }
  }, [queryClient, selectedProjectId, selectedDate, isAllProjects]);

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
      // أضف wellId إلى البيانات
      const dataWithWell = { ...data, wellId: fundTransferWellId || null };
      return apiRequest("/api/fund-transfers", "POST", dataWithWell);
    },
    onSuccess: async (newTransfer) => {
      refreshAllData();
      
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });

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
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });

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

      toast({
        title: "فشل في إضافة الحولة",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const addTransportationMutation = useMutation({
    mutationFn: async (data: InsertTransportationExpense) => {
      await Promise.all([
        saveAutocompleteValue('transportDescriptions', transportDescription),
        saveAutocompleteValue('notes', transportNotes)
      ]);
      // أضف wellId إلى البيانات
      const dataWithWell = { ...data, wellId: selectedWellId || null };
      return apiRequest("/api/transportation-expenses", "POST", dataWithWell);
    },
    onSuccess: async (newExpense) => {
      refreshAllData();
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });

      toast({
        title: "تم إضافة المواصلات",
        description: "تم إضافة مصروف المواصلات بنجاح",
      });

      setTransportDescription("");
      setTransportAmount("");
      setTransportNotes("");
    },
    onError: async (error) => {
      await Promise.all([
        saveAutocompleteValue('transportDescriptions', transportDescription),
        saveAutocompleteValue('notes', transportNotes)
      ]);
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });

      toast({
        title: "خطأ في إضافة المواصلات",
        description: error?.message || "حدث خطأ أثناء إضافة مصروف المواصلات",
        variant: "destructive",
      });
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
      queryClient.setQueryData(["/api/projects", selectedProjectId, "daily-expenses", selectedDate], (oldData: any) => {
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
      queryClient.setQueryData(["/api/projects", selectedProjectId, "daily-expenses", selectedDate], (oldData: any) => {
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
        projectId: selectedProjectId,
        date: selectedDate
      };
    },
    onSuccess: (_, id, context) => {
      // استخدام القيم المحفوظة من onMutate
      const { projectId, date } = context || { projectId: selectedProjectId, date: selectedDate };
      
      // تحديث فوري للقائمة باستخدام setQueryData
      queryClient.setQueryData(["/api/projects", projectId, "daily-expenses", date], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          materialPurchases: oldData.materialPurchases?.filter((purchase: any) => purchase.id !== id) || []
        };
      });
      
      // إبطال الكاش للتأكد من التحديث الكامل
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", projectId, "daily-expenses", date] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", projectId, "material-purchases"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", projectId, "previous-balance"] 
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

  const deleteWorkerAttendanceMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/worker-attendance/${id}`, "DELETE"),
    onMutate: () => {
      // حفظ القيم الحالية لتجنب Race Condition
      return {
        projectId: selectedProjectId,
        date: selectedDate
      };
    },
    onSuccess: (_, id, context) => {
      // استخدام القيم المحفوظة من onMutate
      const { projectId, date } = context || { projectId: selectedProjectId, date: selectedDate };
      
      // تحديث فوري للقائمة باستخدام setQueryData
      queryClient.setQueryData(["/api/projects", projectId, "daily-expenses", date], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          workerAttendance: oldData.workerAttendance?.filter((attendance: any) => attendance.id !== id) || []
        };
      });
      
      // إبطال الكاش للتأكد من التحديث الكامل
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", projectId, "daily-expenses", date] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", projectId, "attendance"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", projectId, "previous-balance"] 
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
        projectId: selectedProjectId,
        date: selectedDate
      };
    },
    onSuccess: (_, id, context) => {
      // استخدام القيم المحفوظة من onMutate
      const { projectId, date } = context || { projectId: selectedProjectId, date: selectedDate };
      
      // تحديث فوري للقائمة باستخدام setQueryData
      queryClient.setQueryData(["/api/projects", projectId, "daily-expenses", date], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          workerTransfers: oldData.workerTransfers?.filter((transfer: any) => transfer.id !== id) || []
        };
      });
      
      // إبطال الكاش للتأكد من التحديث الكامل
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", projectId, "daily-expenses", date] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", projectId, "previous-balance"] 
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

  // Fund Transfer Update Mutation
  const updateFundTransferMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest(`/api/fund-transfers/${id}`, "PATCH", data),
    onSuccess: async (updatedTransfer, { id }) => {
      // تحديث daily-expenses query حيث تأتي بيانات fund transfers
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "daily-expenses", selectedDate] });
      // تحديث previous-balance للأيام التالية لأن التعديل يؤثر على الرصيد
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "previous-balance"] });

      // حفظ قيم الإكمال التلقائي
      if (senderName) await saveAutocompleteValue('senderNames', senderName);
      if (transferNumber) await saveAutocompleteValue('transferNumbers', transferNumber);

      // تحديث كاش autocomplete للتأكد من ظهور البيانات الجديدة
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });

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
      projectId: selectedProjectId,
      amount: fundAmount.toString(),
      senderName: senderName.trim() || "غير محدد",
      transferNumber: transferNumber.trim() || null,
      transferType: transferType,
      transferDate: new Date(selectedDate + 'T12:00:00.000Z'),
      notes: "",
      wellId: fundTransferWellId || null,
    };

    if (editingFundTransferId) {
      updateFundTransferMutation.mutate({
        id: editingFundTransferId,
        data: transferData
      });
    } else {
      addFundTransferMutation.mutate(transferData);
    }
  };

  // Transportation Update Mutation
  const updateTransportationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest(`/api/transportation-expenses/${id}`, "PATCH", data),
    onSuccess: async (updatedExpense, { id }) => {
      // تحديث daily-expenses query حيث تأتي بيانات transportation expenses
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "daily-expenses", selectedDate] });
      // تحديث previous-balance للأيام التالية لأن التعديل يؤثر على الرصيد
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "previous-balance"] });

      // حفظ قيم الإكمال التلقائي
      if (transportDescription) await saveAutocompleteValue('transportDescriptions', transportDescription);
      if (transportNotes) await saveAutocompleteValue('notes', transportNotes);

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
    setEditingTransportationId(null);
  };

  const handleEditTransportation = (expense: TransportationExpense) => {
    setTransportDescription(expense.description);
    setTransportAmount(expense.amount);
    setTransportNotes(expense.notes || "");
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
      projectId: selectedProjectId,
      amount: transportAmount,
      description: transportDescription,
      date: selectedDate || new Date().toISOString().split('T')[0],
      notes: transportNotes,
      wellId: selectedWellId || null,
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

  const calculateTotals = () => {
    try {
      // إنشاء متغيرات آمنة لجميع البيانات مع فحص إضافي
      const safeAttendance = Array.isArray(todayWorkerAttendance) ? 
        todayWorkerAttendance.filter(item => item && typeof item === 'object') : [];
      const safeTransportation = Array.isArray(todayTransportation) ? 
        todayTransportation.filter(item => item && typeof item === 'object') : [];
      const safeMaterialPurchases = Array.isArray(todayMaterialPurchases) ? 
        todayMaterialPurchases.filter(item => item && typeof item === 'object') : [];
      const safeWorkerTransfers = Array.isArray(todayWorkerTransfers) ? 
        todayWorkerTransfers.filter(item => item && typeof item === 'object') : [];
      const safeMiscExpenses = Array.isArray(todayMiscExpenses) ? 
        todayMiscExpenses.filter(item => item && typeof item === 'object') : [];
      const safeFundTransfers = Array.isArray(todayFundTransfers) ? 
        todayFundTransfers.filter(item => item && typeof item === 'object') : [];
      const safeProjectTransfers = Array.isArray(projectTransfers) ? 
        projectTransfers.filter(item => item && typeof item === 'object') : [];

      // تسجيل مبسط للحسابات المالية
      if (process.env.NODE_ENV === 'development') {
        console.log('🧮 [DailyExpenses] إجمالي البيانات المنظفة:', {
          حضور: safeAttendance.length,
          نقل: safeTransportation.length,
          مشتريات: safeMaterialPurchases.length,
          تحويلات_عمال: safeWorkerTransfers.length,
          مصاريف_أخرى: safeMiscExpenses.length,
          تحويلات_أموال: safeFundTransfers.length,
          تحويلات_مشاريع: safeProjectTransfers.length
        });
      }

      // استخدام دالة cleanNumber المحسنة
      const totalWorkerWages = safeAttendance.reduce(
        (sum, attendance) => {
          const amount = cleanNumber(attendance.paidAmount);
          return sum + amount;
        }, 
        0
      );

      const totalTransportation = safeTransportation.reduce(
        (sum, expense) => {
          const amount = cleanNumber(expense.amount);
          return sum + amount;
        }, 
        0
      );

      // حساب المشتريات النقدية فقط - استخدام البيانات الآمنة
      const totalMaterialCosts = safeMaterialPurchases
        .filter(purchase => purchase.purchaseType === "نقد")
        .reduce((sum, purchase) => {
          const amount = cleanNumber(purchase.totalAmount);
          return sum + amount;
        }, 0);

      const totalWorkerTransfers = safeWorkerTransfers.reduce(
        (sum, transfer) => {
          const amount = cleanNumber(transfer.amount);
          return sum + amount;
        }, 0);

      const totalMiscExpenses = safeMiscExpenses.reduce(
        (sum, expense) => {
          const amount = cleanNumber(expense.amount);
          return sum + amount;
        }, 0);

      const totalFundTransfers = safeFundTransfers.reduce(
        (sum, transfer) => {
          const amount = cleanNumber(transfer.amount);
          return sum + amount;
        }, 0);

      // حساب الأموال الواردة والصادرة من ترحيل المشاريع
      const incomingProjectTransfers = safeProjectTransfers
        .filter(transfer => transfer.toProjectId === selectedProjectId)
        .reduce((sum, transfer) => {
          const amount = cleanNumber(transfer.amount);
          return sum + amount;
        }, 0);

      const outgoingProjectTransfers = safeProjectTransfers
        .filter(transfer => transfer.fromProjectId === selectedProjectId)
        .reduce((sum, transfer) => {
          const amount = cleanNumber(transfer.amount);
          return sum + amount;
        }, 0);

      // تطبيق المنطق الصحيح من النسخة الاحتياطية - استخدام cleanNumber للاتساق
      const carriedAmount = cleanNumber(carriedForward);
      
      console.log('🧮 [calculateTotals] تفاصيل الحساب:', {
        carriedForward,
        carriedAmount,
        totalFundTransfers,
        incomingProjectTransfers,
        calculation: `${carriedAmount} + ${totalFundTransfers} + ${incomingProjectTransfers}`,
      });
      
      const totalIncome = carriedAmount + totalFundTransfers + incomingProjectTransfers;
      const totalExpenses = totalWorkerWages + totalTransportation + totalMaterialCosts + 
                            totalWorkerTransfers + totalMiscExpenses + outgoingProjectTransfers;
      const remainingBalance = totalIncome - totalExpenses;
      
      console.log('✅ [calculateTotals] النتيجة النهائية:', {
        totalIncome,
        totalExpenses,
        remainingBalance
      });

      // تسجيل تفصيلي للحسابات
      if (process.env.NODE_ENV === 'development') {
        console.log('💰 تفاصيل الحسابات:', {
          carriedForward: carriedForward,
          carriedAmount: carriedAmount,
          totalFundTransfers: totalFundTransfers,
          incomingProjectTransfers: incomingProjectTransfers,
          totalIncome: totalIncome,
          totalExpenses: totalExpenses,
          remainingBalance: remainingBalance
        });
      }

      const result = {
        totalWorkerWages: totalWorkerWages,
        totalTransportation: totalTransportation,
        totalMaterialCosts: totalMaterialCosts,
        totalWorkerTransfers: totalWorkerTransfers,
        totalMiscExpenses: totalMiscExpenses,
        totalFundTransfers: totalFundTransfers,
        incomingProjectTransfers: incomingProjectTransfers,
        outgoingProjectTransfers: outgoingProjectTransfers,
        totalIncome: totalIncome, // يمكن أن يكون سالباً حسب المبلغ المرحل
        totalExpenses: totalExpenses,
        remainingBalance: remainingBalance, // يمكن أن يكون سالباً
      };

      // فحص النتائج للتأكد من عدم وجود قيم غير منطقية
      const maxReasonableAmount = 100000000; // 100 مليون
      Object.keys(result).forEach(key => {
        const value = (result as any)[key];
        if (typeof value === 'number' && Math.abs(value) > maxReasonableAmount) {
          console.warn(`⚠️ [DailyExpenses] قيمة غير منطقية في ${key}:`, value);
          if (key !== 'remainingBalance') {
            (result as any)[key] = 0; // إعادة تعيين القيم غير المنطقية إلى الصفر
          }
        }
      });

      // تسجيل النتائج في بيئة التطوير فقط
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ الملخص المالي النهائي:', {
          إجمالي_الدخل: formatCurrency(result.totalIncome),
          إجمالي_المصاريف: formatCurrency(result.totalExpenses),
          الرصيد_المتبقي: formatCurrency(result.remainingBalance)
        });
      }
      return result;

    } catch (error) {
      console.error('❌ [DailyExpenses] خطأ في calculateTotals:', error);
      // إرجاع قيم افتراضية آمنة في حالة حدوث خطأ
      return {
        totalWorkerWages: 0,
        totalTransportation: 0,
        totalMaterialCosts: 0,
        totalWorkerTransfers: 0,
        totalMiscExpenses: 0,
        totalFundTransfers: 0,
        incomingProjectTransfers: 0,
        outgoingProjectTransfers: 0,
        totalIncome: 0,
        totalExpenses: 0,
        remainingBalance: 0,
      };
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

    const totals = calculateTotals();

    saveDailySummaryMutation.mutate({
      projectId: selectedProjectId,
      date: selectedDate || new Date().toISOString().split('T')[0],
      carriedForwardAmount: carriedForward,
      totalFundTransfers: totals.totalFundTransfers.toString(),
      totalWorkerWages: totals.totalWorkerWages.toString(),
      totalMaterialCosts: totals.totalMaterialCosts.toString(),
      totalTransportationCosts: totals.totalTransportation.toString(),

      totalIncome: totals.totalIncome.toString(),
      totalExpenses: totals.totalExpenses.toString(),
      remainingBalance: totals.remainingBalance.toString(),
    });
  };

  // حساب المجاميع مع معالجة آمنة للأخطاء
  const totals = useMemo(() => {
    try {
      const result = calculateTotals();
      if (!result || typeof result !== 'object') {
        console.warn('⚠️ [DailyExpenses] calculateTotals returned invalid result:', result);
        throw new Error('Invalid result from calculateTotals');
      }
      return result;
    } catch (error) {
      console.error('❌ [DailyExpenses] خطأ في حساب المجاميع:', error);
      return {
        totalWorkerWages: 0,
        totalTransportation: 0,
        totalMaterialCosts: 0,
        totalWorkerTransfers: 0,
        totalMiscExpenses: 0,
        totalFundTransfers: 0,
        incomingProjectTransfers: 0,
        outgoingProjectTransfers: 0,
        totalIncome: 0,
        totalExpenses: 0,
        remainingBalance: 0,
      };
    }
  }, [
    todayWorkerAttendance,
    todayTransportation,
    todayMaterialPurchases,
    todayWorkerTransfers,
    todayMiscExpenses,
    todayFundTransfers,
    projectTransfers,
    carriedForward,
    selectedProjectId
  ]);

  // تكوين صفوف الإحصائيات الموحدة (3x3)
  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'workerWages',
          label: 'أجور العمال',
          value: formatCurrency(totals.totalWorkerWages),
          icon: Users,
          color: 'blue',
        },
        {
          key: 'fundTransfers',
          label: 'العهد',
          value: formatCurrency(totals.totalFundTransfers),
          icon: Banknote,
          color: 'green',
        },
        {
          key: 'materials',
          label: 'المواد',
          value: formatCurrency(totals.totalMaterialCosts),
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
          value: formatCurrency(totals.totalTransportation),
          icon: Truck,
          color: 'orange',
        },
        {
          key: 'miscExpenses',
          label: 'النثريات',
          value: formatCurrency(totals.totalMiscExpenses),
          icon: Receipt,
          color: 'amber',
        },
        {
          key: 'projectTransfers',
          label: 'الترحيل',
          splitValue: {
            incoming: totals.incomingProjectTransfers,
            outgoing: totals.outgoingProjectTransfers
          },
          value: formatCurrency(totals.incomingProjectTransfers - totals.outgoingProjectTransfers),
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
          value: formatCurrency(totals.totalWorkerTransfers),
          icon: Send,
          color: 'indigo',
        },
        {
          key: 'totalExpenses',
          label: 'المنصرف',
          value: formatCurrency(totals.totalExpenses),
          icon: TrendingDown,
          color: 'red',
        },
        {
          key: 'remainingBalance',
          label: 'المتبقي',
          value: formatCurrency(totals.remainingBalance),
          icon: Calculator,
          color: totals.remainingBalance >= 0 ? 'emerald' : 'rose',
        },
      ]
    }
  ], [totals]);

  // تكوين الفلاتر للوحة الإحصائيات
  const filtersConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'date',
      label: 'التاريخ',
      type: 'date',
      placeholder: 'اختر التاريخ',
    },
  ], []);

  // دوال معالجة الفلاتر
  const handleFilterChange = (key: string, value: any) => {
    if (key === 'date') {
      if (value instanceof Date) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        setSelectedDate(`${year}-${month}-${day}`);
      } else {
        setSelectedDate(null);
      }
    }
  };

  const handleResetFilters = () => {
    setSelectedDate(null);
    setSearchValue("");
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", selectedProjectId, "daily-expenses", selectedDate] 
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
      
      // إضافة تحويلات العهدة (دخل)
      filteredFundTransfers.forEach((transfer: any) => {
        transactions.push({
          id: transfer.id,
          date: transfer.date || selectedDate || new Date().toISOString().split('T')[0],
          type: 'income',
          category: 'عهدة',
          amount: cleanNumber(transfer.amount),
          description: `عهدة من ${transfer.senderName || 'غير محدد'}`,
          projectId: transfer.projectId,
          projectName: projects.find(p => p.id === transfer.projectId)?.name || 'غير محدد',
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
          projectId: isIncoming ? transfer.fromProjectId : transfer.toProjectId,
          projectName: isIncoming ? fromProject?.name : toProject?.name,
        });
      });

      // إضافة حضور العمال (مصروف أو مؤجل)
      filteredAttendance.forEach((record: any) => {
        const worker = workers.find((w: any) => w.id === record.workerId);
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
          projectId: record.projectId,
          projectName: projects.find(p => p.id === record.projectId)?.name || 'غير محدد',
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
          projectId: expense.projectId,
          projectName: projects.find(p => p.id === expense.projectId)?.name || 'غير محدد',
        });
      });

      // إضافة مشتريات المواد (مصروف نقدي أو مؤجل)
      filteredMaterialPurchases.forEach((purchase: any) => {
        const material = materials.find((m: any) => m.id === purchase.materialId);
        const isCash = purchase.purchaseType === 'نقد';
        
        transactions.push({
          id: purchase.id,
          date: purchase.date || selectedDate || new Date().toISOString().split('T')[0],
          type: isCash ? 'expense' : 'deferred',
          category: 'مشتريات مواد',
          amount: isCash ? cleanNumber(purchase.totalAmount) : 0,
          description: `شراء ${material?.name || 'مادة'}`,
          projectId: purchase.projectId,
          projectName: projects.find(p => p.id === purchase.projectId)?.name || 'غير محدد',
          materialName: material?.name || purchase.materialName,
          quantity: cleanNumber(purchase.quantity) || undefined,
          unitPrice: cleanNumber(purchase.unitPrice) || undefined,
          paymentType: purchase.purchaseType,
          supplierName: purchase.supplier || purchase.supplierName,
        });
      });

      // إضافة تحويلات العمال (مصروف)
      filteredWorkerTransfers.forEach((transfer: any) => {
        const worker = workers.find((w: any) => w.id === transfer.workerId);
        transactions.push({
          id: transfer.id,
          date: transfer.date || selectedDate || new Date().toISOString().split('T')[0],
          type: 'expense',
          category: 'حوالات عمال',
          amount: cleanNumber(transfer.amount),
          description: transfer.notes || 'حوالة للعامل',
          projectId: transfer.projectId,
          projectName: projects.find(p => p.id === transfer.projectId)?.name || 'غير محدد',
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
          projectId: expense.projectId,
          projectName: projects.find(p => p.id === expense.projectId)?.name || 'غير محدد',
        });
      });

      // حساب الإجماليات (مطابقة لمنطق الصفحة)
      const totalIncome = transactions
        .filter(t => t.type === 'income' || t.type === 'transfer_from_project')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const exportTotals = {
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses
      };

      // الحصول على اسم المشروع
      const currentProjectName = isAllProjects 
        ? 'جميع المشاريع' 
        : projects.find(p => p.id === selectedProjectId)?.name || 'المشروع';

      // تصدير إلى Excel
      await exportTransactionsToExcel(
        transactions,
        exportTotals,
        formatCurrency,
        `${currentProjectName}${selectedDate ? ` - ${selectedDate}` : ''}`
      );

      toast({
        title: "تم التصدير بنجاح",
        description: `تم تصدير ${transactions.length} عملية إلى ملف Excel`,
      });
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
          })() : undefined
        }}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        actions={actionsConfig}
      />


      {/* بطاقات ملخص المصروفات - عرض بطاقة لكل تاريخ (سواء اختيار جميع المشاريع أو مشروع محدد) */}
      {dailyExpensesData?.groupedByProjectDate && dailyExpensesData.groupedByProjectDate.length > 0 ? (
        <div className="space-y-4">
          {dailyExpensesData.groupedByProjectDate.map((cardData: any, index: number) => (
            <UnifiedCard
              key={`${cardData.projectId}-${cardData.date}-${index}`}
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
                  label: "الوارد", 
                  value: formatCurrency(cardData.totalIncome || 0), 
                  icon: TrendingUp, 
                  color: "success",
                  emphasis: true
                },
                { 
                  label: "المصروفات", 
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
              label: "الوارد", 
              value: formatCurrency(totals.totalFundTransfers), 
              icon: TrendingUp, 
              color: "success",
              emphasis: true
            },
            { 
              label: "المصروفات", 
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

      {/* نموذج الإضافة القابل للطي */}
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
                  <Label className="block text-sm font-medium text-foreground">التاريخ</Label>
                  <Input
                    type="date"
                    value={selectedDate || ''}
                    onChange={(e) => setSelectedDate(e.target.value || null)}
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-foreground">المبلغ المتبقي السابق</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={carriedForward}
                    onChange={(e) => setCarriedForward(e.target.value)}
                    placeholder="0"
                    className="text-center arabic-numbers"
                  />
                </div>
              </div>

              {/* Fund Transfer Section */}
              <div className="border-t pt-3">
            <h4 className="font-medium text-foreground">تحويل عهدة جديدة</h4>
            {dailyExpensesError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">
                  خطأ في جلب البيانات: {dailyExpensesError.message}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="block text-sm font-medium text-foreground mb-1">المبلغ *</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder="المبلغ *"
                  className="text-center arabic-numbers"
                  min="0"
                  step="0.01"
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
            {selectedProjectId && !isAllProjects && (
              <div className="mb-3">
                <Label className="block text-sm font-medium text-foreground mb-1">البئر</Label>
                <WellSelector
                  projectId={selectedProjectId}
                  value={fundTransferWellId}
                  onChange={setFundTransferWellId}
                  optional={true}
                />
              </div>
            )}
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
              ) : Array.isArray(todayFundTransfers) && todayFundTransfers.length > 0 ? (
                <div className="space-y-2">
                  {safeFundTransfers.map((transfer: any, index) => (
                    <div key={transfer.id || index} className="flex justify-between items-center p-2 bg-muted rounded">
                      <div className="text-sm flex-1">
                        <div>{transfer.senderName || 'غير محدد'}</div>
                        <div className="text-xs text-muted-foreground">{transfer.transferType}</div>
                        {isAllProjects && transfer.projectName && (
                          <div className="text-xs font-medium text-blue-600 mt-1">📁 {transfer.projectName}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium arabic-numbers">{formatCurrency(transfer.amount)}</span>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleEditFundTransfer(transfer)}
                            data-testid="button-edit-fund-transfer"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteFundTransferMutation.mutate(transfer.id)}
                            disabled={deleteFundTransferMutation.isPending}
                            data-testid="button-delete-fund-transfer"
                          >
                            {deleteFundTransferMutation.isPending ? (
                              <div className="h-3 w-3 animate-spin rounded-full border border-red-600 border-t-transparent" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-left pt-2 border-t">
                    <span className="text-sm text-muted-foreground">إجمالي العهد: </span>
                    <span className="font-bold text-primary arabic-numbers">
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
                  <p className="text-xs text-gray-500">
                    يمكنك إضافة تحويل جديد أو اختيار تاريخ آخر
                  </p>

                </div>
              )}
              </div>
            </div>

              {/* Transportation Input Section + Display */}
              <div className="border-t pt-3 mt-3">
                <h4 className="font-medium text-foreground flex items-center mb-2">
                  <Car className="text-secondary ml-2 h-5 w-5" />
                  إضافة مواصلات جديدة
                </h4>
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
                  </div>
                  <div className="grid grid-cols-2 gap-3">
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
                    {selectedProjectId && !isAllProjects && (
                      <div className="flex flex-col">
                        <Label className="block text-sm font-medium text-foreground mb-1">البئر</Label>
                        <WellSelector
                          projectId={selectedProjectId}
                          value={selectedWellId}
                          onChange={setSelectedWellId}
                          optional={true}
                        />
                      </div>
                    )}
                  </div>
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
                              <span className="font-bold text-secondary arabic-numbers text-base">{formatCurrency(expense.amount)}</span>
                            </div>
                            {expense.notes && (
                              <p className="text-xs text-muted-foreground">الملاحظات: {expense.notes}</p>
                            )}
                            {expense.wellName && (
                              <p className="text-xs text-muted-foreground">البئر: {expense.wellName}</p>
                            )}
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
                    <div className="text-left mt-3 pt-3 border-t bg-orange-50 dark:bg-orange-950/20 p-2 rounded">
                      <span className="text-sm font-medium text-foreground">إجمالي المواصلات: </span>
                      <span className="font-bold text-secondary arabic-numbers">
                        {formatCurrency(totals.totalTransportation)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* إضافة أجور العمال - حقول الإدخال السريعة */}
              <div className="border-t pt-3 mt-3">
                <h4 className="font-medium text-foreground flex items-center mb-3">
                  <Users className="text-primary ml-2 h-5 w-5" />
                  إضافة أجور عامل جديد
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="block text-sm font-medium text-foreground mb-1">العامل *</Label>
                      <Select 
                        value={selectedWorkerId || "none"} 
                        onValueChange={(val) => setSelectedWorkerId(val === "none" ? "" : val)}
                      >
                        <SelectTrigger data-testid="select-worker">
                          <SelectValue placeholder="اختر العامل" />
                        </SelectTrigger>
                        <SelectContent className="p-0 overflow-hidden">
                          <div className="p-2 border-b sticky top-0 bg-popover z-50">
                            <Input
                              placeholder="بحث عن عامل..."
                              className="h-8 w-full"
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
                            <SelectItem value="none">اختر العامل</SelectItem>
                            {workers && workers.length > 0 ? (
                              workers
                                .filter(w => !searchValue || (w.name && w.name.toLowerCase().includes(searchValue.toLowerCase())))
                                .map((worker) => (
                                  <SelectItem key={`worker-select-${worker.id}`} value={worker.id.toString()}>
                                    {worker.name}
                                  </SelectItem>
                                ))
                            ) : null}
                          </div>
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedProjectId && !isAllProjects && (
                      <div className="flex flex-col">
                        <Label className="block text-sm font-medium text-foreground mb-1">البئر</Label>
                        <WellSelector
                          projectId={selectedProjectId}
                          value={selectedWellId}
                          onChange={setSelectedWellId}
                          optional={true}
                        />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="block text-sm font-medium text-foreground mb-1">عدد الأيام *</Label>
                      <Input
                        type="number"
                        value={workerDays}
                        onChange={(e) => setWorkerDays(e.target.value)}
                        placeholder="0"
                        className="text-center"
                        min="0"
                        step="0.5"
                        data-testid="input-worker-days"
                      />
                    </div>
                    <div>
                      <Label className="block text-sm font-medium text-foreground mb-1">المبلغ المصروف *</Label>
                      <Input
                        type="number"
                        value={workerAmount}
                        onChange={(e) => setWorkerAmount(e.target.value)}
                        placeholder="0"
                        className="text-center arabic-numbers"
                        min="0"
                        step="0.01"
                        data-testid="input-worker-amount"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="block text-sm font-medium text-foreground mb-1">الملاحظات</Label>
                    <Input
                      type="text"
                      value={workerNotes}
                      onChange={(e) => setWorkerNotes(e.target.value)}
                      placeholder="ملاحظات إضافية"
                      data-testid="input-worker-notes"
                    />
                  </div>
                  <Button 
                    onClick={handleQuickAddAttendance}
                    className="w-full bg-primary"
                    disabled={addWorkerAttendanceMutation.isPending}
                    data-testid="button-add-worker-attendance"
                  >
                    {addWorkerAttendanceMutation.isPending ? (
                      <div className="h-4 w-4 animate-spin rounded-full border border-white border-t-transparent" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 ml-2" />
                        إضافة أجر العامل مباشره
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* أجور العمال - عرض البطاقات */}
              {safeAttendance.length > 0 && (
                <div className="border-t pt-3 mt-3">
                  <h4 className="font-medium text-foreground flex items-center">
                    <Users className="text-primary ml-2 h-5 w-5" />
                    أجور العمال المضافة
                  </h4>
                  <div className="space-y-2 mt-2">
                    {safeAttendance.map((attendance: any, index) => {
                      const worker = workers.find(w => w.id === attendance.workerId);
                      const payableAmount = cleanNumber(attendance.payableAmount);
                      const paidAmount = cleanNumber(attendance.paidAmount);
                      const deferredAmount = payableAmount - paidAmount;
                      return (
                        <div key={index} className="p-3 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900/30 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-foreground text-sm">{attendance.workerName || worker?.name || `عامل ${index + 1}`}</h4>
                                <span className="font-bold text-primary arabic-numbers text-base">{formatCurrency(paidAmount)}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="text-muted-foreground">
                                  <span>الأيام: </span>
                                  <span className="font-medium text-foreground">{cleanNumber(attendance.workDays) || 0}</span>
                                </div>
                                <div className="text-muted-foreground">
                                  <span>الأجر اليومي: </span>
                                  <span className="font-medium text-foreground">{formatCurrency(cleanNumber(attendance.dailyWage))}</span>
                                </div>
                              </div>
                              {deferredAmount > 0 && (
                                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">مؤجل: {formatCurrency(deferredAmount)}</p>
                              )}
                              {attendance.workDescription && (
                                <p className="text-xs text-muted-foreground">النوع: {attendance.workDescription}</p>
                              )}
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
                                  setLocation(`/worker-attendance?edit=${attendance.id}&worker=${attendance.workerId}&date=${selectedDate}`);
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

              {/* شراء مواد - الزر + العرض */}
              <div className="border-t pt-3 mt-3">
                <Button
                  variant="outline"
                  onClick={() => setLocation("/material-purchase")}
                  className="w-full border-2 border-dashed border-green-300 text-green-600 hover:bg-green-50"
                >
                  <Package className="ml-2 h-4 w-4" />
                  إضافة شراء مواد
                </Button>
                
                {/* Materials Display - يظهر فقط عند وجود بيانات */}
                {safeMaterialPurchases.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {safeMaterialPurchases.map((purchase, index) => {
                      const materialName = purchase.materialName || purchase.material?.name || 'مادة غير محددة';
                      const materialUnit = purchase.materialUnit || purchase.unit || purchase.material?.unit || 'وحدة';
                      const isCash = purchase.purchaseType === 'نقد';
                      
                      return (
                        <div key={index} className={`p-3 border rounded-lg shadow-sm hover:shadow-md transition-shadow ${
                          isCash 
                            ? 'bg-white dark:bg-slate-800 border-green-200 dark:border-green-900/30' 
                            : 'bg-white dark:bg-slate-800 border-orange-200 dark:border-orange-900/30'
                        }`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-foreground text-sm">{materialName}</h4>
                                <span className={`font-bold arabic-numbers text-base ${isCash ? 'text-green-600' : 'text-orange-600'}`}>
                                  {formatCurrency(purchase.totalAmount)}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="text-muted-foreground">
                                  <span>الكمية: </span>
                                  <span className="font-medium text-foreground">{purchase.quantity} {materialUnit}</span>
                                </div>
                                <div className="text-muted-foreground">
                                  <span>السعر: </span>
                                  <span className="font-medium text-foreground">{formatCurrency(purchase.unitPrice)}</span>
                                </div>
                              </div>
                              {purchase.supplierName && (
                                <p className="text-xs text-muted-foreground">المورد: {purchase.supplierName}</p>
                              )}
                              <div className={`inline-block text-xs font-semibold px-2 py-1 rounded ${
                                isCash 
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                  : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                              }`}>
                                {isCash ? 'نقد' : 'آجل'}
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                onClick={() => setLocation(`/material-purchase?edit=${purchase.id}`)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button 
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
                    <div className="text-left mt-2 pt-2 border-t space-y-1">
                      <div>
                        <span className="text-sm text-muted-foreground">المشتريات النقدية: </span>
                        <span className="font-bold text-success arabic-numbers">
                          {formatCurrency(totals.totalMaterialCosts)}
                        </span>
                      </div>
                      {(() => {
                        const deferredAmount = Array.isArray(todayMaterialPurchases) ? 
                          todayMaterialPurchases
                            .filter(purchase => purchase.purchaseType === "آجل")
                            .reduce((sum, purchase) => sum + parseFloat(purchase.totalAmount || "0"), 0) : 0;
                        return deferredAmount > 0 ? (
                          <div>
                            <span className="text-sm text-muted-foreground">المشتريات الآجلة: </span>
                            <span className="font-bold text-orange-600 arabic-numbers">
                              {formatCurrency(deferredAmount)}
                            </span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* إرسال حولة عامل - الزر + العرض */}
              <div className="border-t pt-3 mt-3">
                <Button
                  variant="outline"
                  onClick={() => setLocation("/worker-accounts")}
                  className="w-full border-2 border-dashed border-yellow-300 text-yellow-600 hover:bg-yellow-50"
                >
                  <DollarSign className="ml-2 h-4 w-4" />
                  إرسال حولة عامل
                </Button>
                
                {/* Worker Transfers Display - يظهر فقط عند وجود بيانات */}
                {safeWorkerTransfers.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {safeWorkerTransfers.map((transfer, index) => {
                      const worker = workers.find(w => w.id === transfer.workerId);
                      const methodLabel = transfer.transferMethod === "hawaleh" ? "حولة" : transfer.transferMethod === "bank" ? "تحويل بنكي" : "نقداً";
                      return (
                        <div key={index} className="p-3 bg-white dark:bg-slate-800 border border-yellow-200 dark:border-yellow-900/30 rounded-lg shadow-sm hover:shadow-md transition-shadow">
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
                              {transfer.recipientPhone && (
                                <p className="text-xs text-muted-foreground">الهاتف: {transfer.recipientPhone}</p>
                              )}
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                onClick={() => setLocation(`/worker-accounts?edit=${transfer.id}&worker=${transfer.workerId}`)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => {
                                  const isConfirmed = window.confirm('هل أنت متأكد من حذف حوالة العامل؟');
                                  if (isConfirmed) {
                                    deleteWorkerTransferMutation.mutate(transfer.id);
                                  }
                                }}
                                disabled={deleteWorkerTransferMutation.isPending}
                              >
                                {deleteWorkerTransferMutation.isPending ? (
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
                    <div className="text-left mt-2 pt-2 border-t">
                      <span className="text-sm text-muted-foreground">إجمالي الحوالات: </span>
                      <span className="font-bold text-warning arabic-numbers">
                        {formatCurrency(totals.totalWorkerTransfers)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* إدارة ترحيل الأموال - الزر + العرض */}
              <div className="border-t pt-3 mt-3">
                <Button
                  variant="outline"
                  onClick={() => setLocation("/project-transfers")}
                  className="w-full border-2 border-dashed border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  <ArrowLeftRight className="ml-2 h-4 w-4" />
                  إدارة ترحيل الأموال
                </Button>
                
                {/* Project Fund Transfers Display - يظهر فقط عند وجود بيانات */}
                {safeProjectTransfers.length > 0 && (
                  <div className="space-y-3 mt-3">
                    {safeProjectTransfers.map((transfer) => (
                      <div 
                        key={transfer.id} 
                        className={`p-3 rounded border-r-4 ${
                          transfer.toProjectId === selectedProjectId 
                            ? 'bg-green-50 border-green-500' 
                            : 'bg-red-50 border-red-500'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                {transfer.toProjectId === selectedProjectId ? (
                                  <span className="text-green-700">أموال واردة من: {transfer.fromProjectName}</span>
                                ) : (
                                  <span className="text-red-700">أموال صادرة إلى: {transfer.toProjectName}</span>
                                )}
                              </span>
                              <span className={`font-bold arabic-numbers ${
                                transfer.toProjectId === selectedProjectId ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {transfer.toProjectId === selectedProjectId ? '+' : '-'}{formatCurrency(transfer.amount)}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <div>السبب: {transfer.transferReason || 'ترحيل أموال'}</div>
                              {transfer.description && (
                                <div className="mt-1">الوصف: {transfer.description}</div>
                              )}
                              <div className="mt-1">التاريخ: {formatDate(transfer.transferDate)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Worker Miscellaneous Expenses */}
              {selectedProjectId && (
                <div className="border-t pt-3 mt-3">
                  <WorkerMiscExpenses 
                    projectId={selectedProjectId} 
                    selectedDate={selectedDate || new Date().toISOString().split('T')[0]} 
                  />
                </div>
              )}

              {/* Total Summary */}
              <div className="border-t pt-3 mt-3">
                <ExpenseSummary
                  totalIncome={totals.totalIncome}
                  totalExpenses={totals.totalExpenses}
                  remainingBalance={totals.remainingBalance}
                />
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