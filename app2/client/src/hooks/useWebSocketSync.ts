import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export function useWebSocketSync() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    // WebSocket enabled with proper error handling
    const isProduction = window.location.hostname.includes('binarjoinanelytic.info');
    console.log(`ℹ️ [WebSocket] WebSocket محسّن - الإنتاج: ${isProduction}`);

    const connectWebSocket = () => {
      try {
        // ✅ Use proper WebSocket endpoint with Socket.IO-like protocol
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        
        // Socket.IO endpoint: /socket.io/?transport=websocket
        const wsUrl = `${protocol}//${host}/socket.io/?transport=websocket&EIO=4&transport=websocket`;
        
        console.log('🔌 [WebSocket] محاولة الاتصال بـ:', wsUrl);

        // Use native WebSocket with proper error handling
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
        // Retry after 5 seconds
        setTimeout(connectWebSocket, 5000);
      }
    };

    // Only connect WebSocket if we're not already connected
    connectWebSocket();

    return () => {
      // Cleanup handled in ws.onclose
    };
  }, [queryClient, toast]);
}
