import { AIAgentService, getAIAgentService } from "./AIAgentService";
import { WhatsAppSecurityContext } from "./WhatsAppSecurityContext";
import { db } from "../../db";
import { storage } from "../../storage";
import { botSettingsService } from "./whatsapp/BotSettingsService";
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
import { convertHtmlToPdf } from "../../services/reports/HtmlToPdfService";
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
    | 'export_awaiting_date_range' | 'export_awaiting_format' | 'export_awaiting_projects_select'
    | 'export_awaiting_worker_project';
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
    workerProjects?: { id: string; name: string }[];
    requestedFormat?: string;
    securityProjectIds?: string[];
    securityIsAdmin?: boolean;
  };
}

function textReply(body: string): BotReply {
  return { type: 'text', body };
}

function normalizeArabic(text: string): string {
  return text
    .replace(/ة/g, 'ه')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\u0640/g, '')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .trim();
}

function buildArabicSearchVariants(name: string): string[] {
  const normalized = normalizeArabic(name);
  const variants = new Set<string>();
  variants.add(name);
  variants.add(normalized);
  variants.add(name.replace(/ه/g, 'ة'));
  variants.add(normalized.replace(/ه/g, 'ة'));
  return [...variants].filter(v => v.length >= 2);
}

function nav(body: string): string {
  return `${body}\n\n*0* القائمة | *#* رجوع`;
}

const SESSION_CACHE_KEY = 'wa_ctx';

export class WhatsAppAIService {
  private aiAgent: AIAgentService;
  private sessions: Map<string, WhatsAppContext> = new Map();
  private waSessionIds: Map<string, string> = new Map();
  private processingLock: Set<string> = new Set();

  constructor() {
    this.aiAgent = getAIAgentService();
    this.restoreSessionsFromDB();
  }

  private async restoreSessionsFromDB() {
    try {
      const rows = await db.select({
        phone: whatsappUserLinks.phoneNumber,
        userId: whatsappUserLinks.user_id,
      }).from(whatsappUserLinks)
        .where(eq(whatsappUserLinks.isActive, true))
        .limit(100);

      for (const row of rows) {
        if (row.phone && row.userId && !this.sessions.has(row.phone)) {
          this.sessions.set(row.phone, {
            step: 'idle',
            userId: row.userId,
            userName: '',
            menuStack: [],
            currentMenu: 'main',
            data: {},
          });
        }
      }
      console.log(`[WhatsAppAI] Restored ${rows.length} sessions from DB`);
    } catch (e) {
      console.error('[WhatsAppAI] Failed to restore sessions:', e);
    }
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
    if (this.processingLock.has(senderPhone)) {
      return textReply('⏳ جاري معالجة طلبك السابق...');
    }
    this.processingLock.add(senderPhone);

    try {
      return await this._processMessage(senderPhone, message, inputType, inputId, messageMetadata);
    } finally {
      this.processingLock.delete(senderPhone);
    }
  }

