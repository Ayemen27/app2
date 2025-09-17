import { Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import { FloatingButtonProvider } from "@/components/layout/floating-button-context";
import { SelectedProjectProvider } from "@/hooks/use-selected-project";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes('404')) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SelectedProjectProvider>
        <FloatingButtonProvider>
          <div className="min-h-screen bg-background text-foreground gradient-bg" dir="rtl">
            <Route path="/" component={Dashboard} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/projects" component={Projects} />
            <Route path="/workers" component={Workers} />
            <Route path="/worker-attendance" component={WorkerAttendance} />
            <Route path="/daily-expenses" component={DailyExpenses} />
            <Route path="/material-purchases" component={MaterialPurchase} />
            <Route path="/equipment-management" component={EquipmentManagement} />
            <Route path="/reports" component={Reports} />
            <Route component={NotFound} />
            <Toaster />
          </div>
        </FloatingButtonProvider>
      </SelectedProjectProvider>
    </QueryClientProvider>
  );
}