import { Bell, UserCircle, HardHat, Settings, Home, Building2, Users, Truck, UserCheck, DollarSign, Calculator, Package, ArrowLeftRight, FileText, CreditCard, FileSpreadsheet, Wrench, LogOut, User, Shield, FolderOpen, CheckCircle2, X, Layers, Activity, Wallet, MessageSquare, Lock, FileBarChart, FileCheck, Cloud, CloudOff, RefreshCw, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { PushTestButton } from "@/components/push-test-button";
import { useAuth } from "@/components/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { useSelectedProject, ALL_PROJECTS_ID, ALL_PROJECTS_NAME } from "@/hooks/use-selected-project";
import { apiRequest } from "@/lib/queryClient";
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
import { SyncStatusHeader } from "@/components/SyncStatusHeader";
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
  '/admin-notifications': { title: 'إشعارات الإدارة', icon: Shield },
  '/ai-chat': { title: 'المساعد الذكي', icon: MessageSquare },
  '/security-policies': { title: 'سياسات الأمان', icon: Lock },
  '/equipment': { title: 'إدارة المعدات', icon: Wrench },
  '/real-reports': { title: 'تقارير حقيقية', icon: FileBarChart },
  '/professional-reports': { title: 'تقارير احترافية', icon: FileCheck },
  '/local-db': { title: 'إدارة قاعدة البيانات المحلية', icon: Database },
};

