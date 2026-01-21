import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { isMobile } from 'react-device-detect';

// تسجيل خط يدعم اللغة العربية (Cairo)
Font.register({
  family: 'Cairo',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/cairo/v28/SLXGc1nu6Hxc33eS9mFb.ttf', fontWeight: 'normal' },
    { src: 'https://fonts.gstatic.com/s/cairo/v28/SLXGc1nu6Hxc33eS9mFb.ttf', fontWeight: 'bold' }
  ]
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Cairo',
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#1E3A8A',
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
    textAlign: 'center',
  },
  companyName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
    textAlign: 'center',
  },
  reportTitle: {
    color: '#E2E8F0',
    fontSize: 12,
    textAlign: 'center',
  },
  infoGrid: {
    marginBottom: 15,
    borderBottom: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
  },
  infoItem: {
    width: '50%',
    padding: 3,
    fontSize: 9,
    textAlign: 'right',
  },
  label: {
    color: '#1E3A8A',
    fontWeight: 'bold',
  },
  table: {
    width: '100%',
    marginTop: 5,
    flexDirection: 'column',
  },
  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: '#334155',
    padding: 6,
    borderBottom: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableHeaderCell: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row-reverse',
    borderBottom: 1,
    borderBottomColor: '#F1F5F9',
    padding: 5,
    minHeight: 25,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 7,
    textAlign: 'center',
    flex: 1,
    color: '#1E293B',
  },
  summarySection: {
    marginTop: 20,
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  summaryBox: {
    width: 180,
    border: 1,
    borderColor: '#1E3A8A',
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    padding: 6,
    borderBottom: 1,
    borderBottomColor: '#E2E8F0',
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  summaryValue: {
    fontSize: 9,
    textAlign: 'left',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 7,
    color: '#94A3B8',
    borderTop: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  }
});

const WorkerStatementDocument = ({ data, worker }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.companyName}>شركة الفتيني للمقاولات العامة</Text>
        <Text style={styles.reportTitle}>كشف حساب مالي تفصيلي للموظف</Text>
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Text><Text style={styles.label}>اسم الموظف: </Text>{worker?.name || '-'}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text><Text style={styles.label}>المشروع: </Text>{data?.projectName || 'جميع المشاريع'}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text><Text style={styles.label}>المسمى الوظيفي: </Text>{worker?.type || 'عامل'}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text><Text style={styles.label}>تاريخ التقرير: </Text>{format(new Date(), 'yyyy/MM/dd')}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderCell}>التاريخ</Text>
          <Text style={styles.tableHeaderCell}>اليوم</Text>
          <Text style={styles.tableHeaderCell}>المشروع</Text>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>تفاصيل العمل</Text>
          <Text style={styles.tableHeaderCell}>مستحق (+)</Text>
          <Text style={styles.tableHeaderCell}>مدفوع (-)</Text>
        </View>
        
        {(data?.statement || []).map((item: any, index: number) => (
          <View key={index} style={[styles.tableRow, index % 2 === 0 ? { backgroundColor: '#F8FAFC' } : {}]} wrap={false}>
            <Text style={styles.tableCell}>{item.date ? format(new Date(item.date), 'yyyy/MM/dd') : '-'}</Text>
            <Text style={styles.tableCell}>{item.date ? format(new Date(item.date), 'EEEE', { locale: arSA }) : '-'}</Text>
            <Text style={styles.tableCell}>{item.projectName || '-'}</Text>
            <Text style={[styles.tableCell, { flex: 2, textAlign: 'right', paddingRight: 5 }]}>{item.description || 'تنفيذ مهام العمل'}</Text>
            <Text style={[styles.tableCell, { color: '#10B981', fontWeight: 'bold' }]}>{parseFloat(item.amount || 0).toLocaleString()}</Text>
            <Text style={[styles.tableCell, { color: '#F43F5E', fontWeight: 'bold' }]}>{parseFloat(item.paid || 0).toLocaleString()}</Text>
          </View>
        ))}
      </View>

      <View style={styles.summarySection} wrap={false}>
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>إجمالي المستحقات:</Text>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>{parseFloat(data?.summary?.totalEarned || 0).toLocaleString()} ر.ي</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>إجمالي المدفوعات:</Text>
            <Text style={[styles.summaryValue, { color: '#F43F5E' }]}>{parseFloat(data?.summary?.totalPaid || 0).toLocaleString()} ر.ي</Text>
          </View>
          <View style={[styles.summaryRow, { backgroundColor: '#DBEAFE', borderBottomWidth: 0 }]}>
            <Text style={styles.summaryLabel}>الرصيد المتبقي:</Text>
            <Text style={[styles.summaryValue, { color: '#1E3A8A', fontWeight: 'bold' }]}>{parseFloat(data?.summary?.finalBalance || 0).toLocaleString()} ر.ي</Text>
          </View>
        </View>
      </View>

      <Text style={styles.footer} fixed>
        تم توليد هذا التقرير آلياً عبر نظام إدارة شركة الفتيني. تاريخ الاستخراج: {format(new Date(), 'yyyy/MM/dd HH:mm')}
      </Text>
    </Page>
  </Document>
);

export const generateWorkerPDF = async (data: any, worker: any) => {
  try {
    if (!data || !data.statement) {
       console.error("No data provided for PDF generation");
       return;
    }
    
    console.log("Starting PDF generation for:", worker?.name);
    
    // إنشاء مستند PDF كـ Blob
    const doc = <WorkerStatementDocument data={data} worker={worker} />;
    const blob = await pdf(doc).toBlob();
    
    const fileName = `كشف_حساب_${(worker?.name || 'عامل').replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    
    if (isMobile) {
      // للهواتف: استخدام URL.createObjectURL وفتح في نافذة جديدة أو استخدام saveAs
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      link.setAttribute('target', '_blank'); // مهم لنظام iOS
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // لسطح المكتب: استخدام saveAs المباشر
      saveAs(blob, fileName);
    }
    
    console.log("PDF download triggered successfully");
  } catch (error) {
    console.error("Critical PDF Generation Error:", error);
    // محاولة طباعة HTML كحل أخير إذا فشل الـ PDF
    window.print();
  }
};
