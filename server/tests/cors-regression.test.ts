import { describe, it, expect } from 'vitest';

function isStrictLocalhost(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1';
  } catch {
    return false;
  }
}

function isAllowedDomain(origin: string, allowedHost: string): boolean {
  try {
    const parsed = new URL(origin);
    return parsed.hostname === allowedHost || parsed.hostname.endsWith('.' + allowedHost);
  } catch {
    return false;
  }
}

const STATIC_ALLOWED_ORIGINS = new Set([
  'https://axion.binarjoinanalytic.info',
  'https://binarjoinanalytic.info',
]);

const ALLOWED_DOMAIN_SUFFIXES = ['binarjoinanalytic.info'];

function isOriginAllowed(origin: string, isDev: boolean): boolean {
  if (!origin || origin === 'null') return true;
  if (origin.startsWith('capacitor://')) return true;
  if (isStrictLocalhost(origin)) return true;

  if (STATIC_ALLOWED_ORIGINS.has(origin)) return true;

  for (const suffix of ALLOWED_DOMAIN_SUFFIXES) {
    if (isAllowedDomain(origin, suffix)) return true;
  }

  if (isDev) {
    try {
      const parsed = new URL(origin);
      if (parsed.hostname.endsWith('.replit.dev') || parsed.hostname.endsWith('.replit.app')) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

describe('CORS Origin Validation - Regression Tests', () => {
  describe('Allowed origins (should pass)', () => {
    it('allows exact production domain', () => {
      expect(isOriginAllowed('https://axion.binarjoinanalytic.info', false)).toBe(true);
    });

    it('allows exact base domain', () => {
      expect(isOriginAllowed('https://binarjoinanalytic.info', false)).toBe(true);
    });

    it('allows legitimate subdomain', () => {
      expect(isOriginAllowed('https://api.binarjoinanalytic.info', false)).toBe(true);
    });

    it('allows capacitor origin', () => {
      expect(isOriginAllowed('capacitor://localhost', false)).toBe(true);
    });

    it('allows strict localhost with port', () => {
      expect(isOriginAllowed('http://localhost:3000', false)).toBe(true);
    });

    it('allows strict localhost without port', () => {
      expect(isOriginAllowed('http://localhost', false)).toBe(true);
    });

    it('allows 127.0.0.1', () => {
      expect(isOriginAllowed('http://127.0.0.1:5000', false)).toBe(true);
    });

    it('allows null origin', () => {
      expect(isOriginAllowed('null', false)).toBe(true);
    });

    it('allows empty origin', () => {
      expect(isOriginAllowed('', false)).toBe(true);
    });

    it('allows replit.dev in dev mode only', () => {
      expect(isOriginAllowed('https://myapp.replit.dev', true)).toBe(true);
    });

    it('allows replit.app in dev mode only', () => {
      expect(isOriginAllowed('https://myapp.replit.app', true)).toBe(true);
    });
  });

  describe('Blocked origins - Spoofing attacks (must reject)', () => {
    it('rejects domain prefix spoofing (evil-binarjoinanalytic.info)', () => {
      expect(isOriginAllowed('https://evil-binarjoinanalytic.info', false)).toBe(false);
    });

    it('rejects domain suffix spoofing (binarjoinanalytic.info.evil.com)', () => {
      expect(isOriginAllowed('https://binarjoinanalytic.info.evil.com', false)).toBe(false);
    });

    it('rejects localhost spoofing (localhost.evil.com)', () => {
      expect(isOriginAllowed('https://localhost.evil.com', false)).toBe(false);
    });

    it('rejects localhost subdomain spoofing (evil.localhost)', () => {
      expect(isOriginAllowed('http://evil.localhost:3000', false)).toBe(false);
    });

    it('rejects completely unrelated domain', () => {
      expect(isOriginAllowed('https://evil.com', false)).toBe(false);
    });

    it('rejects attacker domain with target as path', () => {
      expect(isOriginAllowed('https://evil.com/binarjoinanalytic.info', false)).toBe(false);
    });

    it('rejects similar domain name', () => {
      expect(isOriginAllowed('https://binarjoinanalytic.info.attacker.com', false)).toBe(false);
    });

    it('rejects replit.dev in production mode', () => {
      expect(isOriginAllowed('https://myapp.replit.dev', false)).toBe(false);
    });

    it('rejects replit.app in production mode', () => {
      expect(isOriginAllowed('https://myapp.replit.app', false)).toBe(false);
    });

    it('rejects invalid URL', () => {
      expect(isOriginAllowed('not-a-url', false)).toBe(false);
    });

    it('rejects file:// protocol', () => {
      expect(isOriginAllowed('file:///etc/passwd', false)).toBe(false);
    });

    it('rejects javascript: protocol', () => {
      expect(isOriginAllowed('javascript:alert(1)', false)).toBe(false);
    });

    it('rejects data: protocol', () => {
      expect(isOriginAllowed('data:text/html,<h1>hi</h1>', false)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('handles origin with trailing slash', () => {
      expect(isOriginAllowed('https://evil.com/', false)).toBe(false);
    });

    it('handles origin with port and spoofed host', () => {
      expect(isOriginAllowed('https://localhost.evil.com:3000', false)).toBe(false);
    });

    it('handles case sensitivity (URL parser normalizes hostnames to lowercase)', () => {
      expect(isOriginAllowed('https://APP2.BINARJOINANELYTIC.INFO', false)).toBe(true);
    });
  });
});
