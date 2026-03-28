import { normalizeArabicText, normalizeArabicTextPreserveLines, easternToWestern, extractAllAmounts, type ParsedAmount } from './ArabicAmountParser.js';
import { db } from '../../db.js';
import { workers } from '@shared/schema';
import { eq } from 'drizzle-orm';

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
const PERSONAL_ACCOUNT_KEYWORDS = ['حسابي', 'على حسابي', 'حسابه الشخصي', 'حساب شخصي'];

let _cachedCustodianNames: Record<string, string> | null = null;
let _custodianCacheTime = 0;
const CUSTODIAN_CACHE_TTL = 5 * 60 * 1000;

export async function loadCustodianNames(): Promise<Record<string, string>> {
  const now = Date.now();
  if (_cachedCustodianNames && (now - _custodianCacheTime) < CUSTODIAN_CACHE_TTL) {
    return _cachedCustodianNames;
  }

  try {
    const allWorkers = await db.select({
      name: workers.name,
    }).from(workers).where(eq(workers.is_active, true));

    const custodianMap: Record<string, string> = {};

    for (const worker of allWorkers) {
      const normalized = normalizeArabicText(worker.name);
      custodianMap[normalized] = worker.name;

      const nameWords = normalized.split(/\s+/).filter(w => w.length > 1);
      for (const word of nameWords) {
        if (!custodianMap[word]) {
          custodianMap[word] = worker.name;
        }
      }

      const withoutAl = normalized.replace(/^ال/, '');
      if (withoutAl !== normalized && !custodianMap[withoutAl]) {
        custodianMap[withoutAl] = worker.name;
      }
    }

    _cachedCustodianNames = custodianMap;
    _custodianCacheTime = now;
    return custodianMap;
  } catch {
  }

  return {};
}

function getCustodianNamesSync(): Record<string, string> {
  return _cachedCustodianNames || {};
}

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

  const custodianNames = getCustodianNamesSync();
  let custodianName: string | null = null;
  for (const [key, canonical] of Object.entries(custodianNames)) {
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

const DATE_LINE_PATTERNS = [
  /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
  /(\d{1,2})\/(\d{1,2})\/(\d{2})/,
  /(\d{1,2})-(\d{1,2})-(\d{4})/,
  /(\d{1,2})\/(\d{1,2})/,
];

const RECIPIENT_KEYWORDS = [
  'نجار', 'حداد', 'سائق', 'سواق', 'عامل', 'ملحم', 'كهربائي',
];

function extractDateFromLine(line: string): string | null {
  for (const pat of DATE_LINE_PATTERNS) {
    const m = line.match(pat);
    if (m) {
      const day = m[1].padStart(2, '0');
      const month = m[2].padStart(2, '0');
      let year = m[3] ? m[3] : new Date().getFullYear().toString();
      if (year.length === 2) year = '20' + year;
      return `${year}-${month}-${day}`;
    }
  }

  const dayNames: Record<string, string> = {
    'السبت': 'السبت', 'الاحد': 'الاحد', 'الأحد': 'الاحد',
    'الاثنين': 'الاثنين', 'الإثنين': 'الاثنين',
    'الثلاثاء': 'الثلاثاء', 'الاربعاء': 'الاربعاء', 'الأربعاء': 'الاربعاء',
    'الخميس': 'الخميس', 'الجمعة': 'الجمعة',
  };

  for (const dayName of Object.keys(dayNames)) {
    const dayDatePattern = new RegExp(dayName + '\\s*(\\d{1,2})\\/(\\d{1,2})');
    const m = line.match(dayDatePattern);
    if (m) {
      const day = m[1].padStart(2, '0');
      const month = m[2].padStart(2, '0');
      const year = new Date().getFullYear().toString();
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

function extractRecipientFromLine(line: string): string | null {
  const normalized = normalizeArabicText(line);

  const custodianNames = getCustodianNamesSync();
  for (const [key, canonical] of Object.entries(custodianNames)) {
    if (normalized.includes(key)) {
      return canonical;
    }
  }

  for (const keyword of RECIPIENT_KEYWORDS) {
    const idx = normalized.indexOf(keyword);
    if (idx !== -1) {
      const surrounding = normalized.slice(Math.max(0, idx - 20), idx + keyword.length + 20).trim();
      const words = surrounding.split(/\s+/).filter(w => w.length > 1 && !/^\d/.test(w));
      if (words.length > 0) {
        return words.slice(0, 3).join(' ');
      }
    }
  }

  const namePattern = /(?:اجرة|أجرة|حق|مال)\s+([\u0600-\u06FF\s]{3,30})/;
  const nameMatch = normalized.match(namePattern);
  if (nameMatch) {
    return nameMatch[1].trim();
  }

  return null;
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

      const extractedDate = extractDateFromLine(normalized);
      const extractedRecipient = extractRecipientFromLine(normalized);

      items.push({
        description: arabicDesc || normalized,
        amount: amounts[0].value,
        date: extractedDate,
        recipient: extractedRecipient,
      });
      totalAmount += amounts[0].value;
    }
  }

  if (items.length < 2) return null;

  const custodianNamesMap = getCustodianNamesSync();
  let custodianName: string | null = null;
  for (const [key, canonical] of Object.entries(custodianNamesMap)) {
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
