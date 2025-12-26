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

export function serveStatic(app: Express) {
  // في بيئة الإنتاج (esbuild)، import.meta.url قد لا تعطي المسار الصحيح
  // استخدم مسار working directory المطلق
  const cwd = process.cwd();
  const distPath = path.join(cwd, "dist", "public");
  
  console.log(`📂 CWD: ${cwd}`);
  console.log(`📂 Dist path: ${distPath}`);
  console.log(`✅ Index.html exists: ${fs.existsSync(path.join(distPath, 'index.html'))}`);
  
  // تأكد من وجود المجلد
  if (!fs.existsSync(distPath)) {
    console.warn(`⚠️ Dist directory not found: ${distPath}`);
    try {
      fs.mkdirSync(distPath, { recursive: true });
    } catch (e) {
      console.error(`❌ Failed to create dist directory: ${e}`);
    }
  }

  console.log(`📂 Serving static files from: ${distPath}`);
  console.log(`✅ Checking if index.html exists: ${fs.existsSync(path.join(distPath, 'index.html'))}`);
  app.use(express.static(distPath));

  // Serve index.html for all non-API routes
  app.use("*", (req, res, next) => {
    if (req.originalUrl.startsWith('/api/')) {
      return next();
    }

    // Static files already handled by express.static above
    // For SPA routing, serve index.html for all other requests
    const indexPath = path.resolve(distPath, "index.html");
    console.log(`📄 Attempting to serve index.html from: ${indexPath} for path: ${req.originalUrl}`);
    
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.error(`❌ index.html not found at: ${indexPath}`);
      res.status(404).send(`index.html not found at ${indexPath}`);
    }
  });
}
