import { safeParseNum } from '../../utils/safe-numbers.js';

const EASTERN_TO_WESTERN: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

const MAX_REASONABLE_AMOUNT = 500_000_000;

const PHONE_PATTERNS = [
  /^967\d{9}$/,
  /^00967\d{9}$/,
  /^\+967\d{9}$/,
  /^7[0-9]\d{7}$/,
  /^20\d{10}$/,
  /^00\d{11,}$/,
];

const NON_AMOUNT_CONTEXT_RE = /(?:هاتف|تلفون|جوال|موبايل|رقم\s*(?:المرسل|المستلم|الهاتف|الجوال|المرجعي|الطلب|العملية|الحوالة)|phone|mobile|ref|BTL-|الرقم\s*المرجعي|رقم\s*الطلب)/i;

function isPhoneNumber(numStr: string): boolean {
  const clean = numStr.replace(/[\s\-\.]+/g, '');
  if (PHONE_PATTERNS.some(p => p.test(clean))) return true;
  if (clean.length >= 9 && clean.length <= 12 && clean.startsWith('7')) return true;
  if (clean.length >= 12 && clean.startsWith('967')) return true;
  return false;
}

function isNonAmountByContext(fullLine: string, matchedNum: string): boolean {
  const idx = fullLine.indexOf(matchedNum);
  if (idx < 0) return false;
  const before = fullLine.slice(Math.max(0, idx - 40), idx);
  return NON_AMOUNT_CONTEXT_RE.test(before);
}

function isReasonableAmount(val: number): boolean {
  return val > 0 && val <= MAX_REASONABLE_AMOUNT;
}

export function isLineNonFinancial(line: string): boolean {
  const normalized = normalizeArabicText(line);
  return NON_AMOUNT_CONTEXT_RE.test(normalized) && !/مبلغ|ريال|الف|ألف|آلاف|مليون/.test(normalized);
}

export function easternToWestern(text: string): string {
  return text.replace(/[٠-٩]/g, (ch) => EASTERN_TO_WESTERN[ch] || ch);
}

