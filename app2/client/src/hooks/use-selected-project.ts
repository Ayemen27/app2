import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

const SELECTED_PROJECT_KEY = "construction-app-selected-project";
const SELECTED_PROJECT_NAME_KEY = "construction-app-selected-project-name";

export const ALL_PROJECTS_ID = "all";
export const ALL_PROJECTS_NAME = "جميع المشاريع";

export function useSelectedProject() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(ALL_PROJECTS_ID);
  const [selectedProjectName, setSelectedProjectName] = useState<string>(ALL_PROJECTS_NAME);
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  
  let queryClient: ReturnType<typeof useQueryClient> | null = null;
  
  try {
    queryClient = useQueryClient();
  } catch (e) {
  }

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
      setIsLoading(false);
    }
  }, []);

  const invalidateProjectRelatedQueries = useCallback(() => {
    if (!queryClient) return;
    
    console.log("🔄 [SelectedProject] إعادة تحميل البيانات المرتبطة بالمشروع...");
    
    queryClient.invalidateQueries({ queryKey: ["/api/workers"] });
    queryClient.invalidateQueries({ queryKey: ["/api/projects/with-stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/worker-attendance"] });
    queryClient.invalidateQueries({ queryKey: ["/api/material-purchases"] });
    queryClient.invalidateQueries({ queryKey: ["/api/fund-transfers"] });
    queryClient.invalidateQueries({ queryKey: ["/api/transportation-expenses"] });
    queryClient.invalidateQueries({ queryKey: ["/api/worker-transfers"] });
    queryClient.invalidateQueries({ queryKey: ["/api/worker-misc-expenses"] });
    queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    queryClient.invalidateQueries({ queryKey: ["/api/daily-expense-summaries"] });
    
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.includes('/stats');
      }
    });
  }, [queryClient]);

  const selectProject = useCallback((projectId: string, projectName?: string) => {
    console.log("📁 [SelectedProject] تحديد المشروع:", { projectId, projectName });
    
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
      console.error("❌ [SelectedProject] خطأ في حفظ المشروع:", error);
    }

    invalidateProjectRelatedQueries();
  }, [invalidateProjectRelatedQueries]);

  const selectAllProjects = useCallback(() => {
    selectProject(ALL_PROJECTS_ID, ALL_PROJECTS_NAME);
  }, [selectProject]);

  const clearProject = useCallback(() => {
    console.log("🗑️ [SelectedProject] مسح تحديد المشروع");
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

  return {
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
  };
}
