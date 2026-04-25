import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, FileText, Palette, RotateCcw } from "lucide-react";

interface HeaderForm {
  company_name: string;
  company_name_en: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
  footer_text: string;
  accountant_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

const EMPTY: HeaderForm = {
  company_name: "",
  company_name_en: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  logo_url: "",
  footer_text: "",
  accountant_name: "",
  primary_color: "#15807F",
  secondary_color: "#0F6B6B",
  accent_color: "#F4A14B",
};

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export default function ReportHeaderSettings() {
  const { toast } = useToast();
  const [form, setForm] = useState<HeaderForm>(EMPTY);
  const [dirty, setDirty] = useState(false);

  const { data, isLoading } = useQuery<{ success: boolean; header: any; isDefault: boolean }>({
    queryKey: ["/api/report-header"],
  });

  useEffect(() => {
    if (data?.header) {
      setForm({
        company_name: data.header.company_name || "",
        company_name_en: data.header.company_name_en || "",
        address: data.header.address || "",
        phone: data.header.phone || "",
        email: data.header.email || "",
        website: data.header.website || "",
        logo_url: data.header.logo_url || "",
        footer_text: data.header.footer_text || "",
        accountant_name: data.header.accountant_name || "",
        primary_color: data.header.primary_color || "#15807F",
        secondary_color: data.header.secondary_color || "#0F6B6B",
        accent_color: data.header.accent_color || "#F4A14B",
      });
      setDirty(false);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: HeaderForm) => {
      const body: any = {
        company_name: payload.company_name.trim(),
        company_name_en: payload.company_name_en.trim() || null,
        address: payload.address.trim() || null,
        phone: payload.phone.trim() || null,
        email: payload.email.trim() || null,
        website: payload.website.trim() || null,
        logo_url: payload.logo_url.trim() || null,
        footer_text: payload.footer_text.trim() || null,
        accountant_name: payload.accountant_name.trim() || null,
        primary_color: payload.primary_color,
        secondary_color: payload.secondary_color,
        accent_color: payload.accent_color,
      };
      return await apiRequest("/api/report-header", "PUT", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-header"] });
      setDirty(false);
      toast({ title: "تم الحفظ", description: "تم حفظ إعدادات ترويسة التقارير بنجاح" });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "تعذّر الحفظ",
        description: err?.message || "حدث خطأ أثناء حفظ الإعدادات",
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => await apiRequest("/api/report-header", "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-header"] });
      toast({ title: "تمت إعادة الضبط", description: "أُعيدت الإعدادات إلى الافتراضي" });
    },
  });

  function update<K extends keyof HeaderForm>(key: K, value: HeaderForm[K]) {
    setForm((p) => ({ ...p, [key]: value }));
    setDirty(true);
  }

