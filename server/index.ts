import './config/env';

if (process.env.NODE_ENV === 'production') {
  const _noop = () => {};
  console.log = _noop;
  console.debug = _noop;
  console.info = _noop;
}

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
import { users, workers } from '@shared/schema';
import { or, like, eq as eqOp, and as andOp } from 'drizzle-orm';
import http from 'http';
import { Server } from 'socket.io';
import compression from "compression"; 
import { smartConnectionManager } from './services/smart-connection-manager';
import { startNonceCleanup } from './middleware/replay-protection';
import { setupAdvancedErrorTracking } from './middleware/error-tracking';
import { healthMonitor } from './services/HealthMonitor';
import { FcmService } from "./services/FcmService";

// تهيئة الخدمات الخارجية - استدعاء غير متزامن
FcmService.initialize().catch((error: any) => {
  console.error('❌ [Startup] خطأ في تهيئة Firebase:', error.message);
});

import { initializeEmailService } from './services/email-service.js';
initializeEmailService().catch((error: any) => {
  console.error('❌ [Startup] خطأ في تهيئة خدمة البريد الإلكتروني:', error.message);
});

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

// --- [T001] Health & Ready Probes (Kubernetes-style) ---
// Defined BEFORE any heavy middleware (auth, rate-limit, compression)
app.get('/healthz', (req: Request, res: Response) => {
  const health = {
    status: 'ok',
    uptime: process.uptime(),
    pid: process.pid,
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    },
    timestamp: new Date().toISOString()
  };
  res.status(200).json(health);
});

app.get('/readyz', (req: Request, res: Response) => {
  const status = getConnectionHealthStatus();
  // If pool is completely exhausted or disconnected
  const isReady = status.totalConnections > 0;
  
  if (!isReady) {
    return res.status(503).json({
      status: 'service_unavailable',
      reason: 'database_disconnected',
      pool: {
        total: status.totalConnections,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      }
    });
  }
  
  res.status(200).json({
    status: 'ready',
    pool: {
      total: status.totalConnections,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    }
  });
});

// Event Loop Lag Monitor
let lastCheck = Date.now();
setInterval(() => {
  const now = Date.now();
  const lag = now - lastCheck - 1000;
  if (lag > 500) {
    console.warn(`🔴 [Performance] Event loop lag detected: ${lag}ms | Pool: total=${pool.totalCount} idle=${pool.idleCount} waiting=${pool.waitingCount}`);
  }
  lastCheck = now;
}, 1000).unref();
// -------------------------------------------------------

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

app.get('/robots.txt', (req: Request, res: Response): void => {
  const robotsPath = path.resolve(process.cwd(), 'client', 'public', 'robots.txt');
  if (fs.existsSync(robotsPath)) {
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(robotsPath);
  }
  res.status(204).end();
});

