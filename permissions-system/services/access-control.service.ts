import { db } from '../../app2/server/db';
import { users, projects, userProjectPermissions, permissionAuditLogs } from '../../app2/shared/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface UserPermissions {
  userId: string;
  projectId: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface PermissionCheck {
  hasAccess: boolean;
  permissions: UserPermissions | null;
  isSuperAdmin: boolean;
}

export class AccessControlService {
  private static instance: AccessControlService;

  private constructor() {}

  public static getInstance(): AccessControlService {
    if (!AccessControlService.instance) {
      AccessControlService.instance = new AccessControlService();
    }
    return AccessControlService.instance;
  }

  async isSuperAdmin(userId: string): Promise<boolean> {
    try {
      const user = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return user.length > 0 && user[0].role === 'super_admin';
    } catch (error) {
      console.error('❌ [AccessControl] خطأ في التحقق من المدير:', error);
      return false;
    }
  }

  async getUserPermissionsForProject(userId: string, projectId: string): Promise<UserPermissions | null> {
    try {
      const permissions = await db
        .select()
        .from(userProjectPermissions)
        .where(
          and(
            eq(userProjectPermissions.userId, userId),
            eq(userProjectPermissions.projectId, projectId)
          )
        )
        .limit(1);

      if (permissions.length === 0) {
        return null;
      }

      return {
        userId: permissions[0].userId,
        projectId: permissions[0].projectId,
        canView: permissions[0].canView,
        canAdd: permissions[0].canAdd,
        canEdit: permissions[0].canEdit,
        canDelete: permissions[0].canDelete,
      };
    } catch (error) {
      console.error('❌ [AccessControl] خطأ في جلب صلاحيات المستخدم:', error);
      return null;
    }
  }

  async checkProjectAccess(userId: string, projectId: string, requiredPermission: 'view' | 'add' | 'edit' | 'delete' = 'view'): Promise<PermissionCheck> {
    try {
      const isSuperAdmin = await this.isSuperAdmin(userId);
      
      if (isSuperAdmin) {
        return {
          hasAccess: true,
          permissions: {
            userId,
            projectId,
            canView: true,
            canAdd: true,
            canEdit: true,
            canDelete: true,
          },
          isSuperAdmin: true,
        };
      }

      const permissions = await this.getUserPermissionsForProject(userId, projectId);
      
      if (!permissions) {
        return {
          hasAccess: false,
          permissions: null,
          isSuperAdmin: false,
        };
      }

      let hasAccess = false;
      switch (requiredPermission) {
        case 'view':
          hasAccess = permissions.canView;
          break;
        case 'add':
          hasAccess = permissions.canAdd;
          break;
        case 'edit':
          hasAccess = permissions.canEdit;
          break;
        case 'delete':
          hasAccess = permissions.canDelete;
          break;
      }

      return {
        hasAccess,
        permissions,
        isSuperAdmin: false,
      };
    } catch (error) {
      console.error('❌ [AccessControl] خطأ في التحقق من الصلاحيات:', error);
      return {
        hasAccess: false,
        permissions: null,
        isSuperAdmin: false,
      };
    }
  }

  async getUserProjects(userId: string): Promise<string[]> {
    try {
      const isSuperAdmin = await this.isSuperAdmin(userId);
      
      if (isSuperAdmin) {
        const allProjects = await db.select({ id: projects.id }).from(projects);
        return allProjects.map(p => p.id);
      }

      const userPermissions = await db
        .select({ projectId: userProjectPermissions.projectId })
        .from(userProjectPermissions)
        .where(
          and(
            eq(userProjectPermissions.userId, userId),
            eq(userProjectPermissions.canView, true)
          )
        );

      return userPermissions.map(p => p.projectId);
    } catch (error) {
      console.error('❌ [AccessControl] خطأ في جلب مشاريع المستخدم:', error);
      return [];
    }
  }