  private async _processMessage(
    senderPhone: string,
    message: string,
    inputType: 'text' | 'button' | 'list' | 'image' = 'text',
    inputId?: string,
    messageMetadata?: Record<string, any>
  ): Promise<BotReply> {
    const securityContext = await WhatsAppSecurityContext.fromPhone(senderPhone);

    if (!securityContext.userId) {
      return textReply("❌ رقمك غير مسجل.\nيرجى ربط رقم الواتساب من التطبيق أولاً.");
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
    const currentSettings = await botSettingsService.getSettings();
    if (currentSettings.messageLogging) {
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
    context.userName = userName;

    if (!this.sessions.has(senderPhone)) {
      this.sessions.set(senderPhone, context);
    }

    const intent = this.detectIntent(effectiveInput);

    if (intent && context.step === 'idle') {
      return this.executeIntent(intent, context, senderPhone, userId, userName, securityContext, userProjectIds, role, isAdmin);
    }

    if (context.step !== 'idle') {
      return this.handleFlowStep(context, effectiveInput, senderPhone, userName, securityContext, userProjectIds);
    }

    const resolved = resolveUserInput(effectiveInput, context.currentMenu);

    if (resolved.action === 'cancel') {
      this.sessions.delete(senderPhone);
      return buildTextWithMenu('تم الإلغاء', `✅ تم إلغاء العملية.`, 'main');
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

  private extractExportFormat(input: string): string | null {
    const lower = input.toLowerCase();
    const hasExcel = /(?:اكسل|excel|xlsx)/i.test(lower);
    const hasPdf = /(?:pdf|بي دي اف)/i.test(lower);
    if (hasExcel && hasPdf) return 'both';
    if (hasExcel) return 'xlsx';
    if (hasPdf) return 'pdf';
    return null;
  }

  private extractWorkerNameFromExport(input: string): string | null {
    const match = input.match(/(?:تصدير|صدر|ابي|ارسل)\s*(?:كشف\s*(?:حساب)?|تقرير)\s*(?:العامل|عامل|لـ?لعامل)?\s+([\u0600-\u06FF][\u0600-\u06FF\s]+)/i);
    if (!match) return null;
    const excludeWords = ['يومي', 'شامل', 'عام', 'فترة', 'ختامي', 'المشاريع', 'مشاريع', 'المصروفات', 'مصروفات', 'بيانات', 'ملف'];
    let name = match[1].trim()
      .replace(/\s*(?:ال[يى]|الى|إلى|في|ب|ك|بصيغة)?\s*(?:ملف\s*)?(?:اكسل|excel|xlsx|pdf|بي دي اف).*$/i, '')
      .replace(/\s*(?:الى|إلى|ال[يى]|و)\s*$/i, '')
      .trim();
    if (name.length >= 2 && !excludeWords.includes(name)) return name;
    return null;
  }

  private detectIntent(input: string): { type: string; params?: Record<string, string> } | null {
    const lower = input.trim().toLowerCase();

    const expenseMatch = input.match(/(\d+)\s*(?:مصاريف|مصروف|ريال)\s+(.+)/i);
    if (expenseMatch) {
      return { type: 'add_expense', params: { amount: expenseMatch[1], workerName: expenseMatch[2].trim() } };
    }

    const expenseMatch2 = input.match(/(?:سجل|أضف|ضيف|حط)\s*(?:مصروف|مصاريف|مبلغ)\s*(\d+)\s+(?:ل|على|عامل|لـ)\s*(.+)/i);
    if (expenseMatch2) {
      return { type: 'add_expense', params: { amount: expenseMatch2[1], workerName: expenseMatch2[2].trim() } };
    }

    if (/(?:إحصائيات|احصائيات|ملخص|حالة)\s*(?:المشاريع|مشاريع|المشروع)/i.test(lower) ||
        /(?:كم|كيف)\s*(?:المشاريع|مشاريع|حالة)/i.test(lower) ||
        /(?:وضع|حالة)\s*(?:المشاريع|مشاريعي)/i.test(lower)) {
      return { type: 'projects_status' };
    }

    if (/(?:مشاريعي|المشاريع|عرض.*مشاريع|ابي.*مشاريع)/i.test(lower)) {
      return { type: 'projects_list' };
    }

    if (/(?:ملخص|كشف|مجموع)\s*(?:المصروفات|مصروفات|المصاريف|مصاريف)/i.test(lower) ||
        /(?:كم|اجمالي|إجمالي)\s*(?:المصروفات|مصروفات|المصاريف|صرفنا)/i.test(lower)) {
      return { type: 'expense_summary' };
    }

    const workerName = this.extractWorkerNameFromExport(input);
    if (workerName) {
      const format = this.extractExportFormat(input);
      const params: Record<string, string> = { workerName };
      if (format) params.format = format;
      return { type: 'export_worker_direct', params };
    }

    if (/(?:تصدير|صدر|ابي|ارسل)\s*(?:كشف|تقرير|ملف|بيانات)/i.test(lower) ||
        /(?:اكسل|excel|pdf|بي دي اف)/i.test(lower)) {
      return { type: 'export' };
    }

    if (/(?:تقرير|ابي تقرير|اعطني.*تقرير)/i.test(lower)) {
      return { type: 'reports' };
    }

    if (/(?:مساعدة|مساعده|أوامر|كيف.*استخدم)/i.test(lower)) {
      return { type: 'help' };
    }

    const greetings = ['السلام عليكم', 'سلام', 'مرحبا', 'مرحبًا', 'هلا', 'الو', 'اهلا', 'أهلا', 'هاي', 'hi', 'hello', 'hey'];
    if (greetings.some(g => lower.includes(g))) {
      return { type: 'greeting' };
    }

    return null;
  }

  private async executeIntent(
    intent: { type: string; params?: Record<string, string> },
    context: WhatsAppContext,
    senderPhone: string,
    userId: string,
    userName: string,
    securityContext: WhatsAppSecurityContext,
    userProjectIds: string[],
    role: string,
    isAdmin: boolean
  ): Promise<BotReply> {
    const intentSettings = await botSettingsService.getSettings();

    switch (intent.type) {
      case 'greeting':
        if (intentSettings.welcomeMessage && intentSettings.welcomeMessage.trim() !== '') {
          return buildTextWithMenu('مرحباً', intentSettings.welcomeMessage.replace('{name}', userName), 'main');
        }
        return buildWelcomeReply(userName);

      case 'add_expense':
        if (!securityContext.canAdd) {
          return textReply(nav(`❌ ليس لديك صلاحية إضافة مصروفات.`));
        }
        return this.startExpenseFromText(intent.params!, context, senderPhone, userName, securityContext, userProjectIds);

      case 'projects_status':
        if (!securityContext.canRead) {
          return textReply(nav(`❌ ليس لديك صلاحية عرض البيانات.`));
        }
        return this.showProjectsStatus(userProjectIds);

      case 'projects_list':
        if (!securityContext.canRead) {
          return textReply(nav(`❌ ليس لديك صلاحية عرض البيانات.`));
        }
        return this.showProjectsList(userProjectIds);

      case 'expense_summary':
        if (!securityContext.canRead) {
          return textReply(nav(`❌ ليس لديك صلاحية عرض البيانات.`));
        }
        return this.showExpenseSummary(userProjectIds, context, senderPhone);

      case 'export_worker_direct':
        if (!securityContext.canRead) {
          return textReply(nav(`❌ ليس لديك صلاحية تصدير البيانات.`));
        }
        return this.handleDirectWorkerExport(intent.params!.workerName, intent.params?.format || null, context, senderPhone, userName, userProjectIds, isAdmin);

      case 'export':
        if (!securityContext.canRead) {
          return textReply(nav(`❌ ليس لديك صلاحية تصدير البيانات.`));
        }
        context.menuStack.push(context.currentMenu);
        context.currentMenu = 'export_reports';
        this.sessions.set(senderPhone, context);
        return buildMenuReply('export_reports');

      case 'reports':
        if (!securityContext.canRead) {
          return textReply(nav(`❌ ليس لديك صلاحية عرض التقارير.`));
        }
        context.menuStack.push(context.currentMenu);
        context.currentMenu = 'reports';
        this.sessions.set(senderPhone, context);
        return buildMenuReply('reports');

      case 'help':
        return textReply(nav(formatHelp(userName)));

      default:
        return buildWelcomeReply(userName);
    }
  }

  private async startExpenseFromText(
    params: Record<string, string>,
    context: WhatsAppContext,
    senderPhone: string,
    userName: string,
    securityContext: WhatsAppSecurityContext,
    userProjectIds: string[]
  ): Promise<BotReply> {
    const { amount, workerName } = params;

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

      if (activeProjects.length === 1) {
        context.data.projectId = activeProjects[0].id;
        context.data.projectName = activeProjects[0].name;
        context.step = 'awaiting_days';
        this.sessions.set(senderPhone, context);
        return textReply([
          `👷 *${worker.name}* | 💰 *${amount}* ر.س`,
          `🏗️ ${activeProjects[0].name}`,
          ``,
          `📅 كم يوم عمل؟`,
          `*1.* يوم كامل | *2.* نصف يوم`,
          `أو اكتب العدد (مثل 0.5)`,
        ].join('\n'));
      }

      const projectLines = activeProjects.map((p, i) => `*${i + 1}.* ${p.name}`).join('\n');
      return textReply([
        `👷 *${worker.name}* | 💰 *${amount}* ر.س`,
        ``,
        `اختر المشروع:`,
        projectLines,
        ``,
        `*إلغاء* للرجوع`,
      ].join('\n'));
    }

    return textReply(nav(`❌ لم أجد عامل باسم "${workerName}".\nتأكد من الاسم وحاول مرة أخرى.`));
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
        return textReply(nav(`❌ ليس لديك صلاحية إضافة مصروفات.`));
      }
      context.step = 'idle';
      context.currentMenu = 'expenses';
      this.sessions.set(senderPhone, context);
      return textReply([
        `📌 *تسجيل مصروف*`,
        ``,
        `أرسل بالصيغة:`,
        `*المبلغ مصاريف اسم_العامل*`,
        ``,
        `مثال: 5000 مصاريف أحمد`,
        ``,
        `*إلغاء* للرجوع`,
      ].join('\n'));
    }

    if (actionId === 'expense_summary') {
      if (!securityContext.canRead) {
        return textReply(nav(`❌ ليس لديك صلاحية عرض البيانات.`));
      }
      return this.showExpenseSummary(userProjectIds, context, senderPhone);
    }

    if (actionId === 'projects_list') {
      if (!securityContext.canRead) {
        return textReply(nav(`❌ ليس لديك صلاحية عرض البيانات.`));
      }
      return this.showProjectsList(userProjectIds);
    }

    if (actionId === 'projects_status') {
      if (!securityContext.canRead) {
        return textReply(nav(`❌ ليس لديك صلاحية عرض البيانات.`));
      }
      return this.showProjectsStatus(userProjectIds);
    }

    if (actionId === 'report_daily' || actionId === 'report_project') {
      context.currentMenu = 'ai_freetext';
      this.sessions.set(senderPhone, context);
      return textReply(nav([
        `📌 *اسأل ما تريد*`,
        ``,
        `أمثلة:`,
        `• تقرير مصروفات اليوم`,
        `• ملخص مشروع الرياض`,
        `• إجمالي المصروفات هذا الشهر`,
      ].join('\n')));
    }

    if (actionId === 'report_ask') {
      context.currentMenu = 'ai_freetext';
      this.sessions.set(senderPhone, context);
      return textReply(nav(`🤖 *اسأل الذكاء الاصطناعي*\nاكتب سؤالك مباشرة.`));
    }

    if (actionId === 'export_daily' || actionId === 'export_worker' || actionId === 'export_period'
      || actionId === 'export_daily_range' || actionId === 'export_multi_project') {
      if (!securityContext.canRead) {
        return textReply(nav(`❌ ليس لديك صلاحية تصدير البيانات.`));
      }
      return this.startExportFlow(actionId, context, senderPhone, userName, userProjectIds, securityContext.isAdmin);
    }

    if (actionId === 'help_commands') {
      return textReply(nav(formatHelp(userName)));
    }

    if (actionId === 'help_contact') {
      return textReply(nav(`📞 *الدعم الفني*\nأرسل وصف المشكلة وسيتم الرد عليك.`));
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
      return buildTextWithMenu('تم الإلغاء', `✅ تم إلغاء العملية.`, 'main');
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
        return textReply(nav(`❌ ليس لديك صلاحية على مشروع *${selectedProject.name}*.`));
      }

      context.data.projectId = selectedProject.id;
      context.data.projectName = selectedProject.name;
      context.step = 'awaiting_days';
      this.sessions.set(senderPhone, context);

      return textReply([
        `✅ *${selectedProject.name}*`,
        ``,
        `📅 كم يوم عمل؟`,
        `*1.* يوم كامل | *2.* نصف يوم`,
        `أو اكتب العدد (مثل 0.5)`,
      ].join('\n'));
    }

    return textReply(nav(`❌ لم أجد المشروع. اكتب اسمه أو رقمه، أو *إلغاء*.`));
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
      return textReply(nav(`❌ أدخل رقم صحيح (مثل 1 أو 0.5)`));
    }

