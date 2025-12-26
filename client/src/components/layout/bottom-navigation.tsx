import { useLocation } from "wouter";
import { useState } from "react";
import { 
  Home, Users, Building2, Truck, Calculator, 
  MoreHorizontal, MapPin, BarChart, UserCheck, 
  Package, DollarSign, Settings, ArrowLeftRight, 
  FileText, CreditCard, FileSpreadsheet, Bell, 
  Shield, Database, Wrench, Terminal, Brain,
  ReceiptText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";

const navigationItems = [
  { path: "/", icon: Home, label: "الرئيسية", key: "dashboard" },
  { path: "/projects", icon: Building2, label: "المشاريع", key: "projects" },
  { path: "/workers", icon: Users, label: "العمال", key: "workers" },
  { path: "/suppliers-pro", icon: Truck, label: "الموردين", key: "suppliers" },
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
      { path: "/worker-accounts", icon: DollarSign, label: "حسابات العمال", description: "إدارة حوالات وتحويلات العمال", requireAdmin: true },
      { path: "/equipment", icon: Settings, label: "إدارة المعدات", description: "إدارة المعدات مع النقل والتتبع", requireAdmin: true },
      { path: "/project-fund-custody", icon: DollarSign, label: "الوارد للعهد", description: "إدارة الوارد الرئيسي للعُهد", requireAdmin: true },
      { path: "/project-transfers", icon: ArrowLeftRight, label: "ترحيل بين المشاريع", description: "إدارة ترحيل الأرصدة بين المشاريع", requireAdmin: true },
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
      { path: "/professional-reports", icon: BarChart, label: "التقارير الاحترافية", description: "لوحة تقارير متقدمة مع رسوم بيانية وتحليلات", requireAdmin: false },
      { path: "/real-reports", icon: ReceiptText, label: "التقارير الشاملة", description: "تقارير شاملة مع إمكانية التصدير والطباعة", requireAdmin: false },
      { path: "/reports", icon: FileSpreadsheet, label: "بيان العمال", description: "كشوفات وبيانات العمال والأجور", requireAdmin: false },
    ]
  },
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
  {
    category: "الأمان والمراقبة",
    pages: [
      { path: "/security-policies", icon: Shield, label: "السياسات الأمنية", description: "إدارة السياسات الأمنية والامتثال", requireAdmin: true },
      { path: "/smart-errors", icon: Database, label: "كشف الأخطاء الذكي", description: "مراقبة وتحليل أخطاء قاعدة البيانات بذكاء اصطناعي", requireAdmin: true },
    ]
  },
  {
    category: "الإعدادات والإدارة",
    pages: [
      { path: "/autocomplete-admin", icon: Wrench, label: "إعدادات الإكمال التلقائي", description: "إدارة بيانات الإكمال التلقائي", requireAdmin: true },
      { path: "/admin-notifications", icon: Bell, label: "إشعارات المسؤولين", description: "إدارة وإرسال إشعارات للمستخدمين", requireAdmin: true },
      { path: "/deployment", icon: Terminal, label: "لوحة البناء والنشر", description: "نظام البناء الآلي والنشر على السيرفر", requireAdmin: true },
    ]
  },
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
    <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 shadow-[0_-8px_20px_rgba(0,0,0,0.08)] pointer-events-auto flex-shrink-0 h-[68px] relative z-[100] pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-full w-full max-w-screen-xl mx-auto px-1 relative">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;

          return (
            <Button
              key={item.key}
              variant="ghost"
              className={`flex flex-col items-center justify-center gap-1 h-full min-w-[50px] px-1 rounded-xl transition-all duration-500 relative group no-default-hover-elevate no-default-active-elevate ${
                isActive 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-slate-400 dark:text-slate-500"
              }`}
              onClick={() => setLocation(item.path)}
            >
              <div className="relative flex items-center justify-center">
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="nav-bg"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="absolute inset-[-6px] bg-blue-50 dark:bg-blue-900/20 rounded-xl z-0"
                    />
                  )}
                </AnimatePresence>
                <Icon className={`h-[22px] w-[22px] z-10 transition-transform duration-500 ${isActive ? "scale-110" : "group-hover:scale-105"}`} />
              </div>
              <span className={`text-[11px] font-medium z-10 transition-all duration-500 ${isActive ? "opacity-100 translate-y-0" : "opacity-70 group-hover:opacity-100"}`}>
                {item.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="nav-dot"
                  className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-5 h-[3px] bg-blue-600 dark:bg-blue-400 rounded-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              )}
            </Button>
          );
        })}

        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className={`flex flex-col items-center justify-center gap-1 h-full min-w-[50px] px-1 rounded-xl transition-all duration-500 relative group no-default-hover-elevate no-default-active-elevate ${
                isMenuOpen 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              <div className="relative flex items-center justify-center">
                {isMenuOpen && (
                  <div className="absolute inset-[-6px] bg-blue-50 dark:bg-blue-900/20 rounded-xl" />
                )}
                <MoreHorizontal className={`h-[22px] w-[22px] z-10 transition-transform duration-500 ${isMenuOpen ? "scale-110" : "group-hover:scale-105"}`} />
              </div>
              <span className={`text-[11px] font-medium z-10 transition-all duration-500 ${isMenuOpen ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`}>
                المزيد
              </span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-[32px] px-4 border-none shadow-[0_-10px_40px_rgba(0,0,0,0.2)] bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xl">
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-6 mt-2" />
            <SheetHeader className="mb-6">
              <SheetTitle className="text-right text-xl font-bold text-slate-900 dark:text-white px-2">اكتشف التطبيق</SheetTitle>
            </SheetHeader>

            <ScrollArea className="h-[calc(85vh-120px)] pb-12">
              <div className="grid grid-cols-1 gap-6 px-1">
                {allPages.map((category, categoryIndex) => (
                  <div key={categoryIndex} className="space-y-3">
                    <h3 className="font-bold text-sm text-slate-400 dark:text-slate-500 text-right px-3 uppercase tracking-wider">
                      {category.category}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {category.pages.map((page, pageIndex) => {
                        const PageIcon = page.icon;
                        const isPageActive = location === page.path;

                        return (
                          <Button
                            key={pageIndex}
                            variant="ghost"
                            className={`w-full justify-start h-auto p-4 rounded-2xl border transition-all duration-300 ${
                              isPageActive 
                                ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200 dark:shadow-blue-900/20" 
                                : "bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                            }`}
                            onClick={() => handlePageNavigation(page.path)}
                          >
                            <div className="flex items-center gap-4 w-full text-right">
                              <div className={`p-2.5 rounded-xl transition-colors ${
                                isPageActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400"
                              }`}>
                                <PageIcon className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0 text-right">
                                <div className="font-bold text-sm leading-none mb-1 truncate">
                                  {page.label}
                                </div>
                                <div className={`text-[11px] leading-tight truncate ${isPageActive ? "text-white/80" : "text-slate-500 dark:text-slate-400"}`}>
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
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
