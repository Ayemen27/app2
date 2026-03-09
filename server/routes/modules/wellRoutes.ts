/**
 * مسارات الآبار (Wells Routes)
 * REST API endpoints لإدارة الآبار والمهام والمحاسبة
 */

import express, { Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import WellService from '../../services/WellService';
import { attachAccessibleProjects, ProjectAccessRequest } from '../../middleware/projectAccess';
import { projectAccessService } from '../../services/ProjectAccessService';

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
    const user = (req as any).user;
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

    const well = await WellService.createWell({
      ...req.body,
      createdBy: user.id
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
    const user = (req as any).user;
    const well_id = parseInt(req.params.id);

    const well = await WellService.getWellById(well_id);
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && well.project_id && !accessibleIds.includes(well.project_id)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا البئر' });
    }

    const task = await WellService.createTask(well_id, req.body, user.id);

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
    const user = (req as any).user;
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
    }

    const task = await WellService.updateTaskStatus(taskId, status, user.id);

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
    const user = (req as any).user;
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
    }

    const account = await WellService.accountTask(taskId, req.body, user.id);

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

export default wellRouter;
