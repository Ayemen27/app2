/**
 * Hook موحد للملخص المالي
 * Unified Financial Summary Hook
 * 
 * هذا الـ Hook هو المصدر الوحيد للحقيقة لجميع الحسابات المالية في الواجهة الأمامية
 * يستخدم /api/financial-summary كمصدر موحد للبيانات
 */

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface ExpenseSummary {
  materialExpenses: number;
  materialExpensesCredit: number;
  workerWages: number;
  transportExpenses: number;
  workerTransfers: number;
  miscExpenses: number;
  outgoingProjectTransfers: number;
  totalCashExpenses: number;
  totalAllExpenses: number;
}

export interface IncomeSummary {
  fundTransfers: number;
  incomingProjectTransfers: number;
  totalIncome: number;
}

export interface WorkerStats {
  totalWorkers: number;
  activeWorkers: number;
  completedDays: number;
}

export interface ProjectFinancialSummary {
  projectId: string;
  projectName: string;
  status: string;
  description: string | null;
  expenses: ExpenseSummary;
  income: IncomeSummary;
  workers: WorkerStats;
  cashBalance: number;
  totalBalance: number;
  counts: {
    materialPurchases: number;
    workerAttendance: number;
    transportationExpenses: number;
    workerTransfers: number;
    miscExpenses: number;
    fundTransfers: number;
  };
  lastUpdated: string;
  date?: string;
}

export interface AllProjectsSummary {
  projects: ProjectFinancialSummary[];
  totals: {
    totalIncome: number;
    totalCashExpenses: number;
    totalAllExpenses: number;
    cashBalance: number;
    totalBalance: number;
    totalWorkers: number;
    activeWorkers: number;
    materialExpensesCredit: number;
  };
  projectsCount: number;
}

interface UseFinancialSummaryOptions {
  projectId?: string | null;
  date?: string | null;
  enabled?: boolean;
}

export function useFinancialSummary(options: UseFinancialSummaryOptions = {}) {
  const { projectId, date, enabled = true } = options;

  const queryKey = projectId && projectId !== 'all'
    ? ["/api/financial-summary", projectId, date]
    : ["/api/financial-summary", "all", date];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        let url = "/api/financial-summary";
        const params = new URLSearchParams();

        if (projectId && projectId !== 'all') {
          params.append("projectId", projectId);
        }
        if (date) {
          params.append("date", date);
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const response = await apiRequest(url, "GET");

        if (response?.success && response?.data) {
          return response.data;
        }

        return null;
      } catch (error) {
        console.error("❌ [useFinancialSummary] خطأ في جلب الملخص المالي:", error);
        throw error;
      }
    },
    enabled,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });

  const isAllProjects = !projectId || projectId === 'all';

  if (isAllProjects && data) {
    const allProjectsData = data as AllProjectsSummary;
    return {
      summary: null as ProjectFinancialSummary | null,
      allProjects: allProjectsData,
      totals: {
        ...allProjectsData.totals,
        totalExpenses: allProjectsData.totals.totalCashExpenses,
        currentBalance: allProjectsData.totals.cashBalance
      },
      isLoading,
      error,
      refetch
    };
  }

  return {
    summary: data as ProjectFinancialSummary | null,
    allProjects: null as AllProjectsSummary | null,
    totals: data ? {
      totalIncome: (data as ProjectFinancialSummary).income.totalIncome,
      totalCashExpenses: (data as ProjectFinancialSummary).expenses.totalCashExpenses,
      totalAllExpenses: (data as ProjectFinancialSummary).expenses.totalAllExpenses,
      totalExpenses: (data as ProjectFinancialSummary).expenses.totalCashExpenses,
      cashBalance: (data as ProjectFinancialSummary).cashBalance,
      totalBalance: (data as ProjectFinancialSummary).totalBalance,
      currentBalance: (data as ProjectFinancialSummary).cashBalance,
      totalWorkers: (data as ProjectFinancialSummary).workers.totalWorkers,
      activeWorkers: (data as ProjectFinancialSummary).workers.activeWorkers,
      materialExpensesCredit: (data as ProjectFinancialSummary).expenses.materialExpensesCredit
    } : null,
    isLoading,
    error,
    refetch
  };
}

export default useFinancialSummary;
