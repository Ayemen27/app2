import express, { Request, Response } from "express";
import { requireAuth, requireAdmin, AuthenticatedRequest } from "../../middleware/auth";
import { projectAccessService } from "../../services/ProjectAccessService";
import { sendSuccess, sendError } from "../../middleware/api-response.js";

export const permissionRouter = express.Router();

permissionRouter.use(requireAuth);

permissionRouter.get("/my", async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return sendError(res, "غير مصرح", 401);
    }
    const userId = user.user_id || user.id;
    if (!userId) {
      return sendError(res, "غير مصرح", 401);
    }

    const permissions = await projectAccessService.getUserPermissionsForAllProjects(
      userId,
      user.role
    );

    return sendSuccess(res, permissions, "تم جلب صلاحياتك بنجاح");
  } catch (error: any) {
    return sendError(res, "فشل في جلب الصلاحيات", 500, [{ message: error.message }]);
  }
});

permissionRouter.get("/project/:projectId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const users = await projectAccessService.getProjectUsers(projectId);
    return sendSuccess(res, users, `تم جلب ${users.length} مستخدم للمشروع`);
  } catch (error: any) {
    return sendError(res, "فشل في جلب مستخدمي المشروع", 500, [{ message: error.message }]);
  }
});

permissionRouter.get("/user/:userId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const permissions = await projectAccessService.getUserPermissionsForAllProjects(
      userId,
      "user"
    );
    return sendSuccess(res, permissions, "تم جلب صلاحيات المستخدم بنجاح");
  } catch (error: any) {
    return sendError(res, "فشل في جلب صلاحيات المستخدم", 500, [{ message: error.message }]);
  }
});

permissionRouter.post("/grant", requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return sendError(res, "غير مصرح", 401);
    }

    const { targetUserId, projectId, canView, canAdd, canEdit, canDelete } = req.body;

    if (!targetUserId || !projectId) {
      return sendError(res, "يجب تحديد المستخدم والمشروع", 400);
    }

    const actorId = user.user_id || user.id;
    if (!actorId) {
      return sendError(res, "غير مصرح", 401);
    }

    await projectAccessService.grantPermission(
      actorId,
      targetUserId,
      projectId,
      {
        canView: canView !== false,
        canAdd: canAdd === true,
        canEdit: canEdit === true,
        canDelete: canDelete === true,
      },
      req.ip || undefined,
      req.headers["user-agent"] || undefined
    );

    return sendSuccess(res, null, "تم منح الصلاحيات بنجاح");
  } catch (error: any) {
    return sendError(res, "فشل في منح الصلاحيات", 500, [{ message: error.message }]);
  }
});

permissionRouter.patch("/update", requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return sendError(res, "غير مصرح", 401);
    }

    const { targetUserId, projectId, canView, canAdd, canEdit, canDelete } = req.body;

    if (!targetUserId || !projectId) {
      return sendError(res, "يجب تحديد المستخدم والمشروع", 400);
    }

    const actorId = user.user_id || user.id;
    if (!actorId) {
      return sendError(res, "غير مصرح", 401);
    }

    await projectAccessService.updatePermission(
      actorId,
      targetUserId,
      projectId,
      {
        canView: canView !== false,
        canAdd: canAdd === true,
        canEdit: canEdit === true,
        canDelete: canDelete === true,
      },
      req.ip || undefined,
      req.headers["user-agent"] || undefined
    );

    return sendSuccess(res, null, "تم تحديث الصلاحيات بنجاح");
  } catch (error: any) {
    return sendError(res, "فشل في تحديث الصلاحيات", 500, [{ message: error.message }]);
  }
});

permissionRouter.delete("/revoke", requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return sendError(res, "غير مصرح", 401);
    }

    const { targetUserId, projectId } = req.body;

    if (!targetUserId || !projectId) {
      return sendError(res, "يجب تحديد المستخدم والمشروع", 400);
    }

    const actorId = user.user_id || user.id;
    if (!actorId) {
      return sendError(res, "غير مصرح", 401);
    }

    await projectAccessService.revokePermission(
      actorId,
      targetUserId,
      projectId,
      req.ip || undefined,
      req.headers["user-agent"] || undefined
    );

    return sendSuccess(res, null, "تم سحب الصلاحيات بنجاح");
  } catch (error: any) {
    return sendError(res, "فشل في سحب الصلاحيات", 500, [{ message: error.message }]);
  }
});

permissionRouter.get("/audit-logs", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { projectId, userId, limit } = req.query;

    const logs = await projectAccessService.getAuditLogs({
      projectId: projectId as string,
      userId: userId as string,
      limit: limit ? parseInt(limit as string) : 100,
    });

    return sendSuccess(res, logs, `تم جلب ${logs.length} سجل تدقيق`);
  } catch (error: any) {
    return sendError(res, "فشل في جلب سجلات التدقيق", 500, [{ message: error.message }]);
  }
});

export default permissionRouter;
