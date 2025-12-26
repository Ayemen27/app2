import { createRoot } from "react-dom/client";
import { initializeDB } from "./offline/db";
import App from "./App";
import "./index.css";

// 🚀 تهيئة فورية ومباشرة جداً
console.log("APP: STARTING");

const init = async () => {
  const root = document.getElementById("root");
  if (!root) return;

  try {
    // محاولة تهيئة قاعدة البيانات ولكن لا ننتظرها إذا تعطلت
    initializeDB().catch(e => console.error("DB ERR", e));
    
    // رندر فوري
    const reactRoot = createRoot(root);
    reactRoot.render(<App />);
    console.log("APP: RENDERED");
  } catch (err) {
    console.error("APP: FATAL", err);
    root.innerHTML = '<div style="color:red;padding:20px;text-align:center;">Fatal: ' + err.message + '</div>';
  }
};

init();
