import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

import express, { type Express } from "express";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function serveStatic(app: Express) {
  const cwd = process.cwd();
  
  // تحديد مسار الملفات الثابتة بشكل مرن يغطي Replit والسيرفر
  const distPaths = [
    path.resolve(cwd, "dist", "public"),
    path.resolve(__dirname, "..", "dist", "public"),
    path.resolve(__dirname, "dist", "public")
  ];
  
  let distPath = distPaths[0];
  for (const p of distPaths) {
    if (fs.existsSync(path.join(p, "index.html"))) {
      distPath = p;
      break;
    }
  }

  console.log(`[Static] Final distPath: ${distPath}`);

  app.use(express.static(distPath));

  app.get("*", (req, res, next) => {
    if (req.originalUrl.startsWith("/api/")) return next();
    
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(200).send(`
        <html>
          <head><title>BinarJoin - System Initializing</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #f4f4f9;">
            <h1>BinarJoin System</h1>
            <p>The system is online. Frontend assets are being prepared.</p>
            <p>Please refresh in a few seconds.</p>
            <script>setTimeout(() => location.reload(), 5000);</script>
          </body>
        </html>
      `);
    }
  });
}

