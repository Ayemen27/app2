import { trackLog } from "@/lib/debug-tracker";
trackLog('MAIN_TSX_START', { timestamp: Date.now() });
import { ENV } from "@/lib/env";
trackLog('ENV_LOADED', {
  platform: ENV.platform,
  isNative: ENV.isNative,
  authStrategy: ENV.authStrategy,
  apiBaseUrl: ENV.getApiBaseUrl(),
  isAndroid: ENV.isAndroid,
});
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
            window.location.reload();
          }
        });
      }
    });

    registration.update().catch(() => {});
  } catch (err) {
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
  trackLog('START_APP', 'startApp() called');
  const rootElement = document.getElementById("root");
  if (!rootElement) { trackLog('ERROR_NO_ROOT', 'root element not found'); return; }

  try {
    registerServiceWorker();

    initializeDB().catch(e => { trackLog('DB_INIT_ERROR', e?.message); });

    window.onerror = (message, source, lineno, colno, error) => {
      fetch(ENV.getApiUrl('/api/crashes'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-request-nonce': crypto.randomUUID(), 'x-request-timestamp': new Date().toISOString() },
        body: JSON.stringify({
          exceptionType: 'GlobalUncaughtError',
          message: String(message),
          stackTrace: error?.stack || `${source}:${lineno}:${colno}`,
          severity: 'critical',
          deviceId: localStorage.getItem('deviceId') || 'unknown'
        })
      }).catch(() => {});
    };

    trackLog('RENDER_START', 'Creating React root');
    const root = createRoot(rootElement);
    root.render(<App />);
    trackLog('RENDER_DONE', 'React root rendered');

    setTimeout(async () => {
      try {
        const { initializeInstrumentation } = await import('./lib/instrumentation');
        await initializeInstrumentation();
        trackLog('INSTRUMENTATION_OK', 'Instrumentation initialized');
      } catch (e: any) {
        trackLog('INSTRUMENTATION_FAIL', e?.message);
      }
    }, 2000);
  } catch (err: any) {
    trackLog('FATAL_ERROR', err?.message || String(err));
    rootElement.innerHTML = `<div style="padding:20px;text-align:center;direction:rtl;">حدث خطأ أثناء تشغيل التطبيق. يرجى تحديث الصفحة.</div>`;
  }
};

startApp();
