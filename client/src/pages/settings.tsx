import React, { useState, useEffect } from "react";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Moon, 
  Sun, 
  Shield, 
  Smartphone, 
  Palette, 
  Languages, 
  UserCircle,
  Database,
  Lock,
  Eye,
  Volume2,
  Cloud
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const { toast } = useToast();
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleDarkMode = (checked: boolean) => {
    setIsDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    toast({
      title: checked ? "تم تفعيل الوضع الليلي" : "تم تفعيل الوضع النهاري",
      duration: 2000,
    });
  };

  const handleSaveSettings = () => {
    toast({
      title: "تم حفظ الإعدادات",
      description: "تم تحديث تفضيلاتك بنجاح",
    });
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary/10 p-2 rounded-xl">
          <SettingsIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">إعدادات النظام</h1>
          <p className="text-sm text-muted-foreground">تخصيص التطبيق وتفضيلات المستخدم</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl w-full justify-start overflow-x-auto h-auto">
          <TabsTrigger value="general" className="rounded-lg gap-2">
            <SettingsIcon className="h-4 w-4" />
            عام
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
                <Select defaultValue="ar">
                  <SelectTrigger className="w-[140px] rounded-xl">
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
                <Switch defaultChecked />
              </div>
              <Separator className="opacity-50" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">تخزين محلي (Offline)</Label>
                  <p className="text-sm text-muted-foreground">السماح بحفظ البيانات محلياً عند انقطاع الإنترنت</p>
                </div>
                <Switch defaultChecked />
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
                    {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    الوضع الليلي
                  </Label>
                  <p className="text-sm text-muted-foreground">تبديل بين الوضع الفاتح والداكن</p>
                </div>
                <Switch 
                  checked={isDarkMode}
                  onCheckedChange={toggleDarkMode}
                />
              </div>
              <Separator className="opacity-50" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">حجم الخط</Label>
                  <p className="text-sm text-muted-foreground">تعديل حجم خط النصوص في التطبيق</p>
                </div>
                <Select defaultValue="medium">
                  <SelectTrigger className="w-[140px] rounded-xl">
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
                <Switch defaultChecked />
              </div>
              <Separator className="opacity-50" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">تنبيهات المصروفات</Label>
                  <p className="text-sm text-muted-foreground">الإخطار عند تسجيل مصروفات كبيرة</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator className="opacity-50" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">تنبيهات الحضور</Label>
                  <p className="text-sm text-muted-foreground">الإخطار عند اكتمال كشف الحضور اليومي</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
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
                  <Label className="text-base">التحقق بخطوتين (2FA)</Label>
                  <p className="text-sm text-muted-foreground">إضافة طبقة حماية إضافية لحسابك</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl">تفعيل</Button>
              </div>
              <Separator className="opacity-50" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">قفل التطبيق</Label>
                  <p className="text-sm text-muted-foreground">طلب كلمة مرور عند فتح التطبيق</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" className="rounded-xl px-8">إلغاء</Button>
          <Button onClick={handleSaveSettings} className="rounded-xl px-8">حفظ التغييرات</Button>
        </div>
      </Tabs>
    </div>
  );
}
