import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { io, Socket } from 'socket.io-client';
import { shouldUseBearerAuth, getAccessToken } from '@/lib/auth-token-store';

export function useWebSocketSync() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const connectSocket = () => {
      try {
        
        const useBearer = shouldUseBearerAuth();
        const token = getAccessToken();
        if (useBearer && !token) {
          return;
        }

        const socket = io({
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 10,
          transports: ['websocket', 'polling'],
          ...(useBearer ? { auth: { token } } : { withCredentials: true }),
        });

        socketRef.current = socket;

        socket.on('connect', () => {
        });

        socket.on('disconnect', (reason: string) => {
        });

        socket.on('connect_error', (error: any) => {
          if (shouldUseBearerAuth()) {
            const freshToken = getAccessToken();
            if (freshToken) {
              socket.auth = { token: freshToken };
            }
          }
        });

        socket.on('error', (error: any) => {
        });

        socket.on('message', (message: any) => {
          try {

            if (message.type === 'INVALIDATE') {
              const queryKey = [message.entity, message.id].filter(Boolean);
              queryClient.invalidateQueries({ queryKey });
            } else if (message.type === 'UPDATE_ALL') {
              queryClient.invalidateQueries({ 
                queryKey: [message.entity],
                exact: false 
              });
            }
          } catch (error) {
          }
        });

        socket.on('notification:new', (data: any) => {
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
