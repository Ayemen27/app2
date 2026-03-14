import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { apiRequest } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { useToast } from "@/hooks/use-toast";
import { Users, Sun, Truck, ClipboardCheck, Plus, Trash2, Loader, Edit } from "lucide-react";

interface WellLifecycleFormsProps {
  wellId: number;
  wellNumber: number;
  ownerName: string;
  onClose: () => void;
}

const CREW_TYPES = [
  { value: "welding", label: "لحام" },
  { value: "steel_installation", label: "تركيب حديد" },
  { value: "panel_installation", label: "تركيب ألواح" },
];

const RAIL_TYPES = [
  { value: "new", label: "جديد" },
  { value: "old", label: "قديم" },
];

const INSPECTION_STATUSES = [
  { value: "pending", label: "قيد الانتظار" },
  { value: "passed", label: "مقبول" },
  { value: "failed", label: "مرفوض" },
];

export function WellLifecycleForms({ wellId, wellNumber, ownerName, onClose }: WellLifecycleFormsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const wellIdStr = String(wellId);

  const { data: crews = [], isLoading: crewsLoading } = useQuery({
    queryKey: QUERY_KEYS.wellCrews(wellIdStr),
    queryFn: async () => {
      const res = await apiRequest(`/api/wells/${wellId}/crews`);
      return res.data || [];
    },
  });

  const { data: solarComponents, isLoading: solarLoading } = useQuery({
    queryKey: QUERY_KEYS.wellSolarComponents(wellIdStr),
    queryFn: async () => {
      const res = await apiRequest(`/api/wells/${wellId}/solar-components`);
      return res.data || null;
    },
  });

  const { data: transportDetails = [], isLoading: transportLoading } = useQuery({
    queryKey: QUERY_KEYS.wellTransportDetails(wellIdStr),
    queryFn: async () => {
      const res = await apiRequest(`/api/wells/${wellId}/transport`);
      return res.data || [];
    },
  });

  const { data: receptions = [], isLoading: receptionsLoading } = useQuery({
    queryKey: QUERY_KEYS.wellReceptions(wellIdStr),
    queryFn: async () => {
      const res = await apiRequest(`/api/wells/${wellId}/receptions`);
      return res.data || [];
    },
  });

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle data-testid="text-well-lifecycle-title">
            إدارة بئر #{wellNumber} - {ownerName}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1">
          <Tabs defaultValue="crews" dir="rtl">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="crews" data-testid="tab-crews" className="gap-1">
                <Users className="h-4 w-4" />
                طواقم العمل
              </TabsTrigger>
              <TabsTrigger value="solar" data-testid="tab-solar" className="gap-1">
                <Sun className="h-4 w-4" />
                الطاقة الشمسية
              </TabsTrigger>
              <TabsTrigger value="transport" data-testid="tab-transport" className="gap-1">
                <Truck className="h-4 w-4" />
                النقل
              </TabsTrigger>
              <TabsTrigger value="reception" data-testid="tab-reception" className="gap-1">
                <ClipboardCheck className="h-4 w-4" />
                الاستلام
              </TabsTrigger>
            </TabsList>

            <TabsContent value="crews">
              <CrewsSection wellId={wellId} crews={crews} isLoading={crewsLoading} />
            </TabsContent>
            <TabsContent value="solar">
              <SolarSection wellId={wellId} solarComponents={solarComponents} isLoading={solarLoading} />
            </TabsContent>
            <TabsContent value="transport">
              <TransportSection wellId={wellId} transportDetails={transportDetails} isLoading={transportLoading} />
            </TabsContent>
            <TabsContent value="reception">
              <ReceptionSection wellId={wellId} receptions={receptions} isLoading={receptionsLoading} />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CrewsSection({ wellId, crews, isLoading }: { wellId: number; crews: any[]; isLoading: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    crewType: "",
    teamName: "",
    workersCount: 0,
    mastersCount: 0,
    workDays: "",
    workerDailyWage: "",
    masterDailyWage: "",
    totalWages: "",
    workDate: "",
    notes: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/wells/${wellId}/crews`, 'POST', {
        ...data,
        well_id: wellId,
      });
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم إضافة طاقم العمل بنجاح" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wellCrews(String(wellId)) });
      setShowForm(false);
      setForm({ crewType: "", teamName: "", workersCount: 0, mastersCount: 0, workDays: "", workerDailyWage: "", masterDailyWage: "", totalWages: "", workDate: "", notes: "" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "فشل في إضافة طاقم العمل", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (crewId: number) => {
      return apiRequest(`/api/wells/crews/${crewId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم حذف طاقم العمل بنجاح" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wellCrews(String(wellId)) });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "فشل في حذف طاقم العمل", variant: "destructive" });
    },
  });

  const getCrewTypeLabel = (type: string) => {
    return CREW_TYPES.find(t => t.value === type)?.label || type;
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-base font-semibold">طواقم العمل ({crews.length})</h3>
        <Button size="sm" onClick={() => setShowForm(true)} data-testid="button-add-crew">
          <Plus className="h-4 w-4 ml-1" />
          إضافة طاقم
        </Button>
      </div>

      {crews.map((crew: any) => (
        <Card key={crew.id} className="p-4">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold" data-testid={`text-crew-type-${crew.id}`}>{getCrewTypeLabel(crew.crewType || crew.crew_type)}</span>
                {crew.teamName && <Badge variant="outline" data-testid={`badge-crew-team-${crew.id}`}>{crew.teamName || crew.team_name}</Badge>}
              </div>
              <div className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
                <span>عمال: {crew.workersCount ?? crew.workers_count ?? 0}</span>
                <span>معلمين: {crew.mastersCount ?? crew.masters_count ?? 0}</span>
                <span>أيام العمل: {crew.workDays ?? crew.work_days ?? 0}</span>
                <span>الإجمالي: {crew.totalWages ?? crew.total_wages ?? 0} ريال</span>
                {(crew.workDate || crew.work_date) && <span>التاريخ: {crew.workDate || crew.work_date}</span>}
              </div>
              {crew.notes && <p className="text-xs text-muted-foreground">{crew.notes}</p>}
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => { if (confirm("هل أنت متأكد من حذف هذا الطاقم؟")) deleteMutation.mutate(crew.id); }}
              data-testid={`button-delete-crew-${crew.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}

      {crews.length === 0 && !showForm && (
        <p className="text-center text-muted-foreground py-4" data-testid="text-no-crews">لا توجد طواقم عمل مسجلة</p>
      )}

      {showForm && (
        <Card className="p-4 space-y-4">
          <h4 className="font-semibold text-sm">إضافة طاقم عمل جديد</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-sm">نوع الطاقم *</Label>
              <SearchableSelect
                value={form.crewType}
                onValueChange={(v) => setForm({ ...form, crewType: v })}
                options={CREW_TYPES}
                placeholder="اختر نوع الطاقم"
                data-testid="select-crew-type"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">اسم الفريق</Label>
              <Input
                value={form.teamName}
                onChange={(e) => setForm({ ...form, teamName: e.target.value })}
                placeholder="اسم الفريق"
                data-testid="input-crew-team-name"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">عدد العمال</Label>
              <Input
                type="number"
                value={form.workersCount || ""}
                onChange={(e) => setForm({ ...form, workersCount: parseInt(e.target.value) || 0 })}
                placeholder="0"
                data-testid="input-crew-workers-count"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">عدد المعلمين</Label>
              <Input
                type="number"
                value={form.mastersCount || ""}
                onChange={(e) => setForm({ ...form, mastersCount: parseInt(e.target.value) || 0 })}
                placeholder="0"
                data-testid="input-crew-masters-count"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">أيام العمل</Label>
              <Input
                type="number"
                step="0.5"
                value={form.workDays}
                onChange={(e) => setForm({ ...form, workDays: e.target.value })}
                placeholder="0"
                data-testid="input-crew-work-days"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">أجر العامل اليومي</Label>
              <Input
                type="number"
                value={form.workerDailyWage}
                onChange={(e) => setForm({ ...form, workerDailyWage: e.target.value })}
                placeholder="0"
                data-testid="input-crew-worker-wage"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">أجر المعلم اليومي</Label>
              <Input
                type="number"
                value={form.masterDailyWage}
                onChange={(e) => setForm({ ...form, masterDailyWage: e.target.value })}
                placeholder="0"
                data-testid="input-crew-master-wage"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">إجمالي الأجور</Label>
              <Input
                type="number"
                value={form.totalWages}
                onChange={(e) => setForm({ ...form, totalWages: e.target.value })}
                placeholder="0"
                data-testid="input-crew-total-wages"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">تاريخ العمل</Label>
              <Input
                type="date"
                value={form.workDate}
                onChange={(e) => setForm({ ...form, workDate: e.target.value })}
                data-testid="input-crew-work-date"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-sm">ملاحظات</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="ملاحظات اختيارية"
                data-testid="input-crew-notes"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)} data-testid="button-cancel-crew">إلغاء</Button>
            <Button
              size="sm"
              onClick={() => createMutation.mutate(form)}
              disabled={!form.crewType || createMutation.isPending}
              data-testid="button-save-crew"
            >
              {createMutation.isPending ? "جاري..." : "حفظ"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function SolarSection({ wellId, solarComponents, isLoading }: { wellId: number; solarComponents: any; isLoading: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    inverter: "نعم",
    collectionBox: "نعم",
    carbonCarrier: "نعم",
    steelConverterTop: "نعم",
    clampConverterBottom: "نعم",
    bindingCable6mm: "1",
    groundingCable10x2mm: "",
    jointThermalLiquid: "نعم",
    groundingClip: "نعم",
    groundingPlate: "نعم",
    groundingRod: "نعم",
    cable16x3mmLength: "",
    cable10x2mmLength: "",
    fanCount: "",
    submersiblePump: true,
    extraPipes: "",
    extraPipesReason: "",
    extraCable: "",
    extraCableReason: "",
    notes: "",
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/wells/${wellId}/solar-components`, 'POST', {
        ...data,
        well_id: wellId,
      });
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم حفظ مكونات الطاقة الشمسية بنجاح" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wellSolarComponents(String(wellId)) });
      setEditing(false);
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "فشل في حفظ البيانات", variant: "destructive" });
    },
  });

  const startEditing = () => {
    if (solarComponents) {
      setForm({
        inverter: solarComponents.inverter || "نعم",
        collectionBox: solarComponents.collectionBox || solarComponents.collection_box || "نعم",
        carbonCarrier: solarComponents.carbonCarrier || solarComponents.carbon_carrier || "نعم",
        steelConverterTop: solarComponents.steelConverterTop || solarComponents.steel_converter_top || "نعم",
        clampConverterBottom: solarComponents.clampConverterBottom || solarComponents.clamp_converter_bottom || "نعم",
        bindingCable6mm: solarComponents.bindingCable6mm || solarComponents.binding_cable_6mm || "1",
        groundingCable10x2mm: solarComponents.groundingCable10x2mm || solarComponents.grounding_cable_10x2mm || "",
        jointThermalLiquid: solarComponents.jointThermalLiquid || solarComponents.joint_thermal_liquid || "نعم",
        groundingClip: solarComponents.groundingClip || solarComponents.grounding_clip || "نعم",
        groundingPlate: solarComponents.groundingPlate || solarComponents.grounding_plate || "نعم",
        groundingRod: solarComponents.groundingRod || solarComponents.grounding_rod || "نعم",
        cable16x3mmLength: solarComponents.cable16x3mmLength || solarComponents.cable_16x3mm_length || "",
        cable10x2mmLength: solarComponents.cable10x2mmLength || solarComponents.cable_10x2mm_length || "",
        fanCount: solarComponents.fanCount ?? solarComponents.fan_count ?? "",
        submersiblePump: solarComponents.submersiblePump ?? solarComponents.submersible_pump ?? true,
        extraPipes: solarComponents.extraPipes ?? solarComponents.extra_pipes ?? "",
        extraPipesReason: solarComponents.extraPipesReason || solarComponents.extra_pipes_reason || "",
        extraCable: solarComponents.extraCable ?? solarComponents.extra_cable ?? "",
        extraCableReason: solarComponents.extraCableReason || solarComponents.extra_cable_reason || "",
        notes: solarComponents.notes || "",
      });
    }
    setEditing(true);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader className="h-6 w-6 animate-spin" /></div>;
  }

  const boolFields: { key: string; label: string }[] = [
    { key: "inverter", label: "انفرتر" },
    { key: "collectionBox", label: "صندوق تجميع" },
    { key: "carbonCarrier", label: "حامل كربون" },
    { key: "steelConverterTop", label: "محول حديد علوي" },
    { key: "clampConverterBottom", label: "محول مشبك سفلي" },
    { key: "jointThermalLiquid", label: "سائل حراري للوصلات" },
    { key: "groundingClip", label: "مشبك تأريض" },
    { key: "groundingPlate", label: "لوحة تأريض" },
    { key: "groundingRod", label: "قضيب تأريض" },
  ];

  if (!editing && !solarComponents) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-muted-foreground" data-testid="text-no-solar">لم يتم تسجيل مكونات الطاقة الشمسية بعد</p>
        <Button onClick={startEditing} data-testid="button-add-solar">
          <Plus className="h-4 w-4 ml-1" />
          إضافة مكونات الطاقة الشمسية
        </Button>
      </div>
    );
  }

  if (!editing && solarComponents) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-base font-semibold">مكونات الطاقة الشمسية</h3>
          <Button size="sm" variant="outline" onClick={startEditing} data-testid="button-edit-solar">
            <Edit className="h-4 w-4 ml-1" />
            تعديل
          </Button>
        </div>
        <Card className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {boolFields.map(f => (
              <div key={f.key} className="flex items-center gap-2">
                <Badge variant={(solarComponents[f.key] || solarComponents[f.key.replace(/([A-Z])/g, '_$1').toLowerCase()]) === "نعم" ? "default" : "outline"} className="text-xs">
                  {(solarComponents[f.key] || solarComponents[f.key.replace(/([A-Z])/g, '_$1').toLowerCase()]) || "-"}
                </Badge>
                <span>{f.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Badge variant={(solarComponents.submersiblePump ?? solarComponents.submersible_pump) ? "default" : "outline"} className="text-xs">
                {(solarComponents.submersiblePump ?? solarComponents.submersible_pump) ? "نعم" : "لا"}
              </Badge>
              <span>غطاس</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3 text-sm text-muted-foreground">
            <span>كابل ربط 6مم: {solarComponents.bindingCable6mm || solarComponents.binding_cable_6mm || "-"}</span>
            <span>كابل تأريض 10×2مم: {solarComponents.groundingCable10x2mm || solarComponents.grounding_cable_10x2mm || "-"}</span>
            <span>طول كابل 16×3مم: {solarComponents.cable16x3mmLength || solarComponents.cable_16x3mm_length || "-"}</span>
            <span>طول كابل 10×2مم: {solarComponents.cable10x2mmLength || solarComponents.cable_10x2mm_length || "-"}</span>
            <span>عدد المراوح: {solarComponents.fanCount ?? solarComponents.fan_count ?? "-"}</span>
            {(solarComponents.extraPipes ?? solarComponents.extra_pipes) ? <span>مواسير إضافية: {solarComponents.extraPipes ?? solarComponents.extra_pipes} ({solarComponents.extraPipesReason || solarComponents.extra_pipes_reason || ""})</span> : null}
            {(solarComponents.extraCable ?? solarComponents.extra_cable) ? <span>كابل إضافي: {solarComponents.extraCable ?? solarComponents.extra_cable} ({solarComponents.extraCableReason || solarComponents.extra_cable_reason || ""})</span> : null}
          </div>
          {solarComponents.notes && <p className="text-xs text-muted-foreground mt-2">{solarComponents.notes}</p>}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">مكونات الطاقة الشمسية</h3>
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {boolFields.map(f => (
            <div key={f.key} className="space-y-1">
              <Label className="text-sm">{f.label}</Label>
              <SearchableSelect
                value={(form as any)[f.key]}
                onValueChange={(v) => setForm({ ...form, [f.key]: v })}
                options={[{ value: "نعم", label: "نعم" }, { value: "لا", label: "لا" }]}
                placeholder="اختر"
                data-testid={`select-solar-${f.key}`}
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-sm">كابل ربط 6مم (لفة)</Label>
            <Input value={form.bindingCable6mm} onChange={(e) => setForm({ ...form, bindingCable6mm: e.target.value })} placeholder="1" data-testid="input-solar-binding-cable" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">كابل تأريض 10×2مم</Label>
            <Input value={form.groundingCable10x2mm} onChange={(e) => setForm({ ...form, groundingCable10x2mm: e.target.value })} placeholder="الطول" data-testid="input-solar-grounding-cable" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">طول كابل 16×3مم</Label>
            <Input type="number" value={form.cable16x3mmLength} onChange={(e) => setForm({ ...form, cable16x3mmLength: e.target.value })} placeholder="0" data-testid="input-solar-cable-16x3" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">طول كابل 10×2مم</Label>
            <Input type="number" value={form.cable10x2mmLength} onChange={(e) => setForm({ ...form, cable10x2mmLength: e.target.value })} placeholder="0" data-testid="input-solar-cable-10x2" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">عدد المراوح</Label>
            <Input type="number" value={form.fanCount} onChange={(e) => setForm({ ...form, fanCount: e.target.value })} placeholder="0" data-testid="input-solar-fan-count" />
          </div>
          <div className="flex items-center gap-3 pt-5">
            <Switch checked={form.submersiblePump} onCheckedChange={(v) => setForm({ ...form, submersiblePump: v })} data-testid="switch-solar-pump" />
            <Label className="text-sm">غطاس</Label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-sm">مواسير إضافية (عدد)</Label>
            <Input type="number" value={form.extraPipes} onChange={(e) => setForm({ ...form, extraPipes: e.target.value })} placeholder="0" data-testid="input-solar-extra-pipes" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">سبب المواسير الإضافية</Label>
            <Input value={form.extraPipesReason} onChange={(e) => setForm({ ...form, extraPipesReason: e.target.value })} placeholder="السبب" data-testid="input-solar-extra-pipes-reason" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">كابل إضافي (طول)</Label>
            <Input type="number" value={form.extraCable} onChange={(e) => setForm({ ...form, extraCable: e.target.value })} placeholder="0" data-testid="input-solar-extra-cable" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">سبب الكابل الإضافي</Label>
            <Input value={form.extraCableReason} onChange={(e) => setForm({ ...form, extraCableReason: e.target.value })} placeholder="السبب" data-testid="input-solar-extra-cable-reason" />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-sm">ملاحظات</Label>
          <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات اختيارية" data-testid="input-solar-notes" />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => setEditing(false)} data-testid="button-cancel-solar">إلغاء</Button>
          <Button size="sm" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} data-testid="button-save-solar">
            {saveMutation.isPending ? "جاري..." : "حفظ"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function TransportSection({ wellId, transportDetails, isLoading }: { wellId: number; transportDetails: any[]; isLoading: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    railType: "",
    withPanels: false,
    transportPrice: "",
    crewEntitlements: "",
    transportDate: "",
    notes: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/wells/${wellId}/transport`, 'POST', {
        ...data,
        well_id: wellId,
      });
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم إضافة تفاصيل النقل بنجاح" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wellTransportDetails(String(wellId)) });
      setShowForm(false);
      setForm({ railType: "", withPanels: false, transportPrice: "", crewEntitlements: "", transportDate: "", notes: "" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "فشل في إضافة تفاصيل النقل", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/wells/transport/${id}`, 'DELETE');
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم حذف تفاصيل النقل" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wellTransportDetails(String(wellId)) });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "فشل في الحذف", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-base font-semibold">تفاصيل النقل ({transportDetails.length})</h3>
        <Button size="sm" onClick={() => setShowForm(true)} data-testid="button-add-transport">
          <Plus className="h-4 w-4 ml-1" />
          إضافة نقل
        </Button>
      </div>

      {transportDetails.map((td: any) => (
        <Card key={td.id} className="p-4">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold" data-testid={`text-transport-rail-${td.id}`}>
                  نوع السكة: {(td.railType || td.rail_type) === "new" ? "جديدة" : (td.railType || td.rail_type) === "old" ? "قديمة" : (td.railType || td.rail_type) || "-"}
                </span>
                <Badge variant={(td.withPanels ?? td.with_panels) ? "default" : "outline"} data-testid={`badge-transport-panels-${td.id}`}>
                  {(td.withPanels ?? td.with_panels) ? "مع ألواح" : "بدون ألواح"}
                </Badge>
              </div>
              <div className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
                <span>سعر النقل: {td.transportPrice || td.transport_price || 0} ريال</span>
                <span>مستحقات الطاقم: {td.crewEntitlements || td.crew_entitlements || 0} ريال</span>
                {(td.transportDate || td.transport_date) && <span>التاريخ: {td.transportDate || td.transport_date}</span>}
              </div>
              {td.notes && <p className="text-xs text-muted-foreground">{td.notes}</p>}
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => { if (confirm("هل أنت متأكد من حذف تفاصيل النقل؟")) deleteMutation.mutate(td.id); }}
              data-testid={`button-delete-transport-${td.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}

      {transportDetails.length === 0 && !showForm && (
        <p className="text-center text-muted-foreground py-4" data-testid="text-no-transport">لا توجد تفاصيل نقل مسجلة</p>
      )}

      {showForm && (
        <Card className="p-4 space-y-4">
          <h4 className="font-semibold text-sm">إضافة تفاصيل نقل</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-sm">نوع السكة</Label>
              <SearchableSelect
                value={form.railType}
                onValueChange={(v) => setForm({ ...form, railType: v })}
                options={RAIL_TYPES}
                placeholder="اختر نوع السكة"
                data-testid="select-transport-rail-type"
              />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <Switch checked={form.withPanels} onCheckedChange={(v) => setForm({ ...form, withPanels: v })} data-testid="switch-transport-with-panels" />
              <Label className="text-sm">مع ألواح</Label>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">سعر النقل</Label>
              <Input
                type="number"
                value={form.transportPrice}
                onChange={(e) => setForm({ ...form, transportPrice: e.target.value })}
                placeholder="0"
                data-testid="input-transport-price"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">مستحقات الطاقم</Label>
              <Input
                type="number"
                value={form.crewEntitlements}
                onChange={(e) => setForm({ ...form, crewEntitlements: e.target.value })}
                placeholder="0"
                data-testid="input-transport-crew-entitlements"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">تاريخ النقل</Label>
              <Input
                type="date"
                value={form.transportDate}
                onChange={(e) => setForm({ ...form, transportDate: e.target.value })}
                data-testid="input-transport-date"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-sm">ملاحظات</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="ملاحظات اختيارية"
                data-testid="input-transport-notes"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)} data-testid="button-cancel-transport">إلغاء</Button>
            <Button
              size="sm"
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending}
              data-testid="button-save-transport"
            >
              {createMutation.isPending ? "جاري..." : "حفظ"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function ReceptionSection({ wellId, receptions, isLoading }: { wellId: number; receptions: any[]; isLoading: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    receiverName: "",
    inspectionStatus: "pending",
    inspectionNotes: "",
    notes: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/wells/${wellId}/receptions`, 'POST', {
        ...data,
        well_id: wellId,
      });
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم تسجيل الاستلام بنجاح" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wellReceptions(String(wellId)) });
      setShowForm(false);
      setForm({ receiverName: "", inspectionStatus: "pending", inspectionNotes: "", notes: "" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "فشل في تسجيل الاستلام", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/wells/receptions/${id}`, 'DELETE');
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم حذف سجل الاستلام" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wellReceptions(String(wellId)) });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "فشل في الحذف", variant: "destructive" });
    },
  });

  const getStatusLabel = (status: string) => {
    return INSPECTION_STATUSES.find(s => s.value === status)?.label || status;
  };

  const getStatusVariant = (status: string) => {
    if (status === "passed") return "default";
    if (status === "failed") return "destructive";
    return "outline";
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-base font-semibold">سجلات الاستلام ({receptions.length})</h3>
        <Button size="sm" onClick={() => setShowForm(true)} data-testid="button-add-reception">
          <Plus className="h-4 w-4 ml-1" />
          تسجيل استلام
        </Button>
      </div>

      {receptions.map((rec: any) => (
        <Card key={rec.id} className="p-4">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold" data-testid={`text-reception-receiver-${rec.id}`}>
                  المستلم: {rec.receiverName || rec.receiver_name || "-"}
                </span>
                <Badge variant={getStatusVariant(rec.inspectionStatus || rec.inspection_status || "pending") as any} data-testid={`badge-reception-status-${rec.id}`}>
                  {getStatusLabel(rec.inspectionStatus || rec.inspection_status || "pending")}
                </Badge>
              </div>
              {(rec.inspectionNotes || rec.inspection_notes) && (
                <p className="text-muted-foreground">ملاحظات الفحص: {rec.inspectionNotes || rec.inspection_notes}</p>
              )}
              {(rec.receivedAt || rec.received_at) && (
                <p className="text-muted-foreground">تاريخ الاستلام: {new Date(rec.receivedAt || rec.received_at).toLocaleDateString('ar-SA')}</p>
              )}
              {rec.notes && <p className="text-xs text-muted-foreground">{rec.notes}</p>}
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => { if (confirm("هل أنت متأكد من حذف سجل الاستلام؟")) deleteMutation.mutate(rec.id); }}
              data-testid={`button-delete-reception-${rec.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}

      {receptions.length === 0 && !showForm && (
        <p className="text-center text-muted-foreground py-4" data-testid="text-no-receptions">لا توجد سجلات استلام</p>
      )}

      {showForm && (
        <Card className="p-4 space-y-4">
          <h4 className="font-semibold text-sm">تسجيل استلام جديد</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-sm">اسم المستلم *</Label>
              <Input
                value={form.receiverName}
                onChange={(e) => setForm({ ...form, receiverName: e.target.value })}
                placeholder="اسم المستلم"
                data-testid="input-reception-receiver-name"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">حالة الفحص *</Label>
              <SearchableSelect
                value={form.inspectionStatus}
                onValueChange={(v) => setForm({ ...form, inspectionStatus: v })}
                options={INSPECTION_STATUSES}
                placeholder="اختر حالة الفحص"
                data-testid="select-reception-status"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-sm">ملاحظات الفحص</Label>
              <Input
                value={form.inspectionNotes}
                onChange={(e) => setForm({ ...form, inspectionNotes: e.target.value })}
                placeholder="ملاحظات الفحص والمعاينة"
                data-testid="input-reception-inspection-notes"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-sm">ملاحظات عامة</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="ملاحظات اختيارية"
                data-testid="input-reception-notes"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)} data-testid="button-cancel-reception">إلغاء</Button>
            <Button
              size="sm"
              onClick={() => createMutation.mutate(form)}
              disabled={!form.receiverName || createMutation.isPending}
              data-testid="button-save-reception"
            >
              {createMutation.isPending ? "جاري..." : "حفظ"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
