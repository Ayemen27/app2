/**
 * AI Agent Routes - نقاط نهاية الوكيل الذكي
 * متاح لجميع المسؤولين (role === "admin")
 */

import { Router, Response, NextFunction } from "express";
import { getAIAgentService } from "../../services/ai-agent";
import { db } from "../../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { AuthenticatedRequest } from "../../middleware/auth";

const router = Router();

/**
 * التحقق من أن المستخدم مسؤول (admin)
 */
async function isAdmin(userId: string): Promise<boolean> {
  try {
    const user = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) return false;
    return user[0].role === "admin";
  } catch (error) {
    console.error("Error checking admin:", error);
    return false;
  }
}

/**
 * Middleware للتحقق من صلاحية المسؤول
 */
async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ error: "غير مصرح" });
  }

  const isAdminUser = await isAdmin(req.user.userId);
  if (!isAdminUser) {
    return res.status(403).json({ error: "هذه الميزة متاحة فقط للمسؤولين" });
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

    const isAdminUser = await isAdmin(req.user.userId);
    res.json({ 
      hasAccess: isAdminUser, 
      reason: isAdminUser ? "مسموح" : "هذه الميزة متاحة فقط للمسؤولين" 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * إنشاء جلسة محادثة جديدة
 * POST /api/ai/sessions
 */
router.post("/sessions", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
router.get("/sessions", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
router.get("/sessions/:id/messages", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
router.delete("/sessions/:id", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
router.post("/chat", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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

/**
 * الحصول على العمليات المعلقة
 * GET /api/ai/sessions/:id/pending-operations
 */
router.get("/sessions/:id/pending-operations", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const aiService = getAIAgentService();
    const operations = aiService.getPendingOperations(id);

    res.json({ operations });
  } catch (error: any) {
    console.error("Error fetching pending operations:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * تنفيذ عملية معتمدة
 * POST /api/ai/execute-operation
 */
router.post("/execute-operation", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { operationId, sessionId } = req.body;

    if (!operationId || !sessionId) {
      return res.status(400).json({ error: "operationId و sessionId مطلوبان" });
    }

    const aiService = getAIAgentService();
    const result = await aiService.executeApprovedOperation(operationId, sessionId);

    res.json(result);
  } catch (error: any) {
    console.error("Error executing operation:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * إلغاء عملية معلقة
 * DELETE /api/ai/operations/:id
 */
router.delete("/operations/:id", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId مطلوب" });
    }

    const aiService = getAIAgentService();
    const cancelled = aiService.cancelPendingOperation(id, sessionId);

    if (!cancelled) {
      return res.status(404).json({ error: "العملية غير موجودة أو غير مصرح بها" });
    }

    res.json({ success: true, message: "تم إلغاء العملية" });
  } catch (error: any) {
    console.error("Error cancelling operation:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * الحصول على نماذج Hugging Face المتاحة
 * GET /api/ai/huggingface/models
 */
router.get("/huggingface/models", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const aiService = getAIAgentService();
    const models = aiService.getAvailableHuggingFaceModels();

    res.json({ 
      models,
      message: "النماذج المتاحة - النماذج التي تدعم العربية موصى بها لهذا التطبيق"
    });
  } catch (error: any) {
    console.error("Error fetching HuggingFace models:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * تبديل نموذج Hugging Face
 * POST /api/ai/huggingface/switch
 */
router.post("/huggingface/switch", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { modelKey } = req.body;

    if (!modelKey) {
      return res.status(400).json({ error: "modelKey مطلوب" });
    }

    const aiService = getAIAgentService();
    const success = await aiService.switchHuggingFaceModel(modelKey);

    if (!success) {
      return res.status(400).json({ error: "فشل في تبديل النموذج. تأكد من صحة معرف النموذج." });
    }

    res.json({ success: true, message: `تم التبديل إلى نموذج ${modelKey}` });
  } catch (error: any) {
    console.error("Error switching HuggingFace model:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
