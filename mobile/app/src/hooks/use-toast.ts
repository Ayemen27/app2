import { useState, useCallback } from 'react';

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
  className?: string;
}

interface ToastState {
  toasts: Array<ToastProps & { id: string }>;
}

let toastId = 0;

export function useToast() {
  const [state, setState] = useState<ToastState>({ toasts: [] });

  const toast = useCallback((props: ToastProps) => {
    const id = String(++toastId);
    const duration = props.duration || 5000;
    
    console.log(`🔔 [Toast] ${props.title}: ${props.description}`);
    
    setState(prev => ({
      toasts: [...prev.toasts, { ...props, id }]
    }));

    setTimeout(() => {
      setState(prev => ({
        toasts: prev.toasts.filter(t => t.id !== id)
      }));
    }, duration);

    return { id, dismiss: () => {
      setState(prev => ({
        toasts: prev.toasts.filter(t => t.id !== id)
      }));
    }};
  }, []);

  const dismiss = useCallback((toastId?: string) => {
    if (toastId) {
      setState(prev => ({
        toasts: prev.toasts.filter(t => t.id !== toastId)
      }));
    } else {
      setState({ toasts: [] });
    }
  }, []);

  return {
    ...state,
    toast,
    dismiss,
  };
}

export { useToast as toast };
