import type { DailyReportData } from './report-types';

export interface DailyTx {
  type: 'income' | 'expense' | 'deferred' | 'transfer_from_project';
  category: string;
  amount: number;
  workDays?: number;
  workerName?: string;
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
      notes: wt.notes || wt.description || '',
    });
  });

  return txs;
}

export function orderDailyTransactions(txs: DailyTx[]): DailyTx[] {
  const opening = txs.filter(t => t.category === 'رصيد سابق');
  const income  = txs.filter(t => t.category !== 'رصيد سابق' && (t.type === 'income' || t.type === 'transfer_from_project'));
  const expense = txs.filter(t => t.category !== 'رصيد سابق' && t.type !== 'income' && t.type !== 'transfer_from_project');
  return [...opening, ...income, ...expense];
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
