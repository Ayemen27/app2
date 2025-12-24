import { createRoot } from "react-dom/client";
import { initializeDB } from "./offline/db";
import App from "./App";
import "./index.css";

// تهيئة IndexedDB عند تحميل التطبيق
initializeDB()
  .then(() => {
    console.log("[App] ✅ IndexedDB initialized successfully");
  })
  .catch((err) => {
    console.error("[App] ❌ Failed to initialize IndexedDB:", err);
  });

createRoot(document.getElementById("root")!).render(<App />);
