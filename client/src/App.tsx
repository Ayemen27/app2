import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import React, { Suspense, lazy, useEffect, useState } from "react";

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
const WorkerMiscExpensesComponent = lazy(() => import("./pages/worker-misc-expenses"));
const RecordsTransfer = lazy(() => import("./pages/records-transfer"));
const WellsPage = lazy(() => import("./pages/wells"));
const WellCrewsPage = lazy(() => import("./pages/well-crews"));
const WellMaterialsPage = lazy(() => import("./pages/well-materials"));
const WellCostReport = lazy(() => import("./pages/well-cost-report"));
const WellAccounting = lazy(() => import("./pages/well-accounting"));
const WellReceptionsPage = lazy(() => import("./pages/well-receptions"));
const WellReportsPage = lazy(() => import("./pages/well-reports"));
const DataHealthPage = lazy(() => import("./pages/DataHealthPage"));
const DatabaseManager = lazy(() => import("./pages/DatabaseManager"));

import { LayoutShell } from "./components/layout/layout-shell";
import { FloatingButtonProvider } from "./components/layout/floating-button-context";
import { DebugOverlay } from "./components/DebugOverlay";
import { AuthProvider } from "./components/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AdminRoute } from "./components/AdminRoute";
import EmailVerificationGuard from "./components/EmailVerificationGuard";
import { SelectedProjectProvider } from "./contexts/SelectedProjectContext";
import { useSelectedProject } from "./hooks/use-selected-project";
import { Loader2 } from "lucide-react";
import { initSyncListener, subscribeSyncState, loadFullBackup, performInitialDataPull } from "./offline/sync";
import { initSilentSyncObserver } from "./offline/silent-sync";
import { initAuditLog } from "./offline/local-audit";
import { initializeDB } from "./offline/db";
import { SyncStatusIndicator } from "./components/sync-status";
import { EnvironmentBadge } from "./components/layout/EnvironmentBadge";

const WorkerAccountsPage = lazy(() => import("./pages/worker-accounts"));
const WorkerSettlementsPage = lazy(() => import("./pages/worker-settlements"));
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
const CentralLogsPage = lazy(() => import("./pages/central-logs"));


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

function WorkerMiscExpensesPage() {
  const { selectedProjectId, isWellsProject } = useSelectedProject();
  const params = new URLSearchParams(window.location.search);
  const urlDate = params.get('date');
  const [selectedDate, setSelectedDate] = useState(() => {
    if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) return urlDate;
    return new Date().toISOString().split('T')[0];
  });

  if (!selectedProjectId || selectedProjectId === 'all') {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-12 text-muted-foreground" data-testid="text-select-project-msg">
          يرجى اختيار مشروع محدد من القائمة العلوية لعرض النثريات
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" data-testid="text-page-title">نثريات العمال</h2>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
          data-testid="input-date-picker"
        />
      </div>
      <WorkerMiscExpensesComponent
        project_id={selectedProjectId}
        selectedDate={selectedDate}
        isWellsProject={isWellsProject}
      />
    </div>
  );
}

function UpdateDialog({ info, onDismiss }: { info: any; onDismiss: () => void }) {
  const isForced = info.forceUpdate === true;

  const handleUpdate = async () => {
    const { openDownloadUrl } = await import('./services/appUpdateChecker');
    if (info.latest.downloadUrl) {
      openDownloadUrl(info.latest.downloadUrl);
    }
  };

  const handleLater = async () => {
    if (isForced) return;
    const { dismissVersion } = await import('./services/appUpdateChecker');
    dismissVersion(info.latest.versionCode);
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4" data-testid="update-dialog-overlay">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4 border border-border" dir="rtl" data-testid="update-dialog">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        {isForced ? (
          <>
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400">تحديث إجباري مطلوب</h3>
            <p className="text-sm text-muted-foreground">
              يجب تحديث التطبيق إلى الإصدار <span className="font-mono font-bold text-foreground">v{info.latest.versionName}</span> للمتابعة
            </p>
            <p className="text-xs text-red-500 font-medium">
              لا يمكن استخدام التطبيق بالإصدار الحالي v{info.current.versionName}
            </p>
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold text-foreground">تحديث جديد متاح!</h3>
            <p className="text-sm text-muted-foreground">
              الإصدار <span className="font-mono font-bold text-foreground">v{info.latest.versionName}</span> متاح للتحميل
            </p>
            <p className="text-xs text-muted-foreground">
              الإصدار الحالي: <span className="font-mono">v{info.current.versionName}</span>
            </p>
          </>
        )}
        <div className="flex flex-col gap-2 pt-2">
          {info.latest.downloadUrl && (
            <button
              data-testid="button-update-now"
              onClick={handleUpdate}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white font-bold text-sm hover:from-red-500 hover:to-red-400 transition-all"
            >
              تحديث الآن
            </button>
          )}
          {!isForced && (
            <button
              data-testid="button-update-later"
              onClick={handleLater}
              className="w-full py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted/50 transition-all"
            >
              لاحقاً
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Router() {
  useWebSocketSync();
  const [updateInfo, setUpdateInfo] = useState<any>(null);

  useEffect(() => {
    const initSync = async () => {
      try {
        await initializeDB();
        console.log('✅ تم تهيئة قاعدة البيانات المحلية');

        if (Capacitor.isNativePlatform()) {
          try {
            const { initStatusBar, setStatusBarForPage } = await import('./services/statusBarManager');
            await initStatusBar();
            await setStatusBarForPage('app');
            console.log('✅ تم تهيئة شريط الحالة');
          } catch (e) {
            console.error('❌ خطأ في تهيئة شريط الحالة:', e);
          }

          try {
            const { requestNotificationPermission, registerResumeListener } = await import('./services/notificationPermission');
            await requestNotificationPermission();
            registerResumeListener();
            console.log('✅ تم تفعيل نظام صلاحيات الإشعارات');
          } catch (e) {
            console.error('❌ خطأ في طلب الصلاحيات:', e);
          }

          try {
            const { initUpdateChecker } = await import('./services/appUpdateChecker');
            initUpdateChecker({
              onUpdateAvailable: (info) => setUpdateInfo(info),
            });
            console.log('✅ تم تفعيل فاحص التحديثات');
          } catch (e) {
            console.error('❌ خطأ في فاحص التحديثات:', e);
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
    <>
      {updateInfo && (
        <UpdateDialog info={updateInfo} onDismiss={() => setUpdateInfo(null)} />
      )}
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
      <Route path="/worker-settlements">
        <Suspense fallback={<PageLoader />}>
          <WorkerSettlementsPage />
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
      <Route path="/worker-misc-expenses">
        <Suspense fallback={<PageLoader />}>
          <WorkerMiscExpensesPage />
        </Suspense>
      </Route>
      <Route path="/records-transfer">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <RecordsTransfer />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route path="/wells/crews">
        <Suspense fallback={<PageLoader />}>
          <WellCrewsPage />
        </Suspense>
      </Route>
      <Route path="/wells/materials">
        <Suspense fallback={<PageLoader />}>
          <WellMaterialsPage />
        </Suspense>
      </Route>
      <Route path="/wells/receptions">
        <Suspense fallback={<PageLoader />}>
          <WellReceptionsPage />
        </Suspense>
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
      <Route path="/well-reports">
        <Suspense fallback={<PageLoader />}>
          <WellReportsPage />
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
      <Route path="/admin/central-logs">
        <AdminRoute>
          <Suspense fallback={<PageLoader />}>
            <CentralLogsPage />
          </Suspense>
        </AdminRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
    </>
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
                <DebugOverlay />
              </div>
            </FloatingButtonProvider>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;