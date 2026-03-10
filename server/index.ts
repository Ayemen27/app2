import { initializeEnvironment } from './utils/env-loader';
// تهيئة البيئة فوراً قبل أي استيراد آخر
initializeEnvironment();

import "../instrumentation.js"; // ✅ تشغيل نظام التتبع OpenTelemetry
import "./lib/telemetry";

import express, { type Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import { pool } from "./db";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import { serveStatic, log } from "./static";
import { envConfig } from "./utils/unified-env";
import "./db"; // ✅ تشغيل نظام الأمان وإعداد اتصال قاعدة البيانات
// sshRoutes removed - not needed
import { compressionMiddleware, cacheHeaders, performanceHeaders } from "./middleware/compression";
import { generalRateLimit, trackSuspiciousActivity, securityHeaders, requireAuth } from "./middleware/auth";
import { runSchemaCheck, getAutoPushStatus } from './auto-schema-push';
import { db, checkDBConnection, getConnectionHealthStatus, smartReconnect } from './db.js';
import { runStartupValidation, getSchemaStatus } from "./services/schema-guard";
import { users } from '@shared/schema';
import http from 'http';
import { Server } from 'socket.io';
import compression from "compression"; 
import { smartConnectionManager } from './services/smart-connection-manager';
import { healthMonitor } from './services/HealthMonitor';
import { FcmService } from "./services/FcmService";

// تهيئة الخدمات الخارجية
FcmService.initialize();

const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'accessToken', 'refreshToken', 'jwt', 'auth_token', 'api_key', 'apiKey', 'authorization', 'currentPassword', 'newPassword', 'confirmPassword'];

function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const sanitized: any = Array.isArray(data) ? [] : {};
  for (const key of Object.keys(data)) {
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      sanitized[key] = sanitizeLogData(data[key]);
    } else {
      sanitized[key] = data[key];
    }
  }
  return sanitized;
}

const app = express();


// 🛡️ Relax security headers for production/deployment stability (Cloudflare Compatible)
app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  if (req.path.endsWith('.tsx') || req.path.endsWith('.ts') || req.path.endsWith('.jsx') || req.path.endsWith('.js') || req.path.includes('@vite') || req.path.includes('/src/') || req.path.includes('/node_modules/')) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  }

  if (req.path.endsWith('.css')) {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
  }

  const cspConfig = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://*.gstatic.com https://*.binarjoinanelytic.info https://static.cloudflareinsights.com https://*.cloudflare.com https://cdn-cgi.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com",
    "img-src 'self' data: https: https://*.google-analytics.com https://*.googletagmanager.com",
    "connect-src 'self' wss://*.replit.dev https://*.googleapis.com https://*.binarjoinanelytic.info https://*.cloudflareinsights.com https://*.cloudflare.com https://*.firebaseio.com wss://*.firebaseio.com",
    "worker-src 'self' blob:"
  ];

  // Add dynamic domain to connect-src if in production
  if (process.env.DOMAIN) {
    const domain = process.env.DOMAIN.replace(/\/$/, '');
    cspConfig[5] = `${cspConfig[5]} ${domain} ${domain}:${envConfig.PORT}`;
  }

  res.setHeader('Content-Security-Policy', cspConfig.join('; ') + ';');
  next();
});

// تم استخدام نظام الاكتشاف الموحد من unified-env
const { isProduction, PORT, REPLIT_DOMAIN, PRODUCTION_DOMAIN } = envConfig;

// ✅ DYNAMIC CORS Configuration
const getAllowedOrigins = (req?: Request) => {
  const origins = [
    `http://localhost:${PORT}`,
    'http://localhost:3000',
    `http://127.0.0.1:${PORT}`,
    PRODUCTION_DOMAIN,
    REPLIT_DOMAIN,
    'https://app2.binarjoinanelytic.info', // الدومين الأساسي
    'https://binarjoinanelytic.info'
  ].filter(Boolean) as string[];

  // إضافة الدومين من متغير البيئة إذا وجد
  if (process.env.DOMAIN) {
    origins.push(process.env.DOMAIN.replace(/\/$/, ''));
  }

  // في بيئة التطوير، نسمح بالدومين الحالي ديناميكياً
  if (!isProduction && req && req.headers.host) {
    const protocol = req.headers['x-forwarded-proto'] === 'https' || req.secure ? 'https' : 'http';
    origins.push(`${protocol}://${req.headers.host}`);
  }

  return origins;
};

