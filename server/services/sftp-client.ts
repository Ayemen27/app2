import { Client, ConnectConfig } from "ssh2";
import { Readable } from "stream";
import { readFileSync } from "fs";

export interface SftpConnectionOptions {
  host: string;
  port?: number;
  username: string;
  privateKeyPath?: string;
  password?: string;
  readyTimeout?: number;
}

function buildConnectConfig(opts: SftpConnectionOptions): ConnectConfig {
  const cfg: ConnectConfig = {
    host: opts.host,
    port: opts.port ?? 22,
    username: opts.username,
    readyTimeout: opts.readyTimeout ?? 20000,
  };
  if (opts.privateKeyPath) {
    try {
      cfg.privateKey = readFileSync(opts.privateKeyPath);
    } catch (err) {
      throw new Error(`SFTP: تعذّر قراءة المفتاح من ${opts.privateKeyPath}: ${(err as Error).message}`);
    }
  } else if (opts.password) {
    cfg.password = opts.password;
  } else {
    throw new Error("SFTP: مفتاح خاص أو كلمة مرور مطلوب");
  }
  return cfg;
}

function getEnvOptions(): SftpConnectionOptions {
  const host = process.env.SSH_HOST;
  const username = process.env.SSH_USER;
  if (!host) throw new Error("SSH_HOST غير مُعيّن");
  if (!username) throw new Error("SSH_USER غير مُعيّن");
  const port = process.env.SSH_PORT ? parseInt(process.env.SSH_PORT, 10) : 22;
  const privateKeyPath = process.env.SSH_KEY_PATH || "/home/runner/.ssh/axion_deploy_key";
  const password = process.env.SSH_PASSWORD;
  return { host, port, username, privateKeyPath, password };
}

export async function statRemoteFileSize(remotePath: string): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let settled = false;
    const cleanup = () => { try { conn.end(); } catch {} };
    const safeReject = (err: Error) => { if (!settled) { settled = true; cleanup(); reject(err); } };
    const safeResolve = (v: number | null) => { if (!settled) { settled = true; cleanup(); resolve(v); } };

    conn.on("ready", () => {
      conn.sftp((err, sftp) => {
        if (err) return safeReject(err);
        sftp.stat(remotePath, (statErr, stats) => {
          if (statErr) {
            const code = (statErr as NodeJS.ErrnoException).code;
            if (code === "ENOENT" || (statErr as any).code === 2) {
              return safeResolve(null);
            }
            return safeReject(statErr);
          }
          safeResolve(Number(stats.size));
        });
      });
    });
    conn.on("error", safeReject);

    try {
      conn.connect(buildConnectConfig(getEnvOptions()));
    } catch (e) {
      safeReject(e as Error);
    }
  });
}

export interface SftpReadStreamHandle {
  stream: Readable;
  close: () => void;
}

export async function openRemoteReadStream(remotePath: string): Promise<SftpReadStreamHandle> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let settled = false;
    const close = () => { try { conn.end(); } catch {} };
    const safeReject = (err: Error) => { if (!settled) { settled = true; close(); reject(err); } };

    conn.on("ready", () => {
      conn.sftp((err, sftp) => {
        if (err) return safeReject(err);
        const stream = sftp.createReadStream(remotePath);
        stream.on("end", close);
        stream.on("close", close);
        stream.on("error", () => { close(); });
        if (!settled) {
          settled = true;
          resolve({ stream, close });
        }
      });
    });
    conn.on("error", safeReject);

    try {
      conn.connect(buildConnectConfig(getEnvOptions()));
    } catch (e) {
      safeReject(e as Error);
    }
  });
}
