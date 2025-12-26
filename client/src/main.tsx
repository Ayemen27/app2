import { createRoot } from "react-dom/client";
import { initializeDB } from "./offline/db";
import App from "./App";
import "./index.css";

// التشخيص الأساسي المباشر
console.log("%c🚀 [Main] Bootstrap Start", "color: blue; font-weight: bold;");

// إضافة مؤشر مرئي في حال فشل React في التحميل
const checkStatus = setInterval(() => {
  const root = document.getElementById('root');
  if (root && root.innerHTML === '') {
    console.warn("⚠️ [Main] Root is still empty after 3s...");
  } else {
    clearInterval(checkStatus);
  }
}, 3000);

const init = async () => {
  try {
    const rootElement = document.getElementById("root");
    if (!rootElement) throw new Error("Root element not found");

    console.log("📦 [Main] Initializing DB...");
    await initializeDB().catch(e => console.error("DB Init Error:", e));

    console.log("✨ [Main] Rendering App...");
    const root = createRoot(rootElement);
    root.render(<App />);
    console.log("✅ [Main] Rendered");
  } catch (err) {
    console.error("🔥 [Main] Fatal:", err);
    const root = document.getElementById("root");
    if (root) root.innerHTML = `<div style="padding:20px;color:red;">Error: ${err.message}</div>`;
  }
};

init();
