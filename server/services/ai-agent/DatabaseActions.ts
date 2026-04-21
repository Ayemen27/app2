/**
 * Database Actions - تنفيذ أوامر قاعدة البيانات
 * يحول أوامر الوكيل الذكي إلى استعلامات قاعدة البيانات
 * صلاحيات كاملة: قراءة، إضافة، تعديل، حذف
 */

import { db, pool } from "../../db";
import { eq, and, sql, desc, like, gte, lte, inArray } from "drizzle-orm";

const NUM = (col: any) => sql`safe_numeric(${col}::text, 0)`;
import {
  projects,
  workers,
  workerAttendance,
  fundTransfers,
  materialPurchases,
  transportationExpenses,
  workerTransfers,
  workerMiscExpenses,
  dailyExpenseSummaries,
  suppliers,
  supplierPayments,
  equipment,
  equipmentMovements,
  wells,
  wellTasks,
  wellExpenses,
  wellWorkCrews,
  wellSolarComponents,
  wellTransportDetails,
  wellReceptions,
  notifications,
  auditLogs,
} from "@shared/schema";

export interface ActionResult {
  success: boolean;
  data?: any;
  message: string;
  action: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export class DatabaseActions {

  private validateQuerySafety(query: string): { safe: boolean; reason?: string; normalized?: string } {
    if (!query || typeof query !== "string") return { safe: false, reason: "empty_query" };
    if (query.length > 5000) return { safe: false, reason: "too_long" };
    // إزالة التعليقات
    let n = query.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ").trim();
    // الفاصلة المنقوطة في النهاية فقط
    if (n.endsWith(";")) n = n.slice(0, -1).trim();
    if (n.includes(";")) return { safe: false, reason: "multiple_statements", normalized: n };
    // يجب أن يبدأ بـ SELECT أو WITH ... SELECT
    if (!/^(select|with)\b/i.test(n)) return { safe: false, reason: "not_select", normalized: n };
    // كلمات محظورة
    const forbidden = /\b(into|update|insert|delete|drop|alter|truncate|grant|revoke|execute|call|copy|set|reset|pg_sleep|pg_read|pg_ls|pg_stat_file|current_setting|set_config|lo_import|lo_export)\b/i;
    if (forbidden.test(n)) return { safe: false, reason: "forbidden_keyword", normalized: n };
    if (/\\copy/i.test(n)) return { safe: false, reason: "forbidden_keyword", normalized: n };
    return { safe: true, normalized: n };
  }

  private safeParseNum(val: any, fallback: number = 0): number {
    if (val === null || val === undefined) return fallback;
    const str = String(val).replace(/,/g, '').trim();
    if (str === '' || str.toLowerCase() === 'nan' || str.toLowerCase().includes('infinity')) return fallback;
    const n = Number(str);
    return Number.isFinite(n) ? n : fallback;
  }

  private static readonly SENSITIVE_TABLES = [
    'users',
    'auth_user_sessions',
    'password_reset_tokens',
    'emergency_users',
    'webauthn_credentials',
    'whatsapp_user_links',
    'whatsapp_allowed_numbers',
    'whatsapp_security_events',
    'whatsapp_bot_settings',
    'whatsapp_messages',
    'ai_chat_messages',
    'refresh_tokens',
  ];

  private static readonly DANGEROUS_PG_FUNCTIONS = /\b(pg_read_file|pg_ls_dir|lo_import|lo_export|lo_create|COPY|pg_sleep|pg_stat_file|pg_read_binary_file|pg_write_file|dblink|dblink_exec)\b/i;

  private isSensitiveTable(tableName: string): boolean {
    return DatabaseActions.SENSITIVE_TABLES.includes(tableName.toLowerCase());
  }

  private isProjectAllowed(projectId: string, allowedProjectIds?: string[]): boolean {
    if (allowedProjectIds === undefined) return true;
    return allowedProjectIds.includes(projectId);
  }

  private getProjectFilter(allowedProjectIds?: string[]): typeof projects | null {
    if (allowedProjectIds === undefined) return null;
    if (allowedProjectIds.length === 0) return null;
    return null;
  }
  
  // ==================== عمليات القراءة ====================

  async findWorkerByName(name: string, allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: true, data: [], message: "لا توجد مشاريع مرتبطة بحسابك", action: "find_worker" };
      }
      const trimmed = name.trim();
      let result;
      if (allowedProjectIds && allowedProjectIds.length > 0) {
        result = await db
          .select()
          .from(workers)
          .where(and(
            sql`${workers.name} ILIKE ${'%' + trimmed + '%'}`,
            sql`${workers.id} IN (SELECT DISTINCT worker_id FROM worker_attendance WHERE project_id IN (${sql.join(allowedProjectIds.map(id => sql`${id}`), sql`, `)}))`
          ));
      } else {
        result = await db
          .select()
          .from(workers)
          .where(sql`${workers.name} ILIKE ${'%' + trimmed + '%'}`);
      }

