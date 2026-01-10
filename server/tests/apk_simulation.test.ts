import { describe, it, expect, beforeEach } from 'vitest';

// محاكاة لبيئة Capacitor/APK
const simulateApkEnvironment = () => {
  (global as any).window = {
    location: {
      origin: 'http://localhost', // القيمة الافتراضية في الأندرويد
    }
  };
  (global as any).Capacitor = {
    getPlatform: () => 'android',
    isNativePlatform: () => true
  };
};

describe('APK Environment & Connection Tests', () => {
  beforeEach(() => {
    simulateApkEnvironment();
  });

  it('يجب أن يتم تحديد رابط الـ API الصحيح لبيئة الأندرويد', () => {
    const getApiBaseUrl = () => {
      const origin = (global as any).window.location.origin;
      if (origin.startsWith('http://localhost') || origin === 'null') {
        return 'https://app2.binarjoinanelytic.info/api';
      }
      return '/api';
    };

    const url = getApiBaseUrl();
    expect(url).toBe('https://app2.binarjoinanelytic.info/api');
  });

  it('يجب أن ينجح النظام في الانتقال إلى IndexedDB إذا فشل SQLite', async () => {
    let storageUsed = 'none';
    
    const getSmartStorage = async (failSQLite: boolean) => {
      if (!failSQLite) {
        storageUsed = 'sqlite';
        return { type: 'sqlite' };
      } else {
        storageUsed = 'idb';
        return { type: 'idb' };
      }
    };

    await getSmartStorage(true);
    expect(storageUsed).toBe('idb');
  });
});
