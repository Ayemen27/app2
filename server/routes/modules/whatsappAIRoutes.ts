import { Router, Request, Response } from "express";
import { getWhatsAppAIService } from "../../services/ai-agent/WhatsAppAIService";
import { getWhatsAppBot } from "../../services/ai-agent/WhatsAppBot";
import { storage } from "../../storage";

const router = Router();

/**
 * جلب حالة البوت ورمز QR
 */
router.get("/status", (req: Request, res: Response) => {
  const bot = getWhatsAppBot();
  res.json({
    status: bot.getStatus(),
    qr: bot.getQR(),
    pairingCode: bot.getPairingCode()
  });
});

/**
 * إعادة تشغيل البوت مع إمكانية طلب كود الربط بالهاتف
 */
router.post("/restart", async (req: Request, res: Response) => {
  const { phoneNumber } = req.body;
  const bot = getWhatsAppBot();
  await bot.restart(phoneNumber);
  res.json({ success: true });
});

/**
 * webhook لاستقبال رسائل الواتساب
 */
router.post("/webhook", async (req: Request, res: Response) => {
  const { from, body } = req.body;
  // الرقم المسموح به - يجب وضعه في متغيرات البيئة
  const allowedPhone = process.env.ALLOWED_WHATSAPP_PHONE || "00966500000000";

  const whatsappService = getWhatsAppAIService();
  const reply = await whatsappService.handleIncomingMessage(from, body, allowedPhone);

  if (reply) {
    // هنا يتم إرسال الرد عبر خدمة الواتساب المستخدمة
    // حالياً نكتفي بإرجاعه في الاستجابة للمحاكاة أو الربط المستقبلي
    return res.json({ reply });
  }

  res.sendStatus(200);
});

/**
 * جلب إحصائيات الواتساب
 */
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
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
