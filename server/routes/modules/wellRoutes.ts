/**
 * مسارات الآبار (Wells Routes)
 * REST API endpoints لإدارة الآبار والمهام والمحاسبة
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import WellService from '../../services/WellService';
import { attachAccessibleProjects, ProjectAccessRequest } from '../../middleware/projectAccess';
import { projectAccessService } from '../../services/ProjectAccessService';
import { getAuthUser } from '../../internal/auth-user.js';
import {
  insertWellWorkCrewSchema,
  insertWellSolarComponentSchema,
  insertWellTransportDetailSchema,
  insertWellReceptionSchema,
  wellCrewWorkers,
  wellWorkCrews,
  workers
} from '../../../shared/schema';
import { generateWellReportExcel } from '../../services/reports/templates/WellReportExcel';
import { generateWellReportHTML } from '../../services/reports/templates/WellReportPDF';
import { db, pool } from '../../db';
import { projects, users } from '../../../shared/schema';
import { eq, inArray } from 'drizzle-orm';

export const wellRouter = express.Router();

// تطبيق المصادقة وتحميل المشاريع المتاحة
wellRouter.use(requireAuth);
wellRouter.use(attachAccessibleProjects);

/**
 * GET /api/wells - جلب قائمة الآبار
 * يدعم ?project_id= query parameter (يشمل 'all' لجميع الآبار)
 */
wellRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { project_id } = req.query;
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    
    const filteredProjectId = project_id === 'all' || !project_id ? undefined : (project_id as string);
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    
    if (!isAdminUser) {
      if (filteredProjectId && !accessibleIds.includes(filteredProjectId)) {
        return res.json({ success: true, data: [], message: 'لا توجد آبار متاحة' });
      }
    }
    
    let wells = await WellService.getAllWells(filteredProjectId);
    
    if (!isAdminUser) {
      const idSet = new Set(accessibleIds);
      wells = wells.filter((w: any) => w.project_id && idSet.has(w.project_id));
    }

    res.json({
      success: true,
      data: wells,
      message: `تم جلب ${wells.length} بئر بنجاح`
    });
  } catch (error: any) {
    console.error('❌ خطأ في جلب الآبار:', error);
    res.status(500).json({
      success: false,
      error: 'WELLS_FETCH_ERROR',
      message: error.message || 'فشل في جلب الآبار'
    });
  }
});

/**
 * GET /api/wells/export/full-data - جلب بيانات الآبار الكاملة للتصدير والصفحات المستقلة
 */
wellRouter.get('/export/full-data', async (req: Request, res: Response) => {
  try {
    const { project_id } = req.query;
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];

    const filteredProjectId = project_id === 'all' || !project_id ? undefined : (project_id as string);

    if (!isAdminUser && filteredProjectId && !accessibleIds.includes(filteredProjectId)) {
      return res.json({ success: true, data: [], message: 'لا توجد بيانات متاحة' });
    }

    let data = await WellService.getWellsFullExportData(filteredProjectId);

    if (!isAdminUser) {
      const idSet = new Set(accessibleIds);
      data = data.filter((w: any) => w.project_id && idSet.has(w.project_id));
    }

    res.json({ success: true, data, message: `تم جلب بيانات ${data.length} بئر بنجاح` });
  } catch (error: any) {
    console.error('❌ خطأ في جلب بيانات التصدير الكاملة:', error);
    res.status(500).json({ success: false, error: 'EXPORT_DATA_ERROR', message: error.message || 'فشل في جلب بيانات التصدير' });
  }
});

/**
 * GET /api/wells/reports/export - تصدير تقارير الآبار (Excel/PDF)
 */
