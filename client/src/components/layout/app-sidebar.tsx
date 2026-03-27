import { 
  Home, Building2, Users, Package, Truck, 
  UserCheck, Calculator, Settings, LogOut,
  ChevronDown, BarChart3, ShieldCheck, Database, Wrench, Wallet, MessageSquare, Activity, RefreshCw, FileText, KeyRound,
  MapPin, Bell, CreditCard, ArrowLeftRight, DollarSign, Terminal, Sparkles, GitCompare, AlertTriangle, BrainCircuit, Scale, ScrollText, FileSpreadsheet, FileUp
} from "lucide-react";
import { 
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { useLocation } from "wouter";
import { useAuth } from "@/components/AuthProvider";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";

interface SidebarItem {
  title: string;
  url: string;
  icon: any;
  adminOnly?: boolean;
}

interface SidebarSection {
  title: string;
  icon: any;
  adminOnly?: boolean;
  items: SidebarItem[];
}

const sections: SidebarSection[] = [
  {
    title: "الرئيسية",
    icon: Home,
    items: [
      { title: "لوحة التحكم", url: "/", icon: Home },
      { title: "إدارة المشاريع", url: "/projects", icon: Building2 },
      { title: "التحليلات", url: "/analysis", icon: BarChart3 },
      { title: "الإشعارات", url: "/notifications", icon: Bell },
    ]
  },
  {
    title: "القوى العاملة",
    icon: Users,
    items: [
      { title: "إدارة العمال", url: "/workers", icon: Users },
      { title: "حضور العمال", url: "/worker-attendance", icon: UserCheck },
      { title: "حسابات العمال", url: "/worker-accounts", icon: Wallet },
      { title: "تصفية الحسابات", url: "/worker-settlements", icon: Scale },
      { title: "سجل العمليات", url: "/project-transactions", icon: FileText, adminOnly: true },
    ]
  },
  {
    title: "المواد والعمليات",
    icon: Package,
    items: [
      { title: "شراء المواد", url: "/material-purchase", icon: Package },
      { title: "الموردين", url: "/suppliers-pro", icon: Truck },
      { title: "حسابات الموردين", url: "/supplier-accounts", icon: CreditCard, adminOnly: true },
      { title: "إدارة النقل", url: "/transport-management", icon: Truck },
      { title: "الزبائن", url: "/customers", icon: Users },
      { title: "إدارة المخزن", icon: Wrench, url: "/equipment", adminOnly: true },
    ]
  },
  {
    title: "الآبار والمالية",
    icon: Calculator,
    items: [
      { title: "إدارة الآبار", url: "/wells", icon: MapPin },
      { title: "الفرق والنقل", url: "/wells/crews", icon: Users },
      { title: "المواد والمنظومات", url: "/wells/materials", icon: Package },
      { title: "الاستلام والفحص", url: "/wells/receptions", icon: UserCheck },
      { title: "محاسبة الآبار", url: "/well-accounting", icon: Calculator },
      { title: "تقرير التكلفة", url: "/well-cost-report", icon: BarChart3 },
      { title: "تصدير تقارير الآبار", url: "/well-reports", icon: BarChart3 },
      { title: "المصاريف اليومية", url: "/daily-expenses", icon: Calculator },
      { title: "الوارد للعهد", url: "/project-fund-custody", icon: DollarSign },
      { title: "ترحيل بين المشاريع", url: "/project-transfers", icon: ArrowLeftRight },
      { title: "نقل السجلات", url: "/records-transfer", icon: ArrowLeftRight, adminOnly: true },
      { title: "التقارير", url: "/reports", icon: BarChart3 },
      { title: "مصروفات المشاريع", url: "/multi-project-expenses", icon: Wallet },
      { title: "مقارنة الإكسل", url: "/excel-comparison", icon: FileSpreadsheet },
    ]
  },
  {
    title: "الإدارة والأمان",
    icon: ShieldCheck,
    adminOnly: true,
    items: [
      { title: "لوحة القيادة", icon: BarChart3, url: "/admin/dashboard" },
      { title: "إدارة المستخدمين", icon: Users, url: "/users-management" },
      { title: "إدارة الصلاحيات", icon: KeyRound, url: "/admin/permissions" },
      { title: "إدارة النظام", icon: Settings, url: "/admin/system" },
      { title: "سياسات الأمان", icon: ShieldCheck, url: "/security-policies" },
      { title: "إشعارات المسؤولين", icon: Bell, url: "/admin-notifications" },
      { title: "إعدادات الإكمال التلقائي", icon: Wrench, url: "/autocomplete-admin" },
    ]
  },
  {
    title: "الذكاء الاصطناعي والمراقبة",
    icon: BrainCircuit,
    adminOnly: true,
    items: [
      { title: "المساعد الذكي", icon: MessageSquare, url: "/ai-chat" },
      { title: "كشف الأخطاء الذكي", icon: AlertTriangle, url: "/smart-errors" },
      { title: "نظام الرصد", icon: Activity, url: "/admin/monitoring" },
      { title: "صحة البيانات", icon: Activity, url: "/admin/data-health" },
      { title: "مقارنة المزامنة", icon: GitCompare, url: "/sync-comparison" },
      { title: "بنك السجلات", icon: ScrollText, url: "/admin/central-logs" },
      { title: "استيراد واتساب", icon: FileUp, url: "/wa-import" },
    ]
  },
  {
    title: "البنية التحتية",
    icon: Database,
    adminOnly: true,
    items: [
      { title: "قاعدة البيانات", icon: Database, url: "/local-db" },
      { title: "النسخ الاحتياطي", icon: ShieldCheck, url: "/admin/backups" },
      { title: "إدارة المزامنة", icon: RefreshCw, url: "/admin/sync" },
      { title: "ربط الواتساب", icon: MessageSquare, url: "/whatsapp-setup" },
      { title: "إدارة النشر", icon: Terminal, url: "/deployment" },
    ]
  }
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { logout, user } = useAuth();
  const { setOpenMobile, isMobile } = useSidebar();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const visibleSections = sections
    .filter(section => !section.adminOnly || isAdmin)
    .map(section => ({
      ...section,
      items: section.items.filter(item => !item.adminOnly || isAdmin)
    }));

  const displayName = user?.name || 
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 
    "المستخدم";

  const handleNavigation = (url: string) => {
    setLocation(url);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar side="right" variant="sidebar" collapsible="icon" className="border-l-0 bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-500" aria-label="القائمة الجانبية الرئيسية">
      <SidebarHeader className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#3b82f6] dark:bg-[#1a1c1e] shadow-xl shadow-blue-600/20 dark:shadow-black/40 transition-all border border-white/10 dark:border-slate-800 overflow-hidden relative group/logo">
             <div className="relative flex items-center justify-center w-full h-full translate-y-[1px]">
               <span className="font-black text-2xl leading-none text-white drop-shadow-sm">أ</span>
               <span className="font-black text-xs leading-none text-white/30 ml-[-2px] italic -skew-x-6">A</span>
               <div className="absolute top-2 right-2 w-2 h-2 bg-blue-400 rounded-full border border-white dark:border-[#1a1c1e] shadow-sm"></div>
             </div>
          </div>
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden text-right">
            <div className="flex items-center gap-2 leading-none">
              <span className="font-black text-lg tracking-[-0.05em] text-slate-900 dark:text-white uppercase">AXION</span>
              <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800"></div>
              <span className="font-black text-sm text-[#3b82f6] dark:text-blue-500">أكسيون</span>
            </div>
            <span className="text-[8px] text-slate-400 dark:text-slate-500 truncate font-black uppercase tracking-[0.4em] mt-1.5 opacity-80">Enterprise Operations</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white dark:bg-slate-950 gap-0 pt-2 custom-scrollbar overflow-y-auto overflow-x-hidden flex-1 scrolling-touch">
        {visibleSections.map((section) => (
          <Collapsible key={section.title} defaultOpen className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors group-data-[collapsible=icon]:hidden" aria-label={`قسم ${section.title} - اضغط للطي أو التوسيع`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider">{section.title}</span>
                  <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          isActive={location === item.url}
                          className="h-10 px-4 mx-2 w-[calc(100%-16px)] rounded-lg transition-all duration-200 data-[active=true]:bg-blue-600 dark:data-[active=true]:bg-white data-[active=true]:text-white dark:data-[active=true]:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
                        >
                          <a 
                            href={item.url} 
                            onClick={(e) => { 
                              e.preventDefault(); 
                              handleNavigation(item.url);
                            }}
                            aria-label={item.title}
                            aria-current={location === item.url ? "page" : undefined}
                          >
                            <item.icon className="h-5 w-5" aria-hidden="true" />
                            <span className="font-medium text-sm">{item.title}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
        <div className="h-24 w-full" aria-hidden="true" />
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 flex-shrink-0">
        <div className="px-4 py-3 flex items-center gap-3 group-data-[collapsible=icon]:hidden border-b border-slate-200/50 dark:border-slate-800 mb-2">
          <div className="h-9 w-9 rounded-full bg-blue-600 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 font-bold text-sm uppercase border border-white/10 shadow-sm transition-colors">
            {displayName.charAt(0) || "U"}
          </div>
          <div className="flex flex-col overflow-hidden text-right">
            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{displayName}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</span>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="h-10 px-4 mx-2 w-[calc(100%-16px)] rounded-lg hover:bg-slate-200 dark:hover:bg-slate-900 transition-colors text-slate-700 dark:text-slate-300"
              onClick={() => handleNavigation("/settings")}
              aria-label="الإعدادات"
              data-testid="button-settings"
            >
              <Settings className="h-5 w-5 opacity-60" aria-hidden="true" />
              <span className="text-sm font-medium">الإعدادات</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="h-10 px-4 mx-2 w-[calc(100%-16px)] rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-400 transition-colors"
              onClick={() => {
                logout();
                if (isMobile) setOpenMobile(false);
              }}
              aria-label="تسجيل الخروج"
              data-testid="button-logout"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-medium">تسجيل الخروج</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-4 py-2 group-data-[collapsible=icon]:hidden">
           <div className="text-[10px] text-slate-500 dark:text-slate-500 text-center border border-slate-200 dark:border-slate-800 rounded py-1 bg-slate-100 dark:bg-slate-900/50">
             البيئة: {process.env.NODE_ENV === 'production' ? 'الإنتاج' : 'التطوير'}
           </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
