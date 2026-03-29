/**
 * مسارات إدارة العمال
 * Worker Management Routes
 *
 * ⚠️ DUPLICATE ROUTE WARNING (Issue #3):
 * This router and financialRoutes.ts both define handlers for:
 *   - PATCH /worker-transfers/:id
 *   - DELETE /worker-transfers/:id
 *   - GET /worker-misc-expenses
 *   - PATCH /worker-misc-expenses/:id
 *   - GET /worker-attendance
 *   - DELETE /worker-attendance/:id
 * This router is mounted FIRST on /api (index.ts line ~101), so its handlers
 * take precedence for these duplicate paths.
 * Full deduplication is a separate Medium-priority task.
 */

import express from 'express';
import { Request, Response } from 'express';
import { eq, sql, and, or, desc, isNull, gte, lte, ne } from 'drizzle-orm';
import { db, pool, withTransaction } from '../../db.js';
import {
  workers, workerAttendance, workerTransfers, workerMiscExpenses, workerBalances,
  transportationExpenses, enhancedInsertWorkerSchema, insertWorkerAttendanceSchema,
  insertWorkerTransferSchema, insertWorkerMiscExpenseSchema, workerTypes,
  wellWorkCrews, wellCrewWorkers,
  workerProjectWages, insertWorkerProjectWageSchema
} from '@shared/schema';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../middleware/auth.js';
import { getAuthUser, isAdmin } from '../../internal/auth-user.js';
import { FinancialLedgerService } from '../../services/FinancialLedgerService.js';
import { attachAccessibleProjects, ProjectAccessRequest, requireProjectAccess } from '../../middleware/projectAccess';
import { projectAccessService } from '../../services/ProjectAccessService';
import { inArray } from 'drizzle-orm';
import { validateWholeAmounts } from '../../middleware/validateWholeAmounts';
import { SummaryRebuildService } from '../../services/SummaryRebuildService';
import { FinancialIntegrityService } from '../../services/FinancialIntegrityService.js';
import { PaymentAllocationService } from '../../services/PaymentAllocationService';

const NUM = (col: any) => sql`safe_numeric(${col}::text, 0)`;

declare global {
  var io: { emit: (event: string, data: unknown) => void } | undefined;
}

const ALLOWED_WORKER_PATCH_FIELDS = new Set([
  'name', 'type', 'dailyWage', 'phone', 'hireDate', 'is_active',
]);

const ALLOWED_ATTENDANCE_PATCH_FIELDS = new Set([
  'attendanceDate', 'date', 'startTime', 'endTime', 'workDescription',
  'isPresent', 'hoursWorked', 'overtime', 'overtimeRate',
  'workDays', 'dailyWage', 'actualWage', 'totalPay',
  'paidAmount', 'remainingAmount', 'paymentType', 'notes', 'well_id',
  'well_ids', 'crew_type',
]);

const ALLOWED_TRANSFER_PATCH_FIELDS = new Set([
  'amount', 'transferNumber', 'senderName', 'recipientName',
  'recipientPhone', 'transferMethod', 'transferDate', 'notes',
]);

const ALLOWED_MISC_EXPENSE_PATCH_FIELDS = new Set([
  'amount', 'description', 'date', 'notes', 'well_id',
  'well_ids', 'crew_type',
]);

function pickAllowedFields<T extends Record<string, unknown>>(data: T, allowed: Set<string>): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    if (allowed.has(key)) {
      result[key] = data[key];
    }
  }
  return result as Partial<T>;
}

interface WorkerBalanceEntry {
  worker_id: string;
  project_id: string;
  totalEarned: string;
  totalPaid: string;
  totalTransferred: string;
  currentBalance: string;
}

async function syncAttendanceToWellCrews(attendanceRecord: any) {
  try {
    const workerId = attendanceRecord.worker_id;
    if (!workerId) return;

    let wellIds: number[] = [];
    if (attendanceRecord.well_ids) {
      try {
        const parsed = typeof attendanceRecord.well_ids === 'string'
          ? JSON.parse(attendanceRecord.well_ids)
          : attendanceRecord.well_ids;
        if (Array.isArray(parsed)) wellIds = parsed.map(Number).filter(Boolean);
      } catch { /* ignore parse errors */ }
    }
    if (wellIds.length === 0 && attendanceRecord.well_id) {
      wellIds = [Number(attendanceRecord.well_id)];
    }
    if (wellIds.length === 0) return;

    let crewTypes: string[] = [];
    if (attendanceRecord.crew_type) {
      try {
        const raw = attendanceRecord.crew_type;
        if (typeof raw === 'string' && raw.startsWith('[')) {
          crewTypes = JSON.parse(raw);
        } else if (Array.isArray(raw)) {
          crewTypes = raw;
        } else if (typeof raw === 'string' && raw.length > 0) {
          crewTypes = [raw];
        }
      } catch { /* ignore parse errors */ }
    }
    if (crewTypes.length === 0) {
      crewTypes = ['attendance_linked'];
    }

    const workerRows = await db.select().from(workers).where(eq(workers.id, workerId)).limit(1);
    if (workerRows.length === 0) return;
    const worker = workerRows[0];

    const workerType = worker.type;
    const dailyWage = parseFloat(worker.dailyWage || '0');
    const workDaysVal = parseFloat(attendanceRecord.workDays || '0');
    const workDate = attendanceRecord.date || attendanceRecord.attendanceDate;
    const isMaster = workerType === 'معلم' || workerType === 'مشرف';

    const splitFactor = wellIds.length * crewTypes.length;
    const splitWorkDays = workDaysVal / splitFactor;
    const splitWage = (dailyWage * workDaysVal) / splitFactor;

    for (const wellId of wellIds) {
      for (const crewType of crewTypes) {
        const existingCrews = await db.select().from(wellWorkCrews).where(
          and(
            eq(wellWorkCrews.well_id, wellId),
            eq(wellWorkCrews.crewType, crewType),
            workDate ? eq(wellWorkCrews.workDate, workDate) : sql`${wellWorkCrews.workDate} IS NULL`
          )
        ).limit(1);

        let crewId: number;

        if (existingCrews.length > 0) {
          crewId = existingCrews[0].id;
          const existingWorkerLink = await db.select().from(wellCrewWorkers).where(
            and(
              eq(wellCrewWorkers.crew_id, crewId),
              eq(wellCrewWorkers.worker_id, workerId)
            )
          ).limit(1);

          if (existingWorkerLink.length === 0) {
            const wCount = Number(existingCrews[0].workersCount) + (isMaster ? 0 : 1);
            const mCount = Number(existingCrews[0].mastersCount) + (isMaster ? 1 : 0);
            const existingTotal = parseFloat(existingCrews[0].totalWages || '0');
            const newTotal = existingTotal + splitWage;

            await db.update(wellWorkCrews).set({
              workersCount: wCount.toString(),
              mastersCount: mCount.toString(),
              totalWages: newTotal.toString(),
              updated_at: new Date(),
            }).where(eq(wellWorkCrews.id, crewId));
          }
        } else {
          const newCrew = await db.insert(wellWorkCrews).values({
            well_id: wellId,
            crewType: crewType,
            workersCount: (isMaster ? 0 : 1).toString(),
            mastersCount: (isMaster ? 1 : 0).toString(),
            workDays: splitWorkDays.toString(),
            workerDailyWage: isMaster ? null : dailyWage.toString(),
            masterDailyWage: isMaster ? dailyWage.toString() : null,
            totalWages: splitWage.toString(),
            workDate: workDate || null,
          }).returning();
          crewId = newCrew[0].id;
        }

        const existingLink = await db.select().from(wellCrewWorkers).where(
          and(
            eq(wellCrewWorkers.crew_id, crewId),
            eq(wellCrewWorkers.worker_id, workerId)
          )
        ).limit(1);

        if (existingLink.length === 0) {
          await db.insert(wellCrewWorkers).values({
            crew_id: crewId,
            worker_id: workerId,
            daily_wage_snapshot: dailyWage.toString(),
            work_days: splitWorkDays.toString(),
            crew_type: crewType,
          });
        } else {
          await db.update(wellCrewWorkers).set({
            daily_wage_snapshot: dailyWage.toString(),
            work_days: splitWorkDays.toString(),
            crew_type: crewType,
          }).where(eq(wellCrewWorkers.id, existingLink[0].id));
        }

        console.log(`[syncAttendanceToWellCrews] Synced worker ${workerId} to well ${wellId} crew ${crewId} (split 1/${splitFactor})`);
      }
    }
  } catch (error) {
    console.error('[syncAttendanceToWellCrews] Error syncing attendance to well crews:', error);
  }
}

async function resolveEffectiveWageForRoute(worker_id: string, project_id: string, date: string): Promise<string> {
  try {
    const [projectWage] = await db.select().from(workerProjectWages)
      .where(and(
        eq(workerProjectWages.worker_id, worker_id),
        eq(workerProjectWages.project_id, project_id),
        eq(workerProjectWages.is_active, true),
        lte(workerProjectWages.effectiveFrom, date),
        or(
          isNull(workerProjectWages.effectiveTo),
          gte(workerProjectWages.effectiveTo, date)
        )
      ))
      .orderBy(desc(workerProjectWages.effectiveFrom))
      .limit(1);

    if (projectWage) {
      return projectWage.dailyWage;
    }

    const [worker] = await db.select().from(workers).where(eq(workers.id, worker_id));
    return worker?.dailyWage || '0';
  } catch (error) {
    console.error('خطأ في حل الأجر الفعلي:', error);
    const [worker] = await db.select().from(workers).where(eq(workers.id, worker_id));
    return worker?.dailyWage || '0';
  }
}

async function recalculateAttendanceAndBalances(
  workerId: string,
  projectId?: string,
  fromDate?: string,
  toDate?: string
): Promise<{ attendanceUpdated: number; projectsAffected: string[] }> {
  const conditions: any[] = [eq(workerAttendance.worker_id, workerId)];
  if (projectId) conditions.push(eq(workerAttendance.project_id, projectId));
  if (fromDate) conditions.push(gte(workerAttendance.attendanceDate, fromDate));
  if (toDate) conditions.push(lte(workerAttendance.attendanceDate, toDate));

  const affectedRecords = await db.select({
    id: workerAttendance.id,
    attendanceDate: workerAttendance.attendanceDate,
    project_id: workerAttendance.project_id,
  }).from(workerAttendance).where(and(...conditions));

  if (affectedRecords.length === 0) {
    return { attendanceUpdated: 0, projectsAffected: [] };
  }

  const projectIdsSet = new Set<string>();

  for (const record of affectedRecords) {
    const resolvedWage = await resolveEffectiveWageForRoute(
      workerId, record.project_id, record.attendanceDate
    );

    const updateResult = await pool.query(
      `UPDATE worker_attendance
       SET
         daily_wage = $1,
         actual_wage = safe_numeric($1::text, 0) * COALESCE(work_days, 0),
         total_pay = safe_numeric($1::text, 0) * COALESCE(work_days, 0),
         remaining_amount = (safe_numeric($1::text, 0) * COALESCE(work_days, 0)) - COALESCE(paid_amount, 0)
       WHERE id = $2`,
      [resolvedWage, record.id]
    );

    console.log(`🔄 [RecalcHelper] سجل ${record.id} تاريخ ${record.attendanceDate} → أجر: ${resolvedWage} | rowCount: ${updateResult.rowCount}`);

    projectIdsSet.add(record.project_id);
  }

  const projectsAffected = Array.from(projectIdsSet);

  const earliestDateByProject = new Map<string, string>();
  for (const record of affectedRecords) {
    const existing = earliestDateByProject.get(record.project_id);
    if (!existing || record.attendanceDate < existing) {
      earliestDateByProject.set(record.project_id, record.attendanceDate);
    }
  }

  for (const pid of projectsAffected) {
    await pool.query(
      `UPDATE worker_balances wb
       SET
         total_earned = COALESCE((
           SELECT SUM(
             CASE WHEN wa.actual_wage IS NOT NULL AND wa.actual_wage::text != '' AND wa.actual_wage::text != 'NaN' THEN safe_numeric(wa.actual_wage::text, 0) ELSE safe_numeric(wa.daily_wage::text, 0) * safe_numeric(wa.work_days::text, 0) END
           )
           FROM worker_attendance wa
           WHERE wa.worker_id = wb.worker_id AND wa.project_id = wb.project_id
         ), 0),
         current_balance = COALESCE((
           SELECT SUM(
             CASE WHEN wa.actual_wage IS NOT NULL AND wa.actual_wage::text != '' AND wa.actual_wage::text != 'NaN' THEN safe_numeric(wa.actual_wage::text, 0) ELSE safe_numeric(wa.daily_wage::text, 0) * safe_numeric(wa.work_days::text, 0) END
           )
           FROM worker_attendance wa
           WHERE wa.worker_id = wb.worker_id AND wa.project_id = wb.project_id
         ), 0) - COALESCE(wb.total_paid, 0) - COALESCE(wb.total_transferred, 0),
         last_updated = NOW()
       WHERE wb.worker_id = $1 AND wb.project_id = $2`,
      [workerId, pid]
    );

    try {
      const earliestDate = earliestDateByProject.get(pid);
      if (earliestDate) {
        await SummaryRebuildService.markInvalid(pid, earliestDate);
      }
    } catch (e) { console.error('[SummaryRebuild] recalcAttendance markInvalid error:', e); }
  }

  console.log(`✅ [RecalcHelper] تم تحديث ${affectedRecords.length} سجل حضور في ${projectsAffected.length} مشروع`);
  return { attendanceUpdated: affectedRecords.length, projectsAffected };
}

export const workerRouter = express.Router();

function checkProjectAccess(req: Request, projectId: string | null | undefined, allowNullProject: boolean = false): { allowed: boolean; isAdmin: boolean } {
  const accessReq = req as ProjectAccessRequest;
  const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
  if (isAdminUser) return { allowed: true, isAdmin: true };
  if (!projectId) return { allowed: allowNullProject, isAdmin: false };
  const accessibleIds = accessReq.accessibleProjectIds ?? [];
  if (!accessibleIds.includes(projectId)) return { allowed: false, isAdmin: false };
  return { allowed: true, isAdmin: false };
}

/**
 * 📋 جلب أنواع العمال - بدون مصادقة (بيانات عامة)
 * GET /worker-types
 */
workerRouter.get('/worker-types', async (req: Request, res: Response) => {
  try {
    const allWorkerTypes = await db.select().from(workerTypes).orderBy(workerTypes.name);

    res.json({ 
      success: true, 
      data: allWorkerTypes, 
      message: "تم جلب أنواع العمال بنجاح" 
    });
  } catch (error: any) {
    console.error('❌ خطأ في جلب أنواع العمال:', error);
    res.status(500).json({
      success: false,
      data: [],
      message: "فشل في جلب أنواع العمال"
    });
  }
});

// تطبيق المصادقة وتحميل المشاريع المتاحة على جميع مسارات العمال (بعد الـ public endpoints)
workerRouter.use(requireAuth);
workerRouter.use(attachAccessibleProjects);

workerRouter.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') {
    return validateWholeAmounts()(req, res, next);
  }
  next();
});

/**
 * 👷 جلب قائمة العمال
 * GET /api/workers
 */
import { sendSuccess, sendError } from '../../middleware/api-response.js';

workerRouter.get('/workers', async (req: Request, res: Response) => {
  try {
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    const project_id = req.query.project_id as string | undefined;
    const filterByProject = project_id && project_id !== 'all';
    
    let workersList;
    if (isAdminUser) {
      workersList = await db.select().from(workers).orderBy(workers.name);
    } else {
      const userId = accessReq.user?.user_id;
      if (!userId) {
        workersList = [];
      } else {
        workersList = await db.select().from(workers)
          .where(eq(workers.created_by, userId))
          .orderBy(workers.name);
      }
    }

    if (filterByProject && workersList.length > 0) {
      const workerIdsInProject = await db.selectDistinct({
        worker_id: workerAttendance.worker_id
      }).from(workerAttendance).where(eq(workerAttendance.project_id, project_id!));

      const balanceWorkerIds = await db.selectDistinct({
        worker_id: workerBalances.worker_id
      }).from(workerBalances).where(
        and(
          eq(workerBalances.project_id, project_id!),
          sql`${NUM(workerBalances.totalEarned)} > 0`
        )
      );

      const projectWorkerIds = new Set([
        ...workerIdsInProject.map((r: any) => r.worker_id),
        ...balanceWorkerIds.map((r: any) => r.worker_id)
      ]);

      workersList = workersList.filter((w: any) => projectWorkerIds.has(w.id));
    }

    console.log(`👷 [API] isAdmin: ${isAdminUser}, userId: ${accessReq.user?.user_id}, project: ${project_id || 'all'}, total: ${workersList.length}`);
    res.json({
      success: true,
      data: workersList,
      message: `تم جلب ${workersList.length} عامل بنجاح`
    });
  } catch (error: any) {
    console.error('❌ [API] خطأ في جلب العمال:', error);
    res.status(500).json({
      success: false,
      message: "فشل في جلب قائمة العمال",
      data: null
    });
  }
});

