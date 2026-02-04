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
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import EmailVerificationPage from "./pages/EmailVerificationPage";
import { useWebSocketSync } from "./hooks/useWebSocketSync";

import WorkerAttendance from "./pages/worker-attendance";
import DeploymentConsole from "./pages/deployment-console";

import MaterialPurchase from "./pages/material-purchase";
import TransportManagement from "./pages/transport-management";
import ProjectTransfers from "./pages/project-transfers";
import ProjectTransactionsPage from "./pages/project-transactions-simple";
import ProjectFundCustody from "./pages/project-fund-custody";

import ProjectsPage from "./pages/projects";
import DashboardPage from "./pages/dashboard";
import WorkersPage from "./pages/workers";
import BackupManager from "./pages/backup-manager";
import NotificationsPage from "./pages/notifications";
import DailyExpenses from "./pages/daily-expenses";
import WellsPage from "./pages/wells";
import WellCostReport from "./pages/well-cost-report";
import WellAccounting from "./pages/well-accounting";
import DataHealthPage from "./pages/DataHealthPage";
import DatabaseManager from "./pages/DatabaseManager";

import { LayoutShell } from "./components/layout/layout-shell";
import { FloatingButtonProvider } from "./components/layout/floating-button-context";
import { AuthProvider } from "./components/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AdminRoute } from "./components/AdminRoute";
import EmailVerificationGuard from "./components/EmailVerificationGuard";
import { SelectedProjectProvider } from "./contexts/SelectedProjectContext";
import { Loader2 } from "lucide-react";
import { initSyncListener, subscribeSyncState, loadFullBackup, performInitialDataPull } from "./offline/sync";
import { initializeDB } from "./offline/db";
import { SyncStatusIndicator } from "./components/sync-status";
import { EnvironmentBadge } from "./components/layout/EnvironmentBadge";

const WorkerAccountsPage = lazy(() => import("./pages/worker-accounts"));
const SuppliersProPage = lazy(() => import("./pages/suppliers-professional"));
const CustomersPage = lazy(() => import("./pages/customers"));
const SupplierAccountsPage = lazy(() => import("./pages/supplier-accounts"));
const AutocompleteAdminPage = lazy(() => import("./pages/autocomplete-admin"));
const EquipmentManagement = lazy(() => import("./pages/equipment-management").then(m => ({ default: m.EquipmentManagement })));
const AdminNotificationsPage = lazy(() => import("./pages/admin-notifications"));
const SmartErrorsPage = lazy(() => import("./pages/SmartErrorsPage"));
const SecurityPoliciesPage = lazy(() => import("./pages/SecurityPoliciesPage").then(m => ({ default: m.SecurityPoliciesPage })));
const Reports = lazy(() => import("./pages/axion-reports"));
const SettingsPage = lazy(() => import("./pages/settings"));
const UsersManagementPage = lazy(() => import("./pages/users-management"));
const AIChatPage = lazy(() => import("./pages/ai-chat"));
const SyncComparisonPage = lazy(() => import("./pages/sync-comparison"));


function PageLoader() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md gap-4">
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

import { initializeStorage } from './offline/storage-factory';
import { startPerformanceMonitoring } from './offline/performance-monitor';

// تهيئة قاعدة البيانات ونظام المراقبة عند بدء التطبيق
initializeStorage().catch(console.error);
startPerformanceMonitoring(30000); // مراقبة كل 30 ثانية

const AdminMonitoring = lazy(() => import("./pages/admin-monitoring"));

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
            // تحديث جميع الكاش لإعادة تحميل البيانات مع تجنب التكرار غير الضروري
            requestAnimationFrame(() => {
              try {
                queryClient.invalidateQueries();
              } catch (err) {
                console.error('❌ خطأ في تحديث البيانات:', err);
              }
            });
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
      <Route path="/" component={DashboardPage} />
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
      <Route path="/customers">
        <Suspense fallback={<PageLoader />}>
          <CustomersPage />
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
      <Route path="/transport-management" component={TransportManagement} />
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
      <Route path="/admin/backups">
        <AdminRoute>
          <BackupManager />
        </AdminRoute>
      </Route>
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
          <Reports />
        </Suspense>
      </Route>
      <Route path="/axion-reports">
        <Suspense fallback={<PageLoader />}>
          <Reports />
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
      <Route path="/admin/monitoring">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <AdminMonitoring />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route path="/sync-comparison">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <SyncComparisonPage />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route path="/admin/data-health">
        <AdminRoute>
          <DataHealthPage />
        </AdminRoute>
      </Route>
      <Route path="/local-db">
        <AdminRoute>
          <DatabaseManager />
        </AdminRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

import { initializeNativePush, requestAllPermissions } from "./services/capacitorPush";
import { Capacitor } from "@capacitor/core";

import SystemCheckPage from "./pages/SystemCheckPage";

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
                    <Route path="/check" component={SystemCheckPage} />
                    <Route path="/setup" component={SystemCheckPage} />
                    <Route path="/permissions" component={SystemCheckPage} />
                    <Route path="/login" component={LoginPage} />
                    <Route path="/register" component={RegisterPage} />
                    <Route path="/verify-email" component={EmailVerificationPage} />
                    <Route path="/forgot-password" component={ForgotPasswordPage} />
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