
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
import { desc, eq, and, sql } from 'drizzle-orm';
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
        description: fundTransfers.description,
        createdAt: fundTransfers.createdAt,
        userId: fundTransfers.userId,
      })
      .from(fundTransfers)
      .orderBy(desc(fundTransfers.createdAt))
      .limit(limit);

    activities.push(...transfers.map(t => ({
      ...t,
      actionType: 'transfer',
      actionLabel: 'تحويل مالي',
      projectId: null
    })));

    // 2. تحويلات المشاريع
    const projectTransfersQuery = db
      .select({
        id: projectFundTransfers.id,
        amount: projectFundTransfers.amount,
        description: projectFundTransfers.description,
        createdAt: projectFundTransfers.createdAt,
        projectId: projectFundTransfers.projectId,
      })
      .from(projectFundTransfers)
      .orderBy(desc(projectFundTransfers.createdAt))
      .limit(limit);

    const projectTransfers = projectId 
      ? await projectTransfersQuery.where(eq(projectFundTransfers.projectId, projectId as string))
      : await projectTransfersQuery;

    activities.push(...projectTransfers.map(t => ({
      ...t,
      actionType: 'project_transfer',
      actionLabel: 'تحويل للمشروع',
      userId: null
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

    const workerExpenses = projectId
      ? await workerExpensesQuery.where(eq(workerMiscExpenses.projectId, projectId as string))
      : await workerExpensesQuery;

    activities.push(...workerExpenses.map(e => ({
      ...e,
      actionType: 'worker_expense',
      actionLabel: 'مصروف عامل',
      userId: null
    })));

    // 4. مشتريات المواد
    const materialsQuery = db
      .select({
        id: materialPurchases.id,
        amount: materialPurchases.totalCost,
        description: materialPurchases.materialName,
        createdAt: materialPurchases.createdAt,
        projectId: materialPurchases.projectId,
      })
      .from(materialPurchases)
      .orderBy(desc(materialPurchases.createdAt))
      .limit(limit);

    const materials = projectId
      ? await materialsQuery.where(eq(materialPurchases.projectId, projectId as string))
      : await materialsQuery;

    activities.push(...materials.map(m => ({
      ...m,
      actionType: 'material',
      actionLabel: 'شراء مواد',
      userId: null
    })));

    // ترتيب حسب التاريخ
    activities.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // إضافة معلومات المستخدم والمشروع
    const enrichedActivities = await Promise.all(
      activities.slice(0, limit).map(async (activity) => {
        let userName = 'النظام';
        let projectName = 'جميع المشاريع';

        // جلب اسم المستخدم إذا كان متوفراً
        if (activity.userId) {
          const user = await db
            .select({ name: users.name })
            .from(users)
            .where(eq(users.id, activity.userId))
            .limit(1);
          if (user.length > 0) userName = user[0].name;
        }

        // جلب اسم المشروع
        if (activity.projectId) {
          const project = await db
            .select({ name: projects.name })
            .from(projects)
            .where(eq(projects.id, activity.projectId))
            .limit(1);
          if (project.length > 0) projectName = project[0].name;
        }

        return {
          ...activity,
          userName,
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