/**
 * 👷‍♂️ إضافة عامل جديد
 * POST /api/workers
 */
workerRouter.post('/workers', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    console.log('👷 [API] طلب إضافة عامل جديد من المستخدم:', req.user?.email);
    console.log('📋 [API] بيانات العامل المرسلة:', req.body);

    if (req.body.project_id) {
      const { allowed } = checkProjectAccess(req, req.body.project_id);
      if (!allowed) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
      }
    }

    // Validation باستخدام enhanced schema
    const validationResult = enhancedInsertWorkerSchema.safeParse(req.body);

    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] فشل في validation العامل:', validationResult.error.flatten());

      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات العامل غير صحيحة';

      return res.status(400).json({
        success: false,
        error: 'بيانات العامل غير صحيحة',
        message: firstError,
        details: errorMessages,
        processingTime: duration
      });
    }

    console.log('✅ [API] نجح validation العامل');

    const userId = getAuthUser(req)?.user_id;
    const workerData = { ...validationResult.data, created_by: userId || null };

    console.log('💾 [API] حفظ العامل في قاعدة البيانات...');
    const newWorker = await withTransaction(async (client) => {
      const workerFields = ['name', 'type', 'daily_wage', 'phone', 'hire_date', 'is_active', 'created_by'];
      const workerValues = [
        workerData.name,
        workerData.type,
        workerData.dailyWage,
        workerData.phone || null,
        workerData.hireDate || null,
        workerData.is_active ?? true,
        workerData.created_by || null
      ];
      const placeholders = workerValues.map((_, i) => `$${i + 1}`).join(', ');
      const { rows: [createdWorker] } = await client.query(
        `INSERT INTO workers (${workerFields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        workerValues
      );

      const activeProjects = await client.query(`SELECT id FROM projects WHERE status = 'active' OR status = 'in_progress'`);
      if (activeProjects.rows.length > 0) {
        for (const p of activeProjects.rows) {
          await client.query(
            `INSERT INTO worker_balances (worker_id, project_id, total_earned, total_paid, total_transferred, current_balance) VALUES ($1, $2, $3, $4, $5, $6)`,
            [createdWorker.id, p.id, '0', '0', '0', '0']
          );
        }
      }

      return [createdWorker];
    });

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم إنشاء العامل بنجاح في ${duration}ms:`, {
      id: newWorker[0].id,
      name: newWorker[0].name,
      type: newWorker[0].type,
      dailyWage: newWorker[0].dailyWage
    });

    res.status(201).json({
      success: true,
      data: newWorker[0],
      message: `تم إنشاء العامل "${newWorker[0].name}" (${newWorker[0].type}) بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في إنشاء العامل:', error);

    // تحليل نوع الخطأ لرسالة أفضل
    let errorMessage = 'فشل في إنشاء العامل';
    let statusCode = 500;

    if (error.code === '23505') { // duplicate key
      errorMessage = 'اسم العامل موجود مسبقاً';
      statusCode = 409;
    } else if (error.code === '23502') { // not null violation
      errorMessage = 'بيانات العامل ناقصة';
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      data: null,
      processingTime: duration
    });
  }
});

/**
 * 🔍 البحث عن عامل بالاسم أو معرف
 * GET /api/workers/search/:query
 */
workerRouter.get('/workers/search/:query', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const query = req.params.query?.trim().toLowerCase();
    if (!query || query.length < 1) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'البحث مطلوب',
        message: 'الرجاء إدخال اسم أو معرف العامل للبحث',
        processingTime: duration
      });
    }

    console.log(`🔍 [API] البحث عن عامل: "${query}"`);

    // البحث في الاسم أو المعرف
    let searchResults = await db.select().from(workers).where(
      sql`LOWER(${workers.name}) LIKE LOWER('%' || ${query} || '%') OR LOWER(${workers.id}) LIKE LOWER('%' || ${query} || '%')`
    );

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    if (!isAdminUser) {
      const accessibleIds = accessReq.accessibleProjectIds ?? [];
      const idSet = new Set(accessibleIds);
      searchResults = searchResults.filter((w: any) => w.project_id && idSet.has(w.project_id));
    }

    if (searchResults.length === 0) {
      const duration = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: 'العامل غير موجود',
        message: `لم يتم العثور على عامل بالبحث عن: "${query}"`,
        processingTime: duration
      });
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم العثور على ${searchResults.length} عامل بنجاح`);

    res.json({
      success: true,
      data: searchResults,
      message: `تم العثور على ${searchResults.length} عامل`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في البحث عن عامل:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في البحث',
      data: null,
      processingTime: duration
    });
  }
});

/**
 * 📊 جلب أرصدة جميع العمال دفعة واحدة
 * GET /api/workers/balances
 */
workerRouter.get('/workers/balances', async (req: Request, res: Response) => {
  try {
    const project_id = req.query.project_id as string | undefined;
    const isAllProjects = !project_id || project_id === 'all';

    const params: any[] = isAllProjects ? [] : [project_id];
    const waFilter = isAllProjects ? '' : 'AND wa.project_id = $1';
    const wtFilter = isAllProjects ? '' : 'AND wt.project_id = $1';

    const result = await pool.query(`
      SELECT 
        w.id as worker_id,
        COALESCE((
          SELECT SUM(CASE WHEN wa.actual_wage IS NOT NULL AND wa.actual_wage::text != '' AND wa.actual_wage::text != 'NaN' THEN safe_numeric(wa.actual_wage::text, 0) ELSE safe_numeric(wa.daily_wage::text, 0) * safe_numeric(wa.work_days::text, 0) END)
          FROM worker_attendance wa WHERE wa.worker_id = w.id ${waFilter}
        ), 0) as total_earnings,
        COALESCE((
          SELECT SUM(safe_numeric(wt.amount::text, 0))
          FROM worker_transfers wt WHERE wt.worker_id = w.id AND (wt.transfer_method IS NULL OR wt.transfer_method != 'settlement') ${wtFilter}
        ), 0) + COALESCE((
          SELECT SUM(safe_numeric(COALESCE(wa.paid_amount, '0')::text, 0))
          FROM worker_attendance wa WHERE wa.worker_id = w.id ${waFilter}
        ), 0) as total_withdrawals,
        COALESCE((
          SELECT SUM(safe_numeric(wt.amount::text, 0))
          FROM worker_transfers wt WHERE wt.worker_id = w.id AND wt.transfer_method = 'settlement' ${wtFilter}
        ), 0) as total_settled
      FROM workers w
    `, params);

    const balances: Record<string, number> = {};
    for (const row of result.rows) {
      const earnings = Math.round(Number(row.total_earnings) || 0);
      const withdrawals = Math.round(Number(row.total_withdrawals) || 0);
      const settled = Math.round(Number(row.total_settled) || 0);
      balances[row.worker_id] = earnings - withdrawals - settled;
    }

    res.json({ success: true, data: balances });
  } catch (error: any) {
    console.error('❌ خطأ في جلب أرصدة العمال:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 💰 جلب أرصدة العامل المفتوحة لكل مشروع
 * GET /api/workers/:id/open-balances
 */
workerRouter.get('/workers/:id/open-balances', async (req: Request, res: Response) => {
  try {
    const workerId = req.params.id;
    if (!workerId) {
      return res.status(400).json({ success: false, message: 'معرف العامل مطلوب' });
    }

    const workerRows = await db.select().from(workers).where(eq(workers.id, workerId)).limit(1);
    if (workerRows.length === 0) {
      return res.status(404).json({ success: false, message: 'العامل غير موجود' });
    }

    const balances = await PaymentAllocationService.getWorkerOpenBalances(workerId);

    const mappedBalances = balances.map(b => ({
      projectId: b.projectId,
      projectName: b.projectName,
      balance: b.currentBalance,
      totalEarned: b.totalEarned,
      totalPaid: b.totalPaid,
      totalTransferred: b.totalTransferred,
    }));

    res.json({
      success: true,
      data: mappedBalances,
      message: `تم جلب أرصدة العامل "${workerRows[0].name}" لـ ${balances.length} مشروع`
    });
  } catch (error: any) {
    console.error('❌ خطأ في جلب أرصدة العامل المفتوحة:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'فشل في جلب أرصدة العامل المفتوحة',
      data: null
    });
  }
});

/**
 * 🔍 جلب عامل محدد
 * GET /api/workers/:id
 */
workerRouter.get('/workers/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const worker_id = req.params.id;
    console.log('🔍 [API] طلب جلب عامل محدد:', worker_id);

    if (!worker_id) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف العامل مطلوب',
        message: 'لم يتم توفير معرف العامل',
        processingTime: duration
      });
    }

    const worker = await db.select().from(workers).where(eq(workers.id, worker_id)).limit(1);

    if (worker.length === 0) {
      const duration = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: 'العامل غير موجود',
        message: `لم يتم العثور على عامل بالمعرف: ${worker_id}`,
        processingTime: duration
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    if (!isAdminUser && worker[0].created_by !== accessReq.user?.user_id) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا العامل' });
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب العامل بنجاح في ${duration}ms:`, {
      id: worker[0].id,
      name: worker[0].name,
      type: worker[0].type
    });

    res.json({
      success: true,
      data: worker[0],
      message: `تم جلب العامل "${worker[0].name}" بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب العامل:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب العامل',
      data: null,
      processingTime: duration
    });
  }
});

/**
 * ✏️ تعديل عامل
 * PATCH /api/workers/:id
 */
workerRouter.patch('/workers/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const worker_id = req.params.id;
    console.log('🔄 [API] طلب تحديث العامل من المستخدم:', req.user?.email);
    console.log('📋 [API] ID العامل:', worker_id);
    console.log('📋 [API] بيانات التحديث المرسلة:', req.body);

    if (!worker_id) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف العامل مطلوب',
        message: 'لم يتم توفير معرف العامل للتحديث',
        processingTime: duration
      });
    }

    const existingWorker = await db.select().from(workers).where(eq(workers.id, worker_id)).limit(1);

    if (existingWorker.length === 0) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] العامل غير موجود:', worker_id);
      return res.status(404).json({
        success: false,
        error: 'العامل غير موجود',
        message: `لم يتم العثور على عامل بالمعرف: ${worker_id}`,
        processingTime: duration
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    if (!isAdminUser && existingWorker[0].created_by !== accessReq.user?.user_id) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لتعديل هذا العامل' });
    }

    // Validation باستخدام enhanced schema - نسمح بتحديث جزئي
    const validationResult = enhancedInsertWorkerSchema.partial().safeParse(req.body);

    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] فشل في validation تحديث العامل:', validationResult.error.flatten());

      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحديث العامل غير صحيحة';

      return res.status(400).json({
        success: false,
        error: 'بيانات تحديث العامل غير صحيحة',
        message: firstError,
        details: errorMessages,
        processingTime: duration
      });
    }

    console.log('✅ [API] نجح validation تحديث العامل');

    const sanitizedData = pickAllowedFields(validationResult.data as Record<string, unknown>, ALLOWED_WORKER_PATCH_FIELDS);

    if (Object.keys(sanitizedData).length === 0) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'لا توجد حقول صالحة للتحديث',
        message: 'لم يتم توفير أي حقول مسموح بتحديثها',
        processingTime: duration
      });
    }

    // التحقق مما إذا كان يتم تحديث اليومية
    const oldDailyWage = existingWorker[0].dailyWage;
    const newDailyWage = (sanitizedData as any).dailyWage;
    const isDailyWageChanged = newDailyWage && newDailyWage !== oldDailyWage;

    // تحديث العامل في قاعدة البيانات
    console.log('💾 [API] تحديث العامل في قاعدة البيانات...');
    const [updatedWorker] = await db
      .update(workers)
      .set(sanitizedData)
      .where(eq(workers.id, worker_id))
      .returning();

    let attendanceUpdatedCount = 0;
    if (isDailyWageChanged) {
      console.log(`💰 [API] تم تغيير اليومية من ${oldDailyWage} إلى ${newDailyWage}`);

      const { attendanceUpdated } = await recalculateAttendanceAndBalances(worker_id);
      attendanceUpdatedCount = attendanceUpdated;
      console.log(`✅ [API] تم إعادة حساب ${attendanceUpdatedCount} سجل حضور وتحديث الأرصدة بنجاح`);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم تحديث العامل بنجاح في ${duration}ms:`, {
      id: updatedWorker.id,
      name: updatedWorker.name,
      dailyWage: updatedWorker.dailyWage,
      attendanceRecordsUpdated: attendanceUpdatedCount
    });

    res.json({
      success: true,
      data: updatedWorker,
      message: isDailyWageChanged 
        ? `تم تحديث الأجر وتعديل ${attendanceUpdatedCount} سجل حضور وإعادة حساب الأرصدة بنجاح`
        : `تم تحديث بيانات العامل بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في تحديث العامل:', error);

    // تحليل نوع الخطأ لرسالة أفضل
    let errorMessage = 'فشل في تحديث العامل';
    let statusCode = 500;

    if (error.code === '23505') { // duplicate key
      errorMessage = 'اسم العامل موجود مسبقاً';
      statusCode = 409;
    } else if (error.code === '23502') { // not null violation
      errorMessage = 'بيانات العامل ناقصة';
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      data: null,
      processingTime: duration
    });
  }
});

/**
 * 🗑️ حذف عامل
 * DELETE /api/workers/:id
 * يتطلب صلاحيات مدير
 */
