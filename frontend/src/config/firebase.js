/**
 * Firebase Client Config for Web Push Notifications & FCM.
 */
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || 'AIzaSyMockKeyForDev123456789',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || 'mediqueue-hospital.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || 'mediqueue-hospital',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || 'mediqueue-hospital.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || '1:123456789012:web:abcdef123456',
};

let app;
let messaging;

try {
  app = initializeApp(firebaseConfig);
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window) {
    messaging = getMessaging(app);
  }
} catch (err) {
  console.warn('Firebase Messaging init warning:', err.message);
}

/**
 * Request notification permission from browser and fetch FCM device token.
 */
export const requestFCMToken = async () => {
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BPMockVapidKeyForDevelopmentOnly123456789',
      });
      console.log('✅ FCM Device Token obtained:', token ? token.slice(0, 15) + '...' : null);
      return token;
    } else {
      console.log('Notification permission denied');
      return null;
    }
  } catch (err) {
    console.warn('FCM getToken error:', err.message);
    return null;
  }
};

/**
 * Listen for foreground push notifications.
 */
export const onForegroundMessage = (callback) => {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    console.log('🔔 Foreground Push Received:', payload);
    if (callback) callback(payload);
  });
};

export { app, messaging };
