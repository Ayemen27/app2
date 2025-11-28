import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export function useWebSocketSync() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const connectWebSocket = () => {
      // Determine WebSocket URL based on environment
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}`;
      
      console.log('🔌 [WebSocket] محاولة الاتصال بـ:', wsUrl);

      // Note: Socket.IO is handled by the server-side HTTP upgrade
      // We'll use native WebSocket for now
      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('🔌 [WebSocket] تم الاتصال بنجاح');
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('📨 [WebSocket] رسالة مستلمة:', message);

            // Handle different message types
            if (message.type === 'INVALIDATE') {
              const queryKey = [message.entity, message.id].filter(Boolean);
              console.log('🔄 [WebSocket] تحديث الـ cache:', queryKey);
              queryClient.invalidateQueries({ queryKey });
            } else if (message.type === 'UPDATE_ALL') {
              // Invalidate all queries for an entity
              queryClient.invalidateQueries({ 
                queryKey: [message.entity],
                exact: false 
              });
            }
          } catch (error) {
            console.error('❌ [WebSocket] خطأ في معالجة الرسالة:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('❌ [WebSocket] خطأ في الاتصال:', error);
        };

        ws.onclose = () => {
          console.log('🔌 [WebSocket] تم قطع الاتصال - إعادة الاتصال خلال 3 ثوانٍ');
          // Reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };

        return ws;
      } catch (error) {
        console.error('❌ [WebSocket] خطأ في إنشاء الاتصال:', error);
        // Retry after 3 seconds
        setTimeout(connectWebSocket, 3000);
      }
    };

    const ws = connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [queryClient, toast]);
}