workerRouter.delete('/workers/:id', requireRole('admin'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const worker_id = req.params.id;
    console.log('🗑️ [API] طلب حذف العامل من المستخدم:', req.user?.email);
    console.log('📋 [API] ID العامل:', worker_id);

    if (!worker_id) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف العامل مطلوب',
        message: 'لم يتم توفير معرف العامل للحذف',
        processingTime: duration
      });
    }

    // التحقق من وجود العامل أولاً وجلب بياناته للـ logging
    const existingWorker = await db.select().from(workers).where(eq(workers.id, worker_id)).limit(1);

    if (existingWorker.length === 0) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] العامل غير موجود:', worker_id);
      return res.status(404).json({
        success: false,
        error: 'العامل غير موجود',
        message: `لم يتم العثور على عامل بالمعرف: ${worker_id}`,
        processingTime: duration
      });
    }

    const workerToDelete = existingWorker[0];

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    if (!isAdminUser && workerToDelete.created_by !== accessReq.user?.user_id) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لحذف هذا العامل' });
    }

    console.log('🗑️ [API] فحص إمكانية حذف العامل:', {
      id: workerToDelete.id,
      name: workerToDelete.name,
      type: workerToDelete.type
    });

    // فحص وجود سجلات حضور مرتبطة بالعامل قبل المحاولة للحذف
    console.log('🔍 [API] فحص سجلات الحضور المرتبطة بالعامل...');
    const attendanceRecords = await db.select({
      id: workerAttendance.id,
      date: workerAttendance.date,
      project_id: workerAttendance.project_id
    })
    .from(workerAttendance)
    .where(eq(workerAttendance.worker_id, worker_id))
    .limit(5); // جلب 5 سجلات كحد أقصى للمعاينة

    if (attendanceRecords.length > 0) {
      const duration = Date.now() - startTime;

      // حساب إجمالي سجلات الحضور
      const totalAttendanceCount = await db.select({
        count: sql`COUNT(*)`
      })
      .from(workerAttendance)
      .where(eq(workerAttendance.worker_id, worker_id));

      const totalCount = totalAttendanceCount[0]?.count || attendanceRecords.length;

      console.log(`⚠️ [API] لا يمكن حذف العامل - يحتوي على ${totalCount} سجل حضور`);

      return res.status(409).json({
        success: false,
        error: 'لا يمكن حذف العامل',
        message: `لا يمكن حذف العامل "${workerToDelete.name}" لأنه يحتوي على ${totalCount} سجل حضور. يجب حذف جميع سجلات الحضور المرتبطة بالعامل أولاً من صفحة حضور العمال.`,
        userAction: 'يجب حذف سجلات الحضور أولاً',
        relatedRecordsCount: totalCount,
        relatedRecordsType: 'سجلات حضور',
        processingTime: duration
      });
    }

    // فحص وجود سجلات أخرى مرتبطة بالعامل - شامل جميع الجداول
    console.log('🔍 [API] فحص سجلات التحويلات المالية المرتبطة بالعامل...');
    const transferRecords = await db.select({ id: workerTransfers.id })
      .from(workerTransfers)
      .where(eq(workerTransfers.worker_id, worker_id))
      .limit(1);

    if (transferRecords.length > 0) {
      const duration = Date.now() - startTime;

      // حساب إجمالي التحويلات المالية
      const totalTransfersCount = await db.select({
        count: sql`COUNT(*)`
      })
      .from(workerTransfers)
      .where(eq(workerTransfers.worker_id, worker_id));

      const transfersCount = totalTransfersCount[0]?.count || transferRecords.length;

      console.log(`⚠️ [API] لا يمكن حذف العامل - يحتوي على ${transfersCount} تحويل مالي`);

      return res.status(409).json({
        success: false,
        error: 'لا يمكن حذف العامل',
        message: `لا يمكن حذف العامل "${workerToDelete.name}" لأنه يحتوي على ${transfersCount} تحويل مالي. يجب حذف جميع التحويلات المالية المرتبطة بالعامل أولاً من صفحة تحويلات العمال.`,
        userAction: 'يجب حذف التحويلات المالية أولاً',
        relatedRecordsCount: transfersCount,
        relatedRecordsType: 'تحويلات مالية',
        processingTime: duration
      });
    }

    // فحص وجود سجلات مصاريف النقل المرتبطة بالعامل
    console.log('🔍 [API] فحص سجلات مصاريف النقل المرتبطة بالعامل...');
    const transportRecords = await db.select({ id: transportationExpenses.id })
      .from(transportationExpenses)
      .where(eq(transportationExpenses.worker_id, worker_id))
      .limit(1);

    if (transportRecords.length > 0) {
      const duration = Date.now() - startTime;

      // حساب إجمالي مصاريف النقل
      const totalTransportCount = await db.select({
        count: sql`COUNT(*)`
      })
      .from(transportationExpenses)
      .where(eq(transportationExpenses.worker_id, worker_id));

      const transportCount = totalTransportCount[0]?.count || transportRecords.length;

      console.log(`⚠️ [API] لا يمكن حذف العامل - يحتوي على ${transportCount} مصروف نقل`);

      return res.status(409).json({
        success: false,
        error: 'لا يمكن حذف العامل',
        message: `لا يمكن حذف العامل "${workerToDelete.name}" لأنه يحتوي على ${transportCount} مصروف نقل. يجب حذف جميع مصاريف النقل المرتبطة بالعامل أولاً من صفحة مصاريف النقل.`,
        userAction: 'يجب حذف مصاريف النقل أولاً',
        relatedRecordsCount: transportCount,
        relatedRecordsType: 'مصاريف نقل',
        processingTime: duration
      });
    }

    // فحص وجود أرصدة العمال
    console.log('🔍 [API] فحص أرصدة العمال المرتبطة بالعامل...');
    const balanceRecords = await db.select({ id: workerBalances.id })
      .from(workerBalances)
      .where(eq(workerBalances.worker_id, worker_id))
      .limit(1);

    if (balanceRecords.length > 0) {
      const duration = Date.now() - startTime;

      // حساب إجمالي سجلات الأرصدة
      const totalBalanceCount = await db.select({
        count: sql`COUNT(*)`
      })
      .from(workerBalances)
      .where(eq(workerBalances.worker_id, worker_id));

      const balanceCount = totalBalanceCount[0]?.count || balanceRecords.length;

      console.log(`⚠️ [API] لا يمكن حذف العامل - يحتوي على ${balanceCount} سجل رصيد`);

      return res.status(409).json({
        success: false,
        error: 'لا يمكن حذف العامل',
        message: `لا يمكن حذف العامل "${workerToDelete.name}" لأنه يحتوي على ${balanceCount} سجل رصيد. يجب تصفية جميع الأرصدة المرتبطة بالعامل أولاً من صفحة أرصدة العمال.`,
        userAction: 'يجب تصفية الأرصدة أولاً',
        relatedRecordsCount: balanceCount,
        relatedRecordsType: 'أرصدة',
        processingTime: duration
      });
    }

    // المتابعة مع حذف العامل من قاعدة البيانات
    console.log('🗑️ [API] حذف العامل من قاعدة البيانات (لا توجد سجلات مرتبطة)...');
    const deletedWorker = await db
      .delete(workers)
      .where(eq(workers.id, worker_id))
      .returning();

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم حذف العامل بنجاح في ${duration}ms:`, {
      id: deletedWorker[0].id,
      name: deletedWorker[0].name,
      type: deletedWorker[0].type
    });

    res.json({
      success: true,
      data: deletedWorker[0],
      message: `تم حذف العامل "${deletedWorker[0].name}" (${deletedWorker[0].type}) بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في حذف العامل:', error);

    // تحليل نوع الخطأ لرسالة أفضل ومعلومات إضافية للتشخيص
    let errorMessage = 'فشل في حذف العامل';
    let statusCode = 500;
    let userAction = 'يرجى المحاولة لاحقاً أو التواصل مع الدعم الفني';
    let relatedInfo: any = {};

    if (error.code === '23503') { // foreign key violation - backstop
      errorMessage = 'لا يمكن حذف العامل لوجود سجلات مرتبطة لم يتم اكتشافها مسبقاً';
      statusCode = 409;
      userAction = 'تحقق من جميع السجلات المرتبطة بالعامل في النظام وقم بحذفها أولاً';

      relatedInfo = {
        raceConditionDetected: true,
        constraintViolated: error.constraint || 'غير محدد',
        affectedTable: error.table || 'غير محدد',
        affectedColumn: error.column || 'غير محدد'
      };

    } else if (error.code === '22P02') { // invalid input syntax
      errorMessage = 'معرف العامل غير صحيح أو تالف';
      statusCode = 400;
      userAction = 'تحقق من صحة معرف العامل';
      relatedInfo = {
        invalidInputDetected: true,
        inputValue: req.params.id,
        expectedFormat: 'UUID صحيح'
      };
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: 'خطأ في حذف العامل',
      userAction,
      processingTime: duration,
      troubleshooting: relatedInfo
    });
  }
});

// ===========================================
// Worker Transfers Routes (تحويلات العمال)
// ===========================================

/**
 * 📊 اقتراح توزيع حوالة على المشاريع
 * POST /api/worker-transfers/suggest-allocation
 */
workerRouter.post('/worker-transfers/suggest-allocation', async (req: Request, res: Response) => {
  try {
    const { workerId, amount, mode } = req.body;

    if (!workerId || !amount) {
      return res.status(400).json({ success: false, message: 'workerId و amount مطلوبان' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'المبلغ يجب أن يكون رقم موجب' });
    }

    const allocMode = mode === 'fifo' ? 'fifo' : 'proportional';

    const balances = await PaymentAllocationService.getWorkerOpenBalances(workerId);
    const suggestedAllocations = PaymentAllocationService.suggestAllocation(balances, numAmount, allocMode);

    const enrichedAllocations = suggestedAllocations.map(a => {
      const bal = balances.find(b => b.projectId === a.projectId);
      return {
        ...a,
        projectName: bal?.projectName || '',
        balance: bal?.currentBalance || 0,
      };
    });

    res.json({
      success: true,
      data: {
        balances: balances.map(b => ({
          projectId: b.projectId,
          projectName: b.projectName,
          balance: b.currentBalance,
        })),
        suggestedAllocations: enrichedAllocations
      },
      message: 'تم اقتراح التوزيع بنجاح'
    });
  } catch (error: any) {
    console.error('❌ خطأ في اقتراح توزيع الحوالة:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'فشل في اقتراح التوزيع',
      data: null
    });
  }
});

/**
 * 💸 تنفيذ توزيع حوالة على عدة مشاريع
 * POST /api/worker-transfers/allocate
 */
workerRouter.post('/worker-transfers/allocate', async (req: Request, res: Response) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, message: 'يجب تسجيل الدخول' });
    }

    const {
      workerId, payerProjectId, totalAmount,
      recipientName, recipientPhone, transferNumber,
      transferMethod, transferDate, senderName, notes,
      allocations
    } = req.body;

    if (!workerId || !payerProjectId || !totalAmount || !recipientName || !transferMethod || !transferDate || !allocations) {
      return res.status(400).json({
        success: false,
        message: 'بيانات ناقصة: workerId, payerProjectId, totalAmount, recipientName, transferMethod, transferDate, allocations مطلوبة'
      });
    }

    if (!Array.isArray(allocations) || allocations.length === 0) {
      return res.status(400).json({ success: false, message: 'يجب تحديد توزيع واحد على الأقل' });
    }

    const numAmount = Number(totalAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'المبلغ يجب أن يكون رقم موجب' });
    }

    const { allowed } = checkProjectAccess(req, payerProjectId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    const result = await PaymentAllocationService.executeAllocation(
      workerId,
      payerProjectId,
      numAmount,
      allocations.map((a: any) => ({ projectId: a.projectId, amount: Number(a.amount) })),
      {
        recipientName,
        recipientPhone: recipientPhone || undefined,
        transferNumber: transferNumber || undefined,
        transferMethod,
        transferDate,
        senderName: senderName || undefined,
        notes: notes || undefined,
      },
      authUser.user_id
    );

    console.log(`✅ [PaymentAllocation] تم توزيع حوالة بنجاح - batchId: ${result.batchId}, transfers: ${result.transferIds.length}`);

    res.json({
      success: true,
      data: {
        batchId: result.batchId,
        transferIds: result.transferIds,
        projectFundTransferIds: result.projectFundTransferIds,
        allocations: result.allocations
      },
      message: `تم توزيع الحوالة بنجاح على ${result.allocations.length} مشروع`
    });
  } catch (error: any) {
    console.error('❌ خطأ في تنفيذ توزيع الحوالة:', error);
    const statusCode = error.message?.includes('لا يساوي') || error.message?.includes('موجبة') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'فشل في تنفيذ توزيع الحوالة',
      data: null
    });
  }
});

/**
 * 🔄 تحديث تحويل عامل موجود
 * PATCH /worker-transfers/:id
 */
workerRouter.patch('/worker-transfers/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const transferId = req.params.id;
    console.log('🔄 [API] طلب تحديث تحويل العامل من المستخدم:', req.user?.email);
    console.log('📋 [API] ID تحويل العامل:', transferId);
    console.log('📋 [API] بيانات التحديث المرسلة:', req.body);

    if (!transferId) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف تحويل العامل مطلوب',
        message: 'لم يتم توفير معرف تحويل العامل للتحديث',
        processingTime: duration
      });
    }

    // التحقق من وجود تحويل العامل أولاً
    const existingTransfer = await db.select().from(workerTransfers).where(eq(workerTransfers.id, transferId)).limit(1);

    if (existingTransfer.length === 0) {
      const duration = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: 'تحويل العامل غير موجود',
        message: `لم يتم العثور على تحويل عامل بالمعرف: ${transferId}`,
        processingTime: duration
      });
    }

    const { allowed: transferPatchAllowed } = checkProjectAccess(req, existingTransfer[0].project_id);
    if (!transferPatchAllowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لتعديل هذا التحويل' });
    }

    // Map old frontend fields to schema fields if necessary
    const body = { ...req.body };
    if (body.fundAmount !== undefined && body.amount === undefined) {
      body.amount = body.fundAmount;
    }
    if (body.selectedDate !== undefined && body.transferDate === undefined) {
      body.transferDate = body.selectedDate;
    }

    // Validation باستخدام insert schema - نسمح بتحديث جزئي
    const validationResult = insertWorkerTransferSchema.partial().safeParse(body);

    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] فشل في validation تحديث تحويل العامل:', validationResult.error.flatten());

      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحديث تحويل العامل غير صحيحة';

      return res.status(400).json({
        success: false,
        error: 'بيانات تحديث تحويل العامل غير صحيحة',
        message: firstError,
        details: errorMessages,
        processingTime: duration
      });
    }

    const sanitizedTransferData = pickAllowedFields(validationResult.data as Record<string, unknown>, ALLOWED_TRANSFER_PATCH_FIELDS);

    const confirmGuard = req.body.confirmGuard === true;
    const newAmount = sanitizedTransferData.amount !== undefined ? parseFloat(String(sanitizedTransferData.amount)) : null;
    const oldAmount = parseFloat(String(existingTransfer[0].amount));
    const workerId = sanitizedTransferData.worker_id || existingTransfer[0].worker_id;
    const projectId = sanitizedTransferData.project_id || existingTransfer[0].project_id;

    if (!confirmGuard && newAmount !== null && newAmount > oldAmount && workerId) {
      const amountDelta = newAmount - oldAmount;
      try {
        const balanceResult = await pool.query(
          `SELECT 
             COALESCE(SUM(wb.current_balance), 0) as total_balance,
             (SELECT name FROM workers WHERE id = $1 LIMIT 1) as worker_name
           FROM worker_balances wb
           WHERE wb.worker_id = $1`,
          [workerId]
        );
        const currentBalance = parseFloat(balanceResult.rows[0]?.total_balance || '0');
        const workerName = balanceResult.rows[0]?.worker_name || 'عامل';
        const resultingBalance = currentBalance - amountDelta;
        if (resultingBalance < 0) {
          const maxSafeIncrease = Math.max(0, currentBalance);
          const maxSafeAmount = oldAmount + maxSafeIncrease;
          return res.status(422).json({
            requiresConfirmation: true,
            guardType: 'negative_balance',
            message: `تحديث التحويل سيجعل رصيد ${workerName} سالباً (${resultingBalance.toFixed(2)})`,
            guardData: {
              workerName,
              currentBalance,
              transferAmount: newAmount,
              oldAmount,
              resultingBalance,
              maxSafeAmount,
            },
            suggestions: [
              { id: 'proceed', label: 'متابعة رغم الرصيد السالب', description: `الرصيد الإجمالي سيصبح ${resultingBalance.toFixed(2)}`, action: 'proceed_with_note', icon: 'check' },
              ...(maxSafeAmount > 0 ? [{ id: 'reduce', label: `تقليل إلى ${maxSafeAmount.toFixed(2)}`, description: `أقصى مبلغ لا يسبب رصيد سالب`, action: 'adjust_amount', adjustedAmount: maxSafeAmount, icon: 'edit' }] : []),
              { id: 'cancel', label: 'إلغاء', description: 'العودة دون تعديل', action: 'cancel', icon: 'cancel' },
            ],
            _originalBody: req.body,
          });
        }
      } catch (balanceErr) {
        console.error('[PATCH worker-transfers] FAIL-CLOSED: Balance check error, blocking update:', balanceErr);
        return res.status(500).json({
          success: false,
          message: 'فشل في التحقق من رصيد العامل. لأسباب أمنية، تم حظر التعديل. حاول مرة أخرى.',
          error: 'BALANCE_CHECK_FAILED',
        });
      }
    }

    if (confirmGuard) {
      const gNote = String(req.body.guardNote || '').trim();
      if (gNote.length < 5) {
        return res.status(400).json({ success: false, message: 'يجب كتابة سبب التأكيد (5 أحرف على الأقل) عند تجاوز تنبيه الحارس المالي.' });
      }
      sanitizedTransferData.notes = ((sanitizedTransferData.notes || existingTransfer[0].notes || '') + ' | [GUARD_OVERRIDE] ' + gNote).trim();
      console.log(`[WorkerTransferGuard] OVERRIDE PATCH for transfer ${transferId}: ${gNote}`);
      if (req.body.adjustedAmount !== undefined) {
        const adj = parseFloat(req.body.adjustedAmount);
        if (!Number.isFinite(adj) || adj < 0) {
          return res.status(400).json({ success: false, message: 'المبلغ المعدّل غير صالح (يجب أن يكون رقماً موجباً).' });
        }
        sanitizedTransferData.amount = String(adj);
      }
    }

    const userId = getAuthUser(req)?.user_id;

    const updatedTransfer = await withTransaction(async (client) => {
      const updateResult = await client.query(
        `UPDATE worker_transfers SET ${Object.keys(sanitizedTransferData).map((k, i) => `"${k}" = $${i + 1}`).join(', ')} WHERE id = $${Object.keys(sanitizedTransferData).length + 1} RETURNING *`,
        [...Object.values(sanitizedTransferData), transferId]
      );
      const t = updateResult.rows[0];

      const oldEntries = await client.query(
        `SELECT id FROM journal_entries WHERE source_table = $1 AND source_id = $2 AND status = 'posted'`,
        ['worker_transfers', transferId]
      );
      for (const entry of oldEntries.rows) {
        await FinancialLedgerService.reverseEntryWithClient(client, entry.id, 'تعديل تحويل عامل', userId);
      }

      await FinancialLedgerService._createJournalEntryWithClient(client, {
        project_id: t.project_id,
        entryDate: t.transfer_date,
        description: `حوالة عامل بقيمة ${t.amount}`,
        sourceTable: 'worker_transfers',
        sourceId: t.id,
        createdBy: userId,
        lines: [
          { accountCode: '5300', debitAmount: parseFloat(t.amount), creditAmount: 0, description: 'حوالة عامل' },
          { accountCode: '1100', debitAmount: 0, creditAmount: parseFloat(t.amount), description: 'دفع حوالة' },
        ]
      });

      return t;
    });

    const freshTransfer = await db.select().from(workerTransfers).where(eq(workerTransfers.id, transferId)).limit(1);
    const responseData = freshTransfer[0];

    try {
      await FinancialIntegrityService.syncWorkerBalance(responseData.worker_id, responseData.project_id);
    } catch (err) { console.error('[FinancialIntegrity] Balance sync error:', err); }

    FinancialIntegrityService.logFinancialChange({
      projectId: responseData.project_id,
      action: 'update',
      entityType: 'worker_transfer',
      entityId: responseData.id,
      previousData: existingTransfer[0],
      newData: responseData,
      userId: getAuthUser(req)?.user_id,
      userEmail: (req as any).user?.email,
      reason: 'تعديل تحويل عامل'
    }).catch(err => console.error('[FinancialIntegrity] Audit log error:', err));

    try {
      const oldDate = existingTransfer[0].transferDate.substring(0, 10);
      const newDate = responseData.transferDate.substring(0, 10);
      const minDate = oldDate < newDate ? oldDate : newDate;
      await SummaryRebuildService.markInvalid(responseData.project_id, minDate);
    } catch (e) { console.error('[SummaryRebuild] worker-transfers/PATCH markInvalid error:', e); }

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم تحديث تحويل العامل بنجاح في ${duration}ms`);

    res.json({
      success: true,
      data: responseData,
      message: `تم تحديث تحويل العامل بقيمة ${responseData.amount} بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في تحديث تحويل العامل:', error);

    res.status(500).json({
      success: false,
      message: 'فشل في تحديث تحويل العامل',
      data: null,
      processingTime: duration
    });
  }
});

