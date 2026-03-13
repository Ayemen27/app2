import { Router, Request, Response } from "express";
import { getWhatsAppAIService } from "../../services/ai-agent/WhatsAppAIService";
import { getWhatsAppBot } from "../../services/ai-agent/WhatsAppBot";
import { storage } from "../../storage";
import { db } from "../../db";
import { whatsappUserLinks, whatsappAllowedNumbers, users } from "@shared/schema";
import { eq, and, sql, ne } from "drizzle-orm";
import { authenticate } from "../../middleware/auth";

const router = Router();

function canonicalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

const requireAdminCheck = (req: Request, res: Response, next: any) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    return res.status(403).json({ error: "غير مصرح", message: "هذا الإجراء للمسؤولين فقط" });
  }
  next();
};

const WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET || "";

router.use(authenticate);

router.get("/my-link", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
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
    const userId = req.user!.id;
    const { phoneNumber } = req.body;

    if (!phoneNumber || phoneNumber.length < 8) {
      return res.status(400).json({ error: "رقم هاتف غير صالح" });
    }

    const canonical = canonicalizePhone(phoneNumber);

    if (canonical.length < 8) {
      return res.status(400).json({ error: "رقم هاتف غير صالح" });
    }

    const phoneInUse = await db.select()
      .from(whatsappUserLinks)
      .where(and(
        eq(whatsappUserLinks.phoneNumber, canonical),
        ne(whatsappUserLinks.user_id, userId)
      ))
      .limit(1);

    if (phoneInUse.length > 0) {
      return res.status(409).json({ error: "هذا الرقم مسجل بالفعل لمستخدم آخر" });
    }

    const existing = await db.select()
      .from(whatsappUserLinks)
      .where(eq(whatsappUserLinks.user_id, userId))
      .limit(1);

    if (existing.length > 0) {
      await db.update(whatsappUserLinks)
        .set({ phoneNumber: canonical, isActive: true })
        .where(eq(whatsappUserLinks.user_id, userId));
      return res.json({ success: true, message: "تم تحديث رقم الواتساب بنجاح" });
    }

    await db.insert(whatsappUserLinks).values({
      user_id: userId,
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
    const userId = req.user!.id;
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

router.get("/status", (req: Request, res: Response) => {
  const bot = getWhatsAppBot();
  const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';

  res.json({
    status: bot.getStatus(),
    qr: isAdmin ? bot.getQR() : null,
    pairingCode: isAdmin ? bot.getPairingCode() : null,
    lastError: isAdmin ? bot.getLastError() : null,
    needsRelink: isAdmin ? bot.getNeedsRelink() : false,
    protection: isAdmin ? bot.getProtectionStats() : { dailyMessageCount: 0, dailyLimit: 50 }
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

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = await storage.getWhatsAppStats();
    res.json({
      totalMessages: stats?.totalMessages || 0,
      lastSync: stats?.lastSync || null,
      accuracy: stats?.accuracy || "0%",
      status: stats?.status || "idle",
      phoneNumber: stats?.phoneNumber || null
    });
  } catch (error: any) {
    console.error("❌ [WhatsApp Stats] Error:", error?.message || error);
    res.json({
      totalMessages: 0,
      lastSync: null,
      accuracy: "0%",
      status: "idle",
      phoneNumber: null
    });
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
    const { phoneNumber, label } = req.body;
    if (!phoneNumber || phoneNumber.length < 8) {
      return res.status(400).json({ error: "رقم هاتف غير صالح" });
    }
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

export default router;
