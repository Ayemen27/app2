import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
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

  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedWellId, setSelectedWellId] = useState<number | undefined>();
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isFundTransfersExpanded, setIsFundTransfersExpanded] = useState(false);
  const [isTransportationExpanded, setIsTransportationExpanded] = useState(false);
  const [isAttendanceExpanded, setIsAttendanceExpanded] = useState(false);
  const [isMaterialsExpanded, setIsMaterialsExpanded] = useState(false);
  const [isWorkerTransfersExpanded, setIsWorkerTransfersExpanded] = useState(false);
  const [isProjectTransfersExpanded, setIsProjectTransfersExpanded] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [isMiscExpanded, setIsMiscExpanded] = useState(false);

  // Queries for basic data
  const { data: workers = [] } = useQuery<Worker[]>({
    queryKey: ["/api/workers"],
    queryFn: async () => {
      const response = await apiRequest("/api/workers", "GET");
      return Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
    }
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await apiRequest("/api/projects", "GET");
      return Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
    }
  });

  const { data: materials = [] } = useQuery({
    queryKey: ["/api/materials"],
    queryFn: async () => {
      const response = await apiRequest("/api/materials", "GET");
      return response?.data || response || [];
    }
  });

  const { 
    summary: financialSummary, 
    refetch: refetchFinancial 
  } = useFinancialSummary({
    projectId: selectedProjectId === 'all' ? 'all' : selectedProjectId,
    date: selectedDate && selectedDate !== "null" ? selectedDate : undefined,
    dateFrom: filterValues.dateRange?.from ? formatDate(filterValues.dateRange.from) : undefined,
    dateTo: filterValues.dateRange?.to ? formatDate(filterValues.dateRange.to) : undefined,
    enabled: isAllProjects || !!selectedProjectId
  });

  const { 
    data: dailyExpensesData, 
    refetch: refetchDailyExpenses 
  } = useQuery<any>({
    queryKey: ["/api/projects", isAllProjects ? "all-projects" : selectedProjectId, selectedDate ? "daily-expenses" : "all-expenses", selectedDate],
    queryFn: async () => {
      if (isAllProjects) {
        const totalUrl = selectedDate && selectedDate !== "null" ? `/api/projects/all-projects-total?date=${selectedDate}` : `/api/projects/all-projects-total`;
        const totalResponse = await apiRequest(totalUrl, "GET");
        const url = selectedDate && selectedDate !== "null" ? `/api/projects/all-projects-expenses?date=${selectedDate}` : `/api/projects/all-projects-expenses`;
        const response = await apiRequest(url, "GET");
        if (response && response.success && response.data) {
          return { ...response.data, carriedForwardBalance: totalResponse?.data?.carriedForwardBalance || 0 };
        }
        return response?.data || response || {};
      }
      const url = selectedDate && selectedDate !== "null" ? `/api/projects/${selectedProjectId}/daily-expenses?date=${selectedDate}` : `/api/projects/${selectedProjectId}/daily-expenses`;
      const response = await apiRequest(url, "GET");
      return response?.data || response || {};
    },
    enabled: (!!selectedProjectId || isAllProjects) && !!selectedDate
  });

  const { data: projectTransfers = [], refetch: refetchProjectTransfers } = useQuery<any[]>({
    queryKey: ["/api/daily-project-transfers", selectedProjectId, selectedDate],
    queryFn: async () => {
      const response = await apiRequest(`/api/daily-project-transfers?projectId=${selectedProjectId}&date=${selectedDate || ""}`, "GET");
      return Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
    },
    enabled: !!selectedProjectId && !!selectedDate && showProjectTransfers
  });

  // Safe data extraction
  const safeFundTransfers = Array.isArray(dailyExpensesData?.fundTransfers) ? dailyExpensesData.fundTransfers : [];
  const safeAttendance = Array.isArray(dailyExpensesData?.workerAttendance) ? dailyExpensesData.workerAttendance : [];
  const safeTransportation = Array.isArray(dailyExpensesData?.transportationExpenses) ? dailyExpensesData.transportationExpenses : [];
  const safeMaterialPurchases = Array.isArray(dailyExpensesData?.materialPurchases) ? dailyExpensesData.materialPurchases : [];
  const safeWorkerTransfers = Array.isArray(dailyExpensesData?.workerTransfers) ? dailyExpensesData.workerTransfers : [];
  const safeMiscExpenses = Array.isArray(dailyExpensesData?.miscExpenses) ? dailyExpensesData.miscExpenses : [];
  const safeProjectTransfers = Array.isArray(projectTransfers) ? projectTransfers : [];

  // Filtered lists
  const filteredFundTransfers = useMemo(() => {
    if (!searchValue.trim()) return safeFundTransfers;
    const searchLower = searchValue.toLowerCase().trim();
    return safeFundTransfers.filter((t: any) => 
      t.senderName?.toLowerCase().includes(searchLower) ||
      t.transferType?.toLowerCase().includes(searchLower) ||
      t.transferNumber?.toLowerCase().includes(searchLower) ||
      t.amount?.toString().includes(searchLower)
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
    let filtered = safeTransportation;
    if (searchValue.trim()) {
      const searchLower = searchValue.toLowerCase().trim();
      filtered = filtered.filter((e: any) => 
        e.description?.toLowerCase().includes(searchLower) ||
        e.notes?.toLowerCase().includes(searchLower) ||
        e.amount?.toString().includes(searchLower)
      );
    }
    if (filterValues.transportCategory && filterValues.transportCategory !== 'all') {
      filtered = filtered.filter((e: any) => e.category?.toLowerCase() === filterValues.transportCategory.toLowerCase());
    }
    return filtered;
  }, [safeTransportation, searchValue, filterValues.transportCategory]);

  const filteredMaterials = useMemo(() => {
    let filtered = safeMaterialPurchases;
    if (searchValue.trim()) {
      const searchLower = searchValue.toLowerCase().trim();
      filtered = filtered.filter((p: any) => {
        const material = materials.find((m: any) => m.id === p.materialId);
        return (
          material?.name?.toLowerCase().includes(searchLower) ||
          p.supplier?.toLowerCase().includes(searchLower) ||
          p.notes?.toLowerCase().includes(searchLower) ||
          p.totalAmount?.toString().includes(searchLower)
        );
      });
    }
    return filtered;
  }, [safeMaterialPurchases, materials, searchValue]);

  const filteredWorkerTransfers = useMemo(() => {
    if (!searchValue.trim()) return safeWorkerTransfers;
    const searchLower = searchValue.toLowerCase().trim();
    return safeWorkerTransfers.filter((t: any) => {
      const worker = workers.find((w: any) => w.id === t.workerId);
      return (
        worker?.name?.toLowerCase().includes(searchLower) ||
        t.notes?.toLowerCase().includes(searchLower) ||
        t.amount?.toString().includes(searchLower)
      );
    });
  }, [safeWorkerTransfers, workers, searchValue]);

  const filteredMiscExpenses = useMemo(() => {
    if (!searchValue.trim()) return safeMiscExpenses;
    const searchLower = searchValue.toLowerCase().trim();
    return safeMiscExpenses.filter((e: any) => 
      e.description?.toLowerCase().includes(searchLower) ||
      e.notes?.toLowerCase().includes(searchLower) ||
      e.amount?.toString().includes(searchLower)
    );
  }, [safeMiscExpenses, searchValue]);

  const filteredProjectTransfers = useMemo(() => {
    if (!searchValue.trim()) return safeProjectTransfers;
    const searchLower = searchValue.toLowerCase().trim();
    return safeProjectTransfers.filter((t: any) => 
      t.fromProjectName?.toLowerCase().includes(searchLower) ||
      t.toProjectName?.toLowerCase().includes(searchLower) ||
      t.amount?.toString().includes(searchLower)
    );
  }, [safeProjectTransfers, searchValue]);

  const filteredOutgoingProjectTransfers = useMemo(() => {
    return safeProjectTransfers.filter(t => t.fromProjectId === selectedProjectId);
  }, [safeProjectTransfers, selectedProjectId]);

  // Totals calculation
  const totalsValue = useMemo(() => {
    const totalIncome = filteredFundTransfers.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
    const incomingProjectTransfers = filteredProjectTransfers.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
    const workerWages = filteredAttendance.reduce((sum, a) => sum + parseFloat(a.paidAmount || '0'), 0);
    const transportExpenses = filteredTransportation.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
    const materialExpenses = filteredMaterials.reduce((sum, m) => sum + parseFloat(m.totalAmount || '0'), 0);
    const workerTransfers = filteredWorkerTransfers.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
    const miscExpenses = filteredMiscExpenses.reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);
    const outgoingProjectTransfers = filteredOutgoingProjectTransfers.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);

    const totalCashExpenses = workerWages + transportExpenses + materialExpenses + workerTransfers + miscExpenses + outgoingProjectTransfers;
    const totalAllIncome = totalIncome + incomingProjectTransfers;
    const carried = dailyExpensesData?.carriedForwardBalance || financialSummary?.income?.carriedForwardBalance || 0;

    return {
      totalIncome,
      totalCashExpenses,
      carriedForwardBalance: carried,
      cashBalance: (totalAllIncome + carried) - totalCashExpenses,
      totalWorkers: filteredAttendance.length,
      activeWorkers: new Set(filteredAttendance.map(a => a.workerId)).size,
      totalWorkerWages: workerWages,
      totalTransportation: transportExpenses,
      totalMaterialCosts: materialExpenses,
      totalWorkerTransfers: workerTransfers,
      totalMiscExpenses: miscExpenses,
      totalFundTransfers: totalIncome,
      incomingProjectTransfers,
      outgoingProjectTransfers
    };
  }, [
    filteredFundTransfers, filteredProjectTransfers, filteredAttendance, 
    filteredMaterials, filteredWorkerTransfers, filteredMiscExpenses, 
    filteredTransportation, filteredOutgoingProjectTransfers, 
    dailyExpensesData, financialSummary
  ]);

  // Rest of the component logic...
  // (Forms, Mutations, and Return JSX would follow here)
  return <div>Daily Expenses Page (Fixing...)</div>;
}

export default function DailyExpenses() {
  return (
    <ErrorBoundary>
      <DailyExpensesContent />
    </ErrorBoundary>
  );
}
