import { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';

interface FloatingButtonContextType {
  setFloatingAction: (action: (() => void) | null, label?: string) => void;
  setRefreshAction: (action: (() => void) | null) => void;
  floatingAction: (() => void) | null;
  floatingLabel: string;
  refreshAction: (() => void) | null;
  setShowAddButton: (show: boolean) => void;
  showAddButton: boolean;
}

const FloatingButtonContext = createContext<FloatingButtonContextType | undefined>(undefined);

export function FloatingButtonProvider({ children }: { children: ReactNode }) {
  const [floatingAction, setAction] = useState<(() => void) | null>(null);
  const [refreshAction, setRefreshActionState] = useState<(() => void) | null>(null);
  const [floatingLabel, setLabel] = useState<string>('إضافة جديد');
  const [showAddButton, setShowAddButton] = useState<boolean>(false);

  const setFloatingAction = useCallback((action: (() => void) | null, label: string = 'إضافة جديد') => {
    setAction(prevAction => {
      if (prevAction === action) return prevAction;
      return action;
    });
    setLabel(prevLabel => {
      if (prevLabel === label) return prevLabel;
      return label;
    });
  }, []);

  const setRefreshAction = useCallback((action: (() => void) | null) => {
    setRefreshActionState(prev => {
      if (prev === action) return prev;
      return action;
    });
  }, []);

  return (
    <FloatingButtonContext.Provider value={{
      setFloatingAction,
      setRefreshAction,
      floatingAction,
      floatingLabel,
      refreshAction,
      setShowAddButton,
      showAddButton,
    }}>
      {children}
    </FloatingButtonContext.Provider>
  );
}

export function useFloatingButton() {
  const context = useContext(FloatingButtonContext);
  if (context === undefined) {
    throw new Error('useFloatingButton must be used within a FloatingButtonProvider');
  }
  return context;
}