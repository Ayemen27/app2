import { describe, it, expect, beforeAll } from 'vitest';

const API_BASE = process.env.VITE_API_BASE || 'https://app2.binarjoinanelytic.info';
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
});

describe('حماية المسارات - Endpoint Protection', () => {
  const protectedEndpoints = [
    '/api/projects',
    '/api/workers',
    '/api/wells',
    '/api/equipment',
    '/api/notifications',
    '/api/tasks',
    '/api/recent-activities',
    '/api/backups/status',
    '/api/ai/sessions',
    '/api/security/policies',
    '/api/sync/compare',
  ];

  protectedEndpoints.forEach(endpoint => {
    it(`${endpoint} يرفض طلب بدون توثيق`, async () => {
      const res = await apiRequest('GET', endpoint);
      expect([401, 403]).toContain(res.status);
    });
  });
});

describe('حماية التوكن - Token Security', () => {
  it('توكن منتهي الصلاحية يُرفض', async () => {
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AZW1lcmdlbmN5LmxvY2FsIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDM2MDB9.invalid';
    const res = await apiRequest('GET', '/api/projects', undefined, expiredToken);
    expect([401, 403]).toContain(res.status);
  });

  it('توكن بتنسيق غير صالح يُرفض', async () => {
    const res = await apiRequest('GET', '/api/projects', undefined, 'not-a-jwt-token');
    expect([401, 403]).toContain(res.status);
  });

  it('توكن فارغ يُرفض', async () => {
    const res = await apiRequest('GET', '/api/projects', undefined, '');
    expect([401, 403]).toContain(res.status);
  });

  it('Bearer بدون توكن يُرفض', async () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer '
    };
    const res = await fetch(`${API_BASE}/api/projects`, { headers });
    expect([401, 403]).toContain(res.status);
  });
});

describe('حماية المدخلات - Input Validation', () => {
  it('SQL injection في login يُرفض', async () => {
    const res = await apiRequest('POST', '/api/auth/login', {
      email: "admin' OR '1'='1",
      password: "' OR '1'='1"
    });
    expect(res.ok).toBe(false);
    expect([400, 401]).toContain(res.status);
  });

  it('XSS payload في المدخلات يتم تنظيفه أو رفضه', async () => {
    if (!authToken) return;
    const res = await apiRequest('POST', '/api/projects', {
      name: '<script>alert("xss")</script>',
      budget: '0'
    }, authToken);
    if (res.ok && res.data?.data) {
      expect(res.data.data.name).not.toContain('<script>');
    }
  });

  it('بيانات كبيرة جداً تُرفض أو تُعالج', async () => {
    const largeString = 'x'.repeat(100000);
    const res = await apiRequest('POST', '/api/auth/login', {
      email: largeString,
      password: largeString
    });
    expect([400, 401, 413, 422]).toContain(res.status);
  });
});

describe('Rate Limiting - تحديد المعدل', () => {
  it('Rate limit يرد JSON وليس HTML', async () => {
    const res = await apiRequest('GET', '/api/health');
    if (res.status === 429) {
      expect(res.data).toBeDefined();
      expect(typeof res.data).toBe('object');
    } else {
      expect(res.status).toBe(200);
    }
  });
});

describe('CORS & Headers - الأمان في الترويسات', () => {
  it('Content-Type الاستجابة application/json', async () => {
    const res = await apiRequest('GET', '/api/health');
    const ct = res.headers.get('content-type') || '';
    expect(ct).toContain('application/json');
  });

  it('مسار غير موجود يعيد 404 بتنسيق مناسب', async () => {
    const res = await apiRequest('GET', '/api/nonexistent-endpoint-xyz');
    expect([404, 401, 403]).toContain(res.status);
  });
});

describe('حماية HTTP Methods - طرق HTTP', () => {
  it('DELETE /api/projects/:id بدون توثيق يُرفض', async () => {
    const res = await apiRequest('DELETE', '/api/projects/999999');
    expect([401, 403]).toContain(res.status);
  });

  it('PATCH /api/projects/:id بدون توثيق يُرفض', async () => {
    const res = await apiRequest('PATCH', '/api/projects/999999', { name: 'hack' });
    expect([401, 403]).toContain(res.status);
  });

  it('POST /api/workers بدون توثيق يُرفض', async () => {
    const res = await apiRequest('POST', '/api/workers', { name: 'hack' });
    expect([401, 403]).toContain(res.status);
  });

  it('DELETE /api/wells/:id بدون توثيق يُرفض', async () => {
    const res = await apiRequest('DELETE', '/api/wells/999999');
    expect([401, 403]).toContain(res.status);
  });
});

describe('الاستجابات الموحدة - Response Consistency', () => {
  it('جميع ردود API المحمية تتضمن success field', async () => {
    if (!authToken) return;
    const endpoints = ['/api/projects', '/api/wells', '/api/notifications', '/api/tasks'];
    for (const ep of endpoints) {
      const res = await apiRequest('GET', ep, undefined, authToken);
      if (res.data && typeof res.data === 'object') {
        expect(res.data).toHaveProperty('success');
      }
    }
  });

  it('ردود 401 تتضمن رسالة خطأ واضحة', async () => {
    const res = await apiRequest('GET', '/api/projects');
    expect(res.status).toBe(401);
    if (res.data) {
      const hasMessage = res.data.message || res.data.error || res.data.msg;
      expect(hasMessage).toBeTruthy();
    }
  });
});