      return {
        success: true,
        data: result,
        message: result.length > 0 ? `تم العثور على ${result.length} عامل` : `لم يتم العثور على عامل باسم "${trimmed}"`,
        action: "find_worker",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في البحث: ${error.message}`,
        action: "find_worker",
      };
    }
  }

  async getProjectInfo(projectIdOrName: string, allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: false, message: "لا توجد مشاريع مرتبطة بحسابك", action: "get_project" };
      }
      let baseCondition = sql`${projects.id} = ${projectIdOrName} OR ${projects.name} ILIKE ${'%' + projectIdOrName + '%'}`;
      let result;
      if (allowedProjectIds && allowedProjectIds.length > 0) {
        result = await db
          .select()
          .from(projects)
          .where(and(
            sql`(${baseCondition})`,
            inArray(projects.id, allowedProjectIds)
          ));
      } else {
        result = await db
          .select()
          .from(projects)
          .where(baseCondition);
      }

      if (result.length === 0) {
        return {
          success: false,
          message: "لم يتم العثور على المشروع أو ليس لديك صلاحية الوصول إليه",
          action: "get_project",
        };
      }

      return {
        success: true,
        data: result[0],
        message: "تم العثور على المشروع",
        action: "get_project",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ: ${error.message}`,
        action: "get_project",
      };
    }
  }

  async getAllProjects(allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      let result;
      if (allowedProjectIds && allowedProjectIds.length > 0) {
        result = await db.select().from(projects)
          .where(inArray(projects.id, allowedProjectIds));
      } else if (allowedProjectIds && allowedProjectIds.length === 0) {
        result = [];
      } else {
        result = await db.select().from(projects);
      }
      return {
        success: true,
        data: result,
        message: `تم العثور على ${result.length} مشروع`,
        action: "get_all_projects",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ: ${error.message}`,
        action: "get_all_projects",
      };
    }
  }

  async getAllProjectsWithExpenses(allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      let allProjects;
      if (allowedProjectIds && allowedProjectIds.length > 0) {
        allProjects = await db.select().from(projects)
          .where(inArray(projects.id, allowedProjectIds));
      } else if (allowedProjectIds && allowedProjectIds.length === 0) {
        allProjects = [];
      } else {
        allProjects = await db.select().from(projects);
      }

      if (allProjects.length === 0) {
        return {
          success: true,
          data: [],
          message: `تقرير شامل لـ 0 مشروع مع التفاصيل المالية`,
          action: "all_projects_report",
        };
      }

      const projectIds = allProjects.map((p: any) => p.id);

      const [fundsAgg, wagesAgg, materialsAgg, transportAgg, miscAgg] = await Promise.all([
        db.select({
          project_id: fundTransfers.project_id,
          total: sql<string>`COALESCE(SUM(${fundTransfers.amount}), 0)`,
        }).from(fundTransfers)
          .where(inArray(fundTransfers.project_id, projectIds))
          .groupBy(fundTransfers.project_id),

        db.select({
          project_id: workerAttendance.project_id,
          total: sql<string>`COALESCE(SUM(${workerAttendance.paidAmount}), 0)`,
        }).from(workerAttendance)
          .where(inArray(workerAttendance.project_id, projectIds))
          .groupBy(workerAttendance.project_id),

        db.select({
          project_id: materialPurchases.project_id,
          total: sql<string>`COALESCE(SUM(${materialPurchases.paidAmount}), 0)`,
        }).from(materialPurchases)
          .where(inArray(materialPurchases.project_id, projectIds))
          .groupBy(materialPurchases.project_id),

        db.select({
          project_id: transportationExpenses.project_id,
          total: sql<string>`COALESCE(SUM(${transportationExpenses.amount}), 0)`,
        }).from(transportationExpenses)
          .where(inArray(transportationExpenses.project_id, projectIds))
          .groupBy(transportationExpenses.project_id),

        db.select({
          project_id: workerMiscExpenses.project_id,
          total: sql<string>`COALESCE(SUM(${workerMiscExpenses.amount}), 0)`,
        }).from(workerMiscExpenses)
          .where(inArray(workerMiscExpenses.project_id, projectIds))
          .groupBy(workerMiscExpenses.project_id),
      ]);

      const fundsMap = new Map<string, number>(fundsAgg.map((r: any) => [r.project_id, this.safeParseNum(r.total)]));
      const wagesMap = new Map<string, number>(wagesAgg.map((r: any) => [r.project_id, this.safeParseNum(r.total)]));
      const materialsMap = new Map<string, number>(materialsAgg.map((r: any) => [r.project_id, this.safeParseNum(r.total)]));
      const transportMap = new Map<string, number>(transportAgg.map((r: any) => [r.project_id, this.safeParseNum(r.total)]));
      const miscMap = new Map<string, number>(miscAgg.map((r: any) => [r.project_id, this.safeParseNum(r.total)]));

      const projectSummaries = allProjects.map((project: any) => {
        const totalFunds: number = fundsMap.get(project.id) || 0;
        const totalWages: number = wagesMap.get(project.id) || 0;
        const totalMaterials: number = materialsMap.get(project.id) || 0;
        const totalTransport: number = transportMap.get(project.id) || 0;
        const totalMisc: number = miscMap.get(project.id) || 0;
        const totalExpenses: number = totalWages + totalMaterials + totalTransport + totalMisc;

        return {
          المشروع: project.name,
          الحالة: project.status || "نشط",
          الميزانية: this.safeParseNum(project.budget),
          إجمالي_التمويل: totalFunds,
          الأجور: totalWages,
          المواد: totalMaterials,
          النقل: totalTransport,
          متنوعات: totalMisc,
          إجمالي_المصروفات: totalExpenses,
          الرصيد: totalFunds - totalExpenses,
        };
      });

      return {
        success: true,
        data: projectSummaries,
        message: `تقرير شامل لـ ${allProjects.length} مشروع مع التفاصيل المالية`,
        action: "all_projects_report",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ: ${error.message}`,
        action: "all_projects_report",
      };
    }
  }

  async getAllWorkers(allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      let result;
      if (allowedProjectIds && allowedProjectIds.length > 0) {
        result = await db.select().from(workers)
          .where(sql`${workers.id} IN (
            SELECT DISTINCT worker_id FROM worker_attendance WHERE project_id IN (${sql.join(allowedProjectIds.map(id => sql`${id}`), sql`, `)})
          ) OR ${workers.id} IN (
            SELECT id FROM workers WHERE created_by IN (
              SELECT user_id FROM user_project_permissions WHERE project_id IN (${sql.join(allowedProjectIds.map(id => sql`${id}`), sql`, `)})
            )
          )`);
      } else if (allowedProjectIds && allowedProjectIds.length === 0) {
        result = [];
      } else {
        result = await db.select().from(workers);
      }
      return {
        success: true,
        data: result,
        message: `تم العثور على ${result.length} عامل`,
        action: "get_all_workers",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ: ${error.message}`,
        action: "get_all_workers",
      };
    }
  }

  async getProjectExpensesSummary(projectId: string, allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && !this.isProjectAllowed(projectId, allowedProjectIds)) {
        return { success: false, message: "ليس لديك صلاحية الوصول لهذا المشروع", action: "get_expenses_summary" };
      }
      const fundsResult = await db
        .select({ total: sql<string>`COALESCE(SUM(${fundTransfers.amount}), 0)` })
        .from(fundTransfers)
        .where(eq(fundTransfers.project_id, projectId));

      const wagesResult = await db
        .select({ total: sql<string>`COALESCE(SUM(${workerAttendance.paidAmount}), 0)` })
        .from(workerAttendance)
        .where(eq(workerAttendance.project_id, projectId));

      const materialsResult = await db
        .select({ total: sql<string>`COALESCE(SUM(${materialPurchases.paidAmount}), 0)` })
        .from(materialPurchases)
        .where(eq(materialPurchases.project_id, projectId));

      const transportResult = await db
        .select({ total: sql<string>`COALESCE(SUM(${transportationExpenses.amount}), 0)` })
        .from(transportationExpenses)
        .where(eq(transportationExpenses.project_id, projectId));

      const miscResult = await db
        .select({ total: sql<string>`COALESCE(SUM(${workerMiscExpenses.amount}), 0)` })
        .from(workerMiscExpenses)
        .where(eq(workerMiscExpenses.project_id, projectId));

      const summary = {
        totalFunds: this.safeParseNum(fundsResult[0]?.total),
        totalWages: this.safeParseNum(wagesResult[0]?.total),
        totalMaterials: this.safeParseNum(materialsResult[0]?.total),
        totalTransport: this.safeParseNum(transportResult[0]?.total),
        totalMisc: this.safeParseNum(miscResult[0]?.total),
      };

      const totalExpenses = 
        summary.totalWages + 
        summary.totalMaterials + 
        summary.totalTransport + 
        summary.totalMisc;

      const balance = summary.totalFunds - totalExpenses;

      return {
        success: true,
        data: { ...summary, totalExpenses, balance },
        message: "تم جلب ملخص المصروفات",
        action: "get_expenses_summary",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ: ${error.message}`,
        action: "get_expenses_summary",
      };
    }
  }

  async getWorkerAttendance(workerId: string, projectId?: string, allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      let conditions: any[] = [eq(workerAttendance.worker_id, workerId)];
      if (allowedProjectIds && allowedProjectIds.length > 0) {
        conditions.push(inArray(workerAttendance.project_id, allowedProjectIds));
      } else if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: true, data: { records: [], summary: { totalDays: 0, totalEarned: 0, totalPaid: 0, balance: 0 } }, message: "لا توجد مشاريع مرتبطة بحسابك", action: "get_worker_attendance" };
      }
      let result = await db
        .select()
        .from(workerAttendance)
        .where(and(...conditions))
        .orderBy(desc(workerAttendance.attendanceDate));

      if (projectId) {
        result = result.filter((r: any) => r.project_id === projectId);
      }

      const totalDays = result.reduce((sum: number, r: any) => sum + this.safeParseNum(r.workDays), 0);
      const totalEarned = result.reduce((sum: number, r: any) => {
        const dw = this.safeParseNum(r.dailyWage);
        const wd = this.safeParseNum(r.workDays);
        return sum + (dw * wd);
      }, 0);
      const totalPaid = result.reduce((sum: number, r: any) => sum + this.safeParseNum(r.paidAmount), 0);

      return {
        success: true,
        data: {
          records: result,
          summary: { totalDays, totalEarned, totalPaid, balance: totalEarned - totalPaid },
        },
        message: `تم العثور على ${result.length} سجل حضور`,
        action: "get_worker_attendance",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ: ${error.message}`,
        action: "get_worker_attendance",
      };
    }
  }

  async getWorkerTransfers(workerId: string, allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      let conditions: any[] = [eq(workerTransfers.worker_id, workerId)];
      if (allowedProjectIds && allowedProjectIds.length > 0) {
        conditions.push(inArray(workerTransfers.project_id, allowedProjectIds));
      } else if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: true, data: { transfers: [], totalTransferred: 0 }, message: "لا توجد مشاريع مرتبطة بحسابك", action: "get_worker_transfers" };
      }
      const result = await db
        .select()
        .from(workerTransfers)
        .where(and(...conditions))
        .orderBy(desc(workerTransfers.transferDate));

      const total = result.reduce((sum: number, r: any) => sum + this.safeParseNum(r.amount), 0);

      return {
        success: true,
        data: { transfers: result, totalTransferred: total },
        message: `تم العثور على ${result.length} حوالة`,
        action: "get_worker_transfers",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ: ${error.message}`,
        action: "get_worker_transfers",
      };
    }
  }

  async getWorkerStatement(workerId: string, allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      const workerResult = await db
        .select()
        .from(workers)
        .where(eq(workers.id, workerId));

      if (workerResult.length === 0) {
        return {
          success: false,
          message: "لم يتم العثور على العامل",
          action: "get_worker_statement",
        };
      }

      const worker = workerResult[0];
      const attendance = await this.getWorkerAttendance(workerId, undefined, allowedProjectIds);
      const transfers = await this.getWorkerTransfers(workerId, allowedProjectIds);

      const totalEarned = attendance.data?.summary?.totalEarned || 0;
      const totalPaid = attendance.data?.summary?.totalPaid || 0;
      const totalTransferred = transfers.data?.totalTransferred || 0;
      const finalBalance = totalEarned - totalPaid - totalTransferred;

      return {
        success: true,
        data: {
          worker,
          attendance: attendance.data,
          transfers: transfers.data,
          statement: { totalEarned, totalPaid, totalTransferred, finalBalance },
        },
        message: "تم إنشاء تصفية حساب العامل",
        action: "get_worker_statement",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ: ${error.message}`,
        action: "get_worker_statement",
      };
    }
  }

  async getDailyExpenses(projectId: string, date: string, allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && !this.isProjectAllowed(projectId, allowedProjectIds)) {
        return { success: false, message: "ليس لديك صلاحية الوصول لهذا المشروع", action: "get_daily_expenses" };
      }
      console.log(`🗄️ [DatabaseActions] Fetching expenses for Project: ${projectId}, Date: ${date}`);
      
      const wages = await db
        .select()
        .from(workerAttendance)
        .where(and(
          eq(workerAttendance.project_id, projectId),
          sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate})::date = ${date}::date`
        ));

      const purchases = await db
        .select()
        .from(materialPurchases)
        .where(and(
          eq(materialPurchases.project_id, projectId),
          sql`(CASE WHEN purchase_date IS NULL OR purchase_date = '' THEN NULL ELSE purchase_date::date END) = ${date}`
        ));

      const transport = await db
        .select()
        .from(transportationExpenses)
        .where(and(
          eq(transportationExpenses.project_id, projectId),
          sql`(CASE WHEN date IS NULL OR date = '' THEN NULL ELSE date::date END) = ${date}`
        ));

      const misc = await db
        .select()
        .from(workerMiscExpenses)
        .where(and(
          eq(workerMiscExpenses.project_id, projectId),
          sql`(CASE WHEN date IS NULL OR date = '' THEN NULL ELSE date::date END) = ${date}`
        ));

      const totalItems = (wages.length || 0) + (purchases.length || 0) + (transport.length || 0) + (misc.length || 0);
      console.log(`📊 [DatabaseActions] Found ${totalItems} items for date ${date}`);

      return {
        success: true,
        data: { date, wages, purchases, transport, misc },
        message: totalItems > 0 ? "تم جلب مصروفات اليوم" : `لا توجد أي مصروفات مسجلة بتاريخ ${date}`,
        action: "get_daily_expenses",
      };
    } catch (error: any) {
      console.error(`❌ [DatabaseActions] Error in getDailyExpenses:`, error);
      return {
        success: false,
        message: `خطأ: ${error.message}`,
        action: "get_daily_expenses",
      };
    }
  }

  /**
   * جلب معلومات مالية لمشروع محدد بدقة من ExpenseLedgerService
   */
  async getProjectFinancialData(projectId: string, date?: string, allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && !this.isProjectAllowed(projectId, allowedProjectIds)) {
        return { success: false, message: "ليس لديك صلاحية الوصول لهذا المشروع", action: "get_financial_data" };
      }
      const { ExpenseLedgerService } = await import("../ExpenseLedgerService");
      const summary = await ExpenseLedgerService.getProjectFinancialSummary(projectId, date);
      return {
        success: true,
        message: `تم جلب البيانات المالية للمشروع: ${summary.projectName}`,
        data: summary,
        action: "get_financial_data"
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: `فشل جلب البيانات المالية: ${error.message}`,
        action: "get_financial_data"
      };
    }
  }

  // ==================== عمليات الإضافة ====================

  async createProject(data: { name: string; status?: string; engineerId?: string }): Promise<ActionResult> {
    try {
      const [result] = await db.insert(projects).values({
        name: data.name,
        status: data.status || "active",
        engineerId: data.engineerId,
      }).returning();

      return {
        success: true,
        data: result,
        message: `تم إنشاء المشروع "${data.name}" بنجاح`,
        action: "create_project",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في إنشاء المشروع: ${error.message}`,
        action: "create_project",
      };
    }
  }

  async createWorker(data: { name: string; type: string; dailyWage: string; phone?: string }): Promise<ActionResult> {
    try {
      const [result] = await db.insert(workers).values({
        name: data.name,
        type: data.type,
        dailyWage: data.dailyWage,
        phone: data.phone,
        isActive: true,
      }).returning();

      return {
        success: true,
        data: result,
        message: `تم إضافة العامل "${data.name}" بنجاح`,
        action: "create_worker",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في إضافة العامل: ${error.message}`,
        action: "create_worker",
      };
    }
  }

  async addAttendance(data: { 
    projectId: string; 
    workerId: string; 
    attendanceDate: string; 
    workDays: string;
    dailyWage: string;
    paidAmount?: string;
  }): Promise<ActionResult> {
    try {
      const totalPay = (this.safeParseNum(data.workDays) * this.safeParseNum(data.dailyWage)).toString();
      
      const [result] = await db.insert(workerAttendance).values({
        project_id: data.projectId,
        worker_id: data.workerId,
        attendanceDate: data.attendanceDate,
        workDays: data.workDays,
        dailyWage: data.dailyWage,
        totalPay,
        paidAmount: data.paidAmount || "0",
      }).returning();

      return {
        success: true,
        data: result,
        message: `تم تسجيل حضور بنجاح`,
        action: "add_attendance",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في تسجيل الحضور: ${error.message}`,
        action: "add_attendance",
      };
    }
  }

  async addFundTransfer(data: {
    projectId: string;
    amount: string;
    senderName?: string;
    transferType: string;
    transferDate: Date;
    notes?: string;
  }): Promise<ActionResult> {
    try {
      const [result] = await db.insert(fundTransfers).values({
        project_id: data.projectId,
        amount: data.amount,
        senderName: data.senderName,
        transferType: data.transferType,
        transferDate: data.transferDate,
        notes: data.notes,
      }).returning();

      return {
        success: true,
        data: result,
        message: `تم إضافة تحويل عهدة بمبلغ ${data.amount} ريال`,
        action: "add_fund_transfer",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في إضافة التحويل: ${error.message}`,
        action: "add_fund_transfer",
      };
    }
  }

  // ==================== عمليات التعديل ====================

  async updateWorker(workerId: string, data: { name?: string; type?: string; dailyWage?: string; phone?: string; isActive?: boolean }): Promise<ActionResult> {
    try {
      const [result] = await db.update(workers)
        .set(data)
        .where(eq(workers.id, workerId))
        .returning();

      if (!result) {
        return {
          success: false,
          message: "لم يتم العثور على العامل",
          action: "update_worker",
        };
      }

      return {
        success: true,
        data: result,
        message: `تم تحديث بيانات العامل "${result.name}" بنجاح`,
        action: "update_worker",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في تحديث العامل: ${error.message}`,
        action: "update_worker",
      };
    }
  }

  async updateProject(projectId: string, data: { name?: string; status?: string }): Promise<ActionResult> {
    try {
      const [result] = await db.update(projects)
        .set(data)
        .where(eq(projects.id, projectId))
        .returning();

      if (!result) {
        return {
          success: false,
          message: "لم يتم العثور على المشروع",
          action: "update_project",
        };
      }

      return {
        success: true,
        data: result,
        message: `تم تحديث المشروع "${result.name}" بنجاح`,
        action: "update_project",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في تحديث المشروع: ${error.message}`,
        action: "update_project",
      };
    }
  }

  async updateAttendance(attendanceId: string, data: { workDays?: string; paidAmount?: string }): Promise<ActionResult> {
    try {
      const [result] = await db.update(workerAttendance)
        .set(data)
        .where(eq(workerAttendance.id, attendanceId))
        .returning();

      if (!result) {
        return {
          success: false,
          message: "لم يتم العثور على سجل الحضور",
          action: "update_attendance",
        };
      }

      return {
        success: true,
        data: result,
        message: `تم تحديث سجل الحضور بنجاح`,
        action: "update_attendance",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في تحديث الحضور: ${error.message}`,
        action: "update_attendance",
      };
    }
  }

  // ==================== عمليات الحذف (تحتاج تأكيد) ====================

  async deleteWorker(workerId: string, confirmed: boolean = false): Promise<ActionResult> {
    if (!confirmed) {
      const worker = await db.select().from(workers).where(eq(workers.id, workerId));
      if (worker.length === 0) {
        return {
          success: false,
          message: "لم يتم العثور على العامل",
          action: "delete_worker",
        };
      }
      return {
        success: false,
        requiresConfirmation: true,
        confirmationMessage: `هل أنت متأكد من حذف العامل "${worker[0].name}"؟ هذا الإجراء لا يمكن التراجع عنه. اكتب "موافق" للتأكيد.`,
        message: "يتطلب تأكيد",
        action: "delete_worker",
      };
    }

    try {
      const [result] = await db.delete(workers)
        .where(eq(workers.id, workerId))
        .returning();

      if (!result) {
        return {
          success: false,
          message: "لم يتم العثور على العامل",
          action: "delete_worker",
        };
      }

      return {
        success: true,
        data: result,
        message: `تم حذف العامل "${result.name}" بنجاح`,
        action: "delete_worker",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في حذف العامل: ${error.message}`,
        action: "delete_worker",
      };
    }
  }

  async deleteProject(projectId: string, confirmed: boolean = false): Promise<ActionResult> {
    if (!confirmed) {
      const project = await db.select().from(projects).where(eq(projects.id, projectId));
      if (project.length === 0) {
        return {
          success: false,
          message: "لم يتم العثور على المشروع",
          action: "delete_project",
        };
      }
      return {
        success: false,
        requiresConfirmation: true,
        confirmationMessage: `هل أنت متأكد من حذف المشروع "${project[0].name}"؟ سيتم حذف جميع البيانات المرتبطة. اكتب "موافق" للتأكيد.`,
        message: "يتطلب تأكيد",
        action: "delete_project",
      };
    }

    try {
      const [result] = await db.delete(projects)
        .where(eq(projects.id, projectId))
        .returning();

      if (!result) {
        return {
          success: false,
          message: "لم يتم العثور على المشروع",
          action: "delete_project",
        };
      }

      return {
        success: true,
        data: result,
        message: `تم حذف المشروع "${result.name}" بنجاح`,
        action: "delete_project",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في حذف المشروع: ${error.message}`,
        action: "delete_project",
      };
    }
  }

  async deleteAttendance(attendanceId: string, confirmed: boolean = false): Promise<ActionResult> {
    if (!confirmed) {
      return {
        success: false,
        requiresConfirmation: true,
        confirmationMessage: `هل أنت متأكد من حذف سجل الحضور؟ اكتب "موافق" للتأكيد.`,
        message: "يتطلب تأكيد",
        action: "delete_attendance",
      };
    }

    try {
      const [result] = await db.delete(workerAttendance)
        .where(eq(workerAttendance.id, attendanceId))
        .returning();

      if (!result) {
        return {
          success: false,
          message: "لم يتم العثور على سجل الحضور",
          action: "delete_attendance",
        };
      }

      return {
        success: true,
        data: result,
        message: `تم حذف سجل الحضور بنجاح`,
        action: "delete_attendance",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في حذف سجل الحضور: ${error.message}`,
        action: "delete_attendance",
      };
    }
  }

  // ==================== عمليات قاعدة البيانات العامة ====================

  private async getValidTables(): Promise<string[]> {
    const result = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
    );
    return result.rows.map((r: any) => r.tablename);
  }

  private async getValidColumns(tableName: string): Promise<string[]> {
    const result = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
      [tableName]
    );
    return result.rows.map((r: any) => r.column_name);
  }

  private isValidIdentifier(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }

  async listAllTables(): Promise<ActionResult> {
    try {
      const result = await pool.query(`
        SELECT t.tablename,
               (SELECT reltuples::bigint FROM pg_class WHERE relname = t.tablename) AS row_count
        FROM pg_tables t
        WHERE t.schemaname = 'public'
        ORDER BY t.tablename
      `);

      return {
        success: true,
        data: result.rows,
        message: `تم العثور على ${result.rows.length} جدول في قاعدة البيانات`,
        action: "list_tables",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في جلب الجداول: ${error.message}`,
        action: "list_tables",
      };
    }
  }

  async describeTable(tableName: string): Promise<ActionResult> {
    try {
      const validTables = await this.getValidTables();
      if (!validTables.includes(tableName)) {
        return {
          success: false,
          message: `الجدول "${tableName}" غير موجود. الجداول المتاحة: ${validTables.join(', ')}`,
          action: "describe_table",
        };
      }

      const result = await pool.query(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [tableName]
      );

      return {
        success: true,
        data: result.rows,
        message: `جدول "${tableName}" يحتوي على ${result.rows.length} عمود`,
        action: "describe_table",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في وصف الجدول: ${error.message}`,
        action: "describe_table",
      };
    }
  }

  async searchInTable(tableName: string, searchColumn: string, searchValue: string, limit: number = 50): Promise<ActionResult> {
    try {
      const validTables = await this.getValidTables();
      if (!validTables.includes(tableName)) {
        return {
          success: false,
          message: `الجدول "${tableName}" غير موجود`,
          action: "search_table",
        };
      }

      const validColumns = await this.getValidColumns(tableName);
      if (!validColumns.includes(searchColumn)) {
        return {
          success: false,
          message: `العمود "${searchColumn}" غير موجود في الجدول "${tableName}". الأعمدة المتاحة: ${validColumns.join(', ')}`,
          action: "search_table",
        };
      }

      if (!this.isValidIdentifier(tableName) || !this.isValidIdentifier(searchColumn)) {
        return {
          success: false,
          message: "اسم الجدول أو العمود يحتوي على أحرف غير مسموحة",
          action: "search_table",
        };
      }

      const safeLimit = Math.min(Math.max(1, limit), 500);
      const result = await pool.query(
        `SELECT * FROM "${tableName}" WHERE "${searchColumn}"::text ILIKE $1 LIMIT $2`,
        [`%${searchValue}%`, safeLimit]
      );

      return {
        success: true,
        data: result.rows,
        message: `تم العثور على ${result.rows.length} نتيجة في "${tableName}"`,
        action: "search_table",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في البحث: ${error.message}`,
        action: "search_table",
      };
    }
  }

  async insertIntoTable(tableName: string, data: Record<string, any>): Promise<ActionResult> {
    try {
      if (this.isSensitiveTable(tableName)) {
        return {
          success: false,
          message: `الجدول "${tableName}" محمي ولا يمكن الكتابة إليه عبر واجهة الذكاء الاصطناعي`,
          action: "insert_table",
        };
      }

      const validTables = await this.getValidTables();
      if (!validTables.includes(tableName)) {
        return {
          success: false,
          message: `الجدول "${tableName}" غير موجود`,
          action: "insert_table",
        };
      }

      const validColumns = await this.getValidColumns(tableName);
      const columns = Object.keys(data);
      const invalidColumns = columns.filter(c => !validColumns.includes(c));
      if (invalidColumns.length > 0) {
        return {
          success: false,
          message: `أعمدة غير صالحة: ${invalidColumns.join(', ')}. الأعمدة المتاحة: ${validColumns.join(', ')}`,
          action: "insert_table",
        };
      }

      for (const col of columns) {
        if (!this.isValidIdentifier(col)) {
          return {
            success: false,
            message: `اسم العمود "${col}" يحتوي على أحرف غير مسموحة`,
            action: "insert_table",
          };
        }
      }

      if (!this.isValidIdentifier(tableName)) {
        return {
          success: false,
          message: "اسم الجدول يحتوي على أحرف غير مسموحة",
          action: "insert_table",
        };
      }

      const values = Object.values(data);
      const columnNames = columns.map(c => `"${c}"`).join(', ');
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

      const result = await pool.query(
        `INSERT INTO "${tableName}" (${columnNames}) VALUES (${placeholders}) RETURNING *`,
        values
      );

      return {
        success: true,
        data: result.rows[0],
        message: `تم إضافة سجل جديد في "${tableName}" بنجاح`,
        action: "insert_table",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في الإضافة: ${error.message}`,
        action: "insert_table",
      };
    }
  }

  async updateInTable(tableName: string, id: string, data: Record<string, any>): Promise<ActionResult> {
    try {
      if (this.isSensitiveTable(tableName)) {
        return {
          success: false,
          message: `الجدول "${tableName}" محمي ولا يمكن التعديل عليه عبر واجهة الذكاء الاصطناعي`,
          action: "update_table",
        };
      }

      const validTables = await this.getValidTables();
      if (!validTables.includes(tableName)) {
        return {
          success: false,
          message: `الجدول "${tableName}" غير موجود`,
          action: "update_table",
        };
      }

      const validColumns = await this.getValidColumns(tableName);
      const columns = Object.keys(data);
      const invalidColumns = columns.filter(c => !validColumns.includes(c));
      if (invalidColumns.length > 0) {
        return {
          success: false,
          message: `أعمدة غير صالحة: ${invalidColumns.join(', ')}`,
          action: "update_table",
        };
      }

      if (!validColumns.includes('id')) {
        return {
          success: false,
          message: `الجدول "${tableName}" لا يحتوي على عمود "id"`,
          action: "update_table",
        };
      }

      for (const col of columns) {
        if (!this.isValidIdentifier(col)) {
          return {
            success: false,
            message: `اسم العمود "${col}" يحتوي على أحرف غير مسموحة`,
            action: "update_table",
          };
        }
      }

      if (!this.isValidIdentifier(tableName)) {
        return {
          success: false,
          message: "اسم الجدول يحتوي على أحرف غير مسموحة",
          action: "update_table",
        };
      }

      const values = Object.values(data);
      const setClauses = columns.map((col, i) => `"${col}" = $${i + 1}`).join(', ');
      const idParamIndex = values.length + 1;

      const result = await pool.query(
        `UPDATE "${tableName}" SET ${setClauses} WHERE "id" = $${idParamIndex} RETURNING *`,
        [...values, id]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          message: `لم يتم العثور على سجل بالمعرف "${id}" في "${tableName}"`,
          action: "update_table",
        };
      }

      return {
        success: true,
        data: result.rows[0],
        message: `تم تحديث السجل في "${tableName}" بنجاح`,
        action: "update_table",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في التحديث: ${error.message}`,
        action: "update_table",
      };
    }
  }

  async deleteFromTable(tableName: string, id: string, confirmed: boolean = false): Promise<ActionResult> {
    try {
      if (this.isSensitiveTable(tableName)) {
        return {
          success: false,
          message: `الجدول "${tableName}" محمي ولا يمكن الحذف منه عبر واجهة الذكاء الاصطناعي`,
          action: "delete_table",
        };
      }

      const validTables = await this.getValidTables();
      if (!validTables.includes(tableName)) {
        return {
          success: false,
          message: `الجدول "${tableName}" غير موجود`,
          action: "delete_table",
        };
      }

      if (!this.isValidIdentifier(tableName)) {
        return {
          success: false,
          message: "اسم الجدول يحتوي على أحرف غير مسموحة",
          action: "delete_table",
        };
      }

      const validColumns = await this.getValidColumns(tableName);
      if (!validColumns.includes('id')) {
        return {
          success: false,
          message: `الجدول "${tableName}" لا يحتوي على عمود "id"`,
          action: "delete_table",
        };
      }

      if (!confirmed) {
        const existing = await pool.query(
          `SELECT * FROM "${tableName}" WHERE "id" = $1`,
          [id]
        );
        if (existing.rows.length === 0) {
          return {
            success: false,
            message: `لم يتم العثور على سجل بالمعرف "${id}" في "${tableName}"`,
            action: "delete_table",
          };
        }
        return {
          success: false,
          requiresConfirmation: true,
          confirmationMessage: `هل أنت متأكد من حذف السجل "${id}" من جدول "${tableName}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
          data: existing.rows[0],
          message: "يتطلب تأكيد",
          action: "delete_table",
        };
      }

      const result = await pool.query(
        `DELETE FROM "${tableName}" WHERE "id" = $1 RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          message: `لم يتم العثور على سجل بالمعرف "${id}" في "${tableName}"`,
          action: "delete_table",
        };
      }

      return {
        success: true,
        data: result.rows[0],
        message: `تم حذف السجل من "${tableName}" بنجاح`,
        action: "delete_table",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في الحذف: ${error.message}`,
        action: "delete_table",
      };
    }
  }

  async executeRawSelect(query: string): Promise<ActionResult> {
    try {
      const safety = this.validateQuerySafety(query);
      if (!safety.safe) {
        return {
          success: false,
          message: `استعلام غير آمن: ${safety.reason}`,
          action: "raw_select",
        };
      }

      const normalized = safety.normalized!;

      const BLOCKED_SCHEMAS = /\b(pg_catalog|information_schema|pg_toast)\b/i;
      if (BLOCKED_SCHEMAS.test(normalized)) {
        return { success: false, message: "الوصول إلى جداول النظام غير مسموح لأسباب أمنية.", action: "raw_select" };
      }

      for (const table of DatabaseActions.SENSITIVE_TABLES) {
        if (new RegExp(`\\b${table}\\b`, "i").test(normalized)) {
          return { success: false, message: "الوصول إلى هذا الجدول محظور.", action: "raw_select" };
        }
      }

      const limitedQuery = /\bLIMIT\s+\d+/i.test(normalized) ? normalized : `${normalized} LIMIT 500`;
      const client = await pool.connect();
      try {
        await client.query('SET LOCAL statement_timeout = "5s"');
        await client.query('SET TRANSACTION READ ONLY; SET LOCAL statement_timeout = "5s"');
        const result = await client.query(limitedQuery);
        return {
          success: true,
          data: result.rows,
          message: `تم تنفيذ الاستعلام بنجاح - ${result.rows.length} نتيجة`,
          action: "raw_select",
        };
      } finally {
        await client.query('RESET statement_timeout');
        client.release();
      }
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في تنفيذ الاستعلام: ${error.message}`,
        action: "raw_select",
      };
    }
  }

  // ==================== استعلام SQL مخصص (للمسؤول فقط) ====================

  async executeCustomQuery(query: string, _confirmed: boolean = false): Promise<ActionResult> {
    const safety = this.validateQuerySafety(query);
    if (!safety.safe) {
      return {
        success: false,
        message: `استعلام غير آمن: ${safety.reason}`,
        action: "execute_sql",
      };
    }

    const normalized = safety.normalized!;

    const BLOCKED_SCHEMAS = /\b(pg_catalog|information_schema|pg_toast)\b/i;
    if (BLOCKED_SCHEMAS.test(normalized)) {
      return { success: false, message: "الوصول إلى جداول النظام غير مسموح لأسباب أمنية.", action: "execute_sql" };
    }

    for (const table of DatabaseActions.SENSITIVE_TABLES) {
      if (new RegExp(`\\b${table}\\b`, "i").test(normalized)) {
        return { success: false, message: "الوصول إلى هذا الجدول محظور.", action: "execute_sql" };
      }
    }

    const limitedQuery = /\bLIMIT\s+\d+/i.test(normalized) ? normalized : `${normalized} LIMIT 500`;
    const client = await pool.connect();
    try {
      await client.query('SET LOCAL statement_timeout = "5s"');
      await client.query('SET TRANSACTION READ ONLY; SET LOCAL statement_timeout = "5s"');
      const result = await client.query(limitedQuery);
      return {
        success: true,
        data: result.rows,
        message: `تم تنفيذ الاستعلام بنجاح - ${result.rows.length} نتيجة`,
        action: "execute_sql",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في تنفيذ الاستعلام: ${error.message}`,
        action: "execute_sql",
      };
    } finally {
      await client.query('RESET statement_timeout');
      client.release();
    }
  }
  // ==================== أدوات ذكية متقدمة ====================

  async getDashboardSummary(allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: true, data: { projects: { total: 0, active: 0, completed: 0 }, workers: { total: 0, active: 0 }, finance: { totalFunds: 0, totalExpenses: 0, totalWages: 0, totalMaterials: 0, totalTransport: 0, balance: 0, wagesPaid: 0 }, suppliers: { total: 0, totalDebt: 0 }, equipment: { total: 0 }, wells: { total: 0 } }, message: "لا توجد مشاريع مرتبطة بحسابك", action: "dashboard_summary" };
      }
      const hasFilter = allowedProjectIds && allowedProjectIds.length > 0;

      const [projectStats] = hasFilter
        ? await db.select({
            total: sql<number>`count(*)`,
            active: sql<number>`count(*) filter (where ${projects.status} = 'active')`,
            completed: sql<number>`count(*) filter (where ${projects.status} = 'completed')`,
          }).from(projects).where(inArray(projects.id, allowedProjectIds!))
        : await db.select({
            total: sql<number>`count(*)`,
            active: sql<number>`count(*) filter (where ${projects.status} = 'active')`,
            completed: sql<number>`count(*) filter (where ${projects.status} = 'completed')`,
          }).from(projects);

      const [workerStats] = hasFilter
        ? await db.select({
            total: sql<number>`count(distinct ${workerAttendance.worker_id})`,
            active: sql<number>`count(distinct ${workerAttendance.worker_id})`,
          }).from(workerAttendance).where(inArray(workerAttendance.project_id, allowedProjectIds!))
        : await db.select({
            total: sql<number>`count(*)`,
            active: sql<number>`count(*) filter (where ${workers.is_active} = true)`,
          }).from(workers);

      const fundCondition = hasFilter ? inArray(fundTransfers.project_id, allowedProjectIds!) : undefined;
      const [fundStats] = await db.select({
        totalFunds: sql<string>`coalesce(sum(${NUM(fundTransfers.amount)}), 0)`,
      }).from(fundTransfers).where(fundCondition!);

      const attCondition = hasFilter ? inArray(workerAttendance.project_id, allowedProjectIds!) : undefined;
      const [attendanceStats] = await db.select({
        totalWages: sql<string>`coalesce(sum(
          case when ${workerAttendance.actualWage} IS NOT NULL AND ${workerAttendance.actualWage}::text != '' AND ${workerAttendance.actualWage}::text != 'NaN' then ${NUM(workerAttendance.actualWage)} else ${NUM(workerAttendance.dailyWage)} * ${NUM(workerAttendance.workDays)} end
        ), 0)`,
        totalPaid: sql<string>`coalesce(sum(${NUM(workerAttendance.paidAmount)}), 0)`,
      }).from(workerAttendance).where(attCondition!);

      const matCondition = hasFilter ? inArray(materialPurchases.project_id, allowedProjectIds!) : undefined;
      const [materialStats] = await db.select({
        totalMaterials: sql<string>`coalesce(sum(${NUM(materialPurchases.totalAmount)}), 0)`,
      }).from(materialPurchases).where(matCondition!);

      const transCondition = hasFilter ? inArray(transportationExpenses.project_id, allowedProjectIds!) : undefined;
      const [transportStats] = await db.select({
        totalTransport: sql<string>`coalesce(sum(${NUM(transportationExpenses.amount)}), 0)`,
      }).from(transportationExpenses).where(transCondition!);

      let supplierStats: { totalSuppliers: number; totalDebt: string };
      if (hasFilter) {
        const supplierIdsInScope = await db.selectDistinct({ id: materialPurchases.supplier_id })
          .from(materialPurchases)
          .where(inArray(materialPurchases.project_id, allowedProjectIds!));
        const ids = supplierIdsInScope.map((s: any) => s.id).filter(Boolean) as string[];
        if (ids.length > 0) {
          [supplierStats] = await db.select({
            totalSuppliers: sql<number>`count(*)`,
            totalDebt: sql<string>`coalesce(sum(${NUM(suppliers.totalDebt)}), 0)`,
          }).from(suppliers).where(inArray(suppliers.id, ids));
        } else {
          supplierStats = { totalSuppliers: 0, totalDebt: '0' };
        }
      } else {
        [supplierStats] = await db.select({
          totalSuppliers: sql<number>`count(*)`,
          totalDebt: sql<string>`coalesce(sum(${NUM(suppliers.totalDebt)}), 0)`,
        }).from(suppliers);
      }

      const eqCondition = hasFilter ? inArray(equipment.project_id, allowedProjectIds!) : undefined;
      const [equipmentStats] = await db.select({
        totalEquipment: sql<number>`count(*)`,
      }).from(equipment).where(eqCondition!);

      const wellCondition = hasFilter ? inArray(wells.project_id, allowedProjectIds!) : undefined;
      const [wellStats] = await db.select({
        totalWells: sql<number>`count(*)`,
      }).from(wells).where(wellCondition!);

      const totalFunds = this.safeParseNum(fundStats.totalFunds);
      const totalWages = this.safeParseNum(attendanceStats.totalWages);
      const totalMaterials = this.safeParseNum(materialStats.totalMaterials);
      const totalTransport = this.safeParseNum(transportStats.totalTransport);
      const totalExpenses = totalWages + totalMaterials + totalTransport;

      return {
        success: true,
        data: {
          projects: { total: projectStats.total, active: projectStats.active, completed: projectStats.completed },
          workers: { total: workerStats.total, active: workerStats.active },
          finance: {
            totalFunds,
            totalExpenses,
            totalWages,
            totalMaterials,
            totalTransport,
            balance: totalFunds - totalExpenses,
            wagesPaid: this.safeParseNum(attendanceStats.totalPaid),
          },
          suppliers: { total: supplierStats.totalSuppliers, totalDebt: this.safeParseNum(supplierStats.totalDebt) },
          equipment: { total: equipmentStats.totalEquipment },
          wells: { total: wellStats.totalWells },
        },
        message: "تم جلب ملخص لوحة المعلومات",
        action: "dashboard_summary",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ: ${error.message}`, action: "dashboard_summary" };
    }
  }

  async getSuppliersList(allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: true, data: [], message: "لا توجد مشاريع مرتبطة بحسابك", action: "list_suppliers" };
      }
      if (allowedProjectIds && allowedProjectIds.length > 0) {
        const supplierIdsInScope = await db.selectDistinct({ id: materialPurchases.supplier_id })
          .from(materialPurchases)
          .where(inArray(materialPurchases.project_id, allowedProjectIds));
        const ids = supplierIdsInScope.map((s: any) => s.id).filter(Boolean) as string[];
        if (ids.length === 0) {
          return { success: true, data: [], message: "لا يوجد موردون مرتبطون بمشاريعك", action: "list_suppliers" };
        }
        const result = await db.select().from(suppliers).where(inArray(suppliers.id, ids)).orderBy(desc(suppliers.totalDebt));
        return { success: true, data: result, message: `تم العثور على ${result.length} مورد`, action: "list_suppliers" };
      }
      const result = await db.select().from(suppliers).orderBy(desc(suppliers.totalDebt));
      return {
        success: true,
        data: result,
        message: result.length > 0 ? `تم العثور على ${result.length} مورد` : "لا يوجد موردون مسجلون",
        action: "list_suppliers",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ: ${error.message}`, action: "list_suppliers" };
    }
  }

  async getSupplierStatement(supplierIdOrName: string, allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: true, data: null, message: "لا توجد مشاريع مرتبطة بحسابك", action: "supplier_statement" };
      }
      const isUUID = /^[0-9a-f]{8}-/.test(supplierIdOrName);
      let supplier: any;

      if (isUUID) {
        const [s] = await db.select().from(suppliers).where(eq(suppliers.id, supplierIdOrName));
        supplier = s;
      } else {
        const results = await db.select().from(suppliers)
          .where(sql`${suppliers.name} ILIKE ${'%' + supplierIdOrName.trim() + '%'}`);
        if (results.length === 1) supplier = results[0];
        else if (results.length > 1) {
          return {
            success: true,
            data: results.map((s: any) => ({ id: s.id, name: s.name, totalDebt: s.totalDebt })),
            message: `تم العثور على ${results.length} مورد. يرجى التحديد:`,
            action: "supplier_statement",
          };
        }
      }

      if (!supplier) return { success: false, message: `لم يتم العثور على المورد "${supplierIdOrName}"`, action: "supplier_statement" };

      const hasFilter = allowedProjectIds && allowedProjectIds.length > 0;

      const purchaseConditions = hasFilter
        ? and(eq(materialPurchases.supplier_id, supplier.id), inArray(materialPurchases.project_id, allowedProjectIds!))
        : eq(materialPurchases.supplier_id, supplier.id);

      const purchases = await db.select().from(materialPurchases)
        .where(purchaseConditions)
        .orderBy(desc(materialPurchases.purchaseDate));

      const paymentConditions = hasFilter
        ? and(eq(supplierPayments.supplier_id, supplier.id), inArray(supplierPayments.project_id, allowedProjectIds!))
        : eq(supplierPayments.supplier_id, supplier.id);

      const payments = await db.select().from(supplierPayments)
        .where(paymentConditions)
        .orderBy(desc(supplierPayments.paymentDate));

      const totalPurchases = purchases.reduce((sum: number, p: any) => sum + this.safeParseNum(p.totalAmount), 0);
      const totalPayments = payments.reduce((sum: number, p: any) => sum + this.safeParseNum(p.amount), 0);

      return {
        success: true,
        data: {
          supplier,
          purchases,
          payments,
          summary: { totalPurchases, totalPayments, balance: totalPurchases - totalPayments },
        },
        message: `كشف حساب المورد: ${supplier.name}`,
        action: "supplier_statement",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ: ${error.message}`, action: "supplier_statement" };
    }
  }

  async getEquipmentList(allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: true, data: [], message: "لا توجد مشاريع مرتبطة بحسابك", action: "list_equipment" };
      }
      const hasFilter = allowedProjectIds && allowedProjectIds.length > 0;
      const result = hasFilter
        ? await db.select().from(equipment).where(inArray(equipment.project_id, allowedProjectIds!)).orderBy(equipment.name)
        : await db.select().from(equipment).orderBy(equipment.name);
      return {
        success: true,
        data: result,
        message: result.length > 0 ? `تم العثور على ${result.length} معدة/أداة` : "لا توجد معدات مسجلة",
        action: "list_equipment",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ: ${error.message}`, action: "list_equipment" };
    }
  }

  async getEquipmentMovements(equipmentId: string, allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: true, data: null, message: "لا توجد مشاريع مرتبطة بحسابك", action: "equipment_movements" };
      }
      const eqId = parseInt(equipmentId);
      const [eq_item] = await db.select().from(equipment).where(eq(equipment.id, eqId));
      if (!eq_item) return { success: false, message: "المعدة غير موجودة", action: "equipment_movements" };

      if (allowedProjectIds && allowedProjectIds.length > 0 && eq_item.project_id && !allowedProjectIds.includes(eq_item.project_id)) {
        return { success: false, message: "ليس لديك صلاحية الوصول لهذه المعدة", action: "equipment_movements" };
      }

      const movements = await db.select().from(equipmentMovements)
        .where(eq(equipmentMovements.equipmentId, eqId))
        .orderBy(desc(equipmentMovements.movementDate));

      return {
        success: true,
        data: { equipment: eq_item, movements },
        message: `حركات المعدة: ${eq_item.name} (${movements.length} حركة)`,
        action: "equipment_movements",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ: ${error.message}`, action: "equipment_movements" };
    }
  }

  async getWellsList(allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: true, data: [], message: "لا توجد مشاريع مرتبطة بحسابك", action: "list_wells" };
      }
      const hasFilter = allowedProjectIds && allowedProjectIds.length > 0;
      const wellsData = hasFilter
        ? await db.select().from(wells).where(inArray(wells.project_id, allowedProjectIds!)).orderBy(wells.wellNumber)
        : await db.select().from(wells).orderBy(wells.wellNumber);

      const wellIds = wellsData.map((w: any) => w.id);
      let crewStats: any[] = [];
      let solarStats: any[] = [];
      if (wellIds.length > 0) {
        crewStats = await db.select({
          well_id: wellWorkCrews.well_id,
          crewCount: sql<number>`count(*)`,
          totalWages: sql<string>`coalesce(sum(${NUM(wellWorkCrews.totalWages)}), 0)`,
        }).from(wellWorkCrews).where(inArray(wellWorkCrews.well_id, wellIds))
          .groupBy(wellWorkCrews.well_id);

        solarStats = await db.select({
          well_id: wellSolarComponents.well_id,
          installationStatus: wellSolarComponents.installationStatus,
        }).from(wellSolarComponents).where(inArray(wellSolarComponents.well_id, wellIds));
      }

      const crewMap: Record<number, any> = {};
      crewStats.forEach(c => { crewMap[c.well_id] = c; });
      const solarMap: Record<number, any> = {};
      solarStats.forEach(s => { solarMap[s.well_id] = s; });

      const projectIds = [...new Set(wellsData.map((w: any) => w.project_id))];
      const projectNames: Record<string, string> = {};
      if (projectIds.length > 0) {
        const pList = await db.select({ id: projects.id, name: projects.name }).from(projects).where(inArray(projects.id, projectIds as string[]));
        pList.forEach((p: any) => { projectNames[p.id] = p.name; });
      }

      const enriched = wellsData.map((w: any) => ({
        ...w,
        projectName: projectNames[w.project_id] || '-',
        crewCount: crewMap[w.id]?.crewCount || 0,
        totalCrewWages: this.safeParseNum(crewMap[w.id]?.totalWages),
        solarStatus: solarMap[w.id]?.installationStatus || 'no_data',
      }));

      return {
        success: true,
        data: enriched,
        message: enriched.length > 0 ? `تم العثور على ${enriched.length} بئر` : "لا توجد آبار مسجلة",
        action: "list_wells",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ: ${error.message}`, action: "list_wells" };
    }
  }

  async getWellDetails(wellId: string, allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: true, data: null, message: "لا توجد مشاريع مرتبطة بحسابك", action: "well_details" };
      }

      let wellData;
      const wId = parseInt(wellId);
      const isNumeric = !isNaN(wId);
      if (isNumeric && wId < 1000) {
        const results = await db.select().from(wells).where(eq(wells.wellNumber, wId));
        if (allowedProjectIds && allowedProjectIds.length > 0) {
          wellData = results.find((w: any) => allowedProjectIds.includes(w.project_id));
        } else {
          wellData = results[0];
        }
      }
      if (!wellData && isNumeric && wId >= 1000) {
        [wellData] = await db.select().from(wells).where(eq(wells.id, wId));
      }
      if (!wellData) {
        const searchResults = await db.select().from(wells).where(like(wells.ownerName, `%${wellId}%`));
        if (allowedProjectIds && allowedProjectIds.length > 0) {
          wellData = searchResults.find((w: any) => allowedProjectIds.includes(w.project_id));
        } else {
          wellData = searchResults[0];
        }
      }
      if (!wellData) return { success: false, message: "البئر غير موجود", action: "well_details" };

      if (allowedProjectIds && allowedProjectIds.length > 0 && !allowedProjectIds.includes(wellData.project_id)) {
        return { success: false, message: "ليس لديك صلاحية الوصول لهذا البئر", action: "well_details" };
      }

      const actualId = wellData.id;
      const [tasks, expenses, crews, solarArr, transport, receptions] = await Promise.all([
        db.select().from(wellTasks).where(eq(wellTasks.well_id, actualId)).orderBy(wellTasks.taskOrder),
        db.select().from(wellExpenses).where(eq(wellExpenses.well_id, actualId)),
        db.select().from(wellWorkCrews).where(eq(wellWorkCrews.well_id, actualId)),
        db.select().from(wellSolarComponents).where(eq(wellSolarComponents.well_id, actualId)),
        db.select().from(wellTransportDetails).where(eq(wellTransportDetails.well_id, actualId)),
        db.select().from(wellReceptions).where(eq(wellReceptions.well_id, actualId)),
      ]);

      const solar = solarArr[0] || null;
      const totalEstimated = tasks.reduce((s: number, t: any) => s + this.safeParseNum(t.estimatedCost), 0);
      const totalActual = tasks.reduce((s: number, t: any) => s + this.safeParseNum(t.actualCost), 0);
      const totalExpenses = expenses.reduce((s: number, e: any) => s + this.safeParseNum(e.totalAmount), 0);
      const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
      const totalCrewWages = crews.reduce((s: number, c: any) => s + this.safeParseNum(c.totalWages), 0);

      const [proj] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, wellData.project_id));

      return {
        success: true,
        data: {
          well: { ...wellData, projectName: proj?.name || '-' },
          tasks,
          expenses,
          crews,
          solar,
          transport,
          receptions,
          summary: {
            totalEstimated, totalActual, totalExpenses, completedTasks, totalTasks: tasks.length,
            totalCrewWages, crewCount: crews.length,
            hasSolar: !!solar, hasReception: receptions.length > 0,
          },
        },
        message: `تفاصيل البئر رقم ${wellData.wellNumber} - ${wellData.ownerName}`,
        action: "well_details",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ: ${error.message}`, action: "well_details" };
    }
  }

  async getWellCrews(wellIdentifier: string, allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: true, data: [], message: "لا توجد مشاريع مرتبطة بحسابك", action: "well_crews" };
      }

      let wellData;
      const wNum = parseInt(wellIdentifier);
      if (!isNaN(wNum) && wNum < 1000) {
        const results = await db.select().from(wells).where(eq(wells.wellNumber, wNum));
        if (allowedProjectIds && allowedProjectIds.length > 0) {
          wellData = results.find((w: any) => allowedProjectIds.includes(w.project_id));
        } else {
          wellData = results[0];
        }
      }
      if (!wellData) {
        const searchResults = await db.select().from(wells).where(like(wells.ownerName, `%${wellIdentifier}%`));
        wellData = (allowedProjectIds && allowedProjectIds.length > 0)
          ? searchResults.find((w: any) => allowedProjectIds.includes(w.project_id))
          : searchResults[0];
      }
      if (!wellData) return { success: false, message: "البئر غير موجود", action: "well_crews" };

      if (allowedProjectIds && allowedProjectIds.length > 0 && !allowedProjectIds.includes(wellData.project_id)) {
        return { success: false, message: "ليس لديك صلاحية", action: "well_crews" };
      }

      const crews = await db.select().from(wellWorkCrews).where(eq(wellWorkCrews.well_id, wellData.id));
      const totalWages = crews.reduce((s: any, c: any) => s + this.safeParseNum(c.totalWages), 0);

      return {
        success: true,
        data: { well: wellData, crews, totalWages },
        message: `فرق عمل البئر رقم ${wellData.wellNumber} - ${wellData.ownerName}`,
        action: "well_crews",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ: ${error.message}`, action: "well_crews" };
    }
  }

  async getWellSolar(wellIdentifier: string, allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: true, data: null, message: "لا توجد مشاريع مرتبطة بحسابك", action: "well_solar" };
      }

      let wellData;
      const wNum = parseInt(wellIdentifier);
      if (!isNaN(wNum) && wNum < 1000) {
        const results = await db.select().from(wells).where(eq(wells.wellNumber, wNum));
        wellData = (allowedProjectIds && allowedProjectIds.length > 0)
          ? results.find((w: any) => allowedProjectIds.includes(w.project_id))
          : results[0];
      }
      if (!wellData) {
        const searchResults = await db.select().from(wells).where(like(wells.ownerName, `%${wellIdentifier}%`));
        wellData = (allowedProjectIds && allowedProjectIds.length > 0)
          ? searchResults.find((w: any) => allowedProjectIds.includes(w.project_id))
          : searchResults[0];
      }
      if (!wellData) return { success: false, message: "البئر غير موجود", action: "well_solar" };

      if (allowedProjectIds && allowedProjectIds.length > 0 && !allowedProjectIds.includes(wellData.project_id)) {
        return { success: false, message: "ليس لديك صلاحية", action: "well_solar" };
      }

      const [solar] = await db.select().from(wellSolarComponents).where(eq(wellSolarComponents.well_id, wellData.id));

      return {
        success: true,
        data: { well: wellData, solar: solar || null },
        message: solar
          ? `المنظومة الشمسية للبئر رقم ${wellData.wellNumber} - ${wellData.ownerName}`
          : `لا توجد بيانات منظومة شمسية للبئر رقم ${wellData.wellNumber}`,
        action: "well_solar",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ: ${error.message}`, action: "well_solar" };
    }
  }

  async getWellAnalysis(allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: true, data: {}, message: "لا توجد مشاريع مرتبطة بحسابك", action: "well_analysis" };
      }
      const hasFilter = allowedProjectIds && allowedProjectIds.length > 0;
      const allWells = hasFilter
        ? await db.select().from(wells).where(inArray(wells.project_id, allowedProjectIds!))
        : await db.select().from(wells);

      if (allWells.length === 0) {
        return { success: true, data: {}, message: "لا توجد آبار مسجلة", action: "well_analysis" };
      }

      const wellIds = allWells.map((w: any) => w.id);

      const [crewAgg] = await db.select({
        totalCrews: sql<number>`count(*)`,
        totalWages: sql<string>`coalesce(sum(${NUM(wellWorkCrews.totalWages)}), 0)`,
        totalWorkDays: sql<string>`coalesce(sum(${NUM(wellWorkCrews.workDays)}), 0)`,
      }).from(wellWorkCrews).where(inArray(wellWorkCrews.well_id, wellIds));

      const crewByType = await db.select({
        crewType: wellWorkCrews.crewType,
        count: sql<number>`count(*)`,
        totalWages: sql<string>`coalesce(sum(${NUM(wellWorkCrews.totalWages)}), 0)`,
      }).from(wellWorkCrews).where(inArray(wellWorkCrews.well_id, wellIds))
        .groupBy(wellWorkCrews.crewType);

      const crewByTeam = await db.select({
        teamName: wellWorkCrews.teamName,
        count: sql<number>`count(*)`,
        totalWages: sql<string>`coalesce(sum(${NUM(wellWorkCrews.totalWages)}), 0)`,
        totalDays: sql<string>`coalesce(sum(${NUM(wellWorkCrews.workDays)}), 0)`,
      }).from(wellWorkCrews).where(inArray(wellWorkCrews.well_id, wellIds))
        .groupBy(wellWorkCrews.teamName).orderBy(sql`sum(${NUM(wellWorkCrews.totalWages)}) desc`);

      const [solarCount] = await db.select({
        total: sql<number>`count(*)`,
        installed: sql<number>`count(*) filter (where ${wellSolarComponents.installationStatus} = 'installed')`,
      }).from(wellSolarComponents).where(inArray(wellSolarComponents.well_id, wellIds));

      const [receptionCount] = await db.select({
        total: sql<number>`count(*)`,
        passed: sql<number>`count(*) filter (where ${wellReceptions.inspectionStatus} = 'passed')`,
        failed: sql<number>`count(*) filter (where ${wellReceptions.inspectionStatus} = 'failed')`,
      }).from(wellReceptions).where(inArray(wellReceptions.well_id, wellIds));

      const statusCount = { pending: 0, in_progress: 0, completed: 0 };
      let totalDepth = 0, totalPanels = 0, totalPipes = 0;
      for (const w of allWells) {
        const s = (w.status || 'pending') as keyof typeof statusCount;
        if (s in statusCount) statusCount[s]++;
        totalDepth += w.wellDepth || 0;
        totalPanels += w.numberOfPanels || 0;
        totalPipes += w.numberOfPipes || 0;
      }

      const projectIds = [...new Set(allWells.map((w: any) => w.project_id))];
      const projectNames: Record<string, string> = {};
      if (projectIds.length > 0) {
        const pList = await db.select({ id: projects.id, name: projects.name }).from(projects).where(inArray(projects.id, projectIds as string[]));
        pList.forEach((p: any) => { projectNames[p.id] = p.name; });
      }

      const byProject: Record<string, { name: string, count: number, totalWages: number }> = {};
      for (const w of allWells) {
        if (!byProject[w.project_id]) {
          byProject[w.project_id] = { name: projectNames[w.project_id] || '-', count: 0, totalWages: 0 };
        }
        byProject[w.project_id].count++;
      }

      return {
        success: true,
        data: {
          totalWells: allWells.length,
          statusCount,
          totalDepth,
          avgDepth: Math.round(totalDepth / allWells.length),
          totalPanels,
          totalPipes,
          crews: {
            totalCrews: crewAgg?.totalCrews || 0,
            totalWages: this.safeParseNum(crewAgg?.totalWages),
            totalWorkDays: this.safeParseNum(crewAgg?.totalWorkDays),
            byType: crewByType.map((c: any) => ({
              type: c.crewType,
              count: c.count,
              totalWages: this.safeParseNum(c.totalWages),
            })),
            byTeam: crewByTeam.map((c: any) => ({
              name: c.teamName || '-',
              count: c.count,
              totalWages: this.safeParseNum(c.totalWages),
              totalDays: this.safeParseNum(c.totalDays),
            })),
          },
          solar: {
            total: solarCount?.total || 0,
            installed: solarCount?.installed || 0,
          },
          receptions: {
            total: receptionCount?.total || 0,
            passed: receptionCount?.passed || 0,
            failed: receptionCount?.failed || 0,
          },
          byProject: Object.values(byProject),
        },
        message: `تحليل شامل لـ ${allWells.length} بئر`,
        action: "well_analysis",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ: ${error.message}`, action: "well_analysis" };
    }
  }

  async getWellCrewsSummary(allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: true, data: { teams: [], totalCrews: 0, totalTeams: 0 }, message: "لا توجد مشاريع مرتبطة بحسابك", action: "well_crews_summary" };
      }
      const hasFilter = allowedProjectIds && allowedProjectIds.length > 0;
      const allWells = hasFilter
        ? await db.select().from(wells).where(inArray(wells.project_id, allowedProjectIds!))
        : await db.select().from(wells);

      const wellIds = allWells.map((w: any) => w.id);
      if (wellIds.length === 0) {
        return { success: true, data: { teams: [], totalCrews: 0, totalTeams: 0 }, message: "لا توجد آبار", action: "well_crews_summary" };
      }

      const allCrews = await db.select({
        id: wellWorkCrews.id,
        well_id: wellWorkCrews.well_id,
        crewType: wellWorkCrews.crewType,
        teamName: wellWorkCrews.teamName,
        workersCount: wellWorkCrews.workersCount,
        mastersCount: wellWorkCrews.mastersCount,
        workDays: wellWorkCrews.workDays,
        masterDailyWage: wellWorkCrews.masterDailyWage,
        workerDailyWage: wellWorkCrews.workerDailyWage,
        totalWages: wellWorkCrews.totalWages,
        workDate: wellWorkCrews.workDate,
        notes: wellWorkCrews.notes,
      }).from(wellWorkCrews).where(inArray(wellWorkCrews.well_id, wellIds));

      const wellMap: Record<number, any> = {};
      allWells.forEach((w: any) => { wellMap[w.id] = w; });

      const teamSummary: Record<string, {
        name: string, wellsCount: number, totalWages: number, totalDays: number,
        steelJobs: number, panelJobs: number, weldingJobs: number,
        wells: string[],
      }> = {};

      for (const c of allCrews) {
        const key = c.teamName || 'بدون اسم';
        if (!teamSummary[key]) {
          teamSummary[key] = { name: key, wellsCount: 0, totalWages: 0, totalDays: 0, steelJobs: 0, panelJobs: 0, weldingJobs: 0, wells: [] };
        }
        const ts = teamSummary[key];
        ts.totalWages += this.safeParseNum(c.totalWages);
        ts.totalDays += this.safeParseNum(c.workDays);
        const wellName = wellMap[c.well_id]?.ownerName || `بئر ${c.well_id}`;
        if (!ts.wells.includes(wellName)) {
          ts.wells.push(wellName);
          ts.wellsCount++;
        }
        if (c.crewType === 'steel_installation') ts.steelJobs++;
        else if (c.crewType === 'panel_installation') ts.panelJobs++;
        else if (c.crewType === 'welding') ts.weldingJobs++;
      }

      const sorted = Object.values(teamSummary).sort((a, b) => b.totalWages - a.totalWages);

      return {
        success: true,
        data: { teams: sorted, totalCrews: allCrews.length, totalTeams: sorted.length },
        message: `ملخص ${sorted.length} فريق عمل — ${allCrews.length} مهمة`,
        action: "well_crews_summary",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ: ${error.message}`, action: "well_crews_summary" };
    }
  }

  async getWellsComparison(allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: true, data: [], message: "لا توجد مشاريع مرتبطة بحسابك", action: "well_comparison" };
      }
      const hasFilter = allowedProjectIds && allowedProjectIds.length > 0;
      const allWells = hasFilter
        ? await db.select().from(wells).where(inArray(wells.project_id, allowedProjectIds!))
        : await db.select().from(wells);

      const projectIds = [...new Set(allWells.map((w: any) => w.project_id))];
      if (projectIds.length < 2) {
        return { success: true, data: [], message: "يلزم وجود مشروعين على الأقل للمقارنة", action: "well_comparison" };
      }

      const projectNames: Record<string, string> = {};
      const pList = await db.select({ id: projects.id, name: projects.name }).from(projects).where(inArray(projects.id, projectIds as string[]));
      pList.forEach((p: any) => { projectNames[p.id] = p.name; });

      const wellIds = allWells.map((w: any) => w.id);
      const allCrews = wellIds.length > 0
        ? await db.select().from(wellWorkCrews).where(inArray(wellWorkCrews.well_id, wellIds))
        : [];
      const allSolar = wellIds.length > 0
        ? await db.select().from(wellSolarComponents).where(inArray(wellSolarComponents.well_id, wellIds))
        : [];

      const wellProjectMap: Record<number, string> = {};
      allWells.forEach((w: any) => { wellProjectMap[w.id] = w.project_id; });

      const comparison = projectIds.map(pid => {
        const pWells = allWells.filter((w: any) => w.project_id === pid);
        const pWellIds = pWells.map((w: any) => w.id);
        const pCrews = allCrews.filter((c: any) => pWellIds.includes(c.well_id));
        const pSolar = allSolar.filter((s: any) => pWellIds.includes(s.well_id));

        const totalDepth = pWells.reduce((s: any, w: any) => s + (w.wellDepth || 0), 0);
        const totalPanels = pWells.reduce((s: any, w: any) => s + (w.numberOfPanels || 0), 0);
        const totalCrewWages = pCrews.reduce((s: any, c: any) => s + this.safeParseNum(c.totalWages), 0);
        const completed = pWells.filter((w: any) => w.status === 'completed').length;
        const hasWaterLevel = pWells.filter((w: any) => w.waterLevel != null).length;

        return {
          projectName: projectNames[pid as string] || pid,
          wellCount: pWells.length,
          completed,
          pending: pWells.length - completed,
          totalDepth,
          avgDepth: pWells.length > 0 ? Math.round(totalDepth / pWells.length) : 0,
          totalPanels,
          crewRecords: pCrews.length,
          totalCrewWages,
          solarRecords: pSolar.length,
          dataCompleteness: {
            waterLevel: `${hasWaterLevel}/${pWells.length}`,
            crews: `${new Set(pCrews.map((c: any) => c.well_id)).size}/${pWells.length}`,
            solar: `${pSolar.length}/${pWells.length}`,
          },
        };
      });

      return {
        success: true,
        data: comparison,
        message: `مقارنة ${comparison.length} مشروع`,
        action: "well_comparison",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ: ${error.message}`, action: "well_comparison" };
    }
  }

  async getProjectWells(projectName: string, allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      const projectResults = await db.select().from(projects)
        .where(like(projects.name, `%${projectName}%`));

      let project = projectResults[0];
      if (!project) {
        return { success: false, message: `لم يتم العثور على مشروع باسم "${projectName}"`, action: "project_wells" };
      }

      if (allowedProjectIds && allowedProjectIds.length > 0) {
        const allowed = projectResults.find((p: any) => allowedProjectIds.includes(p.id));
        if (!allowed) {
          return { success: false, message: "ليس لديك صلاحية الوصول لهذا المشروع", action: "project_wells" };
        }
        project = allowed;
      }

      const wellsData = await db.select().from(wells)
        .where(eq(wells.project_id, project.id))
        .orderBy(wells.wellNumber);

      const statusCounts: Record<string, number> = {};
      let totalDepth = 0, totalPanels = 0, totalBases = 0;
      for (const w of wellsData) {
        const s = (w as any).status || 'pending';
        statusCounts[s] = (statusCounts[s] || 0) + 1;
        totalDepth += parseFloat(String((w as any).wellDepth || 0));
        totalPanels += parseInt(String((w as any).numberOfPanels || 0));
        totalBases += parseInt(String((w as any).numberOfBases || 0));
      }

      return {
        success: true,
        data: {
          project: { id: project.id, name: project.name },
          wells: wellsData,
          stats: {
            total: wellsData.length,
            completed: statusCounts['completed'] || 0,
            inProgress: statusCounts['in_progress'] || 0,
            pending: statusCounts['pending'] || 0,
            totalDepth,
            totalPanels,
            totalBases,
          }
        },
        message: `مشروع "${project.name}" يحتوي على ${wellsData.length} بئر`,
        action: "project_wells",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ: ${error.message}`, action: "project_wells" };
    }
  }

  async searchWells(keyword: string, allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: true, data: [], message: "لا توجد مشاريع مرتبطة بحسابك", action: "search_wells" };
      }
      const hasFilter = allowedProjectIds && allowedProjectIds.length > 0;
      const conditions = [
        sql`(${wells.ownerName} ILIKE ${'%' + keyword + '%'} OR ${wells.region} ILIKE ${'%' + keyword + '%'})`,
      ];
      if (hasFilter) {
        conditions.push(inArray(wells.project_id, allowedProjectIds!));
      }

      const results = await db.select().from(wells).where(and(...conditions)).orderBy(wells.wellNumber);

      const wellIds = results.map((w: any) => w.id);
      let crewCounts: any[] = [];
      if (wellIds.length > 0) {
        crewCounts = await db.select({
          well_id: wellWorkCrews.well_id,
          count: sql<number>`count(*)`,
          totalWages: sql<string>`coalesce(sum(${NUM(wellWorkCrews.totalWages)}), 0)`,
        }).from(wellWorkCrews).where(inArray(wellWorkCrews.well_id, wellIds)).groupBy(wellWorkCrews.well_id);
      }
      const crewMap: Record<number, any> = {};
      crewCounts.forEach(c => { crewMap[c.well_id] = c; });

      const projectIds = [...new Set(results.map((w: any) => w.project_id))];
      const projectNames: Record<string, string> = {};
      if (projectIds.length > 0) {
        const pList = await db.select({ id: projects.id, name: projects.name }).from(projects).where(inArray(projects.id, projectIds as string[]));
        pList.forEach((p: any) => { projectNames[p.id] = p.name; });
      }

      const enriched = results.map((w: any) => ({
        ...w,
        projectName: projectNames[w.project_id] || '-',
        crewCount: crewMap[w.id]?.count || 0,
        totalCrewWages: this.safeParseNum(crewMap[w.id]?.totalWages),
      }));

      return {
        success: true,
        data: enriched,
        message: enriched.length > 0 ? `تم العثور على ${enriched.length} بئر بكلمة "${keyword}"` : `لا توجد نتائج للبحث "${keyword}"`,
        action: "search_wells",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ: ${error.message}`, action: "search_wells" };
    }
  }

  async getTopWorkers(limit: number = 10, allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: true, data: [], message: "لا توجد مشاريع مرتبطة بحسابك", action: "top_workers" };
      }
      const hasFilter = allowedProjectIds && allowedProjectIds.length > 0;
      const joinCondition = hasFilter
        ? and(eq(workers.id, workerAttendance.worker_id), inArray(workerAttendance.project_id, allowedProjectIds!))
        : eq(workers.id, workerAttendance.worker_id);

      const result = await db.select({
        id: workers.id,
        name: workers.name,
        type: workers.type,
        dailyWage: workers.dailyWage,
        totalEarned: sql<string>`coalesce(sum(
          case when ${workerAttendance.actualWage} IS NOT NULL AND ${workerAttendance.actualWage}::text != '' AND ${workerAttendance.actualWage}::text != 'NaN' then ${NUM(workerAttendance.actualWage)} else ${NUM(workerAttendance.dailyWage)} * ${NUM(workerAttendance.workDays)} end
        ), 0)`,
        totalPaid: sql<string>`coalesce(sum(${NUM(workerAttendance.paidAmount)}), 0)`,
        totalDays: sql<string>`coalesce(sum(${NUM(workerAttendance.workDays)}), 0)`,
      })
      .from(workers)
      .leftJoin(workerAttendance, joinCondition)
      .groupBy(workers.id, workers.name, workers.type, workers.dailyWage)
      .orderBy(sql`sum(
        case when ${workerAttendance.actualWage} IS NOT NULL AND ${workerAttendance.actualWage}::text != '' AND ${workerAttendance.actualWage}::text != 'NaN' then ${NUM(workerAttendance.actualWage)} else ${NUM(workerAttendance.dailyWage)} * ${NUM(workerAttendance.workDays)} end
      ) desc nulls last`)
      .limit(limit);

      return {
        success: true,
        data: result,
        message: `أعلى ${result.length} عامل من حيث المستحقات`,
        action: "top_workers",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ: ${error.message}`, action: "top_workers" };
    }
  }

  async getBudgetAnalysis(allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: true, data: { projects: [], summary: { total: 0, exceeded: 0, critical: 0 } }, message: "لا توجد مشاريع مرتبطة بحسابك", action: "budget_analysis" };
      }
      const hasFilter = allowedProjectIds && allowedProjectIds.length > 0;
      const allProjects = hasFilter
        ? await db.select().from(projects).where(and(eq(projects.status, 'active'), inArray(projects.id, allowedProjectIds!)))
        : await db.select().from(projects).where(eq(projects.status, 'active'));
      const analysis: any[] = [];

      for (const project of allProjects) {
        const budget = this.safeParseNum(project.budget);

        const [funds] = await db.select({ total: sql<string>`coalesce(sum(${NUM(fundTransfers.amount)}), 0)` })
          .from(fundTransfers).where(eq(fundTransfers.project_id, project.id));
        const [wages] = await db.select({ total: sql<string>`coalesce(sum(
          case when ${workerAttendance.actualWage} IS NOT NULL AND ${workerAttendance.actualWage}::text != '' AND ${workerAttendance.actualWage}::text != 'NaN' then ${NUM(workerAttendance.actualWage)} else ${NUM(workerAttendance.dailyWage)} * ${NUM(workerAttendance.workDays)} end
        ), 0)` })
          .from(workerAttendance).where(eq(workerAttendance.project_id, project.id));
        const [mats] = await db.select({ total: sql<string>`coalesce(sum(${NUM(materialPurchases.totalAmount)}), 0)` })
          .from(materialPurchases).where(eq(materialPurchases.project_id, project.id));
        const [trans] = await db.select({ total: sql<string>`coalesce(sum(${NUM(transportationExpenses.amount)}), 0)` })
          .from(transportationExpenses).where(eq(transportationExpenses.project_id, project.id));

        const totalExpenses = this.safeParseNum(wages.total) + this.safeParseNum(mats.total) + this.safeParseNum(trans.total);
        const totalFundsVal = this.safeParseNum(funds.total);
        const effectiveBudget = budget > 0 ? budget : totalFundsVal;
        const usagePercent = effectiveBudget > 0 ? Math.round((totalExpenses / effectiveBudget) * 100) : 0;
        const remaining = effectiveBudget - totalExpenses;

        let riskLevel = 'safe';
        if (effectiveBudget > 0 && usagePercent >= 100) riskLevel = 'exceeded';
        else if (effectiveBudget > 0 && usagePercent >= 85) riskLevel = 'critical';
        else if (effectiveBudget > 0 && usagePercent >= 70) riskLevel = 'warning';
        else if (effectiveBudget <= 0 && totalExpenses > 0) riskLevel = 'no_budget';

        analysis.push({
          projectId: project.id,
          projectName: project.name,
          budget: effectiveBudget,
          totalExpenses,
          remaining,
          usagePercent,
          riskLevel,
          totalFunds: totalFundsVal,
        });
      }

      analysis.sort((a, b) => b.usagePercent - a.usagePercent);

      const exceeded = analysis.filter(a => a.riskLevel === 'exceeded').length;
      const critical = analysis.filter(a => a.riskLevel === 'critical').length;

      return {
        success: true,
        data: { projects: analysis, summary: { total: analysis.length, exceeded, critical } },
        message: exceeded > 0 
          ? `تحذير: ${exceeded} مشروع تجاوز الميزانية!`
          : critical > 0 
            ? `تنبيه: ${critical} مشروع قريب من حد الميزانية`
            : "جميع المشاريع ضمن الميزانية المحددة",
        action: "budget_analysis",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ: ${error.message}`, action: "budget_analysis" };
    }
  }

  async getRecentActivities(limit: number = 20, allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: true, data: [], message: "لا توجد مشاريع مرتبطة بحسابك", action: "recent_activities" };
      }
      const hasFilter = allowedProjectIds && allowedProjectIds.length > 0;
      const attFilter = hasFilter ? inArray(workerAttendance.project_id, allowedProjectIds!) : undefined;
      const matFilter = hasFilter ? inArray(materialPurchases.project_id, allowedProjectIds!) : undefined;
      const fundFilter = hasFilter ? inArray(fundTransfers.project_id, allowedProjectIds!) : undefined;

      const recentAttendance = await db.select({
        type: sql<string>`'حضور'`,
        description: sql<string>`${workers.name} || ' - ' || ${workerAttendance.workDays} || ' يوم'`,
        date: sql<string>`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate})`,
        amount: sql<string>`CASE WHEN ${workerAttendance.actualWage} IS NOT NULL AND ${workerAttendance.actualWage}::text != '' AND ${workerAttendance.actualWage}::text != 'NaN' THEN ${workerAttendance.actualWage} ELSE CAST(${NUM(workerAttendance.dailyWage)} * ${NUM(workerAttendance.workDays)} AS TEXT) END`,
      }).from(workerAttendance)
        .leftJoin(workers, eq(workerAttendance.worker_id, workers.id))
        .where(attFilter!)
        .orderBy(desc(sql`COALESCE(NULLIF(${workerAttendance.date},''), ${workerAttendance.attendanceDate})`))
        .limit(limit);

      const recentPurchases = await db.select({
        type: sql<string>`'مشتريات'`,
        description: materialPurchases.materialName,
        date: materialPurchases.purchaseDate,
        amount: materialPurchases.totalAmount,
      }).from(materialPurchases)
        .where(matFilter!)
        .orderBy(desc(materialPurchases.purchaseDate))
        .limit(limit);

      const recentFunds = await db.select({
        type: sql<string>`'تمويل'`,
        description: sql<string>`'تحويل - ' || coalesce(${fundTransfers.senderName}, 'غير محدد')`,
        date: fundTransfers.transferDate,
        amount: fundTransfers.amount,
      }).from(fundTransfers)
        .where(fundFilter!)
        .orderBy(desc(fundTransfers.transferDate))
        .limit(limit);

      const all = [...recentAttendance, ...recentPurchases, ...recentFunds]
        .sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, limit);

      return {
        success: true,
        data: all,
        message: `آخر ${all.length} عملية في النظام`,
        action: "recent_activities",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ: ${error.message}`, action: "recent_activities" };
    }
  }

  async getMonthlyTrends(projectId?: string, allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: true, data: [], message: "لا توجد مشاريع مرتبطة بحسابك", action: "monthly_trends" };
      }
      if (projectId && allowedProjectIds && !this.isProjectAllowed(projectId, allowedProjectIds)) {
        return { success: false, message: "ليس لديك صلاحية الوصول لهذا المشروع", action: "monthly_trends" };
      }
      let projectFilter = '';
      let params: any[] = [];
      if (projectId) {
        projectFilter = `AND project_id = $1`;
        params = [projectId];
      } else if (allowedProjectIds && allowedProjectIds.length > 0) {
        projectFilter = `AND project_id = ANY($1::text[])`;
        params = [allowedProjectIds];
      }

      const result = await pool.query(`
        WITH months AS (
          SELECT generate_series(
            date_trunc('month', CURRENT_DATE - interval '5 months'),
            date_trunc('month', CURRENT_DATE),
            interval '1 month'
          )::date AS month
        )
        SELECT 
          to_char(m.month, 'YYYY-MM') as month,
          coalesce((SELECT sum(case when actual_wage IS NOT NULL AND actual_wage::text != '' AND actual_wage::text != 'NaN' then safe_numeric(actual_wage::text, 0) else safe_numeric(daily_wage::text, 0) * safe_numeric(work_days::text, 0) end) FROM worker_attendance WHERE date_trunc('month', COALESCE(NULLIF(date,''), attendance_date)::date) = m.month ${projectFilter}), 0) as wages,
          coalesce((SELECT sum(safe_numeric(total_amount::text, 0)) FROM material_purchases WHERE date_trunc('month', purchase_date::date) = m.month ${projectFilter}), 0) as materials,
          coalesce((SELECT sum(safe_numeric(amount::text, 0)) FROM transportation_expenses WHERE date_trunc('month', date::date) = m.month ${projectFilter}), 0) as transport
        FROM months m
        ORDER BY m.month
      `, params);

      return {
        success: true,
        data: result.rows,
        message: `اتجاهات المصروفات الشهرية (آخر 6 أشهر)`,
        action: "monthly_trends",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ: ${error.message}`, action: "monthly_trends" };
    }
  }

  async searchGlobal(query: string, allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: true, data: [], message: "لا توجد مشاريع مرتبطة بحسابك", action: "global_search" };
      }
      const searchTerm = '%' + query.trim() + '%';
      const hasFilter = allowedProjectIds && allowedProjectIds.length > 0;

      const projectResults = hasFilter
        ? await db.select({ id: projects.id, name: projects.name, type: sql<string>`'مشروع'` })
            .from(projects).where(and(sql`${projects.name} ILIKE ${searchTerm}`, inArray(projects.id, allowedProjectIds!))).limit(5)
        : await db.select({ id: projects.id, name: projects.name, type: sql<string>`'مشروع'` })
            .from(projects).where(sql`${projects.name} ILIKE ${searchTerm}`).limit(5);

      const workerResults = hasFilter
        ? await db.select({ id: workers.id, name: workers.name, type: sql<string>`'عامل'` })
            .from(workers).where(and(
              sql`${workers.name} ILIKE ${searchTerm}`,
              sql`${workers.id} IN (SELECT DISTINCT worker_id FROM worker_attendance WHERE project_id IN (${sql.join(allowedProjectIds!.map(id => sql`${id}`), sql`, `)}))`
            )).limit(5)
        : await db.select({ id: workers.id, name: workers.name, type: sql<string>`'عامل'` })
            .from(workers).where(sql`${workers.name} ILIKE ${searchTerm}`).limit(5);

      let supplierResults: any[];
      if (hasFilter) {
        const supplierIdsInScope = await db.selectDistinct({ id: materialPurchases.supplier_id })
          .from(materialPurchases)
          .where(inArray(materialPurchases.project_id, allowedProjectIds!));
        const sIds = supplierIdsInScope.map((s: any) => s.id).filter(Boolean) as string[];
        supplierResults = sIds.length > 0
          ? await db.select({ id: suppliers.id, name: suppliers.name, type: sql<string>`'مورد'` })
              .from(suppliers).where(and(sql`${suppliers.name} ILIKE ${searchTerm}`, inArray(suppliers.id, sIds))).limit(5)
          : [];
      } else {
        supplierResults = await db.select({ id: suppliers.id, name: suppliers.name, type: sql<string>`'مورد'` })
          .from(suppliers).where(sql`${suppliers.name} ILIKE ${searchTerm}`).limit(5);
      }

      const equipmentResults = hasFilter
        ? await db.select({ id: sql<string>`${equipment.id}::text`, name: equipment.name, type: sql<string>`'معدة'` })
            .from(equipment).where(and(sql`${equipment.name} ILIKE ${searchTerm}`, inArray(equipment.project_id, allowedProjectIds!))).limit(5)
        : await db.select({ id: sql<string>`${equipment.id}::text`, name: equipment.name, type: sql<string>`'معدة'` })
            .from(equipment).where(sql`${equipment.name} ILIKE ${searchTerm}`).limit(5);

      const all = [...projectResults, ...workerResults, ...supplierResults, ...equipmentResults];

      return {
        success: true,
        data: all,
        message: all.length > 0 ? `تم العثور على ${all.length} نتيجة لـ "${query}"` : `لم يتم العثور على نتائج لـ "${query}"`,
        action: "global_search",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ: ${error.message}`, action: "global_search" };
    }
  }

  async getWorkersUnpaidBalances(allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: true, data: { workers: [], totalUnpaid: 0, count: 0 }, message: "لا توجد مشاريع مرتبطة بحسابك", action: "unpaid_balances" };
      }
      const hasFilter = allowedProjectIds && allowedProjectIds.length > 0;
      const joinCondition = hasFilter
        ? and(eq(workers.id, workerAttendance.worker_id), inArray(workerAttendance.project_id, allowedProjectIds!))
        : eq(workers.id, workerAttendance.worker_id);

      const earnedExpr = sql`coalesce(sum(
        case when ${workerAttendance.actualWage} IS NOT NULL AND ${workerAttendance.actualWage}::text != '' AND ${workerAttendance.actualWage}::text != 'NaN' then ${NUM(workerAttendance.actualWage)} else ${NUM(workerAttendance.dailyWage)} * ${NUM(workerAttendance.workDays)} end
      ), 0)`;
      const paidExpr = sql`coalesce(sum(${NUM(workerAttendance.paidAmount)}), 0)`;

      const result = await db.select({
        id: workers.id,
        name: workers.name,
        type: workers.type,
        totalEarned: earnedExpr,
        totalPaid: paidExpr,
        balance: sql`${earnedExpr} - ${paidExpr}`,
      })
      .from(workers)
      .leftJoin(workerAttendance, joinCondition)
      .where(eq(workers.is_active, true))
      .groupBy(workers.id, workers.name, workers.type)
      .having(sql`${earnedExpr} - ${paidExpr} > 0`)
      .orderBy(sql`${earnedExpr} - ${paidExpr} desc`);

      const totalUnpaid = result.reduce((s: number, r: any) => s + this.safeParseNum(r.balance), 0);

      return {
        success: true,
        data: { workers: result, totalUnpaid, count: result.length },
        message: result.length > 0 
          ? `${result.length} عامل لديهم مستحقات غير مدفوعة (إجمالي: ${totalUnpaid.toLocaleString('en-US')} ريال)`
          : "لا توجد مستحقات غير مدفوعة",
        action: "unpaid_balances",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ: ${error.message}`, action: "unpaid_balances" };
    }
  }

  async getProjectComparison(allowedProjectIds?: string[]): Promise<ActionResult> {
    try {
      if (allowedProjectIds && allowedProjectIds.length === 0) {
        return { success: true, data: [], message: "لا توجد مشاريع مرتبطة بحسابك", action: "project_comparison" };
      }
      const hasFilter = allowedProjectIds && allowedProjectIds.length > 0;
      const allProjects = hasFilter
        ? await db.select().from(projects).where(inArray(projects.id, allowedProjectIds!))
        : await db.select().from(projects);
      const comparison: any[] = [];

      for (const project of allProjects) {
        const [funds] = await db.select({ total: sql<string>`coalesce(sum(${NUM(fundTransfers.amount)}), 0)` })
          .from(fundTransfers).where(eq(fundTransfers.project_id, project.id));
        const [wages] = await db.select({ total: sql<string>`coalesce(sum(
          case when ${workerAttendance.actualWage} IS NOT NULL AND ${workerAttendance.actualWage}::text != '' AND ${workerAttendance.actualWage}::text != 'NaN' then ${NUM(workerAttendance.actualWage)} else ${NUM(workerAttendance.dailyWage)} * ${NUM(workerAttendance.workDays)} end
        ), 0)` })
          .from(workerAttendance).where(eq(workerAttendance.project_id, project.id));
        const [mats] = await db.select({ total: sql<string>`coalesce(sum(${NUM(materialPurchases.totalAmount)}), 0)` })
          .from(materialPurchases).where(eq(materialPurchases.project_id, project.id));
        const [trans] = await db.select({ total: sql<string>`coalesce(sum(${NUM(transportationExpenses.amount)}), 0)` })
          .from(transportationExpenses).where(eq(transportationExpenses.project_id, project.id));
        const [workerCount] = await db.select({ count: sql<number>`count(distinct ${workerAttendance.worker_id})` })
          .from(workerAttendance).where(eq(workerAttendance.project_id, project.id));

        const totalExpenses = this.safeParseNum(wages.total) + this.safeParseNum(mats.total) + this.safeParseNum(trans.total);

        comparison.push({
          name: project.name,
          status: project.status,
          budget: this.safeParseNum(project.budget),
          totalFunds: this.safeParseNum(funds.total),
          totalExpenses,
          wages: this.safeParseNum(wages.total),
          materials: this.safeParseNum(mats.total),
          transport: this.safeParseNum(trans.total),
          balance: this.safeParseNum(funds.total) - totalExpenses,
          workerCount: workerCount.count,
        });
      }

      comparison.sort((a, b) => b.totalExpenses - a.totalExpenses);

      return {
        success: true,
        data: comparison,
        message: `مقارنة ${comparison.length} مشروع`,
        action: "project_comparison",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ: ${error.message}`, action: "project_comparison" };
    }
  }
}

let dbActionsInstance: DatabaseActions | null = null;

export function getDatabaseActions(): DatabaseActions {
  if (!dbActionsInstance) {
    dbActionsInstance = new DatabaseActions();
  }
  return dbActionsInstance;
}
