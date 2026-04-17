import type { CapacitorConfig } from '@capacitor/cli';

const productionDomain = process.env.PRODUCTION_DOMAIN || '';

const allowNavigation: string[] = [];
if (productionDomain) {
  allowNavigation.push(productionDomain);
  const parts = productionDomain.split('.');
  if (parts.length >= 3) {
    const baseDomain = parts.slice(1).join('.');
    allowNavigation.push(`*.${baseDomain}`);
  }
}

const isProduction = !!productionDomain;

const config: CapacitorConfig = {
  appId: 'com.axion.app',
  appName: 'AXION',
  webDir: 'www',
  android: {
    allowMixedContent: !isProduction,
  },
  server: {
    androidScheme: 'https',
    hostname: 'localhost',
    allowNavigation,
    cleartext: !isProduction,
  },
  plugins: {
    NativeBiometric: {
      faceIdReason: 'تسجيل الدخول بالبصمة',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#2563EB',
      sound: 'default',
    },
    CapacitorHttp: {
      enabled: true,
    },
    CapacitorCookies: {
      enabled: true,
    },
  },
};

export default config;
