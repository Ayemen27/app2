import { db } from '../db';
import { eq, and, inArray } from 'drizzle-orm';
import { wellExpenses, wells } from '../../shared/schema';

type ReferenceType = 'transportation' | 'worker_misc_expense' | 'material_purchase';
type ExpenseType = 'transport' | 'operational_material' | 'consumable_material';

interface AllocationInput {
  referenceType: ReferenceType;
  referenceId: string;
  wellIdsJson: string | null | undefined;
  totalAmount: string | number;
  description: string;
  category: string;
  expenseDate: string;
  userId: string;
  projectId?: string;
}

const REFERENCE_TO_EXPENSE_TYPE: Record<ReferenceType, ExpenseType> = {
  transportation: 'transport',
  worker_misc_expense: 'operational_material',
  material_purchase: 'consumable_material',
};

function parseWellIds(wellIdsJson: string | null | undefined): number[] {
  if (!wellIdsJson) return [];
  try {
    const parsed = JSON.parse(wellIdsJson);
    if (Array.isArray(parsed)) {
      const ids = parsed.map(Number).filter(id => !isNaN(id) && id > 0);
      return [...new Set(ids)];
    }
    return [];
  } catch {
    return [];
  }
}

function distributeAmount(total: number, count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [Math.round(total * 100) / 100];

  const base = Math.floor((total * 100) / count) / 100;
  const amounts = Array(count).fill(base);
  const remainder = Math.round((total - base * count) * 100) / 100;
  const centsRemaining = Math.round(remainder * 100);

  for (let i = 0; i < centsRemaining; i++) {
    amounts[i] = Math.round((amounts[i] + 0.01) * 100) / 100;
  }

  return amounts;
}

export class WellExpenseAutoAllocationService {
  static async allocateOnCreate(input: AllocationInput): Promise<void> {
    try {
      const requestedWellIds = parseWellIds(input.wellIdsJson);
      if (requestedWellIds.length === 0) return;

      const total = parseFloat(String(input.totalAmount)) || 0;
      if (total <= 0) return;

      const validWells = await db.select({ id: wells.id })
        .from(wells)
        .where(
          input.projectId
            ? and(eq(wells.project_id, input.projectId), inArray(wells.id, requestedWellIds))
            : inArray(wells.id, requestedWellIds)
        );
      const validWellIds = validWells.map((w: any) => w.id);

      if (validWellIds.length === 0) return;

      const expenseType = REFERENCE_TO_EXPENSE_TYPE[input.referenceType];
      const amounts = distributeAmount(total, validWellIds.length);

      const values = validWellIds.map((wellId: any, idx: any) => ({
        well_id: wellId,
        expenseType,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        description: input.description,
        category: input.category,
        quantity: '1',
        unit: 'حصة',
        unitPrice: String(amounts[idx]),
        totalAmount: String(amounts[idx]),
        expenseDate: new Date(input.expenseDate),
        createdBy: input.userId,
        notes: `توزيع تلقائي - ${validWellIds.length} آبار`,
      }));

      await db.insert(wellExpenses).values(values);
      console.log(`✅ [WellAutoAlloc] تم توزيع ${total} على ${validWellIds.length} بئر (${input.referenceType}/${input.referenceId})`);
    } catch (error) {
      console.error(`❌ [WellAutoAlloc] خطأ في التوزيع (${input.referenceType}/${input.referenceId}):`, error);
    }
  }

  static async removeByReference(referenceType: ReferenceType, referenceId: string): Promise<number> {
    try {
      const deleted = await db.delete(wellExpenses)
        .where(
          and(
            eq(wellExpenses.referenceType, referenceType),
            eq(wellExpenses.referenceId, referenceId)
          )
        )
        .returning({ id: wellExpenses.id });

      if (deleted.length > 0) {
        console.log(`🗑️ [WellAutoAlloc] تم حذف ${deleted.length} قيد مرتبط (${referenceType}/${referenceId})`);
      }
      return deleted.length;
    } catch (error) {
      console.error(`❌ [WellAutoAlloc] خطأ في الحذف (${referenceType}/${referenceId}):`, error);
      return 0;
    }
  }

  static async reallocateOnUpdate(input: AllocationInput): Promise<void> {
    try {
      const requestedWellIds = parseWellIds(input.wellIdsJson);
      const total = parseFloat(String(input.totalAmount)) || 0;

      if (requestedWellIds.length === 0 || total <= 0) {
        await this.removeByReference(input.referenceType, input.referenceId);
        return;
      }

      const validWells = await db.select({ id: wells.id })
        .from(wells)
        .where(
          input.projectId
            ? and(eq(wells.project_id, input.projectId), inArray(wells.id, requestedWellIds))
            : inArray(wells.id, requestedWellIds)
        );
      const validWellIds = validWells.map((w: any) => w.id);

      if (validWellIds.length === 0) {
        await this.removeByReference(input.referenceType, input.referenceId);
        return;
      }

      const expenseType = REFERENCE_TO_EXPENSE_TYPE[input.referenceType];
      const amounts = distributeAmount(total, validWellIds.length);

      const values = validWellIds.map((wellId: any, idx: any) => ({
        well_id: wellId,
        expenseType,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        description: input.description,
        category: input.category,
        quantity: '1',
        unit: 'حصة',
        unitPrice: String(amounts[idx]),
        totalAmount: String(amounts[idx]),
        expenseDate: new Date(input.expenseDate),
        createdBy: input.userId,
        notes: `توزيع تلقائي - ${validWellIds.length} آبار`,
      }));

      await db.transaction(async (tx: any) => {
        await tx.delete(wellExpenses)
          .where(
            and(
              eq(wellExpenses.referenceType, input.referenceType),
              eq(wellExpenses.referenceId, input.referenceId)
            )
          );
        await tx.insert(wellExpenses).values(values);
      });

      console.log(`✅ [WellAutoAlloc] تم إعادة توزيع ${total} على ${validWellIds.length} بئر (${input.referenceType}/${input.referenceId})`);
    } catch (error) {
      console.error(`❌ [WellAutoAlloc] خطأ في إعادة التوزيع (${input.referenceType}/${input.referenceId}):`, error);
    }
  }

  static async removeOnDelete(referenceType: ReferenceType, referenceId: string): Promise<void> {
    await this.removeByReference(referenceType, referenceId);
  }
}

export default WellExpenseAutoAllocationService;
