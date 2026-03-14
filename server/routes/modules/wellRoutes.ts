/**
 * مسارات الآبار (Wells Routes)
 * REST API endpoints لإدارة الآبار والمهام والمحاسبة
 */

import express, { Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import WellService from '../../services/WellService';
import { attachAccessibleProjects, ProjectAccessRequest } from '../../middleware/projectAccess';
import { projectAccessService } from '../../services/ProjectAccessService';
import { getAuthUser } from '../../internal/auth-user.js';
import {
  insertWellWorkCrewSchema,
  insertWellSolarComponentSchema,
  insertWellTransportDetailSchema,
  insertWellReceptionSchema
} from '../../../shared/schema';

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

export default wellRouter;
