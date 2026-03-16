import React, { useState, useEffect, useCallback } from "react";
import { getAccessToken, getFetchCredentials, getClientPlatformHeader, getAuthHeaders } from '@/lib/auth-token-store';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Moon, 
  Sun, 
  Shield, 
  Smartphone, 
  Palette, 
  Database,
  Lock,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Fingerprint,
  CheckCircle2,
  XCircle,
  Loader2,
  Save
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { exportLocalData, importLocalData } from "@/offline/backup";
import { clearAllLocalData } from "@/offline/data-cleanup";
import { getSyncStats } from "@/offline/offline";
import { useSyncData } from "@/hooks/useSyncData";

interface Preferences {
  language: string;
  auto_update: boolean;
  dark_mode: boolean;
  font_size: string;
  push_notifications: boolean;
  expense_alerts: boolean;
  attendance_alerts: boolean;
  app_lock: boolean;
}

const DEFAULT_PREFS: Preferences = {
  language: 'ar',
  auto_update: true,
  dark_mode: false,
  font_size: 'medium',
  push_notifications: true,
  expense_alerts: true,
  attendance_alerts: false,
  app_lock: false,
};

export default function SettingsPage() {
  const { toast } = useToast();
  const { manualSync, isSyncing, isOnline } = useSyncData();
  const [stats, setStats] = useState<{ pendingSync: number; localUserData: number } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<'loading' | 'enabled' | 'disabled' | 'unsupported'>('loading');
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [savedPrefs, setSavedPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const getApiBase = useCallback(async () => {
    const { ENV } = await import("../lib/env");
    return ENV.getApiBaseUrl();
  }, []);

  const getSettingsAuthHeaders = useCallback((): Record<string, string> | null => {
    const token = getAccessToken();
    const authHdrs = getAuthHeaders();
    if (!token && Object.keys(authHdrs).length === 0 && typeof navigator !== 'undefined') {
      return { 'Content-Type': 'application/json', ...getClientPlatformHeader() };
    }
    if (!token && Object.keys(authHdrs).length === 0) return null;
    return { 'Content-Type': 'application/json', ...getClientPlatformHeader(), ...authHdrs };
  }, []);

  const loadPreferences = useCallback(async () => {
    try {
      const headers = getSettingsAuthHeaders();
      if (!headers) { setPrefsLoading(false); return; }

      const apiBase = await getApiBase();
      const res = await fetch(`${apiBase}/api/preferences`, { headers, credentials: getFetchCredentials() });
      if (res.ok) {
        const data = await res.json();
        if (data.preferences) {
          const loaded: Preferences = {
            language: data.preferences.language || 'ar',
            auto_update: data.preferences.auto_update ?? true,
            dark_mode: data.preferences.dark_mode ?? false,
            font_size: data.preferences.font_size || 'medium',
            push_notifications: data.preferences.push_notifications ?? true,
            expense_alerts: data.preferences.expense_alerts ?? true,
            attendance_alerts: data.preferences.attendance_alerts ?? false,
            app_lock: data.preferences.app_lock ?? false,
          };
          setPrefs(loaded);
          setSavedPrefs(loaded);
          applyTheme(loaded.dark_mode);
          applyFontSize(loaded.font_size);
        }
      }
    } catch (err) {
      console.warn('Failed to load preferences:', err);
    } finally {
      setPrefsLoading(false);
    }
  }, [getApiBase, getSettingsAuthHeaders]);

  const applyTheme = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const applyFontSize = (size: string) => {
    document.documentElement.classList.remove('text-sm', 'text-base', 'text-lg');
    if (size === 'small') document.documentElement.classList.add('text-sm');
    else if (size === 'large') document.documentElement.classList.add('text-lg');
    else document.documentElement.classList.add('text-base');
    localStorage.setItem("fontSize", size);
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const headers = getSettingsAuthHeaders();
      if (!headers) {
        toast({ title: "خطأ", description: "يجب تسجيل الدخول أولاً", variant: "destructive" });
        return;
      }

      const apiBase = await getApiBase();
      const res = await fetch(`${apiBase}/api/preferences`, {
        method: 'PUT',
        credentials: getFetchCredentials(),
        headers: { ...headers, 'x-request-nonce': crypto.randomUUID(), 'x-request-timestamp': new Date().toISOString() },
        body: JSON.stringify(prefs),
      });

      if (res.ok) {
        setSavedPrefs({ ...prefs });
        applyTheme(prefs.dark_mode);
        applyFontSize(prefs.font_size);
        toast({ title: "تم حفظ الإعدادات", description: "تم تحديث تفضيلاتك بنجاح في قاعدة البيانات" });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "خطأ", description: err.message || "فشل في حفظ الإعدادات", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "حدث خطأ أثناء الحفظ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const cancelChanges = () => {
    setPrefs({ ...savedPrefs });
    applyTheme(savedPrefs.dark_mode);
    applyFontSize(savedPrefs.font_size);
    toast({ title: "تم التراجع", description: "تم استعادة الإعدادات السابقة", duration: 2000 });
  };

  const hasChanges = JSON.stringify(prefs) !== JSON.stringify(savedPrefs);

  const updatePref = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    if (key === 'dark_mode') applyTheme(value as boolean);
    if (key === 'font_size') applyFontSize(value as string);
  };

  const loadStats = async () => {
    const s = await getSyncStats();
    setStats(s);
  };

  const checkBiometricStatus = async () => {
    try {
      const { isBiometricAvailable } = await import("../lib/webauthn");
      const available = await isBiometricAvailable();
      if (!available) { setBiometricStatus('unsupported'); return; }

      const headers = getSettingsAuthHeaders();
      if (!headers) { setBiometricStatus('disabled'); return; }

      const apiBase = await getApiBase();
      const res = await fetch(`${apiBase}/api/webauthn/status`, { headers, credentials: getFetchCredentials() });
      if (res.ok) {
        const data = await res.json();
        setBiometricStatus(data.enabled ? 'enabled' : 'disabled');
      } else {
        setBiometricStatus('disabled');
      }
    } catch {
      setBiometricStatus('disabled');
    }
  };

  const handleEnableBiometric = async () => {
    setBiometricLoading(true);
    try {
      const token = getAccessToken();
      if (!token) {
        toast({ title: "خطأ", description: "يجب تسجيل الدخول أولاً", variant: "destructive" });
        return;
      }
      const { registerBiometric } = await import("../lib/webauthn");
      const result = await registerBiometric(token);
      if (result.success) {
        setBiometricStatus('enabled');
        toast({ title: "تم التفعيل", description: "تم تفعيل الدخول بالبصمة بنجاح" });
      } else {
        toast({ title: "فشل التفعيل", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        toast({ title: "تم الإلغاء", description: "تم إلغاء عملية تسجيل البصمة" });
      } else {
        toast({ title: "خطأ", description: error.message || "فشل في تفعيل البصمة", variant: "destructive" });
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleDisableBiometric = async () => {
    if (!confirm("هل أنت متأكد من إلغاء تفعيل البصمة؟ ستحتاج لإعادة تفعيلها لاستخدامها مرة أخرى.")) return;
    setBiometricLoading(true);
    try {
      const token = getAccessToken();
      if (!token) return;
      const apiBase = await getApiBase();
      const res = await fetch(`${apiBase}/api/webauthn/credentials`, {
        method: 'DELETE',
        credentials: getFetchCredentials(),
        headers: { ...getClientPlatformHeader(), ...getAuthHeaders(), 'x-request-nonce': crypto.randomUUID(), 'x-request-timestamp': new Date().toISOString() },
      });
      if (res.ok) {
        setBiometricStatus('disabled');
        localStorage.removeItem('biometric_credential_registered');
        localStorage.removeItem('biometric_prompt_dismissed');
        toast({ title: "تم الإلغاء", description: "تم إلغاء تفعيل البصمة بنجاح" });
      } else {
        toast({ title: "خطأ", description: "فشل في إلغاء البصمة", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "حدث خطأ", variant: "destructive" });
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportLocalData();
      toast({ title: "تم التصدير بنجاح", description: "تم حفظ نسخة احتياطية من بياناتك المحلية" });
    } catch {
      toast({ title: "خطأ في التصدير", variant: "destructive" });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        await importLocalData(event.target?.result as string);
        await loadStats();
        toast({ title: "تم الاستيراد بنجاح", description: "تم تحديث البيانات المحلية من النسخة الاحتياطية" });
      } catch {
        toast({ title: "خطأ في الاستيراد", description: "تأكد من صحة ملف النسخة الاحتياطية", variant: "destructive" });
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const handleClear = async () => {
    if (confirm("هل أنت متأكد من مسح جميع البيانات المحلية؟ سيتم حذف جميع العمليات غير المتزامنة.")) {
      await clearAllLocalData();
      await loadStats();
      toast({ title: "تم مسح البيانات", description: "تم تنظيف قاعدة البيانات المحلية بنجاح" });
    }
  };

  useEffect(() => {
    loadPreferences();
    loadStats();
    checkBiometricStatus();
  }, [loadPreferences]);

  return (
    <div className="container mx-auto p-4 max-w-4xl animate-in fade-in duration-500 pb-20">
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl w-full justify-start overflow-x-auto h-auto">
          <TabsTrigger value="general" className="rounded-lg gap-2">
            <SettingsIcon className="h-4 w-4" />
            عام
          </TabsTrigger>
          <TabsTrigger value="offline" className="rounded-lg gap-2">
            <Database className="h-4 w-4" />
            البيانات (Offline)
          </TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-lg gap-2">
            <Palette className="h-4 w-4" />
            المظهر
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg gap-2">
            <Bell className="h-4 w-4" />
            التنبيهات
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg gap-2">
            <Lock className="h-4 w-4" />
            الأمان
          </TabsTrigger>
        </TabsList>

        {prefsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <TabsContent value="general" className="space-y-4">
              <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-blue-500" />
                    تفضيلات التطبيق
                  </CardTitle>
                  <CardDescription>الإعدادات الأساسية لواجهة التطبيق</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">لغة النظام</Label>
                      <p className="text-sm text-muted-foreground">اختر اللغة المفضلة لواجهة المستخدم</p>
                    </div>
                    <Select value={prefs.language} onValueChange={(v: string) => updatePref('language', v)}>
                      <SelectTrigger className="w-[140px] rounded-xl" data-testid="select-language">
                        <SelectValue placeholder="اختر اللغة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">العربية</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator className="opacity-50" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">تحديث تلقائي</Label>
                      <p className="text-sm text-muted-foreground">تحديث البيانات بشكل دوري في الخلفية</p>
                    </div>
                    <Switch
                      checked={prefs.auto_update}
                      onCheckedChange={(v) => updatePref('auto_update', v)}
                      data-testid="switch-auto-update"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="offline" className="space-y-4">
              <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-500" />
                    إدارة البيانات المحلية (Offline)
                  </CardTitle>
                  <CardDescription>تحكم في البيانات المخزنة على جهازك والمزامنة مع السيرفر</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">عمليات معلقة للمزامنة</p>
                      <p className="text-xl font-bold text-orange-600" data-testid="text-pending-sync">{stats?.pendingSync || 0}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">بيانات محلية محفوظة</p>
                      <p className="text-xl font-bold text-blue-600" data-testid="text-local-data">{stats?.localUserData || 0}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={handleExport} data-testid="button-export">
                      <Download className="h-3.5 w-3.5" />
                      تصدير نسخة
                    </Button>
                    <div className="relative">
                      <Button variant="outline" size="sm" className="gap-2 rounded-xl" disabled={isImporting} data-testid="button-import">
                        <Upload className="h-3.5 w-3.5" />
                        استيراد نسخة
                      </Button>
                      <Input type="file" accept=".json" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImport} disabled={isImporting} />
                    </div>
                    <Button variant="secondary" size="sm" className="gap-2 rounded-xl" onClick={() => manualSync()} disabled={!isOnline || isSyncing || stats?.pendingSync === 0} data-testid="button-sync">
                      <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      مزامنة الآن
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-2 rounded-xl text-destructive hover:bg-destructive/10" onClick={handleClear} data-testid="button-clear-data">
                      <Trash2 className="h-3.5 w-3.5" />
                      مسح البيانات
                    </Button>
                  </div>

                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 rounded-xl flex gap-3 items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-800 dark:text-yellow-200 leading-relaxed">
                      يتم تخزين بياناتك محلياً لتمكينك من العمل بدون إنترنت. عند مسح البيانات المحلية، ستفقد أي عمليات لم يتم مزامنتها مع السيرفر بعد.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-4">
              <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="h-5 w-5 text-purple-500" />
                    تخصيص المظهر
                  </CardTitle>
                  <CardDescription>تغيير ألوان وسمات التطبيق</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base flex items-center gap-2">
                        {prefs.dark_mode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                        الوضع الليلي
                      </Label>
                      <p className="text-sm text-muted-foreground">تبديل بين الوضع الفاتح والداكن</p>
                    </div>
                    <Switch
                      checked={prefs.dark_mode}
                      onCheckedChange={(v) => updatePref('dark_mode', v)}
                      data-testid="switch-dark-mode"
                    />
                  </div>
                  <Separator className="opacity-50" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">حجم الخط</Label>
                      <p className="text-sm text-muted-foreground">تعديل حجم خط النصوص في التطبيق</p>
                    </div>
                    <Select value={prefs.font_size} onValueChange={(v: string) => updatePref('font_size', v)}>
                      <SelectTrigger className="w-[140px] rounded-xl" data-testid="select-font-size">
                        <SelectValue placeholder="اختر الحجم" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">صغير</SelectItem>
                        <SelectItem value="medium">متوسط</SelectItem>
                        <SelectItem value="large">كبير</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="h-5 w-5 text-orange-500" />
                    إعدادات التنبيهات
                  </CardTitle>
                  <CardDescription>إدارة كيفية استلام الإشعارات</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">إشعارات الدفع (Push)</Label>
                      <p className="text-sm text-muted-foreground">استلام تنبيهات على المتصفح أو الجهاز</p>
                    </div>
                    <Switch
                      checked={prefs.push_notifications}
                      onCheckedChange={(v) => updatePref('push_notifications', v)}
                      data-testid="switch-push-notifications"
                    />
                  </div>
                  <Separator className="opacity-50" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">تنبيهات المصروفات</Label>
                      <p className="text-sm text-muted-foreground">الإخطار عند تسجيل مصروفات كبيرة</p>
                    </div>
                    <Switch
                      checked={prefs.expense_alerts}
                      onCheckedChange={(v) => updatePref('expense_alerts', v)}
                      data-testid="switch-expense-alerts"
                    />
                  </div>
                  <Separator className="opacity-50" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">تنبيهات الحضور</Label>
                      <p className="text-sm text-muted-foreground">الإخطار عند اكتمال كشف الحضور اليومي</p>
                    </div>
                    <Switch
                      checked={prefs.attendance_alerts}
                      onCheckedChange={(v) => updatePref('attendance_alerts', v)}
                      data-testid="switch-attendance-alerts"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Fingerprint className="h-5 w-5 text-blue-500" />
                    الدخول بالبصمة
                  </CardTitle>
                  <CardDescription>تسجيل الدخول باستخدام بصمة الإصبع أو الوجه</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {biometricStatus === 'loading' ? (
                    <div className="flex items-center gap-3 py-4 justify-center" data-testid="biometric-loading">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="text-muted-foreground">جاري التحقق...</span>
                    </div>
                  ) : biometricStatus === 'unsupported' ? (
                    <div className="flex items-center gap-3 py-3 px-4 bg-muted/50 rounded-xl" data-testid="biometric-unsupported">
                      <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                      <p className="text-sm text-muted-foreground">جهازك لا يدعم تسجيل الدخول بالبصمة</p>
                    </div>
                  ) : biometricStatus === 'enabled' ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 py-3 px-4 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 dark:border-green-900" data-testid="biometric-enabled-status">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-green-700 dark:text-green-300">البصمة مفعّلة</p>
                          <p className="text-xs text-green-600/70 dark:text-green-400/70">يمكنك تسجيل الدخول بالبصمة من شاشة الدخول</p>
                        </div>
                      </div>
                      <Button variant="destructive" className="w-full rounded-xl h-12 text-base gap-2" onClick={handleDisableBiometric} disabled={biometricLoading} data-testid="button-disable-biometric">
                        {biometricLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <XCircle className="h-5 w-5" />}
                        إلغاء تفعيل البصمة
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 py-3 px-4 bg-muted/50 rounded-xl" data-testid="biometric-disabled-status">
                        <Fingerprint className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium">البصمة غير مفعّلة</p>
                          <p className="text-xs text-muted-foreground">فعّل البصمة لتسجيل دخول أسرع وأكثر أماناً</p>
                        </div>
                      </div>
                      <Button className="w-full rounded-xl h-12 text-base gap-2 bg-blue-600 hover:bg-blue-700" onClick={handleEnableBiometric} disabled={biometricLoading} data-testid="button-enable-biometric">
                        {biometricLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Fingerprint className="h-5 w-5" />}
                        تفعيل الدخول بالبصمة
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-500" />
                    الأمان والخصوصية
                  </CardTitle>
                  <CardDescription>إعدادات حماية الحساب والبيانات</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">قفل التطبيق</Label>
                      <p className="text-sm text-muted-foreground">طلب كلمة مرور عند فتح التطبيق</p>
                    </div>
                    <Switch
                      checked={prefs.app_lock}
                      onCheckedChange={(v) => updatePref('app_lock', v)}
                      data-testid="switch-app-lock"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                className="rounded-xl px-8"
                onClick={cancelChanges}
                disabled={!hasChanges || saving}
                data-testid="button-cancel"
              >
                إلغاء
              </Button>
              <Button
                onClick={savePreferences}
                className="rounded-xl px-8 gap-2"
                disabled={!hasChanges || saving}
                data-testid="button-save"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                حفظ التغييرات
              </Button>
            </div>
          </>
        )}
      </Tabs>
    </div>
  );
}