export function normalizeArabicText(text: string): string {
  return text
    .replace(/[\u200F\u200E\u202A\u202B\u202C\u200B\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeArabicTextPreserveLines(text: string): string {
  return text
    .replace(/[\u200F\u200E\u202A\u202B\u202C\u200B\uFEFF]/g, '')
    .replace(/[^\S\n]+/g, ' ')
    .trim();
}

export interface ParsedAmount {
  value: number;
  raw: string;
  currency: string;
}

const MILLIONS_PATTERNS = [
  /(\d+)\s*مليون/,
];

const THOUSANDS_PATTERNS = [
  /(\d+)\s*الف/,
  /(\d+)\s*آلاف/,
  /(\d+)\s*ألف/,
];

const HALF_SUFFIX_RE = /\s*و\s*(?:نص|نصف)/;

function applyHalfSuffix(normalized: string, matchEnd: number, baseValue: number, unitScale: number): number {
  const rest = normalized.slice(matchEnd);
  if (HALF_SUFFIX_RE.test(rest.slice(0, 10))) {
    return baseValue + unitScale / 2;
  }
  return baseValue;
}

export function parseArabicAmount(text: string): ParsedAmount | null {
  const normalized = easternToWestern(normalizeArabicText(text));

  for (const pat of MILLIONS_PATTERNS) {
    const m = normalized.match(pat);
    if (m) {
      let val = safeParseNum(m[1]) * 1_000_000;
      val = applyHalfSuffix(normalized, (m.index ?? 0) + m[0].length, val, 1_000_000);
      if (val > 0) {
        return { value: val, raw: m[0], currency: 'YER' };
      }
    }
  }

  const bareThousandHalf = normalized.match(/(?:^|\s)(?:الف|ألف)\s*و\s*(?:نص|نصف)(?:\s|$)/);
  if (bareThousandHalf) {
    return { value: 1500, raw: bareThousandHalf[0].trim(), currency: 'YER' };
  }

  const bareThousand = normalized.match(/(?:^|\s)(?:الف|ألف)(?:\s|$)/);
  if (bareThousand && !normalized.match(/\d\s*(?:الف|ألف)/)) {
    return { value: 1000, raw: bareThousand[0].trim(), currency: 'YER' };
  }

  for (const pat of THOUSANDS_PATTERNS) {
    const m = normalized.match(pat);
    if (m) {
      let val = safeParseNum(m[1]) * 1000;
      val = applyHalfSuffix(normalized, (m.index ?? 0) + m[0].length, val, 1000);
      if (val > 0) {
        return { value: val, raw: m[0], currency: 'YER' };
      }
    }
  }

  const halfStandalone = normalized.match(/(?:^|\s)(\d+)\s*و\s*(?:نص|نصف)(?:\s|$)/);
  if (halfStandalone) {
    const val = safeParseNum(halfStandalone[1]) + 0.5;
    if (val > 0) {
      return { value: val, raw: halfStandalone[0].trim(), currency: 'YER' };
    }
  }

  const commaNum = normalized.match(/(\d{1,3}(?:,\d{3})+(?:\.\d+)?)/);
  if (commaNum) {
    const val = safeParseNum(commaNum[1].replace(/,/g, ''));
    if (isReasonableAmount(val) && !isPhoneNumber(commaNum[1].replace(/,/g, '')) && !isNonAmountByContext(normalized, commaNum[1])) {
      return { value: val, raw: commaNum[0], currency: 'YER' };
    }
  }

  const plainNum = normalized.match(/(\d+(?:\.\d+)?)/);
  if (plainNum) {
    const val = safeParseNum(plainNum[1]);
    if (isReasonableAmount(val) && !isPhoneNumber(plainNum[1]) && !isNonAmountByContext(normalized, plainNum[1])) {
      return { value: val, raw: plainNum[0], currency: 'YER' };
    }
  }

  return null;
}

export function extractAllAmounts(text: string): ParsedAmount[] {
  const results: ParsedAmount[] = [];
  const normalized = easternToWestern(normalizeArabicText(text));

  const millionsRe = /(\d+)\s*مليون/g;
  let m;
  while ((m = millionsRe.exec(normalized)) !== null) {
    let val = safeParseNum(m[1]) * 1_000_000;
    val = applyHalfSuffix(normalized, m.index + m[0].length, val, 1_000_000);
    if (val > 0) {
      results.push({ value: val, raw: m[0], currency: 'YER' });
    }
  }

  const bareThousandHalfRe = /(?:^|\s)(?:الف|ألف)\s*و\s*(?:نص|نصف)/g;
  while ((m = bareThousandHalfRe.exec(normalized)) !== null) {
    if (!results.some(r => r.value === 1500)) {
      results.push({ value: 1500, raw: m[0].trim(), currency: 'YER' });
    }
  }

  const thousandsRe = /(\d+)\s*(?:الف|آلاف|ألف)/g;
  while ((m = thousandsRe.exec(normalized)) !== null) {
    let val = safeParseNum(m[1]) * 1000;
    val = applyHalfSuffix(normalized, m.index + m[0].length, val, 1000);
    if (val > 0 && !results.some(r => r.value === val)) {
      results.push({ value: val, raw: m[0], currency: 'YER' });
    }
  }

  const commaRe = /(\d{1,3}(?:,\d{3})+(?:\.\d+)?)/g;
  while ((m = commaRe.exec(normalized)) !== null) {
    const rawDigits = m[1].replace(/,/g, '');
    const val = safeParseNum(rawDigits);
    if (isReasonableAmount(val) && !isPhoneNumber(rawDigits) && !isNonAmountByContext(normalized, m[1]) && !results.some(r => r.value === val)) {
      results.push({ value: val, raw: m[0], currency: 'YER' });
    }
  }

  const plainRe = /(?<![,\d])(\d{3,})(?:\.\d+)?(?![,\d])/g;
  while ((m = plainRe.exec(normalized)) !== null) {
    const val = safeParseNum(m[1]);
    if (isReasonableAmount(val) && !isPhoneNumber(m[1]) && !isNonAmountByContext(normalized, m[1]) && !results.some(r => r.value === val)) {
      results.push({ value: val, raw: m[0], currency: 'YER' });
    }
  }

  return results;
}

export function extractAmountFromInlineExpense(text: string): { amount: number; description: string; raw: string } | null {
  const normalized = easternToWestern(normalizeArabicText(text));

  const thousandDescPat = /(\d+)\s*(?:الف|آلاف|ألف)\s*(?:ريال\s*)?([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]+)/;
  let m = normalized.match(thousandDescPat);
  if (m) {
    const amount = safeParseNum(m[1]) * 1000;
    const desc = m[2].trim();
    if (amount > 0 && desc.length > 0) {
      return { amount, description: desc, raw: m[0] };
    }
  }

  const numDescPat = /(\d+)\s*([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]*)/;
  m = normalized.match(numDescPat);
  if (m) {
    const amount = safeParseNum(m[1]);
    const desc = m[2].trim();
    if (amount >= 100 && desc.length > 0 && isReasonableAmount(amount) && !isPhoneNumber(m[1]) && !isNonAmountByContext(normalized, m[1])) {
      return { amount, description: desc, raw: m[0] };
    }
  }

  const descNumPat = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]*?)\s*(\d+)/;
  m = normalized.match(descNumPat);
  if (m) {
    const desc = m[1].trim();
    const amount = safeParseNum(m[2]);
    if (amount >= 100 && desc.length > 0 && isReasonableAmount(amount) && !isPhoneNumber(m[2]) && !isNonAmountByContext(normalized, m[2])) {
      return { amount, description: desc, raw: m[0] };
    }
  }

  return null;
}
