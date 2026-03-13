import { AIAgentService, getAIAgentService } from "./AIAgentService";
import { WhatsAppSecurityContext } from "./WhatsAppSecurityContext";
import { db } from "../../db";
import { storage } from "../../storage";
import { reportDataService } from "../../services/reports/ReportDataService";
import { generateDailyReportExcel } from "../../services/reports/templates/DailyReportExcel";
import { generateWorkerStatementExcel } from "../../services/reports/templates/WorkerStatementExcel";
import { generatePeriodFinalExcel } from "../../services/reports/templates/PeriodFinalExcel";
import { generateDailyRangeExcel } from "../../services/reports/templates/DailyRangeExcel";
import { generateMultiProjectFinalExcel } from "../../services/reports/templates/MultiProjectFinalExcel";
import { generateDailyReportHTML } from "../../services/reports/templates/DailyReportPDF";
import { generateWorkerStatementHTML } from "../../services/reports/templates/WorkerStatementPDF";
import { generatePeriodFinalHTML } from "../../services/reports/templates/PeriodFinalPDF";
import { generateDailyRangeHTML } from "../../services/reports/templates/DailyRangePDF";
import { generateMultiProjectFinalHTML } from "../../services/reports/templates/MultiProjectFinalPDF";
import * as fs from "fs";
import * as path from "path";
import { workers, projects, workerAttendance, whatsappUserLinks, whatsappMessages, aiChatSessions, fundTransfers, materialPurchases, dailyExpenseSummaries, transportationExpenses, workerMiscExpenses } from "@shared/schema";
import { eq, ilike, and, sql, inArray, desc, sum, count } from "drizzle-orm";
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
  step: 'idle' | 'awaiting_project' | 'awaiting_days' | 'awaiting_type'
    | 'expense_awaiting_project_summary'
    | 'export_awaiting_project' | 'export_awaiting_worker' | 'export_awaiting_date'
    | 'export_awaiting_date_range' | 'export_awaiting_format' | 'export_awaiting_projects_select';
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
    exportType?: string;
    exportDate?: string;
    exportDateFrom?: string;
    exportDateTo?: string;
    exportProjectIds?: string[];
    exportProjectNames?: string[];
    availableWorkers?: { id: string; name: string }[];
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
    inputType: 'text' | 'button' | 'list' | 'image' = 'text',
    inputId?: string,
    messageMetadata?: Record<string, any>
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
        content: inputType === 'image' ? (message || '📷 صورة') : message.trim().substring(0, 5000),
        status: 'received',
        phone_number: cleanPhone,
        user_id: userId,
        is_authorized: true,
        security_scope: { role, projectIds: userProjectIds, isAdmin },
        metadata: messageMetadata || (inputType === 'image' ? { type: 'image' } : undefined),
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
      return this.showExpenseSummary(userProjectIds, context, senderPhone);
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

    if (actionId === 'export_daily' || actionId === 'export_worker' || actionId === 'export_period'
      || actionId === 'export_daily_range' || actionId === 'export_multi_project') {
      return this.startExportFlow(actionId, context, senderPhone, userName, userProjectIds);
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
    if (resolved.action === 'navigate' && resolved.targetMenuId && resolved.targetMenuId !== 'main') {
      context.step = 'idle';
      context.data = {};
      if (context.menuStack.length > 0) {
        context.currentMenu = context.menuStack.pop()!;
      } else {
        context.currentMenu = 'main';
      }
      this.sessions.set(senderPhone, context);
      return buildMenuReply(context.currentMenu);
    }

    if (context.step === 'awaiting_project') {
      return this.handleProjectSelection(context, effectiveInput, senderPhone, userName, securityContext, userProjectIds);
    }

    if (context.step === 'expense_awaiting_project_summary') {
      return this.handleExpenseProjectSummarySelection(context, effectiveInput, senderPhone, userName, userProjectIds);
    }

    if (context.step === 'awaiting_days') {
      return this.handleDaysInput(context, effectiveInput, senderPhone, userName);
    }

    if (context.step === 'awaiting_type') {
      return this.handleTypeSelection(context, effectiveInput, senderPhone, userName, userProjectIds);
    }

    if (context.step.startsWith('export_')) {
      return this.handleExportFlowStep(context, effectiveInput, senderPhone, userName, userProjectIds);
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

  private async startExportFlow(
    actionId: string,
    context: WhatsAppContext,
    senderPhone: string,
    userName: string,
    userProjectIds: string[]
  ): Promise<BotReply> {
    const exportType = actionId.replace('export_', '');
    context.data.exportType = exportType;

    if (exportType === 'worker') {
      const allWorkers = await db.select({ id: workers.id, name: workers.name })
        .from(workers)
        .where(eq(workers.is_active, true))
        .limit(30);

      if (allWorkers.length === 0) {
        return textReply(addNavFooter(`❌ لا يوجد عمال مسجلون في النظام.`));
      }

      context.step = 'export_awaiting_worker';
      context.data.availableWorkers = allWorkers.map(w => ({ id: w.id, name: w.name }));
      this.sessions.set(senderPhone, context);

      const lines = [
        `━━━━━━━━━━━━━━━━━━`,
        `📌  *كشف حساب عامل*`,
        `━━━━━━━━━━━━━━━━━━`,
        ``,
        `اختر العامل:`,
        ``,
      ];
      allWorkers.forEach((w, i) => {
        lines.push(`  👷  *${i + 1}.*  ${w.name}`);
      });
      lines.push(``);
      lines.push(`━━━━━━━━━━━━━━━━━━`);
      lines.push(`💡 أرسل *رقم* العامل أو اسمه | *0* القائمة | *#* رجوع`);
      return textReply(lines.join('\n'));
    }

    if (exportType === 'multi_project') {
      const userProjects = await db.select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(inArray(projects.id, userProjectIds))
        .limit(20);

      if (userProjects.length === 0) {
        return textReply(addNavFooter(`❌ لا توجد مشاريع متاحة.`));
      }

      context.step = 'export_awaiting_projects_select';
      context.data.activeProjects = userProjects.map(p => ({ id: p.id, name: p.name }));
      context.data.exportProjectIds = [];
      context.data.exportProjectNames = [];
      this.sessions.set(senderPhone, context);

      const lines = [
        `━━━━━━━━━━━━━━━━━━`,
        `📌  *تقرير متعدد المشاريع*`,
        `━━━━━━━━━━━━━━━━━━`,
        ``,
        `اختر المشاريع (أرسل الأرقام مفصولة بفواصل):`,
        `مثال: *1,3,5* أو *الكل*`,
        ``,
      ];
      userProjects.forEach((p, i) => {
        lines.push(`  🏗️  *${i + 1}.*  ${p.name}`);
      });
      lines.push(``);
      lines.push(`━━━━━━━━━━━━━━━━━━`);
      lines.push(`💡 أرسل الأرقام أو *الكل* | *0* القائمة | *#* رجوع`);
      return textReply(lines.join('\n'));
    }

    const userProjects = await db.select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(inArray(projects.id, userProjectIds))
      .limit(20);

    if (userProjects.length === 0) {
      return textReply(addNavFooter(`❌ لا توجد مشاريع متاحة.`));
    }

    context.step = 'export_awaiting_project';
    context.data.activeProjects = userProjects.map(p => ({ id: p.id, name: p.name }));
    this.sessions.set(senderPhone, context);

    const typeNames: Record<string, string> = {
      daily: 'كشف يومي شامل',
      period: 'تقرير فترة ختامي',
      daily_range: 'كشف يومي لفترة',
    };

    const lines = [
      `━━━━━━━━━━━━━━━━━━`,
      `📌  *${typeNames[exportType] || 'تصدير'}*`,
      `━━━━━━━━━━━━━━━━━━`,
      ``,
      `اختر المشروع:`,
      ``,
    ];
    userProjects.forEach((p, i) => {
      lines.push(`  🏗️  *${i + 1}.*  ${p.name}`);
    });
    lines.push(``);
    lines.push(`━━━━━━━━━━━━━━━━━━`);
    lines.push(`💡 أرسل *رقم* المشروع أو اسمه | *0* القائمة | *#* رجوع`);
    return textReply(lines.join('\n'));
  }

  private async handleExportFlowStep(
    context: WhatsAppContext,
    input: string,
    senderPhone: string,
    userName: string,
    userProjectIds: string[]
  ): Promise<BotReply> {
    const step = context.step;

    if (step === 'export_awaiting_project') {
      const cachedProjects = context.data.activeProjects || [];
      let selectedProject: { id: string; name: string } | null = null;

      const indexMatch = input.match(/^(\d+)$/);
      if (indexMatch && cachedProjects.length > 0) {
        const idx = parseInt(indexMatch[1]) - 1;
        if (idx >= 0 && idx < cachedProjects.length) {
          selectedProject = cachedProjects[idx];
        }
      }

      if (!selectedProject) {
        const found = cachedProjects.find(p => p.name.includes(input));
        if (found) selectedProject = found;
      }

      if (!selectedProject) {
        return textReply(addNavFooter(`❌ لم أجد المشروع. أرسل رقمه من القائمة أو اسمه.`));
      }

      context.data.projectId = selectedProject.id;
      context.data.projectName = selectedProject.name;

      if (context.data.exportType === 'daily') {
        context.step = 'export_awaiting_date';
        this.sessions.set(senderPhone, context);
        return textReply([
          `━━━━━━━━━━━━━━━━━━`,
          `📌  *تحديد التاريخ*`,
          `━━━━━━━━━━━━━━━━━━`,
          ``,
          `✅ المشروع: *${selectedProject.name}*`,
          ``,
          `📅 أرسل التاريخ بصيغة: *YYYY-MM-DD*`,
          `مثال: *${new Date().toISOString().split('T')[0]}*`,
          ``,
          `أو أرسل:`,
          `  *1.*  اليوم`,
          `  *2.*  أمس`,
          ``,
          `━━━━━━━━━━━━━━━━━━`,
          `💡 أرسل *إلغاء* للرجوع`,
        ].join('\n'));
      } else {
        context.step = 'export_awaiting_date_range';
        this.sessions.set(senderPhone, context);
        return textReply([
          `━━━━━━━━━━━━━━━━━━`,
          `📌  *تحديد الفترة*`,
          `━━━━━━━━━━━━━━━━━━`,
          ``,
          `✅ المشروع: *${selectedProject.name}*`,
          ``,
          `📅 أرسل الفترة بصيغة:`,
          `*تاريخ_البداية إلى تاريخ_النهاية*`,
          `مثال: *2025-01-01 إلى 2025-01-31*`,
          ``,
          `أو أرسل:`,
          `  *1.*  هذا الشهر`,
          `  *2.*  الشهر الماضي`,
          `  *3.*  آخر 7 أيام`,
          ``,
          `━━━━━━━━━━━━━━━━━━`,
          `💡 أرسل *إلغاء* للرجوع`,
        ].join('\n'));
      }
    }

    if (step === 'export_awaiting_worker') {
      const cachedWorkers = context.data.availableWorkers || [];
      let selectedWorker: { id: string; name: string } | null = null;

      const indexMatch = input.match(/^(\d+)$/);
      if (indexMatch && cachedWorkers.length > 0) {
        const idx = parseInt(indexMatch[1]) - 1;
        if (idx >= 0 && idx < cachedWorkers.length) {
          selectedWorker = cachedWorkers[idx];
        }
      }

      if (!selectedWorker) {
        const found = cachedWorkers.find(w => w.name.includes(input));
        if (found) selectedWorker = found;
      }

      if (!selectedWorker) {
        return textReply(addNavFooter(`❌ لم أجد العامل. أرسل رقمه من القائمة أو اسمه.`));
      }

      context.data.workerId = selectedWorker.id;
      context.data.workerName = selectedWorker.name;
      context.step = 'export_awaiting_format';
      this.sessions.set(senderPhone, context);

      return textReply([
        `━━━━━━━━━━━━━━━━━━`,
        `📌  *صيغة التصدير*`,
        `━━━━━━━━━━━━━━━━━━`,
        ``,
        `✅ العامل: *${selectedWorker.name}*`,
        ``,
        `اختر صيغة الملف:`,
        ``,
        `  📊  *1.*  Excel (اكسل)`,
        `  📄  *2.*  PDF`,
        ``,
        `━━━━━━━━━━━━━━━━━━`,
        `💡 أرسل *الرقم* | *إلغاء* للرجوع`,
      ].join('\n'));
    }

    if (step === 'export_awaiting_projects_select') {
      const cachedProjects = context.data.activeProjects || [];

      if (input === 'الكل' || input.toLowerCase() === 'all') {
        context.data.exportProjectIds = cachedProjects.map(p => p.id);
        context.data.exportProjectNames = cachedProjects.map(p => p.name);
      } else {
        const indices = input.split(/[,،\s]+/).map(s => parseInt(s.trim()) - 1).filter(i => !isNaN(i) && i >= 0 && i < cachedProjects.length);
        if (indices.length === 0) {
          return textReply(addNavFooter(`❌ اختيار غير صحيح. أرسل أرقام المشاريع مفصولة بفواصل أو *الكل*.`));
        }
        context.data.exportProjectIds = indices.map(i => cachedProjects[i].id);
        context.data.exportProjectNames = indices.map(i => cachedProjects[i].name);
      }

      context.step = 'export_awaiting_date_range';
      this.sessions.set(senderPhone, context);

      return textReply([
        `━━━━━━━━━━━━━━━━━━`,
        `📌  *تحديد الفترة*`,
        `━━━━━━━━━━━━━━━━━━`,
        ``,
        `✅ المشاريع: *${(context.data.exportProjectNames || []).join('، ')}*`,
        ``,
        `📅 أرسل الفترة بصيغة:`,
        `*تاريخ_البداية إلى تاريخ_النهاية*`,
        `مثال: *2025-01-01 إلى 2025-01-31*`,
        ``,
        `أو أرسل:`,
        `  *1.*  هذا الشهر`,
        `  *2.*  الشهر الماضي`,
        `  *3.*  آخر 7 أيام`,
        ``,
        `━━━━━━━━━━━━━━━━━━`,
        `💡 أرسل *إلغاء* للرجوع`,
      ].join('\n'));
    }

    if (step === 'export_awaiting_date') {
      const today = new Date();
      let dateStr: string;

      if (input === '1' || input === 'اليوم') {
        dateStr = today.toISOString().split('T')[0];
      } else if (input === '2' || input === 'أمس') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        dateStr = yesterday.toISOString().split('T')[0];
      } else {
        const dateMatch = input.match(/(\d{4}-\d{2}-\d{2})/);
        if (!dateMatch) {
          return textReply(addNavFooter(`❌ صيغة التاريخ غير صحيحة.\nأرسل بصيغة: *YYYY-MM-DD* أو اختر *1* (اليوم) أو *2* (أمس).`));
        }
        dateStr = dateMatch[1];
      }

      context.data.exportDate = dateStr;
      context.step = 'export_awaiting_format';
      this.sessions.set(senderPhone, context);

      return textReply([
        `━━━━━━━━━━━━━━━━━━`,
        `📌  *صيغة التصدير*`,
        `━━━━━━━━━━━━━━━━━━`,
        ``,
        `✅ المشروع: *${context.data.projectName}*`,
        `📅 التاريخ: *${dateStr}*`,
        ``,
        `اختر صيغة الملف:`,
        ``,
        `  📊  *1.*  Excel (اكسل)`,
        `  📄  *2.*  PDF`,
        ``,
        `━━━━━━━━━━━━━━━━━━`,
        `💡 أرسل *الرقم* | *إلغاء* للرجوع`,
      ].join('\n'));
    }

    if (step === 'export_awaiting_date_range') {
      const today = new Date();
      let dateFrom: string;
      let dateTo: string;

      if (input === '1' || input === 'هذا الشهر') {
        dateFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        dateTo = today.toISOString().split('T')[0];
      } else if (input === '2' || input === 'الشهر الماضي') {
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        dateFrom = lastMonth.toISOString().split('T')[0];
        dateTo = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
      } else if (input === '3' || input.includes('7 أيام') || input.includes('اسبوع')) {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFrom = weekAgo.toISOString().split('T')[0];
        dateTo = today.toISOString().split('T')[0];
      } else {
        const rangeMatch = input.match(/(\d{4}-\d{2}-\d{2})\s*(?:إلى|الى|-|to)\s*(\d{4}-\d{2}-\d{2})/);
        if (!rangeMatch) {
          return textReply(addNavFooter(`❌ صيغة الفترة غير صحيحة.\nأرسل بصيغة: *2025-01-01 إلى 2025-01-31*\nأو اختر رقم من القائمة.`));
        }
        dateFrom = rangeMatch[1];
        dateTo = rangeMatch[2];
      }

      context.data.exportDateFrom = dateFrom;
      context.data.exportDateTo = dateTo;
      context.step = 'export_awaiting_format';
      this.sessions.set(senderPhone, context);

      const summaryLines: string[] = [];
      if (context.data.exportType === 'multi_project') {
        summaryLines.push(`✅ المشاريع: *${(context.data.exportProjectNames || []).join('، ')}*`);
      } else {
        summaryLines.push(`✅ المشروع: *${context.data.projectName}*`);
      }

      return textReply([
        `━━━━━━━━━━━━━━━━━━`,
        `📌  *صيغة التصدير*`,
        `━━━━━━━━━━━━━━━━━━`,
        ``,
        ...summaryLines,
        `📅 الفترة: *${dateFrom}* إلى *${dateTo}*`,
        ``,
        `اختر صيغة الملف:`,
        ``,
        `  📊  *1.*  Excel (اكسل)`,
        `  📄  *2.*  PDF`,
        ``,
        `━━━━━━━━━━━━━━━━━━`,
        `💡 أرسل *الرقم* | *إلغاء* للرجوع`,
      ].join('\n'));
    }

    if (step === 'export_awaiting_format') {
      const formatMap: Record<string, string> = {
        '1': 'xlsx', '2': 'pdf',
        'اكسل': 'xlsx', 'excel': 'xlsx', 'xlsx': 'xlsx',
        'pdf': 'pdf', 'بي دي اف': 'pdf',
      };
      const format = formatMap[input.toLowerCase()] || formatMap[input];
      if (!format) {
        return textReply(addNavFooter(`❌ اختيار غير صحيح. أرسل *1* لـ Excel أو *2* لـ PDF.`));
      }

      return this.generateAndSendExport(context, format, senderPhone, userName);
    }

    return textReply(addNavFooter(`❌ حدث خطأ. أرسل *0* للعودة للقائمة الرئيسية.`));
  }

  private async generateAndSendExport(
    context: WhatsAppContext,
    format: string,
    senderPhone: string,
    userName: string
  ): Promise<BotReply> {
    const exportType = context.data.exportType || '';

    try {
      const reportsDir = path.join(process.cwd(), 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      let fileBuffer: Buffer | ArrayBuffer | null = null;
      let htmlContent: string | null = null;
      let fileName = '';

      const typeNames: Record<string, string> = {
        daily: 'كشف-يومي',
        worker: 'كشف-عامل',
        period: 'تقرير-فترة',
        daily_range: 'كشف-يومي-فترة',
        multi_project: 'تقرير-متعدد',
      };
      const baseName = typeNames[exportType] || 'تقرير';

      if (exportType === 'daily') {
        const data = await reportDataService.getDailyReport(context.data.projectId!, context.data.exportDate!);
        if (format === 'xlsx') {
          fileBuffer = await generateDailyReportExcel(data);
          fileName = `${baseName}-${context.data.exportDate}.xlsx`;
        } else {
          htmlContent = generateDailyReportHTML(data);
          fileName = `${baseName}-${context.data.exportDate}.html`;
        }
      } else if (exportType === 'worker') {
        const data = await reportDataService.getWorkerStatement(context.data.workerId!, {});
        if (format === 'xlsx') {
          fileBuffer = await generateWorkerStatementExcel(data);
          fileName = `${baseName}-${context.data.workerName || ''}.xlsx`;
        } else {
          htmlContent = generateWorkerStatementHTML(data);
          fileName = `${baseName}-${context.data.workerName || ''}.html`;
        }
      } else if (exportType === 'period') {
        const data = await reportDataService.getPeriodFinalReport(
          context.data.projectId!,
          context.data.exportDateFrom!,
          context.data.exportDateTo!
        );
        if (format === 'xlsx') {
          fileBuffer = await generatePeriodFinalExcel(data);
          fileName = `${baseName}-${context.data.exportDateFrom}-${context.data.exportDateTo}.xlsx`;
        } else {
          htmlContent = generatePeriodFinalHTML(data);
          fileName = `${baseName}-${context.data.exportDateFrom}-${context.data.exportDateTo}.html`;
        }
      } else if (exportType === 'daily_range') {
        const from = new Date(context.data.exportDateFrom!);
        const to = new Date(context.data.exportDateTo!);
        const dates: string[] = [];
        const current = new Date(from);
        while (current <= to) {
          dates.push(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }
        const allReports: any[] = [];
        for (const d of dates) {
          try {
            const data = await reportDataService.getDailyReport(context.data.projectId!, d);
            if (data) allReports.push(data);
          } catch {}
        }
        if (format === 'xlsx') {
          fileBuffer = await generateDailyRangeExcel(allReports);
          fileName = `${baseName}-${context.data.exportDateFrom}-${context.data.exportDateTo}.xlsx`;
        } else {
          htmlContent = generateDailyRangeHTML(allReports, context.data.exportDateFrom!, context.data.exportDateTo!);
          fileName = `${baseName}-${context.data.exportDateFrom}-${context.data.exportDateTo}.html`;
        }
      } else if (exportType === 'multi_project') {
        const projectIds = context.data.exportProjectIds || [];
        const data = await reportDataService.getMultiProjectFinalReport(
          projectIds,
          context.data.exportDateFrom!,
          context.data.exportDateTo!
        );
        if (format === 'xlsx') {
          fileBuffer = await generateMultiProjectFinalExcel(data);
          fileName = `${baseName}-${context.data.exportDateFrom}-${context.data.exportDateTo}.xlsx`;
        } else {
          htmlContent = generateMultiProjectFinalHTML(data);
          fileName = `${baseName}-${context.data.exportDateFrom}-${context.data.exportDateTo}.html`;
        }
      }

      const filePath = path.join(reportsDir, fileName);

      if (fileBuffer) {
        fs.writeFileSync(filePath, Buffer.from(fileBuffer));
      } else if (htmlContent) {
        fs.writeFileSync(filePath, htmlContent, 'utf-8');
      } else {
        throw new Error('لم يتم توليد الملف');
      }

      this.sessions.delete(senderPhone);

      const fileData = fs.readFileSync(filePath);
      const jid = senderPhone.includes('@') ? senderPhone : `${senderPhone}@s.whatsapp.net`;

      const { getWhatsAppBot } = await import('./WhatsAppBot');
      const bot = getWhatsAppBot();

      if (format === 'xlsx') {
        await bot.sendMessageSafe(jid, {
          document: fileData,
          mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          fileName: fileName,
        });
      } else {
        await bot.sendMessageSafe(jid, {
          document: fileData,
          mimetype: 'text/html',
          fileName: fileName,
        });
      }

      try { fs.unlinkSync(filePath); } catch {}

      const formatLabel = format === 'xlsx' ? 'Excel' : 'PDF';
      const lines = [
        `━━━━━━━━━━━━━━━━━━`,
        `📌  *تم التصدير بنجاح*`,
        `━━━━━━━━━━━━━━━━━━`,
        ``,
        `✅ تم إرسال ملف *${formatLabel}* بنجاح!`,
        `📎 الملف: *${fileName}*`,
        ``,
        `ماذا تريد أن تفعل الآن؟`,
      ];
      return buildTextWithMenu('تم التصدير', lines.join('\n'), 'main');
    } catch (error: any) {
      console.error('[WhatsAppAI] Export error:', error);
      this.sessions.delete(senderPhone);
      return textReply(addNavFooter(`❌ حدث خطأ أثناء التصدير: ${error.message}\n\nأرسل *0* للعودة للقائمة الرئيسية.`));
    }
  }

  private async showExpenseSummary(
    userProjectIds: string[],
    context?: WhatsAppContext,
    senderPhone?: string
  ): Promise<BotReply> {
    if (userProjectIds.length === 0) {
      return textReply(addNavFooter('📋 لا توجد مشاريع مرتبطة بحسابك.'));
    }

    const userProjects = await db.select().from(projects)
      .where(inArray(projects.id, userProjectIds))
      .limit(20);

    if (userProjects.length === 0) {
      return textReply(addNavFooter('📋 لا توجد مشاريع حالياً.'));
    }

    if (context && senderPhone) {
      context.step = 'expense_awaiting_project_summary';
      context.data.activeProjects = userProjects.map(p => ({ id: p.id, name: p.name }));
      this.sessions.set(senderPhone, context);
    }

    const lines = [
      `━━━━━━━━━━━━━━━━━━`,
      `📌  *ملخص المصروفات*`,
      `━━━━━━━━━━━━━━━━━━`,
      ``,
      `اختر رقم المشروع لعرض ملخصه:`,
      ``,
    ];
    userProjects.forEach((p, i) => {
      const statusIcon = p.status === 'active' ? '🟢' : p.status === 'completed' ? '✅' : '🟡';
      lines.push(`  ${statusIcon}  *${i + 1}.*  ${p.name}`);
    });
    lines.push(``);
    lines.push(`━━━━━━━━━━━━━━━━━━`);
    lines.push(`💡 أرسل *رقم* المشروع | *0* القائمة | *#* رجوع`);
    return textReply(lines.join('\n'));
  }

  private async handleExpenseProjectSummarySelection(
    context: WhatsAppContext,
    input: string,
    senderPhone: string,
    userName: string,
    userProjectIds: string[]
  ): Promise<BotReply> {
    const cachedProjects = context.data.activeProjects || [];
    let selectedProject: { id: string; name: string } | null = null;

    const indexMatch = input.match(/^(\d+)$/);
    if (indexMatch && cachedProjects.length > 0) {
      const idx = parseInt(indexMatch[1]) - 1;
      if (idx >= 0 && idx < cachedProjects.length) {
        selectedProject = cachedProjects[idx];
      }
    }

    if (!selectedProject) {
      const found = cachedProjects.find(p => p.name.includes(input));
      if (found) selectedProject = found;
    }

    if (!selectedProject) {
      return textReply(addNavFooter(`❌ لم أجد المشروع. أرسل رقمه من القائمة.`));
    }

    context.step = 'idle';
    context.currentMenu = 'expenses';
    this.sessions.set(senderPhone, context);

    try {
      const fundResult = await db.select({
        total: sql<string>`COALESCE(SUM(${fundTransfers.amount}::numeric), 0)`,
        count: sql<string>`COUNT(*)`,
      }).from(fundTransfers)
        .where(eq(fundTransfers.project_id, selectedProject.id));

      const expenseResult = await db.select({
        totalExpenses: sql<string>`COALESCE(SUM(${dailyExpenseSummaries.totalExpenses}::numeric), 0)`,
        totalWages: sql<string>`COALESCE(SUM(${dailyExpenseSummaries.totalWorkerWages}::numeric), 0)`,
        totalMaterials: sql<string>`COALESCE(SUM(${dailyExpenseSummaries.totalMaterialCosts}::numeric), 0)`,
        totalTransport: sql<string>`COALESCE(SUM(${dailyExpenseSummaries.totalTransportationCosts}::numeric), 0)`,
        totalMisc: sql<string>`COALESCE(SUM(${dailyExpenseSummaries.totalWorkerMiscExpenses}::numeric), 0)`,
        totalTransfers: sql<string>`COALESCE(SUM(${dailyExpenseSummaries.totalWorkerTransfers}::numeric), 0)`,
      }).from(dailyExpenseSummaries)
        .where(eq(dailyExpenseSummaries.project_id, selectedProject.id));

      const workerCount = await db.select({
        count: sql<string>`COUNT(DISTINCT ${workerAttendance.worker_id})`,
      }).from(workerAttendance)
        .where(eq(workerAttendance.project_id, selectedProject.id));

      const projectInfo = await db.select().from(projects)
        .where(eq(projects.id, selectedProject.id)).limit(1);

      const funds = parseFloat(fundResult[0]?.total || '0');
      const fundCount = parseInt(fundResult[0]?.count || '0');
      const totalExp = parseFloat(expenseResult[0]?.totalExpenses || '0');
      const wages = parseFloat(expenseResult[0]?.totalWages || '0');
      const materials = parseFloat(expenseResult[0]?.totalMaterials || '0');
      const transport = parseFloat(expenseResult[0]?.totalTransport || '0');
      const misc = parseFloat(expenseResult[0]?.totalMisc || '0');
      const transfers = parseFloat(expenseResult[0]?.totalTransfers || '0');
      const wCount = parseInt(workerCount[0]?.count || '0');
      const budget = parseFloat(projectInfo[0]?.budget || '0');
      const remaining = funds - totalExp;

      const lines = [
        `━━━━━━━━━━━━━━━━━━`,
        `📌  *ملخص مشروع: ${selectedProject.name}*`,
        `━━━━━━━━━━━━━━━━━━`,
        ``,
      ];

      if (budget > 0) {
        const usedPercent = Math.round((totalExp / budget) * 100);
        const bar = '█'.repeat(Math.min(Math.round(usedPercent / 10), 10)) + '░'.repeat(10 - Math.min(Math.round(usedPercent / 10), 10));
        lines.push(`💰 *الميزانية:* ${budget.toLocaleString()} ر.س`);
        lines.push(`   ${bar} ${usedPercent}%`);
        lines.push(``);
      }

      lines.push(`📥 *الإيرادات*`);
      lines.push(`   التحويلات: *${funds.toLocaleString()}* ر.س (${fundCount} حوالة)`);
      lines.push(``);

      lines.push(`📤 *المصروفات*`);
      lines.push(`   👷 أجور العمال: *${wages.toLocaleString()}* ر.س`);
      lines.push(`   🧱 مواد البناء: *${materials.toLocaleString()}* ر.س`);
      lines.push(`   🚛 مواصلات: *${transport.toLocaleString()}* ر.س`);
      lines.push(`   💸 تحويلات عمال: *${transfers.toLocaleString()}* ر.س`);
      lines.push(`   📦 نثريات: *${misc.toLocaleString()}* ر.س`);
      lines.push(`   ─────────────────`);
      lines.push(`   📊 الإجمالي: *${totalExp.toLocaleString()}* ر.س`);
      lines.push(``);

      lines.push(`━━━━━━━━━━━━━━━━━━`);
      if (remaining >= 0) {
        lines.push(`💵 *الرصيد المتبقي:* ${remaining.toLocaleString()} ر.س ✅`);
      } else {
        lines.push(`💵 *العجز:* ${Math.abs(remaining).toLocaleString()} ر.س ❌`);
      }
      lines.push(`👷 *عدد العمال:* ${wCount}`);

      return textReply(addNavFooter(lines.join('\n')));
    } catch (error: any) {
      console.error('[WhatsAppAI] Error fetching project summary:', error);
      return textReply(addNavFooter(`❌ حدث خطأ أثناء جلب البيانات.`));
    }
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
    if (userProjectIds.length === 0) {
      return textReply(addNavFooter('📊 لا توجد مشاريع مرتبطة بحسابك.'));
    }

    const userProjects = await db.select().from(projects)
      .where(inArray(projects.id, userProjectIds))
      .limit(20);

    const active = userProjects.filter(p => p.status === 'active').length;
    const completed = userProjects.filter(p => p.status === 'completed').length;
    const paused = userProjects.filter(p => p.status !== 'active' && p.status !== 'completed').length;

    const fundResults = await db.select({
      projectId: fundTransfers.project_id,
      total: sql<string>`COALESCE(SUM(${fundTransfers.amount}::numeric), 0)`,
    }).from(fundTransfers)
      .where(inArray(fundTransfers.project_id, userProjectIds))
      .groupBy(fundTransfers.project_id);

    const expenseResults = await db.select({
      projectId: dailyExpenseSummaries.project_id,
      totalExpenses: sql<string>`COALESCE(SUM(${dailyExpenseSummaries.totalExpenses}::numeric), 0)`,
    }).from(dailyExpenseSummaries)
      .where(inArray(dailyExpenseSummaries.project_id, userProjectIds))
      .groupBy(dailyExpenseSummaries.project_id);

    const workerCountResults = await db.select({
      projectId: workerAttendance.project_id,
      count: sql<string>`COUNT(DISTINCT ${workerAttendance.worker_id})`,
    }).from(workerAttendance)
      .where(inArray(workerAttendance.project_id, userProjectIds))
      .groupBy(workerAttendance.project_id);

    const fundMap = Object.fromEntries(fundResults.map(r => [r.projectId, parseFloat(r.total)]));
    const expenseMap = Object.fromEntries(expenseResults.map(r => [r.projectId, parseFloat(r.totalExpenses)]));
    const workerMap = Object.fromEntries(workerCountResults.map(r => [r.projectId, parseInt(r.count)]));

    let totalBudget = 0;
    let totalFunds = 0;
    let totalExpenses = 0;
    let totalWorkers = 0;

    const lines = [
      `━━━━━━━━━━━━━━━━━━`,
      `📌  *إحصائيات المشاريع*`,
      `━━━━━━━━━━━━━━━━━━`,
      ``,
      `  🟢  نشط: *${active}*  |  ✅ مكتمل: *${completed}*  |  🟡 متوقف: *${paused}*`,
      `  📊  الإجمالي: *${userProjects.length}* مشروع`,
      ``,
    ];

    userProjects.forEach((p, i) => {
      const budget = parseFloat(p.budget || '0');
      const funds = fundMap[p.id] || 0;
      const expenses = expenseMap[p.id] || 0;
      const wCount = workerMap[p.id] || 0;
      const remaining = funds - expenses;
      const statusIcon = p.status === 'active' ? '🟢' : p.status === 'completed' ? '✅' : '🟡';

      totalBudget += budget;
      totalFunds += funds;
      totalExpenses += expenses;
      totalWorkers += wCount;

      lines.push(`${statusIcon} *${i + 1}. ${p.name}*`);
      if (budget > 0) {
        const usedPercent = budget > 0 ? Math.round((expenses / budget) * 100) : 0;
        lines.push(`   💰 الميزانية: *${budget.toLocaleString()}* ر.س | مستخدم: *${usedPercent}%*`);
      }
      lines.push(`   📥 الإيرادات: *${funds.toLocaleString()}* ر.س`);
      lines.push(`   📤 المصروفات: *${expenses.toLocaleString()}* ر.س`);
      lines.push(`   💵 المتبقي: *${remaining.toLocaleString()}* ر.س`);
      lines.push(`   👷 العمال: *${wCount}*`);
      lines.push(``);
    });

    lines.push(`━━━━━━━━━━━━━━━━━━`);
    lines.push(`📊 *الإجمالي العام*`);
    lines.push(`━━━━━━━━━━━━━━━━━━`);
    if (totalBudget > 0) {
      lines.push(`  💰 الميزانيات: *${totalBudget.toLocaleString()}* ر.س`);
    }
    lines.push(`  📥 الإيرادات: *${totalFunds.toLocaleString()}* ر.س`);
    lines.push(`  📤 المصروفات: *${totalExpenses.toLocaleString()}* ر.س`);
    lines.push(`  💵 المتبقي: *${(totalFunds - totalExpenses).toLocaleString()}* ر.س`);
    lines.push(`  👷 إجمالي العمال: *${totalWorkers}*`);
    lines.push(``);
    lines.push(`  📤  أرسل *تصدير* لتصدير كشوفات مفصلة`);

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
