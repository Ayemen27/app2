/**
 * مسارات مصاريف الآبار (Well Expenses Routes)
 * REST API endpoints لربط المصاريف بالآبار
 */

import express, { Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { attachAccessibleProjects, ProjectAccessRequest } from '../../middleware/projectAccess';
import { projectAccessService } from '../../services/ProjectAccessService';
import WellExpenseService from '../../services/WellExpenseService';
import { WellService } from '../../services/WellService';
import { db } from '../../db';
import { wellExpenses } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { getAuthUser } from '../../internal/auth-user.js';
import { validateWholeAmounts } from '../../middleware/validateWholeAmounts';

export const wellExpenseRouter = express.Router();

wellExpenseRouter.use(requireAuth);
wellExpenseRouter.use(attachAccessibleProjects);

wellExpenseRouter.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') {
    return validateWholeAmounts()(req, res, next);
  }
  next();
});

async function getWellProjectId(wellId: number): Promise<string | null> {
  try {
    const well = await WellService.getWellById(wellId);
    return well?.project_id || null;
  } catch {
    return null;
  }
}

function checkAccess(accessReq: ProjectAccessRequest, projectId: string | null): boolean {
  const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
  if (isAdminUser) return true;
  if (!projectId) return false;
  const accessibleIds = accessReq.accessibleProjectIds ?? [];
  return accessibleIds.includes(projectId);
}

/**
 * GET /api/well-expenses/:well_id - جلب مصاريف البئر
 */
wellExpenseRouter.get('/:well_id', async (req: Request, res: Response) => {
  try {
    const well_id = parseInt(req.params.well_id);
    if (isNaN(well_id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wellId parameter',
        message: 'معرّف البئر يجب أن يكون رقماً صحيحاً'
      });
    }
    const accessReq = req as ProjectAccessRequest;

    const projectId = await getWellProjectId(well_id);
    if (!checkAccess(accessReq, projectId)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية للوصول لمصاريف هذا البئر'
      });
    }

    const { type, startDate, endDate } = req.query;

    const expenses = await WellExpenseService.getWellExpenses(well_id, {
      well_id,
      expenseType: type as string,
      startDate: startDate as string,
      endDate: endDate as string
    });

    res.json({
      success: true,
      data: expenses,
      message: `تم جلب ${expenses.length} مصروف`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'EXPENSES_FETCH_ERROR',
      message: error.message || 'فشل في جلب المصاريف'
    });
  }
});

/**
 * POST /api/well-expenses - إضافة مصروف مباشر للبئر
 */
wellExpenseRouter.post('/', async (req: Request, res: Response) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح'
      });
    }

    const { well_id: wellId, expenseType, description, category, totalAmount, expenseDate } = req.body;

    const validationErrors: string[] = [];
    if (!wellId) validationErrors.push('well_id مطلوب');
    if (!expenseType) validationErrors.push('expenseType مطلوب');
    if (!description) validationErrors.push('description مطلوب');
    if (!category) validationErrors.push('category مطلوب');
    if (totalAmount === undefined || totalAmount === null) {
      validationErrors.push('totalAmount مطلوب');
    } else if (Number(totalAmount) <= 0 || isNaN(Number(totalAmount))) {
      validationErrors.push('totalAmount يجب أن يكون أكبر من صفر');
    }
    if (!expenseDate) {
      validationErrors.push('expenseDate مطلوب');
    } else {
      const parsedDate = new Date(expenseDate);
      if (isNaN(parsedDate.getTime())) {
        validationErrors.push('expenseDate تاريخ غير صالح');
      } else {
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        if (parsedDate > now) {
          validationErrors.push('expenseDate لا يمكن أن يكون في المستقبل');
        }
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: validationErrors.join('، ')
      });
    }

    const accessReq = req as ProjectAccessRequest;
    if (wellId) {
      const projectId = await getWellProjectId(parseInt(wellId));
      if (!checkAccess(accessReq, projectId)) {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية لإضافة مصاريف لهذا البئر'
        });
      }
    }

    const expense = await WellExpenseService.addExpense(req.body, authUser.user_id);

    res.status(201).json({
      success: true,
      data: expense,
      message: 'تم إضافة المصروف بنجاح'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: 'EXPENSE_CREATE_ERROR',
      message: error.message || 'فشل في إضافة المصروف'
    });
  }
});

