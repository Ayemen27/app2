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
  // حساب المسار الصحيح من موقع الملف الفعلي
  let distPath = null;
  
  try {
    // استخدام __dirname بطريقة صحيحة في ESM
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // جرب المسارات المحتملة بالترتيب
    const possiblePaths = [
      path.resolve(__dirname, "..", "dist", "public"), // المسار النسبي من server/static.ts
      path.resolve(process.cwd(), "dist", "public"), // مسار working directory
      "/home/administrator/app/dist/public", // المسار المطلق على الخادم
      path.join(process.cwd(), "dist/public"), // بديل آخر
    ];
    
    console.log(`📂 Server directory: ${__dirname}`);
    console.log(`📂 Working directory: ${process.cwd()}`);
    
    for (const tryPath of possiblePaths) {
      console.log(`🔍 Checking: ${tryPath}`);
      if (fs.existsSync(tryPath)) {
        distPath = tryPath;
        console.log(`✅ Found dist path: ${distPath}`);
        break;
      }
    }
  } catch (e) {
    console.error(`❌ Error calculating path: ${e}`);
  }
  
  if (!distPath) {
    console.warn(`⚠️ Build directory not found in any expected location, using default path`);
    distPath = path.resolve(process.cwd(), "dist", "public");
    try {
      fs.mkdirSync(distPath, { recursive: true });
      console.log(`✅ Created build directory: ${distPath}`);
    } catch (e) {
      console.error(`❌ Failed to create build directory: ${e}`);
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
