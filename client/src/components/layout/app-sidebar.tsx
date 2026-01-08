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
    <Sidebar side="right" variant="sidebar" collapsible="icon" className="border-l-0">
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-base tracking-tight">مشروعي</span>
            <span className="text-[10px] text-sidebar-foreground/60 truncate font-medium uppercase tracking-wider">Construction Pro</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar gap-0 pt-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[11px] font-bold text-sidebar-foreground/40 uppercase tracking-[0.1em] mb-2 group-data-[collapsible=icon]:hidden">
            الرئيسية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    className="h-10 px-4 mx-2 w-[calc(100%-16px)] rounded-lg transition-all duration-200 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground hover:bg-sidebar-accent"
                  >
                    <a href={item.url} onClick={(e) => { e.preventDefault(); setLocation(item.url); }}>
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium text-sm">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="px-4 text-[11px] font-bold text-sidebar-foreground/40 uppercase tracking-[0.1em] mb-2 group-data-[collapsible=icon]:hidden">
            العمليات
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    className="h-10 px-4 mx-2 w-[calc(100%-16px)] rounded-lg transition-all duration-200 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground hover:bg-sidebar-accent"
                  >
                    <a href={item.url} onClick={(e) => { e.preventDefault(); setLocation(item.url); }}>
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium text-sm">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border bg-sidebar/50 p-2 mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="h-10 px-4 mx-2 w-[calc(100%-16px)] rounded-lg hover:bg-sidebar-accent transition-colors"
              onClick={() => setLocation("/settings")}
            >
              <Settings className="h-5 w-5 opacity-60" />
              <span className="text-sm font-medium">الإعدادات</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="h-10 px-4 mx-2 w-[calc(100%-16px)] rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              onClick={() => logout()}
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">تسجيل الخروج</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
