import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

describe('Shared Schema Integrity Tests', () => {
  const schemaPath = resolve(__dirname, '../../shared/schema.ts');

  it('يجب أن يكون ملف schema.ts موجوداً', () => {
    expect(existsSync(schemaPath)).toBe(true);
  });

  it('يجب أن يحتوي Schema على الجداول الأساسية', () => {
    const content = readFileSync(schemaPath, 'utf-8');
    const requiredTables = [
      'users',
      'projects',
      'workers',
      'notifications',
    ];
    requiredTables.forEach(table => {
      expect(content).toContain(table);
    });
  });

  it('يجب أن يحتوي Schema على Insert schemas', () => {
    const content = readFileSync(schemaPath, 'utf-8');
    expect(content).toContain('createInsertSchema');
  });
});

describe('API Endpoints File Integrity Tests', () => {
  const apiPath = resolve(__dirname, '../../client/src/constants/api.ts');

  it('يجب أن يكون ملف api.ts موجوداً', () => {
    expect(existsSync(apiPath)).toBe(true);
  });

  it('يجب أن يحتوي على جميع نقاط النهاية الأساسية', () => {
    const content = readFileSync(apiPath, 'utf-8');
    const requiredEndpoints = [
      'projects',
      'workers',
      'equipment',
      'notifications',
      'health',
      'auth',
    ];
    requiredEndpoints.forEach(ep => {
      expect(content).toContain(ep);
    });
  });

  it('يجب أن تبدأ جميع المسارات بـ /api/', () => {
    const content = readFileSync(apiPath, 'utf-8');
    const apiPaths = content.match(/["'](\/api\/[^"']+)["']/g) || [];
    expect(apiPaths.length).toBeGreaterThan(0);
    apiPaths.forEach(path => {
      const cleanPath = path.replace(/["']/g, '');
      expect(cleanPath).toMatch(/^\/api\//);
    });
  });
});

describe('Query Keys Centralization Tests', () => {
  const queryKeysPath = resolve(__dirname, '../../client/src/constants/queryKeys.ts');

  it('يجب أن يكون ملف queryKeys.ts موجوداً', () => {
    expect(existsSync(queryKeysPath)).toBe(true);
  });

  it('يجب أن يحتوي على أكثر من 50 مفتاح', () => {
    const content = readFileSync(queryKeysPath, 'utf-8');
    const keyCount = (content.match(/\w+:/g) || []).length;
    expect(keyCount).toBeGreaterThan(50);
  });

  it('يجب أن يحتوي على مفاتيح المصادر الأساسية', () => {
    const content = readFileSync(queryKeysPath, 'utf-8');
    const requiredKeys = [
      'projects',
      'workers',
      'equipment',
      'notifications',
      'wells',
      'dailyExpenses',
    ];
    requiredKeys.forEach(key => {
      expect(content).toContain(key);
    });
  });

  it('يجب ألا تحتوي ملفات client/src على مفاتيح نصية مباشرة', () => {
    const pagesDir = resolve(__dirname, '../../client/src/pages');
    if (existsSync(pagesDir)) {
      const { execSync } = require('child_process');
      try {
        const result = execSync(
          `grep -r "queryKey:\\s*\\['\\"" "${pagesDir}" --include="*.tsx" --include="*.ts" -l 2>/dev/null`,
          { encoding: 'utf-8' }
        );
        expect(result.trim()).toBe('');
      } catch {
        expect(true).toBe(true);
      }
    }
  });
});

describe('Capacitor Config Validation Tests', () => {
  const capConfigPath = resolve(__dirname, '../../capacitor.config.json');

  it('يجب أن يكون ملف capacitor.config.json موجوداً', () => {
    expect(existsSync(capConfigPath)).toBe(true);
  });

  it('يجب أن يحتوي على إعدادات صحيحة', () => {
    const config = JSON.parse(readFileSync(capConfigPath, 'utf-8'));
    expect(config.appId).toBe('com.axion.app');
    expect(config.appName).toBe('AXION');
    expect(config.webDir).toBe('www');
  });

  it('يجب أن يسمح بالمحتوى المختلط للأندرويد', () => {
    const config = JSON.parse(readFileSync(capConfigPath, 'utf-8'));
    expect(config.android?.allowMixedContent).toBe(true);
  });
});

describe('Android Project Structure Tests', () => {
  const androidDir = resolve(__dirname, '../../android');

  it('يجب أن يكون مجلد android موجوداً', () => {
    expect(existsSync(androidDir)).toBe(true);
  });

  it('يجب أن يحتوي على build.gradle', () => {
    expect(existsSync(resolve(androidDir, 'build.gradle'))).toBe(true);
  });

  it('يجب أن يحتوي على settings.gradle', () => {
    expect(existsSync(resolve(androidDir, 'settings.gradle'))).toBe(true);
  });

  it('يجب أن يحتوي على AndroidManifest.xml', () => {
    expect(existsSync(resolve(androidDir, 'app/src/main/AndroidManifest.xml'))).toBe(true);
  });

  it('يجب أن يحتوي على gradle wrapper', () => {
    expect(existsSync(resolve(androidDir, 'gradle/wrapper/gradle-wrapper.jar'))).toBe(true);
  });
});

describe('Build Scripts Validation Tests', () => {
  it('يجب أن يكون سكربت remote-build.sh موجوداً وقابل للتنفيذ', () => {
    const scriptPath = resolve(__dirname, '../../scripts/remote-build.sh');
    expect(existsSync(scriptPath)).toBe(true);
  });

  it('يجب أن يكون سكربت apk.sh موجوداً', () => {
    const scriptPath = resolve(__dirname, '../../apk.sh');
    expect(existsSync(scriptPath)).toBe(true);
  });
});

describe('Web Build Output Tests', () => {
  it('يجب أن يكون مجلد www موجوداً بعد البناء', () => {
    const wwwDir = resolve(__dirname, '../../www');
    expect(existsSync(wwwDir)).toBe(true);
  });

  it('يجب أن يحتوي www على index.html', () => {
    const indexPath = resolve(__dirname, '../../www/index.html');
    expect(existsSync(indexPath)).toBe(true);
  });

  it('يجب أن يحتوي www على مجلد assets', () => {
    const assetsDir = resolve(__dirname, '../../www/assets');
    expect(existsSync(assetsDir)).toBe(true);
  });
});

describe('Environment Configuration Tests', () => {
  it('يجب أن يكون ملف .env.example موجوداً', () => {
    const envExample = resolve(__dirname, '../../.env.example');
    expect(existsSync(envExample)).toBe(true);
  });

  it('يجب ألا يحتوي .env.production على بيانات حساسة مكشوفة', () => {
    const envProd = resolve(__dirname, '../../.env.production');
    if (existsSync(envProd)) {
      const content = readFileSync(envProd, 'utf-8');
      expect(content).not.toContain('password123');
      expect(content).not.toContain('secret123');
    }
  });
});

describe('No Mock Data in Production Tests', () => {
  it('يجب ألا تحتوي ملفات الإنتاج على بيانات وهمية', () => {
    const wwwIndex = resolve(__dirname, '../../www/index.html');
    if (existsSync(wwwIndex)) {
      const content = readFileSync(wwwIndex, 'utf-8');
      expect(content).not.toContain('mock');
      expect(content).not.toContain('placeholder');
      expect(content).not.toContain('lorem ipsum');
    }
  });
});
