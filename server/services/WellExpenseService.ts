/**
 * خدمة مصاريف الآبار (Well Expenses Service)
 * خدمة ربط المصاريف بالآبار وحساب التكاليف الشاملة
 */

import { db } from '../db';
import { eq, and, sql, desc, gte, lte } from 'drizzle-orm';
import {
  wellExpenses, wells, workerAttendance, materialPurchases,
  transportationExpenses, workers, materials,
  type WellExpense
} from '../../shared/schema';
import WellService from './WellService';

export interface WellExpenseDTO {
  well_id: number;
  expenseType: 'labor' | 'operational_material' | 'consumable_material' | 'transport' | 'service';
  description: string;
  category: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  totalAmount: number;
  expenseDate: string;
  notes?: string;
}

export interface ExpenseFilters {
  well_id?: number;
  expenseType?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

export class WellExpenseService {
  /**
   * إضافة مصروف مباشر للبئر
   */
  static async addExpense(data: WellExpenseDTO, user_id: string) {
    try {
      const well = await db.select()
        .from(wells)
        .where(eq(wells.id, data.well_id))
        .limit(1);

      if (!well.length) {
        throw new Error('البئر غير موجود');
      }

      const totalAmount = String(data.totalAmount);
      const quantity = data.quantity ? String(data.quantity) : '1';
      const unit = data.unit || 'وحدة';
      const unitPrice = data.unitPrice ? String(data.unitPrice) : totalAmount;

      const newExpense = await db.insert(wellExpenses).values({
        well_id: data.well_id,
        expenseType: data.expenseType,
        referenceType: null,
        referenceId: null,
        description: data.description,
        category: data.category,
        quantity,
        unit,
        unitPrice,
        totalAmount,
        expenseDate: new Date(data.expenseDate),
        createdBy: user_id,
        notes: data.notes || null
      }).returning();

      return newExpense[0];
    } catch (error) {
      console.error('خطأ في إضافة المصروف:', error);
      throw error;
    }
  }

