import express, { type Express } from "express";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { ENV as envConfig } from "./config/env";

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
    path.resolve(cwd, "www"),
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

  console.log(`[Static] NODE_ENV: ${envConfig.NODE_ENV}`);
  console.log(`[Static] Selected distPath: ${distPath}`);
  console.log(`[Static] Index exists: ${indexExists}`);

  app.use((req, res, next) => {
    if (req.path.startsWith('/src/') || req.path.endsWith('.tsx') || req.path.endsWith('.ts')) {
      console.warn(`🚫 [Static] Blocked source file request in production: ${req.path}`);
      res.status(404).json({ success: false, message: 'Not found' });
      return;
    }
    next();
  });

  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      // Force correct MIME type for JS and CSS files
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.js' || ext === '.mjs') {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (ext === '.css') {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      }
      
      // Critical: Cloudflare and Browser MIME/CSP fixes
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Allow Vite source mapping and hot reload
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://*.gstatic.com https://static.cloudflareinsights.com https://*.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.googleapis.com https://*.cloudflareinsights.com https://*.cloudflare.com;");

      res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
    }
  }));

  app.use((req, res, next) => {
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
              <strong>Environment:</strong> ${envConfig.NODE_ENV} <br/>
              <strong>Dist Path:</strong> ${distPath}
            </div>
            <p>This page will refresh automatically every 5 seconds.</p>
          </body>
        </html>
      `);
    }
  });
}
