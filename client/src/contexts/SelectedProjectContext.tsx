import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryClient as globalQueryClient } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { getFetchCredentials, getClientPlatformHeader, getAuthHeaders } from '@/lib/auth-token-store';

const SELECTED_PROJECT_KEY = "construction-app-selected-project";
const SELECTED_PROJECT_NAME_KEY = "construction-app-selected-project-name";
const WELLS_PROJECT_TYPE_IDS = [1, 8];

export const ALL_PROJECTS_ID = "all";
export const ALL_PROJECTS_NAME = "جميع المشاريع";

const ALL_QUERY_KEYS = [
  QUERY_KEYS.projects,
  QUERY_KEYS.projectsWithStats,
  QUERY_KEYS.workers,
  QUERY_KEYS.workerTypes,
  QUERY_KEYS.materials,
  QUERY_KEYS.projectFundTransfers,
  QUERY_KEYS.transportationExpenses,
  QUERY_KEYS.workerMiscExpenses,
  QUERY_KEYS.suppliers,
  QUERY_KEYS.dailyExpenseSummaries,
  QUERY_KEYS.notifications,
];

interface Project {
  id: string;
  name: string;
  status?: string;
  budget?: number;
  project_type_id?: number | null;
}

interface SelectedProjectContextType {
  selectedProjectId: string;
  selectedProjectName: string;
  isLoading: boolean;
  isAllProjects: boolean;
  selectProject: (project_id: string, projectName?: string) => void;
  clearProject: () => void;
  selectAllProjects: () => void;
  hasStoredProject: () => boolean;
  getProjectIdForApi: () => string | undefined;
  projects: Project[];
  projectsError: Error | null;
  isProjectsLoading: boolean;
  refreshAllData: () => Promise<void>;
  isWellsProject: boolean;
}

const SelectedProjectContext = createContext<SelectedProjectContextType | null>(null);

interface SelectedProjectProviderProps {
  children: ReactNode;
}

