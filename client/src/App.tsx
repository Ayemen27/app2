import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";

import WorkerAttendance from "@/pages/worker-attendance";

import DailyExpenses from "@/pages/daily-expenses";
import MaterialPurchase from "@/pages/material-purchase";
import Reports from "@/pages/reports";

import ProjectTransfers from "@/pages/project-transfers";
import ProjectTransactionsPage from "@/pages/project-transactions-simple";

import ProjectsPage from "@/pages/projects";
import WorkersPage from "@/pages/workers";
import WorkerAccountsPage from "@/pages/worker-accounts";
import SuppliersProPage from "@/pages/suppliers-professional";
import SupplierAccountsPage from "@/pages/supplier-accounts";
import AutocompleteAdminPage from "@/pages/autocomplete-admin";
import EquipmentManagementPage from "@/pages/equipment-management";

import Header from "@/components/layout/header";
import BottomNavigation from "@/components/layout/bottom-navigation";
import FloatingAddButton from "@/components/layout/floating-add-button";
import { FloatingButtonProvider } from "@/components/layout/floating-button-context";
import { AuthProvider } from "@/components/AuthProvider";
import { SelectedProjectProvider } from "@/hooks/use-selected-project";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />

      <Route path="/projects" component={ProjectsPage} />
      <Route path="/workers" component={WorkersPage} />
      <Route path="/worker-accounts" component={WorkerAccountsPage} />
      <Route path="/suppliers-pro" component={SuppliersProPage} />
      <Route path="/supplier-accounts" component={SupplierAccountsPage} />
      <Route path="/worker-attendance" component={WorkerAttendance} />

      <Route path="/daily-expenses" component={DailyExpenses} />
      <Route path="/material-purchase" component={MaterialPurchase} />

      <Route path="/project-transfers" component={ProjectTransfers} />
      <Route path="/project-transactions" component={ProjectTransactionsPage} />
      <Route path="/autocomplete-admin" component={AutocompleteAdminPage} />

      <Route path="/tools" component={EquipmentManagementPage} />
      <Route path="/equipment-management" component={EquipmentManagementPage} />
      <Route path="/reports" component={Reports} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SelectedProjectProvider>
          <TooltipProvider>
            <FloatingButtonProvider>
              <div className="min-h-screen bg-background text-foreground" dir="rtl">
                <Header />
                <main className="pb-20">
                  <Router />
                </main>
                <BottomNavigation />
                <FloatingAddButton />
                <Toaster />
              </div>
            </FloatingButtonProvider>
          </TooltipProvider>
        </SelectedProjectProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
