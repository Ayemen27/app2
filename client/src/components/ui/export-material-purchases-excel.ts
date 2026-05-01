import { createProfessionalReport } from '@/utils/axion-export';
import { format } from 'date-fns';

const NON_FINANCIAL_TYPES = ['صرف مخزن', 'نقل مواد مستهلكة', 'نقل أصل'];

function classifyType(t?: string): string {
  const v = (t || '').trim();
  if (!v) return 'مالي';
  if (NON_FINANCIAL_TYPES.includes(v)) return 'توثيق (بدون أثر مالي)';
  return 'مالي';
}

export async function exportMaterialPurchasesToExcel(purchases: any[]): Promise<boolean> {
  // فصل المشتريات المالية عن سجلات النقل/الصرف للتوثيق
  const financialPurchases = purchases.filter(p => !NON_FINANCIAL_TYPES.includes(p.purchaseType));
  const transferConsumable = purchases.filter(p => p.purchaseType === 'نقل مواد مستهلكة');
  const transferAsset = purchases.filter(p => p.purchaseType === 'نقل أصل');
  const issueFromStock = purchases.filter(p => p.purchaseType === 'صرف مخزن');

  const financialTotal = financialPurchases.reduce((sum, p) => sum + parseFloat(p.totalAmount || '0'), 0);
  const totalQuantity = purchases.reduce((sum, p) => sum + parseFloat(p.quantity || '0'), 0);
  const financialQty = financialPurchases.reduce((sum, p) => sum + parseFloat(p.quantity || '0'), 0);

  const data = purchases.map((purchase, idx) => ({
    index: idx + 1,
    purchaseDate: purchase.purchaseDate ? format(new Date(purchase.purchaseDate), 'dd/MM/yyyy') : '',
    materialName: purchase.materialName || purchase.material?.name || '',
    supplierName: purchase.supplierName || '',
    projectName: purchase.projectName || purchase.project?.name || 'غير محدد',
    purchaseType: purchase.purchaseType || 'نقد',
    classification: classifyType(purchase.purchaseType),
    quantity: Number(purchase.quantity),
    unitPrice: Number(purchase.unitPrice),
    totalAmount: Number(purchase.totalAmount),
  }));

  return await createProfessionalReport({
    sheetName: 'مشتريات المواد',
    reportTitle: 'تقرير مشتريات المواد',
    subtitle: `تاريخ الإصدار: ${new Date().toLocaleDateString('en-GB')}`,
    infoLines: [
      `إجمالي السجلات: ${purchases.length}`,
      `سجلات مالية فعلية: ${financialPurchases.length}`,
      `سجلات نقل/صرف (توثيق فقط): ${transferConsumable.length + transferAsset.length + issueFromStock.length}`,
      `   - مواد منقولة من مشاريع: ${transferConsumable.length}`,
      `   - أصول منقولة من مشاريع: ${transferAsset.length}`,
      `   - صرف من المخزن: ${issueFromStock.length}`,
      `إجمالي الكميات (شامل النقل): ${totalQuantity.toLocaleString('en-US')}`,
      `إجمالي الكميات (مالية فقط): ${financialQty.toLocaleString('en-US')}`,
      `إجمالي المبالغ (مالية فقط): ${financialTotal.toLocaleString('en-US')} ريال`,
      `ملاحظة: سجلات النقل/الصرف للتوثيق فقط ولا تُحتسب ضمن المصاريف`,
    ],
    columns: [
      { header: '#', key: 'index', width: 5 },
      { header: 'التاريخ', key: 'purchaseDate', width: 13 },
      { header: 'اسم المادة', key: 'materialName', width: 20 },
      { header: 'المورد/المصدر', key: 'supplierName', width: 22 },
      { header: 'المشروع', key: 'projectName', width: 18 },
      { header: 'نوع الدفع', key: 'purchaseType', width: 18 },
      { header: 'التصنيف', key: 'classification', width: 22 },
      { header: 'الكمية', key: 'quantity', width: 10, numFmt: '#,##0' },
      { header: 'سعر الوحدة', key: 'unitPrice', width: 12, numFmt: '#,##0' },
      { header: 'المبلغ', key: 'totalAmount', width: 14, numFmt: '#,##0' },
    ],
    data,
    totals: {
      label: 'الإجماليات (الفعلية المالية فقط)',
      values: {
        quantity: financialQty,
        totalAmount: financialTotal,
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
