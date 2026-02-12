import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from "@/constants/queryKeys";

interface RefreshOptions {
  projectId?: string;
  date?: string;
  immediate?: boolean;
}

const CORE_KEYS = {
  projects: QUERY_KEYS.projects,
  projectsWithStats: QUERY_KEYS.projectsWithStats,
  workers: QUERY_KEYS.workers,
  transportationExpenses: QUERY_KEYS.transportationExpenses,
  workerMiscExpenses: QUERY_KEYS.workerMiscExpenses,
  suppliers: QUERY_KEYS.suppliers,
  dailyExpenseSummaries: QUERY_KEYS.dailyExpenseSummaries,
  materials: QUERY_KEYS.materials,
  notifications: QUERY_KEYS.notifications,
} as const;

export function useInstantRefresh() {
  const queryClient = useQueryClient();
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const cancelDebounce = useCallback((key: string) => {
    const timer = debounceTimers.current.get(key);
    if (timer) {
      clearTimeout(timer);
      debounceTimers.current.delete(key);
    }
  }, []);

  const instantRefetch = useCallback(async (queryKey: readonly unknown[]) => {
    await queryClient.invalidateQueries({ 
      queryKey: queryKey as string[], 
      refetchType: 'active',
      exact: false
    });
    
    await queryClient.refetchQueries({
      queryKey: queryKey as string[],
      type: 'active',
      exact: false
    });
  }, [queryClient]);

  const refreshProjectData = useCallback(async (options: RefreshOptions = {}) => {
    const { projectId, date, immediate = true } = options;
    
    const refreshTasks: Promise<void>[] = [];

    if (projectId && projectId !== 'all') {
      refreshTasks.push(
        instantRefetch(QUERY_KEYS.dailyExpenses(projectId, date)),
        instantRefetch(QUERY_KEYS.previousBalance(projectId, date)),
        instantRefetch(QUERY_KEYS.workerAttendanceAll(projectId)),
        instantRefetch(QUERY_KEYS.materialPurchases(projectId)),
      );
    }

    refreshTasks.push(
      instantRefetch(QUERY_KEYS.projectsWithStats),
      instantRefetch(QUERY_KEYS.projects),
    );

    if (immediate) {
      await Promise.all(refreshTasks);
    } else {
      Promise.all(refreshTasks);
    }
  }, [instantRefetch]);

  const refreshOnProjectChange = useCallback(async (projectId: string, projectName?: string) => {
    queryClient.cancelQueries();
    
    const allKeys = Object.values(CORE_KEYS);
    
    await Promise.all(
      allKeys.map(key => 
        queryClient.invalidateQueries({ 
          queryKey: key, 
          refetchType: 'all',
          exact: false 
        })
      )
    );

    if (projectId && projectId !== 'all') {
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key.some(k => k === projectId);
        },
        refetchType: 'all'
      });
    }

    await Promise.all(
      allKeys.map(key => 
        queryClient.refetchQueries({ 
          queryKey: key, 
          type: 'active',
          exact: false
        })
      )
    );
  }, [queryClient]);

  const refreshOnDateChange = useCallback(async (projectId: string, date: string) => {
    const dateKeys = [
      QUERY_KEYS.dailyExpenses(projectId, date),
      QUERY_KEYS.previousBalance(projectId, date),
      QUERY_KEYS.dailySummary(projectId, date),
      QUERY_KEYS.dailyProjectTransfers(projectId, date),
    ];

    await Promise.all(
      dateKeys.map(key => instantRefetch(key))
    );
  }, [instantRefetch]);

  const refreshOnMutation = useCallback(async (
    entityType: keyof typeof CORE_KEYS,
    projectId?: string,
    date?: string
  ) => {
    const entityKey = CORE_KEYS[entityType];
    if (entityKey) {
      await instantRefetch(entityKey);
    }
    
    await instantRefetch(QUERY_KEYS.projectsWithStats);
    
    if (projectId && date) {
      await refreshOnDateChange(projectId, date);
    }
  }, [instantRefetch, refreshOnDateChange]);

  const refreshAll = useCallback(async () => {
    const allKeys = Object.values(CORE_KEYS);
    await Promise.all(
      allKeys.map(key =>
        queryClient.invalidateQueries({
          queryKey: key,
          refetchType: 'active',
          exact: false,
        })
      )
    );
    
    await queryClient.refetchQueries({ type: 'active' });
  }, [queryClient]);

  const setQueryData = useCallback(<T>(
    queryKey: readonly unknown[],
    updater: T | ((old: T | undefined) => T)
  ) => {
    queryClient.setQueryData(queryKey, updater);
  }, [queryClient]);

  const getQueryData = useCallback(<T>(queryKey: readonly unknown[]): T | undefined => {
    return queryClient.getQueryData<T>(queryKey);
  }, [queryClient]);

  return {
    instantRefetch,
    refreshProjectData,
    refreshOnProjectChange,
    refreshOnDateChange,
    refreshOnMutation,
    refreshAll,
    setQueryData,
    getQueryData,
    QUERY_KEYS,
  };
}

export { QUERY_KEYS };
