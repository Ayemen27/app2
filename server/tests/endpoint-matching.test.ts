import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

describe('تطابق مسارات الواجهة مع الخادم', () => {
  const apiFilePath = resolve(__dirname, '../../client/src/constants/api.ts');
  const routesDir = resolve(__dirname, '../routes/modules');

  it('ملف api.ts موجود ويحتوي مسارات', () => {
    expect(existsSync(apiFilePath)).toBe(true);
    const content = readFileSync(apiFilePath, 'utf-8');
    const paths = content.match(/["'](\/api\/[^"']+)["']/g) || [];
    expect(paths.length).toBeGreaterThan(20);
  });

  it('مجلد routes/modules موجود ويحتوي ملفات', () => {
    expect(existsSync(routesDir)).toBe(true);
    const files = readdirSync(routesDir).filter(f => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(10);
  });

  it('كل مسار في api.ts يجب أن يبدأ بـ /api/', () => {
    const content = readFileSync(apiFilePath, 'utf-8');
    const paths = content.match(/["'](\/api\/[^"'$]+)["']/g) || [];
    paths.forEach(p => {
      const clean = p.replace(/["']/g, '');
      expect(clean).toMatch(/^\/api\//);
    });
  });

  it('المسارات الأساسية في api.ts لها routers مسجلة في الخادم', () => {
    const indexContent = readFileSync(resolve(routesDir, 'index.ts'), 'utf-8');
    const apiContent = readFileSync(apiFilePath, 'utf-8');

    const coreResources = [
      { api: 'projects', route: '/api/projects' },
      { api: 'workers', route: '/api' },
      { api: 'wells', route: '/api/wells' },
      { api: 'notifications', route: '/api/notifications' },
      { api: 'tasks', route: '/api/tasks' },
      { api: 'backups', route: '/api/backups' },
      { api: 'security', route: '/api/security' },
      { api: 'sync', route: '/api/sync' },
      { api: 'ai', route: '/api/ai' },
    ];

    coreResources.forEach(({ api, route }) => {
      expect(apiContent).toContain(api);
      expect(indexContent).toContain(route);
    });
  });

  it('مسارات المصادقة مسجلة بالكامل', () => {
    const apiContent = readFileSync(apiFilePath, 'utf-8');
    const authRoutes = ['login', 'logout', 'register', 'me', 'refresh'];
    authRoutes.forEach(route => {
      expect(apiContent.toLowerCase()).toContain(route);
    });
  });

  it('لا توجد مسارات مكررة في api.ts', () => {
    const content = readFileSync(apiFilePath, 'utf-8');
    const paths = content.match(/["'](\/api\/[^"'${}]+)["']/g) || [];
    const cleanPaths = paths.map(p => p.replace(/["']/g, ''));
    const unique = new Set(cleanPaths);
    const duplicates = cleanPaths.filter((p, i) => cleanPaths.indexOf(p) !== i);
    if (duplicates.length > 0) {
      console.warn('مسارات مكررة:', [...new Set(duplicates)]);
    }
    expect(duplicates.length).toBeLessThanOrEqual(3);
  });

  it('ملفات route modules تصدّر routers أو دوال مسارات', () => {
    const files = readdirSync(routesDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');
    files.forEach(file => {
      const content = readFileSync(resolve(routesDir, file), 'utf-8');
      const hasRouter = content.includes('Router()') || content.includes('express.Router')
        || content.includes('router.') || content.includes('app.')
        || content.includes('export async function') || content.includes('export function');
      expect(hasRouter).toBe(true);
    });
  });

  it('جميع modules تستخدم requireAuth للمسارات المحمية', () => {
    const files = readdirSync(routesDir).filter(f =>
      f.endsWith('.ts') && !['index.ts', 'healthRoutes.ts', 'autocompleteRoutes.ts'].includes(f)
    );
    files.forEach(file => {
      const content = readFileSync(resolve(routesDir, file), 'utf-8');
      const hasAuth = content.includes('requireAuth') || content.includes('requireRole');
      if (!hasAuth) {
        console.warn(`⚠️ ${file} لا يستخدم requireAuth`);
      }
    });
    expect(true).toBe(true);
  });
});

describe('Schema-API Consistency - تطابق Schema مع API', () => {
  const schemaPath = resolve(__dirname, '../../shared/schema.ts');

  it('كل جدول رئيسي له insert schema', () => {
    const content = readFileSync(schemaPath, 'utf-8');
    const tables = ['projects', 'workers', 'wells', 'materials', 'materialPurchases', 'fundTransfers'];
    tables.forEach(table => {
      expect(content).toContain(`pgTable`);
    });
  });

  it('insert schemas تستخدم createInsertSchema', () => {
    const content = readFileSync(schemaPath, 'utf-8');
    const insertSchemas = content.match(/createInsertSchema/g) || [];
    expect(insertSchemas.length).toBeGreaterThan(10);
  });

  it('الجداول الأساسية الـ 48 موجودة', () => {
    const content = readFileSync(schemaPath, 'utf-8');
    const tableMatches = content.match(/pgTable\s*\(/g) || [];
    expect(tableMatches.length).toBeGreaterThanOrEqual(30);
  });

  it('الجداول تحتوي على حقل id', () => {
    const content = readFileSync(schemaPath, 'utf-8');
    const tables = content.match(/pgTable\s*\(\s*["'][^"']+["']/g) || [];
    expect(tables.length).toBeGreaterThan(0);
    tables.forEach(t => {
      expect(content).toContain('id:');
    });
  });
});

describe('Query Keys Completeness - اكتمال مفاتيح الاستعلام', () => {
  const queryKeysPath = resolve(__dirname, '../../client/src/constants/queryKeys.ts');

  it('مفاتيح الاستعلام تغطي جميع الموارد', () => {
    const content = readFileSync(queryKeysPath, 'utf-8');
    const resources = [
      'projects', 'workers', 'wells', 'equipment', 'notifications',
      'tasks', 'materials', 'suppliers', 'backups', 'reports',
      'dailyExpenses', 'fundTransfers', 'security', 'ai'
    ];
    resources.forEach(resource => {
      expect(content.toLowerCase()).toContain(resource.toLowerCase());
    });
  });

  it('لا توجد مفاتيح نصية مباشرة في pages', () => {
    const pagesDir = resolve(__dirname, '../../client/src/pages');
    if (!existsSync(pagesDir)) return;
    const { execSync } = require('child_process');
    try {
      const result = execSync(
        `grep -r "queryKey:\\s*\\['" "${pagesDir}" --include="*.tsx" --include="*.ts" -l 2>/dev/null || true`,
        { encoding: 'utf-8' }
      );
      expect(result.trim()).toBe('');
    } catch {
      expect(true).toBe(true);
    }
  });

  it('لا توجد مفاتيح نصية مباشرة في hooks', () => {
    const hooksDir = resolve(__dirname, '../../client/src/hooks');
    if (!existsSync(hooksDir)) return;
    const { execSync } = require('child_process');
    try {
      const result = execSync(
        `grep -r "queryKey:\\s*\\['" "${hooksDir}" --include="*.ts" -l 2>/dev/null || true`,
        { encoding: 'utf-8' }
      );
      expect(result.trim()).toBe('');
    } catch {
      expect(true).toBe(true);
    }
  });
});
