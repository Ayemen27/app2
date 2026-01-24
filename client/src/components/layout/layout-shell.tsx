import React from "react";
import { useLocation } from "wouter";
import Header from "./header";
import BottomNavigation from "./bottom-navigation";
import FloatingAddButton from "./floating-add-button";
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
        <SidebarInset className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="layout-shell flex flex-col h-full relative overflow-hidden">
            {showHeader && !isCustomHeaderPage && (
              <header className="layout-header flex-shrink-0 w-full border-b bg-white dark:bg-slate-900 shadow-sm relative z-30">
                <div className="flex h-[60px] items-center px-4 gap-4">
                  <SidebarTrigger className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" />
                  <div className="flex-1 overflow-hidden text-slate-900 dark:text-white">
                    <Header />
                  </div>
                </div>
              </header>
            )}
            
            <main className="layout-main flex-1 overflow-y-auto relative overscroll-none pb-40 md:pb-12">
              <div className={isCustomHeaderPage ? "h-full" : "layout-content p-4 md:p-6 max-w-7xl mx-auto w-full"}>
                {children}
              </div>
            </main>
            
            {showNav && !hideNav && (
              <nav className="layout-nav flex-shrink-0 fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 pb-[env(safe-area-inset-bottom,12px)] h-[calc(64px+env(safe-area-inset-bottom,12px))] overflow-hidden flex items-center md:hidden pointer-events-auto">
                <div className="w-full">
                  <BottomNavigation />
                </div>
              </nav>
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
