import { AIAgentService, getAIAgentService } from "./AIAgentService";
import { WhatsAppSecurityContext } from "./WhatsAppSecurityContext";
import { db } from "../../db";
import { storage } from "../../storage";
import { workers, projects, workerAttendance, whatsappUserLinks, whatsappMessages, aiChatSessions } from "@shared/schema";
import { eq, ilike, and, sql, inArray } from "drizzle-orm";
import {
  BotReply,
  buildWelcomeReply,
  buildMenuReply,
  buildTextWithMenu,
  buildQuickOptions,
  resolveUserInput,
} from "./whatsapp/InteractiveMenu";
import {
  bold,
  formatExpenseSummary,
  formatProjectList,
  formatHelp,
  formatConfirmation,
  formatError,
  formatProjectSelection,
  formatDaysPrompt,
  formatExpenseTypePrompt,
} from "./whatsapp/MessageFormatter";

export interface WhatsAppContext {
  step: 'idle' | 'awaiting_project' | 'awaiting_days' | 'awaiting_type';
  userId: string;
  userName: string;
  menuStack: string[];
  currentMenu: string;
  data: {
    amount?: string;
    workerId?: string;
    workerName?: string;
    projectId?: string;
    projectName?: string;
    workDays?: string;
    expenseType?: string;
    activeProjects?: { id: string; name: string }[];
  };
}

function textReply(body: string): BotReply {
  return { type: 'text', body };
}

function addNavFooter(body: string): string {
  return `${body}\n\n━━━━━━━━━━━━━━━━━━\n💡 أرسل *0* للقائمة الرئيسية | *#* رجوع`;
}

export class WhatsAppAIService {
  private aiAgent: AIAgentService;
  private sessions: Map<string, WhatsAppContext> = new Map();
  private waSessionIds: Map<string, string> = new Map();

  constructor() {
    this.aiAgent = getAIAgentService();
  }

  private async getOrCreateAISession(userId: string, senderPhone: string): Promise<string> {
    const cacheKey = `${userId}_${senderPhone}`;
    const cached = this.waSessionIds.get(cacheKey);
    if (cached) {
      const check = await db.select({ id: aiChatSessions.id }).from(aiChatSessions)
        .where(and(eq(aiChatSessions.id, cached), eq(aiChatSessions.user_id, userId)))
        .limit(1);
      if (check.length > 0) return cached;
    }
    const sessionId = await this.aiAgent.createSession(userId, `محادثة واتساب - ${senderPhone}`);
    this.waSessionIds.set(cacheKey, sessionId);
    return sessionId;
  }

