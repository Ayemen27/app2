import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import React from "react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import LoginPage from "@/pages/LoginPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import EmailVerificationPage from "@/pages/EmailVerificationPage";
import { useWebSocketSync } from "@/hooks/useWebSocketSync";

import WorkerAttendance from "@/pages/worker-attendance";

import MaterialPurchase from "@/pages/material-purchase";
import ProjectTransfers from "@/pages/project-transfers";
import ProjectTransactionsPage from "@/pages/project-transactions-simple";

import ProjectsPage from "@/pages/projects";
import WorkersPage from "@/pages/workers";
import WorkerAccountsPage from "@/pages/worker-accounts";
import SuppliersProPage from "@/pages/suppliers-professional";
import SupplierAccountsPage from "@/pages/supplier-accounts";
import AutocompleteAdminPage from "@/pages/autocomplete-admin";
import { EquipmentManagement } from "@/pages/equipment-management";
import NotificationsPage from "@/pages/notifications";
import AdminNotificationsPage from "@/pages/admin-notifications";
import SmartErrorsPage from "@/pages/SmartErrorsPage";
import { SecurityPoliciesPage } from "@/pages/SecurityPoliciesPage";
import Reports from "@/pages/reports";
import DailyExpenses from "@/pages/daily-expenses";
import ComponentGalleryPage from "@/component-gallery";

import { LayoutShell } from "@/components/layout/layout-shell";
import { FloatingButtonProvider } from "@/components/layout/floating-button-context";
import { AuthProvider } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AdminRoute } from "@/components/AdminRoute";
import EmailVerificationGuard from "@/components/EmailVerificationGuard";

function Router() {
  // Enable real-time WebSocket updates
  useWebSocketSync();
  
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/projects" component={ProjectsPage} />
      <Route path="/workers" component={WorkersPage} />
      <Route path="/worker-accounts">
        <AdminRoute>
          <WorkerAccountsPage />
        </AdminRoute>
      </Route>
      <Route path="/suppliers-pro" component={SuppliersProPage} />
      <Route path="/supplier-accounts">
        <AdminRoute>
          <SupplierAccountsPage />
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
      <Route path="/autocomplete-admin">
        <AdminRoute>
          <AutocompleteAdminPage />
        </AdminRoute>
      </Route>
      <Route path="/equipment">
        <AdminRoute>
          <EquipmentManagement />
        </AdminRoute>
      </Route>
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/admin-notifications">
        <AdminRoute>
          <AdminNotificationsPage />
        </AdminRoute>
      </Route>
      <Route path="/smart-errors" component={SmartErrorsPage} />
      <Route path="/security-policies">
        <AdminRoute>
          <SecurityPoliciesPage />
        </AdminRoute>
      </Route>
      <Route path="/daily-expenses" component={DailyExpenses} />
      <Route path="/reports" component={Reports} />
      <Route path="/component-gallery" component={ComponentGalleryPage} />
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
                          <LayoutShell>
                            <Router />
                          </LayoutShell>
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
