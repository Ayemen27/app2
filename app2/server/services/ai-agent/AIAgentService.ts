/**
 * AI Agent Service - خدمة الوكيل الذكي الرئيسية
 * تعالج أوامر المستخدم وتنفذها مع حفظ المحادثات في قاعدة البيانات
 */

import { getModelManager, ChatMessage, ModelResponse } from "./ModelManager";
import { getDatabaseActions, ActionResult } from "./DatabaseActions";
import { getReportGenerator, ReportResult } from "./ReportGenerator";
import { db } from "../../db";
import { eq, desc, and, sql } from "drizzle-orm";
import { aiChatSessions, aiChatMessages, aiUsageStats } from "@shared/schema";

export interface AgentResponse {
  message: string;
  data?: any;
  action?: string;
  reportGenerated?: boolean;
  model?: string;
  provider?: string;
  sessionId?: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  action?: string;
  data?: any;
}

const SYSTEM_PROMPT = `أنت مساعد ذكي متخصص في إدارة مشاريع الإنشاءات. يمكنك:

1. **استعلام البيانات**: البحث عن العمال، المشاريع، المصروفات
2. **إنشاء التقارير**: تصفية حسابات العمال، ملخصات المشاريع، تقارير يومية
3. **عمليات CRUD**: إضافة وتعديل وحذف البيانات (بإذن المستخدم)

**قواعد مهمة:**
- أجب دائماً باللغة العربية
- كن مختصراً ومفيداً
- اطلب توضيحاً إذا لم تفهم الطلب
- قبل تنفيذ أي عملية حذف، اطلب تأكيداً من المستخدم

**صيغة الأوامر:**
عندما تريد تنفيذ أمر، استخدم الصيغة التالية في بداية ردك:
[ACTION:نوع_الأمر] متبوعاً بالمعلومات

أنواع الأوامر المدعومة:
- FIND_WORKER:اسم_العامل
- GET_PROJECT:اسم_المشروع
- WORKER_STATEMENT:معرف_العامل
- PROJECT_EXPENSES:معرف_المشروع
- DAILY_EXPENSES:معرف_المشروع:التاريخ
- LIST_PROJECTS
- LIST_WORKERS

مثال:
إذا سأل المستخدم "أين العامل محمد؟"، أجب:
[ACTION:FIND_WORKER:محمد]
جاري البحث عن العامل محمد...`;

export class AIAgentService {
  private modelManager = getModelManager();
  private dbActions = getDatabaseActions();
  private reportGenerator = getReportGenerator();

  /**
   * إنشاء جلسة محادثة جديدة
   */
  async createSession(userId: string, title?: string): Promise<string> {
    const [session] = await db.insert(aiChatSessions).values({
      userId,
      title: title || "محادثة جديدة",
      isActive: true,
      messagesCount: 0,
    }).returning({ id: aiChatSessions.id });

    return session.id;
  }

  /**
   * الحصول على جلسات المستخدم
   */
  async getUserSessions(userId: string) {
    return await db
      .select()
      .from(aiChatSessions)
      .where(eq(aiChatSessions.userId, userId))
      .orderBy(desc(aiChatSessions.updatedAt));
  }

  /**
   * الحصول على رسائل جلسة
   */
  async getSessionMessages(sessionId: string) {
    return await db
      .select()
      .from(aiChatMessages)
      .where(eq(aiChatMessages.sessionId, sessionId))
      .orderBy(aiChatMessages.createdAt);
  }

  /**
   * حذف جلسة
   */
  async deleteSession(sessionId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(aiChatSessions)
      .where(and(
        eq(aiChatSessions.id, sessionId),
        eq(aiChatSessions.userId, userId)
      ))
      .returning();
    
    return result.length > 0;
  }

