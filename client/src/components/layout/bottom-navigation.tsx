import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { 
  Home, Users, Building2, Truck, Calculator, 
  MoreHorizontal, MapPin, BarChart, UserCheck, 
  Package, DollarSign, Settings, ArrowLeftRight, 
  FileText, CreditCard, Bell, 
  Shield, Database, Wrench, Terminal,
  Search, X, RefreshCw, MessageSquare, Activity, 
  KeyRound, GitCompare, AlertTriangle, BrainCircuit, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/AuthProvider";

const navigationItems = [
  { path: "/", icon: Home, label: "الرئيسية", key: "dashboard" },
  { path: "/projects", icon: Building2, label: "المشاريع", key: "projects" },
  { path: "/workers", icon: Users, label: "العمال", key: "workers" },
  { path: "/worker-attendance", icon: UserCheck, label: "حضور", key: "attendance" },
  { path: "/daily-expenses", icon: Calculator, label: "المصاريف", key: "expenses" },
];

const allPagesData = [
  {
    category: "الصفحات الرئيسية",
    pages: [
      { path: "/", icon: Home, label: "لوحة التحكم", description: "عرض شامل للمشاريع والإحصائيات", requireAdmin: false },
      { path: "/projects", icon: Building2, label: "إدارة المشاريع", description: "إضافة وإدارة المشاريع", requireAdmin: false },
      { path: "/workers", icon: Users, label: "إدارة العمال", description: "إضافة وإدارة العمال والحرفيين", requireAdmin: false },
      { path: "/suppliers-pro", icon: Truck, label: "إدارة الموردين", description: "إدارة الموردين والموزعين", requireAdmin: false },
      { path: "/customers", icon: Users, label: "الزبائن", description: "إدارة بيانات الزبائن والعملاء", requireAdmin: false },
      { path: "/analysis", icon: BarChart, label: "التحليلات", description: "لوحة تحليلات شاملة للبيانات", requireAdmin: false },
      { path: "/notifications", icon: Bell, label: "الإشعارات", description: "عرض وإدارة إشعارات النظام", requireAdmin: false },
    ]
  },
  {
    category: "العمليات اليومية",
    pages: [
      { path: "/wells", icon: MapPin, label: "إدارة الآبار", description: "إدارة الآبار والمهام والمحاسبة", requireAdmin: false },
      { path: "/well-accounting", icon: Calculator, label: "محاسبة الآبار", description: "إدارة مهام ومحاسبة الآبار", requireAdmin: false },
      { path: "/well-cost-report", icon: BarChart, label: "تقرير التكاليف", description: "تحليل شامل لتكاليف الآبار", requireAdmin: false },
      { path: "/worker-attendance", icon: UserCheck, label: "حضور العمال", description: "تسجيل حضور وغياب العمال", requireAdmin: false },
      { path: "/daily-expenses", icon: Calculator, label: "المصاريف اليومية", description: "تسجيل المصاريف اليومية للمشاريع", requireAdmin: false },
      { path: "/material-purchase", icon: Package, label: "شراء المواد", description: "إدارة مشتريات مواد البناء", requireAdmin: false },
      { path: "/transport-management", icon: Truck, label: "إدارة النقل", description: "إدارة أجور ونقل العمال والمعدات", requireAdmin: false },
      { path: "/worker-accounts", icon: DollarSign, label: "حسابات العمال", description: "إدارة حوالات وتحويلات العمال", requireAdmin: false },
      { path: "/equipment", icon: Wrench, label: "إدارة المعدات", description: "إدارة المعدات مع النقل والتتبع", requireAdmin: true },
      { path: "/project-fund-custody", icon: DollarSign, label: "الوارد للعهد", description: "إدارة الوارد الرئيسي للعُهد" },
      { path: "/project-transfers", icon: ArrowLeftRight, label: "ترحيل بين المشاريع", description: "إدارة ترحيل الأرصدة بين المشاريع" },
      { path: "/project-transactions", icon: FileText, label: "سجل العمليات", description: "عرض شامل لجميع المعاملات المالية", requireAdmin: true },
    ]
  },
  {
    category: "إدارة الموردين", 
    pages: [
      { path: "/supplier-accounts", icon: CreditCard, label: "حسابات الموردين", description: "إدارة حسابات ودفعات الموردين", requireAdmin: true },
    ]
  },
  {
    category: "التقارير",
    pages: [
      { path: "/reports", icon: BarChart, label: "التقارير", description: "لوحة تقارير متقدمة مع رسوم بيانية وتحليلات", requireAdmin: false },
    ]
  },
  {
    category: "الإدارة العامة",
    pages: [
      { path: "/admin/dashboard", icon: BarChart, label: "لوحة القيادة", description: "مؤشرات الأداء العامة للنظام", requireAdmin: true },
      { path: "/admin/system", icon: Settings, label: "إدارة النظام", description: "لوحة التحكم المركزية في جميع الخدمات", requireAdmin: true },
      { path: "/users-management", icon: Users, label: "إدارة المستخدمين", description: "إدارة حسابات المستخدمين والصلاحيات", requireAdmin: true },
      { path: "/admin/permissions", icon: KeyRound, label: "إدارة الصلاحيات", description: "تعيين صلاحيات المستخدمين للمشاريع", requireAdmin: true },
    ]
  },
  {
    category: "الأمان والمراقبة",
    pages: [
      { path: "/security-policies", icon: Shield, label: "السياسات الأمنية", description: "إدارة السياسات الأمنية والامتثال", requireAdmin: true },
      { path: "/smart-errors", icon: AlertTriangle, label: "كشف الأخطاء الذكي", description: "مراقبة وتحليل أخطاء قاعدة البيانات بذكاء اصطناعي", requireAdmin: true },
      { path: "/admin/monitoring", icon: Activity, label: "نظام الرصد", description: "مراقبة أداء النظام والخدمات", requireAdmin: true },
      { path: "/admin/data-health", icon: Activity, label: "صحة البيانات", description: "فحص سلامة وصحة البيانات", requireAdmin: true },
    ]
  },
  {
    category: "الإعدادات والإدارة",
    pages: [
      { path: "/settings", icon: Settings, label: "الإعدادات", description: "إعدادات الحساب والتفضيلات الشخصية", requireAdmin: false },
      { path: "/autocomplete-admin", icon: Wrench, label: "إعدادات الإكمال التلقائي", description: "إدارة بيانات الإكمال التلقائي", requireAdmin: true },
      { path: "/admin-notifications", icon: Bell, label: "إشعارات المسؤولين", description: "إدارة وإرسال إشعارات للمستخدمين", requireAdmin: true },
    ]
  },
  {
    category: "الذكاء الاصطناعي والمزامنة",
    pages: [
      { path: "/ai-chat", icon: MessageSquare, label: "المساعد الذكي", description: "محادثة مع المساعد الذكي للنظام", requireAdmin: true },
      { path: "/local-db", icon: Database, label: "إدارة القاعدة المحلية", description: "فحص حالة البيانات المحلية والمزامنة", requireAdmin: true },
      { path: "/admin/backups", icon: Shield, label: "النسخ الاحتياطي", description: "إدارة واستعادة النسخ الاحتياطية", requireAdmin: true },
      { path: "/admin/sync", icon: RefreshCw, label: "إدارة المزامنة", description: "مراقبة حالة المزامنة والتحكم في البيانات", requireAdmin: true },
      { path: "/sync-comparison", icon: GitCompare, label: "مقارنة المزامنة", description: "مقارنة البيانات بين قواعد البيانات", requireAdmin: true },
      { path: "/whatsapp-setup", icon: MessageSquare, label: "ربط الواتساب", description: "إعداد وربط خدمة واتساب مع النظام", requireAdmin: true },
      { path: "/deployment", icon: Terminal, label: "إدارة النشر", description: "نظام البناء الآلي والنشر على السيرفر", requireAdmin: true },
    ]
  },
];

export default function BottomNavigation() {
  const [location, setLocation] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const allPages = allPagesData.map(category => ({
    ...category,
    pages: category.pages.filter(page => !page.requireAdmin || isAdmin)
  })).filter(category => category.pages.length > 0);

  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return allPages;
    
    const query = searchQuery.toLowerCase();
    return allPages.map(category => ({
      ...category,
      pages: category.pages.filter(page => 
        page.label.toLowerCase().includes(query) || 
        page.description.toLowerCase().includes(query)
      )
    })).filter(category => category.pages.length > 0);
  }, [searchQuery, allPages]);

  const handlePageNavigation = (path: string) => {
    setLocation(path);
    setIsMenuOpen(false);
    setSearchQuery("");
  };

  const totalPages = allPages.reduce((acc, cat) => acc + cat.pages.length, 0);

  return (
    <nav 
      className="bg-white dark:bg-[#1B2A4A] border-t border-slate-200 dark:border-slate-700/50 flex-shrink-0 h-full w-full relative z-[50]"
      onClick={(e) => e.stopPropagation()}
      aria-label="التنقل السفلي"
    >
      <div className="flex justify-around items-center h-full w-full max-w-screen-xl mx-auto px-1 gap-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;

          return (
            <Button
              key={item.key}
              variant="ghost"
              data-testid={`nav-item-${item.key}`}
              className={`flex flex-col items-center justify-center gap-0.5 h-full min-w-[52px] px-1 rounded-md no-default-hover-elevate no-default-active-elevate ${
                isActive 
                  ? "text-[#2E5090] dark:text-blue-300" 
                  : "text-slate-400 dark:text-slate-500"
              }`}
              onClick={() => setLocation(item.path)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2.5px] bg-[#2E5090] dark:bg-blue-300 rounded-b-full" aria-hidden="true" />
              )}
              <Icon className={`h-5 w-5 ${isActive ? "text-[#2E5090] dark:text-blue-300" : ""}`} aria-hidden="true" />
              <span className={`text-[10px] leading-tight ${isActive ? "font-semibold" : "font-medium opacity-80"}`}>
                {item.label}
              </span>
            </Button>
          );
        })}

        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen} modal={true}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              data-testid="nav-more-button"
              aria-label="المزيد من الصفحات"
              aria-expanded={isMenuOpen}
              className={`flex flex-col items-center justify-center gap-0.5 h-full min-w-[52px] px-1 rounded-md no-default-hover-elevate no-default-active-elevate ${
                isMenuOpen 
                  ? "text-[#2E5090] dark:text-blue-300" 
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
              <span className={`text-[10px] leading-tight ${isMenuOpen ? "font-semibold" : "font-medium opacity-80"}`}>
                المزيد
              </span>
            </Button>
          </SheetTrigger>
          <SheetContent 
            side="bottom" 
            className="h-[85vh] rounded-t-2xl px-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f1729] z-[20002]"
            onPointerDownOutside={() => setIsMenuOpen(false)}
            onInteractOutside={() => setIsMenuOpen(false)}
          >
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2 mb-3" />
            
            <div className="px-4 mb-4 space-y-3">
              <SheetHeader>
                <SheetTitle className="text-right text-lg font-bold text-[#1B2A4A] dark:text-slate-100">
                  جميع الصفحات
                </SheetTitle>
              </SheetHeader>
              
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-md">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {filteredPages.reduce((acc, cat) => acc + cat.pages.length, 0)} من {totalPages}
                </span>
                <span className="text-xs font-medium text-[#2E5090] dark:text-blue-300">
                  جميع الخدمات
                </span>
              </div>

              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" aria-hidden="true" />
                <Input
                  data-testid="input-menu-search"
                  type="text"
                  placeholder="ابحث عن صفحة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pr-10 pl-4 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus-visible:ring-1 focus-visible:ring-[#2E5090]"
                  aria-label="البحث في الصفحات"
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-1 top-1/2 -translate-y-1/2"
                    onClick={() => setSearchQuery("")}
                    aria-label="مسح البحث"
                  >
                    <X className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>

            <ScrollArea className="h-[calc(85vh-180px)]">
              <div className="px-4 pb-24">
                {filteredPages.length > 0 ? (
                  <div className="space-y-5">
                    {filteredPages.map((category, categoryIndex) => (
                      <div key={categoryIndex} className="space-y-2">
                        <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-1 tracking-wide">
                          {category.category}
                        </h3>

                        <div className="space-y-1">
                          {category.pages.map((page, pageIndex) => {
                            const PageIcon = page.icon;
                            const isPageActive = location === page.path;

                            return (
                              <Button
                                key={pageIndex}
                                variant="ghost"
                                data-testid={`menu-item-${page.path}`}
                                aria-label={page.label}
                                aria-current={isPageActive ? "page" : undefined}
                                className={`w-full h-auto p-3 rounded-md justify-start no-default-hover-elevate no-default-active-elevate ${
                                  isPageActive 
                                    ? "bg-[#2E5090] text-white dark:bg-[#2E5090]" 
                                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                                }`}
                                onClick={() => handlePageNavigation(page.path)}
                              >
                                <div className="flex items-center gap-3 w-full">
                                  <div className={`p-2 rounded-md flex-shrink-0 ${
                                    isPageActive 
                                      ? "bg-white/20" 
                                      : "bg-slate-100 dark:bg-slate-800 text-[#2E5090] dark:text-blue-300"
                                  }`}>
                                    <PageIcon className="h-4 w-4" aria-hidden="true" />
                                  </div>

                                  <div className="flex-1 min-w-0 text-right">
                                    <div className={`text-sm font-medium truncate ${
                                      isPageActive ? "text-white" : "text-slate-800 dark:text-slate-200"
                                    }`}>
                                      {page.label}
                                    </div>
                                    <div className={`text-[11px] truncate ${
                                      isPageActive 
                                        ? "text-white/75" 
                                        : "text-slate-400 dark:text-slate-500"
                                    }`}>
                                      {page.description}
                                    </div>
                                  </div>
                                </div>
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center" role="status" aria-label="لا توجد نتائج بحث">
                    <Search className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-3" aria-hidden="true" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">
                      لا توجد نتائج
                    </p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs">
                      جرب كلمات بحث أخرى
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
