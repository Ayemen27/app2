import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";

export interface ProjectPermission {
  projectId: string;
  projectName: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isOwner: boolean;
  assignedBy?: string | null;
  assignedAt?: string | null;
}

export function useProjectPermissions() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const { data: permissions = [], isLoading } = useQuery<ProjectPermission[]>({
    queryKey: ["/api/permissions/my"],
    enabled: !!user,
  });

  const getProjectPermission = (projectId: string): ProjectPermission | undefined => {
    return permissions.find((p) => p.projectId === projectId);
  };

  const canViewProject = (projectId: string): boolean => {
    if (isAdmin) return true;
    const perm = getProjectPermission(projectId);
    return perm?.canView ?? false;
  };

  const canAddToProject = (projectId: string): boolean => {
    if (isAdmin) return true;
    const perm = getProjectPermission(projectId);
    if (perm?.isOwner) return true;
    return perm?.canAdd ?? false;
  };

  const canEditProject = (projectId: string): boolean => {
    if (isAdmin) return true;
    const perm = getProjectPermission(projectId);
    if (perm?.isOwner) return true;
    return perm?.canEdit ?? false;
  };

  const canDeleteFromProject = (projectId: string): boolean => {
    if (isAdmin) return true;
    const perm = getProjectPermission(projectId);
    if (perm?.isOwner) return true;
    return perm?.canDelete ?? false;
  };

  const getPermissionLevel = (projectId: string): string => {
    if (isAdmin) return "مسؤول";
    const perm = getProjectPermission(projectId);
    if (!perm) return "لا صلاحيات";
    if (perm.isOwner) return "مالك";
    if (perm.canDelete) return "كامل";
    if (perm.canEdit) return "تعديل";
    if (perm.canAdd) return "إضافة";
    if (perm.canView) return "قراءة فقط";
    return "لا صلاحيات";
  };

  return {
    permissions,
    isLoading,
    isAdmin,
    getProjectPermission,
    canViewProject,
    canAddToProject,
    canEditProject,
    canDeleteFromProject,
    getPermissionLevel,
  };
}
