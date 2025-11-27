import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface QuickAction {
  icon: LucideIcon;
  label: string;
  description?: string;
  action: () => void;
  color?: "primary" | "secondary" | "success" | "destructive" | "warning" | "info";
}

interface QuickActionsProps {
  actions: QuickAction[];
  variant?: "grid" | "carousel" | "list";
  compact?: boolean;
}

const colorClasses = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  secondary: "bg-slate-600 hover:bg-slate-700 text-white",
  success: "bg-emerald-600 hover:bg-emerald-700 text-white",
  destructive: "bg-red-600 hover:bg-red-700 text-white",
  warning: "bg-amber-600 hover:bg-amber-700 text-white",
  info: "bg-indigo-600 hover:bg-indigo-700 text-white",
};

export function QuickActions({ 
  actions, 
  variant = "grid",
  compact = false 
}: QuickActionsProps) {
  if (variant === "list") {
    return (
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-bold text-foreground mb-4">إجراءات سريعة</h3>
          <div className="space-y-2">
            {actions.map((action, index) => {
              const Icon = action.icon;
              const color = action.color || "primary";
              
              return (
                <Button
                  key={index}
                  onClick={action.action}
                  className={`w-full justify-start gap-3 h-auto py-3 px-4 ${colorClasses[color]} transition-all duration-200 hover:shadow-md`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <div className="text-right">
                    <div className="font-medium text-sm">{action.label}</div>
                    {action.description && (
                      <div className="text-xs opacity-90">{action.description}</div>
                    )}
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-lg font-bold text-foreground mb-4">إجراءات سريعة</h3>
        <div className={`grid ${compact ? "grid-cols-3 sm:grid-cols-4 gap-2" : "grid-cols-2 sm:grid-cols-3 gap-3"}`}>
          {actions.map((action, index) => {
            const Icon = action.icon;
            const color = action.color || "primary";
            
            return (
              <Button
                key={index}
                onClick={action.action}
                className={`${colorClasses[color]} flex flex-col items-center justify-center gap-2 h-auto ${compact ? "py-2 px-2" : "py-4 px-3"} transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95`}
              >
                <Icon className={`${compact ? "h-4 w-4" : "h-6 w-6"}`} />
                <span className={`${compact ? "text-xs" : "text-xs sm:text-sm"} font-medium text-center leading-tight`}>
                  {action.label}
                </span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
