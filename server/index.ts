import './config/env';


import "./lib/telemetry";

import express, { type Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import { pool } from "./db.js";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import { serveStatic, log } from "./static";
import { ENV as envConfig } from "./config/env";
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
import { startNonceCleanup } from './middleware/replay-protection';
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

app.use(cookieParser());

import { apiErrorNormalizer } from './middleware/api-error-normalizer';
app.use('/api', apiErrorNormalizer);

app.get('/favicon.ico', (req: Request, res: Response): void => {
  const faviconPath = path.resolve(process.cwd(), 'client', 'public', 'favicon.ico');
  if (fs.existsSync(faviconPath)) {
    res.setHeader('Content-Type', 'image/x-icon');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(faviconPath);
  }
  res.status(204).end();
});

app.get('/favicon.svg', (req: Request, res: Response): void => {
  const svgPath = path.resolve(process.cwd(), 'client', 'public', 'favicon.svg');
  if (fs.existsSync(svgPath)) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(svgPath);
  }
  res.status(204).end();
});

app.get(['/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'], (req: Request, res: Response): void => {
  const iconPath = path.resolve(process.cwd(), 'client', 'public', req.path.slice(1));
  if (fs.existsSync(iconPath)) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(iconPath);
  }
  res.status(204).end();
});

app.get('/manifest.json', (req: Request, res: Response): void => {
  const manifestPath = path.resolve(process.cwd(), 'client', 'public', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.sendFile(manifestPath);
  }
  res.status(204).end();
});

// 🛡️ Relax security headers for production/deployment stability (Cloudflare Compatible)
app.use((req: Request, res: Response, next: NextFunction): void => {
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

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  const cspConfig = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://*.googleapis.com https://*.gstatic.com https://*.binarjoinanelytic.info https://static.cloudflareinsights.com https://*.cloudflare.com https://cdn-cgi.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com",
    "img-src 'self' data: https: https://*.google-analytics.com https://*.googletagmanager.com",
    "connect-src 'self' capacitor://localhost https://localhost wss://*.replit.dev https://*.googleapis.com https://*.binarjoinanelytic.info https://app2.binarjoinanelytic.info https://*.cloudflareinsights.com https://*.cloudflare.com https://*.firebaseio.com wss://*.firebaseio.com",
    "worker-src 'self' blob:"
  ];

  if (process.env.DOMAIN) {
    const domain = process.env.DOMAIN.replace(/\/$/, '');
    cspConfig[5] = `${cspConfig[5]} ${domain} ${domain}:${envConfig.PORT}`;
  }

  res.setHeader('Content-Security-Policy', cspConfig.join('; ') + ';');
  next();
});

const { isProduction, PORT, PRODUCTION_DOMAIN } = envConfig;
const REPLIT_DOMAIN = envConfig.DOMAIN;

// ✅ Unified CORS Configuration
function normalizeOrigin(origin: string): string {
  try {
    return new URL(origin).origin;
  } catch {
    return origin;
  }
}

const STATIC_ALLOWED_ORIGINS = new Set(
  [
    PRODUCTION_DOMAIN,
    REPLIT_DOMAIN,
    'https://app2.binarjoinanelytic.info',
    'https://binarjoinanelytic.info',
    process.env.DOMAIN?.replace(/\/$/, ''),
    `http://localhost:${PORT}`,
    'http://localhost:3000',
    `http://127.0.0.1:${PORT}`,
    'https://localhost',
    'http://localhost',
  ].filter(Boolean) as string[]
);

const ALLOWED_DOMAIN_SUFFIXES = ['binarjoinanelytic.info'];