  async handleIncomingMessage(
    senderPhone: string,
    message: string,
    inputType: 'text' | 'button' | 'list' = 'text',
    inputId?: string
  ): Promise<BotReply> {
    const securityContext = await WhatsAppSecurityContext.fromPhone(senderPhone);

    if (!securityContext.userId) {
      return textReply("❌ رقمك غير مسجل في النظام.\n\nيرجى ربط رقم الواتساب من حسابك في التطبيق أولاً.");
    }

    const { userId, userName, role, isAdmin } = securityContext;
    const userProjectIds = securityContext.accessibleProjectIds;

    try {
      await db.update(whatsappUserLinks)
        .set({
          lastMessageAt: new Date(),
          totalMessages: sql`${whatsappUserLinks.totalMessages} + 1`
        })
        .where(and(
          eq(whatsappUserLinks.isActive, true),
          eq(whatsappUserLinks.phoneNumber, senderPhone.replace(/\D/g, ''))
        ));
    } catch (e) {}

    const cleanPhone = senderPhone.replace(/\D/g, '');
    try {
      await storage.createWhatsAppMessage({
        sender: cleanPhone,
        wa_id: 'bot',
        content: message.trim().substring(0, 5000),
        status: 'received',
        phone_number: cleanPhone,
        user_id: userId,
        is_authorized: true,
        security_scope: { role, projectIds: userProjectIds, isAdmin },
      });
    } catch (e) {
      console.error('[WhatsAppAI] Failed to log message:', e);
    }

    const effectiveInput = inputId || message.trim();
    let context = this.sessions.get(senderPhone) || {
      step: 'idle' as const,
      userId,
      userName,
      menuStack: [],
      currentMenu: 'main',
      data: {},
    };

    if (context.userId !== userId) {
      context = { step: 'idle', userId, userName, menuStack: [], currentMenu: 'main', data: {} };
    }

    if (!this.sessions.has(senderPhone)) {
      this.sessions.set(senderPhone, context);
      return buildWelcomeReply(userName);
    }

    if (context.step !== 'idle') {
      return this.handleFlowStep(context, effectiveInput, senderPhone, userName, securityContext, userProjectIds);
    }

    const resolved = resolveUserInput(effectiveInput, context.currentMenu);

    if (resolved.action === 'cancel') {
      this.sessions.delete(senderPhone);
      const lines = [
        formatConfirmation(`تم إلغاء العملية يا ${userName}.`),
        ``,
        `ماذا تريد أن تفعل الآن؟`,
      ];
      return buildTextWithMenu('تم الإلغاء', lines.join('\n'), 'main');
    }

    if (resolved.action === 'navigate' && resolved.targetMenuId === 'main') {
      context.menuStack = [];
      context.currentMenu = 'main';
      this.sessions.set(senderPhone, context);
      return buildWelcomeReply(userName);
    }

    if (resolved.action === 'navigate' && resolved.targetMenuId) {
      if (context.currentMenu !== resolved.targetMenuId) {
        context.menuStack.push(context.currentMenu);
      }
      context.currentMenu = resolved.targetMenuId;
      this.sessions.set(senderPhone, context);
      return buildMenuReply(resolved.targetMenuId);
    }

    if (resolved.action === 'menu_select' && resolved.selectedOptionId) {
      return this.handleMenuAction(resolved.selectedOptionId, context, senderPhone, userName, securityContext, userProjectIds);
    }

    if (resolved.action === 'free_text') {
      return this.handleFreeText(effectiveInput, context, senderPhone, userId, userName, securityContext, userProjectIds, role, isAdmin);
    }

    return buildWelcomeReply(userName);
  }

  private async handleMenuAction(
    actionId: string,
    context: WhatsAppContext,
    senderPhone: string,
    userName: string,
    securityContext: WhatsAppSecurityContext,
    userProjectIds: string[]
  ): Promise<BotReply> {

    if (actionId === 'expense_add') {
      if (!securityContext.canAdd) {
        return textReply(addNavFooter(`❌ عذراً *${userName}*، ليس لديك صلاحية لإضافة مصروفات عبر هذا الرقم.`));
      }
      context.step = 'idle';
      context.currentMenu = 'expenses';
      this.sessions.set(senderPhone, context);
      const lines = [
        `━━━━━━━━━━━━━━━━━━`,
        `📌  *تسجيل مصروف جديد*`,
        `━━━━━━━━━━━━━━━━━━`,
        ``,
        `✏️ أرسل المصروف بالصيغة التالية:`,
        ``,
        `   *المبلغ مصاريف اسم_العامل*`,
        ``,
        `📝 *أمثلة:*`,
        `   • 5000 مصاريف أحمد`,
        `   • 3000 مصاريف محمد علي`,
        ``,
        `━━━━━━━━━━━━━━━━━━`,
        `💡 أرسل *إلغاء* للرجوع`,
      ];
      return textReply(lines.join('\n'));
    }

    if (actionId === 'expense_summary') {
      return this.showExpenseSummary(userProjectIds);
    }

    if (actionId === 'projects_list') {
      return this.showProjectsList(userProjectIds);
    }

    if (actionId === 'projects_status') {
      return this.showProjectsStatus(userProjectIds);
    }

    if (actionId === 'report_daily' || actionId === 'report_project') {
      context.currentMenu = 'ai_freetext';
      this.sessions.set(senderPhone, context);
      const lines = [
        `✏️ اكتب سؤالك مباشرة وسأجيبك.`,
        ``,
        `📝 *أمثلة:*`,
        `   • تقرير مصروفات اليوم`,
        `   • ملخص مشروع الرياض`,
        `   • كشف حساب العامل أحمد`,
        `   • إجمالي المصروفات هذا الشهر`,
      ];
      return textReply(addNavFooter(lines.join('\n')));
    }

    if (actionId === 'report_ask') {
      context.currentMenu = 'ai_freetext';
      this.sessions.set(senderPhone, context);
      return textReply(addNavFooter(`🤖 *اسأل الذكاء الاصطناعي*\n\nاكتب سؤالك أو طلبك وسأحاول مساعدتك.\n\n📝 مثال: "كم إجمالي المصروفات؟" أو "أعطني تقرير المشاريع"`));
    }

    if (actionId === 'help_commands') {
      return textReply(addNavFooter(formatHelp(userName)));
    }

    if (actionId === 'help_contact') {
      return textReply(addNavFooter(`📞 *الدعم الفني*\n\nللتواصل مع الدعم، أرسل وصف المشكلة وسيتم الرد عليك في أقرب وقت.`));
    }

    return buildMenuReply(context.currentMenu);
  }

