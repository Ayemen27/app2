import { Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import Workers from "@/pages/workers";
import WorkerAttendance from "@/pages/worker-attendance";
import DailyExpenses from "@/pages/daily-expenses";
import MaterialPurchase from "@/pages/material-purchase";
import EquipmentManagement from "@/pages/equipment-management";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/LoginPage";
import { FloatingButtonProvider } from "@/components/layout/floating-button-context";
import { SelectedProjectProvider } from "@/hooks/use-selected-project";
import { AuthProvider } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Header from "@/components/layout/header";
import BottomNavigation from "@/components/layout/bottom-navigation";
import FloatingAddButton from "@/components/layout/floating-add-button";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SelectedProjectProvider>
          <FloatingButtonProvider>
            <div className="min-h-screen bg-background text-foreground" dir="rtl">
              {/* مسارات عامة - غير محمية */}
              <Route path="/login" component={LoginPage} />
              
              {/* مسارات محمية */}
              <ProtectedRoute>
                <div className="flex flex-col min-h-screen">
                  {/* الشريط العلوي */}
                  <Header />
                  
                  {/* المحتوى الرئيسي */}
                  <main className="flex-1 pb-16">
                    <Route path="/" component={Dashboard} />
                    <Route path="/dashboard" component={Dashboard} />
                    <Route path="/projects" component={Projects} />
                    <Route path="/workers" component={Workers} />
                    <Route path="/worker-attendance" component={WorkerAttendance} />
                    <Route path="/daily-expenses" component={DailyExpenses} />
                    <Route path="/material-purchase" component={MaterialPurchase} />
                    <Route path="/equipment-management" component={EquipmentManagement} />
                    <Route path="/reports" component={Reports} />
                    <Route component={NotFound} />
                  </main>
                  
                  {/* الشريط السفلي */}
                  <BottomNavigation />
                  
                  {/* الزر العائم */}
                  <FloatingAddButton />
                </div>
              </ProtectedRoute>
              <Toaster />
            </div>
          </FloatingButtonProvider>
        </SelectedProjectProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}