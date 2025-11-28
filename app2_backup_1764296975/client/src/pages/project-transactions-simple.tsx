import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, TrendingUp, TrendingDown, DollarSign, Building, Clock, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { StatsGrid } from '@/components/ui/stats-grid';

interface Project {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense' | 'deferred' | 'transfer_from_project';
  category: string;
  amount: number;
  description: string;
}

export default function ProjectTransactionsSimple() {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // جلب المشاريع
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // جلب تحويلات العهدة العادية للمشروع
  const { data: fundTransfers = [], isLoading: fundTransfersLoading, error: fundTransfersError } = useQuery({
    queryKey: ['/api/projects', selectedProject, 'fund-transfers'],
    queryFn: async () => {
      if (!selectedProject) return [];
      try {
        console.log(`🔄 جلب تحويلات العهدة للمشروع: ${selectedProject}`);
        const response = await fetch(`/api/projects/${selectedProject}/fund-transfers`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
          }
        });
        if (!response.ok) {
          if (response.status === 401) {
            console.error('❌ غير مصرح - يرجى تسجيل الدخول مرة أخرى');
            return [];
          }
          console.error(`❌ خطأ في جلب تحويلات العهدة: ${response.status}`);
          return [];
        }
        const data = await response.json();
        console.log(`✅ تم جلب ${Array.isArray(data?.data) ? data.data.length : 0} تحويل عهدة`);
        return Array.isArray(data?.data) ? data.data : [];
      } catch (error) {
        console.error('❌ خطأ في جلب تحويلات العهدة:', error);
        return [];
      }
    },
    enabled: !!selectedProject,
    retry: 1,
    staleTime: 30000,
  });

  // جلب التحويلات بين المشاريع (الواردة) - فقط إذا كانت موجودة فعلياً
  const { data: incomingProjectTransfers = [], isLoading: incomingTransfersLoading, error: incomingTransfersError } = useQuery({
    queryKey: ['/api/projects', selectedProject, 'fund-transfers', 'incoming'],
    queryFn: async () => {
      if (!selectedProject) return [];
      try {
        console.log(`🔄 جلب التحويلات الواردة للمشروع: ${selectedProject}`);
        const response = await fetch(`/api/projects/fund-transfers/incoming/${selectedProject}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
          }
        });
        if (!response.ok) {
          if (response.status === 401) {
            console.error('❌ غير مصرح - يرجى تسجيل الدخول مرة أخرى');
            return [];
          }
          console.error(`❌ خطأ في جلب التحويلات الواردة: ${response.status}`);
          return [];
        }
        const data = await response.json();
        const transfers = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        console.log(`✅ تم جلب ${transfers.length} تحويل وارد فعلي`);

        // تسجيل التحويلات للتشخيص
        if (transfers.length > 0) {
          console.log('🔍 التحويلات الواردة:', transfers.map(t => ({
            من: t.fromProjectName,
            إلى: t.toProjectName,
            المبلغ: t.amount,
            التاريخ: t.transferDate
          })));
        }

        return transfers;
      } catch (error) {
        console.error('❌ خطأ في جلب التحويلات الواردة:', error);
        return [];
      }
    },
    enabled: !!selectedProject,
    retry: 1,
    staleTime: 30000,
  });

  // جلب التحويلات بين المشاريع (الصادرة)
  const { data: outgoingProjectTransfers = [], isLoading: outgoingTransfersLoading, error: outgoingTransfersError } = useQuery({
    queryKey: ['/api/projects', selectedProject, 'fund-transfers', 'outgoing'],
    queryFn: async () => {
      if (!selectedProject) return [];
      try {
        console.log(`🔄 جلب التحويلات الصادرة للمشروع: ${selectedProject}`);
        const response = await fetch(`/api/projects/fund-transfers/outgoing/${selectedProject}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
          }
        });
        if (!response.ok) {
          if (response.status === 401) {
            console.error('❌ غير مصرح - يرجى تسجيل الدخول مرة أخرى');
            return [];
          }
          console.error(`❌ خطأ في جلب التحويلات الصادرة: ${response.status}`);
          return [];
        }
        const data = await response.json();
        const transfers = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        console.log(`✅ تم جلب ${transfers.length} تحويل صادر فعلي`);

        // تسجيل التحويلات للتشخيص
        if (transfers.length > 0) {
          console.log('🔍 التحويلات الصادرة:', transfers.map(t => ({
            من: t.fromProjectName,
            إلى: t.toProjectName,
            المبلغ: t.amount,
            التاريخ: t.transferDate
          })));
        }

        return transfers;
      } catch (error) {
        console.error('❌ خطأ في جلب التحويلات الصادرة:', error);
        return [];
      }
    },
    enabled: !!selectedProject,
    retry: 1,
    staleTime: 30000,
  });

  // جلب حضور العمال للمشروع
  const { data: workerAttendance = [], isLoading: attendanceLoading, error: attendanceError } = useQuery({
    queryKey: ['/api/projects', selectedProject, 'attendance'],
    queryFn: async () => {
      if (!selectedProject) return [];
      try {
        console.log(`🔄 جلب حضور العمال للمشروع: ${selectedProject}`);
        const response = await fetch(`/api/projects/${selectedProject}/worker-attendance`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
          }
        });
        if (!response.ok) {
          if (response.status === 401) {
            console.error('❌ غير مصرح - يرجى تسجيل الدخول مرة أخرى');
            return [];
          }
          console.error(`❌ خطأ في جلب حضور العمال: ${response.status}`);
          return [];
        }
        const data = await response.json();
        console.log(`✅ تم جلب ${Array.isArray(data?.data) ? data.data.length : 0} سجل حضور`);
        return Array.isArray(data?.data) ? data.data : [];
      } catch (error) {
        console.error('❌ خطأ في جلب حضور العمال:', error);
        return [];
      }
    },
    enabled: !!selectedProject,
    retry: 1,
    staleTime: 30000,
  });

  // جلب مشتريات المواد للمشروع
  const { data: materialPurchases = [], isLoading: materialsLoading, error: materialsError } = useQuery({
    queryKey: ['/api/projects', selectedProject, 'material-purchases'],
    queryFn: async () => {
      if (!selectedProject) return [];
      try {
        console.log(`🔄 جلب مشتريات المواد للمشروع: ${selectedProject}`);
        const response = await fetch(`/api/projects/${selectedProject}/material-purchases`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
          }
        });
        if (!response.ok) {
          if (response.status === 401) {
            console.error('❌ غير مصرح - يرجى تسجيل الدخول مرة أخرى');
            return [];
          }
          console.error(`❌ خطأ في جلب مشتريات المواد: ${response.status}`);
          return [];
        }
        const data = await response.json();
        console.log(`✅ تم جلب ${Array.isArray(data?.data) ? data.data.length : 0} مشترية مواد`);
        return Array.isArray(data?.data) ? data.data : [];
      } catch (error) {
        console.error('❌ خطأ في جلب مشتريات المواد:', error);
        return [];
      }
    },
    enabled: !!selectedProject,
    retry: 1,
    staleTime: 30000,
  });

  // جلب مصروفات النقل للمشروع
  const { data: transportExpenses = [] } = useQuery({
    queryKey: ['/api/projects', selectedProject, 'transportation-expenses'],
    enabled: !!selectedProject,
  });

  // جلب المصروفات المتنوعة للمشروع
  const { data: miscExpenses = [] } = useQuery({
    queryKey: ['/api/projects', selectedProject, 'worker-misc-expenses'],
    enabled: !!selectedProject,
  });

  // جلب حوالات العمال للمشروع
  const { data: workerTransfers = [], isLoading: workerTransfersLoading, error: workerTransfersError } = useQuery({
    queryKey: ['/api/projects', selectedProject, 'worker-transfers'],
    queryFn: async () => {
      if (!selectedProject) return [];
      try {
        console.log(`🔄 جلب حوالات العمال للمشروع: ${selectedProject}`);
        const response = await fetch(`/api/projects/${selectedProject}/worker-transfers`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
          }
        });
        if (!response.ok) {
          if (response.status === 401) {
            console.error('❌ غير مصرح - يرجى تسجيل الدخول مرة أخرى');
            return [];
          }
          console.error(`❌ خطأ في جلب حوالات العمال: ${response.status}`);
          return [];
        }
        const data = await response.json();
        console.log(`✅ تم جلب ${Array.isArray(data?.data) ? data.data.length : (Array.isArray(data) ? data.length : 0)} حولة عمال`);
        return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('❌ خطأ في جلب حوالات العمال:', error);
        return [];
      }
    },
    enabled: !!selectedProject,
    retry: 1,
    staleTime: 30000,
  });

  // جلب بيانات العمال لعرض أسمائهم
  const { data: workers = [] } = useQuery({
    queryKey: ['/api/workers'],
  });

  // تحويل البيانات إلى قائمة معاملات موحدة
  const transactions = useMemo(() => {
    const allTransactions: Transaction[] = [];

    // تشخيص البيانات للمساعدة في حل المشكلة
    const fundTransfersArray = Array.isArray(fundTransfers) ? fundTransfers : [];
    const incomingProjectTransfersArray = Array.isArray(incomingProjectTransfers) ? incomingProjectTransfers : [];
    const outgoingProjectTransfersArray = Array.isArray(outgoingProjectTransfers) ? outgoingProjectTransfers : [];
    const workerAttendanceArray = Array.isArray(workerAttendance) ? workerAttendance : [];
    const materialPurchasesArray = Array.isArray(materialPurchases) ? materialPurchases : [];
    const transportExpensesArray = Array.isArray(transportExpenses) ? transportExpenses : [];
    const miscExpensesArray = Array.isArray(miscExpenses) ? miscExpenses : [];
    const workerTransfersArray = Array.isArray(workerTransfers) ? workerTransfers : [];
    const workersArray = Array.isArray(workers) ? workers : [];

    console.log(`🎯 بدء معالجة البيانات للمشروع ${selectedProject}`);
    console.log('📊 البيانات المتاحة:', {
      fundTransfers: fundTransfersArray?.length || 0,
      incomingProjectTransfers: incomingProjectTransfersArray?.length || 0,
      outgoingProjectTransfers: outgoingProjectTransfersArray?.length || 0,
      workerAttendance: workerAttendanceArray?.length || 0,
      materialPurchases: materialPurchasesArray?.length || 0,
      transportExpenses: transportExpensesArray?.length || 0,
      miscExpenses: miscExpensesArray?.length || 0
    });

    // حساب إجمالي العمليات المتاحة
    const totalOperations = fundTransfersArray.length + incomingProjectTransfersArray.length + 
                           outgoingProjectTransfersArray.length + workerAttendanceArray.length + 
                           materialPurchasesArray.length + transportExpensesArray.length + 
                           miscExpensesArray.length;

    // إضافة تحويلات العهدة العادية (دخل)
    fundTransfersArray.forEach((transfer: any) => {
      const date = transfer.transferDate;
      const amount = parseFloat(transfer.amount);

      if (date && !isNaN(amount) && amount > 0) {
        allTransactions.push({
          id: `fund-${transfer.id}`,
          date: date,
          type: 'income',
          category: 'تحويل عهدة',
          amount: amount,
          description: `من: ${transfer.senderName || 'غير محدد'}`
        });
      }
    });

    // إضافة التحويلات الواردة من مشاريع أخرى (دخل)
    if (incomingProjectTransfersArray.length > 0) {
      console.log(`📥 معالجة ${incomingProjectTransfersArray.length} تحويل وارد`);
      incomingProjectTransfersArray.forEach((transfer: any) => {
        const date = transfer.transferDate;
        const amount = parseFloat(transfer.amount);

        if (date && !isNaN(amount) && amount > 0) {
          console.log(`💰 إضافة تحويل وارد: ${amount} من ${transfer.fromProjectName}`);
          allTransactions.push({
            id: `project-in-${transfer.id}`,
            date: date,
            type: 'transfer_from_project',
            category: 'تحويل من مشروع آخر',
            amount: amount,
            description: `من: ${transfer.fromProjectName || 'مشروع آخر'}`
          });
        }
      });
    } else {
      console.log(`📥 لا توجد تحويلات واردة للمشروع ${selectedProject}`);
    }

    // إضافة التحويلات الصادرة إلى مشاريع أخرى (مصروف)
    if (outgoingProjectTransfersArray.length > 0) {
      console.log(`📤 معالجة ${outgoingProjectTransfersArray.length} تحويل صادر`);
      outgoingProjectTransfersArray.forEach((transfer: any) => {
        const date = transfer.transferDate;
        const amount = parseFloat(transfer.amount);

        if (date && !isNaN(amount) && amount > 0) {
          console.log(`💸 إضافة تحويل صادر: ${amount} إلى ${transfer.toProjectName}`);
          allTransactions.push({
            id: `project-out-${transfer.id}`,
            date: date,
            type: 'expense',
            category: 'تحويل إلى مشروع آخر',
            amount: amount,
            description: `إلى: ${transfer.toProjectName || 'مشروع آخر'}`
          });
        }
      });
    } else {
      console.log(`📤 لا توجد تحويلات صادرة للمشروع ${selectedProject}`);
    }

    // إضافة أجور العمال (مصروف)
    console.log('🔍 معالجة أجور العمال - العدد:', workerAttendanceArray.length);
    if (workerAttendanceArray.length > 0) {
      console.log('🔍 أول عنصر من بيانات أجور العمال:', JSON.stringify(workerAttendanceArray[0], null, 2));
    }

    workerAttendanceArray.forEach((attendance: any, index: number) => {
      console.log('🔍 معالجة العامل رقم ${index + 1}:', attendance);

      const date = attendance.date || attendance.attendanceDate || attendance.created_at;
      console.log('📅 التاريخ المستخرج:', date);

      // فحص جميع الحقول الموجودة في الكائن
      console.log('🔍 جميع الحقول المتاحة:', Object.keys(attendance));

      // حساب المبلغ المدفوع فعلياً فقط (وليس الأجر الكامل)
      let amount = 0;

      // استخدام المبلغ المدفوع فعلياً (يشمل 0 إذا لم يُدفع شيء)
      if (attendance.paidAmount !== undefined && attendance.paidAmount !== null && attendance.paidAmount !== '') {
        const paidAmount = parseFloat(attendance.paidAmount);
        if (!isNaN(paidAmount)) {
          amount = Math.max(0, paidAmount); // تأكد من عدم وجود قيم سالبة
          console.log(`💰 المبلغ المدفوع فعلياً:`, amount);
        }
      }


      console.log('✅ النتيجة النهائية:', { 
        date, 
        amount, 
        hasDate: !!date, 
        hasAmount: amount >= 0, 
        willAdd: !!date 
      });

      // إظهار جميع سجلات الحضور حتى لو كان المبلغ المدفوع 0
      if (date) {
        // البحث عن العامل باستخدام workerId
        const worker = Array.isArray(workersArray) ? workersArray.find((w: any) => w.id === attendance.workerId) : undefined;
        const workerName = worker?.name || attendance.workerName || attendance.worker?.name || attendance.name || 'غير محدد';
        const workDays = attendance.workDays ? ` (${attendance.workDays} يوم)` : '';
        const dailyWage = attendance.dailyWage ? ` - أجر يومي: ${formatCurrency(parseFloat(attendance.dailyWage))}` : '';

        // إضافة توضيح إذا كان المبلغ المدفوع 0
        const paymentStatus = amount === 0 ? ' (لم يُدفع)' : '';

        const newTransaction = {
          id: `wage-${attendance.id}`,
          date: date,
          type: 'expense' as const,
          category: 'أجور العمال',
          amount: amount,
          description: `${workerName}${workDays}${dailyWage}${paymentStatus}`
        };

        console.log('✅ إضافة معاملة أجور العمال:', newTransaction);
        allTransactions.push(newTransaction);
      } else {
        console.log(`❌ تم تخطي العامل ${attendance.workerName || attendance.name || 'غير معروف'} - السبب: التاريخ مفقود`, {
          missingDate: !date,
          originalData: attendance
        });
      }
    });

    // إضافة مشتريات المواد (مصروف أو آجل)
    materialPurchasesArray.forEach((purchase: any) => {
      const date = purchase.purchaseDate || purchase.date;
      let amount = 0;

      if (purchase.totalAmount && !isNaN(parseFloat(purchase.totalAmount))) {
        amount = parseFloat(purchase.totalAmount);
      } else if (purchase.amount && !isNaN(parseFloat(purchase.amount))) {
        amount = parseFloat(purchase.amount);
      } else if (purchase.cost && !isNaN(parseFloat(purchase.cost))) {
        amount = parseFloat(purchase.cost);
      }

      if (date && amount > 0) {
        // تحديد نوع المشترية - المشتريات النقدية فقط تُحسب كمصروفات
        const isDeferred = purchase.purchaseType === 'آجل' || purchase.paymentType === 'deferred' || purchase.isDeferred || purchase.deferred;

        allTransactions.push({
          id: `material-${purchase.id}`,
          date: date,
          type: isDeferred ? 'deferred' : 'expense',
          category: isDeferred ? 'مشتريات آجلة' : 'مشتريات المواد',
          amount: amount,
          description: `مادة: ${purchase.materialName || purchase.name || 'غير محدد'}${isDeferred ? ' (آجل)' : ''}`
        });
      }
    });

    // إضافة مصروفات النقل (مصروف)
    transportExpensesArray.forEach((expense: any) => {
      const date = expense.date;
      const amount = parseFloat(expense.amount);

      if (date && !isNaN(amount) && amount > 0) {
        allTransactions.push({
          id: `transport-${expense.id}`,
          date: date,
          type: 'expense',
          category: 'مصروفات النقل',
          amount: amount,
          description: `نقل: ${expense.description || 'غير محدد'}`
        });
      }
    });

    // إضافة المصروفات المتنوعة (مصروف)
    miscExpensesArray.forEach((expense: any) => {
      const date = expense.date;
      const amount = parseFloat(expense.amount);

      if (date && !isNaN(amount) && amount > 0) {
        allTransactions.push({
          id: `misc-${expense.id}`,
          date: date,
          type: 'expense',
          category: 'مصروفات متنوعة',
          amount: amount,
          description: `متنوع: ${expense.description || expense.workerName || 'غير محدد'}`
        });
      }
    });

    // إضافة حوالات العمال (مصروف)
    workerTransfersArray.forEach((transfer: any) => {
      const date = transfer.date || transfer.transferDate;
      const amount = parseFloat(transfer.amount);

      if (date && !isNaN(amount) && amount > 0) {
        // البحث عن العامل باستخدام workerId
        const worker = Array.isArray(workersArray) ? workersArray.find((w: any) => w.id === transfer.workerId) : undefined;
        const workerName = worker?.name || transfer.workerName || 'عامل غير معروف';
        const recipientName = transfer.recipientName ? ` - المستلم: ${transfer.recipientName}` : '';
        const transferMethod = transfer.transferMethod === 'hawaleh' ? 'حولة' : 
                              transfer.transferMethod === 'bank' ? 'تحويل بنكي' : 'نقداً';

        allTransactions.push({
          id: `worker-transfer-${transfer.id}`,
          date: date,
          type: 'expense',
          category: 'حوالات العمال',
          amount: amount,
          description: `${workerName}${recipientName} - ${transferMethod}`
        });
      }
    });

    // ترتيب حسب التاريخ (الأحدث أولاً) مع التأكد من صحة التواريخ
    const finalTransactions = allTransactions
      .filter(t => t.date && !isNaN(new Date(t.date).getTime()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log(`✅ معاملات نهائية: ${finalTransactions.length} من أصل ${allTransactions.length}`);
    console.log('🔍 تفاصيل المعاملات النهائية:', {
      income: finalTransactions.filter(t => t.type === 'income').length,
      transfer_from_project: finalTransactions.filter(t => t.type === 'transfer_from_project').length,
      expense: finalTransactions.filter(t => t.type === 'expense').length,
      deferred: finalTransactions.filter(t => t.type === 'deferred').length,
      workerWages: finalTransactions.filter(t => t.category === 'أجور العمال').length,
      workerTransfers: finalTransactions.filter(t => t.category === 'حوالات العمال').length,
      outgoingTransfers: finalTransactions.filter(t => t.category === 'تحويل إلى مشروع آخر').length
    });

    return finalTransactions;
  }, [fundTransfers, incomingProjectTransfers, outgoingProjectTransfers, workerAttendance, materialPurchases, transportExpenses, miscExpenses, workerTransfers, workers]);

  // تطبيق الفلاتر
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [transactions, filterType, searchTerm]);

  // حساب الإجماليات مع تشخيص مفصل
    const totals = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
    const transferFromProject = filteredTransactions.filter(t => t.type === 'transfer_from_project').reduce((sum, t) => sum + (t.amount || 0), 0);
    const expenses = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);

    // التحويلات الصادرة إلى مشاريع أخرى تُحسب كمصروفات
    const transferToProjectExpenses = filteredTransactions.filter(t => t.category === 'تحويل إلى مشروع آخر').reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // المصروفات الأخرى (بدون التحويلات)
    const otherExpenses = expenses - transferToProjectExpenses;

    const totalIncome = income + transferFromProject;
    const totalExpenses = expenses;

    console.log('💰 تفاصيل الحسابات:', {
      income,
      transferFromProject,
      otherExpenses,
      transferToProjectExpenses,
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses
    });

    return { 
      income,
      transferFromProject,
      otherExpenses,
      transferToProjectExpenses,
      totalIncome,
      expenses: totalExpenses,
      totalExpenses,
      balance: totalIncome - totalExpenses
    };
  }, [filteredTransactions]);

  const selectedProjectName = Array.isArray(projects) ? projects.find(p => p.id === selectedProject)?.name || '' : '';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-2 sm:p-4" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-1">
        {/* اختيار المشروع والفلاتر - مضغوط */}
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* اختيار المشروع */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">المشروع</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="اختر مشروعاً" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* نوع العملية */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">نوع العملية</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع العمليات</SelectItem>
                    <SelectItem value="income">الدخل فقط</SelectItem>
                    <SelectItem value="transfer_from_project">التحويلات من المشاريع</SelectItem>
                    <SelectItem value="expense">المصاريف فقط</SelectItem>
                    <SelectItem value="deferred">المشتريات الآجلة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* البحث */}
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">البحث</label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                  <Input
                    placeholder="ابحث في الوصف..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-8 h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedProject && (
          <>
            {/* عرض الأخطاء إن وجدت */}
            {(fundTransfersError || attendanceError || materialsError || workerTransfersError || incomingTransfersError || outgoingTransfersError) && (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4">
                  <div className="text-red-800">
                    <h3 className="font-semibold">⚠️ تحذيرات في جلب البيانات:</h3>
                    {fundTransfersError && <p>• خطأ في جلب تحويلات العهدة</p>}
                    {attendanceError && <p>• خطأ في جلب حضور العمال</p>}
                    {materialsError && <p>• خطأ في جلب مشتريات المواد</p>}
                    {workerTransfersError && <p>• خطأ في جلب حوالات العمال</p>}
                    {incomingTransfersError && <p>• خطأ في جلب التحويلات الواردة</p>}
                    {outgoingTransfersError && <p>• خطأ في جلب التحويلات الصادرة</p>}
                    <p className="text-sm mt-2 text-red-600">يرجى التحقق من اتصالك بالإنترنت أو تسجيل الدخول مرة أخرى.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* مؤشر التحميل */}
            {(fundTransfersLoading || attendanceLoading || materialsLoading || workerTransfersLoading || incomingTransfersLoading || outgoingTransfersLoading) && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 text-blue-800">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                    <span>جاري تحميل البيانات المالية...</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* الإحصائيات باستخدام StatsGrid */}
            <StatsGrid 
              stats={[
                {
                  title: "الدخل المباشر",
                  value: formatCurrency(totals.income || 0),
                  icon: TrendingUp,
                  color: "green",
                },
                {
                  title: "من مشاريع أخرى",
                  value: formatCurrency(totals.transferFromProject || 0),
                  icon: Building,
                  color: "teal",
                },
                {
                  title: "إجمالي المصاريف",
                  value: formatCurrency(totals.totalExpenses || 0),
                  icon: TrendingDown,
                  color: "red",
                },
                {
                  title: "الرصيد النهائي",
                  value: formatCurrency(totals.balance || 0),
                  icon: DollarSign,
                  color: totals.balance >= 0 ? "blue" : "orange",
                }
              ]} 
              columns={4}
            />

            {/* إحصائية المشتريات الآجلة منفصلة */}
            <StatsGrid 
              stats={[
                {
                  title: "المشتريات الآجلة",
                  value: `${formatCurrency(0 || 0)} (لا تُحسب في الرصيد)`,
                  icon: Clock,
                  color: "amber",
                }
              ]} 
              columns={2}
            />

            {/* جدول العمليات */}
            <Card className="shadow-sm">
              <CardHeader className="p-3 sm:p-4 sm:pb-3">
                <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-base sm:text-lg font-semibold truncate">سجل العمليات {selectedProjectName && `- ${selectedProjectName}`}</span>
                  <Badge variant="outline" className="text-xs px-2 py-1">
                    {filteredTransactions.length} عملية
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 px-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 sm:p-6 border border-blue-200 dark:border-blue-800">
                      <Building className="h-10 w-10 sm:h-12 sm:w-12 text-blue-400 mx-auto sm:mb-4" />
                      <h3 className="text-base sm:text-lg font-semibold text-blue-800 dark:text-blue-300">
                        لا توجد عمليات مالية
                      </h3>
                      <p className="text-sm sm:text-base text-blue-600 dark:text-blue-400 sm:mb-4">
                        {selectedProject ? 
                          'هذا المشروع لا يحتوي على عمليات مالية مسجلة بعد' : 
                          'يرجى اختيار مشروع لعرض العمليات المالية الخاصة به'
                        }
                      </p>
                      <div className="text-xs sm:text-sm text-blue-500 dark:text-blue-400">
                        💡 نصيحة: تأكد من إدخال البيانات التالية للمشروع:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>تحويلات العهدة</li>
                          <li>أجور العمال</li>
                          <li>مشتريات المواد</li>
                          <li>مصروفات النقل</li>
                          <li>المصروفات المتنوعة</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="sm:hidden space-y-2 p-3">
                      {/* عرض بطاقات للهواتف */}
                      {filteredTransactions.map((transaction, index) => (
                        <Card key={transaction.id} className="bg-white dark:bg-gray-800 shadow-sm border">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant={
                                      transaction.type === 'income' ? 'default' : 
                                      transaction.type === 'transfer_from_project' ? 'secondary' : 
                                      transaction.type === 'deferred' ? 'outline' : 'destructive'
                                    } 
                                    className={`text-xs px-2 py-0.5 flex-shrink-0 ${
                                      transaction.type === 'income' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                      transaction.type === 'transfer_from_project' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300' :
                                      transaction.type === 'deferred' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                    }`}
                                  >
                                    {transaction.type === 'income' ? 'دخل' : 
                                     transaction.type === 'transfer_from_project' ? 'تحويل' : 
                                     transaction.type === 'deferred' ? 'آجل' : 'مصروف'}
                                  </Badge>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ar })}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate">
                                  {transaction.category}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                  {transaction.description}
                                </p>
                              </div>
                              <div className="text-left flex-shrink-0 ml-2">
                                <p className={`text-sm font-bold ${
                                  transaction.type === 'income' || transaction.type === 'transfer_from_project' 
                                    ? 'text-green-600 dark:text-green-400' 
                                    : transaction.type === 'deferred' 
                                    ? 'text-yellow-600 dark:text-yellow-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {formatCurrency(transaction.amount)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="hidden sm:block overflow-x-auto">
                      {/* جدول للأجهزة الأكبر */}
                      <table className="w-full table-auto">
                        <thead>
                          <tr className="border-b bg-gray-50 dark:bg-gray-800">
                            <th className="text-right py-2 px-3 text-sm font-medium">التاريخ</th>
                            <th className="text-right py-2 px-3 text-sm font-medium">النوع</th>
                            <th className="text-right py-2 px-3 text-sm font-medium">الفئة</th>
                            <th className="text-right py-2 px-3 text-sm font-medium">المبلغ</th>
                            <th className="text-right py-2 px-3 text-sm font-medium">الوصف</th>
                          </tr>
                        </thead>
                        <tbody>
                        {filteredTransactions.map((transaction, index) => (
                          <tr key={transaction.id} className={`border-b ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'} hover:bg-gray-100 dark:hover:bg-gray-700`}>
                            <td className="py-3 px-4 text-sm">
                              {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ar })}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={
                                transaction.type === 'income' ? 'default' : 
                                transaction.type === 'transfer_from_project' ? 'secondary' : 
                                transaction.type === 'deferred' ? 'outline' : 'destructive'
                              } className={
                                transaction.type === 'deferred' ? 'border-yellow-500 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' : 
                                transaction.type === 'transfer_from_project' ? 'border-cyan-500 text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20' : ''
                              }>
                                {transaction.type === 'income' ? 'دخل' : 
                                 transaction.type === 'transfer_from_project' ? 'تحويل مشروع' :
                                 transaction.type === 'deferred' ? 'آجل' : 'مصروف'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm font-medium">
                              {transaction.category}
                            </td>
                            <td className={`py-3 px-4 text-sm font-bold ${
                              transaction.type === 'income' ? 'text-green-600' : 
                              transaction.type === 'transfer_from_project' ? 'text-cyan-600' :
                              transaction.type === 'deferred' ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {transaction.type === 'income' || transaction.type === 'transfer_from_project' ? '+' : 
                               transaction.type === 'deferred' ? '' : '-'}{formatCurrency(transaction.amount || 0).replace(' ر.ي', '')} ر.ي
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                              {transaction.category === 'أجور العمال' ? (
                                <div className="flex flex-col gap-1">
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {transaction.description.split(' - أجر يومي:')[0]}
                                  </span>
                                  {transaction.description.includes(' - أجر يومي:') && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {transaction.description.split(' - أجر يومي:')[1] ? 
                                        `أجر يومي: ${transaction.description.split(' - أجر يومي:')[1]}` : ''}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                transaction.description
                              )}
                            </td>
                          </tr>
                        ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}