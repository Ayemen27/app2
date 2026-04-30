import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { pool } from '../../db.js';
import { SummaryRebuildService } from '../../services/SummaryRebuildService.js';

const dailySummariesRouter = Router();
dailySummariesRouter.use(requireAuth);

// مدد التجميد الافتراضية (بالدقائق)
const FREEZE_DURATIONS = {
  short: 5,        // حذف عادي: 5 دقائق
  medium: 60,      // حذف موسع: ساعة
  permanent: 525600, // حذف نهائي: سنة كاملة
} as const;

/**
 * تطبيق Freeze لمشروع محدد لمنع إعادة البناء التلقائي
 */
async function applyFreeze(
  projectId: string,
  durationMinutes: number,
  reason: string,
  userId?: string
): Promise<void> {
  await pool.query(
    `INSERT INTO summary_rebuild_freeze (project_id, frozen_until, reason, frozen_by, created_at)
     VALUES ($1, NOW() + ($2 || ' minutes')::interval, $3, $4, NOW())
     ON CONFLICT (project_id) DO UPDATE
       SET frozen_until = EXCLUDED.frozen_until,
           reason = EXCLUDED.reason,
           frozen_by = EXCLUDED.frozen_by,
           created_at = NOW()`,
    [projectId, String(durationMinutes), reason, userId || null]
  );
}

/**
 * GET /api/daily-summaries
 * جلب الملخصات اليومية مع pagination حقيقي + فلترة بالتاريخ
 * Query params:
 *   - projectId: 'all' أو ID مشروع
 *   - dateFrom, dateTo: YYYY-MM-DD (اختياري)
 *   - limit: عدد السجلات (افتراضي 50، أقصى 500)
 *   - offset: للتنقل (افتراضي 0)
 *   - month: YYYY-MM (اختياري - يستبدل dateFrom/dateTo)
 */
dailySummariesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { projectId, dateFrom, dateTo, month } = req.query;
    const limit = Math.min(Number(req.query.limit) || 50, 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const where: string[] = [];
    const params: any[] = [];
    let p = 1;

    if (projectId && projectId !== 'all') {
      where.push(`des.project_id = $${p++}`);
      params.push(String(projectId));
    }

    // فلترة بالشهر (له أولوية على dateFrom/dateTo)
    if (month && typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)) {
      where.push(`des.date LIKE $${p++}`);
      params.push(`${month}-%`);
    } else {
      if (dateFrom && typeof dateFrom === 'string' && dateFrom.trim() !== '') {
        where.push(`des.date >= $${p++}`);
        params.push(dateFrom);
      }
      if (dateTo && typeof dateTo === 'string' && dateTo.trim() !== '') {
        where.push(`des.date <= $${p++}`);
        params.push(dateTo);
      }
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const dataQuery = `
      SELECT
        des.id, des.project_id, p.name as project_name, des.date,
        des.carried_forward_amount, des.total_fund_transfers, des.total_worker_wages,
        des.total_material_costs, des.total_transportation_costs,
        des.total_worker_transfers, des.total_worker_misc_expenses,
        des.total_income, des.total_expenses, des.remaining_balance,
        des.created_at, des.updated_at
      FROM daily_expense_summaries des
      LEFT JOIN projects p ON p.id = des.project_id
      ${whereClause}
      ORDER BY des.date DESC, p.name ASC
      LIMIT $${p++} OFFSET $${p++}
    `;
    params.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) as total FROM daily_expense_summaries des ${whereClause}
    `;
    const countParams = params.slice(0, params.length - 2);

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, params),
      pool.query(countQuery, countParams),
    ]);

    const total = Number(countResult.rows[0]?.total || 0);

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + dataResult.rows.length < total,
      },
      total, // للتوافق العكسي
    });
  } catch (error: any) {
    console.error('❌ [DailySummaries] خطأ في جلب الملخصات:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب الملخصات اليومية' });
  }
});

/**
 * GET /api/daily-summaries/months
 * إرجاع قائمة الأشهر التي بها ملخصات + عدد الملخصات لكل شهر
 */
dailySummariesRouter.get('/months', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    let query = `
      SELECT
        SUBSTRING(date, 1, 7) as month,
        COUNT(*) as count
      FROM daily_expense_summaries
    `;
    const params: any[] = [];
    if (projectId && projectId !== 'all') {
      query += ` WHERE project_id = $1`;
      params.push(String(projectId));
    }
    query += ` GROUP BY SUBSTRING(date, 1, 7) ORDER BY month DESC`;

    const result = await pool.query(query, params);
    res.json({
      success: true,
      data: result.rows.map((r: any) => ({
        month: r.month,
        count: Number(r.count),
      })),
    });
  } catch (error: any) {
    console.error('❌ [DailySummaries] خطأ في جلب الأشهر:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب قائمة الأشهر' });
  }
});

/**
 * DELETE /api/daily-summaries
 * حذف الملخصات + تطبيق freeze لمنع إعادة البناء التلقائي
 * Query params:
 *   - projectId: 'all' أو ID
 *   - permanent: 'true' للحذف النهائي (freeze لسنة)
 *   - freezeMinutes: مدة التجميد المخصصة بالدقائق (اختياري)
 */
dailySummariesRouter.delete('/', async (req: Request, res: Response) => {
  try {
    const { projectId, permanent } = req.query;
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const customFreezeMinutes = Number(req.query.freezeMinutes);

    let freezeMinutes: number;
    let reason: string;
    if (permanent === 'true') {
      freezeMinutes = FREEZE_DURATIONS.permanent;
      reason = 'حذف نهائي يدوي بواسطة المستخدم';
    } else if (Number.isFinite(customFreezeMinutes) && customFreezeMinutes > 0) {
      freezeMinutes = Math.min(customFreezeMinutes, FREEZE_DURATIONS.permanent);
      reason = `حذف يدوي بفترة تجميد مخصصة (${freezeMinutes} دقيقة)`;
    } else {
      freezeMinutes = FREEZE_DURATIONS.short;
      reason = 'حذف يدوي بواسطة المستخدم';
    }

    let deletedCount = 0;
    const frozenProjects: string[] = [];

    if (projectId && projectId !== 'all') {
      const result = await pool.query(
        `DELETE FROM daily_expense_summaries WHERE project_id = $1`,
        [String(projectId)]
      );
      deletedCount = result.rowCount || 0;
      await pool.query(
        `DELETE FROM summary_invalidations WHERE project_id = $1`,
        [String(projectId)]
      );
      await applyFreeze(String(projectId), freezeMinutes, reason, userId);
      frozenProjects.push(String(projectId));
      console.log(`🗑️ [DailySummaries] حذف ${deletedCount} ملخص + freeze ${freezeMinutes}د للمشروع ${String(projectId).substring(0, 8)}`);
    } else {
      const result = await pool.query(`DELETE FROM daily_expense_summaries`);
      deletedCount = result.rowCount || 0;
      await pool.query(`DELETE FROM summary_invalidations`);

      // تجميد كل المشاريع
      const projectsRes = await pool.query(`SELECT id FROM projects`);
      for (const row of projectsRes.rows) {
        await applyFreeze(String(row.id), freezeMinutes, reason, userId);
        frozenProjects.push(String(row.id));
      }
      console.log(`🗑️ [DailySummaries] حذف ${deletedCount} ملخص لكل المشاريع + freeze ${freezeMinutes}د لـ ${frozenProjects.length} مشروع`);
    }

    res.json({
      success: true,
      message: `تم حذف ${deletedCount} ملخص يومي بنجاح${permanent === 'true' ? ' (حذف نهائي)' : ''}`,
      deletedCount,
      freezeMinutes,
      frozenProjects: frozenProjects.length,
      reason,
    });
  } catch (error: any) {
    console.error('❌ [DailySummaries] خطأ في حذف الملخصات:', error);
    res.status(500).json({ success: false, message: 'فشل في حذف الملخصات اليومية' });
  }
});

/**
 * DELETE /api/daily-summaries/:id
 * حذف ملخص واحد + freeze قصير للمشروع
 */
dailySummariesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const result = await pool.query(
      `DELETE FROM daily_expense_summaries WHERE id = $1 RETURNING id, project_id`,
      [id]
    );
    if ((result.rowCount || 0) === 0) {
      return res.status(404).json({ success: false, message: 'الملخص غير موجود' });
    }
    const pid = result.rows[0].project_id;
    if (pid) {
      await applyFreeze(String(pid), FREEZE_DURATIONS.short, 'حذف ملخص فردي', userId);
    }
    console.log(`🗑️ [DailySummaries] حذف الملخص ${id} + freeze قصير`);
    res.json({ success: true, message: 'تم حذف الملخص بنجاح' });
  } catch (error: any) {
    console.error('❌ [DailySummaries] خطأ في حذف الملخص:', error);
    res.status(500).json({ success: false, message: 'فشل في حذف الملخص' });
  }
});

/**
 * GET /api/daily-summaries/freeze
 * جلب حالة التجميد الحالية لكل المشاريع
 */
dailySummariesRouter.get('/freeze', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT srf.project_id, p.name as project_name,
             srf.frozen_until, srf.reason, srf.frozen_by, srf.created_at
      FROM summary_rebuild_freeze srf
      LEFT JOIN projects p ON p.id = srf.project_id
      WHERE srf.frozen_until > NOW()
      ORDER BY srf.frozen_until DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('❌ [DailySummaries] خطأ في جلب التجميدات:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب التجميدات' });
  }
});

/**
 * DELETE /api/daily-summaries/freeze/:projectId
 * رفع التجميد يدويًا (طلب صريح من المستخدم)
 */
dailySummariesRouter.delete('/freeze/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query(
      `DELETE FROM summary_rebuild_freeze WHERE project_id = $1 RETURNING project_id`,
      [projectId]
    );
    console.log(`🔓 [DailySummaries] رفع التجميد عن المشروع ${projectId.substring(0, 8)}`);
    res.json({
      success: true,
      message: result.rowCount && result.rowCount > 0
        ? 'تم رفع التجميد بنجاح'
        : 'لم يكن هناك تجميد نشط لهذا المشروع',
    });
  } catch (error: any) {
    console.error('❌ [DailySummaries] خطأ في رفع التجميد:', error);
    res.status(500).json({ success: false, message: 'فشل في رفع التجميد' });
  }
});

/**
 * POST /api/daily-summaries/rebuild
 * إعادة بناء صريحة - ترفع الـ freeze تلقائياً
 */
dailySummariesRouter.post('/rebuild', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;

    if (projectId && projectId !== 'all') {
      // رفع التجميد قبل إعادة البناء (طلب صريح)
      await pool.query(
        `DELETE FROM summary_rebuild_freeze WHERE project_id = $1`,
        [String(projectId)]
      );
      console.log(`🔄 [DailySummaries] إعادة بناء ملخصات المشروع: ${String(projectId).substring(0, 8)} (تم رفع التجميد)`);
      await SummaryRebuildService.rebuildProjectSummaries(String(projectId));

      const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM daily_expense_summaries WHERE project_id = $1`,
        [String(projectId)]
      );

      res.json({
        success: true,
        message: `تم إعادة بناء الملخصات بنجاح`,
        rebuiltCount: Number(countResult.rows[0]?.total || 0),
      });
    } else {
      console.log(`🔄 [DailySummaries] إعادة بناء ملخصات جميع المشاريع...`);

      // رفع كل التجميدات
      await pool.query(`DELETE FROM summary_rebuild_freeze`);

      const projectsResult = await pool.query(
        `SELECT id FROM projects WHERE deleted_at IS NULL OR deleted_at = '' ORDER BY id`
      );

      const projects = projectsResult.rows;
      let totalRebuilt = 0;
      const errors: string[] = [];

      for (const project of projects) {
        try {
          await SummaryRebuildService.rebuildProjectSummaries(String(project.id));
          const countResult = await pool.query(
            `SELECT COUNT(*) as total FROM daily_expense_summaries WHERE project_id = $1`,
            [String(project.id)]
          );
          totalRebuilt += Number(countResult.rows[0]?.total || 0);
        } catch (err: any) {
          errors.push(`مشروع ${project.id}: ${err.message}`);
          console.error(`❌ [DailySummaries] خطأ في إعادة بناء مشروع ${project.id}:`, err);
        }
      }

      res.json({
        success: true,
        message: `تم إعادة بناء ${totalRebuilt} ملخص لـ ${projects.length} مشروع`,
        rebuiltCount: totalRebuilt,
        projectsProcessed: projects.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    }
  } catch (error: any) {
    console.error('❌ [DailySummaries] خطأ في إعادة بناء الملخصات:', error);
    res.status(500).json({ success: false, message: 'فشل في إعادة بناء الملخصات اليومية' });
  }
});

export default dailySummariesRouter;