  function handleSave() {
    if (!form.company_name.trim()) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "اسم الشركة مطلوب" });
      return;
    }
    for (const k of ["primary_color", "secondary_color", "accent_color"] as const) {
      if (!HEX_RE.test(form[k])) {
        toast({ variant: "destructive", title: "لون غير صالح", description: "استخدم صيغة #RRGGBB" });
        return;
      }
    }
    saveMutation.mutate(form);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            بيانات الشركة في التقارير
          </CardTitle>
          <CardDescription>
            تظهر هذه البيانات في ترويسة وتذييل جميع تقارير PDF و Excel. الإعدادات خاصة بحسابك فقط.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rh-company">اسم الشركة (عربي) *</Label>
              <Input
                id="rh-company"
                value={form.company_name}
                onChange={(e) => update("company_name", e.target.value)}
                placeholder="مثال: شركة الفتيني للمقاولات"
                data-testid="input-company-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rh-company-en">اسم الشركة (إنجليزي)</Label>
              <Input
                id="rh-company-en"
                value={form.company_name_en}
                onChange={(e) => update("company_name_en", e.target.value)}
                placeholder="Company Name"
                data-testid="input-company-name-en"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rh-phone">الهاتف</Label>
              <Input
                id="rh-phone"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+xxx xxx xxx"
                dir="ltr"
                data-testid="input-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rh-email">البريد الإلكتروني</Label>
              <Input
                id="rh-email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="info@example.com"
                dir="ltr"
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rh-website">الموقع الإلكتروني</Label>
              <Input
                id="rh-website"
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
                placeholder="www.example.com"
                dir="ltr"
                data-testid="input-website"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rh-address">العنوان</Label>
              <Input
                id="rh-address"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="المدينة، البلد"
                data-testid="input-address"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="rh-logo">رابط الشعار (URL)</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="rh-logo"
                  value={form.logo_url}
                  onChange={(e) => update("logo_url", e.target.value)}
                  placeholder="https://example.com/logo.png"
                  dir="ltr"
                  data-testid="input-logo-url"
                />
                {form.logo_url ? (
                  <img
                    src={form.logo_url}
                    alt="logo preview"
                    className="w-12 h-12 rounded border object-contain bg-white"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                    data-testid="img-logo-preview"
                  />
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                إن لم تُحدّد رابطاً، سيُستخدم الحرف الأول من اسم الشركة كشعار افتراضي.
              </p>
            </div>
          </div>
          <Separator className="opacity-50" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rh-accountant">اسم المحاسب (يظهر في توقيع التقارير)</Label>
              <Input
                id="rh-accountant"
                value={form.accountant_name}
                onChange={(e) => update("accountant_name", e.target.value)}
                placeholder="مثال: أ. محمد علي"
                data-testid="input-accountant-name"
              />
              <p className="text-xs text-muted-foreground">
                يُستخدم تلقائياً في خانة "المحاسب" بتذييل تقارير PDF و Excel.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rh-footer">نص التذييل (اختياري)</Label>
              <Textarea
                id="rh-footer"
                value={form.footer_text}
                onChange={(e) => update("footer_text", e.target.value)}
                placeholder="نص يظهر أسفل كل تقرير"
                rows={2}
                data-testid="textarea-footer"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5 text-purple-500" />
            ألوان الهوية البصرية للتقارير
          </CardTitle>
          <CardDescription>
            تُطبَّق هذه الألوان تلقائياً على رؤوس وتذييلات جميع التقارير (PDF و Excel).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {([
              { key: "primary_color", label: "اللون الرئيسي", testId: "color-primary" },
              { key: "secondary_color", label: "اللون الثانوي", testId: "color-secondary" },
              { key: "accent_color", label: "لون التمييز", testId: "color-accent" },
            ] as const).map((c) => (
              <div key={c.key} className="space-y-2">
                <Label>{c.label}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={form[c.key]}
                    onChange={(e) => update(c.key, e.target.value.toUpperCase())}
                    className="w-16 h-10 p-1 cursor-pointer rounded-lg"
                    data-testid={c.testId}
                  />
                  <Input
                    value={form[c.key]}
                    onChange={(e) => update(c.key, e.target.value.toUpperCase())}
                    placeholder="#RRGGBB"
                    dir="ltr"
                    className="font-mono text-sm"
                    data-testid={`${c.testId}-text`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div
            className="rounded-lg overflow-hidden border"
            data-testid="color-preview"
            aria-label="معاينة الترويسة"
          >
            <div className="flex items-stretch" style={{ background: form.primary_color }}>
              <div className="flex-1 p-3 text-white text-xs space-y-1">
                {form.email ? <div>✉ {form.email}</div> : <div className="opacity-60">your@email.com</div>}
                {form.website ? <div>🌐 {form.website}</div> : <div className="opacity-60">www.example.com</div>}
              </div>
              <div
                className="flex-1 bg-white flex items-center gap-2 p-3"
                style={{ borderBottomRightRadius: "32px" }}
              >
                {form.logo_url ? (
                  <img src={form.logo_url} alt="" className="w-9 h-9 object-contain rounded" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                ) : (
                  <div
                    className="w-9 h-9 rounded flex items-center justify-center text-white font-bold"
                    style={{ background: form.primary_color }}
                  >
                    {(form.company_name || "A").charAt(0)}
                  </div>
                )}
                <div className="leading-tight">
                  <div className="font-bold text-sm" style={{ color: form.primary_color }}>
                    {form.company_name || "اسم الشركة"}
                  </div>
                  <div className="text-xs" style={{ color: form.secondary_color }}>
                    {form.company_name_en || "Tagline / Slogan"}
                  </div>
                </div>
              </div>
            </div>
            <div className="h-1.5" style={{ background: form.accent_color }} />
            <div className="p-2 text-white text-center text-xs font-bold" style={{ background: form.secondary_color }}>
              عنوان التقرير
            </div>
            <div className="px-3 py-4 text-center text-xs text-muted-foreground bg-white">
              ـ ـ ـ محتوى التقرير ـ ـ ـ
            </div>
            <div className="h-1.5" style={{ background: form.accent_color }} />
            <div className="flex items-center justify-between p-3 text-white text-xs" style={{ background: form.primary_color }}>
              <div>☎ {form.phone || "+xxx xxx xxx"}</div>
              <div>📍 {form.address || "العنوان"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => resetMutation.mutate()}
          disabled={resetMutation.isPending || data?.isDefault}
          data-testid="button-reset-header"
        >
          {resetMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          إعادة للافتراضي
        </Button>
        <Button
          onClick={handleSave}
          className="rounded-xl px-8 gap-2"
          disabled={!dirty || saveMutation.isPending}
          data-testid="button-save-header"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          حفظ الترويسة
        </Button>
      </div>
    </div>
  );
}
