/**
 * Database Actions - تنفيذ أوامر قاعدة البيانات
 * يحول أوامر الوكيل الذكي إلى استعلامات قاعدة البيانات
 */

import { db } from "../../db";
import { eq, and, sql, desc, like, gte, lte } from "drizzle-orm";
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
} from "@shared/schema";

export interface ActionResult {
  success: boolean;
  data?: any;
  message: string;
  action: string;
}

export class DatabaseActions {
  /**
   * البحث عن عامل بالاسم
   */
  async findWorkerByName(name: string): Promise<ActionResult> {
    try {
      const result = await db
        .select()
        .from(workers)
        .where(like(workers.name, `%${name}%`));

      return {
        success: true,
        data: result,
        message: `تم العثور على ${result.length} عامل`,
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

  /**
   * الحصول على معلومات مشروع
   */
  async getProjectInfo(projectIdOrName: string): Promise<ActionResult> {
    try {
      const result = await db
        .select()
        .from(projects)
        .where(
          sql`${projects.id} = ${projectIdOrName} OR ${projects.name} ILIKE ${'%' + projectIdOrName + '%'}`
        );

      if (result.length === 0) {
        return {
          success: false,
          message: "لم يتم العثور على المشروع",
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

  /**
   * الحصول على ملخص مصروفات مشروع
   */
  async getProjectExpensesSummary(projectId: string): Promise<ActionResult> {
    try {
      // جلب تحويلات العهدة
      const fundsResult = await db
        .select({ total: sql<string>`COALESCE(SUM(${fundTransfers.amount}), 0)` })
        .from(fundTransfers)
        .where(eq(fundTransfers.projectId, projectId));

      // جلب أجور العمال
      const wagesResult = await db
        .select({ total: sql<string>`COALESCE(SUM(${workerAttendance.paidAmount}), 0)` })
        .from(workerAttendance)
        .where(eq(workerAttendance.projectId, projectId));

      // جلب مشتريات المواد
      const materialsResult = await db
        .select({ total: sql<string>`COALESCE(SUM(${materialPurchases.paidAmount}), 0)` })
        .from(materialPurchases)
        .where(eq(materialPurchases.projectId, projectId));

      // جلب مصاريف النقل
      const transportResult = await db
        .select({ total: sql<string>`COALESCE(SUM(${transportationExpenses.amount}), 0)` })
        .from(transportationExpenses)
        .where(eq(transportationExpenses.projectId, projectId));

      // جلب نثريات العمال
      const miscResult = await db
        .select({ total: sql<string>`COALESCE(SUM(${workerMiscExpenses.amount}), 0)` })
        .from(workerMiscExpenses)
        .where(eq(workerMiscExpenses.projectId, projectId));

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
        data: {
          ...summary,
          totalExpenses,
          balance,
        },
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

  /**
   * الحصول على سجل حضور عامل
   */
  async getWorkerAttendance(
    workerId: string,
    projectId?: string,
    fromDate?: string,
    toDate?: string
  ): Promise<ActionResult> {
    try {
      let query = db
        .select()
        .from(workerAttendance)
        .where(eq(workerAttendance.workerId, workerId))
        .orderBy(desc(workerAttendance.attendanceDate));

      const result = await query;

      // تصفية حسب المشروع والتاريخ
      let filtered = result;
      if (projectId) {
        filtered = filtered.filter((r) => r.projectId === projectId);
      }
      if (fromDate) {
        filtered = filtered.filter((r) => r.attendanceDate >= fromDate);
      }
      if (toDate) {
        filtered = filtered.filter((r) => r.attendanceDate <= toDate);
      }

      // حساب الإجماليات
      const totalDays = filtered.reduce((sum, r) => sum + parseFloat(r.workDays || "0"), 0);
      const totalEarned = filtered.reduce((sum, r) => sum + parseFloat(r.totalPay || "0"), 0);
      const totalPaid = filtered.reduce((sum, r) => sum + parseFloat(r.paidAmount || "0"), 0);

      return {
        success: true,
        data: {
          records: filtered,
          summary: {
            totalDays,
            totalEarned,
            totalPaid,
            balance: totalEarned - totalPaid,
          },
        },
        message: `تم العثور على ${filtered.length} سجل حضور`,
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

  /**
   * الحصول على حوالات عامل
   */
  async getWorkerTransfers(workerId: string): Promise<ActionResult> {
    try {
      const result = await db
        .select()
        .from(workerTransfers)
        .where(eq(workerTransfers.workerId, workerId))
        .orderBy(desc(workerTransfers.transferDate));

      const total = result.reduce((sum, r) => sum + parseFloat(r.amount), 0);

      return {
        success: true,
        data: {
          transfers: result,
          totalTransferred: total,
        },
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

  /**
   * الحصول على تصفية حساب عامل كاملة
   */
  async getWorkerStatement(workerId: string): Promise<ActionResult> {
    try {
      // جلب معلومات العامل
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

      // جلب سجل الحضور
      const attendance = await this.getWorkerAttendance(workerId);
      
      // جلب الحوالات
      const transfers = await this.getWorkerTransfers(workerId);

      // حساب الرصيد النهائي
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
          statement: {
            totalEarned,
            totalPaid,
            totalTransferred,
            finalBalance,
          },
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

  /**
   * الحصول على جميع المشاريع
   */
  async getAllProjects(): Promise<ActionResult> {
    try {
      const result = await db.select().from(projects);
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

  /**
   * الحصول على جميع العمال
   */
  async getAllWorkers(): Promise<ActionResult> {
    try {
      const result = await db.select().from(workers);
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

  /**
   * الحصول على مصروفات يوم محدد
   */
  async getDailyExpenses(projectId: string, date: string): Promise<ActionResult> {
    try {
      // جلب أجور العمال
      const wages = await db
        .select()
        .from(workerAttendance)
        .where(and(
          eq(workerAttendance.projectId, projectId),
          eq(workerAttendance.attendanceDate, date)
        ));

      // جلب المشتريات
      const purchases = await db
        .select()
        .from(materialPurchases)
        .where(and(
          eq(materialPurchases.projectId, projectId),
          eq(materialPurchases.purchaseDate, date)
        ));

      // جلب مصاريف النقل
      const transport = await db
        .select()
        .from(transportationExpenses)
        .where(and(
          eq(transportationExpenses.projectId, projectId),
          eq(transportationExpenses.date, date)
        ));

      // جلب النثريات
      const misc = await db
        .select()
        .from(workerMiscExpenses)
        .where(and(
          eq(workerMiscExpenses.projectId, projectId),
          eq(workerMiscExpenses.date, date)
        ));

      return {
        success: true,
        data: {
          date,
          wages,
          purchases,
          transport,
          misc,
        },
        message: "تم جلب مصروفات اليوم",
        action: "get_daily_expenses",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `خطأ: ${error.message}`,
        action: "get_daily_expenses",
      };
    }
  }
}

// Singleton instance
let dbActionsInstance: DatabaseActions | null = null;

export function getDatabaseActions(): DatabaseActions {
  if (!dbActionsInstance) {
    dbActionsInstance = new DatabaseActions();
  }
  return dbActionsInstance;
}
