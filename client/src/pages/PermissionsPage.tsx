import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Database, Bell } from "lucide-react";
import { useLocation } from "wouter";

export default function PermissionsPage() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);

  const requestPermissions = async () => {
    setLoading(true);
    // محاكاة طلب الصلاحيات
    setTimeout(() => {
      localStorage.setItem("permissions_granted", "true");
      setLoading(false);
      setLocation("/setup");
    }, 2000);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">طلب الصلاحيات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">يحتاج التطبيق إلى الصلاحيات التالية للعمل بشكل صحيح</p>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Database className="w-6 h-6 text-primary" />
              <div>
                <p className="font-medium">الوصول للذاكرة</p>
                <p className="text-sm text-muted-foreground">لإنشاء قاعدة البيانات المحلية</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Bell className="w-6 h-6 text-primary" />
              <div>
                <p className="font-medium">الإشعارات</p>
                <p className="text-sm text-muted-foreground">للتنبيهات والمهام</p>
              </div>
            </div>
          </div>
          <Button 
            className="w-full h-12 text-lg" 
            onClick={requestPermissions}
            disabled={loading}
          >
            {loading ? "جاري منح الصلاحيات..." : "منح جميع الصلاحيات"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
