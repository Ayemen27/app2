import { useSyncStream } from '@/hooks/useSyncStream';

/**
 * 📡 يركّب SSE لتدفّق التغييرات اللحظية بمجرد دخول المستخدم.
 * في وضع Bearer (Capacitor) معطّل ويسقط على polling تلقائيًا.
 */
export function RealtimeSyncMount() {
  useSyncStream({ enabled: true });
  return null;
}