/**
 * 🗑️ حذف تحويل عامل
 * DELETE /worker-transfers/:id
 */
workerRouter.delete('/worker-transfers/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const transferId = req.params.id;
    console.log('🗑️ [API] طلب حذف حوالة العامل:', transferId);
    console.log('👤 [API] المستخدم:', req.user?.email);

    if (!transferId) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف حوالة العامل مطلوب',
        message: 'لم يتم توفير معرف الحوالة للحذف',
        processingTime: duration
      });
    }

    // التحقق من وجود الحوالة أولاً
    const existingTransfer = await db.select().from(workerTransfers).where(eq(workerTransfers.id, transferId)).limit(1);

    if (existingTransfer.length === 0) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] حوالة العامل غير موجودة:', transferId);
      return res.status(404).json({
        success: false,
        error: 'حوالة العامل غير موجودة',
        message: `لم يتم العثور على حوالة بالمعرف: ${transferId}`,
        processingTime: duration
      });
    }

    const { allowed: transferDeleteAllowed } = checkProjectAccess(req, existingTransfer[0].project_id);
    if (!transferDeleteAllowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لحذف هذا التحويل' });
    }

    const transferToDelete = existingTransfer[0];
    console.log('🗑️ [API] سيتم حذف حوالة العامل:', {
      id: transferToDelete.id,
      worker_id: transferToDelete.worker_id,
      amount: transferToDelete.amount,
      recipientName: transferToDelete.recipientName
    });

    const userId = getAuthUser(req)?.user_id;

    const deletedTransfer = await withTransaction(async (client) => {
      const oldEntries = await client.query(
        `SELECT id FROM journal_entries WHERE source_table = $1 AND source_id = $2 AND status = 'posted'`,
        ['worker_transfers', transferId]
      );
      for (const entry of oldEntries.rows) {
        await FinancialLedgerService.reverseEntryWithClient(client, entry.id, 'حذف تحويل عامل', userId);
      }

      const deleteResult = await client.query(
        `DELETE FROM worker_transfers WHERE id = $1 RETURNING *`,
        [transferId]
      );
      return deleteResult.rows;
    });

    try {
      await FinancialIntegrityService.syncWorkerBalance(transferToDelete.worker_id, transferToDelete.project_id);
    } catch (err) { console.error('[FinancialIntegrity] Balance sync error:', err); }

    FinancialIntegrityService.logFinancialChange({
      projectId: transferToDelete.project_id,
      action: 'delete',
      entityType: 'worker_transfer',
      entityId: transferToDelete.id,
      previousData: transferToDelete,
      userId: getAuthUser(req)?.user_id,
      userEmail: (req as any).user?.email,
      reason: 'حذف تحويل عامل'
    }).catch(err => console.error('[FinancialIntegrity] Audit log error:', err));

    try {
      await SummaryRebuildService.markInvalid(transferToDelete.project_id, transferToDelete.transferDate.substring(0, 10));
    } catch (e) { console.error('[SummaryRebuild] worker-transfers/DELETE markInvalid error:', e); }

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم حذف حوالة العامل بنجاح في ${duration}ms:`, {
      id: transferToDelete.id,
      amount: transferToDelete.amount,
      recipientName: transferToDelete.recipientName
    });

    res.json({
      success: true,
      data: transferToDelete,
      message: `تم حذف حوالة العامل إلى "${transferToDelete.recipientName}" بقيمة ${transferToDelete.amount} بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في حذف حوالة العامل:', error);

    // تحليل نوع الخطأ لرسالة أفضل
    let errorMessage = 'فشل في حذف حوالة العامل';
    let statusCode = 500;

    if (error.code === '23503') { // foreign key violation
      errorMessage = 'لا يمكن حذف حوالة العامل - مرتبطة ببيانات أخرى';
      statusCode = 409;
    } else if (error.code === '22P02') { // invalid input syntax
      errorMessage = 'معرف حوالة العامل غير صحيح';
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      data: null,
      processingTime: duration
    });
  }
});

// ===========================================
// Worker Misc Expenses Routes (مصاريف العمال المتنوعة)
// ===========================================

/**
 * 📊 جلب مصاريف العمال المتنوعة
 * GET /worker-misc-expenses
 */
workerRouter.get('/worker-misc-expenses', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const {project_id, date} = req.query;
    console.log('📊 [API] جلب مصاريف العمال المتنوعة');
    console.log('🔍 [API] معاملات الفلترة:', {project_id, date});

    if (project_id) {
      const { allowed } = checkProjectAccess(req, project_id as string);
      if (!allowed) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
      }
    }

    // بناء الاستعلام مع الفلترة
    let query;

    const accessReqMisc = req as ProjectAccessRequest;
    const isAdminMisc = projectAccessService.isAdmin(accessReqMisc.user?.role || '');
    const accessibleMiscIds = accessReqMisc.accessibleProjectIds ?? [];

    // تطبيق الفلترة حسب المعاملات الموجودة
    if (project_id && date) {
      query = db.select().from(workerMiscExpenses).where(and(
        eq(workerMiscExpenses.project_id, project_id as string),
        eq(workerMiscExpenses.date, date as string)
      ));
    } else if (project_id) {
      query = db.select().from(workerMiscExpenses).where(eq(workerMiscExpenses.project_id, project_id as string));
    } else if (date) {
      if (!isAdminMisc && accessibleMiscIds.length > 0) {
        query = db.select().from(workerMiscExpenses).where(and(
          eq(workerMiscExpenses.date, date as string),
          inArray(workerMiscExpenses.project_id, accessibleMiscIds)
        ));
      } else if (!isAdminMisc) {
        query = db.select().from(workerMiscExpenses).where(sql`1=0`);
      } else {
        query = db.select().from(workerMiscExpenses).where(eq(workerMiscExpenses.date, date as string));
      }
    } else {
      if (!isAdminMisc && accessibleMiscIds.length > 0) {
        query = db.select().from(workerMiscExpenses).where(inArray(workerMiscExpenses.project_id, accessibleMiscIds));
      } else if (!isAdminMisc) {
        query = db.select().from(workerMiscExpenses).where(sql`1=0`);
      } else {
        query = db.select().from(workerMiscExpenses);
      }
    }

    const expenses = await query.orderBy(workerMiscExpenses.date).limit(5000);

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${expenses.length} مصروف متنوع في ${duration}ms`);

    res.json({
      success: true,
      data: expenses,
      message: `تم جلب ${expenses.length} مصروف متنوع بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب المصاريف المتنوعة:', error);
    res.status(500).json({
      success: false,
      data: [],
      message: 'فشل في جلب المصاريف المتنوعة',

      processingTime: duration
    });
  }
});

/**
 * 🔄 تحديث مصروف متنوع للعامل
 * PATCH /worker-misc-expenses/:id
 */
workerRouter.patch('/worker-misc-expenses/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const expenseId = req.params.id;
    console.log('🔄 [API] طلب تحديث المصروف المتنوع للعامل من المستخدم:', req.user?.email);
    console.log('📋 [API] ID المصروف المتنوع:', expenseId);
    console.log('📋 [API] بيانات التحديث المرسلة:', req.body);

    if (!expenseId) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف المصروف المتنوع للعامل مطلوب',
        message: 'لم يتم توفير معرف المصروف المتنوع للعامل للتحديث',
        processingTime: duration
      });
    }

    // التحقق من وجود المصروف المتنوع أولاً
    const existingExpense = await db.select().from(workerMiscExpenses).where(eq(workerMiscExpenses.id, expenseId)).limit(1);

    if (existingExpense.length === 0) {
      const duration = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: 'المصروف المتنوع للعامل غير موجود',
        message: `لم يتم العثور على مصروف متنوع للعامل بالمعرف: ${expenseId}`,
        processingTime: duration
      });
    }

    const { allowed: expPatchAllowed } = checkProjectAccess(req, existingExpense[0].project_id);
    if (!expPatchAllowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لتعديل هذا المصروف' });
    }

    // Map old frontend fields to schema fields if necessary
    const body = { ...req.body };
    if (body.fundAmount !== undefined && body.amount === undefined) {
      body.amount = body.fundAmount;
    }
    if (body.selectedDate !== undefined && body.date === undefined) {
      body.date = body.selectedDate;
    }

    // Validation باستخدام insert schema - نسمح بتحديث جزئي
    const validationResult = insertWorkerMiscExpenseSchema.partial().safeParse(body);

    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] فشل في validation تحديث المصروف المتنوع للعامل:', validationResult.error.flatten());

      const errorMessages = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errorMessages)[0]?.[0] || 'بيانات تحديث المصروف المتنوع للعامل غير صحيحة';

      return res.status(400).json({
        success: false,
        error: 'بيانات تحديث المصروف المتنوع للعامل غير صحيحة',
        message: firstError,
        details: errorMessages,
        processingTime: duration
      });
    }

    const sanitizedExpenseData = pickAllowedFields(validationResult.data as Record<string, unknown>, ALLOWED_MISC_EXPENSE_PATCH_FIELDS);

    const userId = getAuthUser(req)?.user_id;

    const updatedExpense = await withTransaction(async (client) => {
      const updateResult = await client.query(
        `UPDATE worker_misc_expenses SET ${Object.keys(sanitizedExpenseData).map((k, i) => `"${k}" = $${i + 1}`).join(', ')} WHERE id = $${Object.keys(sanitizedExpenseData).length + 1} RETURNING *`,
        [...Object.values(sanitizedExpenseData), expenseId]
      );
      const t = updateResult.rows[0];

      const oldEntries = await client.query(
        `SELECT id FROM journal_entries WHERE source_table = $1 AND source_id = $2 AND status = 'posted'`,
        ['worker_misc_expenses', expenseId]
      );
      for (const entry of oldEntries.rows) {
        await FinancialLedgerService.reverseEntryWithClient(client, entry.id, 'تعديل مصروف متنوع', userId);
      }

      await FinancialLedgerService._createJournalEntryWithClient(client, {
        project_id: t.project_id,
        entryDate: t.date,
        description: `مصروف متنوع بقيمة ${t.amount}`,
        sourceTable: 'worker_misc_expenses',
        sourceId: t.id,
        createdBy: userId,
        lines: [
          { accountCode: '5400', debitAmount: parseFloat(t.amount), creditAmount: 0, description: 'مصاريف متنوعة' },
          { accountCode: '1100', debitAmount: 0, creditAmount: parseFloat(t.amount), description: 'دفع مصروف' },
        ]
      });

      return t;
    });

    const freshExpense = await db.select().from(workerMiscExpenses).where(eq(workerMiscExpenses.id, expenseId)).limit(1);
    const responseData = freshExpense[0];

    try {
      const oldDate = existingExpense[0].date;
      const newDate = responseData.date;
      const minDate = oldDate < newDate ? oldDate : newDate;
      await SummaryRebuildService.markInvalid(responseData.project_id, minDate);
    } catch (e) { console.error('[SummaryRebuild] worker-misc-expenses/PATCH markInvalid error:', e); }

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم تحديث المصروف المتنوع للعامل بنجاح في ${duration}ms`);

    res.json({
      success: true,
      data: responseData,
      message: `تم تحديث المصروف المتنوع للعامل بقيمة ${responseData.amount} بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في تحديث المصروف المتنوع للعامل:', error);

    res.status(500).json({
      success: false,
      message: 'فشل في تحديث المصروف المتنوع للعامل',
      data: null,
      processingTime: duration
    });
  }
});

// ===========================================
// Worker Autocomplete Routes (الإكمال التلقائي للعمال)
// ===========================================

/**
 * 📝 جلب وصف المصاريف المتنوعة للإكمال التلقائي
 * GET /autocomplete/workerMiscDescriptions
 */
workerRouter.get('/autocomplete/workerMiscDescriptions', async (req: Request, res: Response) => {
  try {
    console.log('📝 [API] جلب وصف المصاريف المتنوعة للإكمال التلقائي');

    // جلب وصف المصاريف المتنوعة للعمال من قاعدة البيانات أو إرجاع قائمة فارغة
    res.json({
      success: true,
      data: [],
      message: 'تم جلب وصف المصاريف المتنوعة بنجاح'
    });
  } catch (error: any) {
    console.error('❌ [API] خطأ في جلب وصف المصاريف المتنوعة:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب وصف المصاريف المتنوعة'
    });
  }
});

// ===========================================
// Worker Types Routes (أنواع العمال)
// ===========================================

/**
 * ➕ إضافة نوع عامل جديد
 * POST /worker-types
 */
workerRouter.post('/worker-types', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { name } = req.body;

    console.log('➕ [API] طلب إضافة نوع عامل جديد:', name);

    if (!name || typeof name !== 'string' || !name.trim()) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'اسم نوع العامل مطلوب',
        message: 'يرجى تقديم اسم صحيح لنوع العامل',
        processingTime: duration
      });
    }

    // التحقق من عدم تكرار النوع في قاعدة البيانات
    const existingType = await db.select().from(workerTypes)
      .where(sql`LOWER(name) = LOWER(${name.trim()})`);

    if (existingType.length > 0) {
      const duration = Date.now() - startTime;
      return res.status(409).json({
        success: false,
        error: 'نوع العامل موجود مسبقاً',
        message: `نوع العامل "${name.trim()}" موجود في النظام`,
        processingTime: duration
      });
    }

    // إدراج نوع عامل جديد في قاعدة البيانات
    const newWorkerType = await db.insert(workerTypes).values({
      name: name.trim()
    }).returning();

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم إضافة نوع عامل جديد "${name}" بنجاح في ${duration}ms`);

    res.status(201).json({
      success: true,
      data: newWorkerType[0],
      message: `تم إضافة نوع العامل "${name.trim()}" بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في إضافة نوع عامل جديد:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة نوع العامل',
      data: null,
      processingTime: duration
    });
  }
});

// ===========================================
// Worker Project Wages Routes (أجور العمال حسب المشروع)
// ===========================================

/**
 * 💰 جلب أجور جميع العمال في مشروع محدد
 * GET /worker-project-wages/by-project/:projectId
 */
workerRouter.get('/worker-project-wages/by-project/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const { allowed } = checkProjectAccess(req, projectId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    const wages = await db.select().from(workerProjectWages)
      .where(eq(workerProjectWages.project_id, projectId))
      .orderBy(desc(workerProjectWages.effectiveFrom));

    res.json({
      success: true,
      data: wages,
      message: `تم جلب ${wages.length} سجل أجر للمشروع`
    });
  } catch (error: any) {
    console.error('❌ خطأ في جلب أجور المشروع:', error);
    res.status(500).json({
      success: false,
      data: [],
      message: 'فشل في جلب أجور المشروع'
    });
  }
});

/**
 * 💰 جلب أجور عامل في المشاريع
 * GET /worker-project-wages/:workerId
 */
workerRouter.get('/worker-project-wages/:workerId', async (req: Request, res: Response) => {
  try {
    const { workerId } = req.params;
    const { project_id } = req.query;

    const conditions: any[] = [eq(workerProjectWages.worker_id, workerId)];
    if (project_id) {
      conditions.push(eq(workerProjectWages.project_id, project_id as string));
    }

    const wages = await db.select().from(workerProjectWages)
      .where(and(...conditions))
      .orderBy(desc(workerProjectWages.effectiveFrom));

    res.json({
      success: true,
      data: wages,
      message: `تم جلب ${wages.length} سجل أجر للعامل`
    });
  } catch (error: any) {
    console.error('❌ خطأ في جلب أجور العامل حسب المشروع:', error);
    res.status(500).json({
      success: false,
      data: [],
      message: 'فشل في جلب أجور العامل حسب المشروع'
    });
  }
});

/**
 * 🔄 ترحيل أجور العمال من سجلات الحضور الحالية
 * POST /worker-project-wages/backfill
 */
