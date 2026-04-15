importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBhVNHGcHWZqbbInv9WUZeyBoPEx3yvN8U",
  authDomain: "app2-eb4df.firebaseapp.com",
  projectId: "app2-eb4df",
  storageBucket: "app2-eb4df.firebasestorage.app",
  messagingSenderId: "364100399820",
  appId: "1:364100399820:android:05fb7a9df8da1b771cc869"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'إشعار جديد';
  const notificationBody = payload.notification?.body || '';
  const notificationIcon = payload.notification?.icon || '/icon-192.png';

  const notificationOptions = {
    body: notificationBody,
    icon: notificationIcon,
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: payload.data || {},
    actions: [
      { action: 'open', title: 'فتح التطبيق' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
