
import express, { Request, Response } from 'express';
import { db } from '../../db.js';
import { 
  fundTransfers, 
  projectFundTransfers, 
  workerTransfers,
  workerMiscExpenses,
  materialPurchases,
  users,
  projects,
  dailyActivityLogs
} from '../../../shared/schema.js';
import { desc, eq, sql } from 'drizzle-orm';
import { authenticate } from '../../middleware/auth.js';
import { attachAccessibleProjects, ProjectAccessRequest, filterByAccessibleProjects } from '../../middleware/projectAccess';
import { projectAccessService } from '../../services/ProjectAccessService';

const router = express.Router();

// جلب آخر الإجراءات
router.get('/recent-activities', authenticate, attachAccessibleProjects, async (req: Request, res: Response) => {
  console.log('🔍 [API] تم استقبال طلب: GET /api/recent-activities');
  try {
    const { project_id } = req.query;
    const limit = parseInt(req.query.limit as string) || 20;

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const accessibleIds = accessReq.accessibleProjectIds ?? [];
    if (!isAdminUser && project_id && project_id !== 'all' && !accessibleIds.includes(project_id as string)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    console.log('📊 [API] جلب آخر الإجراءات:', { project_id, limit });

    // جمع البيانات من جداول مختلفة
    const activities: any[] = [];

    // 1. تحويلات الصندوق
    const transfers = await db
      .select({
        id: fundTransfers.id,
        amount: fundTransfers.amount,
        description: fundTransfers.notes,
        created_at: fundTransfers.created_at,
        project_id: fundTransfers.project_id,
        projectName: projects.name,
      })
      .from(fundTransfers)
      .leftJoin(projects, eq(fundTransfers.project_id, projects.id))
      .orderBy(desc(fundTransfers.created_at))
      .limit(limit);

    activities.push(...transfers.map((t: any) => ({
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
        created_at: projectFundTransfers.created_at,
        project_id: projectFundTransfers.toProjectId,
        projectName: sql<string>`(SELECT name FROM projects WHERE id = ${projectFundTransfers.toProjectId})`,
      })
      .from(projectFundTransfers)
      .orderBy(desc(projectFundTransfers.created_at))
      .limit(limit);

    const projectTransfers = project_id && project_id !== 'all'
      ? await projectTransfersQuery.where(
          sql`${projectFundTransfers.fromProjectId} = ${project_id} OR ${projectFundTransfers.toProjectId} = ${project_id}`
        )
      : await projectTransfersQuery;

    activities.push(...projectTransfers.map((t: any) => ({
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
        created_at: workerMiscExpenses.created_at,
        project_id: workerMiscExpenses.project_id,
        projectName: projects.name,
      })
      .from(workerMiscExpenses)
      .leftJoin(projects, eq(workerMiscExpenses.project_id, projects.id))
      .orderBy(desc(workerMiscExpenses.created_at))
      .limit(limit);

    const workerExpenses = project_id && project_id !== 'all'
      ? await workerExpensesQuery.where(eq(workerMiscExpenses.project_id, project_id as string))
      : await workerExpensesQuery;

    activities.push(...workerExpenses.map((e: any) => ({
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
        created_at: materialPurchases.created_at,
        project_id: materialPurchases.project_id,
        projectName: projects.name,
      })
      .from(materialPurchases)
      .leftJoin(projects, eq(materialPurchases.project_id, projects.id))
      .orderBy(desc(materialPurchases.created_at))
      .limit(limit);

    const materials = project_id && project_id !== 'all'
      ? await materialsQuery.where(eq(materialPurchases.project_id, project_id as string))
      : await materialsQuery;

    activities.push(...materials.map((m: any) => ({
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
        created_at: workerTransfers.created_at,
        project_id: workerTransfers.project_id,
        projectName: projects.name,
      })
      .from(workerTransfers)
      .leftJoin(projects, eq(workerTransfers.project_id, projects.id))
      .orderBy(desc(workerTransfers.created_at))
      .limit(limit);

    const transfers2 = project_id && project_id !== 'all'
      ? await workerTransfersQuery.where(eq(workerTransfers.project_id, project_id as string))
      : await workerTransfersQuery;

    activities.push(...transfers2.map((t: any) => ({
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
        created_at: dailyActivityLogs.created_at,
        project_id: dailyActivityLogs.project_id,
        projectName: projects.name,
        weather: dailyActivityLogs.weatherConditions,
        progress: dailyActivityLogs.progressPercentage,
      })
      .from(dailyActivityLogs)
      .leftJoin(projects, eq(dailyActivityLogs.project_id, projects.id))
      .orderBy(desc(dailyActivityLogs.created_at))
      .limit(limit);

    const dailyLogs = project_id && project_id !== 'all'
      ? await dailyLogsQuery.where(eq(dailyActivityLogs.project_id, project_id as string))
      : await dailyLogsQuery;

    activities.push(...dailyLogs.map((l: any) => ({
      ...l,
      actionType: 'daily_log',
      actionLabel: 'نشاط يومي',
      userName: 'المهندس'
    })));

    // ترتيب حسب التاريخ
    activities.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const filtered = filterByAccessibleProjects(activities, accessibleIds, isAdminUser);

    // تجهيز النتيجة النهائية
    const result = filtered.slice(0, limit);

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
