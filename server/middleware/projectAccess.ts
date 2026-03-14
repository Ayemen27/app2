import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";
import { projectAccessService, PermissionAction } from "../services/ProjectAccessService";

export interface ProjectAccessRequest extends AuthenticatedRequest {
  accessibleProjectIds?: string[];
}

export const attachAccessibleProjects = async (
  req: ProjectAccessRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      req.accessibleProjectIds = [];
      return next();
    }

    const userId = req.user.user_id;
    if (!userId) {
      req.accessibleProjectIds = [];
      return next();
    }

    req.accessibleProjectIds = await projectAccessService.getAccessibleProjectIds(
      userId,
      req.user.role
    );
    next();
  } catch (error) {
    console.error("[ProjectAccess] Error loading accessible projects:", error);
    req.accessibleProjectIds = [];
    next();
  }
};

export const requireProjectAccess = (action: PermissionAction) => {
  return async (req: ProjectAccessRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "غير مصرح لك بالوصول",
          code: "UNAUTHORIZED",
        });
      }

      const userId = req.user.user_id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "غير مصرح لك بالوصول",
          code: "UNAUTHORIZED",
        });
      }

      const projectId =
        req.params.projectId ||
        req.params.project_id ||
        req.params.id ||
        req.body?.project_id ||
        (req.query?.project_id as string);

      if (!projectId || projectId === "all") {
        return next();
      }

      const hasAccess = await projectAccessService.checkProjectAccess(
        userId,
        req.user.role,
        projectId,
        action
      );

      if (!hasAccess) {
        console.warn(
          `🚫 [ProjectAccess] ${req.user.email} denied ${action} on project ${projectId}`
        );
        return res.status(403).json({
          success: false,
          message: `ليس لديك صلاحية ${action === "view" ? "عرض" : action === "add" ? "إضافة" : action === "edit" ? "تعديل" : "حذف"} بيانات هذا المشروع`,
          code: "PROJECT_ACCESS_DENIED",
        });
      }

      next();
    } catch (error) {
      console.error("[ProjectAccess] Error checking access:", error);
      return res.status(500).json({
        success: false,
        message: "خطأ في التحقق من الصلاحيات",
      });
    }
  };
};

export function filterByAccessibleProjects<T extends { project_id?: string | null }>(
  data: T[],
  accessibleProjectIds: string[] | undefined,
  isAdmin: boolean
): T[] {
  if (isAdmin) return data;
  if (!accessibleProjectIds) return [];
  const idSet = new Set(accessibleProjectIds);
  return data.filter((item) => item.project_id && idSet.has(item.project_id));
}
