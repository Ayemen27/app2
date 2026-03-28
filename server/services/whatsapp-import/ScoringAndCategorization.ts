import { normalizeArabicText } from './ArabicAmountParser.js';
import { isAIAvailable } from './AIExtractionOrchestrator.js';

export interface ConfidenceBreakdown {
  baseScore: number;
  patternType: string;
  penalties: Record<string, number>;
  bonuses: Record<string, number>;
  finalScore: number;
  aiReason?: string;
}

const BASE_SCORES: Record<string, number> = {
  'structured_receipt': 0.95,
  'inline_expense': 0.80,
  'multiline_list': 0.75,
  'image_context': 0.85,
  'loan': 0.60,
  'personal_account': 0.65,
  'custodian_receipt': 0.85,
  'settlement': 0.80,
  'generic_transfer': 0.70,
};

function getBaseScore(patternType: string): number {
  if (patternType.startsWith('ai_')) {
    return 0.90;
  }
  if (BASE_SCORES[patternType] !== undefined) {
    return BASE_SCORES[patternType];
  }
  if (patternType.length > 0) {
    return 0.95;
  }
  return 0.50;
}

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
  const baseScore = getBaseScore(patternType);
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

  if (context.hasExplicitAmountWithCurrency) {
    bonuses['explicit_amount_with_currency'] = 0.03;
  }

  if (patternType.startsWith('ai_')) {
    bonuses['ai_verified'] = 0.05;
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
  { keywords: ['عدة', 'أدوات', 'ادوات', 'مسامير', 'براغي'], category: 'tools', subcategory: 'materials' },
  { keywords: ['خوذة', 'قفازات', 'سلامة', 'امان'], category: 'safety', subcategory: 'materials' },
  { keywords: ['مضخة', 'بمب', 'بامب'], category: 'concrete_pump', subcategory: 'equipment' },
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

export async function computeConfidenceWithAI(
  originalText: string,
  patternType: string,
  context: ScoringContext
): Promise<ConfidenceBreakdown> {
  const base = computeConfidence(patternType, context);

  if (!isAIAvailable()) {
    return base;
  }

  try {
    const { analyzeFinancialWithAI } = await import('./AIExtractionOrchestrator.js');
    const results = await analyzeFinancialWithAI([{
      index: 0,
      sender: '',
      text: originalText,
    }]);

    if (results.length > 0 && results[0].confidence > 0) {
      const aiConfidence = results[0].confidence;
      const aiEvidence = results[0].evidence || results[0].description || '';

      if (aiConfidence >= 0.7) {
        base.bonuses['ai_confidence_boost'] = 0.05;
      }

      base.aiReason = aiEvidence;

      const penaltySum = Object.values(base.penalties).reduce((s, v) => s + v, 0);
      const bonusSum = Object.values(base.bonuses).reduce((s, v) => s + v, 0);
      const finalScore = Math.max(0, Math.min(1, base.baseScore + bonusSum + penaltySum));
      base.finalScore = Math.round(finalScore * 10000) / 10000;
    }
  } catch (err: any) {
    console.warn('[ScoringAndCategorization] AI confidence evaluation failed:', err.message);
  }

  return base;
}