workerRouter.post('/worker-project-wages/backfill', async (req: Request, res: Response) => {
  try {
    if (!getAuthUser(req) || !(getAuthUser(req)!.role === 'admin' || getAuthUser(req)!.role === 'super_admin')) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const activeWorkers = await db.select().from(workers).where(eq(workers.is_active, true));
    let createdCount = 0;

    for (const worker of activeWorkers) {
      const distinctProjects = await db.select({
        project_id: workerAttendance.project_id,
        earliestDate: sql<string>`MIN(${workerAttendance.attendanceDate})`
      })
        .from(workerAttendance)
        .where(eq(workerAttendance.worker_id, worker.id))
        .groupBy(workerAttendance.project_id);

      for (const proj of distinctProjects) {
        const existing = await db.select().from(workerProjectWages)
          .where(and(
            eq(workerProjectWages.worker_id, worker.id),
            eq(workerProjectWages.project_id, proj.project_id)
          ))
          .limit(1);

        if (existing.length === 0) {
          const userId = getAuthUser(req)?.user_id;
          await db.insert(workerProjectWages).values({
            worker_id: worker.id,
            project_id: proj.project_id,
            dailyWage: worker.dailyWage,
            effectiveFrom: proj.earliestDate,
            is_active: true,
            created_by: userId || null,
          });
          createdCount++;
        }
      }
    }

    res.json({
      success: true,
      data: { createdCount },
      message: `تم إنشاء ${createdCount} سجل أجر من بيانات الحضور الحالية`
    });
  } catch (error: any) {
    console.error('❌ خطأ في ترحيل أجور العمال:', error);
    res.status(500).json({ success: false, message: 'فشل في ترحيل أجور العمال' });
  }
});

/**
 * ➕ إنشاء سجل أجر عامل في مشروع
 * POST /worker-project-wages
 */
workerRouter.post('/worker-project-wages', async (req: Request, res: Response) => {
  try {
    const validationResult = insertWorkerProjectWageSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'بيانات الأجر غير صحيحة',
        details: validationResult.error.flatten().fieldErrors
      });
    }

    const { allowed } = checkProjectAccess(req, validationResult.data.project_id);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية الوصول لهذا المشروع' });
    }

    const userId = getAuthUser(req)?.user_id;
    const wageData = { ...validationResult.data, created_by: userId || null };

    const [newWage] = await db.insert(workerProjectWages).values(wageData).returning();

    const { attendanceUpdated } = await recalculateAttendanceAndBalances(
      newWage.worker_id,
      newWage.project_id,
      newWage.effectiveFrom,
      newWage.effectiveTo || undefined
    );

    if (attendanceUpdated > 0) {
      console.log(`✅ [POST ProjectWage] تم إعادة حساب ${attendanceUpdated} سجل حضور بعد إنشاء أجر مشروع جديد`);
    }

    res.status(201).json({
      success: true,
      data: newWage,
      attendanceRecordsUpdated: attendanceUpdated,
      message: attendanceUpdated > 0
        ? `تم إنشاء أجر المشروع وإعادة حساب ${attendanceUpdated} سجل حضور بنجاح`
        : 'تم إنشاء سجل أجر العامل في المشروع بنجاح'
    });
  } catch (error: any) {
    console.error('❌ خطأ في إنشاء أجر العامل في المشروع:', error);
    let statusCode = 500;
    let message = 'فشل في إنشاء أجر العامل في المشروع';
    if (error.code === '23505') {
      statusCode = 409;
      message = 'سجل أجر مكرر لنفس العامل والمشروع وتاريخ السريان';
    }
    res.status(statusCode).json({ success: false, message });
  }
});

/**
 * ✏️ تعديل سجل أجر عامل في مشروع
 * PATCH /worker-project-wages/:id
 */
workerRouter.patch('/worker-project-wages/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await db.select().from(workerProjectWages).where(eq(workerProjectWages.id, id)).limit(1);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'سجل الأجر غير موجود' });
    }

    const { allowed } = checkProjectAccess(req, existing[0].project_id);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية الوصول لهذا المشروع' });
    }

    const validationResult = insertWorkerProjectWageSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'بيانات التحديث غير صحيحة',
        details: validationResult.error.flatten().fieldErrors
      });
    }

    const oldWage = existing[0];
    const newDailyWage = validationResult.data.dailyWage || oldWage.dailyWage;
    const isDailyWageChanged = validationResult.data.dailyWage && validationResult.data.dailyWage !== oldWage.dailyWage;

    const effectiveFrom = validationResult.data.effectiveFrom || oldWage.effectiveFrom;
    const effectiveTo = validationResult.data.effectiveTo !== undefined ? validationResult.data.effectiveTo : oldWage.effectiveTo;

    const oldEffectiveFrom = oldWage.effectiveFrom;
    const oldEffectiveTo = oldWage.effectiveTo;
    const rangeChanged = effectiveFrom !== oldEffectiveFrom || effectiveTo !== oldEffectiveTo;

    const [updated] = await db.update(workerProjectWages)
      .set({ ...validationResult.data, updated_at: new Date() })
      .where(eq(workerProjectWages.id, id))
      .returning();

    let attendanceUpdatedCount = 0;

    if (isDailyWageChanged || rangeChanged) {
      console.log(`💰 [ProjectWage] تغيير أجر المشروع للعامل ${oldWage.worker_id} في مشروع ${oldWage.project_id}: ${oldWage.dailyWage} → ${newDailyWage}`);

      const recalcFrom = rangeChanged
        ? (oldEffectiveFrom < effectiveFrom ? oldEffectiveFrom : effectiveFrom)
        : effectiveFrom;
      const recalcTo = rangeChanged
        ? (oldEffectiveTo && effectiveTo ? (oldEffectiveTo > effectiveTo ? oldEffectiveTo : effectiveTo) : null)
        : effectiveTo;

      const { attendanceUpdated } = await recalculateAttendanceAndBalances(
        oldWage.worker_id,
        oldWage.project_id,
        recalcFrom,
        recalcTo || undefined
      );
      attendanceUpdatedCount = attendanceUpdated;
    }

    res.json({
      success: true,
      data: updated,
      attendanceRecordsUpdated: attendanceUpdatedCount,
      message: attendanceUpdatedCount > 0
        ? `تم تحديث أجر المشروع وإعادة حساب ${attendanceUpdatedCount} سجل حضور بنجاح`
        : 'تم تحديث سجل أجر العامل في المشروع بنجاح'
    });
  } catch (error: any) {
    console.error('❌ خطأ في تحديث أجر العامل في المشروع:', error);
    res.status(500).json({ success: false, message: 'فشل في تحديث أجر العامل في المشروع' });
  }
});

/**
 * 🗑️ حذف سجل أجر عامل في مشروع
 * DELETE /worker-project-wages/:id
 */
workerRouter.delete('/worker-project-wages/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await db.select().from(workerProjectWages).where(eq(workerProjectWages.id, id)).limit(1);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'سجل الأجر غير موجود' });
    }

    const { allowed } = checkProjectAccess(req, existing[0].project_id);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية الوصول لهذا المشروع' });
    }

    const deletedWage = existing[0];
    await db.delete(workerProjectWages).where(eq(workerProjectWages.id, id));

    const { attendanceUpdated } = await recalculateAttendanceAndBalances(
      deletedWage.worker_id,
      deletedWage.project_id,
      deletedWage.effectiveFrom,
      deletedWage.effectiveTo || undefined
    );

    if (attendanceUpdated > 0) {
      console.log(`✅ [DELETE ProjectWage] تم إعادة حساب ${attendanceUpdated} سجل حضور بعد حذف أجر المشروع`);
    }

    res.json({
      success: true,
      attendanceRecordsUpdated: attendanceUpdated,
      message: attendanceUpdated > 0
        ? `تم حذف أجر المشروع وإعادة حساب ${attendanceUpdated} سجل حضور بنجاح`
        : 'تم حذف سجل أجر العامل في المشروع بنجاح'
    });
  } catch (error: any) {
    console.error('❌ خطأ في حذف أجر العامل في المشروع:', error);
    res.status(500).json({ success: false, message: 'فشل في حذف أجر العامل في المشروع' });
  }
});

// ===========================================
// Worker Attendance Routes (حضور العمال)
// ===========================================

/**
 * 📊 جلب حضور العمال لمشروع محدد
 * GET /api/worker-attendance
 */
workerRouter.get('/worker-attendance', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { project_id, date } = req.query;

    console.log(`📊 [API] جلب حضور العمال للمشروع: ${project_id}${date ? ` للتاريخ: ${date}` : ''}`);

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: Date.now() - startTime
      });
    }

    const { allowed: attGetAllowed } = checkProjectAccess(req, project_id as string);
    if (!attGetAllowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    // تنظيف التاريخ إذا وجد
    let cleanDate = date as string;
    if (cleanDate && cleanDate.includes(' ')) {
      cleanDate = cleanDate.split(' ')[0];
    } else if (cleanDate && cleanDate.includes('T')) {
      cleanDate = cleanDate.split('T')[0];
    }

    // بناء الاستعلام مع إمكانية الفلترة بالتاريخ
    let whereCondition;

    if (cleanDate) {
      whereCondition = and(
        eq(workerAttendance.project_id, project_id as string),
        eq(workerAttendance.attendanceDate, cleanDate)
      )!;
    } else {
      whereCondition = eq(workerAttendance.project_id, project_id as string);
    }

    const attendance = await db.select({
      id: workerAttendance.id,
      worker_id: workerAttendance.worker_id,
      project_id: workerAttendance.project_id,
      date: workerAttendance.date,
      attendanceDate: workerAttendance.attendanceDate,
      startTime: workerAttendance.startTime,
      endTime: workerAttendance.endTime,
      workDescription: workerAttendance.workDescription,
      workDays: workerAttendance.workDays,
      dailyWage: workerAttendance.dailyWage,
      actualWage: workerAttendance.actualWage,
      paidAmount: workerAttendance.paidAmount,
      remainingAmount: workerAttendance.remainingAmount,
      paymentType: workerAttendance.paymentType,
      isPresent: workerAttendance.isPresent,
      created_at: workerAttendance.created_at,
      workerName: workers.name
    })
    .from(workerAttendance)
    .leftJoin(workers, eq(workerAttendance.worker_id, workers.id))
    .where(whereCondition)
    .orderBy(workerAttendance.attendanceDate)
    .limit(5000);

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${attendance.length} سجل حضور في ${duration}ms`);

    res.json({
      success: true,
      data: attendance,
      message: `تم جلب ${attendance.length} سجل حضور للمشروع${cleanDate ? ` في التاريخ ${cleanDate}` : ''}`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب حضور العمال:', error);
    res.status(500).json({
      success: false,
      data: [],
      message: 'حدث خطأ داخلي',

      processingTime: duration
    });
  }
});

/**
 * 📊 جلب حضور العمال لمشروع محدد (مسار قديم للتوافق)
 * GET /projects/:project_id/worker-attendance
 */
workerRouter.get('/projects/:project_id/worker-attendance', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const {project_id} = req.params;
    const {date} = req.query;

    console.log(`📊 [API] جلب حضور العمال للمشروع (مسار قديم): ${project_id}${date ? ` للتاريخ: ${date}` : ''}`);

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: Date.now() - startTime
      });
    }

    const { allowed: attLegacyAllowed } = checkProjectAccess(req, project_id);
    if (!attLegacyAllowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    // تنظيف التاريخ إذا وجد
    let cleanDate = date as string;
    if (cleanDate && cleanDate.includes(' ')) {
      cleanDate = cleanDate.split(' ')[0];
    } else if (cleanDate && cleanDate.includes('T')) {
      cleanDate = cleanDate.split('T')[0];
    }

    // بناء الاستعلام مع إمكانية الفلترة بالتاريخ
    let whereCondition;

    if (cleanDate) {
      whereCondition = and(
        eq(workerAttendance.project_id, project_id),
        eq(workerAttendance.attendanceDate, cleanDate)
      )!;
    } else {
      whereCondition = eq(workerAttendance.project_id, project_id);
    }

    const attendance = await db.select({
      id: workerAttendance.id,
      worker_id: workerAttendance.worker_id,
      project_id: workerAttendance.project_id,
      date: workerAttendance.date,
      attendanceDate: workerAttendance.attendanceDate,
      startTime: workerAttendance.startTime,
      endTime: workerAttendance.endTime,
      workDescription: workerAttendance.workDescription,
      workDays: workerAttendance.workDays,
      dailyWage: workerAttendance.dailyWage,
      actualWage: workerAttendance.actualWage,
      paidAmount: workerAttendance.paidAmount,
      remainingAmount: workerAttendance.remainingAmount,
      paymentType: workerAttendance.paymentType,
      isPresent: workerAttendance.isPresent,
      created_at: workerAttendance.created_at,
      workerName: workers.name
    })
    .from(workerAttendance)
    .leftJoin(workers, eq(workerAttendance.worker_id, workers.id))
    .where(whereCondition)
    .orderBy(workerAttendance.attendanceDate)
    .limit(5000);

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${attendance.length} سجل حضور في ${duration}ms`);

    res.json({
      success: true,
      data: attendance,
      message: `تم جلب ${attendance.length} سجل حضور للمشروع${cleanDate ? ` في التاريخ ${cleanDate}` : ''}`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب حضور العمال:', error);
    res.status(500).json({
      success: false,
      data: [],
      message: 'حدث خطأ داخلي',

      processingTime: duration
    });
  }
});

/**
 * 🗑️ حذف سجل حضور عامل
 * DELETE /worker-attendance/:id
 * يجب أن يكون قبل POST لتجنب تضارب المسارات
 */
workerRouter.delete('/worker-attendance/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const attendanceId = req.params.id;
    console.log('🗑️ [API] طلب حذف سجل حضور العامل:', attendanceId);
    console.log('👤 [API] المستخدم:', req.user?.email);
    console.log('🔍 [API] المسار الكامل:', req.originalUrl);
    console.log('🔍 [API] Method:', req.method);

    if (!attendanceId) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف سجل الحضور مطلوب',
        message: 'لم يتم توفير معرف سجل الحضور للحذف',
        processingTime: duration
      });
    }

    // التحقق من وجود سجل الحضور أولاً
    const existingAttendance = await db.select().from(workerAttendance).where(eq(workerAttendance.id, attendanceId)).limit(1);

    if (existingAttendance.length === 0) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] سجل الحضور غير موجود:', attendanceId);
      return res.status(404).json({
        success: false,
        error: 'سجل الحضور غير موجود',
        message: `لم يتم العثور على سجل حضور بالمعرف: ${attendanceId}`,
        processingTime: duration
      });
    }

    const attendanceToDelete = existingAttendance[0];

    const { allowed: attDelAllowed } = checkProjectAccess(req, attendanceToDelete.project_id);
    if (!attDelAllowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لحذف هذا السجل' });
    }

    console.log('🗑️ [API] سيتم حذف سجل الحضور:', {
      id: attendanceToDelete.id,
      worker_id: attendanceToDelete.worker_id,
      date: attendanceToDelete.date,
      project_id: attendanceToDelete.project_id
    });

    const userId = getAuthUser(req)?.user_id;

    const deletedAttendance = await withTransaction(async (client) => {
      const oldEntries = await client.query(
        `SELECT id FROM journal_entries WHERE source_table = $1 AND source_id = $2 AND status = 'posted'`,
        ['worker_attendance', attendanceId]
      );
      for (const entry of oldEntries.rows) {
        await FinancialLedgerService.reverseEntryWithClient(client, entry.id, 'حذف حضور عامل', userId);
      }

      const deleteResult = await client.query(
        `DELETE FROM worker_attendance WHERE id = $1 RETURNING *`,
        [attendanceId]
      );

      return deleteResult.rows;
    });

    try {
      const deleteDate = attendanceToDelete.date || attendanceToDelete.attendance_date || attendanceToDelete.attendanceDate;
      if (attendanceToDelete.project_id && deleteDate) {
        await SummaryRebuildService.markInvalid(attendanceToDelete.project_id, deleteDate);
      }
    } catch (e) { console.error('[SummaryRebuild] worker-attendance/DELETE markInvalid error:', e); }

    if ((attendanceToDelete.well_id || attendanceToDelete.well_ids) && attendanceToDelete.worker_id) {
      try {
        let deleteWellIds: number[] = [];
        if (attendanceToDelete.well_ids) {
          try {
            const parsed = JSON.parse(attendanceToDelete.well_ids);
            if (Array.isArray(parsed)) deleteWellIds = parsed.map(Number).filter(Boolean);
          } catch { /* ignore */ }
        }
        if (deleteWellIds.length === 0 && attendanceToDelete.well_id) {
          deleteWellIds = [Number(attendanceToDelete.well_id)];
        }
        for (const wId of deleteWellIds) {
          const linkedCrews = await db.select({ id: wellWorkCrews.id })
            .from(wellWorkCrews)
            .where(and(
              eq(wellWorkCrews.well_id, wId),
              attendanceToDelete.date ? eq(wellWorkCrews.workDate, attendanceToDelete.date) : sql`${wellWorkCrews.workDate} IS NULL`
            ));
          for (const crew of linkedCrews) {
            await db.delete(wellCrewWorkers).where(
              and(
                eq(wellCrewWorkers.crew_id, crew.id),
                eq(wellCrewWorkers.worker_id, attendanceToDelete.worker_id)
              )
            );
          }
        }
        console.log(`[WellCrew] Removed worker ${attendanceToDelete.worker_id} from well crews`);
      } catch (err) {
        console.error('[WellCrew] Error cleaning up crew links:', err);
      }
    }

    try {
      await FinancialIntegrityService.syncWorkerBalance(attendanceToDelete.worker_id, attendanceToDelete.project_id);
    } catch (err) { console.error('[FinancialIntegrity] Balance sync error:', err); }

    FinancialIntegrityService.logFinancialChange({
      projectId: attendanceToDelete.project_id,
      action: 'delete',
      entityType: 'worker_attendance',
      entityId: attendanceToDelete.id,
      previousData: { daily_wage: attendanceToDelete.dailyWage, work_days: attendanceToDelete.workDays, actual_wage: attendanceToDelete.actualWage, paid_amount: attendanceToDelete.paidAmount, date: attendanceToDelete.date },
      userId: getAuthUser(req)?.user_id,
      userEmail: (req as any).user?.email,
      reason: 'حذف سجل حضور'
    }).catch(err => console.error('[FinancialIntegrity] Audit log error:', err));

    if (globalThis.io && deletedAttendance[0]) {
      (globalThis.io as any).to('authenticated').emit('entity:update', {
        type: 'INVALIDATE',
        entity: 'worker-attendance',
        project_id: deletedAttendance[0].project_id,
        date: deletedAttendance[0].date
      });
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم حذف سجل الحضور بنجاح في ${duration}ms:`, {
      id: deletedAttendance[0].id,
      worker_id: deletedAttendance[0].worker_id,
      date: deletedAttendance[0].date
    });

    res.json({
      success: true,
      data: deletedAttendance[0],
      message: `تم حذف سجل الحضور بتاريخ ${deletedAttendance[0].date} بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في حذف سجل الحضور:', error);

    let errorMessage = 'فشل في حذف سجل الحضور';
    let statusCode = 500;

    if (error.code === '23503') { // foreign key violation
      errorMessage = 'لا يمكن حذف سجل الحضور - مرتبط ببيانات أخرى';
      statusCode = 409;
    } else if (error.code === '22P02') { // invalid input syntax
      errorMessage = 'معرف سجل الحضور غير صحيح';
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      data: null,
      processingTime: duration
    });
  }
});

