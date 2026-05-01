import type { DailyReportData } from './report-types';

export interface DailyTx {
  type: 'income' | 'expense' | 'deferred' | 'transfer_from_project';
  category: string;
  amount: number;
  workDays?: number;
  workerName?: string;
  /**
   * نوع العامل المرتبط بالمعاملة (إن وجد): 'معلم' / 'عامل' / 'مهندس' …
   * يُستخدم لترتيب الصفوف بحيث تأتي معاملات المهندس أولاً ثم المعلمين ثم العمال.
   */
  workerType?: string;
  description: string;
  recipientName?: string;
  notes?: string;
}

export function getAccountTypeLabel(type: string, category: string): string {
  if (category === 'رصيد سابق') return 'مرحل';
  if (type === 'income') return 'دخل';
  if (type === 'transfer_from_project') return 'دخل';
  if (category === 'أجور عمال') return 'أجور العمال';
  if (category === 'مواصلات') return 'مواصلات';
  if (category === 'حوالات عمال') return 'تنزيلات العمال';
  if (category === 'مشتريات مواد') return 'مشتريات';
  if (category === 'نثريات') return 'مصروفات';
  return 'مصروفات';
}

export function getEntryName(t: DailyTx): string {
  if (t.category === 'رصيد سابق') return 'مرحل';
  if (t.category === 'عهدة' && t.description) return t.description;
  if (t.workerName && t.workerName !== 'غير محدد') return t.workerName;
  if (t.description) return t.description;
  if (t.recipientName) return t.recipientName;
  return t.category || '-';
}

export interface RowColors {
  bg: string;
  bgDark: string;
}

export function getRowColors(type: string, category: string, isNeg: boolean): RowColors | null {
  if (category === 'رصيد سابق' && !isNeg) return { bg: '#d6ead7', bgDark: 'rgba(34,197,94,0.15)' };
  if (category === 'رصيد سابق' && isNeg)  return { bg: '#fce4e4', bgDark: 'rgba(239,68,68,0.15)' };
  if (type === 'transfer_from_project')   return { bg: '#fff0cc', bgDark: 'rgba(234,179,8,0.15)' };
  if (type === 'income')                  return { bg: '#daeaf5', bgDark: 'rgba(59,130,246,0.15)' };
  if (category === 'مشتريات مواد')        return { bg: '#eee8f8', bgDark: 'rgba(168,85,247,0.15)' };
  return null;
}

export function buildDailyTransactions(data: DailyReportData, dateStr: string): DailyTx[] {
  const txs: DailyTx[] = [];

  const carried = Number(
    (data as any).carryForwardBalance ??
    (data as any).carriedForwardBalance ??
    (data.totals as any)?.carryForwardBalance ??
    0
  );

  if (carried !== 0) {
    const prevDateObj = new Date(dateStr);
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const pd = prevDateObj.toISOString().split('T')[0];
    txs.push({
      type: carried >= 0 ? 'income' : 'expense',
      category: 'رصيد سابق',
      amount: Math.abs(carried),
      description: 'رصيد مرحل',
      notes: `مرحل من تاريخ ${pd}`,
    });
  }

  (data.fundTransfers || []).forEach((f: any) => {
    const noteParts: string[] = [];
    if (f.transferType && f.transferType !== '-') noteParts.push(`نوع: ${f.transferType}`);
    if (f.transferNumber && f.transferNumber !== '-') noteParts.push(`رقم الحوالة: ${f.transferNumber}`);
    txs.push({
      type: 'income',
      category: 'عهدة',
      amount: parseFloat(f.amount || '0'),
      description: `عهدة من ${f.senderName || 'غير محدد'}`,
      recipientName: f.senderName,
      notes: noteParts.join(' | ') || '',
    });
  });

  (data.attendance || []).forEach((a: any) => {
    const paid = parseFloat(a.paidAmount || '0');
    const payable = parseFloat(a.payableAmount || '0');
    txs.push({
      type: paid === 0 && payable > 0 ? 'deferred' : 'expense',
      category: 'أجور عمال',
      amount: paid,
      description: a.workDescription || 'أجر يومي',
      workerName: a.workerName || a.worker_name || 'غير محدد',
      workerType: a.workerType || a.worker_type || undefined,
      workDays: parseFloat(a.workDays || a.work_days || '0') || undefined,
      notes: a.notes || a.workDescription || '',
    });
  });

  (data.materials || []).forEach((m: any) => {
    const isCash = (m.purchaseType || 'نقد') === 'نقد' || m.purchaseType === 'نقداً';
    if (!isCash) return;
    const paid = parseFloat(m.paidAmount || '0');
    const total = parseFloat(m.totalAmount || '0');
    txs.push({
      type: 'expense',
      category: 'مشتريات مواد',
      amount: paid > 0 ? paid : total,
      description: `شراء ${m.materialName || 'مادة'}`,
      notes: m.notes || m.materialName || m.supplier || m.supplierName || '',
    });
  });

  (data.transport || []).forEach((t: any) => {
    txs.push({
      type: 'expense',
      category: 'مواصلات',
      amount: parseFloat(t.amount || '0'),
      description: t.description || 'مصروف مواصلات',
      notes: t.notes || t.description || '',
    });
  });

  (data.miscExpenses || []).forEach((e: any) => {
    txs.push({
      type: 'expense',
      category: 'نثريات',
      amount: parseFloat(e.amount || '0'),
      description: e.description || 'مصروف متنوع',
      notes: e.notes || e.description || '',
    });
  });

  (data.workerTransfers || []).forEach((wt: any) => {
    txs.push({
      type: 'expense',
      category: 'حوالات عمال',
      amount: parseFloat(wt.amount || '0'),
      description: wt.notes || 'حوالة للعامل',
      workerName: wt.workerName || wt.worker_name || 'غير محدد',
      workerType: wt.workerType || wt.worker_type || undefined,
      notes: wt.notes || wt.description || '',
    });
  });

  return txs;
}

