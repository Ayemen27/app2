import { useState, useEffect, useCallback } from 'react';
import { GallerySettings } from '../shared/types';

const STORAGE_KEY = 'gallery-settings';

const defaultSettings: GallerySettings = {
  viewMode: 'grid',
  theme: 'system',
  showCode: false,
  columns: 4,
  language: 'ar',
};

export function useGallerySettings() {
  const [settings, setSettings] = useState<GallerySettings>(() => {
    if (typeof window === 'undefined') return defaultSettings;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      console.warn('Failed to save gallery settings');
    }
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof GallerySettings>(
    key: K,
    value: GallerySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleViewMode = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      viewMode: prev.viewMode === 'grid' ? 'list' : 'grid',
    }));
  }, []);

  const toggleTheme = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : prev.theme === 'dark' ? 'system' : 'light',
    }));
  }, []);

  const toggleShowCode = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      showCode: !prev.showCode,
    }));
  }, []);

  const toggleLanguage = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      language: prev.language === 'ar' ? 'en' : 'ar',
    }));
  }, []);

  const setColumns = useCallback((columns: GallerySettings['columns']) => {
    setSettings(prev => ({ ...prev, columns }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  return {
    settings,
    updateSetting,
    toggleViewMode,
    toggleTheme,
    toggleShowCode,
    toggleLanguage,
    setColumns,
    resetSettings,
  };
}
