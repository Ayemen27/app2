import { storeTokens, clearTokens as clearStoredTokens, getAccessToken, getRefreshToken } from '@/lib/auth-token-store';

export class AuthService {
  private static readonly TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';

  static saveToken(token: string): void {
    if (!token) {
      console.warn('⚠️ محاولة حفظ توكن فارغ');
      return;
    }
    try {
      const refresh = getRefreshToken() || '';
      storeTokens(token, refresh);
      console.log('✅ [AuthService] تم حفظ التوكن بنجاح');
    } catch (error) {
      console.error('❌ [AuthService] خطأ في حفظ التوكن:', error);
    }
  }

  static getToken(): string | null {
    try {
      const token = getAccessToken();
      if (!token) {
        console.warn('⚠️ [AuthService] لا يوجد توكن محفوظ');
      }
      return token;
    } catch (error) {
      console.error('❌ [AuthService] خطأ في جلب التوكن:', error);
      return null;
    }
  }

  static saveRefreshToken(token: string): void {
    if (!token) return;
    try {
      const access = getAccessToken() || '';
      storeTokens(access, token);
      console.log('✅ [AuthService] تم حفظ Refresh Token');
    } catch (error) {
      console.error('❌ [AuthService] خطأ في حفظ Refresh Token:', error);
    }
  }

  static getRefreshToken(): string | null {
    try {
      return getRefreshToken();
    } catch (error) {
      console.error('❌ [AuthService] خطأ في جلب Refresh Token:', error);
      return null;
    }
  }

  static clearTokens(): void {
    try {
      clearStoredTokens();
      console.log('✅ [AuthService] تم مسح التوكنات');
    } catch (error) {
      console.error('❌ [AuthService] خطأ في مسح التوكنات:', error);
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
      console.log('🔐 [AuthService] تم إضافة التوكن لـ headers');
    } else {
      console.warn('⚠️ [AuthService] لا يوجد توكن للإضافة');
    }

    return headers;
  }
}
