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
import { useWebSocketSync } from "./hooks/useWebSocketSync";

const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const EmailVerificationPage = lazy(() => import("./pages/EmailVerificationPage"));

const WorkerAttendance = lazy(() => import("./pages/worker-attendance"));
const DeploymentConsole = lazy(() => import("./pages/deployment-console"));

const MaterialPurchase = lazy(() => import("./pages/material-purchase"));
const TransportManagement = lazy(() => import("./pages/transport-management"));
const ProjectTransfers = lazy(() => import("./pages/project-transfers"));
const ProjectTransactionsPage = lazy(() => import("./pages/project-transactions-simple"));
const ProjectFundCustody = lazy(() => import("./pages/project-fund-custody"));

const ProjectsPage = lazy(() => import("./pages/projects"));
const DashboardPage = lazy(() => import("./pages/dashboard"));
const AnalysisDashboard = lazy(() => import("./pages/system/AnalysisDashboard"));
const WorkersPage = lazy(() => import("./pages/workers"));
const BackupManager = lazy(() => import("./pages/backup-manager"));
const NotificationsPage = lazy(() => import("./pages/notifications"));
const DailyExpenses = lazy(() => import("./pages/daily-expenses"));
const RecordsTransfer = lazy(() => import("./pages/records-transfer"));
const WellsPage = lazy(() => import("./pages/wells"));
const WellCostReport = lazy(() => import("./pages/well-cost-report"));
const WellAccounting = lazy(() => import("./pages/well-accounting"));
const DataHealthPage = lazy(() => import("./pages/DataHealthPage"));
const DatabaseManager = lazy(() => import("./pages/DatabaseManager"));

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
import { initSilentSyncObserver } from "./offline/silent-sync";
import { initAuditLog } from "./offline/local-audit";
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
const WhatsAppSetupPage = lazy(() => import("./pages/whatsapp/index"));
const SyncComparisonPage = lazy(() => import("./pages/sync-comparison"));
const PermissionManagementPage = lazy(() => import("./pages/permission-management"));


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
// import { startPerformanceMonitoring } from './offline/performance-monitor';

// تهيئة قاعدة البيانات ونظام المراقبة عند بدء التطبيق
initializeStorage().catch(console.error);
import { intelligentMonitor } from './offline/intelligent-monitor';
intelligentMonitor.initialize().catch(console.error);
// startPerformanceMonitoring(30000); // مراقبة كل 30 ثانية

const AdminMonitoring = lazy(() => import("./pages/admin-monitoring"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));

