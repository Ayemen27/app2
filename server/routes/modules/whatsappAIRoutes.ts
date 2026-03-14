import { Router, Request, Response, NextFunction } from "express";
import { getWhatsAppAIService } from "../../services/ai-agent/WhatsAppAIService";
import { getWhatsAppBot } from "../../services/ai-agent/WhatsAppBot";
import { storage } from "../../storage";
import { db } from "../../db";
import { whatsappUserLinks, whatsappAllowedNumbers, whatsappMessages, whatsappLinkProjects, users, projects } from "@shared/schema";
import { eq, and, sql, ne, desc, inArray, or } from "drizzle-orm";
import { authenticate } from "../../middleware/auth";
import { z } from "zod";
import { projectAccessService } from "../../services/ProjectAccessService";
import { botSettingsService } from "../../services/ai-agent/whatsapp/BotSettingsService";

const router = Router();

function canonicalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

const requireAdminCheck = (req: Request, res: Response, next: NextFunction): any => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    return res.status(403).json({ error: "غير مصرح", message: "هذا الإجراء للمسؤولين فقط" });
  }
  next();
};

const linkPhoneSchema = z.object({
  phoneNumber: z.string().min(8, "رقم هاتف غير صالح").max(20, "رقم هاتف طويل جداً"),
});

const allowedNumberSchema = z.object({
  phoneNumber: z.string().min(8, "رقم هاتف غير صالح").max(20, "رقم هاتف طويل جداً"),
  label: z.string().max(100).optional().nullable(),
});

const WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET || "";

router.use(authenticate);

