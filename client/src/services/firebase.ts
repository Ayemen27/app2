import { initializeApp } from 'firebase/app';
import { getMessaging, Messaging, getToken, onMessage } from 'firebase/messaging';

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate Firebase config
const isFirebaseConfigValid = (): boolean => {
  return Object.values(firebaseConfig).every((value) => value && typeof value === 'string');
};

let app: ReturnType<typeof initializeApp> | null = null;
let messagingInstance: Messaging | null = null;

/**
 * Initialize Firebase app and messaging service
 * Validates configuration and handles initialization errors
 */
export const initializeFirebase = (): void => {
  try {
    if (!isFirebaseConfigValid()) {
      console.warn('[Firebase] Invalid or missing Firebase configuration in environment variables');
      return;
    }

    if (!app) {
      app = initializeApp(firebaseConfig);
    }

    if (!messagingInstance) {
      messagingInstance = getMessaging(app);
    }
  } catch (error) {
    console.error('[Firebase] Failed to initialize Firebase:', error);
  }
};

/**
 * Get Firebase Messaging instance
 * Ensures Firebase is initialized before returning instance
 */
export const getFirebaseMessaging = (): Messaging | null => {
  if (!messagingInstance) {
    initializeFirebase();
  }
  return messagingInstance;
};

/**
 * Get FCM token for push notifications
 * Requires valid VAPID key to be set in environment
 */
export const getFirebaseToken = async (): Promise<string | null> => {
  try {
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      throw new Error('Firebase Messaging not initialized');
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      throw new Error('VAPID key not configured in environment');
    }

    const token = await getToken(messaging, { vapidKey });
    return token || null;
  } catch (error) {
    console.error('[Firebase] Failed to get FCM token:', error);
    return null;
  }
};

/**
 * Set up message listener for incoming push notifications
 * Handles notification payload and triggers callback
 */
export const setupMessageListener = (
  callback: (payload: Record<string, any>) => void
): (() => void) | null => {
  try {
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      throw new Error('Firebase Messaging not initialized');
    }

    const unsubscribe = onMessage(messaging, (payload) => {
      callback(payload);
    });

    return unsubscribe;
  } catch (error) {
    console.error('[Firebase] Failed to set up message listener:', error);
    return null;
  }
};

export type { Messaging };
