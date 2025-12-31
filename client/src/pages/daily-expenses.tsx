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
import { ArrowRight, Save, Users, Car, Plus, Edit2, Trash2, ChevronDown, ChevronUp, ArrowLeftRight, RefreshCw, Wallet, Banknote, Package, Truck, Receipt, Building2, Send, TrendingDown, Calculator, FileSpreadsheet, DollarSign, Calendar, Building, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { UnifiedCard, UnifiedCardField } from "@/components/ui/unified-card";
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
import { queueForSync } from "@/offline/offline";
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

function DailyExpensesContent() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { selectedProjectId, selectProject, isAllProjects } = useSelectedProject();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [carriedForward, setCarriedForward] = useState<string>("0");
  const [showProjectTransfers, setShowProjectTransfers] = useState<boolean>(true);
  const [searchValue, setSearchValue] = useState<string>("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    dateRange: undefined,
    type: 'all',
    transportCategory: 'all',
    miscCategory: 'all'
  });

  const handleFilterChange = useCallback((key: string, value: any) => {
    if (key === 'date') {
      if (value instanceof Date) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        setSelectedDate(`${year}-${month}-${day}`);
      } else {
        setSelectedDate(null);
      }
    } else if (key === 'dateRange') {
      setFilterValues(prev => ({ ...prev, [key]: value }));
      if (value?.from) {
        setSelectedDate(null);
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

  // استخدام useFinancialSummary الموحد لتحسين الأداء وتجنب اختلاف البيانات
  const { 
    totals: financialTotals,
    summary: financialSummary, 
    isLoading: summaryLoading, 
    refetch: refetchFinancial 
  } = useFinancialSummary({
    projectId: selectedProjectId,
    date: selectedDate || undefined,
    enabled: !!selectedProjectId && !isAllProjects
  });

  const financialTotalsMemo = useMemo(() => ({
    totalIncome: financialSummary?.income.totalIncome || 0,
    totalExpenses: financialSummary?.expenses.totalCashExpenses || 0,
    remainingBalance: financialSummary?.cashBalance || 0,
    totalWorkerWages: financialSummary?.expenses.workerWages || 0,
    totalFundTransfers: financialSummary?.income.fundTransfers || 0,
    totalMaterialCosts: financialSummary?.expenses.materialExpenses || 0,
    totalTransportation: financialSummary?.expenses.transportExpenses || 0,
    totalMiscExpenses: financialSummary?.expenses.miscExpenses || 0,
    totalWorkerTransfers: financialSummary?.expenses.workerTransfers || 0,
    materialExpensesCredit: financialSummary?.expenses.materialExpensesCredit || 0,
    incomingProjectTransfers: financialSummary?.income.incomingProjectTransfers || 0,
    outgoingProjectTransfers: financialSummary?.expenses.outgoingProjectTransfers || 0,
  }), [financialSummary]);

  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedWellId, setSelectedWellId] = useState<number | undefined>();
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isFundTransfersExpanded, setIsFundTransfersExpanded] = useState(false);
  const [isTransportationExpanded, setIsTransportationExpanded] = useState(false);
  const [isAttendanceExpanded, setIsAttendanceExpanded] = useState(false);

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

  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
  const [workerDays, setWorkerDays] = useState<string>("");
  const [workerAmount, setWorkerAmount] = useState<string>("");
  const [workerNotes, setWorkerNotes] = useState<string>("");
  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null);
  const [editWorkerDays, setEditWorkerDays] = useState<string>("");
  const [editWorkerAmount, setEditWorkerAmount] = useState<string>("");
  const [editWorkerNotes, setEditWorkerNotes] = useState<string>("");

  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();

  const saveAutocompleteValue = async (field: string, value: string) => {
    if (!value || value.trim().length < 2) return;
    try {
      await apiRequest('/api/autocomplete', 'POST', {
        category: field,
        value: value.trim(),
        usageCount: 1
      });
    } catch (error) {
      console.warn(`Failed to save autocomplete value for ${field}:`, error);
    }
  };

  useEffect(() => {
    setSelectedDate(getCurrentDate());
  }, []);

  useEffect(() => {
    const handleSaveExpenses = () => {
      const saveButton = document.querySelector('[type="submit"]') as HTMLButtonElement;
      if (saveButton) {
        saveButton.click();
      }
    };
    setFloatingAction(handleSaveExpenses, "حفظ المصاريف");
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  const queryOptions = {
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  };

  const { data: workers = [] } = useQuery<Worker[]>({
    queryKey: ["/api/workers"],
    queryFn: async () => {
      const response = await apiRequest("/api/workers", "GET");
      return Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
    },
    ...queryOptions
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await apiRequest("/api/projects", "GET");
      return Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
    },
    ...queryOptions
  });

  const refreshAllData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    refetchFinancial();
  }, [queryClient, refetchFinancial]);

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
      try {
        const attendanceData = {
          workerId: selectedWorkerId,
          days: workerDays ? parseFloat(workerDays) : 0,
          amount: workerAmount ? parseFloat(workerAmount) : 0,
          notes: workerNotes,
          selectedDate,
          projectId: selectedProjectId
        };
        await queueForSync('create', '/api/worker-attendance', attendanceData);
        toast({ title: "تم الحفظ محليًا", description: "خطأ في الاتصال - سيتم المزامنة عند الاتصال" });
      } catch (queueError) {
        toast({ title: "خطأ", description: error?.message || "حدث خطأ أثناء إضافة الحضور", variant: "destructive" });
      }
    }
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">المصاريف اليومية</h1>
      {/* تطبيق بقية الـ UI هنا */}
    </div>
  );
}

export default function DailyExpenses() {
  return (
    <ErrorBoundary>
      <DailyExpensesContent />
    </ErrorBoundary>
  );
}
