/**
 * فهرس الـ Routers المنظمة
 * Organized Routers Index - الحل الاحترافي لتنظيم المسارات
 */

import express from 'express';
import type { Express } from "express";

// استيراد جميع الـ routers المنظمة
import authRouter from './authRoutes.js';
import healthRouter from './healthRoutes.js';
import projectRouter from './projectRoutes.js';
import { projectTypeRouter } from './projectTypeRoutes.js';
import wellRouter from './wellRoutes.js';
import wellExpenseRouter from './wellExpenseRoutes.js';
import whatsappAIRoutes from './whatsappAIRoutes.js';
// import sshRoutes from './sshRoutes'; // معطل مؤقتاً بسبب مشكلة ssh2
import workerRouter from './workerRoutes.js';
import financialRouter from './financialRoutes.js';
import autocompleteRouter, { registerAutocompleteAdminRoutes } from './autocompleteRoutes.js';
import notificationRouter from './notificationRoutes.js';
import { reportRouter } from './reportRoutes.js';
import activityRouter from './activityRoutes.js';
import aiRouter from './aiRoutes.js';
import syncRouter from './syncRoutes.js';
import tasksRouter from './tasks.js';
import securityRouter from './securityRoutes.js';
import backupRouter from './backupRoutes.js';
import downloadProxyRouter from './downloadProxyRoutes.js';
import { ledgerRouter } from './ledgerRoutes.js';
import equipmentRouter from './equipmentRoutes.js';
import syncAuditRouter from './syncAuditRoutes.js';
import webauthnRouter from './webauthnRoutes.js';
import preferencesRouter from './preferencesRoutes.js';
import permissionRouter from './permissionRoutes.js';
import deploymentRouter, { deploymentPublicRouter } from './deploymentRoutes.js';
import recordTransferRouter from './recordTransferRoutes.js';
import settlementRouter from './settlementRoutes.js';
import inventoryRouter from './inventoryRoutes.js';
import centralLogRouter from './centralLogRoutes.js';
import { globalErrorHandler } from '../../middleware/api-response.js';
import { telemetryRouter } from './telemetryRoutes.js';
import { monitoringRouter } from '../../monitoring/routes.js';

/**
 * تسجيل جميع الـ routers المنظمة
 * Register all organized routers
 */
