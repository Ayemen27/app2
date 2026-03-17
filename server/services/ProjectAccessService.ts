import { db } from "../db";
import { projects, userProjectPermissions, permissionAuditLogs, users } from "@shared/schema";
import { eq, and, or, inArray, sql } from "drizzle-orm";
import { NotificationService } from "./NotificationService";
import { CentralLogService } from "./CentralLogService";

export type PermissionAction = "view" | "add" | "edit" | "delete";

export interface PermissionGrant {
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface ProjectPermissionInfo {
  projectId: string;
  projectName: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isOwner: boolean;
  assignedBy?: string | null;
  assignedAt?: Date | null;
}

export interface UserPermissionInfo {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isOwner: boolean;
  assignedBy?: string | null;
  assignedAt?: Date | null;
}

const ADMIN_ROLES = ["admin", "super_admin"];

class ProjectAccessService {
  isAdmin(role: string): boolean {
    return ADMIN_ROLES.includes(role);
  }

  async getAccessibleProjectIds(userId: string, role: string): Promise<string[]> {
    if (this.isAdmin(role)) {
      const allProjects = await db.select({ id: projects.id }).from(projects);
      return allProjects.map((p: { id: string }) => p.id);
    }

    const ownedProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.engineerId, userId));

    const permittedProjects = await db
      .select({ project_id: userProjectPermissions.project_id })
      .from(userProjectPermissions)
      .where(
        and(
          eq(userProjectPermissions.user_id, userId),
          eq(userProjectPermissions.canView, true)
        )
      );

    const ids = new Set<string>();
    ownedProjects.forEach((p: { id: string }) => ids.add(p.id));
    permittedProjects.forEach((p: { project_id: string }) => ids.add(p.project_id));