    context.data.workDays = days.toString();
    context.step = 'awaiting_type';
    this.sessions.set(senderPhone, context);

    return textReply([
      `✅ ${days} يوم`,
      ``,
      `📋 نوع المصروف:`,
      `*1.* أجور | *2.* مواد`,
      `*3.* تحويلة | *4.* أخرى`,
    ].join('\n'));
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
      return textReply(nav(`❌ أرسل رقم من 1 إلى 4.`));
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

      this.sessions.delete(senderPhone);

      const lines = [
        `✅ *تم تسجيل المصروف*`,
        ``,
        `👷 ${context.data.workerName} | 🏗️ ${context.data.projectName}`,
        `💰 ${context.data.amount} ر.س | 📅 ${context.data.workDays} يوم | 📋 ${expenseType}`,
      ];
      return buildTextWithMenu('تم', lines.join('\n'), 'main');
    } catch (error: any) {
      console.error('[WhatsAppAI] Error saving expense:', error);
      return textReply(nav(`❌ خطأ أثناء الحفظ: ${error.message}\nأرسل *إلغاء* وحاول مرة أخرى.`));
    }
  }

  private async handleDirectWorkerExport(
    workerName: string,
    requestedFormat: string | null,
    context: WhatsAppContext,
    senderPhone: string,
    userName: string,
    userProjectIds: string[],
    isAdmin: boolean
  ): Promise<BotReply> {
    try {
      if (!isAdmin && (!userProjectIds || userProjectIds.length === 0)) {
        return textReply(nav(`❌ ليس لديك صلاحية الوصول لأي مشروع.`));
      }

      context.data.securityProjectIds = userProjectIds;
      context.data.securityIsAdmin = isAdmin;

      const searchVariants = buildArabicSearchVariants(workerName);
      let matchedWorkers: { id: string; name: string }[] = [];

      if (userProjectIds && userProjectIds.length > 0) {
        const attendanceWorkers = await db.selectDistinct({ workerId: workerAttendance.worker_id })
          .from(workerAttendance)
          .where(inArray(workerAttendance.project_id, userProjectIds));
        const scopedWorkerIds = attendanceWorkers.map(r => r.workerId);
        if (scopedWorkerIds.length === 0) {
          return textReply(nav(`❌ لا يوجد عمال مسجلون في مشاريعك.`));
        }
        for (const variant of searchVariants) {
          const found = await db.select({ id: workers.id, name: workers.name })
            .from(workers)
            .where(and(eq(workers.is_active, true), inArray(workers.id, scopedWorkerIds), ilike(workers.name, `%${variant}%`)))
            .limit(10);
          for (const w of found) {
            if (!matchedWorkers.some(m => m.id === w.id)) matchedWorkers.push(w);
          }
        }
      } else {
        for (const variant of searchVariants) {
          const found = await db.select({ id: workers.id, name: workers.name })
            .from(workers)
            .where(and(eq(workers.is_active, true), ilike(workers.name, `%${variant}%`)))
            .limit(10);
          for (const w of found) {
            if (!matchedWorkers.some(m => m.id === w.id)) matchedWorkers.push(w);
          }
        }
      }

      if (matchedWorkers.length === 0) {
        return textReply(nav(`❌ لم يتم العثور على عامل باسم "${workerName}".`));
      }

      if (matchedWorkers.length === 1) {
        context.data.exportType = 'worker';
        context.data.workerId = matchedWorkers[0].id;
        context.data.workerName = matchedWorkers[0].name;
        if (requestedFormat) context.data.requestedFormat = requestedFormat;

        return this.checkWorkerProjectsAndProceed(context, senderPhone, userName, userProjectIds);
      }

      context.data.exportType = 'worker';
      context.data.availableWorkers = matchedWorkers;
      if (requestedFormat) context.data.requestedFormat = requestedFormat;
      context.step = 'export_awaiting_worker';
      this.sessions.set(senderPhone, context);

      const workerList = matchedWorkers.map((w, i) => `*${i + 1}.* ${w.name}`).join('\n');
      return textReply([
        `🔍 تم العثور على ${matchedWorkers.length} عامل:`,
        ``,
        workerList,
        ``,
        `أرسل رقم العامل المطلوب:`,
      ].join('\n'));
    } catch (error: any) {
      console.error('[WhatsAppAI] Error in direct worker export:', error);
      return textReply(nav(`❌ خطأ: ${error.message}`));
    }
  }

  private async checkWorkerProjectsAndProceed(
    context: WhatsAppContext,
    senderPhone: string,
    userName: string,
    userProjectIds: string[]
  ): Promise<BotReply> {
    const workerId = context.data.workerId!;
    const workerName = context.data.workerName!;

    try {
      const { inArray } = await import("drizzle-orm");
      const isAdmin = context.data.securityIsAdmin || false;

      const attendanceFilter: any[] = [eq(workerAttendance.worker_id, workerId)];
      if (!isAdmin && userProjectIds.length > 0) {
        attendanceFilter.push(inArray(workerAttendance.project_id, userProjectIds));
      } else if (!isAdmin) {
        this.sessions.delete(senderPhone);
        return textReply(nav(`❌ ليس لديك صلاحية الوصول لأي مشروع.`));
      }

      const attendanceRows = await db.selectDistinct({ projectId: workerAttendance.project_id })
        .from(workerAttendance)
        .where(and(...attendanceFilter));

      const projectIds = attendanceRows.map((r: any) => r.projectId);

      if (projectIds.length === 0) {
        this.sessions.delete(senderPhone);
        return textReply(nav(`❌ لا توجد بيانات لـ *${workerName}* في مشاريعك.`));
      }

      if (projectIds.length === 1) {
        context.data.projectId = projectIds[0];
        const proj = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, projectIds[0])).limit(1);
        context.data.projectName = proj[0]?.name || '';
        return this.proceedWithFormatOrExport(context, senderPhone, userName);
      }

      const projectRows = await db.select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(inArray(projects.id, projectIds));

      context.data.workerProjects = projectRows;
      context.step = 'export_awaiting_worker_project';
      this.sessions.set(senderPhone, context);

      const projectList = projectRows.map((p: any, i: number) => `*${i + 1}.* ${p.name}`).join('\n');
      return textReply([
        `📋 *${workerName}* يعمل في ${projectRows.length} مشاريع:`,
        ``,
        projectList,
        `*${projectRows.length + 1}.* 📊 جميع المشاريع`,
        ``,
        `اختر رقم المشروع:`,
      ].join('\n'));
    } catch (error: any) {
      console.error('[WhatsAppAI] Error checking worker projects:', error);
      return this.proceedWithFormatOrExport(context, senderPhone, userName);
    }
  }

  private async proceedWithFormatOrExport(
    context: WhatsAppContext,
    senderPhone: string,
    userName: string
  ): Promise<BotReply> {
    const requestedFormat = context.data.requestedFormat;

    if (requestedFormat === 'both') {
      return this.executeWorkerExport(context, 'both', senderPhone, userName);
    }

    if (requestedFormat === 'xlsx' || requestedFormat === 'pdf') {
      return this.generateAndSendExport(context, requestedFormat, senderPhone, userName);
    }

    context.step = 'export_awaiting_format';
    this.sessions.set(senderPhone, context);
    return textReply([
      `✅ *${context.data.workerName}*` + (context.data.projectName ? ` - ${context.data.projectName}` : ''),
      ``,
      `اختر صيغة الملف:`,
      `*1.* Excel`,
      `*2.* PDF`,
    ].join('\n'));
  }

  private async executeWorkerExport(
    context: WhatsAppContext,
    format: 'both',
    senderPhone: string,
    userName: string
  ): Promise<BotReply> {
    const { workerId, workerName, projectId } = context.data;
    this.sessions.delete(senderPhone);

    try {
      const opts: any = {};
      if (projectId && projectId !== 'all') opts.projectId = projectId;
      opts.accessibleProjectIds = context.data.securityProjectIds || [];
      opts.isAdmin = context.data.securityIsAdmin || false;
      const data = await reportDataService.getWorkerStatement(workerId!, opts);
      const jid = senderPhone.includes('@') ? senderPhone : `${senderPhone}@s.whatsapp.net`;
      const { getWhatsAppBot } = await import('./WhatsAppBot');
      const bot = getWhatsAppBot();

      const excelBuffer = await generateWorkerStatementExcel(data);
      await bot.sendMessageSafe(jid, {
        document: Buffer.from(excelBuffer),
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileName: `كشف-عامل-${workerName}.xlsx`,
      });

      const htmlContent = generateWorkerStatementHTML(data);
      try {
        const pdfBuffer = await convertHtmlToPdf(htmlContent);
        await bot.sendMessageSafe(jid, {
          document: pdfBuffer,
          mimetype: 'application/pdf',
          fileName: `كشف-عامل-${workerName}.pdf`,
        });
      } catch {
        await bot.sendMessageSafe(jid, {
          document: Buffer.from(htmlContent, 'utf-8'),
          mimetype: 'text/html',
          fileName: `كشف-عامل-${workerName}.html`,
        });
      }

      const projLabel = context.data.projectName ? ` (${context.data.projectName})` : '';
      return buildTextWithMenu('تم', `✅ تم إرسال كشف حساب *${workerName}*${projLabel} بصيغتي Excel و PDF`, 'main');
    } catch (err: any) {
      console.error('[WhatsAppAI] Worker export error:', err);
      return textReply(nav(`❌ خطأ: ${err.message}`));
    }
  }

  private async startExportFlow(
    actionId: string,
    context: WhatsAppContext,
    senderPhone: string,
    userName: string,
    userProjectIds: string[],
    isAdmin: boolean = false
  ): Promise<BotReply> {
    const exportType = actionId.replace('export_', '');
    context.data.exportType = exportType;
    context.data.securityProjectIds = userProjectIds;
    context.data.securityIsAdmin = isAdmin;

    if (exportType === 'worker') {
      let allWorkers: { id: string; name: string }[] = [];
      if (userProjectIds && userProjectIds.length > 0) {
        const { inArray } = await import("drizzle-orm");
        const attendanceWorkers = await db.selectDistinct({ workerId: workerAttendance.worker_id })
          .from(workerAttendance)
          .where(inArray(workerAttendance.project_id, userProjectIds));
        const scopedWorkerIds = attendanceWorkers.map(r => r.workerId);
        if (scopedWorkerIds.length > 0) {
          allWorkers = await db.select({ id: workers.id, name: workers.name })
            .from(workers)
            .where(and(eq(workers.is_active, true), inArray(workers.id, scopedWorkerIds)))
            .limit(30);
        }
      } else {
        allWorkers = await db.select({ id: workers.id, name: workers.name })
          .from(workers)
          .where(eq(workers.is_active, true))
          .limit(30);
      }

      if (allWorkers.length === 0) {
        return textReply(nav(`❌ لا يوجد عمال مسجلون.`));
      }

      context.step = 'export_awaiting_worker';
      context.data.availableWorkers = allWorkers.map(w => ({ id: w.id, name: w.name }));
      this.sessions.set(senderPhone, context);

      const workerLines = allWorkers.map((w, i) => `*${i + 1}.* ${w.name}`).join('\n');
      return textReply([
        `📌 *كشف حساب عامل*`,
        `اختر العامل:`,
        ``,
        workerLines,
        ``,
        `*0* القائمة | *#* رجوع`,
      ].join('\n'));
    }

    if (exportType === 'multi_project') {
      const userProjects = await db.select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(inArray(projects.id, userProjectIds))
        .limit(20);

      if (userProjects.length === 0) {
        return textReply(nav(`❌ لا توجد مشاريع.`));
      }

      context.step = 'export_awaiting_projects_select';
      context.data.activeProjects = userProjects.map(p => ({ id: p.id, name: p.name }));
      context.data.exportProjectIds = [];
      context.data.exportProjectNames = [];
      this.sessions.set(senderPhone, context);

      const projLines = userProjects.map((p, i) => `*${i + 1}.* ${p.name}`).join('\n');
      return textReply([
        `📌 *تقرير متعدد المشاريع*`,
        `اختر المشاريع (أرقام بفواصل أو *الكل*):`,
        ``,
        projLines,
        ``,
        `*0* القائمة | *#* رجوع`,
      ].join('\n'));
    }

    const userProjects = await db.select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(inArray(projects.id, userProjectIds))
      .limit(20);

    if (userProjects.length === 0) {
      return textReply(nav(`❌ لا توجد مشاريع.`));
    }

    context.step = 'export_awaiting_project';
    context.data.activeProjects = userProjects.map(p => ({ id: p.id, name: p.name }));
    this.sessions.set(senderPhone, context);

    const typeNames: Record<string, string> = {
      daily: 'كشف يومي شامل',
      period: 'تقرير فترة ختامي',
      daily_range: 'كشف يومي لفترة',
    };

    const projLines = userProjects.map((p, i) => `*${i + 1}.* ${p.name}`).join('\n');
    return textReply([
      `📌 *${typeNames[exportType] || 'تصدير'}*`,
      `اختر المشروع:`,
      ``,
      projLines,
      ``,
      `*0* القائمة | *#* رجوع`,
    ].join('\n'));
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
        return textReply(nav(`❌ لم أجد المشروع. أرسل رقمه أو اسمه.`));
      }

      context.data.projectId = selectedProject.id;
      context.data.projectName = selectedProject.name;

      if (context.data.exportType === 'daily') {
        context.step = 'export_awaiting_date';
        this.sessions.set(senderPhone, context);
        return textReply([
          `✅ *${selectedProject.name}*`,
          ``,
          `📅 أرسل التاريخ (*YYYY-MM-DD*) أو:`,
          `*1.* اليوم | *2.* أمس`,
          ``,
          `*إلغاء* للرجوع`,
        ].join('\n'));
      } else {
        context.step = 'export_awaiting_date_range';
        this.sessions.set(senderPhone, context);
        return textReply([
          `✅ *${selectedProject.name}*`,
          ``,
          `📅 أرسل الفترة:`,
          `*2025-01-01 إلى 2025-01-31*`,
          `أو: *1.* هذا الشهر | *2.* الشهر الماضي | *3.* آخر 7 أيام`,
          ``,
          `*إلغاء* للرجوع`,
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
        return textReply(nav(`❌ لم أجد العامل. أرسل رقمه أو اسمه.`));
      }

      context.data.workerId = selectedWorker.id;
      context.data.workerName = selectedWorker.name;

      return this.checkWorkerProjectsAndProceed(context, senderPhone, userName, userProjectIds);
    }

    if (step === 'export_awaiting_worker_project') {
      const workerProjects = context.data.workerProjects || [];
      const allIndex = workerProjects.length + 1;

      const indexMatch = input.match(/^(\d+)$/);
      if (indexMatch) {
        const idx = parseInt(indexMatch[1]);
        if (idx === allIndex || input === 'الكل' || input === 'جميع' || input.includes('جميع المشاريع')) {
          context.data.projectId = 'all';
          context.data.projectName = 'جميع المشاريع';
          return this.proceedWithFormatOrExport(context, senderPhone, userName);
        }
        if (idx >= 1 && idx <= workerProjects.length) {
          context.data.projectId = workerProjects[idx - 1].id;
          context.data.projectName = workerProjects[idx - 1].name;
          return this.proceedWithFormatOrExport(context, senderPhone, userName);
        }
      }

      if (input === 'الكل' || input === 'جميع' || input.includes('جميع المشاريع')) {
        context.data.projectId = 'all';
        context.data.projectName = 'جميع المشاريع';
        return this.proceedWithFormatOrExport(context, senderPhone, userName);
      }

      const foundProject = workerProjects.find(p => p.name.includes(input));
      if (foundProject) {
        context.data.projectId = foundProject.id;
        context.data.projectName = foundProject.name;
        return this.proceedWithFormatOrExport(context, senderPhone, userName);
      }

      return textReply(nav(`❌ أرسل رقم المشروع أو *${allIndex}* لجميع المشاريع.`));
    }

    if (step === 'export_awaiting_projects_select') {
      const cachedProjects = context.data.activeProjects || [];

      if (input === 'الكل' || input.toLowerCase() === 'all') {
        context.data.exportProjectIds = cachedProjects.map(p => p.id);
        context.data.exportProjectNames = cachedProjects.map(p => p.name);
      } else {
        const indices = input.split(/[,،\s]+/).map(s => parseInt(s.trim()) - 1).filter(i => !isNaN(i) && i >= 0 && i < cachedProjects.length);
        if (indices.length === 0) {
          return textReply(nav(`❌ أرسل أرقام المشاريع بفواصل أو *الكل*.`));
        }
        context.data.exportProjectIds = indices.map(i => cachedProjects[i].id);
        context.data.exportProjectNames = indices.map(i => cachedProjects[i].name);
      }

      context.step = 'export_awaiting_date_range';
      this.sessions.set(senderPhone, context);

      return textReply([
        `✅ *${(context.data.exportProjectNames || []).join('، ')}*`,
        ``,
        `📅 أرسل الفترة:`,
        `*2025-01-01 إلى 2025-01-31*`,
        `أو: *1.* هذا الشهر | *2.* الشهر الماضي | *3.* آخر 7 أيام`,
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
          return textReply(nav(`❌ صيغة خاطئة. أرسل *YYYY-MM-DD* أو *1* (اليوم) أو *2* (أمس).`));
        }
        dateStr = dateMatch[1];
      }

      context.data.exportDate = dateStr;
      context.step = 'export_awaiting_format';
      this.sessions.set(senderPhone, context);

      return textReply([
        `✅ *${context.data.projectName}* | 📅 *${dateStr}*`,
        ``,
        `صيغة الملف:`,
        `*1.* Excel | *2.* PDF`,
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
          return textReply(nav(`❌ صيغة خاطئة.\nمثال: *2025-01-01 إلى 2025-01-31*`));
        }
        dateFrom = rangeMatch[1];
        dateTo = rangeMatch[2];
      }

      context.data.exportDateFrom = dateFrom;
      context.data.exportDateTo = dateTo;
      context.step = 'export_awaiting_format';
      this.sessions.set(senderPhone, context);

      const label = context.data.exportType === 'multi_project'
        ? (context.data.exportProjectNames || []).join('، ')
        : (context.data.projectName || '');

      return textReply([
        `✅ *${label}*`,
        `📅 ${dateFrom} → ${dateTo}`,
        ``,
        `صيغة الملف:`,
        `*1.* Excel | *2.* PDF`,
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
        return textReply(nav(`❌ أرسل *1* (Excel) أو *2* (PDF).`));
      }

      return this.generateAndSendExport(context, format, senderPhone, userName);
    }

    return textReply(nav(`❌ خطأ. أرسل *0* للقائمة الرئيسية.`));
  }

  private async generateAndSendExport(
    context: WhatsAppContext,
    format: string,
    senderPhone: string,
    userName: string
  ): Promise<BotReply> {
    const exportType = context.data.exportType || '';

    try {
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
        const workerOpts: any = {};
        if (context.data.projectId && context.data.projectId !== 'all') {
          workerOpts.projectId = context.data.projectId;
        }
        workerOpts.accessibleProjectIds = context.data.securityProjectIds || [];
        workerOpts.isAdmin = context.data.securityIsAdmin || false;
        const data = await reportDataService.getWorkerStatement(context.data.workerId!, workerOpts);
        const projSuffix = context.data.projectName && context.data.projectName !== 'جميع المشاريع' ? `-${context.data.projectName}` : '';
        if (format === 'xlsx') {
          fileBuffer = await generateWorkerStatementExcel(data);
          fileName = `${baseName}-${context.data.workerName || ''}${projSuffix}.xlsx`;
        } else {
          htmlContent = generateWorkerStatementHTML(data);
          fileName = `${baseName}-${context.data.workerName || ''}${projSuffix}.html`;
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

      this.sessions.delete(senderPhone);

      let sendBuffer: Buffer;
      let sendMimetype: string;
      let sendFileName: string;

      if (fileBuffer) {
        sendBuffer = Buffer.from(fileBuffer);
        sendMimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        sendFileName = fileName;
      } else if (htmlContent) {
        try {
          sendBuffer = await convertHtmlToPdf(htmlContent);
          sendMimetype = 'application/pdf';
          sendFileName = fileName.replace(/\.html$/, '.pdf');
        } catch (pdfError: any) {
          console.error('[WhatsAppAI] PDF conversion failed, sending HTML:', pdfError.message);
          sendBuffer = Buffer.from(htmlContent, 'utf-8');
          sendMimetype = 'text/html';
          sendFileName = fileName;
        }
      } else {
        throw new Error('لم يتم توليد الملف');
      }

      const jid = senderPhone.includes('@') ? senderPhone : `${senderPhone}@s.whatsapp.net`;
      const { getWhatsAppBot } = await import('./WhatsAppBot');
      const bot = getWhatsAppBot();

      await bot.sendMessageSafe(jid, {
        document: sendBuffer,
        mimetype: sendMimetype,
        fileName: sendFileName,
      });

      const formatLabel = format === 'xlsx' ? 'Excel' : 'PDF';
      return buildTextWithMenu('تم', `✅ تم إرسال ملف *${formatLabel}*\n📎 ${sendFileName}`, 'main');
    } catch (error: any) {
      console.error('[WhatsAppAI] Export error:', error);
      this.sessions.delete(senderPhone);
      return textReply(nav(`❌ خطأ: ${error.message}\nأرسل *0* للقائمة.`));
    }
  }

  private async showExpenseSummary(
    userProjectIds: string[],
    context?: WhatsAppContext,
    senderPhone?: string
  ): Promise<BotReply> {
    if (userProjectIds.length === 0) {
      return textReply(nav('📋 لا توجد مشاريع.'));
    }

    const userProjects = await db.select().from(projects)
      .where(inArray(projects.id, userProjectIds))
      .limit(20);

    if (userProjects.length === 0) {
      return textReply(nav('📋 لا توجد مشاريع.'));
    }

    if (context && senderPhone) {
      context.step = 'expense_awaiting_project_summary';
      context.data.activeProjects = userProjects.map(p => ({ id: p.id, name: p.name }));
      this.sessions.set(senderPhone, context);
    }

    const projLines = userProjects.map((p, i) => {
      const icon = p.status === 'active' ? '🟢' : p.status === 'completed' ? '✅' : '🟡';
      return `${icon} *${i + 1}.* ${p.name}`;
    }).join('\n');

    return textReply([
      `📌 *ملخص المصروفات*`,
      `اختر المشروع:`,
      ``,
      projLines,
      ``,
      `*0* القائمة | *#* رجوع`,
    ].join('\n'));
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
      return textReply(nav(`❌ لم أجد المشروع. أرسل رقمه.`));
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

      const lines: string[] = [`📌 *${selectedProject.name}*`];

      if (budget > 0) {
        const pct = Math.round((totalExp / budget) * 100);
        lines.push(`💰 الميزانية: *${budget.toLocaleString()}* ر.س (${pct}% مستخدم)`);
      }

      lines.push(`📥 إيرادات: *${funds.toLocaleString()}* ر.س (${fundCount} حوالة)`);
      lines.push(`📤 مصروفات: *${totalExp.toLocaleString()}* ر.س`);
      lines.push(`  👷 أجور: ${wages.toLocaleString()} | 🧱 مواد: ${materials.toLocaleString()}`);
      lines.push(`  🚛 نقل: ${transport.toLocaleString()} | 💸 تحويلات: ${transfers.toLocaleString()}`);
      if (misc > 0) lines.push(`  📦 نثريات: ${misc.toLocaleString()}`);

      if (remaining >= 0) {
        lines.push(`💵 المتبقي: *${remaining.toLocaleString()}* ر.س ✅`);
      } else {
        lines.push(`💵 عجز: *${Math.abs(remaining).toLocaleString()}* ر.س ❌`);
      }
      lines.push(`👷 عمال: *${wCount}*`);

      return textReply(nav(lines.join('\n')));
    } catch (error: any) {
      console.error('[WhatsAppAI] Error fetching project summary:', error);
      return textReply(nav(`❌ خطأ أثناء جلب البيانات.`));
    }
  }

  private async showProjectsList(userProjectIds: string[]): Promise<BotReply> {
    if (userProjectIds.length === 0) {
      return textReply(nav('📂 لا توجد مشاريع.'));
    }

    const userProjects = await db.select().from(projects)
      .where(inArray(projects.id, userProjectIds))
      .limit(20);

    return textReply(nav(formatProjectList(userProjects.map(p => ({
      name: p.name,
      status: p.status || 'active',
      id: p.id,
    })))));
  }

  private async showProjectsStatus(userProjectIds: string[]): Promise<BotReply> {
    if (userProjectIds.length === 0) {
      return textReply(nav('📊 لا توجد مشاريع.'));
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

    let totalFunds = 0;
    let totalExpenses = 0;
    let totalWorkers = 0;

    const lines: string[] = [
      `📊 *إحصائيات المشاريع*`,
      `🟢 ${active} نشط | ✅ ${completed} مكتمل | 🟡 ${paused} متوقف`,
      ``,
    ];

    userProjects.forEach((p, i) => {
      const funds = fundMap[p.id] || 0;
      const expenses = expenseMap[p.id] || 0;
      const wCount = workerMap[p.id] || 0;
      const remaining = funds - expenses;
      const icon = p.status === 'active' ? '🟢' : p.status === 'completed' ? '✅' : '🟡';

      totalFunds += funds;
      totalExpenses += expenses;
      totalWorkers += wCount;

      lines.push(`${icon} *${i + 1}. ${p.name}*`);
      lines.push(`📥 ${funds.toLocaleString()} | 📤 ${expenses.toLocaleString()} | 💵 ${remaining.toLocaleString()} | 👷 ${wCount}`);
    });

    lines.push(``);
    lines.push(`*الإجمالي:* 📥 ${totalFunds.toLocaleString()} | 📤 ${totalExpenses.toLocaleString()} | 💵 ${(totalFunds - totalExpenses).toLocaleString()} | 👷 ${totalWorkers}`);
    lines.push(``);
    lines.push(`📤 أرسل *تصدير* لكشوفات مفصلة`);

    return textReply(nav(lines.join('\n')));
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
        return textReply(nav(`❌ ليس لديك صلاحية إضافة مصروفات.`));
      }
      return this.startExpenseFromText(
        { amount: expenseMatch[1], workerName: expenseMatch[2].trim() },
        context, senderPhone, userName, securityContext, userProjectIds
      );
    }

    const greetings = ['السلام عليكم', 'سلام', 'مرحبا', 'مرحبًا', 'هلا', 'الو', 'اهلا', 'أهلا', 'هاي', 'hi', 'hello', 'hey'];
    if (greetings.some(g => input.toLowerCase().includes(g))) {
      return buildWelcomeReply(userName);
    }

    if (userProjectIds.length === 0) {
      return textReply(nav(`مرحباً *${userName}*، لا توجد مشاريع مرتبطة بحسابك.\nتواصل مع المسؤول.`));
    }

    if (!securityContext.canRead) {
      return textReply(nav(`❌ ليس لديك صلاحية قراءة البيانات.`));
    }

    try {
      const sessionId = await this.getOrCreateAISession(userId, senderPhone);

      const response = await this.aiAgent.processMessage(
        sessionId,
        input,
        userId,
        securityContext
      );

      const outSettings = await botSettingsService.getSettings();
      if (outSettings.messageLogging) {
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
      }

      return textReply(nav(response.message));
    } catch (e: any) {
      console.error('[WhatsAppAI] AI processing error:', e);
      return buildTextWithMenu('حاول مرة أخرى', `⚠️ لم أتمكن من معالجة طلبك.\nحاول إعادة صياغة السؤال.`, 'main');
    }
  }
}

let instance: WhatsAppAIService | null = null;
export function getWhatsAppAIService() {
  if (!instance) instance = new WhatsAppAIService();
  return instance;
}
