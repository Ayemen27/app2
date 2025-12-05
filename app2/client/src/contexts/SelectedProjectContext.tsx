import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { invalidateAllProjectData } from "@/lib/queryClient";

const SELECTED_PROJECT_KEY = "construction-app-selected-project";
const SELECTED_PROJECT_NAME_KEY = "construction-app-selected-project-name";

export const ALL_PROJECTS_ID = "all";
export const ALL_PROJECTS_NAME = "جميع المشاريع";

interface Project {
  id: string;
  name: string;
  status?: string;
  budget?: number;
}

interface SelectedProjectContextType {
  selectedProjectId: string;
  selectedProjectName: string;
  isLoading: boolean;
  isAllProjects: boolean;
  selectProject: (projectId: string, projectName?: string) => void;
  clearProject: () => void;
  selectAllProjects: () => void;
  hasStoredProject: () => boolean;
  getProjectIdForApi: () => string | undefined;
  projects: Project[];
  projectsError: Error | null;
  isProjectsLoading: boolean;
}

const SelectedProjectContext = createContext<SelectedProjectContextType | null>(null);

interface SelectedProjectProviderProps {
  children: ReactNode;
}

export function SelectedProjectProvider({ children }: SelectedProjectProviderProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(ALL_PROJECTS_ID);
  const [selectedProjectName, setSelectedProjectName] = useState<string>(ALL_PROJECTS_NAME);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: projectsData, isLoading: isProjectsLoading, error: projectsError } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects", {
        credentials: "include",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('accessToken') || ''}`
        }
      });
      if (!response.ok) {
        throw new Error("فشل في جلب المشاريع");
      }
      const data = await response.json();
      return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
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

  const invalidateProjectRelatedQueries = useCallback((projectId?: string) => {
    console.log("🔄 [SelectedProjectContext] تحديث فوري لجميع البيانات...", projectId);
    
    invalidateAllProjectData(projectId);
  }, []);

  const selectProject = useCallback((projectId: string, projectName?: string) => {
    console.log("📁 [SelectedProjectContext] تحديد المشروع الفوري:", { projectId, projectName });
    
    setSelectedProjectId(projectId);
    
    if (projectName) {
      setSelectedProjectName(projectName);
    } else if (projectId === ALL_PROJECTS_ID) {
      setSelectedProjectName(ALL_PROJECTS_NAME);
    }
    
    try {
      if (projectId && projectId !== "undefined" && projectId !== "null") {
        localStorage.setItem(SELECTED_PROJECT_KEY, projectId);
        if (projectName) {
          localStorage.setItem(SELECTED_PROJECT_NAME_KEY, projectName);
        } else if (projectId === ALL_PROJECTS_ID) {
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

    invalidateProjectRelatedQueries(projectId);
  }, [invalidateProjectRelatedQueries]);

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