export function SelectedProjectProvider({ children }: SelectedProjectProviderProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(ALL_PROJECTS_ID);
  const [selectedProjectName, setSelectedProjectName] = useState<string>(ALL_PROJECTS_NAME);
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();

  const { data: projectsData, isLoading: isProjectsLoading, error: projectsError } = useQuery<Project[]>({
    queryKey: QUERY_KEYS.projects,
    queryFn: async () => {
      const response = await fetch("/api/projects", {
        credentials: getFetchCredentials(),
        headers: {
          ...getClientPlatformHeader(),
          ...getAuthHeaders(),
        }
      });
      if (!response.ok) {
        throw new Error("فشل في جلب المشاريع");
      }
      const data = await response.json();
      return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    },
    staleTime: 1000 * 5,
    gcTime: 1000 * 60 * 2,
    retry: 2,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const projects = useMemo(() => {
    if (Array.isArray(projectsData)) {
      return projectsData;
    }
    return [];
  }, [projectsData]);

  useEffect(() => {
    try {
      const savedProjectId = localStorage.getItem(SELECTED_PROJECT_KEY);
      const savedProjectName = localStorage.getItem(SELECTED_PROJECT_NAME_KEY);
      
      if (savedProjectId && savedProjectId !== "undefined" && savedProjectId !== "null") {
        setSelectedProjectId(savedProjectId);
        if (savedProjectName) {
          setSelectedProjectName(savedProjectName);
        }
      } else {
        setSelectedProjectId(ALL_PROJECTS_ID);
        setSelectedProjectName(ALL_PROJECTS_NAME);
      }
    } catch (error) {
      localStorage.removeItem(SELECTED_PROJECT_KEY);
      localStorage.removeItem(SELECTED_PROJECT_NAME_KEY);
      setSelectedProjectId(ALL_PROJECTS_ID);
      setSelectedProjectName(ALL_PROJECTS_NAME);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const isLoading = !isInitialized || isProjectsLoading;

  const instantRefreshAllData = useCallback(async (project_id?: string) => {
    console.log("⚡ [SelectedProjectContext] تحديث فوري لجميع البيانات...", project_id);
    
    const startTime = Date.now();
    
    await queryClient.cancelQueries();
    
    const invalidatePromises = ALL_QUERY_KEYS.map(key => 
      queryClient.invalidateQueries({ 
        queryKey: key, 
        refetchType: 'all',
        exact: false 
      })
    );
    
    if (project_id && project_id !== ALL_PROJECTS_ID) {
      invalidatePromises.push(
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return Array.isArray(key) && key.some(k => String(k) === project_id);
          },
          refetchType: 'all'
        })
      );
    }
    
    await Promise.all(invalidatePromises);
    
    await queryClient.refetchQueries({ 
      type: 'active',
      exact: false
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ [SelectedProjectContext] تم تحديث جميع البيانات في ${duration}ms`);
  }, [queryClient]);

  const selectProject = useCallback(async (project_id: string, projectName?: string) => {
    console.log("📁 [SelectedProjectContext] تحديد المشروع الفوري:", { project_id, projectName });
    
    setSelectedProjectId(project_id);
    
    if (projectName) {
      setSelectedProjectName(projectName);
    } else if (project_id === ALL_PROJECTS_ID) {
      setSelectedProjectName(ALL_PROJECTS_NAME);
    }
    
    try {
      if (project_id && project_id !== "undefined" && project_id !== "null") {
        localStorage.setItem(SELECTED_PROJECT_KEY, project_id);
        if (projectName) {
          localStorage.setItem(SELECTED_PROJECT_NAME_KEY, projectName);
        } else if (project_id === ALL_PROJECTS_ID) {
          localStorage.setItem(SELECTED_PROJECT_NAME_KEY, ALL_PROJECTS_NAME);
        }
      } else {
        localStorage.removeItem(SELECTED_PROJECT_KEY);
        localStorage.removeItem(SELECTED_PROJECT_NAME_KEY);
        setSelectedProjectName("");
      }
    } catch (error) {
      console.error("❌ [SelectedProjectContext] خطأ في حفظ المشروع:", error);
    }

    await instantRefreshAllData(project_id);
  }, [instantRefreshAllData]);

  const selectAllProjects = useCallback(() => {
    selectProject(ALL_PROJECTS_ID, ALL_PROJECTS_NAME);
  }, [selectProject]);

  const clearProject = useCallback(() => {
    console.log("🗑️ [SelectedProjectContext] مسح تحديد المشروع");
    selectProject(ALL_PROJECTS_ID, ALL_PROJECTS_NAME);
  }, [selectProject]);

  const hasStoredProject = useCallback(() => {
    try {
      const storedId = localStorage.getItem(SELECTED_PROJECT_KEY);
      return !!(storedId && storedId !== "undefined" && storedId !== "null" && storedId !== ALL_PROJECTS_ID);
    } catch {
      return false;
    }
  }, []);

  const getProjectIdForApi = useCallback((): string | undefined => {
    if (selectedProjectId === ALL_PROJECTS_ID || !selectedProjectId) {
      return undefined;
    }
    return selectedProjectId;
  }, [selectedProjectId]);

  const isAllProjects = selectedProjectId === ALL_PROJECTS_ID;

  const refreshAllData = useCallback(async () => {
    await instantRefreshAllData(selectedProjectId);
  }, [instantRefreshAllData, selectedProjectId]);

  const isWellsProject = useMemo(() => {
    if (isAllProjects || !selectedProjectId || selectedProjectId === ALL_PROJECTS_ID) return false;
    const currentProject = projects.find(p => p.id === selectedProjectId);
    if (!currentProject) return false;
    if (currentProject.project_type_id && WELLS_PROJECT_TYPE_IDS.includes(currentProject.project_type_id)) return true;
    const name = currentProject.name?.toLowerCase() || '';
    return name.includes('ابار') || name.includes('آبار') || name.includes('بئر');
  }, [selectedProjectId, isAllProjects, projects]);

  const value = useMemo(() => ({
    selectedProjectId,
    selectedProjectName,
    isLoading,
    isAllProjects,
    selectProject,
    clearProject,
    selectAllProjects,
    hasStoredProject,
    getProjectIdForApi,
    projects,
    projectsError: projectsError as Error | null,
    isProjectsLoading,
    refreshAllData,
    isWellsProject,
  }), [
    selectedProjectId,
    selectedProjectName,
    isLoading,
    isAllProjects,
    selectProject,
    clearProject,
    selectAllProjects,
    hasStoredProject,
    getProjectIdForApi,
    projects,
    projectsError,
    isProjectsLoading,
    refreshAllData,
    isWellsProject,
  ]);

  return (
    <SelectedProjectContext.Provider value={value}>
      {children}
    </SelectedProjectContext.Provider>
  );
}

export function useSelectedProjectContext() {
  const context = useContext(SelectedProjectContext);
  if (!context) {
    throw new Error("useSelectedProjectContext must be used within a SelectedProjectProvider");
  }
  return context;
}
