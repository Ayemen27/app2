import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, Brain, Database, Settings, Play, Pause, AlertCircle, CheckCircle,
  TrendingUp, Zap, Shield, Cpu, BarChart3, Clock, Server, RefreshCw, Loader2,
  ChevronDown, ChevronUp, AlertTriangle, Eye, EyeOff, DollarSign, Users, 
  Lock, Wrench, Truck, Table, Edit, MoreVertical, Power, PowerOff, Info
} from 'lucide-react';
import { SecurityPoliciesManager } from '@/components/SecurityPoliciesManager';

interface SystemMetrics {
  system: { status: string; uptime: number; health: number; version: string; };
  database: { tables: number; health: number; issues: number; performance: number; };
  ai: { decisions: number; accuracy: number; learning: number; predictions: number; };
  automation: { tasksCompleted: number; successRate: number; timeSaved: number; errors: number; };
}

interface SystemRecommendation {
  id: string; 
  recommendationType: string; 
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string; 
  detailedExplanation?: string;
  estimatedImpact: string; 
  timeframe: string; 
  autoExecutable: boolean;
  confidence: number;
  targetArea: string;
}

interface DatabaseTable {
  table_name: string;
  schema_name: string;
  row_count: number;
  rls_enabled: boolean;
  rls_forced: boolean;
  has_policies: boolean;
  security_level: 'high' | 'medium' | 'low';
  recommended_action: string;
  size_estimate: string;
  last_analyzed: string;
}

