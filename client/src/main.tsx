import "./lib/instrumentation";
import { createRoot } from "react-dom/client";
import { initializeDB } from "./offline/db";
import App from "./App";
import "./index.css";
import "./nav-fix.css";

const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] New version available, reloading...');
            window.location.reload();
          }
        });
      }
    });

    registration.update().catch(() => {});
  } catch (err) {
    console.error('[SW] Registration failed:', err);
  }

  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        if (name.includes('binarjoin-v') && name !== 'binarjoin-v6') {
          await caches.delete(name);
        }
      }
    } catch (_) {}
  }
};

const startApp = async () => {
  const rootElement = document.getElementById("root");
  if (!rootElement) return;

  try {
    registerServiceWorker();

    initializeDB().catch(console.error);

    window.onerror = (message, source, lineno, colno, error) => {
      console.error("Global error caught:", { message, source, lineno, colno, error });
      fetch('/api/crashes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exceptionType: 'GlobalUncaughtError',
          message: String(message),
          stackTrace: error?.stack || `${source}:${lineno}:${colno}`,
          severity: 'critical',
          deviceId: localStorage.getItem('deviceId') || 'unknown'
        })
      }).catch(() => {});
    };

    const root = createRoot(rootElement);
    root.render(<App />);
  } catch (err: any) {
    console.error("Fatal startup error:", err);
    rootElement.innerHTML = `<div style="padding:20px;text-align:center;direction:rtl;">حدث خطأ أثناء تشغيل التطبيق. يرجى تحديث الصفحة.</div>`;
  }
};

startApp();