export default function Header() {
  const [location, setLocation] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { selectedProjectId, selectedProjectName, selectProject, clearProject } = useSelectedProject();
  const [syncState, setSyncState] = useState({ isOnline: true, pendingCount: 0 });

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
    queryKey: ["/api/projects"],
    queryFn: async () => {
      try {
        const data = await apiRequest('/api/projects', 'GET');
        let projectsList = [];
        if (data && typeof data === 'object') {
          if (data.success !== undefined && data.data !== undefined) {
            projectsList = Array.isArray(data.data) ? data.data : [];
          } else if (Array.isArray(data)) {
            projectsList = data;
          } else if (data.id) {
            projectsList = [data];
          }
        }
        return projectsList as Project[];
      } catch (error) {
        console.error('خطأ في جلب المشاريع:', error);
        return [] as Project[];
      }
    },
    staleTime: 300000,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const currentPage = pageInfo[location] || { title: 'إدارة المشاريع الإنشائية', icon: HardHat };
  const PageIcon = currentPage.icon;

  const handleProjectSelect = (projectId: string, projectName: string) => {
    selectProject(projectId, projectName);
    toast({
      title: "تم تحديد المشروع",
      description: `المشروع: ${projectName}`,
    });
  };

  const handleClearProject = () => {
    clearProject();
    toast({
      title: "تم إلغاء تحديد المشروع",
      description: "يرجى اختيار مشروع جديد",
    });
  };

  return (
    <header className="bg-primary text-primary-foreground shadow-sm h-14 md:h-16 flex-shrink-0 sticky top-0 z-[100] safe-area-inset-top">
      <div className="px-4 h-full">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-1.5 rounded-lg">
              <PageIcon className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-sm md:text-base font-bold leading-tight">{currentPage.title}</h1>
              <p className="text-[10px] opacity-80 font-medium">مشروعي - إدارة المشاريع</p>
            </div>
          </div>
          <div className="flex items-center space-x-reverse space-x-1 md:space-x-2">
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-2 rounded-full hover:bg-primary/80 relative"
                  title={selectedProjectName || "اختيار المشروع"}
                >
                  <FolderOpen className="h-4 w-4 md:h-5 md:w-5" />
                  {selectedProjectId && (
                    <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-2.5 h-2.5 border-2 border-primary" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    اختيار المشروع
                  </span>
                  {selectedProjectId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleClearProject();
                      }}
                      title="إلغاء تحديد المشروع"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {selectedProjectName && (
                  <>
                    <div className={`px-2 py-1.5 rounded mx-1 mb-1 ${selectedProjectId === ALL_PROJECTS_ID ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-primary/10'}`}>
                      <p className="text-xs text-muted-foreground">المشروع الحالي:</p>
                      <p className={`text-sm font-medium truncate ${selectedProjectId === ALL_PROJECTS_ID ? 'text-blue-700 dark:text-blue-300' : 'text-primary'}`}>
                        {selectedProjectId === ALL_PROJECTS_ID ? ALL_PROJECTS_NAME : selectedProjectName}
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                {projectsLoading ? (
                  <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                    جاري التحميل...
                  </div>
                ) : (
                  <>
                    <DropdownMenuItem
                      key={ALL_PROJECTS_ID}
                      className="cursor-pointer flex items-center justify-between gap-2 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 mb-1"
                      onClick={() => handleProjectSelect(ALL_PROJECTS_ID, ALL_PROJECTS_NAME)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Layers className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                        <span className="truncate font-medium text-blue-700 dark:text-blue-300">{ALL_PROJECTS_NAME}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Badge 
                          variant="default"
                          className="text-[10px] px-1.5 py-0 bg-blue-500"
                        >
                          الكل
                        </Badge>
                        {selectedProjectId === ALL_PROJECTS_ID && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </DropdownMenuItem>
                    
                    {projects.length === 0 ? (
                      <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                        لا توجد مشاريع
                      </div>
                    ) : (
                      projects.map((project) => (
                        <DropdownMenuItem
                          key={project.id}
                          className="cursor-pointer flex items-center justify-between gap-2 py-2"
                          onClick={() => handleProjectSelect(project.id, project.name)}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            <span className="truncate">{project.name}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Badge 
                              variant={project.status === 'active' ? 'default' : 'secondary'}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {project.status === 'active' ? 'نشط' : 'مكتمل'}
                            </Badge>
                            {selectedProjectId === project.id && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2 rounded-full hover:bg-primary/80"
              onClick={() => setLocation('/settings')}
              title="إعدادات النظام"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <NotificationCenter />
            <SyncStatusHeader />
            
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 mx-1">
              {isOnline ? (
                <Cloud className="h-4 w-4 text-green-300" />
              ) : (
                <CloudOff className="h-4 w-4 text-yellow-300" />
              )}
              {pendingCount > 0 && (
                <div className="flex items-center gap-1 border-r border-white/20 pr-1 mr-1">
                  <RefreshCw className="h-3 w-3 animate-spin text-white" />
                  <span className="text-[10px] font-bold text-white">{pendingCount}</span>
                </div>
              )}
            </div>

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-2 rounded-full hover:bg-primary/80 relative"
                    data-testid="user-menu-trigger"
                  >
                    <UserCircle className="h-5 w-5" />
                    {user && (
                      <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-3 h-3 border-2 border-primary" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2 text-sm">
                    <div className="font-medium text-foreground">
                      {user?.name || 'المستخدم'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user?.email}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="inline-flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        {user?.role === 'admin' ? 'مدير النظام' : 'عضو مفعل'}
                      </span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setLocation('/profile')}
                    className="cursor-pointer"
                    data-testid="menu-profile"
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>الملف الشخصي</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setLocation('/settings')}
                    className="cursor-pointer"
                    data-testid="menu-settings"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>الإعدادات</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={async () => {
                      setIsLoggingOut(true);
                      try {
                        await logout();
                        toast({
                          title: "تم تسجيل الخروج بنجاح",
                          description: "شكراً لاستخدام النظام",
                        });
                        setLocation('/login');
                      } catch (error) {
                        toast({
                          title: "خطأ في تسجيل الخروج",
                          description: "حدث خطأ أثناء تسجيل الخروج",
                          variant: "destructive",
                        });
                      } finally {
                        setIsLoggingOut(false);
                      }
                    }}
                    className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/50"
                    disabled={isLoggingOut}
                    data-testid="menu-logout"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{isLoggingOut ? 'جارِ تسجيل الخروج...' : 'تسجيل الخروج'}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-2 rounded-full hover:bg-primary/80"
                onClick={() => setLocation('/login')}
                data-testid="login-button"
              >
                <UserCircle className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
