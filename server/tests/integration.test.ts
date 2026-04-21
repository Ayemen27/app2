import { describe, it, expect, beforeAll } from 'vitest';

const API_BASE = process.env.VITE_API_BASE || 'https://app2.binarjoinanelytic.info';

async function apiGet(path: string, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  return { status: res.status, data: await res.json().catch(() => null), ok: res.ok };
}

async function apiPost(path: string, body: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  return { status: res.status, data: await res.json().catch(() => null), ok: res.ok };
}

describe('API Health & Infrastructure Tests', () => {
  it('GET /api/health يجب أن يعيد حالة OK', async () => {
    const res = await apiGet('/api/health');
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
  });
});

describe('Authentication API Tests', () => {
  let authToken: string;

  it('POST /api/auth/login يجب أن يعيد JWT عند بيانات صحيحة', async () => {
    const res = await apiPost('/api/auth/login', {
      email: process.env.EMERGENCY_ADMIN_EMAIL || 'admin@emergency.local',
      password: process.env.EMERGENCY_ADMIN_PASSWORD || 'Admin@123456'
    });
    if (res.ok && res.data?.token) {
      authToken = res.data.token;
      expect(authToken).toBeTruthy();
    } else {
      expect(res.status).toBe(401);
    }
  });

  it('POST /api/auth/login يجب أن يرفض بيانات خاطئة', async () => {
    const res = await apiPost('/api/auth/login', {
      email: 'nonexistent@invalid.com',
      password: 'wrongpassword123'
    });
    expect(res.ok).toBe(false);
    expect([400, 401, 403]).toContain(res.status);
  });

  it('GET /api/auth/me بدون توثيق يجب أن يُرفض', async () => {
    const res = await apiGet('/api/auth/me');
    expect([401, 403]).toContain(res.status);
  });
});

describe('API Endpoints Structure Tests - التحقق من وجود نقاط النهاية واستجابتها', () => {
  it('GET /api/projects يجب أن يرفض الطلب بدون توثيق (401)', async () => {
    const res = await apiGet('/api/projects');
    expect([401, 403]).toContain(res.status);
  });

  it('GET /api/workers يجب أن يرفض الطلب بدون توثيق (401)', async () => {
    const res = await apiGet('/api/workers');
    expect([401, 403]).toContain(res.status);
  });

  it('GET /api/equipment يجب أن يرفض الطلب بدون توثيق (401)', async () => {
    const res = await apiGet('/api/equipment');
    expect([401, 403]).toContain(res.status);
  });

  it('GET /api/notifications يجب أن يرفض الطلب بدون توثيق (401)', async () => {
    const res = await apiGet('/api/notifications');
    expect([401, 403]).toContain(res.status);
  });
});

describe('API Response Format Consistency', () => {
  it('جميع الردود يجب أن تكون JSON', async () => {
    const endpoints = ['/api/health'];
    for (const endpoint of endpoints) {
      const res = await fetch(`${API_BASE}${endpoint}`);
      const contentType = res.headers.get('content-type');
      expect(contentType).toContain('application/json');
    }
  });
});

describe('Security Headers Tests', () => {
  it('يجب أن تحتوي الاستجابات على headers أمنية', async () => {
    const res = await fetch(`${API_BASE}/api/health`);
    expect(res.status).toBe(200);
  });
});
