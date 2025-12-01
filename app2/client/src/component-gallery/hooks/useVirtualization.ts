import { useEffect, useRef, useCallback, useState } from 'react';

interface VirtualizationOptions {
  itemHeight: number;
  containerHeight: number;
  bufferSize?: number;
  items: any[];
}

export function useVirtualization({
  itemHeight,
  containerHeight,
  bufferSize = 3,
  items,
}: VirtualizationOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
  const endIndex = Math.min(items.length, startIndex + visibleCount + bufferSize * 2);
  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: Event) => {
    if (containerRef.current) {
      setScrollTop((e.target as HTMLDivElement).scrollTop);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return {
    containerRef,
    visibleItems,
    offsetY,
    startIndex,
    endIndex,
    totalHeight: items.length * itemHeight,
  };
}
