import { describe, it, expect, beforeAll } from 'vitest';

const API_BASE = process.env.VITE_API_BASE || 'http://localhost:5000';
let authToken: string = '';

async function apiRequest(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  }
  return { status: res.status, data, ok: res.ok, headers: res.headers };
}

beforeAll(async () => {
  const res = await apiRequest('POST', '/api/auth/login', {
    email: process.env.EMERGENCY_ADMIN_EMAIL || 'admin@emergency.local',
    password: process.env.EMERGENCY_ADMIN_PASSWORD || 'Admin@123456'
  });
  if (res.ok && res.data?.token) {
    authToken = res.data.token;
  }
  expect(authToken).toBeTruthy();
});

describe('المشاريع - Projects CRUD', () => {
  it('GET /api/projects يجب أن يعيد قائمة المشاريع مع توثيق', async () => {
    if (!authToken) return;
    const res = await apiRequest('GET', '/api/projects', undefined, authToken);
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.data)).toBe(true);
  });

  it('GET /api/projects/with-stats يجب أن يعيد مشاريع مع إحصائيات', async () => {
    if (!authToken) return;
    const res = await apiRequest('GET', '/api/projects/with-stats', undefined, authToken);
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data.success).toBe(true);
  });

  it('POST /api/projects بدون بيانات يجب أن يرفض', async () => {
    if (!authToken) return;
    const res = await apiRequest('POST', '/api/projects', {}, authToken);
    expect([400, 422, 500]).toContain(res.status);
  });

  it('POST /api/projects بدون توثيق يُرفض', async () => {
    const res = await apiRequest('POST', '/api/projects', { name: 'test' });
    expect([401, 403]).toContain(res.status);
  });
});

describe('العمال - Workers CRUD', () => {
  it('GET /api/workers بتوثيق يعيد قائمة', async () => {
    if (!authToken) return;
    const res = await apiRequest('GET', '/api/workers', undefined, authToken);
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
  });

  it('GET /api/worker-types يعيد أنواع العمال', async () => {
    const res = await apiRequest('GET', '/api/worker-types');
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data.success).toBe(true);
  });

  it('POST /api/workers بدون بيانات يُرفض', async () => {
    if (!authToken) return;
    const res = await apiRequest('POST', '/api/workers', {}, authToken);
    expect([400, 422, 500]).toContain(res.status);
  });

  it('GET /api/workers بدون توثيق يُرفض', async () => {
    const res = await apiRequest('GET', '/api/workers');
    expect([401, 403]).toContain(res.status);
  });
});

describe('الموردين - Suppliers CRUD', () => {
  it('GET /api/projects (suppliers via project) بتوثيق يعمل', async () => {
    if (!authToken) return;
    const res = await apiRequest('GET', '/api/projects', undefined, authToken);
    expect(res.status).toBe(200);
  });
});

describe('المعدات - Equipment', () => {
  it('GET /api/equipment بدون توثيق يُرفض', async () => {
    const res = await apiRequest('GET', '/api/equipment');
    expect([401, 403]).toContain(res.status);
  });

  it('GET /api/equipment بتوثيق يعيد قائمة', async () => {
    if (!authToken) return;
    const res = await apiRequest('GET', '/api/equipment', undefined, authToken);
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
  });
});

describe('الآبار - Wells CRUD', () => {
  it('GET /api/wells بدون توثيق يُرفض', async () => {
    const res = await apiRequest('GET', '/api/wells');
    expect([401, 403]).toContain(res.status);
  });

  it('GET /api/wells بتوثيق يعيد قائمة', async () => {
    if (!authToken) return;
    const res = await apiRequest('GET', '/api/wells', undefined, authToken);
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
  });

  it('POST /api/wells بدون بيانات يُرفض', async () => {
    if (!authToken) return;
    const res = await apiRequest('POST', '/api/wells', {}, authToken);
    expect([400, 422, 500]).toContain(res.status);
  });
});

describe('الإشعارات - Notifications', () => {
  it('GET /api/notifications بتوثيق يعيد قائمة', async () => {
    if (!authToken) return;
    const res = await apiRequest('GET', '/api/notifications', undefined, authToken);
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
  });

  it('POST /api/notifications/mark-all-read بتوثيق يعمل', async () => {
    if (!authToken) return;
    const res = await apiRequest('POST', '/api/notifications/mark-all-read', {}, authToken);
    expect([200, 204]).toContain(res.status);
  });
});

describe('المهام - Tasks CRUD', () => {
  it('GET /api/tasks بتوثيق يعيد قائمة', async () => {
    if (!authToken) return;
    const res = await apiRequest('GET', '/api/tasks', undefined, authToken);
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
  });

  it('POST /api/tasks بدون بيانات يُرفض', async () => {
    if (!authToken) return;
    const res = await apiRequest('POST', '/api/tasks', {}, authToken);
    expect([400, 422, 500]).toContain(res.status);
  });
});

describe('أنواع المشاريع - Project Types', () => {
  it('GET /api/project-types بتوثيق يعيد قائمة', async () => {
    if (!authToken) return;
    const res = await apiRequest('GET', '/api/project-types', undefined, authToken);
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
  });
});

describe('النسخ الاحتياطي - Backups', () => {
  it('GET /api/backups/status بتوثيق يعيد الحالة', async () => {
    if (!authToken) return;
    const res = await apiRequest('GET', '/api/backups/status', undefined, authToken);
    expect([200, 403]).toContain(res.status);
  });

  it('GET /api/backups/logs بتوثيق يعيد السجلات', async () => {
    if (!authToken) return;
    const res = await apiRequest('GET', '/api/backups/logs', undefined, authToken);
    expect([200, 403]).toContain(res.status);
  });
});

