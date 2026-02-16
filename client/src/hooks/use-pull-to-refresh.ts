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
  const rafIdRef = useRef<number | null>(null);

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

    el.style.overscrollBehaviorY = "none";

    const isAtTop = () => el.scrollTop <= 0;

    const getClientY = (e: TouchEvent | MouseEvent | PointerEvent): number => {
      if ("touches" in e && e.touches.length > 0) {
        return e.touches[0].clientY;
      }
      return (e as MouseEvent).clientY;
    };

    const onPointerDown = (e: TouchEvent | PointerEvent) => {
      if (isRefreshingRef.current || !isAtTop()) return;
      if ("pointerType" in e && e.pointerType === "mouse") return;
      const y = getClientY(e);
      startYRef.current = y;
      currentYRef.current = y;
      isPullingRef.current = false;
    };

    const onPointerMove = (e: TouchEvent | PointerEvent) => {
      if (isRefreshingRef.current) return;
      if ("pointerType" in e && e.pointerType === "mouse") return;

      const y = getClientY(e);
      const deltaY = y - startYRef.current;

      if (deltaY > 10 && isAtTop()) {
        if (!isPullingRef.current) {
          isPullingRef.current = true;
          setIsPulling(true);
          startYRef.current = y;
        }
      }

      if (isPullingRef.current) {
        if (e.cancelable) {
          e.preventDefault();
        }
        currentYRef.current = y;
        const raw = currentYRef.current - startYRef.current;
        const dampened = Math.min(maxPull, raw * 0.5);

        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = requestAnimationFrame(() => {
          setPullDistance(Math.max(0, dampened));
        });
      }
    };

    const onPointerUp = () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

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

    el.addEventListener("touchstart", onPointerDown, { passive: true });
    el.addEventListener("touchmove", onPointerMove, { passive: false });
    el.addEventListener("touchend", onPointerUp, { passive: true });
    el.addEventListener("touchcancel", onPointerUp, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onPointerDown);
      el.removeEventListener("touchmove", onPointerMove);
      el.removeEventListener("touchend", onPointerUp);
      el.removeEventListener("touchcancel", onPointerUp);
      el.style.overscrollBehaviorY = "";
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [enabled, threshold, maxPull, handleRefresh, scrollRef]);

  return { pullDistance, isRefreshing, isPulling, progress };
}