/**
 * 📝 إضافة حضور عامل جديد
 * POST /worker-attendance
 */
workerRouter.post('/worker-attendance', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    console.log('📝 [API] طلب إضافة حضور عامل جديد من المستخدم:', req.user?.email);
    console.log('📋 [API] بيانات حضور العامل المرسلة:', req.body);

    const { allowed: attPostAllowed } = checkProjectAccess(req, req.body.project_id);
    if (!attPostAllowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    // Validation باستخدام insert schema مع معالجة خاصة للسحب المقدم
    const { recordType = 'work' } = req.body as { recordType?: string };

    // للسحب المقدم: نسمح بـ workDays = 0
    if (recordType === 'advance' && req.body.workDays === 0) {
      req.body.workDays = 0.001; // قيمة صغيرة جداً لتمرير الـ validation
    }

    const attendanceData = {
      ...req.body,
      attendanceDate: req.body.attendanceDate || req.body.selectedDate,
      date: req.body.date || req.body.selectedDate,
      workDays: req.body.workDays?.toString(),
    };
    const validationResult = insertWorkerAttendanceSchema.safeParse(attendanceData);

    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      console.error('❌ [API] فشل في validation حضور العامل:', validationResult.error.flatten());

      const errorMessages = validationResult.error.flatten().fieldErrors;

      // إنشاء رسالة خطأ مفصلة وواضحة
      let detailedMessage = '⚠️ خطأ في البيانات:\n';

      if (errorMessages.workDays) {
        detailedMessage += '• عدد الأيام: ' + errorMessages.workDays[0] + '\n';
      }
      if (errorMessages.paidAmount) {
        detailedMessage += '• المبلغ المدفوع: ' + errorMessages.paidAmount[0] + '\n';
      }
      if (errorMessages.date) {
        detailedMessage += '• التاريخ: ' + errorMessages.date[0] + '\n';
      }
      if (errorMessages.project_id) {
        detailedMessage += '• المشروع: يجب اختيار مشروع محدد\n';
      }
      if (errorMessages.worker_id) {
        detailedMessage += '• العامل: يجب اختيار عامل\n';
      }

      const firstError = detailedMessage || 'بيانات حضور العامل غير صحيحة';

      return res.status(400).json({
        success: false,
        error: 'بيانات حضور العامل غير صحيحة',
        message: firstError,
        details: errorMessages,
        processingTime: duration
      });
    }

    console.log('✅ [API] نجح validation حضور العامل');

    // حساب actualWage و totalPay = dailyWage * workDays وتحويل workDays إلى string
    const attendanceDate = req.body.attendanceDate || req.body.date;
    const workDays = Number(validationResult.data.workDays) || 0;

    // حل الأجر الفعلي حسب المشروع مع الرجوع للأجر الافتراضي للعامل
    const resolvedWage = await resolveEffectiveWageForRoute(
      validationResult.data.worker_id,
      validationResult.data.project_id,
      attendanceDate
    );
    let dailyWage = parseFloat(resolvedWage);
    console.log(`💰 [API] الأجر الفعلي للعامل: ${dailyWage}`);

    const actualWageValue = parseFloat((dailyWage * workDays).toFixed(2));

    const rawPaidAmount = validationResult.data.paidAmount ?? req.body.paid_amount ?? req.body.paidAmount ?? '0';
    const parsedPaid = Number(rawPaidAmount);
    const paidAmount = (rawPaidAmount === '' || rawPaidAmount === null || rawPaidAmount === undefined || !Number.isFinite(parsedPaid))
      ? 0
      : parsedPaid;
    const remainingAmount = Math.max(0, actualWageValue - paidAmount);
    const paymentType = paidAmount >= actualWageValue ? "full" : "partial";
    
    const dataWithCalculatedFields: Record<string, any> = {
      ...validationResult.data,
      dailyWage: dailyWage.toString(),
      date: attendanceDate,
      workDays: workDays.toString(),
      actualWage: actualWageValue.toString(),
      totalPay: actualWageValue.toString(),
      paidAmount: paidAmount.toString(),
      remainingAmount: remainingAmount.toString(),
      paymentType: paymentType,
      notes: req.body.notes || validationResult.data.notes || ""
    };

    if (req.body.well_ids !== undefined) {
      dataWithCalculatedFields.well_ids = req.body.well_ids;
    }
    if (req.body.crew_type !== undefined) {
      dataWithCalculatedFields.crew_type = req.body.crew_type;
    }

    // التحقق من وجود سجل مماثل لمنع التكرار (نفس التاريخ، العامل، المشروع، المبلغ، وأيام العمل)
    const existingAttendance = await db.select()
      .from(workerAttendance)
      .where(and(
        eq(workerAttendance.worker_id, validationResult.data.worker_id),
        eq(workerAttendance.project_id, validationResult.data.project_id),
        sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate}) = ${attendanceDate}`,
        sql`safe_numeric(COALESCE(${workerAttendance.paidAmount}, '0')::text, 0) = safe_numeric(${paidAmount.toString()}::text, 0)`,
        sql`safe_numeric(COALESCE(${workerAttendance.workDays}, '0')::text, 0) = safe_numeric(${workDays.toString()}::text, 0)`
      ))
      .limit(1);

    if (existingAttendance.length > 0) {
      const duration = Date.now() - startTime;
      console.warn('⚠️ [API] محاولة تسجيل حضور مكرر:', validationResult.data);
      return res.status(409).json({
        success: false,
        error: 'سجل مكرر',
        message: 'تم تسجيل هذا الحضور بالفعل (نفس العامل، التاريخ، المشروع، المبلغ، وأيام العمل)',
        processingTime: duration
      });
    }

    const confirmOverpayment = req.body.confirmOverpayment === true;
    let createdAdvanceTransfer: any = null;

    if (paidAmount > actualWageValue && actualWageValue >= 0 && !confirmOverpayment) {
      const excessAmount = paidAmount - actualWageValue;
      const duration = Date.now() - startTime;
      return res.status(422).json({
        success: false,
        error: 'overpayment_detected',
        message: `المبلغ المدفوع (${paidAmount}) يتجاوز الأجر الفعلي (${actualWageValue}). الزيادة: ${excessAmount}`,
        requiresConfirmation: true,
        suggestedAction: {
          type: 'split_to_advance',
          description: `سيتم تسجيل ${actualWageValue} كأجر مدفوع، و ${excessAmount} كسلفة/تحويل تلقائياً`,
          attendancePaidAmount: actualWageValue,
          advanceAmount: excessAmount,
          advanceType: 'advance'
        },
        processingTime: duration
      });
    }

    if (workDays === 0 && paidAmount > 0 && !confirmOverpayment) {
      const duration = Date.now() - startTime;
      return res.status(422).json({
        success: false,
        error: 'zero_days_payment',
        message: `لا يمكن تسجيل مبلغ مدفوع (${paidAmount}) بدون أيام عمل. المبلغ سيُحوّل كسلفة/تحويل`,
        requiresConfirmation: true,
        suggestedAction: {
          type: 'convert_to_advance',
          description: `سيتم تسجيل الحضور بدون مبلغ مدفوع، و ${paidAmount} كسلفة/تحويل تلقائياً`,
          attendancePaidAmount: 0,
          advanceAmount: paidAmount,
          advanceType: 'advance'
        },
        processingTime: duration
      });
    }

    if (confirmOverpayment && paidAmount > actualWageValue) {
      const userWageAmount = req.body.wageAmount !== undefined ? Number(req.body.wageAmount) : (workDays === 0 ? 0 : actualWageValue);
      const userAdvanceAmount = req.body.advanceAmount !== undefined ? Number(req.body.advanceAmount) : (paidAmount - userWageAmount);
      const advanceNotes = req.body.advanceNotes || '';
      const duration0 = Date.now() - startTime;

      if (userWageAmount < 0 || userAdvanceAmount <= 0 || !Number.isFinite(userWageAmount) || !Number.isFinite(userAdvanceAmount)) {
        return res.status(400).json({ success: false, error: 'invalid_split', message: 'مبلغ الأجور يجب ≥ 0 ومبلغ السلفة يجب > 0', processingTime: duration0 });
      }
      if (userWageAmount > actualWageValue) {
        return res.status(400).json({ success: false, error: 'wage_exceeds_actual', message: `مبلغ الأجور (${userWageAmount}) لا يمكن أن يتجاوز الأجر الفعلي (${actualWageValue})`, processingTime: duration0 });
      }
      if (workDays === 0 && userWageAmount !== 0) {
        return res.status(400).json({ success: false, error: 'zero_days_wage', message: 'لا يمكن تسجيل أجور عندما أيام العمل = 0', processingTime: duration0 });
      }
      if (userWageAmount + userAdvanceAmount !== paidAmount) {
        return res.status(400).json({ success: false, error: 'split_mismatch', message: `مجموع الأجور (${userWageAmount}) والسلفة (${userAdvanceAmount}) يجب أن يساوي المبلغ الإجمالي (${paidAmount})`, processingTime: duration0 });
      }

      dataWithCalculatedFields.paidAmount = userWageAmount.toString();
      dataWithCalculatedFields.remainingAmount = Math.max(0, actualWageValue - userWageAmount).toString();
      dataWithCalculatedFields.paymentType = userWageAmount >= actualWageValue && actualWageValue > 0 ? "full" : "partial";
      dataWithCalculatedFields.notes = (dataWithCalculatedFields.notes || '') + (dataWithCalculatedFields.notes ? ' | ' : '') + `تم تحويل ${userAdvanceAmount} كسلفة`;
      createdAdvanceTransfer = {
        worker_id: dataWithCalculatedFields.worker_id,
        project_id: dataWithCalculatedFields.project_id,
        amount: userAdvanceAmount.toString(),
        transferDate: dataWithCalculatedFields.date,
        transfer_method: 'cash',
        recipientName: '',
        notes: advanceNotes || `سلفة — من سجل حضور ${dataWithCalculatedFields.date} (المبلغ الأصلي: ${paidAmount}، الأجور: ${userWageAmount})`,
      };
      console.log(`🔄 [FinancialGuard] تقسيم مخصص: أجور=${userWageAmount}, سلفة=${userAdvanceAmount}`);
    }

    console.log('💾 [API] حفظ حضور العامل في قاعدة البيانات...');
    console.log('📝 [API] البيانات المُدرجة تشمل الملاحظات:', { notes: dataWithCalculatedFields.notes });

    const userId = getAuthUser(req)?.user_id;

    const record = await withTransaction(async (client) => {
      const { rows: [attendanceRow] } = await client.query(
        `INSERT INTO worker_attendance (
          worker_id, project_id, attendance_date, date, start_time, end_time,
          work_description, work_days, daily_wage, actual_wage, total_pay,
          paid_amount, remaining_amount, payment_type, is_present, notes,
          well_id, well_ids, crew_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (worker_id, attendance_date, project_id) DO UPDATE SET
          work_days = EXCLUDED.work_days,
          daily_wage = EXCLUDED.daily_wage,
          actual_wage = EXCLUDED.actual_wage,
          total_pay = EXCLUDED.total_pay,
          paid_amount = EXCLUDED.paid_amount,
          remaining_amount = EXCLUDED.remaining_amount,
          payment_type = EXCLUDED.payment_type,
          notes = EXCLUDED.notes
        RETURNING *`,
        [
          dataWithCalculatedFields.worker_id,
          dataWithCalculatedFields.project_id,
          dataWithCalculatedFields.attendanceDate || dataWithCalculatedFields.date,
          dataWithCalculatedFields.date,
          dataWithCalculatedFields.startTime || null,
          dataWithCalculatedFields.endTime || null,
          dataWithCalculatedFields.workDescription || null,
          dataWithCalculatedFields.workDays,
          dataWithCalculatedFields.dailyWage,
          dataWithCalculatedFields.actualWage,
          dataWithCalculatedFields.totalPay,
          dataWithCalculatedFields.paidAmount,
          dataWithCalculatedFields.remainingAmount,
          dataWithCalculatedFields.paymentType,
          dataWithCalculatedFields.isPresent ?? true,
          dataWithCalculatedFields.notes || '',
          dataWithCalculatedFields.well_id || null,
          dataWithCalculatedFields.well_ids ? (typeof dataWithCalculatedFields.well_ids === 'string' ? dataWithCalculatedFields.well_ids : JSON.stringify(dataWithCalculatedFields.well_ids)) : null,
          dataWithCalculatedFields.crew_type ? (typeof dataWithCalculatedFields.crew_type === 'string' ? dataWithCalculatedFields.crew_type : JSON.stringify(dataWithCalculatedFields.crew_type)) : null,
        ]
      );

      await FinancialLedgerService._createJournalEntryWithClient(client, {
        project_id: attendanceRow.project_id,
        entryDate: attendanceRow.date,
        description: `أجر عامل بقيمة ${parseFloat(attendanceRow.actual_wage || '0')}`,
        sourceTable: 'worker_attendance',
        sourceId: attendanceRow.id,
        createdBy: userId,
        lines: [
          { accountCode: '5100', debitAmount: parseFloat(attendanceRow.actual_wage || '0'), creditAmount: 0, description: 'أجور عمال' },
          { accountCode: '1100', debitAmount: 0, creditAmount: parseFloat(attendanceRow.actual_wage || '0'), description: 'دفع أجر' },
        ]
      });

      return attendanceRow;
    });

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم إنشاء حضور العامل بنجاح في ${duration}ms:`, {
      id: record.id,
      worker_id: record.worker_id,
      date: record.date
    });

    try {
      const postDate = record.date || record.attendance_date || record.attendanceDate;
      if (record.project_id && postDate) {
        await SummaryRebuildService.markInvalid(record.project_id, postDate);
      }
    } catch (e) { console.error('[SummaryRebuild] worker-attendance/POST markInvalid error:', e); }

    syncAttendanceToWellCrews({
      ...record,
      well_ids: req.body.well_ids || record.well_ids,
      crew_type: req.body.crew_type || record.crew_type,
    }).catch(err => console.error('[syncAttendanceToWellCrews] POST error:', err));

    try {
      await FinancialIntegrityService.syncWorkerBalance(record.worker_id, record.project_id);
    } catch (err) { console.error('[FinancialIntegrity] Balance sync error:', err); }

    FinancialIntegrityService.logFinancialChange({
      projectId: record.project_id,
      action: 'create',
      entityType: 'worker_attendance',
      entityId: record.id,
      newData: { daily_wage: record.daily_wage, work_days: record.work_days, actual_wage: record.actual_wage, paid_amount: record.paid_amount },
      userId: getAuthUser(req)?.user_id,
      userEmail: (req as any).user?.email,
      reason: 'تسجيل حضور جديد'
    }).catch(err => console.error('[FinancialIntegrity] Audit log error:', err));

    const balanceWarning = await FinancialIntegrityService.getBalanceWarnings(record.worker_id, record.project_id);

    if (globalThis.io) {
      (globalThis.io as any).to('authenticated').emit('entity:update', {
        type: 'INVALIDATE',
        entity: 'worker-attendance',
        project_id: record.project_id,
        date: record.date
      });
    }

    let advanceTransferRecord: any = null;
    if (createdAdvanceTransfer) {
      const existingAdvance = await pool.query(
        `SELECT id FROM worker_transfers WHERE worker_id = $1 AND project_id = $2 AND transfer_date = $3 
         AND safe_numeric(amount::text, 0) = safe_numeric($4::text, 0) 
         AND notes LIKE '%سلفة%' AND notes LIKE $5 LIMIT 1`,
        [createdAdvanceTransfer.worker_id, createdAdvanceTransfer.project_id, createdAdvanceTransfer.transferDate, 
         createdAdvanceTransfer.amount, `%${paidAmount}%`]
      );
      
      if (existingAdvance.rows.length > 0) {
        console.log(`⚠️ [FinancialGuard] سلفة مكررة - تخطي الإنشاء`);
        advanceTransferRecord = existingAdvance.rows[0];
      } else {
        const transferResult = await pool.query(
          `INSERT INTO worker_transfers (worker_id, project_id, amount, transfer_date, transfer_method, recipient_name, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [
            createdAdvanceTransfer.worker_id, createdAdvanceTransfer.project_id,
            createdAdvanceTransfer.amount, createdAdvanceTransfer.transferDate,
            createdAdvanceTransfer.transfer_method, createdAdvanceTransfer.recipientName || '',
            createdAdvanceTransfer.notes
          ]
        );
        advanceTransferRecord = transferResult.rows[0];

        await FinancialIntegrityService.syncWorkerBalance(createdAdvanceTransfer.worker_id, createdAdvanceTransfer.project_id);
        
        FinancialIntegrityService.logFinancialChange({
          projectId: createdAdvanceTransfer.project_id,
          action: 'create',
          entityType: 'worker_transfer',
          entityId: advanceTransferRecord.id,
          newData: { amount: createdAdvanceTransfer.amount, type: 'advance_auto', source: 'attendance_overpayment', attendance_id: record.id },
          userId: getAuthUser(req)?.user_id,
          userEmail: (req as any).user?.email,
          reason: `سلفة تلقائية من حضور ${record.date} — المبلغ الأصلي: ${paidAmount}، الأجور: ${Number(createdAdvanceTransfer.amount)}`
        }).catch(err => console.error('[FinancialIntegrity] Advance audit log error:', err));
        
        console.log(`✅ [FinancialGuard] تم إنشاء سلفة تلقائية: ${createdAdvanceTransfer.amount} للعامل ${createdAdvanceTransfer.worker_id}`);
      }
    }

    res.status(201).json({
      success: true,
      data: record,
      message: advanceTransferRecord
        ? `تم تسجيل الحضور وتحويل ${createdAdvanceTransfer.amount} كسلفة تلقائياً`
        : `تم تسجيل حضور العامل بتاريخ ${record.date} بنجاح`,
      processingTime: duration,
      ...(balanceWarning.isNegative ? { balanceWarning: balanceWarning.warning } : {}),
      ...(advanceTransferRecord ? {
        advanceTransfer: {
          id: advanceTransferRecord.id,
          amount: createdAdvanceTransfer.amount,
          type: 'advance',
          notes: createdAdvanceTransfer.notes
        }
      } : {})
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في إنشاء حضور العامل:', error);

    // تحليل نوع الخطأ لرسالة أفضل ومفصلة
    let errorMessage = 'فشل في إنشاء حضور العامل';
    let detailedMessage = 'فشل في إنشاء حضور العامل';
    let statusCode = 500;

    if (error.code === '23503') { // foreign key violation
      errorMessage = '⚠️ خطأ في البيانات المرتبطة';
      detailedMessage = 'العامل أو المشروع المحدد غير موجود في النظام. تأكد من:\n• اختيار مشروع موجود\n• اختيار عامل موجود';
      statusCode = 400;
    } else if (error.code === '23502') { // not null violation
      errorMessage = '⚠️ بيانات ناقصة';
      detailedMessage = 'بعض الحقول المطلوبة فارغة:\n' + (error.column ? `• ${error.column} مطلوب` : '• تأكد من ملء جميع الحقول المطلوبة');
      statusCode = 400;
    } else if (error.code === '23505') { // unique violation
      errorMessage = '⚠️ سجل مكرر';
      detailedMessage = 'تم تسجيل حضور هذا العامل مسبقاً لهذا التاريخ.\nاستخدم زر "تعديل" لتحديث السجل الموجود.';
      statusCode = 409;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: detailedMessage,
      processingTime: duration
    });
  }
});

/**
 * 🔄 تحديث حضور عامل موجود
 * PATCH /worker-attendance/:id
 */
workerRouter.patch('/worker-attendance/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const attendanceId = req.params.id;
    console.log('🔄 [API] طلب تحديث حضور العامل من المستخدم:', req.user?.email);
    console.log('📋 [API] ID حضور العامل:', attendanceId);
    console.log('📋 [API] بيانات التحديث المرسلة:', req.body);

    if (!attendanceId) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف حضور العامل مطلوب',
        message: 'لم يتم توفير معرف حضور العامل للتحديث',
        processingTime: duration
      });
    }

    // التحقق من وجود حضور العامل أولاً
    const existingAttendance = await db.select().from(workerAttendance).where(eq(workerAttendance.id, attendanceId)).limit(1);

    if (existingAttendance.length === 0) {
      const duration = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: 'حضور العامل غير موجود',
        message: `لم يتم العثور على حضور عامل بالمعرف: ${attendanceId}`,
        processingTime: duration
      });
    }

    const { allowed: attPatchAllowed } = checkProjectAccess(req, existingAttendance[0].project_id);
    if (!attPatchAllowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لتعديل هذا السجل' });
    }

    const rawBody = pickAllowedFields(req.body as Record<string, unknown>, ALLOWED_ATTENDANCE_PATCH_FIELDS);
    const updateData: Record<string, unknown> = { ...rawBody };

    if (Object.keys(updateData).length === 0) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'لا توجد حقول صالحة للتحديث',
        message: 'لم يتم توفير أي حقول مسموح بتحديثها',
        processingTime: duration
      });
    }

    // تحويل workDays إلى string إذا كان موجوداً لتجاوز خطأ الـ validation
    if (updateData.workDays !== undefined && updateData.workDays !== null) {
      updateData.workDays = String(updateData.workDays);
    }

    // حساب actualWage
    const dailyWage = (updateData.dailyWage || existingAttendance[0].dailyWage) as string;
    const workDays = (updateData.workDays || existingAttendance[0].workDays) as string;

    const confirmOverpaymentPatch = req.body.confirmOverpayment === true;
    let createdAdvanceTransferPatch: any = null;

    const rawPaidPatch = updateData.paidAmount !== undefined ? updateData.paidAmount : existingAttendance[0].paidAmount;
    const parsedPaidPatch = Number(rawPaidPatch);
    const safePaidAmount = (rawPaidPatch === '' || rawPaidPatch === null || rawPaidPatch === undefined || !Number.isFinite(parsedPaidPatch))
      ? 0
      : parsedPaidPatch;

    if (dailyWage && workDays) {
      const actualWageValue = parseFloat((parseFloat(dailyWage) * parseFloat(workDays)).toFixed(2));
      updateData.actualWage = actualWageValue.toString();
      updateData.totalPay = actualWageValue.toString();

      const workDaysNum = parseFloat(workDays);

      if (safePaidAmount > actualWageValue && actualWageValue >= 0 && !confirmOverpaymentPatch) {
        const excessAmount = safePaidAmount - actualWageValue;
        const duration = Date.now() - startTime;
        return res.status(422).json({
          success: false,
          error: 'overpayment_detected',
          message: `المبلغ المدفوع (${safePaidAmount}) يتجاوز الأجر الفعلي (${actualWageValue}). الزيادة: ${excessAmount}`,
          requiresConfirmation: true,
          suggestedAction: {
            type: 'split_to_advance',
            description: `سيتم تسجيل ${actualWageValue} كأجر مدفوع، و ${excessAmount} كسلفة/تحويل تلقائياً`,
            attendancePaidAmount: actualWageValue,
            advanceAmount: excessAmount,
            advanceType: 'advance'
          },
          processingTime: duration
        });
      }

      if (workDaysNum === 0 && safePaidAmount > 0 && !confirmOverpaymentPatch) {
        const duration = Date.now() - startTime;
        return res.status(422).json({
          success: false,
          error: 'zero_days_payment',
          message: `لا يمكن تسجيل مبلغ مدفوع (${safePaidAmount}) بدون أيام عمل. المبلغ سيُحوّل كسلفة/تحويل`,
          requiresConfirmation: true,
          suggestedAction: {
            type: 'convert_to_advance',
            description: `سيتم تسجيل الحضور بدون مبلغ مدفوع، و ${safePaidAmount} كسلفة/تحويل تلقائياً`,
            attendancePaidAmount: 0,
            advanceAmount: safePaidAmount,
            advanceType: 'advance'
          },
          processingTime: duration
        });
      }

      if (confirmOverpaymentPatch && safePaidAmount > actualWageValue) {
        const userWageAmount = req.body.wageAmount !== undefined ? Number(req.body.wageAmount) : (workDaysNum === 0 ? 0 : actualWageValue);
        const userAdvanceAmount = req.body.advanceAmount !== undefined ? Number(req.body.advanceAmount) : (safePaidAmount - userWageAmount);
        const advanceNotes = req.body.advanceNotes || '';
        const durationP = Date.now() - startTime;

        if (userWageAmount < 0 || userAdvanceAmount <= 0 || !Number.isFinite(userWageAmount) || !Number.isFinite(userAdvanceAmount)) {
          return res.status(400).json({ success: false, error: 'invalid_split', message: 'مبلغ الأجور يجب ≥ 0 ومبلغ السلفة يجب > 0', processingTime: durationP });
        }
        if (userWageAmount > actualWageValue) {
          return res.status(400).json({ success: false, error: 'wage_exceeds_actual', message: `مبلغ الأجور (${userWageAmount}) لا يمكن أن يتجاوز الأجر الفعلي (${actualWageValue})`, processingTime: durationP });
        }
        if (workDaysNum === 0 && userWageAmount !== 0) {
          return res.status(400).json({ success: false, error: 'zero_days_wage', message: 'لا يمكن تسجيل أجور عندما أيام العمل = 0', processingTime: durationP });
        }
        if (userWageAmount + userAdvanceAmount !== safePaidAmount) {
          return res.status(400).json({ success: false, error: 'split_mismatch', message: `مجموع الأجور (${userWageAmount}) والسلفة (${userAdvanceAmount}) يجب أن يساوي المبلغ الإجمالي (${safePaidAmount})`, processingTime: durationP });
        }

        updateData.paidAmount = userWageAmount.toString();
        updateData.remainingAmount = Math.max(0, actualWageValue - userWageAmount).toString();
        updateData.paymentType = userWageAmount >= actualWageValue && actualWageValue > 0 ? "full" : "partial";
        updateData.notes = ((updateData.notes || existingAttendance[0].notes || '') + ' | ' + `تم تحويل ${userAdvanceAmount} كسلفة`).trim();
        createdAdvanceTransferPatch = {
          worker_id: existingAttendance[0].worker_id,
          project_id: existingAttendance[0].project_id,
          amount: userAdvanceAmount.toString(),
          transferDate: existingAttendance[0].date,
          transfer_method: 'cash',
          recipientName: '',
          notes: advanceNotes || `سلفة — من تعديل حضور ${existingAttendance[0].date} (المبلغ الأصلي: ${safePaidAmount}، الأجور: ${userWageAmount})`,
        };
        console.log(`🔄 [FinancialGuard-PATCH] تقسيم مخصص: أجور=${userWageAmount}, سلفة=${userAdvanceAmount}`);
      } else {
        updateData.paidAmount = safePaidAmount.toString();
        updateData.remainingAmount = Math.max(0, actualWageValue - safePaidAmount).toString();
        updateData.paymentType = safePaidAmount >= actualWageValue ? "full" : "partial";
      }
    }

    const updated_attendance = await db
      .update(workerAttendance)
      .set(updateData)
      .where(eq(workerAttendance.id, attendanceId))
      .returning();

    const userId = getAuthUser(req)?.user_id;

    await withTransaction(async (client) => {
      const oldEntries = await client.query(
        `SELECT id FROM journal_entries WHERE source_table = $1 AND source_id = $2 AND status = 'posted'`,
        ['worker_attendance', attendanceId]
      );
      for (const entry of oldEntries.rows) {
        await FinancialLedgerService.reverseEntryWithClient(client, entry.id, 'تعديل حضور عامل', userId);
      }

      await FinancialLedgerService._createJournalEntryWithClient(client, {
        project_id: updated_attendance[0].project_id,
        entryDate: updated_attendance[0].date,
        description: `أجر عامل بقيمة ${updated_attendance[0].actualWage || '0'}`,
        sourceTable: 'worker_attendance',
        sourceId: updated_attendance[0].id,
        createdBy: userId,
        lines: [
          { accountCode: '5100', debitAmount: parseFloat(updated_attendance[0].actualWage || '0'), creditAmount: 0, description: 'أجور عمال' },
          { accountCode: '1100', debitAmount: 0, creditAmount: parseFloat(updated_attendance[0].actualWage || '0'), description: 'دفع أجر' },
        ]
      });
    });

    try {
      if (updated_attendance[0].project_id) {
        const oldDate = existingAttendance[0].date || existingAttendance[0].attendance_date || existingAttendance[0].attendanceDate || '';
        const newDate = updated_attendance[0].date || updated_attendance[0].attendance_date || updated_attendance[0].attendanceDate || '';
        const minDate = oldDate && newDate ? (oldDate < newDate ? oldDate : newDate) : (oldDate || newDate);
        if (minDate) await SummaryRebuildService.markInvalid(updated_attendance[0].project_id, minDate);
      }
    } catch (e) { console.error('[SummaryRebuild] worker-attendance/PATCH markInvalid error:', e); }

    if (updated_attendance[0].well_id || updated_attendance[0].well_ids) {
      syncAttendanceToWellCrews({
        ...updated_attendance[0],
        well_ids: req.body.well_ids || updated_attendance[0].well_ids,
        crew_type: req.body.crew_type || updated_attendance[0].crew_type,
      }).catch(err => console.error('[syncAttendanceToWellCrews] PATCH error:', err));
    }

    try {
      await FinancialIntegrityService.syncWorkerBalance(updated_attendance[0].worker_id, updated_attendance[0].project_id);
    } catch (err) { console.error('[FinancialIntegrity] Balance sync error:', err); }

    FinancialIntegrityService.logFinancialChange({
      projectId: updated_attendance[0].project_id,
      action: 'update',
      entityType: 'worker_attendance',
      entityId: updated_attendance[0].id,
      previousData: { daily_wage: existingAttendance[0].dailyWage, work_days: existingAttendance[0].workDays, actual_wage: existingAttendance[0].actualWage, paid_amount: existingAttendance[0].paidAmount },
      newData: { daily_wage: updated_attendance[0].dailyWage, work_days: updated_attendance[0].workDays, actual_wage: updated_attendance[0].actualWage, paid_amount: updated_attendance[0].paidAmount },
      userId: getAuthUser(req)?.user_id,
      userEmail: (req as any).user?.email,
      reason: 'تعديل حضور عامل'
    }).catch(err => console.error('[FinancialIntegrity] Audit log error:', err));

    if (globalThis.io && updated_attendance[0]) {
      (globalThis.io as any).to('authenticated').emit('entity:update', {
        type: 'INVALIDATE',
        entity: 'worker-attendance',
        project_id: updated_attendance[0].project_id,
        date: updated_attendance[0].date
      });
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم تحديث حضور العامل بنجاح في ${duration}ms`);

    let advanceTransferRecordPatch: any = null;
    if (createdAdvanceTransferPatch) {
      const existingAdvancePatch = await pool.query(
        `SELECT id FROM worker_transfers WHERE worker_id = $1 AND project_id = $2 AND transfer_date = $3 
         AND safe_numeric(amount::text, 0) = safe_numeric($4::text, 0) 
         AND notes LIKE '%سلفة%' AND notes LIKE $5 LIMIT 1`,
        [createdAdvanceTransferPatch.worker_id, createdAdvanceTransferPatch.project_id, createdAdvanceTransferPatch.transferDate,
         createdAdvanceTransferPatch.amount, `%${safePaidAmount}%`]
      );
      
      if (existingAdvancePatch.rows.length > 0) {
        console.log(`⚠️ [FinancialGuard-PATCH] سلفة مكررة - تخطي الإنشاء`);
        advanceTransferRecordPatch = existingAdvancePatch.rows[0];
      } else {
        const transferResult = await pool.query(
          `INSERT INTO worker_transfers (worker_id, project_id, amount, transfer_date, transfer_method, recipient_name, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [
            createdAdvanceTransferPatch.worker_id, createdAdvanceTransferPatch.project_id,
            createdAdvanceTransferPatch.amount, createdAdvanceTransferPatch.transferDate,
            createdAdvanceTransferPatch.transfer_method, createdAdvanceTransferPatch.recipientName || '',
            createdAdvanceTransferPatch.notes
          ]
        );
        advanceTransferRecordPatch = transferResult.rows[0];

        await FinancialIntegrityService.syncWorkerBalance(createdAdvanceTransferPatch.worker_id, createdAdvanceTransferPatch.project_id);
        
        FinancialIntegrityService.logFinancialChange({
          projectId: createdAdvanceTransferPatch.project_id,
          action: 'create',
          entityType: 'worker_transfer',
          entityId: advanceTransferRecordPatch.id,
          newData: { amount: createdAdvanceTransferPatch.amount, type: 'advance_auto', source: 'attendance_overpayment_patch', attendance_id: attendanceId },
          userId: getAuthUser(req)?.user_id,
          userEmail: (req as any).user?.email,
          reason: `سلفة تلقائية من تعديل حضور ${updated_attendance[0].date} — المبلغ الأصلي: ${safePaidAmount}، الأجور: ${Number(updateData.paidAmount)}`
        }).catch(err => console.error('[FinancialIntegrity] Advance audit log error:', err));

        console.log(`✅ [FinancialGuard-PATCH] تم إنشاء سلفة تلقائية: ${createdAdvanceTransferPatch.amount}`);
      }
    }

    const balanceWarning = await FinancialIntegrityService.getBalanceWarnings(updated_attendance[0].worker_id, updated_attendance[0].project_id);

    res.json({
      success: true,
      data: updated_attendance[0],
      message: advanceTransferRecordPatch
        ? `تم تحديث الحضور وتحويل ${createdAdvanceTransferPatch.amount} كسلفة تلقائياً`
        : `تم تحديث حضور العامل بتاريخ ${updated_attendance[0].date} بنجاح`,
      processingTime: duration,
      ...(balanceWarning.isNegative ? { balanceWarning: balanceWarning.warning } : {}),
      ...(advanceTransferRecordPatch ? {
        advanceTransfer: {
          id: advanceTransferRecordPatch.id,
          amount: createdAdvanceTransferPatch.amount,
          type: 'advance',
          notes: createdAdvanceTransferPatch.notes
        }
      } : {})
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في تحديث حضور العامل:', error);

    let errorMessage = 'فشل في تحديث حضور العامل';
    let statusCode = 500;

    if (error.code === '23503') { // foreign key violation
      errorMessage = 'العامل أو المشروع المحدد غير موجود';
      statusCode = 400;
    } else if (error.code === '23502') { // not null violation
      errorMessage = 'بيانات حضور العامل ناقصة';
      statusCode = 400;
    } else if (error.code === '23505') { // unique violation
      errorMessage = 'تم تسجيل حضور هذا العامل مسبقاً لهذا التاريخ';
      statusCode = 409;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      data: null,
      processingTime: duration
    });
  }
});

// ===========================================
// Worker Misc Expenses Routes (المصاريف المتنوعة للعمال)
// ===========================================

/**
 * 📊 جلب المصاريف المتنوعة للعمال لمشروع محدد
 * GET /projects/:project_id/worker-misc-expenses
 */
workerRouter.get('/projects/:project_id/worker-misc-expenses', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const {project_id} = req.params;

    console.log(`📊 [API] جلب المصاريف المتنوعة للعمال للمشروع: ${project_id}`);

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'معرف المشروع مطلوب',
        processingTime: Date.now() - startTime
      });
    }

    const { allowed: miscProjAllowed } = checkProjectAccess(req, project_id);
    if (!miscProjAllowed) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
    }

    const expenses = await db.select()
      .from(workerMiscExpenses)
      .where(eq(workerMiscExpenses.project_id, project_id))
      .orderBy(workerMiscExpenses.date);

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب ${expenses.length} مصروف متنوع في ${duration}ms`);

    res.json({
      success: true,
      data: expenses,
      message: `تم جلب ${expenses.length} مصروف متنوع للمشروع`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب المصاريف المتنوعة:', error);
    res.status(500).json({
      success: false,
      data: [],
      message: 'حدث خطأ داخلي',

      processingTime: duration
    });
  }
});

/**
 * 📊 جلب إحصائيات العامل
 * GET /api/workers/:id/stats
 * Query params:
 *   - project_id: فلترة بمشروع محدد (اختياري)
 *   - 'all' أو عدم التحديد = جميع المشاريع
 */
workerRouter.get('/workers/:id/stats', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const worker_id = req.params.id;
    const project_id = req.query.project_id as string | undefined;
    const isAllProjects = !project_id || project_id === 'all';

    console.log('📊 [API] جلب إحصائيات العامل:', worker_id);
    console.log('📊 [API] فلترة بمشروع:', project_id || 'جميع المشاريع');

    if (!worker_id) {
      const duration = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        error: 'معرف العامل مطلوب',
        message: 'لم يتم توفير معرف العامل',
        processingTime: duration
      });
    }

    // التحقق من وجود العامل أولاً
    const worker = await db.select().from(workers).where(eq(workers.id, worker_id)).limit(1);

    if (worker.length === 0) {
      const duration = Date.now() - startTime;
      return res.status(404).json({
        success: false,
        error: 'العامل غير موجود',
        message: `لم يتم العثور على عامل بالمعرف: ${worker_id}`,
        processingTime: duration
      });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    if (!isAdminUser && worker[0].created_by !== accessReq.user?.user_id) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا العامل' });
    }

    if (!isAllProjects) {
      const { allowed: statsProjAllowed } = checkProjectAccess(req, project_id!);
      if (!statsProjAllowed) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول لهذا المشروع' });
      }
    }

    // بناء شرط الفلترة بالمشروع
    const attendanceWhereCondition = isAllProjects 
      ? eq(workerAttendance.worker_id, worker_id)
      : and(eq(workerAttendance.worker_id, worker_id), eq(workerAttendance.project_id, project_id));

    const transfersWhereCondition = isAllProjects
      ? and(eq(workerTransfers.worker_id, worker_id), sql`(${workerTransfers.transferMethod} IS NULL OR ${workerTransfers.transferMethod} != 'settlement')`)
      : and(eq(workerTransfers.worker_id, worker_id), eq(workerTransfers.project_id, project_id), sql`(${workerTransfers.transferMethod} IS NULL OR ${workerTransfers.transferMethod} != 'settlement')`);

    // حساب إجمالي عدد أيام العمل من جدول workerAttendance
    const totalWorkDaysResult = await db.select({
      totalDays: sql`COALESCE(SUM(safe_numeric(COALESCE(${workerAttendance.workDays}, '0')::text, 0)), 0)`
    })
    .from(workerAttendance)
    .where(attendanceWhereCondition);

    const totalWorkDays = Number(totalWorkDaysResult[0]?.totalDays) || 0;
    console.log(`📊 [API] إجمالي أيام العمل للعامل ${worker_id}${!isAllProjects ? ` في المشروع ${project_id}` : ''}: ${totalWorkDays}`);

    // جلب تاريخ آخر حضور للعامل
    const lastAttendanceResult = await db.select({
      lastAttendanceDate: workerAttendance.attendanceDate,
      project_id: workerAttendance.project_id
    })
    .from(workerAttendance)
    .where(attendanceWhereCondition)
    .orderBy(sql`${workerAttendance.attendanceDate} DESC`)
    .limit(1);

    const lastAttendanceDate = lastAttendanceResult[0]?.lastAttendanceDate || null;

    // حساب معدل الحضور الشهري (عدد أيام الحضور في آخر 30 يوماً)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoString = thirtyDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD format

    // حساب معدل الحضور الشهري
    const monthlyAttendanceCondition = isAllProjects
      ? and(eq(workerAttendance.worker_id, worker_id), sql`${workerAttendance.attendanceDate} >= ${thirtyDaysAgoString}`)
      : and(eq(workerAttendance.worker_id, worker_id), eq(workerAttendance.project_id, project_id), sql`${workerAttendance.attendanceDate} >= ${thirtyDaysAgoString}`);

    const monthlyAttendanceResult = await db.select({
      monthlyDays: sql`COALESCE(SUM(safe_numeric(COALESCE(${workerAttendance.workDays}, '0')::text, 0)), 0)`
    })
    .from(workerAttendance)
    .where(monthlyAttendanceCondition);

    const monthlyAttendanceRate = Number(monthlyAttendanceResult[0]?.monthlyDays) || 0;
    console.log(`📊 [API] أيام العمل في آخر 30 يوم: ${monthlyAttendanceRate}`);

    // حساب إجمالي التحويلات المالية من جدول workerTransfers
    const totalTransfersResult = await db.select({
      totalTransfers: sql`COALESCE(SUM(${NUM(workerTransfers.amount)}), 0)`,
      transfersCount: sql`COUNT(*)`
    })
    .from(workerTransfers)
    .where(transfersWhereCondition);

    const totalTransfersOnly = Number(totalTransfersResult[0]?.totalTransfers) || 0;
    const transfersCount = Number(totalTransfersResult[0]?.transfersCount) || 0;

    // حساب إجمالي الأجور المدفوعة من جدول workerAttendance (paidAmount)
    const totalPaidWagesResult = await db.select({
      totalPaidWages: sql`COALESCE(SUM(safe_numeric(COALESCE(${workerAttendance.paidAmount}, '0')::text, 0)), 0)`
    })
    .from(workerAttendance)
    .where(attendanceWhereCondition);

    const totalPaidWages = Number(totalPaidWagesResult[0]?.totalPaidWages) || 0;
    console.log(`💰 [API] إجمالي الأجور المدفوعة (paidAmount) للعامل ${worker_id}: ${totalPaidWages}`);

    // إجمالي السحبيات = التحويلات + الأجور المدفوعة
    const totalTransfers = totalTransfersOnly + totalPaidWages;
    console.log(`💰 [API] إجمالي السحبيات (تحويلات ${totalTransfersOnly} + أجور ${totalPaidWages}): ${totalTransfers}`);

    // حساب عدد المشاريع التي عمل بها العامل وأسمائها
    const projectsWorkedResult = await db.select({
      projectsCount: sql`COUNT(DISTINCT ${workerAttendance.project_id})`
    })
    .from(workerAttendance)
    .where(attendanceWhereCondition);

    const projectsWorked = isAllProjects ? (Number(projectsWorkedResult[0]?.projectsCount) || 0) : (totalWorkDays > 0 ? 1 : 0);

    const projectNamesResult = await pool.query(
      `SELECT DISTINCT p.id, p.name
       FROM worker_attendance wa
       JOIN projects p ON p.id = wa.project_id
       WHERE wa.worker_id = $1
       ORDER BY p.name`,
      [worker_id]
    );
    const workerProjectNames = projectNamesResult.rows.map((r: any) => ({ id: r.id, name: r.name }));

    const totalEarningsResult = await db.select({
      totalEarnings: sql`COALESCE(SUM(
        CASE WHEN ${workerAttendance.actualWage} IS NOT NULL AND ${workerAttendance.actualWage}::text != '' AND ${workerAttendance.actualWage}::text != 'NaN' THEN ${NUM(workerAttendance.actualWage)} ELSE ${NUM(workerAttendance.dailyWage)} * ${NUM(workerAttendance.workDays)} END
      ), 0)`
    })
    .from(workerAttendance)
    .where(attendanceWhereCondition);

    const totalEarnings = Number(totalEarningsResult[0]?.totalEarnings) || 0;

    const settlementTransfersCondition = isAllProjects
      ? and(eq(workerTransfers.worker_id, worker_id), sql`${workerTransfers.transferMethod} = 'settlement'`)
      : and(eq(workerTransfers.worker_id, worker_id), eq(workerTransfers.project_id, project_id), sql`${workerTransfers.transferMethod} = 'settlement'`);

    const settlementTransfersResult = await db.select({
      totalSettled: sql`COALESCE(SUM(${NUM(workerTransfers.amount)}), 0)`
    })
    .from(workerTransfers)
    .where(settlementTransfersCondition);

    const totalSettled = Number(settlementTransfersResult[0]?.totalSettled) || 0;

    const projectsCount = workerProjectNames.length;

    const stats = {
      totalWorkDays: totalWorkDays,
      lastAttendanceDate: lastAttendanceDate,
      monthlyAttendanceRate: monthlyAttendanceRate,
      totalTransfers: totalTransfers,
      totalSettled: totalSettled,
      transfersCount: transfersCount,
      projectsWorked: projectsWorked,
      projectNames: workerProjectNames,
      projectsCount: projectsCount,
      isMultiProject: projectsCount > 1,
      totalEarnings: totalEarnings,
      project_id: isAllProjects ? null : project_id,
      isFilteredByProject: !isAllProjects,
      workerInfo: {
        id: worker[0].id,
        name: worker[0].name,
        type: worker[0].type,
        dailyWage: worker[0].dailyWage
      }
    };

    const duration = Date.now() - startTime;
    console.log(`✅ [API] تم جلب إحصائيات العامل "${worker[0].name}" بنجاح في ${duration}ms`);
    console.log('📊 [API] إحصائيات العامل:', {
      totalWorkDays,
      lastAttendanceDate,
      monthlyAttendanceRate,
      totalTransfers,
      projectsWorked,
      filteredByProject: !isAllProjects ? project_id : 'جميع المشاريع'
    });

    res.json({
      success: true,
      data: stats,
      message: `تم جلب إحصائيات العامل "${worker[0].name}"${!isAllProjects ? ` للمشروع المحدد` : ''} بنجاح`,
      processingTime: duration
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] خطأ في جلب إحصائيات العامل:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات العامل',
      data: null,
      processingTime: duration
    });
  }
});

