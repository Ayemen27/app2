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

export interface AgentStep {
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface AgentResponse {
  message: string;
  data?: any;
  action?: string;
  reportGenerated?: boolean;
  model?: string;
  provider?: string;
  sessionId?: string;
  steps?: AgentStep[];
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  action?: string;
  data?: any;
  steps?: AgentStep[];
}

const SYSTEM_PROMPT = `أنت مساعد إدارة مشاريع البناء. أجب بالعربية فقط.

## قواعد صارمة:
1. لاستخراج بيانات من النظام، اكتب أمر ACTION واحد فقط. النظام سيستبدله بالبيانات الحقيقية.
2. ممنوع اختلاق أرقام أو أسماء أو تواريخ. لا تكتب أي بيانات من خيالك.
3. ممنوع ذكر كلمة ACTION أو أي أمر تقني في ردك للمستخدم. هذه أوامر داخلية.
4. اكتب أمر ACTION واحد فقط في كل رد. لا تجمع أكثر من أمر.
5. لا تشرح للمستخدم كيف يستخدم الأوامر. أنت من يستخدمها.

## الأوامر المتاحة:
- ملخص/نظرة عامة → [ACTION:DASHBOARD]
- تحليل ميزانية → [ACTION:BUDGET_ANALYSIS]
- اتجاهات شهرية → [ACTION:MONTHLY_TRENDS]
- مقارنة مشاريع → [ACTION:PROJECT_COMPARISON]
- آخر العمليات → [ACTION:RECENT_ACTIVITIES]
- تقرير مشاريع → [ACTION:ALL_PROJECTS_REPORT]
- قائمة مشاريع → [ACTION:LIST_PROJECTS]
- بحث مشروع → [ACTION:GET_PROJECT:الاسم]
- مصروفات مشروع → [ACTION:PROJECT_EXPENSES:UUID]
- قائمة عمال → [ACTION:LIST_WORKERS]
- بحث عامل → [ACTION:FIND_WORKER:الاسم]
- كشف حساب عامل → [ACTION:WORKER_STATEMENT:الاسم]
- أعلى عمال → [ACTION:TOP_WORKERS]
- مستحقات غير مدفوعة → [ACTION:UNPAID_BALANCES]
- قائمة موردين → [ACTION:LIST_SUPPLIERS]
- كشف حساب مورد → [ACTION:SUPPLIER_STATEMENT:الاسم]
- قائمة معدات → [ACTION:LIST_EQUIPMENT]
- قائمة آبار → [ACTION:LIST_WELLS]
- بحث شامل → [ACTION:GLOBAL_SEARCH:كلمة]
- استعلام SQL → [ACTION:SQL_SELECT:SELECT ...]

## أمثلة:
- "كم مصروفات المشروع؟" → [ACTION:DASHBOARD]
- "أعطني قائمة العمال" → [ACTION:LIST_WORKERS]
- "كشف حساب أحمد" → [ACTION:WORKER_STATEMENT:أحمد]
- "ما هو وضع المشاريع؟" → [ACTION:ALL_PROJECTS_REPORT]

عند السؤال العام غير المرتبط بالبيانات، أجب مباشرة بدون أوامر.`;

export class AIAgentService {
  private modelManager = getModelManager();
  private dbActions = getDatabaseActions();
  private reportGenerator = getReportGenerator();

  /**
   * إنشاء جلسة محادثة جديدة
   */
  async createSession(userId: string, title?: string): Promise<string> {
    try {
      console.log(`📝 [AIAgentService] Creating session for user: ${userId}, title: ${title}`);
      const [session] = await db.insert(aiChatSessions).values({
        user_id: userId,
        title: title || "محادثة جديدة",
        is_active: true,
        messagesCount: 0,
      }).returning({ id: aiChatSessions.id });

      console.log(`✅ [AIAgentService] Session created with ID: ${session.id}`);
      return session.id;
    } catch (error: any) {
      console.error(`❌ [AIAgentService] Error creating session: ${error.message}`);
      throw error;
    }
  }

  /**
   * الحصول على جلسات المستخدم
   */
  async getUserSessions(userId: string) {
    return await db
      .select()
      .from(aiChatSessions)
      .where(and(eq(aiChatSessions.user_id, userId), eq(aiChatSessions.is_active, true)))
      .orderBy(desc(aiChatSessions.updated_at));
  }

  async getArchivedSessions(userId: string) {
    return await db
      .select()
      .from(aiChatSessions)
      .where(and(eq(aiChatSessions.user_id, userId), eq(aiChatSessions.is_active, false)))
      .orderBy(desc(aiChatSessions.updated_at));
  }

  async archiveSession(sessionId: string, userId: string): Promise<boolean> {
    const result = await db
      .update(aiChatSessions)
      .set({ is_active: false, updated_at: new Date() })
      .where(and(eq(aiChatSessions.id, sessionId), eq(aiChatSessions.user_id, userId)))
      .returning();
    return result.length > 0;
  }

  async restoreSession(sessionId: string, userId: string): Promise<boolean> {
    const result = await db
      .update(aiChatSessions)
      .set({ is_active: true, updated_at: new Date() })
      .where(and(eq(aiChatSessions.id, sessionId), eq(aiChatSessions.user_id, userId)))
      .returning();
    return result.length > 0;
  }

  async getChatStats(userId: string) {
    const allSessions = await db.select().from(aiChatSessions).where(eq(aiChatSessions.user_id, userId));
    const activeSessions = allSessions.filter(s => s.is_active);
    const archivedSessions = allSessions.filter(s => !s.is_active);
    const totalMessages = allSessions.reduce((sum, s) => sum + (s.messagesCount || 0), 0);
    return {
      totalSessions: allSessions.length,
      activeSessions: activeSessions.length,
      archivedSessions: archivedSessions.length,
      totalMessages,
    };
  }

  /**
   * الحصول على رسائل جلسة
   */
  async getSessionMessages(sessionId: string, userId: string) {
    const session = await db.select().from(aiChatSessions)
      .where(and(eq(aiChatSessions.id, sessionId), eq(aiChatSessions.user_id, userId)))
      .limit(1);
    if (session.length === 0) {
      throw new Error("الجلسة غير موجودة أو لا تملك صلاحية الوصول إليها");
    }
    return await db
      .select()
      .from(aiChatMessages)
      .where(eq(aiChatMessages.sessionId, sessionId))
      .orderBy(aiChatMessages.created_at);
  }

