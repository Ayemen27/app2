import { useState, useCallback } from 'react';
import { copyToClipboard } from '../shared/utils';

interface CopyState {
  copied: boolean;
  error: string | null;
}

export function useCopyCode() {
  const [state, setState] = useState<CopyState>({
    copied: false,
    error: null,
  });

  const copy = useCallback(async (code: string) => {
    try {
      await copyToClipboard(code);
      setState({ copied: true, error: null });
      
      setTimeout(() => {
        setState({ copied: false, error: null });
      }, 2000);
      
      return true;
    } catch (error) {
      setState({ copied: false, error: 'فشل في نسخ الكود' });
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ copied: false, error: null });
  }, []);

  return {
    ...state,
    copy,
    reset,
  };
}
