import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowRight, Save, ChartGantt, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { useToast } from "@/hooks/use-toast";
import { useSelectedProject } from "@/hooks/use-selected-project";
import ProjectSelector from "@/components/project-selector";
import EnhancedWorkerCard from "@/components/enhanced-worker-card";
import { getCurrentDate, formatCurrency } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedSearchFilter } from "@/components/ui/unified-search-filter";
import type { Worker, InsertWorkerAttendance } from "@shared/schema";

interface AttendanceData {
  [workerId: string]: {
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
  };
}


export default function WorkerAttendance() {
  const [, setLocation] = useLocation();
  const { selectedProjectId, selectProject } = useSelectedProject();
  const [activeFilters, setActiveFilters] = useState({});

  // Get URL parameters for editing
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');
  const workerId = urlParams.get('worker');
  const dateParam = urlParams.get('date');
  const [selectedDate, setSelectedDate] = useState(dateParam || getCurrentDate());
  const [attendanceData, setAttendanceData] = useState<AttendanceData>({});
  const [showSharedSettings, setShowSharedSettings] = useState(false);

  // إعدادات مشتركة لجميع العمال
  const [bulkSettings, setBulkSettings] = useState({
    startTime: "07:00",
    endTime: "15:00",
    workDays: 1.0,
    paymentType: "partial",
    paidAmount: "",
    workDescription: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();

  // تعيين إجراء الزر العائم لحفظ الحضور
  useEffect(() => {
    const handleFloatingSave = () => {
      // محاكاة كليك زر الحفظ
      const submitButton = document.querySelector('[type="submit"]') as HTMLButtonElement;
      submitButton?.click();
    };

    setFloatingAction(handleFloatingSave, "حفظ الحضور");
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  // دالة مساعدة لحفظ قيم الإكمال التلقائي
  const saveAutocompleteValue = async (category: string, value: string | null | undefined) => {
    if (!value || typeof value !== 'string' || !value.trim()) return;
    try {
      await apiRequest("/api/autocomplete", "POST", { 
        category, 
        value: value.trim() 
      });
    } catch (error) {
      // تجاهل الأخطاء لأن هذه عملية مساعدة
      console.log(`Failed to save autocomplete value for ${category}:`, error);
    }
  };

  // Get today's attendance records
  const { data: todayAttendance = [] } = useQuery({
    queryKey: ["/api/projects", selectedProjectId, "worker-attendance", selectedDate],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/projects/${selectedProjectId}/worker-attendance?date=${selectedDate}`, "GET");
        // معالجة الهيكل المتداخل للاستجابة
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Error fetching attendance records:", error);
        return [];
      }
    },
    enabled: !!selectedProjectId,
  });

  // Fetch specific attendance record for editing
  const { data: attendanceToEdit } = useQuery({
    queryKey: ["/api/worker-attendance", editId],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/worker-attendance/${editId}`, "GET");
        // معالجة الهيكل المتداخل للاستجابة
        if (response && response.data) {
          return response.data;
        }
        return response || null;
      } catch (error) {
        console.error("Error fetching attendance record for editing:", error);
        return null;
      }
    },
    enabled: !!editId,
  });

  // Effect to populate form when editing
  useEffect(() => {
    if (attendanceToEdit && workerId) {
      const newAttendanceData = { ...attendanceData };
      newAttendanceData[workerId] = {
        isPresent: true,
        startTime: attendanceToEdit.startTime,
        endTime: attendanceToEdit.endTime,
        workDescription: attendanceToEdit.workDescription || "",
        workDays: parseFloat(attendanceToEdit.workDays || '1.0'),
        paidAmount: attendanceToEdit.paidAmount?.toString() || "",
        paymentType: attendanceToEdit.paymentType || "partial"
      };
      setAttendanceData(newAttendanceData);
    }
  }, [attendanceToEdit, workerId]);

  // Delete Attendance Mutation
  const deleteAttendanceMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/worker-attendance/${id}`, "DELETE"),
    onSuccess: () => {
      toast({
        title: "تم الحذف",
        description: "تم حذف سجل الحضور بنجاح",
      });
      queryClient.refetchQueries({ queryKey: ["/api/projects", selectedProjectId, "worker-attendance"] });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف سجل الحضور",
        variant: "destructive",
      });
    }
  });

  // Edit Attendance Function
  const handleEditAttendance = (record: any) => {
    const worker = Array.isArray(workers) ? workers.find(w => w.id === record.workerId) : null;
    if (worker) {
      const newAttendanceData = { ...attendanceData };
      newAttendanceData[record.workerId] = {
        isPresent: true,
        startTime: record.startTime,
        endTime: record.endTime,
        workDescription: record.workDescription || "",
        workDays: parseFloat(record.workDays || '1.0'),
        paidAmount: record.paidAmount,
        paymentType: record.paymentType || "partial"
      };
      setAttendanceData(newAttendanceData);
    }
  };

  const { data: workers = [], isLoading: workersLoading } = useQuery<Worker[]>({
    queryKey: ["/api/workers"],
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: async (attendanceRecords: InsertWorkerAttendance[]) => {
      console.log("💾 بدء حفظ سجلات الحضور للعمال:", attendanceRecords.length);

      // حفظ قيم الإكمال التلقائي قبل العملية الأساسية
      const autocompletePromises = attendanceRecords.flatMap(record => [
        saveAutocompleteValue('workDescriptions', record.workDescription),
        saveAutocompleteValue('paymentTypes', record.paymentType)
      ]).filter(Boolean);

      if (autocompletePromises.length > 0) {
        await Promise.all(autocompletePromises);
      }

      // تحسين منطق الحفظ لتجنب تضارب السجلات الموجودة
      const results = [];
      const errors = [];

      for (const record of attendanceRecords) {
        try {
          console.log(`🔄 محاولة حفظ حضور العامل: ${record.workerId} في التاريخ: ${record.date}`);

          // أولاً: محاولة التحقق من وجود سجل موجود
          try {
            const existingRecordResponse = await apiRequest(
              `/api/projects/${record.projectId}/attendance?date=${record.date}&workerId=${record.workerId}`, 
              "GET"
            );

            const existingRecords = existingRecordResponse?.data || existingRecordResponse || [];
            const existingRecord = Array.isArray(existingRecords) 
              ? existingRecords.find((r: any) => r.workerId === record.workerId)
              : null;

            if (existingRecord) {
              console.log(`📝 تحديث سجل موجود للعامل: ${record.workerId}`);
              // تحديث السجل الموجود باستخدام PATCH
              const updatedRecord = await apiRequest(
                `/api/worker-attendance/${existingRecord.id}`, 
                "PATCH", 
                record
              );
              results.push(updatedRecord);
            } else {
              console.log(`➕ إنشاء سجل جديد للعامل: ${record.workerId}`);
              // إنشاء سجل جديد باستخدام POST
              const newRecord = await apiRequest("/api/worker-attendance", "POST", record);
              results.push(newRecord);
            }
          } catch (checkError) {
            console.log(`➕ سجل غير موجود، إنشاء جديد للعامل: ${record.workerId}`);
            // إذا فشل التحقق، نحاول إنشاء سجل جديد
            const newRecord = await apiRequest("/api/worker-attendance", "POST", record);
            results.push(newRecord);
          }

        } catch (error: any) {
          console.error(`❌ فشل في حفظ حضور العامل ${record.workerId}:`, error);
          errors.push({
            workerId: record.workerId,
            error: error.message || "خطأ غير معروف"
          });
        }
      }

      console.log(`✅ تم حفظ ${results.length} سجل حضور بنجاح`);
      if (errors.length > 0) {
        console.warn(`⚠️ فشل في حفظ ${errors.length} سجل حضور:`, errors);
      }

      return { 
        successful: results, 
        failed: errors,
        totalProcessed: attendanceRecords.length 
      };
    },
    onSuccess: async (result) => {
      // تحديث كاش autocomplete للتأكد من ظهور البيانات الجديدة
      queryClient.refetchQueries({ queryKey: ["/api/autocomplete"] });
      queryClient.refetchQueries({ queryKey: ["/api/projects", selectedProjectId, "worker-attendance"] });

      const { successful, failed, totalProcessed } = result;

      if (failed.length === 0) {
        // جميع العمليات نجحت
        toast({
          title: "تم الحفظ بنجاح",
          description: `تم حفظ حضور ${successful.length} عامل بنجاح`,
        });
      } else if (successful.length > 0) {
        // بعض العمليات نجحت وبعضها فشل
        toast({
          title: "تم الحفظ جزئياً",
          description: `نجح حفظ ${successful.length} عامل، فشل ${failed.length} عامل`,
          variant: "default",
        });
        console.error("تفاصيل الأخطاء:", failed);
      } else {
        // جميع العمليات فشلت
        toast({
          title: "فشل الحفظ",
          description: `فشل في حفظ جميع سجلات الحضور (${failed.length} عامل)`,
          variant: "destructive",
        });
      }

      // مسح البيانات المحفوظة فقط للعمال الذين تم حفظهم بنجاح
      if (successful.length > 0) {
        setAttendanceData(prevData => {
          const newData = { ...prevData };
          successful.forEach((record: any) => {
            const savedRecord = record?.data || record;
            if (savedRecord?.workerId) {
              delete newData[savedRecord.workerId];
            }
          });
          return newData;
        });
      }
    },
    onError: async (error: any, attendanceRecords) => {
      // حفظ قيم الإكمال التلقائي حتى في حالة الخطأ
      const autocompletePromises = attendanceRecords.flatMap(record => [
        saveAutocompleteValue('workDescriptions', record.workDescription),
        saveAutocompleteValue('paymentTypes', record.paymentType)
      ]).filter(Boolean);

      if (autocompletePromises.length > 0) {
        await Promise.all(autocompletePromises);
        // تحديث كاش autocomplete
        queryClient.refetchQueries({ queryKey: ["/api/autocomplete"] });
      }

      console.error("Error saving attendance:", error);
      let errorMessage = "حدث خطأ أثناء حفظ الحضور";

      // التحقق من رسالة الخطأ المحددة
      if (error?.response?.data?.error || error?.message) {
        const serverError = error?.response?.data?.error || error?.message;
        if (serverError.includes("تم تسجيل حضور هذا العامل مسبقاً")) {
          errorMessage = "تم تسجيل حضور هذا العامل مسبقاً في هذا التاريخ";
        } else {
          errorMessage = serverError;
        }
      }

      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });


  const handleAttendanceChange = (workerId: string, attendance: AttendanceData[string]) => {
    setAttendanceData(prev => ({
      ...prev,
      [workerId]: attendance,
    }));
  };

  // تطبيق الإعدادات المشتركة على جميع العمال المحددين
  const applyBulkSettings = () => {
    const newAttendanceData = { ...attendanceData };

    console.log("=== تطبيق الإعدادات المشتركة ===");
    console.log("الإعدادات المشتركة:", bulkSettings);

    Object.keys(newAttendanceData).forEach(workerId => {
      if (newAttendanceData[workerId].isPresent) {
        console.log(`تطبيق الإعدادات على العامل ${workerId}`);
        console.log(`المبلغ المدفوع من الإعدادات: "${bulkSettings.paidAmount}"`);

        newAttendanceData[workerId] = {
          ...newAttendanceData[workerId],
          startTime: bulkSettings.startTime,
          endTime: bulkSettings.endTime,
          workDays: bulkSettings.workDays,
          paymentType: bulkSettings.paymentType,
          paidAmount: bulkSettings.paidAmount,
          workDescription: bulkSettings.workDescription
        };

        console.log("البيانات بعد التطبيق:", newAttendanceData[workerId]);
      }
    });

    setAttendanceData(newAttendanceData);

    toast({
      title: "تم التطبيق",
      description: "تم تطبيق الإعدادات على جميع العمال المحددين",
    });
  };

  // تحديد/إلغاء تحديد جميع العمال
  const toggleAllWorkers = (isPresent: boolean) => {
    const newAttendanceData: AttendanceData = {};

    console.log("=== تحديد جميع العمال ===");
    console.log("حالة الحضور:", isPresent);
    console.log("الإعدادات المشتركة:", bulkSettings);

    workers.forEach(worker => {
      if (isPresent) {
        console.log(`إضافة العامل ${worker.name} بالمبلغ: "${bulkSettings.paidAmount}"`);
        newAttendanceData[worker.id] = {
          isPresent: true,
          startTime: bulkSettings.startTime,
          endTime: bulkSettings.endTime,
          workDays: bulkSettings.workDays,
          paymentType: bulkSettings.paymentType,
          paidAmount: bulkSettings.paidAmount,
          workDescription: bulkSettings.workDescription
        };
      } else {
        newAttendanceData[worker.id] = {
          isPresent: false
        };
      }
    });

    console.log("البيانات النهائية:", newAttendanceData);
    setAttendanceData(newAttendanceData);
  };

  const handleSaveAttendance = () => {
    if (!selectedProjectId) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار المشروع أولاً",
        variant: "destructive",
      });
      return;
    }

    console.log("=== تصحيح الأخطاء - بيانات الحضور قبل الحفظ ===");
    console.log("attendanceData:", attendanceData);

    const attendanceRecords: InsertWorkerAttendance[] = Object.entries(attendanceData)
      .filter(([_, data]) => data.isPresent)
      .map(([workerId, data]) => {
        const worker = workers.find(w => w.id === workerId);
        const dailyWage = parseFloat(worker?.dailyWage || "0");
        const workDays = data.workDays || 1.0;
        
        // حساب الأجر الأساسي
        const baseWage = dailyWage * workDays;
        
        // حساب الوقت الإضافي
        const overtime = data.overtime || 0;
        const overtimeRate = data.overtimeRate || 0;
        const overtimePay = overtime * overtimeRate;
        
        // حساب إجمالي الدفع (المعادلة الموحدة)
        const totalPay = Math.max(0, baseWage + overtimePay);
        
        // حساب المبلغ المدفوع والمتبقي
        const paidAmount = parseFloat(data.paidAmount || "0");
        const remainingAmount = data.paymentType === 'credit' ? totalPay : (totalPay - paidAmount);

        // حساب ساعات العمل
        const calculateWorkingHours = () => {
          if (!data.startTime || !data.endTime) return 0;
          const start = new Date(`2000-01-01T${data.startTime}:00`);
          const end = new Date(`2000-01-01T${data.endTime}:00`);
          let diffMs = end.getTime() - start.getTime();
          
          // التعامل مع الورديات الليلية
          if (diffMs < 0) {
            diffMs += 24 * 60 * 60 * 1000;
          }
          
          return Math.max(0, diffMs / (1000 * 60 * 60));
        };

        console.log(`العامل ${worker?.name}:`);
        console.log(`  - الأجر الأساسي: ${baseWage}`);
        console.log(`  - الوقت الإضافي: ${overtimePay}`);
        console.log(`  - إجمالي الدفع: ${totalPay}`);
        console.log(`  - المبلغ المدفوع: ${paidAmount}`);
        console.log(`  - المبلغ المتبقي: ${remainingAmount}`);

        return {
          projectId: selectedProjectId,
          workerId,
          date: selectedDate,
          attendanceDate: selectedDate,
          startTime: data.startTime || "07:00",
          endTime: data.endTime || "15:00",
          workDescription: data.workDescription || "",
          isPresent: true,
          workDays: workDays,
          dailyWage: worker?.dailyWage || "0",
          // الحقول الجديدة المطلوبة
          hoursWorked: calculateWorkingHours().toString(),
          overtime: overtime.toString(),
          overtimeRate: overtimeRate.toString(),
          actualWage: baseWage.toString(),
          totalPay: totalPay.toString(),
          paidAmount: paidAmount.toString(),
          remainingAmount: remainingAmount.toString(),
          paymentType: data.paymentType || "partial",
          notes: data.notes || "",
        };
      });

    if (attendanceRecords.length === 0) {
      toast({
        title: "تنبيه",
        description: "لم يتم تحديد أي عامل كحاضر",
        variant: "destructive",
      });
      return;
    }

    saveAttendanceMutation.mutate(attendanceRecords);
  };

  return (
    <div className="p-4 slide-in">

      <Card className="mb-4">
        <CardContent className="p-4">
          <h2 className="text-lg font-bold text-foreground flex items-center">
            <ChartGantt className="ml-2 h-5 w-5 text-primary" />
            اختر المشروع
          </h2>
          <ProjectSelector
            selectedProjectId={selectedProjectId}
            onProjectChange={(projectId, projectName) => selectProject(projectId, projectName)}
            showHeader={false}
            variant="compact"
          />
        </CardContent>
      </Card>

      {/* Date Selection */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <Label className="block text-sm font-medium text-foreground">التاريخ</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full"
          />
        </CardContent>
      </Card>


      {/* الإعدادات المشتركة */}
      {workers.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-reverse space-x-2">
                <h3 className="text-lg font-semibold text-foreground">الإعدادات المشتركة</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSharedSettings(!showSharedSettings)}
                  className="px-2 py-1 h-8"
                  data-testid="toggle-shared-settings"
                >
                  {showSharedSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
              {showSharedSettings && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleAllWorkers(true)}
                    className="text-xs"
                  >
                    تحديد الكل
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleAllWorkers(false)}
                    className="text-xs"
                  >
                    إلغاء الكل
                  </Button>
                  <Button
                    size="sm"
                    onClick={applyBulkSettings}
                    className="text-xs"
                  >
                    تطبيق على المحدد
                  </Button>
                </div>
              )}
            </div>

            {showSharedSettings && (
              <div className="space-y-1">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">وقت البدء</Label>
                <Input
                  type="time"
                  value={bulkSettings.startTime}
                  onChange={(e) => setBulkSettings(prev => ({ ...prev, startTime: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">وقت الانتهاء</Label>
                <Input
                  type="time"
                  value={bulkSettings.endTime}
                  onChange={(e) => setBulkSettings(prev => ({ ...prev, endTime: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">عدد الأيام</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0.1"
                  max="2.0"
                  value={bulkSettings.workDays}
                  onChange={(e) => setBulkSettings(prev => ({ ...prev, workDays: parseFloat(e.target.value) || 1.0 }))}
                  className="mt-1 arabic-numbers"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">نوع الدفع</Label>
                <Select
                  value={bulkSettings.paymentType}
                  onValueChange={(value) => setBulkSettings(prev => ({ ...prev, paymentType: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">دفع كامل</SelectItem>
                    <SelectItem value="partial">دفع جزئي</SelectItem>
                    <SelectItem value="credit">على الحساب</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {bulkSettings.paymentType !== "credit" && (
                <div>
                  <Label className="text-xs text-muted-foreground">المبلغ المدفوع</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={bulkSettings.paidAmount}
                    onChange={(e) => setBulkSettings(prev => ({ ...prev, paidAmount: e.target.value }))}
                    className="mt-1 arabic-numbers"
                  />
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">وصف العمل</Label>
                <AutocompleteInput
                  value={bulkSettings.workDescription}
                  onChange={(value) => setBulkSettings(prev => ({ ...prev, workDescription: value }))}
                  placeholder="اكتب وصف العمل..."
                  category="workDescriptions"
                  className="mt-1"
                />
              </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Worker List */}
      {workersLoading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">جاري تحميل العمال...</p>
        </div>
      ) : workers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">لا توجد عمال مسجلين</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Array.isArray(workers) ? workers.map((worker) => (
            <EnhancedWorkerCard
              key={worker.id}
              worker={worker}
              attendance={attendanceData[worker.id] || { isPresent: false }}
              onAttendanceChange={(attendance) => handleAttendanceChange(worker.id, attendance)}
              selectedDate={selectedDate}
            />
          )) : null}
        </div>
      )}

      {/* Save Button */}
      {workers.length > 0 && (
        <div className="mt-6">
          <Button
            onClick={handleSaveAttendance}
            disabled={saveAttendanceMutation.isPending}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Save className="ml-2 h-4 w-4" />
            {saveAttendanceMutation.isPending ? "جاري الحفظ..." : "حفظ الحضور"}
          </Button>
        </div>
      )}

      {/* Today's Attendance List */}
      {selectedProjectId && todayAttendance.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-foreground">حضور اليوم المسجل ({selectedDate})</h3>
            <div className="space-y-3">
              {todayAttendance.map((record: any) => {
                const worker = workers.find(w => w.id === record.workerId);
                return (
                  <div key={record.id} className="border rounded-lg p-3 bg-card">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{worker?.name}</span>
                          <span className="text-xs bg-success text-success-foreground px-2 py-1 rounded">حاضر</span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>الوقت: {record.startTime} - {record.endTime}</p>
                          <p>الراتب اليومي: {record.dailyWage} ر.ي</p>
                          <p>المدفوع: {record.paidAmount} ر.ي | المتبقي: {record.remainingAmount} ر.ي</p>
                          {record.workDescription && <p>الوصف: {record.workDescription}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditAttendance(record)}
                        >
                          تعديل
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteAttendanceMutation.mutate(record.id)}
                          disabled={deleteAttendanceMutation.isPending}
                        >
                          حذف
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}