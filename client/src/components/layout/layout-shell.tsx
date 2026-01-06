import React from "react";
import { useLocation } from "wouter";
import Header from "./header";
import BottomNavigation from "./bottom-navigation";
import FloatingAddButton from "./floating-add-button";

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

  return (
    <div className="layout-shell overflow-hidden">
      {showHeader && !isCustomHeaderPage && (
        <header className="layout-header border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
          <Header />
        </header>
      )}
      
      <main className="layout-main">
        <div className={isCustomHeaderPage ? "h-full" : "layout-content pb-20"}>
          {children}
        </div>
      </main>
      
      {showNav && !hideNav && (
        <nav className="layout-nav">
          <BottomNavigation />
        </nav>
      )}
      
      {showFloatingButton && !isCustomHeaderPage && <FloatingAddButton />}
    </div>
  );
}

export default LayoutShell;
