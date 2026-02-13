const PRODUCTION_API = 'https://app2.binarjoinanelytic.info';

function detectIsNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.()) return true;
  if (cap?.isNative) return true;
  if (cap?.getPlatform?.() === 'android' || cap?.getPlatform?.() === 'ios') return true;
  const origin = window.location.origin;
  if (origin.includes('localhost') && !origin.includes(':5000') && !origin.includes(':5173')) return true;
  if (window.location.protocol === 'capacitor:' || window.location.protocol === 'ionic:') return true;
  return false;
}

export const ENV = {
  isProduction: typeof window !== 'undefined' ? 
    (window.location.hostname === 'binarjoinanelytic.info' || window.location.hostname === 'www.binarjoinanelytic.info' || detectIsNativePlatform()) : 
    process.env.NODE_ENV === 'production',
  isAndroid: typeof window !== 'undefined' && detectIsNativePlatform(),
  
  getApiBaseUrl: () => {
    if (typeof window === 'undefined') return process.env.VITE_API_BASE_URL || '';
    
    if (detectIsNativePlatform()) {
      return import.meta.env.VITE_API_BASE_URL || PRODUCTION_API;
    }

    const hostname = window.location.hostname;
    if (hostname === 'binarjoinanelytic.info' || hostname === 'www.binarjoinanelytic.info' || hostname === 'app2.binarjoinanelytic.info') {
      return PRODUCTION_API;
    }

    return '';
  },

  getExternalServerUrl: () => {
    return PRODUCTION_API;
  }
};
