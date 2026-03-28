import { getModelManager } from '../ai-agent/ModelManager.js';
import type { ChatMessage } from '../ai-agent/ModelManager.js';
import { z } from 'zod';

const MAX_RETRIES = 3;
const BATCH_SIZE = 40;

const SYSTEM_PROMPT_BASE = `أنت محلل محاسبي متخصص في تحليل محادثات واتساب لشركات مقاولات وبناء في اليمن.
السياق: رسائل واتساب بين مدراء مشاريع بناء وعمال ومقاولين. اللهجة يمنية.
المصطلحات الشائعة:
- "حق" = مستحقات/تكلفة (مثل: حق النجار = أجرة النجار)
- "سلفه/استلاف/سلفني/أسلفني" = قرض مؤقت
- "أمانة/عند فلان/عندك/عنده" = مبلغ محفوظ عند شخص
- "حوالة/تحويل/حول لي/حولت" = تحويل مالي عبر شركة صرافة
- "صبه/صبينا/نصب" = صب خرسانة
- "مخاره/خراطه" = عمل خراطة حديد
- "أبو فلان" = كنية شخص (اسم معروف)
- "الحوشبي/رشاد بحير/النجم/الكريمي/بن مليح" = شركات تحويل أموال
- "طقم/طاقم" = مجموعة عمال
- "يوميه/يومية" = أجرة يومية
- "مقاول/معلم" = مقاول أو رئيس عمال
- "دبه/دبة" = وعاء/حاوية (ليس اسم شخص)
- "شيلة/شيلت" = حمولة نقل
- "كسارة" = آلة تكسير (ليس اسم)
- "خلاطة" = آلة خلط خرسانة (ليس اسم)
- "بلك/بلوك" = طوب بناء (ليس اسم)
- "ياجر/يا قر" = كلمة نداء يمنية تعني "يا أخي" (ليست اسم)
يجب أن تُخرج JSON فقط بدون أي نص إضافي أو شرح.`;

const AINameResultSchema = z.object({
  name: z.string().min(2),
  entityType: z.enum(['شخص', 'شركة', 'مجموعة_عمال']).catch('شخص'),
  confidence: z.number().min(0).max(1).catch(0.7),
  evidence: z.string().catch(''),
  messageIndex: z.number().optional(),
});

const AINameResultArraySchema = z.array(AINameResultSchema);

const AIFinancialResultSchema = z.object({
  isTransaction: z.boolean(),
  transactionType: z.enum(['تحويل', 'مصروف', 'قرض', 'أمانة', 'تسوية', 'راتب', 'غير_محدد']).catch('غير_محدد'),
  amount: z.number().positive(),
  currency: z.string().catch('ريال'),
  sender: z.string().catch(''),
  recipient: z.string().catch(''),
  description: z.string().catch(''),
  transferNumber: z.string().catch(''),
  companyName: z.string().catch(''),
  confidence: z.number().min(0).max(1).catch(0.7),
  evidence: z.string().catch(''),
  messageIndex: z.number().optional(),
}) as z.ZodType<AIFinancialResult>;

const AIFinancialResultArraySchema = z.array(AIFinancialResultSchema);

const AIImageAnalysisResultSchema = z.object({
  documentType: z.enum(['إيصال_تحويل', 'فاتورة', 'كشف_حساب', 'صورة_عامة', 'غير_محدد']).catch('غير_محدد'),
  extractedNames: z.array(z.string()).catch([]),
  extractedAmounts: z.array(z.object({
    amount: z.number(),
    description: z.string().catch(''),
  })).catch([]),
  companyName: z.string().catch(''),
  transferNumber: z.string().catch(''),
  sender: z.string().catch(''),
  recipient: z.string().catch(''),
  date: z.string().catch(''),
  confidence: z.number().min(0).max(1).catch(0.5),
  summary: z.string().catch(''),
}) as z.ZodType<AIImageAnalysisResult>;

