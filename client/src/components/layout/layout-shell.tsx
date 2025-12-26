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
    <div className="layout-shell">
      {showHeader && !isCustomHeaderPage && (
        <header className="layout-header">
          <Header />
        </header>
      )}
      
      <main className="layout-main">
        <div className={isCustomHeaderPage ? "" : "layout-content pb-24"}>
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
