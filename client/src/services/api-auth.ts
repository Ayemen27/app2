import { storeTokens, clearTokens as clearStoredTokens, getAccessToken, getRefreshToken } from '@/lib/auth-token-store';

export class AuthService {
  private static readonly TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';

  static saveToken(token: string): void {
    if (!token) {
      return;
    }
    try {
      const refresh = getRefreshToken() || '';
      storeTokens(token, refresh);
    } catch (error) {
    }
  }

  static getToken(): string | null {
    try {
      const token = getAccessToken();
      if (!token) {
      }
      return token;
    } catch (error) {
      return null;
    }
  }

  static saveRefreshToken(token: string): void {
    if (!token) return;
    try {
      const access = getAccessToken() || '';
      storeTokens(access, token);
    } catch (error) {
    }
  }

  static getRefreshToken(): string | null {
    try {
      return getRefreshToken();
    } catch (error) {
      return null;
    }
  }

  static clearTokens(): void {
    try {
      clearStoredTokens();
    } catch (error) {
    }
  }

  static hasToken(): boolean {
    const token = this.getToken();
    return !!token && token.length > 0;
  }

  static getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
    }

    return headers;
  }
}
