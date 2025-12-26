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
  const cwd = process.cwd();
  // تأكد من المسار الصحيح سواء في ريبليت أو السيرفر الخارجي
  const distPath = path.resolve(cwd, "dist", "public");
  
  console.log(`📂 Serving static files from: ${distPath}`);
  
  if (!fs.existsSync(distPath)) {
    console.warn(`⚠️ Dist directory not found: ${distPath}. Creating temporary directory.`);
    fs.mkdirSync(distPath, { recursive: true });
  }

  app.use(express.static(distPath));

  app.get("*", (req, res, next) => {
    if (req.originalUrl.startsWith('/api/')) {
      return next();
    }

    const indexPath = path.join(distPath, "index.html");
    
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // إذا لم يتم العثور على الملف، نقوم بمحاولة بناءه برمجياً أو إرجاع رسالة واضحة
      res.status(404).send(`
        <html>
          <head><title>BinarJoin - Build Required</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1>Frontend Build Missing</h1>
            <p>The file <code>index.html</code> was not found at <code>${indexPath}</code>.</p>
            <p>Please run <code>npm run build</code> to generate the assets.</p>
          </body>
        </html>
      `);
    }
  });
}
