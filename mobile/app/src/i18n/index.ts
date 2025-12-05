import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ar from './ar.json';

const resources = {
  ar: {
    translation: ar,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ar',
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export function setRTLDirection(): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
    document.body.style.direction = 'rtl';
    document.body.style.textAlign = 'right';
  }
}

export function initializeI18n(): void {
  setRTLDirection();
  console.log('✅ [i18n] تم تهيئة اللغة العربية و RTL');
}

export default i18n;
