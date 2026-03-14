import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { io, Socket } from 'socket.io-client';

export function useWebSocketSync() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const connectSocket = () => {
      try {
        console.log('🔌 [Socket.IO] محاولة الاتصال...');
        
        // Socket.IO سيتعامل مع كل شيء تلقائياً
        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.log('🔌 [Socket.IO] No auth token available, skipping connection');
          return;
        }

        const socket = io({
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 10,
          transports: ['websocket', 'polling'],
          auth: { token },
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('✅ [Socket.IO] تم الاتصال بنجاح!', socket.id);
        });

        socket.on('disconnect', (reason: string) => {
          console.log('🔌 [Socket.IO] تم قطع الاتصال:', reason);
        });

        socket.on('connect_error', (error: any) => {
          console.warn('🔌 [Socket.IO] Auth error, updating token:', error.message);
          const freshToken = localStorage.getItem('accessToken');
          if (freshToken) {
            socket.auth = { token: freshToken };
          }
        });

        socket.on('error', (error: any) => {
          console.error('❌ [Socket.IO] خطأ:', error);
        });

        socket.on('message', (message: any) => {
          try {
            console.log('📨 [Socket.IO] رسالة مستلمة:', message);

            if (message.type === 'INVALIDATE') {
              const queryKey = [message.entity, message.id].filter(Boolean);
              console.log('🔄 [Socket.IO] تحديث الـ cache:', queryKey);
              queryClient.invalidateQueries({ queryKey });
            } else if (message.type === 'UPDATE_ALL') {
              queryClient.invalidateQueries({ 
                queryKey: [message.entity],
                exact: false 
              });
            }
          } catch (error) {
            console.error('❌ [Socket.IO] خطأ في معالجة الرسالة:', error);
          }
        });

        socket.on('notification:new', (data: any) => {
          console.log('🔔 [Socket.IO] إشعار جديد:', data);
          queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
          toast({
            title: data.title || 'إشعار جديد',
            description: data.body || '',
          });
        });

        socket.on('entity:update', (data: any) => {
          if (data?.entity === 'notifications') {
            queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
          }
        });

      } catch (error) {
        console.error('❌ [Socket.IO] خطأ في الاتصال:', error);
      }
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [queryClient, toast]);
}
