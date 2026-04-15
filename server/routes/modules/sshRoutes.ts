/**
 * مسارات إدارة SSH
 * SSH Management Routes - يستخدم child_process بدلاً من مكتبة ssh2
 */

import express, { Request, Response } from 'express';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { requireAuth } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/authz.js';

const execAsync = promisify(exec);
const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin());

function sanitizeHost(host: string): boolean {
  return /^[a-zA-Z0-9._\-]+$/.test(host) && host.length <= 253;
}

function sanitizePort(port: unknown): number {
  const p = parseInt(String(port), 10);
  return (!isNaN(p) && p > 0 && p <= 65535) ? p : 22;
}

router.get('/status', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      service: 'SSH Management',
      status: 'active',
      capabilities: ['ping', 'port-check', 'server-info'],
      note: 'يستخدم أدوات النظام المحلية للتحقق من الاتصال'
    }
  });
});

router.post('/ping', async (req: Request, res: Response) => {
  try {
    const { host } = req.body as { host: string };
    if (!host || !sanitizeHost(host)) {
      return res.status(400).json({ success: false, message: 'عنوان المضيف غير صالح' });
    }

    const start = Date.now();
    try {
      await execAsync(`ping -c 1 -W 3 ${host}`, { timeout: 5000 });
      const latency = Date.now() - start;
      return res.json({ success: true, data: { host, reachable: true, latency } });
    } catch {
      return res.json({ success: true, data: { host, reachable: false, latency: null } });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'خطأ غير معروف';
    return res.status(500).json({ success: false, message });
  }
});

router.post('/check-port', async (req: Request, res: Response) => {
  try {
    const { host, port } = req.body as { host: string; port: unknown };
    if (!host || !sanitizeHost(host)) {
      return res.status(400).json({ success: false, message: 'عنوان المضيف غير صالح' });
    }
    const safePort = sanitizePort(port);

    try {
      await execAsync(`timeout 5 bash -c "echo >/dev/tcp/${host}/${safePort}" 2>/dev/null`, { timeout: 7000 });
      return res.json({ success: true, data: { host, port: safePort, open: true } });
    } catch {
      return res.json({ success: true, data: { host, port: safePort, open: false } });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'خطأ غير معروف';
    return res.status(500).json({ success: false, message });
  }
});

router.post('/server-info', async (req: Request, res: Response) => {
  try {
    const { host, port, username, privateKeyPath } = req.body as {
      host: string;
      port: unknown;
      username: string;
      privateKeyPath?: string;
    };

    if (!host || !sanitizeHost(host)) {
      return res.status(400).json({ success: false, message: 'عنوان المضيف غير صالح' });
    }
    if (!username || !/^[a-zA-Z0-9_\-]+$/.test(username)) {
      return res.status(400).json({ success: false, message: 'اسم المستخدم غير صالح' });
    }

    const safePort = sanitizePort(port);
    const keyArg = privateKeyPath ? `-i ${privateKeyPath}` : '';

    const sshCmd = `ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -o BatchMode=yes ${keyArg} -p ${safePort} ${username}@${host} "uname -a && uptime && df -h / | tail -1 && free -m | tail -1" 2>&1`;

    try {
      const { stdout } = await execAsync(sshCmd, { timeout: 10000 });
      const lines = stdout.trim().split('\n');
      return res.json({
        success: true,
        data: {
          host,
          port: safePort,
          username,
          connected: true,
          info: {
            system: lines[0] || '',
            uptime: lines[1] || '',
            disk: lines[2] || '',
            memory: lines[3] || '',
            raw: stdout
          }
        }
      });
    } catch (sshErr: unknown) {
      const errMsg = sshErr instanceof Error ? sshErr.message : String(sshErr);
      return res.json({
        success: false,
        data: { host, port: safePort, connected: false },
        message: `فشل الاتصال: ${errMsg.substring(0, 200)}`
      });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'خطأ غير معروف';
    return res.status(500).json({ success: false, message });
  }
});

router.get('/known-hosts', async (_req: Request, res: Response) => {
  try {
    const { stdout } = await execAsync('cat ~/.ssh/known_hosts 2>/dev/null || echo ""', { timeout: 3000 });
    const hosts = stdout.trim()
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const parts = line.split(' ');
        return { host: parts[0] || '', keyType: parts[1] || '' };
      });
    res.json({ success: true, data: { count: hosts.length, hosts } });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'خطأ غير معروف';
    res.status(500).json({ success: false, message });
  }
});

export default router;