/**
 * 🧮 دمج صرفة العامل + حوالة العامل في صف واحد لأغراض **العرض في القالب فقط**.
 *
 * عندما يوجد لنفس العامل في نفس اليوم سجل من فئة "أجور عمال" وسجل من
 * فئة "حوالات عمال"، نُنتج سطراً واحداً مدمجاً بفئة "أجور عمال" مبلغه
 * مجموع المبلغين، ونُضيف للملاحظات نص: "صرفة {wage} + حوالة {transfer}".
 *
 * - النظام (DB) يبقى كما هو — هذا تحويل عرضي فقط على مصفوفة الصفوف.
 * - الصفوف التي ليس لها workerName صالح تمر دون تغيير.
 * - إن وجد للعامل أكثر من سجل أجور أو أكثر من حوالة في نفس اليوم،
 *   يتم تجميعها كلها معاً.
 *
 * يقبل أي شكل من الصفوف يحتوي الحقول: category, amount, workerName, notes,
 * workDays, type — ويعيد مصفوفة جديدة بنفس الشكل.
 */
export function mergeWorkerWageAndTransferForTemplate<T extends {
  category?: string;
  amount?: number;
  workerName?: string;
  notes?: string;
  workDays?: number;
  type?: string;
}>(rows: T[]): T[] {
  if (!Array.isArray(rows) || rows.length === 0) return rows;

  const fmt = (n: number) => Number(n || 0).toLocaleString('en-US');
  const result: T[] = [];
  const wageIndexByWorker = new Map<string, number>();
  const pendingTransfersByWorker = new Map<string, number[]>();
  const transferIndicesByWorker = new Map<string, number[]>();

  // الجولة 1: نسخ الصفوف، وتسجيل أول صف "أجور عمال" لكل عامل
  rows.forEach((r) => {
    const worker = (r.workerName || '').trim();
    const isValidWorker = worker && worker !== 'غير محدد';
    if (isValidWorker && r.category === 'أجور عمال') {
      // إذا كان هناك سجل أجور سابق لنفس العامل، نجمع المبلغ في الأول
      const existingIdx = wageIndexByWorker.get(worker);
      if (existingIdx != null) {
        const existing: any = result[existingIdx];
        existing.amount = Number(existing.amount || 0) + Number(r.amount || 0);
        return;
      }
      wageIndexByWorker.set(worker, result.length);
    }
    result.push({ ...r });
  });

  // الجولة 2: تجميع الحوالات لكل عامل وإزالتها من النتيجة
  const toRemove = new Set<number>();
  result.forEach((r, idx) => {
    const worker = (r.workerName || '').trim();
    const isValidWorker = worker && worker !== 'غير محدد';
    if (isValidWorker && r.category === 'حوالات عمال') {
      if (!pendingTransfersByWorker.has(worker)) {
        pendingTransfersByWorker.set(worker, []);
        transferIndicesByWorker.set(worker, []);
      }
      pendingTransfersByWorker.get(worker)!.push(Number(r.amount || 0));
      transferIndicesByWorker.get(worker)!.push(idx);
    }
  });

  // الجولة 3: دمج الحوالة في سجل الأجور إن وُجد
  pendingTransfersByWorker.forEach((amounts, worker) => {
    const wageIdx = wageIndexByWorker.get(worker);
    if (wageIdx == null) return; // لا يوجد سجل أجور — اترك الحوالة كما هي
    const wageRow: any = result[wageIdx];
    const wageAmt = Number(wageRow.amount || 0);
    const transferTotal = amounts.reduce((s, a) => s + a, 0);
    wageRow.amount = wageAmt + transferTotal;
    const breakdown = `صرفة ${fmt(wageAmt)} + حوالة ${fmt(transferTotal)}`;
    wageRow.notes = wageRow.notes && wageRow.notes.trim()
      ? `${wageRow.notes.trim()} | ${breakdown}`
      : breakdown;
    transferIndicesByWorker.get(worker)!.forEach(i => toRemove.add(i));
  });

  if (toRemove.size === 0) return result;
  return result.filter((_, i) => !toRemove.has(i));
}