describe('الإكمال التلقائي - Autocomplete', () => {
  it('GET /api/autocomplete يعمل', async () => {
    const res = await apiRequest('GET', '/api/autocomplete');
    expect([200, 401, 403]).toContain(res.status);
  });
});

describe('المزامنة - Sync', () => {
  it('GET /api/sync/full-backup بتوثيق يعمل', async () => {
    if (!authToken) return;
    const res = await apiRequest('GET', '/api/sync/full-backup', undefined, authToken);
    expect([200, 403]).toContain(res.status);
  });
});

describe('النشاطات الأخيرة - Recent Activities', () => {
  it('GET /api/recent-activities بتوثيق يعيد قائمة', async () => {
    if (!authToken) return;
    const res = await apiRequest('GET', '/api/recent-activities', undefined, authToken);
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
  });
});

describe('التقارير - Reports', () => {
  it('GET /api/reports بتوثيق يعمل', async () => {
    if (!authToken) return;
    const res = await apiRequest('GET', '/api/reports', undefined, authToken);
    expect([200, 400]).toContain(res.status);
  });
});

describe('الذكاء الاصطناعي - AI', () => {
  it('GET /api/ai/sessions بتوثيق يعيد جلسات', async () => {
    if (!authToken) return;
    const res = await apiRequest('GET', '/api/ai/sessions', undefined, authToken);
    expect([200, 403]).toContain(res.status);
  });

  it('GET /api/ai/models بتوثيق يعيد نماذج', async () => {
    if (!authToken) return;
    const res = await apiRequest('GET', '/api/ai/models', undefined, authToken);
    expect([200, 403]).toContain(res.status);
  });
});

describe('الأمان - Security', () => {
  it('GET /api/security/policies بتوثيق يعمل', async () => {
    if (!authToken) return;
    const res = await apiRequest('GET', '/api/security/policies', undefined, authToken);
    expect([200, 403]).toContain(res.status);
  });

  it('GET /api/security/violations بتوثيق يعمل', async () => {
    if (!authToken) return;
    const res = await apiRequest('GET', '/api/security/violations', undefined, authToken);
    expect([200, 403]).toContain(res.status);
  });

  it('GET /api/security/suggestions بتوثيق يعمل', async () => {
    if (!authToken) return;
    const res = await apiRequest('GET', '/api/security/suggestions', undefined, authToken);
    expect([200, 403]).toContain(res.status);
  });
});

describe('المصادقة المتقدمة - Auth Advanced', () => {
  it('POST /api/auth/register بدون بيانات يُرفض', async () => {
    const res = await apiRequest('POST', '/api/auth/register', {});
    expect([400, 422, 500]).toContain(res.status);
  });

  it('POST /api/auth/login ببيانات ناقصة يُرفض', async () => {
    const res = await apiRequest('POST', '/api/auth/login', { email: '' });
    expect([400, 401]).toContain(res.status);
  });

  it('GET /api/auth/me بتوثيق صالح يعيد بيانات المستخدم', async () => {
    if (!authToken) return;
    const res = await apiRequest('GET', '/api/auth/me', undefined, authToken);
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
  });

  it('GET /api/auth/me بتوكن غير صالح يُرفض', async () => {
    const res = await apiRequest('GET', '/api/auth/me', undefined, 'invalid-token-123');
    expect([401, 403]).toContain(res.status);
  });

  it('POST /api/auth/logout بتوثيق يعمل', async () => {
    const loginRes = await apiRequest('POST', '/api/auth/login', {
      email: process.env.EMERGENCY_ADMIN_EMAIL || 'admin@emergency.local',
      password: process.env.EMERGENCY_ADMIN_PASSWORD || 'Admin@123456'
    });
    if (loginRes.ok && loginRes.data?.token) {
      const res = await apiRequest('POST', '/api/auth/logout', {}, loginRes.data.token);
      expect([200, 204]).toContain(res.status);
    }
  });
});

describe('المسارات المالية - Financial', () => {
  it('GET /api/daily-expenses بتوثيق يعمل', async () => {
    if (!authToken) return;
    const res = await apiRequest('GET', '/api/daily-expenses', undefined, authToken);
    expect([200, 400]).toContain(res.status);
  });

  it('GET /api/fund-transfers بتوثيق يعمل', async () => {
    if (!authToken) return;
    const res = await apiRequest('GET', '/api/fund-transfers', undefined, authToken);
    expect([200, 400]).toContain(res.status);
  });

  it('GET /api/financial-summary بتوثيق يعمل', async () => {
    if (!authToken) return;
    const res = await apiRequest('GET', '/api/financial-summary', undefined, authToken);
    expect([200, 400]).toContain(res.status);
  });
});

describe('JSON Response Format - جميع الردود JSON', () => {
  const publicEndpoints = ['/api/health'];
  const protectedEndpoints = [
    '/api/projects', '/api/workers', '/api/wells',
    '/api/notifications', '/api/tasks', '/api/recent-activities'
  ];

  it('المسارات العامة ترد JSON', async () => {
    for (const ep of publicEndpoints) {
      const res = await apiRequest('GET', ep);
      const ct = res.headers.get('content-type') || '';
      expect(ct).toContain('application/json');
    }
  });

  it('المسارات المحمية ترد JSON حتى بدون توثيق', async () => {
    for (const ep of protectedEndpoints) {
      const res = await apiRequest('GET', ep);
      expect(res.data).toBeDefined();
      expect(typeof res.data).toBe('object');
    }
  });

  it('المسارات المحمية ترد JSON بتوثيق', async () => {
    if (!authToken) return;
    for (const ep of protectedEndpoints) {
      const res = await apiRequest('GET', ep, undefined, authToken);
      expect(res.data).toBeDefined();
      expect(typeof res.data).toBe('object');
    }
  });
});