const AIProjectResultSchema = z.object({
  projectId: z.string(),
  projectName: z.string().catch(''),
  confidence: z.number().min(0).max(1).catch(0.5),
  reason: z.string().catch(''),
});

export interface AINameResult {
  name: string;
  entityType: 'شخص' | 'شركة' | 'مجموعة_عمال';
  confidence: number;
  evidence: string;
  messageIndex?: number;
}

export interface AIFinancialResult {
  isTransaction: boolean;
  transactionType: 'تحويل' | 'مصروف' | 'قرض' | 'أمانة' | 'تسوية' | 'راتب' | 'غير_محدد';
  amount: number;
  currency: string;
  sender: string;
  recipient: string;
  description: string;
  transferNumber: string;
  companyName: string;
  confidence: number;
  evidence: string;
  messageIndex?: number;
}

export interface AIImageAnalysisResult {
  documentType: 'إيصال_تحويل' | 'فاتورة' | 'كشف_حساب' | 'صورة_عامة' | 'غير_محدد';
  extractedNames: string[];
  extractedAmounts: { amount: number; description: string }[];
  companyName: string;
  transferNumber: string;
  sender: string;
  recipient: string;
  date: string;
  confidence: number;
  summary: string;
}

export interface AIProjectResult {
  projectId: string;
  projectName: string;
  confidence: number;
  reason: string;
}

export interface MessageForAI {
  index: number;
  sender: string;
  text: string;
  timestamp?: string;
  ocrText?: string;
  hasImage?: boolean;
}

function parseJSONFromAI(raw: string): any {
  let cleaned = raw.trim();

  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    cleaned = jsonBlockMatch[1].trim();
  }

  const firstBracket = cleaned.indexOf('[');
  const firstBrace = cleaned.indexOf('{');
  if (firstBracket >= 0 || firstBrace >= 0) {
    let start: number;
    if (firstBracket >= 0 && (firstBrace < 0 || firstBracket < firstBrace)) {
      start = firstBracket;
    } else {
      start = firstBrace;
    }
    cleaned = cleaned.substring(start);
  }

  const lastBracket = cleaned.lastIndexOf(']');
  const lastBrace = cleaned.lastIndexOf('}');
  const end = Math.max(lastBracket, lastBrace);
  if (end >= 0) {
    cleaned = cleaned.substring(0, end + 1);
  }

  return JSON.parse(cleaned);
}

function validateWithZod<T>(schema: z.ZodType<T>, data: unknown, context: string): T | null {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn(`[AIOrchestrator] Zod validation failed for ${context}:`, JSON.stringify(result.error.issues, null, 2));
  return null;
}

