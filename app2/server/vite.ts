import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // استخراج اسم المضيف من متغيرات بيئة Replit
  const replitHost = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS || '';
  
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: {
      middlewareMode: true,
      hmr: { 
        server,
        protocol: 'wss',
        host: replitHost,
        clientPort: 443,
      },
      allowedHosts: true,
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  
  // SPA fallback - serve index.html for all non-API routes
  app.use("*", async (req, res, next) => {
    // Skip API routes - let them be handled by route handlers
    if (req.originalUrl.startsWith('/api/')) {
      console.log(`[Vite] Skipping API route: ${req.originalUrl}`);
      return next();
    }

    const url = req.originalUrl;

    // Skip Vite special URLs
    if (url.startsWith('/@')) {
      console.log(`[Vite] Skipping Vite special URL: ${url}`);
      return next();
    }

    // Skip requests with file extensions (let Vite handle them)
    if (/\.\w+$/i.test(url)) {
      console.log(`[Vite] Skipping file request: ${url}`);
      return next();
    }

    // Serve index.html for SPA navigation
    console.log(`[Vite] Serving index.html for: ${url}`);
    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      console.error(`[Vite] Error serving index.html for ${url}:`, e);
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
