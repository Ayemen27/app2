import { RefreshCw } from "lucide-react";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  progress: number;
  threshold?: number;
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  progress,
  threshold = 70,
}: PullToRefreshIndicatorProps) {
  const isVisible = pullDistance > 5 || isRefreshing;
  const displayDistance = isRefreshing ? threshold * 0.6 : pullDistance;
  const isReady = progress >= 1;

  if (!isVisible) return null;

  return (
    <div
      className="pull-to-refresh-indicator flex items-center justify-center overflow-hidden pointer-events-none"
      style={{
        height: `${displayDistance}px`,
        transition: isRefreshing ? "height 0.3s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
      }}
    >
      <div
        className={`
          flex items-center justify-center rounded-full
          w-10 h-10
          bg-background border border-border shadow-md
          transition-transform duration-200 ease-out
        `}
        style={{
          opacity: Math.min(1, progress * 1.5),
          transform: `scale(${0.5 + progress * 0.5}) rotate(${isRefreshing ? 0 : progress * 180}deg)`,
        }}
      >
        <RefreshCw
          className={`h-5 w-5 text-primary ${isRefreshing ? "animate-spin" : ""}`}
          style={{
            color: isReady && !isRefreshing ? "hsl(var(--primary))" : undefined,
          }}
        />
      </div>
      {isReady && !isRefreshing && (
        <span className="text-xs text-muted-foreground ms-2 animate-pulse">
          حرّر للتحديث
        </span>
      )}
    </div>
  );
}