async function callAIWithRetry(
  systemPrompt: string,
  userMessage: string,
  retries: number = MAX_RETRIES
): Promise<string | null> {
  const modelManager = getModelManager();

  if (!modelManager.hasAvailableModel()) {
    console.warn('[AIOrchestrator] No AI models available, skipping AI analysis');
    return null;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const messages: ChatMessage[] = [
        { role: 'user', content: userMessage }
      ];

      const response = await modelManager.chat(messages, systemPrompt);
      return response.content;
    } catch (err: any) {
      console.warn(`[AIOrchestrator] Attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) {
        console.error('[AIOrchestrator] All retry attempts failed');
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  return null;
}

function buildMessageBlock(messages: MessageForAI[]): string {
  return messages.map(m => {
    let line = `[${m.index}] ${m.sender}: ${m.text}`;
    if (m.ocrText) {
      line += `\n    [نص من صورة/مستند]: ${m.ocrText.substring(0, 300)}`;
    }
    return line;
  }).join('\n');
}

const NAME_EXTRACTION_FEW_SHOT = `
أمثلة توضيحية:

مثال ١ - رسالة تحتوي أسماء أشخاص:
الرسالة: "حق أبو فارس 5000 وحق وليد 3000 حق النقل"
الإخراج:
[{"name": "أبو فارس", "entityType": "شخص", "confidence": 0.95, "evidence": "حق أبو فارس 5000", "messageIndex": 0},
 {"name": "وليد", "entityType": "شخص", "confidence": 0.9, "evidence": "حق وليد 3000", "messageIndex": 0}]
ملاحظة: "النقل" نشاط وليس اسم شخص

مثال ٢ - رسالة تحتوي شركة وشخص:
الرسالة: "حوالة الحوشبي 15000 باسم زين العابدين محمد"
الإخراج:
[{"name": "الحوشبي", "entityType": "شركة", "confidence": 0.95, "evidence": "حوالة الحوشبي", "messageIndex": 0},
 {"name": "زين العابدين محمد", "entityType": "شخص", "confidence": 0.9, "evidence": "باسم زين العابدين محمد", "messageIndex": 0}]

مثال ٣ - رسالة بدون أسماء (فخ شائع):
الرسالة: "حق الشاص والدينا والنقل والسبيات 25000"
الإخراج:
[]
ملاحظة: "الشاص" = سيارة، "الدينا" = شاحنة، "النقل" = نشاط، "السبيات" = نشاط — كلها ليست أسماء أشخاص

مثال ٤ - كُنى يمنية:
الرسالة: "أبو عبدالله أرسل لأم أحمد المبلغ وطاقم الحدادة استلموا"
الإخراج:
[{"name": "أبو عبدالله", "entityType": "شخص", "confidence": 0.9, "evidence": "أبو عبدالله أرسل", "messageIndex": 0},
 {"name": "أم أحمد", "entityType": "شخص", "confidence": 0.9, "evidence": "لأم أحمد المبلغ", "messageIndex": 0},
 {"name": "طاقم الحدادة", "entityType": "مجموعة_عمال", "confidence": 0.8, "evidence": "طاقم الحدادة استلموا", "messageIndex": 0}]
`;

const FINANCIAL_FEW_SHOT = `
أمثلة توضيحية:

مثال ١ - رسالة مركبة (عدة معاملات في رسالة واحدة):
الرسالة: "حق الحديد 15000 وحق النجار أبو سعيد 8000 وسلفه لوليد 3000"
الإخراج:
[{"isTransaction": true, "transactionType": "مصروف", "amount": 15000, "currency": "ريال", "sender": "", "recipient": "", "description": "حق الحديد", "transferNumber": "", "companyName": "", "confidence": 0.85, "evidence": "حق الحديد 15000", "messageIndex": 0},
 {"isTransaction": true, "transactionType": "مصروف", "amount": 8000, "currency": "ريال", "sender": "", "recipient": "أبو سعيد", "description": "حق النجار أبو سعيد", "transferNumber": "", "companyName": "", "confidence": 0.9, "evidence": "حق النجار أبو سعيد 8000", "messageIndex": 0},
 {"isTransaction": true, "transactionType": "قرض", "amount": 3000, "currency": "ريال", "sender": "", "recipient": "وليد", "description": "سلفة لوليد", "transferNumber": "", "companyName": "", "confidence": 0.9, "evidence": "سلفه لوليد 3000", "messageIndex": 0}]

مثال ٢ - حوالة مالية عبر شركة صرافة:
الرسالة: "حوالة رشاد بحير 50000 رقم 784523 باسم أحمد محمد"
الإخراج:
[{"isTransaction": true, "transactionType": "تحويل", "amount": 50000, "currency": "ريال", "sender": "", "recipient": "أحمد محمد", "description": "حوالة رشاد بحير", "transferNumber": "784523", "companyName": "رشاد بحير", "confidence": 0.95, "evidence": "حوالة رشاد بحير 50000 رقم 784523", "messageIndex": 0}]

مثال ٣ - أمانة مع لهجة يمنية:
الرسالة: "عندك أمانه ياجر 10000 حق أبو فارس"
الإخراج:
[{"isTransaction": true, "transactionType": "أمانة", "amount": 10000, "currency": "ريال", "sender": "", "recipient": "أبو فارس", "description": "أمانة حق أبو فارس", "transferNumber": "", "companyName": "", "confidence": 0.9, "evidence": "عندك أمانه ياجر 10000 حق أبو فارس", "messageIndex": 0}]
ملاحظة: "ياجر" كلمة نداء يمنية تعني "يا أخي" — ليست اسم شخص

مثال ٤ - رسالة ليست معاملة:
الرسالة: "متى تبدأ الصبه بكره ان شاء الله"
الإخراج:
[]

مثال ٥ - قائمة مصاريف يومية:
الرسالة: "مصاريف اليوم:
حق الغدا 2000
مواصلات العمال 1500  
حق الماء 500"
الإخراج:
[{"isTransaction": true, "transactionType": "مصروف", "amount": 2000, "currency": "ريال", "sender": "", "recipient": "", "description": "حق الغدا", "transferNumber": "", "companyName": "", "confidence": 0.85, "evidence": "حق الغدا 2000", "messageIndex": 0},
 {"isTransaction": true, "transactionType": "مصروف", "amount": 1500, "currency": "ريال", "sender": "", "recipient": "", "description": "مواصلات العمال", "transferNumber": "", "companyName": "", "confidence": 0.85, "evidence": "مواصلات العمال 1500", "messageIndex": 0},
 {"isTransaction": true, "transactionType": "مصروف", "amount": 500, "currency": "ريال", "sender": "", "recipient": "", "description": "حق الماء", "transferNumber": "", "companyName": "", "confidence": 0.85, "evidence": "حق الماء 500", "messageIndex": 0}]
`;

const IMAGE_ANALYSIS_FEW_SHOT = `
أمثلة توضيحية:

مثال ١ - إيصال تحويل:
النص المستخرج: "شركة الحوشبي للصرافة - رقم الحوالة: 456789 - المرسل: علي أحمد - المستلم: محمد صالح - المبلغ: 100,000 ريال - التاريخ: 2024/03/15"
الإخراج:
{"documentType": "إيصال_تحويل", "extractedNames": ["علي أحمد", "محمد صالح"], "extractedAmounts": [{"amount": 100000, "description": "مبلغ الحوالة"}], "companyName": "الحوشبي", "transferNumber": "456789", "sender": "علي أحمد", "recipient": "محمد صالح", "date": "2024/03/15", "confidence": 0.95, "summary": "إيصال حوالة من شركة الحوشبي بمبلغ 100,000 ريال"}

مثال ٢ - فاتورة مواد بناء:
النص المستخرج: "فاتورة - حديد 16 مم - 5 طن × 250,000 = 1,250,000 - بلوك - 1000 حبة × 150 = 150,000 - المجموع: 1,400,000"
الإخراج:
{"documentType": "فاتورة", "extractedNames": [], "extractedAmounts": [{"amount": 1250000, "description": "حديد 16 مم 5 طن"}, {"amount": 150000, "description": "بلوك 1000 حبة"}, {"amount": 1400000, "description": "المجموع الكلي"}], "companyName": "", "transferNumber": "", "sender": "", "recipient": "", "date": "", "confidence": 0.85, "summary": "فاتورة مواد بناء: حديد وبلوك بإجمالي 1,400,000 ريال"}

مثال ٣ - صورة عامة بلا محتوى مالي:
النص المستخرج: "موقع المشروع - صورة للأعمدة بعد الصب"
الإخراج:
{"documentType": "صورة_عامة", "extractedNames": [], "extractedAmounts": [], "companyName": "", "transferNumber": "", "sender": "", "recipient": "", "date": "", "confidence": 0.7, "summary": "صورة من موقع المشروع تظهر الأعمدة بعد الصب"}
`;

const PROJECT_INFERENCE_FEW_SHOT = `
أمثلة توضيحية:

مثال ١ - ذكر صريح لاسم المشروع:
الرسالة: "مصاريف مشروع فيلا الأبيار اليوم 25000"
المشاريع: [فيلا الأبيار (ID: 5), عمارة المعلا (ID: 8)]
الإخراج:
{"projectId": "5", "projectName": "فيلا الأبيار", "confidence": 0.95, "reason": "ذكر صريح لاسم المشروع: فيلا الأبيار"}

مثال ٢ - إشارة سياقية غير مباشرة:
الرسالة: "حق الحديد للعمارة 50000"
المشاريع: [فيلا الأبيار (ID: 5), عمارة المعلا (ID: 8)]
الإخراج:
{"projectId": "8", "projectName": "عمارة المعلا", "confidence": 0.7, "reason": "إشارة إلى 'العمارة' تتطابق جزئياً مع عمارة المعلا"}

مثال ٣ - لا إشارة واضحة:
الرسالة: "حق الغدا 2000"
المشاريع: [فيلا الأبيار (ID: 5), عمارة المعلا (ID: 8)]
الإخراج:
null
`;

export async function extractNamesWithAI(messages: MessageForAI[]): Promise<AINameResult[]> {
  const allResults: AINameResult[] = [];

  const batches: MessageForAI[][] = [];
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    batches.push(messages.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    const systemPrompt = SYSTEM_PROMPT_BASE + `\n
مهمتك: استخراج أسماء الأشخاص والشركات فقط من محادثة واتساب.

قواعد صارمة:
1. استخرج فقط: أسماء أشخاص حقيقيين (عمال، مهندسين، مقاولين، مدراء)، وأسماء شركات ومؤسسات
2. لا تستخرج أبداً: مواد بناء (حديد، خرسانة، إسمنت، بلك، بلوك)، مركبات (شاص، هيلكس، دينا، قلاب)، أماكن ومواقع (الأبيار، المشروع)، أنشطة (نقل، نجارة، سباكة، مواصلات)، أدوات ومعدات (كسارة، خلاطة، هزاز)
3. "حق الشاص" = تكلفة السيارة — "الشاص" ليس اسم شخص
4. "السبيات والنجاره والنقل" = أنشطة — ليست أسماء
5. "أبو فارس"، "وليد"، "زين العابدين" = أسماء أشخاص ✓
6. "شركة الحوشبي"، "رشاد بحير" = شركة/شخص ✓
7. الكُنى (أبو/أم + اسم) هي أسماء أشخاص
8. "ياجر"/"يا قر" = كلمة نداء يمنية — ليست اسم شخص
9. "دبه"/"شيلة"/"كسارة"/"خلاطة" = أدوات/معدات — ليست أسماء
10. "طاقم/طقم" + وصف (مثل "طاقم الحدادة") = مجموعة_عمال

${NAME_EXTRACTION_FEW_SHOT}

أخرج مصفوفة JSON فقط:
[{"name": "الاسم", "entityType": "شخص|شركة|مجموعة_عمال", "confidence": 0.0-1.0, "evidence": "السياق الذي وجدته فيه", "messageIndex": رقم}]

إذا لم تجد أسماء، أخرج مصفوفة فارغة: []`;

    const messageBlock = buildMessageBlock(batch);
    const userMessage = `حلل هذه الرسائل واستخرج أسماء الأشخاص والشركات فقط:\n\n${messageBlock}`;

    const raw = await callAIWithRetry(systemPrompt, userMessage);
    if (!raw) continue;

    try {
      const parsed = parseJSONFromAI(raw);
      if (Array.isArray(parsed)) {
        const validated = validateWithZod(AINameResultArraySchema, parsed, 'name_extraction');
        if (validated) {
          for (const item of validated) {
            allResults.push({
              name: item.name.trim(),
              entityType: item.entityType,
              confidence: item.confidence,
              evidence: item.evidence,
              messageIndex: item.messageIndex,
            });
          }
        } else {
          for (const item of parsed) {
            if (item.name && typeof item.name === 'string' && item.name.trim().length >= 2) {
              allResults.push({
                name: item.name.trim(),
                entityType: item.entityType || 'شخص',
                confidence: typeof item.confidence === 'number' ? item.confidence : 0.7,
                evidence: item.evidence || '',
                messageIndex: item.messageIndex,
              });
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('[AIOrchestrator] Failed to parse AI name extraction response:', err.message);
    }
  }

  const seen = new Set<string>();
  return allResults.filter(r => {
    const key = r.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function analyzeFinancialWithAI(messages: MessageForAI[]): Promise<AIFinancialResult[]> {
  const allResults: AIFinancialResult[] = [];

  const batches: MessageForAI[][] = [];
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    batches.push(messages.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    const systemPrompt = SYSTEM_PROMPT_BASE + `\n
مهمتك: تحليل رسائل واتساب واستخراج المعاملات المالية.

قواعد مهمة:
1. رسالة واحدة قد تحتوي على عدة معاملات مالية — استخرج كل معاملة على حدة
2. لكل معاملة مالية، حدد:
   - نوع المعاملة: تحويل (حوالة عبر شركة صرافة)، مصروف (شراء مواد/أجرة)، قرض (سلفة/استلاف)، أمانة (مبلغ محفوظ)، تسوية (حساب ختامي)، راتب
   - المبلغ بالأرقام (حوّل الأرقام الشرقية ٠١٢٣ للغربية 0123)
   - المرسل والمستلم (أسماء أشخاص/شركات)
   - وصف المعاملة
   - رقم التحويل إن وُجد
   - اسم شركة التحويل إن وُجد
3. الرسائل التي تحتوي فقط على محادثة عامة (سلام، كيف الحال، متى نبدأ) ليست معاملات
4. إذا ذُكر مبلغ مالي في سياق مالي واضح = معاملة
5. "حق العامل 5000" = مصروف
6. "حوالة 10000 رشاد بحير" = تحويل
7. "سلفه 3000" أو "أسلفني 3000" = قرض
8. "عندك أمانه 5000" = أمانة
9. "ياجر" = كلمة نداء يمنية، تجاهلها ولا تعتبرها اسم

تنبيه مهم حول الرسائل المركبة:
- إذا وجدت رسالة واحدة فيها عدة مبالغ مثل "حق فلان 5000 وحق فلان 3000"
  يجب أن تُخرج كل مبلغ كمعاملة منفصلة في المصفوفة
- قوائم المصاريف اليومية (كل سطر فيه بند ومبلغ) = عدة معاملات منفصلة

${FINANCIAL_FEW_SHOT}

أخرج مصفوفة JSON:
[{"isTransaction": true, "transactionType": "تحويل|مصروف|قرض|أمانة|تسوية|راتب|غير_محدد", "amount": 0, "currency": "ريال", "sender": "", "recipient": "", "description": "", "transferNumber": "", "companyName": "", "confidence": 0.0-1.0, "evidence": "", "messageIndex": رقم}]

إذا لم تجد معاملات، أخرج: []`;

    const messageBlock = buildMessageBlock(batch);
    const userMessage = `حلل هذه الرسائل واستخرج المعاملات المالية. تذكر: رسالة واحدة قد تحتوي عدة معاملات، استخرج كل واحدة:\n\n${messageBlock}`;

    const raw = await callAIWithRetry(systemPrompt, userMessage);
    if (!raw) continue;

    try {
      const parsed = parseJSONFromAI(raw);
      if (Array.isArray(parsed)) {
        const transactionItems = parsed.filter((item: any) => item.isTransaction && typeof item.amount === 'number' && item.amount > 0);

        const validated = validateWithZod(AIFinancialResultArraySchema, transactionItems, 'financial_extraction');
        if (validated) {
          for (const item of validated) {
            if (item.isTransaction) {
              allResults.push(item);
            }
          }
        } else {
          for (const item of transactionItems) {
            allResults.push({
              isTransaction: true,
              transactionType: item.transactionType || 'غير_محدد',
              amount: item.amount,
              currency: item.currency || 'ريال',
              sender: item.sender || '',
              recipient: item.recipient || '',
              description: item.description || '',
              transferNumber: item.transferNumber || '',
              companyName: item.companyName || '',
              confidence: typeof item.confidence === 'number' ? item.confidence : 0.7,
              evidence: item.evidence || '',
              messageIndex: item.messageIndex,
            });
          }
        }
      }
    } catch (err: any) {
      console.warn('[AIOrchestrator] Failed to parse AI financial response:', err.message);
    }
  }

  return allResults;
}

export async function analyzeImageWithAI(ocrText: string, originalFilename?: string): Promise<AIImageAnalysisResult | null> {
  const systemPrompt = SYSTEM_PROMPT_BASE + `\n
مهمتك: تحليل نص مستخرج من صورة أو مستند (OCR) في سياق مقاولات بناء.

حدد:
1. نوع المستند: إيصال تحويل، فاتورة، كشف حساب، أو صورة عامة
2. استخرج: أسماء الأشخاص، المبالغ مع أوصافها، اسم الشركة، رقم التحويل، المرسل، المستلم، التاريخ
3. لخّص محتوى المستند

قواعد:
- إذا وجدت رقم حوالة ومبلغ واسم شركة = إيصال_تحويل (ثقة عالية)
- إذا وجدت قائمة مواد وأسعار = فاتورة
- إذا وجدت أرقام حسابات أو أرصدة = كشف_حساب
- إذا لم تجد محتوى مالي واضح = صورة_عامة

${IMAGE_ANALYSIS_FEW_SHOT}

أخرج JSON واحد:
{"documentType": "إيصال_تحويل|فاتورة|كشف_حساب|صورة_عامة|غير_محدد", "extractedNames": ["اسم1"], "extractedAmounts": [{"amount": 0, "description": "وصف"}], "companyName": "", "transferNumber": "", "sender": "", "recipient": "", "date": "", "confidence": 0.0-1.0, "summary": "ملخص"}`;

  if (!ocrText || ocrText.trim().length < 10) {
    return null;
  }

  const userMessage = `حلل هذا النص المستخرج من ${originalFilename ? `ملف "${originalFilename}"` : 'صورة/مستند'}:\n\n${ocrText.substring(0, 2000)}`;

  const raw = await callAIWithRetry(systemPrompt, userMessage);
  if (!raw) return null;

  try {
    const parsed = parseJSONFromAI(raw);
    const validated = validateWithZod(AIImageAnalysisResultSchema, parsed, 'image_analysis');
    if (validated) {
      return validated;
    }
    return {
      documentType: parsed.documentType || 'غير_محدد',
      extractedNames: Array.isArray(parsed.extractedNames) ? parsed.extractedNames : [],
      extractedAmounts: Array.isArray(parsed.extractedAmounts) ? parsed.extractedAmounts : [],
      companyName: parsed.companyName || '',
      transferNumber: parsed.transferNumber || '',
      sender: parsed.sender || '',
      recipient: parsed.recipient || '',
      date: parsed.date || '',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      summary: parsed.summary || '',
    };
  } catch (err: any) {
    console.warn('[AIOrchestrator] Failed to parse AI image analysis response:', err.message);
    return null;
  }
}

export async function inferProjectWithAI(
  messageText: string,
  availableProjects: { id: string; name: string }[]
): Promise<AIProjectResult | null> {
  if (availableProjects.length === 0) return null;

  const systemPrompt = SYSTEM_PROMPT_BASE + `\n
مهمتك: تحديد أي مشروع بناء تتعلق به هذه الرسالة.

المشاريع المتاحة:
${availableProjects.map(p => `- ${p.name} (ID: ${p.id})`).join('\n')}

قواعد:
- إذا ذُكر اسم المشروع أو جزء منه في الرسالة = ثقة عالية (0.9+)
- إذا ذُكرت إشارات سياقية (موقع، عنوان، شخص مرتبط) = ثقة متوسطة (0.6-0.8)
- إذا لم تجد أي إشارة واضحة = أخرج null
- لا تخمن إذا لم يكن هناك دليل — أخرج null

${PROJECT_INFERENCE_FEW_SHOT}

أخرج JSON واحد أو null:
{"projectId": "ID", "projectName": "اسم المشروع", "confidence": 0.0-1.0, "reason": "سبب الاختيار"}`;

  const userMessage = `حدد المشروع المتعلق بهذه الرسالة:\n\n${messageText.substring(0, 1000)}`;

  const raw = await callAIWithRetry(systemPrompt, userMessage);
  if (!raw) return null;

  try {
    const parsed = parseJSONFromAI(raw);
    if (parsed && parsed.projectId) {
      const validated = validateWithZod(AIProjectResultSchema, parsed, 'project_inference');
      if (validated) {
        const validProject = availableProjects.find(p => p.id === validated.projectId);
        if (validProject) {
          return {
            projectId: validated.projectId,
            projectName: validated.projectName || validProject.name,
            confidence: validated.confidence,
            reason: validated.reason,
          };
        }
      } else {
        const validProject = availableProjects.find(p => p.id === parsed.projectId);
        if (validProject) {
          return {
            projectId: parsed.projectId,
            projectName: parsed.projectName || validProject.name,
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
            reason: parsed.reason || '',
          };
        }
      }
    }
    return null;
  } catch (err: any) {
    console.warn('[AIOrchestrator] Failed to parse AI project inference response:', err.message);
    return null;
  }
}

export function isAIAvailable(): boolean {
  try {
    const modelManager = getModelManager();
    return modelManager.hasAvailableModel();
  } catch {
    return false;
  }
}

export function getAIModelsStatus(): {
  available: boolean;
  models: Array<{
    provider: string;
    model: string;
    isAvailable: boolean;
    error?: string;
    totalKeys?: number;
    availableKeys?: number;
  }>;
  activeModel?: string;
  totalKeys?: number;
  availableKeys?: number;
} {
  try {
    const modelManager = getModelManager();
    const statuses = modelManager.getModelsStatus();
    const available = modelManager.hasAvailableModel();
    const activeModel = statuses.find(m => m.isAvailable);
    const totalKeys = statuses.reduce((sum, m) => sum + (m.totalKeys || 0), 0);
    const availableKeys = statuses.reduce((sum, m) => sum + (m.availableKeys || 0), 0);
    return {
      available,
      models: statuses.map(m => ({
        provider: m.provider,
        model: m.model,
        isAvailable: m.isAvailable,
        error: m.lastError ? summarizeModelError(m.lastError) : undefined,
        totalKeys: m.totalKeys,
        availableKeys: m.availableKeys,
      })),
      activeModel: activeModel ? `${activeModel.provider}/${activeModel.model}` : undefined,
      totalKeys,
      availableKeys,
    };
  } catch {
    return { available: false, models: [] };
  }
}

function summarizeModelError(error: string): string {
  if (error.includes('402') || error.includes('depleted') || error.includes('credits')) {
    return 'نفاد الرصيد';
  }
  if (error.includes('429') || error.includes('rate limit') || error.includes('quota')) {
    return 'تجاوز حد الاستخدام';
  }
  if (error.includes('401') || error.includes('unauthorized') || error.includes('invalid')) {
    return 'مفتاح غير صالح';
  }
  if (error.includes('timeout') || error.includes('ECONNREFUSED')) {
    return 'انتهاء مهلة الاتصال';
  }
  return 'خطأ غير محدد';
}
