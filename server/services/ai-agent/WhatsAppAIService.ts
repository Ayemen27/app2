import { AIAgentService, getAIAgentService } from "./AIAgentService";
import { WhatsAppSecurityContext } from "./WhatsAppSecurityContext";
import { db } from "../../db";
import { workers, projects, wellExpenses, wells, workerAttendance, whatsappUserLinks, whatsappMessages, whatsappSecurityEvents, userProjectPermissions, users } from "@shared/schema";
import { eq, ilike, and, sql, inArray } from "drizzle-orm";
import {
  BotReply,
  buildWelcomeReply,
  buildMenuReply,
  resolveUserInput,
  getMenuNode,
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
  };
}

function textReply(body: string): BotReply {
  return { type: 'text', body };
}

export class WhatsAppAIService {
  private aiAgent: AIAgentService;
  private sessions: Map<string, WhatsAppContext> = new Map();

  constructor() {
    this.aiAgent = getAIAgentService();
  }

  async handleIncomingMessage(
    senderPhone: string,
    message: string,
    inputType: 'text' | 'button' | 'list' = 'text',
    inputId?: string
  ): Promise<BotReply> {
    const securityContext = await WhatsAppSecurityContext.fromPhone(senderPhone);

    if (!securityContext.userId) {
      return textReply("رقمك غير مسجل في النظام.\nيرجى ربط رقم الواتساب من حسابك في التطبيق أولاً.");
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
        sender: senderPhone.replace(/\D/g, ''),
        wa_id: 'bot',
        content: message.trim(),
        status: 'received',
        phone_number: senderPhone.replace(/\D/g, ''),
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

    const resolved = resolveUserInput(effectiveInput, context.currentMenu);

    if (resolved.action === 'command' && resolved.commandId === 'cancel') {
      this.sessions.delete(senderPhone);
      return {
        type: 'buttons',
        body: formatConfirmation(`تم إلغاء العملية الحالية يا ${userName}.`),
        footer: 'يمكنك البدء من جديد',
        buttons: [
          { id: 'menu_expenses', title: 'إضافة مصروف' },
          { id: 'menu_projects', title: 'مشاريعي' },
          { id: 'menu_help', title: 'مساعدة' },
        ],
      };
    }

    if (resolved.action === 'navigate' && resolved.targetMenuId === 'main' && context.step === 'idle') {
      context.menuStack = [];
      context.currentMenu = 'main';
      this.sessions.set(senderPhone, context);
      return buildWelcomeReply(userName);
    }

    if (resolved.action === 'navigate' && resolved.targetMenuId && resolved.targetMenuId !== 'main' && context.step === 'idle') {
      if (context.currentMenu !== resolved.targetMenuId) {
        context.menuStack.push(context.currentMenu);
      }
      context.currentMenu = resolved.targetMenuId;
      this.sessions.set(senderPhone, context);
      return buildMenuReply(resolved.targetMenuId);
    }

    if (userProjectIds.length === 0) {
      return textReply(`مرحباً ${userName}، لا توجد مشاريع مرتبطة بحسابك حالياً.\nيرجى التواصل مع المسؤول لإضافتك إلى المشاريع.`);
    }

    if (!securityContext.canRead) {
      if (effectiveInput === 'مساعدة' || effectiveInput === 'help' || effectiveInput === 'help_commands') {
        return textReply(`مرحباً ${userName}! صلاحيتك على هذا الرقم محدودة. يرجى التواصل مع المسؤول لتفعيل صلاحية القراءة.`);
      }
      return textReply(`عذراً ${userName}، ليس لديك صلاحية قراءة البيانات عبر هذا الرقم. يرجى التواصل مع المسؤول.`);
    }

    if (context.step === 'idle') {
      if (effectiveInput === 'expense_add' || effectiveInput === 'menu_expenses') {
        if (!securityContext.canAdd) {
          return textReply(`عذراً ${userName}، ليس لديك صلاحية لإضافة مصروفات عبر هذا الرقم.`);
        }
        context.currentMenu = 'expenses';
        this.sessions.set(senderPhone, context);
        return {
          type: 'text',
          header: 'تسجيل مصروف جديد',
          body: `${bold('لتسجيل مصروف، أرسل بالصيغة التالية:')}\n\nالمبلغ مصاريف اسم_العامل\n\nمثال: 5000 مصاريف أحمد`,
          footer: 'أرسل "إلغاء" للرجوع',
        };
      }

      if (effectiveInput === 'expense_summary') {
        const activeProjects = await db.select().from(projects)
          .where(and(
            eq(projects.status, 'active'),
            inArray(projects.id, userProjectIds)
          ))
          .limit(10);

        if (activeProjects.length === 0) {
          return textReply('لا توجد مشاريع نشطة حالياً.');
        }

        return {
          type: 'list',
          header: 'ملخص المصروفات',
          body: 'اختر المشروع لعرض ملخص مصروفاته:',
          footer: 'اختر مشروعاً',
          listButtonText: 'عرض المشاريع',
          sections: [{
            title: 'المشاريع النشطة',
            rows: activeProjects.map(p => ({
              id: `project_summary_${p.id}`,
              title: p.name,
              description: `حالة: نشط`,
            })),
          }],
        };
      }

      if (effectiveInput === 'projects_list' || effectiveInput === 'menu_projects') {
        const userProjects = await db.select().from(projects)
          .where(inArray(projects.id, userProjectIds))
          .limit(20);

        if (userProjects.length === 0) {
          return textReply('لا توجد مشاريع مرتبطة بحسابك حالياً.');
        }

        return {
          type: 'list',
          header: 'مشاريعك',
          body: formatProjectList(userProjects.map(p => ({ name: p.name, status: p.status, id: p.id }))),
          footer: `إجمالي: ${userProjects.length} مشروع`,
          listButtonText: 'عرض التفاصيل',
          sections: [{
            title: 'المشاريع',
            rows: userProjects.map(p => ({
              id: `project_detail_${p.id}`,
              title: p.name,
              description: p.status === 'active' ? 'نشط' : p.status === 'completed' ? 'مكتمل' : 'متوقف',
            })),
          }],
        };
      }

      if (effectiveInput === 'projects_status') {
        const userProjects = await db.select().from(projects)
          .where(inArray(projects.id, userProjectIds))
          .limit(20);

        const active = userProjects.filter(p => p.status === 'active').length;
        const completed = userProjects.filter(p => p.status === 'completed').length;
        const paused = userProjects.filter(p => p.status !== 'active' && p.status !== 'completed').length;

        return {
          type: 'buttons',
          header: 'حالة المشاريع',
          body: `${bold('إحصائيات مشاريعك:')}\n\nنشط: ${active}\nمكتمل: ${completed}\nمتوقف: ${paused}\nالإجمالي: ${userProjects.length}`,
          footer: 'اختر إجراء',
          buttons: [
            { id: 'projects_list', title: 'عرض التفاصيل' },
            { id: 'nav_back', title: 'رجوع' },
          ],
        };
      }

      if (effectiveInput === 'report_daily' || effectiveInput === 'report_project') {
        return {
          type: 'text',
          body: `${bold('التقارير')}\n\nللحصول على تقرير، اكتب سؤالك مباشرة.\nمثال: "تقرير مصروفات اليوم" أو "ملخص مشروع الرياض"`,
          footer: 'أو أرسل "الرئيسية" للعودة',
        };
      }

      if (effectiveInput === 'help_commands' || effectiveInput === 'menu_help' || effectiveInput === 'مساعدة' || effectiveInput === 'help') {
        return {
          type: 'buttons',
          body: formatHelp(userName),
          footer: 'اختر إجراء أو اكتب سؤالك',
          buttons: [
            { id: 'menu_expenses', title: 'إضافة مصروف' },
            { id: 'menu_projects', title: 'مشاريعي' },
            { id: 'nav_home', title: 'الرئيسية' },
          ],
        };
      }

      if (effectiveInput === 'help_contact') {
        return textReply(`${bold('الدعم الفني')}\n\nللتواصل مع الدعم، يرجى إرسال رسالة تحتوي على وصف المشكلة وسيتم الرد عليك.`);
      }

      if (effectiveInput === 'مشاريعي' || effectiveInput === 'مشاريع') {
        const userProjects = await db.select().from(projects)
          .where(inArray(projects.id, userProjectIds))
          .limit(20);

        if (userProjects.length === 0) {
          return textReply('لا توجد مشاريع مرتبطة بحسابك حالياً.');
        }

        return {
          type: 'list',
          header: 'مشاريعك',
          body: formatProjectList(userProjects.map(p => ({ name: p.name, status: p.status, id: p.id }))),
          footer: `إجمالي: ${userProjects.length} مشروع`,
          listButtonText: 'عرض المشاريع',
          sections: [{
            title: 'المشاريع',
            rows: userProjects.map(p => ({
              id: `project_detail_${p.id}`,
              title: p.name,
              description: p.status === 'active' ? 'نشط' : p.status === 'completed' ? 'مكتمل' : 'متوقف',
            })),
          }],
        };
      }

      const expenseMatch = effectiveInput.match(/(\d+)\s+مصاريف\s+(.+)/i);
      if (expenseMatch) {
        if (!securityContext.canAdd) {
          return textReply(`عذراً ${userName}، ليس لديك صلاحية لإضافة مصروفات عبر هذا الرقم.`);
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

          if (activeProjects.length <= 3) {
            return {
              type: 'buttons',
              header: 'اختيار المشروع',
              body: formatProjectSelection(
                activeProjects.map(p => ({ name: p.name, id: p.id })),
                worker.name,
                amount
              ),
              footer: 'اختر المشروع',
              buttons: activeProjects.map(p => ({
                id: `select_project_${p.id}`,
                title: p.name.substring(0, 20),
              })),
            };
          }

          return {
            type: 'list',
            header: 'اختيار المشروع',
            body: formatProjectSelection(
              activeProjects.map(p => ({ name: p.name, id: p.id })),
              worker.name,
              amount
            ),
            footer: 'اختر المشروع من القائمة',
            listButtonText: 'عرض المشاريع',
            sections: [{
              title: 'المشاريع النشطة',
              rows: activeProjects.map(p => ({
                id: `select_project_${p.id}`,
                title: p.name,
              })),
            }],
          };
        } else {
          return textReply(formatError(`لم أجد عامل باسم "${workerName}" في مشاريعك. يرجى التأكد من الاسم.`));
        }
      }

      if (!this.sessions.has(senderPhone)) {
        this.sessions.set(senderPhone, context);
        return buildWelcomeReply(userName);
      }
    }

    if (context.step === 'awaiting_project') {
      let projectResult;

      const projectIdMatch = effectiveInput.match(/^select_project_(.+)$/);
      if (projectIdMatch) {
        projectResult = await db.select().from(projects)
          .where(and(
            eq(projects.id, projectIdMatch[1]),
            inArray(projects.id, userProjectIds)
          ))
          .limit(1);
      }

      if (!projectResult) {
        const indexMatch = effectiveInput.match(/^(\d+)$/);
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
      }

      if (!projectResult) {
        projectResult = await db.select().from(projects)
          .where(and(
            ilike(projects.name, `%${effectiveInput}%`),
            inArray(projects.id, userProjectIds)
          ))
          .limit(1);
      }

      if (projectResult && projectResult.length > 0) {
        const selectedProject = projectResult[0];
        const canAdd = await securityContext.canAddToProject(selectedProject.id);
        if (!canAdd) {
          return textReply(`ليس لديك صلاحية إضافة مصروفات على مشروع "${selectedProject.name}". يرجى التواصل مع المسؤول.`);
        }

        context.data.projectId = selectedProject.id;
        context.data.projectName = selectedProject.name;
        context.step = 'awaiting_days';
        this.sessions.set(senderPhone, context);
        return {
          type: 'buttons',
          header: 'عدد الأيام',
          body: `${formatConfirmation(`تم تحديد مشروع: ${selectedProject.name}`)}\n\n${formatDaysPrompt()}`,
          footer: 'أرسل عدد الأيام',
          buttons: [
            { id: 'days_1', title: '1 يوم' },
            { id: 'days_0.5', title: 'نصف يوم' },
            { id: 'nav_cancel', title: 'إلغاء' },
          ],
        };
      }
      return textReply(formatError("لم أجد المشروع في مشاريعك. يرجى كتابة اسم المشروع بشكل أدق أو رقمه من القائمة، أو إرسال 'إلغاء'."));
    }

    if (context.step === 'awaiting_days') {
      let days: number;
      const daysMatch = effectiveInput.match(/^days_(.+)$/);
      if (daysMatch) {
        days = parseFloat(daysMatch[1]);
      } else {
        days = parseFloat(effectiveInput);
      }

      if (!isNaN(days)) {
        context.data.workDays = days.toString();
        context.step = 'awaiting_type';
        this.sessions.set(senderPhone, context);
        return {
          type: 'buttons',
          header: 'نوع المصروف',
          body: `${formatConfirmation(`تم تسجيل ${days} يوم.`)}\n\n${formatExpenseTypePrompt()}`,
          footer: 'اختر نوع المصروف',
          buttons: [
            { id: 'type_wages', title: 'أجور' },
            { id: 'type_materials', title: 'مواد' },
            { id: 'type_transfer', title: 'تحويلة' },
          ],
        };
      }
      return textReply(formatError("يرجى إدخال رقم صحيح لعدد الأيام."));
    }

    if (context.step === 'awaiting_type') {
      const typeMap: Record<string, string> = {
        'type_wages': 'أجور',
        'type_materials': 'مواد',
        'type_transfer': 'تحويلة',
        '1': 'أجور',
        '2': 'مواد',
        '3': 'تحويلة',
        '4': 'أخرى',
        'أجور': 'أجور',
        'مواد': 'مواد',
        'تحويلة': 'تحويلة',
        'أخرى': 'أخرى',
      };

      const expenseType = typeMap[effectiveInput] || effectiveInput;

      try {
        const { amount, workerId, projectId, workDays } = context.data;

        const worker = await db.select().from(workers).where(eq(workers.id, workerId!)).limit(1);
        const dailyWage = worker[0]?.dailyWage || "0";

        const [attendance] = await db.insert(workerAttendance).values({
          project_id: projectId!,
          worker_id: workerId!,
          attendanceDate: new Date().toISOString().split('T')[0],
          workDays: workDays!,
          dailyWage: dailyWage.toString(),
          totalPay: amount!,
          paidAmount: amount!,
          notes: `قيد آلي عبر واتساب - ${userName} - ${expenseType}`
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

        return {
          type: 'buttons',
          body: summaryText,
          footer: 'ماذا تريد أن تفعل؟',
          buttons: [
            { id: 'menu_expenses', title: 'مصروف جديد' },
            { id: 'menu_projects', title: 'مشاريعي' },
            { id: 'nav_home', title: 'الرئيسية' },
          ],
        };
      } catch (error: any) {
        console.error('[WhatsAppAI] Error saving expense:', error);
        return textReply(formatError(`حدث خطأ أثناء حفظ البيانات: ${error.message}. يرجى المحاولة لاحقاً أو إرسال 'إلغاء'.`));
      }
    }

    try {
      const response = await this.aiAgent.processMessage(
        `wa_${userId}_${senderPhone}`,
        effectiveInput,
        userId,
        securityContext
      );

      try {
        await db.insert(whatsappMessages).values({
          sender: 'bot',
          wa_id: senderPhone.replace(/\D/g, ''),
          content: response.message.substring(0, 5000),
          status: 'sent',
          phone_number: senderPhone.replace(/\D/g, ''),
          user_id: userId,
          is_authorized: true,
          security_scope: { role, projectIds: userProjectIds, isAdmin },
        });
      } catch (e2) {
        console.error('[WhatsAppAI] Failed to log outgoing message:', e2);
      }

      return textReply(response.message);
    } catch (e) {
      return {
        type: 'buttons',
        body: formatError("عذراً، لم أفهم طلبك."),
        footer: 'جرب أحد الخيارات',
        buttons: [
          { id: 'menu_help', title: 'مساعدة' },
          { id: 'nav_home', title: 'الرئيسية' },
        ],
      };
    }
  }
}

let instance: WhatsAppAIService | null = null;
export function getWhatsAppAIService() {
  if (!instance) instance = new WhatsAppAIService();
  return instance;
}
