
/**
 * دالة موحدة لحساب المصروفات الإجمالية
 * Unified Financial Calculator
 * 
 * @description يضمن حساب متسق للمصروفات عبر جميع الصفحات
 * @owner عمار
 * @date 2025-12-09
 */

export interface ProjectExpensesInput {
  // المصروفات الأساسية
  workerWages?: number;           // أجور العمال المدفوعة
  materialCosts?: number;         // تكاليف المواد
  transportExpenses?: number;     // مصاريف النقل
  workerTransfers?: number;       // حوالات العمال
  miscExpenses?: number;          // المصاريف المتنوعة
  
  // التحويلات بين المشاريع
  outgoingProjectTransfers?: number;  // التحويلات الصادرة
  incomingProjectTransfers?: number;  // التحويلات الواردة (للدخل)
}

export interface ProjectFinancialsResult {
  totalIncome: number;
  totalExpenses: number;
  currentBalance: number;
  breakdown: {
    workerWages: number;
    materialCosts: number;
    transportExpenses: number;
    workerTransfers: number;
    miscExpenses: number;
    outgoingProjectTransfers: number;
  };
}

/**
 * حساب موحد للمصروفات الإجمالية
 */
export function calculateProjectExpenses(input: ProjectExpensesInput): number {
  const workerWages = Number(input.workerWages || 0);
  const materialCosts = Number(input.materialCosts || 0);
  const transportExpenses = Number(input.transportExpenses || 0);
  const workerTransfers = Number(input.workerTransfers || 0);
  const miscExpenses = Number(input.miscExpenses || 0);
  const outgoingProjectTransfers = Number(input.outgoingProjectTransfers || 0);

  // المجموع الكلي للمصروفات
  const totalExpenses = 
    workerWages + 
    materialCosts + 
    transportExpenses + 
    workerTransfers + 
    miscExpenses + 
    outgoingProjectTransfers;

  return totalExpenses;
}

/**
 * حساب شامل للوضع المالي للمشروع
 */
export function calculateProjectFinancials(
  fundTransfersIncome: number,
  expensesInput: ProjectExpensesInput
): ProjectFinancialsResult {
  const incomingProjectTransfers = Number(expensesInput.incomingProjectTransfers || 0);
  
  // إجمالي الدخل = تحويلات العهدة + التحويلات الواردة من مشاريع أخرى
  const totalIncome = Number(fundTransfersIncome || 0) + incomingProjectTransfers;

  // حساب المصروفات الفرعية
  const breakdown = {
    workerWages: Number(expensesInput.workerWages || 0),
    materialCosts: Number(expensesInput.materialCosts || 0),
    transportExpenses: Number(expensesInput.transportExpenses || 0),
    workerTransfers: Number(expensesInput.workerTransfers || 0),
    miscExpenses: Number(expensesInput.miscExpenses || 0),
    outgoingProjectTransfers: Number(expensesInput.outgoingProjectTransfers || 0),
  };

  // حساب إجمالي المصروفات
  const totalExpenses = calculateProjectExpenses(expensesInput);

  // حساب الرصيد الحالي
  const currentBalance = totalIncome - totalExpenses;

  return {
    totalIncome,
    totalExpenses,
    currentBalance,
    breakdown,
  };
}

/**
 * تنسيق العملة بشكل موحد
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || '0'));
  
  if (isNaN(num) || !isFinite(num)) return '0 ر.ي';
  
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num) + ' ر.ي';
}
