import { normalizeArabicText, normalizeArabicTextPreserveLines, easternToWestern, extractAllAmounts, type ParsedAmount } from './ArabicAmountParser.js';

export type SpecialType = 'loan' | 'personal_account' | 'custodian_receipt' | 'settlement';

export interface SpecialTransactionResult {
  candidateType: SpecialType;
  amount: number;
  description: string;
  reviewFlags: string[];
  raw: string;
  settlementItems?: SettlementItem[];
  custodianName?: string;
}

export interface SettlementItem {
  description: string;
  amount: number;
  date: string | null;
  recipient: string | null;
}

const LOAN_KEYWORDS = ['استلاف', 'سلف', 'سلفة', 'قرض', 'استدان', 'يستلف', 'سلفه', 'اقرضه', 'مديون'];
const PERSONAL_ACCOUNT_KEYWORDS = ['حساب عمار', 'حسابي', 'على حسابي', 'حسابه الشخصي'];

const CUSTODIAN_NAMES: Record<string, string> = {
  'عمار الشيعي': 'عمار الشيعي',
  'عمار': 'عمار الشيعي',
  'الشيعي': 'عمار الشيعي',
  'عدنان': 'عدنان/ابو فارس',
  'ابو فارس': 'عدنان/ابو فارس',
  'أبو فارس': 'عدنان/ابو فارس',
  'العباسي': 'العباسي',
  'عباسي': 'العباسي',
};

const SETTLEMENT_KEYWORDS = ['تصفية', 'تصفيه', 'كشف حساب', 'المصاريف', 'مصروفات'];

export function detectLoan(messageText: string): SpecialTransactionResult | null {
  const text = normalizeArabicText(messageText);

  const hasLoanKeyword = LOAN_KEYWORDS.some(k => text.includes(k));
  if (!hasLoanKeyword) return null;

  const amounts = extractAllAmounts(text);
  if (amounts.length === 0) return null;

  return {
    candidateType: 'loan',
    amount: amounts[0].value,
    description: text.slice(0, 200),
    reviewFlags: ['mandatory_review', 'inter_contractor_loan'],
    raw: text,
  };
}

export function detectPersonalAccount(messageText: string): SpecialTransactionResult | null {
  const text = normalizeArabicText(messageText);

  const hasPersonalKeyword = PERSONAL_ACCOUNT_KEYWORDS.some(k => text.includes(k));
  if (!hasPersonalKeyword) return null;

  const amounts = extractAllAmounts(text);
  if (amounts.length === 0) return null;

  return {
    candidateType: 'personal_account',
    amount: amounts[0].value,
    description: text.slice(0, 200),
    reviewFlags: ['personal_account_flag'],
    raw: text,
  };
}

export function detectCustodianReceipt(messageText: string): SpecialTransactionResult | null {
  const text = normalizeArabicText(messageText);

  let custodianName: string | null = null;
  for (const [key, canonical] of Object.entries(CUSTODIAN_NAMES)) {
    if (text.includes(key)) {
      custodianName = canonical;
      break;
    }
  }

  if (!custodianName) return null;

  const amounts = extractAllAmounts(text);
  if (amounts.length === 0) return null;

  const isSendPattern = /(?:ارسل|حول|بعث|وصل|استلم)\s/.test(text) ||
    /(?:حوالة|تحويل)\s/.test(text);

  if (!isSendPattern && !SETTLEMENT_KEYWORDS.some(k => text.includes(k))) {
    return null;
  }

  return {
    candidateType: 'custodian_receipt',
    amount: amounts[0].value,
    description: `استلام أمانة - ${custodianName}`,
    reviewFlags: ['custodian_fund_receipt'],
    raw: text,
    custodianName,
  };
}

export function detectSettlement(messageText: string): SpecialTransactionResult | null {
  const text = normalizeArabicTextPreserveLines(messageText);

  const hasSettlementKeyword = SETTLEMENT_KEYWORDS.some(k => text.includes(k));
  if (!hasSettlementKeyword) return null;

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 3) return null;

  const items: SettlementItem[] = [];
  let totalAmount = 0;

  for (const line of lines) {
    const normalized = easternToWestern(line);
    const amounts = extractAllAmounts(normalized);
    if (amounts.length > 0) {
      const arabicDesc = normalized.replace(/\d[\d,.]*\s*/g, '').trim();
      items.push({
        description: arabicDesc || normalized,
        amount: amounts[0].value,
        date: null,
        recipient: null,
      });
      totalAmount += amounts[0].value;
    }
  }

  if (items.length < 2) return null;

  let custodianName: string | null = null;
  for (const [key, canonical] of Object.entries(CUSTODIAN_NAMES)) {
    if (text.includes(key)) {
      custodianName = canonical;
      break;
    }
  }

  return {
    candidateType: 'settlement',
    amount: totalAmount,
    description: `تصفية حساب${custodianName ? ' - ' + custodianName : ''} (${items.length} بند)`,
    reviewFlags: ['settlement_reconciliation', 'mandatory_review'],
    raw: text,
    settlementItems: items,
    custodianName: custodianName || undefined,
  };
}

export function detectSpecialTransaction(messageText: string): SpecialTransactionResult | null {
  return detectSettlement(messageText)
    || detectLoan(messageText)
    || detectPersonalAccount(messageText)
    || detectCustodianReceipt(messageText);
}
