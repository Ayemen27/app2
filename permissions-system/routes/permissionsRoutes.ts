import express, { Request, Response } from 'express';
import { db } from '../../app2/server/db';
import { users, projects, userProjectPermissions } from '../../app2/shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { accessControlService } from '../services/access-control.service';
import { auditLogService } from '../services/audit-log.service';
import { requireAuth, AuthenticatedRequest } from '../../app2/server/middleware/auth';

export const permissionsRouter = express.Router();

permissionsRouter.use(requireAuth);

const requireSuperAdmin = async (req: AuthenticatedRequest, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'غير مصرح' });
  }

  const isSuperAdmin = await accessControlService.isSuperAdmin(req.user.userId);
  if (!isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'تحتاج صلاحيات المدير الأول' });
  }

  next();
};

permissionsRouter.get('/users', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📋 [Permissions] جلب قائمة المستخدمين مع الصلاحيات');

    const usersWithPermissions = await accessControlService.getAllUsersWithPermissions();

    res.json({
      success: true,
      data: usersWithPermissions,
      message: `تم جلب ${usersWithPermissions.length} مستخدم`,
    });
  } catch (error: any) {
    console.error('❌ [Permissions] خطأ في جلب المستخدمين:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

permissionsRouter.get('/projects', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📋 [Permissions] جلب قائمة المشاريع');

    const projectsList = await db.select().from(projects).orderBy(projects.createdAt);

    const projectsWithUserCount = await Promise.all(
      projectsList.map(async (project) => {
        const userCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(userProjectPermissions)
          .where(eq(userProjectPermissions.projectId, project.id));

        return {
          ...project,
          userCount: Number(userCount[0]?.count || 0),
        };
      })
    );

    res.json({
      success: true,
      data: projectsWithUserCount,
      message: `تم جلب ${projectsList.length} مشروع`,
    });
  } catch (error: any) {
    console.error('❌ [Permissions] خطأ في جلب المشاريع:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

permissionsRouter.get('/user/:userId', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    console.log(`📋 [Permissions] جلب صلاحيات المستخدم: ${userId}`);

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    const permissions = await db
      .select({
        id: userProjectPermissions.id,
        projectId: userProjectPermissions.projectId,
        projectName: projects.name,
        projectStatus: projects.status,
        canView: userProjectPermissions.canView,
        canAdd: userProjectPermissions.canAdd,
        canEdit: userProjectPermissions.canEdit,
        canDelete: userProjectPermissions.canDelete,
        assignedAt: userProjectPermissions.assignedAt,
      })
      .from(userProjectPermissions)
      .leftJoin(projects, eq(userProjectPermissions.projectId, projects.id))
      .where(eq(userProjectPermissions.userId, userId));

    res.json({
      success: true,
      data: {
        user: {
          id: user[0].id,
          email: user[0].email,
          firstName: user[0].firstName,
          lastName: user[0].lastName,
          role: user[0].role,
          isActive: user[0].isActive,
        },
        permissions,
      },
      message: 'تم جلب صلاحيات المستخدم بنجاح',
    });
  } catch (error: any) {
    console.error('❌ [Permissions] خطأ في جلب صلاحيات المستخدم:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

permissionsRouter.post('/assign', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, projectId, canView, canAdd, canEdit, canDelete } = req.body;

    if (!userId || !projectId) {
      return res.status(400).json({ success: false, message: 'معرف المستخدم والمشروع مطلوبان' });
    }

    console.log(`📋 [Permissions] ربط المستخدم ${userId} بالمشروع ${projectId}`);

    const result = await accessControlService.assignUserToProject(
      req.user!.userId,
      userId,
      projectId,
      { canView: canView ?? true, canAdd, canEdit, canDelete }
    );

    if (result.success) {
      await auditLogService.logAssignment(
        req.user!.userId,
        userId,
        projectId,
        { canView: canView ?? true, canAdd: canAdd ?? false, canEdit: canEdit ?? false, canDelete: canDelete ?? false },
        req.ip || undefined,
        req.get('User-Agent')
      );

      const user = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
      const project = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, projectId)).limit(1);

      console.log(`✅ [Permissions] تم ربط ${user[0]?.email} بمشروع ${project[0]?.name}`);
    }

    res.status(result.success ? 201 : 400).json(result);
  } catch (error: any) {
    console.error('❌ [Permissions] خطأ في ربط المستخدم بالمشروع:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

permissionsRouter.delete('/unassign', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, projectId } = req.body;

    if (!userId || !projectId) {
      return res.status(400).json({ success: false, message: 'معرف المستخدم والمشروع مطلوبان' });
    }

    console.log(`📋 [Permissions] فصل المستخدم ${userId} من المشروع ${projectId}`);

    const oldPermissions = await accessControlService.getUserPermissionsForProject(userId, projectId);

    const result = await accessControlService.unassignUserFromProject(
      req.user!.userId,
      userId,
      projectId
    );

    if (result.success && oldPermissions) {
      await auditLogService.logUnassignment(
        req.user!.userId,
        userId,
        projectId,
        {
          canView: oldPermissions.canView,
          canAdd: oldPermissions.canAdd,
          canEdit: oldPermissions.canEdit,
          canDelete: oldPermissions.canDelete,
        },
        req.ip || undefined,
        req.get('User-Agent')
      );
    }

    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    console.error('❌ [Permissions] خطأ في فصل المستخدم من المشروع:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

permissionsRouter.put('/update', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, projectId, canView, canAdd, canEdit, canDelete } = req.body;

    if (!userId || !projectId) {
      return res.status(400).json({ success: false, message: 'معرف المستخدم والمشروع مطلوبان' });
    }

    console.log(`📋 [Permissions] تحديث صلاحيات المستخدم ${userId} على المشروع ${projectId}`);

    const oldPermissions = await accessControlService.getUserPermissionsForProject(userId, projectId);

    const result = await accessControlService.updateUserPermissions(
      req.user!.userId,
      userId,
      projectId,
      { canView, canAdd, canEdit, canDelete }
    );

    if (result.success && oldPermissions) {
      await auditLogService.logPermissionUpdate(
        req.user!.userId,
        userId,
        projectId,
        {
          canView: oldPermissions.canView,
          canAdd: oldPermissions.canAdd,
          canEdit: oldPermissions.canEdit,
          canDelete: oldPermissions.canDelete,
        },
        { canView: canView ?? oldPermissions.canView, canAdd: canAdd ?? oldPermissions.canAdd, canEdit: canEdit ?? oldPermissions.canEdit, canDelete: canDelete ?? oldPermissions.canDelete },
        req.ip || undefined,
        req.get('User-Agent')
      );
    }

    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    console.error('❌ [Permissions] خطأ في تحديث الصلاحيات:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

permissionsRouter.post('/bulk-assign', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userIds, projectId, canView, canAdd, canEdit, canDelete } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !projectId) {
      return res.status(400).json({ success: false, message: 'قائمة المستخدمين ومعرف المشروع مطلوبان' });
    }

    console.log(`📋 [Permissions] ربط ${userIds.length} مستخدم بالمشروع ${projectId}`);

    const result = await accessControlService.bulkAssignUsersToProject(
      req.user!.userId,
      userIds,
      projectId,
      { canView: canView ?? true, canAdd, canEdit, canDelete }
    );

    if (result.assigned > 0) {
      await auditLogService.log({
        action: 'bulk_assign',
        actorId: req.user!.userId,
        projectId,
        newPermissions: { canView: canView ?? true, canAdd: canAdd ?? false, canEdit: canEdit ?? false, canDelete: canDelete ?? false },
        ipAddress: req.ip || undefined,
        userAgent: req.get('User-Agent'),
        notes: `تم ربط ${result.assigned} مستخدم مجمع`,
      });
    }

    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    console.error('❌ [Permissions] خطأ في الربط المجمع:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

permissionsRouter.get('/audit-logs', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, projectId, action, limit, offset } = req.query;

    console.log('📋 [Permissions] جلب سجل التغييرات');

    const logs = await auditLogService.getAuditLogs({
      targetUserId: userId as string,
      projectId: projectId as string,
      action: action as string,
      limit: limit ? parseInt(limit as string) : 100,
      offset: offset ? parseInt(offset as string) : 0,
    });

    res.json({
      success: true,
      data: logs,
      message: `تم جلب ${logs.length} سجل`,
    });
  } catch (error: any) {
    console.error('❌ [Permissions] خطأ في جلب سجل التغييرات:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

permissionsRouter.get('/my-projects', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'غير مصرح' });
    }

    console.log(`📋 [Permissions] جلب مشاريع المستخدم: ${req.user.email}`);

    const projectIds = await accessControlService.getUserProjects(req.user.userId);

    if (projectIds.length === 0) {
      return res.json({ success: true, data: [], message: 'لا توجد مشاريع مرتبطة' });
    }

    const userProjects = await db
      .select()
      .from(projects)
      .where(sql`${projects.id} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`);

    res.json({
      success: true,
      data: userProjects,
      message: `تم جلب ${userProjects.length} مشروع`,
    });
  } catch (error: any) {
    console.error('❌ [Permissions] خطأ في جلب مشاريع المستخدم:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

permissionsRouter.get('/my-permissions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'غير مصرح' });
    }

    console.log(`📋 [Permissions] جلب صلاحيات المستخدم الحالي: ${req.user.email}`);

    const isSuperAdmin = await accessControlService.isSuperAdmin(req.user.userId);

    const permissions = await db
      .select({
        projectId: userProjectPermissions.projectId,
        projectName: projects.name,
        canView: userProjectPermissions.canView,
        canAdd: userProjectPermissions.canAdd,
        canEdit: userProjectPermissions.canEdit,
        canDelete: userProjectPermissions.canDelete,
      })
      .from(userProjectPermissions)
      .leftJoin(projects, eq(userProjectPermissions.projectId, projects.id))
      .where(eq(userProjectPermissions.userId, req.user.userId));

    res.json({
      success: true,
      data: {
        isSuperAdmin,
        role: req.user.role,
        permissions,
      },
      message: 'تم جلب الصلاحيات بنجاح',
    });
  } catch (error: any) {
    console.error('❌ [Permissions] خطأ في جلب صلاحيات المستخدم:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

permissionsRouter.post('/make-super-admin', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'معرف المستخدم مطلوب' });
    }

    console.log(`📋 [Permissions] ترقية المستخدم ${userId} إلى مدير أول`);

    const updated = await db
      .update(users)
      .set({ role: 'super_admin', updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    await auditLogService.log({
      action: 'update_permissions',
      actorId: req.user!.userId,
      targetUserId: userId,
      oldPermissions: { role: updated[0].role },
      newPermissions: { role: 'super_admin' },
      ipAddress: req.ip || undefined,
      userAgent: req.get('User-Agent'),
      notes: 'ترقية إلى مدير أول',
    });

    res.json({
      success: true,
      message: 'تم ترقية المستخدم إلى مدير أول بنجاح',
      data: { id: updated[0].id, email: updated[0].email, role: updated[0].role },
    });
  } catch (error: any) {
    console.error('❌ [Permissions] خطأ في ترقية المستخدم:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default permissionsRouter;