app.get('/sitemap.xml', (req: Request, res: Response): void => {
  const sitemapPath = path.resolve(process.cwd(), 'client', 'public', 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(sitemapPath);
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
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
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

  const isProd = process.env.NODE_ENV === 'production';
  const cspConfig = [
    "default-src 'self'",
    // In development Vite requires unsafe-inline for HMR; production enforces strict mode
    isProd
      ? `script-src 'self' https://*.googleapis.com https://*.gstatic.com ${process.env.PRODUCTION_DOMAIN || ''} https://static.cloudflareinsights.com https://*.cloudflare.com https://cdn-cgi.cloudflare.com`
      : `script-src 'self' 'unsafe-inline' https://*.googleapis.com https://*.gstatic.com ${process.env.PRODUCTION_DOMAIN || ''} https://static.cloudflareinsights.com https://*.cloudflare.com https://cdn-cgi.cloudflare.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com",
    "img-src 'self' data: https: https://*.google-analytics.com https://*.googletagmanager.com",
    `connect-src 'self' capacitor://localhost https://localhost wss://*.replit.dev https://*.googleapis.com ${process.env.PRODUCTION_DOMAIN || ''} https://*.cloudflareinsights.com https://*.cloudflare.com https://*.firebaseio.com wss://*.firebaseio.com`,
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
    process.env.DOMAIN?.replace(/\/$/, ''),
    `http://localhost:${PORT}`,
    'http://localhost:3000',
    `http://127.0.0.1:${PORT}`,
    'https://localhost',
    'http://localhost',
  ].filter(Boolean) as string[]
);

const ALLOWED_DOMAIN_SUFFIXES = (process.env.ALLOWED_DOMAIN_SUFFIXES || '').split(',').map(s => s.trim()).filter(Boolean);

function isOriginAllowed(origin: string, isDev: boolean, req?: Request): boolean {
  if (!origin) return true;
  if (origin === 'null') return !isProduction;
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
  exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'Content-Disposition', 'Content-Length', 'Content-Type'],
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
app.use(setupAdvancedErrorTracking());

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
io.on('connection', async (socket) => {
  const user = (socket as any).user;
  console.log(`🔌 [WebSocket] Authenticated client connected: ${socket.id} (user: ${user?.userId})`);

  socket.join('authenticated');
  if (user?.role === 'admin' || user?.role === 'مدير' || user?.role === 'super_admin') {
    socket.join('admin');
  }

  if (user?.userId) {
    try {
      const { projectAccessService } = await import('./services/ProjectAccessService.js');
      const accessible = await projectAccessService.getAccessibleProjectIds(user.userId, user.role || 'user');
      for (const pid of accessible) {
        socket.join(`project:${pid}`);
      }
    } catch (err) {
      console.error('[WebSocket] Failed to load project rooms for user:', err);
    }
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
        emergencyMode: connectionStatus.emergencyMode,
        totalConnections: connectionStatus.totalConnections
      },
      metrics: {
        local: metrics?.local,
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
    const validTargets = ['local', 'both'];
    const reconnectTarget = validTargets.includes(target) ? target : 'both';
    
    console.log(`🔄 [API] Manual reconnection requested for: ${reconnectTarget}`);
    
    await smartConnectionManager.reconnect(reconnectTarget as 'local' | 'both');
    
    const status = smartConnectionManager.getConnectionStatus();
    
    res.json({
      success: true,
      message: `إعادة الاتصال ل ${reconnectTarget} اكتملت`,
      connectionStatus: {
        local: status.local,
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
      },
      summary: {
        allHealthy: results.local.status,
        connectedCount: results.local.status ? 1 : 0
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
  
  if (!connectionStatus.local) {
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

// ✅ تسجيل مسار قائمة المستخدمين (للاستخدام في اختيار المهندس)
// يطبق الصلاحيات: الأدمن يرى الكل، المستخدم العادي يرى نفسه + المهندسين الذين أنشأهم في جدول العمال
app.get("/api/users/list", requireAuth, async (req: any, res: Response) => {
  try {
    const currentUser = req.user;
    const isAdmin = currentUser?.role === 'admin';
    const currentUserId = currentUser?.user_id;

    console.log(`📊 [API] جلب قائمة المهندسين — userId=${currentUserId}, isAdmin=${isAdmin}`);

    let combined: Array<{ id: string; name: string; email?: string | null; role?: string | null; source: 'user' | 'worker' }> = [];

    if (isAdmin) {
      // الأدمن: يرى جميع المستخدمين + جميع العمال من نوع "مهندس"
      const usersList = await db.select({
        id: users.id,
        first_name: users.first_name,
        last_name: users.last_name,
        email: users.email,
        role: users.role,
      }).from(users).orderBy(users.first_name);

      combined = usersList.map((u: any) => ({
        id: u.id,
        name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
        email: u.email,
        role: u.role,
        source: 'user' as const,
      }));

      const engineerWorkers = await db.select({
        id: workers.id,
        name: workers.name,
        type: workers.type,
      }).from(workers).where(like(workers.type, '%مهندس%'));

      const userIds = new Set(combined.map(c => c.id));
      for (const w of engineerWorkers as any[]) {
        if (!userIds.has(w.id)) {
          combined.push({
            id: w.id,
            name: w.name,
            email: null,
            role: 'engineer',
            source: 'worker' as const,
          });
        }
      }
    } else {
      // المستخدم العادي: نفسه فقط + المهندسين (workers) الذين أنشأهم بنفسه
      if (currentUserId) {
        const meRow = await db.select({
          id: users.id,
          first_name: users.first_name,
          last_name: users.last_name,
          email: users.email,
          role: users.role,
        }).from(users).where(eqOp(users.id, currentUserId)).limit(1);

        if (meRow[0]) {
          const me: any = meRow[0];
          combined.push({
            id: me.id,
            name: `${me.first_name || ''} ${me.last_name || ''}`.trim() || me.email,
            email: me.email,
            role: me.role,
            source: 'user' as const,
          });
        }

        const myEngineers = await db.select({
          id: workers.id,
          name: workers.name,
          type: workers.type,
        }).from(workers).where(andOp(
          like(workers.type, '%مهندس%'),
          eqOp(workers.created_by, currentUserId)
        ));

        for (const w of myEngineers as any[]) {
          combined.push({
            id: w.id,
            name: w.name,
            email: null,
            role: 'engineer',
            source: 'worker' as const,
          });
        }
      }
    }

    console.log(`✅ [API] تم جلب ${combined.length} عنصر (مستخدمين + مهندسين)`);
    res.json({
      success: true,
      data: combined,
      message: `تم جلب ${combined.length} عنصر بنجاح`
    });
  } catch (error: any) {
    console.error('❌ [API] خطأ في جلب قائمة المهندسين:', error);
    res.status(500).json({
      success: false,
      data: [],
      message: "فشل في جلب قائمة المهندسين"
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
  const errorMessage = err instanceof Error ? err.message : String(err);

  console.error(`❌ [Global Error] ${req.method} ${req.path}:`, err);

  try {
    const errorObj = err instanceof Error ? err : new Error(errorMessage || genericMessage);
    CentralLogService.getInstance().logError(errorObj, {
      source: 'api',
      action: `${req.method} ${req.path}`,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
    });
  } catch (_logErr) {}

  if (req.path.startsWith('/api/')) {
    return res.status(status).json({ 
      success: false, 
      message: isProduction ? genericMessage : (errorMessage || genericMessage),
      data: null
    });
  }
  
  res.status(status).send(isProduction ? genericMessage : (errorMessage || genericMessage));
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
import { notificationQueueWorker } from "./services/NotificationQueueWorker";
import { tombstonePurgeService } from "./sync/tombstone-purge";
import { appCache } from "./services/MemoryCacheService";

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ [UnhandledRejection] Unhandled promise rejection:', reason);
});

const activeIntervals: NodeJS.Timeout[] = [];

(async () => {
  try {
    try {
      await runAllStartupMigrations();
    } catch (err) {
      console.error("❌ [Startup] Failed to run startup migrations:", err);
      let safeNumericOk = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await new Promise(r => setTimeout(r, attempt * 3000));
          const check = await pool.query(`SELECT safe_numeric('1', 0) AS v`);
          if (check.rows[0]?.v == 1) {
            safeNumericOk = true;
            console.warn("⚠️ [Startup] Migrations failed but safe_numeric exists from previous boot — continuing.");
            break;
          }
        } catch (checkErr) {
          console.warn(`⚠️ [Startup] safe_numeric check attempt ${attempt + 1}/5 failed — retrying...`);
        }
      }
      if (!safeNumericOk) {
        console.warn("⚠️ [Startup] safe_numeric check failed — DB may be overloaded. Continuing anyway to avoid crash loop.");
      }
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const botExplicitlyEnabled = process.env.WHATSAPP_BOT_ENABLED === 'true';
    const botExplicitlyDisabled = process.env.WHATSAPP_BOT_ENABLED === 'false';
    const botEnabled = botExplicitlyEnabled || (isProduction && !botExplicitlyDisabled);
    if (botEnabled) {
      console.log(`🤖 [WhatsAppBot] بدء التشغيل (env=${process.env.NODE_ENV}, WHATSAPP_BOT_ENABLED=${process.env.WHATSAPP_BOT_ENABLED || 'unset'})`);
      getWhatsAppBot().start().catch(err => console.error('❌ [WhatsAppBot] Startup error:', err));
    } else {
      console.log(`⏸️ [WhatsAppBot] البوت معطل (env=${process.env.NODE_ENV}, WHATSAPP_BOT_ENABLED=${process.env.WHATSAPP_BOT_ENABLED || 'unset'}) — يعمل فقط في production أو عند WHATSAPP_BOT_ENABLED=true`);
    }

    const notificationsWorkerEnabled = process.env.NOTIFICATIONS_WORKER_ENABLED === 'true';
    if (notificationsWorkerEnabled) {
      notificationQueueWorker.start().catch(err =>
        console.error('❌ [NotificationQueueWorker] Startup error:', err)
      );
      console.log('🚀 [NotificationQueueWorker] تم بدء معالج طابور الإشعارات');
    } else {
      console.log('⏸️ [NotificationQueueWorker] معطل افتراضياً (جدول notification_queue غير موجود في DB) — للتفعيل: NOTIFICATIONS_WORKER_ENABLED=true بعد إنشاء الجدول');
    }

    // Tombstone Purge Service
    tombstonePurgeService.start().catch(err =>
      console.error('❌ [TombstonePurge] Startup error:', err)
    );

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
          } catch (err) {
            console.warn("[Monitoring] فشل جلب عدد اتصالات DB:", err);
          }

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
          } catch (err) {
            console.warn("[Monitoring] فشل حفظ بيانات المراقبة:", err);
          }

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

        try {
          const { SummaryRebuildService } = await import('./services/SummaryRebuildService');
          await SummaryRebuildService.ensureTriggersExist();
        } catch (error: any) {
          console.warn('⚠️ [SummaryTriggers] خطأ في فحص الـ triggers:', error.message);
        }
      }, 3000);
    });

    let shuttingDown = false;
    async function gracefulShutdown(signal: string) {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`[Shutdown] Signal received: ${signal}`);

      // ضمان مطلق: مهما حدث، نخرج خلال 4 ثوانٍ بكود نجاح (الإغلاق متعمد).
      const forceExitTimeout = setTimeout(() => {
        console.warn('[Shutdown] Forcing clean exit after timeout');
        process.exit(0);
      }, 4000);
      forceExitTimeout.unref?.();

      for (const interval of activeIntervals) {
        try { clearInterval(interval); } catch {}
      }
      activeIntervals.length = 0;

      // غلاف بـ timeout قصير لكل مَهمّة لمنع التعليق.
      const withTimeout = <T>(label: string, p: Promise<T> | T, ms = 1500): Promise<void> =>
        new Promise<void>((resolve) => {
          const t = setTimeout(() => {
            console.warn(`⏱️ [Shutdown] ${label} تجاوز ${ms}ms - تخطي`);
            resolve();
          }, ms);
          Promise.resolve(p)
            .then(() => { clearTimeout(t); resolve(); })
            .catch((err) => {
              clearTimeout(t);
              console.warn(`⚠️ [Shutdown] ${label}:`, err?.message || err);
              resolve();
            });
        });

      // إغلاق HTTP server بشكل فوري (بدون انتظار اتصالات keep-alive).
      const httpClose = withTimeout('HTTP server', new Promise<void>((resolve) => {
        try {
          serverInstance.close(() => resolve());
          // فرض إغلاق الاتصالات المفتوحة.
          (serverInstance as any).closeAllConnections?.();
        } catch { resolve(); }
      }), 1500);

      // كل عمليات التنظيف بالتوازي.
      await Promise.allSettled([
        httpClose,
        withTimeout('Socket.IO', Promise.resolve().then(() => io.close())),
        withTimeout('WhatsApp bot', getWhatsAppBot().disconnect()),
        withTimeout('Notification worker', Promise.resolve().then(() => notificationQueueWorker.stop())),
        withTimeout('Tombstone purge', Promise.resolve().then(() => tombstonePurgeService.stop())),
        withTimeout('App cache', Promise.resolve().then(() => appCache.destroy())),
        withTimeout('Central logs flush', CentralLogService.getInstance().flush()),
        withTimeout('PDF browser', closePdfBrowser()),
        withTimeout('DB pool', pool.end(), 2000),
      ]);

      try { CentralLogService.getInstance().destroy(); } catch {}

      clearTimeout(forceExitTimeout);
      console.log('✅ [Shutdown] Graceful shutdown complete');
      process.exit(0);
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('uncaughtException', (err) => {
      console.error('🚨 [Critical] Uncaught Exception:', {
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
      // In Express production pattern, we log but might not exit unless it's a known fatal error
      // However, usually it's safer to exit after logging to avoid inconsistent state
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 [Critical] Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('beforeExit', (code) => {
      console.log(`[Shutdown] beforeExit code=${code}`);
      try { (process.stdout as any).write?.('', () => {}); } catch {}
    });

    process.on('exit', (code) => {
      // إذا كنا في عملية إغلاق متعمَّد، حوّل أي كود غير صفر إلى صفر
      // لتجنّب وسم workflow بـ FAILED بعد restart عادي.
      if (shuttingDown && code !== 0) {
        console.log(`[Shutdown] exit code=${code} (overriding to 0 - intentional shutdown)`);
      } else {
        console.log(`[Shutdown] exit code=${code}`);
      }
    });
  } catch (error) {
    console.error('❌ خطأ في بدء الخادم:', error);
    process.exit(1);
  }
})();