  private async handleFlowStep(
    context: WhatsAppContext,
    effectiveInput: string,
    senderPhone: string,
    userName: string,
    securityContext: WhatsAppSecurityContext,
    userProjectIds: string[]
  ): Promise<BotReply> {
    const resolved = resolveUserInput(effectiveInput);

    if (resolved.action === 'cancel') {
      this.sessions.delete(senderPhone);
      return buildTextWithMenu('تم الإلغاء', formatConfirmation(`تم إلغاء العملية يا ${userName}.`), 'main');
    }
    if (resolved.action === 'navigate' && resolved.targetMenuId === 'main') {
      context.step = 'idle';
      context.menuStack = [];
      context.currentMenu = 'main';
      context.data = {};
      this.sessions.set(senderPhone, context);
      return buildWelcomeReply(userName);
    }

    if (context.step === 'awaiting_project') {
      return this.handleProjectSelection(context, effectiveInput, senderPhone, userName, securityContext, userProjectIds);
    }

    if (context.step === 'awaiting_days') {
      return this.handleDaysInput(context, effectiveInput, senderPhone, userName);
    }

    if (context.step === 'awaiting_type') {
      return this.handleTypeSelection(context, effectiveInput, senderPhone, userName, userProjectIds);
    }

    context.step = 'idle';
    this.sessions.set(senderPhone, context);
    return buildWelcomeReply(userName);
  }

