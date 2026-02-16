import { useMutation, useQueryClient, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useState, useCallback } from 'react';

interface OfflineMutationOptions<TData = any, TVariables = any> {
  endpoint: string | ((variables: TVariables) => string);
  method?: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  invalidateKeys?: readonly (readonly string[] | string[])[];
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  mutationOptions?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>;
}

export function useOfflineMutation<TData = any, TVariables = any>(
  options: OfflineMutationOptions<TData, TVariables>
): UseMutationResult<TData, Error, TVariables> & { pendingOffline: boolean } {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pendingOffline, setPendingOffline] = useState(false);

  const resolveEndpoint = useCallback((variables: TVariables): string => {
    if (typeof options.endpoint === 'function') {
      return options.endpoint(variables);
    }
    return options.endpoint;
  }, [options.endpoint]);

  const mutation = useMutation<TData, Error, TVariables>({
    ...options.mutationOptions,
    mutationFn: async (variables: TVariables) => {
      const endpoint = resolveEndpoint(variables);
      const method = options.method || 'POST';
      const result = await apiRequest(endpoint, method, variables);
      return result as TData;
    },
    onSuccess: (data: TData, variables: TVariables, context: any) => {
      const isOfflineResult = data && typeof data === 'object' && (data as any)?.isOffline;

      if (isOfflineResult) {
        setPendingOffline(true);
        toast({
          title: options.successMessage || 'تم الحفظ محلياً',
          description: 'سيتم مزامنة البيانات تلقائياً عند عودة الاتصال',
        });
      } else {
        setPendingOffline(false);
        if (options.successMessage) {
          toast({
            title: options.successMessage,
          });
        }
      }

      if (options.invalidateKeys) {
        for (const key of options.invalidateKeys) {
          queryClient.invalidateQueries({ queryKey: key as string[], refetchType: 'active' });
        }
      }

      options.onSuccess?.(data, variables);
      options.mutationOptions?.onSuccess?.(data, variables, context);
    },
    onError: (error: Error, variables: TVariables, context: any) => {
      toast({
        title: options.errorMessage || 'حدث خطأ',
        description: error.message,
        variant: 'destructive',
      });
      options.onError?.(error, variables);
      options.mutationOptions?.onError?.(error, variables, context);
    },
  });

  return {
    ...mutation,
    pendingOffline,
  };
}
