import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import React, { Suspense, lazy, useEffect } from "react";

// Add ResizeObserver polyfill/fix to prevent loop errors
if (typeof window !== 'undefined') {
  const RO = window.ResizeObserver;
  window.ResizeObserver = class ResizeObserver extends RO {
    constructor(callback: ResizeObserverCallback) {
      super((entries, observer) => {
        window.requestAnimationFrame(() => {
          if (!Array.isArray(entries) || !entries.length) return;
          callback(entries, observer);
        });
      });
    }
  };
}
import NotFound from "./pages/not-found";
import Dashboard from "./pages/dashboard";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import EmailVerificationPage from "./pages/EmailVerificationPage";
import { useWebSocketSync } from "./hooks/useWebSocketSync";

import WorkerAttendance from "./pages/worker-attendance";
import DeploymentConsole from "./pages/deployment-console";

import MaterialPurchase from "./pages/material-purchase";
import ProjectTransfers from "./pages/project-transfers";
import ProjectTransactionsPage from "./pages/project-transactions-simple";
import ProjectFundCustody from "./pages/project-fund-custody";

import ProjectsPage from "./pages/projects";
import WorkersPage from "./pages/workers";
import NotificationsPage from "./pages/notifications";
import DailyExpenses from "./pages/daily-expenses";
import WellsPage from "./pages/wells";
import WellCostReport from "./pages/well-cost-report";
import WellAccounting from "./pages/well-accounting";

import { LayoutShell } from "./components/layout/layout-shell";
import { FloatingButtonProvider } from "./components/layout/floating-button-context";
import { AuthProvider } from "./components/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AdminRoute } from "./components/AdminRoute";
import EmailVerificationGuard from "./components/EmailVerificationGuard";
import { SelectedProjectProvider } from "./contexts/SelectedProjectContext";
import { Loader2 } from "lucide-react";
import { initSyncListener, subscribeSyncState } from "./offline/sync";
import { initializeDB } from "./offline/db";
import { SyncStatusIndicator } from "./components/sync-status";

const WorkerAccountsPage = lazy(() => import("./pages/worker-accounts"));
const SuppliersProPage = lazy(() => import("./pages/suppliers-professional"));
const SupplierAccountsPage = lazy(() => import("./pages/supplier-accounts"));
const AutocompleteAdminPage = lazy(() => import("./pages/autocomplete-admin"));
const EquipmentManagement = lazy(() => import("./pages/equipment-management").then(m => ({ default: m.EquipmentManagement })));
const AdminNotificationsPage = lazy(() => import("./pages/admin-notifications"));
const SmartErrorsPage = lazy(() => import("./pages/SmartErrorsPage"));
const SecurityPoliciesPage = lazy(() => import("./pages/SecurityPoliciesPage").then(m => ({ default: m.SecurityPoliciesPage })));
const Reports = lazy(() => import("./pages/reports"));
const SettingsPage = lazy(() => import("./pages/settings"));
const RealReports = lazy(() => import("./pages/real-reports"));
const ProfessionalReports = lazy(() => import("./pages/professional-reports"));
const UsersManagementPage = lazy(() => import("./pages/users-management"));
const AIChatPage = lazy(() => import("./pages/ai-chat"));


function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="relative">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse" />
        </div>
      </div>
      <p className="text-sm font-medium text-slate-500 animate-pulse">جاري تحميل البيانات...</p>
    </div>
  );
}

function Router() {
  useWebSocketSync();

  // ✅ تفعيل نظام المزامنة الذكي عند تحميل التطبيق
  useEffect(() => {
    const initSync = async () => {
      try {
        // تهيئة قاعدة البيانات المحلية
        await initializeDB();
        console.log('✅ تم تهيئة قاعدة البيانات المحلية');

        // تفعيل مراقب الاتصال والمزامنة التلقائية
        initSyncListener();
        console.log('✅ تم تفعيل نظام المزامنة الذكي');

        // الاستماع لتغييرات حالة المزامنة
        const unsubscribe = subscribeSyncState((state) => {
          if (!state.isSyncing && state.lastSync > 0 && state.pendingCount === 0) {
            // عندما تنتهي المزامنة بنجاح، أعد تحميل البيانات
            console.log('🔄 [Sync] انتهت المزامنة بنجاح - إعادة تحميل البيانات...');
            // تحديث جميع الكاش لإعادة تحميل البيانات
            queryClient.invalidateQueries();
          }
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('❌ خطأ في تهيئة نظام المزامنة:', error);
      }
    };
    
    initSync();
  }, []);

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/deployment" component={DeploymentConsole} />
      <Route path="/projects" component={ProjectsPage} />
      <Route path="/workers" component={WorkersPage} />
      <Route path="/worker-accounts">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <WorkerAccountsPage />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route path="/suppliers-pro">
        <Suspense fallback={<PageLoader />}>
          <SuppliersProPage />
        </Suspense>
      </Route>
      <Route path="/supplier-accounts">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <SupplierAccountsPage />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route path="/worker-attendance" component={WorkerAttendance} />
      <Route path="/material-purchase" component={MaterialPurchase} />
      <Route path="/project-transfers">
        <AdminRoute>
          <ProjectTransfers />
        </AdminRoute>
      </Route>
      <Route path="/project-transactions">
        <AdminRoute>
          <ProjectTransactionsPage />
        </AdminRoute>
      </Route>
      <Route path="/project-fund-custody">
        <AdminRoute>
          <ProjectFundCustody />
        </AdminRoute>
      </Route>
      <Route path="/autocomplete-admin">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <AutocompleteAdminPage />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route path="/equipment">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <EquipmentManagement />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/admin-notifications">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <AdminNotificationsPage />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route path="/smart-errors">
        <Suspense fallback={<PageLoader />}>
          <SmartErrorsPage />
        </Suspense>
      </Route>
      <Route path="/security-policies">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <SecurityPoliciesPage />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route path="/daily-expenses" component={DailyExpenses} />
      <Route path="/wells" component={WellsPage} />
      <Route path="/settings">
        <Suspense fallback={<PageLoader />}>
          <SettingsPage />
        </Suspense>
      </Route>
      <Route path="/well-cost-report" component={WellCostReport} />
      <Route path="/well-accounting" component={WellAccounting} />
      <Route path="/reports">
        <Suspense fallback={<PageLoader />}>
          <Reports />
        </Suspense>
      </Route>
      <Route path="/real-reports">
        <Suspense fallback={<PageLoader />}>
          <RealReports />
        </Suspense>
      </Route>
      <Route path="/professional-reports">
        <Suspense fallback={<PageLoader />}>
          <ProfessionalReports />
        </Suspense>
      </Route>
      <Route path="/users-management">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <UsersManagementPage />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route path="/ai-chat">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <AIChatPage />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <FloatingButtonProvider>
              <div dir="rtl">
                <ErrorBoundary>
                  <Switch>
                    <Route path="/login" component={LoginPage} />
                    <Route path="/verify-email" component={EmailVerificationPage} />
                    <Route path="/reset-password" component={ResetPasswordPage} />
                    <Route path="*" component={() => (
                      <ProtectedRoute>
                        <EmailVerificationGuard>
                          <SelectedProjectProvider>
                            <LayoutShell>
                              <Router />
                            </LayoutShell>
                          </SelectedProjectProvider>
                        </EmailVerificationGuard>
                      </ProtectedRoute>
                    )} />
                  </Switch>
                </ErrorBoundary>
                <Toaster />
              </div>
            </FloatingButtonProvider>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;