  private async handleProjectSelection(
    context: WhatsAppContext,
    input: string,
    senderPhone: string,
    userName: string,
    securityContext: WhatsAppSecurityContext,
    userProjectIds: string[]
  ): Promise<BotReply> {
    let projectResult;
    const cachedProjects = context.data.activeProjects || [];

    const projectIdMatch = input.match(/^select_project_(.+)$/);
    if (projectIdMatch) {
      projectResult = await db.select().from(projects)
        .where(and(eq(projects.id, projectIdMatch[1]), inArray(projects.id, userProjectIds)))
        .limit(1);
    }

    if (!projectResult || projectResult.length === 0) {
      const indexMatch = input.match(/^(\d+)$/);
      if (indexMatch && cachedProjects.length > 0) {
        const idx = parseInt(indexMatch[1]) - 1;
        if (idx >= 0 && idx < cachedProjects.length) {
          projectResult = await db.select().from(projects)
            .where(and(eq(projects.id, cachedProjects[idx].id), inArray(projects.id, userProjectIds)))
            .limit(1);
        }
      }
    }

    if (!projectResult || projectResult.length === 0) {
      projectResult = await db.select().from(projects)
        .where(and(ilike(projects.name, `%${input}%`), inArray(projects.id, userProjectIds)))
        .limit(1);
    }

    if (projectResult && projectResult.length > 0) {
      const selectedProject = projectResult[0];
      const canAdd = await securityContext.canAddToProject(selectedProject.id);
      if (!canAdd) {
        return textReply(addNavFooter(`❌ ليس لديك صلاحية إضافة مصروفات على مشروع "*${selectedProject.name}*".`));
      }

      context.data.projectId = selectedProject.id;
      context.data.projectName = selectedProject.name;
      context.step = 'awaiting_days';
      this.sessions.set(senderPhone, context);

      const lines = [
        `━━━━━━━━━━━━━━━━━━`,
        `📌  *عدد أيام العمل*`,
        `━━━━━━━━━━━━━━━━━━`,
        ``,
        formatConfirmation(`تم اختيار: ${selectedProject.name}`),
        ``,
        formatDaysPrompt(),
        ``,
        `⚡ *اختيار سريع:*`,
        `  1️⃣  *1.*  يوم كامل`,
        `  🔀  *2.*  نصف يوم`,
        ``,
        `أو اكتب العدد مباشرة (مثل: 0.5، 1، 2)`,
        ``,
        `━━━━━━━━━━━━━━━━━━`,
        `💡 أرسل *إلغاء* للرجوع`,
      ];
      return textReply(lines.join('\n'));
    }

    return textReply(addNavFooter(formatError(`لم أجد المشروع. اكتب اسمه أو رقمه من القائمة، أو أرسل *إلغاء*.`)));
  }

  private async handleDaysInput(
    context: WhatsAppContext,
    input: string,
    senderPhone: string,
    userName: string
  ): Promise<BotReply> {
    let days: number;

    if (input === '1' || input === 'يوم') {
      days = 1;
    } else if (input === '2' || input === 'نصف') {
      days = 0.5;
    } else {
      days = parseFloat(input);
    }

    if (isNaN(days) || days <= 0) {
      return textReply(addNavFooter(formatError(`يرجى إدخال رقم صحيح لعدد الأيام.\nمثال: 1 أو 0.5`)));
    }

    context.data.workDays = days.toString();
    context.step = 'awaiting_type';
    this.sessions.set(senderPhone, context);

    const lines = [
      `━━━━━━━━━━━━━━━━━━`,
      `📌  *نوع المصروف*`,
      `━━━━━━━━━━━━━━━━━━`,
      ``,
      formatConfirmation(`تم: ${days} يوم`),
      ``,
      formatExpenseTypePrompt(),
      ``,
      `━━━━━━━━━━━━━━━━━━`,
      `💡 أرسل *الرقم* أو *اسم النوع* | *إلغاء* للرجوع`,
    ];
    return textReply(lines.join('\n'));
  }

  private async handleTypeSelection(
    context: WhatsAppContext,
    input: string,
    senderPhone: string,
    userName: string,
    userProjectIds: string[]
  ): Promise<BotReply> {
    const typeMap: Record<string, string> = {
      '1': 'أجور', '2': 'مواد', '3': 'تحويلة', '4': 'أخرى',
      'أجور': 'أجور', 'مواد': 'مواد', 'تحويلة': 'تحويلة', 'أخرى': 'أخرى',
      'type_wages': 'أجور', 'type_materials': 'مواد', 'type_transfer': 'تحويلة',
    };

    const expenseType = typeMap[input];
    if (!expenseType) {
      return textReply(addNavFooter(formatError(`اختيار غير صحيح. أرسل رقم من 1 إلى 4.`)));
    }

    try {
      const { amount, workerId, projectId, workDays } = context.data;

      const worker = await db.select().from(workers).where(eq(workers.id, workerId!)).limit(1);
      const dailyWage = worker[0]?.dailyWage || "0";

      const todayDate = new Date().toISOString().split('T')[0];
      const [attendance] = await db.insert(workerAttendance).values({
        project_id: projectId!,
        worker_id: workerId!,
        attendanceDate: todayDate,
        date: todayDate,
        workDays: workDays!,
        dailyWage: dailyWage.toString(),
        totalPay: amount!,
        paidAmount: amount!,
        notes: `📱 واتساب | ${userName} | ${expenseType}`
      }).returning();

      const summaryText = formatExpenseSummary({
        workerName: context.data.workerName || '',
        projectName: context.data.projectName || '',
        amount: context.data.amount || '',
        days: context.data.workDays || '',
        type: expenseType,
        recordId: attendance.id,
      });

      this.sessions.delete(senderPhone);

      const lines = [
        summaryText,
        ``,
        `ماذا تريد أن تفعل الآن؟`,
      ];
      return buildTextWithMenu('تم بنجاح', lines.join('\n'), 'main');
    } catch (error: any) {
      console.error('[WhatsAppAI] Error saving expense:', error);
      return textReply(addNavFooter(formatError(`حدث خطأ أثناء الحفظ: ${error.message}\nأرسل *إلغاء* وحاول مرة أخرى.`)));
    }
  }

