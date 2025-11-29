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
  
  // SPA fallback - serve index.html only for navigation routes (not files with extensions)
  app.use("*", async (req, res, next) => {
    // Skip API routes
    if (req.originalUrl.startsWith('/api/')) {
      return next();
    }

    // Skip Vite special URLs and file requests
    if (req.originalUrl.startsWith('/@') || /\.\w+(\?|$)/i.test(req.originalUrl)) {
      return next();
    }

    // This is a navigation request (no file extension) - serve index.html for SPA
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
      const page = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
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