/**
 * يرتّب المعاملات اليومية بالترتيب التالي:
 *   1) الرصيد المرحّل
 *   2) الدخل / العهد / الترحيل الوارد
 *   3) معاملات المهندس (يكتشف عبر workerType='مهندس' أو ذكر "مهندس" في الوصف/الملاحظات)
 *   4) المعلمين (workerType='معلم')
 *   5) العمال (workerType='عامل')
 *   6) باقي المصروفات (مشتريات، نثريات، حوالات بدون نوع، …)
 */
export function orderDailyTransactions(txs: DailyTx[]): DailyTx[] {
  const isEngineerRelated = (t: DailyTx): boolean => {
    if ((t.workerType || '').includes('مهندس')) return true;
    const blob = `${t.description || ''} ${t.notes || ''} ${t.workerName || ''}`;
    return /مهندس|هندسي/.test(blob);
  };
  const isMaster = (t: DailyTx): boolean => (t.workerType || '').includes('معلم');
  const isWorker = (t: DailyTx): boolean => {
    const wt = t.workerType || '';
    if (wt.includes('معلم') || wt.includes('مهندس')) return false;
    if (wt.includes('عامل')) return true;
    // إذا لم نعرف نوعه لكن السجل من فئة أجور/حوالات عمال ولديه اسم عامل،
    // نعتبره عاملاً افتراضياً.
    return (t.category === 'أجور عمال' || t.category === 'حوالات عمال') && !!t.workerName;
  };

  const opening = txs.filter(t => t.category === 'رصيد سابق');
  const income  = txs.filter(t => t.category !== 'رصيد سابق' && (t.type === 'income' || t.type === 'transfer_from_project'));
  const expenseAll = txs.filter(t => t.category !== 'رصيد سابق' && t.type !== 'income' && t.type !== 'transfer_from_project');

  const engineerExp: DailyTx[] = [];
  const masterExp:   DailyTx[] = [];
  const workerExp:   DailyTx[] = [];
  const otherExp:    DailyTx[] = [];

  for (const t of expenseAll) {
    if (isEngineerRelated(t))      engineerExp.push(t);
    else if (isMaster(t))          masterExp.push(t);
    else if (isWorker(t))          workerExp.push(t);
    else                            otherExp.push(t);
  }

  return [...opening, ...income, ...engineerExp, ...masterExp, ...workerExp, ...otherExp];
}

export interface DailyTxWithRunning extends DailyTx {
  running: number;
  isOpening: boolean;
  isNegOpening: boolean;
}

export function computeRunningBalance(orderedTxs: DailyTx[]): { rows: DailyTxWithRunning[]; finalBalance: number } {
  let running = 0;
  const rows: DailyTxWithRunning[] = orderedTxs.map(t => {
    const isOpening = t.category === 'رصيد سابق';
    const isNegOpening = isOpening && t.type === 'expense';
    const amt = t.amount || 0;
    if (isOpening && !isNegOpening) running += amt;
    else if (isNegOpening) running -= amt;
    else if (t.type === 'income' || t.type === 'transfer_from_project') running += amt;
    else running -= amt;
    return { ...t, running, isOpening, isNegOpening };
  });
  return { rows, finalBalance: running };
}
