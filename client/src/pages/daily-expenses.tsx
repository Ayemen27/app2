/**
 * الوصف: صفحة إدارة المصاريف اليومية والتحويلات المالية
 * المدخلات: تاريخ محدد ومعرف المشروع
 * المخرجات: عرض وإدارة جميع المصاريف والتحويلات اليومية
 * المالك: عمار
 * آخر تعديل: 2025-08-20
 * الحالة: نشط - الصفحة الأساسية لإدارة المصاريف
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowRight, Save, Users, Car, Plus, Edit2, Trash2, ChevronDown, ChevronUp, ArrowLeftRight, RefreshCw, Wallet, Banknote, Package, Truck, Receipt, Building2, Send, TrendingDown, Calculator, FileSpreadsheet, DollarSign, Calendar, Building, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { UnifiedCard, UnifiedCardField } from "@/components/ui/unified-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { WellSelector } from "@/components/well-selector";
import ExpenseSummary from "@/components/expense-summary";
import WorkerMiscExpenses from "./worker-misc-expenses";
import { getCurrentDate, formatCurrency, formatDate, cleanNumber } from "@/lib/utils";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { apiRequest } from "@/lib/queryClient";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedSearchFilter } from "@/components/ui/unified-search-filter";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";
import { exportTransactionsToExcel } from "@/components/ui/export-transactions-excel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { queueForSync } from "@/offline/offline";
import type { 
  WorkerAttendance, 
  TransportationExpense, 
  FundTransfer,
  MaterialPurchase,
  WorkerTransfer,
  Worker,
  Project,
  InsertFundTransfer,
  InsertTransportationExpense,
  InsertDailyExpenseSummary,
  ProjectFundTransfer 
} from "@shared/schema";

function DailyExpensesContent() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { selectedProjectId, selectProject, isAllProjects } = useSelectedProject();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [carriedForward, setCarriedForward] = useState<string>("0");
  const [showProjectTransfers, setShowProjectTransfers] = useState<boolean>(true);
  const [searchValue, setSearchValue] = useState<string>("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    dateRange: undefined,
    type: 'all',
    transportCategory: 'all',
    miscCategory: 'all'
  });

  const handleFilterChange = useCallback((key: string, value: any) => {
    if (key === 'date') {
      if (value instanceof Date) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        setSelectedDate(`${year}-${month}-${day}`);
      } else {
        setSelectedDate(null);
      }
    } else if (key === 'dateRange') {
      setFilterValues(prev => ({ ...prev, [key]: value }));
      if (value?.from) {
        setSelectedDate(null);
      }
    } else {
      setFilterValues(prev => ({ ...prev, [key]: value }));
    }
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchValue("");
    setFilterValues({
      dateRange: undefined,
      type: 'all'
    });
    setSelectedDate(getCurrentDate());
    toast({
      title: "تم إعادة التعيين",
      description: "تم مسح جميع الفلاتر وتعيين تاريخ اليوم",
    });
  }, [toast]);

  // استخدام useFinancialSummary الموحد لتحسين الأداء وتجنب اختلاف البيانات
  const { 
    totals: financialTotals,
    summary: financialSummary, 
    isLoading: summaryLoading, 
    refetch: refetchFinancial 
  } = useFinancialSummary({
    projectId: selectedProjectId === 'all' ? undefined : selectedProjectId,
    date: selectedDate || undefined,
    enabled: !!selectedProjectId
  });

  const financialTotalsMemo = useMemo(() => ({
    totalIncome: financialSummary?.income?.totalIncome || 0,
    totalExpenses: financialSummary?.expenses?.totalCashExpenses || 0,
    remainingBalance: financialSummary?.cashBalance || 0,
    totalWorkerWages: financialSummary?.expenses?.workerWages || 0,
    totalFundTransfers: financialSummary?.income?.fundTransfers || 0,
    totalMaterialCosts: financialSummary?.expenses?.materialExpenses || 0,
    totalTransportation: financialSummary?.expenses?.transportExpenses || 0,
    totalMiscExpenses: financialSummary?.expenses?.miscExpenses || 0,
    totalWorkerTransfers: financialSummary?.expenses?.workerTransfers || 0,
    materialExpensesCredit: financialSummary?.expenses?.materialExpensesCredit || 0,
    incomingProjectTransfers: financialSummary?.income?.incomingProjectTransfers || 0,
    outgoingProjectTransfers: financialSummary?.expenses?.outgoingProjectTransfers || 0,
  }), [financialSummary]);

  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedWellId, setSelectedWellId] = useState<number | undefined>();
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isFundTransfersExpanded, setIsFundTransfersExpanded] = useState(false);
  const [isTransportationExpanded, setIsTransportationExpanded] = useState(false);
  const [isAttendanceExpanded, setIsAttendanceExpanded] = useState(false);

  const [fundAmount, setFundAmount] = useState<string>("");
  const [senderName, setSenderName] = useState<string>("");
  const [transferNumber, setTransferNumber] = useState<string>("");
  const [transferType, setTransferType] = useState<string>("");
  const [editingFundTransferId, setEditingFundTransferId] = useState<string | null>(null);
  const [fundTransferWellId, setFundTransferWellId] = useState<number | undefined>();
  const [transportDescription, setTransportDescription] = useState<string>("");
  const [transportAmount, setTransportAmount] = useState<string>("");
  const [transportNotes, setTransportNotes] = useState<string>("");
  const [editingTransportationId, setEditingTransportationId] = useState<string | null>(null);

  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
  const [workerDays, setWorkerDays] = useState<string>("");
  const [workerAmount, setWorkerAmount] = useState<string>("");
  const [workerNotes, setWorkerNotes] = useState<string>("");
  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null);
  const [editWorkerDays, setEditWorkerDays] = useState<string>("");
  const [editWorkerAmount, setEditWorkerAmount] = useState<string>("");
  const [editWorkerNotes, setEditWorkerNotes] = useState<string>("");

  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();

  const saveAutocompleteValue = async (field: string, value: string) => {
    if (!value || value.trim().length < 2) return;
    try {
      await apiRequest('/api/autocomplete', 'POST', {
        category: field,
        value: value.trim(),
        usageCount: 1
      });
    } catch (error) {
      console.warn(`Failed to save autocomplete value for ${field}:`, error);
    }
  };

  useEffect(() => {
    setSelectedDate(getCurrentDate());
  }, []);

  const queryOptions = {
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  };

  const { data: workers = [] } = useQuery<Worker[]>({
    queryKey: ["/api/workers"],
    queryFn: async () => {
      const response = await apiRequest("/api/workers", "GET");
      return Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
    },
    ...queryOptions
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await apiRequest("/api/projects", "GET");
      return Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
    },
    ...queryOptions
  });

  const refreshAllData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    refetchFinancial();
  }, [queryClient, refetchFinancial]);

  const addWorkerAttendanceMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/worker-attendance", "POST", data),
    onSuccess: () => {
      refreshAllData();
      setWorkerDays("");
      setWorkerAmount("");
      setWorkerNotes("");
      setSelectedWorkerId("");
      toast({ title: "تم إضافة الحضور", description: "تم تسجيل أجر العامل بنجاح" });
    },
    onError: async (error: any) => {
      try {
        const attendanceData = {
          workerId: selectedWorkerId,
          days: workerDays ? parseFloat(workerDays) : 0,
          amount: workerAmount ? parseFloat(workerAmount) : 0,
          notes: workerNotes,
          selectedDate,
          projectId: selectedProjectId
        };
        await queueForSync('create', '/api/worker-attendance', attendanceData);
        toast({ title: "تم الحفظ محليًا", description: "خطأ في الاتصال - سيتم المزامنة عند الاتصال" });
      } catch (queueError) {
        toast({ title: "خطأ", description: error?.message || "حدث خطأ أثناء إضافة الحضور", variant: "destructive" });
      }
    }
  });

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="space-y-6">
        {/* ملخص مالي علوي */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400">إجمالي الدخل</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {formatCurrency(financialTotalsMemo.totalIncome)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500 opacity-50" />
            </CardContent>
          </Card>

          <Card className="bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 dark:text-red-400">إجمالي المصروفات</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {formatCurrency(financialTotalsMemo.totalExpenses)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500 opacity-50" />
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400">الرصيد المتبقي</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {formatCurrency(financialTotalsMemo.remainingBalance)}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-green-500 opacity-50" />
            </CardContent>
          </Card>

          <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400">أجور العمال</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {formatCurrency(financialTotalsMemo.totalWorkerWages)}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500 opacity-50" />
            </CardContent>
          </Card>
        </div>

        {/* أدوات التحكم والفلترة */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-4 rounded-lg border shadow-sm">
          <div className="flex items-center gap-4 flex-1 min-w-[300px]">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="date-filter">التاريخ المعروض</Label>
              <Input
                type="date"
                id="date-filter"
                value={selectedDate || ""}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full"
              />
            </div>
            <WellSelector 
              projectId={selectedProjectId === 'all' ? undefined : selectedProjectId} 
              onChange={setSelectedWellId}
              value={selectedWellId}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={refreshAllData}
              disabled={summaryLoading}
            >
              <RefreshCw className={`h-4 w-4 ml-2 ${summaryLoading ? 'animate-spin' : ''}`} />
              تحديث البيانات
            </Button>
            <Button 
              variant="default"
              onClick={() => setIsAddFormOpen(!isAddFormOpen)}
            >
              <Plus className="h-4 w-4 ml-2" />
              إضافة مصروف جديد
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Collapsible
            open={isFundTransfersExpanded}
            onOpenChange={setIsFundTransfersExpanded}
            className="w-full border rounded-lg overflow-hidden bg-card"
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between p-4 h-auto hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-full dark:bg-blue-900/30">
                    <ArrowLeftRight className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-right">
                    <h3 className="font-semibold text-lg">التحويلات الواردة</h3>
                    <p className="text-xs text-muted-foreground">إجمالي المبالغ المستلمة للمشروع</p>
                  </div>
                </div>
                {isFundTransfersExpanded ? <ChevronUp /> : <ChevronDown />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 border-t bg-muted/30">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="space-y-2">
                  <Label>المبلغ المستلم</Label>
                  <Input 
                    type="number" 
                    value={fundAmount} 
                    onChange={(e) => setFundAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>اسم المحول</Label>
                  <AutocompleteInput
                    category="senderNames"
                    value={senderName}
                    onChange={setSenderName}
                    placeholder="مثال: المركز الرئيسي"
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم الحوالة</Label>
                  <Input 
                    value={transferNumber} 
                    onChange={(e) => setTransferNumber(e.target.value)}
                    placeholder="اختياري"
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <Button className="w-full">حفظ التحويل</Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible
            open={isAttendanceExpanded}
            onOpenChange={setIsAttendanceExpanded}
            className="w-full border rounded-lg overflow-hidden bg-card"
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between p-4 h-auto hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-2 rounded-full dark:bg-purple-900/30">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="text-right">
                    <h3 className="font-semibold text-lg">أجور وتكاليف العمال</h3>
                    <p className="text-xs text-muted-foreground">تسجيل حضور وأجور العمال اليومية</p>
                  </div>
                </div>
                {isAttendanceExpanded ? <ChevronUp /> : <ChevronDown />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 border-t bg-muted/30">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>العامل</Label>
                  <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر العامل" />
                    </SelectTrigger>
                    <SelectContent>
                      {workers.map(worker => (
                        <SelectItem key={worker.id} value={worker.id}>{worker.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>عدد الأيام/الورديات</Label>
                  <Input 
                    type="number" 
                    step="0.5" 
                    value={workerDays} 
                    onChange={(e) => setWorkerDays(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>المبلغ</Label>
                  <Input 
                    type="number" 
                    value={workerAmount} 
                    onChange={(e) => setWorkerAmount(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    className="w-full" 
                    onClick={() => addWorkerAttendanceMutation.mutate({
                      workerId: selectedWorkerId,
                      days: parseFloat(workerDays),
                      amount: parseFloat(workerAmount),
                      notes: workerNotes,
                      date: selectedDate,
                      projectId: selectedProjectId
                    })}
                  >
                    إضافة الأجر
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible
            open={isTransportationExpanded}
            onOpenChange={setIsTransportationExpanded}
            className="w-full border rounded-lg overflow-hidden bg-card"
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between p-4 h-auto hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-2 rounded-full dark:bg-orange-900/30">
                    <Truck className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="text-right">
                    <h3 className="font-semibold text-lg">النقل والمحروقات</h3>
                    <p className="text-xs text-muted-foreground">تكاليف نقل المواد ووقود المعدات</p>
                  </div>
                </div>
                {isTransportationExpanded ? <ChevronUp /> : <ChevronDown />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 border-t bg-muted/30">
              <div className="text-center py-4 text-muted-foreground italic">
                يمكنك إضافة تكاليف النقل من خلال النموذج الموحد أعلاه أو تفعيل النموذج السريع هنا قريباً.
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="mt-8">
          <ExpenseSummary 
            totalIncome={financialTotalsMemo.totalIncome}
            totalExpenses={financialTotalsMemo.totalExpenses}
            remainingBalance={financialTotalsMemo.remainingBalance}
            materialExpensesCredit={financialTotalsMemo.materialExpensesCredit}
            details={{
              workerWages: financialTotalsMemo.totalWorkerWages,
              materialCosts: financialTotalsMemo.totalMaterialCosts,
              transportation: financialTotalsMemo.totalTransportation,
              miscExpenses: financialTotalsMemo.totalMiscExpenses
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function DailyExpenses() {
  return (
    <ErrorBoundary>
      <DailyExpensesContent />
    </ErrorBoundary>
  );
}