/**
 * 💰 جلب جميع أجور المشاريع لعامل محدد
 * GET /workers/:id/project-wages
 */
workerRouter.get('/workers/:id/project-wages', async (req: Request, res: Response) => {
  try {
    const workerId = req.params.id;

    const workerRows = await db.select().from(workers).where(eq(workers.id, workerId)).limit(1);
    if (workerRows.length === 0) {
      return res.status(404).json({ success: false, message: 'العامل غير موجود' });
    }

    const wages = await db.select().from(workerProjectWages)
      .where(eq(workerProjectWages.worker_id, workerId))
      .orderBy(desc(workerProjectWages.effectiveFrom));

    res.json({
      success: true,
      data: wages,
      message: `تم جلب ${wages.length} سجل أجر للعامل "${workerRows[0].name}"`
    });
  } catch (error: any) {
    console.error('❌ خطأ في جلب أجور المشاريع للعامل:', error);
    res.status(500).json({
      success: false,
      data: [],
      message: 'فشل في جلب أجور المشاريع للعامل'
    });
  }
});

workerRouter.get('/financial-integrity/reconciliation', async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const projectId = req.query.project_id as string | undefined;
    const result = await FinancialIntegrityService.runReconciliation(projectId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[Reconciliation] Error:', error);
    res.status(500).json({ success: false, message: 'فشل في تنفيذ المراجعة' });
  }
});

