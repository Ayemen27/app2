import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Settings2,
  MessageSquare,
  Shield,
  Bell,
  Code,
  LayoutGrid,
  Save,
  RotateCcw,
  AlertTriangle,
  Loader2,
  CheckCircle,
} from "lucide-react";

interface BotSettings {
  id?: number;
  botName: string;
  botDescription: string;
  language: string;
  timezone: string;
  deletePreviousMessages: boolean;
  boldHeaders: boolean;
  useEmoji: boolean;
  welcomeMessage: string;
  unavailableMessage: string;
  footerText: string;
  menuMainTitle: string;
  menuMainEmoji: string;
  menuExpensesTitle: string;
  menuExpensesEmoji: string;
  menuProjectsTitle: string;
  menuProjectsEmoji: string;
  menuReportsTitle: string;
  menuReportsEmoji: string;
  menuExportTitle: string;
  menuExportEmoji: string;
  menuHelpTitle: string;
  menuHelpEmoji: string;
  securityLevel: string;
  responseDelayMin: number;
  responseDelayMax: number;
  dailyMessageLimit: number;
  notifyOnNewMessage: boolean;
  notifyOnError: boolean;
  notifyOnDisconnect: boolean;
  debugMode: boolean;
  messageLogging: boolean;
  autoReconnect: boolean;
}

const DEFAULT_SETTINGS: BotSettings = {
  botName: "بوت أكسيون",
  botDescription: "مساعد ذكي لإدارة المشاريع والمصروفات",
  language: "ar",
  timezone: "Asia/Riyadh",
  deletePreviousMessages: false,
  boldHeaders: true,
  useEmoji: true,
  welcomeMessage: "",
  unavailableMessage: "عذراً، الخدمة غير متاحة حالياً. يرجى المحاولة لاحقاً.",
  footerText: "اكتب رقم الخيار للمتابعة",
  menuMainTitle: "القائمة الرئيسية",
  menuMainEmoji: "📋",
  menuExpensesTitle: "المصروفات",
  menuExpensesEmoji: "💰",
  menuProjectsTitle: "المشاريع",
  menuProjectsEmoji: "🏗️",
  menuReportsTitle: "التقارير",
  menuReportsEmoji: "📊",
  menuExportTitle: "التصدير",
  menuExportEmoji: "📤",
  menuHelpTitle: "المساعدة",
  menuHelpEmoji: "❓",
  securityLevel: "balanced",
  responseDelayMin: 2000,
  responseDelayMax: 5000,
  dailyMessageLimit: 200,
  notifyOnNewMessage: true,
  notifyOnError: true,
  notifyOnDisconnect: true,
  debugMode: false,
  messageLogging: true,
  autoReconnect: true,
};

