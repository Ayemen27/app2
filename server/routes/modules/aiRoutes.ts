/**
 * AI Agent Routes - نقاط نهاية الوكيل الذكي
 * متاح لجميع المسؤولين (role === "admin")
 */

import { Router, Request, Response, NextFunction } from "express";
import { getAIAgentService } from "../../services/ai-agent";
import { brainService } from "../../services/brain";
import { db } from "../../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { AuthenticatedRequest } from "../../middleware/auth";

const router = Router();

// 🌐 تطبيق CORS على مستوى الراوتر الخاص بالـ AI بشكل صريح وشامل
router.use((req: Request, res: Response, next: NextFunction): void => {
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-User-Id, user-id, x-user-id, x-requested-with, x-auth-token, x-access-token');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// ✅ إضافة middleware المصادقة العام قبل التحقق من الأدوار
import authenticate from "../../middleware/auth.js";
router.use(authenticate);

/**
 * التحقق من أن المستخدم مسؤول (admin)
 */
async function isAdmin(user_id: string): Promise<boolean> {
  if (!user_id) return false;
  try {
    const user = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, user_id))
      .limit(1);

    if (user.length === 0) return false;
    return user[0].role === "admin" || user[0].role === "super_admin";
  } catch (error) {
    console.error("Error checking admin:", error);
    return false;
  }
}

/**
 * Middleware للتحقق من صلاحية المسؤول
 */
async function requireAdmin(req: any, res: Response, next: NextFunction) {
  // ✅ التحقق أولاً من وجود المستخدم في الطلب (تم تعيينه بواسطة authenticate middleware)
  if (!req.user || !req.user.user_id) {
    console.error("❌ [AI/Auth] User not found in request. Authentication failed.");
    return res.status(401).json({ error: "غير مصرح - يرجى تسجيل الدخول" });
  }

  const user_id = req.user.user_id;
  const userRole = req.user.role;

  console.log(`🔍 [AI/Auth] Verifying admin for user: ${user_id} (Role in token: ${userRole})`);

  // ✅ السماح للمسؤولين بناءً على الدور الموجود في التوكن (أسرع)
  if (userRole === 'admin' || userRole === 'super_admin') {
    return next();
  }

  // Fallback: التحقق من قاعدة البيانات إذا لم يكن الدور واضحاً في التوكن
  try {
    const isAdminUser = await isAdmin(user_id);
    if (!isAdminUser) {
      console.warn(`⚠️ [AI/Auth] Access denied for user: ${user_id}`);
      return res.status(403).json({ error: "هذه الميزة متاحة فقط للمسؤولين" });
    }
    next();
  } catch (err) {
    console.error("❌ [AI/Auth] Middleware error:", err);
    res.status(500).json({ error: "خطأ داخلي في التحقق من الصلاحيات" });
  }
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
    console.log(`🔍 [AI/Access] Checking access for user: ${req.user?.user_id} (Role: ${req.user?.role})`);
    if (!req.user || !req.user.user_id) {
      return res.json({ hasAccess: false, reason: "غير مسجل الدخول" });
    }

    // ✅ التحقق من الدور في التوكن أولاً
    const hasAccess = req.user.role === 'admin' || await isAdmin(req.user.user_id);
    
    console.log(`✅ [AI/Access] Result: ${hasAccess}`);
    res.json({ 
      hasAccess, 
      reason: hasAccess ? "مسموح" : "هذه الميزة متاحة فقط للمسؤولين" 
    });
  } catch (error: any) {
    console.error(`❌ [AI/Access] Error: ${error.message}`);
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
    
    if (!req.user || !req.user.user_id) {
      console.error("❌ [AI/Sessions] User ID missing in request");
      return res.status(401).json({ error: "غير مصرح - معرف المستخدم مفقود" });
    }

    console.log(`🚀 [AI/Sessions] POST /sessions - User: ${req.user.user_id}, Title: ${title}`);
    const sessionId = await aiService.createSession(req.user.user_id, title);

    res.json({ sessionId });
  } catch (error: any) {
    console.error("❌ [AI/Sessions] Error creating session:", error);
    res.status(500).json({ error: error.message || "حدث خطأ داخلي أثناء إنشاء الجلسة" });
  }
});

/**
 * الحصول على جلسات المستخدم
 * GET /api/ai/sessions
 */
router.get("/sessions", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const aiService = getAIAgentService();
    const sessions = await aiService.getUserSessions(req.user!.user_id);

    res.json(sessions);
  } catch (error: any) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * جلب الجلسات المؤرشفة
 * GET /api/ai/sessions/archived
 */
