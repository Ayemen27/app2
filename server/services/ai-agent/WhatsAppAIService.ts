import { AIAgentService, getAIAgentService } from "./AIAgentService";
import { WhatsAppSecurityContext } from "./WhatsAppSecurityContext";
import { db } from "../../db";
import { workers, projects, wellExpenses, wells, workerAttendance, whatsappUserLinks, whatsappMessages, whatsappSecurityEvents, userProjectPermissions, users } from "@shared/schema";
import { eq, ilike, and, sql, inArray } from "drizzle-orm";

export interface WhatsAppContext {
  step: 'idle' | 'awaiting_project' | 'awaiting_days' | 'awaiting_type';
  userId: string;
  userName: string;
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

  async handleIncomingMessage(senderPhone: string, message: string) {
    const securityContext = await WhatsAppSecurityContext.fromPhone(senderPhone);

    if (!securityContext.userId) {
      return "رقمك غير مسجل في النظام.\nيرجى ربط رقم الواتساب من حسابك في التطبيق أولاً.";
    }

    const { userId, userName, role, isAdmin } = securityContext;
    const userProjectIds = securityContext.accessibleProjectIds;

    await db.update(whatsappUserLinks)
      .set({
        lastMessageAt: new Date(),
        totalMessages: sql`${whatsappUserLinks.totalMessages} + 1`
      })
      .where(and(
        eq(whatsappUserLinks.isActive, true),
        eq(whatsappUserLinks.phoneNumber, senderPhone.replace(/\D/g, ''))
      ));

    try {
      await db.insert(whatsappMessages).values({
        from: senderPhone.replace(/\D/g, ''),
        to: 'bot',
        body: message.trim(),
        type: 'incoming',
        status: 'received',
        phone_number: senderPhone.replace(/\D/g, ''),
        user_id: userId,
        is_authorized: true,
        security_scope: { role, projectIds: userProjectIds, isAdmin },
      });
    } catch (e) {
      console.error('[WhatsAppAI] Failed to log message:', e);
    }

    const msg = message.trim();
    let context = this.sessions.get(senderPhone) || { step: 'idle' as const, userId, userName, data: {} };

    if (context.userId !== userId) {
      context = { step: 'idle', userId, userName, data: {} };
    }

    if (msg.toLowerCase() === 'إلغاء' || msg === 'خروج') {
      this.sessions.delete(senderPhone);
      return `تم إلغاء العملية الحالية يا ${userName}. يمكنك البدء من جديد بإرسال المصروف (مثلاً: 5000 مصاريف عبدالله).`;
    }

    if (userProjectIds.length === 0) {
      return `مرحباً ${userName}، لا توجد مشاريع مرتبطة بحسابك حالياً.\nيرجى التواصل مع المسؤول لإضافتك إلى المشاريع.`;
    }

    if (!securityContext.canRead) {
      if (msg === 'مساعدة' || msg === 'help') {
        return `مرحباً ${userName}! صلاحيتك على هذا الرقم محدودة. يرجى التواصل مع المسؤول لتفعيل صلاحية القراءة.`;
      }
      return `عذراً ${userName}، ليس لديك صلاحية قراءة البيانات عبر هذا الرقم. يرجى التواصل مع المسؤول.`;
    }

    if (context.step === 'idle') {
      const expenseMatch = msg.match(/(\d+)\s+مصاريف\s+(.+)/i);
      if (expenseMatch) {
        if (!securityContext.canAdd) {
          return `عذراً ${userName}، ليس لديك صلاحية لإضافة مصروفات عبر هذا الرقم.`;
        }

        const amount = expenseMatch[1];
        const workerName = expenseMatch[2].trim();

        const workerResult = await db.select().from(workers)
          .where(and(
            ilike(workers.name, `%${workerName}%`),
            userProjectIds.length > 0
              ? sql`${workers.id} IN (SELECT DISTINCT worker_id FROM worker_attendance WHERE project_id IN (${sql.join(userProjectIds.map(id => sql`${id}`), sql`, `)}))`
              : sql`false`
          ))
          .limit(1);

        if (workerResult.length > 0) {
          const worker = workerResult[0];
          const activeProjects = await db.select().from(projects)
            .where(and(
              eq(projects.status, 'active'),
              inArray(projects.id, userProjectIds)
            ))
            .limit(10);
          
          context.step = 'awaiting_project';
          context.data = { amount, workerId: worker.id, workerName: worker.name };
          this.sessions.set(senderPhone, context);

          let reply = `مرحباً ${userName}\nوجدنا العامل: ${worker.name}\nالمبلغ: ${amount} ريال.\n\nيرجى اختيار المشروع:`;
          if (activeProjects.length > 0) {
            reply += `\n` + activeProjects.map((p, i) => `${i+1}. ${p.name}`).join('\n');
          }
          return reply;
        } else {
          return `لم أجد عامل باسم "${workerName}" في مشاريعك. يرجى التأكد من الاسم.`;
        }
      }

      if (msg === 'مشاريعي' || msg === 'مشاريع') {
        const userProjects = await db.select().from(projects)
          .where(inArray(projects.id, userProjectIds))
          .limit(20);

        if (userProjects.length === 0) {
          return `لا توجد مشاريع مرتبطة بحسابك حالياً.`;
        }

        let reply = `مشاريعك (${userProjects.length}):\n\n`;
        userProjects.forEach((p, i) => {
          const statusText = p.status === 'active' ? 'نشط' : p.status === 'completed' ? 'مكتمل' : 'متوقف';
          reply += `${i+1}. [${statusText}] ${p.name}\n`;
        });
        return reply;
      }

      if (msg === 'مساعدة' || msg === 'help') {
        return `مرحباً ${userName}!\n\nالأوامر المتاحة:\n` +
          `- تسجيل مصروف: أرسل "المبلغ مصاريف اسم_العامل"\n` +
          `   مثال: 5000 مصاريف أحمد\n\n` +
          `- عرض مشاريعك: أرسل "مشاريعي"\n` +
          `- إلغاء عملية: أرسل "إلغاء"\n\n` +
          `أو اكتب أي سؤال وسأحاول مساعدتك.`;
      }
    }

    if (context.step === 'awaiting_project') {
      const indexMatch = msg.match(/^(\d+)$/);
      let projectResult;

      if (indexMatch) {
        const idx = parseInt(indexMatch[1]) - 1;
        const activeProjects = await db.select().from(projects)
          .where(and(
            eq(projects.status, 'active'),
            inArray(projects.id, userProjectIds)
          ))
          .limit(10);

        if (idx >= 0 && idx < activeProjects.length) {
          projectResult = [activeProjects[idx]];
        }
      }

      if (!projectResult) {
        projectResult = await db.select().from(projects)
          .where(and(
            ilike(projects.name, `%${msg}%`),
            inArray(projects.id, userProjectIds)
          ))
          .limit(1);
      }

      if (projectResult && projectResult.length > 0) {
        const selectedProject = projectResult[0];
        const canAdd = await securityContext.canAddToProject(selectedProject.id);
        if (!canAdd) {
          return `ليس لديك صلاحية إضافة مصروفات على مشروع "${selectedProject.name}". يرجى التواصل مع المسؤول.`;
        }

        context.data.projectId = selectedProject.id;
        context.data.projectName = selectedProject.name;
        context.step = 'awaiting_days';
        this.sessions.set(senderPhone, context);
        return `تم تحديد مشروع: ${selectedProject.name}\n\nكم عدد الأيام؟ (مثلاً: 1 أو 0.5)`;
      }
      return "لم أجد المشروع في مشاريعك. يرجى كتابة اسم المشروع بشكل أدق أو رقمه من القائمة، أو إرسال 'إلغاء'.";
    }

    if (context.step === 'awaiting_days') {
      const days = parseFloat(msg);
      if (!isNaN(days)) {
        context.data.workDays = days.toString();
        context.step = 'awaiting_type';
        this.sessions.set(senderPhone, context);
        return `تم تسجيل ${days} يوم. \n\nأخيراً، ما هو نوع المصروف؟\n1. أجور\n2. مواد\n3. تحويلة\n4. أخرى`;
      }
      return "يرجى إدخال رقم صحيح لعدد الأيام.";
    }

    if (context.step === 'awaiting_type') {
      try {
        const { amount, workerId, projectId, workDays } = context.data;
        
        const worker = await db.select().from(workers).where(eq(workers.id, workerId!)).limit(1);
        const dailyWage = worker[0]?.dailyWage || "0";

        const [attendance] = await db.insert(workerAttendance).values({
          projectId: projectId!,
          workerId: workerId!,
          attendanceDate: new Date().toISOString().split('T')[0],
          workDays: workDays!,
          dailyWage: dailyWage.toString(),
          totalPay: amount!,
          paidAmount: amount!,
          notes: `قيد آلي عبر واتساب - ${userName} - ${msg}`
        }).returning();

        const summary = `تم اعتماد وحفظ المصروف في النظام:\n\n` +
                        `المستخدم: ${userName}\n` +
                        `العامل: ${context.data.workerName}\n` +
                        `المشروع: ${context.data.projectName}\n` +
                        `المبلغ: ${context.data.amount} ريال\n` +
                        `الأيام: ${context.data.workDays}\n` +
                        `النوع: ${msg}\n\n` +
                        `رقم السجل: ${attendance.id}`;
        
        this.sessions.delete(senderPhone);
        return summary;
      } catch (error: any) {
        console.error('[WhatsAppAI] Error saving expense:', error);
        return `حدث خطأ أثناء حفظ البيانات: ${error.message}. يرجى المحاولة لاحقاً أو إرسال 'إلغاء'.`;
      }
    }

    try {
      const response = await this.aiAgent.processMessage(
        `wa_${userId}_${senderPhone}`,
        msg,
        userId,
        securityContext
      );

      try {
        await db.insert(whatsappMessages).values({
          from: 'bot',
          to: senderPhone.replace(/\D/g, ''),
          body: response.message.substring(0, 5000),
          type: 'outgoing',
          status: 'sent',
          phone_number: senderPhone.replace(/\D/g, ''),
          user_id: userId,
          is_authorized: true,
          security_scope: { role, projectIds: userProjectIds, isAdmin },
        });
      } catch (e2) {
        console.error('[WhatsAppAI] Failed to log outgoing message:', e2);
      }

      return response.message;
    } catch (e) {
      return "عذراً، لم أفهم طلبك. أرسل 'مساعدة' لرؤية الأوامر المتاحة.";
    }
  }
}

let instance: WhatsAppAIService | null = null;
export function getWhatsAppAIService() {
  if (!instance) instance = new WhatsAppAIService();
  return instance;
}