  private async showExpenseSummary(userProjectIds: string[]): Promise<BotReply> {
    if (userProjectIds.length === 0) {
      return textReply(addNavFooter('📋 لا توجد مشاريع مرتبطة بحسابك.'));
    }

    const activeProjects = await db.select().from(projects)
      .where(and(eq(projects.status, 'active'), inArray(projects.id, userProjectIds)))
      .limit(10);

    if (activeProjects.length === 0) {
      return textReply(addNavFooter('📋 لا توجد مشاريع نشطة حالياً.'));
    }

    const lines = [
      `━━━━━━━━━━━━━━━━━━`,
      `📌  *ملخص المصروفات*`,
      `━━━━━━━━━━━━━━━━━━`,
      ``,
      `اختر رقم المشروع لعرض ملخصه:`,
      ``,
    ];
    activeProjects.forEach((p, i) => {
      lines.push(`  🟢  *${i + 1}.*  ${p.name}`);
    });
    lines.push(``);
    lines.push(`━━━━━━━━━━━━━━━━━━`);
    lines.push(`💡 أرسل *رقم* المشروع | *0* القائمة | *#* رجوع`);
    return textReply(lines.join('\n'));
  }

  private async showProjectsList(userProjectIds: string[]): Promise<BotReply> {
    if (userProjectIds.length === 0) {
      return textReply(addNavFooter('📂 لا توجد مشاريع مرتبطة بحسابك.'));
    }

    const userProjects = await db.select().from(projects)
      .where(inArray(projects.id, userProjectIds))
      .limit(20);

    if (userProjects.length === 0) {
      return textReply(addNavFooter('📂 لا توجد مشاريع.'));
    }

    const body = formatProjectList(userProjects.map(p => ({ name: p.name, status: p.status, id: p.id })));
    return textReply(addNavFooter(body));
  }

  private async showProjectsStatus(userProjectIds: string[]): Promise<BotReply> {
    const userProjects = await db.select().from(projects)
      .where(inArray(projects.id, userProjectIds))
      .limit(20);

    const active = userProjects.filter(p => p.status === 'active').length;
    const completed = userProjects.filter(p => p.status === 'completed').length;
    const paused = userProjects.filter(p => p.status !== 'active' && p.status !== 'completed').length;

    const lines = [
      `━━━━━━━━━━━━━━━━━━`,
      `📌  *إحصائيات المشاريع*`,
      `━━━━━━━━━━━━━━━━━━`,
      ``,
      `  🟢  نشط:     *${active}*`,
      `  ✅  مكتمل:   *${completed}*`,
      `  🟡  متوقف:   *${paused}*`,
      `  📊  الإجمالي: *${userProjects.length}*`,
      ``,
      `  📂  أرسل *1* لعرض تفاصيل المشاريع`,
    ];
    return textReply(addNavFooter(lines.join('\n')));
  }