export function registerOrganizedRoutes(app: Express) {
  console.log('🏗️ [OrganizedRoutes] بدء تسجيل المسارات المنظمة...');

  // ===== المسارات العامة - بدون مصادقة =====

  // مسارات الصحة والمراقبة (عامة)
  app.use('/api', healthRouter);
  app.use('/api/admin', healthRouter);

  // تسجيل مسارات المصادقة والمستخدمين
  app.use('/api/auth', authRouter);
  app.use('/api', authRouter);
  app.use('/api/users', authRouter);

  // مسارات autocomplete - منطق مختلط (عام/محمي)
  app.use('/api/autocomplete', autocompleteRouter);

  // مسارات فحص التحديث - عامة (بدون مصادقة + rate limiting)
  app.use('/api/deployment', deploymentPublicRouter);

  // مسارات إدارة autocomplete - مسجلة مباشرة على المستوى الرئيسي
  registerAutocompleteAdminRoutes(app);

  // ===== المسارات المحمية - تحتاج مصادقة =====

  // 🤖 مسارات الوكيل الذكي (AI Agent)
  // تم نقلها للأعلى لضمان الأولوية القصوى
  app.use('/api/ai', aiRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات الوكيل الذكي: /api/ai');

  // مسارات النسخ الاحتياطي
  app.use('/api/backups', backupRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات النسخ الاحتياطي: /api/backups');

  // مسارات المشاريع
  app.use('/api/projects', projectRouter);

  // مسارات أنواع المشاريع
  app.use('/api/project-types', projectTypeRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات أنواع المشاريع: /api/project-types');

  // مسارات الآبار
  app.use('/api/wells', wellRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات الآبار: /api/wells');

  // مسارات مصاريف الآبار
  app.use('/api/well-expenses', wellExpenseRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات مصاريف الآبار: /api/well-expenses');

  // 📱 مسارات واتساب الذكاء الاصطناعي
  app.use('/api/whatsapp-ai', whatsappAIRoutes);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات واتساب الذكاء الاصطناعي: /api/whatsapp-ai');

  // مسارات العمال - تحتوي على مسارات أساسية ومسارات فرعية
  app.use('/api/workers', workerRouter);
  app.use('/api', workerRouter); // تركيب على /api للمسارات الفرعية مثل worker-attendance
  app.use('/api/worker-attendance', workerRouter);
  app.use('/api/worker-misc-expenses', workerRouter);

  // المسارات المالية
  app.use('/api', financialRouter); // يحتوي على عدة prefixes
  app.use('/api/financial-summary', financialRouter);

  // مسارات التقارير الاحترافية
  app.use('/api', reportRouter);

  // مسارات آخر الإجراءات
  app.use('/api', activityRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات الإجراءات: /api/recent-activities');

  // مسارات القياس والمراقبة (Telemetry & Monitoring)
  app.use('/api', telemetryRouter);
  app.use('/api/monitoring', monitoringRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات القياس والمراقبة: /api (telemetry) + /api/monitoring');

  // مسارات الإشعارات
  app.use('/api/notifications', notificationRouter);
  app.use('/api/admin/notifications', notificationRouter);

  // مسارات المزامنة المتقدمة
  app.use('/api/sync', syncRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات المزامنة المتقدمة: /api/sync');

  // مسارات الأمان
  app.use('/api/security', securityRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات الأمان: /api/security');

  // مسارات المهام
  app.use('/api/tasks', tasksRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات المهام: /api/tasks');

  // مسارات تنزيل الملفات المؤقتة (proxy للأندرويد WebView)
  app.use('/api', downloadProxyRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات التنزيل المؤقت: /api/temp-download');

  // مسارات المعدات
  app.use('/api/equipment', equipmentRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات المعدات: /api/equipment');

  // مسارات دفتر الأستاذ الموحّد (قيد مزدوج + ملخصات + تدقيق + مطابقة)
  app.use('/api/ledger', ledgerRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات دفتر الأستاذ: /api/ledger');

  // مسارات سجل تدقيق المزامنة
  app.use('/api/sync-audit', syncAuditRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات سجل تدقيق المزامنة: /api/sync-audit');

  // مسارات WebAuthn (المصادقة البيومترية)
  app.use('/api/webauthn', webauthnRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات WebAuthn: /api/webauthn');

  // مسارات تفضيلات المستخدم
  app.use('/api/preferences', preferencesRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات التفضيلات: /api/preferences');

  // مسارات الصلاحيات وإدارة الوصول
  app.use('/api/permissions', permissionRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات الصلاحيات: /api/permissions');

  // مسارات النشر والبناء (Deployment & DevOps)
  app.use('/api/deployment', deploymentRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات النشر: /api/deployment');

  app.use('/api/record-transfer', recordTransferRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات نقل السجلات: /api/record-transfer');

  app.use('/api/worker-settlements', settlementRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات تصفية حسابات العمال: /api/worker-settlements');

  app.use('/api/inventory', inventoryRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات إدارة المخزن: /api/inventory');

  app.use('/api/central-logs', centralLogRouter);
  console.log('✅ [OrganizedRoutes] تم تسجيل مسارات بنك السجلات المركزي: /api/central-logs');

  // مسارات الإكمال التلقائي الإضافية
  app.use('/api/worker-transfer-notes', autocompleteRouter);
  app.use('/api/worker-transfer-numbers', autocompleteRouter);

  // تفعيل معالج الأخطاء العالمي في النهاية لجميع المسارات المسجلة أعلاه
  app.use(globalErrorHandler);

  console.log('✅ [OrganizedRoutes] تم تسجيل جميع المسارات المنظمة بنجاح');

  // طباعة ملخص المسارات المسجلة
  const routeSummary = {
    publicRoutes: ['health', 'status', 'db/info', 'autocomplete (HEAD/OPTIONS)'],
    protectedRoutes: [
      'projects/*',
      'workers/*', 
      'fund-transfers/*',
      'project-fund-transfers/*',
      'worker-transfers/*',
      'worker-misc-expenses/*',
      'notifications/*',
      'recent-activities',
      'autocomplete (GET/POST)',
      'ledger/* (قيد مزدوج + ملخصات + تدقيق)',
      'worker-settlements/*'
    ]
  };

  console.log('📋 [OrganizedRoutes] ملخص المسارات المنظمة:');
  console.log(`   🌐 المسارات العامة: ${routeSummary.publicRoutes.length} مجموعة`);
  console.log(`   🔒 المسارات المحمية: ${routeSummary.protectedRoutes.length} مجموعة`);
}

/**
 * معلومات إضافية عن النظام المنظم
 */
const REGISTERED_ROUTE_FILES = new Set([
  'healthRoutes', 'projectRoutes', 'projectTypeRoutes', 'wellRoutes',
  'wellExpenseRoutes', 'workerRoutes', 'financialRoutes', 'autocompleteRoutes',
  'whatsappAIRoutes',
  'notificationRoutes', 'reportRoutes', 'activityRoutes', 'aiRoutes',
  'syncRoutes', 'tasks', 'securityRoutes', 'backupRoutes',
  'downloadProxyRoutes', 'ledgerRoutes', 'equipmentRoutes', 'inventoryRoutes', 'syncAuditRoutes', 'index',
  'authRoutes',
  'systemRoutes',
  'webauthnRoutes',
  'preferencesRoutes',
  'permissionRoutes',
  'deploymentRoutes',
  'telemetryRoutes',
  'recordTransferRoutes',
  'settlementRoutes',
  'centralLogRoutes',
]);

export async function checkForUnregisteredRouters() {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const dir = path.dirname(new URL(import.meta.url).pathname);
    const IGNORE_PATTERNS = ['vite', 'vite.config', 'tsconfig', 'drizzle.config', '__tests__', '.test', '.spec', '.d'];
    const files = fs.readdirSync(dir)
      .filter((f: string) => f.endsWith('.ts') || f.endsWith('.js'))
      .map((f: string) => f.replace(/\.(ts|js)$/, ''))
      .filter((f: string) => !IGNORE_PATTERNS.some(p => f.includes(p)));

    const unregistered = files.filter((f: string) => !REGISTERED_ROUTE_FILES.has(f));
    if (unregistered.length > 0) {
      console.warn(`⚠️ [RouteGuard] ملفات مسارات غير مسجّلة: ${unregistered.join(', ')}`);
      console.warn(`⚠️ [RouteGuard] أضفها إلى registerOrganizedRoutes أو احذفها لمنع الكود الميت`);
    } else {
      console.log('✅ [RouteGuard] جميع ملفات المسارات مسجّلة - لا يوجد كود ميت');
    }
    return unregistered;
  } catch (error) {
    console.error('⚠️ [RouteGuard] فشل فحص المسارات:', error);
    return [];
  }
}

export function getOrganizedRoutesInfo() {
  return {
    version: '3.0.0-unified',
    registeredRouteFiles: Array.from(REGISTERED_ROUTE_FILES),
  };
}

/**
 * التحقق من سلامة النظام المنظم
 */
export function validateOrganizedRoutes(): boolean {
  try {
    const routers = [
      healthRouter,
      projectRouter,
      workerRouter,
      financialRouter,
      autocompleteRouter,
      notificationRouter,
      ledgerRouter,
    ];

    return routers.every(router => router && typeof router === 'function');
  } catch (error) {
    console.error('❌ [OrganizedRoutes] خطأ في التحقق:', error);
    return false;
  }
}

export {
  healthRouter,
  projectRouter,
  projectTypeRouter,
  wellRouter,
  wellExpenseRouter,
  workerRouter,
  financialRouter,
  autocompleteRouter,
  notificationRouter,
  syncRouter,
  tasksRouter,
  ledgerRouter,
  equipmentRouter,
  telemetryRouter,
  settlementRouter,
};

export default {
  registerOrganizedRoutes,
  getOrganizedRoutesInfo,
  validateOrganizedRoutes
};
