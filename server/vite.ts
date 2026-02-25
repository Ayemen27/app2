import type { Express } from "express";
import type { Server } from "http";
import fs from "fs";
import path from "path";

export async function setupVite(app: Express, server: Server) {
  const { createServer: createViteServer, createLogger } = await import("vite");
  const viteConfigModule = await import("../vite.config");
  const viteConfig = viteConfigModule.default;
  const { nanoid } = await import("nanoid");
  
  const viteLogger = createLogger();
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

  // Skip Vite middleware for API routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    
    // Serve Vite assets
    const isViteAsset = req.path.includes('/src/') || 
                        req.path.includes('/node_modules/') || 
                        req.path.includes('@vite/') || 
                        req.path.includes('@id/') ||
                        req.path.endsWith('.tsx') ||
                        req.path.endsWith('.ts');

    if (isViteAsset) {
      if (req.path.endsWith('.tsx') || req.path.endsWith('.ts') || req.path.endsWith('.js') || req.path.endsWith('.jsx')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      }
      return vite.middlewares(req, res, next);
    }

    next();
  });
  
  app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api/')) {
      return next();
    }

    // Logic to decide if we should serve index.html or continue
    const isAsset = req.path.includes('.') && !req.path.endsWith('.html');
    if (isAsset && !req.path.startsWith('/src/')) {
      return vite.middlewares(req, res, next);
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      fs.promises.readFile(clientTemplate, "utf-8").then(async (template) => {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        const page = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      }).catch(next);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
