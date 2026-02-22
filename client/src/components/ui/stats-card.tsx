import { Card, CardContent } from "@/components/ui/card";
// @ts-ignore
import { LucideIcon, AlertCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StatsCardProps {
  title?: string;
  label?: string;
  value: string | number;
  icon: LucideIcon;
  color?: "blue" | "green" | "orange" | "red" | "purple" | "teal" | "indigo" | "emerald" | "amber" | "gray" | "rose" | "critical" | "warning";
  gradient?: string;
  iconBg?: string;
  iconColor?: string;
  formatter?: (value: number) => string;
  format?: string;
  trend?: { value: number; isPositive: boolean };
  className?: string;
  "data-testid"?: string;
  secondaryLabel?: string;
  secondaryIcon?: LucideIcon;
}

const colorVariants = {
  blue: {
    border: "border-l-blue-500",
    text: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400"
  },
  green: {
    border: "border-l-green-500",
    text: "text-green-600",
    bg: "bg-green-50 dark:bg-green-900/20",
    iconBg: "bg-green-100 dark:bg-green-900/30",
    iconColor: "text-green-600 dark:text-green-400"
  },
  orange: {
    border: "border-l-orange-500",
    text: "text-orange-600",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    iconBg: "bg-orange-100 dark:bg-orange-900/30",
    iconColor: "text-orange-600 dark:text-orange-400"
  },
  red: {
    border: "border-l-red-500",
    text: "text-red-600",
    bg: "bg-red-50 dark:bg-red-900/20",
    iconBg: "bg-red-100 dark:bg-red-900/30",
    iconColor: "text-red-600 dark:text-red-400"
  },
  purple: {
    border: "border-l-purple-500",
    text: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    iconColor: "text-purple-600 dark:text-purple-400"
  },
  teal: {
    border: "border-l-teal-500",
    text: "text-teal-600",
    bg: "bg-teal-50 dark:bg-teal-900/20",
    iconBg: "bg-teal-100 dark:bg-teal-900/30",
    iconColor: "text-teal-600 dark:text-teal-400"
  },
  indigo: {
    border: "border-l-indigo-500",
    text: "text-indigo-600",
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
    iconColor: "text-indigo-600 dark:text-indigo-400"
  },
  emerald: {
    border: "border-l-emerald-500",
    text: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600 dark:text-emerald-400"
  },
  amber: {
    border: "border-l-amber-500",
    text: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400"
  },
  gray: {
    border: "border-l-gray-500",
    text: "text-gray-600",
    bg: "bg-gray-50 dark:bg-gray-900/20",
    iconBg: "bg-gray-100 dark:bg-gray-900/30",
    iconColor: "text-gray-600 dark:text-gray-400"
  },
  rose: {
    border: "border-l-rose-500",
    text: "text-rose-600",
    bg: "bg-rose-50 dark:bg-rose-900/20",
    iconBg: "bg-rose-100 dark:bg-rose-900/30",
    iconColor: "text-rose-600 dark:text-rose-400"
  },
  critical: {
    border: "border-l-red-600",
    text: "text-red-700",
    bg: "bg-red-100 dark:bg-red-950/40",
    iconBg: "bg-red-200 dark:bg-red-900/50",
    iconColor: "text-red-700 dark:text-red-300"
  },
  warning: {
    border: "border-l-amber-500",
    text: "text-amber-700",
    bg: "bg-amber-100 dark:bg-amber-950/40",
    iconBg: "bg-amber-200 dark:bg-amber-900/50",
    iconColor: "text-amber-700 dark:text-amber-300"
  }
};

export function StatsCard({ 
  title,
  label,
  value, 
  icon: Icon, 
  color = "blue",
  gradient,
  iconBg,
  iconColor,
  formatter, 
  className = "",
  "data-testid": dataTestId,
  secondaryLabel,
  secondaryIcon: SecondaryIcon
}: StatsCardProps) {
  const colors = color && colorVariants[color as keyof typeof colorVariants] ? colorVariants[color as keyof typeof colorVariants] : colorVariants.blue;
  const displayLabel = label || title || '';
  
  const cleanValue = () => {
    if (value === undefined || value === null) return '0';
    if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) return '0';
      const cleanedValue = Math.max(0, value);
      return formatter ? formatter(cleanedValue) : cleanedValue.toLocaleString('en-US');
    }
    return value.toString();
  };
  
  const displayValue = cleanValue();
  const needsTooltip = displayLabel.length > 15;

  const LabelWithTooltip = ({ children }: { children: React.ReactNode }) => {
    if (!needsTooltip) return <>{children}</>;
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            {children}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px] text-center">
            <p className="text-xs">{displayLabel}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <Card className={cn(
      colors.border, 
      colors.bg, 
      "border-l-4 hover:shadow-md transition-all duration-300 h-full min-h-[90px] sm:min-h-[110px] rounded-xl overflow-hidden shadow-sm",
      className
    )}>
      <CardContent className="p-4 flex flex-col justify-between h-full">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <LabelWithTooltip>
              <p className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider truncate mb-1">
                {displayLabel}
              </p>
            </LabelWithTooltip>
            <p className={cn("text-lg sm:text-xl md:text-2xl font-black font-mono tracking-tight leading-none", colors.text)}>
              {displayValue}
            </p>
          </div>
          <div className={cn("h-8 w-8 sm:h-10 sm:w-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm", colors.iconBg)}>
            <Icon className={cn("h-5 w-5 sm:h-6 sm:h-7", colors.iconColor)} />
          </div>
        </div>
        
        {(secondaryLabel || color === 'critical' || color === 'warning') && (
          <div className="mt-2 sm:mt-4 pt-2 sm:pt-3 border-t border-black/5 dark:border-white/5 flex items-center gap-2">
            {color === 'critical' && <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-600 animate-pulse" />}
            {color === 'warning' && <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-600" />}
            {SecondaryIcon && <SecondaryIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 opacity-70" />}
            <span className="text-[9px] sm:text-[10px] font-bold opacity-80 truncate">
              {secondaryLabel || (color === 'critical' ? '1 عنصر حرج' : color === 'warning' ? '1 تحذير' : '')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StatsGrid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {children}
    </div>
  );
}
