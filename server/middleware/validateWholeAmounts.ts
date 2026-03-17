import { Request, Response, NextFunction } from 'express';

const FINANCIAL_FIELDS = [
  'amount',
  'totalAmount',
  'total_amount',
  'unitPrice',
  'unit_price',
  'paidAmount',
  'paid_amount',
  'actualWage',
  'actual_wage',
  'dailyWage',
  'daily_wage',
  'purchasePrice',
  'purchase_price',
  'remainingAmount',
  'remaining_amount',
  'price',
  'cost',
  'total_cost',
  'totalCost',
  'salary',
  'wage',
  'payment',
  'total_pay',
  'totalPay',
];

const FIELD_LABELS: Record<string, string> = {
  amount: 'المبلغ',
  totalAmount: 'المبلغ الإجمالي',
  total_amount: 'المبلغ الإجمالي',
  unitPrice: 'سعر الوحدة',
  unit_price: 'سعر الوحدة',
  paidAmount: 'المبلغ المدفوع',
  paid_amount: 'المبلغ المدفوع',
  actualWage: 'الأجر الفعلي',
  actual_wage: 'الأجر الفعلي',
  dailyWage: 'الأجر اليومي',
  daily_wage: 'الأجر اليومي',
  purchasePrice: 'سعر الشراء',
  purchase_price: 'سعر الشراء',
  remainingAmount: 'المبلغ المتبقي',
  remaining_amount: 'المبلغ المتبقي',
  price: 'السعر',
  cost: 'التكلفة',
  total_cost: 'التكلفة الإجمالية',
  totalCost: 'التكلفة الإجمالية',
  salary: 'الراتب',
  wage: 'الأجر',
  payment: 'الدفعة',
  total_pay: 'إجمالي الأجر',
  totalPay: 'إجمالي الأجر',
};

function hasDecimals(value: any): boolean {
  if (value === null || value === undefined || value === '') return false;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof num !== 'number' || isNaN(num)) return false;
  return num % 1 !== 0;
}

export function validateWholeAmounts(extraFields?: string[]) {
  const fieldsToCheck = [...FINANCIAL_FIELDS, ...(extraFields || [])];

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.body || typeof req.body !== 'object') {
      return next();
    }

    const invalidFields: string[] = [];

    for (const field of fieldsToCheck) {
      if (req.body[field] !== undefined && hasDecimals(req.body[field])) {
        const label = FIELD_LABELS[field] || field;
        invalidFields.push(`${label} (${req.body[field]})`);
      }
    }

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `لا يمكن حفظ مبالغ مالية تحتوي على كسور عشرية. يرجى إدخال أرقام صحيحة بدون فواصل عشرية.`,
        details: `الحقول التالية تحتوي على كسور: ${invalidFields.join('، ')}`,
        invalidFields: invalidFields,
      });
    }

    next();
  };
}

export function roundFinancialAmount(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof num !== 'number' || isNaN(num)) return 0;
  return Math.round(num);
}