  /**
   * معالجة رسالة من المستخدم
   */
  async processMessage(
    sessionId: string,
    userMessage: string,
    userId: string
  ): Promise<AgentResponse> {
    // حفظ رسالة المستخدم
    await db.insert(aiChatMessages).values({
      sessionId,
      role: "user",
      content: userMessage,
    });

    // تحديث عدد الرسائل
    await db.update(aiChatSessions)
      .set({ 
        messagesCount: sql`${aiChatSessions.messagesCount} + 1`,
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(aiChatSessions.id, sessionId));

    try {
      // الحصول على تاريخ المحادثة من قاعدة البيانات
      const history = await this.getSessionMessages(sessionId);
      const messages: ChatMessage[] = history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // إرسال للنموذج
      const aiResponse = await this.modelManager.chat(messages, SYSTEM_PROMPT);

      // تحليل الرد للبحث عن أوامر
      const { processedResponse, action, actionData } = await this.parseAndExecuteActions(
        aiResponse.content
      );

      // حفظ رد الوكيل
      await db.insert(aiChatMessages).values({
        sessionId,
        role: "assistant",
        content: processedResponse,
        model: aiResponse.model,
        provider: aiResponse.provider,
        tokensUsed: aiResponse.tokensUsed,
        action,
        actionData,
      });

      // تحديث عدد الرسائل
      await db.update(aiChatSessions)
        .set({ 
          messagesCount: sql`${aiChatSessions.messagesCount} + 1`,
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(aiChatSessions.id, sessionId));

      // تحديث إحصائيات الاستخدام
      await this.updateUsageStats(userId, aiResponse);

      return {
        message: processedResponse,
        data: actionData,
        action,
        model: aiResponse.model,
        provider: aiResponse.provider,
        sessionId,
      };
    } catch (error: any) {
      console.error("❌ [AIAgentService] Error:", error.message);

      const errorMessage = `عذراً، حدث خطأ: ${error.message}`;
      
      // حفظ رسالة الخطأ
      await db.insert(aiChatMessages).values({
        sessionId,
        role: "assistant",
        content: errorMessage,
      });

      return {
        message: errorMessage,
        sessionId,
      };
    }
  }

  /**
   * تحديث إحصائيات الاستخدام
   */
  private async updateUsageStats(userId: string, response: ModelResponse) {
    const today = new Date().toISOString().split("T")[0];
    
    const existing = await db
      .select()
      .from(aiUsageStats)
      .where(and(
        eq(aiUsageStats.userId, userId),
        eq(aiUsageStats.date, today),
        eq(aiUsageStats.provider, response.provider),
        eq(aiUsageStats.model, response.model)
      ));

    if (existing.length > 0) {
      await db.update(aiUsageStats)
        .set({
          requestsCount: sql`${aiUsageStats.requestsCount} + 1`,
          tokensUsed: sql`${aiUsageStats.tokensUsed} + ${response.tokensUsed || 0}`,
          updatedAt: new Date(),
        })
        .where(eq(aiUsageStats.id, existing[0].id));
    } else {
      await db.insert(aiUsageStats).values({
        userId,
        date: today,
        provider: response.provider,
        model: response.model,
        requestsCount: 1,
        tokensUsed: response.tokensUsed || 0,
      });
    }
  }

  /**
   * تحليل وتنفيذ الأوامر في رد الوكيل
   */
  private async parseAndExecuteActions(
    response: string
  ): Promise<{ processedResponse: string; action?: string; actionData?: any }> {
    const actionMatch = response.match(/\[ACTION:([^\]]+)\]/);

    if (!actionMatch) {
      return { processedResponse: response };
    }

    const actionParts = actionMatch[1].split(":");
    const actionType = actionParts[0];
    const actionParams = actionParts.slice(1);

    let result: ActionResult | ReportResult | null = null;
    let action = actionType;

    try {
      switch (actionType) {
        case "FIND_WORKER":
          result = await this.dbActions.findWorkerByName(actionParams[0] || "");
          break;

        case "GET_PROJECT":
          result = await this.dbActions.getProjectInfo(actionParams[0] || "");
          break;

        case "WORKER_STATEMENT":
          result = await this.reportGenerator.generateWorkerStatement(
            actionParams[0] || ""
          );
          break;

        case "PROJECT_EXPENSES":
          result = await this.reportGenerator.generateProjectExpensesSummary(
            actionParams[0] || ""
          );
          break;

        case "DAILY_EXPENSES":
          result = await this.reportGenerator.generateDailyExpensesReport(
            actionParams[0] || "",
            actionParams[1] || new Date().toISOString().split("T")[0]
          );
          break;

        case "LIST_PROJECTS":
          result = await this.dbActions.getAllProjects();
          break;

        case "LIST_WORKERS":
          result = await this.dbActions.getAllWorkers();
          break;

        default:
          console.log(`⚠️ Unknown action: ${actionType}`);
      }
    } catch (error: any) {
      console.error(`❌ Action error: ${error.message}`);
      result = {
        success: false,
        message: `خطأ في تنفيذ الأمر: ${error.message}`,
      };
    }

    // إزالة الأمر من النص وإضافة النتيجة
    let processedResponse = response.replace(/\[ACTION:[^\]]+\]\s*/g, "");

    if (result) {
      if (result.success && result.data) {
        if (actionType === "WORKER_STATEMENT" || actionType === "PROJECT_EXPENSES") {
          const formattedReport = this.reportGenerator.formatAsText(
            result.data,
            this.getActionTitle(actionType)
          );
          processedResponse += "\n\n" + formattedReport;
        } else {
          processedResponse += `\n\n✅ ${result.message}`;
          if (Array.isArray(result.data) && result.data.length > 0) {
            processedResponse += "\n" + this.formatDataList(result.data);
          }
        }
      } else {
        processedResponse += `\n\n❌ ${result.message}`;
      }
    }

    return {
      processedResponse,
      action,
      actionData: result?.data,
    };
  }

  private getActionTitle(actionType: string): string {
    const titles: Record<string, string> = {
      WORKER_STATEMENT: "تصفية حساب العامل",
      PROJECT_EXPENSES: "ملخص مصروفات المشروع",
      DAILY_EXPENSES: "تقرير المصروفات اليومية",
    };
    return titles[actionType] || actionType;
  }

  private formatDataList(data: any[]): string {
    if (data.length === 0) return "لا توجد بيانات";

    return data
      .slice(0, 10)
      .map((item, i) => {
        if (item.name) {
          return `${i + 1}. ${item.name}`;
        }
        return `${i + 1}. ${JSON.stringify(item).slice(0, 50)}...`;
      })
      .join("\n");
  }

  /**
   * الحصول على حالة النماذج
   */
  getModelsStatus() {
    return this.modelManager.getModelsStatus();
  }

  /**
   * التحقق من توفر النماذج
   */
  isAvailable(): boolean {
    return this.modelManager.hasAvailableModel();
  }
}

// Singleton instance
let aiAgentInstance: AIAgentService | null = null;

export function getAIAgentService(): AIAgentService {
  if (!aiAgentInstance) {
    aiAgentInstance = new AIAgentService();
  }
  return aiAgentInstance;
}
