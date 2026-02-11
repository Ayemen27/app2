
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
        projectName: projects.name,
      })
      .from(fundTransfers)
      .leftJoin(projects, eq(fundTransfers.projectId, projects.id))
      .orderBy(desc(fundTransfers.createdAt))
      .limit(limit);

    activities.push(...transfers.map(t => ({
      ...t,
      actionType: 'fund_transfer',
      actionLabel: 'تحويل للصندوق',
      userName: 'النظام'
    })));

    // 2. تحويلات المشاريع
    const projectTransfersQuery = db
      .select({
        id: projectFundTransfers.id,
        amount: projectFundTransfers.amount,
        description: projectFundTransfers.description,
        createdAt: projectFundTransfers.createdAt,
        projectId: projectFundTransfers.toProjectId,
        projectName: sql<string>`(SELECT name FROM projects WHERE id = ${projectFundTransfers.toProjectId})`,
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
      userName: 'النظام'
    })));

    // 3. مصروفات العمال المتنوعة
    const workerExpensesQuery = db
      .select({
        id: workerMiscExpenses.id,
        amount: workerMiscExpenses.amount,
        description: workerMiscExpenses.description,
        createdAt: workerMiscExpenses.createdAt,
        projectId: workerMiscExpenses.projectId,
        projectName: projects.name,
      })
      .from(workerMiscExpenses)
      .leftJoin(projects, eq(workerMiscExpenses.projectId, projects.id))
      .orderBy(desc(workerMiscExpenses.createdAt))
      .limit(limit);

    const workerExpenses = projectId && projectId !== 'all'
      ? await workerExpensesQuery.where(eq(workerMiscExpenses.projectId, projectId as string))
      : await workerExpensesQuery;

    activities.push(...workerExpenses.map(e => ({
      ...e,
      actionType: 'worker_expense',
      actionLabel: 'مصروف عامل',
      userName: 'النظام'
    })));

    // 4. مشتريات المواد
    const materialsQuery = db
      .select({
        id: materialPurchases.id,
        amount: materialPurchases.totalAmount,
        description: materialPurchases.materialName,
        createdAt: materialPurchases.createdAt,
        projectId: materialPurchases.projectId,
        projectName: projects.name,
      })
      .from(materialPurchases)
      .leftJoin(projects, eq(materialPurchases.projectId, projects.id))
      .orderBy(desc(materialPurchases.createdAt))
      .limit(limit);

    const materials = projectId && projectId !== 'all'
      ? await materialsQuery.where(eq(materialPurchases.projectId, projectId as string))
      : await materialsQuery;

    activities.push(...materials.map(m => ({
      ...m,
      actionType: 'material',
      actionLabel: 'شراء مواد',
      userName: 'النظام'
    })));

    // 5. تحويلات العمال
    const workerTransfersQuery = db
      .select({
        id: workerTransfers.id,
        amount: workerTransfers.amount,
        description: workerTransfers.notes,
        createdAt: workerTransfers.createdAt,
        projectId: workerTransfers.projectId,
        projectName: projects.name,
      })
      .from(workerTransfers)
      .leftJoin(projects, eq(workerTransfers.projectId, projects.id))
      .orderBy(desc(workerTransfers.createdAt))
      .limit(limit);

    const transfers2 = projectId && projectId !== 'all'
      ? await workerTransfersQuery.where(eq(workerTransfers.projectId, projectId as string))
      : await workerTransfersQuery;

    activities.push(...transfers2.map(t => ({
      ...t,
      actionType: 'worker_transfer',
      actionLabel: 'تحويل لعامل',
      userName: 'النظام'
    })));

    // 6. سجلات النشاط اليومي
    const dailyLogsQuery = db
      .select({
        id: dailyActivityLogs.id,
        amount: sql<string>`'0'`, // لا يوجد مبلغ مالي مباشر
        description: dailyActivityLogs.activityTitle,
        createdAt: dailyActivityLogs.createdAt,
        projectId: dailyActivityLogs.projectId,
        projectName: projects.name,
        weather: dailyActivityLogs.weatherConditions,
        progress: dailyActivityLogs.progressPercentage,
      })
      .from(dailyActivityLogs)
      .leftJoin(projects, eq(dailyActivityLogs.projectId, projects.id))
      .orderBy(desc(dailyActivityLogs.createdAt))
      .limit(limit);

    const dailyLogs = projectId && projectId !== 'all'
      ? await dailyLogsQuery.where(eq(dailyActivityLogs.projectId, projectId as string))
      : await dailyLogsQuery;

    activities.push(...dailyLogs.map(l => ({
      ...l,
      actionType: 'daily_log',
      actionLabel: 'نشاط يومي',
      userName: 'المهندس'
    })));

    // ترتيب حسب التاريخ
    activities.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // تجهيز النتيجة النهائية
    const result = activities.slice(0, limit);

    console.log(`✅ [API] تم جلب ${result.length} إجراء بنظام Join المباشر`);

    res.json({
      success: true,
      data: result,
      count: result.length,
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
