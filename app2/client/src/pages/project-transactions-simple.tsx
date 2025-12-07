import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, TrendingUp, TrendingDown, DollarSign, Building, Clock, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { StatsGrid } from '@/components/ui/stats-grid';
import { useSelectedProject, ALL_PROJECTS_ID } from '@/hooks/use-selected-project';
import { Skeleton } from "@/components/ui/skeleton";
import type { Project } from "@shared/schema";
import { 
  DollarSign as UnifiedDollarSign, 
  TrendingUp as UnifiedTrendingUp, 
  TrendingDown as UnifiedTrendingDown, 
  Calendar as UnifiedCalendar,
  ArrowUpRight,
  ArrowDownRight,
  Building2 as UnifiedBuilding2,
  FileText as UnifiedFileText,
  AlertCircle as UnifiedAlertCircle
} from "lucide-react";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";


interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense' | 'deferred' | 'transfer_from_project';
  category: string;
  amount: number;
  description: string;
}

export default function ProjectTransactionsSimple() {
  const { selectedProjectId, getProjectIdForApi, isAllProjects } = useSelectedProject();
  const selectedProject = getProjectIdForApi() || '';
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // جلب المشاريع
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // جلب تحويلات العهدة العادية للمشروع
  const { data: fundTransfers = [], isLoading: fundTransfersLoading, error: fundTransfersError } = useQuery<any[]>({
    queryKey: ['/api/projects', selectedProject, 'fund-transfers'],
    queryFn: async () => {
      if (!selectedProject) return [];
      try {
        console.log(`🔄 جلب تحويلات العهدة للمشروع: ${selectedProject}`);
        const endpoint = isAllProjects 
          ? '/api/projects/all/fund-transfers'
          : `/api/projects/${selectedProject}/fund-transfers`;
        const data = await apiRequest(endpoint);
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
  const { data: incomingProjectTransfers = [], isLoading: incomingTransfersLoading, error: incomingTransfersError } = useQuery<any[]>({
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
  const { data: outgoingProjectTransfers = [], isLoading: outgoingTransfersLoading, error: outgoingTransfersError } = useQuery<any[]>({
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
  const { data: workerAttendance = [], isLoading: attendanceLoading, error: attendanceError } = useQuery<any[]>({
    queryKey: ['/api/projects', selectedProject, 'attendance'],
    queryFn: async () => {
      if (!selectedProject) return [];
      try {
        console.log(`🔄 جلب حضور العمال للمشروع: ${selectedProject}`);
        const endpoint = isAllProjects
          ? '/api/projects/all/worker-attendance'
          : `/api/projects/${selectedProject}/worker-attendance`;
        const response = await fetch(endpoint, {
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
  const { data: materialPurchases = [], isLoading: materialsLoading, error: materialsError } = useQuery<any[]>({
    queryKey: ['/api/projects', selectedProject, 'material-purchases'],
    queryFn: async () => {
      if (!selectedProject) return [];
      try {
        console.log(`🔄 جلب مشتريات المواد للمشروع: ${selectedProject}`);
        const endpoint = isAllProjects
          ? '/api/projects/all/material-purchases'
          : `/api/projects/${selectedProject}/material-purchases`;
        const response = await fetch(endpoint, {
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
  const { data: transportExpenses = [], isLoading: transportExpensesLoading } = useQuery<any[]>({
    queryKey: ['/api/projects', selectedProject, 'transportation-expenses'],
    enabled: !!selectedProject,
  });

  // جلب المصروفات المتنوعة للمشروع
  const { data: miscExpenses = [], isLoading: miscExpensesLoading } = useQuery<any[]>({
    queryKey: ['/api/projects', selectedProject, 'worker-misc-expenses'],
    enabled: !!selectedProject,
  });

  // جلب حوالات العمال للمشروع
  const { data: workerTransfers = [], isLoading: workerTransfersLoading, error: workerTransfersError } = useQuery<any[]>({
    queryKey: ['/api/projects', selectedProject, 'worker-transfers'],
    queryFn: async () => {
      if (!selectedProject) return [];
      try {
        console.log(`🔄 جلب حوالات العمال للمشروع: ${selectedProject}`);
        const endpoint = isAllProjects
          ? '/api/projects/all/worker-transfers'
          : `/api/projects/${selectedProject}/worker-transfers`;
        const response = await fetch(endpoint, {
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

    // ✅ عرض جميع العمليات دائماً (حتى للمشاريع الفردية أو جميع المشاريع)
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

    // إضافة التحويلات الواردة من مشاريع أخرى (دخل) - مع تحديد واضح
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
            category: '🔄 ترحيل وارد من مشروع',
            amount: amount,
            description: `📥 من مشروع: ${transfer.fromProjectName || 'مشروع آخر'}${transfer.description ? ` - ${transfer.description}` : ''}`
          });
        }
      });
    } else {
      console.log(`📥 لا توجد تحويلات واردة للمشروع ${selectedProject}`);
    }

    // إضافة التحويلات الصادرة إلى مشاريع أخرى (مصروف) - مع تحديد واضح
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
            category: '🔄 ترحيل صادر إلى مشروع',
            amount: amount,
            description: `📤 إلى مشروع: ${transfer.toProjectName || 'مشروع آخر'}${transfer.description ? ` - ${transfer.description}` : ''}`
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
  }, [isAllProjects, fundTransfers, incomingProjectTransfers, outgoingProjectTransfers, workerAttendance, materialPurchases, transportExpenses, miscExpenses, workerTransfers, workers]);

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

  // --- Unified Components Logic ---

  const formatCurrencyUnified = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ر.ي';
  };

  const getProjectNameUnified = () => {
    return projects.find(p => p.id === selectedProject)?.name || 'المشروع';
  };

  // تكوين صفوف الإحصائيات
  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          title: "إجمالي الدخل",
          value: totals.totalIncome,
          icon: UnifiedTrendingUp,
          color: "green",
          formatter: formatCurrencyUnified
        },
        {
          title: "إجمالي المصروفات",
          value: totals.totalExpenses,
          icon: UnifiedTrendingDown,
          color: "red",
          formatter: formatCurrencyUnified
        },
        {
          title: "الرصيد الصافي",
          value: totals.balance,
          icon: UnifiedDollarSign,
          color: totals.balance >= 0 ? "green" : "red",
          formatter: formatCurrencyUnified
        }
      ]
    },
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          title: "المشتريات الآجلة",
          value: filteredTransactions.filter(t => t.type === 'deferred').reduce((sum, t) => sum + t.amount, 0),
          icon: UnifiedAlertCircle,
          color: "orange",
          formatter: formatCurrencyUnified
        },
        {
          title: "إجمالي العمليات",
          value: transactions.length,
          icon: UnifiedFileText,
          color: "blue"
        },
        {
          title: "النتائج المفلترة",
          value: filteredTransactions.length,
          icon: UnifiedCalendar,
          color: "purple"
        }
      ]
    }
  ], [totals, transactions, filteredTransactions]);

  // تكوين الفلاتر
  const filterConfigs: FilterConfig[] = [
    {
      key: 'type',
      label: 'نوع العملية',
      type: 'select',
      placeholder: 'جميع الأنواع',
      options: [
        { value: 'all', label: 'جميع الأنواع' },
        { value: 'income', label: 'دخل' },
        { value: 'expense', label: 'مصروف' },
        { value: 'deferred', label: 'آجل' },
        { value: 'transfer_from_project', label: '🔄 ترحيل وارد من مشروع' }
      ]
    }
  ];

  const isLoading = fundTransfersLoading || incomingTransfersLoading || outgoingTransfersLoading || attendanceLoading || materialsLoading || workerTransfersLoading;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden flex flex-col" dir="rtl">
      <div className="flex-1 overflow-y-auto">
        <div className="px-2 py-3 md:px-6 md:py-6 w-full space-y-4 md:space-y-8 pb-24 md:pb-20">
          {/* شريط الفلترة والإحصائيات الموحد */}
          <UnifiedFilterDashboard
            statsRows={statsRowsConfig}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="ابحث في الوصف أو الفئة..."
            showSearch={true}
            filters={filterConfigs}
            filterValues={{ type: filterType }}
            onFilterChange={(key, value) => setFilterType(value)}
            onReset={() => {
              setSearchTerm('');
              setFilterType('all');
            }}
            projectName={getProjectNameUnified()}
            projectOptions={projects.map(p => ({ value: p.id, label: p.name }))}
            selectedProjectId={selectedProject}
            onProjectChange={(projectId) => {
              // This part might need adjustment based on how useSelectedProject is intended to be controlled externally
              // For now, we assume selectedProjectId is managed by the hook.
              console.log("Project changed to:", projectId);
            }}
            isAllProjectsSelected={isAllProjects}
          />

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

          {/* قائمة العمليات */}
          <div className="space-y-4 md:space-y-6">
            {isLoading ? (
              <div className="space-y-4 md:space-y-6">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="bg-white dark:bg-slate-900">
                    <CardContent className="p-4 md:p-6">
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg">
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <UnifiedFileText className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">لا توجد عمليات</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">لا توجد عمليات مالية لهذا المشروع</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <UnifiedCardGrid columns={2}>
                {filteredTransactions.map(transaction => {
                  const isIncome = transaction.type === 'income' || transaction.type === 'transfer_from_project';
                  const isDeferred = transaction.type === 'deferred';

                  return (
                    <UnifiedCard
                      key={transaction.id}
                      title={formatCurrencyUnified(transaction.amount)}
                      titleIcon={isIncome ? ArrowUpRight : ArrowDownRight}
                      headerColor={isIncome ? "#10b981" : isDeferred ? "#f59e0b" : "#ef4444"}
                      badges={[
                        { 
                          label: format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ar }), 
                          variant: 'outline' as const 
                        },
                        { 
                          label: transaction.category,
                          variant: isIncome ? 'default' : isDeferred ? 'warning' : 'destructive'
                        }
                      ]}
                      fields={[
                        {
                          label: "النوع",
                          value: isIncome ? 'دخل' : isDeferred ? 'آجل' : 'مصروف',
                          icon: isIncome ? UnifiedTrendingUp : UnifiedTrendingDown,
                          color: isIncome ? "success" : isDeferred ? "warning" : "danger"
                        },
                        {
                          label: "التفاصيل",
                          value: transaction.description,
                          icon: UnifiedFileText,
                          color: "default"
                        },
                        {
                          label: "التاريخ",
                          value: format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ar }),
                          icon: UnifiedCalendar,
                          color: "info"
                        }
                      ]}
                      compact
                    />
                  );
                })}
              </UnifiedCardGrid>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}