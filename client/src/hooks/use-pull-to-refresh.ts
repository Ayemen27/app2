import { useRef, useCallback, useState, useEffect } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  enabled?: boolean;
  threshold?: number;
  maxPull?: number;
  minSpinnerTime?: number;
  scrollRef: React.RefObject<HTMLElement | null>;
}

interface UsePullToRefreshReturn {
  pullDistance: number;
  isRefreshing: boolean;
  isPulling: boolean;
  progress: number;
}

export function usePullToRefresh({
  onRefresh,
  enabled = true,
  threshold = 70,
  maxPull = 130,
  minSpinnerTime = 600,
  scrollRef,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const isRefreshingRef = useRef(false);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isPullingRef = useRef(false);

  const progress = Math.min(pullDistance / threshold, 1);

  const handleRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshing(true);

    const startTime = Date.now();

    try {
      await onRefresh();
    } catch {
      // handled externally
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minSpinnerTime - elapsed);

      setTimeout(() => {
        setIsRefreshing(false);
        isRefreshingRef.current = false;
        setPullDistance(0);
      }, remaining);
    }
  }, [onRefresh, minSpinnerTime]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !enabled) return;

    let rafId: number | null = null;

    const isAtTop = () => el.scrollTop <= 0;

    const onTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current || !isAtTop()) return;
      startYRef.current = e.touches[0].clientY;
      currentYRef.current = startYRef.current;
      isPullingRef.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - startYRef.current;

      if (deltaY > 10 && isAtTop()) {
        if (!isPullingRef.current) {
          isPullingRef.current = true;
          setIsPulling(true);
          startYRef.current = touch.clientY;
        }
      }

      if (isPullingRef.current) {
        e.preventDefault();
        currentYRef.current = touch.clientY;
        const raw = currentYRef.current - startYRef.current;
        const dampened = Math.min(maxPull, raw * 0.5);
        
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          setPullDistance(Math.max(0, dampened));
        });
      }
    };

    const onTouchEnd = () => {
      if (rafId) cancelAnimationFrame(rafId);

      if (isPullingRef.current) {
        isPullingRef.current = false;
        setIsPulling(false);

        const raw = currentYRef.current - startYRef.current;
        const dampened = raw * 0.5;

        if (dampened >= threshold) {
          setPullDistance(threshold);
          handleRefresh();
        } else {
          setPullDistance(0);
        }
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [enabled, threshold, maxPull, handleRefresh, scrollRef]);

  return { pullDistance, isRefreshing, isPulling, progress };
}
