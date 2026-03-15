import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, TrendingUp, AlertTriangle, ShieldAlert, ShieldCheck, Zap, Clock, Lock, 
  Eye, CheckCircle2, XCircle, FileSearch, Lightbulb, ShieldOff
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { UnifiedStats } from "@/components/ui/unified-stats";
import { UnifiedSearchFilter, useUnifiedFilter } from "@/components/ui/unified-search-filter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { formatDate } from "@/lib/utils";

interface SecurityPolicy {
  id: string;
  policyId: string;
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'active' | 'inactive';
  complianceLevel: string;
  violationsCount: number;
  lastViolation?: string;
  created_at: string;
  updated_at: string;
}

interface PolicySuggestion {
  id: string;
  suggestedPolicyId: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
  created_at: string;
}

interface PolicyViolation {
  violation: {
    id: string;
    violationId: string;
    violatedRule: string;
    severity: string;
    status: string;
    detectedAt: string;
  };
  policy: {
    id: string;
    title: string;
    category: string;
  } | null;
}

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-2xl bg-muted/50 mb-4">
        <Icon className="h-10 w-10 text-muted-foreground/60" />
      </div>
      <h3 className="text-base font-semibold text-muted-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground/70 max-w-xs">{description}</p>
    </div>
  );
}

