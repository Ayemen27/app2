import crypto from 'crypto';
import { Request } from 'express';

export interface ClientContext {
  deviceId: string;
  platform: 'web' | 'android' | 'ios' | 'unknown';
  ip: string;
  ipRange: string;
  userAgent: string;
  appVersion: string;
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  deviceHash: string;
  hasStableDeviceId: boolean;
}

function parseUserAgent(ua: string): {
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
} {
  let browserName = 'unknown';
  let browserVersion = '';
  let osName = 'unknown';
  let osVersion = '';
  let deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown' = 'unknown';

  if (/Android/i.test(ua)) {
    osName = 'Android';
    const match = ua.match(/Android\s([\d.]+)/);
    osVersion = match?.[1] || '';
    deviceType = /tablet|pad/i.test(ua) ? 'tablet' : 'mobile';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    osName = 'iOS';
    const match = ua.match(/OS\s([\d_]+)/);
    osVersion = match?.[1]?.replace(/_/g, '.') || '';
    deviceType = /iPad/i.test(ua) ? 'tablet' : 'mobile';
  } else if (/Windows/i.test(ua)) {
    osName = 'Windows';
    const match = ua.match(/Windows NT\s([\d.]+)/);
    osVersion = match?.[1] || '';
    deviceType = 'desktop';
  } else if (/Mac OS X/i.test(ua)) {
    osName = 'macOS';
    const match = ua.match(/Mac OS X\s([\d_.]+)/);
    osVersion = match?.[1]?.replace(/_/g, '.') || '';
    deviceType = 'desktop';
  } else if (/Linux/i.test(ua)) {
    osName = 'Linux';
    deviceType = 'desktop';
  }

  if (/Edg\//i.test(ua)) {
    browserName = 'Edge';
    browserVersion = ua.match(/Edg\/([\d.]+)/)?.[1] || '';
  } else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) {
    browserName = 'Chrome';
    browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || '';
  } else if (/Firefox\//i.test(ua)) {
    browserName = 'Firefox';
    browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] || '';
  } else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) {
    browserName = 'Safari';
    browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] || '';
  }

  return { browserName, browserVersion, osName, osVersion, deviceType };
}

function detectPlatform(req: Request, ua: string): 'web' | 'android' | 'ios' | 'unknown' {
  const capacitorUA = /Capacitor/i.test(ua);
  const nativeHeader = req.headers['x-client-platform'];

  if (capacitorUA && /Android/i.test(ua)) return 'android';
  if (capacitorUA && /iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (nativeHeader === 'android' && capacitorUA) return 'android';
  if (nativeHeader === 'ios' && capacitorUA) return 'ios';

  if (/Mozilla|Chrome|Safari|Firefox|Edg/i.test(ua)) return 'web';

  return 'unknown';
}

function extractIpRange(ip: string): string {
  if (!ip) return 'unknown';
  const cleaned = ip.replace(/^::ffff:/, '');

  if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    }
  }

  if (cleaned.includes(':')) {
    const parts = cleaned.split(':');
    if (parts.length >= 3) {
      return `${parts.slice(0, 3).join(':')}::/48`;
    }
  }

  return cleaned;
}

function generateDeviceHash(deviceId: string, platform: string, osName: string, osVersion: string): string {
  const input = `${deviceId}:${platform}:${osName}:${osVersion}`;
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 32);
}

export function extractClientContext(req: Request): ClientContext {
  const ua = req.get('user-agent') || 'unknown';
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const parsed = parseUserAgent(ua);
  const platform = detectPlatform(req, ua);

  const clientDeviceId = req.headers['x-device-id'] as string | undefined;
  const deterministicFallback = crypto
    .createHash('sha256')
    .update(`${ip}:${ua}:${parsed.osName}:${parsed.osVersion}`)
    .digest('hex')
    .substring(0, 36);
  const deviceId = clientDeviceId || deterministicFallback;

  const appVersion = (req.headers['x-app-version'] as string) || 'unknown';

  const hasStableDeviceId = !!clientDeviceId;
  const deviceHash = generateDeviceHash(deviceId, platform, parsed.osName, parsed.osVersion);

  return {
    deviceId,
    platform,
    ip,
    ipRange: extractIpRange(ip),
    userAgent: ua.substring(0, 500),
    appVersion,
    browserName: parsed.browserName,
    browserVersion: parsed.browserVersion,
    osName: parsed.osName,
    osVersion: parsed.osVersion,
    deviceType: parsed.deviceType,
    deviceHash,
    hasStableDeviceId,
  };
}

export interface SessionBindingResult {
  valid: boolean;
  action: 'allow' | 'step_up' | 'block';
  reason?: string;
}

export function validateSessionBinding(
  stored: { deviceHash?: string; platform?: string; ipRange?: string; deviceId?: string; hasStableDeviceId?: boolean },
  current: ClientContext,
  strictMode: boolean = false
): SessionBindingResult {
  if (stored.platform && stored.platform !== current.platform) {
    return {
      valid: false,
      action: 'block',
      reason: `platform_mismatch:${stored.platform}→${current.platform}`,
    };
  }

  const storedHasStable = stored.hasStableDeviceId === true;
  const currentHasStable = current.hasStableDeviceId === true;

  if (storedHasStable && currentHasStable) {
    if (stored.deviceHash && stored.deviceHash !== current.deviceHash) {
      return {
        valid: false,
        action: strictMode ? 'block' : 'step_up',
        reason: `device_hash_mismatch`,
      };
    }

    if (stored.deviceId && stored.deviceId !== current.deviceId) {
      return {
        valid: false,
        action: strictMode ? 'block' : 'step_up',
        reason: `device_id_changed`,
      };
    }
  }

  if (stored.ipRange && stored.ipRange !== current.ipRange) {
    return {
      valid: false,
      action: strictMode ? 'step_up' : 'allow',
      reason: `ip_range_changed:${stored.ipRange}→${current.ipRange}`,
    };
  }

  return { valid: true, action: 'allow' };
}
