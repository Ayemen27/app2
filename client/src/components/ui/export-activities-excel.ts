import { createProfessionalReport } from '@/utils/axion-export';

interface ActivityItem {
  id?: number;
  actionType: string;
  actionLabel?: string;
  userName?: string;
  projectName?: string;
  amount?: number;
  description?: string;
  createdAt: string;
}

const getActionLabel = (actionType: string): string => {
  const labels: Record<string, string> = {
    'transfer': 'تحويل',
    'expense': 'مصروف',
    'income': 'دخل',
    'attendance': 'حضور',
    'material': 'مواد',
    'transport': 'نقل',
    'payment': 'دفعة'
  };
  return labels[actionType] || actionType;
};

export async function exportActivitiesToExcel(
  activities: ActivityItem[],
  formatCurrency: (amount: number) => string
): Promise<void> {
  let totalAmount = 0;
  const data = activities.map((activity, idx) => {
    const dateTime = new Date(activity.createdAt);
    const formattedDate = dateTime.toLocaleDateString('en-GB');
    const formattedTime = dateTime.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    if (activity.amount) totalAmount += activity.amount;

    return {
      index: idx + 1,
      actionLabel: activity.actionLabel || getActionLabel(activity.actionType),
      userName: activity.userName || 'النظام',
      projectName: activity.projectName || 'الكل',
      amount: activity.amount || 0,
      description: activity.description || '-',
      dateTime: `${formattedDate} ${formattedTime}`,
    };
  });

  await createProfessionalReport({
    sheetName: 'سجل النشاطات',
    reportTitle: 'سجل العمليات والنشاطات',
    subtitle: `تاريخ الإصدار: ${new Date().toLocaleDateString('en-GB')}`,
    infoLines: [`إجمالي العمليات: ${activities.length}`, `إجمالي المبالغ: ${totalAmount.toLocaleString('en-US')} ريال`],
    columns: [
      { header: '#', key: 'index', width: 6 },
      { header: 'نوع العملية', key: 'actionLabel', width: 15 },
      { header: 'المستخدم', key: 'userName', width: 18 },
      { header: 'المشروع', key: 'projectName', width: 20 },
      { header: 'المبلغ', key: 'amount', width: 18, numFmt: '#,##0' },
      { header: 'الوصف', key: 'description', width: 30 },
      { header: 'التاريخ والوقت', key: 'dateTime', width: 22 },
    ],
    data,
    totals: {
      label: `إجمالي العمليات: ${activities.length}`,
      values: { amount: totalAmount }
    },
    signatures: [
      { title: 'توقيع المهندس' },
      { title: 'توقيع المدير العام' }
    ],
    fileName: `سجل_النشاطات_${new Date().toISOString().split('T')[0]}.xlsx`,
  });
}