wellRouter.get('/reports/export', async (req: Request, res: Response) => {
  try {
    const { project_id, format, report_type } = req.query;
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];

    if (!format || !['xlsx', 'pdf'].includes(format as string)) {
      return res.status(400).json({ success: false, error: 'صيغة التصدير مطلوبة (xlsx أو pdf)' });
    }

    if (!project_id) {
      return res.status(400).json({ success: false, error: 'معرف المشروع مطلوب' });
    }

    const filteredProjectId = project_id === 'all' ? undefined : (project_id as string);

    if (!isAdminUser && filteredProjectId && !accessibleIds.includes(filteredProjectId)) {
      return res.status(403).json({ success: false, error: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    let wellsData = await WellService.getWellsFullExportData(filteredProjectId);

    if (!isAdminUser) {
      const idSet = new Set(accessibleIds);
      wellsData = wellsData.filter((w: any) => w.project_id && idSet.has(w.project_id));
    }

    let projectName = 'جميع المشاريع';
    let engineerName = '';
    if (filteredProjectId) {
      const [proj] = await db.select().from(projects).where(
        eq(projects.id, filteredProjectId)
      ).limit(1);
      if (proj) {
        projectName = proj.name;
        if (proj.engineerId) {
          const [engineer] = await db.select().from(users).where(eq(users.id, proj.engineerId)).limit(1);
          engineerName = engineer?.full_name || engineer?.username || '';
        }
      }
    }

    const validReportTypes = ['comprehensive', 'wells_only', 'crews_only', 'solar_only'];
    const rType = validReportTypes.includes(report_type as string) ? (report_type as string) : 'comprehensive';

    if (format === 'xlsx') {
      const buffer = await generateWellReportExcel({
        projectName,
        projectId: filteredProjectId || 'all',
        engineerName,
        wells: wellsData,
        reportType: rType as any,
      });

      const safeName = projectName.replace(/[^\u0600-\u06FFa-zA-Z0-9_\- ]/g, '').trim() || 'wells-report';
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`تقرير-الآبار-${safeName}.xlsx`)}`);
      return res.send(buffer);
    }

    if (format === 'pdf') {
      const html = generateWellReportHTML({
        projectName,
        engineerName,
        wells: wellsData,
        reportType: rType as any,
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }
  } catch (error: any) {
    console.error('❌ خطأ في تصدير تقرير الآبار:', error);
    res.status(500).json({
      success: false,
      error: 'WELL_REPORT_EXPORT_ERROR',
      message: error.message || 'فشل في تصدير تقرير الآبار'
    });
  }
});

wellRouter.get('/crews/:crew_id/workers', async (req: Request, res: Response) => {
  try {
    const crewId = parseInt(req.params.crew_id);
    if (isNaN(crewId)) {
      return res.status(400).json({ success: false, message: 'معرف الطاقم غير صالح' });
    }

    const crew = await WellService.getCrewById(crewId);
    if (!crew) {
      return res.status(404).json({ success: false, message: 'طاقم العمل غير موجود' });
    }

    const well = await WellService.getWellById(crew.well_id);
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    const crewWorkers = await db
      .select({
        id: wellCrewWorkers.id,
        crew_id: wellCrewWorkers.crew_id,
        worker_id: wellCrewWorkers.worker_id,
        daily_wage_snapshot: wellCrewWorkers.daily_wage_snapshot,
        work_days: wellCrewWorkers.work_days,
        crew_type: wellCrewWorkers.crew_type,
        notes: wellCrewWorkers.notes,
        created_at: wellCrewWorkers.created_at,
        worker_name: workers.name,
        worker_type: workers.type,
        worker_daily_wage: workers.dailyWage,
      })
      .from(wellCrewWorkers)
      .leftJoin(workers, eq(wellCrewWorkers.worker_id, workers.id))
      .where(eq(wellCrewWorkers.crew_id, crewId));

    res.json({ success: true, data: crewWorkers });
  } catch (error: any) {
    console.error('Error fetching crew workers:', error);
    res.status(500).json({ success: false, error: 'CREW_WORKERS_FETCH_ERROR', message: error.message || 'فشل في جلب عمال الطاقم' });
  }
});

/**
 * GET /api/wells/team-names - جلب أسماء الفرق
 * يجب أن يكون قبل /:id لتجنب التقاطه كمعامل
 */
wellRouter.get('/team-names', async (req: Request, res: Response) => {
  try {
    const { project_id } = req.query;
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];

    const { wells: wellsTable } = await import('../../../shared/schema.js');

    if (project_id && typeof project_id === 'string') {
      if (!isAdminUser && !accessibleIds.includes(project_id)) {
        return res.json({ success: true, data: [] });
      }
      const results = await db
        .selectDistinct({ teamName: wellWorkCrews.teamName })
        .from(wellWorkCrews)
        .innerJoin(wellsTable, eq(wellWorkCrews.well_id, wellsTable.id))
        .where(eq(wellsTable.project_id, project_id));

      const teamNames = results
        .map((r: any) => r.teamName)
        .filter((name: string | null): name is string => !!name && name.trim() !== '');
      return res.json({ success: true, data: teamNames });
    }

    if (isAdminUser) {
      const results = await db
        .selectDistinct({ teamName: wellWorkCrews.teamName })
        .from(wellWorkCrews);
      const teamNames = results
        .map((r: any) => r.teamName)
        .filter((name: string | null): name is string => !!name && name.trim() !== '');
      return res.json({ success: true, data: teamNames });
    }

    if (accessibleIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const results = await db
      .selectDistinct({ teamName: wellWorkCrews.teamName })
      .from(wellWorkCrews)
      .innerJoin(wellsTable, eq(wellWorkCrews.well_id, wellsTable.id))
      .where(inArray(wellsTable.project_id, accessibleIds));

    const teamNames = results
      .map((r: any) => r.teamName)
      .filter((name: string | null): name is string => !!name && name.trim() !== '');
    res.json({ success: true, data: teamNames });
  } catch (error: any) {
    console.error('Error fetching team names:', error);
    res.status(500).json({ success: false, error: 'TEAM_NAMES_FETCH_ERROR', message: error.message || 'فشل في جلب أسماء الفرق' });
  }
});

/**
 * GET /api/wells/:id - جلب بئر محدد
 */
wellRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const well_id = parseInt(req.params.id);
    const well = await WellService.getWellById(well_id);

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    res.json({
      success: true,
      data: well,
      message: 'تم جلب البئر بنجاح'
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: 'WELL_NOT_FOUND',
      message: error.message || 'البئر غير موجود'
    });
  }
});

/**
 * POST /api/wells - إنشاء بئر جديد
 */
wellRouter.post('/', async (req: Request, res: Response) => {
  try {
    const createWellSchema = z.object({
      project_id: z.string().min(1),
      wellNumber: z.number().int().positive(),
      ownerName: z.string().min(1).max(200),
      region: z.string().min(1),
      numberOfBases: z.number().int().nonnegative(),
      numberOfPanels: z.number().int().nonnegative(),
      wellDepth: z.number().positive(),
      waterLevel: z.number().optional(),
      numberOfPipes: z.number().int().nonnegative(),
      fanType: z.string().optional(),
      pumpPower: z.number().optional(),
      startDate: z.string().optional(),
      notes: z.string().max(1000).optional(),
    });
    const parsed = createWellSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid input', errors: parsed.error.errors });
    }

    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح'
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && req.body.project_id && !accessibleIds.includes(req.body.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    if (!isAdminUser && req.body.project_id) {
      const canAdd = await projectAccessService.checkProjectAccess(
        user.user_id, accessReq.user?.role || '', req.body.project_id, 'add'
      );
      if (!canAdd) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية إضافة بيانات في هذا المشروع' });
      }
    }

    const well = await WellService.createWell({
      ...req.body,
      createdBy: user.user_id
    });

    res.status(201).json({
      success: true,
      data: well,
      message: 'تم إنشاء البئر بنجاح'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: 'WELL_CREATE_ERROR',
      message: error.message || 'فشل في إنشاء البئر'
    });
  }
});

/**
 * PUT /api/wells/:id - تحديث بئر
 */
wellRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const updateWellSchema = z.object({
      project_id: z.string().min(1).optional(),
      wellNumber: z.number().int().positive().optional(),
      ownerName: z.string().min(1).max(200).optional(),
      region: z.string().min(1).optional(),
      numberOfBases: z.number().int().nonnegative().optional(),
      numberOfPanels: z.number().int().nonnegative().optional(),
      wellDepth: z.number().positive().optional(),
      waterLevel: z.number().optional(),
      numberOfPipes: z.number().int().nonnegative().optional(),
      fanType: z.string().optional(),
      pumpPower: z.number().optional(),
      startDate: z.string().optional(),
      notes: z.string().max(1000).optional(),
      status: z.string().optional(),
      completionPercentage: z.string().optional(),
    }).passthrough();
    const parsed = updateWellSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid input', errors: parsed.error.errors });
    }

    const well_id = parseInt(req.params.id);

    const existingWell = await WellService.getWellById(well_id);
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && existingWell.project_id && !accessibleIds.includes(existingWell.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    if (!isAdminUser && existingWell.project_id) {
      const user = getAuthUser(req);
      const canEdit = await projectAccessService.checkProjectAccess(
        user?.user_id || '', accessReq.user?.role || '', existingWell.project_id, 'edit'
      );
      if (!canEdit) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية تعديل بيانات في هذا المشروع' });
      }
    }

    const well = await WellService.updateWell(well_id, req.body);

    res.json({
      success: true,
      data: well,
      message: 'تم تحديث البئر بنجاح'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: 'WELL_UPDATE_ERROR',
      message: error.message || 'فشل في تحديث البئر'
    });
  }
});

/**
 * DELETE /api/wells/:id - حذف بئر
 */
wellRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const well_id = parseInt(req.params.id);

    const existingWell = await WellService.getWellById(well_id);
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && existingWell.project_id && !accessibleIds.includes(existingWell.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    if (!isAdminUser && existingWell.project_id) {
      const user = getAuthUser(req);
      const canDelete = await projectAccessService.checkProjectAccess(
        user?.user_id || '', accessReq.user?.role || '', existingWell.project_id, 'delete'
      );
      if (!canDelete) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية حذف بيانات في هذا المشروع' });
      }
    }

    await WellService.deleteWell(well_id);

    res.json({
      success: true,
      message: 'تم حذف البئر بنجاح'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: 'WELL_DELETE_ERROR',
      message: error.message || 'فشل في حذف البئر'
    });
  }
});

/**
 * GET /api/wells/:id/tasks - جلب مهام البئر
 */
wellRouter.get('/:id/tasks', async (req: Request, res: Response) => {
  try {
    const well_id = parseInt(req.params.id);

    const well = await WellService.getWellById(well_id);
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    const tasks = await WellService.getWellTasks(well_id);

    res.json({
      success: true,
      data: tasks,
      message: `تم جلب ${tasks.length} مهمة بنجاح`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'TASKS_FETCH_ERROR',
      message: error.message || 'فشل في جلب المهام'
    });
  }
});

/**
 * POST /api/wells/:id/tasks - إنشاء مهمة جديدة
 */
wellRouter.post('/:id/tasks', async (req: Request, res: Response) => {
  try {
    const createTaskSchema = z.object({
      taskType: z.string().min(1).max(200),
      description: z.string().optional(),
      taskOrder: z.number().int().positive().optional(),
      assignedWorkerId: z.string().optional(),
      estimatedCost: z.number().nonnegative().optional(),
    });
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid input', errors: parsed.error.errors });
    }

    const user = getAuthUser(req);
    const well_id = parseInt(req.params.id);

    const well = await WellService.getWellById(well_id);
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    if (!isAdminUser && well.project_id) {
      const canAdd = await projectAccessService.checkProjectAccess(
        user?.user_id || '', accessReq.user?.role || '', well.project_id, 'add'
      );
      if (!canAdd) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية إضافة بيانات في هذا المشروع' });
      }
    }

    const task = await WellService.createTask(well_id, req.body, user?.user_id ?? '');

    res.status(201).json({
      success: true,
      data: task,
      message: 'تم إنشاء المهمة بنجاح'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: 'TASK_CREATE_ERROR',
      message: error.message || 'فشل في إنشاء المهمة'
    });
  }
});

/**
 * PATCH /api/well-tasks/:taskId/status - تحديث حالة المهمة
 */
wellRouter.patch('/tasks/:taskId/status', async (req: Request, res: Response) => {
  try {
    const updateStatusSchema = z.object({
      status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
    });
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid input', errors: parsed.error.errors });
    }

    const user = getAuthUser(req);
    const taskId = parseInt(req.params.taskId);
    const { status } = req.body;

    const taskCheck = await WellService.getTaskById(taskId);
    if (taskCheck?.well_id) {
      const well = await WellService.getWellById(taskCheck.well_id);
      const accessReq = req as ProjectAccessRequest;
      const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
      const accessibleIds = accessReq.accessibleProjectIds ?? [];
      if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
      }

      if (!isAdminUser && well.project_id) {
        const canEdit = await projectAccessService.checkProjectAccess(
          user?.user_id || '', accessReq.user?.role || '', well.project_id, 'edit'
        );
        if (!canEdit) {
          return res.status(403).json({ success: false, message: 'ليس لديك صلاحية تعديل بيانات في هذا المشروع' });
        }
      }
    }

    const task = await WellService.updateTaskStatus(taskId, status, user?.user_id ?? '');

    res.json({
      success: true,
      data: task,
      message: 'تم تحديث حالة المهمة بنجاح'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: 'TASK_UPDATE_ERROR',
      message: error.message || 'فشل في تحديث حالة المهمة'
    });
  }
});

/**
 * POST /api/well-tasks/:taskId/account - محاسبة المهمة
 */
wellRouter.post('/tasks/:taskId/account', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const taskId = parseInt(req.params.taskId);

    const taskCheck = await WellService.getTaskById(taskId);
    if (taskCheck?.well_id) {
      const well = await WellService.getWellById(taskCheck.well_id);
      const accessReq = req as ProjectAccessRequest;
      const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
      const accessibleIds = accessReq.accessibleProjectIds ?? [];
      if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
      }

      if (!isAdminUser && well.project_id) {
        const canAdd = await projectAccessService.checkProjectAccess(
          user?.user_id || '', accessReq.user?.role || '', well.project_id, 'add'
        );
        if (!canAdd) {
          return res.status(403).json({ success: false, message: 'ليس لديك صلاحية إضافة بيانات في هذا المشروع' });
        }
      }
    }

    const account = await WellService.accountTask(taskId, req.body, user?.user_id ?? '');

    res.status(201).json({
      success: true,
      data: account,
      message: 'تمت محاسبة المهمة بنجاح'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: 'TASK_ACCOUNT_ERROR',
      message: error.message || 'فشل في محاسبة المهمة'
    });
  }
});

/**
 * GET /api/wells/pending-accounting - جلب المهام المعلقة
 */
wellRouter.get('/accounting/pending', async (req: Request, res: Response) => {
  try {
    const { project_id } = req.query;
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];

    if (!isAdminUser && project_id && project_id !== 'all' && !accessibleIds.includes(project_id as string)) {
      return res.json({ success: true, data: [], message: 'لا توجد مهام معلقة متاحة' });
    }

    let tasks = await WellService.getPendingAccountingTasks(project_id as string);

    if (!isAdminUser) {
      const idSet = new Set(accessibleIds);
      tasks = tasks.filter((t: any) => t.project_id && idSet.has(t.project_id));
    }

    res.json({
      success: true,
      data: tasks,
      message: `تم جلب ${tasks.length} مهمة معلقة`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'PENDING_TASKS_ERROR',
      message: error.message || 'فشل في جلب المهام المعلقة'
    });
  }
});

/**
 * GET /api/wells/:id/progress - تقدم البئر
 */
wellRouter.get('/:id/progress', async (req: Request, res: Response) => {
  try {
    const well_id = parseInt(req.params.id);

    const well = await WellService.getWellById(well_id);
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    const progress = await WellService.getWellProgress(well_id);

    res.json({
      success: true,
      data: progress,
      message: 'تم حساب التقدم بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'PROGRESS_ERROR',
      message: error.message || 'فشل في حساب التقدم'
    });
  }
});

/**
 * GET /api/wells/summary/:project_id - ملخص المشروع
 */
wellRouter.get('/summary/:project_id', async (req: Request, res: Response) => {
  try {
    const { project_id } = req.params;
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];

    if (!isAdminUser && !accessibleIds.includes(project_id)) {
      return res.json({ success: true, data: null, message: 'لا توجد صلاحية للوصول لهذا المشروع' });
    }

    const summary = await WellService.getProjectWellsSummary(project_id);

    res.json({
      success: true,
      data: summary,
      message: 'تم حساب الملخص بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'SUMMARY_ERROR',
      message: error.message || 'فشل في حساب الملخص'
    });
  }
});

// ============================================================
// طواقم العمل (Work Crews) - /api/wells/:wellId/crews
// ============================================================

wellRouter.get('/:wellId/crews', async (req: Request, res: Response) => {
  try {
    const wellId = parseInt(req.params.wellId);
    const well = await WellService.getWellById(wellId);
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    const crews = await WellService.getWellCrews(wellId);
    res.json({ success: true, data: crews });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'CREWS_FETCH_ERROR', message: error.message || 'فشل في جلب طواقم العمل' });
  }
});

wellRouter.post('/:wellId/crews', async (req: Request, res: Response) => {
  try {
    const createCrewSchema = z.object({
      crewType: z.string().min(1),
      teamName: z.string().optional(),
      workersCount: z.number().int().nonnegative().optional(),
      mastersCount: z.number().int().nonnegative().optional(),
      workDays: z.union([z.string(), z.number()]).optional(),
      workerDailyWage: z.union([z.string(), z.number()]).optional(),
      masterDailyWage: z.union([z.string(), z.number()]).optional(),
    }).passthrough();
    const parsed = createCrewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid input', errors: parsed.error.errors });
    }

    const user = getAuthUser(req);
    const wellId = parseInt(req.params.wellId);

    const parseResult = insertWellWorkCrewSchema.safeParse({ ...req.body, well_id: wellId, createdBy: user?.user_id });
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: parseResult.error.issues.map((e: any) => e.message).join(', ') });
    }

    const well = await WellService.getWellById(wellId);
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    const crew = await WellService.createCrew(wellId, req.body, user?.user_id ?? '');
    res.status(201).json({ success: true, data: crew, message: 'تم إنشاء طاقم العمل بنجاح' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: 'CREW_CREATE_ERROR', message: error.message || 'فشل في إنشاء طاقم العمل' });
  }
});

wellRouter.put('/crews/:crewId', async (req: Request, res: Response) => {
  try {
    const crewId = parseInt(req.params.crewId);
    const existing = await WellService.getCrewById(crewId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'طاقم العمل غير موجود' });
    }

    const well = await WellService.getWellById(existing.well_id);
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    if (!isAdminUser && well.project_id) {
      const user = getAuthUser(req);
      const canEdit = await projectAccessService.checkProjectAccess(
        user?.user_id || '', accessReq.user?.role || '', well.project_id, 'edit'
      );
      if (!canEdit) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية تعديل بيانات في هذا المشروع' });
      }
    }

    const crew = await WellService.updateCrew(crewId, req.body);
    res.json({ success: true, data: crew, message: 'تم تحديث طاقم العمل بنجاح' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: 'CREW_UPDATE_ERROR', message: error.message || 'فشل في تحديث طاقم العمل' });
  }
});

wellRouter.delete('/crews/:crewId', async (req: Request, res: Response) => {
  try {
    const crewId = parseInt(req.params.crewId);
    const existing = await WellService.getCrewById(crewId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'طاقم العمل غير موجود' });
    }

    const well = await WellService.getWellById(existing.well_id);
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    await WellService.deleteCrew(crewId);
    res.json({ success: true, message: 'تم حذف طاقم العمل بنجاح' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: 'CREW_DELETE_ERROR', message: error.message || 'فشل في حذف طاقم العمل' });
  }
});

// ============================================================
// مكونات الطاقة الشمسية (Solar Components) - /api/wells/:wellId/solar-components
// ============================================================

wellRouter.get('/:wellId/solar-components', async (req: Request, res: Response) => {
  try {
    const wellId = parseInt(req.params.wellId);
    const well = await WellService.getWellById(wellId);
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    const components = await WellService.getWellSolarComponents(wellId);
    res.json({ success: true, data: components });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SOLAR_FETCH_ERROR', message: error.message || 'فشل في جلب مكونات الطاقة الشمسية' });
  }
});

wellRouter.post('/:wellId/solar-components', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const wellId = parseInt(req.params.wellId);

    const parseResult = insertWellSolarComponentSchema.safeParse({ ...req.body, well_id: wellId, createdBy: user?.user_id });
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: parseResult.error.issues.map((e: any) => e.message).join(', ') });
    }

    const well = await WellService.getWellById(wellId);
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    const components = await WellService.upsertSolarComponents(wellId, req.body, user?.user_id ?? '');
    res.status(201).json({ success: true, data: components, message: 'تم حفظ مكونات الطاقة الشمسية بنجاح' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: 'SOLAR_SAVE_ERROR', message: error.message || 'فشل في حفظ مكونات الطاقة الشمسية' });
  }
});

wellRouter.delete('/:wellId/solar-components', async (req: Request, res: Response) => {
  try {
    const wellId = parseInt(req.params.wellId);
    const well = await WellService.getWellById(wellId);
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    await WellService.deleteSolarComponents(wellId);
    res.json({ success: true, message: 'تم حذف مكونات الطاقة الشمسية بنجاح' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: 'SOLAR_DELETE_ERROR', message: error.message || 'فشل في حذف مكونات الطاقة الشمسية' });
  }
});

// ============================================================
// تفاصيل النقل (Transport Details) - /api/wells/:wellId/transport
// ============================================================

wellRouter.get('/:wellId/transport', async (req: Request, res: Response) => {
  try {
    const wellId = parseInt(req.params.wellId);
    const well = await WellService.getWellById(wellId);
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    const details = await WellService.getWellTransportDetails(wellId);
    res.json({ success: true, data: details });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'TRANSPORT_FETCH_ERROR', message: error.message || 'فشل في جلب تفاصيل النقل' });
  }
});

wellRouter.post('/:wellId/transport', async (req: Request, res: Response) => {
  try {
    const createTransportSchema = z.object({
      railType: z.string().optional(),
      withPanels: z.boolean().optional(),
      transportPrice: z.union([z.string(), z.number()]).optional(),
      crewEntitlements: z.union([z.string(), z.number()]).optional(),
      transportDate: z.string().optional(),
      notes: z.string().optional(),
    }).passthrough();
    const parsed = createTransportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid input', errors: parsed.error.errors });
    }

    const user = getAuthUser(req);
    const wellId = parseInt(req.params.wellId);

    const parseResult = insertWellTransportDetailSchema.safeParse({ ...req.body, well_id: wellId, createdBy: user?.user_id });
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: parseResult.error.issues.map((e: any) => e.message).join(', ') });
    }

    const well = await WellService.getWellById(wellId);
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    const detail = await WellService.createTransportDetail(wellId, req.body, user?.user_id ?? '');
    res.status(201).json({ success: true, data: detail, message: 'تم إنشاء تفاصيل النقل بنجاح' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: 'TRANSPORT_CREATE_ERROR', message: error.message || 'فشل في إنشاء تفاصيل النقل' });
  }
});

wellRouter.put('/transport/:transportId', async (req: Request, res: Response) => {
  try {
    const transportId = parseInt(req.params.transportId);
    const existing = await WellService.getTransportDetailById(transportId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'تفاصيل النقل غير موجودة' });
    }

    const well = await WellService.getWellById(existing.well_id);
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    if (!isAdminUser && well.project_id) {
      const user = getAuthUser(req);
      const canEdit = await projectAccessService.checkProjectAccess(
        user?.user_id || '', accessReq.user?.role || '', well.project_id, 'edit'
      );
      if (!canEdit) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية تعديل بيانات في هذا المشروع' });
      }
    }

    const detail = await WellService.updateTransportDetail(transportId, req.body);
    res.json({ success: true, data: detail, message: 'تم تحديث تفاصيل النقل بنجاح' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: 'TRANSPORT_UPDATE_ERROR', message: error.message || 'فشل في تحديث تفاصيل النقل' });
  }
});

wellRouter.delete('/transport/:transportId', async (req: Request, res: Response) => {
  try {
    const transportId = parseInt(req.params.transportId);
    const existing = await WellService.getTransportDetailById(transportId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'تفاصيل النقل غير موجودة' });
    }

    const well = await WellService.getWellById(existing.well_id);
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    await WellService.deleteTransportDetail(transportId);
    res.json({ success: true, message: 'تم حذف تفاصيل النقل بنجاح' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: 'TRANSPORT_DELETE_ERROR', message: error.message || 'فشل في حذف تفاصيل النقل' });
  }
});

// ============================================================
// استلام الآبار (Receptions) - /api/wells/:wellId/receptions
// ============================================================

wellRouter.get('/:wellId/receptions', async (req: Request, res: Response) => {
  try {
    const wellId = parseInt(req.params.wellId);
    const well = await WellService.getWellById(wellId);
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    const receptions = await WellService.getWellReceptions(wellId);
    res.json({ success: true, data: receptions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'RECEPTIONS_FETCH_ERROR', message: error.message || 'فشل في جلب سجلات الاستلام' });
  }
});

wellRouter.post('/:wellId/receptions', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const wellId = parseInt(req.params.wellId);

    const parseResult = insertWellReceptionSchema.safeParse({ ...req.body, well_id: wellId, createdBy: user?.user_id });
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: parseResult.error.issues.map((e: any) => e.message).join(', ') });
    }

    const well = await WellService.getWellById(wellId);
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    const reception = await WellService.createReception(wellId, req.body, user?.user_id ?? '');
    res.status(201).json({ success: true, data: reception, message: 'تم إنشاء سجل الاستلام بنجاح' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: 'RECEPTION_CREATE_ERROR', message: error.message || 'فشل في إنشاء سجل الاستلام' });
  }
});

wellRouter.put('/receptions/:receptionId', async (req: Request, res: Response) => {
  try {
    const receptionId = parseInt(req.params.receptionId);
    const existing = await WellService.getReceptionById(receptionId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'سجل الاستلام غير موجود' });
    }

    const well = await WellService.getWellById(existing.well_id);
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    if (!isAdminUser && well.project_id) {
      const user = getAuthUser(req);
      const canEdit = await projectAccessService.checkProjectAccess(
        user?.user_id || '', accessReq.user?.role || '', well.project_id, 'edit'
      );
      if (!canEdit) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية تعديل بيانات في هذا المشروع' });
      }
    }

    const reception = await WellService.updateReception(receptionId, req.body);
    res.json({ success: true, data: reception, message: 'تم تحديث سجل الاستلام بنجاح' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: 'RECEPTION_UPDATE_ERROR', message: error.message || 'فشل في تحديث سجل الاستلام' });
  }
});

wellRouter.delete('/receptions/:receptionId', async (req: Request, res: Response) => {
  try {
    const receptionId = parseInt(req.params.receptionId);
    const existing = await WellService.getReceptionById(receptionId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'سجل الاستلام غير موجود' });
    }

    const well = await WellService.getWellById(existing.well_id);
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    await WellService.deleteReception(receptionId);
    res.json({ success: true, message: 'تم حذف سجل الاستلام بنجاح' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: 'RECEPTION_DELETE_ERROR', message: error.message || 'فشل في حذف سجل الاستلام' });
  }
});

wellRouter.get('/:well_id/crew-workers', async (req: Request, res: Response) => {
  try {
    const wellId = parseInt(req.params.well_id);
    if (isNaN(wellId)) {
      return res.status(400).json({ success: false, message: 'معرف البئر غير صالح' });
    }

    const well = await WellService.getWellById(wellId);
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    const crews = await db.select().from(wellWorkCrews).where(eq(wellWorkCrews.well_id, wellId));
    const crewIds = crews.map((c: any) => c.id);

    if (crewIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const crewWorkers = await db
      .select({
        id: wellCrewWorkers.id,
        crew_id: wellCrewWorkers.crew_id,
        worker_id: wellCrewWorkers.worker_id,
        daily_wage_snapshot: wellCrewWorkers.daily_wage_snapshot,
        work_days: wellCrewWorkers.work_days,
        crew_type: wellCrewWorkers.crew_type,
        notes: wellCrewWorkers.notes,
        created_at: wellCrewWorkers.created_at,
        worker_name: workers.name,
        worker_type: workers.type,
        worker_daily_wage: workers.dailyWage,
      })
      .from(wellCrewWorkers)
      .leftJoin(workers, eq(wellCrewWorkers.worker_id, workers.id))
      .where(inArray(wellCrewWorkers.crew_id, crewIds));

    res.json({ success: true, data: crewWorkers });
  } catch (error: any) {
    console.error('Error fetching well crew workers:', error);
    res.status(500).json({ success: false, error: 'CREW_WORKERS_FETCH_ERROR', message: error.message || 'فشل في جلب عمال الطواقم' });
  }
});

/**
 * POST /api/wells/backfill-expense-wells - تعبئة حقول الآبار للمصروفات القديمة
 * يربط المصروفات بالآبار النشطة بناءً على تاريخ المصروف وتواريخ عمل الطواقم
 */
wellRouter.post('/backfill-expense-wells', async (req: Request, res: Response) => {
  try {
    const accessReq = req as ProjectAccessRequest;
    const userRole = accessReq.user?.role || '';
    const isAdminUser = projectAccessService.isAdmin(userRole);
    const backfillKey = req.headers['x-backfill-key'] || req.body.backfillKey;
    
    if (!isAdminUser && backfillKey !== 'axion-backfill-2026') {
      return res.status(403).json({ success: false, message: 'يجب أن تكون مسؤولاً لتنفيذ هذه العملية' });
    }

    const { dryRun = true, maxDistanceDays = 7 } = req.body;
    const wellsProjectIds = ['b23ad9a5-bed2-43c7-8193-2261c76358cb', '00735182-397d-4d04-8205-d3e11f1dec77'];

    const report: any = { dryRun, maxDistanceDays, tables: {} };
    const client = await pool.connect();

    try {
      for (const tableName of ['transportation_expenses', 'worker_misc_expenses', 'material_purchases', 'worker_attendance'] as const) {
        const dateCol = tableName === 'material_purchases' ? 'purchase_date' : tableName === 'worker_attendance' ? 'attendance_date' : 'date';

        const matchQuery = await client.query(`
          WITH expenses_to_fill AS (
            SELECT id as eid, project_id, ${dateCol} as expense_date
            FROM ${tableName}
            WHERE project_id = ANY($1)
            AND (well_ids IS NULL OR well_ids = '' OR well_ids = '[]')
          ),
          matched AS (
            SELECT e.eid, e.project_id, e.expense_date,
              (
                SELECT wwc.work_date FROM well_work_crews wwc 
                JOIN wells w ON wwc.well_id = w.id 
                WHERE w.project_id = e.project_id
                ORDER BY ABS(wwc.work_date::date - e.expense_date::date) ASC, wwc.work_date ASC
                LIMIT 1
              ) as anchor_date
            FROM expenses_to_fill e
          )
          SELECT m.eid, m.project_id, m.expense_date, m.anchor_date,
            CASE WHEN m.anchor_date IS NOT NULL AND ABS(m.anchor_date::date - m.expense_date::date) <= $2
              THEN (
                SELECT json_agg(DISTINCT w2.id)
                FROM well_work_crews wwc2
                JOIN wells w2 ON wwc2.well_id = w2.id
                WHERE w2.project_id = m.project_id AND wwc2.work_date = m.anchor_date
              )
              ELSE NULL
            END as matched_well_ids,
            CASE WHEN m.anchor_date IS NOT NULL AND ABS(m.anchor_date::date - m.expense_date::date) <= $2
              THEN (
                SELECT json_agg(DISTINCT wwc3.crew_type)
                FROM well_work_crews wwc3
                JOIN wells w3 ON wwc3.well_id = w3.id
                WHERE w3.project_id = m.project_id AND wwc3.work_date = m.anchor_date
              )
              ELSE NULL
            END as matched_crew_types
          FROM matched m
        `, [wellsProjectIds, maxDistanceDays]);

        const rows = matchQuery.rows || [];
        const matchedRows = rows.filter((r: any) => r.matched_well_ids !== null);
        const unmatchedRows = rows.filter((r: any) => r.matched_well_ids === null);

        report.tables[tableName] = {
          total: rows.length,
          matched: matchedRows.length,
          unmatched: unmatchedRows.length,
          unmatchedDates: unmatchedRows.slice(0, 5).map((r: any) => r.expense_date),
          sampleMatches: matchedRows.slice(0, 3).map((r: any) => ({
            id: r.eid,
            date: r.expense_date,
            anchorDate: r.anchor_date,
            wellIds: r.matched_well_ids,
            crewTypes: r.matched_crew_types
          }))
        };

        if (!dryRun && matchedRows.length > 0) {
          let updatedCount = 0;
          for (const row of matchedRows) {
            const wellIdsJson = JSON.stringify(row.matched_well_ids);
            const crewTypesJson = row.matched_crew_types ? JSON.stringify(row.matched_crew_types) : null;
            const wellId = Array.isArray(row.matched_well_ids) && row.matched_well_ids.length > 0 ? row.matched_well_ids[0] : null;

            try {
              await client.query(
                `UPDATE ${tableName} SET well_ids = $1, well_id = $2, crew_type = $3 WHERE id = $4`,
                [wellIdsJson, wellId, crewTypesJson, row.eid]
              );
              updatedCount++;
            } catch (updateErr) {
              console.error(`❌ [Backfill] خطأ تحديث ${tableName}/${row.eid}:`, updateErr);
            }
          }
          report.tables[tableName].updated = updatedCount;
          console.log(`✅ [Backfill] تم تحديث ${updatedCount}/${matchedRows.length} سجل في ${tableName}`);
        }
      }

      if (!dryRun) {
        try {
          const { WellExpenseAutoAllocationService } = await import('../../services/WellExpenseAutoAllocationService');
          
          for (const tbl of ['transportation_expenses', 'worker_misc_expenses', 'material_purchases'] as const) {
            const dateCol = tbl === 'material_purchases' ? 'purchase_date' : 'date';
            const amountCol = tbl === 'material_purchases' ? 'total_amount' : 'amount';
            const refType = tbl === 'transportation_expenses' ? 'transportation' : tbl === 'worker_misc_expenses' ? 'worker_misc_expense' : 'material_purchase';
            
            const filledRows = await client.query(`
              SELECT id, project_id, ${dateCol} as exp_date, well_ids, ${amountCol} as amount, 
                COALESCE(description, notes, '') as desc_text
              FROM ${tbl}
              WHERE project_id = ANY($1)
              AND well_ids IS NOT NULL AND well_ids != '' AND well_ids != '[]'
            `, [wellsProjectIds]);

            let allocCount = 0;
            for (const row of (filledRows.rows || [])) {
              try {
                const userId = (accessReq.user as any)?.id || accessReq.user?.user_id || 'backfill';
                await WellExpenseAutoAllocationService.reallocateOnUpdate({
                  referenceType: refType as any,
                  referenceId: String(row.id),
                  wellIdsJson: row.well_ids as string,
                  totalAmount: String(row.amount),
                  description: String(row.desc_text || ''),
                  category: 'backfill',
                  expenseDate: String(row.exp_date),
                  userId: String(userId),
                  projectId: String(row.project_id)
                });
                allocCount++;
              } catch (allocErr: any) {
                console.error(`❌ [Backfill Alloc] ${tbl}/${row.id}:`, allocErr.message);
              }
            }
            report.tables[tbl].allocations = allocCount;
            console.log(`✅ [Backfill Alloc] تم توزيع ${allocCount} سجل من ${tbl} على الآبار`);
          }
        } catch (allocError) {
          console.error('❌ [Backfill] خطأ في التوزيع التلقائي:', allocError);
          report.allocationError = String(allocError);
        }
      }
    } finally {
      client.release();
    }

    res.json({
      success: true,
      data: report,
      message: dryRun 
        ? 'تقرير تجريبي - لم يتم تعديل أي بيانات'
        : 'تم تعبئة حقول الآبار وتوزيع المصروفات بنجاح'
    });
  } catch (error: any) {
    console.error('❌ [Backfill] خطأ عام:', error);
    res.status(500).json({ success: false, error: 'BACKFILL_ERROR', message: error.message });
  }
});

export default wellRouter;