  /**
   * ربط مصروف موجود من جدول آخر ببئر
   */
  static async linkExistingExpense(
    well_id: number,
    referenceType: 'worker_attendance' | 'material_purchase' | 'transportation',
    referenceId: number | string,
    userId: string
  ) {
    try {
      const well = await db.select()
        .from(wells)
        .where(eq(wells.id, well_id))
        .limit(1);

      if (!well.length) {
        throw new Error('البئر غير موجود');
      }

      const refIdStr = String(referenceId);

      let expenseData: any = null;
      let expenseType: string = '';

      if (referenceType === 'worker_attendance') {
        const attendance = await db.select()
          .from(workerAttendance)
          .where(eq(workerAttendance.id, refIdStr))
          .limit(1);

        if (!attendance.length) throw new Error('سجل الحضور غير موجود');

        if (attendance[0].project_id !== well[0].project_id) {
          throw new Error('لا يمكن ربط سجل حضور من مشروع مختلف عن مشروع البئر');
        }
        
        expenseData = attendance[0];
        expenseType = 'labor';

        const totalAmount = expenseData.totalPay ? String(expenseData.totalPay) : '0';
        const quantity = String(expenseData.workDays || 1);
        const unitPrice = expenseData.dailyWage ? String(expenseData.dailyWage) : totalAmount;

        const linkedExpense = await db.insert(wellExpenses).values({
          well_id,
          expenseType,
          referenceType: 'worker_attendance',
          referenceId: refIdStr,
          description: `أجور عامل - ${expenseData.workDescription || 'عمل'}`,
          category: 'أجور عمالة',
          quantity,
          unit: 'يوم',
          unitPrice,
          totalAmount,
          expenseDate: new Date(expenseData.attendanceDate),
          createdBy: userId,
          notes: `مرتبط بسجل حضور ${refIdStr}`
        }).returning();

        return linkedExpense[0];
      } else if (referenceType === 'material_purchase') {
        const purchase = await db.select()
          .from(materialPurchases)
          .where(eq(materialPurchases.id, refIdStr))
          .limit(1);

        if (!purchase.length) throw new Error('فاتورة المادة غير موجودة');

        if (purchase[0].project_id !== well[0].project_id) {
          throw new Error('لا يمكن ربط فاتورة مادة من مشروع مختلف عن مشروع البئر');
        }

        expenseData = purchase[0];
        
        const materialType = expenseData.materialCategory?.toLowerCase().includes('أسمنت') || 
                             expenseData.materialCategory?.toLowerCase().includes('حديد')
          ? 'consumable_material'
          : 'operational_material';
        expenseType = materialType;

        const totalAmount = expenseData.totalAmount ? String(expenseData.totalAmount) : '0';
        const quantity = expenseData.quantity ? String(expenseData.quantity) : '1';
        const unit = expenseData.unit || 'وحدة';
        const unitPrice = expenseData.unitPrice ? String(expenseData.unitPrice) : totalAmount;

        const linkedExpense = await db.insert(wellExpenses).values({
          well_id,
          expenseType,
          referenceType: 'material_purchase',
          referenceId: refIdStr,
          description: `مادة - ${expenseData.materialName}`,
          category: expenseData.materialCategory || 'مواد',
          quantity,
          unit,
          unitPrice,
          totalAmount,
          expenseDate: new Date(expenseData.purchaseDate),
          createdBy: userId,
          notes: `مرتبط بفاتورة ${refIdStr}`
        }).returning();

        return linkedExpense[0];
      } else if (referenceType === 'transportation') {
        const transport = await db.select()
          .from(transportationExpenses)
          .where(eq(transportationExpenses.id, refIdStr))
          .limit(1);

        if (!transport.length) throw new Error('مصروف النقل غير موجود');

        if (transport[0].project_id !== well[0].project_id) {
          throw new Error('لا يمكن ربط مصروف نقل من مشروع مختلف عن مشروع البئر');
        }

        expenseData = transport[0];
        expenseType = 'transport';

        const totalAmount = expenseData.amount ? String(expenseData.amount) : '0';

        const linkedExpense = await db.insert(wellExpenses).values({
          well_id,
          expenseType,
          referenceType: 'transportation',
          referenceId: refIdStr,
          description: `نقل - ${expenseData.description || 'مصروف نقل'}`,
          category: 'نقل ومواصلات',
          quantity: '1',
          unit: 'رحلة',
          unitPrice: totalAmount,
          totalAmount,
          expenseDate: new Date(expenseData.date),
          createdBy: userId,
          notes: `مرتبط بمصروف نقل ${refIdStr}`
        }).returning();

        return linkedExpense[0];
      }

      throw new Error('نوع مرجع غير معروف');
    } catch (error) {
      console.error('خطأ في ربط المصروف:', error);
      throw error;
    }
  }

  /**
   * إلغاء ربط مصروف
   */
  static async unlinkExpense(expenseId: number) {
    try {
      await db.delete(wellExpenses).where(eq(wellExpenses.id, expenseId));
    } catch (error) {
      console.error('خطأ في إلغاء الربط:', error);
      throw error;
    }
  }

  /**
   * جلب مصاريف البئر
   */
  static async getWellExpenses(well_id: number, filters?: ExpenseFilters) {
    try {
      const conditions = [eq(wellExpenses.well_id, well_id)];

      if (filters?.expenseType) {
        conditions.push(eq(wellExpenses.expenseType, filters.expenseType));
      }

      if (filters?.startDate) {
        conditions.push(gte(wellExpenses.expenseDate, filters.startDate));
      }

      if (filters?.endDate) {
        conditions.push(lte(wellExpenses.expenseDate, filters.endDate));
      }

      const expenses = await db.select()
        .from(wellExpenses)
        .where(and(...conditions))
        .orderBy(desc(wellExpenses.expenseDate));
      return expenses;
    } catch (error) {
      console.error('خطأ في جلب المصاريف:', error);
      throw error;
    }
  }

