/**
 * Per-user Report Header Settings routes.
 * SECURITY: user_id is ALWAYS taken from the authenticated session (req.user),
 * never from the request body. This prevents one user from reading or writing
 * another user's branding/header data.
 */
import express, { Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth.js';
import { storage } from '../../storage.js';
import { DEFAULT_REPORT_HEADER } from '../../services/reports/templates/header-context.js';

const HEX_COLOR = /^#([0-9A-Fa-f]{6})$/;

const upsertSchema = z.object({
  company_name: z.string().min(1).max(200),
  company_name_en: z.string().max(200).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email().max(150).nullable().optional().or(z.literal('').transform(() => null)),
  website: z.string().max(200).nullable().optional(),
  logo_url: z.string().max(2_000_000).nullable().optional(),
  footer_text: z.string().max(500).nullable().optional(),
  primary_color: z.string().regex(HEX_COLOR).optional(),
  secondary_color: z.string().regex(HEX_COLOR).optional(),
  accent_color: z.string().regex(HEX_COLOR).optional(),
}).strict();

const router = express.Router();

router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) return res.status(401).json({ success: false, message: 'غير مصرح' });

    const row = await storage.getReportHeader(userId);
    if (!row) {
      return res.json({ success: true, header: { ...DEFAULT_REPORT_HEADER, user_id: userId }, isDefault: true });
    }
    return res.json({ success: true, header: row, isDefault: false });
  } catch (err: any) {
    console.error('❌ [ReportHeader] GET error:', err?.message || err);
    return res.status(500).json({ success: false, message: 'تعذّر جلب إعدادات الترويسة' });
  }
});

router.put('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) return res.status(401).json({ success: false, message: 'غير مصرح' });

    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const saved = await storage.upsertReportHeader(userId, parsed.data);
    return res.json({ success: true, header: saved, message: 'تم حفظ إعدادات الترويسة' });
  } catch (err: any) {
    console.error('❌ [ReportHeader] PUT error:', err?.message || err);
    return res.status(500).json({ success: false, message: 'تعذّر حفظ إعدادات الترويسة' });
  }
});

router.delete('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) return res.status(401).json({ success: false, message: 'غير مصرح' });
    await storage.deleteReportHeader(userId);
    return res.json({ success: true, message: 'تمت إعادة الإعدادات للافتراضي' });
  } catch (err: any) {
    console.error('❌ [ReportHeader] DELETE error:', err?.message || err);
    return res.status(500).json({ success: false, message: 'تعذّر إعادة الإعدادات' });
  }
});

export default router;
