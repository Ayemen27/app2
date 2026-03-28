import { normalizeArabicText, easternToWestern } from './ArabicAmountParser.js';
import { createHash } from 'crypto';

export type FilterResult = {
  excluded: boolean;
  reason?: string;
};

const RUNNING_TOTAL_PATTERNS = [
  /اجمالي\s*الحساب/,
  /إجمالي\s*الحساب/,
  /لاهنا/,
  /المجموع\s*الكلي/,
  /الحساب\s*الختامي/,
  /مجموع\s*المصاريف/,
];

const GREETING_PATTERNS = [
  /^السلام\s*عليكم$/,
  /^وعليكم\s*السلام$/,
  /^صباح\s*الخير$/,
  /^مساء\s*الخير$/,
  /^تصبح\s*على\s*خير$/,
  /^حياك\s*الله$/,
  /^الله\s*يحييك$/,
  /^مرحبا$/,
  /^اهلا$/,
  /^اهلين$/,
  /^هلا$/,
];

const SYSTEM_MESSAGE_PATTERNS = [
  /الرسائل والمكالمات مشفرة تمامًا/,
  /Messages and calls are end-to-end encrypted/,
  /تم تغيير رمز الأمان/,
  /Your security code changed/,
  /أُضيف\(ت\)/,
  /غادر\(ت\)/,
  /أنت أضفت/,
  /أنت أزلت/,
  /You added/,
  /You removed/,
];

const DELETED_MESSAGE_PATTERNS = [
  /حذفت هذه الرسالة/,
  /تم حذف هذه الرسالة/,
  /This message was deleted/,
  /You deleted this message/,
];

export function isNonTransaction(messageText: string | null | undefined): FilterResult {
  if (!messageText || messageText.trim().length === 0) {
    return { excluded: true, reason: 'empty_message' };
  }

  const text = normalizeArabicText(messageText);

  for (const pat of DELETED_MESSAGE_PATTERNS) {
    if (pat.test(text)) {
      return { excluded: true, reason: 'deleted_message' };
    }
  }

  for (const pat of SYSTEM_MESSAGE_PATTERNS) {
    if (pat.test(text)) {
      return { excluded: true, reason: 'system_message' };
    }
  }

  if (isSystemMessage(text)) {
    return { excluded: true, reason: 'system_message' };
  }

  for (const pat of GREETING_PATTERNS) {
    if (pat.test(text.trim())) {
      return { excluded: true, reason: 'greeting' };
    }
  }

  if (text.length < 3 && !/\d/.test(text)) {
    return { excluded: true, reason: 'too_short' };
  }

  return { excluded: false };
}

const SYSTEM_MESSAGE_KEYWORDS = [
  'تم تغيير',
  'الرسائل والمكالمات مشفرة',
  'أضاف',
  'أزال',
  'غادر',
  'انضم',
  'تم إنشاء',
  'أنشأ',
  'غيّر',
  'تم حذف هذه الرسالة',
  'رسالة محذوفة',
];

function isSystemMessage(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length > 200) return false;

  for (const keyword of SYSTEM_MESSAGE_KEYWORDS) {
    if (trimmed.startsWith(keyword) || (trimmed.length < 80 && trimmed.includes(keyword))) {
      return true;
    }
  }
  return false;
}

export function isRunningTotal(messageText: string): boolean {
  const text = normalizeArabicText(messageText);
  for (const pat of RUNNING_TOTAL_PATTERNS) {
    if (pat.test(text)) {
      return true;
    }
  }
  return false;
}

export function isStickerMessage(attachmentRef: string | null | undefined): boolean {
  if (!attachmentRef) return false;
  return /STK-\d+.*\.webp/i.test(attachmentRef);
}

