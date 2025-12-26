/* @ts-nocheck */
import { useLocation } from "wouter";
import { useState } from "react";
import { 
  Home, Users, Receipt, BarChart, CreditCard, Building2, Truck, FileText,
  MoreHorizontal, Calculator, FileSpreadsheet, UserCheck, DollarSign, Package,
  TrendingUp, Settings, ArrowLeftRight,
  Bell, Brain, Shield,
  Database, ReceiptText, MapPin, Wrench, Terminal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/AuthProvider";

const navigationItems = [
  { path: "/", icon: Home, label: "الرئيسية", key: "dashboard" },
  { path: "/projects", icon: Building2, label: "المشاريع", key: "projects" },
  { path: "/workers", icon: Users, label: "العمال", key: "workers" },
  { path: "/suppliers-pro", icon: Truck, label: "الموردين", key: "suppliers" },
  { path: "/daily-expenses", icon: Calculator, label: "المصاريف", key: "expenses" },
];

// قائمة الصفحات مع مستوى الحماية المطلوب
const allPagesData = [
  // الصفحات الرئيسية - متاحة للجميع
  {
    category: "الصفحات الرئيسية",
    pages: [
      { path: "/", icon: Home, label: "لوحة التحكم", description: "عرض شامل للمشاريع والإحصائيات", requireAdmin: false },
      { path: "/projects", icon: Building2, label: "إدارة المشاريع", description: "إضافة وإدارة المشاريع", requireAdmin: false },
      { path: "/workers", icon: Users, label: "إدارة العمال", description: "إضافة وإدارة العمال والحرفيين", requireAdmin: false },
      { path: "/suppliers-pro", icon: Truck, label: "إدارة الموردين", description: "إدارة الموردين والموزعين", requireAdmin: false },
    ]
  },
  // العمليات اليومية - مختلطة
  {
    category: "العمليات اليومية",
    pages: [
      { path: "/wells", icon: MapPin, label: "إدارة الآبار", description: "إدارة الآبار والمهام والمحاسبة", requireAdmin: false },
      { path: "/well-accounting", icon: Calculator, label: "محاسبة الآبار", description: "إدارة مهام ومحاسبة الآبار", requireAdmin: false },
      { path: "/well-cost-report", icon: BarChart, label: "تقرير التكاليف", description: "تحليل شامل لتكاليف الآبار", requireAdmin: false },
      { path: "/worker-attendance", icon: UserCheck, label: "حضور العمال", description: "تسجيل حضور وغياب العمال", requireAdmin: false },
      { path: "/daily-expenses", icon: Calculator, label: "المصاريف اليومية", description: "تسجيل المصاريف اليومية للمشاريع", requireAdmin: false },
      { path: "/material-purchase", icon: Package, label: "شراء المواد", description: "إدارة مشتريات مواد البناء", requireAdmin: false },
      { path: "/worker-accounts", icon: DollarSign, label: "حسابات العمال", description: "إدارة حوالات وتحويلات العمال", requireAdmin: true },
      { path: "/equipment", icon: Settings, label: "إدارة المعدات", description: "إدارة المعدات مع النقل والتتبع", requireAdmin: true },
      { path: "/project-fund-custody", icon: DollarSign, label: "الوارد للعهد", description: "إدارة الوارد الرئيسي للعُهد", requireAdmin: true },
      { path: "/project-transfers", icon: ArrowLeftRight, label: "ترحيل بين المشاريع", description: "إدارة ترحيل الأرصدة بين المشاريع", requireAdmin: true },
      { path: "/project-transactions", icon: FileText, label: "سجل العمليات", description: "عرض شامل لجميع المعاملات المالية", requireAdmin: true },
    ]
  },
  // إدارة الموردين - للمسؤولين فقط
  {
    category: "إدارة الموردين", 
    pages: [
      { path: "/supplier-accounts", icon: CreditCard, label: "حسابات الموردين", description: "إدارة حسابات ودفعات الموردين", requireAdmin: true },
    ]
  },
  // التقارير - متاحة للجميع
  {
    category: "التقارير",
    pages: [
      { path: "/professional-reports", icon: BarChart, label: "التقارير الاحترافية", description: "لوحة تقارير متقدمة مع رسوم بيانية وتحليلات", requireAdmin: false },
      { path: "/real-reports", icon: ReceiptText, label: "التقارير الشاملة", description: "تقارير شاملة مع إمكانية التصدير والطباعة", requireAdmin: false },
      { path: "/reports", icon: FileSpreadsheet, label: "بيان العمال", description: "كشوفات وبيانات العمال والأجور", requireAdmin: false },
    ]
  },
  // الإشعارات والتنبيهات - متاحة للجميع
  // إدارة النظام - للمسؤولين فقط
  {
    category: "إدارة النظام",
    pages: [
      { path: "/users-management", icon: Users, label: "إدارة المستخدمين", description: "إدارة حسابات المستخدمين والصلاحيات", requireAdmin: true },
    ]
  },
  {
    category: "الإشعارات والتنبيهات",
    pages: [
      { path: "/notifications", icon: Bell, label: "الإشعارات", description: "عرض وإدارة إشعارات النظام", requireAdmin: false },
    ]
  },
  // النظام الذكي والأمان - للمسؤولين فقط
  {
    category: "الأمان والمراقبة",
    pages: [
      { path: "/security-policies", icon: Shield, label: "السياسات الأمنية", description: "إدارة السياسات الأمنية والامتثال", requireAdmin: true },
      { path: "/smart-errors", icon: Database, label: "كشف الأخطاء الذكي", description: "مراقبة وتحليل أخطاء قاعدة البيانات بذكاء اصطناعي", requireAdmin: true },
    ]
  },
  // الإعدادات والإدارة - للمسؤولين فقط
  {
    category: "الإعدادات والإدارة",
    pages: [
      { path: "/autocomplete-admin", icon: Wrench, label: "إعدادات الإكمال التلقائي", description: "إدارة بيانات الإكمال التلقائي", requireAdmin: true },
      { path: "/admin-notifications", icon: Bell, label: "إشعارات المسؤولين", description: "إدارة وإرسال إشعارات للمستخدمين", requireAdmin: true },
      { path: "/deployment", icon: Terminal, label: "لوحة البناء والنشر", description: "نظام البناء الآلي والنشر على السيرفر", requireAdmin: true },
    ]
  },
  // الوكيل الذكي - للمسؤول الأول فقط
  {
    category: "الذكاء الاصطناعي",
    pages: [
      { path: "/ai-chat", icon: Brain, label: "الوكيل الذكي", description: "مساعد ذكي لإدارة المشاريع والاستعلامات", requireAdmin: true },
    ]
  },
];

export default function BottomNavigation() {
  const [location, setLocation] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();

  // فلترة الصفحات حسب دور المستخدم
  const isAdmin = user?.role === 'admin';
  const allPages = allPagesData.map(category => ({
    ...category,
    pages: category.pages.filter(page => !page.requireAdmin || isAdmin)
  })).filter(category => category.pages.length > 0);

  const handlePageNavigation = (path: string) => {
    setLocation(path);
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pointer-events-auto flex-shrink-0 h-16 md:h-16 relative z-[100] safe-area-inset-bottom">
      <div className="grid grid-cols-6 h-full w-full max-w-screen-xl mx-auto px-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;

          return (
            <Button
              key={item.key}
              variant="ghost"
              className={`flex flex-col items-center justify-center gap-1 h-full rounded-2xl transition-all duration-300 relative group overflow-visible ${
                isActive 
                  ? "text-blue-600 dark:text-blue-400 font-bold" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
              onClick={() => setLocation(item.path)}
            >
              <div className={`p-1 rounded-xl transition-all duration-300 ${
                isActive ? "bg-blue-50 dark:bg-blue-900/20 scale-110" : "group-hover:bg-slate-50 dark:group-hover:bg-slate-800"
              }`}>
                <Icon className={`h-5 w-5 md:h-6 md:w-6 transition-transform ${isActive ? "scale-110" : "scale-100"}`} />
              </div>
              <span className={`text-[10px] md:text-xs transition-all ${isActive ? "opacity-100" : "opacity-80"}`}>
                {item.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="nav-indicator"
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 dark:bg-blue-400 rounded-full"
                />
              )}
            </Button>
          );
        })}

        {/* زر المزيد */}
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className={`flex flex-col items-center justify-center gap-1 h-full rounded-2xl transition-all duration-300 relative group overflow-visible ${
                isMenuOpen 
                  ? "text-blue-600 dark:text-blue-400 font-bold" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <div className={`p-1 rounded-xl transition-all duration-300 ${
                isMenuOpen ? "bg-blue-50 dark:bg-blue-900/20 scale-110" : "group-hover:bg-slate-50 dark:group-hover:bg-slate-800"
              }`}>
                <MoreHorizontal className={`h-5 w-5 md:h-6 md:w-6 transition-transform ${isMenuOpen ? "scale-110" : "scale-100"}`} />
              </div>
              <span className={`text-[10px] md:text-xs transition-all ${isMenuOpen ? "opacity-100" : "opacity-80"}`}>
                المزيد
              </span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] max-w-full px-3">
            <SheetHeader className="mb-4 px-1">
              <SheetTitle className="text-right text-lg">جميع الصفحات</SheetTitle>
            </SheetHeader>

            <ScrollArea className="h-full">
              <div className="space-y-3 px-1">
                {allPages.map((category, categoryIndex) => (
                  <div key={categoryIndex} className="w-full">
                    <h3 className="font-semibold text-sm text-primary text-right border-b border-border pr-2 truncate">
                      {category.category}
                    </h3>
                    <div className="space-y-1">
                      {category.pages.map((page, pageIndex) => {
                        const Icon = page.icon;
                        const isActive = location === page.path;

                        return (
                          <Button
                            key={pageIndex}
                            variant={isActive ? "default" : "ghost"}
                            className="w-full justify-start h-auto p-3 min-h-[60px] text-right"
                            onClick={() => handlePageNavigation(page.path)}
                          >
                            <div className="flex items-start gap-3 w-full text-right">
                              <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                              <div className="flex-1 min-w-0 text-right overflow-hidden">
                                <div className={`font-medium text-sm leading-snug text-right truncate ${isActive ? 'text-primary-foreground' : ''}`}>
                                  {page.label}
                                </div>
                                <div className={`text-xs mt-1 leading-tight text-right break-words hyphens-auto ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`} style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                  {page.description}
                                </div>
                              </div>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                    {categoryIndex < allPages.length - 1 && (
                      <Separator className="my-3" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}