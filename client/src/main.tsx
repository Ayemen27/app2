import { createRoot } from "react-dom/client";
import { initializeDB } from "./offline/db";
import App from "./App";
import "./index.css";

// 🚀 تتبع عملية الإقلاع بشكل مبسط وموثوق
console.log("BOOT: START");

const rootElement = document.getElementById("root");

if (rootElement) {
  // تنظيف الحاوية ووضع رسالة بسيطة
  rootElement.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;">جاري تشغيل التطبيق...</div>';
  
  const start = async () => {
    try {
      console.log("BOOT: INIT_DB");
      await initializeDB().catch(e => console.warn("BOOT: DB_WARN", e));

      console.log("BOOT: RENDER");
      const root = createRoot(rootElement);
      root.render(<App />);
      console.log("BOOT: SUCCESS");
    } catch (err: any) {
      console.error("BOOT: FATAL", err);
      rootElement.innerHTML = `<div style="padding:20px;color:red;direction:rtl;text-align:center;">
        <h2>حدث خطأ فني أثناء التشغيل</h2>
        <pre style="text-align:left;display:inline-block;padding:10px;background:#f5f5f5;">${err.stack || err.message}</pre>
      </div>`;
    }
  };

  start();
} else {
  console.error("BOOT: NO_ROOT");
}
