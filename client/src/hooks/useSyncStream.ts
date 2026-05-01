import { useEffect, useRef } from 'react';
import { shouldUseBearerAuth } from '@/lib/auth-token-store';
import { applyServerRecordsWithTombstones } from '@/offline/storage-factory';
import { SERVER_TO_IDB_TABLE_MAP } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';

export interface SyncStreamPayload {
  op: 'upsert' | 'delete';
  table: string;
  id?: string;
  record?: Record<string, any>;
  user_id?: string;
  project_id?: string | null;
  scope?: 'all' | 'project' | 'user';
  emittedBy?: string;
  at?: string;
}

interface Options {
  enabled?: boolean;
  url?: string;
  onSync?: (evt: SyncStreamPayload) => void;
  onReady?: (data: any) => void;
}

const serverTableToIDB = (serverTable: string): string =>
  SERVER_TO_IDB_TABLE_MAP[serverTable] || serverTable;

/**
 * 📡 useSyncStream - SSE consumer لتدفّق التغييرات على البيانات.
 *
 *  - يطبّق upsert/delete مباشرة على المخزن المحلي (SQLCipher / IDB) بلا refetch.
 *  - يُبطل كاش TanStack Query للجدول المتأثر فقط (invalidate نطاقي).
 *  - في وضع Bearer (Capacitor/native) معطّل ويسقط على polling.
 */
export function useSyncStream({
  enabled = true,
  url = '/api/sync/events',
  onSync,
  onReady,
}: Options = {}) {
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<number>(0);
  const closedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    if (shouldUseBearerAuth()) {
      console.info('[SyncStream] Bearer mode - SSE disabled');
      return;
    }

    closedRef.current = false;

    const applyEvent = async (evt: SyncStreamPayload) => {
      try {
        const idbStore = serverTableToIDB(evt.table);

        if (evt.op === 'delete' && evt.id) {
          await applyServerRecordsWithTombstones(idbStore, [{
            id: evt.id,
            deleted_at: evt.at || new Date().toISOString(),
          }]);
        } else if (evt.op === 'upsert' && evt.record) {
          await applyServerRecordsWithTombstones(idbStore, [evt.record]);
        }

        // إبطال كاش TanStack للجدول المتأثر فقط
        try {
          queryClient.invalidateQueries({
            predicate: (q) => {
              const k = q.queryKey?.[0];
              if (typeof k !== 'string') return false;
              return k.includes(`/${evt.table}`) || k.includes(`/${idbStore}`);
            },
          });
        } catch {}

        onSync?.(evt);
      } catch (err) {
        console.warn('[SyncStream] applyEvent failed:', err);
      }
    };

    const connect = () => {
      if (closedRef.current) return;
      try {
        const es = new EventSource(url, { withCredentials: true });
        esRef.current = es;

        es.addEventListener('ready', (e: MessageEvent) => {
          retryRef.current = 0;
          try { onReady?.(JSON.parse(e.data)); } catch {}
        });

        es.addEventListener('sync', (e: MessageEvent) => {
          try { applyEvent(JSON.parse(e.data)); } catch {}
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
        console.warn('[SyncStream] connect failed:', err);
      }
    };

    connect();

    return () => {
      closedRef.current = true;
      try { esRef.current?.close(); } catch {}
      esRef.current = null;
    };
  }, [enabled, url, onSync, onReady]);
}
