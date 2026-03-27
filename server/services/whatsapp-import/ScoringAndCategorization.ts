import { normalizeArabicText } from './ArabicAmountParser.js';

export interface ConfidenceBreakdown {
  baseScore: number;
  patternType: string;
  penalties: Record<string, number>;
  bonuses: Record<string, number>;
  finalScore: number;
}

const BASE_SCORES: Record<string, number> = {
  'structured_receipt': 0.95,
  'rashad_bahir': 0.95,
  'houshabi': 0.95,
  'najm': 0.95,
  'inline_expense': 0.80,
  'multiline_list': 0.75,
  'image_context': 0.85,
  'loan': 0.60,
  'personal_account': 0.65,
  'custodian_receipt': 0.85,
  'settlement': 0.80,
};

export interface ScoringContext {
  hasDate: boolean;
  hasProjectMention: boolean;
  hasSupportingImage: boolean;
  hasTransferNumber: boolean;
  hasExplicitAmountWithCurrency: boolean;
  amountBelow1000: boolean;
  ambiguousWorkerName: boolean;
}

export function computeConfidence(
  patternType: string,
  context: ScoringContext
): ConfidenceBreakdown {
  const baseScore = BASE_SCORES[patternType] ?? 0.50;
  const penalties: Record<string, number> = {};
  const bonuses: Record<string, number> = {};

  if (!context.hasDate) {
    penalties['missing_date'] = -0.10;
  }

  if (!context.hasProjectMention) {
    penalties['ambiguous_project'] = -0.10;
  }

  if (context.amountBelow1000) {
    penalties['amount_below_1000'] = -0.05;
  }

  if (!context.hasSupportingImage) {
    penalties['no_supporting_image'] = -0.05;
  }

  if (context.ambiguousWorkerName) {
    penalties['ambiguous_worker_name'] = -0.05;
  }

  if (context.hasTransferNumber) {
    bonuses['has_transfer_number'] = 0.05;
  }

  if (context.hasSupportingImage) {
    bonuses['has_supporting_image'] = 0.05;
  }

  if (context.hasProjectMention) {
    bonuses['explicit_project_mention'] = 0.05;
  }

  if (context.hasExplicitAmountWithCurrency) {
    bonuses['explicit_amount_with_currency'] = 0.03;
  }

  const penaltySum = Object.values(penalties).reduce((s, v) => s + v, 0);
  const bonusSum = Object.values(bonuses).reduce((s, v) => s + v, 0);
  const finalScore = Math.max(0, Math.min(1, baseScore + bonusSum + penaltySum));

  return {
    baseScore,
    patternType,
    penalties,
    bonuses,
    finalScore: Math.round(finalScore * 10000) / 10000,
  };
}

const CATEGORY_MAP: Array<{ keywords: string[]; category: string; subcategory: string }> = [
  { keywords: ['بترول', 'ديزل', 'وقود', 'بنزين'], category: 'fuel', subcategory: 'transportation' },
  { keywords: ['سمنت', 'اسمنت', 'سمنتو'], category: 'cement', subcategory: 'materials' },
  { keywords: ['خرسان', 'خرسانة', 'خرسانه'], category: 'concrete', subcategory: 'materials' },
  { keywords: ['حديد'], category: 'steel', subcategory: 'materials' },
  { keywords: ['صبوح', 'غداء', 'عشاء', 'سحور', 'فطور', 'اكل', 'وجبة', 'وجبات'], category: 'meals', subcategory: 'daily_expenses' },
  { keywords: ['نجار', 'نجارين', 'نجاره'], category: 'carpentry', subcategory: 'labor' },
  { keywords: ['حداد', 'ملحم', 'لحام', 'لحيم'], category: 'welding', subcategory: 'labor' },
  { keywords: ['مواصلت', 'مواصلات', 'نقل', 'سيارة', 'سياره', 'نقليات'], category: 'transport', subcategory: 'transportation' },
  { keywords: ['كهرباء', 'كهربا'], category: 'electricity', subcategory: 'utilities' },
  { keywords: ['جراوت', 'مبسط', 'بلوك', 'طوب', 'رمل'], category: 'construction_materials', subcategory: 'materials' },
  { keywords: ['ماء', 'مياه', 'تنكر'], category: 'water', subcategory: 'utilities' },
  { keywords: ['عامل', 'عمال', 'يومية', 'يوميات'], category: 'labor', subcategory: 'labor' },
  { keywords: ['ايجار', 'إيجار', 'كراء'], category: 'rent', subcategory: 'overhead' },
  { keywords: ['صيانة', 'تصليح', 'اصلاح'], category: 'maintenance', subcategory: 'overhead' },
];

export interface CategoryResult {
  category: string;
  subcategory: string;
  targetTable: string;
}

export function categorizeExpense(description: string): CategoryResult {
  const text = normalizeArabicText(description);

  for (const mapping of CATEGORY_MAP) {
    if (mapping.keywords.some(k => text.includes(k))) {
      let targetTable = 'daily_expense_summaries';
      if (mapping.subcategory === 'materials') {
        targetTable = 'material_purchases';
      } else if (mapping.subcategory === 'labor') {
        targetTable = 'worker_expenses';
      }

      return {
        category: mapping.category,
        subcategory: mapping.subcategory,
        targetTable,
      };
    }
  }

  return {
    category: 'miscellaneous',
    subcategory: 'other',
    targetTable: 'daily_expense_summaries',
  };
}

export function categorizeTransferReceipt(): CategoryResult {
  return {
    category: 'fund_transfer',
    subcategory: 'transfer',
    targetTable: 'fund_transfers',
  };
}
