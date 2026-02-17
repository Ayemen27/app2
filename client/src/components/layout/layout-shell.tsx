import React, { useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import Header from "./header";
import BottomNavigation from "./bottom-navigation";
import FloatingAddButton from "./floating-add-button";
import { EnvironmentBadge } from "./EnvironmentBadge";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { SyncProgressTracker } from "@/components/ui/sync-progress-tracker";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { PullToRefreshIndicator } from "@/components/ui/pull-to-refresh";
import { useToast } from "@/hooks/use-toast";
import { PULL_REFRESH_CONFIG } from "@/constants/pullRefreshConfig";

interface LayoutShellProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showNav?: boolean;
  showFloatingButton?: boolean;
}

export function LayoutShell({ 
  children, 
  showHeader = true, 
  showNav = true,
  showFloatingButton = true 
}: LayoutShellProps) {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mainRef = useRef<HTMLElement | null>(null);
  
  const pagesWithCustomHeader = ['/ai-chat', '/admin/data-health'];
  const isCustomHeaderPage = pagesWithCustomHeader.some(page => location === page);
  
  const pagesWithoutNav: string[] = [];
  const hideNav = pagesWithoutNav.some(page => location === page);

  const pageConfig = PULL_REFRESH_CONFIG[location];
  const pullEnabled = !!pageConfig;

  const handleRefresh = useCallback(async () => {
    if (!pageConfig) return;

    try {
      const refetchPromises = pageConfig.queryKeys.map((key) =>
        queryClient.refetchQueries({ queryKey: key, type: "active" })
      );
      await Promise.all(refetchPromises);
    } catch {
      toast({
        title: "فشل التحديث",
        description: "تعذر تحديث البيانات. تحقق من اتصالك بالإنترنت.",
        variant: "destructive",
        duration: 3000,
      });
      throw new Error("refresh failed");
    }
  }, [pageConfig, queryClient, toast]);

  const { pullDistance, isRefreshing, progress } = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: pullEnabled,
    threshold: 70,
    maxPull: 130,
    minSpinnerTime: 600,
    scrollRef: mainRef,
  });

  const sidebarStyle = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  };

    return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <SyncProgressTracker />
      <div className="flex h-[100dvh] w-full bg-background overflow-hidden" dir="rtl">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 h-full overflow-hidden relative">
          <div className="layout-shell flex flex-col h-full overflow-hidden relative">
            {showHeader && !isCustomHeaderPage && (
              <header className="layout-header flex-shrink-0 w-full border-b bg-white dark:bg-slate-900 shadow-sm relative z-30">
                <div className="flex h-[60px] items-center px-4 gap-4">
                  <SidebarTrigger className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" />
                  <div className="flex-1 overflow-hidden text-slate-900 dark:text-white flex items-center justify-between">
                    <Header />
                    {/* EnvironmentBadge removed */}
                  </div>
                </div>
              </header>
            )}
            
            <main
              ref={mainRef}
              className="layout-main flex-1 overflow-y-auto overflow-x-hidden relative scrolling-touch pb-[calc(72px+env(safe-area-inset-bottom,0px)+16px)] md:pb-0"
            >
              {pullEnabled && (
                <PullToRefreshIndicator
                  pullDistance={pullDistance}
                  isRefreshing={isRefreshing}
                  progress={progress}
                />
              )}
              <div className={isCustomHeaderPage ? "h-full" : "layout-content p-4 md:p-6 max-w-7xl mx-auto w-full"}>
                {children}
              </div>
            </main>
            
            {showNav && !hideNav && (
              <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-8px_20px_rgba(0,0,0,0.1)] flex items-center justify-center pointer-events-auto">
                <div className="w-full h-[72px] flex items-center justify-center">
                  <BottomNavigation />
                </div>
              </div>
            )}
            
            {showFloatingButton && !isCustomHeaderPage && (
              <div className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-40">
                <FloatingAddButton />
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default LayoutShell;