  /**
   * حذف جلسة
   */
  async deleteSession(sessionId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(aiChatSessions)
      .where(and(
        eq(aiChatSessions.id, sessionId),
        eq(aiChatSessions.user_id, userId)
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
    userId: string,
    securityContext?: import("./WhatsAppSecurityContext").WhatsAppSecurityContext
  ): Promise<AgentResponse> {
    const steps: AgentStep[] = [
      { title: "تحليل طلبك", status: "in_progress" },
      { title: "استخراج البيانات المطلوبة", status: "pending" },
      { title: "معالجة النتائج وتنسيق الرد", status: "pending" }
    ];

    const sessionCheck = await db.select().from(aiChatSessions)
      .where(and(eq(aiChatSessions.id, sessionId), eq(aiChatSessions.user_id, userId)))
      .limit(1);
    if (sessionCheck.length === 0) {
      throw new Error("الجلسة غير موجودة أو لا تملك صلاحية الوصول إليها");
    }

    await db.insert(aiChatMessages).values({
      sessionId,
      role: "user",
      content: userMessage,
    });

    await db.update(aiChatSessions)
      .set({ 
        messagesCount: sql`${aiChatSessions.messagesCount} + 1`,
        lastMessageAt: new Date(),
        updated_at: new Date(),
      })
      .where(eq(aiChatSessions.id, sessionId));

    try {
      const todayDate = new Date().toISOString().split("T")[0];
      const dynamicSystemPrompt = `${SYSTEM_PROMPT}

تاريخ اليوم: ${todayDate}. أمس: ${new Date(Date.now() - 86400000).toISOString().split("T")[0]}.
تذكر: أمر ACTION واحد فقط. لا تذكر ACTION للمستخدم. لا تختلق بيانات.`;

      // الحصول على تاريخ المحادثة من قاعدة البيانات
      const history = await this.getSessionMessages(sessionId, userId);
      const messages: ChatMessage[] = history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // إرسال للنموذج مع التوجيه المحدث
      const aiResponse = await this.modelManager.chat(messages, dynamicSystemPrompt);
      
      steps[0].status = "completed";
      steps[1].status = "in_progress";

      let responseContent = aiResponse.content;
      
      const detectedAction = this.detectIntentFromUserMessage(userMessage);
      if (detectedAction) {
        responseContent = detectedAction;
        console.log(`🔍 [AIAgentService] تم كشف النية مباشرة: ${detectedAction}`);
      } else {
        responseContent = responseContent.replace(/(?<!\[)ACTION:([A-Z_]+(?::[^\]]+)?)\]?(?=\s|$)/g, '[ACTION:$1]');
        
        const allActions = responseContent.match(/\[ACTION:([^\]]+)\]/g) || [];
        if (allActions.length > 3) {
          console.warn(`⚠️ [AIAgentService] النموذج أرسل ${allActions.length} أمر، تقليص إلى أول 3`);
          const uniqueActions = [...new Set(allActions)].slice(0, 3);
          responseContent = uniqueActions.join("\n");
        }
        
        const hasAction = /\[ACTION:[^\]]+\]/.test(responseContent);
        if (!hasAction) {
          if (this.looksLikeHallucinatedData(responseContent)) {
            console.warn(`⚠️ [AIAgentService] اكتشاف بيانات مُختَلقة محتملة، استبدال بـ DASHBOARD`);
            responseContent = "[ACTION:DASHBOARD]";
          }
        }
      }

      const { processedResponse, action, actionData } = await this.parseAndExecuteActions(
        responseContent,
        sessionId,
        securityContext
      );
      
      steps[1].status = "completed";
      steps[2].status = "in_progress";

      if (action === "EXPORT_EXCEL") {
        steps.push({ title: "توليد ملف Excel الاحترافي", status: "completed" });
      }

      steps[2].status = "completed";

      const cleanedResponse = this.sanitizeResponseForUser(processedResponse);

      await db.insert(aiChatMessages).values({
        sessionId,
        role: "assistant",
        content: cleanedResponse,
        model: aiResponse.model,
        provider: aiResponse.provider,
        tokensUsed: aiResponse.tokensUsed,
        action,
        actionData,
        steps, // تخزين الخطوات في قاعدة البيانات إذا كان الحقل موجوداً، أو تجاهله
      } as any);

      // تحديث عدد الرسائل
      await db.update(aiChatSessions)
        .set({ 
          messagesCount: sql`${aiChatSessions.messagesCount} + 1`,
          lastMessageAt: new Date(),
          updated_at: new Date(),
        })
        .where(eq(aiChatSessions.id, sessionId));

      // تحديث إحصائيات الاستخدام
      await this.updateUsageStats(userId, aiResponse);

      return {
        message: cleanedResponse,
        data: actionData,
        action,
        model: aiResponse.model,
        provider: aiResponse.provider,
        sessionId,
        steps,
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
    const providerString = response.provider as string;
    
    const existing = await db
      .select()
      .from(aiUsageStats)
      .where(and(
        eq(aiUsageStats.user_id, userId),
        eq(aiUsageStats.date, today),
        eq(aiUsageStats.provider, providerString),
        eq(aiUsageStats.model, response.model)
      ));

    if (existing.length > 0) {
      await db.update(aiUsageStats)
        .set({
          requestsCount: sql`${aiUsageStats.requestsCount} + 1`,
          tokensUsed: sql`${aiUsageStats.tokensUsed} + ${response.tokensUsed || 0}`,
          updated_at: new Date(),
        })
        .where(eq(aiUsageStats.id, existing[0].id));
    } else {
      await db.insert(aiUsageStats).values({
        user_id: userId,
        date: today,
        provider: providerString,
        model: response.model,
        requestsCount: 1,
        tokensUsed: response.tokensUsed || 0,
      });
    }
  }

  /**
   * الحصول على قائمة نماذج Hugging Face المتاحة
   */
  getAvailableHuggingFaceModels() {
    return this.modelManager.getAvailableHuggingFaceModels();
  }

  /**
   * تبديل نموذج Hugging Face
   */
  async switchHuggingFaceModel(modelKey: string): Promise<boolean> {
    return await this.modelManager.switchHuggingFaceModel(modelKey as any);
  }

  // متغير لحفظ العمليات المعلقة التي تنتظر الموافقة
  private pendingOperations: Map<string, { type: string; params: string[]; sessionId: string }> = new Map();

  /**
   * تحليل وتنفيذ الأوامر في رد الوكيل
   * أوامر القراءة [ACTION] تنفذ مباشرة
   * أوامر التعديل [PROPOSE] تنتظر موافقة المسؤول
   */
  private async parseAndExecuteActions(
    response: string,
    sessionId?: string,
    securityContext?: import("./WhatsAppSecurityContext").WhatsAppSecurityContext
  ): Promise<{ processedResponse: string; action?: string; actionData?: any }> {
    
    // التحقق من وجود أوامر قراءة [ACTION]
    const actionMatch = response.match(/\[ACTION:([^\]]+)\]/);
    const proposeMatch = response.match(/\[PROPOSE:([^\]]+)\]/);
    const confirmMatch = response.match(/\[CONFIRM:([^\]]+)\]/);
    const alertMatch = response.match(/\[ALERT:([^\]]+)\]/);

    let processedResponse = response;
    let result: ActionResult | ReportResult | null = null;
    let action: string | undefined;

    // معالجة أوامر التنبيه الذكي
    if (alertMatch) {
      const alertParts = alertMatch[1].split(":");
      const alertType = alertParts[0];
      const alertMsg = alertParts[1];
      const projectId = alertParts[2];
      
      try {
        const notificationService = new (await import("../NotificationService")).NotificationService();
        await notificationService.createNotification({
          type: "system",
          title: `تنبيه ذكي: ${alertType}`,
          body: alertMsg,
          projectId: projectId,
          priority: 4, // High
          recipients: "admin"
        });
        processedResponse = processedResponse.replace(/\[ALERT:[^\]]+\]\s*/g, "*(تم إرسال تنبيه للنظام)* ");
      } catch (e) {
        console.error("Error creating AI alert:", e);
      }
    }

    // معالجة أوامر القراءة
    if (actionMatch) {
      // استخراج جميع الأوامر إذا كان هناك أكثر من واحد
      const allActions = response.match(/\[ACTION:([^\]]+)\]/g) || [];
      const results: any[] = [];

      for (const fullAction of allActions) {
        const actionMatchInner = fullAction.match(/\[ACTION:([^\]]+)\]/);
        if (!actionMatchInner) continue;

        const actionParts = actionMatchInner[1].split(":");
        const actionType = actionParts[0];
        const actionParams = actionParts.slice(1);
        action = actionType;

        try {
          const ADMIN_ONLY_ACTIONS = ["SQL_SELECT", "LIST_TABLES", "DESCRIBE_TABLE", "ALL_PROJECTS_REPORT"];
          if (securityContext && !securityContext.isAdmin && ADMIN_ONLY_ACTIONS.includes(actionType)) {
            results.push({
              type: actionType,
              result: { success: false, message: "ليس لديك صلاحية لهذا الأمر. هذا الأمر متاح فقط للمسؤولين.", action: actionType }
            });
            continue;
          }

          const scopeIds = securityContext ? securityContext.accessibleProjectIds : undefined;

          let currentResult: ActionResult | ReportResult | null = null;
          switch (actionType) {
            case "FIND_WORKER":
              currentResult = await this.dbActions.findWorkerByName(actionParams[0] || "", scopeIds);
              break;

            case "GET_PROJECT":
              currentResult = await this.dbActions.getProjectInfo(actionParams[0] || "", scopeIds);
              break;

            case "WORKER_STATEMENT": {
              let workerId = actionParams[0] || "";
              const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workerId);
              if (!isUUID && workerId) {
                console.log(`🔍 [AI] WORKER_STATEMENT received name "${workerId}", auto-resolving to UUID...`);
                const searchResult = await this.dbActions.findWorkerByName(workerId, scopeIds);
                if (searchResult.success && searchResult.data?.length === 1) {
                  workerId = searchResult.data[0].id;
                  console.log(`✅ [AI] Auto-resolved worker "${actionParams[0]}" -> UUID: ${workerId}`);
                } else if (searchResult.success && searchResult.data?.length > 1) {
                  currentResult = {
                    success: true,
                    data: searchResult.data.map((w: any) => ({ id: w.id, name: w.name, dailyWage: w.dailyWage, projectId: w.projectId })),
                    message: `تم العثور على ${searchResult.data.length} عامل بهذا الاسم. يرجى تحديد العامل المطلوب:`,
                  };
                  break;
                } else {
                  currentResult = { success: false, message: `لم يتم العثور على عامل باسم "${actionParams[0]}"` };
                  break;
                }
              }
              currentResult = await this.reportGenerator.generateWorkerStatement(workerId);
              break;
            }

            case "PROJECT_EXPENSES": {
              const pId = actionParams[0] || "";
              if (scopeIds && !scopeIds.includes(pId)) {
                currentResult = { success: false, message: "ليس لديك صلاحية الوصول لهذا المشروع", action: "project_expenses" };
              } else {
                currentResult = await this.reportGenerator.generateProjectExpensesSummary(pId);
              }
              break;
            }

            case "DAILY_EXPENSES": {
              const projectId = actionParams[0] || "";
              if (scopeIds && !scopeIds.includes(projectId)) {
                currentResult = { success: false, message: "ليس لديك صلاحية الوصول لهذا المشروع", action: "daily_expenses" };
                break;
              }
              let dateStr = actionParams[1];
              
              if (!dateStr || dateStr === "yesterday" || dateStr === "yesterday") {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                dateStr = yesterday.toISOString().split("T")[0];
              } else if (dateStr === "today") {
                dateStr = new Date().toISOString().split("T")[0];
              }
              
              currentResult = await this.reportGenerator.generateDailyExpensesReport(projectId, dateStr);
              break;
            }

            case "LIST_PROJECTS":
              currentResult = await this.dbActions.getAllProjects(scopeIds);
              break;

            case "ALL_PROJECTS_REPORT":
              currentResult = await this.dbActions.getAllProjectsWithExpenses(scopeIds);
              break;

            case "LIST_WORKERS":
              currentResult = await this.dbActions.getAllWorkers(scopeIds);
              break;

            case "LIST_TABLES":
              if (scopeIds) {
                currentResult = { success: false, message: "هذا الأمر متاح فقط للمسؤولين", action: "list_tables" };
              } else {
                currentResult = await this.dbActions.listAllTables();
              }
              break;

            case "DESCRIBE_TABLE":
              if (scopeIds) {
                currentResult = { success: false, message: "هذا الأمر متاح فقط للمسؤولين", action: "describe_table" };
              } else {
                currentResult = await this.dbActions.describeTable(actionParams[0] || "");
              }
              break;

            case "SEARCH":
              if (scopeIds) {
                currentResult = { success: false, message: "هذا الأمر متاح فقط للمسؤولين", action: "search_table" };
              } else {
                currentResult = await this.dbActions.searchInTable(
                  actionParams[0] || "",
                  actionParams[1] || "",
                  actionParams[2] || "",
                  actionParams[3] ? parseInt(actionParams[3]) : undefined
                );
              }
              break;

            case "SQL_SELECT":
              if (scopeIds) {
                currentResult = { success: false, message: "هذا الأمر متاح فقط للمسؤولين", action: "sql_select" };
              } else {
                currentResult = await this.dbActions.executeRawSelect(actionParams.join(":"));
              }
              break;

            case "EXPORT_EXCEL":
              if (actionParams[0] === "WORKER_STATEMENT") {
                currentResult = await this.reportGenerator.generateWorkerStatementExcel(actionParams[1]);
              } else if (actionParams[0] === "PROJECT_FULL") {
                if (scopeIds && !scopeIds.includes(actionParams[1])) {
                  currentResult = { success: false, message: "ليس لديك صلاحية الوصول لهذا المشروع" };
                } else {
                  currentResult = await this.reportGenerator.generateProjectFullExcel(actionParams[1]);
                }
              } else if (actionParams[0] === "SUPPLIER_STATEMENT") {
                currentResult = await this.reportGenerator.generateSupplierStatementExcel(actionParams[1]);
              } else if (actionParams[0] === "DASHBOARD") {
                currentResult = await this.reportGenerator.generateDashboardExcel();
              } else {
                currentResult = { success: false, message: "نوع التقرير غير مدعوم حالياً" };
              }
              break;

            case "DASHBOARD":
              currentResult = await this.dbActions.getDashboardSummary(scopeIds);
              break;

            case "LIST_SUPPLIERS":
              currentResult = await this.dbActions.getSuppliersList(scopeIds);
              break;

            case "SUPPLIER_STATEMENT": {
              let supplierId = actionParams[0] || "";
              currentResult = await this.dbActions.getSupplierStatement(supplierId, scopeIds);
              break;
            }

            case "LIST_EQUIPMENT":
              currentResult = await this.dbActions.getEquipmentList(scopeIds);
              break;

            case "EQUIPMENT_MOVEMENTS":
              currentResult = await this.dbActions.getEquipmentMovements(actionParams[0] || "", scopeIds);
              break;

            case "LIST_WELLS":
              currentResult = await this.dbActions.getWellsList(scopeIds);
              break;

            case "WELL_DETAILS":
              currentResult = await this.dbActions.getWellDetails(actionParams[0] || "", scopeIds);
              break;

            case "TOP_WORKERS":
              currentResult = await this.dbActions.getTopWorkers(parseInt(actionParams[0]) || 10, scopeIds);
              break;

            case "UNPAID_BALANCES":
              currentResult = await this.dbActions.getWorkersUnpaidBalances(scopeIds);
              break;

            case "BUDGET_ANALYSIS":
              currentResult = await this.dbActions.getBudgetAnalysis(scopeIds);
              break;

            case "RECENT_ACTIVITIES":
              currentResult = await this.dbActions.getRecentActivities(parseInt(actionParams[0]) || 20, scopeIds);
              break;

            case "MONTHLY_TRENDS":
              currentResult = await this.dbActions.getMonthlyTrends(actionParams[0] || undefined, scopeIds);
              break;

            case "GLOBAL_SEARCH":
              currentResult = await this.dbActions.searchGlobal(actionParams[0] || "", scopeIds);
              break;

            case "PROJECT_COMPARISON":
              currentResult = await this.dbActions.getProjectComparison(scopeIds);
              break;

            default:
              console.log(`⚠️ Unknown action: ${actionType}`);
          }

          if (currentResult) {
            results.push({ type: actionType, result: currentResult });
            // إذا كان هذا هو الأمر الأول أو الأهم، نحفظه كـ "result" الرئيسي للتوافق مع الكود القديم
            if (!result) result = currentResult;
          }
        } catch (error: any) {
          console.error(`❌ Action error: ${error.message}`);
          results.push({ type: actionType, result: { success: false, message: `خطأ في تنفيذ الأمر: ${error.message}` } });
        }
      }

      if (results.length > 0) {
        processedResponse = "";
      }

      // دمج جميع النتائج في الرد
      for (const res of results) {
        const actionType = res.type;
        const currentResult = res.result;

        if (currentResult.success) {
          if (actionType === "EXPORT_EXCEL" && (currentResult as ReportResult).filePath) {
            processedResponse += `\n\n📄 **تم إنشاء ملف Excel بنجاح!**\nيمكنك تحميل الملف من الرابط التالي: [تحميل ملف Excel](${(currentResult as ReportResult).filePath})`;
          } else if (actionType === "ALL_PROJECTS_REPORT") {
            processedResponse += `\n\n✅ ${currentResult.message}`;
            if (Array.isArray(currentResult.data) && currentResult.data.length > 0) {
              processedResponse += "\n\n" + this.formatProjectsReport(currentResult.data);
            }
          } else if (actionType === "WORKER_STATEMENT" || actionType === "PROJECT_EXPENSES" || actionType === "DAILY_EXPENSES") {
            const formattedReport = this.reportGenerator.formatAsText(currentResult.data, this.getActionTitle(actionType));
            processedResponse += "\n\n" + formattedReport;
          } else if (actionType === "DASHBOARD") {
            processedResponse += "\n\n" + this.formatDashboard(currentResult.data);
          } else if (actionType === "BUDGET_ANALYSIS") {
            processedResponse += "\n\n" + this.formatBudgetAnalysis(currentResult.data);
          } else if (actionType === "SUPPLIER_STATEMENT") {
            if (Array.isArray(currentResult.data)) {
              processedResponse += `\n\n⚠️ ${currentResult.message}\n`;
              for (const s of currentResult.data) {
                processedResponse += `- **${s.name}** (${s.id}) — دين: ${parseFloat(s.totalDebt || '0').toLocaleString('ar')} ريال\n`;
              }
              processedResponse += `\nيرجى تحديد المورد بالمعرّف (ID) للحصول على كشف الحساب.`;
            } else {
              processedResponse += "\n\n" + this.formatSupplierStatement(currentResult.data);
            }
          } else if (actionType === "UNPAID_BALANCES") {
            processedResponse += "\n\n" + this.formatUnpaidBalances(currentResult.data);
          } else if (actionType === "TOP_WORKERS") {
            processedResponse += "\n\n" + this.formatTopWorkers(currentResult.data);
          } else if (actionType === "MONTHLY_TRENDS") {
            processedResponse += "\n\n" + this.formatMonthlyTrends(currentResult.data);
          } else if (actionType === "PROJECT_COMPARISON") {
            processedResponse += "\n\n" + this.formatProjectComparison(currentResult.data);
          } else if (actionType === "LIST_SUPPLIERS") {
            processedResponse += "\n\n" + this.formatSuppliersList(currentResult.data);
          } else if (actionType === "LIST_EQUIPMENT") {
            processedResponse += "\n\n" + this.formatEquipmentList(currentResult.data);
          } else if (actionType === "LIST_WELLS") {
            processedResponse += "\n\n" + this.formatWellsList(currentResult.data);
          } else if (actionType === "WELL_DETAILS") {
            processedResponse += "\n\n" + this.formatWellDetails(currentResult.data);
          } else if (actionType === "RECENT_ACTIVITIES") {
            processedResponse += "\n\n" + this.formatRecentActivities(currentResult.data);
          } else if (actionType === "GLOBAL_SEARCH") {
            processedResponse += `\n\n✅ ${currentResult.message}`;
            if (Array.isArray(currentResult.data) && currentResult.data.length > 0) {
              processedResponse += "\n" + currentResult.data.map((r: any, i: number) => 
                `${i + 1}. [${r.type}] **${r.name}** (${r.id})`
              ).join("\n");
            }
          } else {
            processedResponse += `\n\n✅ ${currentResult.message}`;
            if (Array.isArray(currentResult.data) && currentResult.data.length > 0) {
              processedResponse += "\n" + this.formatDataList(currentResult.data);
            }
          }
        } else {
          processedResponse += `\n\n❌ ${currentResult.message}`;
        }
      }
    }

    // معالجة أوامر التعديل المقترحة (لا تنفذ - تنتظر الموافقة)
    if (proposeMatch) {
      const fullProposeContent = proposeMatch[1];
      const proposeType = fullProposeContent.split(":")[0];
      const proposeRest = fullProposeContent.substring(proposeType.length + 1);
      let proposeParams: string[];

      if (securityContext) {
        if (proposeType === "INSERT" && !securityContext.canAdd) {
          processedResponse = processedResponse.replace(/\[PROPOSE:[^\]]+\]\s*/g, "");
          processedResponse += "\n\n⛔ ليس لديك صلاحية لإضافة سجلات عبر هذا الرقم.";
          return { processedResponse, action: `PROPOSE_${proposeType}`, actionData: null };
        }
        if (proposeType === "UPDATE" && !securityContext.canEdit) {
          processedResponse = processedResponse.replace(/\[PROPOSE:[^\]]+\]\s*/g, "");
          processedResponse += "\n\n⛔ ليس لديك صلاحية لتعديل سجلات عبر هذا الرقم.";
          return { processedResponse, action: `PROPOSE_${proposeType}`, actionData: null };
        }
        if (proposeType === "DELETE" && !securityContext.canDelete) {
          processedResponse = processedResponse.replace(/\[PROPOSE:[^\]]+\]\s*/g, "");
          processedResponse += "\n\n⛔ ليس لديك صلاحية لحذف سجلات عبر هذا الرقم.";
          return { processedResponse, action: `PROPOSE_${proposeType}`, actionData: null };
        }
      }

      if (proposeType === "INSERT" || proposeType === "UPDATE") {
        const jsonStart = proposeRest.indexOf("{");
        if (jsonStart >= 0) {
          const beforeJson = proposeRest.substring(0, jsonStart).replace(/:$/, "");
          const jsonPart = proposeRest.substring(jsonStart);
          proposeParams = [...beforeJson.split(":").filter(p => p), jsonPart];
        } else {
          proposeParams = proposeRest.split(":");
        }
      } else if (proposeType === "EXECUTE_SQL") {
        proposeParams = [proposeRest];
      } else {
        proposeParams = proposeRest.split(":");
      }

      action = `PROPOSE_${proposeType}`;

      const operationId = `op_${Date.now()}`;
      this.pendingOperations.set(operationId, {
        type: proposeType === "INSERT" ? "INSERT_TABLE" :
              proposeType === "UPDATE" ? "UPDATE_TABLE" :
              proposeType === "DELETE" ? "DELETE_TABLE" :
              proposeType,
        params: proposeParams,
        sessionId: sessionId || "",
      });

      processedResponse = processedResponse.replace(/\[PROPOSE:[^\]]+\]\s*/g, "");
      processedResponse += `\n\n🔐 **معرف العملية:** ${operationId}`;
    }

    return { processedResponse, action, actionData: result?.data };
  }

  /**
   * تنفيذ عملية معلقة بعد موافقة المسؤول
   */
  async executeApprovedOperation(
    operationId: string,
    sessionId: string
  ): Promise<ActionResult> {
    const operation = this.pendingOperations.get(operationId);

    if (!operation) {
      return {
        success: false,
        message: "لم يتم العثور على العملية أو انتهت صلاحيتها",
        action: "execute_operation",
      };
    }

    if (operation.sessionId !== sessionId) {
      return {
        success: false,
        message: "غير مصرح لك بتنفيذ هذه العملية",
        action: "execute_operation",
      };
    }

    let result: ActionResult;

    try {
      switch (operation.type) {
        case "CREATE_PROJECT":
          result = await this.dbActions.createProject({ name: operation.params[0] || "مشروع جديد" });
          break;

        case "CREATE_WORKER":
          result = await this.dbActions.createWorker({
            name: operation.params[0] || "عامل جديد",
            type: operation.params[1] || "عامل",
            dailyWage: operation.params[2] || "200",
          });
          break;

        case "UPDATE_WORKER":
          result = await this.dbActions.updateWorker(operation.params[0], {
            [operation.params[1]]: operation.params[2],
          });
          break;

        case "UPDATE_PROJECT":
          result = await this.dbActions.updateProject(operation.params[0], {
            [operation.params[1]]: operation.params[2],
          });
          break;

        case "DELETE_WORKER":
          result = await this.dbActions.deleteWorker(operation.params[0], true);
          break;

        case "DELETE_PROJECT":
          result = await this.dbActions.deleteProject(operation.params[0], true);
          break;

        case "DELETE_ATTENDANCE":
          result = await this.dbActions.deleteAttendance(operation.params[0], true);
          break;

        case "INSERT_TABLE": {
          const insertTable = operation.params[0];
          let insertData: Record<string, any> = {};
          try {
            insertData = JSON.parse(operation.params[1] || "{}");
          } catch {
            result = { success: false, message: "بيانات JSON غير صالحة للإضافة", action: "insert_table" };
            break;
          }
          result = await this.dbActions.insertIntoTable(insertTable, insertData);
          break;
        }

        case "UPDATE_TABLE": {
          const updateTable = operation.params[0];
          const updateId = operation.params[1];
          let updateData: Record<string, any> = {};
          try {
            updateData = JSON.parse(operation.params[2] || "{}");
          } catch {
            result = { success: false, message: "بيانات JSON غير صالحة للتحديث", action: "update_table" };
            break;
          }
          result = await this.dbActions.updateInTable(updateTable, updateId, updateData);
          break;
        }

        case "DELETE_TABLE":
          result = await this.dbActions.deleteFromTable(operation.params[0], operation.params[1], true);
          break;

        case "EXECUTE_SQL":
          result = await this.dbActions.executeCustomQuery(operation.params.join(":"), true);
          break;

        default:
          result = { success: false, message: `نوع عملية غير معروف: ${operation.type}`, action: operation.type };
      }
    } catch (error: any) {
      result = { success: false, message: `خطأ في التنفيذ: ${error.message}`, action: operation.type };
    }

    // إزالة العملية بعد التنفيذ
    this.pendingOperations.delete(operationId);

    return result;
  }

  /**
   * إلغاء عملية معلقة
   */
  cancelPendingOperation(operationId: string, sessionId: string): boolean {
    const operation = this.pendingOperations.get(operationId);
    if (operation && operation.sessionId === sessionId) {
      this.pendingOperations.delete(operationId);
      return true;
    }
    return false;
  }

  /**
   * الحصول على العمليات المعلقة لجلسة معينة
   */
  getPendingOperations(sessionId: string) {
    const operations: any[] = [];
    this.pendingOperations.forEach((op, id) => {
      if (op.sessionId === sessionId) {
        operations.push({ id, ...op });
      }
    });
    return operations;
  }

  /**
   * الحصول على عنوان العملية
   */
  private getActionTitle(action: string): string {
    switch (action) {
      case "WORKER_STATEMENT": return "كشف حساب العامل";
      case "PROJECT_EXPENSES": return "ملخص مصروفات المشروع";
      case "DAILY_EXPENSES": return "تقرير المصروفات اليومي";
      default: return "تقرير النظام";
    }
  }

  private looksLikeHallucinatedData(response: string): boolean {
    const hallucinationPatterns = [
      /\d+[\.,]\d+\s*(?:ريال|دينار|دولار|جنيه)/,
      /المبلغ:\s*\d+/,
      /تاريخ\s*(?:الشراء|التسجيل|الإضافة):\s*\d{4}/,
      /\*\*[^*]+\*\*\s*—\s*المبلغ/,
      /\d+\.\s*\*\*[^*]+\*\*/,
    ];
    let matchCount = 0;
    for (const pattern of hallucinationPatterns) {
      if (pattern.test(response)) matchCount++;
    }
    return matchCount >= 2;
  }

  private sanitizeResponseForUser(response: string): string {
    let cleaned = response;
    cleaned = cleaned.replace(/\[ACTION:[^\]]*\]/g, "");
    cleaned = cleaned.replace(/\[PROPOSE:[^\]]*\]/g, "");
    cleaned = cleaned.replace(/\[ALERT:[^\]]*\]/g, "");
    cleaned = cleaned.replace(/ACTION:[A-Z_]+(?::[^\s\]]*)?/g, "");
    cleaned = cleaned.replace(/يرجى استخدام أوامر.*?(?:\n|$)/g, "");
    cleaned = cleaned.replace(/استخدم? أوامر \[ACTION\].*?(?:\n|$)/g, "");
    cleaned = cleaned.replace(/أوامر \[?ACTION\]?.*?(?:الموضحة|المتاحة|التالية).*?(?:\n|$)/g, "");
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
    cleaned = cleaned.trim();
    if (!cleaned || cleaned.length < 5) {
      cleaned = "لا توجد بيانات مسجلة حالياً. يمكنك سؤالي عن المشاريع، العمال، المصروفات، أو أي معلومة أخرى.";
    }
    return cleaned;
  }

  // ==================== كشف النوايا الذكي (Fallback) ====================

  private detectIntentFromUserMessage(message: string): string | null {
    const msg = message.toLowerCase().trim();
    const patterns: [RegExp, string][] = [
      [/(?:لوح[ةه]\s*(?:المعلومات|التحكم|القياد)|ملخص\s*(?:شامل|عام|النظام)|dashboard|الحال[ةه]\s*العام)/i, "[ACTION:DASHBOARD]"],
      [/(?:تحلي[لل]\s*(?:ال)?ميزاني|ميزاني[ةه]|budget|مخاطر\s*مالي|تجاوز\s*الميزاني)/i, "[ACTION:BUDGET_ANALYSIS]"],
      [/(?:مستحق|غير\s*مدفوع|لم\s*[يت]دفع|unpaid|رواتب\s*متأخر|عمال\s*لم|من\s*لم)/i, "[ACTION:UNPAID_BALANCES]"],
      [/(?:أعلى\s*(?:ال)?عمال|أكثر\s*(?:ال)?عمال|top\s*workers|ترتيب\s*العمال)/i, "[ACTION:TOP_WORKERS]"],
      [/(?:قائم[ةه]\s*(?:ال)?موردي|عرض\s*(?:ال)?موردي|كل\s*(?:ال)?موردي|suppliers)/i, "[ACTION:LIST_SUPPLIERS]"],
      [/(?:قائم[ةه]\s*(?:ال)?عمال|عرض\s*(?:ال)?عمال|كل\s*(?:ال)?عمال|جميع\s*(?:ال)?عمال)/i, "[ACTION:LIST_WORKERS]"],
      [/(?:قائم[ةه]\s*(?:ال)?مشاري|عرض\s*(?:ال)?مشاري|كل\s*(?:ال)?مشاري|جميع\s*(?:ال)?مشاري|تقرير\s*(?:ال)?مشاري)/i, "[ACTION:ALL_PROJECTS_REPORT]"],
      [/(?:قائم[ةه]\s*(?:ال)?معدا|عرض\s*(?:ال)?معدا|كل\s*(?:ال)?معدا|equipment)/i, "[ACTION:LIST_EQUIPMENT]"],
      [/(?:قائم[ةه]\s*(?:ال)?آبار|عرض\s*(?:ال)?آبار|كل\s*(?:ال)?آبار|wells)/i, "[ACTION:LIST_WELLS]"],
      [/(?:مقارن[ةه]\s*(?:ال)?مشاري|comparison|قارن\s*بين)/i, "[ACTION:PROJECT_COMPARISON]"],
      [/(?:اتجاه|شهري|trends|monthly)/i, "[ACTION:MONTHLY_TRENDS]"],
      [/(?:آخر\s*(?:ال)?عمليا|أحدث\s*(?:ال)?نشاط|recent|أحدث\s*(?:ال)?عمليا|آخر\s*(?:ال)?أحداث)/i, "[ACTION:RECENT_ACTIVITIES]"],
      [/(?:كشف\s*حساب\s*(?:ال)?مورد|بيان\s*(?:ال)?مورد|supplier\s*statement)/i, "[ACTION:SUPPLIER_STATEMENT]"],
      [/(?:المشتريات|مشتريات|شراء|مواد\s*مشتراة|فواتير\s*الشراء|purchases)/i, "[ACTION:DASHBOARD]"],
      [/(?:المصروفات|مصروفات|مصاريف|نفقات|expenses)/i, "[ACTION:DASHBOARD]"],
      [/(?:الحضور|حضور\s*العمال|سجل\s*الحضور|attendance)/i, "[ACTION:DASHBOARD]"],
      [/(?:التحويلات|تحويلات|حوالات|transfers)/i, "[ACTION:DASHBOARD]"],
    ];

    for (const [pattern, action] of patterns) {
      if (pattern.test(msg)) return action;
    }

    const workerStatementMatch = msg.match(/(?:كشف\s*حساب|بيان)\s*(?:ال)?عامل\s+(.+)/i);
    if (workerStatementMatch) return `[ACTION:WORKER_STATEMENT:${workerStatementMatch[1].trim()}]`;

    const searchMatch = msg.match(/(?:ابحث|بحث|find|search)\s+(?:عن\s+)?(.+)/i);
    if (searchMatch) return `[ACTION:GLOBAL_SEARCH:${searchMatch[1].trim()}]`;

    return null;
  }

  // ==================== دوال التنسيق الاحترافي ====================

  private n(val: any): string {
    const num = parseFloat(String(val ?? 0));
    if (isNaN(num)) return "0";
    return num.toLocaleString("ar");
  }

  private formatDashboard(data: any): string {
    const p = data.projects;
    const w = data.workers;
    const f = data.finance;
    const s = data.suppliers;
    let text = `📊 **لوحة المعلومات الشاملة**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `🏗️ **المشاريع:** ${p.total} مشروع (${p.active} نشط، ${p.completed} مكتمل)\n`;
    text += `👷 **العمال:** ${w.total} عامل (${w.active} نشط)\n`;
    text += `📦 **الموردون:** ${s.total} مورد (ديون: ${this.n(s.totalDebt)} ريال)\n`;
    text += `🔧 **المعدات:** ${data.equipment.total} قطعة\n`;
    text += `💧 **الآبار:** ${data.wells.total} بئر\n\n`;

    text += `💰 **الملخص المالي:**\n`;
    text += `   إجمالي التمويل: **${this.n(f.totalFunds)} ريال**\n`;
    text += `   ├─ أجور العمال: ${this.n(f.totalWages)} ريال\n`;
    text += `   ├─ المواد: ${this.n(f.totalMaterials)} ريال\n`;
    text += `   ├─ النقل: ${this.n(f.totalTransport)} ريال\n`;
    text += `   └─ إجمالي المصروفات: ${this.n(f.totalExpenses)} ريال\n`;
    text += `   ${f.balance >= 0 ? "✅" : "⚠️"} **الرصيد: ${this.n(f.balance)} ريال**\n`;
    return text;
  }

  private formatBudgetAnalysis(data: any): string {
    const { projects: pList, summary } = data;
    let text = `📈 **تحليل الميزانيات**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    if (summary.exceeded > 0) text += `🚨 **${summary.exceeded} مشروع تجاوز الميزانية!**\n`;
    if (summary.critical > 0) text += `⚠️ **${summary.critical} مشروع في منطقة الخطر**\n\n`;

    for (const p of pList) {
      const icon = p.riskLevel === 'exceeded' ? '🔴' : p.riskLevel === 'critical' ? '🟠' : p.riskLevel === 'warning' ? '🟡' : p.riskLevel === 'no_budget' ? '⚪' : '🟢';
      if (p.riskLevel === 'no_budget') {
        text += `${icon} **${p.projectName}** — بدون ميزانية محددة\n`;
        text += `   التمويل: ${this.n(p.totalFunds)} | المصروف: ${this.n(p.totalExpenses)} ريال\n`;
      } else {
        text += `${icon} **${p.projectName}** — ${p.usagePercent}% من الميزانية\n`;
        text += `   الميزانية: ${this.n(p.budget)} | المصروف: ${this.n(p.totalExpenses)} | المتبقي: ${this.n(p.remaining)} ريال\n`;
      }
    }
    return text;
  }

  private formatSupplierStatement(data: any): string {
    const { supplier, purchases, payments, summary } = data;
    let text = `📦 **كشف حساب المورد: ${supplier.name}**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📞 ${supplier.phone || '-'} | شروط الدفع: ${supplier.paymentTerms || '-'}\n\n`;

    text += `**المشتريات (${purchases.length}):**\n`;
    for (const p of purchases.slice(0, 15)) {
      text += `   📅 ${p.purchaseDate || '-'} | ${p.materialName || 'مواد'} | ${this.n(p.totalAmount)} ريال\n`;
    }

    text += `\n**المدفوعات (${payments.length}):**\n`;
    for (const p of payments.slice(0, 15)) {
      text += `   📅 ${p.paymentDate} | ${p.paymentMethod} | ${this.n(p.amount)} ريال\n`;
    }

    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `إجمالي المشتريات: **${this.n(summary.totalPurchases)} ريال**\n`;
    text += `إجمالي المدفوعات: **${this.n(summary.totalPayments)} ريال**\n`;
    const bal = summary.balance;
    text += `${bal > 0 ? "🔴" : "✅"} الرصيد المتبقي: **${this.n(bal)} ريال**\n`;
    return text;
  }

  private formatUnpaidBalances(data: any): string {
    let text = `💸 **المستحقات غير المدفوعة**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `عدد العمال: ${data.count} | الإجمالي: **${this.n(data.totalUnpaid)} ريال**\n\n`;

    for (const w of (data.workers || []).slice(0, 20)) {
      text += `👷 **${w.name}** — مستحق: **${this.n(w.balance)} ريال**\n`;
      text += `   (مكتسب: ${this.n(w.totalEarned)} | مدفوع: ${this.n(w.totalPaid)})\n`;
    }
    return text;
  }

  private formatTopWorkers(data: any[]): string {
    let text = `🏆 **أعلى العمال من حيث المستحقات**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (let i = 0; i < data.length; i++) {
      const w = data[i];
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      text += `${medal} **${w.name}** (${w.type || '-'}) — ${this.n(w.totalEarned)} ريال (${this.n(w.totalDays)} يوم)\n`;
    }
    return text;
  }

  private formatMonthlyTrends(data: any[]): string {
    let text = `📈 **اتجاهات المصروفات الشهرية**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const m of data) {
      const total = parseFloat(m.wages || 0) + parseFloat(m.materials || 0) + parseFloat(m.transport || 0);
      text += `📅 **${m.month}** — الإجمالي: ${this.n(total)} ريال\n`;
      text += `   أجور: ${this.n(m.wages)} | مواد: ${this.n(m.materials)} | نقل: ${this.n(m.transport)}\n`;
    }
    return text;
  }

  private formatProjectComparison(data: any[]): string {
    let text = `📊 **مقارنة المشاريع**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (let i = 0; i < data.length; i++) {
      const p = data[i];
      text += `${i + 1}. **${p.name}** (${p.status === 'active' ? '🟢 نشط' : '⚪ مكتمل'})\n`;
      text += `   تمويل: ${this.n(p.totalFunds)} | مصروفات: ${this.n(p.totalExpenses)} | رصيد: ${this.n(p.balance)} ريال\n`;
      text += `   أجور: ${this.n(p.wages)} | مواد: ${this.n(p.materials)} | نقل: ${this.n(p.transport)} | عمال: ${p.workerCount}\n\n`;
    }
    return text;
  }

  private formatSuppliersList(data: any[]): string {
    let text = `📦 **قائمة الموردين** (${data.length})\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (let i = 0; i < data.length; i++) {
      const s = data[i];
      const debt = parseFloat(s.totalDebt || '0');
      text += `${i + 1}. 📋 **${s.name}** (ID: ${s.id?.slice(0, 8)})\n`;
      text += `   ${debt > 0 ? `💰 دين: ${this.n(debt)} ريال` : '✅ لا ديون'}`;
      if (s.phone) text += ` | 📞 ${s.phone}`;
      if (s.paymentTerms) text += ` | شروط: ${s.paymentTerms}`;
      text += '\n';
    }
    return text;
  }

  private formatEquipmentList(data: any[]): string {
    let text = `🔧 **قائمة المعدات** (${data.length})\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const e of data) {
      const statusIcon = e.status === 'available' ? '🟢' : e.status === 'in_use' ? '🔵' : '🔴';
      text += `${statusIcon} **${e.name}** — الكمية: ${e.quantity} ${e.unit || ''} | الحالة: ${e.status || 'متاحة'}\n`;
    }
    return text;
  }

  private formatWellsList(data: any[]): string {
    let text = `💧 **قائمة الآبار** (${data.length})\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const w of data) {
      const pct = w.completionPercentage || 0;
      const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
      text += `🔹 **بئر #${w.wellNumber}** — ${w.ownerName} (${w.region || '-'})\n`;
      text += `   [${bar}] ${pct}% | الحالة: ${w.status || '-'}\n`;
    }
    return text;
  }

  private formatWellDetails(data: any): string {
    const { well, tasks, summary } = data;
    let text = `💧 **تفاصيل البئر رقم ${well.wellNumber}**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `المالك: ${well.ownerName} | المنطقة: ${well.region || '-'} | الإنجاز: ${well.completionPercentage || 0}%\n\n`;

    text += `**المهام (${summary.completedTasks}/${summary.totalTasks}):**\n`;
    for (const t of tasks) {
      const icon = t.status === 'completed' ? '✅' : t.status === 'in_progress' ? '🔄' : '⏳';
      text += `   ${icon} ${t.taskType} ${t.actualCost ? `— ${this.n(t.actualCost)} ريال` : ''}\n`;
    }

    text += `\nالتكلفة التقديرية: ${this.n(summary.totalEstimated)} ريال\n`;
    text += `التكلفة الفعلية: ${this.n(summary.totalActual)} ريال\n`;
    return text;
  }

  private formatRecentActivities(data: any[]): string {
    let text = `🕐 **آخر العمليات في النظام**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const a of data) {
      const icon = a.type === 'حضور' ? '👷' : a.type === 'مشتريات' ? '📦' : '💰';
      text += `${icon} ${a.date || '-'} | ${a.type} | ${a.description || '-'} | ${this.n(a.amount)} ريال\n`;
    }
    return text;
  }

  /**
   * تنسيق تقرير المشاريع الشامل بشكل احترافي
   */
  private formatProjectsReport(projects: any[]): string {
    let text = `📊 **تقرير المشاريع الشامل** — ${new Date().toLocaleDateString("ar-SA")}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    let grandTotalFunds = 0;
    let grandTotalExpenses = 0;

    projects.forEach((p, i) => {
      const funds = parseFloat(String(p.إجمالي_التمويل || p.totalFunds || 0));
      const expenses = parseFloat(String(p.إجمالي_المصروفات || p.totalExpenses || 0));
      const balance = parseFloat(String(p.الرصيد || p.balance || 0));
      const wages = parseFloat(String(p.الأجور || p.totalWages || 0));
      const materials = parseFloat(String(p.المواد || p.totalMaterials || 0));
      const transport = parseFloat(String(p.النقل || p.totalTransport || 0));
      const misc = parseFloat(String(p.متنوعات || p.totalMisc || 0));
      const budget = parseFloat(String(p.الميزانية || p.budget || 0));

      grandTotalFunds += funds;
      grandTotalExpenses += expenses;

      const balanceSign = balance >= 0 ? "✅" : "⚠️";
      const statusEmoji = (p.الحالة || p.status) === "completed" ? "✔️" : "🏗️";

      text += `${i + 1}. ${statusEmoji} **${p.المشروع || p.name}**\n`;
      text += `   الحالة: ${p.الحالة || p.status || "نشط"}\n`;
      if (budget > 0) text += `   الميزانية: ${budget.toLocaleString("ar")} ريال\n`;
      text += `   إجمالي التمويل: ${funds.toLocaleString("ar")} ريال\n`;
      if (wages > 0) text += `   ├─ أجور العمال: ${wages.toLocaleString("ar")} ريال\n`;
      if (materials > 0) text += `   ├─ المواد: ${materials.toLocaleString("ar")} ريال\n`;
      if (transport > 0) text += `   ├─ النقل: ${transport.toLocaleString("ar")} ريال\n`;
      if (misc > 0) text += `   ├─ متنوعات: ${misc.toLocaleString("ar")} ريال\n`;
      text += `   └─ إجمالي المصروفات: ${expenses.toLocaleString("ar")} ريال\n`;
      text += `   ${balanceSign} الرصيد: **${balance.toLocaleString("ar")} ريال**\n\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 **الإجماليات الكلية:**\n`;
    text += `   إجمالي التمويل: **${grandTotalFunds.toLocaleString("ar")} ريال**\n`;
    text += `   إجمالي المصروفات: **${grandTotalExpenses.toLocaleString("ar")} ريال**\n`;
    const grandBalance = grandTotalFunds - grandTotalExpenses;
    text += `   ${grandBalance >= 0 ? "✅" : "⚠️"} صافي الرصيد: **${grandBalance.toLocaleString("ar")} ريال**\n`;

    return text;
  }

  /**
   * تنسيق قائمة البيانات كفهرس نصي بسيط
   */
  private formatDataList(data: any[]): string {
    return data.map((item, index) => {
      const name = item.name || "بدون اسم";
      const status = item.status ? ` (${item.status})` : "";
      const wage = item.dailyWage ? ` — الأجر اليومي: ${item.dailyWage}` : "";
      return `${index + 1}. **${name}**${status}${wage}`;
    }).join("\n");
  }

  /**
   * التحقق من توفر الخدمة (نماذج اللغة)
   */
  isAvailable(): boolean {
    return this.modelManager.isAvailable();
  }

  /**
   * الحصول على حالة النماذج
   */
  getModelsStatus() {
    return this.modelManager.getModelsStatus();
  }

  /**
   * الحصول على جميع النماذج المتاحة
   */
  getAllModels() {
    return this.modelManager.getAllModels();
  }

  /**
   * الحصول على النموذج المحدد حالياً
   */
  getSelectedModel() {
    return this.modelManager.getSelectedModel();
  }

  /**
   * تحديد نموذج معين للاستخدام
   */
  setSelectedModel(modelKey: string | null) {
    this.modelManager.setSelectedModel(modelKey);
  }
}

let aiAgentService: AIAgentService | null = null;

export function getAIAgentService(): AIAgentService {
  if (!aiAgentService) {
    aiAgentService = new AIAgentService();
  }
  return aiAgentService;
}
