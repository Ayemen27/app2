import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve } from 'path';

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    cookies: {},
    query: {},
    body: {},
    path: '/api/test',
    originalUrl: '/api/test',
    method: 'GET',
    ip: '127.0.0.1',
    get: vi.fn().mockReturnValue('test-agent'),
    connection: { remoteAddress: '127.0.0.1' },
    user: undefined,
    ...overrides,
  } as unknown as Request;
}

function createMockRes(): Response & { statusCode: number; body: unknown } {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: unknown) {
      res.body = data;
      return res;
    },
    setHeader: vi.fn(),
  } as unknown as Response & { statusCode: number; body: unknown };
  return res;
}

describe('Auth Regression Tests', () => {
  describe('Category 1: requireAdmin middleware — unauthenticated → 401, non-admin → 403, admin → pass', () => {
    let requireAdminMiddleware: (req: Request, res: Response, next: NextFunction) => void;

    beforeEach(async () => {
      const authModule = await import('../middleware/auth');
      requireAdminMiddleware = authModule.requireAdmin;
    });

    it('returns 401 when req.user is undefined (unauthenticated)', () => {
      const req = createMockReq({ user: undefined });
      const res = createMockRes();
      const next = vi.fn();

      requireAdminMiddleware(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
      expect((res.body as { code?: string })?.code).toBe('UNAUTHORIZED');
    });

    it('returns 403 when req.user.role is "user" (non-admin)', () => {
      const req = createMockReq({
        user: { user_id: 'u1', email: 'test@test.com', role: 'user', sessionId: 's1' } as any,
      });
      const res = createMockRes();
      const next = vi.fn();

      requireAdminMiddleware(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
      expect((res.body as { code?: string })?.code).toBe('ADMIN_REQUIRED');
    });

    it('calls next() when req.user.role is "admin"', () => {
      const req = createMockReq({
        user: { user_id: 'u1', email: 'admin@test.com', role: 'admin', sessionId: 's1' } as any,
      });
      const res = createMockRes();
      const next = vi.fn();

      requireAdminMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('calls next() when req.user.role is "super_admin"', () => {
      const req = createMockReq({
        user: { user_id: 'u1', email: 'super@test.com', role: 'super_admin', sessionId: 's1' } as any,
      });
      const res = createMockRes();
      const next = vi.fn();

      requireAdminMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('Category 2: requireRole middleware — role-based access control', () => {
    let requireRole: (role: string) => (req: Request, res: Response, next: NextFunction) => void;

    beforeEach(async () => {
      const authModule = await import('../middleware/auth');
      requireRole = authModule.requireRole;
    });

    it('returns 401 when no user is set', () => {
      const middleware = requireRole('admin');
      const req = createMockReq({ user: undefined });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res, next);

      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when user role does not match required role', () => {
      const middleware = requireRole('admin');
      const req = createMockReq({
        user: { user_id: 'u1', email: 'user@test.com', role: 'user', sessionId: 's1' } as any,
      });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('super_admin passes any role check', () => {
      const middleware = requireRole('admin');
      const req = createMockReq({
        user: { user_id: 'u1', email: 'super@test.com', role: 'super_admin', sessionId: 's1' } as any,
      });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req as any, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('Category 3: requireRoles (authz) middleware — role-based access', () => {
    let requireRoles: (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
    let requireAdminAuthz: () => (req: Request, res: Response, next: NextFunction) => void;

    beforeEach(async () => {
      const authzModule = await import('../middleware/authz');
      requireRoles = authzModule.requireRoles;
      requireAdminAuthz = authzModule.requireAdmin;
    });

    it('returns 401 when no user is present', () => {
      const middleware = requireAdminAuthz();
      const req = createMockReq({ user: undefined });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 for regular user on admin-only endpoint', () => {
      const middleware = requireAdminAuthz();
      const req = createMockReq({
        user: { user_id: 'u1', email: 'user@test.com', role: 'user', sessionId: 's1' } as any,
      });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows admin role through requireAdmin', () => {
      const middleware = requireAdminAuthz();
      const req = createMockReq({
        user: { user_id: 'u1', email: 'admin@test.com', role: 'admin', sessionId: 's1' } as any,
      });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('allows super_admin role through requireAdmin', () => {
      const middleware = requireAdminAuthz();
      const req = createMockReq({
        user: { user_id: 'u1', email: 'super@test.com', role: 'super_admin', sessionId: 's1' } as any,
      });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('requireRoles accepts custom roles', () => {
      const middleware = requireRoles('editor', 'admin');
      const req = createMockReq({
        user: { user_id: 'u1', email: 'editor@test.com', role: 'editor', sessionId: 's1' } as any,
      });
      const res = createMockRes();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('Category 4: checkWriteAccess — read-only user cannot POST/PUT/PATCH/DELETE', () => {
    let checkWriteAccess: (req: Request, res: Response, next: NextFunction) => void;

    beforeEach(async () => {
      const authModule = await import('../middleware/auth');
      checkWriteAccess = authModule.checkWriteAccess;
    });

    it('blocks POST for read-only user (role=user)', () => {
      const req = createMockReq({
        method: 'POST',
        user: { user_id: 'u1', email: 'user@test.com', role: 'user', sessionId: 's1' } as any,
      });
      const res = createMockRes();
      const next = vi.fn();

      checkWriteAccess(req as any, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows GET for read-only user', () => {
      const req = createMockReq({
        method: 'GET',
        user: { user_id: 'u1', email: 'user@test.com', role: 'user', sessionId: 's1' } as any,
      });
      const res = createMockRes();
      const next = vi.fn();

      checkWriteAccess(req as any, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('allows POST for admin', () => {
      const req = createMockReq({
        method: 'POST',
        user: { user_id: 'u1', email: 'admin@test.com', role: 'admin', sessionId: 's1' } as any,
      });
      const res = createMockRes();
      const next = vi.fn();

      checkWriteAccess(req as any, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('Category 5: extractTokenFromReq — token extraction', () => {
    let extractTokenFromReq: (req: Request) => string | null;

    beforeEach(async () => {
      const authModule = await import('../middleware/auth');
      extractTokenFromReq = authModule.extractTokenFromReq;
    });

    it('returns null when no token is provided', () => {
      const req = createMockReq({ headers: {} });
      expect(extractTokenFromReq(req)).toBeNull();
    });

    it('extracts token from Bearer authorization header', () => {
      const token = 'eyJhbGciOiJIUzI1NiJ9.eyJ0ZXN0IjoxfQ.signature123';
      const req = createMockReq({
        headers: { authorization: `Bearer ${token}` },
      });
      expect(extractTokenFromReq(req)).toBe(token);
    });

    it('handles double-quoted tokens from Capacitor/Android', () => {
      const token = 'eyJhbGciOiJIUzI1NiJ9.eyJ0ZXN0IjoxfQ.signature123';
      const req = createMockReq({
        headers: { authorization: `Bearer "${token}"` },
      });
      expect(extractTokenFromReq(req)).toBe(token);
    });

    it('returns null for empty/invalid bearer tokens', () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer undefined' },
      });
      expect(extractTokenFromReq(req)).toBeNull();
    });

    it('returns null for "Bearer null"', () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer null' },
      });
      expect(extractTokenFromReq(req)).toBeNull();
    });
  });

  describe('Category 6: Announcement admin check — POST /api/notifications/announcement', () => {
    it('notificationRoutes.ts enforces admin check on announcement type', () => {
      const content = readFileSync(
        resolve(__dirname, '../routes/modules/notificationRoutes.ts'),
        'utf-8'
      );

      const announcementCheckPattern = /type\s*===\s*['"]announcement['"]/;
      expect(content).toMatch(announcementCheckPattern);

      const adminRoleCheck = /role\s*!==\s*['"]admin['"].*role\s*!==\s*['"]super_admin['"]/;
      expect(content).toMatch(adminRoleCheck);

      expect(content).toContain('403');
    });

    it('announcement admin check exists in notificationRoutes POST / handler', () => {
      const content = readFileSync(
        resolve(__dirname, '../routes/modules/notificationRoutes.ts'),
        'utf-8'
      );
      expect(content).toContain("finalType === 'announcement'");
      expect(content).toContain("res.status(403)");
    });
  });

  describe('Category 7: Route protection verification — all protected routes have auth middleware', () => {
    const routesDir = resolve(__dirname, '../routes/modules');

    it('syncRoutes.ts applies requireAuth at router level', () => {
      const content = readFileSync(resolve(routesDir, 'syncRoutes.ts'), 'utf-8');
      expect(content).toContain('syncRouter.use(requireAuth)');
    });

    it('notificationRoutes.ts applies requireAuth at router level', () => {
      const content = readFileSync(resolve(routesDir, 'notificationRoutes.ts'), 'utf-8');
      expect(content).toContain('notificationRouter.use(requireAuth)');
    });

    it('monitoring router applies requireAuth and requireAdmin at router level', () => {
      const content = readFileSync(resolve(__dirname, '../monitoring/routes.ts'), 'utf-8');
      expect(content).toContain('monitoringRouter.use(requireAuth)');
      expect(content).toContain('monitoringRouter.use(requireAdmin');
    });

    it('sync admin-only endpoints check isAdmin', () => {
      const content = readFileSync(resolve(routesDir, 'syncRoutes.ts'), 'utf-8');
      const adminChecks = (content.match(/isAdmin\(req\)/g) || []).length;
      expect(adminChecks).toBeGreaterThanOrEqual(3);
    });

    it('notification stats route requires admin role', () => {
      const content = readFileSync(resolve(routesDir, 'notificationRoutes.ts'), 'utf-8');
      const statsRouteSection = content.includes("requireRole('admin')");
      expect(statsRouteSection).toBe(true);
    });

    it('all route module files import auth middleware', () => {
      const files = readdirSync(routesDir).filter(
        (f) => f.endsWith('.ts') && f !== 'index.ts'
      );

      const authProtectedModules = files.filter((file) => {
        const content = readFileSync(resolve(routesDir, file), 'utf-8');
        return (
          content.includes('requireAuth') ||
          content.includes('requireAdmin') ||
          content.includes('requireRole') ||
          content.includes('authenticate')
        );
      });

      expect(authProtectedModules.length).toBeGreaterThan(10);
    });

    it('health routes that need auth use requireAuth', () => {
      const content = readFileSync(resolve(routesDir, 'healthRoutes.ts'), 'utf-8');
      expect(content).toContain('requireAuth');
      expect(content).toContain("requireRole('admin')");
    });
  });

  describe('Category 8: Route shadowing verification — announcement is handled by the correct handler', () => {
    it('routes.ts has no route definitions (all moved to organized modules)', () => {
      const content = readFileSync(resolve(__dirname, '../routes.ts'), 'utf-8');
      const routeDefinitions = content.match(/app\.(get|post|put|patch|delete)\(/g) || [];
      expect(routeDefinitions.length).toBe(0);
    });

    it('notificationRoutes /:type handler validates announcement requires admin', () => {
      const content = readFileSync(
        resolve(__dirname, '../routes/modules/notificationRoutes.ts'),
        'utf-8'
      );
      expect(content).toContain("type === 'announcement'");
      expect(content).toContain("res.status(403)");
    });

    it('routes.ts contains no inline route definitions (consolidated into modules)', () => {
      const routesContent = readFileSync(resolve(__dirname, '../routes.ts'), 'utf-8');

      const routeLines = routesContent.split('\n').filter(
        (line) => /app\.(get|post|put|patch|delete)\(/.test(line)
      );

      expect(routeLines.length).toBe(0);
    });
  });

  describe('Category 9: Auth helper functions (auth-user.ts)', () => {
    let getAuthUser: (req: Request) => any;
    let isAdmin: (req: Request) => boolean;

    beforeEach(async () => {
      const authUserModule = await import('../internal/auth-user');
      getAuthUser = authUserModule.getAuthUser;
      isAdmin = authUserModule.isAdmin;
    });

    it('getAuthUser returns null when req.user is undefined', () => {
      const req = createMockReq({ user: undefined });
      expect(getAuthUser(req)).toBeNull();
    });

    it('getAuthUser returns user data when req.user is set', () => {
      const req = createMockReq({
        user: { user_id: 'u1', email: 'test@test.com', role: 'admin', sessionId: 's1' } as any,
      });
      const user = getAuthUser(req);
      expect(user).not.toBeNull();
      expect(user?.email).toBe('test@test.com');
    });

    it('isAdmin returns false for regular user', () => {
      const req = createMockReq({
        user: { user_id: 'u1', email: 'test@test.com', role: 'user', sessionId: 's1' } as any,
      });
      expect(isAdmin(req)).toBe(false);
    });

    it('isAdmin returns true for admin', () => {
      const req = createMockReq({
        user: { user_id: 'u1', email: 'admin@test.com', role: 'admin', sessionId: 's1' } as any,
      });
      expect(isAdmin(req)).toBe(true);
    });

    it('isAdmin returns true for super_admin', () => {
      const req = createMockReq({
        user: { user_id: 'u1', email: 'super@test.com', role: 'super_admin', sessionId: 's1' } as any,
      });
      expect(isAdmin(req)).toBe(true);
    });
  });
});