function isOriginAllowed(origin: string, isDev: boolean, req?: Request): boolean {
  if (!origin || origin === 'null') return true;
  if (origin.startsWith('capacitor://')) return true;

  const normalized = normalizeOrigin(origin);

  try {
    const parsed = new URL(normalized);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1') return true;
  } catch {}

  if (STATIC_ALLOWED_ORIGINS.has(normalized)) return true;

  for (const suffix of ALLOWED_DOMAIN_SUFFIXES) {
    try {
      const parsed = new URL(normalized);
      if (parsed.hostname === suffix || parsed.hostname.endsWith('.' + suffix)) return true;
    } catch {}
  }

  if (!isProduction && req && req.headers.host) {
    const protocol = req.headers['x-forwarded-proto'] === 'https' || req.secure ? 'https' : 'http';
    if (normalized === `${protocol}://${req.headers.host}`) return true;
  }

  if (isDev) {
    try {
      const parsed = new URL(normalized);
      if (parsed.hostname.endsWith('.replit.dev') || parsed.hostname.endsWith('.replit.app')) return true;
    } catch {}
  }

  return false;
}

const CORS_HEADERS = [
  'Content-Type', 'Authorization', 'X-Requested-With', 'X-Auth-Token',
  'x-auth-token', 'Accept', 'Origin', 'x-device-type', 'x-device-name',
  'x-device-id', 'x-client-platform', 'x-request-nonce', 'x-request-timestamp',
  'x-app-version'
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: string | boolean) => void) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (origin.startsWith('capacitor://') || origin === 'https://localhost') {
      callback(null, origin);
      return;
    }
    const normalized = normalizeOrigin(origin);
    const allowed = isOriginAllowed(normalized, !isProduction);
    if (!allowed && isProduction) {
      console.log(`⚠️ [CORS Blocked] Origin: ${origin}`);
    }
    callback(null, allowed ? normalized : false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: CORS_HEADERS,
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  optionsSuccessStatus: 200,
  maxAge: 86400
};

app.use(cors(corsOptions));

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

import { idempotencyMiddleware, startIdempotencyCleanup } from "./middleware/idempotency";
app.use('/api', idempotencyMiddleware);
startIdempotencyCleanup(3600000);

// Create HTTP server for Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (origin.startsWith('capacitor://') || origin === 'https://localhost') {
        callback(null, origin);
        return;
      }
      const normalized = normalizeOrigin(origin);
      const allowed = isOriginAllowed(normalized, !isProduction);
      callback(null, allowed ? normalized : false);
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store io instance globally for mutations
globalThis.io = io;

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    let token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token || typeof token !== 'string') {
      const cookieHeader = socket.handshake.headers.cookie;
      if (cookieHeader) {
        const match = cookieHeader.match(/accessToken=([^;]+)/);
        if (match) {
          token = match[1];
        }
      }
    }

    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication required'));
    }

    const { verifyAccessToken } = await import('./auth/jwt-utils.js');
    const result = await verifyAccessToken(token);
    if (!result || !result.success || !result.user) {
      return next(new Error('Invalid or expired token'));
    }

    (socket as any).user = result.user;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  const user = (socket as any).user;
  console.log(`🔌 [WebSocket] Authenticated client connected: ${socket.id} (user: ${user?.userId})`);

  socket.join('authenticated');
  if (user?.role === 'admin' || user?.role === 'مدير') {
    socket.join('admin');
  }

  socket.on('disconnect', () => {
    console.log(`🔌 [WebSocket] Client disconnected: ${socket.id}`);
  });
});


// ✅ **Routes Registration**
app.get("/api/health", (req: Request, res: Response): void => {
  const connectionStatus = getConnectionHealthStatus();
  
  res.json({
    success: true,
    data: {
      status: connectionStatus.totalConnections > 0 ? "healthy" : "degraded",
      uptime: process.uptime(),
      version: "2.0.0-organized",
      connections: {
        local: connectionStatus.local,
        supabase: connectionStatus.supabase,
        emergency: connectionStatus.emergencyMode,
        total: connectionStatus.totalConnections
      }
    },
    message: connectionStatus.totalConnections > 0 ? 'النظام يعمل بشكل سليم' : 'النظام يعمل في وضع محدود',
    timestamp: new Date().toISOString()
  });
});

/**
 * 📊 نقطة نهاية صحة الاتصال المفصلة
 */