  private async handleFreeText(
    input: string,
    context: WhatsAppContext,
    senderPhone: string,
    userId: string,
    userName: string,
    securityContext: WhatsAppSecurityContext,
    userProjectIds: string[],
    role: string,
    isAdmin: boolean
  ): Promise<BotReply> {

    const expenseMatch = input.match(/(\d+)\s+مصاريف\s+(.+)/i);
    if (expenseMatch) {
      if (!securityContext.canAdd) {
        return textReply(addNavFooter(`❌ عذراً *${userName}*، ليس لديك صلاحية لإضافة مصروفات.`));
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
          .where(and(eq(projects.status, 'active'), inArray(projects.id, userProjectIds)))
          .limit(10);

        context.step = 'awaiting_project';
        context.data = {
          amount,
          workerId: worker.id,
          workerName: worker.name,
          activeProjects: activeProjects.map(p => ({ id: p.id, name: p.name })),
        };
        this.sessions.set(senderPhone, context);

        const projectLines = activeProjects.map((p, i) => `  🏗️  *${i + 1}.*  ${p.name}`).join('\n');
        const lines = [
          `━━━━━━━━━━━━━━━━━━`,
          `📌  *اختيار المشروع*`,
          `━━━━━━━━━━━━━━━━━━`,
          ``,
          `👷 *العامل:* ${worker.name}`,
          `💰 *المبلغ:* ${amount} ريال`,
          ``,
          `اختر رقم المشروع:`,
          ``,
          projectLines,
          ``,
          `━━━━━━━━━━━━━━━━━━`,
          `💡 أرسل *رقم* المشروع أو اسمه | *إلغاء* للرجوع`,
        ];
        return textReply(lines.join('\n'));
      } else {
        return textReply(addNavFooter(formatError(`لم أجد عامل باسم "${workerName}" في مشاريعك.\nتأكد من الاسم وحاول مرة أخرى.`)));
      }
    }

    const greetings = ['السلام عليكم', 'سلام', 'مرحبا', 'مرحبًا', 'هلا', 'الو', 'اهلا', 'أهلا', 'هاي', 'hi', 'hello', 'hey'];
    if (greetings.some(g => input.toLowerCase().includes(g))) {
      return buildWelcomeReply(userName);
    }

    if (userProjectIds.length === 0) {
      return textReply(addNavFooter(`مرحباً *${userName}*، لا توجد مشاريع مرتبطة بحسابك حالياً.\nيرجى التواصل مع المسؤول.`));
    }

    if (!securityContext.canRead) {
      return textReply(addNavFooter(`❌ عذراً *${userName}*، ليس لديك صلاحية قراءة البيانات.\nتواصل مع المسؤول لتفعيل الصلاحية.`));
    }

    try {
      const sessionId = await this.getOrCreateAISession(userId, senderPhone);

      const response = await this.aiAgent.processMessage(
        sessionId,
        input,
        userId,
        securityContext
      );

      try {
        const cleanPhoneOut = senderPhone.replace(/\D/g, '');
        await storage.createWhatsAppMessage({
          sender: 'bot',
          wa_id: cleanPhoneOut,
          content: response.message.substring(0, 5000),
          status: 'sent',
          phone_number: cleanPhoneOut,
          user_id: userId,
          is_authorized: true,
          security_scope: { role, projectIds: userProjectIds, isAdmin },
        });
      } catch (e2) {
        console.error('[WhatsAppAI] Failed to log outgoing message:', e2);
      }

      return textReply(addNavFooter(response.message));
    } catch (e: any) {
      console.error('[WhatsAppAI] AI processing error:', e);
      const lines = [
        `⚠️ لم أتمكن من معالجة طلبك حالياً.`,
        ``,
        `💡 *يمكنك تجربة:*`,
        `   • إعادة صياغة السؤال`,
        `   • اختيار خدمة من القائمة`,
      ];
      return buildTextWithMenu('حاول مرة أخرى', lines.join('\n'), 'main');
    }
  }
}

let instance: WhatsAppAIService | null = null;
export function getWhatsAppAIService() {
  if (!instance) instance = new WhatsAppAIService();
  return instance;
}
