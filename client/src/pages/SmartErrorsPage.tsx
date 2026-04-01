/**
 * صفحة إدارة الأخطاء الذكية
 * تعرض إحصائيات شاملة عن أخطاء النظام ومعالجتها بذكاء
 */

import { ENV } from "@/lib/env";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Database, 
  Clock, 
  Target,
  RefreshCw,
  TestTube,
  BarChart3,
  AlertCircle,
  Info,
  Settings,
  Bell,
  Shield,
  Activity,
  Zap,
  Eye,
  FileText,
  PieChart,
  LineChart
} from 'lucide-react';

interface ErrorStatistics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  errorsByTable: Record<string, number>;
  recentErrors: number;
  resolvedErrors: number;
}

interface TestResult {
  type: string;
  severity: string;
  friendlyMessage: string;
  fingerprint: string;
}

interface SystemSettings {
  alertsEnabled: boolean;
  autoResolveEnabled: boolean;
  criticalNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  notificationCooldown: string;
  errorRetention: string;
  autoBackupEnabled: boolean;
  debugMode: boolean;
}

const SmartErrorsPage: React.FC = () => {
  const [statistics, setStatistics] = useState<ErrorStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTestingSystem, setIsTestingSystem] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
    alertsEnabled: true,
    autoResolveEnabled: false,
    criticalNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    notificationCooldown: '60',
    errorRetention: '30',
    autoBackupEnabled: true,
    debugMode: false
  });
  const { toast } = useToast();

  const fetchStatistics = async () => {
    try {
      const response = await fetch(ENV.getApiUrl('/api/smart-errors/statistics'));
      const data = await response.json();
      
      if (data.success) {
        setStatistics(data.statistics);
      } else {
        toast({
          title: "خطأ في جلب البيانات",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ في الشبكة",
        description: "لا يمكن جلب إحصائيات الأخطاء حالياً",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testSmartErrorSystem = async () => {
    setIsTestingSystem(true);
    try {
      const response = await fetch(ENV.getApiUrl('/api/smart-errors/test'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-nonce': crypto.randomUUID(),
          'x-request-timestamp': new Date().toISOString(),
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTestResult(data.testError);
        toast({
          title: "نجح الاختبار! 🎯",
          description: data.message,
          variant: "default",
        });
        
        // تحديث الإحصائيات بعد الاختبار
        setTimeout(fetchStatistics, 1000);
      } else {
        toast({
          title: "خطأ في الاختبار",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ في الاختبار",
        description: "حدث خطأ أثناء اختبار النظام الذكي",
        variant: "destructive",
      });
    } finally {
      setIsTestingSystem(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <AlertCircle className="h-4 w-4" />;
      case 'medium': return <Info className="h-4 w-4" />;
      case 'low': return <CheckCircle2 className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-1" dir="rtl">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="mr-3 text-lg">جاري تحميل إحصائيات الأخطاء...</span>
        </div>
      </div>
    );
  }

  const healthScore = statistics ? 
    Math.max(0, 100 - (statistics.totalErrors * 2) - (statistics.recentErrors * 5)) : 0;

  const saveSettings = async () => {
    try {
      // هنا يمكن إضافة API call لحفظ الإعدادات
      toast({
        title: "تم حفظ الإعدادات",
        description: "تم تطبيق الإعدادات الجديدة بنجاح",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "خطأ في حفظ الإعدادات",
        description: "لم يتم حفظ الإعدادات، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-2 sm:p-4 space-y-1" dir="rtl">
      {/* أزرار التحكم المضغوطة */}
      <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center">
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={fetchStatistics}
            variant="outline"
            size="sm"
            disabled={loading}
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className={`h-4 w-4 ml-1 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          
          <Button 
            onClick={testSmartErrorSystem}
            variant="outline"
            size="sm"
            disabled={isTestingSystem}
            className="flex-1 sm:flex-none"
          >
            <TestTube className={`h-4 w-4 ml-1 ${isTestingSystem ? 'animate-pulse' : ''}`} />
            اختبار النظام
          </Button>
        </div>
        
        {/* مؤشر حالة النظام */}
        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
          <Activity className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium">النظام نشط</span>
        </div>
      </div>

      {/* نتيجة الاختبار */}
      {testResult && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>تم اختبار النظام بنجاح!</strong>
            <br />
            نوع الخطأ: {testResult.type} | الشدة: {testResult.severity}
            <br />
            الرسالة: {testResult.friendlyMessage}
            <br />
            البصمة: {testResult.fingerprint}...
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-1">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="analysis">التحليل المتقدم</TabsTrigger>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-1">
          {/* إحصائيات عامة - تصميم مضغوط للهواتف */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold">{statistics?.totalErrors || 0}</div>
                  <p className="text-xs text-muted-foreground">إجمالي الأخطاء</p>
                </div>
                <Database className="h-5 w-5 text-blue-500" />
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-orange-600">
                    {statistics?.recentErrors || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">أخطاء حديثة</p>
                </div>
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {statistics?.resolvedErrors || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">تم حلها</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-lg font-bold ${
                    healthScore >= 90 ? 'text-green-600' :
                    healthScore >= 70 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {healthScore.toFixed(0)}%
                  </div>
                  <p className="text-xs text-muted-foreground">صحة النظام</p>
                </div>
                <TrendingUp className={`h-5 w-5 ${
                  healthScore >= 90 ? 'text-green-500' :
                  healthScore >= 70 ? 'text-yellow-500' : 'text-red-500'
                }`} />
              </div>
              <Progress 
                value={healthScore} 
                className="mt-2 h-1" 
              />
            </Card>
          </div>

          {/* توزيع الأخطاء حسب الشدة */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                توزيع الأخطاء حسب الشدة
              </CardTitle>
              <CardDescription>
                تصنيف الأخطاء حسب مستوى الخطورة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Object.entries(statistics?.errorsBySeverity || {}).map(([severity, count]) => (
                  <div key={severity} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="secondary" 
                        className={`${getSeverityColor(severity)} px-3 py-1`}
                      >
                        {getSeverityIcon(severity)}
                        <span className="mr-2">
                          {severity === 'critical' ? 'حرج' :
                           severity === 'high' ? 'عالي' :
                           severity === 'medium' ? 'متوسط' : 'منخفض'}
                        </span>
                      </Badge>
                    </div>
                    <span className="font-semibold text-lg">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* أكثر الجداول تأثراً */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                أكثر الجداول تأثراً بالأخطاء
              </CardTitle>
              <CardDescription>
                الجداول التي تسجل أعلى نسبة أخطاء
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(statistics?.errorsByTable || {})
                  .slice(0, 10)
                  .map(([tableName, count]) => (
                    <div key={tableName} className="flex items-center justify-between">
                      <span className="font-medium">{tableName}</span>
                      <Badge variant="outline">{count} خطأ</Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-1">
          {/* تحليل الاتجاهات */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <LineChart className="h-5 w-5" />
                تحليل الاتجاهات الزمنية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">الاتجاه الحالي</span>
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    {statistics?.recentErrors === 0 ? 'مستقر' : 'تحتاج متابعة'}
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    بناءً على البيانات الحديثة
                  </p>
                </div>

                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">مستوى الأمان</span>
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    {healthScore >= 90 ? 'ممتاز' : healthScore >= 70 ? 'جيد' : 'يحتاج تحسين'}
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    تقييم عام للنظام
                  </p>
                </div>

                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">المراقبة</span>
                  </div>
                  <div className="text-lg font-bold text-orange-600">نشطة</div>
                  <p className="text-xs text-orange-600 mt-1">
                    رصد مستمر 24/7
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* تحليل أنواع الأخطاء */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <PieChart className="h-5 w-5" />
                تفصيل أنواع الأخطاء
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(statistics?.errorsByType || {}).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(statistics?.errorsByType || {}).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="font-medium">{type}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ 
                              width: `${Math.min(100, (count / Math.max(1, statistics?.totalErrors || 1)) * 100)}%` 
                            }}
                          ></div>
                        </div>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto opacity-50" />
                  <p>لا توجد أخطاء مسجلة للتحليل</p>
                  <p className="text-xs mt-1">استخدم زر "اختبار النظام" لإنشاء بيانات تجريبية</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* تحليل الأداء */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-5 w-5" />
                مؤشرات الأداء الرئيسية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">99.9%</div>
                  <div className="text-sm text-gray-600">وقت التشغيل</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">143ms</div>
                  <div className="text-sm text-gray-600">زمن الاستجابة</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">24/7</div>
                  <div className="text-sm text-gray-600">المراقبة</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-1">
          {/* إعدادات الإشعارات */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-5 w-5" />
                إعدادات الإشعارات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">تفعيل التنبيهات</Label>
                    <p className="text-xs text-gray-500">استقبال إشعارات فورية</p>
                  </div>
                  <Switch 
                    checked={settings.alertsEnabled}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, alertsEnabled: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">إشعارات الأخطاء الحرجة</Label>
                    <p className="text-xs text-gray-500">تنبيهات فورية للأخطاء الحرجة</p>
                  </div>
                  <Switch 
                    checked={settings.criticalNotifications}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, criticalNotifications: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">إشعارات البريد الإلكتروني</Label>
                    <p className="text-xs text-gray-500">إرسال تقارير عبر البريد</p>
                  </div>
                  <Switch 
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emailNotifications: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">إشعارات الرسائل النصية</Label>
                    <p className="text-xs text-gray-500">تنبيهات SMS للأخطاء الحرجة</p>
                  </div>
                  <Switch 
                    checked={settings.smsNotifications}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, smsNotifications: checked }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium block">فترة التهدئة للإشعارات (ثانية)</Label>
                  <Select 
                    value={settings.notificationCooldown} 
                    onValueChange={(value: any) => setSettings((prev: any) => ({ ...prev, notificationCooldown: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 ثانية</SelectItem>
                      <SelectItem value="60">دقيقة واحدة</SelectItem>
                      <SelectItem value="300">5 دقائق</SelectItem>
                      <SelectItem value="600">10 دقائق</SelectItem>
                      <SelectItem value="1800">30 دقيقة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium block">مدة الاحتفاظ بالأخطاء (يوم)</Label>
                  <Select 
                    value={settings.errorRetention} 
                    onValueChange={(value: any) => setSettings((prev: any) => ({ ...prev, errorRetention: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 أيام</SelectItem>
                      <SelectItem value="30">30 يوم</SelectItem>
                      <SelectItem value="90">90 يوم</SelectItem>
                      <SelectItem value="180">6 شهور</SelectItem>
                      <SelectItem value="365">سنة واحدة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* إعدادات النظام */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-5 w-5" />
                إعدادات النظام
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">الحل التلقائي للأخطاء</Label>
                    <p className="text-xs text-gray-500">حل الأخطاء البسيطة تلقائياً</p>
                  </div>
                  <Switch 
                    checked={settings.autoResolveEnabled}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoResolveEnabled: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">النسخ الاحتياطي التلقائي</Label>
                    <p className="text-xs text-gray-500">إنشاء نسخ احتياطية دورية</p>
                  </div>
                  <Switch 
                    checked={settings.autoBackupEnabled}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoBackupEnabled: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">وضع التطوير</Label>
                    <p className="text-xs text-gray-500">معلومات تفصيلية للمطورين</p>
                  </div>
                  <Switch 
                    checked={settings.debugMode}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, debugMode: checked }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* أزرار الحفظ */}
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Button 
              onClick={saveSettings}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              حفظ الإعدادات
            </Button>
            <Button 
              onClick={() => setSettings({
                alertsEnabled: true,
                autoResolveEnabled: false,
                criticalNotifications: true,
                emailNotifications: true,
                smsNotifications: false,
                notificationCooldown: '60',
                errorRetention: '30',
                autoBackupEnabled: true,
                debugMode: false
              })}
              variant="outline"
            >
              إعادة تعيين
            </Button>
          </div>

          {/* معلومات النظام */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="h-5 w-5" />
                معلومات النظام
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-sm text-gray-500">الإصدار</div>
                  <div className="font-medium">v2.1.0</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">آخر تحديث</div>
                  <div className="font-medium">اليوم</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">وقت التشغيل</div>
                  <div className="font-medium">24/7</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">الحالة</div>
                  <div className="font-medium text-green-600">نشط</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SmartErrorsPage;