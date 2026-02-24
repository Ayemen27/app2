import { Bell, UserCircle, HardHat, Settings, Home, Building2, Users, Truck, UserCheck, DollarSign, Calculator, Package, ArrowLeftRight, FileText, CreditCard, FileSpreadsheet, Wrench, LogOut, User, Shield, FolderOpen, CheckCircle2, X, Layers, Activity, Wallet, MessageSquare, Lock, FileBarChart, Cloud, CloudOff, RefreshCw, Database, Sun, Moon, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useAuth } from "@/components/AuthProvider";
import { usePush } from "@/hooks/usePush";
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
import { Badge } from "@/components/ui/badge";
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
  '/deployment': { title: 'لوحة البناء والنشر التلقائي', icon: Activity },
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
};

export default function Header() {
  const [location] = useLocation();
  const { toast } = useToast();
  const { selectedProjectId, selectedProjectName, selectProject } = useSelectedProject();
  const [syncState, setSyncState] = useState({ isOnline: true, pendingCount: 0 });
  const { isPermissionGranted, requestPushPermission, isInitializing } = usePush();
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

  const handlePushToggle = async () => {
    if (isPermissionGranted) {
      toast({ title: "الإشعارات مفعّلة", description: "لقد منحت الإذن مسبقاً." });
      return;
    }
    await requestPushPermission();
  };

  return (
    <div className="flex items-center justify-between h-full w-full px-4" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
          <PageIcon className="h-5 w-5" />
        </div>
        <div className="flex flex-col justify-center text-right">
          <h1 className="text-sm font-bold leading-tight text-slate-900 dark:text-white">{currentPage.title}</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">AXION SYSTEM</p>
        </div>
      </div>

      <div className="flex-1" />
      
      <div className="flex items-center gap-2">
        <NotificationCenter />
        
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50"
          title={theme === 'light' ? 'الوضع الليلي' : 'الوضع النهاري'}
          data-testid="button-theme-toggle"
        >
          {theme === 'light' ? (
            <Moon className="h-4 w-4 text-slate-700" />
          ) : (
            <Sun className="h-4 w-4 text-amber-400" />
          )}
        </Button>

        {/* AIChatTrigger removed per user request */}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50"
              title={selectedProjectId ? (selectedProjectId === ALL_PROJECTS_ID ? ALL_PROJECTS_NAME : selectedProjectName) : "اختر مشروعاً"}
              data-testid="button-project-selector"
            >
              <FolderOpen className="h-4 w-4 text-primary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 max-h-80" dir="rtl">
            <DropdownMenuLabel className="text-right">اختيار المشروع</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {projectsLoading ? (
              <div className="p-4 text-center text-xs">جاري التحميل...</div>
            ) : (
              <>
                <DropdownMenuItem onClick={() => handleProjectSelect(ALL_PROJECTS_ID, ALL_PROJECTS_NAME)} className="flex justify-between items-center text-right">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-blue-600" />
                    <span>{ALL_PROJECTS_NAME}</span>
                  </div>
                  {selectedProjectId === ALL_PROJECTS_ID && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                </DropdownMenuItem>
                {projects.map((p) => (
                  <DropdownMenuItem key={p.id} onClick={() => handleProjectSelect(p.id.toString(), p.name)} className="flex justify-between items-center text-right">
                    <span>{p.name}</span>
                    {selectedProjectId === p.id.toString() && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
