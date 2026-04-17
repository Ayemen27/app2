import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Users, Banknote, Package, Truck, Receipt, Building2, Send, TrendingDown, Calculator, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { getCurrentDate, formatCurrency, formatDate, cleanNumber, fmtNum } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { exportTransactionsToExcel } from "@/components/ui/export-transactions-excel";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { queueForSync } from "@/offline/offline";
import type {
  WorkerAttendance,
  TransportationExpense,
  FundTransfer,
  InsertFundTransfer,
  InsertTransportationExpense,
  InsertDailyExpenseSummary,
  Worker,
  Project,
  Supplier,
  ProjectFundTransfer,
} from "@shared/schema";
import type { OverpaymentData } from "@/components/overpayment-split-dialog";
import type { FinancialGuardData } from "@/components/financial-guard-dialog";
import type { StatsRowConfig, FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";

export function useDailyExpenses() {
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

  const [transportCategory, setTransportCategory] = useState<string>("");

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

  const [workerTransferWorkerId, setWorkerTransferWorkerId] = useState<string>("");
  const [workerTransferAmount, setWorkerTransferAmount] = useState<string>("");
  const [workerTransferRecipientName, setWorkerTransferRecipientName] = useState<string>("");
  const [workerTransferRecipientPhone, setWorkerTransferRecipientPhone] = useState<string>("");
  const [workerTransferMethod, setWorkerTransferMethod] = useState<string>("hawaleh");
  const [workerTransferNumber, setWorkerTransferNumber] = useState<string>("");
  const [workerTransferSenderName, setWorkerTransferSenderName] = useState<string>("");
  const [workerTransferNotes, setWorkerTransferNotes] = useState<string>("");
  const [editingWorkerTransferId, setEditingWorkerTransferId] = useState<string | null>(null);

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

  const [editingProjectTransferId, setEditingProjectTransferId] = useState<string | null>(null);
  const [projectTransferFromId, setProjectTransferFromId] = useState<string>("");
  const [projectTransferToId, setProjectTransferToId] = useState<string>("");
  const [projectTransferAmount, setProjectTransferAmount] = useState<string>("");
  const [projectTransferReason, setProjectTransferReason] = useState<string>("");
  const [projectTransferDescription, setProjectTransferDescription] = useState<string>("");

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

  useEffect(() => {
    setSelectedDate(getCurrentDate());
  }, []);

  useEffect(() => {
    setFloatingAction(null);
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

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
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 180,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData: any) => previousData,
  };

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
        return [];
      }
    },
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
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

  const { data: projectTransfers = [], refetch: refetchProjectTransfers } = useQuery<(ProjectFundTransfer & { fromProjectName?: string; toProjectName?: string })[]>({
    queryKey: QUERY_KEYS.dailyProjectTransfers(isAllProjects ? "all" : selectedProjectId, selectedDate),
    queryFn: async () => {
      try {
        const project_id = isAllProjects ? "all" : selectedProjectId;
        const response = await apiRequest(`/api/daily-project-transfers?project_id=${project_id}&date=${selectedDate || ""}`, "GET");
        let transferData = [];
        if (response && response.data && Array.isArray(response.data)) {
          transferData = response.data;
        } else if (Array.isArray(response)) {
          transferData = response;
        }
        if (!Array.isArray(transferData)) return [];
        return transferData;
      } catch (error) {
        return [];
      }
    },
    enabled: !!selectedProjectId && !!selectedDate && showProjectTransfers,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 180,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const safeProjectTransfers = Array.isArray(projectTransfers) ? projectTransfers : [];

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
    return totalsValue.totalIncome + (parseFloat(String(totalsValue.carriedForwardBalance || 0)));
  }, [totalsValue]);

  const displayExpenses = useMemo(() => {
    return totalsValue.totalCashExpenses;
  }, [totalsValue]);

  const displayBalance = useMemo(() => {
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
          const totalUrl = selectedDate && selectedDate !== "null"
            ? `/api/projects/all-projects-total?date=${selectedDate}`
            : `/api/projects/all-projects-total`;
          const totalResponse = await apiRequest(totalUrl, "GET");
          const url = selectedDate && selectedDate !== "null"
            ? `/api/projects/all-projects-expenses?date=${selectedDate}`
            : `/api/projects/all-projects-expenses`;
          const response = await apiRequest(url, "GET");
          if (response && response.success && response.data) {
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
    if (dailyExpensesData?.carriedForwardBalance !== undefined) {
      return dailyExpensesData.carriedForwardBalance;
    }
    return totalsValue.carriedForwardBalance || 0;
  }, [totalsValue.carriedForwardBalance, dailyExpensesData]);

  const totalRemainingWithCarried = useMemo(() => {
    const carried = dailyExpensesData?.carriedForwardBalance !== undefined
      ? dailyExpensesData.carriedForwardBalance
      : (totalsValue.carriedForwardBalance || 0);
    return (totalsValue.totalIncome + carried) - totalsValue.totalCashExpenses;
  }, [totalsValue.totalIncome, totalsValue.totalCashExpenses, totalsValue.carriedForwardBalance, dailyExpensesData]);

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

  const refreshAllData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectsWithStats });
    refetchDailyExpenses();
    refetchProjectTransfers();
    refetchFinancial();
    refetchAttendance();
  }, [queryClient, refetchDailyExpenses, refetchProjectTransfers, refetchFinancial, refetchAttendance]);

  const {
    todayFundTransfers,
    todayWorkerAttendance,
    todayTransportation,
    todayMaterialPurchases,
    todayWorkerTransfers,
    todayMiscExpenses
  } = useMemo(() => {
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

  const safeAttendance = Array.isArray(todayWorkerAttendance) ? todayWorkerAttendance : [];
  const safeTransportation = Array.isArray(todayTransportation) ? todayTransportation : [];
  const safeMaterialPurchases = Array.isArray(todayMaterialPurchases) ? todayMaterialPurchases : [];
  const safeWorkerTransfers = Array.isArray(todayWorkerTransfers) ? todayWorkerTransfers : [];
  const safeMiscExpenses = Array.isArray(todayMiscExpenses) ? todayMiscExpenses : [];
  const safeFundTransfers = Array.isArray(todayFundTransfers) ? todayFundTransfers : [];

  useEffect(() => {
    setSelectedWellIds([]);
    setSelectedCrewTypes([]);
    setFundTransferWellId(undefined);
    setPurchaseWellIds([]);
    setPurchaseCrewTypes([]);
  }, [selectedProjectId]);

  useEffect(() => {
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

  const { data: previousBalance } = useQuery({
    queryKey: QUERY_KEYS.previousBalance(selectedProjectId, selectedDate),
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/projects/${selectedProjectId}/previous-balance/${selectedDate}`, "GET");
        if (response && response.data && response.data.balance !== undefined) {
          return response.data.balance || "0";
        }
        return response?.balance || "0";
      } catch (error) {
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

  useEffect(() => {
    if (previousBalance !== null && previousBalance !== undefined) {
      setCarriedForward(previousBalance);
    }
  }, [previousBalance]);

  useEffect(() => {
    if (selectedProjectId || isAllProjects) {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.projects,
        refetchType: 'none'
      });
    }
  }, [selectedProjectId, selectedDate, isAllProjects, queryClient]);

  useEffect(() => {
    const initializeDefaultTransferTypes = async () => {
      const defaultTypes = ['حولة بنكية', 'تسليم يدوي', 'صراف آلي', 'تحويل داخلي', 'شيك', 'نقدية'];
      for (const type of defaultTypes) {
        try {
          await saveAutocompleteValue('transferTypes', type);
        } catch (error) {
        }
      }
    };
    initializeDefaultTransferTypes();
  }, []);

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
        const attendancePayload = {
          worker_id: selectedWorkerId,
          days: workerDays ? parseFloat(workerDays) : 0,
          amount: workerAmount ? parseFloat(workerAmount) : 0,
          notes: workerNotes,
          selectedDate,
          project_id: selectedProjectId
        };
        await queueForSync('create', '/api/worker-attendance', attendancePayload);
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

    const attendancePayload = {
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
    addWorkerAttendanceMutation.mutate(attendancePayload);
  };

  const addFundTransferMutation = useMutation({
    mutationFn: async (data: InsertFundTransfer) => {
      await saveAllFundTransferAutocompleteValues();
      const dataWithWell = { ...data, well_id: fundTransferWellId || null };
      return apiRequest("/api/fund-transfers", "POST", dataWithWell);
    },
    onSuccess: async () => {
      refreshAllData();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });
      toast({ title: "تم إضافة العهدة", description: "تم إضافة تحويل العهدة بنجاح" });
      setFundAmount("");
      setSenderName("");
      setTransferNumber("");
      setTransferType("");
    },
    onError: async (error: any) => {
      await saveAllFundTransferAutocompleteValues();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });
      let errorMessage = "حدث خطأ أثناء إضافة الحولة";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
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

  const updateFundTransferMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`/api/fund-transfers/${id}`, "PATCH", data),
    onSuccess: async () => {
      refreshAllData();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dailyExpenses(selectedProjectId, selectedDate) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.previousBalance(selectedProjectId) });
      if (senderName) await saveAutocompleteValue('senderNames', senderName);
      if (transferNumber) await saveAutocompleteValue('transferNumbers', transferNumber);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });
      resetFundTransferForm();
      toast({ title: "تم التحديث", description: "تم تحديث العهدة بنجاح" });
    },
    onError: (error: any) => {
      let errorMessage = "حدث خطأ أثناء تحديث الحولة";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      toast({ title: "فشل في تحديث الحولة", description: errorMessage, variant: "destructive" });
    }
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
      toast({ title: "تم الحذف", description: "تم حذف العهدة بنجاح" });
    },
    onError: (error: any) => {
      let errorMessage = "حدث خطأ أثناء حذف الحولة";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      toast({ title: "فشل في حذف الحولة", description: errorMessage, variant: "destructive" });
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
    if (!selectedProjectId || isAllProjects) {
      toast({
        title: "يرجى تحديد مشروع",
        description: "لا يمكن إضافة تحويل عهدة على جميع المشاريع. يرجى اختيار مشروع محدد من الشريط العلوي أولاً",
        variant: "destructive",
      });
      return;
    }
    if (!fundAmount || fundAmount.trim() === "" || parseFloat(fundAmount) <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال مبلغ صحيح", variant: "destructive" });
      return;
    }
    if (!transferType || transferType.trim() === "") {
      toast({ title: "خطأ", description: "يرجى اختيار نوع التحويل", variant: "destructive" });
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
      updateFundTransferMutation.mutate({ id: editingFundTransferId, data: fundTransferData });
    } else {
      addFundTransferMutation.mutate(fundTransferData);
    }
  };

  const addTransportationMutation = useMutation({
    mutationFn: async (data: InsertTransportationExpense) => {
      if (transportDescription && transportDescription.trim().length >= 2) {
        await saveAutocompleteValue('transportDescriptions', transportDescription);
      }
      if (transportNotes && transportNotes.trim().length >= 2) {
        await saveAutocompleteValue('notes', transportNotes);
      }
      const dataWithWell = { ...data, well_id: selectedWellIds[0] || null, well_ids: selectedWellIds.length > 0 ? JSON.stringify(selectedWellIds) : null, crew_type: selectedCrewTypes.length > 0 ? JSON.stringify(selectedCrewTypes) : null, team_name: selectedTeamNames.length > 0 ? JSON.stringify(selectedTeamNames) : null };
      return apiRequest("/api/transportation-expenses", "POST", dataWithWell);
    },
    onSuccess: async () => {
      refreshAllData();
      queryClient.invalidateQueries({ queryKey: ['/api/autocomplete', 'transportDescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/autocomplete', 'notes'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });
      toast({ title: "تم إضافة المواصلات", description: "تم إضافة مصروف المواصلات بنجاح" });
      setTransportDescription("");
      setTransportAmount("");
      setTransportNotes("");
    },
    onError: async (error) => {
      if (transportDescription && transportDescription.trim().length >= 2) {
        saveAutocompleteValue('transportDescriptions', transportDescription).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });
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
          description: (error as any)?.message || "حدث خطأ أثناء إضافة مصروف المواصلات",
          variant: "destructive",
        });
      }
    },
  });

  const updateTransportationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`/api/transportation-expenses/${id}`, "PATCH", data),
    onSuccess: async () => {
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
      toast({ title: "تم التحديث", description: "تم تحديث مصروف المواصلات بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "حدث خطأ أثناء تحديث المصروف", variant: "destructive" });
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
      toast({ title: "تم الحذف", description: "تم حذف مصروف المواصلات بنجاح" });
    },
    onError: (error: any) => {
      let errorMessage = "حدث خطأ أثناء حذف مصروف المواصلات";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      toast({ title: "فشل في حذف مصروف المواصلات", description: errorMessage, variant: "destructive" });
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
      toast({ title: "خطأ", description: "يرجى ملء جميع البيانات المطلوبة", variant: "destructive" });
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
      updateTransportationMutation.mutate({ id: editingTransportationId, data: transportData });
    } else {
      addTransportationMutation.mutate(transportData);
    }
  };

  const saveDailySummaryMutation = useMutation({
    mutationFn: (data: InsertDailyExpenseSummary) => apiRequest("/api/daily-expense-summaries", "POST", data),
    onSuccess: () => {
      refreshAllData();
      toast({ title: "تم الحفظ", description: "تم حفظ ملخص المصروفات اليومية بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "حدث خطأ أثناء حفظ الملخص", variant: "destructive" });
    },
  });

  const deleteMaterialPurchaseMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/material-purchases/${id}`, "DELETE"),
    onMutate: () => {
      return { project_id: selectedProjectId, date: selectedDate };
    },
    onSuccess: (_, id, context) => {
      const { project_id, date } = context || { project_id: selectedProjectId, date: selectedDate };
      queryClient.setQueryData(QUERY_KEYS.dailyExpenses(project_id, date), (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          materialPurchases: oldData.materialPurchases?.filter((purchase: any) => purchase.id !== id) || []
        };
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dailyExpenses(project_id, date) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.materialPurchases(project_id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.previousBalance(project_id) });
      toast({ title: "تم الحذف", description: "تم حذف شراء المواد بنجاح" });
    },
    onError: (error: any) => {
      let errorMessage = "حدث خطأ أثناء حذف شراء المواد";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      toast({ title: "فشل في حذف شراء المواد", description: errorMessage, variant: "destructive" });
    }
  });

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
      toast({ title: "تم إضافة الشراء", description: "تم إضافة شراء المواد بنجاح" });
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
        toast({ title: "تم الحفظ محليًا", description: "خطأ في الاتصال - سيتم المزامنة عند الاتصال", variant: "default" });
      } catch (queueError) {
        toast({ title: "فشل في إضافة الشراء", description: error?.message || "حدث خطأ أثناء إضافة شراء المواد", variant: "destructive" });
      }
    },
  });

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
      toast({ title: "تم التحديث", description: "تم تحديث شراء المواد بنجاح" });
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
      toast({ title: "فشل في تحديث الشراء", description: error?.message || "حدث خطأ أثناء تحديث شراء المواد", variant: "destructive" });
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
      toast({ title: "يرجى تحديد مشروع", description: "لا يمكن إضافة شراء مواد على جميع المشاريع. يرجى اختيار مشروع محدد أولاً", variant: "destructive" });
      return;
    }
    if (!purchaseMaterialName || purchaseMaterialName.trim() === "") {
      toast({ title: "خطأ", description: "يرجى إدخال اسم المادة", variant: "destructive" });
      return;
    }
    if (!purchaseQuantity || parseFloat(purchaseQuantity) <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال كمية صحيحة", variant: "destructive" });
      return;
    }
    const isPriceRequired = purchaseType !== 'مخزن';
    if (isPriceRequired && (!purchaseUnitPrice || parseFloat(purchaseUnitPrice) <= 0)) {
      toast({ title: "خطأ", description: "يرجى إدخال سعر الوحدة", variant: "destructive" });
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
      updateMaterialPurchaseMutation.mutate({ id: editingMaterialPurchaseId, data: purchaseData });
    } else {
      addMaterialPurchaseMutation.mutate(purchaseData);
    }
  };

  const deleteWorkerAttendanceMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/worker-attendance/${id}`, "DELETE"),
    onMutate: () => ({ project_id: selectedProjectId, date: selectedDate }),
    onSuccess: (_, id, context) => {
      const { project_id, date } = context || { project_id: selectedProjectId, date: selectedDate };
      queryClient.setQueryData(QUERY_KEYS.dailyExpenses(project_id, date), (oldData: any) => {
        if (!oldData) return oldData;
        return { ...oldData, workerAttendance: oldData.workerAttendance?.filter((attendance: any) => attendance.id !== id) || [] };
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dailyExpenses(project_id, date) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectAttendance(project_id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.previousBalance(project_id) });
      toast({ title: "تم الحذف", description: "تم حذف حضور العامل بنجاح" });
    },
    onError: (error: any) => {
      let errorMessage = "حدث خطأ أثناء حذف حضور العامل";
      if (error?.response?.data?.message) errorMessage = error.response.data.message;
      else if (error?.response?.data?.error) errorMessage = error.response.data.error;
      else if (error?.message) errorMessage = error.message;
      else if (typeof error === 'string') errorMessage = error;
      toast({ title: "فشل في حذف حضور العامل", description: errorMessage, variant: "destructive" });
    }
  });

  const deleteWorkerTransferMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/worker-transfers/${id}`, "DELETE"),
    onMutate: () => ({ project_id: selectedProjectId, date: selectedDate }),
    onSuccess: (_, id, context) => {
      const { project_id, date } = context || { project_id: selectedProjectId, date: selectedDate };
      queryClient.setQueryData(QUERY_KEYS.dailyExpenses(project_id, date), (oldData: any) => {
        if (!oldData) return oldData;
        return { ...oldData, workerTransfers: oldData.workerTransfers?.filter((transfer: any) => transfer.id !== id) || [] };
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dailyExpenses(project_id, date) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.previousBalance(project_id) });
      toast({ title: "تم الحذف", description: "تم حذف حوالة العامل بنجاح" });
    },
    onError: (error: any) => {
      let errorMessage = "حدث خطأ أثناء حذف حوالة العامل";
      if (error?.response?.data?.message) errorMessage = error.response.data.message;
      else if (error?.response?.data?.error) errorMessage = error.response.data.error;
      else if (error?.message) errorMessage = error.message;
      else if (typeof error === 'string') errorMessage = error;
      toast({ title: "فشل في حذف حوالة العامل", description: errorMessage, variant: "destructive" });
    }
  });

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
      toast({ title: "تم إرسال الحوالة", description: "تم إرسال حوالة العامل بنجاح" });
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
            { label: 'الرصيد الحالي', value: formatCurrency(gd?.currentBalance ?? 0), color: (gd?.currentBalance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600' },
            { label: 'مبلغ التحويل', value: formatCurrency(gd?.transferAmount ?? 0), color: 'text-amber-600' },
            { label: 'الرصيد بعد التحويل', value: formatCurrency(gd?.resultingBalance ?? 0), color: 'text-red-600 font-bold' },
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
        toast({ title: "تم الحفظ محليًا", description: "خطأ في الاتصال - سيتم المزامنة عند الاتصال", variant: "default" });
      } catch (queueError) {
        toast({ title: "فشل في إرسال الحوالة", description: error?.message || "حدث خطأ أثناء إرسال حوالة العامل", variant: "destructive" });
      }
    },
  });

  const updateWorkerTransferMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`/api/worker-transfers/${id}`, "PATCH", data),
    onSuccess: async () => {
      refreshAllData();
      if (workerTransferRecipientName) await saveAutocompleteValue('recipientNames', workerTransferRecipientName);
      if (workerTransferRecipientPhone) await saveAutocompleteValue('recipientPhones', workerTransferRecipientPhone);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });
      resetWorkerTransferForm();
      toast({ title: "تم التحديث", description: "تم تحديث حوالة العامل بنجاح" });
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
      toast({ title: "فشل في تحديث الحوالة", description: error?.message || "حدث خطأ أثناء تحديث حوالة العامل", variant: "destructive" });
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
      toast({ title: "يرجى تحديد مشروع", description: "لا يمكن إرسال حوالة عامل على جميع المشاريع. يرجى اختيار مشروع محدد أولاً", variant: "destructive" });
      return;
    }
    if (!workerTransferWorkerId) {
      toast({ title: "خطأ", description: "يرجى اختيار العامل", variant: "destructive" });
      return;
    }
    if (!workerTransferAmount || parseFloat(workerTransferAmount) <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال مبلغ صحيح", variant: "destructive" });
      return;
    }
    if (!workerTransferRecipientName || workerTransferRecipientName.trim() === "") {
      toast({ title: "خطأ", description: "يرجى إدخال اسم المستقبل", variant: "destructive" });
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
      updateWorkerTransferMutation.mutate({ id: editingWorkerTransferId, data: transferData });
    } else {
      addWorkerTransferMutation.mutate(transferData);
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
      toast({ title: "خطأ", description: error?.message || "حدث خطأ أثناء حذف الترحيل", variant: "destructive" });
    }
  });

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
        toast({ title: "تم الحفظ محليًا", description: "خطأ في الاتصال - سيتم المزامنة عند الاتصال", variant: "default" });
      } catch (queueError) {
        toast({ title: "خطأ", description: error?.message || "حدث خطأ أثناء إضافة ترحيل الأموال", variant: "destructive" });
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
      toast({ title: "خطأ", description: error?.message || "حدث خطأ أثناء تحديث ترحيل الأموال", variant: "destructive" });
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

  const handleSaveSummary = () => {
    if (!selectedProjectId) {
      toast({ title: "خطأ", description: "يرجى اختيار المشروع أولاً", variant: "destructive" });
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

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 3,
      gap: 'sm',
      items: [
        { key: 'workerWages', label: 'أجور العمال', value: formatCurrency(totalsValue.totalWorkerWages), icon: Users, color: 'blue' },
        { key: 'fundTransfers', label: 'تحويلات العهدة', value: formatCurrency(totalsValue.totalFundTransfers), icon: Banknote, color: 'green' },
        { key: 'materials', label: 'المواد', value: formatCurrency(totalsValue.totalMaterialCosts), icon: Package, color: 'purple' },
      ]
    },
    {
      columns: 3,
      gap: 'sm',
      items: [
        { key: 'transportation', label: 'المواصلات', value: formatCurrency(totalsValue.totalTransportation), icon: Truck, color: 'orange' },
        { key: 'miscExpenses', label: 'النثريات', value: formatCurrency(totalsValue.totalMiscExpenses), icon: Receipt, color: 'amber' },
        {
          key: 'projectTransfers', label: 'الترحيل',
          splitValue: { incoming: totalsValue.incomingProjectTransfers, outgoing: totalsValue.outgoingProjectTransfers },
          value: formatCurrency(totalsValue.incomingProjectTransfers - totalsValue.outgoingProjectTransfers),
          icon: Building2, color: 'teal', isSplitCard: true,
        },
      ]
    },
    {
      columns: 3,
      gap: 'sm',
      items: [
        { key: 'workerTransfers', label: 'الحوالات', value: formatCurrency(totalsValue.totalWorkerTransfers), icon: Send, color: 'indigo' },
        { key: 'totalExpenses', label: 'المنصرف', value: formatCurrency(totalsValue.totalExpenses), icon: TrendingDown, color: 'red' },
        { key: 'remainingBalance', label: 'المتبقي', value: formatCurrency(totalsValue.totalBalance), icon: Calculator, color: totalsValue.totalBalance >= 0 ? 'emerald' : 'rose' },
      ]
    }
  ], [totalsValue]);

  const miscCategories = ["قرطاسية", "ضيافة", "اتصالات", "صيانة مكتب", "أخرى"];

  const filtersConfig: FilterConfig[] = useMemo(() => [
    { key: 'date', label: 'التاريخ', type: 'date', placeholder: 'اختر التاريخ' },
    { key: 'dateRange', label: 'نطاق التاريخ', type: 'date-range', placeholder: 'اختر نطاق التاريخ' },
    {
      key: 'type', label: 'نوع العملية', type: 'select', placeholder: 'جميع العمليات',
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
      key: 'transportCategory', label: 'فئة المواصلات', type: 'select', placeholder: 'جميع الفئات',
      options: [{ value: 'all', label: 'جميع الفئات' }, ...dynamicTransportCategories]
    },
    {
      key: 'miscCategory', label: 'فئة النثريات', type: 'select', placeholder: 'جميع الفئات',
      options: [{ value: 'all', label: 'جميع الفئات' }, ...miscCategories.map(cat => ({ value: cat, label: cat }))]
    }
  ], [dynamicTransportCategories]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dailyExpenses(selectedProjectId, selectedDate) });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportToExcel = useCallback(async () => {
    setIsExporting(true);
    try {
      const transactions: any[] = [];
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
      filteredFundTransfers.forEach((transfer: any) => {
        transactions.push({
          id: transfer.id, date: transfer.date || selectedDate || new Date().toISOString().split('T')[0],
          type: 'income', category: 'عهدة', amount: cleanNumber(transfer.amount),
          description: `عهدة من ${transfer.senderName || 'غير محدد'}`,
          project_id: transfer.project_id,
          projectName: projects.find(p => p.id === transfer.project_id)?.name || 'غير محدد',
          transferMethod: transfer.transferType, recipientName: transfer.senderName,
        });
      });
      safeProjectTransfers.forEach((transfer: any) => {
        const isIncoming = transfer.toProjectId === selectedProjectId;
        const fromProject = projects.find(p => p.id === transfer.fromProjectId);
        const toProject = projects.find(p => p.id === transfer.toProjectId);
        transactions.push({
          id: transfer.id, date: transfer.date || selectedDate || new Date().toISOString().split('T')[0],
          type: isIncoming ? 'transfer_from_project' : 'expense',
          category: isIncoming ? 'ترحيل وارد' : 'ترحيل صادر',
          amount: cleanNumber(transfer.amount),
          description: isIncoming ? `ترحيل من ${fromProject?.name || 'مشروع آخر'}` : `ترحيل إلى ${toProject?.name || 'مشروع آخر'}`,
          project_id: isIncoming ? transfer.fromProjectId : transfer.toProjectId,
          projectName: isIncoming ? fromProject?.name : toProject?.name,
        });
      });
      filteredAttendance.forEach((record: any) => {
        const worker = workers.find((w: any) => w.id === record.worker_id);
        const paidAmount = cleanNumber(record.paidAmount);
        const payableAmount = cleanNumber(record.payableAmount);
        const isDeferred = paidAmount === 0 && payableAmount > 0;
        transactions.push({
          id: record.id, date: record.date || selectedDate || new Date().toISOString().split('T')[0],
          type: isDeferred ? 'deferred' : 'expense', category: 'أجور عمال', amount: paidAmount,
          description: record.workDescription || 'أجر يومي',
          project_id: record.project_id,
          projectName: projects.find(p => p.id === record.project_id)?.name || 'غير محدد',
          workerName: worker?.name || 'غير محدد',
          workDays: cleanNumber(record.workDays) || undefined,
          dailyWage: cleanNumber(record.dailyWage) || undefined,
          payableAmount: payableAmount || undefined,
        });
      });
      filteredTransportation.forEach((expense: any) => {
        transactions.push({
          id: expense.id, date: expense.date || selectedDate || new Date().toISOString().split('T')[0],
          type: 'expense', category: 'مواصلات', amount: cleanNumber(expense.amount),
          description: expense.description || 'مصروف مواصلات',
          project_id: expense.project_id,
          projectName: projects.find(p => p.id === expense.project_id)?.name || 'غير محدد',
        });
      });
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
          id: purchase.id, date: purchase.date || selectedDate || new Date().toISOString().split('T')[0],
          type: transactionType, category: isStorage ? 'توريد مخزن' : 'مشتريات مواد',
          amount: transactionAmount, description: `شراء ${material?.name || 'مادة'}`,
          project_id: purchase.project_id,
          projectName: projects.find(p => p.id === purchase.project_id)?.name || 'غير محدد',
          materialName: material?.name || purchase.materialName,
          quantity: cleanNumber(purchase.quantity) || undefined,
          unitPrice: cleanNumber(purchase.unitPrice) || undefined,
          paymentType: purchase.purchaseType,
          supplierName: purchase.supplier || purchase.supplierName,
        });
      });
      filteredWorkerTransfers.forEach((transfer: any) => {
        const worker = workers.find((w: any) => w.id === transfer.worker_id);
        transactions.push({
          id: transfer.id, date: transfer.date || selectedDate || new Date().toISOString().split('T')[0],
          type: 'expense', category: 'حوالات عمال', amount: cleanNumber(transfer.amount),
          description: transfer.notes || 'حوالة للعامل',
          project_id: transfer.project_id,
          projectName: projects.find(p => p.id === transfer.project_id)?.name || 'غير محدد',
          workerName: worker?.name || 'غير محدد', recipientName: worker?.name,
        });
      });
      filteredMiscExpenses.forEach((expense: any) => {
        transactions.push({
          id: expense.id, date: expense.date || selectedDate || new Date().toISOString().split('T')[0],
          type: 'expense', category: 'نثريات', amount: cleanNumber(expense.amount),
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
      const currentProjectName = isAllProjects
        ? 'جميع المشاريع'
        : projects.find(p => p.id === selectedProjectId)?.name || 'المشروع';
      const downloadResult = await exportTransactionsToExcel(
        transactions, exportTotals, formatCurrency,
        `${currentProjectName}${selectedDate ? ` - ${selectedDate}` : ''}`
      );
      if (downloadResult) {
        toast({ title: "تم التصدير بنجاح", description: `تم تصدير ${transactions.length} عملية إلى ملف Excel` });
      } else {
        toast({ title: "تعذر التنزيل", description: "تم تجهيز الملف لكن فشل التنزيل. حاول مرة أخرى.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "فشل التصدير", description: "حدث خطأ أثناء تصدير البيانات", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  }, [
    filteredFundTransfers, filteredAttendance, filteredTransportation,
    filteredMaterialPurchases, filteredWorkerTransfers, filteredMiscExpenses,
    safeProjectTransfers, workers, materials, projects,
    selectedProjectId, selectedDate, isAllProjects, toast
  ]);

  const actionsConfig: ActionButton[] = useMemo(() => [
    {
      key: 'export', icon: FileSpreadsheet, label: 'تصدير Excel',
      onClick: handleExportToExcel, variant: 'outline',
      loading: isExporting, tooltip: 'تصدير البيانات المعروضة إلى ملف Excel',
    }
  ], [isExporting, handleExportToExcel]);

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

  return {
    toast,
    selectedProjectId, selectProject, isAllProjects, isWellsProject,
    selectedDate, setSelectedDate, carriedForward, setCarriedForward,
    showProjectTransfers, searchValue, setSearchValue,
    filterValues, handleFilterChange, handleResetFilters,
    isExporting, isRefreshing,
    selectedWellIds, setSelectedWellIds,
    selectedCrewTypes, setSelectedCrewTypes,
    selectedTeamNames, setSelectedTeamNames,
    purchaseCrewTypes, setPurchaseCrewTypes,
    purchaseTeamNames, setPurchaseTeamNames,
    isAddFormOpen, setIsAddFormOpen,
    isFundTransfersExpanded, setIsFundTransfersExpanded,
    isTransportationExpanded, setIsTransportationExpanded,
    isAttendanceExpanded, setIsAttendanceExpanded,
    isMaterialsExpanded, setIsMaterialsExpanded,
    isWorkerTransfersExpanded, setIsWorkerTransfersExpanded,
    isProjectTransfersExpanded, setIsProjectTransfersExpanded,
    isSummaryExpanded, setIsSummaryExpanded,
    isMiscExpanded, setIsMiscExpanded,
    dynamicTransportCategories,
    fundAmount, setFundAmount,
    senderName, setSenderName,
    transferNumber, setTransferNumber,
    transferType, setTransferType,
    editingFundTransferId, fundTransferWellId,
    transportDescription, setTransportDescription,
    transportAmount, setTransportAmount,
    transportNotes, setTransportNotes,
    editingTransportationId, transportCategory, setTransportCategory,
    purchaseMaterialName, setPurchaseMaterialName,
    purchaseQuantity, setPurchaseQuantity,
    purchaseUnit, setPurchaseUnit,
    purchaseUnitPrice, setPurchaseUnitPrice,
    purchaseTotalAmount, setPurchaseTotalAmount,
    purchaseType, setPurchaseType,
    purchaseSupplierName, setPurchaseSupplierName,
    purchaseNotes, setPurchaseNotes,
    purchaseWellIds, setPurchaseWellIds,
    editingMaterialPurchaseId,
    workerTransferWorkerId, setWorkerTransferWorkerId,
    workerTransferAmount, setWorkerTransferAmount,
    workerTransferRecipientName, setWorkerTransferRecipientName,
    workerTransferRecipientPhone, setWorkerTransferRecipientPhone,
    workerTransferMethod, setWorkerTransferMethod,
    workerTransferNumber, setWorkerTransferNumber,
    workerTransferSenderName, setWorkerTransferSenderName,
    workerTransferNotes, setWorkerTransferNotes,
    editingWorkerTransferId,
    selectedWorkerId, setSelectedWorkerId,
    workerDays, setWorkerDays,
    workerAmount, setWorkerAmount,
    workerNotes, setWorkerNotes,
    editingAttendanceId, setEditingAttendanceId,
    showOverpaymentDialog, setShowOverpaymentDialog,
    overpaymentData, setOverpaymentData,
    showGuardTransferDialog, setShowGuardTransferDialog,
    guardTransferData, setGuardTransferData,
    showGuardPurchaseDialog, setShowGuardPurchaseDialog,
    guardPurchaseData, setGuardPurchaseData,
    editingProjectTransferId,
    projectTransferFromId, setProjectTransferFromId,
    projectTransferToId, setProjectTransferToId,
    projectTransferAmount, setProjectTransferAmount,
    projectTransferReason, setProjectTransferReason,
    projectTransferDescription, setProjectTransferDescription,
    workers, projects, suppliers, activeSuppliers, materials, projectWells,
    availableWorkers, workerMiscExpenses,
    safeFundTransfers, safeTransportation, safeMaterialPurchases,
    safeWorkerTransfers, safeMiscExpenses, safeAttendance, safeProjectTransfers,
    filteredFundTransfers, filteredAttendance, filteredTransportation,
    filteredMaterialPurchases, filteredWorkerTransfers, filteredMiscExpenses,
    dailyExpensesData, dailyExpensesLoading, dailyExpensesError,
    totals, totalsValue, financialSummary, summaryLoading, displayBalance,
    carriedForwardDisplay,
    statsRowsConfig, filtersConfig, actionsConfig,
    nextDate, prevDate,
    handleAddFundTransfer, handleEditFundTransfer, resetFundTransferForm,
    addFundTransferMutation, updateFundTransferMutation, deleteFundTransferMutation,
    handleAddTransportation, handleEditTransportation, resetTransportationForm,
    addTransportationMutation, updateTransportationMutation, deleteTransportationMutation,
    handleQuickAddAttendance,
    addWorkerAttendanceMutation, updateWorkerAttendanceMutation, deleteWorkerAttendanceMutation,
    handleAddMaterialPurchase, handleEditMaterialPurchase, resetMaterialPurchaseForm,
    addMaterialPurchaseMutation, updateMaterialPurchaseMutation, deleteMaterialPurchaseMutation,
    handleAddWorkerTransfer, handleEditWorkerTransfer, resetWorkerTransferForm,
    addWorkerTransferMutation, updateWorkerTransferMutation, deleteWorkerTransferMutation,
    handleAddProjectTransfer, handleEditProjectTransfer, resetProjectTransferForm,
    addProjectTransferMutation, updateProjectTransferMutation, deleteProjectTransferMutation,
    handleSaveSummary, saveDailySummaryMutation,
    handleRefresh, handleExportToExcel,
    refreshAllData,
    summaryData, dataIndicators, totalDataSections, sectionsWithData,
  };
}