  /**
   * حساب تقرير تكلفة البئر الشامل
   */
  static async getWellCostReport(well_id: number) {
    try {
      const expenses = await this.getWellExpenses(well_id);

      const report = {
        well_id,
        summary: {
          totalCost: 0,
          laborCost: 0,
          operationalMaterialCost: 0,
          consumableMaterialCost: 0,
          transportCost: 0,
          serviceCost: 0
        },
        details: {
          labor: [] as WellExpense[],
          operationalMaterial: [] as WellExpense[],
          consumableMaterial: [] as WellExpense[],
          transport: [] as WellExpense[],
          service: [] as WellExpense[]
        },
        breakdown: {} as Record<string, { amount: number; percentage: number }>
      };

      expenses.forEach((expense: any) => {
        const amount = parseFloat(expense.totalAmount as string) || 0;
        
        switch (expense.expenseType) {
          case 'labor':
            report.summary.laborCost += amount;
            report.details.labor.push(expense);
            break;
          case 'operational_material':
            report.summary.operationalMaterialCost += amount;
            report.details.operationalMaterial.push(expense);
            break;
          case 'consumable_material':
            report.summary.consumableMaterialCost += amount;
            report.details.consumableMaterial.push(expense);
            break;
          case 'transport':
            report.summary.transportCost += amount;
            report.details.transport.push(expense);
            break;
          case 'service':
            report.summary.serviceCost += amount;
            report.details.service.push(expense);
            break;
        }
        
        report.summary.totalCost += amount;
      });

      const crewsCost = await WellService.getWellCrewsCost(well_id);
      const wellTransportCost = await WellService.getWellTransportCost(well_id);

      const hasAutoAllocatedTransport = expenses.some((e: any) => 
        e.expenseType === 'transport' && e.referenceType === 'transportation'
      );

      (report.summary as any).crewsCost = crewsCost;
      (report.summary as any).wellTransportCost = wellTransportCost;
      report.summary.laborCost += crewsCost;
      if (!hasAutoAllocatedTransport) {
        report.summary.transportCost += wellTransportCost;
        report.summary.totalCost += crewsCost + wellTransportCost;
      } else {
        report.summary.totalCost += crewsCost;
      }

      if (report.summary.totalCost > 0) {
        report.breakdown = {
          labor: {
            amount: report.summary.laborCost,
            percentage: Math.round((report.summary.laborCost / report.summary.totalCost) * 100)
          },
          operationalMaterial: {
            amount: report.summary.operationalMaterialCost,
            percentage: Math.round((report.summary.operationalMaterialCost / report.summary.totalCost) * 100)
          },
          consumableMaterial: {
            amount: report.summary.consumableMaterialCost,
            percentage: Math.round((report.summary.consumableMaterialCost / report.summary.totalCost) * 100)
          },
          transport: {
            amount: report.summary.transportCost,
            percentage: Math.round((report.summary.transportCost / report.summary.totalCost) * 100)
          },
          service: {
            amount: report.summary.serviceCost,
            percentage: Math.round((report.summary.serviceCost / report.summary.totalCost) * 100)
          }
        };
      }

      return report;
    } catch (error) {
      console.error('خطأ في حساب التقرير:', error);
      throw error;
    }
  }

  /**
   * ملخص تكاليف المشروع
   */
  static async getProjectCostSummary(project_id: string) {
    try {
      const projectWells = await db.select()
        .from(wells)
        .where(eq(wells.project_id, project_id));

      const summary = {
        project_id,
        totalWells: projectWells.length,
        totalProjectCost: 0,
        costPerWell: {} as Record<number, { totalCost: number; laborCost: number; operationalMaterialCost: number; consumableMaterialCost: number; transportCost: number; serviceCost: number }>,
        averageCostPerWell: 0
      };

      for (const well of projectWells) {
        const report = await this.getWellCostReport(well.id);
        summary.costPerWell[well.id] = report.summary;
        summary.totalProjectCost += report.summary.totalCost;
      }

      if (projectWells.length > 0) {
        summary.averageCostPerWell = Math.round(summary.totalProjectCost / projectWells.length);
      }

      return summary;
    } catch (error) {
      console.error('خطأ في حساب ملخص المشروع:', error);
      throw error;
    }
  }
}

export default WellExpenseService;
