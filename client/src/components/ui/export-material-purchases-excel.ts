import { createProfessionalReport } from '@/utils/axion-export';
import { format } from 'date-fns';

export async function exportMaterialPurchasesToExcel(purchases: any[]): Promise<boolean> {
  const totalAmount = purchases.reduce((sum, p) => sum + parseFloat(p.totalAmount || '0'), 0);
  const totalQuantity = purchases.reduce((sum, p) => sum + parseFloat(p.quantity || '0'), 0);

  const data = purchases.map((purchase, idx) => ({
    index: idx + 1,
    purchaseDate: purchase.purchaseDate ? format(new Date(purchase.purchaseDate), 'dd/MM/yyyy') : '',
    materialName: purchase.materialName || purchase.material?.name || '',
    supplierName: purchase.supplierName || '',
    projectName: purchase.projectName || purchase.project?.name || 'غير محدد',
    purchaseType: purchase.purchaseType || 'نقد',
    quantity: Number(purchase.quantity),
    unitPrice: Number(purchase.unitPrice),
    totalAmount: Number(purchase.totalAmount),
  }));

  return await createProfessionalReport({
    sheetName: 'مشتريات المواد',
    reportTitle: 'تقرير مشتريات المواد',
    subtitle: `تاريخ الإصدار: ${new Date().toLocaleDateString('en-GB')}`,
    infoLines: [
      `إجمالي المشتريات: ${purchases.length}`,
      `إجمالي الكميات: ${totalQuantity.toLocaleString('en-US')}`,
      `إجمالي المبالغ: ${totalAmount.toLocaleString('en-US')} ريال`
    ],
    columns: [
      { header: '#', key: 'index', width: 5 },
      { header: 'التاريخ', key: 'purchaseDate', width: 13 },
      { header: 'اسم المادة', key: 'materialName', width: 20 },
      { header: 'المورد', key: 'supplierName', width: 18 },
      { header: 'المشروع', key: 'projectName', width: 18 },
      { header: 'نوع الدفع', key: 'purchaseType', width: 12 },
      { header: 'الكمية', key: 'quantity', width: 10, numFmt: '#,##0' },
      { header: 'سعر الوحدة', key: 'unitPrice', width: 12, numFmt: '#,##0' },
      { header: 'المبلغ', key: 'totalAmount', width: 14, numFmt: '#,##0' },
    ],
    data,
    totals: {
      label: 'الإجماليات',
      values: {
        quantity: totalQuantity,
        totalAmount: totalAmount,
      }
    },
    signatures: [
      { title: 'توقيع أمين المستودع' },
      { title: 'توقيع المهندس المشرف' },
      { title: 'توقيع المدير العام' }
    ],
    fileName: `مشتريات_المواد_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.xlsx`,
  });
}
