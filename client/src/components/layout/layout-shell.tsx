import React from "react";
import { useLocation } from "wouter";
import Header from "./header";
import BottomNavigation from "./bottom-navigation";
import FloatingAddButton from "./floating-add-button";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

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
  const pagesWithCustomHeader = ['/ai-chat'];
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
      <div className="flex min-h-svh w-full bg-background" dir="rtl">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="layout-shell flex flex-col h-full relative">
            {showHeader && !isCustomHeaderPage && (
              <header className="layout-header sticky top-0 z-50 w-full border-b bg-primary text-primary-foreground shadow-sm">
                <div className="flex h-[60px] items-center px-4 gap-4">
                  <SidebarTrigger className="text-white hover:bg-white/10" />
                  <div className="flex-1 overflow-hidden">
                    <Header />
                  </div>
                </div>
              </header>
            )}
            
            <main className="layout-main flex-1 overflow-y-auto">
              <div className={isCustomHeaderPage ? "h-full" : "layout-content pb-24 md:pb-6 p-4 md:p-6 max-w-7xl mx-auto w-full"}>
                {children}
              </div>
            </main>
            
            {showNav && !hideNav && (
              <div className="md:hidden">
                <nav className="layout-nav fixed bottom-0 left-0 right-0 z-50">
                  <BottomNavigation />
                </nav>
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