function SettingsSection({
  title,
  icon: Icon,
  gradientFrom,
  gradientTo,
  iconBg,
  iconColor,
  children,
}: {
  title: string;
  icon: any;
  gradientFrom: string;
  gradientTo: string;
  iconBg: string;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
      <div className={`h-1.5 bg-gradient-to-r ${gradientFrom} ${gradientTo}`} />
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 font-black">
          <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function SettingsFieldRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</Label>
        {description && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function BotSettingsTab() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<BotSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const { data: fetchedSettings, isLoading } = useQuery<BotSettings>({
    queryKey: ["/api/whatsapp-ai/settings"],
  });

  useEffect(() => {
    if (fetchedSettings) {
      setSettings({ ...DEFAULT_SETTINGS, ...fetchedSettings });
      setHasChanges(false);
    }
  }, [fetchedSettings]);

  const updateField = <K extends keyof BotSettings>(key: K, value: BotSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<BotSettings>) => {
      return apiRequest("/api/whatsapp-ai/settings", "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/settings"] });
      setHasChanges(false);
      toast({ title: "تم الحفظ", description: "تم تحديث إعدادات البوت بنجاح" });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في الحفظ",
        description: error.message || "فشل في حفظ الإعدادات",
        variant: "destructive",
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/whatsapp-ai/settings/reset", "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/settings"] });
      setHasChanges(false);
      toast({ title: "تم إعادة التعيين", description: "تمت إعادة الإعدادات إلى القيم الافتراضية" });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إعادة التعيين",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (settings.responseDelayMin > settings.responseDelayMax) {
      toast({
        title: "خطأ في البيانات",
        description: "تأخير الرد الأدنى يجب أن يكون أقل من أو يساوي التأخير الأقصى",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(settings);
  };

  if (isLoading) {
    return (
      <div className="space-y-6" dir="rtl">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600" />
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <SettingsSection
        title="الإعدادات العامة"
        icon={Settings2}
        gradientFrom="from-blue-400"
        gradientTo="to-blue-600"
        iconBg="bg-blue-100 dark:bg-blue-900/30"
        iconColor="text-blue-600"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">اسم البوت</Label>
            <Input
              data-testid="input-bot-name"
              value={settings.botName}
              onChange={(e) => updateField("botName", e.target.value)}
              className="rounded-xl bg-slate-50 dark:bg-slate-800"
              dir="rtl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">وصف البوت</Label>
            <Textarea
              data-testid="input-bot-description"
              value={settings.botDescription}
              onChange={(e) => updateField("botDescription", e.target.value)}
              className="rounded-xl bg-slate-50 dark:bg-slate-800 resize-none"
              rows={2}
              dir="rtl"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">اللغة</Label>
              <Select
                value={settings.language}
                onValueChange={(val) => updateField("language", val)}
              >
                <SelectTrigger data-testid="select-language" className="rounded-xl bg-slate-50 dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">المنطقة الزمنية</Label>
              <Select
                value={settings.timezone}
                onValueChange={(val) => updateField("timezone", val)}
              >
                <SelectTrigger data-testid="select-timezone" className="rounded-xl bg-slate-50 dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Riyadh">الرياض (GMT+3)</SelectItem>
                  <SelectItem value="Asia/Dubai">دبي (GMT+4)</SelectItem>
                  <SelectItem value="Asia/Aden">عدن (GMT+3)</SelectItem>
                  <SelectItem value="Africa/Cairo">القاهرة (GMT+2)</SelectItem>
                  <SelectItem value="Asia/Baghdad">بغداد (GMT+3)</SelectItem>
                  <SelectItem value="Asia/Amman">عمّان (GMT+3)</SelectItem>
                  <SelectItem value="Asia/Beirut">بيروت (GMT+3)</SelectItem>
                  <SelectItem value="Asia/Kuwait">الكويت (GMT+3)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="إعدادات الرسائل"
        icon={MessageSquare}
        gradientFrom="from-emerald-400"
        gradientTo="to-emerald-600"
        iconBg="bg-emerald-100 dark:bg-emerald-900/30"
        iconColor="text-emerald-600"
      >
        <div className="space-y-4">
          <SettingsFieldRow label="حذف الرسائل السابقة" description="حذف الرسائل القديمة عند إرسال رد جديد">
            <Switch
              data-testid="switch-delete-previous"
              checked={settings.deletePreviousMessages}
              onCheckedChange={(val) => updateField("deletePreviousMessages", val)}
            />
          </SettingsFieldRow>
          <Separator />
          <SettingsFieldRow label="عناوين بولد" description="عرض العناوين بخط عريض في الرسائل">
            <Switch
              data-testid="switch-bold-headers"
              checked={settings.boldHeaders}
              onCheckedChange={(val) => updateField("boldHeaders", val)}
            />
          </SettingsFieldRow>
          <Separator />
          <SettingsFieldRow label="استخدام إيموجي" description="إضافة رموز تعبيرية في الرسائل والقوائم">
            <Switch
              data-testid="switch-use-emoji"
              checked={settings.useEmoji}
              onCheckedChange={(val) => updateField("useEmoji", val)}
            />
          </SettingsFieldRow>
          <Separator />
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">رسالة ترحيب مخصصة</Label>
            <Textarea
              data-testid="input-welcome-message"
              value={settings.welcomeMessage}
              onChange={(e) => updateField("welcomeMessage", e.target.value)}
              placeholder="اتركه فارغاً لاستخدام الافتراضية"
              className="rounded-xl bg-slate-50 dark:bg-slate-800 resize-none"
              rows={2}
              dir="rtl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">رسالة عدم التوفر</Label>
            <Textarea
              data-testid="input-unavailable-message"
              value={settings.unavailableMessage}
              onChange={(e) => updateField("unavailableMessage", e.target.value)}
              className="rounded-xl bg-slate-50 dark:bg-slate-800 resize-none"
              rows={2}
              dir="rtl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">نص التذييل</Label>
            <Input
              data-testid="input-footer-text"
              value={settings.footerText}
              onChange={(e) => updateField("footerText", e.target.value)}
              className="rounded-xl bg-slate-50 dark:bg-slate-800"
              dir="rtl"
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="تخصيص القوائم"
        icon={LayoutGrid}
        gradientFrom="from-violet-400"
        gradientTo="to-violet-600"
        iconBg="bg-violet-100 dark:bg-violet-900/30"
        iconColor="text-violet-600"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: "Main", label: "القائمة الرئيسية", titleField: "menuMainTitle" as const, emojiField: "menuMainEmoji" as const },
            { key: "Expenses", label: "المصروفات", titleField: "menuExpensesTitle" as const, emojiField: "menuExpensesEmoji" as const },
            { key: "Projects", label: "المشاريع", titleField: "menuProjectsTitle" as const, emojiField: "menuProjectsEmoji" as const },
            { key: "Reports", label: "التقارير", titleField: "menuReportsTitle" as const, emojiField: "menuReportsEmoji" as const },
            { key: "Export", label: "التصدير", titleField: "menuExportTitle" as const, emojiField: "menuExportEmoji" as const },
            { key: "Help", label: "المساعدة", titleField: "menuHelpTitle" as const, emojiField: "menuHelpEmoji" as const },
          ].map((menu) => (
            <div
              key={menu.key}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-2"
            >
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{menu.label}</p>
              <div className="flex items-center gap-2">
                <Input
                  data-testid={`input-menu-emoji-${menu.key.toLowerCase()}`}
                  value={settings[menu.emojiField]}
                  onChange={(e) => updateField(menu.emojiField, e.target.value)}
                  className="w-14 text-center rounded-lg bg-white dark:bg-slate-800 text-lg"
                  maxLength={4}
                />
                <Input
                  data-testid={`input-menu-title-${menu.key.toLowerCase()}`}
                  value={settings[menu.titleField]}
                  onChange={(e) => updateField(menu.titleField, e.target.value)}
                  className="flex-1 rounded-lg bg-white dark:bg-slate-800"
                  maxLength={100}
                  dir="rtl"
                />
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="الحماية والأمان"
        icon={Shield}
        gradientFrom="from-amber-400"
        gradientTo="to-amber-600"
        iconBg="bg-amber-100 dark:bg-amber-900/30"
        iconColor="text-amber-600"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">مستوى الحماية</Label>
            <Select
              value={settings.securityLevel}
              onValueChange={(val) => updateField("securityLevel", val)}
            >
              <SelectTrigger data-testid="select-security-level" className="rounded-xl bg-slate-50 dark:bg-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maximum">الحد الأقصى - تأخير طويل وحماية كاملة</SelectItem>
                <SelectItem value="balanced">متوازن - حماية جيدة مع سرعة مقبولة</SelectItem>
                <SelectItem value="minimal">الحد الأدنى - سرعة أعلى مع حماية أساسية</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {settings.securityLevel === "maximum"
                ? "أقصى حماية: تأخير طويل بين الرسائل، حماية كاملة من الحظر"
                : settings.securityLevel === "balanced"
                ? "توازن بين الحماية والسرعة، مناسب للاستخدام اليومي"
                : "سرعة أعلى في الرد مع حماية أساسية فقط"}
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                تأخير الرد الأدنى
              </Label>
              <Badge variant="secondary" className="text-[10px] font-bold" data-testid="text-delay-min-value">
                {settings.responseDelayMin} ms
              </Badge>
            </div>
            <Slider
              data-testid="slider-delay-min"
              value={[settings.responseDelayMin]}
              onValueChange={([val]) => updateField("responseDelayMin", val)}
              min={500}
              max={10000}
              step={100}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>500ms</span>
              <span>10,000ms</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                تأخير الرد الأقصى
              </Label>
              <Badge variant="secondary" className="text-[10px] font-bold" data-testid="text-delay-max-value">
                {settings.responseDelayMax} ms
              </Badge>
            </div>
            <Slider
              data-testid="slider-delay-max"
              value={[settings.responseDelayMax]}
              onValueChange={([val]) => updateField("responseDelayMax", val)}
              min={1000}
              max={30000}
              step={100}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>1,000ms</span>
              <span>30,000ms</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">الحد اليومي للرسائل</Label>
            <div className="flex items-center gap-3">
              <Input
                data-testid="input-daily-limit"
                type="number"
                value={settings.dailyMessageLimit}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 10;
                  updateField("dailyMessageLimit", Math.min(1000, Math.max(10, val)));
                }}
                min={10}
                max={1000}
                className="w-32 rounded-xl bg-slate-50 dark:bg-slate-800"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">رسالة / يوم (10 - 1000)</span>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="الإشعارات"
        icon={Bell}
        gradientFrom="from-rose-400"
        gradientTo="to-rose-600"
        iconBg="bg-rose-100 dark:bg-rose-900/30"
        iconColor="text-rose-600"
      >
        <div className="space-y-4">
          <SettingsFieldRow label="إشعار عند رسالة جديدة" description="تنبيه عند استقبال رسالة واردة جديدة">
            <Switch
              data-testid="switch-notify-new-message"
              checked={settings.notifyOnNewMessage}
              onCheckedChange={(val) => updateField("notifyOnNewMessage", val)}
            />
          </SettingsFieldRow>
          <Separator />
          <SettingsFieldRow label="إشعار عند خطأ" description="تنبيه عند حدوث خطأ في معالجة الرسائل">
            <Switch
              data-testid="switch-notify-error"
              checked={settings.notifyOnError}
              onCheckedChange={(val) => updateField("notifyOnError", val)}
            />
          </SettingsFieldRow>
          <Separator />
          <SettingsFieldRow label="إشعار عند انقطاع الاتصال" description="تنبيه فوري عند فقدان الاتصال بواتساب">
            <Switch
              data-testid="switch-notify-disconnect"
              checked={settings.notifyOnDisconnect}
              onCheckedChange={(val) => updateField("notifyOnDisconnect", val)}
            />
          </SettingsFieldRow>
        </div>
      </SettingsSection>

      <SettingsSection
        title="إعدادات متقدمة"
        icon={Code}
        gradientFrom="from-slate-400"
        gradientTo="to-slate-600"
        iconBg="bg-slate-200 dark:bg-slate-700"
        iconColor="text-slate-600 dark:text-slate-300"
      >
        <div className="space-y-4">
          <SettingsFieldRow label="وضع التصحيح" description="تفعيل سجلات تفصيلية للمطورين فقط">
            <Switch
              data-testid="switch-debug-mode"
              checked={settings.debugMode}
              onCheckedChange={(val) => updateField("debugMode", val)}
            />
          </SettingsFieldRow>
          {settings.debugMode && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">
                  وضع التصحيح مفعّل - قد يؤثر على الأداء ويعرض معلومات حساسة في السجلات
                </p>
              </div>
            </div>
          )}
          <Separator />
          <SettingsFieldRow label="تسجيل الرسائل" description="حفظ جميع الرسائل الواردة والصادرة في قاعدة البيانات">
            <Switch
              data-testid="switch-message-logging"
              checked={settings.messageLogging}
              onCheckedChange={(val) => updateField("messageLogging", val)}
            />
          </SettingsFieldRow>
          <Separator />
          <SettingsFieldRow label="إعادة الاتصال التلقائي" description="محاولة إعادة الاتصال تلقائياً عند الانقطاع">
            <Switch
              data-testid="switch-auto-reconnect"
              checked={settings.autoReconnect}
              onCheckedChange={(val) => updateField("autoReconnect", val)}
            />
          </SettingsFieldRow>
          <Separator />
          <Button
            data-testid="btn-reset-settings"
            variant="outline"
            className="w-full rounded-xl text-red-600 border-red-200 dark:border-red-800 font-bold gap-2"
            onClick={() => setShowResetDialog(true)}
          >
            <RotateCcw className="h-4 w-4" />
            إعادة تعيين جميع الإعدادات
          </Button>
        </div>
      </SettingsSection>

      {hasChanges && (
        <div className="sticky bottom-4 z-50">
          <Card className="border-0 shadow-2xl bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-400 to-blue-500" />
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  لديك تغييرات غير محفوظة
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  data-testid="btn-discard-changes"
                  variant="outline"
                  className="rounded-xl font-bold"
                  onClick={() => {
                    if (fetchedSettings) {
                      setSettings({ ...DEFAULT_SETTINGS, ...fetchedSettings });
                    } else {
                      setSettings(DEFAULT_SETTINGS);
                    }
                    setHasChanges(false);
                  }}
                >
                  تجاهل
                </Button>
                <Button
                  data-testid="btn-save-settings"
                  className="rounded-xl font-black bg-emerald-600 text-white gap-2"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  حفظ الإعدادات
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="rounded-2xl" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right font-black flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              إعادة تعيين الإعدادات
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              سيتم إعادة جميع الإعدادات إلى القيم الافتراضية. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              data-testid="btn-confirm-reset"
              className="rounded-xl font-bold bg-red-600 text-white"
              onClick={() => {
                resetMutation.mutate();
                setShowResetDialog(false);
              }}
            >
              {resetMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "إعادة تعيين"
              )}
            </AlertDialogAction>
            <AlertDialogCancel data-testid="btn-cancel-reset" className="rounded-xl font-bold">
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
