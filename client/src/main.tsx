import { createRoot } from "react-dom/client";
import { initializeDB } from "./offline/db";
import App from "./App";
import "./index.css";

console.log("%c🚀 [Main] Bootstrap Start", "color: blue; font-weight: bold;");

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = createRoot(rootElement);
  
  initializeDB()
    .then(() => {
      console.log("✅ [Main] DB Ready");
      root.render(<App />);
    })
    .catch((err) => {
      console.error("⚠️ [Main] DB Error:", err);
      root.render(<App />);
    });
} else {
  console.error("❌ [Main] No #root");
}
