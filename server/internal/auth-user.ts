import { Request } from 'express';

export interface AuthUser {
  user_id: string;
  email: string;
  role: string;
  sessionId: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  mfa_enabled?: boolean;
}

export function getAuthUser(req: Request): AuthUser | null {
  return req.user ? (req.user as unknown as AuthUser) : null;
}

export function requireAuthUser(req: Request): AuthUser {
  const user = getAuthUser(req);
  if (!user || !user.user_id) {
    throw new Error('Authentication required');
  }
  return user;
}

export function getAuthUserId(req: Request): string {
  return requireAuthUser(req).user_id;
}

export function isAdmin(req: Request): boolean {
  const user = getAuthUser(req);
  return user?.role === 'admin' || user?.role === 'super_admin';
}
