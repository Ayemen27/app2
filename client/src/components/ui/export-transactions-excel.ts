import { createProfessionalReport } from '@/utils/axion-export';

interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense' | 'deferred' | 'transfer_from_project';
  category: string;
  amount: number;
  description: string;
  projectId?: string;
  projectName?: string;
  workDays?: number;
  dailyWage?: number;
  workerName?: string;
  transferMethod?: string;
  recipientName?: string;
  quantity?: number;
  unitPrice?: number;
  paymentType?: string;
  supplierName?: string;
  materialName?: string;
  payableAmount?: number;
}

interface Totals {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'income': 'دخل',
    'expense': 'مصروف',
    'deferred': 'آجل',
    'transfer_from_project': 'ترحيل وارد'
  };
  return labels[type] || type;
};

const TYPE_COLORS: Record<string, string> = {
  income: 'FF008000',
  transfer_from_project: 'FF008000',
  expense: 'FFFF0000',
  deferred: 'FFFF8C00',
};

export async function exportTransactionsToExcel(
  transactions: Transaction[],
  totals: Totals,
  formatCurrency: (amount: number) => string,
  projectName?: string
): Promise<boolean> {
  const data = transactions.map((t, idx) => ({
    index: idx + 1,
    date: new Date(t.date).toLocaleDateString('en-GB'),
    type: getTypeLabel(t.type),
    category: t.category,
    projectName: t.projectName || 'غير محدد',
    nameField: t.workerName || t.materialName || (t.description !== '-' ? t.description : '-') || '-',
    workDays: t.workDays || '-',
    dailyWage: t.dailyWage || '-',
    payableAmount: t.payableAmount || '-',
    quantity: t.quantity || '-',
    unitPrice: t.unitPrice || '-',
    paymentType: t.paymentType || '-',
    recipient: t.supplierName || t.recipientName || '-',
    transferMethod: t.transferMethod || '-',
    amount: t.amount,
    _type: t.type,
    _payableAmount: t.payableAmount,
  }));

  const balanceColor = totals.balance >= 0 ? 'FF008000' : 'FFFF0000';

  return await createProfessionalReport({
    sheetName: 'سجل العمليات',
    reportTitle: projectName
      ? `سجل العمليات - ${projectName}`
      : 'سجل العمليات - جميع المشاريع',
    subtitle: `تاريخ الإصدار: ${new Date().toLocaleDateString('en-GB')}`,
    summaryRows: [
      { label: 'إجمالي الدخل', value: `${totals.totalIncome.toLocaleString('en-US')} ر.ي` },
      { label: 'إجمالي المصروفات', value: `${totals.totalExpenses.toLocaleString('en-US')} ر.ي` },
      { label: 'الرصيد الصافي', value: `${totals.balance.toLocaleString('en-US')} ر.ي`, valueColor: balanceColor },
    ],
    infoLines: [`عدد العمليات: ${transactions.length}`],
    columns: [
      { header: '#', key: 'index', width: 5 },
      { header: 'التاريخ', key: 'date', width: 12 },
      { header: 'النوع', key: 'type', width: 10 },
      { header: 'الفئة', key: 'category', width: 14 },
      { header: 'المشروع', key: 'projectName', width: 14 },
      { header: 'اسم العامل/المادة', key: 'nameField', width: 16 },
      { header: 'عدد الأيام', key: 'workDays', width: 10, numFmt: '#,##0.0' },
      { header: 'الأجر اليومي', key: 'dailyWage', width: 11, numFmt: '#,##0' },
      { header: 'المستحقات', key: 'payableAmount', width: 13, numFmt: '#,##0' },
      { header: 'الكمية', key: 'quantity', width: 8, numFmt: '#,##0' },
      { header: 'سعر الوحدة', key: 'unitPrice', width: 10, numFmt: '#,##0' },
      { header: 'نوع الدفع', key: 'paymentType', width: 9 },
      { header: 'المورد/المستلم', key: 'recipient', width: 14 },
      { header: 'طريقة التحويل', key: 'transferMethod', width: 11 },
      { header: 'المبلغ المدفوع', key: 'amount', width: 13, numFmt: '#,##0' },
    ],
    data,
    totals: {
      label: `إجمالي العمليات: ${transactions.length}`,
      values: { amount: totals.totalExpenses + totals.totalIncome }
    },
    cellStyleFn: (record, colKey) => {
      const t = record._type as string;
      if (colKey === 'type' || colKey === 'amount') {
        return { fontColor: TYPE_COLORS[t] || undefined, bold: colKey === 'amount' };
      }
      if (colKey === 'payableAmount' && record._payableAmount && record.amount === 0) {
        return { fontColor: 'FFFF6600', bold: true };
      }
      return null;
    },
    signatures: [
      { title: 'توقيع المهندس' },
      { title: 'توقيع مدير المشروع' },
      { title: 'توقيع المدير العام' }
    ],
    fileName: `سجل_العمليات_${projectName ? projectName + '_' : ''}${new Date().toISOString().split('T')[0]}.xlsx`,
  });
}
