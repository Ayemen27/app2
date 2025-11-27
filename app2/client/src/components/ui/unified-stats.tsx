import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { StatsCard } from "./stats-card";
import type { LucideIcon } from "lucide-react";

interface UnifiedStatItem {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: "blue" | "green" | "orange" | "red" | "purple" | "teal" | "indigo" | "emerald" | "amber" | "gray";
  formatter?: (value: number) => string;
  trend?: { value: number; isPositive: boolean };
  status?: "normal" | "warning" | "critical";
}

interface UnifiedStatsProps {
  title: string;
  subtitle?: string;
  stats: UnifiedStatItem[];
  columns?: 2 | 3 | 4;
  showStatus?: boolean;
  compact?: boolean;
}

export function UnifiedStats({
  title,
  subtitle,
  stats,
  columns = 2,
  showStatus = true,
  compact = false
}: UnifiedStatsProps) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
  };

  // حساب الحالة الإجمالية
  const criticalStats = stats.filter(s => s.status === "critical");
  const warningStats = stats.filter(s => s.status === "warning");

  const getOverallStatus = () => {
    if (criticalStats.length > 0) return { label: "حرج", color: "destructive" };
    if (warningStats.length > 0) return { label: "تحذير", color: "warning" };
    return { label: "جيد", color: "default" };
  };

  const status = getOverallStatus();

  return (
    <Card className={`${compact ? "mb-3" : "mb-4"}`}>
      <CardHeader className={`${compact ? "pb-3" : "pb-4"}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <CardTitle className={`${compact ? "text-base" : "text-lg"}`}>
              {title}
            </CardTitle>
            {subtitle && (
              <p className={`${compact ? "text-xs" : "text-sm"} text-muted-foreground mt-1`}>
                {subtitle}
              </p>
            )}
          </div>
          {showStatus && (
            <Badge 
              variant={status.color === "default" ? "secondary" : status.color as any}
              className="shrink-0"
            >
              {status.label}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className={`grid ${gridCols[columns]} gap-${compact ? "2" : "3"}`}>
          {stats.map((stat, index) => (
            <div key={index} className="relative">
              {stat.status === "critical" && (
                <div className="absolute -top-2 -right-2 h-3 w-3 bg-red-500 rounded-full animate-pulse z-10" />
              )}
              {stat.status === "warning" && (
                <div className="absolute -top-2 -right-2 h-3 w-3 bg-amber-500 rounded-full animate-pulse z-10" />
              )}
              
              <StatsCard
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                color={stat.color}
                formatter={stat.formatter}
              />

              {stat.trend && (
                <div className="mt-2 flex items-center gap-1 text-xs">
                  {stat.trend.isPositive ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">
                        +{stat.trend.value}%
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-600" />
                      <span className="text-red-600">
                        {stat.trend.value}%
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {(criticalStats.length > 0 || warningStats.length > 0) && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md text-xs text-amber-800 dark:text-amber-200">
            {criticalStats.length > 0 && (
              <p>⚠️ هناك {criticalStats.length} عناصر حرجة تحتاج إلى انتباه</p>
            )}
            {warningStats.length > 0 && (
              <p className="mt-1">⚡ هناك {warningStats.length} تحذيرات</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// مكون عام للإحصائيات المتعددة
export function MultiUnifiedStats({
  groups
}: {
  groups: Omit<UnifiedStatsProps, "stats">[] & { stats: UnifiedStatItem[] }[]
}) {
  return (
    <div className="space-y-4">
      {groups.map((group, index) => (
        <UnifiedStats
          key={index}
          title={group.title}
          subtitle={group.subtitle}
          stats={group.stats}
          columns={group.columns}
          showStatus={group.showStatus}
          compact={group.compact}
        />
      ))}
    </div>
  );
}