workerRouter.post('/financial-integrity/rebuild-balances', async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    await FinancialIntegrityService.logFinancialChange({
      projectId: null,
      action: 'rebuild_all_balances',
      entityType: 'system',
      entityId: 'manual_trigger',
      userId: getAuthUser(req)?.user_id,
      userEmail: (req as any).user?.email,
      reason: 'إعادة بناء يدوية لجميع أرصدة العمال'
    });

    const result = await FinancialIntegrityService.rebuildAllBalances();
    res.json({ success: true, data: result, message: `تم إعادة بناء ${result.rebuilt} رصيد عامل` });
  } catch (error: any) {
    console.error('[RebuildBalances] Error:', error);
    res.status(500).json({ success: false, message: 'فشل في إعادة بناء الأرصدة' });
  }
});

workerRouter.get('/financial-integrity/audit-log', async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const entityType = req.query.entity_type as string;
    const action = req.query.action as string;

    let query = `SELECT * FROM financial_audit_log WHERE 1=1`;
    const params: any[] = [];

    if (entityType) {
      params.push(entityType);
      query += ` AND entity_type = $${params.length}`;
    }
    if (action) {
      params.push(action);
      query += ` AND action = $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY created_at DESC LIMIT $${params.length}`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows, total: result.rows.length });
  } catch (error: any) {
    console.error('[AuditLog] Error:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب سجل التدقيق' });
  }
});

console.log('👷 [WorkerRouter] تم تهيئة مسارات إدارة العمال');

export default workerRouter;