import express, { type Express } from "express";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  
  // Look for dist in multiple potential locations
  const distPaths = [
    path.resolve(cwd, "dist", "public"),
    path.resolve(__dirname, "..", "dist", "public"),
    path.resolve(__dirname, "dist", "public")
  ];
  
  let distPath = distPaths[0];
  let indexExists = false;

  for (const p of distPaths) {
    if (fs.existsSync(path.join(p, "index.html"))) {
      distPath = p;
      indexExists = true;
      break;
    }
  }

  console.log(`[Static] NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[Static] Selected distPath: ${distPath}`);
  console.log(`[Static] Index exists: ${indexExists}`);

  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      // Force correct MIME type for JS and TSX/TS files to prevent loading issues in production
      if (filePath.endsWith('.js') || filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      }
      
      // Relax CSP for production to allow scripts and styles
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://*.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.googleapis.com;");

      res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
    }
  }));

  app.get("*", (req, res, next) => {
    if (req.originalUrl.startsWith("/api/")) return next();
    
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // Fallback status page while building or if missing
      res.status(200).send(`
        <html>
          <head>
            <title>BinarJoin - System Status</title>
            <meta http-equiv="refresh" content="5">
          </head>
          <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #f4f4f9;">
            <h1>BinarJoin System</h1>
            <p>The application is online, but frontend assets are being generated.</p>
            <div style="margin: 20px; padding: 20px; background: #fff; border-radius: 8px; display: inline-block; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: left;">
              <strong>Status:</strong> Preparing Assets... <br/>
              <strong>Database:</strong> ${process.env.DATABASE_URL ? "Connected ✅" : "Config Error ❌"} <br/>
              <strong>Environment:</strong> ${process.env.NODE_ENV} <br/>
              <strong>Dist Path:</strong> ${distPath}
            </div>
            <p>This page will refresh automatically every 5 seconds.</p>
          </body>
        </html>
      `);
    }
  });
}