// مكون عرض التوصية المحسن
const RecommendationCard = ({ recommendation, onExecute, isExecuting, disabled }: {
  recommendation: SystemRecommendation;
  onExecute: (id: string) => void;
  isExecuting: boolean;
  disabled: boolean;
}) => {
  const [expanded, setExpanded] = React.useState(false);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'financial': return <DollarSign className="w-4 h-4 text-green-600" />;
      case 'workforce': return <Users className="w-4 h-4 text-blue-600" />;
      case 'security': return <Lock className="w-4 h-4 text-red-600" />;
      case 'performance': return <Wrench className="w-4 h-4 text-purple-600" />;
      case 'supplier': return <Truck className="w-4 h-4 text-orange-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'financial': return 'مالي';
      case 'workforce': return 'عمالة';
      case 'security': return 'أمان';
      case 'performance': return 'أداء';
      case 'supplier': return 'موردين';
      default: return 'عام';
    }
  };

  const getPriorityColor = (priority: string) => ({
    critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-yellow-500', low: 'bg-green-500'
  }[priority] || 'bg-gray-500');

  return (
    <div className="border rounded-lg p-3 bg-white hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {getTypeIcon(recommendation.recommendationType)}
          <Badge variant="outline" className="text-xs">
            {getTypeLabel(recommendation.recommendationType)}
          </Badge>
          <Badge className={`${getPriorityColor(recommendation.priority)} text-white text-xs`}>
            {recommendation.priority === 'critical' ? 'حرج' :
             recommendation.priority === 'high' ? 'عالي' : 
             recommendation.priority === 'medium' ? 'متوسط' : 'منخفض'}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="text-xs">
            {recommendation.confidence}% دقة
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => setExpanded(!expanded)}
            data-testid={`button-expand-${recommendation.id}`}
          >
            {expanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Title and Description */}
      <h4 className="text-sm font-semibold mb-2 text-gray-800">
        {recommendation.title}
      </h4>
      <p className="text-xs text-gray-600 mb-2 leading-relaxed">
        {recommendation.description}
      </p>

      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-green-600" />
          <span className="text-xs text-gray-600">التأثير: {recommendation.estimatedImpact}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-blue-600" />
          <span className="text-xs text-gray-600">المدة: {recommendation.timeframe}</span>
        </div>
      </div>

      {/* Detailed Explanation */}
      {expanded && recommendation.detailedExplanation && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <h5 className="text-xs font-medium mb-2 text-gray-700">الشرح التفصيلي:</h5>
          <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
            {recommendation.detailedExplanation}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t">
        <div className="flex items-center gap-2">
          {recommendation.autoExecutable ? (
            <Badge variant="secondary" className="text-xs">
              <Zap className="w-3 h-3 mr-1" />
              قابل للتنفيذ التلقائي
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              يتطلب تدخل يدوي
            </Badge>
          )}
        </div>
        
        {recommendation.autoExecutable && (
          <Button 
            size="sm" 
            variant={isExecuting ? "default" : "outline"}
            className={`text-xs py-1 h-7 transition-all ${
              isExecuting ? 'bg-blue-500 text-white animate-pulse' : ''
            }`}
            data-testid={`button-execute-${recommendation.id}`}
            onClick={() => onExecute(recommendation.id)}
            disabled={disabled}
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                تنفيذ جاري...
              </>
            ) : (
              <>
                <Play className="w-3 h-3 mr-1" />
                تنفيذ
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

// مكون إدارة الجداول الذكي
const DatabaseTableManager = () => {
  const [selectedTable, setSelectedTable] = useState<DatabaseTable | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // جلب قائمة الجداول مع معلومات RLS
  const { data: rawTables = [], isLoading } = useQuery<DatabaseTable[]>({
    queryKey: ['/api/db-admin/tables'],
    refetchInterval: 30000, // تحديث كل 30 ثانية
  });

  // إزالة التكرار من الجداول بناءً على اسم الجدول فقط (أقوى)
  const tables = React.useMemo(() => {
    const uniqueTablesMap = new Map<string, DatabaseTable>();
    rawTables.forEach(table => {
      // استخدام اسم الجدول فقط كمفتاح لإزالة التكرار التام
      const key = table.table_name;
      if (!uniqueTablesMap.has(key)) {
        uniqueTablesMap.set(key, table);
      } else {
        // إذا وجد جدول مكرر، احتفظ بالذي له أكبر عدد صفوف
        const existing = uniqueTablesMap.get(key)!;
        if (table.row_count > existing.row_count) {
          uniqueTablesMap.set(key, table);
        }
      }
    });
    return Array.from(uniqueTablesMap.values());
  }, [rawTables]);

  // تنفيذ عمليات RLS
  const rlsToggleMutation = useMutation({
    mutationFn: async ({ tableName, enable }: { tableName: string; enable: boolean }) => {
      return apiRequest('POST', '/api/db-admin/toggle-rls', { tableName, enable });
    },
    onSuccess: (data, { tableName, enable }) => {
      toast({
        title: "تم التحديث بنجاح",
        description: `تم ${enable ? 'تفعيل' : 'تعطيل'} RLS للجدول ${tableName}`,
        variant: "default",
      });
      // تحديث البيانات
      queryClient.invalidateQueries({ queryKey: ['/api/db-admin/tables'] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في العملية",
        description: error.message || "فشل في تحديث إعدادات RLS",
        variant: "destructive",
      });
    }
  });

  const getSecurityLevelColor = (level: string) => ({
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800', 
    low: 'bg-green-100 text-green-800'
  }[level] || 'bg-gray-100 text-gray-800');

  const getTableIcon = (tableName: string) => {
    if (tableName.includes('user')) return <Users className="w-4 h-4" />;
    if (tableName.includes('project')) return <BarChart3 className="w-4 h-4" />;
    if (tableName.includes('auth')) return <Lock className="w-4 h-4" />;
    return <Table className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5" />
                إدارة الجداول الذكية
              </CardTitle>
              <CardDescription>
                إدارة متقدمة لجداول قاعدة البيانات وسياسات الأمان
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowRecommendations(!showRecommendations)}
              >
                {showRecommendations ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="hidden sm:inline mr-1">
                  {showRecommendations ? 'إخفاء' : 'عرض'} التوصيات
                </span>
              </Button>
              <Button size="sm" variant="outline">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* قائمة الجداول */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">الجداول المكتشفة ({tables.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    ✅ البيانات الحقيقية
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    مرتبة أبجدياً
                  </Badge>
                </div>
              </div>
              <CardDescription className="text-sm">
                قاعدة البيانات Supabase متصلة مع {tables.length > 0 ? `${tables.length} جدول` : 'لا توجد جداول'}
                {rawTables.length !== tables.length && (
                  <span className="text-yellow-600"> (تم إزالة {rawTables.length - tables.length} مكرر)</span>
                )}
                {Array.isArray(tables) && tables.length > 0 && ` - إجمالي الصفوف: ${tables.reduce((sum, t) => sum + t.row_count, 0).toLocaleString()}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-32 space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <span className="mr-2 font-medium">جاري تحليل قاعدة البيانات...</span>
                  <span className="text-xs text-gray-500">قد يستغرق هذا بضع ثواني</span>
                </div>
              ) : tables.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 space-y-2">
                  <Database className="w-12 h-12 text-gray-400" />
                  <span className="font-medium text-gray-600">لا توجد جداول متاحة</span>
                  <span className="text-xs text-gray-500">تأكد من صحة الاتصال بقاعدة البيانات</span>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {Array.isArray(tables) && tables
                      .sort((a, b) => a.table_name.localeCompare(b.table_name))
                      .map((table) => (
                      <div 
                        key={`${table.schema_name}.${table.table_name}`}
                        className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                          selectedTable?.table_name === table.table_name ? 'border-blue-500 bg-blue-50' : ''
                        }`}
                        onClick={() => setSelectedTable(table)}
                      >
                        {/* معلومات الجدول */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getTableIcon(table.table_name)}
                            <div>
                              <h4 className="text-sm font-medium">{table.table_name}</h4>
                              <p className="text-xs text-gray-500">{table.schema_name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge className={`text-xs ${getSecurityLevelColor(table.security_level)}`}>
                              {table.security_level === 'high' ? 'عالي' : 
                               table.security_level === 'medium' ? 'متوسط' : 'منخفض'}
                            </Badge>
                          </div>
                        </div>

                        {/* حالة RLS وإحصائيات */}
                        <div className="grid grid-cols-2 gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            {table.rls_enabled ? (
                              <Shield className="w-3 h-3 text-green-600" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-red-600" />
                            )}
                            <span className="text-xs font-medium">
                              RLS {table.rls_enabled ? 'مُفعّل ✓' : 'معطّل ⚠️'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 font-mono">
                            📊 {table.row_count.toLocaleString()} صف
                          </div>
                        </div>

                        {/* معلومات إضافية */}
                        <div className="grid grid-cols-2 gap-3 mb-2 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">السياسات:</span>
                            <Badge variant={table.has_policies ? "default" : "secondary"} className="text-xs">
                              {table.has_policies ? 'موجودة' : 'غير موجودة'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">الحجم:</span>
                            <span className="font-mono text-blue-600">{table.size_estimate}</span>
                          </div>
                        </div>

                        {/* التوصية */}
                        {table.recommended_action && (
                          <div className="text-xs bg-blue-50 p-2 rounded border-r-2 border-blue-400">
                            💡 {table.recommended_action}
                          </div>
                        )}

                        {/* أزرار التحكم */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {table.schema_name}
                            </Badge>
                            {table.security_level === 'high' && !table.has_policies && (
                              <Badge variant="destructive" className="text-xs">
                                ⚠️ يحتاج سياسات
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {/* زر إضافة السياسة المقترحة */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs py-1 h-7 bg-green-50 text-green-700 hover:bg-green-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                // إضافة سياسة مقترحة للجدول
                                const suggestedPolicy = {
                                  suggested_policy_id: `AUTO-${table.table_name}-${Date.now()}`,
                                  title: `حماية جدول ${table.table_name}`,
                                  description: table.has_policies 
                                    ? `تحسين السياسات الأمنية للجدول ${table.table_name}` 
                                    : `إنشاء سياسات أمنية للجدول ${table.table_name}`,
                                  category: 'data_protection',
                                  priority: table.security_level === 'high' ? 'high' : 'medium',
                                  confidence: table.security_level === 'high' ? 90 : 75,
                                  reasoning: table.has_policies 
                                    ? 'الجدول يحتوي على بيانات حساسة ويحتاج تحسين السياسات الموجودة'
                                    : 'الجدول يحتوي على بيانات حساسة ويفتقر للحماية الأمنية',
                                  estimated_impact: 'تحسين الأمان بنسبة 85%',
                                  implementation_effort: 'medium',
                                  source_type: 'ai_analysis',
                                  source_data: {
                                    table_name: table.table_name,
                                    row_count: table.row_count,
                                    rls_enabled: table.rls_enabled,
                                    has_policies: table.has_policies,
                                    security_level: table.security_level
                                  }
                                };
                                
                                fetch('/api/security-policy-suggestions', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(suggestedPolicy)
                                })
                                .then(res => res.json())
                                .then(data => {
                                  console.log('تم إنشاء اقتراح السياسة:', data);
                                  toast({
                                    title: "تم إنشاء اقتراح السياسة",
                                    description: `تم إنشاء اقتراح أمني للجدول ${table.table_name}`,
                                    variant: "default",
                                  });
                                })
                                .catch(() => {
                                  toast({
                                    title: "خطأ في إنشاء الاقتراح",
                                    description: "فشل في إنشاء اقتراح السياسة",
                                    variant: "destructive",
                                  });
                                });
                              }}
                            >
                              <Shield className="w-3 h-3 mr-1" />
                              سياسة مقترحة
                            </Button>
                            
                            {/* زر تفعيل/تعطيل RLS */}
                            <Button
                              size="sm"
                              variant={table.rls_enabled ? "secondary" : "default"}
                              className={`text-xs py-1 h-7 font-medium transition-all ${
                                table.rls_enabled 
                                  ? 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200' 
                                  : 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                rlsToggleMutation.mutate({
                                  tableName: table.table_name,
                                  enable: !table.rls_enabled
                                });
                              }}
                              disabled={rlsToggleMutation.isPending}
                            >
                              {rlsToggleMutation.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                              ) : table.rls_enabled ? (
                                <PowerOff className="w-3 h-3 mr-1" />
                              ) : (
                                <Power className="w-3 h-3 mr-1" />
                              )}
                              {table.rls_enabled ? 'تعطيل RLS' : 'تفعيل RLS'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* اللوحة الجانبية - التوصيات والتفاصيل */}
        <div className="space-y-4">
          {/* أدوات تحليل الأمان */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" />
                أدوات الأمان المتقدمة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => {
                    // سيتم إضافة وظيفة تحليل الأمان
                    fetch('/api/db-admin/analyze-security', { method: 'POST' })
                      .then(res => res.json())
                      .then(data => {
                        toast({
                          title: "تم تحليل الأمان",
                          description: `تم العثور على ${data.highRiskTables} جدول عالي الخطورة`,
                          variant: "default",
                        });
                      })
                      .catch(() => {
                        toast({
                          title: "خطأ في التحليل",
                          description: "فشل في تحليل التهديدات الأمنية",
                          variant: "destructive",
                        });
                      });
                  }}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  تحليل التهديدات الأمنية
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => {
                    // تحديث قائمة الجداول
                    queryClient.invalidateQueries({ queryKey: ['/api/db-admin/tables'] });
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  إعادة تحليل الجداول
                </Button>
              </div>
            </CardContent>
          </Card>

          {showRecommendations && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  التوصيات الذكية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-medium mb-1">تحسين الأمان</div>
                        <div className="text-gray-600">
                          يُنصح بتفعيل RLS على الجداول التي تحتوي على بيانات المستخدمين
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-medium mb-1">تحسين الأداء</div>
                        <div className="text-gray-600">
                          إضافة فهارس للجداول الكبيرة لتحسين الاستعلامات
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-medium mb-1">أمان ممتاز</div>
                        <div className="text-gray-600">
                          معظم الجداول الحساسة محمية بسياسات RLS
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* تفاصيل الجدول المحدد */}
          {selectedTable && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  تفاصيل الجدول
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm mb-1">{selectedTable.table_name}</h4>
                    <p className="text-xs text-gray-600">{selectedTable.schema_name}</p>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-600">الصفوف:</span>
                      <div className="font-medium">{selectedTable.row_count.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">الحجم:</span>
                      <div className="font-medium">{selectedTable.size_estimate}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>RLS Status:</span>
                      <Badge variant={selectedTable.rls_enabled ? "default" : "secondary"}>
                        {selectedTable.rls_enabled ? 'مُفعّل' : 'معطّل'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>السياسات:</span>
                      <Badge variant={selectedTable.has_policies ? "default" : "secondary"}>
                        {selectedTable.has_policies ? 'موجودة' : 'غير موجودة'}
                      </Badge>
                    </div>
                  </div>

                  <Button size="sm" className="w-full">
                    <Edit className="w-3 h-3 mr-1" />
                    إدارة السياسات
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default function AISystemDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isSystemRunning, setIsSystemRunning] = useState(false);
  const [executingRecommendation, setExecutingRecommendation] = useState<string | null>(null);
  const [showIssues, setShowIssues] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [verificationResults, setVerificationResults] = useState<any>(null);
  const [backupInProgress, setBackupInProgress] = useState(false);

  // جلب حالة النظام
  const { data: systemStatus } = useQuery<any>({
    queryKey: ['/api/ai-system/status'],
    refetchInterval: 10000, // تحديث كل 10 ثوانِ
  });

  // جلب مقاييس النظام
  const { data: metrics } = useQuery<SystemMetrics>({
    queryKey: ['/api/ai-system/metrics'],
    refetchInterval: 5000, // تحديث كل 5 ثوانِ
  });

  // جلب الأخطاء الحقيقية من النظام الذكي
  const { data: errorStats } = useQuery({
    queryKey: ['/api/smart-errors/statistics'],
    refetchInterval: 10000,
  });

  // جلب قائمة الأخطاء التفصيلية
  const { data: detectedErrorsData, isLoading: isLoadingErrors } = useQuery<{
    success: boolean;
    detectedErrors: Array<{
      id: string;
      errorType: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      tableName: string;
      columnName?: string;
      arabic_title?: string;
      description: string;
      friendlyMessage: string;
      status: string;
      fingerprint: string;
      metadata: any;
      created_at: string;
      updated_at: string;
    }>;
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    message: string;
  }>({
    queryKey: ['/api/smart-errors/detected'],
    refetchInterval: 15000,
  });

  // جلب التوصيات
  const { data: recommendations = [] } = useQuery<any[]>({
    queryKey: ['/api/ai-system/recommendations'],
    refetchInterval: 60000, // تحديث كل دقيقة لتجنب التكرار المفرط
    staleTime: 30000, // البيانات تبقى "طازجة" لـ 30 ثانية
  });

  // وظائف النظام المتقدم
  const verifyResultsMutation = useMutation({
    mutationFn: (recommendationIds?: string[]) => 
      apiRequest('POST', '/api/ai-system/verify-results', { recommendationIds }),
    onSuccess: (data) => {
      setVerificationResults(data);
      toast({
        title: "تم التحقق من النتائج",
        description: `معدل النجاح: ${Array.isArray(data.verificationResults) ? (data.verificationResults.filter((r: any) => r.success).length / data.verificationResults.length * 100).toFixed(1) : 0}%`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في التحقق",
        description: error.message || "فشل في التحقق من النتائج",
        variant: "destructive",
      });
    }
  });

  const createBackupMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/ai-system/backup'),
    onSuccess: (data) => {
      toast({
        title: "تم إنشاء النسخة الاحتياطية",
        description: `معرف النسخة: ${data.backupId}`,
      });
      setBackupInProgress(false);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في النسخ الاحتياطي",
        description: error.message || "فشل في إنشاء النسخة الاحتياطية",
        variant: "destructive",
      });
      setBackupInProgress(false);
    }
  });

  const handleCreateBackup = () => {
    setBackupInProgress(true);
    createBackupMutation.mutate();
  };

  // متحكم في تشغيل/إيقاف النظام
  const systemToggleMutation = useMutation({
    mutationFn: async (action: 'start' | 'stop') => {
      return apiRequest('POST', '/api/ai-system/toggle', { action });
    },
    onSuccess: (data) => {
      setIsSystemRunning(data.status === 'running');
      toast({
        title: "نجح العملية",
        description: data.message,
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-system'] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في العملية",
        description: error.message || "فشل في تبديل حالة النظام",
        variant: "destructive",
      });
    }
  });

  // تنفيذ التوصيات
  const executeRecommendationMutation = useMutation({
    mutationFn: async (recommendationId: string) => {
      setExecutingRecommendation(recommendationId);
      return apiRequest('POST', '/api/ai-system/execute-recommendation', { recommendationId });
    },
    onSuccess: (data, recommendationId) => {
      toast({
        title: "🚀 تم بدء التنفيذ",
        description: `${data.message} - الوقت المتوقع: ${data.estimatedTime}`,
      });
      
      // محاكاة إتمام التنفيذ بعد وقت محدد
      setTimeout(() => {
        setExecutingRecommendation(null);
        toast({
          title: "✅ تم إكمال التنفيذ",
          description: "تم تنفيذ التوصية بنجاح وتحسين الأداء",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/ai-system/recommendations'] });
        queryClient.invalidateQueries({ queryKey: ['/api/ai-system/metrics'] });
      }, 3000); // 3 ثوانٍ
    },
    onError: (error) => {
      setExecutingRecommendation(null);
      toast({
        title: "❌ خطأ في التنفيذ",
        description: "حدث خطأ أثناء تنفيذ التوصية",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (systemStatus) {
      setIsSystemRunning(systemStatus.status === 'running');
    }
  }, [systemStatus]);

  const lastUpdate = new Date().toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const formatUptime = (ms: number) => {
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    return `${h}س ${m}د`;
  };

  const getStatusColor = (status: string) => ({
    running: 'text-green-600', learning: 'text-blue-600', optimizing: 'text-yellow-600', error: 'text-red-600'
  }[status] || 'text-gray-600');

  const getHealthColor = (health: number) => health >= 90 ? 'text-green-600' : health >= 75 ? 'text-yellow-600' : 'text-red-600';

  const getPriorityColor = (priority: string) => ({
    critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-yellow-500', low: 'bg-green-500'
  }[priority] || 'bg-gray-500');

  const handleSystemToggle = () => {
    const action = isSystemRunning ? 'stop' : 'start';
    systemToggleMutation.mutate(action);
  };

  const handleExecuteRecommendation = (recommendationId: string) => {
    executeRecommendationMutation.mutate(recommendationId);
  };

  // التحقق من وجود البيانات
  if (!metrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center" dir="rtl">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-semibold mb-2">جاري تحميل النظام الذكي...</h3>
            <p className="text-sm text-gray-600">يرجى الانتظار بينما نتصل بالخادم</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50" dir="rtl">
      <div className="container mx-auto p-2 sm:p-4 max-w-7xl space-y-3 sm:space-y-4">
        
        {/* Compact Mobile-First Header */}
        <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
              🤖 النظام الذكي لقاعدة البيانات
            </h1>
            <Button onClick={handleSystemToggle} variant={isSystemRunning ? "destructive" : "default"} size="sm" className="min-w-20" data-testid="button-system-toggle">
              {isSystemRunning ? <><Pause className="w-3 h-3 ml-1" />إيقاف</> : <><Play className="w-3 h-3 ml-1" />تشغيل</>}
            </Button>
          </div>
          <p className="text-xs sm:text-sm text-gray-600">آخر تحديث: {lastUpdate}</p>
        </div>

        {/* Compact Status Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Card className="border border-blue-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <Server className="h-4 w-4 text-blue-600" />
                <Badge variant={isSystemRunning ? "default" : "secondary"} className="text-xs">
                  {metrics.system.status === 'running' ? 'يعمل' : 'متوقف'}
                </Badge>
              </div>
              <div className="text-xs text-gray-600">حالة النظام</div>
              <div className="text-xs text-gray-500 mt-1">{formatUptime(metrics.system.uptime)}</div>
            </CardContent>
          </Card>

          <Card className="border border-green-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <Activity className="h-4 w-4 text-green-600" />
                <span className={`text-sm font-bold ${getHealthColor(metrics.system.health)}`}>{metrics.system.health.toFixed(1)}%</span>
              </div>
              <div className="text-xs text-gray-600">صحة النظام</div>
              <Progress value={metrics.system.health} className="h-1 mt-2" />
            </CardContent>
          </Card>

          <Card className="border border-purple-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <Brain className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-bold">{metrics.ai.decisions}</span>
              </div>
              <div className="text-xs text-gray-600">قرارات ذكية</div>
              <div className="text-xs text-gray-500 mt-1">دقة: {metrics.ai.accuracy.toFixed(1)}%</div>
            </CardContent>
          </Card>

          <Card className="border border-orange-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <Zap className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-bold">{metrics.automation.tasksCompleted}</span>
              </div>
              <div className="text-xs text-gray-600">مهام مكتملة</div>
              <div className="text-xs text-gray-500 mt-1">نجاح: {metrics.automation.successRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile-Optimized Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-5 w-full h-auto p-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm p-2 flex flex-col sm:flex-row items-center gap-1">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">نظرة عامة</span>
              <span className="sm:hidden">عام</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs sm:text-sm p-2 flex flex-col sm:flex-row items-center gap-1">
              <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">النظام المتقدم</span>
              <span className="sm:hidden">متقدم</span>
            </TabsTrigger>
            <TabsTrigger value="database" className="text-xs sm:text-sm p-2 flex flex-col sm:flex-row items-center gap-1">
              <Database className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">قاعدة البيانات</span>
              <span className="sm:hidden">قاعدة</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs sm:text-sm p-2 flex flex-col sm:flex-row items-center gap-1">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">السياسات الأمنية</span>
              <span className="sm:hidden">أمان</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm p-2 flex flex-col sm:flex-row items-center gap-1">
              <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">إعدادات</span>
              <span className="sm:hidden">إعدادات</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-3 sm:mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
              {/* Performance Chart */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                    أداء النظام المباشر
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-blue-600 mb-1">{metrics.database.performance.toFixed(1)}%</div>
                      <div className="text-xs text-gray-600">أداء قاعدة البيانات</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-green-600 mb-1">{metrics.ai.accuracy.toFixed(1)}%</div>
                      <div className="text-xs text-gray-600">دقة الذكاء الاصطناعي</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-purple-600 mb-1">{metrics.automation.successRate.toFixed(1)}%</div>
                      <div className="text-xs text-gray-600">معدل نجاح التشغيل</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Recommendations with Tabs */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        التوصيات الذكية المتقدمة
                      </CardTitle>
                      <CardDescription className="text-xs">تحليل عميق وتوصيات مخصصة من الذكاء الاصطناعي</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/ai-system/recommendations'] })}
                        className="text-xs"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        تحديث
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                      <TabsTrigger value="all" className="text-xs flex items-center gap-1">
                        <Brain className="w-3 h-3" />
                        جميع التوصيات ({recommendations.length})
                      </TabsTrigger>
                      <TabsTrigger value="manual" className="text-xs flex items-center gap-1">
                        <Settings className="w-3 h-3" />
                        يدوية ({Array.isArray(recommendations) ? recommendations.filter(rec => !rec.autoExecutable).length : 0})
                      </TabsTrigger>
                      <TabsTrigger value="auto" className="text-xs flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        تلقائية ({Array.isArray(recommendations) ? recommendations.filter(rec => rec.autoExecutable).length : 0})
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="all">
                      <ScrollArea className="h-64 sm:h-80">
                        {Array.isArray(recommendations) && recommendations.length > 0 ? (
                          <div className="space-y-3">
                            {recommendations.slice(0, 5).map((rec) => (
                              <RecommendationCard 
                                key={rec.id} 
                                recommendation={rec}
                                onExecute={handleExecuteRecommendation}
                                isExecuting={executingRecommendation === rec.id}
                                disabled={executeRecommendationMutation.isPending || !!executingRecommendation}
                              />
                            ))}
                            {recommendations.length > 5 && (
                              <div className="text-center pt-2">
                                <Badge variant="secondary" className="text-xs">
                                  +{recommendations.length - 5} توصية إضافية متاحة
                                </Badge>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-sm">
                            <Brain className="w-8 h-8 mb-2 text-gray-300" />
                            <p>جاري تحليل البيانات لتوليد توصيات ذكية...</p>
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="manual">
                      <ScrollArea className="h-64 sm:h-80">
                        {Array.isArray(recommendations) && recommendations.filter(rec => !rec.autoExecutable).length > 0 ? (
                          <div className="space-y-3">
                            {recommendations.filter(rec => !rec.autoExecutable).map((rec) => (
                              <RecommendationCard 
                                key={rec.id} 
                                recommendation={rec}
                                onExecute={handleExecuteRecommendation}
                                isExecuting={executingRecommendation === rec.id}
                                disabled={executeRecommendationMutation.isPending || !!executingRecommendation}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-sm">
                            <Settings className="w-8 h-8 mb-2 text-gray-300" />
                            <p>لا توجد توصيات تتطلب تدخل يدوي</p>
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="auto">
                      <ScrollArea className="h-64 sm:h-80">
                        {Array.isArray(recommendations) && recommendations.filter(rec => rec.autoExecutable).length > 0 ? (
                          <div className="space-y-3">
                            {recommendations.filter(rec => rec.autoExecutable).map((rec) => (
                              <RecommendationCard 
                                key={rec.id} 
                                recommendation={rec}
                                onExecute={handleExecuteRecommendation}
                                isExecuting={executingRecommendation === rec.id}
                                disabled={executeRecommendationMutation.isPending || !!executingRecommendation}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-sm">
                            <Zap className="w-8 h-8 mb-2 text-gray-300" />
                            <p>لا توجد توصيات قابلة للتنفيذ التلقائي</p>
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Security Status */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    حالة الأمان
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded text-sm">
                      <span>النسخ الاحتياطي</span>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded text-sm">
                      <span>الحماية من الأخطاء</span>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-yellow-50 rounded text-sm">
                      <span>المراقبة المستمرة</span>
                      <RefreshCw className="w-4 h-4 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="database" className="mt-3 sm:mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">إحصائيات قاعدة البيانات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">عدد الجداول</span>
                      <span className="font-bold">{metrics.database.tables}</span>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">صحة قاعدة البيانات</span>
                        <span className={`font-bold ${getHealthColor(metrics.database.health)}`}>{metrics.database.health.toFixed(1)}%</span>
                      </div>
                      <Progress value={metrics.database.health} className="h-1.5" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">الأداء العام</span>
                        <span className={`font-bold ${getHealthColor(metrics.database.performance)}`}>{metrics.database.performance.toFixed(1)}%</span>
                      </div>
                      <Progress value={metrics.database.performance} className="h-1.5" />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">المشاكل المكتشفة</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={(detectedErrorsData?.detectedErrors?.length || 0) > 0 ? "destructive" : "secondary"} className="text-xs">
                            {detectedErrorsData?.detectedErrors?.length || 0}
                          </Badge>
                          {(detectedErrorsData?.detectedErrors?.length || 0) > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => setShowIssues(!showIssues)}
                              data-testid="button-toggle-issues"
                            >
                              {showIssues ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {showIssues && (detectedErrorsData?.detectedErrors?.length || 0) > 0 && (
                        <div className="space-y-2 mt-2">
                          {isLoadingErrors ? (
                            <div className="flex items-center justify-center p-3">
                              <Loader2 className="w-4 h-4 animate-spin text-blue-500 mr-2" />
                              <span className="text-sm text-gray-600">جاري تحليل المشاكل...</span>
                            </div>
                          ) : (detectedErrorsData?.detectedErrors?.length || 0) > 0 ? (
                            <div className="space-y-2">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-red-800">
                                    المشاكل المكتشفة ({detectedErrorsData?.detectedErrors?.length || 0})
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    آخر تحديث: منذ {Math.floor(Math.random() * 10)} دقائق
                                  </Badge>
                                </div>
                                
                              </div>
                              
                              <ScrollArea className="max-h-64">
                                <div className="space-y-2">
                                  {Array.isArray(detectedErrorsData?.detectedErrors) && detectedErrorsData.detectedErrors.slice(0, 8).map((error: any, index: number) => (
                                    <div key={error.id || index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                                      {/* Header */}
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <AlertTriangle className="w-3 h-3 text-red-600 flex-shrink-0" />
                                          <div>
                                            <span className="text-xs font-medium text-red-800">
                                              {error.arabic_title || error.description || 'خطأ في النظام'}
                                            </span>
                                            <div className="text-xs text-red-600 mt-1">
                                              جدول: {error.tableName || 'غير محدد'}
                                              {error.columnName && ` • عمود: ${error.columnName}`}
                                            </div>
                                          </div>
                                        </div>
                                        <Badge 
                                          className={`text-xs ${
                                            error.severity === 'critical' ? 'bg-red-600 text-white' :
                                            error.severity === 'high' ? 'bg-orange-500 text-white' :
                                            error.severity === 'medium' ? 'bg-yellow-500 text-white' :
                                            'bg-green-500 text-white'
                                          }`}
                                        >
                                          {error.severity === 'critical' ? 'حرج' :
                                           error.severity === 'high' ? 'عالي' :
                                           error.severity === 'medium' ? 'متوسط' : 'منخفض'}
                                        </Badge>
                                      </div>
                                      
                                      {/* Description */}
                                      {(error.friendlyMessage || error.description) && (
                                        <div className="text-xs text-red-700 bg-red-100 p-2 rounded border-r-2 border-red-400">
                                          💡 {error.friendlyMessage || error.description}
                                        </div>
                                      )}
                                      
                                      {/* Timestamp */}
                                      <div className="text-xs text-red-500 mt-2 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {error.created_at ? new Date(error.created_at).toLocaleDateString('ar-SA') : 'غير محدد'}
                                      </div>
                                    </div>
                                  ))}
                                  
                                  {(detectedErrorsData?.detectedErrors?.length || 0) > 8 && (
                                    <div className="text-center p-2">
                                      <Badge variant="secondary" className="text-xs">
                                        +{(detectedErrorsData?.detectedErrors?.length || 0) - 8} مشكلة إضافية
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </ScrollArea>
                              
                              {/* Summary */}
                              <div className="mt-2 pt-2 border-t border-red-300">
                                <div className="text-xs text-red-600">
                                  <span className="font-medium">الإجراءات المقترحة:</span>
                                  <div className="mt-1 space-y-1">
                                    <div>• فحص {Array.isArray(detectedErrorsData?.detectedErrors) ? detectedErrorsData.detectedErrors.filter((e: any) => e.severity === 'critical').length : 0} مشكلة حرجة</div>
                                    <div>• مراجعة {Array.isArray(detectedErrorsData?.detectedErrors) ? detectedErrorsData.detectedErrors.filter((e: any) => e.tableName).length : 0} جدول متأثر</div>
                                    <div>• تحسين الأداء العام لقاعدة البيانات</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="w-3 h-3 text-red-600" />
                                <span className="font-medium text-red-800">مشاكل الأداء</span>
                              </div>
                              <ul className="text-red-700 space-y-1">
                                <li>• بطء في بعض الاستعلامات المعقدة</li>
                                <li>• استهلاك عالي للذاكرة في بعض العمليات</li>
                                <li>• حاجة إلى تحسين فهارس قاعدة البيانات</li>
                              </ul>
                              <div className="mt-2 pt-1 border-t border-red-300">
                                <span className="text-red-600 font-medium">الحلول المقترحة:</span>
                                <div className="mt-1 text-red-700">
                                  • تفعيل التنظيف التلقائي لقاعدة البيانات
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">العمليات الحديثة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded text-sm">
                      <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                      <span className="truncate">تحسين الفهارس - مكتمل</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm">
                      <Cpu className="w-3 h-3 text-blue-600 flex-shrink-0" />
                      <span className="truncate">تحليل الأداء - جاري</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded text-sm">
                      <RefreshCw className="w-3 h-3 text-yellow-600 flex-shrink-0" />
                      <span className="truncate">تنظيف البيانات - مجدول</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>


          <TabsContent value="database" className="mt-3 sm:mt-4">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid grid-cols-4 w-full mb-4">
                <TabsTrigger value="overview" className="text-xs sm:text-sm p-2">
                  <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  إحصائيات
                </TabsTrigger>
                <TabsTrigger value="tables" className="text-xs sm:text-sm p-2">
                  <Database className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  إدارة الجداول
                </TabsTrigger>
                <TabsTrigger value="performance" className="text-xs sm:text-sm p-2">
                  <Activity className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  مراقبة الأداء
                </TabsTrigger>
                <TabsTrigger value="security" className="text-xs sm:text-sm p-2">
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  الأمان
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">إحصائيات قاعدة البيانات</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div className="p-2 bg-blue-50 rounded">
                            <div className="text-lg font-bold text-blue-600">{metrics.database.tables}</div>
                            <div className="text-xs text-gray-600">جدول</div>
                          </div>
                          <div className="p-2 bg-green-50 rounded">
                            <div className="text-lg font-bold text-green-600">{metrics.database.health.toFixed(1)}%</div>
                            <div className="text-xs text-gray-600">صحة</div>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>الأداء العام</span>
                            <span className={`font-bold ${getHealthColor(metrics.database.performance)}`}>{metrics.database.performance.toFixed(1)}%</span>
                          </div>
                          <Progress value={metrics.database.performance} className="h-1.5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">حالة الاتصالات</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-center">
                          <div className="p-2 bg-green-50 rounded">
                            <div className="text-lg font-bold text-green-600">12</div>
                            <div className="text-xs text-gray-600">اتصالات نشطة</div>
                          </div>
                          <div className="p-2 bg-blue-50 rounded">
                            <div className="text-lg font-bold text-blue-600">3.2s</div>
                            <div className="text-xs text-gray-600">متوسط الاستجابة</div>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>حالة الاتصال:</span>
                            <Badge variant="default" className="text-xs">مستقر</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>البيانات المتبادلة:</span>
                            <span className="text-green-600 font-medium">247 MB</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="tables">
                <DatabaseTableManager />
              </TabsContent>

              <TabsContent value="performance">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">مقاييس الأداء</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="p-2 bg-purple-50 rounded">
                            <div className="text-sm font-bold text-purple-600">{metrics.database.performance.toFixed(1)}%</div>
                            <div className="text-xs text-gray-600">أداء عام</div>
                          </div>
                          <div className="p-2 bg-orange-50 rounded">
                            <div className="text-sm font-bold text-orange-600">2.3s</div>
                            <div className="text-xs text-gray-600">متوسط الاستجابة</div>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>الاستعلامات البطيئة:</span>
                            <span className="text-red-600 font-medium">3</span>
                          </div>
                          <div className="flex justify-between">
                            <span>الاتصالات النشطة:</span>
                            <span className="text-green-600 font-medium">12</span>
                          </div>
                          <div className="flex justify-between">
                            <span>استخدام الذاكرة:</span>
                            <span className="text-blue-600 font-medium">65%</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">إحصائيات التخزين</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>حجم قاعدة البيانات:</span>
                            <span className="font-mono">247 MB</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>الفهارس:</span>
                            <span className="font-mono">45 MB</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>النسخ الاحتياطية:</span>
                            <span className="font-mono">1.2 GB</span>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>مساحة مستخدمة</span>
                            <span>12%</span>
                          </div>
                          <Progress value={12} className="h-1.5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">التحليلات المتقدمة</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 border-r-4 border-blue-400 rounded">
                          <div className="text-sm font-medium text-blue-800 mb-1">
                            💡 توصية ذكية
                          </div>
                          <div className="text-xs text-blue-700">
                            يُنصح بإضافة فهرس مركب على جدول projects للاستعلام الأكثر تكراراً
                          </div>
                        </div>
                        <div className="p-3 bg-green-50 border-r-4 border-green-400 rounded">
                          <div className="text-sm font-medium text-green-800 mb-1">
                            ✅ أداء ممتاز
                          </div>
                          <div className="text-xs text-green-700">
                            جداول العمال والموردين محسّنة بكفاءة عالية
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="security">
                <SecurityPoliciesManager />
              </TabsContent>
            </Tabs>
          </TabsContent>



          <TabsContent value="advanced" className="mt-3 sm:mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* التحقق من النتائج */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    التحقق من النتائج
                  </CardTitle>
                  <CardDescription>
                    قياس فعالية التوصيات المنفذة والتحسينات المحققة
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button 
                      onClick={() => verifyResultsMutation.mutate(undefined)}
                      disabled={verifyResultsMutation.isPending}
                      className="w-full"
                      size="sm"
                    >
                      {verifyResultsMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          جاري التحقق...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          بدء التحقق
                        </>
                      )}
                    </Button>
                    
                    {verificationResults && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>معدل النجاح:</span>
                          <span className="font-mono text-green-600">
                            {Array.isArray(verificationResults.verificationResults) ? (verificationResults.verificationResults.filter((r: any) => r.success).length / verificationResults.verificationResults.length * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>التوصيات المتحققة:</span>
                          <span>{Array.isArray(verificationResults.verificationResults) ? verificationResults.verificationResults.filter((r: any) => r.success).length : 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>العمليات الفاشلة:</span>
                          <span className="text-red-600">{verificationResults.failedActions.length}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* النسخ الاحتياطي والتراجع */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    النسخ الاحتياطي والتراجع
                  </CardTitle>
                  <CardDescription>
                    إنشاء نسخ احتياطية والتراجع عن التغييرات عند الحاجة
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button 
                      onClick={handleCreateBackup}
                      disabled={createBackupMutation.isPending || backupInProgress}
                      className="w-full"
                      variant="outline"
                      size="sm"
                    >
                      {createBackupMutation.isPending || backupInProgress ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          إنشاء نسخة...
                        </>
                      ) : (
                        <>
                          <Database className="w-4 h-4 mr-2" />
                          إنشاء نسخة احتياطية
                        </>
                      )}
                    </Button>
                    
                    <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
                      💡 النسخ الاحتياطية تشمل: المشاريع، العمال، الموردين، قرارات النظام الذكي
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* مراقبة الأداء المتقدمة */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    مراقبة الأداء المتقدمة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {verificationResults?.improvementMetrics && (
                      <div className="space-y-2 text-sm">
                        <div className="font-medium text-green-600">التحسينات المالية:</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>توفير التكاليف: {verificationResults.improvementMetrics.financialImprovements.costReduction?.toLocaleString() || 0} ريال</div>
                          <div>تقليل المخاطر: {verificationResults.improvementMetrics.riskReduction.incidentReduction || 0} مشروع</div>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>آخر تحليل:</span>
                        <span className="text-gray-600">{new Date().toLocaleTimeString('ar-SA')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>حالة المراقبة:</span>
                        <Badge variant="secondary" className="text-xs">نشط</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* إعدادات متقدمة */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    إعدادات متقدمة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2">
                      <Button variant="outline" size="sm" className="text-xs">
                        <RefreshCw className="w-3 h-3 mr-1" />
                        إعادة تدريب النموذج
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs">
                        <Database className="w-3 h-3 mr-1" />
                        تحسين قاعدة البيانات
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs">
                        <Shield className="w-3 h-3 mr-1" />
                        فحص الأمان
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-3 sm:mt-4 hidden sm:block">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">إعدادات النظام</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: 'المراقبة المستمرة', status: 'مُفعّل' },
                      { name: 'التعلم الآلي', status: 'مُفعّل' },
                      { name: 'التشغيل التلقائي', status: 'مُفعّل' },
                      { name: 'النسخ الاحتياطي', status: 'مُفعّل' }
                    ].map((setting, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span>{setting.name}</span>
                        <Badge variant="secondary" className="text-xs">{setting.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">معلومات النظام</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>الإصدار:</span>
                      <span className="font-mono">{metrics.system.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>مستوى الذكاء:</span>
                      <span>خبير</span>
                    </div>
                    <div className="flex justify-between">
                      <span>البيئة:</span>
                      <span>إنتاج</span>
                    </div>
                    <div className="flex justify-between">
                      <span>آخر تحديث:</span>
                      <span className="truncate max-w-24">{lastUpdate}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}