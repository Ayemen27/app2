import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { pool } from '../../db.js';
import { SummaryRebuildService } from '../../services/SummaryRebuildService.js';

const dailySummariesRouter = Router();
dailySummariesRouter.use(requireAuth);

/**
 * GET /api/daily-summaries
 * جلب قائمة الملخصات اليومية مع إمكانية الفلترة بالمشروع
 */
dailySummariesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;

    let query: string;
    let params: string[];

    if (projectId && projectId !== 'all') {
      query = `
        SELECT
          des.id,
          des.project_id,
          p.name as project_name,
          des.date,
          des.carried_forward_amount,
          des.total_fund_transfers,
          des.total_worker_wages,
          des.total_material_costs,
          des.total_transportation_costs,
          des.total_worker_transfers,
          des.total_worker_misc_expenses,
          des.total_income,
          des.total_expenses,
          des.remaining_balance,
          des.created_at,
          des.updated_at
        FROM daily_expense_summaries des
        LEFT JOIN projects p ON p.id = des.project_id
        WHERE des.project_id = $1
        ORDER BY des.date DESC
        LIMIT 500
      `;
      params = [String(projectId)];
    } else {
      query = `
        SELECT
          des.id,
          des.project_id,
          p.name as project_name,
          des.date,
          des.carried_forward_amount,
          des.total_fund_transfers,
          des.total_worker_wages,
          des.total_material_costs,
          des.total_transportation_costs,
          des.total_worker_transfers,
          des.total_worker_misc_expenses,
          des.total_income,
          des.total_expenses,
          des.remaining_balance,
          des.created_at,
          des.updated_at
        FROM daily_expense_summaries des
        LEFT JOIN projects p ON p.id = des.project_id
        ORDER BY des.date DESC, p.name ASC
        LIMIT 1000
      `;
      params = [];
    }

    const result = await pool.query(query, params);

    const statsQuery = projectId && projectId !== 'all'
      ? `SELECT COUNT(*) as total FROM daily_expense_summaries WHERE project_id = $1`
      : `SELECT COUNT(*) as total FROM daily_expense_summaries`;
    const statsParams = projectId && projectId !== 'all' ? [String(projectId)] : [];
    const statsResult = await pool.query(statsQuery, statsParams);

    res.json({
      success: true,
      data: result.rows,
      total: Number(statsResult.rows[0]?.total || 0),
    });
  } catch (error: any) {
    console.error('❌ [DailySummaries] خطأ في جلب الملخصات:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب الملخصات اليومية' });
  }
});

/**
 * DELETE /api/daily-summaries
 * حذف الملخصات اليومية (لمشروع محدد أو جميع المشاريع)
 */
dailySummariesRouter.delete('/', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;

    let deletedCount = 0;

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

      console.log(`🗑️ [DailySummaries] تم حذف ${deletedCount} ملخص للمشروع ${projectId}`);
    } else {
      const result = await pool.query(`DELETE FROM daily_expense_summaries`);
      deletedCount = result.rowCount || 0;

      await pool.query(`DELETE FROM summary_invalidations`);

      console.log(`🗑️ [DailySummaries] تم حذف ${deletedCount} ملخص لجميع المشاريع`);
    }

    res.json({
      success: true,
      message: `تم حذف ${deletedCount} ملخص يومي بنجاح`,
      deletedCount,
    });
  } catch (error: any) {
    console.error('❌ [DailySummaries] خطأ في حذف الملخصات:', error);
    res.status(500).json({ success: false, message: 'فشل في حذف الملخصات اليومية' });
  }
});

/**
 * POST /api/daily-summaries/rebuild
 * إعادة بناء الملخصات اليومية (لمشروع محدد أو جميع المشاريع)
 */
dailySummariesRouter.post('/rebuild', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;

    if (projectId && projectId !== 'all') {
      console.log(`🔄 [DailySummaries] إعادة بناء ملخصات المشروع: ${projectId}`);
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
