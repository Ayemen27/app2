const NATIVE_DETECTION = (): boolean => {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.()) return true;
  if (cap?.isNative === true) return true;
  if (cap?.getPlatform?.() === 'android' || cap?.getPlatform?.() === 'ios') return true;
  const proto = window.location.protocol;
  return proto === 'capacitor:' || proto === 'ionic:';
};

let _isNative: boolean | null = null;

export function isNativePlatform(): boolean {
  if (_isNative === null) {
    _isNative = NATIVE_DETECTION();
  }
  return _isNative;
}

export function isWebCookieMode(): boolean {
  return !isNativePlatform();
}

export function shouldUseBearerAuth(): boolean {
  return isNativePlatform();
}

export function storeTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;

  if (isNativePlatform()) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  } else {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  if (!isNativePlatform()) return null;
  return localStorage.getItem('accessToken');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  if (!isNativePlatform()) return null;
  return localStorage.getItem('refreshToken');
}

export function clearTokens(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export function getClientPlatformHeader(): Record<string, string> {
  return { 'x-client-platform': isNativePlatform() ? 'native' : 'web' };
}

export function getFetchCredentials(): RequestCredentials {
  return isNativePlatform() ? 'omit' : 'include';
}

export function getAuthHeaders(): Record<string, string> {
  if (!isNativePlatform()) return {};
  const token = getAccessToken();
  if (!token) return {};
  return { 'Authorization': `Bearer ${token}` };
}
