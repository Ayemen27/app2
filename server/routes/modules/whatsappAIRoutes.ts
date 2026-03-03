import { Router, Request, Response } from "express";
import { getWhatsAppAIService } from "../../services/ai-agent/WhatsAppAIService";

const router = Router();

/**
 * webhook لاستقبال رسائل الواتساب (مثلاً من Twilio أو Meta API)
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

export default router;
