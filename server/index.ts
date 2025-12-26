import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { serveStatic, log } from "./static";
import "./db"; // ✅ تشغيل نظام الأمان وإعداد اتصال قاعدة البيانات
import authRoutes from './routes/auth.js';
import { permissionsRouter } from './routes/permissions';
import { initializeRouteOrganizer } from './routes/routerOrganizer.js';
import { registerRoutes } from "./routes.js";
// sshRoutes removed - not needed
import { compressionMiddleware, cacheHeaders, performanceHeaders } from "./middleware/compression";
import { generalRateLimit, trackSuspiciousActivity, securityHeaders, requireAuth } from "./middleware/auth";
import { runSchemaCheck, getAutoPushStatus } from './auto-schema-push';
import { startAutoBackupScheduler, getAutoBackupStatus, triggerManualBackup, listAutoBackups } from './auto-backup-scheduler';
import { db } from './db.js';
import { users } from '@shared/schema';
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
  // إزالة البروتوكول من DOMAIN إن وجد (https:// أو http://)
  let customDomain = (process.env.DOMAIN || 'app2.binarjoinanelytic.info').trim();
  customDomain = customDomain.replace(/^(https?:\/\/)/, '');
  const isProduction = process.env.NODE_ENV === 'production';
  
  // في الإنتاج، نستخدم إعدادات متساهلة لتجنب مشاكل التحميل
  if (isProduction || customDomain === 'app2.binarjoinanelytic.info') {
    return {
      defaultSrc: ["'self'", "https:", "data:", "blob:", "*"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:", "*"],
      fontSrc: ["'self'", "data:", "https:", "blob:", "*"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "blob:", "*"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "https:", "*"],
      imgSrc: ["'self'", "data:", "https:", "blob:", "*"],
      connectSrc: ["'self'", "https:", "wss:", "ws:", "*"],
      frameSrc: ["'self'", "https:", "*"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:", "blob:", "*"],
      childSrc: ["'self'", "blob:", "*"],
      formAction: ["'self'", "*"],
      frameAncestors: ["'self'", "*"],
      workerSrc: ["'self'", "blob:", "*"]
    };
  }
  
  // في التطوير، نستخدم القيود الأصلية
  return {
    defaultSrc: ["'self'", `https://${customDomain}`, "https://*.cloudflare.com"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com", "data:", "https:"],
    scriptSrc: [
      "'self'", 
      "'unsafe-inline'", 
      "'unsafe-eval'",
      `https://${customDomain}`,
      "https://static.cloudflareinsights.com",
      "https://challenges.cloudflare.com",
      "https://*.cloudflare.com",
      "https://cdn.jsdelivr.net"
    ],
    scriptSrcElem: [
      "'self'",
      "'unsafe-inline'",
      `https://${customDomain}`,
      "https://static.cloudflareinsights.com",
      "https://challenges.cloudflare.com",
      "https://*.cloudflare.com"
    ],
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    connectSrc: [
      "'self'", 
      `https://${customDomain}`,
      `wss://${customDomain}`,
      "https://fonts.googleapis.com", 
      "https://fonts.gstatic.com", 
      "ws:", 
      "wss:", 
      "https:"
    ],
    frameSrc: ["'self'", "https://challenges.cloudflare.com"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    childSrc: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'self'"],
    workerSrc: ["'self'", "blob:"]
  };
};

// في الإنتاج، نعطل CSP مؤقتاً لتجنب المشاكل
if (process.env.NODE_ENV === 'production') {
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));
} else {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: getCSPDirectives(),
      reportOnly: false
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));
}

// 🌐 **CORS Configuration - Enhanced for mobile and web apps**
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // السماح بجميع الـ origins التي تحتوي على النطاق الخاص بنا أو الموبايل
  if (!origin || origin === 'null' || origin.includes('binarjoinanelytic.info') || origin.includes('localhost') || origin.startsWith('http://localhost')) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  optionsSuccessStatus: 200
}));

// 🔧 **Fix trust proxy for rate limiting** - هام لأمان rate limiting
// Using '1' to trust the first proxy (Replit's proxy) instead of 'true'
app.set("trust proxy", 1);

app.use(express.json({ limit: "5mb" }));
app.use(compression()); // Enable global compression middleware
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
    origin: true,
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