app.use(cors({
  origin: (origin, callback) => {
    // طلبات بدون origin (mobile app, Postman) أو طلبات Capacitor
    if (!origin || 
        origin.startsWith('capacitor://') || 
        origin.startsWith('http://localhost') || 
        origin.startsWith('https://localhost') ||
        origin === 'null') {
      callback(null, true);
      return;
    }

    // في الإنتاج، نتحقق بصرامة من الدومين المسموح
    if (isProduction) {
      const allowed = origin === PRODUCTION_DOMAIN || 
                      (origin.includes('binarjoinanelytic.info')) ||
                      origin.startsWith('capacitor://') ||
                      origin.startsWith('http://localhost') ||
                      origin.startsWith('https://localhost') ||
                      origin === 'null';
      
      if (!allowed) {
        console.log(`⚠️ [CORS Blocked] Origin: ${origin}`);
      }
      callback(null, allowed);
      return;
    }

    // في التطوير، نكون أكثر مرونة
    const allowedOrigins = getAllowedOrigins();
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.endsWith('.replit.dev') || 
                      origin.endsWith('.replit.app') ||
                      origin.includes('binarjoinanelytic.info') ||
                      origin.startsWith('capacitor://') ||
                      origin === 'null';

    callback(null, isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'X-Auth-Token',
    'x-auth-token',
    'Accept',
    'Origin',
    'x-device-type',
    'x-device-name',
    'x-device-id',
    'X-Requested-With',
    'x-requested-with'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  optionsSuccessStatus: 200,
  maxAge: 86400
}));

// ✅ Handle preflight requests explicitly
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Auth-Token');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.sendStatus(200);
  }
  next();
});

// 🔧 **Fix trust proxy for rate limiting**
app.set("trust proxy", 1);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(compressionMiddleware);
app.use(performanceHeaders);

// ⚙️ **تطبيق الـ middleware الشاملة**
app.use(generalRateLimit);
app.use(trackSuspiciousActivity);
app.use(securityHeaders);

import { idempotencyMiddleware } from "./middleware/idempotency";
app.use('/api', idempotencyMiddleware);

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
  const connectionStatus = getConnectionHealthStatus();
  
  res.json({
    status: connectionStatus.totalConnections > 0 ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "2.0.0-organized",
    connections: {
      local: connectionStatus.local,
      supabase: connectionStatus.supabase,
      emergency: connectionStatus.emergencyMode,
      total: connectionStatus.totalConnections
    }
  });
});

/**
 * 📊 نقطة نهاية صحة الاتصال المفصلة
 */