  async assignUserToProject(
    assignedBy: string,
    targetUserId: string,
    projectId: string,
    permissions: Partial<Omit<UserPermissions, 'userId' | 'projectId'>> = {}
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const isSuperAdmin = await this.isSuperAdmin(assignedBy);
      if (!isSuperAdmin) {
        return { success: false, message: 'ليس لديك صلاحية لربط المستخدمين بالمشاريع' };
      }

      const existingPermission = await db
        .select()
        .from(userProjectPermissions)
        .where(
          and(
            eq(userProjectPermissions.userId, targetUserId),
            eq(userProjectPermissions.projectId, projectId)
          )
        )
        .limit(1);

      if (existingPermission.length > 0) {
        return { success: false, message: 'المستخدم مرتبط بالمشروع مسبقاً' };
      }

      const newPermission = await db.insert(userProjectPermissions).values({
        userId: targetUserId,
        projectId: projectId,
        canView: permissions.canView ?? true,
        canAdd: permissions.canAdd ?? false,
        canEdit: permissions.canEdit ?? false,
        canDelete: permissions.canDelete ?? false,
        assignedBy: assignedBy,
      }).returning();

      console.log(`✅ [AccessControl] تم ربط المستخدم ${targetUserId} بالمشروع ${projectId}`);

      return {
        success: true,
        message: 'تم ربط المستخدم بالمشروع بنجاح',
        data: newPermission[0],
      };
    } catch (error: any) {
      console.error('❌ [AccessControl] خطأ في ربط المستخدم بالمشروع:', error);
      return { success: false, message: error.message || 'فشل في ربط المستخدم بالمشروع' };
    }
  }

  async unassignUserFromProject(
    actorId: string,
    targetUserId: string,
    projectId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const isSuperAdmin = await this.isSuperAdmin(actorId);
      if (!isSuperAdmin) {
        return { success: false, message: 'ليس لديك صلاحية لفصل المستخدمين من المشاريع' };
      }

      const deleted = await db
        .delete(userProjectPermissions)
        .where(
          and(
            eq(userProjectPermissions.userId, targetUserId),
            eq(userProjectPermissions.projectId, projectId)
          )
        )
        .returning();

      if (deleted.length === 0) {
        return { success: false, message: 'المستخدم غير مرتبط بهذا المشروع' };
      }

      console.log(`✅ [AccessControl] تم فصل المستخدم ${targetUserId} من المشروع ${projectId}`);

      return { success: true, message: 'تم فصل المستخدم من المشروع بنجاح' };
    } catch (error: any) {
      console.error('❌ [AccessControl] خطأ في فصل المستخدم من المشروع:', error);
      return { success: false, message: error.message || 'فشل في فصل المستخدم من المشروع' };
    }
  }

  async updateUserPermissions(
    actorId: string,
    targetUserId: string,
    projectId: string,
    newPermissions: Partial<Omit<UserPermissions, 'userId' | 'projectId'>>
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const isSuperAdmin = await this.isSuperAdmin(actorId);
      if (!isSuperAdmin) {
        return { success: false, message: 'ليس لديك صلاحية لتحديث الصلاحيات' };
      }

      const oldPermissions = await this.getUserPermissionsForProject(targetUserId, projectId);
      if (!oldPermissions) {
        return { success: false, message: 'المستخدم غير مرتبط بهذا المشروع' };
      }

      const updated = await db
        .update(userProjectPermissions)
        .set({
          canView: newPermissions.canView ?? oldPermissions.canView,
          canAdd: newPermissions.canAdd ?? oldPermissions.canAdd,
          canEdit: newPermissions.canEdit ?? oldPermissions.canEdit,
          canDelete: newPermissions.canDelete ?? oldPermissions.canDelete,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userProjectPermissions.userId, targetUserId),
            eq(userProjectPermissions.projectId, projectId)
          )
        )
        .returning();

      console.log(`✅ [AccessControl] تم تحديث صلاحيات المستخدم ${targetUserId} على المشروع ${projectId}`);

      return {
        success: true,
        message: 'تم تحديث الصلاحيات بنجاح',
        data: updated[0],
      };
    } catch (error: any) {
      console.error('❌ [AccessControl] خطأ في تحديث الصلاحيات:', error);
      return { success: false, message: error.message || 'فشل في تحديث الصلاحيات' };
    }
  }

  async getAllUsersWithPermissions(): Promise<any[]> {
    try {
      const usersWithPermissions = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(users.createdAt);

      const result = await Promise.all(
        usersWithPermissions.map(async (user) => {
          const permissions = await db
            .select({
              projectId: userProjectPermissions.projectId,
              projectName: projects.name,
              canView: userProjectPermissions.canView,
              canAdd: userProjectPermissions.canAdd,
              canEdit: userProjectPermissions.canEdit,
              canDelete: userProjectPermissions.canDelete,
              assignedAt: userProjectPermissions.assignedAt,
            })
            .from(userProjectPermissions)
            .leftJoin(projects, eq(userProjectPermissions.projectId, projects.id))
            .where(eq(userProjectPermissions.userId, user.id));

          return {
            ...user,
            projectPermissions: permissions,
            projectCount: permissions.length,
          };
        })
      );

      return result;
    } catch (error) {
      console.error('❌ [AccessControl] خطأ في جلب المستخدمين مع الصلاحيات:', error);
      return [];
    }
  }

  async bulkAssignUsersToProject(
    assignedBy: string,
    userIds: string[],
    projectId: string,
    permissions: Partial<Omit<UserPermissions, 'userId' | 'projectId'>> = {}
  ): Promise<{ success: boolean; message: string; assigned: number; failed: number }> {
    try {
      const isSuperAdmin = await this.isSuperAdmin(assignedBy);
      if (!isSuperAdmin) {
        return { success: false, message: 'ليس لديك صلاحية', assigned: 0, failed: userIds.length };
      }

      let assigned = 0;
      let failed = 0;

      for (const userId of userIds) {
        const result = await this.assignUserToProject(assignedBy, userId, projectId, permissions);
        if (result.success) {
          assigned++;
        } else {
          failed++;
        }
      }

      return {
        success: assigned > 0,
        message: `تم ربط ${assigned} مستخدم، فشل ${failed}`,
        assigned,
        failed,
      };
    } catch (error: any) {
      console.error('❌ [AccessControl] خطأ في الربط المجمع:', error);
      return { success: false, message: error.message, assigned: 0, failed: userIds.length };
    }
  }
}

export const accessControlService = AccessControlService.getInstance();
