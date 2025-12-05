import React, { useState, useEffect } from 'react';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { useToast } from "../../hooks/use-toast";
import { createWorker, updateWorker } from "./repo";
import { listProjects } from "../projects/repo";
import { Phone, Calendar, User, Briefcase, DollarSign, IdCard, FileText, Building2, Activity } from "lucide-react";
import type { WorkerType as WorkerTypeEnum, WorkerStatus, Project } from "../../db/schema";

interface Worker {
  id: string;
  name: string;
  type: string;
  dailyWage: string;
  phone?: string | null;
  hireDate?: string | null;
  isActive: boolean;
  createdAt: string;
  nationalId?: string | null;
  notes?: string | null;
  projectId?: string | null;
  status?: WorkerStatus;
}

interface AddWorkerFormProps {
  worker?: Worker;
  onSuccess?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
}

const workerTypes = [
  { value: 'skilled', label: 'ماهر' },
  { value: 'unskilled', label: 'عادي' },
  { value: 'supervisor', label: 'مشرف' },
  { value: 'driver', label: 'سائق' },
  { value: 'other', label: 'أخرى' },
];

const workerStatuses = [
  { value: 'active', label: 'نشط' },
  { value: 'inactive', label: 'غير نشط' },
  { value: 'terminated', label: 'منتهي' },
];

const workerTypeToEnum: Record<string, WorkerTypeEnum> = {
  'ماهر': 'skilled',
  'عادي': 'unskilled',
  'مشرف': 'supervisor',
  'سائق': 'driver',
  'أخرى': 'other',
  'skilled': 'skilled',
  'unskilled': 'unskilled',
  'supervisor': 'supervisor',
  'driver': 'driver',
  'other': 'other',
};

export default function AddWorkerForm({ worker, onSuccess, onCancel, submitLabel = "إضافة العامل" }: AddWorkerFormProps) {
  const [name, setName] = useState(worker?.name || "");
  const [type, setType] = useState(workerTypeToEnum[worker?.type || ""] || "skilled");
  const [dailyWage, setDailyWage] = useState(worker ? worker.dailyWage : "");
  const [phone, setPhone] = useState(worker?.phone || "");
  const [hireDate, setHireDate] = useState(worker?.hireDate || "");
  const [status, setStatus] = useState<WorkerStatus>(worker?.status || (worker?.isActive ? 'active' : 'inactive') || 'active');
  const [nationalId, setNationalId] = useState(worker?.nationalId || "");
  const [notes, setNotes] = useState(worker?.notes || "");
  const [projectId, setProjectId] = useState(worker?.projectId || "");
  const [projects, setProjects] = useState<Project[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoadingProjects(true);
        const projectsList = await listProjects({ status: 'active' });
        setProjects(projectsList);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setIsLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    if (worker) {
      setName(worker.name || "");
      setType(workerTypeToEnum[worker.type || ""] || "skilled");
      setDailyWage(worker.dailyWage || "");
      setPhone(worker.phone || "");
      setHireDate(worker.hireDate || "");
      setStatus(worker.status || (worker.isActive ? 'active' : 'inactive'));
      setNationalId(worker.nationalId || "");
      setNotes(worker.notes || "");
      setProjectId(worker.projectId || "");
    }
  }, [worker]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !type || !dailyWage) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع البيانات المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const parsedWage = parseFloat(dailyWage);
    
    if (isNaN(parsedWage) || parsedWage <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال مبلغ صحيح للأجر اليومي",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (worker) {
        await updateWorker({
          id: worker.id,
          name: name.trim(),
          workerType: type as WorkerTypeEnum,
          dailyWage: parsedWage,
          phone: phone.trim() || undefined,
          startDate: hireDate || undefined,
          status: status,
          nationalId: nationalId.trim() || undefined,
          notes: notes.trim() || undefined,
          projectId: projectId || undefined,
        });
      } else {
        await createWorker({
          name: name.trim(),
          workerType: type as WorkerTypeEnum,
          dailyWage: parsedWage,
          phone: phone.trim() || undefined,
          startDate: hireDate || undefined,
          status: status,
          nationalId: nationalId.trim() || undefined,
          notes: notes.trim() || undefined,
          projectId: projectId || undefined,
        });
      }

      toast({
        title: "تم الحفظ",
        description: worker ? "تم تعديل العامل بنجاح" : "تم إضافة العامل بنجاح",
      });

      if (!worker) {
        setName("");
        setType("skilled");
        setDailyWage("");
        setPhone("");
        setHireDate("");
        setStatus("active");
        setNationalId("");
        setNotes("");
        setProjectId("");
      }
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: worker ? "فشل في تعديل العامل" : "فشل في إضافة العامل",
        description: error?.message || "حدث خطأ أثناء الحفظ",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="worker-name" className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4 text-blue-500" />
            اسم العامل *
          </Label>
          <Input
            id="worker-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="أدخل اسم العامل..."
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="worker-type" className="text-sm font-medium flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-purple-500" />
            نوع العامل *
          </Label>
          <Select value={type} onValueChange={(val) => setType(val as WorkerTypeEnum)}>
            <SelectTrigger>
              <SelectValue 
                placeholder="اختر نوع العامل..." 
                label={workerTypes.find(wt => wt.value === type)?.label}
              />
            </SelectTrigger>
            <SelectContent>
              {workerTypes.map((wt) => (
                <SelectItem key={wt.value} value={wt.value}>
                  {wt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="worker-status" className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500" />
            حالة العامل *
          </Label>
          <Select value={status} onValueChange={(val) => setStatus(val as WorkerStatus)}>
            <SelectTrigger>
              <SelectValue 
                placeholder="اختر الحالة..." 
                label={workerStatuses.find(ws => ws.value === status)?.label}
              />
            </SelectTrigger>
            <SelectContent>
              {workerStatuses.map((ws) => (
                <SelectItem key={ws.value} value={ws.value}>
                  {ws.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="daily-wage" className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            الأجر اليومي *
          </Label>
          <Input
            id="daily-wage"
            type="number"
            inputMode="decimal"
            value={dailyWage}
            onChange={(e) => setDailyWage(e.target.value)}
            placeholder="0"
            className="text-center"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
            <Phone className="h-4 w-4 text-blue-500" />
            الهاتف
          </Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="967XXXXXXXX"
            className="text-left"
            dir="ltr"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="national-id" className="text-sm font-medium flex items-center gap-2">
            <IdCard className="h-4 w-4 text-indigo-500" />
            رقم الهوية
          </Label>
          <Input
            id="national-id"
            type="text"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            placeholder="أدخل رقم الهوية..."
            className="text-left"
            dir="ltr"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="hire-date" className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-orange-500" />
            تاريخ التوظيف
          </Label>
          <Input
            id="hire-date"
            type="date"
            value={hireDate}
            onChange={(e) => setHireDate(e.target.value)}
            className="text-center"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-id" className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-cyan-500" />
            المشروع
          </Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger>
              <SelectValue 
                placeholder={isLoadingProjects ? "جاري التحميل..." : "اختر المشروع..."} 
                label={projectId ? (projects.find(p => p.id === projectId)?.name || "بدون مشروع") : undefined}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">بدون مشروع</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-500" />
          ملاحظات
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="أدخل أي ملاحظات إضافية..."
          rows={3}
        />
      </div>

      <div className="flex gap-2">
        <Button 
          type="submit" 
          className="flex-1" 
          disabled={isSubmitting}
        >
          {isSubmitting ? "جاري الحفظ..." : submitLabel}
        </Button>
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="flex-1"
          >
            إلغاء
          </Button>
        )}
      </div>
    </form>
  );
}