export function computeTextFingerprint(text: string): string {
  const normalized = normalizeArabicText(easternToWestern(text))
    .replace(/\s+/g, '')
    .toLowerCase();
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

export function findDuplicateTextBlocks(
  messages: Array<{ id: number; messageText: string | null; sender: string }>
): Map<number, number> {
  const fingerprints = new Map<string, number>();
  const duplicates = new Map<number, number>();

  for (const msg of messages) {
    if (!msg.messageText || msg.messageText.trim().length < 20) continue;

    const fp = computeTextFingerprint(msg.messageText);
    const existingId = fingerprints.get(fp);

    if (existingId !== undefined) {
      duplicates.set(msg.id, existingId);
    } else {
      fingerprints.set(fp, msg.id);
    }
  }

  return duplicates;
}

export interface DateValidationResult {
  waTimestamp: Date;
  inlineClaimedDate: string | null;
  dateMismatchReason: string | null;
  correctedDate: Date;
}


const DAY_NAME_TO_INDEX: Record<string, number> = {
  'الاحد': 0, 'الأحد': 0,
  'الاثنين': 1, 'الإثنين': 1,
  'الثلاثاء': 2,
  'الاربعاء': 3, 'الأربعاء': 3,
  'الخميس': 4,
  'الجمعة': 5,
  'السبت': 6,
};

export function validateInlineDate(
  messageText: string,
  waTimestamp: Date,
  chatSource: string
): DateValidationResult {
  const result: DateValidationResult = {
    waTimestamp,
    inlineClaimedDate: null,
    dateMismatchReason: null,
    correctedDate: waTimestamp,
  };

  const text = normalizeArabicText(easternToWestern(messageText));

  const datePatterns = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    /(\d{1,2})\/(\d{1,2})\/(\d{2})/,
    /(\d{1,2})-(\d{1,2})-(\d{4})/,
    /(\d{1,2})\/(\d{1,2})/,
  ];

  let inlineDay: number | null = null;
  let inlineMonth: number | null = null;
  let inlineYear: number | null = null;

  for (const pat of datePatterns) {
    const m = text.match(pat);
    if (m) {
      inlineDay = parseInt(m[1]);
      inlineMonth = parseInt(m[2]);
      if (m[3]) {
        inlineYear = parseInt(m[3]);
        if (inlineYear < 100) inlineYear += 2000;
      }
      result.inlineClaimedDate = m[0];
      break;
    }
  }

  if (!result.inlineClaimedDate) {
    return result;
  }

  if (inlineYear && inlineYear !== waTimestamp.getFullYear()) {
    result.dateMismatchReason = `date_mismatch_wrong_year: inline=${inlineYear} vs wa=${waTimestamp.getFullYear()}`;
  }

  if (inlineDay && inlineMonth) {
    const waDay = waTimestamp.getDate();
    const waMonth = waTimestamp.getMonth() + 1;

    if (inlineDay !== waDay || inlineMonth !== waMonth) {
      const dayDiff = Math.abs(
        new Date(waTimestamp.getFullYear(), inlineMonth - 1, inlineDay).getTime() -
        new Date(waTimestamp.getFullYear(), waMonth - 1, waDay).getTime()
      ) / (1000 * 60 * 60 * 24);

      if (dayDiff > 0) {
        const reason = `date_mismatch_whatsapp_vs_inline: inline=${inlineDay}/${inlineMonth} vs wa=${waDay}/${waMonth} (${dayDiff}d diff)`;
        result.dateMismatchReason = result.dateMismatchReason
          ? `${result.dateMismatchReason}; ${reason}`
          : reason;
      }
    }
  }

  for (const [dayName, expectedIndex] of Object.entries(DAY_NAME_TO_INDEX)) {
    if (text.includes(dayName)) {
      const actualDayOfWeek = waTimestamp.getDay();
      if (expectedIndex !== actualDayOfWeek) {
        const reason = `wrong_day_name: "${dayName}" but actual is day ${actualDayOfWeek}`;
        result.dateMismatchReason = result.dateMismatchReason
          ? `${result.dateMismatchReason}; ${reason}`
          : reason;
      }
      break;
    }
  }

  return result;
}

export function isWorkConversation(messageText: string): boolean {
  const text = normalizeArabicText(messageText);

  const planningPatterns = [
    /متى\s*(?:نبدا|تبدا|يبدا)/,
    /كم\s*(?:عامل|حداد|نجار)\s*(?:نحتاج|تحتاج|يحتاج)/,
    /جاهز\s*(?:للعمل|للصب|للتركيب)/,
    /بكره?\s*(?:نكمل|نبدا|نصب)/,
    /ان\s*شاء\s*الله/,
    /وصلوا\s*العمال/,
    /خلصنا\s*(?:الصب|الشغل|التركيب)/,
  ];

  const hasPlanning = planningPatterns.some(p => p.test(text));
  const hasAmount = /\d{3,}/.test(text);

  return hasPlanning && !hasAmount;
}