app.get("/api/connection-health", requireAuth, (req: Request, res: Response): void => {
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
    console.error('❌ [API] خطأ في جلب صحة الاتصال:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب حالة الاتصال',
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 🏥 نقطة نهاية مراقب الصحة الشامل
 */
app.get("/api/health-monitor", requireAuth, (req: Request, res: Response): void => {
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
    console.error('❌ [API] خطأ في مراقب الصحة:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب بيانات مراقب الصحة',
      data: null,
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
    
    await smartConnectionManager.reconnect(reconnectTarget as 'local' | 'supabase' | 'both');
    
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
    console.error('❌ [API] خطأ في إعادة الاتصال:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إعادة الاتصال',
      data: null,
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
    console.error('❌ [API] خطأ في اختبار الاتصال:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في اختبار الاتصال',
      data: null,
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
app.get("/api/schema-status", requireAuth, (req: Request, res: Response): void => {
  try {
    const status = getAutoPushStatus() as Record<string, unknown>;
    const lastCheck = status.lastCheck as Record<string, unknown> | null | undefined;
    res.json({
      success: true,
      data: {
        enabled: status.enabled,
        autoFixEnabled: status.autoFixEnabled,
        lastRun: status.lastRun,
        hoursSinceLastRun: status.hoursSinceLastRun ? Math.round((status.hoursSinceLastRun as number) * 10) / 10 : null,
        lastCheck: lastCheck ? {
          isConsistent: lastCheck.isConsistent,
          missingTables: ((lastCheck.missingTables as unknown[]) || []).length,
          missingColumns: ((lastCheck.missingColumns as unknown[]) || []).length,
          fixableIssues: lastCheck.fixableIssues,
          criticalIssues: lastCheck.criticalIssues
        } : null
      }
    });
  } catch (error: any) {
    console.error('❌ [API] خطأ في حالة المخطط:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب حالة المخطط', data: null });
  }
});


  app.use((req: Request, res: Response, next: NextFunction): void => {
    // ضمان رد JSON لطلبات API حتى في حالة الأخطاء غير المتوقعة
    if (req.path.startsWith('/api')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      // منع إعادة التوجيه التلقائي لطلبات API (التي قد ترسل HTML)
      const oldRedirect = res.redirect;
      res.redirect = function(this: Response, url: string | number) {
        if (typeof url === 'number') {
          return res.status(url).json({ success: false, message: 'Redirect blocked for API' });
        }
        return res.status(302).json({ success: false, message: 'Redirect blocked for API', target: url });
      } as Response['redirect'];
    }
    const start = Date.now();
    const path = req.path;
    let resBody: any;
    const oldJson = res.json;
    res.json = function(body: unknown) {
      resBody = body;
      return oldJson.call(res, body);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        const isSessionProbe = path === '/api/auth/me' && req.method === 'GET' && res.statusCode === 401;
        if (res.statusCode >= 400 && !isSessionProbe) {
          console.log(`🚨 [API Error] ${logLine}`);
          const sanitizedBody = sanitizeLogData(req.body);
          console.log(`📦 Request Body: ${JSON.stringify(sanitizedBody)}`);
          const responsePreview = typeof resBody === 'string' && resBody.startsWith('<!DOCTYPE') ? '[HTML Content]' : JSON.stringify(resBody);
          console.log(`📦 Response Body: ${responsePreview}`);
        } else if (!isSessionProbe) {
          console.log(`🟢 [API] ${logLine}`);
        }
      }
    });

    next();
  });

// Register organized routes (includes auth, permissions, and all other routes)
import { registerOrganizedRoutes } from "./routes/modules/index.js";
registerOrganizedRoutes(app);

// Initialize external services (Telegram, Google Drive)
import { registerRoutes } from "./routes.js";
registerRoutes(app).catch(err => console.error("Failed to initialize services:", err));

import { runAllStartupMigrations } from "./db/startup-migration-coordinator.js";
runAllStartupMigrations().catch(err => console.error("Failed to run startup migrations:", err));

// ✅ تسجيل مسار قائمة المستخدمين (للاستخدام في اختيار المهندس)
app.get("/api/users/list", requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('📊 [API] جلب قائمة المستخدمين');
    const usersList = await db.select({
      id: users.id,
      first_name: users.first_name,
      last_name: users.last_name,
      email: users.email,
      role: users.role,
    }).from(users).orderBy(users.first_name);
    
    const usersWithName = usersList.map((user: { id: string; first_name: string | null; last_name: string | null; email: string; role: string }) => ({
      id: user.id,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
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
      message: "فشل في جلب قائمة المستخدمين"
    });
  }
});

  if (envConfig.isProduction) {
    console.log('📦 [Server] Serving static files in production...');
    serveStatic(app);
  } else {
    console.log('🏗️ [Server] Starting Vite development server...');
    const { setupVite } = await import("./vite.js");
    await setupVite(app, server);
  }

// ✅ **JSON Parse Error Handler** - Returns 400 instead of 500 for malformed JSON
app.use((err: any, req: Request, res: Response, next: NextFunction): any => {
  if (err?.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.message?.includes('JSON') && 'body' in err)) {
    console.warn(`⚠️ [JSON Parse Error] ${req.method} ${req.path}: Invalid JSON body`);
    return res.status(400).json({
      success: false,
      message: "صيغة JSON غير صالحة — تأكد أن جميع المفاتيح والقيم محاطة بعلامات اقتباس مزدوجة",
      code: "INVALID_JSON",
    });
  }
  next(err);
});

// ✅ **Error Handler Middleware** - Moved after static/vite
Sentry.setupExpressErrorHandler(app);
app.use((err: any, req: Request, res: Response, _next: NextFunction): any => {
  const status = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const genericMessage = 'حدث خطأ داخلي في الخادم';

  console.error(`❌ [Global Error] ${req.method} ${req.path}:`, err);

  if (req.path.startsWith('/api/')) {
    return res.status(status).json({ 
      success: false, 
      message: isProduction ? genericMessage : (err.message || genericMessage),
      data: null
    });
  }
  
  res.status(status).send(isProduction ? genericMessage : (err.message || genericMessage));
});

// ✅ **404 Handler for API**
app.use('/api', (req: Request, res: Response, _next: NextFunction): void => {
  res.status(404).json({ 
    success: false, 
    message: `المسار غير موجود: ${req.originalUrl}` 
  });
});

app.use((req: Request, res: Response, next: NextFunction): void => {
  if (req.path.startsWith('/api/')) {
    next();
    return;
  }
  
  // Serve index.html for SPA routing
  const distPaths = [
    path.resolve(process.cwd(), "www"),
    path.resolve(process.cwd(), "dist", "public"),
  ];
  for (const p of distPaths) {
    const indexPath = path.join(p, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
      return;
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
import { closePdfBrowser } from "./services/reports/HtmlToPdfService";
import { CentralLogService } from "./services/CentralLogService";

import { getWhatsAppBot } from "./services/ai-agent/WhatsAppBot";

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ [UnhandledRejection] Unhandled promise rejection:', reason);
});

const activeIntervals: NodeJS.Timeout[] = [];

(async () => {
  try {
    getWhatsAppBot().start().catch(err => console.error('❌ [WhatsAppBot] Startup error:', err));

    startNonceCleanup();

    const serverInstance = server.listen(FINAL_PORT, "0.0.0.0", async () => {
      log(`serving on port ${FINAL_PORT}`);
      console.log('✅ Socket.IO server متشغل');
      
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

      setTimeout(() => {
        try {
          console.log("⏰ بدء جدولة النسخ الاحتياطي التلقائي (كل 6 ساعات)");
          BackupService.startAutoBackupScheduler();
        } catch (e) {
          console.error("❌ Failed to start scheduler:", e);
        }
      }, 60000);

      const reconciliationInterval = setInterval(() => {
        const now = new Date();
        if (now.getHours() === 2 && now.getMinutes() === 0) {
          console.log("🔄 [Reconciliation] بدء المطابقة اليومية التلقائية...");
          FinancialLedgerService.runDailyReconciliation()
            .catch(err => console.error('❌ [Reconciliation] Error during daily reconciliation:', err));
        }
      }, 60000);
      activeIntervals.push(reconciliationInterval);

      const centralLog = CentralLogService.getInstance();
      centralLog.ensureTable().catch(err => console.error('⚠️ [CentralLog] فشل إنشاء الجدول:', err));

      const purgeInterval = setInterval(() => {
        const now = new Date();
        if (now.getHours() === 3 && now.getMinutes() === 0) {
          console.log('🧹 [CentralLog] بدء التنظيف اليومي للسجلات...');
          centralLog.purge({ debug: 3, info: 14, warn: 60, error: 180, critical: 180 })
            .then(result => console.log(`✅ [CentralLog] تم حذف ${result.deleted} سجل`))
            .catch(err => console.error('❌ [CentralLog] خطأ في التنظيف:', err));
        }
      }, 60000);
      activeIntervals.push(purgeInterval);

      const monitoringInterval = setInterval(async () => {
        try {
          const mem = process.memoryUsage();
          const cpu = process.cpuUsage();
          let dbConnections = 0;
          try {
            dbConnections = (pool as any).totalCount || (pool as any)._clients?.length || 0;
          } catch {}

          const monitoringPayload = {
            heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
            rssMB: Math.round(mem.rss / 1024 / 1024),
            externalMB: Math.round(mem.external / 1024 / 1024),
            cpuUser: cpu.user,
            cpuSystem: cpu.system,
            dbConnections,
            uptimeSeconds: Math.round(process.uptime()),
          };

          try {
            await pool.query(
              `INSERT INTO monitoring_data (type, value) VALUES ($1, $2)`,
              ['health_check', JSON.stringify(monitoringPayload)]
            );
          } catch {}

          centralLog.logDomain({
            source: 'system',
            module: 'نظام',
            action: 'health_check',
            level: 'info',
            status: 'success',
            message: `فحص صحة النظام: ذاكرة ${monitoringPayload.heapUsedMB}MB, اتصالات DB ${dbConnections}`,
            details: monitoringPayload,
          });
        } catch (err) {
          console.error('⚠️ [Monitoring] خطأ في جمع بيانات المراقبة:', err);
        }
      }, 300000);
      activeIntervals.push(monitoringInterval);

      setTimeout(async () => {
        const SCHEMA_CHECK_TIMEOUT = 15000;
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

    async function gracefulShutdown(signal: string) {
      console.log(`${signal} signal received: starting graceful shutdown`);

      for (const interval of activeIntervals) {
        clearInterval(interval);
      }
      activeIntervals.length = 0;

      try {
        await new Promise<void>((resolve, reject) => {
          serverInstance.close((err) => {
            if (err) {
              console.error('❌ [Shutdown] Error closing HTTP server:', err);
              reject(err);
            } else {
              console.log('✅ [Shutdown] HTTP server closed');
              resolve();
            }
          });
        });
      } catch {}

      try {
        io.close();
        console.log('✅ [Shutdown] Socket.IO closed');
      } catch (err) {
        console.error('❌ [Shutdown] Error closing Socket.IO:', err);
      }

      try {
        await getWhatsAppBot().disconnect();
        console.log('✅ [Shutdown] WhatsApp bot stopped');
      } catch (err) {
        console.error('❌ [Shutdown] Error stopping WhatsApp bot:', err);
      }

      try {
        await CentralLogService.getInstance().flush();
        console.log('✅ [Shutdown] Central logs flushed');
      } catch (err) {
        console.error('❌ [Shutdown] Error flushing central logs:', err);
      }

      try {
        CentralLogService.getInstance().destroy();
      } catch {}

      try {
        await closePdfBrowser();
        console.log('✅ [Shutdown] PDF browser closed');
      } catch (err) {
        console.error('❌ [Shutdown] Error closing PDF browser:', err);
      }

      try {
        await pool.end();
        console.log('✅ [Shutdown] Database pool closed');
      } catch (err) {
        console.error('❌ [Shutdown] Error closing database pool:', err);
      }

      console.log('✅ [Shutdown] Graceful shutdown complete');
      process.exit(0);
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ خطأ في بدء الخادم:', error);
    process.exit(1);
  }
})();