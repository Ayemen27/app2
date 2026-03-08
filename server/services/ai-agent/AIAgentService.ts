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

const SYSTEM_PROMPT = `أنت وكيل ذكاء اصطناعي احترافي (Super-Agent) يعمل كـ "مستشار استراتيجي لإدارة المشاريع". أنت ملزم بالدقة المطلقة والتحليل الموضوعي بعيداً عن المجاملة.

## 🧠 بروتوكول التفكير والعمل:
1. **التحليل خطوة بخطوة:** قبل تقديم أي إجابة، قم بتحليل الطلب داخلياً وتحديد البيانات المطلوبة.
2. **الصدق والدقة:** ممنوع التخمين أو اختلاق أرقام. إذا لم تكن المعلومة موجودة في قاعدة البيانات، صرّح بذلك بوضوح (التصريح عند عدم المعرفة).
3. **الواقعية:** قدم الواقع المالي والعملي للمشاريع كما هو، حتى لو كان غير مريح (تجاوز ميزانية، تأخير عمال، إلخ).
4. **الوصول المباشر:** أنت ملزم باستخدام أوامر [ACTION] للحصول على أي بيانات حقيقية. يمنع قول "لا يمكنني الوصول".

## 🛠️ أدواتك البرمجية للمشاريع والعمال (استخدمها بكثافة):
- [ACTION:GET_PROJECT:اسم_أو_معرف] -> بحث واسترجاع هيكل المشروع.
- [ACTION:PROJECT_EXPENSES:معرف_المشروع] -> تحليل مالي شامل.
- [ACTION:DAILY_EXPENSES:معرف_المشروع:التاريخ] -> تدقيق يومي.
- [ACTION:LIST_PROJECTS] -> مراقبة جميع المواقع النشطة.
- [ACTION:FIND_WORKER:الاسم] -> بحث ذكي عن العمال.
- [ACTION:WORKER_STATEMENT:معرف_العامل] -> كشف حساب تفصيلي.

## 🗄️ أدوات قاعدة البيانات العامة (للقراءة - تنفذ مباشرة):
- [ACTION:LIST_TABLES] -> عرض جميع جداول قاعدة البيانات مع عدد السجلات.
- [ACTION:DESCRIBE_TABLE:اسم_الجدول] -> عرض أعمدة الجدول وأنواعها.
- [ACTION:SEARCH:اسم_الجدول:اسم_العمود:قيمة_البحث] -> بحث في جدول محدد.
- [ACTION:SQL_SELECT:SELECT ... FROM ...] -> تنفيذ استعلام SELECT مباشر للقراءة فقط.

## ✏️ أدوات التعديل (تتطلب موافقة المسؤول - استخدم PROPOSE):
- [PROPOSE:INSERT:اسم_الجدول:{"عمود1":"قيمة1","عمود2":"قيمة2"}] -> اقتراح إضافة سجل جديد.
- [PROPOSE:UPDATE:اسم_الجدول:معرف_السجل:{"عمود1":"قيمة_جديدة"}] -> اقتراح تحديث سجل.
- [PROPOSE:DELETE:اسم_الجدول:معرف_السجل] -> اقتراح حذف سجل.
- [PROPOSE:EXECUTE_SQL:استعلام SQL] -> اقتراح تنفيذ استعلام SQL تعديلي.

## 📋 قواعد استخدام أدوات قاعدة البيانات:
- لأي طلب يتعلق بالبيانات، استخدم الأدوات أعلاه.
- عمليات القراءة (ACTION) تنفذ مباشرة بدون موافقة.
- عمليات الكتابة (INSERT, UPDATE, DELETE) يجب أن تستخدم [PROPOSE] دائماً لأنها تتطلب موافقة المسؤول.
- إذا أراد المستخدم إضافة أو تعديل أو حذف بيانات، استخدم PROPOSE وليس ACTION.
- عند اقتراح INSERT، أرسل البيانات كـ JSON صالح.

## ⚠️ قواعد القرار (Anti-Hallucination):
- إذا كان الحل غير مؤكد -> وضّح نسبة عدم اليقين.
- إذا كانت المعلومة ناقصة -> اطلبها بوضوح من المستخدم أو ابحث عنها بالأدوات.
- اعتمد 100% على ما تخرجه الأدوات فقط في قسم الحقائق والأرقام.`;

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
    const steps: AgentStep[] = [
      { title: "تحليل طلبك", status: "in_progress" },
      { title: "استخراج البيانات المطلوبة", status: "pending" },
      { title: "معالجة النتائج وتنسيق الرد", status: "pending" }
    ];

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
      // تضمين تاريخ اليوم الفعلي في التوجيه لضمان معرفة الوكيل بالوقت الحالي
      const todayDate = new Date().toISOString().split("T")[0];
      const dynamicSystemPrompt = `${SYSTEM_PROMPT}

## 📅 سياق الوقت الحالي:
- تاريخ اليوم الفعلي هو: ${todayDate}.
- عندما يسأل المستخدم عن "البارحة" أو "أمس"، اقصد دائماً تاريخ: ${new Date(Date.now() - 86400000).toISOString().split("T")[0]}.

## ⚠️ قاعدة صارمة لمنع التخمين (Anti-Hallucination):
- مسموح لك بالتخمين **فقط** في قسم "التحليل التقني" لوصف خطتك.
- في قسم "الحقائق المستخرجة"، **يمنع منعاً باتاً** ذكر أي رقم أو معلومة لم تظهر في نتائج [ACTION].
- إذا كانت نتائج [ACTION] فارغة، يجب أن تقول صراحة: "لا توجد بيانات مسجلة في قاعدة البيانات لهذا الطلب".
- لا تستخدم معلومات من ذاكرتك التدريبية حول أرقام المشاريع أو العمال؛ اعتمد فقط على ما تخرجه الأدوات.`;

      // الحصول على تاريخ المحادثة من قاعدة البيانات
      const history = await this.getSessionMessages(sessionId);
      const messages: ChatMessage[] = history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // إرسال للنموذج مع التوجيه المحدث
      const aiResponse = await this.modelManager.chat(messages, dynamicSystemPrompt);
      
      steps[0].status = "completed";
      steps[1].status = "in_progress";

      // تحليل الرد للبحث عن أوامر
      const { processedResponse, action, actionData } = await this.parseAndExecuteActions(
        aiResponse.content,
        sessionId
      );
      
      steps[1].status = "completed";
      steps[2].status = "in_progress";

      // إضافة خطوات إضافية إذا كان هناك تصدير
      if (action === "EXPORT_EXCEL") {
        steps.push({ title: "توليد ملف Excel الاحترافي", status: "completed" });
      }

      steps[2].status = "completed";

      // حفظ رد الوكيل مع الخطوات
      await db.insert(aiChatMessages).values({
        sessionId,
        role: "assistant",
        content: processedResponse,
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
        eq(aiUsageStats.userId, userId),
        eq(aiUsageStats.date, today),
        eq(aiUsageStats.provider, providerString),
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
    sessionId?: string
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
          let currentResult: ActionResult | ReportResult | null = null;
          switch (actionType) {
            case "FIND_WORKER":
              currentResult = await this.dbActions.findWorkerByName(actionParams[0] || "");
              break;

            case "GET_PROJECT":
              currentResult = await this.dbActions.getProjectInfo(actionParams[0] || "");
              break;

            case "WORKER_STATEMENT":
              currentResult = await this.reportGenerator.generateWorkerStatement(actionParams[0] || "");
              break;

            case "PROJECT_EXPENSES":
              currentResult = await this.reportGenerator.generateProjectExpensesSummary(actionParams[0] || "");
              break;

            case "DAILY_EXPENSES": {
              const projectId = actionParams[0] || "";
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
              currentResult = await this.dbActions.getAllProjects();
              break;

            case "LIST_WORKERS":
              currentResult = await this.dbActions.getAllWorkers();
              break;

            case "LIST_TABLES":
              currentResult = await this.dbActions.listAllTables();
              break;

            case "DESCRIBE_TABLE":
              currentResult = await this.dbActions.describeTable(actionParams[0] || "");
              break;

            case "SEARCH":
              currentResult = await this.dbActions.searchInTable(
                actionParams[0] || "",
                actionParams[1] || "",
                actionParams[2] || "",
                actionParams[3] ? parseInt(actionParams[3]) : undefined
              );
              break;

            case "SQL_SELECT":
              currentResult = await this.dbActions.executeRawSelect(actionParams.join(":"));
              break;

            case "EXPORT_EXCEL":
              if (actionParams[0] === "WORKER_STATEMENT") {
                currentResult = await this.reportGenerator.generateWorkerStatementExcel(actionParams[1]);
              } else if (actionParams[0] === "PROJECT_FULL") {
                currentResult = await this.reportGenerator.generateProjectFullExcel(actionParams[1]);
              } else {
                currentResult = { success: false, message: "نوع التقرير غير مدعوم حالياً" };
              }
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

      processedResponse = processedResponse.replace(/\[ACTION:[^\]]+\]\s*/g, "");

      // دمج جميع النتائج في الرد
      for (const res of results) {
        const actionType = res.type;
        const currentResult = res.result;

        if (currentResult.success) {
          if (actionType === "EXPORT_EXCEL" && (currentResult as ReportResult).filePath) {
            processedResponse += `\n\n📄 **تم إنشاء ملف Excel بنجاح!**\nيمكنك تحميل الملف من الرابط التالي: [تحميل ملف Excel](${(currentResult as ReportResult).filePath})`;
          } else if (actionType === "WORKER_STATEMENT" || actionType === "PROJECT_EXPENSES" || actionType === "DAILY_EXPENSES") {
            const formattedReport = this.reportGenerator.formatAsText(currentResult.data, this.getActionTitle(actionType));
            processedResponse += "\n\n" + formattedReport;
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

  /**
   * تنسيق قائمة البيانات كفهرس نصي بسيط
   */
  private formatDataList(data: any[]): string {
    return data.map((item, index) => `${index + 1}. ${item.name || item.id}`).join("\n");
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