app.get("/api/connection-health", requireAuth, (req: Request, res: Response) => {
  try {
    const connectionStatus = getConnectionHealthStatus();
    const metrics = connectionStatus.metrics;
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      connectionStatus: {
        local: connectionStatus.local,
        supabase: connectionStatus.supabase,
        emergencyMode: connectionStatus.emergencyMode,
        totalConnections: connectionStatus.totalConnections
      },
      metrics: {
        local: metrics?.local,
        supabase: metrics?.supabase,
        healthScore: metrics?.healthScore
      },
      recommendations: generateRecommendations(connectionStatus, metrics)
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 🏥 نقطة نهاية مراقب الصحة الشامل
 */
app.get("/api/health-monitor", requireAuth, (req: Request, res: Response) => {
  try {
    const lastStatus = healthMonitor.getLastStatus();
    const metrics = healthMonitor.getMetrics();
    const connectionStatus = getConnectionHealthStatus();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      systemHealth: {
        status: lastStatus?.status || 'unknown',
        emergencyMode: lastStatus?.emergencyMode || false,
        uptime: `${Math.floor(process.uptime() / 60)} minutes`
      },
      databaseConnections: {
        local: connectionStatus.local,
        supabase: connectionStatus.supabase,
        healthy: connectionStatus.totalConnections > 0
      },
      performanceMetrics: {
        databaseLatency: {
          average: `${connectionStatus.metrics?.local?.averageLatency}`,
          successRate: connectionStatus.metrics?.local?.successRate
        },
        memoryUsage: {
          heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
        }
      },
      healthMetrics: {
        totalChecks: metrics.totalChecks,
        healthyChecks: metrics.healthyChecks,
        degradedChecks: metrics.degradedChecks,
        criticalChecks: metrics.criticalChecks,
        averageLatency: `${metrics.averageLatency}ms`
      },
      recommendations: generateRecommendations(connectionStatus, connectionStatus.metrics)
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 🔄 نقطة نهاية إعادة الاتصال الحية
 */
app.post("/api/connection/reconnect", requireAuth, async (req: Request, res: Response) => {
  try {
    const { target } = req.body;
    const validTargets = ['local', 'supabase', 'both'];
    const reconnectTarget = validTargets.includes(target) ? target : 'both';
    
    console.log(`🔄 [API] Manual reconnection requested for: ${reconnectTarget}`);
    
    await smartConnectionManager.reconnect(reconnectTarget as any);
    
    const status = smartConnectionManager.getConnectionStatus();
    
    res.json({
      success: true,
      message: `إعادة الاتصال ل ${reconnectTarget} اكتملت`,
      connectionStatus: {
        local: status.local,
        supabase: status.supabase,
        totalConnections: status.totalConnections
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 🧪 نقطة نهاية اختبار الاتصال
 */
app.get("/api/connection/test", requireAuth, async (req: Request, res: Response) => {
  try {
    const results = await smartConnectionManager.runConnectionTest();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      testResults: {
        local: {
          connected: results.local.status,
          details: results.local.details,
          error: results.local.error
        },
        supabase: {
          connected: results.supabase.status,
          details: results.supabase.details,
          error: results.supabase.error
        }
      },
      summary: {
        allHealthy: results.local.status && results.supabase.status,
        connectedCount: (results.local.status ? 1 : 0) + (results.supabase.status ? 1 : 0)
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 💡 دالة مساعدة لإنشاء توصيات بناءً على حالة الاتصال
 */
function generateRecommendations(connectionStatus: any, metrics: any): string[] {
  const recommendations: string[] = [];
  
  if (!connectionStatus.local && !connectionStatus.supabase) {
    recommendations.push('⚠️ جميع الاتصالات معطلة - النظام في وضع الطوارئ');
    recommendations.push('تحقق من إعدادات قاعدة البيانات');
  }
  
  if (connectionStatus.emergencyMode) {
    recommendations.push('ℹ️ النظام يعمل في وضع الطوارئ مع قاعدة بيانات محلية');
    recommendations.push('استعيد الاتصال بقاعدة البيانات الأساسية');
  }
  
  if (metrics?.local?.averageLatency && parseInt(metrics.local.averageLatency) > 5000) {
    recommendations.push('⚠️ زمن استجابة البيانات عالي جداً');
    recommendations.push('تحقق من أداء الشبكة والخادم');
  }
  
  if (metrics?.local?.successRate && parseFloat(metrics.local.successRate) < 80) {
    recommendations.push('⚠️ معدل نجاح الاتصال منخفض');
    recommendations.push('حاول إعادة الاتصال يدوياً');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ النظام يعمل بكفاءة عالية');
  }
  
  return recommendations;
}

// ✅ **Schema Status Endpoint**
app.get("/api/schema-status", requireAuth, (req: Request, res: Response) => {
  try {
    const status = getAutoPushStatus() as any;
    res.json({
      success: true,
      data: {
        enabled: status.enabled,
        autoFixEnabled: status.autoFixEnabled,
        lastRun: status.lastRun,
        hoursSinceLastRun: status.hoursSinceLastRun ? Math.round(status.hoursSinceLastRun * 10) / 10 : null,
        lastCheck: status.lastCheck ? {
          isConsistent: status.lastCheck.isConsistent,
          missingTables: (status.lastCheck.missingTables || []).length,
          missingColumns: (status.lastCheck.missingColumns || []).length,
          fixableIssues: status.lastCheck.fixableIssues,
          criticalIssues: status.lastCheck.criticalIssues
        } : null
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});


  app.use((req, res, next) => {
    // ضمان رد JSON لطلبات API حتى في حالة الأخطاء غير المتوقعة
    if (req.path.startsWith('/api')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      // منع إعادة التوجيه التلقائي لطلبات API (التي قد ترسل HTML)
      const oldRedirect = res.redirect;
      res.redirect = function(url: string) {
        if (typeof url === 'number') {
          return res.status(url).json({ success: false, message: 'Redirect blocked for API' });
        }
        return res.status(302).json({ success: false, message: 'Redirect blocked for API', target: url });
      } as any;
    }
    const start = Date.now();
    const path = req.path;
    let resBody: any;
    const oldJson = res.json;
    res.json = function(body) {
      resBody = body;
      return oldJson.apply(res, arguments as any);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (res.statusCode >= 400) {
          console.log(`🚨 [API Error] ${logLine}`);
          const sanitizedBody = sanitizeLogData(req.body);
          console.log(`📦 Request Body: ${JSON.stringify(sanitizedBody)}`);
          const responsePreview = typeof resBody === 'string' && resBody.startsWith('<!DOCTYPE') ? '[HTML Content]' : JSON.stringify(resBody);
          console.log(`📦 Response Body: ${responsePreview}`);
        } else {
          console.log(`🟢 [API] ${logLine}`);
        }
      }
    });

    next();
  });

// Register organized routes (includes auth, permissions, and all other routes)
import { registerOrganizedRoutes } from "./routes/modules/index.js";
registerOrganizedRoutes(app);

// Register telemetry/monitoring routes from routes.ts
import { registerRoutes } from "./routes.js";
registerRoutes(app).catch(err => console.error("Failed to register telemetry routes:", err));

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

  // Setup vite dev server if in development
  if (envConfig.NODE_ENV !== "production") {
    console.log('🏗️ [Server] Starting Vite development server...');
    const { setupVite } = await import("./vite.js");
    await setupVite(app, server);
  } else {
    console.log('📦 [Server] Serving static files in production...');
    serveStatic(app);
  }

// ✅ **Error Handler Middleware** - Moved after static/vite
if (Sentry.Handlers) {
  app.use(Sentry.Handlers.errorHandler());
}
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // ضمان إرجاع JSON لمسارات API دائماً
  if (req.path.startsWith('/api/')) {
    return res.status(status).json({ 
      success: false, 
      message,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
  }
  
  res.status(status).send(message);
});

// ✅ **404 Handler for API**
app.use('/api', (req, res, next) => {
  res.status(404).json({ 
    success: false, 
    message: `المسار غير موجود: ${req.originalUrl}` 
  });
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // Serve index.html for SPA routing
  const distPaths = [
    path.resolve(process.cwd(), "www"),
    path.resolve(process.cwd(), "dist", "public"),
  ];
  for (const p of distPaths) {
    const indexPath = path.join(p, "index.html");
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }
  next();
});

const FINAL_PORT = envConfig.PORT;
const NODE_ENV = envConfig.NODE_ENV;

console.log('🚀 بدء تشغيل الخادم...');
console.log('📂 مجلد العمل:', process.cwd());

// فحص سلامة المخطط عند التشغيل (خدمة موحّدة)
runStartupValidation();
console.log('🌐 المنفذ:', FINAL_PORT);
console.log('🔧 بيئة التشغيل:', NODE_ENV);

import { BackupService } from "./services/BackupService";
import { FinancialLedgerService } from "./services/FinancialLedgerService";

import { getWhatsAppBot } from "./services/ai-agent/WhatsAppBot";

(async () => {
  try {
    getWhatsAppBot().start().catch(err => console.error('❌ [WhatsAppBot] Startup error:', err));

    // await BackupService.initialize();
    
    // ✅ تشغيل الخادم أولاً لضمان فتح المنفذ فوراً
    const serverInstance = server.listen(FINAL_PORT, "0.0.0.0", async () => {
      log(`serving on port ${FINAL_PORT}`);
      console.log('✅ Socket.IO server متشغل');
      
      // ✅ فحص الاتصال بقاعدة البيانات في الخلفية (بدون حظر)
      setTimeout(async () => {
        try {
          const isConnected = await checkDBConnection();
          if (!isConnected) {
            console.log("⚠️ [Server] فشل الاتصال بقاعدة البيانات، النظام في وضع الطوارئ...");
          } else {
            console.log("✅ [Server] الاتصال بقاعدة البيانات ناجح");
          }
        } catch (e: any) {
          console.log("⚠️ [Server] تعذر فحص الاتصال:", e.message);
        }
      }, 1000);

      // ✅ تشغيل نظام النسخ الاحتياطي التلقائي
      // تعديل: تشغيل النسخ الاحتياطي بعد فترة أطول لتقليل الحمل عند بدء التشغيل
      setTimeout(() => {
        try {
          console.log("⏰ بدء جدولة النسخ الاحتياطي التلقائي (كل 6 ساعات)");
          BackupService.startAutoBackupScheduler();
        } catch (e) {
          console.error("❌ Failed to start scheduler:", e);
        }
      }, 60000); // الانتظار دقيقة كاملة قبل بدء الجدولة

      setInterval(() => {
        const now = new Date();
        if (now.getHours() === 2 && now.getMinutes() === 0) {
          console.log("🔄 [Reconciliation] بدء المطابقة اليومية التلقائية...");
          FinancialLedgerService.runDailyReconciliation();
        }
      }, 60000);

      // ✅ نظام فحص المخطط - يعمل بوضع القراءة فقط مع timeout
      setTimeout(async () => {
        const SCHEMA_CHECK_TIMEOUT = 15000; // 15 ثانية كحد أقصى
        console.log('🔍 [Schema Check] فحص إضافي بعد اتصال قاعدة البيانات...');
        try {
          const { validateSchemaIntegrity } = await import('./services/schema-guard');
          const result = await Promise.race([
            validateSchemaIntegrity(),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), SCHEMA_CHECK_TIMEOUT))
          ]);
          if (result && result.isConsistent) {
            console.log('✅ [Schema Check] المخطط متوافق تماماً مع قاعدة البيانات');
          }
        } catch (error: any) {
          console.warn('⚠️ [Schema Check] خطأ في الفحص:', error.message);
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