export function SecurityPoliciesPage() {
  const [activeTab, setActiveTab] = useState("policies");
  
  const {
    searchValue,
    filterValues,
    onSearchChange,
    onFilterChange,
    onReset
  } = useUnifiedFilter({
    status: 'all',
    severity: 'all'
  });

  const { data: policies = [], isLoading: policiesLoading } = useQuery({
    queryKey: QUERY_KEYS.securityPolicies,
    queryFn: async () => {
      const response = await fetch('/api/security/policies');
      if (!response.ok) return [];
      const result = await response.json();
      return (result.success ? result.data : result) as SecurityPolicy[];
    }
  });

  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: QUERY_KEYS.securitySuggestions,
    queryFn: async () => {
      const response = await fetch('/api/security/suggestions');
      if (!response.ok) return [];
      const result = await response.json();
      return (result.success ? result.data : result) as PolicySuggestion[];
    }
  });

  const { data: violations = [], isLoading: violationsLoading } = useQuery({
    queryKey: QUERY_KEYS.securityViolations,
    queryFn: async () => {
      const response = await fetch('/api/security/violations');
      if (!response.ok) return [];
      const result = await response.json();
      return (result.success ? result.data : result) as PolicyViolation[];
    }
  });

  const filteredPolicies = policies.filter(policy => 
    (policy.title?.toLowerCase().includes(searchValue.toLowerCase()) ||
    policy.description?.toLowerCase().includes(searchValue.toLowerCase())) &&
    (filterValues.status === 'all' || policy.status === filterValues.status) &&
    (filterValues.severity === 'all' || policy.severity === filterValues.severity)
  );

  const activePolicies = policies.filter(p => p.status === 'active').length;
  const criticalViolations = violations.filter(v => v.violation?.severity === 'critical').length;
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending').length;
  const securityScore = policies.length > 0 
    ? Math.max(0, Math.min(100, Math.round(100 - (criticalViolations * 15) - (violations.length * 3))))
    : 0;

  const statsItems = [
    { title: 'مؤشر الأمان', value: policies.length > 0 ? `${securityScore}%` : '—', icon: Zap, color: 'orange' as const },
    { title: 'السياسات النشطة', value: activePolicies, icon: ShieldCheck, color: 'green' as const },
    { title: 'انتهاكات حرجة', value: criticalViolations, icon: ShieldAlert, color: 'red' as const },
    { title: 'اقتراحات ذكية', value: pendingSuggestions, icon: TrendingUp, color: 'blue' as const }
  ];

  const chartData = [
    { name: 'الأحد', violations: 0 },
    { name: 'الاثنين', violations: 0 },
    { name: 'الثلاثاء', violations: 0 },
    { name: 'الأربعاء', violations: 0 },
    { name: 'الخميس', violations: 0 },
    { name: 'الجمعة', violations: 0 },
    { name: 'السبت', violations: 0 },
  ];

  const policyFilters = [
    {
      key: 'status',
      label: 'الحالة',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'جميع الحالات' },
        { value: 'active', label: 'نشط' },
        { value: 'draft', label: 'مسودة' },
        { value: 'inactive', label: 'غير نشط' }
      ]
    },
    {
      key: 'severity',
      label: 'المستوى',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'جميع المستويات' },
        { value: 'critical', label: 'حرج' },
        { value: 'high', label: 'عالي' },
        { value: 'medium', label: 'متوسط' },
        { value: 'low', label: 'منخفض' }
      ]
    }
  ];

  return (
    <div className="space-y-4" dir="rtl">
      <UnifiedStats stats={statsItems} columns={4} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
              <TabsList className="w-full sm:w-auto p-1 rounded-xl h-10">
                <TabsTrigger value="policies" className="rounded-lg px-4 h-8 text-sm">السياسات</TabsTrigger>
                <TabsTrigger value="violations" className="rounded-lg px-4 h-8 text-sm">الانتهاكات</TabsTrigger>
                <TabsTrigger value="suggestions" className="rounded-lg px-4 h-8 text-sm">الاقتراحات</TabsTrigger>
              </TabsList>

              <UnifiedSearchFilter
                searchValue={searchValue}
                onSearchChange={onSearchChange}
                searchPlaceholder="بحث في السياسات..."
                filters={activeTab === 'policies' ? policyFilters : []}
                filterValues={filterValues}
                onFilterChange={onFilterChange}
                onReset={onReset}
                className="w-full sm:w-72"
                showActiveFilters={true}
              />
            </div>

            <AnimatePresence mode="wait">
              <TabsContent value="policies" key="policies">
                {filteredPolicies.length === 0 ? (
                  <EmptyState
                    icon={Shield}
                    title="لا توجد سياسات أمنية"
                    description="لم يتم إنشاء أي سياسات أمنية بعد. يمكنك إضافة سياسات جديدة لحماية النظام."
                  />
                ) : (
                  <UnifiedCardGrid columns={2}>
                    {filteredPolicies.map((policy) => (
                      <motion.div
                        key={policy.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <UnifiedCard
                          title={policy.title}
                          subtitle={policy.policyId}
                          titleIcon={Shield}
                          headerColor={policy.status === 'active' ? '#10b981' : '#64748b'}
                          badges={[
                            { 
                              label: policy.severity === 'critical' ? 'حرج' : policy.severity === 'high' ? 'عالي' : 'متوسط',
                              variant: policy.severity === 'critical' ? 'destructive' : policy.severity === 'high' ? 'warning' : 'default'
                            },
                            {
                              label: policy.status === 'active' ? 'نشط' : 'مسودة',
                              variant: policy.status === 'active' ? 'success' : 'secondary'
                            }
                          ]}
                          fields={[
                            { label: 'الفئة', value: policy.category, icon: Lock },
                            { label: 'الانتهاكات', value: policy.violationsCount, icon: AlertTriangle, color: policy.violationsCount > 0 ? 'danger' : 'success' },
                            { label: 'آخر تحديث', value: formatDate(policy.updated_at), icon: Clock, color: 'muted' }
                          ]}
                          actions={[
                            { icon: Eye, label: 'عرض التفاصيل', onClick: () => {} },
                            { icon: CheckCircle2, label: 'تفعيل', onClick: () => {}, hidden: policy.status === 'active' }
                          ]}
                        />
                      </motion.div>
                    ))}
                  </UnifiedCardGrid>
                )}
              </TabsContent>

              <TabsContent value="violations" key="violations">
                {violations.length === 0 ? (
                  <EmptyState
                    icon={ShieldOff}
                    title="لا توجد انتهاكات مسجلة"
                    description="النظام آمن حالياً - لم يتم اكتشاف أي انتهاكات للسياسات الأمنية."
                  />
                ) : (
                  <div className="space-y-3">
                    {violations.map((v) => (
                      <motion.div
                        key={v.violation?.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <UnifiedCard
                          title={v.violation?.violatedRule || 'انتهاك غير محدد'}
                          subtitle={`السياسة: ${v.policy?.title || 'غير محدد'}`}
                          titleIcon={ShieldAlert}
                          headerColor="#ef4444"
                          fields={[
                            { label: 'التوقيت', value: v.violation?.detectedAt ? new Date(v.violation.detectedAt).toLocaleString('ar') : '—', icon: Clock },
                            { label: 'المستوى', value: v.violation?.severity || 'غير محدد', color: 'danger' }
                          ]}
                          actions={[
                            { icon: Eye, label: 'تحليل', onClick: () => {} }
                          ]}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="suggestions" key="suggestions">
                {suggestions.length === 0 ? (
                  <EmptyState
                    icon={Lightbulb}
                    title="لا توجد اقتراحات حالياً"
                    description="سيتم عرض اقتراحات ذكية لتحسين سياسات الأمان عند توفرها."
                  />
                ) : (
                  <div className="space-y-3">
                    {suggestions.map((s) => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <UnifiedCard
                          title={s.title}
                          subtitle={`اقتراح ذكي - ثقة ${s.confidence}%`}
                          titleIcon={Zap}
                          fields={[
                            { label: 'الوصف', value: s.description },
                            { label: 'الفئة', value: s.category, icon: Lock }
                          ]}
                          actions={[
                            { icon: CheckCircle2, label: 'تطبيق', onClick: () => {}, color: 'green' },
                            { icon: XCircle, label: 'رفض', onClick: () => {}, color: 'red' }
                          ]}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card className="border shadow-sm overflow-hidden bg-card rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                تحليل الانتهاكات الأسبوعي
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="h-[160px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorViolations" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" fontSize={10} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="violations" name="انتهاكات" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorViolations)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm bg-card rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-destructive" />
                آخر الانتهاكات
              </CardTitle>
            </CardHeader>
            <CardContent>
              {violations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ShieldCheck className="h-8 w-8 text-green-500/50 mb-2" />
                  <p className="text-xs text-muted-foreground">لا توجد انتهاكات مسجلة</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {violations.slice(0, 4).map((v) => (
                    <div key={v.violation?.id} className="p-3 bg-muted/30 rounded-lg flex items-center gap-3 group cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="p-1.5 bg-destructive/10 rounded-md">
                        <ShieldAlert className="w-3.5 h-3.5 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{v.violation?.violatedRule || 'انتهاك'}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {v.violation?.detectedAt ? new Date(v.violation.detectedAt).toLocaleTimeString('ar') : '—'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
