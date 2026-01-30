import { createRoot } from "react-dom/client";
import { initializeDB } from "./offline/db";
import App from "./App";
import "./index.css";
import "./nav-fix.css";

// 🚀 تنظيف الكود وتبسيط عملية الإقلاع للإنتاج
const startApp = async () => {
  const rootElement = document.getElementById("root");
  if (!rootElement) return;

  try {
    // تنظيف الكاش وإجبار التحديث عند وجود نسخة جديدة
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.update();
          // الاستماع لتحديثات Service Worker الجديدة
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // يوجد تحديث جديد، إعادة تحميل الصفحة
                  console.log('🔄 تم اكتشاف تحديث جديد، جاري التحديث...');
                  window.location.reload();
                }
              });
            }
          });
        }
      });
      
      // مسح الكاش القديم عند بدء التطبيق
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            if (cacheName.includes('binarjoin-v') && !cacheName.includes('binarjoin-v3')) {
              caches.delete(cacheName);
              console.log('🗑️ تم حذف كاش قديم:', cacheName);
            }
          });
        });
      }
    }

    // تهيئة قاعدة البيانات في الخلفية لتجنب حجب الواجهة
    initializeDB().catch(console.error);

    const root = createRoot(rootElement);
    root.render(<App />);
  } catch (err: any) {
    console.error("Fatal startup error:", err);
    rootElement.innerHTML = `<div style="padding:20px;text-align:center;direction:rtl;">حدث خطأ أثناء تشغيل التطبيق. يرجى تحديث الصفحة.</div>`;
  }
};

startApp();