/**
 * POST /api/well-expenses/link - ربط مصروف موجود ببئر
 */
wellExpenseRouter.post('/link', async (req: Request, res: Response) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح'
      });
    }

    const { well_id, referenceType, referenceId } = req.body;

    if (!well_id || !referenceType || !referenceId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMS',
        message: 'معاملات مفقودة: well_id, referenceType, referenceId'
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const projectId = await getWellProjectId(parseInt(well_id));
    if (!checkAccess(accessReq, projectId)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لربط مصاريف بهذا البئر'
      });
    }

    const expense = await WellExpenseService.linkExistingExpense(
      well_id,
      referenceType,
      referenceId,
      authUser.user_id
    );

    res.status(201).json({
      success: true,
      data: expense,
      message: 'تم ربط المصروف بنجاح'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: 'EXPENSE_LINK_ERROR',
      message: error.message || 'فشل في ربط المصروف'
    });
  }
});

/**
 * DELETE /api/well-expenses/:expenseId - حذف/إلغاء ربط مصروف
 */
wellExpenseRouter.delete('/:expenseId', async (req: Request, res: Response) => {
  try {
    const expenseId = parseInt(req.params.expenseId);
    if (isNaN(expenseId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid expenseId parameter',
        message: 'معرّف المصروف يجب أن يكون رقماً صحيحاً'
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const expenseRecord = await db.select({ well_id: wellExpenses.well_id })
      .from(wellExpenses)
      .where(eq(wellExpenses.id, expenseId))
      .limit(1);

    if (expenseRecord.length > 0) {
      const projectId = await getWellProjectId(expenseRecord[0].well_id);
      if (!checkAccess(accessReq, projectId)) {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية لحذف هذا المصروف'
        });
      }
    }

    await WellExpenseService.unlinkExpense(expenseId);

    res.json({
      success: true,
      message: 'تم إلغاء الربط بنجاح'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: 'EXPENSE_DELETE_ERROR',
      message: error.message || 'فشل في حذف المصروف'
    });
  }
});

/**
 * GET /api/well-expenses/cost-report/:well_id - تقرير تكلفة البئر
 */
wellExpenseRouter.get('/cost-report/:well_id', async (req: Request, res: Response) => {
  try {
    const well_id = parseInt(req.params.well_id);
    if (isNaN(well_id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wellId parameter',
        message: 'معرّف البئر يجب أن يكون رقماً صحيحاً'
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const projectId = await getWellProjectId(well_id);
    if (!checkAccess(accessReq, projectId)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية للوصول لتقرير هذا البئر'
      });
    }

    const report = await WellExpenseService.getWellCostReport(well_id);

    res.json({
      success: true,
      data: report,
      message: 'تم حساب التقرير بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'REPORT_ERROR',
      message: error.message || 'فشل في حساب التقرير'
    });
  }
});

/**
 * GET /api/well-expenses/project-costs/:project_id - ملخص تكاليف المشروع
 */
wellExpenseRouter.get('/project-costs/:project_id', async (req: Request, res: Response) => {
  try {
    const { project_id } = req.params;

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && !accessibleIds.includes(project_id)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية للوصول لتكاليف هذا المشروع'
      });
    }

    const summary = await WellExpenseService.getProjectCostSummary(project_id);

    res.json({
      success: true,
      data: summary,
      message: 'تم حساب ملخص التكاليف بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'SUMMARY_ERROR',
      message: error.message || 'فشل في حساب الملخص'
    });
  }
});

export default wellExpenseRouter;
