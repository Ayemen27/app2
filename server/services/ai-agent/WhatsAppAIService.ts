import { AIAgentService, getAIAgentService } from "./AIAgentService";
import { db } from "../../db";
import { workers, projects, wellExpenses, wells, workerAttendance, whatsappUserLinks, userProjectPermissions, users } from "@shared/schema";
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

  async findUserByPhone(phone: string): Promise<{ userId: string; userName: string; role: string } | null> {
    const cleanPhone = phone.replace(/\D/g, '');

    const link = await db.select()
      .from(whatsappUserLinks)
      .where(and(
        eq(whatsappUserLinks.isActive, true),
        eq(whatsappUserLinks.phoneNumber, cleanPhone)
      ))
      .limit(1);

    if (link.length === 0) return null;

    const user = await db.select()
      .from(users)
      .where(eq(users.id, link[0].user_id))
      .limit(1);

    if (user.length === 0) return null;

    await db.update(whatsappUserLinks)
      .set({
        lastMessageAt: new Date(),
        totalMessages: sql`${whatsappUserLinks.totalMessages} + 1`
      })
      .where(eq(whatsappUserLinks.id, link[0].id));

    return {
      userId: user[0].id,
      userName: user[0].full_name || user[0].first_name || user[0].email,
      role: user[0].role
    };
  }

  async getUserProjectIds(userId: string, role: string): Promise<string[]> {
    if (role === 'admin' || role === 'super_admin') {
      const allProjects = await db.select({ id: projects.id }).from(projects);
      return allProjects.map(p => p.id);
    }

    const perms = await db.select({ project_id: userProjectPermissions.project_id })
      .from(userProjectPermissions)
      .where(and(
        eq(userProjectPermissions.user_id, userId),
        eq(userProjectPermissions.canView, true)
      ));

    const permProjectIds = perms.map(p => p.project_id);

    const engineerProjects = await db.select({ id: projects.id })
      .from(projects)
      .where(eq(projects.engineerId, userId));

    const engineerProjectIds = engineerProjects.map(p => p.id);

    const allIds = new Set([...permProjectIds, ...engineerProjectIds]);
    return Array.from(allIds);
  }

  async handleIncomingMessage(senderPhone: string, message: string) {
    const userInfo = await this.findUserByPhone(senderPhone);

    if (!userInfo) {
      return "⛔ رقمك غير مسجل في النظام.\nيرجى ربط رقم الواتساب من حسابك في التطبيق أولاً.";
    }

    const { userId, userName, role } = userInfo;
    const msg = message.trim();
    let context = this.sessions.get(senderPhone) || { step: 'idle' as const, userId, userName, data: {} };

    if (context.userId !== userId) {
      context = { step: 'idle', userId, userName, data: {} };
    }

    if (msg.toLowerCase() === 'إلغاء' || msg === 'خروج') {
      this.sessions.delete(senderPhone);
      return `تم إلغاء العملية الحالية يا ${userName}. يمكنك البدء من جديد بإرسال المصروف (مثلاً: 5000 مصاريف عبدالله).`;
    }

    const userProjectIds = await this.getUserProjectIds(userId, role);

    if (userProjectIds.length === 0) {
      return `⚠️ مرحباً ${userName}، لا توجد مشاريع مرتبطة بحسابك حالياً.\nيرجى التواصل مع المسؤول لإضافتك إلى المشاريع.`;
    }

    if (context.step === 'idle') {
      const expenseMatch = msg.match(/(\d+)\s+مصاريف\s+(.+)/i);
      if (expenseMatch) {
        const amount = expenseMatch[1];
        const workerName = expenseMatch[2].trim();

        const workerResult = await db.select().from(workers)
          .where(and(
            ilike(workers.name, `%${workerName}%`),
            userProjectIds.length > 0
              ? inArray(workers.projectId, userProjectIds)
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

          let reply = `✅ مرحباً ${userName}\nوجدنا العامل: ${worker.name}\nالمبلغ: ${amount} ريال.\n\nيرجى اختيار المشروع:`;
          if (activeProjects.length > 0) {
            reply += `\n` + activeProjects.map((p, i) => `${i+1}. ${p.name}`).join('\n');
          }
          return reply;
        } else {
          return `❌ لم أجد عامل باسم "${workerName}" في مشاريعك. يرجى التأكد من الاسم.`;
        }
      }

      if (msg === 'مشاريعي' || msg === 'مشاريع') {
        const userProjects = await db.select().from(projects)
          .where(inArray(projects.id, userProjectIds))
          .limit(20);

        if (userProjects.length === 0) {
          return `لا توجد مشاريع مرتبطة بحسابك حالياً.`;
        }

        let reply = `📋 مشاريعك (${userProjects.length}):\n\n`;
        userProjects.forEach((p, i) => {
          const statusEmoji = p.status === 'active' ? '🟢' : p.status === 'completed' ? '✅' : '🔴';
          reply += `${i+1}. ${statusEmoji} ${p.name}\n`;
        });
        return reply;
      }

      if (msg === 'مساعدة' || msg === 'help') {
        return `🤖 مرحباً ${userName}!\n\nالأوامر المتاحة:\n` +
          `📝 تسجيل مصروف: أرسل "المبلغ مصاريف اسم_العامل"\n` +
          `   مثال: 5000 مصاريف أحمد\n\n` +
          `📋 عرض مشاريعك: أرسل "مشاريعي"\n` +
          `❌ إلغاء عملية: أرسل "إلغاء"\n\n` +
          `💬 أو اكتب أي سؤال وسأحاول مساعدتك.`;
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
        context.data.projectId = projectResult[0].id;
        context.data.projectName = projectResult[0].name;
        context.step = 'awaiting_days';
        this.sessions.set(senderPhone, context);
        return `👍 تم تحديد مشروع: ${projectResult[0].name}\n\nكم عدد الأيام؟ (مثلاً: 1 أو 0.5)`;
      }
      return "❌ لم أجد المشروع في مشاريعك. يرجى كتابة اسم المشروع بشكل أدق أو رقمه من القائمة، أو إرسال 'إلغاء'.";
    }

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

        const summary = `✅ تم اعتماد وحفظ المصروف في النظام:\n\n` +
                        `👤 المستخدم: ${userName}\n` +
                        `👷 العامل: ${context.data.workerName}\n` +
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

    try {
      const response = await this.aiAgent.processMessage(`wa_${userId}_${senderPhone}`, msg, userId);
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
