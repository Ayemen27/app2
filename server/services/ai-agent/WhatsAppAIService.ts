import { AIAgentService, getAIAgentService } from "./AIAgentService";
import { db } from "../../db";
import { workers, projects, wellExpenses, wells } from "@shared/schema";
import { eq, like, and, sql } from "drizzle-orm";

export class WhatsAppAIService {
  private aiAgent: AIAgentService;

  constructor() {
    this.aiAgent = getAIAgentService();
  }

  /**
   * معالجة رسالة واردة من الواتساب
   * @param senderPhone رقم هاتف المرسل
   * @param message النص المرسل
   * @param allowedPhone الرقم المسموح له فقط (العميل المحدد)
   */
  async handleIncomingMessage(senderPhone: string, message: string, allowedPhone: string) {
    if (senderPhone !== allowedPhone) {
      return null; // تجاهل الرسائل من أرقام أخرى
    }

    console.log(`📱 [WhatsAppAI] Processing message from ${senderPhone}: ${message}`);

    // تحليل أولي للرسالة للبحث عن نمط المصاريف: "5000 مصاريف عبدالله عادل"
    const expenseMatch = message.match(/(\d+)\s+مصاريف\s+(.+)/i);
    
    if (expenseMatch) {
      const amount = expenseMatch[1];
      const workerName = expenseMatch[2].trim();

      // البحث عن العامل في قاعدة البيانات
      const workerResult = await db.select().from(workers).where(like(workers.name, `%${workerName}%`)).limit(1);

      if (workerResult.length > 0) {
        const worker = workerResult[0];
        // محاولة البحث عن مشاريع نشطة لاقتراحها
        const activeProjects = await db.select().from(projects).where(eq(projects.status, 'active')).limit(3);
        const projectsList = activeProjects.map(p => `- ${p.name}`).join('\n');

        // الرد بطلب توضيح المشروع وعدد الأيام
        return `أهلاً بك، أنا الذكاء الاصطناعي الخاص بالنظام، سأقوم بتقييد هذه المصاريف.
لقد وجدت العامل: ${worker.name}.
يرجى توضيح:
1. في أي مشروع يعمل حالياً؟ ${activeProjects.length > 0 ? `\nالمشاريع النشطة حالياً:\n${projectsList}` : ''}
2. كم عدد الأيام (مثلاً: يوم كامل، نصف يوم)؟
3. هل هذا المبلغ مقابل (أجور، مواد، أو تحويلة)؟
كما يمكنك كتابة "إلغاء" للتوقف.`;
      } else {
        return `عذراً، لم أجد عاملاً باسم "${workerName}" في النظام. يرجى التأكد من الاسم أو تزويدي ببيانات أدق.
أنا الذكاء الاصطناعي الذي سيساعدك في تقييد المصاريف.`;
      }
    }

    // إذا لم تكن الرسالة مفهومة كنمط مصروف مباشر، نستخدم الوكيل الذكي العام
    // إنشاء جلسة واتساب خاصة إذا لم تكن موجودة (يمكن استخدام معرف ثابت أو مرتبط بالهاتف)
    const sessionId = `whatsapp_${senderPhone}`;
    
    // محاكاة معالجة الوكيل الذكي
    try {
      const response = await this.aiAgent.processMessage(sessionId, message, "system_whatsapp");
      return response.message;
    } catch (error) {
      return "أنا الآن أتحدث إليك كذكاء اصطناعي مخصص لتقييد المصاريف، لم أفهم طلبك بوضوح، يرجى كتابة المصروف بشكل: (المبلغ) مصاريف (اسم العامل).";
    }
  }
}

let instance: WhatsAppAIService | null = null;
export function getWhatsAppAIService() {
  if (!instance) instance = new WhatsAppAIService();
  return instance;
}
