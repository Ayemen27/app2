import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: "blue" | "green" | "red" | "yellow" | "purple" | "indigo" | "pink";
  formatter?: (value: number) => string;
  change?: {
    value: number;
    type: "increase" | "decrease";
  };
  className?: string;
}

const colorVariants = {
  blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  green: "bg-green-500/10 text-green-600 border-green-500/20", 
  red: "bg-red-500/10 text-red-600 border-red-500/20",
  yellow: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  purple: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  indigo: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  pink: "bg-pink-500/10 text-pink-600 border-pink-500/20",
};

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  color = "blue", 
  formatter,
  change,
  className 
}: StatsCardProps) {
  const formattedValue = typeof value === "number" && formatter 
    ? formatter(value) 
    : value.toString();

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold ltr-numbers">{formattedValue}</p>
              {change && (
                <span className={cn(
                  "text-xs px-2 py-1 rounded-full",
                  change.type === "increase" 
                    ? "bg-green-500/10 text-green-600" 
                    : "bg-red-500/10 text-red-600"
                )}>
                  {change.type === "increase" ? "↗" : "↘"} {Math.abs(change.value)}%
                </span>
              )}
            </div>
          </div>
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center border",
            colorVariants[color]
          )}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsGrid({ children, className }: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {children}
    </div>
  );
}
