import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProfessionalLoader } from "@/components/ui/professional-loader";
import React, { useState, useEffect } from "react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import LoginPage from "@/pages/LoginPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import EmailVerificationPage from "@/pages/EmailVerificationPage";

import WorkerAttendance from "@/pages/worker-attendance";

import DailyExpenses from "@/pages/daily-expenses";
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

import Header from "@/components/layout/header";
import BottomNavigation from "@/components/layout/bottom-navigation";
import FloatingAddButton from "@/components/layout/floating-add-button";
import { FloatingButtonProvider } from "@/components/layout/floating-button-context";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AdminRoute } from "@/components/AdminRoute";
import EmailVerificationGuard from "@/components/EmailVerificationGuard"; // Import the new guard



function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="pb-20 min-h-screen">
        {children}
      </main>
      <FloatingAddButton />
    </>
  );
}

function Router() {
  console.log('🧭 [App.Router] بدء تحميل Router...', new Date().toISOString());

  return (
    <Switch>
      {/* صفحات غير محمية - بدون شريط علوي أو سفلي */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={LoginPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/verify-email" component={EmailVerificationPage} />

      {/* صفحات محمية - مع شريط علوي وسفلي */}
      <Route path="/">
        <AuthLayout>
          <Dashboard />
        </AuthLayout>
      </Route>

      <Route path="/projects">
        <AuthLayout>
          <ProjectsPage />
        </AuthLayout>
      </Route>

      <Route path="/workers">
        <AuthLayout>
          <WorkersPage />
        </AuthLayout>
      </Route>

      <Route path="/worker-accounts">
        <AdminRoute>
          <AuthLayout>
            <WorkerAccountsPage />
          </AuthLayout>
        </AdminRoute>
      </Route>

      <Route path="/suppliers">
        <AuthLayout>
          <SuppliersProPage />
        </AuthLayout>
      </Route>

      <Route path="/suppliers-pro">
        <AuthLayout>
          <SuppliersProPage />
        </AuthLayout>
      </Route>

      <Route path="/supplier-accounts">
        <AdminRoute>
          <AuthLayout>
            <SupplierAccountsPage />
          </AuthLayout>
        </AdminRoute>
      </Route>

      <Route path="/worker-attendance">
        <AuthLayout>
          <WorkerAttendance />
        </AuthLayout>
      </Route>

      <Route path="/daily-expenses">
        <AuthLayout>
          <DailyExpenses />
        </AuthLayout>
      </Route>

      <Route path="/material-purchase">
        <AuthLayout>
          <MaterialPurchase />
        </AuthLayout>
      </Route>

      <Route path="/material-purchases">
        <AuthLayout>
          <MaterialPurchase />
        </AuthLayout>
      </Route>

      <Route path="/project-transfers">
        <AdminRoute>
          <AuthLayout>
            <ProjectTransfers />
          </AuthLayout>
        </AdminRoute>
      </Route>

      <Route path="/project-transactions">
        <AdminRoute>
          <AuthLayout>
            <ProjectTransactionsPage />
          </AuthLayout>
        </AdminRoute>
      </Route>

      <Route path="/autocomplete-admin">
        <AdminRoute>
          <AuthLayout>
            <AutocompleteAdminPage />
          </AuthLayout>
        </AdminRoute>
      </Route>

      <Route path="/equipment">
        <AdminRoute>
          <AuthLayout>
            <EquipmentManagement />
          </AuthLayout>
        </AdminRoute>
      </Route>

      <Route path="/equipment-management">
        <AdminRoute>
          <AuthLayout>
            <EquipmentManagement />
          </AuthLayout>
        </AdminRoute>
      </Route>


      <Route path="/notifications">
        <AuthLayout>
          <NotificationsPage />
        </AuthLayout>
      </Route>

      <Route path="/admin-notifications">
        <AdminRoute>
          <AuthLayout>
            <AdminNotificationsPage />
          </AuthLayout>
        </AdminRoute>
      </Route>


      <Route path="/smart-errors">
        <AuthLayout>
          <SmartErrorsPage />
        </AuthLayout>
      </Route>

      <Route path="/security-policies">
        <AdminRoute>
          <AuthLayout>
            <SecurityPoliciesPage />
          </AuthLayout>
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
              <div className="min-h-screen bg-background text-foreground overflow-x-hidden" dir="rtl">
                <ErrorBoundary>
                  <Switch>
                    <Route path="/login" component={LoginPage} />
                    <Route path="/verify-email" component={EmailVerificationPage} />
                    <Route path="/reset-password" component={ResetPasswordPage} />
                    <Route path="*" component={() => (
                      <ProtectedRoute>
                        <EmailVerificationGuard>
                          <>
                            <Header />
                            <Router />
                            <BottomNavigation />
                          </>
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