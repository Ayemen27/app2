import React from "react";
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
  return (
    <div className="layout-shell">
      {showHeader && (
        <header className="layout-header">
          <Header />
        </header>
      )}
      
      <main className="layout-main">
        <div className="layout-content pb-24">
          {children}
        </div>
      </main>
      
      {showNav && (
        <nav className="layout-nav">
          <BottomNavigation />
        </nav>
      )}
      
      {showFloatingButton && <FloatingAddButton />}
    </div>
  );
}

export default LayoutShell;
