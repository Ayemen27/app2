import { db } from '../../app2/server/db';
import { permissionAuditLogs, users, projects } from '../../app2/shared/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';

export interface AuditLogEntry {
  action: 'assign' | 'unassign' | 'update_permissions' | 'bulk_assign' | 'bulk_unassign';
  actorId: string;
  targetUserId?: string;
  projectId?: string;
  oldPermissions?: Record<string, boolean>;
  newPermissions?: Record<string, boolean>;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
}

export interface AuditLogFilter {
  actorId?: string;
  targetUserId?: string;
  projectId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class AuditLogService {
  private static instance: AuditLogService;

  private constructor() {}

  public static getInstance(): AuditLogService {
    if (!AuditLogService.instance) {
      AuditLogService.instance = new AuditLogService();
    }
    return AuditLogService.instance;
  }

  async log(entry: AuditLogEntry): Promise<{ success: boolean; id?: string }> {
    try {
      const result = await db.insert(permissionAuditLogs).values({
        action: entry.action,
        actorId: entry.actorId,
        targetUserId: entry.targetUserId || null,
        projectId: entry.projectId || null,
        oldPermissions: entry.oldPermissions || null,
        newPermissions: entry.newPermissions || null,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
        notes: entry.notes || null,
      }).returning();

      console.log(`📋 [AuditLog] تم تسجيل العملية: ${entry.action} بواسطة ${entry.actorId}`);

      return { success: true, id: result[0].id };
    } catch (error) {
      console.error('❌ [AuditLog] خطأ في تسجيل السجل:', error);
      return { success: false };
    }
  }

  async logAssignment(
    actorId: string,
    targetUserId: string,
    projectId: string,
    permissions: Record<string, boolean>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      action: 'assign',
      actorId,
      targetUserId,
      projectId,
      newPermissions: permissions,
      ipAddress,
      userAgent,
      notes: 'تم ربط المستخدم بالمشروع',
    });
  }

  async logUnassignment(
    actorId: string,
    targetUserId: string,
    projectId: string,
    oldPermissions: Record<string, boolean>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      action: 'unassign',
      actorId,
      targetUserId,
      projectId,
      oldPermissions,
      ipAddress,
      userAgent,
      notes: 'تم فصل المستخدم من المشروع',
    });
  }

  async logPermissionUpdate(
    actorId: string,
    targetUserId: string,
    projectId: string,
    oldPermissions: Record<string, boolean>,
    newPermissions: Record<string, boolean>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      action: 'update_permissions',
      actorId,
      targetUserId,
      projectId,
      oldPermissions,
      newPermissions,
      ipAddress,
      userAgent,
      notes: 'تم تحديث صلاحيات المستخدم',
    });
  }

  async getAuditLogs(filter: AuditLogFilter = {}): Promise<any[]> {
    try {
      const conditions = [];

      if (filter.actorId) {
        conditions.push(eq(permissionAuditLogs.actorId, filter.actorId));
      }
      if (filter.targetUserId) {
        conditions.push(eq(permissionAuditLogs.targetUserId, filter.targetUserId));
      }
      if (filter.projectId) {
        conditions.push(eq(permissionAuditLogs.projectId, filter.projectId));
      }
      if (filter.action) {
        conditions.push(eq(permissionAuditLogs.action, filter.action));
      }
      if (filter.startDate) {
        conditions.push(gte(permissionAuditLogs.createdAt, filter.startDate));
      }
      if (filter.endDate) {
        conditions.push(lte(permissionAuditLogs.createdAt, filter.endDate));
      }

      let query = db
        .select({
          id: permissionAuditLogs.id,
          action: permissionAuditLogs.action,
          actorId: permissionAuditLogs.actorId,
          actorEmail: users.email,
          actorName: users.firstName,
          targetUserId: permissionAuditLogs.targetUserId,
          projectId: permissionAuditLogs.projectId,
          projectName: projects.name,
          oldPermissions: permissionAuditLogs.oldPermissions,
          newPermissions: permissionAuditLogs.newPermissions,
          ipAddress: permissionAuditLogs.ipAddress,
          notes: permissionAuditLogs.notes,
          createdAt: permissionAuditLogs.createdAt,
        })
        .from(permissionAuditLogs)
        .leftJoin(users, eq(permissionAuditLogs.actorId, users.id))
        .leftJoin(projects, eq(permissionAuditLogs.projectId, projects.id))
        .orderBy(desc(permissionAuditLogs.createdAt));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      if (filter.limit) {
        query = query.limit(filter.limit) as any;
      }

      if (filter.offset) {
        query = query.offset(filter.offset) as any;
      }

      const logs = await query;

      const enrichedLogs = await Promise.all(
        logs.map(async (log) => {
          let targetUserInfo = null;
          if (log.targetUserId) {
            const targetUser = await db
              .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
              .from(users)
              .where(eq(users.id, log.targetUserId))
              .limit(1);
            if (targetUser.length > 0) {
              targetUserInfo = targetUser[0];
            }
          }

          return {
            ...log,
            targetUserEmail: targetUserInfo?.email,
            targetUserName: targetUserInfo?.firstName,
          };
        })
      );

      return enrichedLogs;
    } catch (error) {
      console.error('❌ [AuditLog] خطأ في جلب السجلات:', error);
      return [];
    }
  }

  async getRecentActivity(limit: number = 50): Promise<any[]> {
    return this.getAuditLogs({ limit });
  }

  async getUserActivityHistory(userId: string, limit: number = 100): Promise<any[]> {
    return this.getAuditLogs({ targetUserId: userId, limit });
  }

  async getProjectActivityHistory(projectId: string, limit: number = 100): Promise<any[]> {
    return this.getAuditLogs({ projectId, limit });
  }

  async getActionSummary(startDate?: Date, endDate?: Date): Promise<Record<string, number>> {
    try {
      const logs = await this.getAuditLogs({ startDate, endDate, limit: 10000 });
      
      const summary: Record<string, number> = {
        assign: 0,
        unassign: 0,
        update_permissions: 0,
        bulk_assign: 0,
        bulk_unassign: 0,
      };

      for (const log of logs) {
        if (summary[log.action] !== undefined) {
          summary[log.action]++;
        }
      }

      return summary;
    } catch (error) {
      console.error('❌ [AuditLog] خطأ في إنشاء ملخص العمليات:', error);
      return {};
    }
  }
}

export const auditLogService = AuditLogService.getInstance();
