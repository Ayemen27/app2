/**
 * مكون تصدير تقرير المصروفات اليومية لفترة زمنية
 * كل يوم في ورقة منفصلة في ملف Excel واحد
 * المالك: عمار
 * التاريخ: 2025-08-16
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useSelectedProject } from '@/hooks/use-selected-project';
import { 
  FileSpreadsheet, 
  Calendar, 
  Download, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Camera
} from 'lucide-react';
// ExcelJS will be imported dynamically
import { downloadFile } from '@/utils/webview-download';
import html2canvas from 'html2canvas';
import type { Project } from '@shared/schema';
import { downloadExcelFile } from '@/utils/webview-download';
import { QUERY_KEYS } from "@/constants/queryKeys";

interface DailyExpenseData {
  date: string;
  projectName: string;
  project_id: string;
  totalIncome: number;
  totalExpenses: number;
  remainingBalance: number;
  carriedForward: number;
  transferFromProject?: string;
  fundTransfers: any[];
  workerAttendance: any[];
  materialPurchases: any[];
  transportationExpenses: any[];
  workerTransfers: any[];
  miscExpenses: any[];
  supplierPayments?: any[];
  incomingProjectTransfers?: any[]; // الأموال المرحلة من مشاريع أخرى
  outgoingProjectTransfers?: any[]; // الأموال المرحلة إلى مشاريع أخرى
}

export default function DailyExpensesBulkExport() {
  const { selectedProjectId } = useSelectedProject();
  const { toast } = useToast();
  
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });

  // جلب بيانات المشاريع
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: QUERY_KEYS.projects,
  });

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // دالة تنسيق العملة (أرقام إنجليزية)
  const formatCurrency = (amount: number) => {
    return `${Number(amount).toLocaleString('en-US', { useGrouping: true })} ر.ي`;
  };

  // دالة تنسيق الأرقام (إنجليزية) - إزالة الأصفار الزائدة وتنسيق صحيح
  const formatNumber = (num: number | string | null | undefined) => {
    // تحويل القيمة إلى رقم وفحص صحتها
    const numValue = Number(num);
    if (isNaN(numValue) || num === null || num === undefined) return '0';
    
    // إذا كان الرقم صفر، ارجع '0' مباشرة
    if (numValue === 0) return '0';
    
    // تحويل إلى نص وإزالة الأصفار الزائدة
    let numStr = numValue.toString();
    
    // إذا كان العدد عشري، نتحقق من الأصفار الزائدة
    if (numStr.includes('.')) {
      // إزالة الأصفار الزائدة من نهاية الجزء العشري
      numStr = parseFloat(numStr).toString();
    }
    
    // تنسيق الأرقام بفواصل الآلاف للأعداد الكبيرة
    const [integerPart, decimalPart] = numStr.split('.');
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  };

  // دالة تنسيق التاريخ بتنسيق DD-MM-YYYY
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // دالة جلب بيانات المصروفات اليومية لفترة
  const fetchDailyExpensesForPeriod = async (project_id: string, fromDate: string, toDate: string) => {
    const expenses: DailyExpenseData[] = [];
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    

    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`/api/reports/daily-expenses/${project_id}/${dateStr}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data && Object.keys(data).length > 0) {
            expenses.push({
              ...data,
              date: dateStr,
              projectName: selectedProject?.name || 'مشروع غير محدد'
            });
          }
        }
        
        // تحديث progress
        const current = Math.ceil((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const total = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        setExportProgress({ current, total });
        
      } catch (error) {
        console.error(`خطأ في جلب بيانات ${dateStr}:`, error);
      }
    }
    
    return expenses;
  };

  // دالة الحصول على اسم اليوم بالعربي
  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return dayNames[date.getDay()];
  };

  // دالة إنشاء ورقة Excel ليوم واحد (مطابقة للصور المرجعية 100%)
  const createDayWorksheet = (workbook: any, dayData: DailyExpenseData) => {
    const worksheetName = `${formatDate(dayData.date)}`.replace(/\//g, '-');
    const worksheet = workbook.addWorksheet(worksheetName);
    
    // إعداد اتجاه النص من اليمين لليسار
    worksheet.views = [{ rightToLeft: true }];

    // رأس الشركة
    worksheet.mergeCells('A1:E1');
    const companyHeaderCell = worksheet.getCell('A1');
    companyHeaderCell.value = 'شركة الفتيني للمقاولات والاستشارات الهندسية';
    companyHeaderCell.font = { name: 'Arial Unicode MS', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    companyHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
    companyHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2A4A' } };
    companyHeaderCell.border = {
      top: { style: 'medium' }, bottom: { style: 'medium' },
      left: { style: 'medium' }, right: { style: 'medium' }
    };
    worksheet.getRow(1).height = 24;



    // رأس التقرير مطابق للصور المرجعية
    worksheet.mergeCells('A2:E2');
    const headerCell = worksheet.getCell('A2');
    const dayName = getDayName(dayData.date);
    const formattedDate = formatDate(dayData.date);
    headerCell.value = `كشف مصروفات ${dayData.projectName} يوم ${dayName} تاريخ ${formattedDate}`;
    headerCell.font = { name: 'Arial Unicode MS', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5090' } };
    headerCell.border = {
      top: { style: 'medium' }, bottom: { style: 'medium' },
      left: { style: 'medium' }, right: { style: 'medium' }
    };
    worksheet.getRow(2).height = 22;

    // رؤوس الجدول الرئيسي مطابقة للصور المرجعية (5 أعمدة فقط)
    const headers = ['المبلغ', 'نوع الحساب', 'نوع', 'المتبقي', 'ملاحظات'];
    const headerRow = worksheet.addRow(headers);
    
    headerRow.eachCell((cell, index) => {
      cell.font = { name: 'Arial Unicode MS', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5090' } };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
    });
    worksheet.getRow(4).height = 20;

    // حساب الرصيد الجاري - البداية بصفر أو بالرصيد المرحل
    let currentBalance = 0;
    


    
    // صف المبلغ المرحل من سابق (فقط إذا كان هناك رصيد مرحل حقيقي وأكبر من صفر)
    // إخفاء الصفوف الصفرية كما هو مطلوب
    if (dayData.carriedForward && Math.abs(dayData.carriedForward) > 0) {
      currentBalance = parseFloat(dayData.carriedForward.toString()); // إضافة الرصيد المرحل

      
      const yesterdayDate = new Date(dayData.date);
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const formattedYesterday = formatDate(yesterdayDate.toISOString().split('T')[0]);
      
      const carryForwardRow = worksheet.addRow([
        formatNumber(dayData.carriedForward), // عرض المبلغ كما هو (سالب أو موجب)
        'مرحلة',
        'ترحيل',
        formatNumber(currentBalance),
        `مرحل من تاريخ ${formattedYesterday}`
      ]);
      

      
      carryForwardRow.eachCell((cell) => {
        cell.font = { name: 'Arial Unicode MS', size: 10, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        
        // تحديد لون الخلفية حسب إشارة المبلغ المرحل
        if (dayData.carriedForward < 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } }; // أحمر فاتح للمرحل السالب
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB8E6B8' } }; // أخضر فاتح للمرحل الموجب
        }
        
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        };
      });
    }

    // الحوالات المرحلة من مشاريع أخرى (الأموال الواردة من مشاريع أخرى) - فقط إذا المبلغ أكبر من صفر
    if (dayData.incomingProjectTransfers && dayData.incomingProjectTransfers.length > 0) {
      dayData.incomingProjectTransfers.forEach((transfer: any) => {
        const amount = parseFloat((transfer.amount || 0).toString());
        if (amount && amount > 0) {
          currentBalance += amount; // إضافة المبلغ المرحل للرصيد

          
          // تبسيط الملاحظات - فقط اسم المشروع والتاريخ
          const transferDate = transfer.transferDate || transfer.date ? 
            formatDate(transfer.transferDate || transfer.date) : 
            formatDate(dayData.date);
          const projectName = (transfer.fromProjectName || 'مشروع غير محدد').replace('مشروع ', '');
          
          const transferRow = worksheet.addRow([
            formatNumber(amount),
            'مرحل من مشروع آخر',
            'ترحيل',
            formatNumber(currentBalance),
            `مرحلة من مشروع: ${projectName} بتاريخ ${transferDate}`
          ]);
          
          transferRow.eachCell((cell) => {
            cell.font = { name: 'Arial Unicode MS', size: 10, bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC99' } }; // لون مميز للمبالغ المرحلة من مشاريع أخرى
            cell.border = {
              top: { style: 'thin' }, bottom: { style: 'thin' },
              left: { style: 'thin' }, right: { style: 'thin' }
            };
          });
        }
      });
    }

    // الحوالات المالية العادية - حوالات من نفس المشروع - فقط إذا المبلغ أكبر من صفر
    if (dayData.fundTransfers && dayData.fundTransfers.length > 0) {
      dayData.fundTransfers.forEach((transfer: any) => {
        const transferAmount = parseFloat((transfer.amount || 0).toString());
        

        
        if (transferAmount && transferAmount > 0) {
          currentBalance += transferAmount; // إضافة الحوالة للرصيد

          
          // تفاصيل الحوالة المحسنة
          let notes = '';
          if (transfer.senderName && transfer.transferNumber) {
            notes = `حوالة من: ${transfer.senderName}، رقم الحوالة: ${transfer.transferNumber}`;
          } else if (transfer.description || transfer.notes) {
            notes = transfer.description || transfer.notes;
          } else if (transfer.transferNumber) {
            notes = `حوالة رقم ${transfer.transferNumber}`;
          } else {
            notes = 'حوالة مالية';
          }
          
          const transferRow = worksheet.addRow([
            formatNumber(transferAmount), // إصلاح: استخدام transferAmount بدلاً من transfer.amount
            'حوالة',
            'توريد',
            formatNumber(currentBalance),
            notes
          ]);
          
          transferRow.height = 20; // زيادة ارتفاع الصف لاحتواء النص الملتف
          transferRow.eachCell((cell) => {
            cell.font = { name: 'Arial Unicode MS', size: 10 };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB8E6B8' } }; // أخضر فاتح للحوالات
            cell.border = {
              top: { style: 'thin' }, bottom: { style: 'thin' },
              left: { style: 'thin' }, right: { style: 'thin' }
            };
          });
        } else {

        }
      });
    }

    // مصروفات العمال مع تفاصيل أيام العمل والمعاملات
    if (dayData.workerAttendance && dayData.workerAttendance.length > 0) {
      dayData.workerAttendance.forEach((worker: any) => {
        // حساب الأجر المدفوع فعلياً والأجر المستحق
        const paidAmount = parseFloat((worker.paidAmount || 0).toString());
        const totalWage = parseFloat((worker.actualWage || worker.totalWage || 0).toString());
        
        // إظهار جميع العمال - المدفوع لهم والذين لم يُدفع لهم (مبلغ = 0)
        // فقط تحديث الرصيد عند وجود مبلغ مدفوع فعلياً
        if (paidAmount > 0) {
          currentBalance -= paidAmount; // طرح الأجرة المدفوعة فعلياً من الرصيد

        }
        
        // إظهار العامل في الجدول سواء كان له مبلغ مدفوع أو لا
        if (paidAmount >= 0) { // تغيير الشرط ليشمل الصفر
          
          // تنسيق ملاحظات العامل المحسنة (بدون تكرار وبتصميم أفضل)
          const multiplier = worker.multiplier || worker.overtimeMultiplier || null;
          const workDays = worker.workDays || 1;
          
          // استخدام الملاحظات المخزنة في النظام إن وجدت، وإلا استخدام الافتراضية
          let notes = '';
          if (worker.notes && worker.notes.trim()) {
            // استخدام الملاحظات المخزنة في النظام
            notes = worker.notes.trim();
          } else if (worker.workDescription && worker.workDescription.trim()) {
            // استخدام وصف العمل إن وجد
            notes = worker.workDescription.trim();
          } else {
            // الملاحظة الافتراضية البسيطة
            notes = 'أجر عامل';
          }
          
          // إضافة عدد أيام العمل بشكل منفصل ومميز (سيتم تلوينه) مع إزالة الأصفار الزائدة
          let workDaysText = '';
          if (workDays && workDays !== 1) {
            const formattedDays = formatNumber(workDays); // استخدام دالة تنسيق الأرقام المحسنة
            workDaysText = ` — ${formattedDays} أيام`;
          }
          
          // عرض المعامل إذا وجد
          let amountDisplayWithMultiplier = formatNumber(paidAmount);
          if (multiplier && multiplier !== 1) {
            amountDisplayWithMultiplier = `${multiplier}\n${formatNumber(paidAmount)}`;
          }
          
          const workerRow = worksheet.addRow([
            amountDisplayWithMultiplier,
            `مصروف ${worker.workerName || worker.worker?.name || 'عامل'}`,
            'منصرف',
            formatNumber(currentBalance),
            notes + workDaysText // دمج الملاحظات مع أيام العمل
          ]);
          
          workerRow.height = 20; // زيادة ارتفاع الصف لاحتواء النص الملتف
          workerRow.eachCell((cell, index) => {
            cell.font = { name: 'Arial Unicode MS', size: 10 };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; // إضافة التفاف النص
            
            // إضافة المعامل في عمود المبلغ إذا وجد
            if (index === 1 && multiplier && multiplier !== 1) {
              cell.value = { richText: [
                { text: multiplier.toString(), font: { size: 8, bold: true } },
                { text: '\n' },
                { text: formatNumber(paidAmount), font: { size: 10 } }
              ]};
              cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            }
            
            // تلوين عدد أيام العمل في عمود الملاحظات بلون مختلف
            if (index === 5 && workDaysText) { // عمود الملاحظات
              const richTextArray = [];
              
              // النص العادي
              if (notes) {
                richTextArray.push({ text: notes, font: { name: 'Arial Unicode MS', size: 10 } });
              }
              
              // أيام العمل بلون مختلف (أزرق)
              if (workDaysText) {
                richTextArray.push({ 
                  text: workDaysText, 
                  font: { name: 'Arial Unicode MS', size: 10, bold: true, color: { argb: 'FF0066CC' } } 
                });
              }
              
              cell.value = { richText: richTextArray };
              cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            }
            
            cell.border = {
              top: { style: 'thin' }, bottom: { style: 'thin' },
              left: { style: 'thin' }, right: { style: 'thin' }
            };
          });
        }
        
        // إزالة صف الأجور المستحقة من الجدول الرئيسي حسب الطلب
        // (تم حذف الكود لإظهار الأجور المستحقة غير المسحوبة)
      });
    }

    // مصاريف النقليات والمواصلات
    if (dayData.transportationExpenses && dayData.transportationExpenses.length > 0) {
      dayData.transportationExpenses.forEach((expense: any) => {
        const amount = parseFloat((expense.amount || expense.totalAmount || 0).toString());
        if (amount > 0) {
          currentBalance -= amount; // طرح مصروف النقليات من الرصيد

          
          const expenseRow = worksheet.addRow([
            formatNumber(amount),
            'مواصلات', // تغيير من "نقليات" إلى "مواصلات"
            'منصرف',
            formatNumber(currentBalance),
            [expense.notes, expense.description, expense.destination, expense.expenseType].filter(Boolean).join(' - ') || 'مواصلات'
          ]);
          
          expenseRow.eachCell((cell) => {
            cell.font = { name: 'Arial Unicode MS', size: 10 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
              top: { style: 'thin' }, bottom: { style: 'thin' },
              left: { style: 'thin' }, right: { style: 'thin' }
            };
          });
        }
      });
    }

    // مشتريات المواد النقدية فقط (المؤجلة لا تظهر في الجدول الرئيسي)
    if (dayData.materialPurchases && dayData.materialPurchases.length > 0) {
      dayData.materialPurchases.forEach((material: any) => {
        // إظهار المشتريات النقدية فقط في الجدول الرئيسي - استبعاد الآجلة
        const paymentType = material.paymentType || material.purchaseType || 'نقد';
        const isCashPurchase = paymentType === 'cash' || paymentType === 'نقد' || paymentType === 'نقدي';
        const isDeferredPurchase = paymentType === 'آجل' || paymentType === 'أجل' || paymentType === 'deferred';
        const amount = parseFloat((material.totalAmount || material.totalCost || 0).toString());
        
        // إظهار فقط المشتريات النقدية وليس الآجلة
        if (amount > 0 && isCashPurchase && !isDeferredPurchase) {
          currentBalance -= amount; // طرح مشتريات المواد النقدية من الرصيد

          
          const materialRow = worksheet.addRow([
            formatNumber(amount),
            'مهندس',
            'منصرف',
            formatNumber(currentBalance),
            `${material.materialName || material.material?.name || 'مواد'}`
          ]);
          
          materialRow.eachCell((cell) => {
            cell.font = { name: 'Arial Unicode MS', size: 10 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
              top: { style: 'thin' }, bottom: { style: 'thin' },
              left: { style: 'thin' }, right: { style: 'thin' }
            };
          });
        }
      });
    }

    // تحويلات العمال - فقط إذا المبلغ أكبر من صفر
    if (dayData.workerTransfers && dayData.workerTransfers.length > 0) {
      dayData.workerTransfers.forEach((transfer: any) => {
        const amount = parseFloat((transfer.amount || 0).toString());
        if (amount && amount > 0) {
          currentBalance -= amount; // طرح تحويلات العمال من الرصيد
          
          // تحسين اسم الحساب ليظهر تفاصيل التحويل
          const workerName = transfer.workerName || transfer.worker?.name || 'عامل';
          const fromAccount = transfer.fromAccount || transfer.sourceAccount || 'المشروع';
          const accountName = `حولة من حساب ${fromAccount} ${workerName}`;
          
          // تحسين الملاحظات لتظهر بيانات التحويل كاملة
          let transferNotes = '';
          const recipientName = transfer.recipientName || transfer.receiverName || workerName;
          const transferNumber = transfer.transferNumber || transfer.referenceNumber || transfer.transactionId;
          
          // بناء الملاحظات بالتفاصيل المطلوبة
          if (recipientName && transferNumber) {
            transferNotes = `اسم المستلم: ${recipientName} - رقم الحوالة: ${transferNumber}`;
          } else if (recipientName) {
            transferNotes = `اسم المستلم: ${recipientName}`;
          } else if (transferNumber) {
            transferNotes = `رقم الحوالة: ${transferNumber}`;
          } else if (transfer.notes || transfer.description) {
            transferNotes = transfer.notes || transfer.description;
          } else {
            transferNotes = `تحويل إلى ${workerName}`;
          }
          
          // إضافة تاريخ التحويل إن وجد
          if (transfer.transferDate && transfer.transferDate !== dayData.date) {
            const transferDate = formatDate(transfer.transferDate);
            transferNotes += ` - تاريخ التحويل: ${transferDate}`;
          }
          
          const transferRow = worksheet.addRow([
            formatNumber(amount),
            accountName, // اسم الحساب المحسن
            'منصرف',
            formatNumber(currentBalance),
            transferNotes // الملاحظات المحسنة
          ]);
          
          transferRow.eachCell((cell) => {
            cell.font = { name: 'Arial Unicode MS', size: 10 };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = {
              top: { style: 'thin' }, bottom: { style: 'thin' },
              left: { style: 'thin' }, right: { style: 'thin' }
            };
          });
        }
      });
    }

    // مدفوعات الموردين - فقط إذا المبلغ أكبر من صفر
    if (dayData.supplierPayments && dayData.supplierPayments.length > 0) {
      dayData.supplierPayments.forEach((payment: any) => {
        const amount = parseFloat((payment.amount || 0).toString());
        if (amount && amount > 0) {
          currentBalance -= amount; // طرح مدفوعات الموردين من الرصيد
          
          const paymentRow = worksheet.addRow([
            formatNumber(amount),
            'دفع مورد',
            'منصرف',
            formatNumber(currentBalance),
            `دفع إلى ${payment.supplierName || 'مورد'} - ${payment.notes || payment.description || 'دفعة'}`
          ]);
          
          paymentRow.eachCell((cell) => {
            cell.font = { name: 'Arial Unicode MS', size: 10 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
              top: { style: 'thin' }, bottom: { style: 'thin' },
              left: { style: 'thin' }, right: { style: 'thin' }
            };
          });
        }
      });
    }

    // مصاريف أخرى ومتنوعة وحسابات أخرى - فقط إذا المبلغ أكبر من صفر
    if (dayData.miscExpenses && dayData.miscExpenses.length > 0) {
      dayData.miscExpenses.forEach((misc: any) => {
        const amount = parseFloat((misc.amount || misc.totalAmount || 0).toString());
        if (amount && amount > 0) {
          currentBalance -= amount; // طرح المصاريف المتنوعة من الرصيد
          
          // تحديد نوع المصروف
          let expenseType = misc.expenseType || 'مصروف متنوع';
          if (expenseType.includes('نثريات') && misc.description && misc.description.includes('نقليات')) {
            expenseType = 'نقليات';
          } else if (misc.category && misc.category.includes('حسابات أخرى')) {
            expenseType = 'منصرف - حسابات أخرى';
          }
          
          const miscRow = worksheet.addRow([
            formatNumber(amount),
            expenseType,
            'منصرف',
            formatNumber(currentBalance),
            misc.notes || misc.description || 'مصروف متنوع'
          ]);
          
          miscRow.eachCell((cell) => {
            cell.font = { name: 'Arial Unicode MS', size: 10 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
              top: { style: 'thin' }, bottom: { style: 'thin' },
              left: { style: 'thin' }, right: { style: 'thin' }
            };
          });
        }
      });
    }

    // صف المبلغ المتبقي النهائي (خلفية برتقالية) - العنوان والرصيد في نفس الصف مع دمج الخلايا

    const finalBalanceRow = worksheet.addRow(['المبلغ المتبقي النهائي', '', '', formatNumber(currentBalance), '']);
    
    // دمج الخلايا A إلى C لنص "المبلغ المتبقي النهائي"
    worksheet.mergeCells(`A${finalBalanceRow.number}:C${finalBalanceRow.number}`);
    
    finalBalanceRow.eachCell((cell, index) => {
      cell.font = { name: 'Arial Unicode MS', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2A4A' } };
      cell.border = {
        top: { style: 'medium' }, bottom: { style: 'medium' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
      
      if (index === 4 && currentBalance < 0) {
        cell.font = { ...cell.font, color: { argb: 'FFFF6B6B' } };
      }
    });
    finalBalanceRow.height = 22;

    // فراغ قبل الجدول الإضافي
    worksheet.addRow(['']);

    // جدول المشتريات (جميع المشتريات مع عمود نوع الدفع)
    if (dayData.materialPurchases && dayData.materialPurchases.length > 0) {
      // فراغ قبل الجدول الإضافي
      worksheet.addRow(['']);
      
      const purchasesHeaders = ['المشروع', 'محل التوريد', 'المبلغ', 'نوع الدفع', 'الملاحظات'];
      const purchasesHeaderRow = worksheet.addRow(purchasesHeaders);
      
      purchasesHeaderRow.eachCell((cell) => {
        cell.font = { name: 'Arial Unicode MS', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5090' } };
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        };
      });

      // عرض جميع المشتريات مع نوع الدفع وتنسيق أفضل للكميات والأرقام
      dayData.materialPurchases.forEach((purchase: any, index: number) => {
        console.log(`🔍 فحص مشترى رقم ${index + 1}:`, {
          quantity: purchase.quantity,
          totalAmount: purchase.totalAmount,
          totalCost: purchase.totalCost,
          materialName: purchase.materialName,
          paymentType: purchase.paymentType || purchase.purchaseType
        });
        
        const quantity = formatNumber(purchase.quantity || 1); // تنسيق الكمية لإزالة الأصفار الزائدة
        const amount = formatNumber(purchase.totalAmount || purchase.totalCost || 0);
        

        
        const purchaseDescription = `${quantity} ${purchase.materialName || purchase.material?.name || 'مادة'} ${purchase.notes || ''}`;
        const paymentType = purchase.purchaseType || purchase.paymentType || 'نقد';
        
        const purchaseRow = worksheet.addRow([
          dayData.projectName,
          purchase.supplierName || purchase.supplier?.name || 'إبراهيم نجم الدين',
          amount, // استخدام المتغير المُنسق
          paymentType,
          purchaseDescription
        ]);
        
        purchaseRow.eachCell((cell, index) => {
          cell.font = { name: 'Arial Unicode MS', size: 10 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          
          // تمييز المشتريات الآجلة بلون مختلف (في عمود نوع الدفع)
          if (index === 4 && (paymentType === 'آجل' || paymentType === 'أجل')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE6CC' } }; // لون برتقالي فاتح للآجل
          }
          
          cell.border = {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' }
          };
        });
      });
    }

    // تعديل عرض الأعمدة للجدول الرئيسي (5 أعمدة) مناسب لطباعة A4
    const columnsConfig = [
      { width: 12 }, // المبلغ - تقليل العرض
      { width: 18 }, // نوع الحساب - تقليل العرض  
      { width: 10 }, // نوع - تقليل العرض
      { width: 15 }, // المتبقي - تقليل العرض
      { width: 35 }  // ملاحظات - تقليل العرض مع التفاف النص
    ];
    
    // تطبيق إعدادات الأعمدة وزيادة ارتفاع الصفوف
    for (let i = 0; i < columnsConfig.length; i++) {
      if (worksheet.getColumn(i + 1)) {
        worksheet.getColumn(i + 1).width = columnsConfig[i].width;
      }
    }
    
    // زيادة ارتفاع جميع الصفوف بعد الرأس للتناسب مع التفاف النص وتوسيط المحتوى
    for (let rowIndex = 3; rowIndex <= worksheet.rowCount; rowIndex++) {
      const row = worksheet.getRow(rowIndex);
      if (row && row.hasValues) {
        row.height = 22; // زيادة الارتفاع إلى 22 لراحة أكبر
        
        // تطبيق التفاف النص وتوسيط المحتوى على جميع الخلايا
        row.eachCell((cell) => {
          cell.alignment = { 
            horizontal: 'center', 
            vertical: 'middle', 
            wrapText: true 
          };
        });
      }
    }

    // إعداد الطباعة المحسن لمقاس A4
    worksheet.pageSetup = {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToHeight: 1, // ضغط المحتوى في صفحة واحدة عمودياً
      fitToWidth: 1,  // ضغط المحتوى في صفحة واحدة أفقياً
      margins: {
        left: 0.5, right: 0.5,  // تقليل الهوامش لاستغلال أفضل للمساحة
        top: 0.6, bottom: 0.6,
        header: 0.2, footer: 0.2
      }
    };

    return worksheet;
  };

  // دالة تحميل صورة المعاينة
  const downloadComponentImage = async () => {
    try {

      
      const element = document.getElementById('bulk-export-component');
      if (!element) {
        alert('❌ لم يتم العثور على محتوى المعاينة');
        return;
      }

      // التقاط الصورة
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2, // جودة عالية
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        width: element.scrollWidth,
        height: element.scrollHeight
      });

      // تحويل إلى صورة وتحميلها
      const imgData = canvas.toDataURL('image/png', 1.0);
      const projectName = selectedProject?.name?.replace(/[\\/:*?"<>|]/g, '-') || 'مشروع';
      const fileName = `معاينة_تصدير_المصروفات_المجمعة_${projectName}.png`;
      const response = await fetch(imgData);
      const blob = await response.blob();
      await downloadFile(blob, fileName, 'image/png');


      
    } catch (error) {
      console.error('❌ خطأ في تحميل الصورة:', error);
      alert('❌ حدث خطأ أثناء تحميل صورة المعاينة. يرجى المحاولة مرة أخرى.');
    }
  };

  // دالة التصدير الرئيسية
  const handleBulkExport = async () => {
    if (!selectedProjectId) {
      toast({
        title: "يرجى تحديد المشروع",
        description: "يجب تحديد مشروع لتصدير المصروفات",
        variant: "destructive"
      });
      return;
    }

    if (!dateFrom || !dateTo) {
      toast({
        title: "يرجى تحديد الفترة الزمنية",
        description: "يجب تحديد تاريخ البداية والنهاية",
        variant: "destructive"
      });
      return;
    }

    if (new Date(dateFrom) > new Date(dateTo)) {
      toast({
        title: "خطأ في التواريخ",
        description: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    setExportProgress({ current: 0, total: 0 });

    try {

      
      // جلب البيانات
      const dailyExpenses = await fetchDailyExpensesForPeriod(selectedProjectId, dateFrom, dateTo);
      
      if (dailyExpenses.length === 0) {
        toast({
          title: "لا توجد بيانات",
          description: "لا توجد مصروفات في الفترة المحددة",
          variant: "destructive"
        });
        return;
      }



      // إنشاء ملف Excel
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'شركة الفتيني للمقاولات والاستشارات الهندسية';
      workbook.created = new Date();

      // إنشاء ورقة لكل يوم
      dailyExpenses.forEach((dayData) => {
        createDayWorksheet(workbook, dayData);
      });

      // تصدير الملف
      const buffer = await workbook.xlsx.writeBuffer();
      
      const projectName = selectedProject?.name?.replace(/[\\/:*?"<>|]/g, '-') || 'مشروع';
      const fileName = `تقرير_المصروفات_اليومية_${projectName}_من_${dateFrom}_إلى_${dateTo}.xlsx`;
      const downloadResult = await downloadExcelFile(buffer as ArrayBuffer, fileName);

      if (downloadResult) {
        toast({
          title: "تم التصدير بنجاح",
          description: `تم تصدير ${dailyExpenses.length} يوم من المصروفات اليومية`,
        });
      } else {
        toast({ title: "تعذر التنزيل", description: "تم تجهيز الملف لكن فشل التنزيل. حاول مرة أخرى.", variant: "destructive" });
      }



    } catch (error) {
      console.error('❌ خطأ في التصدير:', error);
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير المصروفات اليومية",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
      setExportProgress({ current: 0, total: 0 });
    }
  };

  // إعداد التواريخ الافتراضية
  React.useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    if (!dateTo) setDateTo(today);
    if (!dateFrom) setDateFrom(weekAgo);
  }, []);

  return (
    <Card className="w-full" id="bulk-export-component">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            تصدير المصروفات اليومية لفترة زمنية
          </CardTitle>
          <Button 
            onClick={downloadComponentImage}
            variant="secondary" 
            size="sm" 
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Camera className="h-4 w-4 mr-1" />
            تحميل صورة
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* تنبيه توضيحي */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-800">كيفية الاستخدام</h3>
          </div>
          <p className="text-sm text-blue-700 mt-2">
            سيتم إنشاء ملف Excel واحد يحتوي على ورقة منفصلة لكل يوم في الفترة المحددة.
            كل ورقة تحتوي على تفاصيل المصروفات اليومية لذلك اليوم.
          </p>
        </div>

        {/* معلومات المشروع */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-gray-800 mb-2">المشروع المحدد:</h3>
          <div className="flex items-center gap-2">
            {projectsLoading ? (
              <Badge variant="secondary" className="text-sm">
                جاري التحميل...
              </Badge>
            ) : selectedProject ? (
              <>
                <Badge variant="default" className="text-sm">
                  {selectedProject.name}
                </Badge>
                {selectedProject.status && (
                  <Badge variant={selectedProject.status === 'active' ? 'default' : 'secondary'}>
                    {selectedProject.status === 'active' ? 'نشط' : selectedProject.status}
                  </Badge>
                )}
              </>
            ) : (
              <Badge variant="destructive" className="text-sm">
                لم يتم تحديد مشروع
              </Badge>
            )}
          </div>
        </div>

        {/* اختيار الفترة الزمنية */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="dateFrom" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              من تاريخ
            </Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dateTo" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              إلى تاريخ
            </Label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Progress Bar */}
        {isExporting && exportProgress.total > 0 && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>جاري المعالجة...</span>
              <span>{exportProgress.current} من {exportProgress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* زر التصدير */}
        <div className="flex justify-center">
          <Button
            onClick={handleBulkExport}
            disabled={isExporting || !selectedProjectId}
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
          >
            {isExporting ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                جاري التصدير...
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-2" />
                تصدير إلى Excel
              </>
            )}
          </Button>
        </div>

        {/* معلومات إضافية */}
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h4 className="font-semibold text-green-800">ما سيتم تضمينه في التقرير:</h4>
          </div>
          <ul className="text-sm text-green-700 mt-2 space-y-1">
            <li>• ملخص الدخل والمصاريف لكل يوم (أرقام وتواريخ إنجليزية)</li>
            <li>• تفاصيل أجور العمال مع أيام وساعات العمل</li>
            <li>• مشتريات المواد والأدوات مع تفاصيل الموردين</li>
            <li>• مصاريف النقل والمواصلات</li>
            <li>• مدفوعات الموردين وطرق الدفع</li>
            <li>• الحوالات والتحويلات المالية</li>
            <li>• الرصيد المرحل من المشاريع الأخرى</li>
            <li>• جميع البيانات حقيقية من قاعدة البيانات</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}