import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

interface UploadResult {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  webContentLink?: string;
  fileName?: string;
  sizeMB?: string;
  message?: string;
}

export class GoogleDriveService {
  private static drive: ReturnType<typeof google.drive> | null = null;
  private static isReady = false;
  private static failureCount = 0;
  private static maxFailures = 3;
  private static circuitOpen = false;
  private static circuitResetAt: number = 0;

  static initialize(): boolean {
    try {
      const auth = this.createAuth();
      if (!auth) {
        console.warn('⚠️ [GoogleDriveService] لا تتوفر بيانات اعتماد صالحة - الخدمة معطّلة');
        return false;
      }

      this.drive = google.drive({ version: 'v3', auth });
      this.isReady = true;
      console.log('✅ [GoogleDriveService] تم تهيئة Google Drive بنجاح');
      return true;
    } catch (error: any) {
      console.error('❌ [GoogleDriveService] فشل التهيئة:', error.message);
      return false;
    }
  }

  private static createAuth(): any {
    const credentialsStr = process.env.GOOGLE_DRIVE_CREDENTIALS;
    if (credentialsStr) {
      try {
        const credentials = JSON.parse(credentialsStr);
        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/drive.file'],
        });
        console.log('🔑 [GoogleDriveService] استخدام Service Account');
        return auth;
      } catch (e: any) {
        console.warn('⚠️ [GoogleDriveService] فشل قراءة Service Account:', e.message);
      }
    }

    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

    if (clientId && clientSecret && refreshToken) {
      try {
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        console.log('🔑 [GoogleDriveService] استخدام OAuth2');
        return oauth2Client;
      } catch (e: any) {
        console.warn('⚠️ [GoogleDriveService] فشل إعداد OAuth2:', e.message);
      }
    }

    return null;
  }

  static isEnabled(): boolean {
    return this.isReady && !!this.drive;
  }

  private static shouldSkip(): boolean {
    if (!this.isEnabled()) return true;

    if (this.circuitOpen) {
      if (Date.now() > this.circuitResetAt) {
        this.circuitOpen = false;
        this.failureCount = 0;
        console.log('🔄 [GoogleDriveService] إعادة فتح الدائرة');
      } else {
        return true;
      }
    }
    return false;
  }

  private static onFailure(error: any): void {
    this.failureCount++;
    if (this.failureCount >= this.maxFailures) {
      this.circuitOpen = true;
      this.circuitResetAt = Date.now() + 10 * 60 * 1000;
      console.warn(`🔴 [GoogleDriveService] دائرة مفتوحة بعد ${this.failureCount} فشل - إعادة بعد 10 دقائق`);
    }
    console.error(`❌ [GoogleDriveService] خطأ (${this.failureCount}/${this.maxFailures}):`, error.message);
  }

  private static onSuccess(): void {
    if (this.failureCount > 0) {
      this.failureCount = 0;
      console.log('✅ [GoogleDriveService] الاتصال مستقر مجدداً');
    }
  }

  static async uploadBackupFile(filePath: string, fileName?: string): Promise<UploadResult> {
    if (this.shouldSkip()) {
      return { success: false, message: 'خدمة Google Drive غير متاحة حالياً' };
    }

    if (!fs.existsSync(filePath)) {
      return { success: false, message: `الملف غير موجود: ${filePath}` };
    }

    const actualFileName = fileName || path.basename(filePath);
    const fileStats = fs.statSync(filePath);
    const sizeMB = (fileStats.size / 1024 / 1024).toFixed(2);

    console.log(`☁️ [GoogleDriveService] بدء رفع: ${actualFileName} (${sizeMB} MB)`);

    try {
      const fileMetadata: any = {
        name: actualFileName,
        description: `AXION Backup - ${new Date().toISOString()}`,
      };

      if (FOLDER_ID) {
        fileMetadata.parents = [FOLDER_ID];
      }

      const media = {
        mimeType: 'application/gzip',
        body: fs.createReadStream(filePath),
      };

      const response = await this.drive!.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, name, webViewLink, webContentLink, size',
      });

      this.onSuccess();

      const result: UploadResult = {
        success: true,
        fileId: response.data.id || undefined,
        webViewLink: response.data.webViewLink || undefined,
        webContentLink: response.data.webContentLink || undefined,
        fileName: response.data.name || actualFileName,
        sizeMB,
        message: `تم الرفع بنجاح: ${actualFileName}`,
      };

      console.log(`✅ [GoogleDriveService] تم الرفع: ${actualFileName} | ID: ${result.fileId}`);
      return result;
    } catch (error: any) {
      this.onFailure(error);
      return {
        success: false,
        fileName: actualFileName,
        sizeMB,
        message: `فشل الرفع: ${error.message}`,
      };
    }
  }

  static async listBackupFiles(maxResults: number = 20): Promise<any> {
    if (this.shouldSkip()) {
      return { success: false, message: 'خدمة Google Drive غير متاحة' };
    }

    try {
      const query = FOLDER_ID
        ? `'${FOLDER_ID}' in parents and trashed = false`
        : `name contains 'backup-' and trashed = false`;

      const response = await this.drive!.files.list({
        q: query,
        fields: 'files(id, name, size, createdTime, webViewLink, webContentLink)',
        orderBy: 'createdTime desc',
        pageSize: maxResults,
      });

      this.onSuccess();

      const files = (response.data.files || []).map(f => ({
        id: f.id,
        name: f.name,
        sizeMB: f.size ? (parseInt(f.size) / 1024 / 1024).toFixed(2) : '0',
        createdAt: f.createdTime,
        webViewLink: f.webViewLink,
        webContentLink: f.webContentLink,
      }));

      return { success: true, files, total: files.length };
    } catch (error: any) {
      this.onFailure(error);
      return { success: false, message: error.message, files: [], total: 0 };
    }
  }

  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isReady) {
        this.initialize();
      }

      if (!this.drive) {
        return { success: false, message: 'لم يتم تهيئة Google Drive' };
      }

      const response = await this.drive.about.get({
        fields: 'user, storageQuota',
      });

      const user = response.data.user;
      const quota = response.data.storageQuota;
      const usedGB = quota?.usage ? (parseInt(quota.usage) / 1024 / 1024 / 1024).toFixed(2) : '?';
      const totalGB = quota?.limit ? (parseInt(quota.limit) / 1024 / 1024 / 1024).toFixed(2) : 'غير محدود';

      return {
        success: true,
        message: `متصل: ${user?.displayName || user?.emailAddress} | المستخدم: ${usedGB} GB / ${totalGB} GB`,
      };
    } catch (error: any) {
      return { success: false, message: `فشل الاتصال: ${error.message}` };
    }
  }
}
