import type { WhatsAppSecurityContext } from "../WhatsAppSecurityContext";

export interface SuggestionContext {
  lastAction: string;
  workerName?: string;
  projectName?: string;
  security: WhatsAppSecurityContext;
  hasProjects: boolean;
  hasWorkers: boolean;
}

interface Suggestion {
  text: string;
  requiredPerm: 'read' | 'add' | 'none';
  requiresProjects?: boolean;
  requiresWorkers?: boolean;
}

const SUGGESTION_MAP: Record<string, Suggestion[]> = {
  worker_balance: [
    { text: 'أرسل *"كم باقي ل [اسم عامل]"* لرصيد عامل آخر', requiredPerm: 'read', requiresWorkers: true },
    { text: 'أرسل *"مصروف"* لإضافة مصروف جديد', requiredPerm: 'add' },
    { text: 'أرسل *"حالة المشاريع"* لعرض ملخص المشاريع', requiredPerm: 'read', requiresProjects: true },
  ],
  expense_saved: [
    { text: 'أرسل *"كم باقي ل {worker}"* لعرض رصيده', requiredPerm: 'read' },
    { text: 'أرسل *"كشف {worker}"* لتصدير كشف حسابه', requiredPerm: 'read' },
    { text: 'أرسل *"مصروف"* لإضافة مصروف جديد', requiredPerm: 'add' },
  ],
  expense_summary: [
    { text: 'أرسل *"تصدير كشف يومي"* لتصدير كشف {project}', requiredPerm: 'read', requiresProjects: true },
    { text: 'أرسل *"كم باقي ل [اسم العامل]"* لمعرفة رصيد عامل', requiredPerm: 'read', requiresWorkers: true },
    { text: 'أرسل *"مصروف"* لإضافة مصروف جديد', requiredPerm: 'add' },
  ],
  projects_status: [
    { text: 'أرسل *"تصدير"* لكشوفات مفصلة', requiredPerm: 'read' },
    { text: 'أرسل *"ملخص مصروفات"* لتفاصيل مشروع', requiredPerm: 'read', requiresProjects: true },
    { text: 'أرسل *"كم باقي ل [اسم العامل]"* لرصيد عامل', requiredPerm: 'read', requiresWorkers: true },
  ],
  export_done: [
    { text: 'أرسل *"كشف [اسم عامل]"* لتصدير كشف عامل آخر', requiredPerm: 'read', requiresWorkers: true },
    { text: 'أرسل *"حالة المشاريع"* لعرض ملخص المشاريع', requiredPerm: 'read', requiresProjects: true },
    { text: 'أرسل *"مصروف"* لإضافة مصروف جديد', requiredPerm: 'add' },
  ],
  balance_export_done: [
    { text: 'أرسل *"كشف [اسم عامل]"* لتصدير كشف عامل آخر', requiredPerm: 'read', requiresWorkers: true },
    { text: 'أرسل *"حالة المشاريع"* لعرض ملخص المشاريع', requiredPerm: 'read', requiresProjects: true },
    { text: 'أرسل *"مصروف"* لإضافة مصروف جديد', requiredPerm: 'add' },
  ],
  projects_list: [
    { text: 'أرسل *"حالة المشاريع"* لإحصائيات مفصلة', requiredPerm: 'read', requiresProjects: true },
    { text: 'أرسل *"تصدير"* لتصدير كشوفات', requiredPerm: 'read' },
    { text: 'أرسل *"مصروف"* لإضافة مصروف', requiredPerm: 'add' },
  ],
  worker_count: [
    { text: 'أرسل *"كم باقي ل [اسم العامل]"* لمعرفة رصيد عامل', requiredPerm: 'read', requiresWorkers: true },
    { text: 'أرسل *"حالة المشاريع"* لعرض ملخص المشاريع', requiredPerm: 'read', requiresProjects: true },
    { text: 'أرسل *"مصروف"* لإضافة مصروف', requiredPerm: 'add' },
  ],
  latest_expense: [
    { text: 'أرسل *"ملخص مصروفات"* لتفاصيل أكثر', requiredPerm: 'read', requiresProjects: true },
    { text: 'أرسل *"كم باقي ل [اسم العامل]"* لرصيد عامل', requiredPerm: 'read', requiresWorkers: true },
    { text: 'أرسل *"مصروف"* لإضافة مصروف جديد', requiredPerm: 'add' },
  ],
  top_worker: [
    { text: 'أرسل *"كم باقي ل [اسم العامل]"* لرصيد عامل', requiredPerm: 'read', requiresWorkers: true },
    { text: 'أرسل *"تصدير"* لتصدير كشوفات', requiredPerm: 'read' },
    { text: 'أرسل *"مصروف"* لإضافة مصروف جديد', requiredPerm: 'add' },
  ],
  greeting: [
    { text: 'أرسل *"حالة المشاريع"* لعرض ملخص المشاريع', requiredPerm: 'read', requiresProjects: true },
    { text: 'أرسل *"مصروف"* لإضافة مصروف', requiredPerm: 'add' },
    { text: 'أرسل *"تصدير"* لتصدير كشوفات', requiredPerm: 'read' },
    { text: 'أرسل *"مساعدة"* لعرض كل الأوامر', requiredPerm: 'none' },
  ],
};

export function buildSuggestions(ctx: SuggestionContext, maxCount: number = 3): string {
  const pool = SUGGESTION_MAP[ctx.lastAction];
  if (!pool || pool.length === 0) return '';

  const filtered = pool.filter(s => {
    if (s.requiredPerm === 'read' && !ctx.security.canRead) return false;
    if (s.requiredPerm === 'add' && !ctx.security.canAdd) return false;
    if (s.requiresProjects && !ctx.hasProjects) return false;
    if (s.requiresWorkers && !ctx.hasWorkers) return false;
    return true;
  });

  if (filtered.length === 0) return '';

  const lines = filtered.slice(0, maxCount).map(s => {
    let text = s.text;
    if (ctx.workerName) {
      text = text.replace(/\{worker\}/g, ctx.workerName);
    } else {
      text = text.replace(/\{worker\}/g, '[اسم العامل]');
    }
    if (ctx.projectName) {
      text = text.replace(/\{project\}/g, ctx.projectName);
    } else {
      text = text.replace(/\{project\}/g, 'المشروع');
    }
    return `• ${text}`;
  });

  return `\n💡 *اقتراحات:*\n${lines.join('\n')}`;
}
