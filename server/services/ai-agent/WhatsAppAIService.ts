import { AIAgentService, getAIAgentService } from "./AIAgentService";
import { db } from "../../db";
import { workers, projects, wellExpenses, wells } from "@shared/schema";
import { eq, ilike, and, sql } from "drizzle-orm";

export interface WhatsAppContext {
  step: 'idle' | 'awaiting_project' | 'awaiting_days' | 'awaiting_type';
  data: {
    amount?: string;
    workerId?: string;
    workerName?: string;
    projectId?: string;
    projectName?: string;
    workDays?: string;
    expenseType?: string;
  };
}

export class WhatsAppAIService {
  private aiAgent: AIAgentService;
  private sessions: Map<string, WhatsAppContext> = new Map();

  constructor() {
    this.aiAgent = getAIAgentService();
  }

  async handleIncomingMessage(senderPhone: string, message: string, allowedPhone: string) {
    if (senderPhone !== allowedPhone) return null;

    const msg = message.trim();
    let context = this.sessions.get(senderPhone) || { step: 'idle', data: {} };

    if (msg.toLowerCase() === 'إلغاء' || msg === 'خروج') {
      this.sessions.delete(senderPhone);
      return "تم إلغاء العملية الحالية. يمكنك البدء من جديد بإرسال المصروف (مثلاً: 5000 مصاريف عبدالله).";
    }

    // Step 0: Initial matching
    if (context.step === 'idle') {
      const expenseMatch = msg.match(/(\d+)\s+مصاريف\s+(.+)/i);
      if (expenseMatch) {
        const amount = expenseMatch[1];
        const workerName = expenseMatch[2].trim();

        const workerResult = await db.select().from(workers).where(ilike(workers.name, `%${workerName}%`)).limit(1);

        if (workerResult.length > 0) {
          const worker = workerResult[0];
          const activeProjects = await db.select().from(projects).where(eq(projects.status, 'active')).limit(5);
          
          context.step = 'awaiting_project';
          context.data = { amount, workerId: worker.id, workerName: worker.name };
          this.sessions.set(senderPhone, context);

          let reply = `✅ وجدنا العامل: ${worker.name}\nالمبلغ: ${amount} ريال.\n\nيرجى اختيار المشروع (أرسل اسم المشروع أو جزء منه):`;
          if (activeProjects.length > 0) {
            reply += `\n` + activeProjects.map((p, i) => `${i+1}. ${p.name}`).join('\n');
          }
          return reply;
        } else {
          return `❌ لم أجد عامل باسم "${workerName}". يرجى التأكد من الاسم.`;
        }
      }
    }

    // Step 1: Handle Project Selection
    if (context.step === 'awaiting_project') {
      const projectResult = await db.select().from(projects).where(ilike(projects.name, `%${msg}%`)).limit(1);
      if (projectResult.length > 0) {
        context.data.projectId = projectResult[0].id;
        context.data.projectName = projectResult[0].name;
        context.step = 'awaiting_days';
        this.sessions.set(senderPhone, context);
        return `👍 تم تحديد مشروع: ${projectResult[0].name}\n\nكم عدد الأيام؟ (مثلاً: 1 أو 0.5)`;
      }
      return "❌ لم أجد المشروع. يرجى كتابة اسم المشروع بشكل أدق أو إرسال 'إلغاء'.";
    }

    // Step 2: Handle Days
    if (context.step === 'awaiting_days') {
      const days = parseFloat(msg);
      if (!isNaN(days)) {
        context.data.workDays = days.toString();
        context.step = 'awaiting_type';
        this.sessions.set(senderPhone, context);
        return `تم تسجيل ${days} يوم. \n\nأخيراً، ما هو نوع المصروف؟\n1. أجور\n2. مواد\n3. تحويلة\n4. أخرى`;
      }
      return "⚠️ يرجى إدخال رقم صحيح لعدد الأيام.";
    }

    // Step 3: Finalize and Save
    if (context.step === 'awaiting_type') {
      try {
        const { amount, workerId, projectId, workDays } = context.data;
        
        // جلب الأجر اليومي للعامل
        const worker = await db.select().from(workers).where(eq(workers.id, workerId!)).limit(1);
        const dailyWage = worker[0]?.dailyWage || "0";

        // إضافة سجل الحضور والمصاريف
        const [attendance] = await db.insert(workerAttendance).values({
          projectId: projectId!,
          workerId: workerId!,
          attendanceDate: new Date().toISOString().split('T')[0],
          workDays: workDays!,
          dailyWage: dailyWage.toString(),
          totalPay: amount!,
          paidAmount: amount!,
          notes: `قيد آلي عبر واتساب - ${msg}`
        }).returning();

        // ربط المصروف بالبئر إذا كان هناك بئر مرتبط (اختياري)
        // حالياً نكتفي بتسجيل الحضور والصرف المالي

        const summary = `✅ تم اعتماد وحفظ المصروف في النظام:\n\n` +
                        `👤 العامل: ${context.data.workerName}\n` +
                        `🏗️ المشروع: ${context.data.projectName}\n` +
                        `💰 المبلغ: ${context.data.amount} ريال\n` +
                        `📅 الأيام: ${context.data.workDays}\n` +
                        `🏷️ النوع: ${msg}\n\n` +
                        `رقم السجل: ${attendance.id}`;
        
        this.sessions.delete(senderPhone);
        return summary;
      } catch (error: any) {
        console.error('❌ [WhatsAppAI] Error saving expense:', error);
        return `❌ حدث خطأ أثناء حفظ البيانات: ${error.message}. يرجى المحاولة لاحقاً أو إرسال 'إلغاء'.`;
      }
    }

    // Fallback to AI Agent for general talk
    try {
      const response = await this.aiAgent.processMessage(`wa_${senderPhone}`, msg, "system_whatsapp");
      return response.message;
    } catch (e) {
      return "عذراً، لم أفهم طلبك. يمكنك إرسال المصاريف بالشكل التالي: (المبلغ) مصاريف (اسم العامل).";
    }
  }
}

let instance: WhatsAppAIService | null = null;
export function getWhatsAppAIService() {
  if (!instance) instance = new WhatsAppAIService();
  return instance;
}
