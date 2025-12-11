/**
 * AI Agent Routes - نقاط نهاية الوكيل الذكي
 * متاح فقط للمسؤول الأول (isFirstAdmin)
 */

import { Router, Response, NextFunction } from "express";
import { getAIAgentService } from "../../services/ai-agent";
import { db } from "../../db";
import { users } from "@shared/schema";
import { eq, asc } from "drizzle-orm";
import { AuthenticatedRequest } from "../../middleware/auth";

const router = Router();

/**
 * التحقق من أن المستخدم هو المسؤول الأول
 */
async function isFirstAdmin(userId: string): Promise<boolean> {
  try {
    const allUsers = await db
      .select({ id: users.id, role: users.role, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.role, "admin"))
      .orderBy(asc(users.createdAt));

    if (allUsers.length === 0) return false;
    return allUsers[0].id === userId;
  } catch (error) {
    console.error("Error checking first admin:", error);
    return false;
  }
}

/**
 * Middleware للتحقق من المسؤول الأول
 */
async function requireFirstAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ error: "غير مصرح" });
  }

  const isFirst = await isFirstAdmin(req.user.userId);
  if (!isFirst) {
    return res.status(403).json({ error: "هذه الميزة متاحة فقط للمسؤول الأول" });
  }

  next();
}

/**
 * التحقق من توفر الوكيل الذكي
 * GET /api/ai/status
 */
router.get("/status", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const aiService = getAIAgentService();
    const isAvailable = aiService.isAvailable();
    const modelsStatus = aiService.getModelsStatus();

    res.json({
      available: isAvailable,
      models: modelsStatus,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * التحقق من صلاحية الوصول
 * GET /api/ai/access
 */
router.get("/access", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.json({ hasAccess: false, reason: "غير مسجل الدخول" });
    }

    const isFirst = await isFirstAdmin(req.user.userId);
    res.json({ 
      hasAccess: isFirst, 
      reason: isFirst ? "مسموح" : "هذه الميزة متاحة فقط للمسؤول الأول" 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * إنشاء جلسة محادثة جديدة
 * POST /api/ai/sessions
 */
router.post("/sessions", requireFirstAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title } = req.body;
    const aiService = getAIAgentService();
    const sessionId = await aiService.createSession(req.user!.userId, title);

    res.json({ sessionId });
  } catch (error: any) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * الحصول على جلسات المستخدم
 * GET /api/ai/sessions
 */
router.get("/sessions", requireFirstAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const aiService = getAIAgentService();
    const sessions = await aiService.getUserSessions(req.user!.userId);

    res.json(sessions);
  } catch (error: any) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * الحصول على رسائل جلسة محددة
 * GET /api/ai/sessions/:id/messages
 */
router.get("/sessions/:id/messages", requireFirstAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const aiService = getAIAgentService();
    const messages = await aiService.getSessionMessages(id);

    res.json(messages);
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * حذف جلسة
 * DELETE /api/ai/sessions/:id
 */
router.delete("/sessions/:id", requireFirstAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const aiService = getAIAgentService();
    const deleted = await aiService.deleteSession(id, req.user!.userId);

    if (!deleted) {
      return res.status(404).json({ error: "الجلسة غير موجودة" });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting session:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * إرسال رسالة للوكيل
 * POST /api/ai/chat
 */
router.post("/chat", requireFirstAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: "sessionId و message مطلوبان" });
    }

    const aiService = getAIAgentService();

    if (!aiService.isAvailable()) {
      return res.status(503).json({ 
        error: "الوكيل الذكي غير متاح حالياً. يرجى إعداد مفاتيح API." 
      });
    }

    const response = await aiService.processMessage(sessionId, message, req.user!.userId);

    res.json(response);
  } catch (error: any) {
    console.error("Error processing message:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
