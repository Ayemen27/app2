import { HardHat, Home, Building2, Users, Truck, UserCheck, DollarSign, Calculator, Package, ArrowLeftRight, FileText, Wrench, FolderOpen, CheckCircle2, Layers, Activity, Wallet, MessageSquare, Lock, FileBarChart, Cloud, CloudOff, Database, Sun, Moon, Settings, Bell, Shield, RefreshCw, BarChart3, Wifi, WifiOff, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useAuth } from "@/components/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { useSelectedProject, ALL_PROJECTS_ID, ALL_PROJECTS_NAME } from "@/hooks/use-selected-project";
import { apiRequest } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Project } from "@shared/schema";
import { subscribeSyncState } from "@/offline/sync";

const pageInfo: Record<string, { title: string; icon: any }> = {
  '/': { title: 'لوحة التحكم', icon: Home },
  '/projects': { title: 'إدارة المشاريع', icon: Building2 },
  '/workers': { title: 'إدارة العمال', icon: Users },
  '/suppliers-pro': { title: 'إدارة الموردين', icon: Truck },
  '/worker-attendance': { title: 'حضور العمال', icon: UserCheck },
  '/worker-accounts': { title: 'حسابات العمال', icon: DollarSign },
  '/material-purchase': { title: 'شراء المواد', icon: Package },
  '/project-transfers': { title: 'ترحيل بين المشاريع', icon: ArrowLeftRight },
  '/project-transactions': { title: 'سجل العمليات', icon: FileText },
  '/well-accounting': { title: 'محاسبة الآبار', icon: Calculator },
  '/well-cost-report': { title: 'تقرير تكلفة الآبار', icon: FileText },
  '/wells': { title: 'إدارة الآبار', icon: Layers },
  '/transport-management': { title: 'إدارة النقل', icon: Truck },
  '/daily-expenses': { title: 'المصاريف اليومية', icon: DollarSign },
  '/records-transfer': { title: 'نقل السجلات بين المشاريع', icon: ArrowLeftRight },
  '/deployment': { title: 'إدارة النشر', icon: Activity },
  '/settings': { title: 'إعدادات النظام', icon: Settings },
  '/project-fund-custody': { title: 'عهدة صندوق المشروع', icon: Wallet },
  '/notifications': { title: 'الإشعارات', icon: Bell },
  '/admin-notifications': { title: 'إشعارات الإدارة', icon: Shield },
  '/ai-chat': { title: 'المساعد الذكي', icon: MessageSquare },
  '/security-policies': { title: 'سياسات الأمان', icon: Lock },
  '/equipment': { title: 'إدارة المعدات', icon: Wrench },
  '/reports': { title: 'التقارير', icon: FileBarChart },
  '/local-db': { title: 'إدارة قاعدة البيانات المحلية', icon: Database },
  '/admin/sync': { title: 'إدارة المزامنة', icon: RefreshCw },
  '/admin/dashboard': { title: 'لوحة القيادة الإدارية', icon: BarChart3 },
  '/admin/monitoring': { title: 'نظام الرصد المركزي', icon: Activity },
  '/admin/system': { title: 'لوحة إدارة النظام المركزية', icon: Settings },
  '/whatsapp-setup': { title: 'ربط الواتساب', icon: MessageSquare },
  '/admin/permissions': { title: 'إدارة الصلاحيات', icon: Lock },
};