function Router() {
  useWebSocketSync();

  // ✅ تفعيل نظام المزامنة الذكي عند تحميل التطبيق
  useEffect(() => {
    const initSync = async () => {
      try {
        // تهيئة قاعدة البيانات المحلية
        await initializeDB();
        console.log('✅ تم تهيئة قاعدة البيانات المحلية');

        // طلب الصلاحيات على المنصات الأصلية (أندرويد/iOS)
        if (Capacitor.isNativePlatform()) {
          try {
            const perm = await PushNotifications.checkPermissions();
            if (perm.receive === 'prompt') {
              await PushNotifications.requestPermissions();
            }
            console.log('✅ تم فحص وطلب صلاحيات الإشعارات');
          } catch (e) {
            console.error('❌ خطأ في طلب الصلاحيات:', e);
          }
        }

        initSyncListener();
        initSilentSyncObserver(30000);
        initAuditLog().catch(err => console.warn('[AuditLog] Init failed:', err));
        console.log('✅ تم تفعيل نظام المزامنة الذكي مع المزامنة الصامتة');

        // الاستماع لتغييرات حالة المزامنة
        const unsubscribe = subscribeSyncState((state) => {
          if (!state.isSyncing && state.lastSync > 0 && state.pendingCount === 0) {
            // عندما تنتهي المزامنة بنجاح، أعد تحميل البيانات
            console.log('🔄 [Sync] انتهت المزامنة بنجاح - إعادة تحميل البيانات...');
            requestAnimationFrame(() => {
              try {
                const coreKeys = [
                  ["/api/projects"],
                  ["/api/projects/with-stats"],
                  ["/api/workers"],
                  ["/api/materials"],
                  ["/api/suppliers"],
                  ["/api/notifications"],
                ];
                coreKeys.forEach(key =>
                  queryClient.invalidateQueries({ queryKey: key, refetchType: 'active', exact: false })
                );
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
      <Route path="/">
        <Suspense fallback={<PageLoader />}>
          <DashboardPage />
        </Suspense>
      </Route>
      <Route path="/analysis">
        <Suspense fallback={<PageLoader />}>
          <AnalysisDashboard />
        </Suspense>
      </Route>
      <Route path="/deployment">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <DeploymentConsole />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route path="/projects">
        <Suspense fallback={<PageLoader />}>
          <ProjectsPage />
        </Suspense>
      </Route>
      <Route path="/workers">
        <Suspense fallback={<PageLoader />}>
          <WorkersPage />
        </Suspense>
      </Route>
      <Route path="/worker-accounts">
        <Suspense fallback={<PageLoader />}>
          <WorkerAccountsPage />
        </Suspense>
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
      <Route path="/worker-attendance">
        <Suspense fallback={<PageLoader />}>
          <WorkerAttendance />
        </Suspense>
      </Route>
      <Route path="/material-purchase">
        <Suspense fallback={<PageLoader />}>
          <MaterialPurchase />
        </Suspense>
      </Route>
      <Route path="/transport-management">
        <Suspense fallback={<PageLoader />}>
          <TransportManagement />
        </Suspense>
      </Route>
      <Route path="/project-transfers">
        <Suspense fallback={<PageLoader />}>
          <ProjectTransfers />
        </Suspense>
      </Route>
      <Route path="/project-transactions">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <ProjectTransactionsPage />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route path="/project-fund-custody">
        <Suspense fallback={<PageLoader />}>
          <ProjectFundCustody />
        </Suspense>
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
      <Route path="/notifications">
        <Suspense fallback={<PageLoader />}>
          <NotificationsPage />
        </Suspense>
      </Route>
      <Route path="/admin-notifications">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <AdminNotificationsPage />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route path="/smart-errors">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <SmartErrorsPage />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route path="/security-policies">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <SecurityPoliciesPage />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route path="/daily-expenses">
        <Suspense fallback={<PageLoader />}>
          <DailyExpenses />
        </Suspense>
      </Route>
      <Route path="/records-transfer">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <RecordsTransfer />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route path="/wells">
        <Suspense fallback={<PageLoader />}>
          <WellsPage />
        </Suspense>
      </Route>
      <Route path="/admin/backups">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <BackupManager />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route path="/settings">
        <Suspense fallback={<PageLoader />}>
          <SettingsPage />
        </Suspense>
      </Route>
      <Route path="/well-cost-report">
        <Suspense fallback={<PageLoader />}>
          <WellCostReport />
        </Suspense>
      </Route>
      <Route path="/well-accounting">
        <Suspense fallback={<PageLoader />}>
          <WellAccounting />
        </Suspense>
      </Route>
      <Route path="/reports">
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
      <Route path="/whatsapp-setup">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <WhatsAppSetupPage />
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
      <Route path="/admin/system">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <AdminDashboard />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route path="/admin/dashboard">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <AdminDashboard />
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
          <Suspense fallback={<PageLoader />}>
            <DataHealthPage />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route path="/local-db">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <DatabaseManager />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route path="/admin/sync">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <SyncManagementPage />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route path="/admin/permissions">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <PermissionManagementPage />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

import { initializeNativePush, requestAllPermissions } from "./services/capacitorPush";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

const SystemCheckPage = lazy(() => import("./pages/SystemCheckPage"));
const SyncManagementPage = lazy(() => import("./pages/system/SyncManagementPage"));

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
                    <Route path="/check">
                      <Suspense fallback={<PageLoader />}>
                        <SystemCheckPage />
                      </Suspense>
                    </Route>
                    <Route path="/setup">
                      <Suspense fallback={<PageLoader />}>
                        <SystemCheckPage />
                      </Suspense>
                    </Route>
                    <Route path="/permissions">
                      <Suspense fallback={<PageLoader />}>
                        <SystemCheckPage />
                      </Suspense>
                    </Route>
                    <Route path="/login" component={LoginPage} />
                    <Route path="/register" component={RegisterPage} />
                    <Route path="/verify-email">
                      <Suspense fallback={<PageLoader />}>
                        <EmailVerificationPage />
                      </Suspense>
                    </Route>
                    <Route path="/forgot-password">
                      <Suspense fallback={<PageLoader />}>
                        <ForgotPasswordPage />
                      </Suspense>
                    </Route>
                    <Route path="/reset-password">
                      <Suspense fallback={<PageLoader />}>
                        <ResetPasswordPage />
                      </Suspense>
                    </Route>
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