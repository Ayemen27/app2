const ARABIC_CHAR_MAP: Record<string, string> = {
  'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا',
  'ة': 'ه',
  'ؤ': 'و',
  'ئ': 'ي',
  'ى': 'ي',
  'ﻻ': 'لا', 'ﻷ': 'لا', 'ﻹ': 'لا', 'ﻵ': 'لا',
};

const TASHKEEL_REGEX = /[\u064B-\u065F\u0670]/g;
const TATWEEL_REGEX = /\u0640/g;

export function normalizeArabic(text: string): string {
  let result = text.replace(TASHKEEL_REGEX, '').replace(TATWEEL_REGEX, '');
  for (const [from, to] of Object.entries(ARABIC_CHAR_MAP)) {
    result = result.split(from).join(to);
  }
  return result.trim();
}

const COMMON_TYPOS: Record<string, string[]> = {
  'مصروف': ['مصروف', 'مصرف', 'مصرووف', 'مصاريف', 'مصارف', 'مصروفه', 'مصرفه'],
  'مصروفات': ['مصروفات', 'مصرفات', 'مصاريف', 'مصروفاات'],
  'تصدير': ['تصدير', 'تصدر', 'صدر', 'اصدر', 'نصدر', 'صدرلي', 'صدّر'],
  'تقرير': ['تقرير', 'تقرر', 'تقارير', 'تقريير'],
  'كشف': ['كشف', 'كشوف', 'كشوفات', 'كشفه'],
  'حساب': ['حساب', 'حسابه', 'حسابة', 'حسابات'],
  'رصيد': ['رصيد', 'رصيده', 'رصيدة', 'رصيدو'],
  'باقي': ['باقي', 'باقى', 'بقي', 'متبقي', 'متبقى'],
  'مشروع': ['مشروع', 'مشرع', 'مشاريع', 'مشروعات', 'مشاريعي'],
  'عامل': ['عامل', 'عمال', 'عمالة', 'عماله', 'العماله', 'العمال'],
  'مساعدة': ['مساعدة', 'مساعده', 'ساعدني', 'ساعدنى', 'مساعده', 'مسعده'],
  'ملخص': ['ملخص', 'ملخس', 'تلخيص', 'ملخّص'],
  'حالة': ['حالة', 'حاله', 'وضع', 'حاله'],
  'اكسل': ['اكسل', 'اكسيل', 'اكسال', 'excel', 'xlsx', 'اكسال'],
  'احصائيات': ['احصائيات', 'احصاءات', 'احصائات', 'احصايات', 'اخصائيات'],
  'مصاريف': ['مصاريف', 'مصارف', 'مصاريفه', 'مصارفه'],
  'عمليه': ['عمليه', 'عملية', 'عمليات'],
  'حركه': ['حركه', 'حركة', 'حركات'],
};

const DIALECT_MAP: Record<string, string> = {
  'ابي': 'اريد',
  'ابغى': 'اريد',
  'ابغا': 'اريد',
  'نبي': 'اريد',
  'ودي': 'اريد',
  'وريني': 'عرض',
  'ورني': 'عرض',
  'طلعلي': 'عرض',
  'طلع': 'عرض',
  'عطني': 'اعطني',
  'عطيني': 'اعطني',
  'اعطيني': 'اعطني',
  'شو': 'ماذا',
  'وش': 'ماذا',
  'ايش': 'ماذا',
  'ليش': 'لماذا',
  'كيف': 'كيف',
  'مين': 'من',
  'وين': 'اين',
  'هسه': 'الان',
  'هلا': 'الان',
  'دحين': 'الان',
};

export function matchesWord(input: string, canonical: string): boolean {
  const norm = normalizeArabic(input);
  const variants = COMMON_TYPOS[canonical];
  if (variants) {
    return variants.some(v => norm.includes(normalizeArabic(v)));
  }
  return norm.includes(normalizeArabic(canonical));
}

export function normalizeForSearch(text: string): string {
  let result = normalizeArabic(text)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  for (const [dialect, standard] of Object.entries(DIALECT_MAP)) {
    const dialectNorm = normalizeArabic(dialect);
    const regex = new RegExp(`\\b${dialectNorm}\\b`, 'g');
    result = result.replace(regex, normalizeArabic(standard));
  }

  for (const [canonical, typos] of Object.entries(COMMON_TYPOS)) {
    for (const typo of typos) {
      const typoNorm = normalizeArabic(typo);
      if (typoNorm !== normalizeArabic(canonical) && result.includes(typoNorm)) {
        result = result.split(typoNorm).join(normalizeArabic(canonical));
      }
    }
  }

  return result;
}

export function tokenize(text: string): string[] {
  return normalizeForSearch(text).split(/\s+/).filter(w => w.length > 0);
}
