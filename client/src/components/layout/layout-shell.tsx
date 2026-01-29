import React from "react";
import { useLocation } from "wouter";
import Header from "./header";
import BottomNavigation from "./bottom-navigation";
import FloatingAddButton from "./floating-add-button";
import { EnvironmentBadge } from "./EnvironmentBadge";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { SyncProgressTracker } from "@/components/ui/sync-progress-tracker";

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
  
  // الصفحات التي تحتوي على شريط خاص بها وتحتاج إلى إخفاء الشريط العام
  const pagesWithCustomHeader = ['/ai-chat', '/admin/data-health'];
  const isCustomHeaderPage = pagesWithCustomHeader.some(page => location === page);
  
  // الصفحات التي تحتاج إلى إخفاء شريط التنقل السفلي
  const pagesWithoutNav: string[] = [];
  const hideNav = pagesWithoutNav.some(page => location === page);

  const sidebarStyle = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <SyncProgressTracker />
      <div className="flex min-h-svh w-full bg-background" dir="rtl">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 h-screen overflow-hidden">
          <div className="layout-shell flex flex-col h-full overflow-hidden relative">
            {showHeader && !isCustomHeaderPage && (
              <header className="layout-header flex-shrink-0 w-full border-b bg-white dark:bg-slate-900 shadow-sm relative z-30">
                <div className="flex h-[60px] items-center px-4 gap-4">
                  <SidebarTrigger className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" />
                  <div className="flex-1 overflow-hidden text-slate-900 dark:text-white flex items-center justify-between">
                    <Header />
                    <div className="flex items-center gap-2">
                      <EnvironmentBadge />
                    </div>
                  </div>
                </div>
              </header>
            )}
            
            <main className="layout-main flex-1 overflow-y-auto overflow-x-hidden relative scrolling-touch overscroll-none">
              <div className={isCustomHeaderPage ? "h-full" : "layout-content p-4 md:p-6 max-w-7xl mx-auto w-full"}>
                {children}
                {!isCustomHeaderPage && <div className="h-[120px] w-full" aria-hidden="true" />}
              </div>
            </main>
            
            <div className="md:hidden h-[84px] w-full flex-shrink-0" />
            
            {showNav && !hideNav && (
              <div className="md:hidden fixed bottom-0 left-0 right-0 z-[10000] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 h-[84px] pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-8px_20px_rgba(0,0,0,0.1)] flex items-center justify-center pointer-events-auto">
                <div className="w-full h-full flex flex-col justify-center">
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
