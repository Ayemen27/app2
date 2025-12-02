import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import "./db"; // ✅ تشغيل نظام الأمان وإعداد اتصال قاعدة البيانات app2data
import authRoutes from './routes/auth.js';
import { permissionsRouter } from './routes/permissions';
import { initializeRouteOrganizer } from './routes/routerOrganizer.js';
import sshRoutes from './routes/modules/sshRoutes';
import { compressionMiddleware, cacheHeaders, performanceHeaders } from "./middleware/compression";
import { generalRateLimit, trackSuspiciousActivity, securityHeaders } from "./middleware/auth";
import { autoSchemaPush } from './auto-schema-push';
import http from 'http';
import { Server } from 'socket.io';
import compression from "compression"; // Import compression

// Assume setupSession is defined elsewhere and imported
// For demonstration purposes, let's define a placeholder if it's not in the original snippet
const setupSession = (app: express.Express) => {
  // Placeholder for session setup
  console.log("Session setup placeholder");
};


const app = express();

// 🛡️ **Security Headers - يحمي من XSS, clickjacking, MIME sniffing**
const getCSPDirectives = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const scriptSources = ["'self'", "'unsafe-inline'", "'unsafe-eval'"];
  
  // Add production domain if available
  if (isProduction && process.env.CUSTOM_DOMAIN) {
    scriptSources.push(`https://${process.env.CUSTOM_DOMAIN}`);
  }
  
  // Add CloudFlare and external services
  scriptSources.push("https://static.cloudflareinsights.com", "https://replit.com", "https://cdn.jsdelivr.net");
  
  const connectSources = ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com", "ws:", "wss:", "https:", "http:"];
  
  // Add WebSocket support for Socket.IO
  if (isProduction && process.env.CUSTOM_DOMAIN) {
    connectSources.push(`https://${process.env.CUSTOM_DOMAIN}`, `wss://${process.env.CUSTOM_DOMAIN}`);
  }
  
  return {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com", "data:"],
    scriptSrc: scriptSources,
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    connectSrc: connectSources,
    frameSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    childSrc: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'self'"]
  };
};

app.use(helmet({
  contentSecurityPolicy: {
    directives: getCSPDirectives(),
    reportOnly: false // enforced, not just reported
  },
  crossOriginEmbedderPolicy: false
}));

// 🌐 **CORS Configuration - يمنع Cross-Origin attacks**
const getAllowedOrigins = (): string[] => {
  const isProduction = process.env.NODE_ENV === 'production';
  const origins: string[] = [];

  // إضافة نطاقات Replit تلقائياً (HTTPS فقط)
  if (process.env.REPLIT_DOMAINS) {
    origins.push(`https://${process.env.REPLIT_DOMAINS}`);
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    origins.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }

  // إضافة نطاق مخصص من متغيرات البيئة (للإنتاج)
  if (process.env.CUSTOM_DOMAIN) {
    origins.push(`https://${process.env.CUSTOM_DOMAIN}`);
  }

  // في بيئة التطوير فقط، إضافة localhost
  if (!isProduction) {
    const PORT = process.env.PORT || '5000';
    origins.push(`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`, `http://0.0.0.0:${PORT}`);
  }

  // في الإنتاج، إذا لم توجد نطاقات، رفض الطلبات
  if (isProduction && origins.length === 0) {
    console.warn('⚠️ [CORS] لم يتم تكوين نطاقات للإنتاج - يُرجى تعيين REPLIT_DOMAINS أو CUSTOM_DOMAIN');
    return [];
  }

  return origins.length > 0 ? origins : [`http://localhost:${process.env.PORT || '5000'}`];
};

app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 🔧 **Fix trust proxy for rate limiting** - هام لأمان rate limiting
// Using '1' to trust the first proxy (Replit's proxy) instead of 'true'
app.set("trust proxy", 1);

app.use(express.json({ limit: "1mb" }));
app.use(compressionMiddleware);
app.use(performanceHeaders);

// ⚙️ **تطبيق الـ middleware الشاملة**
app.use(generalRateLimit);
app.use(trackSuspiciousActivity);
app.use(securityHeaders);

// Create HTTP server for Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: getAllowedOrigins(),
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store io instance globally for mutations
(global as any).io = io;

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('🔌 [WebSocket] عميل متصل:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔌 [WebSocket] عميل قطع الاتصال:', socket.id);
  });
});

// ✅ **Routes Registration**
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "2.0.0-organized"
  });
});

// Use auth routes
app.use("/api/auth", authRoutes);

// Use permissions routes
app.use("/api/permissions", permissionsRouter);

// Use SSH routes
app.use(sshRoutes);

// Initialize route organizer
initializeRouteOrganizer(app);

// ✅ **Error Handler Middleware**
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ message });
  throw err;
});

// importantly only setup vite in development and after
// setting up all the other routes so the catch-all route
// doesn't interfere with the other routes
if (app.get("env") === "development") {
  setupVite(app, server);
} else {
  serveStatic(app);
}

// ALWAYS serve the app on the port specified in the environment variable PORT
// Other ports are firewalled. Default to 5000 if not specified.
// this serves both the API and the client.
// It is the only port that is not firewalled.

// قراءة المنفذ بنفس أولوية قراءة متغيرات البيئة
const PORT = parseInt(process.env.PORT || '5000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log('🚀 بدء تشغيل الخادم...');
console.log('📂 مجلد العمل:', process.cwd());
console.log('🌐 المنفذ:', PORT);
console.log('🔧 بيئة التشغيل:', NODE_ENV);

(async () => {
  try {
    const serverInstance = server.listen(PORT, "0.0.0.0", async () => {
      log(`serving on port ${PORT}`);
      console.log('✅ Socket.IO server متشغل');

      // ✅ تم تعطيل auto-schema-push مؤقتاً لحل مشكلة التجميد
      // يمكن تشغيله يدوياً عند الحاجة
      console.log('ℹ️ [Schema Push] معطل مؤقتاً - يمكن تشغيله يدوياً عند الحاجة');
      // setTimeout(async () => {
      //   try {
      //     await autoSchemaPush();
      //   } catch (error) {
      //     console.error('⚠️ [Schema Push] خطأ في التطبيق التلقائي:', error);
      //   }
      // }, 2000);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      serverInstance.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ خطأ في بدء الخادم:', error);
    process.exit(1);
  }
})();