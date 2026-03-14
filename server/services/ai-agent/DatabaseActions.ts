/**
 * Database Actions - تنفيذ أوامر قاعدة البيانات
 * يحول أوامر الوكيل الذكي إلى استعلامات قاعدة البيانات
 * صلاحيات كاملة: قراءة، إضافة، تعديل، حذف
 */

import { db, pool } from "../../db";
import { eq, and, sql, desc, like, gte, lte, inArray } from "drizzle-orm";
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
      const projectSummaries = [];

      for (const project of allProjects) {
        try {
          const fundsResult = await db
            .select({ total: sql<string>`COALESCE(SUM(${fundTransfers.amount}), 0)` })
            .from(fundTransfers)
            .where(eq(fundTransfers.project_id, project.id));

          const wagesResult = await db
            .select({ total: sql<string>`COALESCE(SUM(${workerAttendance.paidAmount}), 0)` })
            .from(workerAttendance)
            .where(eq(workerAttendance.project_id, project.id));

          const materialsResult = await db
            .select({ total: sql<string>`COALESCE(SUM(${materialPurchases.paidAmount}), 0)` })
            .from(materialPurchases)
            .where(eq(materialPurchases.project_id, project.id));

          const transportResult = await db
            .select({ total: sql<string>`COALESCE(SUM(${transportationExpenses.amount}), 0)` })
            .from(transportationExpenses)
            .where(eq(transportationExpenses.project_id, project.id));

          const miscResult = await db
            .select({ total: sql<string>`COALESCE(SUM(${workerMiscExpenses.amount}), 0)` })
            .from(workerMiscExpenses)
            .where(eq(workerMiscExpenses.project_id, project.id));

          const totalFunds = parseFloat(fundsResult[0]?.total || "0");
          const totalWages = parseFloat(wagesResult[0]?.total || "0");
          const totalMaterials = parseFloat(materialsResult[0]?.total || "0");
          const totalTransport = parseFloat(transportResult[0]?.total || "0");
          const totalMisc = parseFloat(miscResult[0]?.total || "0");
          const totalExpenses = totalWages + totalMaterials + totalTransport + totalMisc;

          projectSummaries.push({
            المشروع: project.name,
            الحالة: project.status || "نشط",
            الميزانية: parseFloat(String(project.budget || "0")),
            إجمالي_التمويل: totalFunds,
            الأجور: totalWages,
            المواد: totalMaterials,
            النقل: totalTransport,
            متنوعات: totalMisc,
            إجمالي_المصروفات: totalExpenses,
            الرصيد: totalFunds - totalExpenses,
          });
        } catch {
          projectSummaries.push({
            المشروع: project.name,
            الحالة: project.status || "نشط",
            ملاحظة: "تعذر جلب البيانات المالية",
          });
        }
      }

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
        totalFunds: parseFloat(fundsResult[0]?.total || "0"),
        totalWages: parseFloat(wagesResult[0]?.total || "0"),
        totalMaterials: parseFloat(materialsResult[0]?.total || "0"),
        totalTransport: parseFloat(transportResult[0]?.total || "0"),
        totalMisc: parseFloat(miscResult[0]?.total || "0"),
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

      const totalDays = result.reduce((sum: number, r: any) => sum + parseFloat(r.workDays || "0"), 0);
      const totalEarned = result.reduce((sum: number, r: any) => sum + parseFloat(r.totalPay || "0"), 0);
      const totalPaid = result.reduce((sum: number, r: any) => sum + parseFloat(r.paidAmount || "0"), 0);

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

      const total = result.reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0);

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
          sql`(CASE WHEN attendance_date IS NULL OR attendance_date = '' THEN NULL ELSE attendance_date::date END) = ${date}`
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
      const totalPay = (parseFloat(data.workDays) * parseFloat(data.dailyWage)).toString();
      
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
      const trimmed = query.trim();
      const normalized = trimmed.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '').trim();
      
      if (!/^SELECT\s/i.test(normalized)) {
        return {
          success: false,
          message: "يُسمح فقط باستعلامات SELECT للقراءة. لا يمكن تنفيذ استعلامات تعديلية من هذا الأمر.",
          action: "raw_select",
        };
      }

      const forbidden = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|EXEC|EXECUTE)\b/i;
      if (forbidden.test(normalized)) {
        return {
          success: false,
          message: "الاستعلام يحتوي على أوامر تعديلية غير مسموحة. استخدم فقط SELECT للقراءة.",
          action: "raw_select",
        };
      }

      const limitedQuery = /\bLIMIT\s+\d+/i.test(normalized) ? trimmed : `${trimmed} LIMIT 500`;
      const client = await pool.connect();
      try {
        await client.query('SET statement_timeout = 10000');
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

  async executeCustomQuery(query: string, confirmed: boolean = false): Promise<ActionResult> {
    const lowerQuery = query.toLowerCase().trim();
    const isDestructive = lowerQuery.startsWith("delete") || 
                          lowerQuery.startsWith("drop") || 
                          lowerQuery.startsWith("truncate") ||
                          lowerQuery.startsWith("update");

    if (isDestructive && !confirmed) {
      return {
        success: false,
        requiresConfirmation: true,
        confirmationMessage: `⚠️ هذا استعلام تعديلي! الاستعلام: "${query}"\nهل أنت متأكد؟ اكتب "موافق" للتأكيد.`,
        message: "يتطلب تأكيد",
        action: "execute_sql",
      };
    }

    try {
      const result = await pool.query(query);
      return {
        success: true,
        data: result,
        message: `تم تنفيذ الاستعلام بنجاح`,
        action: "execute_sql",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ في تنفيذ الاستعلام: ${error.message}`,
        action: "execute_sql",
      };
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
        totalFunds: sql<string>`coalesce(sum(case when ${fundTransfers.amount}::text != 'NaN' then ${fundTransfers.amount}::numeric else 0 end), 0)`,
      }).from(fundTransfers).where(fundCondition!);

      const attCondition = hasFilter ? inArray(workerAttendance.project_id, allowedProjectIds!) : undefined;
      const [attendanceStats] = await db.select({
        totalWages: sql<string>`coalesce(sum(case when ${workerAttendance.totalPay}::text != 'NaN' then ${workerAttendance.totalPay}::numeric else 0 end), 0)`,
        totalPaid: sql<string>`coalesce(sum(case when ${workerAttendance.paidAmount}::text != 'NaN' then ${workerAttendance.paidAmount}::numeric else 0 end), 0)`,
      }).from(workerAttendance).where(attCondition!);

      const matCondition = hasFilter ? inArray(materialPurchases.project_id, allowedProjectIds!) : undefined;
      const [materialStats] = await db.select({
        totalMaterials: sql<string>`coalesce(sum(case when ${materialPurchases.totalAmount}::text != 'NaN' then ${materialPurchases.totalAmount}::numeric else 0 end), 0)`,
      }).from(materialPurchases).where(matCondition!);

      const transCondition = hasFilter ? inArray(transportationExpenses.project_id, allowedProjectIds!) : undefined;
      const [transportStats] = await db.select({
        totalTransport: sql<string>`coalesce(sum(case when ${transportationExpenses.amount}::text != 'NaN' then ${transportationExpenses.amount}::numeric else 0 end), 0)`,
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
            totalDebt: sql<string>`coalesce(sum(${suppliers.totalDebt}::numeric), 0)`,
          }).from(suppliers).where(inArray(suppliers.id, ids));
        } else {
          supplierStats = { totalSuppliers: 0, totalDebt: '0' };
        }
      } else {
        [supplierStats] = await db.select({
          totalSuppliers: sql<number>`count(*)`,
          totalDebt: sql<string>`coalesce(sum(${suppliers.totalDebt}::numeric), 0)`,
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

      const totalFunds = parseFloat(fundStats.totalFunds || '0');
      const totalWages = parseFloat(attendanceStats.totalWages || '0');
      const totalMaterials = parseFloat(materialStats.totalMaterials || '0');
      const totalTransport = parseFloat(transportStats.totalTransport || '0');
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
            wagesPaid: parseFloat(attendanceStats.totalPaid || '0'),
          },
          suppliers: { total: supplierStats.totalSuppliers, totalDebt: parseFloat(supplierStats.totalDebt || '0') },
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

      const totalPurchases = purchases.reduce((sum: number, p: any) => sum + parseFloat(p.totalAmount || '0'), 0);
      const totalPayments = payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || '0'), 0);

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
      const result = hasFilter
        ? await db.select().from(wells).where(inArray(wells.project_id, allowedProjectIds!)).orderBy(wells.id)
        : await db.select().from(wells).orderBy(wells.id);
      return {
        success: true,
        data: result,
        message: result.length > 0 ? `تم العثور على ${result.length} بئر` : "لا توجد آبار مسجلة",
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
      const wId = parseInt(wellId);
      const [well] = await db.select().from(wells).where(eq(wells.id, wId));
      if (!well) return { success: false, message: "البئر غير موجود", action: "well_details" };

      if (allowedProjectIds && allowedProjectIds.length > 0 && !allowedProjectIds.includes(well.project_id)) {
        return { success: false, message: "ليس لديك صلاحية الوصول لهذا البئر", action: "well_details" };
      }

      const tasks = await db.select().from(wellTasks).where(eq(wellTasks.well_id, wId)).orderBy(wellTasks.taskOrder);
      const expenses = await db.select().from(wellExpenses).where(eq(wellExpenses.well_id, wId));

      const totalEstimated = tasks.reduce((s: number, t: any) => s + parseFloat(t.estimatedCost || '0'), 0);
      const totalActual = tasks.reduce((s: number, t: any) => s + parseFloat(t.actualCost || '0'), 0);
      const totalExpenses = expenses.reduce((s: number, e: any) => s + parseFloat(e.totalAmount || '0'), 0);
      const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;

      return {
        success: true,
        data: {
          well,
          tasks,
          expenses,
          summary: { totalEstimated, totalActual, totalExpenses, completedTasks, totalTasks: tasks.length },
        },
        message: `تفاصيل البئر رقم ${well.wellNumber} - ${well.ownerName}`,
        action: "well_details",
      };
    } catch (error: any) {
      return { success: false, message: `خطأ: ${error.message}`, action: "well_details" };
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
        totalEarned: sql<string>`coalesce(sum(case when ${workerAttendance.totalPay}::text != 'NaN' then ${workerAttendance.totalPay}::numeric else 0 end), 0)`,
        totalPaid: sql<string>`coalesce(sum(case when ${workerAttendance.paidAmount}::text != 'NaN' then ${workerAttendance.paidAmount}::numeric else 0 end), 0)`,
        totalDays: sql<string>`coalesce(sum(case when ${workerAttendance.workDays}::text != 'NaN' then ${workerAttendance.workDays}::numeric else 0 end), 0)`,
      })
      .from(workers)
      .leftJoin(workerAttendance, joinCondition)
      .groupBy(workers.id, workers.name, workers.type, workers.dailyWage)
      .orderBy(sql`sum(case when ${workerAttendance.totalPay}::text != 'NaN' then ${workerAttendance.totalPay}::numeric else 0 end) desc nulls last`)
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
        const budget = parseFloat(project.budget || '0');

        const [funds] = await db.select({ total: sql<string>`coalesce(sum(${fundTransfers.amount}::numeric), 0)` })
          .from(fundTransfers).where(eq(fundTransfers.project_id, project.id));
        const [wages] = await db.select({ total: sql<string>`coalesce(sum(case when ${workerAttendance.totalPay}::text != 'NaN' then ${workerAttendance.totalPay}::numeric else 0 end), 0)` })
          .from(workerAttendance).where(eq(workerAttendance.project_id, project.id));
        const [mats] = await db.select({ total: sql<string>`coalesce(sum(case when ${materialPurchases.totalAmount}::text != 'NaN' then ${materialPurchases.totalAmount}::numeric else 0 end), 0)` })
          .from(materialPurchases).where(eq(materialPurchases.project_id, project.id));
        const [trans] = await db.select({ total: sql<string>`coalesce(sum(case when ${transportationExpenses.amount}::text != 'NaN' then ${transportationExpenses.amount}::numeric else 0 end), 0)` })
          .from(transportationExpenses).where(eq(transportationExpenses.project_id, project.id));

        const totalExpenses = parseFloat(wages.total || '0') + parseFloat(mats.total || '0') + parseFloat(trans.total || '0');
        const totalFundsVal = parseFloat(funds.total || '0');
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
        date: workerAttendance.attendanceDate,
        amount: workerAttendance.totalPay,
      }).from(workerAttendance)
        .leftJoin(workers, eq(workerAttendance.worker_id, workers.id))
        .where(attFilter!)
        .orderBy(desc(workerAttendance.attendanceDate))
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
          coalesce((SELECT sum(case when total_pay::text != 'NaN' then total_pay::numeric else 0 end) FROM worker_attendance WHERE date_trunc('month', attendance_date::date) = m.month ${projectFilter}), 0) as wages,
          coalesce((SELECT sum(case when total_amount::text != 'NaN' then total_amount::numeric else 0 end) FROM material_purchases WHERE date_trunc('month', purchase_date::date) = m.month ${projectFilter}), 0) as materials,
          coalesce((SELECT sum(case when amount::text != 'NaN' then amount::numeric else 0 end) FROM transportation_expenses WHERE date_trunc('month', date::date) = m.month ${projectFilter}), 0) as transport
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

      const result = await db.select({
        id: workers.id,
        name: workers.name,
        type: workers.type,
        totalEarned: sql<string>`coalesce(sum(case when ${workerAttendance.totalPay}::text != 'NaN' then ${workerAttendance.totalPay}::numeric else 0 end), 0)`,
        totalPaid: sql<string>`coalesce(sum(case when ${workerAttendance.paidAmount}::text != 'NaN' then ${workerAttendance.paidAmount}::numeric else 0 end), 0)`,
        balance: sql<string>`coalesce(sum(case when ${workerAttendance.totalPay}::text != 'NaN' then ${workerAttendance.totalPay}::numeric else 0 end), 0) - coalesce(sum(case when ${workerAttendance.paidAmount}::text != 'NaN' then ${workerAttendance.paidAmount}::numeric else 0 end), 0)`,
      })
      .from(workers)
      .leftJoin(workerAttendance, joinCondition)
      .where(eq(workers.is_active, true))
      .groupBy(workers.id, workers.name, workers.type)
      .having(sql`coalesce(sum(case when ${workerAttendance.totalPay}::text != 'NaN' then ${workerAttendance.totalPay}::numeric else 0 end), 0) - coalesce(sum(case when ${workerAttendance.paidAmount}::text != 'NaN' then ${workerAttendance.paidAmount}::numeric else 0 end), 0) > 0`)
      .orderBy(sql`coalesce(sum(case when ${workerAttendance.totalPay}::text != 'NaN' then ${workerAttendance.totalPay}::numeric else 0 end), 0) - coalesce(sum(case when ${workerAttendance.paidAmount}::text != 'NaN' then ${workerAttendance.paidAmount}::numeric else 0 end), 0) desc`);

      const totalUnpaid = result.reduce((s: number, r: any) => s + parseFloat(r.balance || '0'), 0);

      return {
        success: true,
        data: { workers: result, totalUnpaid, count: result.length },
        message: result.length > 0 
          ? `${result.length} عامل لديهم مستحقات غير مدفوعة (إجمالي: ${totalUnpaid.toLocaleString('ar')} ريال)`
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
        const [funds] = await db.select({ total: sql<string>`coalesce(sum(${fundTransfers.amount}::numeric), 0)` })
          .from(fundTransfers).where(eq(fundTransfers.project_id, project.id));
        const [wages] = await db.select({ total: sql<string>`coalesce(sum(case when ${workerAttendance.totalPay}::text != 'NaN' then ${workerAttendance.totalPay}::numeric else 0 end), 0)` })
          .from(workerAttendance).where(eq(workerAttendance.project_id, project.id));
        const [mats] = await db.select({ total: sql<string>`coalesce(sum(case when ${materialPurchases.totalAmount}::text != 'NaN' then ${materialPurchases.totalAmount}::numeric else 0 end), 0)` })
          .from(materialPurchases).where(eq(materialPurchases.project_id, project.id));
        const [trans] = await db.select({ total: sql<string>`coalesce(sum(case when ${transportationExpenses.amount}::text != 'NaN' then ${transportationExpenses.amount}::numeric else 0 end), 0)` })
          .from(transportationExpenses).where(eq(transportationExpenses.project_id, project.id));
        const [workerCount] = await db.select({ count: sql<number>`count(distinct ${workerAttendance.worker_id})` })
          .from(workerAttendance).where(eq(workerAttendance.project_id, project.id));

        const totalExpenses = parseFloat(wages.total) + parseFloat(mats.total) + parseFloat(trans.total);

        comparison.push({
          name: project.name,
          status: project.status,
          budget: parseFloat(project.budget || '0'),
          totalFunds: parseFloat(funds.total),
          totalExpenses,
          wages: parseFloat(wages.total),
          materials: parseFloat(mats.total),
          transport: parseFloat(trans.total),
          balance: parseFloat(funds.total) - totalExpenses,
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
