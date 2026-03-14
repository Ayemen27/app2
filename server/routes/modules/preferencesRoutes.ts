import express from 'express';
import { Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth.js';
import { storage } from '../../storage.js';

const preferencesUpdateSchema = z.object({
  language: z.enum(['ar', 'en']).optional(),
  auto_update: z.boolean().optional(),
  dark_mode: z.boolean().optional(),
  font_size: z.enum(['small', 'medium', 'large']).optional(),
  push_notifications: z.boolean().optional(),
  expense_alerts: z.boolean().optional(),
  attendance_alerts: z.boolean().optional(),
  app_lock: z.boolean().optional(),
}).strict();

const DEFAULT_PREFS = {
  language: 'ar',
  auto_update: true,
  dark_mode: false,
  font_size: 'medium',
  push_notifications: true,
  expense_alerts: true,
  attendance_alerts: false,
  app_lock: false,
};

const preferencesRouter = express.Router();

preferencesRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'غير مصرح' });
    }

    let prefs = await storage.getUserPreferences(userId);

    if (!prefs) {
      prefs = await storage.upsertUserPreferences(userId, DEFAULT_PREFS);
    }

    res.json({ success: true, preferences: prefs });
  } catch (error: any) {
    console.error('❌ [Preferences] Error fetching:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب التفضيلات' });
  }
});

preferencesRouter.put('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'غير مصرح' });
    }

    const parseResult = preferencesUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const updateData = parseResult.data;
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد بيانات للتحديث' });
    }

    const prefs = await storage.upsertUserPreferences(userId, updateData);

    console.log(`✅ [Preferences] Updated for user: ${req.user?.email}`);
    res.json({ success: true, preferences: prefs, message: 'تم حفظ التفضيلات بنجاح' });
  } catch (error: any) {
    console.error('❌ [Preferences] Error updating:', error);
    res.status(500).json({ success: false, message: 'خطأ في حفظ التفضيلات' });
  }
});

export default preferencesRouter;