router.get("/my-link", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id as string;
    const link = await db.select()
      .from(whatsappUserLinks)
      .where(eq(whatsappUserLinks.user_id, userId))
      .limit(1);

    if (link.length > 0) {
      res.json({ linked: true, ...link[0] });
    } else {
      res.json({ linked: false });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/link-phone", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id as string;

    const validation = linkPhoneSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues[0]?.message || "بيانات غير صالحة" });
    }

    const { phoneNumber } = validation.data;
    const canonical = canonicalizePhone(phoneNumber);

    if (canonical.length < 8) {
      return res.status(400).json({ error: "رقم هاتف غير صالح" });
    }

    const phoneInUse = await db.select()
      .from(whatsappUserLinks)
      .where(and(
        eq(whatsappUserLinks.phoneNumber, canonical),
        ne(whatsappUserLinks.user_id, userId!)
      ))
      .limit(1);

    if (phoneInUse.length > 0) {
      return res.status(409).json({ error: "هذا الرقم مسجل بالفعل لمستخدم آخر" });
    }

    const existing = await db.select()
      .from(whatsappUserLinks)
      .where(eq(whatsappUserLinks.user_id, userId!))
      .limit(1);

    if (existing.length > 0) {
      await db.update(whatsappUserLinks)
        .set({ phoneNumber: canonical, isActive: true })
        .where(eq(whatsappUserLinks.user_id, userId!));
      return res.json({ success: true, message: "تم تحديث رقم الواتساب بنجاح" });
    }

    await db.insert(whatsappUserLinks).values({
      user_id: userId!,
      phoneNumber: canonical,
      isActive: true
    });

    res.json({ success: true, message: "تم ربط رقم الواتساب بنجاح" });
  } catch (error: any) {
    console.error("[WhatsApp] Link phone error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/unlink-phone", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id as string;
    await db.delete(whatsappUserLinks).where(eq(whatsappUserLinks.user_id, userId));
    res.json({ success: true, message: "تم إلغاء ربط الواتساب" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/all-links", requireAdminCheck, async (req: Request, res: Response) => {
  try {
    const links = await db.select({
      id: whatsappUserLinks.id,
      user_id: whatsappUserLinks.user_id,
      phoneNumber: whatsappUserLinks.phoneNumber,
      isActive: whatsappUserLinks.isActive,
      linkedAt: whatsappUserLinks.linkedAt,
      lastMessageAt: whatsappUserLinks.lastMessageAt,
      totalMessages: whatsappUserLinks.totalMessages,
      permissionsMode: whatsappUserLinks.permissionsMode,
      scopeAllProjects: whatsappUserLinks.scopeAllProjects,
      userName: users.full_name,
      userEmail: users.email,
    })
    .from(whatsappUserLinks)
    .leftJoin(users, eq(whatsappUserLinks.user_id, users.id));

    res.json(links);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/admin-unlink/:userId", requireAdminCheck, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    await db.delete(whatsappUserLinks).where(eq(whatsappUserLinks.user_id, userId));
    res.json({ success: true, message: "تم إلغاء ربط المستخدم" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/qr-image", requireAdminCheck, async (req: Request, res: Response) => {
  try {
    const bot = getWhatsAppBot();
    const qr = bot.getQR();
    if (!qr) return res.status(404).json({ error: "No QR code available" });
    
    const QRCode = require('qrcode');
    const qrBuffer = await QRCode.toBuffer(qr, { width: 280, margin: 2, color: { dark: '#1a1a2e', light: '#ffffff' } });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.send(qrBuffer);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate QR image" });
  }
});

router.get("/status", async (req: Request, res: Response) => {
  const bot = getWhatsAppBot();
  const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';

  res.json({
    status: bot.getStatus(),
    qr: isAdmin ? bot.getQR() : null,
    pairingCode: isAdmin ? bot.getPairingCode() : null,
    lastError: isAdmin ? bot.getLastError() : null,
    needsRelink: isAdmin ? bot.getNeedsRelink() : false,
    protection: isAdmin ? await bot.getProtectionStats() : { dailyMessageCount: 0, dailyLimit: 50 }
  });
});

router.post("/restart", requireAdminCheck, async (req: Request, res: Response) => {
  const { phoneNumber } = req.body;
  const bot = getWhatsAppBot();
  await bot.restart(phoneNumber);
  res.json({ success: true });
});

router.post("/relink", requireAdminCheck, async (req: Request, res: Response) => {
  try {
    const bot = getWhatsAppBot();
    await bot.resetAndRelink();
    res.json({ success: true, message: "تم حذف الجلسة القديمة وبدء جلسة جديدة" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/disconnect", requireAdminCheck, async (req: Request, res: Response) => {
  try {
    const bot = getWhatsAppBot();
    if (bot.getStatus() === "open" || bot.getStatus() === "connecting") {
      await bot.disconnect();
      res.json({ success: true, message: "تم فصل الاتصال بنجاح" });
    } else {
      res.json({ success: true, message: "الاتصال غير نشط بالفعل" });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/webhook", async (req: Request, res: Response) => {
  if (WEBHOOK_SECRET) {
    const providedSecret = req.headers['x-webhook-secret'] || req.query.secret;
    if (providedSecret !== WEBHOOK_SECRET) {
      return res.status(403).json({ error: "Invalid webhook secret" });
    }
  }

  const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
  if (!isAdmin) {
    return res.status(403).json({ error: "Webhook is restricted to admin users" });
  }

  const { from, body } = req.body;

  const whatsappService = getWhatsAppAIService();
  const reply = await whatsappService.handleIncomingMessage(from, body);

  if (reply) {
    return res.json({ reply });
  }

  res.sendStatus(200);
});

router.get("/stats/me", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id as string;

    const link = await db.select()
      .from(whatsappUserLinks)
      .where(eq(whatsappUserLinks.user_id, userId))
      .limit(1);

    const phoneNumber = link.length > 0 ? link[0].phoneNumber : null;
    const cleanPhone = phoneNumber ? phoneNumber.replace(/\D/g, '') : null;

    let myMessageCount = 0;
    if (cleanPhone) {
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(whatsappMessages)
        .where(or(
          eq(whatsappMessages.sender, cleanPhone),
          eq(whatsappMessages.phone_number, cleanPhone)
        ));
      myMessageCount = Number(countResult[0]?.count || 0);
    }

    const accessibleProjects = await projectAccessService.getAccessibleProjectIds(userId, req.user!.role as string);

    res.json({
      totalMessages: myMessageCount,
      linkedPhone: phoneNumber,
      isLinked: !!phoneNumber,
      accessibleProjectsCount: accessibleProjects.length,
      lastMessageAt: link.length > 0 ? link[0].lastMessageAt : null,
    });
  } catch (error: any) {
    console.error("[WhatsApp Stats/me] Error:", error?.message || error);
    res.json({
      totalMessages: 0,
      linkedPhone: null,
      isLinked: false,
      accessibleProjectsCount: 0,
      lastMessageAt: null,
    });
  }
});

router.get("/stats/admin", requireAdminCheck, async (req: Request, res: Response) => {
  try {
    const stats = await storage.getWhatsAppStats();
    const realCountResult = await db.select({ count: sql<number>`count(*)` })
      .from(whatsappMessages);
    const realCount = Number(realCountResult[0]?.count || 0);
    res.json({
      totalMessages: Math.max(stats?.totalMessages || 0, realCount),
      lastSync: stats?.lastSync || null,
      accuracy: stats?.accuracy || "0%",
      status: stats?.status || "idle",
      phoneNumber: stats?.phoneNumber || null
    });
  } catch (error: any) {
    console.error("[WhatsApp Stats/admin] Error:", error?.message || error);
    res.json({
      totalMessages: 0,
      lastSync: null,
      accuracy: "0%",
      status: "idle",
      phoneNumber: null
    });
  }
});

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    if (isAdmin) {
      const stats = await storage.getWhatsAppStats();
      const realCountResult = await db.select({ count: sql<number>`count(*)` })
        .from(whatsappMessages);
      const realCount = Number(realCountResult[0]?.count || 0);
      return res.json({
        totalMessages: Math.max(stats?.totalMessages || 0, realCount),
        lastSync: stats?.lastSync || null,
        accuracy: stats?.accuracy || "0%",
        status: stats?.status || "idle",
        phoneNumber: stats?.phoneNumber || null
      });
    }
    const userId = req.user!.id as string;
    const link = await db.select()
      .from(whatsappUserLinks)
      .where(eq(whatsappUserLinks.user_id, userId))
      .limit(1);
    const phoneNumber = link.length > 0 ? link[0].phoneNumber : null;
    const cleanStatsPhone = phoneNumber ? phoneNumber.replace(/\D/g, '') : null;
    let myMessageCount = 0;
    if (cleanStatsPhone) {
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(whatsappMessages)
        .where(or(
          eq(whatsappMessages.sender, cleanStatsPhone),
          eq(whatsappMessages.phone_number, cleanStatsPhone)
        ));
      myMessageCount = Number(countResult[0]?.count || 0);
    }
    res.json({
      totalMessages: myMessageCount,
      lastSync: null,
      accuracy: "0%",
      status: "idle",
      phoneNumber: phoneNumber
    });
  } catch (error: any) {
    console.error("[WhatsApp Stats] Error:", error?.message || error);
    res.json({
      totalMessages: 0,
      lastSync: null,
      accuracy: "0%",
      status: "idle",
      phoneNumber: null
    });
  }
});

router.get("/my-scope", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id as string;
    const role = req.user!.role as string;

    const link = await db.select()
      .from(whatsappUserLinks)
      .where(eq(whatsappUserLinks.user_id, userId))
      .limit(1);

    const projectPermissions = await projectAccessService.getUserPermissionsForAllProjects(userId, role);

    res.json({
      isLinked: link.length > 0,
      linkedPhone: link.length > 0 ? link[0].phoneNumber : null,
      linkedAt: link.length > 0 ? link[0].linkedAt : null,
      projects: projectPermissions.map(p => ({
        projectId: p.projectId,
        projectName: p.projectName,
        canView: p.canView,
        canAdd: p.canAdd,
        canEdit: p.canEdit,
        canDelete: p.canDelete,
        isOwner: p.isOwner,
      })),
    });
  } catch (error: any) {
    console.error("[WhatsApp my-scope] Error:", error?.message || error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/messages/me", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id as string;

    const link = await db.select()
      .from(whatsappUserLinks)
      .where(eq(whatsappUserLinks.user_id, userId))
      .limit(1);

    if (link.length === 0) {
      return res.json({ messages: [], total: 0, page: 1, pageSize: 20 });
    }

    const cleanPhone = link[0].phoneNumber.replace(/\D/g, '');
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const offset = (page - 1) * pageSize;

    const phoneFilter = or(
      eq(whatsappMessages.sender, cleanPhone),
      eq(whatsappMessages.phone_number, cleanPhone),
      and(eq(whatsappMessages.sender, 'bot'), eq(whatsappMessages.wa_id, cleanPhone))
    );

    const [messages, countResult] = await Promise.all([
      db.select()
        .from(whatsappMessages)
        .where(phoneFilter)
        .orderBy(desc(whatsappMessages.timestamp))
        .limit(pageSize)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` })
        .from(whatsappMessages)
        .where(phoneFilter),
    ]);

    const total = Number(countResult[0]?.count || 0);

    res.json({
      messages,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: any) {
    console.error("[WhatsApp messages/me] Error:", error?.message || error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/conversations", requireAdminCheck, async (req: Request, res: Response) => {
  try {
    const conversations = await db.select({
      id: whatsappUserLinks.id,
      userId: whatsappUserLinks.user_id,
      phoneNumber: whatsappUserLinks.phoneNumber,
      totalMessages: whatsappUserLinks.totalMessages,
      lastMessageAt: whatsappUserLinks.lastMessageAt,
      isActive: whatsappUserLinks.isActive,
      userName: users.full_name,
      userEmail: users.email,
    })
    .from(whatsappUserLinks)
    .leftJoin(users, eq(whatsappUserLinks.user_id, users.id))
    .where(eq(whatsappUserLinks.isActive, true))
    .orderBy(desc(whatsappUserLinks.lastMessageAt));

    const result = await Promise.all(conversations.map(async (conv: any) => {
      const cleanPhone = conv.phoneNumber.replace(/\D/g, '');
      const lastMsg = await db.select({
        content: whatsappMessages.content,
        sender: whatsappMessages.sender,
        timestamp: whatsappMessages.timestamp,
      })
      .from(whatsappMessages)
      .where(eq(whatsappMessages.phone_number, cleanPhone))
      .orderBy(desc(whatsappMessages.timestamp))
      .limit(1);

      const unreadCount = await db.select({ count: sql<number>`count(*)` })
        .from(whatsappMessages)
        .where(and(
          eq(whatsappMessages.phone_number, cleanPhone),
          ne(whatsappMessages.sender, 'bot'),
          eq(whatsappMessages.status, 'received')
        ));

      return {
        ...conv,
        lastMessage: lastMsg[0] || null,
        unreadCount: Number(unreadCount[0]?.count || 0),
      };
    }));

    res.json(result);
  } catch (error: any) {
    console.error("[WhatsApp Conversations] Error:", error?.message || error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/conversations/:phoneNumber/messages", requireAdminCheck, async (req: Request, res: Response) => {
  try {
    const cleanPhone = req.params.phoneNumber.replace(/\D/g, '');
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 50));
    const offset = (page - 1) * pageSize;

    const phoneFilter = eq(whatsappMessages.phone_number, cleanPhone);

    const [messages, countResult] = await Promise.all([
      db.select()
        .from(whatsappMessages)
        .where(phoneFilter)
        .orderBy(desc(whatsappMessages.timestamp))
        .limit(pageSize)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` })
        .from(whatsappMessages)
        .where(phoneFilter),
    ]);

    const link = await db.select({
      userName: users.full_name,
      userEmail: users.email,
    })
    .from(whatsappUserLinks)
    .leftJoin(users, eq(whatsappUserLinks.user_id, users.id))
    .where(eq(whatsappUserLinks.phoneNumber, cleanPhone))
    .limit(1);

    res.json({
      messages: messages.reverse(),
      total: Number(countResult[0]?.count || 0),
      page,
      pageSize,
      totalPages: Math.ceil(Number(countResult[0]?.count || 0) / pageSize),
      contact: link[0] || { userName: null, userEmail: null },
    });
  } catch (error: any) {
    console.error("[WhatsApp Conv Messages] Error:", error?.message || error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/conversations/:phoneNumber/send", requireAdminCheck, async (req: Request, res: Response) => {
  try {
    const cleanPhone = req.params.phoneNumber.replace(/\D/g, '');
    const { message } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: "الرسالة مطلوبة" });
    }

    const bot = getWhatsAppBot();
    if (!bot.isConnected()) {
      return res.status(503).json({ error: "البوت غير متصل. يرجى الاتصال أولاً." });
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;
    await bot.sendMessageSafe(jid, { text: message.trim() });

    await storage.createWhatsAppMessage({
      wa_id: cleanPhone,
      sender: "admin",
      content: message.trim(),
      status: "sent",
      phone_number: cleanPhone,
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("[WhatsApp Send] Error:", error?.message || error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/conversations/:phoneNumber/send-image", requireAdminCheck, async (req: Request, res: Response) => {
  try {
    const cleanPhone = req.params.phoneNumber.replace(/\D/g, '');
    const { imageBase64, caption } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: "الصورة مطلوبة" });
    }

    const bot = getWhatsAppBot();
    if (!bot.isConnected()) {
      return res.status(503).json({ error: "البوت غير متصل. يرجى الاتصال أولاً." });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const jid = `${cleanPhone}@s.whatsapp.net`;
    await bot.sendMessageSafe(jid, {
      image: imageBuffer,
      caption: caption?.trim() || undefined,
    });

    await storage.createWhatsAppMessage({
      wa_id: cleanPhone,
      sender: "admin",
      content: caption?.trim() ? `📷 ${caption.trim()}` : "📷 صورة",
      status: "sent",
      phone_number: cleanPhone,
      metadata: { type: "image", imageBase64: imageBase64 },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("[WhatsApp SendImage] Error:", error?.message || error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/allowed-numbers", requireAdminCheck, async (req: Request, res: Response) => {
  try {
    const numbers = await db.select({
      id: whatsappAllowedNumbers.id,
      phoneNumber: whatsappAllowedNumbers.phoneNumber,
      label: whatsappAllowedNumbers.label,
      isActive: whatsappAllowedNumbers.isActive,
      addedBy: whatsappAllowedNumbers.addedBy,
      createdAt: whatsappAllowedNumbers.createdAt,
      addedByName: users.full_name,
    })
    .from(whatsappAllowedNumbers)
    .leftJoin(users, eq(whatsappAllowedNumbers.addedBy, users.id))
    .orderBy(whatsappAllowedNumbers.createdAt);
    res.json(numbers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/allowed-numbers", requireAdminCheck, async (req: Request, res: Response) => {
  try {
    const validation = allowedNumberSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues[0]?.message || "بيانات غير صالحة" });
    }
    const { phoneNumber, label } = validation.data;
    const canonical = canonicalizePhone(phoneNumber);
    const existing = await db.select()
      .from(whatsappAllowedNumbers)
      .where(eq(whatsappAllowedNumbers.phoneNumber, canonical))
      .limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: "هذا الرقم مضاف بالفعل" });
    }
    const [inserted] = await db.insert(whatsappAllowedNumbers).values({
      phoneNumber: canonical,
      label: label || null,
      isActive: true,
      addedBy: req.user!.id,
    }).returning();
    res.json({ success: true, number: inserted });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/allowed-numbers/:id", requireAdminCheck, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { isActive, label } = req.body;
    const updates: any = {};
    if (typeof isActive === 'boolean') updates.isActive = isActive;
    if (typeof label === 'string') updates.label = label;
    await db.update(whatsappAllowedNumbers)
      .set(updates)
      .where(eq(whatsappAllowedNumbers.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/allowed-numbers/:id", requireAdminCheck, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(whatsappAllowedNumbers).where(eq(whatsappAllowedNumbers.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/admin/links/:linkId/permissions", requireAdminCheck, async (req: Request, res: Response) => {
  try {
    const linkId = parseInt(req.params.linkId);
    if (isNaN(linkId)) {
      return res.status(400).json({ error: "معرف الرابط غير صالح" });
    }

    const link = await db.select({
      permissionsMode: whatsappUserLinks.permissionsMode,
      canRead: whatsappUserLinks.canRead,
      canAdd: whatsappUserLinks.canAdd,
      canEdit: whatsappUserLinks.canEdit,
      canDelete: whatsappUserLinks.canDelete,
      scopeAllProjects: whatsappUserLinks.scopeAllProjects,
    })
    .from(whatsappUserLinks)
    .where(eq(whatsappUserLinks.id, linkId))
    .limit(1);

    if (link.length === 0) {
      return res.status(404).json({ error: "الرابط غير موجود" });
    }

    res.json(link[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const updatePermissionsSchema = z.object({
  permissionsMode: z.enum(["inherit_user", "custom"]).optional(),
  canRead: z.boolean().optional(),
  canAdd: z.boolean().optional(),
  canEdit: z.boolean().optional(),
  canDelete: z.boolean().optional(),
  scopeAllProjects: z.boolean().optional(),
});

router.put("/admin/links/:linkId/permissions", requireAdminCheck, async (req: Request, res: Response) => {
  try {
    const linkId = parseInt(req.params.linkId);
    if (isNaN(linkId)) {
      return res.status(400).json({ error: "معرف الرابط غير صالح" });
    }

    const existing = await db.select({ id: whatsappUserLinks.id })
      .from(whatsappUserLinks)
      .where(eq(whatsappUserLinks.id, linkId))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: "الرابط غير موجود" });
    }

    const validation = updatePermissionsSchema.safeParse(req.body);
    if (!validation.success) {
      const errMsg = validation.error.issues?.[0]?.message || "بيانات غير صالحة";
      return res.status(400).json({ error: errMsg });
    }

    const updates: any = {};
    const data = validation.data;
    if (data.permissionsMode !== undefined) updates.permissionsMode = data.permissionsMode;
    if (data.canRead !== undefined) updates.canRead = data.canRead;
    if (data.canAdd !== undefined) updates.canAdd = data.canAdd;
    if (data.canEdit !== undefined) updates.canEdit = data.canEdit;
    if (data.canDelete !== undefined) updates.canDelete = data.canDelete;
    if (data.scopeAllProjects !== undefined) updates.scopeAllProjects = data.scopeAllProjects;

    if (Object.keys(updates).length > 0) {
      await db.update(whatsappUserLinks)
        .set(updates)
        .where(eq(whatsappUserLinks.id, linkId));
    }

    const updated = await db.select({
      permissionsMode: whatsappUserLinks.permissionsMode,
      canRead: whatsappUserLinks.canRead,
      canAdd: whatsappUserLinks.canAdd,
      canEdit: whatsappUserLinks.canEdit,
      canDelete: whatsappUserLinks.canDelete,
      scopeAllProjects: whatsappUserLinks.scopeAllProjects,
    })
    .from(whatsappUserLinks)
    .where(eq(whatsappUserLinks.id, linkId))
    .limit(1);

    res.json(updated[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/admin/links/:linkId/projects", requireAdminCheck, async (req: Request, res: Response) => {
  try {
    const linkId = parseInt(req.params.linkId);
    if (isNaN(linkId)) {
      return res.status(400).json({ error: "معرف الرابط غير صالح" });
    }

    const existing = await db.select({ id: whatsappUserLinks.id })
      .from(whatsappUserLinks)
      .where(eq(whatsappUserLinks.id, linkId))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: "الرابط غير موجود" });
    }

    const linkProjects = await db.select({
      id: whatsappLinkProjects.id,
      linkId: whatsappLinkProjects.linkId,
      projectId: whatsappLinkProjects.project_id,
      isActive: whatsappLinkProjects.isActive,
      createdAt: whatsappLinkProjects.createdAt,
      projectName: projects.name,
    })
    .from(whatsappLinkProjects)
    .leftJoin(projects, eq(whatsappLinkProjects.project_id, projects.id))
    .where(eq(whatsappLinkProjects.linkId, linkId));

    res.json(linkProjects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const updateLinkProjectsSchema = z.object({
  projectIds: z.array(z.string()),
});

router.put("/admin/links/:linkId/projects", requireAdminCheck, async (req: Request, res: Response) => {
  try {
    const linkId = parseInt(req.params.linkId);
    if (isNaN(linkId)) {
      return res.status(400).json({ error: "معرف الرابط غير صالح" });
    }

    const existing = await db.select({ id: whatsappUserLinks.id })
      .from(whatsappUserLinks)
      .where(eq(whatsappUserLinks.id, linkId))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: "الرابط غير موجود" });
    }

    const validation = updateLinkProjectsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues[0]?.message || "بيانات غير صالحة" });
    }

    const { projectIds } = validation.data;

    await db.delete(whatsappLinkProjects)
      .where(eq(whatsappLinkProjects.linkId, linkId));

    if (projectIds.length > 0) {
      await db.insert(whatsappLinkProjects)
        .values(projectIds.map(projectId => ({
          linkId,
          project_id: projectId,
          isActive: true,
        })));
    }

    const updatedProjects = await db.select({
      id: whatsappLinkProjects.id,
      linkId: whatsappLinkProjects.linkId,
      projectId: whatsappLinkProjects.project_id,
      isActive: whatsappLinkProjects.isActive,
      createdAt: whatsappLinkProjects.createdAt,
      projectName: projects.name,
    })
    .from(whatsappLinkProjects)
    .leftJoin(projects, eq(whatsappLinkProjects.project_id, projects.id))
    .where(eq(whatsappLinkProjects.linkId, linkId));

    res.json(updatedProjects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const updateSettingsSchema = z.object({
  botName: z.string().max(100).optional(),
  botDescription: z.string().max(500).optional(),
  language: z.enum(["ar", "en"]).optional(),
  timezone: z.string().max(50).optional(),
  deletePreviousMessages: z.boolean().optional(),
  boldHeadings: z.boolean().optional(),
  useEmoji: z.boolean().optional(),
  welcomeMessage: z.string().optional(),
  unavailableMessage: z.string().optional(),
  footerText: z.string().max(200).optional(),
  menuMainTitle: z.string().max(100).optional(),
  menuExpensesTitle: z.string().max(100).optional(),
  menuProjectsTitle: z.string().max(100).optional(),
  menuReportsTitle: z.string().max(100).optional(),
  menuExportTitle: z.string().max(100).optional(),
  menuHelpTitle: z.string().max(100).optional(),
  menuExpensesEmoji: z.string().max(10).optional(),
  menuProjectsEmoji: z.string().max(10).optional(),
  menuReportsEmoji: z.string().max(10).optional(),
  menuExportEmoji: z.string().max(10).optional(),
  menuHelpEmoji: z.string().max(10).optional(),
  protectionLevel: z.enum(["maximum", "balanced", "minimal"]).optional(),
  responseDelayMin: z.number().int().min(500).max(10000).optional(),
  responseDelayMax: z.number().int().min(1000).max(30000).optional(),
  dailyMessageLimit: z.number().int().min(10).max(1000).optional(),
  notifyNewMessage: z.boolean().optional(),
  notifyOnError: z.boolean().optional(),
  notifyOnDisconnect: z.boolean().optional(),
  debugMode: z.boolean().optional(),
  messageLogging: z.boolean().optional(),
  autoReconnect: z.boolean().optional(),
  botEnabled: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().max(500).optional(),
  businessHoursEnabled: z.boolean().optional(),
  businessHoursStart: z.string().max(10).optional(),
  businessHoursEnd: z.string().max(10).optional(),
  businessDays: z.string().max(50).optional(),
  outsideHoursMessage: z.string().max(500).optional(),
  smartGreeting: z.boolean().optional(),
  goodbyeMessage: z.string().max(500).optional(),
  waitingMessage: z.string().max(500).optional(),
  typingIndicator: z.boolean().optional(),
  sessionTimeoutMinutes: z.number().int().min(1).max(1440).optional(),
  maxMessageLength: z.number().int().min(100).max(10000).optional(),
  perUserDailyLimit: z.number().int().min(1).max(500).optional(),
  rateLimitPerMinute: z.number().int().min(1).max(60).optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  adminNotifyPhone: z.string().max(20).optional(),
  mediaEnabled: z.boolean().optional(),
}).strict().refine((data) => {
  if (data.responseDelayMin !== undefined && data.responseDelayMax !== undefined) {
    return data.responseDelayMin <= data.responseDelayMax;
  }
  return true;
}, { message: "تأخير الرد الأدنى يجب أن يكون أقل من أو يساوي الأقصى" });

router.get("/settings", requireAdminCheck, async (req: Request, res: Response) => {
  try {
    const settings = await botSettingsService.getSettings();
    res.json(settings);
  } catch (error: any) {
    console.error("[WhatsApp Settings] GET Error:", error?.message);
    res.status(500).json({ error: error.message });
  }
});

router.put("/settings", requireAdminCheck, async (req: Request, res: Response) => {
  try {
    const validation = updateSettingsSchema.safeParse(req.body);
    if (!validation.success) {
      const errMsg = validation.error.issues?.[0]?.message || "بيانات غير صالحة";
      return res.status(400).json({ error: errMsg });
    }

    if (validation.data.responseDelayMin !== undefined || validation.data.responseDelayMax !== undefined) {
      const current = await botSettingsService.getSettings();
      const minVal = validation.data.responseDelayMin ?? current.responseDelayMin;
      const maxVal = validation.data.responseDelayMax ?? current.responseDelayMax;
      if (minVal > maxVal) {
        return res.status(400).json({ error: "تأخير الرد الأدنى يجب أن يكون أقل من أو يساوي الأقصى" });
      }
    }

    const updated = await botSettingsService.updateSettings(validation.data, req.user!.id as string);
    res.json(updated);
  } catch (error: any) {
    console.error("[WhatsApp Settings] PUT Error:", error?.message);
    res.status(500).json({ error: error.message });
  }
});

router.post("/settings/reset", requireAdminCheck, async (req: Request, res: Response) => {
  try {
    const settings = await botSettingsService.resetSettings(req.user!.id as string);
    res.json(settings);
  } catch (error: any) {
    console.error("[WhatsApp Settings] Reset Error:", error?.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
