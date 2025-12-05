import React, { useState, useEffect, useCallback } from 'react';
import { Save, ChevronDown, ChevronUp, Users, Clock, DollarSign, CheckCircle2, User, Calendar, Edit2, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { useToast } from "../../hooks/use-toast";
import { getCurrentDate, formatCurrency } from "../../lib/utils";
import { UnifiedCard, UnifiedCardGrid } from "../../components/ui/unified-card";
import { UnifiedFilterDashboard } from "../../components/ui/unified-filter-dashboard";
import { listAttendance, createAttendance, updateAttendance, deleteAttendance, getAttendanceByWorkerAndDate } from "./repo";
import { listWorkers } from "../workers/repo";
import { listProjects } from "../projects/repo";
import type { Worker, Project, WorkerAttendance } from "../../db/schema";

interface AttendanceData {
  [workerId: string]: {
    isPresent: boolean;
    startTime?: string;
    endTime?: string;
    workDescription?: string;
    workDays?: number;
    paidAmount?: string;
    paymentType?: string;
    hoursWorked?: number;
    overtime?: number;
    overtimeRate?: number;
    actualWage?: number;
    totalPay?: number;
    remainingAmount?: number;
    notes?: string;
    recordId?: string;
    recordType?: "work" | "advance";
  };
}

interface WorkerAttendanceCardProps {
  worker: Worker;
  attendance: AttendanceData[string];
  onAttendanceChange: (attendance: AttendanceData[string]) => void;
  selectedDate: string;
}

function WorkerAttendanceCard({ worker, attendance, onAttendanceChange, selectedDate }: WorkerAttendanceCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [recordType, setRecordType] = useState<"work" | "advance">(attendance.recordType || "work");

  const isPresentToday = attendance.isPresent && selectedDate === getCurrentDate();

  const updateAttendanceLocal = (updates: Partial<AttendanceData[string]>) => {
    const newAttendance = { ...attendance, ...updates };
    onAttendanceChange(newAttendance);
  };

  const handleAttendanceToggle = () => {
    const isPresent = !attendance.isPresent;
    
    if (!isPresent) {
      setShowDetails(false);
    }
    
    const baseUpdate = {
      isPresent: isPresent,
      recordType: isPresent ? recordType : undefined,
    };
    
    if (isPresent && recordType === "work") {
      updateAttendanceLocal({
        ...baseUpdate,
        startTime: attendance.startTime || "07:00",
        endTime: attendance.endTime || "15:00",
        workDescription: attendance.workDescription,
        workDays: attendance.workDays || 0,
        paidAmount: attendance.paidAmount,
        paymentType: attendance.paymentType || "partial",
      });
    } else if (isPresent && recordType === "advance") {
      updateAttendanceLocal({
        ...baseUpdate,
        workDays: 0,
        paidAmount: attendance.paidAmount || "0",
        paymentType: "advance",
        startTime: undefined,
        endTime: undefined,
      });
    } else {
      updateAttendanceLocal(baseUpdate);
    }
  };

  const calculateBaseWage = () => {
    if (!attendance.isPresent) return 0;
    if (recordType === "advance") return 0;
    const workDays = attendance.workDays || 0;
    const dailyWage = worker.dailyWage || 0;
    return Math.max(0, dailyWage * workDays);
  };

  const calculateRemainingAmount = () => {
    if (recordType === "advance") {
      const advanceAmount = parseFloat(attendance.paidAmount || "0");
      return -advanceAmount;
    }
    const totalPay = calculateBaseWage();
    const paidAmount = parseFloat(attendance.paidAmount || "0");
    return totalPay - paidAmount;
  };

  return (
    <Card className={`mb-3 shadow-sm border-r-4 w-full overflow-hidden ${
      isPresentToday 
        ? "border-r-green-400 bg-gradient-to-r from-green-50/50 to-green-100/30" 
        : "border-r-primary/20 hover:border-r-primary/40"
    }`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-white font-bold text-sm shadow-md">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-lg text-foreground truncate">{worker.name}</h4>
                {worker.status === 'active' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                ) : (
                  <span className="h-4 w-4 text-red-500 flex-shrink-0">✕</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="font-medium">{worker.workerType}</span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <span className="font-bold">{formatCurrency(worker.dailyWage)}</span>
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {attendance.isPresent && (
              <>
                <Button
                  variant={recordType === "work" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setRecordType("work");
                    updateAttendanceLocal({ recordType: "work" });
                  }}
                  className="px-2 py-1 h-8 text-xs"
                >
                  عمل
                </Button>
                <Button
                  variant={recordType === "advance" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setRecordType("advance");
                    updateAttendanceLocal({ recordType: "advance" });
                  }}
                  className="px-2 py-1 h-8 text-xs"
                >
                  سحب
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="px-2 py-1 h-8"
                >
                  {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </>
            )}
            <Label className="text-sm font-medium cursor-pointer">حاضر</Label>
            <input
              type="checkbox"
              checked={attendance.isPresent}
              onChange={handleAttendanceToggle}
              className="w-5 h-5 cursor-pointer"
            />
          </div>
        </div>
        
        {attendance.isPresent && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">الأجر اليومي</span>
                  <span className="font-bold">{formatCurrency(worker.dailyWage)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-blue-200">
                  <span className="text-muted-foreground font-medium">المستحق</span>
                  <span className="font-bold text-blue-600">{formatCurrency(calculateBaseWage())}</span>
                </div>
              </div>
            </div>
            
            <div className={`p-2 rounded-lg border ${recordType === "advance" ? "bg-red-50 border-red-200" : "bg-purple-50 border-purple-200"}`}>
              <div className="space-y-1.5 text-sm">
                {recordType === "work" ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">عدد الأيام</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        min="0"
                        max="2.0"
                        value={attendance.workDays ?? ""}
                        onChange={(e) => updateAttendanceLocal({ workDays: e.target.value === "" ? 0 : parseFloat(e.target.value) })}
                        placeholder="0"
                        className="w-20 text-center text-sm h-7"
                      />
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-purple-200">
                      <span className="text-muted-foreground font-medium">المتبقي</span>
                      <span className={`font-bold ${calculateRemainingAmount() > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                        {formatCurrency(Math.abs(calculateRemainingAmount()))}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">المبلغ المسحوب</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        placeholder="0"
                        value={attendance.paidAmount || ""}
                        onChange={(e) => updateAttendanceLocal({ paidAmount: e.target.value })}
                        className="w-20 text-center text-sm h-7"
                      />
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-red-200">
                      <span className="text-muted-foreground font-medium">الدين</span>
                      <span className="font-bold text-red-600">{formatCurrency(Math.abs(calculateRemainingAmount()))}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        
        {attendance.isPresent && showDetails && (
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs font-medium text-slate-600">من</Label>
                <Input
                  type="time"
                  value={attendance.startTime || "07:00"}
                  onChange={(e) => updateAttendanceLocal({ startTime: e.target.value })}
                  className="text-center text-sm h-8"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600">إلى</Label>
                <Input
                  type="time"
                  value={attendance.endTime || "15:00"}
                  onChange={(e) => updateAttendanceLocal({ endTime: e.target.value })}
                  className="text-center text-sm h-8"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600">المدفوع</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  placeholder="0"
                  value={attendance.paidAmount || ""}
                  onChange={(e) => updateAttendanceLocal({ paidAmount: e.target.value })}
                  className="text-center text-sm h-8"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium text-slate-600">نوع الدفع</Label>
                <Select
                  value={attendance.paymentType || "partial"}
                  onValueChange={(value) => updateAttendanceLocal({ paymentType: value })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">دفع كامل</SelectItem>
                    <SelectItem value="partial">دفع جزئي</SelectItem>
                    <SelectItem value="credit">على الحساب</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600">وصف العمل</Label>
                <Input
                  type="text"
                  placeholder="وصف العمل..."
                  value={attendance.workDescription || ""}
                  onChange={(e) => updateAttendanceLocal({ workDescription: e.target.value })}
                  className="text-sm h-8"
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AttendancePage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState(getCurrentDate());
  const [attendanceData, setAttendanceData] = useState<AttendanceData>({});
  const [showSharedSettings, setShowSharedSettings] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [bulkSettings, setBulkSettings] = useState({
    startTime: "07:00",
    endTime: "15:00",
    workDays: 0,
    paymentType: "partial",
    paidAmount: "",
    workDescription: ""
  });

  const { toast } = useToast();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<WorkerAttendance[]>([]);
  const [allProjectAttendance, setAllProjectAttendance] = useState<WorkerAttendance[]>([]);
  const [workersLoading, setWorkersLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [workersData, projectsData] = await Promise.all([
        listWorkers({ status: 'active' }),
        listProjects({ status: 'active' })
      ]);
      setWorkers(workersData);
      setProjects(projectsData);
      
      if (projectsData.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projectsData[0].id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل البيانات",
        variant: "destructive",
      });
    } finally {
      setWorkersLoading(false);
      setProjectsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedProjectId, toast]);

  const loadAttendance = useCallback(async () => {
    if (!selectedProjectId) return;
    
    try {
      const [todayData, allData] = await Promise.all([
        listAttendance({ projectId: selectedProjectId, startDate: selectedDate, endDate: selectedDate }),
        listAttendance({ projectId: selectedProjectId })
      ]);
      setTodayAttendance(todayData);
      setAllProjectAttendance(allData);
    } catch (error) {
      console.error("Error loading attendance:", error);
    }
  }, [selectedProjectId, selectedDate]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  useEffect(() => {
    setAttendanceData({});
  }, [selectedDate]);

  const handleAttendanceChange = (workerId: string, attendance: AttendanceData[string]) => {
    setAttendanceData(prev => ({
      ...prev,
      [workerId]: attendance,
    }));
  };

  const applyBulkSettings = () => {
    const newAttendanceData = { ...attendanceData };

    Object.keys(newAttendanceData).forEach(workerId => {
      if (newAttendanceData[workerId].isPresent) {
        newAttendanceData[workerId] = {
          ...newAttendanceData[workerId],
          startTime: bulkSettings.startTime,
          endTime: bulkSettings.endTime,
          workDays: bulkSettings.workDays,
          paymentType: bulkSettings.paymentType,
          paidAmount: bulkSettings.paidAmount,
          workDescription: bulkSettings.workDescription
        };
      }
    });

    setAttendanceData(newAttendanceData);
    toast({
      title: "تم التطبيق",
      description: "تم تطبيق الإعدادات على جميع العمال المحددين",
    });
  };

  const toggleAllWorkers = (isPresent: boolean) => {
    const newAttendanceData: AttendanceData = {};

    workers.forEach(worker => {
      if (isPresent) {
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

    setAttendanceData(newAttendanceData);
  };

  const handleSaveAttendance = async () => {
    if (!selectedProjectId) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار المشروع أولاً",
        variant: "destructive",
      });
      return;
    }

    const invalidRecords = Object.entries(attendanceData)
      .filter(([_, data]) => {
        if (!data.isPresent) return false;
        if ((data as any).recordType !== "advance" && (!data.workDays || data.workDays <= 0)) {
          return true;
        }
        if ((data as any).recordType === "advance" && (!data.paidAmount || data.paidAmount === "0")) {
          return true;
        }
        return false;
      });
    
    if (invalidRecords.length > 0) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى إدخال عدد أيام عمل > 0 للعمل العادي أو مبلغ > 0 للسحب المقدم",
        variant: "destructive",
      });
      return;
    }

    const attendanceRecords = Object.entries(attendanceData)
      .filter(([_, data]) => {
        if (!data.isPresent) return false;
        if ((data as any).recordType !== "advance") {
          return data.workDays && data.workDays > 0;
        }
        return data.paidAmount && parseFloat(data.paidAmount) > 0;
      })
      .map(([workerId, data]) => {
        const worker = workers.find(w => w.id === workerId);
        const dailyWage = worker?.dailyWage || 0;
        const workDays = (data as any).recordType === "advance" ? 0 : (data.workDays || 0);
        const paidAmount = parseFloat(data.paidAmount || "0");

        return {
          workerId,
          projectId: selectedProjectId,
          date: selectedDate,
          workDays,
          dailyWage,
          paidAmount,
          notes: data.workDescription || "",
          recordId: (data as any).recordId,
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

    setIsSaving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const record of attendanceRecords) {
        try {
          if (record.recordId) {
            await updateAttendance({
              id: record.recordId,
              workDays: record.workDays,
              dailyWage: record.dailyWage,
              paidAmount: record.paidAmount,
              notes: record.notes,
            });
            successCount++;
          } else {
            const existing = await getAttendanceByWorkerAndDate(record.workerId, record.date);
            if (existing) {
              await updateAttendance({
                id: existing.id,
                workDays: record.workDays,
                dailyWage: record.dailyWage,
                paidAmount: record.paidAmount,
                notes: record.notes,
              });
            } else {
              await createAttendance({
                workerId: record.workerId,
                projectId: record.projectId,
                date: record.date,
                workDays: record.workDays,
                dailyWage: record.dailyWage,
                paidAmount: record.paidAmount,
                notes: record.notes,
              });
            }
            successCount++;
          }
        } catch (error) {
          console.error(`Error saving attendance for worker ${record.workerId}:`, error);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        toast({
          title: "تم الحفظ بنجاح",
          description: `تم حفظ حضور ${successCount} عامل بنجاح`,
        });
      } else if (successCount > 0) {
        toast({
          title: "تم الحفظ جزئياً",
          description: `نجح حفظ ${successCount} عامل، فشل ${errorCount} عامل`,
        });
      } else {
        toast({
          title: "فشل الحفظ",
          description: `فشل في حفظ جميع سجلات الحضور`,
          variant: "destructive",
        });
      }

      setAttendanceData({});
      await loadAttendance();
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الحضور",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAttendance = async (id: string) => {
    setIsDeleting(id);
    try {
      await deleteAttendance(id);
      toast({
        title: "تم الحذف",
        description: "تم حذف سجل الحضور بنجاح",
      });
      await loadAttendance();
    } catch (error) {
      console.error("Error deleting attendance:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف سجل الحضور",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEditAttendance = (record: WorkerAttendance) => {
    const worker = workers.find(w => w.id === record.workerId);
    if (worker) {
      const newAttendanceData = { ...attendanceData };
      newAttendanceData[record.workerId] = {
        isPresent: true,
        workDays: record.workDays,
        paidAmount: record.paidAmount.toString(),
        paymentType: "partial",
        recordId: record.id,
        notes: record.notes,
        recordType: "work",
      };
      setAttendanceData(newAttendanceData);
    }
  };

  const todayRecords = todayAttendance;
  const presentWorkers = todayRecords.length;
  const totalWorkDays = todayRecords.reduce((sum, record) => sum + record.workDays, 0);
  
  let totalEarned = 0;
  let totalPaid = 0;
  
  todayRecords.forEach(record => {
    const worker = workers.find(w => w.id === record.workerId);
    const currentDailyWage = worker?.dailyWage || record.dailyWage;
    const workDays = record.workDays;
    const earned = currentDailyWage * workDays;
    const paid = record.paidAmount;
    totalEarned += earned;
    totalPaid += paid;
  });
    
  const totalRemaining = totalEarned - totalPaid;

  const filteredWorkers = workers.filter(worker => 
    worker.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    worker.phone?.includes(searchValue)
  );

  return (
    <div className="p-4">
      <div className="mb-4">
        <Label className="block text-sm font-medium mb-2">المشروع</Label>
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger>
            <SelectValue placeholder="اختر المشروع" />
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

      {selectedProjectId && (
        <UnifiedFilterDashboard
          statsRows={[
            {
              columns: 3,
              items: [
                { key: 'total', label: 'إجمالي العمال', value: workers.length, icon: Users, color: 'blue' },
                { key: 'present', label: 'الحاضرون', value: presentWorkers, icon: CheckCircle2, color: 'green' },
                { key: 'days', label: 'أيام العمل', value: totalWorkDays.toFixed(1), icon: Clock, color: 'orange' },
              ]
            },
            {
              columns: 3,
              items: [
                { key: 'earned', label: 'المستحق', value: formatCurrency(totalEarned), icon: DollarSign, color: 'blue' },
                { key: 'paid', label: 'المدفوع', value: formatCurrency(totalPaid), icon: CheckCircle2, color: 'green' },
                { key: 'remaining', label: 'المتبقي', value: formatCurrency(totalRemaining), icon: DollarSign, color: totalRemaining >= 0 ? 'purple' : 'red' },
              ]
            }
          ]}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="ابحث عن عامل..."
          onRefresh={loadData}
          isRefreshing={isRefreshing}
        />
      )}

      <Card className="mb-4 mt-4">
        <CardContent className="p-4">
          <Label className="block text-sm font-medium text-foreground">التاريخ</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full mt-1"
          />
        </CardContent>
      </Card>

      {workers.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-foreground">الإعدادات المشتركة</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSharedSettings(!showSharedSettings)}
                  className="px-2 py-1 h-8"
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
              <div className="space-y-3 mt-4">
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
                      min="0"
                      max="2.0"
                      value={bulkSettings.workDays || ""}
                      onChange={(e) => setBulkSettings(prev => ({ 
                        ...prev, 
                        workDays: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 
                      }))}
                      placeholder="0"
                      className="mt-1"
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
                        className="mt-1"
                      />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-muted-foreground">وصف العمل</Label>
                    <Input
                      type="text"
                      value={bulkSettings.workDescription}
                      onChange={(e) => setBulkSettings(prev => ({ ...prev, workDescription: e.target.value }))}
                      placeholder="اكتب وصف العمل..."
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {workersLoading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">جاري تحميل العمال...</p>
        </div>
      ) : filteredWorkers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">لا توجد عمال مسجلين</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredWorkers.map((worker) => (
            <WorkerAttendanceCard
              key={worker.id}
              worker={worker}
              attendance={attendanceData[worker.id] || { isPresent: false }}
              onAttendanceChange={(attendance) => handleAttendanceChange(worker.id, attendance)}
              selectedDate={selectedDate}
            />
          ))}
        </div>
      )}

      {workers.length > 0 && (
        <div className="mt-6">
          <Button
            onClick={handleSaveAttendance}
            disabled={isSaving}
            className="w-full"
          >
            <Save className="ml-2 h-4 w-4" />
            {isSaving ? "جاري الحفظ..." : "حفظ الحضور"}
          </Button>
        </div>
      )}

      {selectedProjectId && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {todayAttendance.length > 0 
              ? `حضور اليوم المسجل (${selectedDate})` 
              : `جميع سجلات الحضور للمشروع`}
          </h3>
          {todayAttendance.length > 0 ? (
            <UnifiedCardGrid columns={1}>
              {todayAttendance.map((record) => {
                const worker = workers.find(w => w.id === record.workerId);
                const currentDailyWage = worker?.dailyWage || record.dailyWage;
                const workDays = record.workDays;
                const calculatedActualWage = currentDailyWage * workDays;
                const paidAmount = record.paidAmount;
                const remainingAmount = calculatedActualWage - paidAmount;
                
                return (
                  <UnifiedCard
                    key={record.id}
                    title={worker?.name || record.workerId}
                    subtitle={record.date}
                    titleIcon={User}
                    headerColor="#22c55e"
                    badges={[
                      { label: 'حاضر', variant: 'success' }
                    ]}
                    fields={[
                      {
                        label: "عدد الأيام",
                        value: workDays.toString(),
                        icon: Calendar,
                        color: "warning",
                      },
                      {
                        label: "الراتب اليومي",
                        value: formatCurrency(currentDailyWage),
                        icon: DollarSign,
                        color: "default",
                      },
                      {
                        label: "المستحق",
                        value: formatCurrency(calculatedActualWage),
                        icon: DollarSign,
                        color: "info",
                        emphasis: true,
                      },
                      {
                        label: "المدفوع",
                        value: formatCurrency(paidAmount),
                        icon: CheckCircle2,
                        color: "success",
                      },
                      {
                        label: "المتبقي",
                        value: formatCurrency(remainingAmount),
                        icon: DollarSign,
                        color: remainingAmount > 0 ? "danger" : "success",
                        emphasis: true,
                      },
                    ]}
                    actions={[
                      {
                        icon: Edit2,
                        label: "تعديل",
                        onClick: () => handleEditAttendance(record),
                        color: "blue",
                      },
                      {
                        icon: Trash2,
                        label: "حذف",
                        onClick: () => handleDeleteAttendance(record.id),
                        color: "red",
                        disabled: isDeleting === record.id,
                      },
                    ]}
                    footer={record.notes ? (
                      <p className="text-sm text-muted-foreground">{record.notes}</p>
                    ) : undefined}
                    compact
                  />
                );
              })}
            </UnifiedCardGrid>
          ) : allProjectAttendance.length > 0 ? (
            <div>
              <p className="text-sm text-muted-foreground mb-4">لا توجد سجلات لتاريخ اليوم ({selectedDate}). تم عرض جميع السجلات:</p>
              <UnifiedCardGrid columns={1}>
                {allProjectAttendance.slice(0, 10).map((record) => {
                  const worker = workers.find(w => w.id === record.workerId);
                  const currentDailyWage = worker?.dailyWage || record.dailyWage;
                  const workDays = record.workDays;
                  const calculatedActualWage = currentDailyWage * workDays;
                  const paidAmount = record.paidAmount;
                  const remainingAmount = calculatedActualWage - paidAmount;
                  
                  return (
                    <UnifiedCard
                      key={record.id}
                      title={worker?.name || record.workerId}
                      subtitle={record.date}
                      titleIcon={User}
                      headerColor="#22c55e"
                      badges={[
                        { label: 'حاضر', variant: 'success' }
                      ]}
                      fields={[
                        {
                          label: "عدد الأيام",
                          value: workDays.toString(),
                          icon: Calendar,
                          color: "warning",
                        },
                        {
                          label: "المستحق",
                          value: formatCurrency(calculatedActualWage),
                          icon: DollarSign,
                          color: "info",
                          emphasis: true,
                        },
                        {
                          label: "المدفوع",
                          value: formatCurrency(paidAmount),
                          icon: CheckCircle2,
                          color: "success",
                        },
                        {
                          label: "المتبقي",
                          value: formatCurrency(remainingAmount),
                          icon: DollarSign,
                          color: remainingAmount > 0 ? "danger" : "success",
                          emphasis: true,
                        },
                      ]}
                      actions={[
                        {
                          icon: Edit2,
                          label: "تعديل",
                          onClick: () => handleEditAttendance(record),
                          color: "blue",
                        },
                        {
                          icon: Trash2,
                          label: "حذف",
                          onClick: () => handleDeleteAttendance(record.id),
                          color: "red",
                          disabled: isDeleting === record.id,
                        },
                      ]}
                      compact
                    />
                  );
                })}
              </UnifiedCardGrid>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>لا توجد سجلات حضور</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { AttendancePage };
