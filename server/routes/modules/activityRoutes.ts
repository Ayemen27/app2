
import express from 'express';
import { db } from '../../db.js';
import { 
  fundTransfers, 
  projectFundTransfers, 
  workerTransfers,
  workerMiscExpenses,
  materialPurchases,
  users,
  projects
} from '../../../shared/schema.js';
import { desc, eq, sql } from 'drizzle-orm';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

// جلب آخر الإجراءات
router.get('/recent-activities', authenticate, async (req, res) => {
  console.log('🔍 [API] تم استقبال طلب: GET /api/recent-activities');
  try {
    const { projectId } = req.query;
    const limit = parseInt(req.query.limit as string) || 20;

    console.log('📊 [API] جلب آخر الإجراءات:', { projectId, limit });

    // جمع البيانات من جداول مختلفة
    const activities: any[] = [];

    // 1. تحويلات الصندوق
    const transfers = await db
      .select({
        id: fundTransfers.id,
        amount: fundTransfers.amount,
        description: fundTransfers.notes,
        createdAt: fundTransfers.createdAt,
        projectId: fundTransfers.projectId,
      })
      .from(fundTransfers)
      .orderBy(desc(fundTransfers.createdAt))
      .limit(limit);

    activities.push(...transfers.map(t => ({
      ...t,
      actionType: 'fund_transfer',
      actionLabel: 'تحويل للصندوق',
      userName: 'النظام',
      projectName: 'غير محدد'
    })));

    // 2. تحويلات المشاريع
    const projectTransfersQuery = db
      .select({
        id: projectFundTransfers.id,
        amount: projectFundTransfers.amount,
        description: projectFundTransfers.description,
        createdAt: projectFundTransfers.createdAt,
        projectId: projectFundTransfers.toProjectId,
      })
      .from(projectFundTransfers)
      .orderBy(desc(projectFundTransfers.createdAt))
      .limit(limit);

    const projectTransfers = projectId && projectId !== 'all'
      ? await projectTransfersQuery.where(
          sql`${projectFundTransfers.fromProjectId} = ${projectId} OR ${projectFundTransfers.toProjectId} = ${projectId}`
        )
      : await projectTransfersQuery;

    activities.push(...projectTransfers.map(t => ({
      ...t,
      actionType: 'project_transfer',
      actionLabel: 'تحويل بين المشاريع',
      userName: 'النظام',
      projectName: 'غير محدد'
    })));

    // 3. مصروفات العمال المتنوعة
    const workerExpensesQuery = db
      .select({
        id: workerMiscExpenses.id,
        amount: workerMiscExpenses.amount,
        description: workerMiscExpenses.description,
        createdAt: workerMiscExpenses.createdAt,
        projectId: workerMiscExpenses.projectId,
      })
      .from(workerMiscExpenses)
      .orderBy(desc(workerMiscExpenses.createdAt))
      .limit(limit);

    const workerExpenses = projectId && projectId !== 'all'
      ? await workerExpensesQuery.where(eq(workerMiscExpenses.projectId, projectId as string))
      : await workerExpensesQuery;

    activities.push(...workerExpenses.map(e => ({
      ...e,
      actionType: 'worker_expense',
      actionLabel: 'مصروف عامل',
      userName: 'النظام',
      projectName: 'غير محدد'
    })));

    // 4. مشتريات المواد
    const materialsQuery = db
      .select({
        id: materialPurchases.id,
        amount: materialPurchases.totalAmount,
        description: materialPurchases.materialName,
        createdAt: materialPurchases.createdAt,
        projectId: materialPurchases.projectId,
      })
      .from(materialPurchases)
      .orderBy(desc(materialPurchases.createdAt))
      .limit(limit);

    const materials = projectId && projectId !== 'all'
      ? await materialsQuery.where(eq(materialPurchases.projectId, projectId as string))
      : await materialsQuery;

    activities.push(...materials.map(m => ({
      ...m,
      actionType: 'material',
      actionLabel: 'شراء مواد',
      userName: 'النظام',
      projectName: 'غير محدد'
    })));

    // 5. تحويلات العمال
    const workerTransfersQuery = db
      .select({
        id: workerTransfers.id,
        amount: workerTransfers.amount,
        description: workerTransfers.notes,
        createdAt: workerTransfers.createdAt,
        projectId: workerTransfers.projectId,
      })
      .from(workerTransfers)
      .orderBy(desc(workerTransfers.createdAt))
      .limit(limit);

    const transfers2 = projectId && projectId !== 'all'
      ? await workerTransfersQuery.where(eq(workerTransfers.projectId, projectId as string))
      : await workerTransfersQuery;

    activities.push(...transfers2.map(t => ({
      ...t,
      actionType: 'worker_transfer',
      actionLabel: 'تحويل لعامل',
      userName: 'النظام',
      projectName: 'غير محدد'
    })));

    // ترتيب حسب التاريخ
    activities.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // إضافة معلومات المشروع
    const enrichedActivities = await Promise.all(
      activities.slice(0, limit).map(async (activity) => {
        let projectName = 'جميع المشاريع';

        // جلب اسم المشروع
        if (activity.projectId) {
          try {
            const project = await db
              .select({ name: projects.name })
              .from(projects)
              .where(eq(projects.id, activity.projectId))
              .limit(1);
            if (project.length > 0) projectName = project[0].name;
          } catch (error) {
            console.error('خطأ في جلب اسم المشروع:', error);
          }
        }

        return {
          ...activity,
          projectName,
        };
      })
    );

    console.log(`✅ [API] تم جلب ${enrichedActivities.length} إجراء`);

    res.json({
      success: true,
      data: enrichedActivities,
      count: enrichedActivities.length,
    });
  } catch (error) {
    console.error('❌ [API] خطأ في جلب آخر الإجراءات:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب آخر الإجراءات',
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
  }
});

export default router;
