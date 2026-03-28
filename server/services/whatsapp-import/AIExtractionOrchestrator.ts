import { getModelManager } from '../ai-agent/ModelManager.js';
import type { ChatMessage } from '../ai-agent/ModelManager.js';

const MAX_RETRIES = 3;
const BATCH_SIZE = 40;

const SYSTEM_PROMPT_BASE = `أنت محلل محاسبي متخصص في تحليل محادثات واتساب لشركات مقاولات وبناء في اليمن.
السياق: رسائل واتساب بين مدراء مشاريع بناء وعمال ومقاولين. اللهجة يمنية.
المصطلحات الشائعة:
- "حق" = مستحقات/تكلفة (مثل: حق النجار = أجرة النجار)
- "سلفه/استلاف" = قرض مؤقت
- "أمانة/عند فلان" = مبلغ محفوظ عند شخص
- "حوالة/تحويل" = تحويل مالي عبر شركة صرافة
- "صبه" = صب خرسانة
- "مخاره" = عمل خراطة حديد
- "أبو فلان" = كنية شخص (اسم معروف)
- "الحوشبي/رشاد بحير/النجم" = شركات تحويل أموال
يجب أن تُخرج JSON فقط بدون أي نص إضافي أو شرح.`;

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
2. لا تستخرج أبداً: مواد بناء (حديد، خرسانة، إسمنت)، مركبات (شاص، هيلكس، دينا، قلاب)، أماكن ومواقع (الأبيار، المشروع)، أنشطة (نقل، نجارة، سباكة، مواصلات)، أدوات ومعدات
3. "حق الشاص" = تكلفة السيارة — "الشاص" ليس اسم شخص
4. "السبيات والنجاره والنقل" = أنشطة — ليست أسماء
5. "أبو فارس"، "وليد"، "زين العابدين" = أسماء أشخاص ✓
6. "شركة الحوشبي"، "رشاد بحير" = شركة/شخص ✓
7. الكُنى (أبو/أم + اسم) هي أسماء أشخاص

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

لكل رسالة تحتوي على معاملة مالية، حدد:
1. نوع المعاملة: تحويل (حوالة عبر شركة صرافة)، مصروف (شراء مواد/أجرة)، قرض (سلفة/استلاف)، أمانة (مبلغ محفوظ)، تسوية (حساب ختامي)، راتب
2. المبلغ بالأرقام (حوّل الأرقام الشرقية ٠١٢٣ للغربية 0123)
3. المرسل والمستلم (أسماء أشخاص/شركات)
4. وصف المعاملة
5. رقم التحويل إن وُجد
6. اسم شركة التحويل إن وُجد

قواعد:
- الرسائل التي تحتوي فقط على محادثة عامة (سلام، كيف الحال) ليست معاملات
- إذا ذُكر مبلغ مالي في سياق مالي واضح = معاملة
- "حق العامل 5000" = مصروف
- "حوالة 10000 رشاد بحير" = تحويل
- "سلفه 3000" = قرض

أخرج مصفوفة JSON:
[{"isTransaction": true, "transactionType": "تحويل|مصروف|قرض|أمانة|تسوية|راتب|غير_محدد", "amount": 0, "currency": "ريال", "sender": "", "recipient": "", "description": "", "transferNumber": "", "companyName": "", "confidence": 0.0-1.0, "evidence": "", "messageIndex": رقم}]

إذا لم تجد معاملات، أخرج: []`;

    const messageBlock = buildMessageBlock(batch);
    const userMessage = `حلل هذه الرسائل واستخرج المعاملات المالية:\n\n${messageBlock}`;

    const raw = await callAIWithRetry(systemPrompt, userMessage);
    if (!raw) continue;

    try {
      const parsed = parseJSONFromAI(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.isTransaction && typeof item.amount === 'number' && item.amount > 0) {
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
- إذا ذُكر اسم المشروع أو جزء منه في الرسالة = ثقة عالية
- إذا ذُكرت إشارات سياقية (موقع، عنوان، شخص مرتبط) = ثقة متوسطة
- إذا لم تجد أي إشارة واضحة = أخرج null

أخرج JSON واحد أو null:
{"projectId": "ID", "projectName": "اسم المشروع", "confidence": 0.0-1.0, "reason": "سبب الاختيار"}`;

  const userMessage = `حدد المشروع المتعلق بهذه الرسالة:\n\n${messageText.substring(0, 1000)}`;

  const raw = await callAIWithRetry(systemPrompt, userMessage);
  if (!raw) return null;

  try {
    const parsed = parseJSONFromAI(raw);
    if (parsed && parsed.projectId) {
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