export default function Header() {
  const [location] = useLocation();
  const { toast } = useToast();
  const { selectedProjectId, selectedProjectName, selectProject } = useSelectedProject();
  const [syncState, setSyncState] = useState({ isOnline: true, pendingCount: 0 });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    const unsubscribe = subscribeSyncState((state) => {
      setSyncState({
        isOnline: state.isOnline,
        pendingCount: state.pendingCount || 0
      });
    });
    return () => unsubscribe();
  }, []);

  const { isOnline, pendingCount } = syncState;

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: QUERY_KEYS.projects,
    queryFn: async () => {
      try {
        const data = await apiRequest('/api/projects', 'GET');
        return (data?.data || data || []) as Project[];
      } catch (error) {
        return [] as Project[];
      }
    },
  });

  const currentPage = pageInfo[location] || { title: 'AXION SYSTEM', icon: HardHat };
  const PageIcon = currentPage.icon;

  const handleProjectSelect = (projectId: string, projectName: string) => {
    selectProject(projectId, projectName);
    toast({ title: "تم تحديد المشروع", description: projectName });
  };

  const displayProjectName = selectedProjectId === ALL_PROJECTS_ID
    ? ALL_PROJECTS_NAME
    : (selectedProjectName || "اختر مشروعاً");

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center justify-between h-full w-full px-2 sm:px-4" dir="rtl" role="banner" aria-label="شريط الأدوات الرئيسي">

        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary flex-shrink-0" aria-hidden="true">
            <PageIcon className="h-[18px] w-[18px]" aria-hidden="true" />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <h1 className="text-sm font-semibold leading-tight text-foreground truncate">{currentPage.title}</h1>
            <p className="text-[10px] text-muted-foreground font-medium tracking-wider hidden sm:block">AXION</p>
          </div>
        </div>

        <div className="flex-1 min-w-2" />

        <div className="flex items-center gap-1 sm:gap-1.5">

          <Tooltip>
            <TooltipTrigger asChild>
              <div
                role="status"
                aria-live="polite"
                aria-label={isOnline ? `متصل بالشبكة${pendingCount > 0 ? ` - ${pendingCount} عملية معلقة` : ''}` : 'غير متصل بالشبكة'}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-default",
                  isOnline
                    ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                    : "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
                )}
                tabIndex={0}
                data-testid="status-sync"
              >
                {isOnline ? (
                  <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {pendingCount > 0 && (
                  <span className="tabular-nums">{pendingCount}</span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {isOnline ? "متصل بالشبكة" : "غير متصل"}
              {pendingCount > 0 && ` • ${pendingCount} عملية معلقة`}
            </TooltipContent>
          </Tooltip>

          <div className="w-px h-5 bg-border mx-0.5 hidden sm:block" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 sm:px-3 rounded-lg text-xs font-medium max-w-[140px] sm:max-w-[180px]"
                aria-label={`اختيار المشروع: ${displayProjectName}`}
                data-testid="button-project-selector"
              >
                <FolderOpen className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                <span className="truncate hidden sm:inline">{displayProjectName}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 max-h-80">
              <DropdownMenuLabel className="text-right text-xs text-muted-foreground font-medium">اختيار المشروع</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {projectsLoading ? (
                <div className="p-4 text-center text-xs text-muted-foreground">جاري التحميل...</div>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => handleProjectSelect(ALL_PROJECTS_ID, ALL_PROJECTS_NAME)} className="flex justify-between items-center text-right" aria-label={ALL_PROJECTS_NAME}>
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-blue-600" aria-hidden="true" />
                      <span>{ALL_PROJECTS_NAME}</span>
                    </div>
                    {selectedProjectId === ALL_PROJECTS_ID && <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />}
                  </DropdownMenuItem>
                  {projects.map((p) => (
                    <DropdownMenuItem key={p.id} onClick={() => handleProjectSelect(p.id.toString(), p.name)} className="flex justify-between items-center text-right" aria-label={p.name}>
                      <span className="truncate">{p.name}</span>
                      {selectedProjectId === p.id.toString() && <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-5 bg-border mx-0.5 hidden sm:block" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-8 w-8 rounded-lg"
                aria-label={theme === 'light' ? 'تفعيل الوضع الليلي' : 'تفعيل الوضع النهاري'}
                data-testid="button-theme-toggle"
              >
                {theme === 'light' ? (
                  <Moon className="h-[18px] w-[18px] text-muted-foreground" aria-hidden="true" />
                ) : (
                  <Sun className="h-[18px] w-[18px] text-amber-400" aria-hidden="true" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {theme === 'light' ? 'الوضع الليلي' : 'الوضع النهاري'}
            </TooltipContent>
          </Tooltip>

          <NotificationCenter />

        </div>
      </div>
    </TooltipProvider>
  );
}
