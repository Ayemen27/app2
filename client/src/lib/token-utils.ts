import { getAccessToken, getRefreshToken, clearTokens } from '@/lib/auth-token-store';

const PLACEHOLDER_TOKENS = [
  'offline-token',
  'offline-refresh',
  'emergency-token',
  'emergency-refresh',
];

const AUTH_MODE_KEY = 'authMode';

export type AuthMode = 'online' | 'offline' | 'emergency';

const TOKEN_EXPIRY_BUFFER_SECONDS = 30;

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, bufferSeconds: number = TOKEN_EXPIRY_BUFFER_SECONDS): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return nowSeconds >= (payload.exp - bufferSeconds);
}

export function getTokenExpiryTime(token: string): number | null {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return null;
  return payload.exp * 1000;
}

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
  const token = key === 'accessToken' ? getAccessToken() : getRefreshToken();
  if (!token || !isValidJwt(token)) return null;
  if (isTokenExpired(token)) {
    if (import.meta.env.DEV) console.log(`[TokenUtils] ${key} expired or expiring soon`);
    return null;
  }
  return token;
}

export function clearInvalidTokens(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  const hasInvalid = (accessToken && !isValidJwt(accessToken)) || (refreshToken && !isValidJwt(refreshToken));
  if (hasInvalid) {
    if (accessToken && !isValidJwt(accessToken)) {
      if (import.meta.env.DEV) console.log(`[TokenUtils] clearing invalid accessToken`);
    }
    if (refreshToken && !isValidJwt(refreshToken)) {
      if (import.meta.env.DEV) console.log(`[TokenUtils] clearing invalid refreshToken`);
    }
    clearTokens();
  }
}

export function setAuthMode(mode: AuthMode): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  localStorage.setItem(AUTH_MODE_KEY, mode);
  if (import.meta.env.DEV) console.log(`🔐 [TokenUtils] وضع المصادقة: ${mode}`);
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
  clearTokens();
  localStorage.removeItem(AUTH_MODE_KEY);
}
