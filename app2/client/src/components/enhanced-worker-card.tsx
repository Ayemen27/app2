import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { User, Clock, DollarSign, FileText, MoreHorizontal, ChevronDown, ChevronUp, Calendar, Activity, AlertCircle, CheckCircle, Timer, Calculator, MessageSquare, Banknote, TrendingUp, Target, Users, Briefcase } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Worker } from "@shared/schema";

type ViewMode = 'compact' | 'detailed' | 'batch';

interface AttendanceData {
  isPresent: boolean;
  startTime?: string;
  endTime?: string;
  workDescription?: string;
  workDays?: number;
  paidAmount?: string;
  paymentType?: string;
  // إضافة الحقول الجديدة
  hoursWorked?: number;
  overtime?: number;
  overtimeRate?: number;
  actualWage?: number;
  totalPay?: number;
  remainingAmount?: number;
  notes?: string;
}

interface EnhancedWorkerCardProps {
  worker: Worker;
  attendance: AttendanceData;
  onAttendanceChange: (attendance: AttendanceData) => void;
  viewMode?: ViewMode;
  isExpanded?: boolean;
  onExpandRequest?: () => void;
}

export default function EnhancedWorkerCard({ 
  worker, 
  attendance, 
  onAttendanceChange,
  viewMode = 'compact',
  isExpanded = false,
  onExpandRequest
}: EnhancedWorkerCardProps) {
  const [localAttendance, setLocalAttendance] = useState<AttendanceData>(attendance);
  const cardRef = useRef<HTMLDivElement>(null);

  // تحديث الحالة المحلية عند تغيير props
  useEffect(() => {
    setLocalAttendance(attendance);
  }, [attendance]);

  // تمرير تلقائي للبطاقة عند التوسيع في العرض المضغوط
  useEffect(() => {
    if (viewMode === 'compact' && isExpanded && cardRef.current) {
      // انتظار قصير للسماح للأنيميشن بالانتهاء
      const timer = setTimeout(() => {
        const card = cardRef.current;
        if (card) {
          // حساب موقع البطاقة بالنسبة للـ viewport
          const rect = card.getBoundingClientRect();
          const isOutOfView = rect.top < 0 || rect.bottom > window.innerHeight;
          
          if (isOutOfView) {
            // تمرير سلس للبطاقة مع هامش آمن
            const offsetTop = card.offsetTop - 80; // هامش علوي 80px
            window.scrollTo({
              top: offsetTop,
              behavior: 'smooth'
            });
          }
        }
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [viewMode, isExpanded]);

  const updateAttendance = (updates: Partial<AttendanceData>) => {
    const newAttendance = { ...localAttendance, ...updates };
    setLocalAttendance(newAttendance);
    onAttendanceChange(newAttendance);
  };

  const handleAttendanceToggle = (checked: boolean | "indeterminate") => {
    const isPresent = checked === true;
    updateAttendance({
      isPresent: isPresent,
      startTime: isPresent ? (localAttendance.startTime || "07:00") : undefined,
      endTime: isPresent ? (localAttendance.endTime || "15:00") : undefined,
      workDescription: isPresent ? localAttendance.workDescription : undefined,
      workDays: isPresent ? (localAttendance.workDays || 1.0) : undefined,
      paidAmount: isPresent ? localAttendance.paidAmount : undefined,
      paymentType: isPresent ? (localAttendance.paymentType || "partial") : undefined,
    });
  };

  // حساب ساعات العمل
  const calculateWorkingHours = () => {
    if (!localAttendance.startTime || !localAttendance.endTime) return 0;
    const start = new Date(`2000-01-01T${localAttendance.startTime}:00`);
    const end = new Date(`2000-01-01T${localAttendance.endTime}:00`);
    let diffMs = end.getTime() - start.getTime();
    
    // التعامل مع الورديات الليلية
    if (diffMs < 0) {
      diffMs += 24 * 60 * 60 * 1000; // إضافة 24 ساعة
    }
    
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.max(0, diffHours);
  };

  // حساب الأجر الأساسي (بدون الوقت الإضافي)
  const calculateBaseWage = () => {
    const workDays = localAttendance.workDays || 1.0;
    return parseFloat(worker.dailyWage) * workDays;
  };

  // حساب أجر الوقت الإضافي
  const calculateOvertimePay = () => {
    const overtime = localAttendance.overtime || 0;
    const overtimeRate = localAttendance.overtimeRate || 0;
    return overtime * overtimeRate;
  };

  // حساب إجمالي الأجر المستحق (المعادلة الموحدة)
  const calculateTotalPay = () => {
    const baseWage = calculateBaseWage();
    const overtimePay = calculateOvertimePay();
    return Math.max(0, baseWage + overtimePay); // حماية ضد القيم السالبة
  };

  // حساب المتبقي
  const calculateRemainingAmount = () => {
    const totalPay = calculateTotalPay();
    const paidAmount = parseFloat(localAttendance.paidAmount || "0");
    return totalPay - paidAmount;
  };

  // تحديث تلقائي للحسابات عند تغيير المدخلات
  useEffect(() => {
    if (localAttendance.isPresent) {
      const calculatedTotalPay = calculateTotalPay();
      const calculatedRemainingAmount = calculateRemainingAmount();
      
      // تحديث القيم المحسوبة إذا تغيرت
      if (localAttendance.totalPay !== calculatedTotalPay || 
          localAttendance.remainingAmount !== calculatedRemainingAmount ||
          localAttendance.hoursWorked !== calculateWorkingHours()) {
        
        const updatedAttendance = {
          ...localAttendance,
          actualWage: calculateBaseWage(),
          totalPay: calculatedTotalPay,
          remainingAmount: calculatedRemainingAmount,
          hoursWorked: calculateWorkingHours()
        };
        
        setLocalAttendance(updatedAttendance);
        onAttendanceChange(updatedAttendance);
      }
    }
  }, [localAttendance.workDays, localAttendance.overtime, localAttendance.overtimeRate, 
      localAttendance.paidAmount, localAttendance.startTime, localAttendance.endTime]);

  // تنسيق التاريخ
  const formatDate = (dateString: string | Date) => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Render compact view only if viewMode is compact AND not expanded
  if (viewMode === 'compact' && !isExpanded) {
    return (
      <Card className="mb-3 shadow-sm hover:shadow-md transition-shadow" data-testid={`worker-card-compact-${worker.id}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Worker info section */}
            <div className="flex items-center space-x-reverse space-x-4 flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                worker.type === "معلم" ? "bg-gradient-to-br from-primary to-primary/80" : 
                worker.type === "حداد" ? "bg-gradient-to-br from-orange-500 to-orange-600" :
                worker.type === "بلاط" ? "bg-gradient-to-br from-blue-500 to-blue-600" :
                worker.type === "دهان" ? "bg-gradient-to-br from-green-500 to-green-600" :
                "bg-gradient-to-br from-gray-500 to-gray-600"
              }`}>
                <User className="h-5 w-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-xl text-foreground truncate" data-testid={`worker-name-${worker.id}`}>
                  {worker.name}
                </h4>
                <div className="flex items-center space-x-reverse space-x-2 text-sm mt-1">
                  <span className="bg-secondary px-2 py-1 rounded-md text-xs font-medium">
                    {worker.type}
                  </span>
                  <span className="text-primary font-semibold arabic-numbers" data-testid={`worker-wage-${worker.id}`}>
                    {formatCurrency(worker.dailyWage)}/يوم
                  </span>
                </div>
              </div>
            </div>

            {/* Actions section */}
            <div className="flex items-center space-x-reverse space-x-3 mr-4">
              <div className="flex items-center space-x-reverse space-x-2">
                <Label htmlFor={`present-compact-${worker.id}`} className="text-sm font-medium text-foreground cursor-pointer">
                  حاضر
                </Label>
                <Checkbox
                  id={`present-compact-${worker.id}`}
                  checked={localAttendance.isPresent}
                  onCheckedChange={handleAttendanceToggle}
                  className="w-4 h-4"
                  data-testid={`worker-checkbox-${worker.id}`}
                />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onExpandRequest}
                className="h-8 px-3"
                data-testid={`worker-toggle-btn-${worker.id}`}
              >
                <ChevronDown className="h-4 w-4 ml-2" />
                تفاصيل أكثر
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render detailed view for: expanded compact mode, detailed mode, or batch mode
  const cardTestId = (viewMode === 'compact' && isExpanded) ? `worker-card-expanded-${worker.id}` : `worker-card-detailed-${worker.id}`;
  
  return (
    <Card ref={cardRef} className="mb-4 shadow-sm border-r-4 border-r-primary/20 hover:shadow-md transition-shadow w-full max-w-full overflow-hidden" data-testid={cardTestId}>
      <CardContent className="p-3 sm:p-4 md:p-6 max-w-full overflow-hidden">
        {/* رأس البطاقة - معلومات العامل */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-4 border-b border-border/50 gap-3 w-full max-w-full">
          <div className="flex items-center space-x-reverse space-x-3 flex-1 min-w-0 max-w-full overflow-hidden">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
              worker.type === "معلم" ? "bg-gradient-to-br from-primary to-primary/80" : 
              worker.type === "حداد" ? "bg-gradient-to-br from-orange-500 to-orange-600" :
              worker.type === "بلاط" ? "bg-gradient-to-br from-blue-500 to-blue-600" :
              worker.type === "دهان" ? "bg-gradient-to-br from-green-500 to-green-600" :
              "bg-gradient-to-br from-gray-500 to-gray-600"
            }`}>
              <User className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-reverse space-x-3 mb-2">
                <h4 className="font-bold text-lg text-foreground" data-testid={`worker-name-detailed-${worker.id}`}>{worker.name}</h4>
                <div className="flex items-center space-x-reverse space-x-1">
                  {worker.isActive ? (
                    <CheckCircle className="h-4 w-4 text-green-500" data-testid={`worker-status-active-${worker.id}`} />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" data-testid={`worker-status-inactive-${worker.id}`} />
                  )}
                  <span className={`text-xs font-medium ${worker.isActive ? 'text-green-700' : 'text-red-700'}`}>
                    {worker.isActive ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-reverse space-x-2 text-sm text-muted-foreground mb-1">
                <span className="bg-secondary px-2 py-1 rounded-md">{worker.type}</span>
                <span className="text-primary font-semibold arabic-numbers" data-testid={`worker-daily-wage-${worker.id}`}>
                  {formatCurrency(worker.dailyWage)}/يوم
                </span>
              </div>
              <div className="flex items-center space-x-reverse space-x-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span data-testid={`worker-created-date-${worker.id}`}>مضاف في: {formatDate(worker.createdAt)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-reverse space-x-3 flex-shrink-0">
            {/* Show collapse button only when expanded from compact mode */}
            {viewMode === 'compact' && isExpanded && onExpandRequest && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExpandRequest}
                className="h-8 px-3 ml-3"
                data-testid={`worker-toggle-btn-${worker.id}`}
              >
                <ChevronUp className="h-4 w-4 ml-2" />
                إخفاء التفاصيل
              </Button>
            )}
            <Label htmlFor={`present-${worker.id}`} className="text-sm font-medium text-foreground cursor-pointer">
              حاضر
            </Label>
            <Checkbox
              id={`present-${worker.id}`}
              checked={localAttendance.isPresent}
              onCheckedChange={handleAttendanceToggle}
              className="w-5 h-5"
            />
          </div>
        </div>
        
        {/* تفاصيل الحضور */}
        {localAttendance.isPresent && (
          <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
            {/* قسم أوقات العمل وساعات العمل */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 p-3 sm:p-4 rounded-lg border border-blue-100 dark:border-blue-800 w-full max-w-full overflow-hidden">
              <div className="flex items-center space-x-reverse space-x-2 mb-4">
                <Clock className="h-5 w-5 text-blue-600" />
                <h5 className="font-semibold text-blue-800 dark:text-blue-200" data-testid={`work-time-section-${worker.id}`}>أوقات وساعات العمل</h5>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-blue-700 dark:text-blue-300">من الساعة</Label>
                  <Input
                    type="time"
                    value={localAttendance.startTime || "07:00"}
                    onChange={(e) => updateAttendance({ startTime: e.target.value })}
                    className="text-center font-mono"
                    data-testid={`start-time-input-${worker.id}`}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-blue-700 dark:text-blue-300">إلى الساعة</Label>
                  <Input
                    type="time"
                    value={localAttendance.endTime || "15:00"}
                    onChange={(e) => updateAttendance({ endTime: e.target.value })}
                    className="text-center font-mono"
                    data-testid={`end-time-input-${worker.id}`}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-blue-700 dark:text-blue-300">ساعات العمل</Label>
                  <div className="h-10 px-3 py-2 bg-blue-100/50 dark:bg-blue-900/30 rounded-md flex items-center justify-center">
                    <span className="font-bold text-blue-700 dark:text-blue-300 arabic-numbers" data-testid={`working-hours-display-${worker.id}`}>
                      {calculateWorkingHours().toFixed(1)} ساعة
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-blue-700 dark:text-blue-300">أيام العمل</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0.1"
                    max="2.0"
                    value={localAttendance.workDays || 1.0}
                    onChange={(e) => updateAttendance({ workDays: parseFloat(e.target.value) || 1.0 })}
                    className="text-center arabic-numbers"
                    data-testid={`work-days-input-${worker.id}`}
                  />
                </div>
              </div>
              
              {/* الوقت الإضافي */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4 pt-4 border-t border-blue-200 dark:border-blue-700 w-full">
                <div className="space-y-2">
                  <Label className="flex items-center space-x-reverse space-x-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                    <TrendingUp className="h-4 w-4" />
                    <span>ساعات إضافية</span>
                  </Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0"
                    max="8"
                    value={localAttendance.overtime || 0}
                    onChange={(e) => updateAttendance({ overtime: parseFloat(e.target.value) || 0 })}
                    className="text-center arabic-numbers"
                    data-testid={`overtime-input-${worker.id}`}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center space-x-reverse space-x-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                    <Calculator className="h-4 w-4" />
                    <span>معدل الساعة الإضافية</span>
                  </Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={localAttendance.overtimeRate || ""}
                    onChange={(e) => updateAttendance({ overtimeRate: parseFloat(e.target.value) || 0 })}
                    className="text-center arabic-numbers"
                    data-testid={`overtime-rate-input-${worker.id}`}
                  />
                </div>
              </div>
            </div>

            {/* قسم وصف العمل */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-3 sm:p-4 rounded-lg border border-green-100 dark:border-green-800 w-full max-w-full overflow-hidden">
              <div className="flex items-center space-x-reverse space-x-2 mb-3">
                <Briefcase className="h-5 w-5 text-green-600" />
                <h5 className="font-semibold text-green-800 dark:text-green-200" data-testid={`work-description-section-${worker.id}`}>وصف العمل</h5>
              </div>
              <AutocompleteInput
                value={localAttendance.workDescription || ""}
                onChange={(value) => updateAttendance({ workDescription: value })}
                placeholder="اكتب وصف العمل المنجز..."
                category="workDescriptions"
                className="w-full"
                data-testid={`work-description-input-${worker.id}`}
              />
            </div>

            {/* قسم الدفع والأجور */}
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 p-3 sm:p-4 rounded-lg border border-amber-100 dark:border-amber-800 w-full max-w-full overflow-hidden">
              <div className="flex items-center space-x-reverse space-x-2 mb-4">
                <Banknote className="h-5 w-5 text-amber-600" />
                <h5 className="font-semibold text-amber-800 dark:text-amber-200" data-testid={`payment-section-${worker.id}`}>معلومات الدفع والأجور</h5>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-amber-700 dark:text-amber-300">نوع الدفع</Label>
                  <Select
                    value={localAttendance.paymentType || "partial"}
                    onValueChange={(value) => updateAttendance({ paymentType: value })}
                  >
                    <SelectTrigger data-testid={`payment-type-select-${worker.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">دفع كامل</SelectItem>
                      <SelectItem value="partial">دفع جزئي</SelectItem>
                      <SelectItem value="credit">على الحساب</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-amber-700 dark:text-amber-300">الأجر الفعلي</Label>
                  <div className="h-10 px-3 py-2 bg-amber-100/50 dark:bg-amber-900/30 rounded-md flex items-center justify-center">
                    <span className="font-bold text-amber-700 dark:text-amber-300 arabic-numbers" data-testid={`actual-wage-display-${worker.id}`}>
                      {formatCurrency(calculateBaseWage())}
                    </span>
                  </div>
                </div>
                
                {localAttendance.paymentType !== "credit" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-amber-700 dark:text-amber-300">المبلغ المدفوع</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={localAttendance.paidAmount || ""}
                      onChange={(e) => updateAttendance({ paidAmount: e.target.value })}
                      className="text-center arabic-numbers"
                      data-testid={`paid-amount-input-${worker.id}`}
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-amber-700 dark:text-amber-300">المبلغ المتبقي</Label>
                  <div className="h-10 px-3 py-2 bg-amber-100/50 dark:bg-amber-900/30 rounded-md flex items-center justify-center">
                    <span className={`font-bold arabic-numbers ${
                      calculateRemainingAmount() > 0 ? 'text-red-600' : calculateRemainingAmount() < 0 ? 'text-green-600' : 'text-amber-700 dark:text-amber-300'
                    }`} data-testid={`remaining-amount-display-${worker.id}`}>
                      {formatCurrency(Math.abs(calculateRemainingAmount()))}
                      {calculateRemainingAmount() > 0 && ' (مستحق)'}
                      {calculateRemainingAmount() < 0 && ' (فائض)'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4 pt-4 border-t border-amber-200 dark:border-amber-700 w-full">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-amber-700 dark:text-amber-300">إجمالي الدفع المطلوب</Label>
                  <div className="h-10 px-3 py-2 bg-amber-200/50 dark:bg-amber-800/50 rounded-md flex items-center justify-center">
                    <span className="font-bold text-amber-800 dark:text-amber-200 arabic-numbers text-lg" data-testid={`total-pay-display-${worker.id}`}>
                      {formatCurrency(calculateTotalPay())}
                    </span>
                  </div>
                  
                  {/* تفصيل الحساب */}
                  <div className="text-xs text-amber-600 dark:text-amber-400 space-y-1">
                    <div className="flex justify-between">
                      <span>الأجر الأساسي ({localAttendance.workDays || 1.0} يوم):</span>
                      <span className="arabic-numbers">{formatCurrency(calculateBaseWage())}</span>
                    </div>
                    {(localAttendance.overtime && localAttendance.overtimeRate) ? (
                      <div className="flex justify-between">
                        <span>الوقت الإضافي ({localAttendance.overtime} ساعة × {localAttendance.overtimeRate}):</span>
                        <span className="arabic-numbers">{formatCurrency(calculateOvertimePay())}</span>
                      </div>
                    ) : null}
                    <div className="border-t border-amber-300 pt-1 flex justify-between font-medium">
                      <span>الإجمالي:</span>
                      <span className="arabic-numbers">{formatCurrency(calculateTotalPay())}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* قسم الملاحظات الإضافية */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 p-3 sm:p-4 rounded-lg border border-purple-100 dark:border-purple-800 w-full max-w-full overflow-hidden">
              <div className="flex items-center space-x-reverse space-x-2 mb-3">
                <MessageSquare className="h-5 w-5 text-purple-600" />
                <h5 className="font-semibold text-purple-800 dark:text-purple-200" data-testid={`notes-section-${worker.id}`}>ملاحظات إضافية</h5>
              </div>
              <AutocompleteInput
                value={localAttendance.notes || ""}
                onChange={(value) => updateAttendance({ notes: value })}
                placeholder="اكتب أي ملاحظات إضافية حول العامل أو الحضور..."
                category="workerNotes"
                className="w-full"
                data-testid={`notes-input-${worker.id}`}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}