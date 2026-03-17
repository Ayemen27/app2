import { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';

interface FloatingButtonContextType {
  setFloatingAction: (action: (() => void) | null, label?: string, color?: string) => void;
  setRefreshAction: (action: (() => void) | null) => void;
  setSecondaryAction: (action: (() => void) | null, label?: string, variant?: 'default' | 'destructive' | 'outline') => void;
  floatingAction: (() => void) | null;
  floatingLabel: string;
  floatingColor: string;
  refreshAction: (() => void) | null;
  secondaryAction: (() => void) | null;
  secondaryLabel: string;
  secondaryVariant: 'default' | 'destructive' | 'outline';
  setShowAddButton: (show: boolean) => void;
  showAddButton: boolean;
}

const FloatingButtonContext = createContext<FloatingButtonContextType | undefined>(undefined);

export function FloatingButtonProvider({ children }: { children: ReactNode }) {
  const [floatingAction, setAction] = useState<(() => void) | null>(null);
  const [refreshAction, setRefreshActionState] = useState<(() => void) | null>(null);
  const [secondaryAction, setSecondaryActionState] = useState<(() => void) | null>(null);
  const [floatingLabel, setLabel] = useState<string>('إضافة جديد');
  const [floatingColor, setColor] = useState<string>('');
  const [secondaryLabel, setSecondaryLabel] = useState<string>('');
  const [secondaryVariant, setSecondaryVariant] = useState<'default' | 'destructive' | 'outline'>('destructive');
  const [showAddButton, setShowAddButton] = useState<boolean>(false);

  const setFloatingAction = useCallback((action: (() => void) | null, label: string = 'إضافة جديد', color: string = '') => {
    setAction(prevAction => {
      if (prevAction === action) return prevAction;
      return action;
    });
    setLabel(prevLabel => {
      if (prevLabel === label) return prevLabel;
      return label;
    });
    setColor(prevColor => {
      if (prevColor === color) return prevColor;
      return color;
    });
  }, []);

  const setRefreshAction = useCallback((action: (() => void) | null) => {
    setRefreshActionState(prev => {
      if (prev === action) return prev;
      return action;
    });
  }, []);

  const setSecondaryAction = useCallback((action: (() => void) | null, label: string = '', variant: 'default' | 'destructive' | 'outline' = 'destructive') => {
    setSecondaryActionState(prev => {
      if (prev === action) return prev;
      return action;
    });
    setSecondaryLabel(prev => {
      if (prev === label) return prev;
      return label;
    });
    setSecondaryVariant(prev => {
      if (prev === variant) return prev;
      return variant;
    });
  }, []);

  return (
    <FloatingButtonContext.Provider value={{
      setFloatingAction,
      setRefreshAction,
      setSecondaryAction,
      floatingAction,
      floatingLabel,
      floatingColor,
      refreshAction,
      secondaryAction,
      secondaryLabel,
      secondaryVariant,
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
