import TelegramBot from 'node-telegram-bot-api';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

interface TelegramMessage {
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableNotification?: boolean;
}

interface TelegramFileMessage {
  filePath: string;
  caption?: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

export class TelegramService {
  private static bot: TelegramBot | null = null;
  private static isReady = false;
  private static failureCount = 0;
  private static maxFailures = 5;
  private static circuitOpen = false;
  private static circuitResetAt: number = 0;

  static initialize(): boolean {
    if (!BOT_TOKEN || !CHAT_ID) {
      console.warn('⚠️ [TelegramService] TELEGRAM_BOT_TOKEN أو TELEGRAM_CHAT_ID غير مُعرّف - الخدمة معطّلة');
      return false;
    }

    try {
      this.bot = new TelegramBot(BOT_TOKEN, { polling: false });
      this.isReady = true;
      console.log('✅ [TelegramService] تم تهيئة بوت تيليجرام بنجاح');
      return true;
    } catch (error: any) {
      console.error('❌ [TelegramService] فشل تهيئة البوت:', error.message);
      return false;
    }
  }

  static isEnabled(): boolean {
    return this.isReady && !!this.bot;
  }

  private static shouldSkip(): boolean {
    if (!this.isEnabled()) return true;

    if (this.circuitOpen) {
      if (Date.now() > this.circuitResetAt) {
        this.circuitOpen = false;
        this.failureCount = 0;
        console.log('🔄 [TelegramService] إعادة فتح الدائرة - محاولة الاتصال مجدداً');
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
      this.circuitResetAt = Date.now() + 5 * 60 * 1000;
      console.warn(`🔴 [TelegramService] تم فتح الدائرة بعد ${this.failureCount} فشل - إعادة المحاولة بعد 5 دقائق`);
    }
    console.error(`❌ [TelegramService] خطأ (${this.failureCount}/${this.maxFailures}):`, error.message);
  }

  private static onSuccess(): void {
    if (this.failureCount > 0) {
      this.failureCount = 0;
      console.log('✅ [TelegramService] تمت الإعادة - الاتصال مستقر');
    }
  }

  static async sendMessage(msg: TelegramMessage): Promise<boolean> {
    if (this.shouldSkip()) return false;

    try {
      await this.bot!.sendMessage(CHAT_ID, msg.text, {
        parse_mode: msg.parseMode || 'HTML',
        disable_notification: msg.disableNotification || false,
      });
      this.onSuccess();
      return true;
    } catch (error: any) {
      this.onFailure(error);
      return false;
    }
  }

  static async sendDocument(msg: TelegramFileMessage): Promise<boolean> {
    if (this.shouldSkip()) return false;

    try {
      await this.bot!.sendDocument(CHAT_ID, msg.filePath, {
        caption: msg.caption || '',
        parse_mode: msg.parseMode || 'HTML',
      });
      this.onSuccess();
      return true;
    } catch (error: any) {
      this.onFailure(error);
      return false;
    }
  }

  static async sendBackupNotification(result: {
    success: boolean;
    filename?: string;
    totalRows?: number;
    tablesCount?: number;
    sizeMB?: string;
    compressionRatio?: string;
    durationMs?: number;
    triggeredBy?: string;
    message?: string;
    driveUrl?: string;
    driveUploaded?: boolean;
  }): Promise<boolean> {
    const now = new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' });

    let text: string;
    if (result.success) {
      const driveStatus = result.driveUploaded
        ? `✅ تم الرفع إلى Google Drive`
        : `⚠️ لم يتم الرفع إلى Google Drive`;

      text = [
        `💾 <b>نسخة احتياطية ناجحة</b>`,
        ``,
        `📁 الملف: <code>${result.filename}</code>`,
        `📊 الجداول: ${result.tablesCount} | السجلات: ${result.totalRows}`,
        `💿 الحجم: ${result.sizeMB} MB | الضغط: ${result.compressionRatio}`,
        `⏱ المدة: ${((result.durationMs || 0) / 1000).toFixed(1)} ثانية`,
        `🔧 النوع: ${result.triggeredBy === 'auto' ? 'تلقائي' : 'يدوي'}`,
        `☁️ ${driveStatus}`,
        `🕐 التوقيت: ${now}`,
      ].join('\n');
    } else {
      text = [
        `❌ <b>فشل النسخ الاحتياطي</b>`,
        ``,
        `📛 السبب: ${result.message || 'خطأ غير معروف'}`,
        `🔧 النوع: ${result.triggeredBy === 'auto' ? 'تلقائي' : 'يدوي'}`,
        `🕐 التوقيت: ${now}`,
      ].join('\n');
    }

    return await this.sendMessage({ text });
  }

  static async sendNotification(notification: {
    type: string;
    title: string;
    body: string;
    priority?: number;
    projectId?: string;
  }): Promise<boolean> {
    const priorityEmoji = (notification.priority || 3) >= 4 ? '🔴' :
                          (notification.priority || 3) >= 3 ? '🟡' : '🟢';

    const typeLabels: Record<string, string> = {
      system: '⚙️ نظام',
      safety: '🚨 أمان',
      task: '📋 مهمة',
      payroll: '💰 رواتب',
      announcement: '📢 إعلان',
      maintenance: '🔧 صيانة',
      warranty: '📄 ضمان',
    };

    const typeLabel = typeLabels[notification.type] || `📌 ${notification.type}`;

    const text = [
      `${priorityEmoji} <b>${notification.title}</b>`,
      ``,
      `${typeLabel}`,
      `${notification.body}`,
      notification.projectId ? `📍 المشروع: ${notification.projectId}` : '',
      `🕐 ${new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })}`,
    ].filter(Boolean).join('\n');

    return await this.sendMessage({
      text,
      disableNotification: (notification.priority || 3) < 3,
    });
  }

  static async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!BOT_TOKEN || !CHAT_ID) {
      return { success: false, message: 'TELEGRAM_BOT_TOKEN أو TELEGRAM_CHAT_ID غير مُعرّف' };
    }

    try {
      if (!this.bot) {
        this.initialize();
      }

      const me = await this.bot!.getMe();
      await this.sendMessage({
        text: `✅ <b>اختبار اتصال ناجح</b>\n\nبوت: @${me.username}\nالنظام: AXION`,
      });
      return { success: true, message: `متصل بنجاح - @${me.username}` };
    } catch (error: any) {
      return { success: false, message: `فشل الاتصال: ${error.message}` };
    }
  }
}
