import { 
  Home, Building2, Users, Package, Truck, 
  UserCheck, Calculator, Settings, LogOut,
  ChevronDown, BarChart3, ShieldCheck, Database, Wrench, Wallet, MessageSquare, Activity
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

const sections = [
  {
    title: "الرئيسية",
    icon: Home,
    items: [
      { title: "لوحة التحكم", url: "/", icon: Home },
      { title: "إدارة المشاريع", url: "/projects", icon: Building2 },
    ]
  },
  {
    title: "القوى العاملة",
    icon: Users,
    items: [
      { title: "إدارة العمال", url: "/workers", icon: Users },
      { title: "حضور العمال", url: "/worker-attendance", icon: UserCheck },
      { title: "حسابات العمال", url: "/worker-accounts", icon: Wallet },
    ]
  },
  {
    title: "المواد والعمليات",
    icon: Package,
    items: [
      { title: "شراء المواد", url: "/material-purchase", icon: Package },
      { title: "الموردين", url: "/suppliers-pro", icon: Truck },
      { title: "إدارة النقل", url: "/transport-management", icon: Truck },
      { title: "الزبائن", url: "/customers", icon: Users },
      { title: "إدارة المعدات", icon: Wrench, url: "/equipment" },
    ]
  },
  {
    title: "المالية والتقارير",
    icon: Calculator,
    items: [
      { title: "المصاريف اليومية", url: "/daily-expenses", icon: Calculator },
      { title: "محاسبة الآبار", url: "/well-accounting", icon: Calculator },
      { title: "تقرير التكلفة", url: "/well-cost-report", icon: BarChart3 },
      { title: "تقارير احترافية", url: "/professional-reports", icon: BarChart3 },
    ]
  },
  {
    title: "الإدارة والأمان",
    icon: ShieldCheck,
    items: [
      { title: "المساعد الذكي", icon: MessageSquare, url: "/ai-chat" },
      { title: "سياسات الأمان", icon: ShieldCheck, url: "/security-policies" },
      { title: "صحة البيانات", icon: Activity, url: "/admin/data-health" },
      { title: "النسخ الاحتياطي", icon: ShieldCheck, url: "/admin/backups" },
      { title: "قاعدة البيانات", icon: Database, url: "/local-db" },
    ]
  }
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { logout, user } = useAuth();
  const { setOpenMobile, isMobile } = useSidebar();

  const handleNavigation = (url: string) => {
    setLocation(url);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar side="right" variant="sidebar" collapsible="icon" className="border-l-0 bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white">
      <SidebarHeader className="border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#0f172a] px-4 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/20">
            <div className="relative flex items-center justify-center">
              <ShieldCheck className="h-7 w-7" strokeWidth={1.5} />
              <div className="absolute inset-0 flex items-center justify-center pt-0.5">
                <span className="text-white font-black text-[10px]">O</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden text-right">
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white uppercase">Orax</span>
            <span className="text-[10px] text-slate-500 dark:text-white/50 truncate font-medium uppercase tracking-wider">Operations Management</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white dark:bg-[#0f172a] gap-0 pt-2 custom-scrollbar overflow-y-auto overflow-x-hidden flex-1 scrolling-touch">
        {sections.map((section) => (
          <Collapsible key={section.title} defaultOpen className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2 text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white transition-colors group-data-[collapsible=icon]:hidden">
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
                          className="h-10 px-4 mx-2 w-[calc(100%-16px)] rounded-lg transition-all duration-200 data-[active=true]:bg-slate-900 data-[active=true]:text-white hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-white/70"
                        >
                          <a 
                            href={item.url} 
                            onClick={(e) => { 
                              e.preventDefault(); 
                              handleNavigation(item.url);
                            }}
                          >
                            <item.icon className="h-5 w-5" />
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
        {/* مساحة إضافية لضمان وصول التمرير لآخر عنصر */}
        <div className="h-24 w-full" aria-hidden="true" />
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#0f172a] p-2 flex-shrink-0">
        <div className="px-4 py-3 flex items-center gap-3 group-data-[collapsible=icon]:hidden border-b border-slate-200/50 dark:border-white/5 mb-2">
          <div className="h-9 w-9 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm uppercase border border-white/10 shadow-sm">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex flex-col overflow-hidden text-right">
            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.name || "المستخدم"}</span>
            <span className="text-[10px] text-slate-500 dark:text-white/40 truncate">{user?.email}</span>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="h-10 px-4 mx-2 w-[calc(100%-16px)] rounded-lg hover:bg-slate-200 dark:hover:bg-white/5 transition-colors text-slate-700 dark:text-white/70"
              onClick={() => handleNavigation("/settings")}
            >
              <Settings className="h-5 w-5 opacity-60" />
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
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">تسجيل الخروج</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {/* إضافة معلومات البيئة في الأسفل */}
        <div className="px-4 py-2 group-data-[collapsible=icon]:hidden">
           <div className="text-[10px] text-slate-500 dark:text-white/30 text-center border border-slate-200 dark:border-white/5 rounded py-1 bg-slate-100 dark:bg-white/5">
             البيئة: {process.env.NODE_ENV === 'production' ? 'الإنتاج' : 'التطوير'}
           </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
