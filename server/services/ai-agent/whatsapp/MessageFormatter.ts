export function bold(text: string, enabled?: boolean): string {
  if (enabled === false) return text;
  return `*${text}*`;
}

export function italic(text: string): string {
  return `_${text}_`;
}

export function monospace(text: string): string {
  return `\`\`\`${text}\`\`\``;
}

export function strikethrough(text: string): string {
  return `~${text}~`;
}

export function formatExpenseSummary(data: {
  workerName: string;
  projectName: string;
  amount: string;
  days: string;
  type: string;
  recordId?: string;
}): string {
  const lines = [
    `${bold('تم تسجيل المصروف بنجاح')} \u2705`,
    '',
    `\u{1F477} ${bold('العامل:')} ${data.workerName}`,
    `\u{1F3D7}\uFE0F ${bold('المشروع:')} ${data.projectName}`,
    `\u{1F4B0} ${bold('المبلغ:')} ${data.amount} ريال`,
    `\u{1F4C5} ${bold('الأيام:')} ${data.days}`,
    `\u{1F4CB} ${bold('النوع:')} ${data.type}`,
  ];

  if (data.recordId) {
    lines.push(`\u{1F522} ${bold('رقم السجل:')} ${data.recordId}`);
  }

  return lines.join('\n');
}

export function formatProjectList(projects: Array<{
  name: string;
  status: string;
  id?: string;
}>): string {
  if (projects.length === 0) {
    return `\u{1F4C2} ${bold('لا توجد مشاريع مرتبطة بحسابك حالياً.')}`;
  }

  const statusIcon: Record<string, string> = {
    active: '\u{1F7E2}',
    completed: '\u2705',
    paused: '\u{1F7E1}',
  };

  const statusText: Record<string, string> = {
    active: 'نشط',
    completed: 'مكتمل',
    paused: 'متوقف',
  };

  const header = `\u{1F4CA} ${bold(`مشاريعك (${projects.length})`)}`;
  const list = projects
    .map((p, i) => {
      const icon = statusIcon[p.status] || '\u26AA';
      const sText = statusText[p.status] || p.status;
      return `${i + 1}. ${icon} ${p.name} [${sText}]`;
    })
    .join('\n');

  return `${header}\n\n${list}`;
}

export function formatWorkerList(workers: Array<{
  name: string;
  type: string;
  dailyWage?: string;
}>): string {
  if (workers.length === 0) {
    return `\u{1F477} ${bold('لا يوجد عمال مسجلين حالياً.')}`;
  }

  const typeText: Record<string, string> = {
    master: 'معلم',
    worker: 'عامل',
  };

  const header = `\u{1F477} ${bold(`العمال (${workers.length})`)}`;
  const list = workers
    .map((w, i) => {
      const t = typeText[w.type] || w.type;
      const wage = w.dailyWage ? ` - ${w.dailyWage} ريال/يوم` : '';
      return `${i + 1}. ${w.name} (${t})${wage}`;
    })
    .join('\n');

  return `${header}\n\n${list}`;
}

export function formatConfirmation(message: string): string {
  return `\u2705 ${bold(message)}`;
}

export function formatError(message: string): string {
  return `\u274C ${bold(message)}`;
}

export function formatHelp(userName: string): string {
  return [
    `\u{1F4D6} ${bold(`مرحباً ${userName}!`)}`,
    '',
    `${bold('الأوامر المتاحة:')}`,
    '',
    `\u{1F4B0} ${bold('تسجيل مصروف:')} أرسل المبلغ مصاريف اسم_العامل`,
    `   ${italic('مثال: 5000 مصاريف أحمد')}`,
    '',
    `\u{1F4CA} ${bold('عرض المشاريع:')} أرسل "مشاريعي"`,
    '',
    `\u274C ${bold('إلغاء عملية:')} أرسل "إلغاء"`,
    '',
    `\u{1F3E0} ${bold('القائمة الرئيسية:')} أرسل "الرئيسية"`,
    '',
    `\u2B05\uFE0F ${bold('رجوع:')} أرسل "رجوع"`,
    '',
    italic('أو اكتب أي سؤال وسأحاول مساعدتك.'),
  ].join('\n');
}

export function formatProjectSelection(projects: Array<{
  name: string;
  id: string;
}>, workerName: string, amount: string): string {
  const header = `\u{1F477} ${bold('العامل:')} ${workerName}\n\u{1F4B0} ${bold('المبلغ:')} ${amount} ريال\n\n${bold('اختر المشروع:')}`;
  const list = projects
    .map((p, i) => `${i + 1}. ${p.name}`)
    .join('\n');

  return `${header}\n${list}`;
}

export function formatDaysPrompt(): string {
  return `\u{1F4C5} ${bold('كم عدد الأيام؟')}\n${italic('مثلاً: 1 أو 0.5')}`;
}

export function formatExpenseTypePrompt(): string {
  return [
    `\u{1F4CB} ${bold('ما هو نوع المصروف؟')}`,
    '',
    '1. أجور',
    '2. مواد',
    '3. تحويلة',
    '4. أخرى',
  ].join('\n');
}