    return Array.from(ids);
  }

  async checkProjectAccess(
    userId: string,
    role: string,
    projectId: string,
    action: PermissionAction
  ): Promise<boolean> {
    if (this.isAdmin(role)) return true;

    const project = await db
      .select({ engineerId: projects.engineerId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (project.length > 0 && project[0].engineerId === userId) {
      return true;
    }

    const perm = await db
      .select()
      .from(userProjectPermissions)
      .where(
        and(
          eq(userProjectPermissions.user_id, userId),
          eq(userProjectPermissions.project_id, projectId)
        )
      )
      .limit(1);

    if (perm.length === 0) return false;

    const p = perm[0];
    switch (action) {
      case "view":
        return p.canView;
      case "add":
        return p.canView && p.canAdd;
      case "edit":
        return p.canView && p.canEdit;
      case "delete":
        return p.canView && p.canDelete;
      default:
        return false;
    }
  }

  async getProjectPermission(
    userId: string,
    projectId: string
  ): Promise<PermissionGrant | null> {
    const perm = await db
      .select()
      .from(userProjectPermissions)
      .where(
        and(
          eq(userProjectPermissions.user_id, userId),
          eq(userProjectPermissions.project_id, projectId)
        )
      )
      .limit(1);

    if (perm.length === 0) return null;
    return {
      canView: perm[0].canView,
      canAdd: perm[0].canAdd,
      canEdit: perm[0].canEdit,
      canDelete: perm[0].canDelete,
    };
  }

  async getUserPermissionsForAllProjects(
    userId: string,
    role: string
  ): Promise<ProjectPermissionInfo[]> {
    if (this.isAdmin(role)) {
      const allProjects = await db.select().from(projects);
      return allProjects.map((p: { id: string; name: string; engineerId: string | null }) => ({
        projectId: p.id,
        projectName: p.name,
        canView: true,
        canAdd: true,
        canEdit: true,
        canDelete: true,
        isOwner: p.engineerId === userId,
      }));
    }

    const ownedProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.engineerId, userId));

    const explicitPerms = await db
      .select({
        project_id: userProjectPermissions.project_id,
        canView: userProjectPermissions.canView,
        canAdd: userProjectPermissions.canAdd,
        canEdit: userProjectPermissions.canEdit,
        canDelete: userProjectPermissions.canDelete,
        assignedBy: userProjectPermissions.assignedBy,
        assignedAt: userProjectPermissions.assignedAt,
        projectName: projects.name,
      })
      .from(userProjectPermissions)
      .leftJoin(projects, eq(userProjectPermissions.project_id, projects.id))
      .where(eq(userProjectPermissions.user_id, userId));

    const result: ProjectPermissionInfo[] = [];
    const seenIds = new Set<string>();

    for (const p of ownedProjects) {
      seenIds.add(p.id);
      result.push({
        projectId: p.id,
        projectName: p.name,
        canView: true,
        canAdd: true,
        canEdit: true,
        canDelete: true,
        isOwner: true,
      });
    }

    for (const p of explicitPerms) {
      if (!seenIds.has(p.project_id)) {
        seenIds.add(p.project_id);
        result.push({
          projectId: p.project_id,
          projectName: p.projectName || "",
          canView: p.canView,
          canAdd: p.canAdd,
          canEdit: p.canEdit,
          canDelete: p.canDelete,
          isOwner: false,
          assignedBy: p.assignedBy,
          assignedAt: p.assignedAt,
        });
      }
    }

    return result;
  }

  async getProjectUsers(projectId: string): Promise<UserPermissionInfo[]> {
    const project = await db
      .select({ engineerId: projects.engineerId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    const result: UserPermissionInfo[] = [];

    if (project.length > 0 && project[0].engineerId) {
      const owner = await db
        .select()
        .from(users)
        .where(eq(users.id, project[0].engineerId))
        .limit(1);
      if (owner.length > 0) {
        result.push({
          userId: owner[0].id,
          userName: owner[0].full_name || `${owner[0].first_name || ""} ${owner[0].last_name || ""}`.trim(),
          userEmail: owner[0].email,
          userRole: owner[0].role,
          canView: true,
          canAdd: true,
          canEdit: true,
          canDelete: true,
          isOwner: true,
        });
      }
    }

    const perms = await db
      .select({
        userId: userProjectPermissions.user_id,
        canView: userProjectPermissions.canView,
        canAdd: userProjectPermissions.canAdd,
        canEdit: userProjectPermissions.canEdit,
        canDelete: userProjectPermissions.canDelete,
        assignedBy: userProjectPermissions.assignedBy,
        assignedAt: userProjectPermissions.assignedAt,
        userName: users.full_name,
        firstName: users.first_name,
        lastName: users.last_name,
        userEmail: users.email,
        userRole: users.role,
      })
      .from(userProjectPermissions)
      .leftJoin(users, eq(userProjectPermissions.user_id, users.id))
      .where(eq(userProjectPermissions.project_id, projectId));

    for (const p of perms) {
      if (!result.find((r) => r.userId === p.userId)) {
        result.push({
          userId: p.userId,
          userName: p.userName || `${p.firstName || ""} ${p.lastName || ""}`.trim(),
          userEmail: p.userEmail || "",
          userRole: p.userRole || "user",
          canView: p.canView,
          canAdd: p.canAdd,
          canEdit: p.canEdit,
          canDelete: p.canDelete,
          isOwner: false,
          assignedBy: p.assignedBy,
          assignedAt: p.assignedAt,
        });
      }
    }

    return result;
  }

  async grantPermission(
    actorId: string,
    targetUserId: string,
    projectId: string,
    permissions: PermissionGrant,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const existing = await db
      .select()
      .from(userProjectPermissions)
      .where(
        and(
          eq(userProjectPermissions.user_id, targetUserId),
          eq(userProjectPermissions.project_id, projectId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await this.updatePermission(actorId, targetUserId, projectId, permissions, ipAddress, userAgent);
      return;
    }

    await db.insert(userProjectPermissions).values({
      user_id: targetUserId,
      project_id: projectId,
      canView: permissions.canView,
      canAdd: permissions.canAdd,
      canEdit: permissions.canEdit,
      canDelete: permissions.canDelete,
      assignedBy: actorId,
    });

    await this.createAuditLog("assign", actorId, targetUserId, projectId, null, permissions, ipAddress, userAgent);
    await this.sendPermissionNotifications("assign", actorId, targetUserId, projectId, permissions);
  }

  async updatePermission(
    actorId: string,
    targetUserId: string,
    projectId: string,
    permissions: PermissionGrant,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const old = await this.getProjectPermission(targetUserId, projectId);

    await db
      .update(userProjectPermissions)
      .set({
        canView: permissions.canView,
        canAdd: permissions.canAdd,
        canEdit: permissions.canEdit,
        canDelete: permissions.canDelete,
        assignedBy: actorId,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(userProjectPermissions.user_id, targetUserId),
          eq(userProjectPermissions.project_id, projectId)
        )
      );

    await this.createAuditLog("update_permissions", actorId, targetUserId, projectId, old, permissions, ipAddress, userAgent);
    await this.sendPermissionNotifications("update", actorId, targetUserId, projectId, permissions);
  }

  async revokePermission(
    actorId: string,
    targetUserId: string,
    projectId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const old = await this.getProjectPermission(targetUserId, projectId);

    await db
      .delete(userProjectPermissions)
      .where(
        and(
          eq(userProjectPermissions.user_id, targetUserId),
          eq(userProjectPermissions.project_id, projectId)
        )
      );

    await this.createAuditLog("unassign", actorId, targetUserId, projectId, old, null, ipAddress, userAgent);
    await this.sendPermissionNotifications("revoke", actorId, targetUserId, projectId, null);
  }

  private async createAuditLog(
    action: string,
    actorId: string,
    targetUserId: string,
    projectId: string,
    oldPermissions: PermissionGrant | null,
    newPermissions: PermissionGrant | null,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await db.insert(permissionAuditLogs).values({
        action,
        actorId,
        targetUserId,
        project_id: projectId,
        oldPermissions: oldPermissions as Record<string, boolean> | null,
        newPermissions: newPermissions as Record<string, boolean> | null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      });

      CentralLogService.getInstance().logDomain({
        source: 'auth',
        module: 'صلاحيات',
        action: 'permission_change',
        level: action === 'unassign' ? 'warn' : 'info',
        status: 'success',
        actorUserId: actorId,
        project_id: projectId,
        entityType: 'permission',
        entityId: targetUserId,
        message: `تغيير صلاحيات: ${action} للمستخدم ${targetUserId} على مشروع ${projectId}`,
        details: { action, targetUserId, oldPermissions, newPermissions },
        ipAddress: ipAddress,
        userAgent: userAgent,
      });
    } catch (err) {
      console.error("[PermissionAudit] Failed to create audit log:", err);
    }
  }

  private formatPermissions(p: PermissionGrant | null): string {
    if (!p) return "لا صلاحيات";
    const parts: string[] = [];
    if (p.canView) parts.push("عرض");
    if (p.canAdd) parts.push("إضافة");
    if (p.canEdit) parts.push("تعديل");
    if (p.canDelete) parts.push("حذف");
    return parts.length > 0 ? parts.join(" + ") : "لا صلاحيات";
  }

  private async sendPermissionNotifications(
    action: "assign" | "update" | "revoke",
    actorId: string,
    targetUserId: string,
    projectId: string,
    permissions: PermissionGrant | null
  ): Promise<void> {
    try {
      const [actor, target, project] = await Promise.all([
        db.select().from(users).where(eq(users.id, actorId)).limit(1),
        db.select().from(users).where(eq(users.id, targetUserId)).limit(1),
        db.select().from(projects).where(eq(projects.id, projectId)).limit(1),
      ]);

      const actorName = actor[0]?.full_name || actor[0]?.email || "مسؤول";
      const targetName = target[0]?.full_name || target[0]?.email || "مستخدم";
      const projectName = project[0]?.name || "مشروع";
      const ownerId = project[0]?.engineerId;
      const permText = this.formatPermissions(permissions);

      const notificationService = new NotificationService();

      if (action === "assign") {
        await notificationService.createNotification({
          title: "تم منحك صلاحيات على مشروع",
          body: `قام ${actorName} بمنحك صلاحيات (${permText}) على مشروع "${projectName}"`,
          type: "system",
          priority: 2,
          recipients: [targetUserId],
        });

        if (ownerId && ownerId !== actorId && ownerId !== targetUserId) {
          await notificationService.createNotification({
            title: "تم إضافة مستخدم لمشروعك",
            body: `قام ${actorName} بمنح ${targetName} صلاحيات (${permText}) على مشروعك "${projectName}"`,
            type: "system",
            priority: 2,
            recipients: [ownerId],
          });
        }
      } else if (action === "update") {
        await notificationService.createNotification({
          title: "تم تحديث صلاحياتك",
          body: `قام ${actorName} بتحديث صلاحياتك على مشروع "${projectName}" إلى: ${permText}`,
          type: "system",
          priority: 2,
          recipients: [targetUserId],
        });

        if (ownerId && ownerId !== actorId && ownerId !== targetUserId) {
          await notificationService.createNotification({
            title: "تم تحديث صلاحيات مستخدم على مشروعك",
            body: `قام ${actorName} بتحديث صلاحيات ${targetName} على مشروعك "${projectName}" إلى: ${permText}`,
            type: "system",
            priority: 1,
            recipients: [ownerId],
          });
        }
      } else if (action === "revoke") {
        await notificationService.createNotification({
          title: "تم سحب صلاحياتك من مشروع",
          body: `قام ${actorName} بسحب صلاحياتك من مشروع "${projectName}"`,
          type: "system",
          priority: 3,
          recipients: [targetUserId],
        });

        if (ownerId && ownerId !== actorId && ownerId !== targetUserId) {
          await notificationService.createNotification({
            title: "تم سحب صلاحيات مستخدم من مشروعك",
            body: `قام ${actorName} بسحب صلاحيات ${targetName} من مشروعك "${projectName}"`,
            type: "system",
            priority: 2,
            recipients: [ownerId],
          });
        }
      }
    } catch (err) {
      console.error("[PermissionNotification] Failed to send notifications:", err);
    }
  }

  async getAuditLogs(filters?: {
    projectId?: string;
    userId?: string;
    limit?: number;
  }) {
    let query = db
      .select({
        id: permissionAuditLogs.id,
        action: permissionAuditLogs.action,
        actorId: permissionAuditLogs.actorId,
        targetUserId: permissionAuditLogs.targetUserId,
        projectId: permissionAuditLogs.project_id,
        oldPermissions: permissionAuditLogs.oldPermissions,
        newPermissions: permissionAuditLogs.newPermissions,
        ipAddress: permissionAuditLogs.ipAddress,
        notes: permissionAuditLogs.notes,
        createdAt: permissionAuditLogs.created_at,
        actorName: sql<string>`(SELECT full_name FROM users WHERE id = ${permissionAuditLogs.actorId} LIMIT 1)`,
        targetName: sql<string>`(SELECT full_name FROM users WHERE id = ${permissionAuditLogs.targetUserId} LIMIT 1)`,
        projectName: sql<string>`(SELECT name FROM projects WHERE id = ${permissionAuditLogs.project_id} LIMIT 1)`,
      })
      .from(permissionAuditLogs)
      .orderBy(sql`${permissionAuditLogs.created_at} DESC`)
      .limit(filters?.limit || 100);

    const conditions = [];
    if (filters?.projectId) {
      conditions.push(eq(permissionAuditLogs.project_id, filters.projectId));
    }
    if (filters?.userId) {
      conditions.push(
        or(
          eq(permissionAuditLogs.actorId, filters.userId),
          eq(permissionAuditLogs.targetUserId, filters.userId)
        )!
      );
    }

    if (conditions.length > 0) {
      // Drizzle ORM limitation: dynamic .where() on pre-built query requires type assertion
      return await (query as typeof query).where(and(...conditions));
    }

    return await query;
  }
}

export const projectAccessService = new ProjectAccessService();
