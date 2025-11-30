import { Client } from 'ssh2';
import * as fs from 'fs';
import * as path from 'path';

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
}

export class SSHConnection {
  private client: Client;
  private config: SSHConfig;
  private isConnected: boolean = false;

  constructor(config: SSHConfig) {
    this.client = new Client();
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.on('ready', () => {
        console.log('✅ [SSH] تم الاتصال بنجاح بالـ Server');
        this.isConnected = true;
        resolve();
      });

      this.client.on('error', (err) => {
        console.error('❌ [SSH] خطأ في الاتصال:', err.message);
        reject(err);
      });

      this.client.on('close', () => {
        console.log('🔌 [SSH] تم قطع الاتصال');
        this.isConnected = false;
      });

      const connectConfig: any = {
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
      };

      if (this.config.password) {
        connectConfig.password = this.config.password;
      } else if (this.config.privateKey) {
        connectConfig.privateKey = this.config.privateKey;
      }

      console.log(`🔌 [SSH] محاولة الاتصال بـ ${this.config.host}:${this.config.port} كـ ${this.config.username}...`);
      this.client.connect(connectConfig);
    });
  }

  async executeCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('SSH connection not established'));
        return;
      }

      this.client.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let output = '';
        let errorOutput = '';

        stream.on('data', (data: Buffer) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          errorOutput += data.toString();
        });

        stream.on('end', () => {
          if (errorOutput) {
            console.error('⚠️ [SSH] stderr:', errorOutput);
          }
          resolve(output);
        });

        stream.on('close', (code: number) => {
          if (code !== 0) {
            reject(new Error(`Command failed with exit code ${code}`));
          }
        });
      });
    });
  }

  async uploadFile(localPath: string, remotePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('SSH connection not established'));
        return;
      }

      this.client.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }

        const readStream = fs.createReadStream(localPath);
        const writeStream = sftp.createWriteStream(remotePath);

        writeStream.on('error', (err) => {
          reject(err);
        });

        writeStream.on('close', () => {
          console.log(`✅ [SSH] تم رفع الملف: ${localPath} → ${remotePath}`);
          resolve();
        });

        readStream.pipe(writeStream);
      });
    });
  }

  async downloadFile(remotePath: string, localPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('SSH connection not established'));
        return;
      }

      this.client.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }

        const readStream = sftp.createReadStream(remotePath);
        const writeStream = fs.createWriteStream(localPath);

        writeStream.on('error', (err) => {
          reject(err);
        });

        writeStream.on('close', () => {
          console.log(`✅ [SSH] تم تحميل الملف: ${remotePath} → ${localPath}`);
          resolve();
        });

        readStream.pipe(writeStream);
      });
    });
  }

  disconnect(): void {
    this.client.end();
  }
}

// Factory function with env vars
export function createSSHConnection(): SSHConnection {
  const config: SSHConfig = {
    host: process.env.SSH_HOST || '93.127.142.144',
    port: parseInt(process.env.SSH_PORT || '22'),
    username: process.env.SSH_USER || 'administrator',
    password: process.env.SSH_PASSWORD,
    privateKey: process.env.SSH_PUBLIC_KEY,
  };

  return new SSHConnection(config);
}

export default SSHConnection;
