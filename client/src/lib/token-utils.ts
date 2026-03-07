const PLACEHOLDER_TOKENS = [
  'offline-token',
  'offline-refresh',
  'emergency-token',
  'emergency-refresh',
];

const AUTH_MODE_KEY = 'authMode';

export type AuthMode = 'online' | 'offline' | 'emergency';

export function isValidJwt(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  if (PLACEHOLDER_TOKENS.includes(token)) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  if (parts.some(p => p.length === 0)) return false;
  return true;
}

export function isPlaceholderToken(token: string | null | undefined): boolean {
  if (!token) return false;
  return PLACEHOLDER_TOKENS.includes(token);
}

export function getValidToken(key: 'accessToken' | 'refreshToken'): string | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  const token = localStorage.getItem(key);
  if (!token || !isValidJwt(token)) return null;
  return token;
}

export function clearInvalidTokens(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');

  if (accessToken && !isValidJwt(accessToken)) {
    console.log(`🧹 [TokenUtils] مسح accessToken غير صالح: "${accessToken}"`);
    localStorage.removeItem('accessToken');
  }

  if (refreshToken && !isValidJwt(refreshToken)) {
    console.log(`🧹 [TokenUtils] مسح refreshToken غير صالح: "${refreshToken}"`);
    localStorage.removeItem('refreshToken');
  }
}

export function setAuthMode(mode: AuthMode): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  localStorage.setItem(AUTH_MODE_KEY, mode);
  console.log(`🔐 [TokenUtils] وضع المصادقة: ${mode}`);
}

export function getAuthMode(): AuthMode {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return 'online';
  return (localStorage.getItem(AUTH_MODE_KEY) as AuthMode) || 'online';
}

export function isOfflineMode(): boolean {
  const mode = getAuthMode();
  return mode === 'offline' || mode === 'emergency';
}

export function clearAuthState(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem(AUTH_MODE_KEY);
}
