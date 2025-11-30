import { useState, useCallback } from 'react';
import { InspectorState, GalleryComponent, ComponentState } from '../shared/types';

const initialState: InspectorState = {
  isOpen: false,
  selectedComponent: null,
  activeTab: 'preview',
  currentState: 'default',
};

export function useInspector() {
  const [state, setState] = useState<InspectorState>(initialState);

  const openInspector = useCallback((component: GalleryComponent) => {
    setState({
      isOpen: true,
      selectedComponent: component,
      activeTab: 'preview',
      currentState: 'default',
    });
  }, []);

  const closeInspector = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const setActiveTab = useCallback((tab: InspectorState['activeTab']) => {
    setState(prev => ({
      ...prev,
      activeTab: tab,
    }));
  }, []);

  const setCurrentState = useCallback((state: ComponentState) => {
    setState(prev => ({
      ...prev,
      currentState: state,
    }));
  }, []);

  const selectComponent = useCallback((component: GalleryComponent | null) => {
    setState(prev => ({
      ...prev,
      selectedComponent: component,
      isOpen: component !== null,
    }));
  }, []);

  return {
    ...state,
    openInspector,
    closeInspector,
    setActiveTab,
    setCurrentState,
    selectComponent,
  };
}
