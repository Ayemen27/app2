import { 
  Home, Building2, Users, Package, Truck, 
  UserCheck, Calculator, Settings, LogOut,
  Bell, HelpCircle
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
} from "@/components/ui/sidebar";
import { useLocation } from "wouter";
import { useAuth } from "@/components/AuthProvider";

const mainItems = [
  { title: "الرئيسية", url: "/", icon: Home },
  { title: "المشاريع", url: "/projects", icon: Building2 },
  { title: "العمال", url: "/workers", icon: Users },
  { title: "المشتريات", url: "/material-purchase", icon: Package },
];

const operationsItems = [
  { title: "النقل", url: "/transport-management", icon: Truck },
  { title: "الحضور", url: "/worker-attendance", icon: UserCheck },
  { title: "المصاريف", url: "/daily-expenses", icon: Calculator },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { logout, user } = useAuth();

  return (
    <Sidebar side="right" variant="sidebar" collapsible="icon">
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-bold text-sm truncate">مشروعي</span>
            <span className="text-[10px] text-muted-foreground truncate font-medium">إدارة المشاريع الإنشائية</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            القائمة الرئيسية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    className="h-11 px-4 transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    <a href={item.url} onClick={(e) => { e.preventDefault(); setLocation(item.url); }}>
                      <item.icon className={location === item.url ? "text-blue-600" : "text-slate-500"} />
                      <span className="font-medium">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            العمليات اليومية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    className="h-11 px-4 transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    <a href={item.url} onClick={(e) => { e.preventDefault(); setLocation(item.url); }}>
                      <item.icon className={location === item.url ? "text-blue-600" : "text-slate-500"} />
                      <span className="font-medium">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4 mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="h-11 px-4 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setLocation("/settings")}
            >
              <Settings className="text-slate-500" />
              <span>الإعدادات</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="h-11 px-4 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => logout()}
            >
              <LogOut />
              <span>تسجيل الخروج</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
