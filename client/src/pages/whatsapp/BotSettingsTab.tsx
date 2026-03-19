import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { toUserMessage } from "@/lib/error-utils";
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
  Power,
  Clock,
  Zap,
  Download,
  Upload,
  MessageCircle,
  Users,
  Activity,
  Timer,
  FileText,
  Image,
  Phone,
} from "lucide-react";

interface BotSettings {
  id?: number;
  botName: string;
  botDescription: string;
  language: string;
  timezone: string;
  deletePreviousMessages: boolean;
  boldHeadings: boolean;
  useEmoji: boolean;
  welcomeMessage: string;
  unavailableMessage: string;
  footerText: string;
  menuMainTitle: string;
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
  botEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  businessHoursEnabled: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  businessDays: string;
  outsideHoursMessage: string;
  smartGreeting: boolean;
  goodbyeMessage: string;
  waitingMessage: string;
  typingIndicator: boolean;
  sessionTimeoutMinutes: number;
  maxMessageLength: number;
  perUserDailyLimit: number;
  rateLimitPerMinute: number;
  maxRetries: number;
  adminNotifyPhone: string;
  mediaEnabled: boolean;
  protectionLevel: string;
  responseDelayMin: number;
  responseDelayMax: number;
  dailyMessageLimit: number;
  notifyNewMessage: boolean;
  notifyOnError: boolean;
  notifyOnDisconnect: boolean;
  debugMode: boolean;
  messageLogging: boolean;
  autoReconnect: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_SETTINGS: BotSettings = {
  botName: "بوت أكسيون",
  botDescription: "مساعد ذكي لإدارة المشاريع والمصروفات",
  language: "ar",
  timezone: "Asia/Riyadh",
  deletePreviousMessages: false,
  boldHeadings: true,
  useEmoji: true,
  welcomeMessage: "",
  unavailableMessage: "عذراً، الخدمة غير متاحة حالياً. يرجى المحاولة لاحقاً.",
  footerText: "اكتب رقم الخيار للمتابعة",
  menuMainTitle: "القائمة الرئيسية",
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
  botEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: "🔧 البوت في وضع الصيانة حالياً. سنعود قريباً.",
  businessHoursEnabled: false,
  businessHoursStart: "08:00",
  businessHoursEnd: "17:00",
  businessDays: "0,1,2,3,4",
  outsideHoursMessage: "⏰ عذراً، ساعات العمل من {start} إلى {end}. سنرد عليك في أقرب وقت.",
  smartGreeting: true,
  goodbyeMessage: "",
  waitingMessage: "⏳ جاري معالجة طلبك...",
  typingIndicator: true,
  sessionTimeoutMinutes: 30,
  maxMessageLength: 4000,
  perUserDailyLimit: 100,
  rateLimitPerMinute: 10,
  maxRetries: 3,
  adminNotifyPhone: "",
  mediaEnabled: true,
  protectionLevel: "balanced",
  responseDelayMin: 2000,
  responseDelayMax: 5000,
  dailyMessageLimit: 200,
  notifyNewMessage: true,
  notifyOnError: true,
  notifyOnDisconnect: true,
  debugMode: false,
  messageLogging: true,
  autoReconnect: true,
};

const DAY_NAMES = [
  { value: "0", label: "الأحد" },
  { value: "1", label: "الإثنين" },
  { value: "2", label: "الثلاثاء" },
  { value: "3", label: "الأربعاء" },
  { value: "4", label: "الخميس" },
  { value: "5", label: "الجمعة" },
  { value: "6", label: "السبت" },
];

function SettingsSection({
  title,
  icon: Icon,
  gradientFrom,
  gradientTo,
  iconBg,
  iconColor,
  badge,
  children,
}: {
  title: string;
  icon: any;
  gradientFrom: string;
  gradientTo: string;
  iconBg: string;
  iconColor: string;
  badge?: { text: string; variant: "default" | "destructive" | "secondary" | "outline" };
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
          {badge && (
            <Badge variant={badge.variant} className="text-[10px] font-bold mr-auto">
              {badge.text}
            </Badge>
          )}
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const toggleBusinessDay = (day: string) => {
    const currentDays = settings.businessDays.split(",").filter(Boolean);
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day].sort((a, b) => Number(a) - Number(b));
    updateField("businessDays", newDays.join(","));
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
        description: toUserMessage(error, "فشل في حفظ الإعدادات"),
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
        description: toUserMessage(error, "فشل في إعادة التعيين"),
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
    const { id, updatedAt, updatedBy, ...cleanSettings } = settings;
    saveMutation.mutate(cleanSettings);
  };

  const handleExportSettings = () => {
    const exportData = { ...settings };
    delete exportData.id;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bot-settings-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "تم التصدير", description: "تم تصدير الإعدادات بنجاح" });
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        setSettings({ ...DEFAULT_SETTINGS, ...imported });
        setHasChanges(true);
        toast({ title: "تم الاستيراد", description: "تم استيراد الإعدادات. اضغط حفظ لتطبيقها." });
      } catch {
        toast({ title: "خطأ", description: "ملف غير صالح", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (isLoading) {
    return (
      <div className="space-y-6" dir="rtl">
        {Array.from({ length: 8 }).map((_, i) => (
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
        title="التحكم بالبوت"
        icon={Power}
        gradientFrom="from-red-400"
        gradientTo="to-orange-500"
        iconBg="bg-red-100 dark:bg-red-900/30"
        iconColor="text-red-600"
        badge={
          !settings.botEnabled
            ? { text: "معطّل", variant: "destructive" }
            : settings.maintenanceMode
            ? { text: "صيانة", variant: "secondary" }
            : { text: "يعمل", variant: "default" }
        }
      >
        <div className="space-y-4">
          <SettingsFieldRow label="تفعيل البوت" description="تشغيل أو إيقاف البوت بالكامل. عند الإيقاف لن يرد على أي رسالة">
            <Switch
              data-testid="switch-bot-enabled"
              checked={settings.botEnabled}
              onCheckedChange={(val) => updateField("botEnabled", val)}
            />
          </SettingsFieldRow>
          {!settings.botEnabled && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-[11px] text-red-700 dark:text-red-400 font-bold">
                  البوت معطّل تماماً — لن يستقبل أو يرد على أي رسائل
                </p>
              </div>
            </div>
          )}
          <Separator />
          <SettingsFieldRow label="وضع الصيانة" description="يرد برسالة صيانة مخصصة على كل الرسائل">
            <Switch
              data-testid="switch-maintenance-mode"
              checked={settings.maintenanceMode}
              onCheckedChange={(val) => updateField("maintenanceMode", val)}
            />
          </SettingsFieldRow>
          {settings.maintenanceMode && (
            <div className="space-y-1.5">
              <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">رسالة الصيانة</Label>
              <Textarea
                data-testid="input-maintenance-message"
                value={settings.maintenanceMessage}
                onChange={(e) => updateField("maintenanceMessage", e.target.value)}
                className="rounded-xl bg-slate-50 dark:bg-slate-800 resize-none"
                rows={2}
                dir="rtl"
              />
            </div>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="ساعات العمل"
        icon={Clock}
        gradientFrom="from-cyan-400"
        gradientTo="to-teal-500"
        iconBg="bg-cyan-100 dark:bg-cyan-900/30"
        iconColor="text-cyan-600"
        badge={settings.businessHoursEnabled ? { text: "مفعّل", variant: "default" } : undefined}
      >
        <div className="space-y-4">
          <SettingsFieldRow label="تفعيل ساعات العمل" description="البوت يرد فقط خلال ساعات العمل المحددة">
            <Switch
              data-testid="switch-business-hours"
              checked={settings.businessHoursEnabled}
              onCheckedChange={(val) => updateField("businessHoursEnabled", val)}
            />
          </SettingsFieldRow>
          {settings.businessHoursEnabled && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">من الساعة</Label>
                  <Input
                    data-testid="input-business-start"
                    type="time"
                    value={settings.businessHoursStart}
                    onChange={(e) => updateField("businessHoursStart", e.target.value)}
                    className="rounded-xl bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">إلى الساعة</Label>
                  <Input
                    data-testid="input-business-end"
                    type="time"
                    value={settings.businessHoursEnd}
                    onChange={(e) => updateField("businessHoursEnd", e.target.value)}
                    className="rounded-xl bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">أيام العمل</Label>
                <div className="flex flex-wrap gap-2">
                  {DAY_NAMES.map((day) => {
                    const isActive = settings.businessDays.split(",").includes(day.value);
                    return (
                      <button
                        key={day.value}
                        data-testid={`btn-day-${day.value}`}
                        type="button"
                        onClick={() => toggleBusinessDay(day.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isActive
                            ? "bg-cyan-600 text-white shadow-md"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">رسالة خارج أوقات العمل</Label>
                <Textarea
                  data-testid="input-outside-hours-message"
                  value={settings.outsideHoursMessage}
                  onChange={(e) => updateField("outsideHoursMessage", e.target.value)}
                  className="rounded-xl bg-slate-50 dark:bg-slate-800 resize-none"
                  rows={2}
                  dir="rtl"
                  placeholder="استخدم {start} و {end} للأوقات"
                />
                <p className="text-[10px] text-slate-400">متغيرات: {"{start}"} = وقت البداية، {"{end}"} = وقت النهاية</p>
              </div>
            </>
          )}
        </div>
      </SettingsSection>

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
                onValueChange={(val: string) => updateField("language", val)}
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
                onValueChange={(val: string) => updateField("timezone", val)}
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
        title="الرسائل التلقائية"
        icon={MessageCircle}
        gradientFrom="from-emerald-400"
        gradientTo="to-emerald-600"
        iconBg="bg-emerald-100 dark:bg-emerald-900/30"
        iconColor="text-emerald-600"
      >
        <div className="space-y-4">
          <SettingsFieldRow label="تحية ذكية حسب الوقت" description="صباح الخير / مساء الخير تلقائياً حسب الوقت">
            <Switch
              data-testid="switch-smart-greeting"
              checked={settings.smartGreeting}
              onCheckedChange={(val) => updateField("smartGreeting", val)}
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
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">رسالة الانتظار</Label>
            <Textarea
              data-testid="input-waiting-message"
              value={settings.waitingMessage}
              onChange={(e) => updateField("waitingMessage", e.target.value)}
              placeholder="تظهر أثناء معالجة الطلبات الطويلة"
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
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">رسالة الوداع</Label>
            <Textarea
              data-testid="input-goodbye-message"
              value={settings.goodbyeMessage}
              onChange={(e) => updateField("goodbyeMessage", e.target.value)}
              placeholder="اتركه فارغاً لعدم إرسال رسالة وداع"
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
        title="إعدادات الرسائل"
        icon={MessageSquare}
        gradientFrom="from-green-400"
        gradientTo="to-green-600"
        iconBg="bg-green-100 dark:bg-green-900/30"
        iconColor="text-green-600"
      >
        <div className="space-y-4">
          <SettingsFieldRow label="مؤشر الكتابة" description="إظهار 'جاري الكتابة...' قبل الرد">
            <Switch
              data-testid="switch-typing-indicator"
              checked={settings.typingIndicator}
              onCheckedChange={(val) => updateField("typingIndicator", val)}
            />
          </SettingsFieldRow>
          <Separator />
          <SettingsFieldRow label="استقبال الوسائط" description="السماح باستقبال الصور والملفات">
            <Switch
              data-testid="switch-media-enabled"
              checked={settings.mediaEnabled}
              onCheckedChange={(val) => updateField("mediaEnabled", val)}
            />
          </SettingsFieldRow>
          <Separator />
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
              checked={settings.boldHeadings}
              onCheckedChange={(val) => updateField("boldHeadings", val)}
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
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">الحد الأقصى لطول الرسالة</Label>
              <Badge variant="secondary" className="text-[10px] font-bold" data-testid="text-max-msg-length">
                {settings.maxMessageLength} حرف
              </Badge>
            </div>
            <Slider
              data-testid="slider-max-message-length"
              value={[settings.maxMessageLength]}
              onValueChange={([val]) => updateField("maxMessageLength", val)}
              min={500}
              max={10000}
              step={100}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>500</span>
              <span>10,000</span>
            </div>
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
            { key: "Main", label: "القائمة الرئيسية", titleField: "menuMainTitle" as const, emojiField: null },
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
                {menu.emojiField && (
                  <Input
                    data-testid={`input-menu-emoji-${menu.key.toLowerCase()}`}
                    value={settings[menu.emojiField]}
                    onChange={(e) => updateField(menu.emojiField, e.target.value)}
                    className="w-14 text-center rounded-lg bg-white dark:bg-slate-800 text-lg"
                    maxLength={4}
                  />
                )}
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
        title="الحدود والأداء"
        icon={Zap}
        gradientFrom="from-yellow-400"
        gradientTo="to-orange-500"
        iconBg="bg-yellow-100 dark:bg-yellow-900/30"
        iconColor="text-yellow-600"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">الحد اليومي الإجمالي</Label>
              <Input
                data-testid="input-daily-limit"
                type="number"
                value={settings.dailyMessageLimit}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 10;
                  updateField("dailyMessageLimit", Math.min(5000, Math.max(10, val)));
                }}
                min={10}
                max={5000}
                className="rounded-xl bg-slate-50 dark:bg-slate-800"
              />
              <p className="text-[10px] text-slate-400">رسالة/يوم للبوت بالكامل</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">الحد اليومي لكل مستخدم</Label>
              <Input
                data-testid="input-per-user-limit"
                type="number"
                value={settings.perUserDailyLimit}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 10;
                  updateField("perUserDailyLimit", Math.min(1000, Math.max(5, val)));
                }}
                min={5}
                max={1000}
                className="rounded-xl bg-slate-50 dark:bg-slate-800"
              />
              <p className="text-[10px] text-slate-400">رسالة/يوم لكل مستخدم</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">حد المعدل (بالدقيقة)</Label>
              <Input
                data-testid="input-rate-limit"
                type="number"
                value={settings.rateLimitPerMinute}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 3;
                  updateField("rateLimitPerMinute", Math.min(60, Math.max(1, val)));
                }}
                min={1}
                max={60}
                className="rounded-xl bg-slate-50 dark:bg-slate-800"
              />
              <p className="text-[10px] text-slate-400">الحد الأقصى لرسائل المستخدم/الدقيقة</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">مهلة الجلسة</Label>
              <Input
                data-testid="input-session-timeout"
                type="number"
                value={settings.sessionTimeoutMinutes}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 5;
                  updateField("sessionTimeoutMinutes", Math.min(1440, Math.max(1, val)));
                }}
                min={1}
                max={1440}
                className="rounded-xl bg-slate-50 dark:bg-slate-800"
              />
              <p className="text-[10px] text-slate-400">دقيقة (1 - 1440)</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">محاولات إعادة الإرسال</Label>
            <div className="flex items-center gap-3">
              <Input
                data-testid="input-max-retries"
                type="number"
                value={settings.maxRetries}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  updateField("maxRetries", Math.min(10, Math.max(0, val)));
                }}
                min={0}
                max={10}
                className="w-24 rounded-xl bg-slate-50 dark:bg-slate-800"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">محاولة عند فشل معالجة الرسالة</span>
            </div>
          </div>
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
              value={settings.protectionLevel}
              onValueChange={(val: string) => updateField("protectionLevel", val)}
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
              {settings.protectionLevel === "maximum"
                ? "أقصى حماية: تأخير طويل بين الرسائل، حماية كاملة من الحظر"
                : settings.protectionLevel === "balanced"
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
              checked={settings.notifyNewMessage}
              onCheckedChange={(val) => updateField("notifyNewMessage", val)}
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
          <Separator />
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">رقم الأدمن للإشعارات</Label>
            <Input
              data-testid="input-admin-notify-phone"
              value={settings.adminNotifyPhone}
              onChange={(e) => updateField("adminNotifyPhone", e.target.value)}
              placeholder="967XXXXXXXXX"
              className="rounded-xl bg-slate-50 dark:bg-slate-800"
              dir="ltr"
            />
            <p className="text-[10px] text-slate-400">رقم واتساب لاستقبال إشعارات الأخطاء والانقطاعات</p>
          </div>
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

          <div className="flex gap-2">
            <Button
              data-testid="btn-export-settings"
              variant="outline"
              className="flex-1 rounded-xl font-bold gap-2"
              onClick={handleExportSettings}
            >
              <Download className="h-4 w-4" />
              تصدير الإعدادات
            </Button>
            <Button
              data-testid="btn-import-settings"
              variant="outline"
              className="flex-1 rounded-xl font-bold gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              استيراد الإعدادات
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportSettings}
              className="hidden"
            />
          </div>

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
