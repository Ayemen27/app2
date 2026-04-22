import { useEffect, useRef } from 'react';
import { shouldUseBearerAuth } from '@/lib/auth-token-store';

type Handler = (evt: any) => void;

interface Options {
  enabled?: boolean;
  onNotification?: Handler;
  onReady?: Handler;
  url?: string;
}

export function useNotificationStream({
  enabled = true,
  onNotification,
  onReady,
  url = '/api/notifications/stream',
}: Options = {}) {
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<number>(0);
  const closedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    if (shouldUseBearerAuth()) {
      console.info('[NotificationStream] Bearer mode - SSE disabled, polling fallback active');
      return;
    }

    closedRef.current = false;

    const connect = () => {
      if (closedRef.current) return;
      try {
        const es = new EventSource(url, { withCredentials: true });
        esRef.current = es;

        es.addEventListener('ready', (e: MessageEvent) => {
          retryRef.current = 0;
          try { onReady?.(JSON.parse(e.data)); } catch {}
        });

        es.addEventListener('notification', (e: MessageEvent) => {
          try { onNotification?.(JSON.parse(e.data)); } catch {}
        });

        es.onerror = () => {
          es.close();
          esRef.current = null;
          if (closedRef.current) return;
          const delay = Math.min(30000, 1000 * 2 ** Math.min(retryRef.current, 5));
          retryRef.current += 1;
          setTimeout(connect, delay);
        };
      } catch (err) {
        console.warn('[NotificationStream] connect failed:', err);
      }
    };

    connect();

    return () => {
      closedRef.current = true;
      try { esRef.current?.close(); } catch {}
      esRef.current = null;
    };
  }, [enabled, url, onNotification, onReady]);
}
