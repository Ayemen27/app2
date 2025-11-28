import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import "./db"; // ✅ تشغيل نظام الأمان وإعداد اتصال قاعدة البيانات app2data
import authRoutes from './routes/auth.js';
import { permissionsRouter } from './routes/permissions';
import { initializeRouteOrganizer } from './routes/routerOrganizer.js';
import { compressionMiddleware, cacheHeaders, performanceHeaders } from "./middleware/compression";
import { generalRateLimit, trackSuspiciousActivity, securityHeaders } from "./middleware/auth";
import { autoSchemaPush } from './auto-schema-push';

const app = express();

// 🛡️ **Security Headers - يحمي من XSS, clickjacking, MIME sniffing**
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://static.cloudflareinsights.com", "https://replit.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com", "https://", "http://"]
    }
  },
  crossOriginEmbedderPolicy: false // For Vite compatibility
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
// This prevents the ERR_ERL_PERMISSIVE_TRUST_PROXY error
app.set('trust proxy', 1);

// 🚫 **Global Rate Limiting - يمنع DDoS and brute force**
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 1000, // 1000 طلب كحد أقصى لكل IP
  message: {
    success: false,
    error: 'تم تجاوز عدد الطلبات المسموح. حاول لاحقاً',
    retryAfter: 15 * 60 // بالثواني
  },
  standardHeaders: true,
  legacyHeaders: false,
  // 🛡️ **IPv6-safe key generator للحماية الآمنة**
  keyGenerator: (req) => {
    // استخدام express-rate-limit's built-in IP handling
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]) ||
               req.connection.remoteAddress ||
               req.socket.remoteAddress ||
               'unknown';

    // تطهير IPv6 addresses وIPv4-mapped IPv6 addresses
    if (typeof ip === 'string') {
      // إزالة IPv4-mapped IPv6 prefix
      return ip.replace(/^::ffff:/, '').trim();
    }
    return ip || 'unknown';
  }
});

app.use(globalRateLimit);

// 📝 **Body parsing middleware**
app.use(express.json({ limit: '10mb' })); // حماية من payload كبيرة
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// إعداد الـ Middleware الأساسي
app.use(compressionMiddleware);
app.use(performanceHeaders);
app.use(cacheHeaders);
app.use(generalRateLimit);
app.use(trackSuspiciousActivity);
app.use(securityHeaders);
app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


(async () => {
  // 🧹 تم حذف نظام تنظيف مهام الهجرة

  // 🔐 تسجيل مسارات المصادقة أولاً - يجب أن تكون عامة وغير محمية
  app.use('/api/auth', authRoutes);

  // 🔒 تسجيل مسارات الصلاحيات
  app.use('/api/permissions', permissionsRouter);

  // 🏗️ تهيئة النظام التنظيمي للمسارات
  initializeRouteOrganizer(app);

  // 📊 تسجيل باقي المسارات المحمية
  const server = await registerRoutes(app);

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
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ✅ معالج شامل للأخطاء 404 - بعد إعداد الملفات الثابتة
  app.use("*", (req, res) => {
    console.log(`❌ [404] مسار غير موجود: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
      success: false,
      error: "المسار غير موجود",
      message: `لم يتم العثور على المسار: ${req.method} ${req.originalUrl}`,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl
    });
  });

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

  const serverInstance = app.listen(PORT, "0.0.0.0", async () => {
    log(`serving on port ${PORT}`);

    // تطبيق المخطط التلقائي بعد بدء الخادم
    setTimeout(async () => {
      try {
        await autoSchemaPush();
      } catch (error) {
        console.error('⚠️ [Schema Push] خطأ في التطبيق التلقائي:', error);
      }
    }, 2000); // انتظار ثانيتين لضمان استقرار الخادم
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    serverInstance.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
})();