router.get("/sessions/archived", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const aiService = getAIAgentService();
    const sessions = await aiService.getArchivedSessions(req.user!.user_id);
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * إحصائيات الدردشة
 * GET /api/ai/stats
 */
router.get("/stats", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const aiService = getAIAgentService();
    const stats = await aiService.getChatStats(req.user!.user_id);
    res.json(stats);
  } catch (error: any) {
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
    const messages = await aiService.getSessionMessages(id, req.user!.user_id);

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
    const deleted = await aiService.deleteSession(id, req.user!.user_id);

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
 * أرشفة جلسة
 * PATCH /api/ai/sessions/:id/archive
 */
router.patch("/sessions/:id/archive", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const aiService = getAIAgentService();
    const archived = await aiService.archiveSession(id, req.user!.user_id);
    if (!archived) return res.status(404).json({ error: "الجلسة غير موجودة" });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * استعادة جلسة من الأرشيف
 * PATCH /api/ai/sessions/:id/restore
 */
router.patch("/sessions/:id/restore", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const aiService = getAIAgentService();
    const restored = await aiService.restoreSession(id, req.user!.user_id);
    if (!restored) return res.status(404).json({ error: "الجلسة غير موجودة" });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * حذف جماعي لعدة جلسات
 * POST /api/ai/sessions/bulk-delete
 */
router.post("/sessions/bulk-delete", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionIds } = req.body;
    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({ error: "sessionIds مطلوب كمصفوفة" });
    }
    const aiService = getAIAgentService();
    let deleted = 0;
    for (const sid of sessionIds) {
      const ok = await aiService.deleteSession(sid, req.user!.user_id);
      if (ok) deleted++;
    }
    res.json({ success: true, deleted });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * أرشفة جماعية لعدة جلسات
 * POST /api/ai/sessions/bulk-archive
 */
router.post("/sessions/bulk-archive", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionIds } = req.body;
    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({ error: "sessionIds مطلوب كمصفوفة" });
    }
    const aiService = getAIAgentService();
    let archived = 0;
    for (const sid of sessionIds) {
      const ok = await aiService.archiveSession(sid, req.user!.user_id);
      if (ok) archived++;
    }
    res.json({ success: true, archived });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * استعادة جماعية لعدة جلسات
 * POST /api/ai/sessions/bulk-restore
 */
router.post("/sessions/bulk-restore", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionIds } = req.body;
    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({ error: "sessionIds مطلوب كمصفوفة" });
    }
    const aiService = getAIAgentService();
    let restored = 0;
    for (const sid of sessionIds) {
      const ok = await aiService.restoreSession(sid, req.user!.user_id);
      if (ok) restored++;
    }
    res.json({ success: true, restored });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * إرسال رسالة للوكيل الذكي
 * POST /api/ai/chat
 */
router.post("/chat", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: "sessionId و message مطلوبان" });
    }

    const aiService = getAIAgentService();
    const result = await aiService.processMessage(sessionId, message, req.user!.user_id);

    res.json({
      message: result.message,
      steps: result.steps,
      data: result.data,
    });
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
    const sessionId = (req.query.sessionId as string) || req.body?.sessionId;

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

/**
 * الحصول على جميع النماذج المتاحة
 * GET /api/ai/models
 */
router.get("/models", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const aiService = getAIAgentService();
    const models = aiService.getAllModels();
    const selectedModel = aiService.getSelectedModel();

    res.json({ 
      models,
      selectedModel,
      message: "جميع النماذج المتاحة"
    });
  } catch (error: any) {
    console.error("Error fetching models:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * تحديد نموذج معين للاستخدام
 * POST /api/ai/models/select
 */
router.post("/models/select", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { modelKey } = req.body;

    const aiService = getAIAgentService();
    aiService.setSelectedModel(modelKey || null);

    res.json({ 
      success: true, 
      selectedModel: modelKey || null,
      message: modelKey ? `تم تحديد النموذج: ${modelKey}` : "تم التبديل إلى الوضع التلقائي"
    });
  } catch (error: any) {
    console.error("Error selecting model:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * تحليل الأحداث واكتشاف الشذوذ
 * GET /api/ai/analyze-events
 */
router.get("/analyze-events", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const analysis = await brainService.analyzeEvents();
    res.json(analysis);
  } catch (error: any) {
    console.error("Error analyzing events:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * الحصول على إجراءات المعالجة المقترحة
 * POST /api/ai/suggest-actions
 */
router.post("/suggest-actions", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { analysisResult } = req.body;
    if (!analysisResult) {
      return res.status(400).json({ error: "analysisResult مطلوب" });
    }
    const actions = await brainService.suggestActions(analysisResult);
    res.json({ actions });
  } catch (error: any) {
    console.error("Error suggesting actions:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