// ✅ **Schema Status Endpoint**
app.get("/api/schema-status", requireAuth, (req: Request, res: Response) => {
  try {
    const status = getAutoPushStatus();
    res.json({
      success: true,
      data: {
        enabled: status.enabled,
        autoFixEnabled: status.autoFixEnabled,
        lastRun: status.lastRun,
        hoursSinceLastRun: status.hoursSinceLastRun ? Math.round(status.hoursSinceLastRun * 10) / 10 : null,
        lastCheck: status.lastCheck ? {
          isConsistent: status.lastCheck.isConsistent,
          missingTables: status.lastCheck.missingTables.length,
          missingColumns: status.lastCheck.missingColumns.length,
          fixableIssues: status.lastCheck.fixableIssues,
          criticalIssues: status.lastCheck.criticalIssues
        } : null
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ **Backup Status Endpoints**
app.get("/api/backups/status", requireAuth, (req: Request, res: Response) => {
  try {
    const status = getAutoBackupStatus();
    res.json({
      success: true,
      data: {
        ...status,
        nextBackupInMinutes: Math.round(status.nextBackupIn / 60000),
        lastBackupSizeMB: status.lastBackupSize ? (status.lastBackupSize / 1024 / 1024).toFixed(2) : null
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/backups/list", requireAuth, (req: Request, res: Response) => {
  try {
    const backups = listAutoBackups();
    res.json({
      success: true,
      data: backups.map(b => ({
        ...b,
        sizeMB: (b.size / 1024 / 1024).toFixed(2)
      })),
      total: backups.length
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/backups/trigger", requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await triggerManualBackup();
    if (result.success) {
      res.json({
        success: true,
        message: 'تم إنشاء النسخة الاحتياطية بنجاح',
        data: {
          file: result.file,
          sizeMB: (result.size / 1024 / 1024).toFixed(2),
          tables: result.tablesCount,
          rows: result.rowsCount,
          durationSeconds: (result.duration / 1000).toFixed(1)
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'فشل إنشاء النسخة الاحتياطية'
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Use auth routes
console.log('🔗 [Server] تسجيل مسارات المصادقة على /api/auth');
app.use("/api/auth", authRoutes);
console.log('✅ [Server] تم تسجيل مسارات المصادقة');

// Use permissions routes
app.use("/api/permissions", permissionsRouter);

// Register old routes for compatibility
registerRoutes(app);

// Initialize route organizer
initializeRouteOrganizer(app);

// ✅ تسجيل مسار قائمة المستخدمين (للاستخدام في اختيار المهندس)
app.get("/api/users/list", requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('📊 [API] جلب قائمة المستخدمين');
    const usersList = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
    }).from(users).orderBy(users.firstName);
    
    const usersWithName = usersList.map(user => ({
      id: user.id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      email: user.email,
      role: user.role,
    }));
    
    console.log(`✅ [API] تم جلب ${usersWithName.length} مستخدم`);
    res.json({ 
      success: true, 
      data: usersWithName,
      message: `تم جلب ${usersWithName.length} مستخدم بنجاح`
    });
  } catch (error: any) {
    console.error('❌ [API] خطأ في جلب المستخدمين:', error);
    res.status(500).json({ 
      success: false, 
      data: [], 
      error: error.message,
      message: "فشل في جلب قائمة المستخدمين"
    });
  }
});

// ✅ **Error Handler Middleware**
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ message });
  throw err;
});

// Setup static files or vite dev server based on environment
if (process.env.NODE_ENV === "development") {
  import("./vite.js").then(({ setupVite }) => {
    setupVite(app, server);
  }).catch((err) => {
    console.error('❌ فشل تحميل خادم Vite:', err);
    serveStatic(app);
  });
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

      // ✅ تشغيل نظام النسخ الاحتياطي التلقائي
      startAutoBackupScheduler();

      // ✅ نظام فحص المخطط - يعمل بوضع القراءة فقط مع timeout
      setTimeout(async () => {
        const SCHEMA_CHECK_TIMEOUT = 15000; // 15 ثانية كحد أقصى
        console.log('🔍 [Schema Check] بدء فحص توافق المخطط مع قاعدة البيانات...');
        
        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(() => reject(new Error('Schema check timeout')), SCHEMA_CHECK_TIMEOUT);
        });
        
        try {
          const result = await Promise.race([runSchemaCheck(), timeoutPromise]);
          if (result) {
            if (result.isConsistent) {
              console.log('✅ [Schema Check] المخطط متوافق تماماً مع قاعدة البيانات');
            } else {
              console.log(`⚠️ [Schema Check] اختلافات: ${result.missingTables.length} جداول مفقودة، ${result.missingColumns.length} أعمدة مفقودة`);
              if (result.issues.length > 0) {
                console.log('   أول 3 مشاكل:');
                result.issues.slice(0, 3).forEach((issue: any) => {
                  console.log(`   - [${issue.severity}] ${issue.description}`);
                });
              }
            }
          }
        } catch (error: any) {
          if (error.message === 'Schema check timeout') {
            console.log('⏱️ [Schema Check] تم تجاوز وقت الفحص - سيستمر الخادم بدون انتظار');
          } else {
            console.error('⚠️ [Schema Check] خطأ في الفحص:', error.message);
          }
        }
      }, 3000);
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