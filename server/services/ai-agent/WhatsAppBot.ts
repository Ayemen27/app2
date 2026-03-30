import makeWASocket, { 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  ConnectionState,
  WAVersion
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { getWhatsAppAIService } from './WhatsAppAIService';
import { db } from '../../db';
import { whatsappAllowedNumbers, whatsappSecurityEvents } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { BotReply } from './whatsapp/InteractiveMenu';
import { botSettingsService } from './whatsapp/BotSettingsService';
import { NotificationService } from '../NotificationService';

const logger = pino({ level: 'info' });

const AUTH_DIR = 'auth_info_baileys';
const DAILY_MESSAGE_LIMIT = 50;
const MIN_DELAY_MS = 2000;
const MAX_DELAY_MS = 5000;
const RECONNECT_BASE_DELAY = 5000;
const MAX_RECONNECT_DELAY = 120000;
const PAIRING_CODE_DELAY_MS = 8000;
const MAX_RECONNECT_ATTEMPTS = 10;
const DEDUP_TTL_MS = 5 * 60 * 1000;
const DEDUP_MAX_SIZE = 100;

type BotStatus = "idle" | "connecting" | "open" | "close";

interface BotProtectionStats {
  dailyMessageCount: number;
  dailyLimit: number;
  reconnectAttempts: number;
  connectedAt: Date | null;
  lastError: string | null;
  minDelay: number;
  maxDelay: number;
  sessionExists: boolean;
  needsRelink: boolean;
}

interface DedupEntry {
  messageId: string;
  timestamp: number;
}

export class WhatsAppBot {
  private sock: any;
  private qr: string | null = null;
  private pairingCode: string | null = null;
  private status: BotStatus = "idle";
  private reconnectAttempts: number = 0;
  private dailyMessageCount: number = 0;
  private lastMessageTime: number = 0;
  private dailyResetTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectedAt: Date | null = null;
  private lastError: string | null = null;
  private needsRelink: boolean = false;
  private pendingPhoneNumber: string | null = null;
  private allowedNumbersCache: Set<string> = new Set();
  private allowedCacheTime: number = 0;
  private static CACHE_TTL = 60_000;
  private processedMessages: Map<string, number> = new Map();
  private recentContentHashes: Map<string, number> = new Map();
  private phoneProcessingLock: Map<string, boolean> = new Map();
  private dedupCleanupTimer: NodeJS.Timeout | null = null;
  private userMessageCounts: Map<string, { count: number; resetAt: number }> = new Map();
  private userMinuteRates: Map<string, number[]> = new Map();
  private rateMapsCleanupTimer: NodeJS.Timeout | null = null;
  private waitingMessageSent: Map<string, number> = new Map();
  private static RATE_MAP_TTL_MS = 60 * 60 * 1000;
  private baileysExceptionHandler: ((err: Error) => void) | null = null;
  private notificationService: NotificationService = new NotificationService();
  private conflictReconnectCount: number = 0;
  private conflictTimestamps: number[] = [];
  private static CONFLICT_WINDOW_MS = 300_000;
  private static MAX_CONFLICTS_IN_WINDOW = 5;
  private lastSentMessages: Map<string, { key: any; timestamp: number }[]> = new Map();
  private sentContentGuard: Map<string, number> = new Map();

  getStatus(): BotStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === "open" && !!this.sock;
  }

  async sendMessageSafe(jid: string, content: any) {
    if (!this.sock) throw new Error("البوت غير متصل");
    return await this.sock.sendMessage(jid, content);
  }

  getQR(): string | null {
    return this.qr;
  }

  getPairingCode(): string | null {
    return this.pairingCode;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  getNeedsRelink(): boolean {
    return this.needsRelink;
  }

  async getProtectionStats(): Promise<BotProtectionStats> {
    const settings = await botSettingsService.getSettings();
    return {
      dailyMessageCount: this.dailyMessageCount,
      dailyLimit: settings.dailyMessageLimit,
      reconnectAttempts: this.reconnectAttempts,
      connectedAt: this.connectedAt,
      lastError: this.lastError,
      minDelay: settings.responseDelayMin,
      maxDelay: settings.responseDelayMax,
      sessionExists: this.hasAuthState(),
      needsRelink: this.needsRelink,
    };
  }

  private hasAuthState(): boolean {
    try {
      const credsPath = path.join(AUTH_DIR, 'creds.json');
      return fs.existsSync(credsPath);
    } catch {
      return false;
    }
  }

  private clearAuthState(): void {
    try {
      if (fs.existsSync(AUTH_DIR)) {
        const files = fs.readdirSync(AUTH_DIR);
        for (const file of files) {
          fs.unlinkSync(path.join(AUTH_DIR, file));
        }
        console.log(`[WhatsAppBot] Auth state cleared (${files.length} files removed)`);
      }
    } catch (err) {
      console.error('[WhatsAppBot] Failed to clear auth state:', err);
    }
  }

  private resetDailyCounter(): void {
    if (this.dailyResetTimer) clearInterval(this.dailyResetTimer);
    this.dailyResetTimer = setInterval(() => {
      console.log(`[AntiBot] Daily message counter reset (was: ${this.dailyMessageCount})`);
      this.dailyMessageCount = 0;
    }, 24 * 60 * 60 * 1000);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private async cleanupSocket(): Promise<void> {
    if (this.baileysExceptionHandler) {
      process.removeListener('uncaughtException', this.baileysExceptionHandler);
      this.baileysExceptionHandler = null;
    }
    if (this.rateMapsCleanupTimer) {
      clearInterval(this.rateMapsCleanupTimer);
      this.rateMapsCleanupTimer = null;
    }
    if (this.sock) {
      try {
        this.sock.ev?.removeAllListeners?.('connection.update');
        this.sock.ev?.removeAllListeners?.('creds.update');
        this.sock.ev?.removeAllListeners?.('messages.upsert');
        await this.sock.end(undefined);
      } catch (e) {}
      this.sock = null;
    }
  }

  private isDuplicate(messageId: string): boolean {
    const now = Date.now();
    if (this.processedMessages.has(messageId)) {
      return true;
    }
    this.processedMessages.set(messageId, now);
    if (this.processedMessages.size > DEDUP_MAX_SIZE) {
      const entries = Array.from(this.processedMessages.entries());
      entries.sort((a, b) => a[1] - b[1]);
      const toRemove = entries.slice(0, entries.length - DEDUP_MAX_SIZE);
      for (const [key] of toRemove) {
        this.processedMessages.delete(key);
      }
    }
    return false;
  }

  private isContentDuplicate(phone: string, text: string, inputType: string): boolean {
    const contentKey = `${phone}:${inputType}:${text.substring(0, 100)}`;
    const now = Date.now();
    const lastTime = this.recentContentHashes.get(contentKey);
    if (lastTime && now - lastTime < 60000) {
      console.log(`[WhatsAppBot] Content-duplicate ignored for ${phone}: "${text.substring(0, 30)}..." (${now - lastTime}ms)`);
      return true;
    }
    this.recentContentHashes.set(contentKey, now);
    if (this.recentContentHashes.size > 500) {
      for (const [key, ts] of this.recentContentHashes.entries()) {
        if (now - ts > 30000) this.recentContentHashes.delete(key);
      }
    }
    return false;
  }

  private startDedupCleanup(): void {
    if (this.dedupCleanupTimer) clearInterval(this.dedupCleanupTimer);
    this.dedupCleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of this.processedMessages.entries()) {
        if (now - timestamp > DEDUP_TTL_MS) {
          this.processedMessages.delete(key);
        }
      }
    }, 60_000);
  }

  private startRateMapsCleanup(): void {
    if (this.rateMapsCleanupTimer) clearInterval(this.rateMapsCleanupTimer);
    this.rateMapsCleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [phone, entry] of this.userMessageCounts.entries()) {
        if (now > entry.resetAt || now - (entry.resetAt - 24 * 60 * 60 * 1000) > WhatsAppBot.RATE_MAP_TTL_MS) {
          this.userMessageCounts.delete(phone);
        }
      }
      for (const [phone, timestamps] of this.userMinuteRates.entries()) {
        const recent = timestamps.filter(t => now - t < 60_000);
        if (recent.length === 0) {
          this.userMinuteRates.delete(phone);
        } else {
          this.userMinuteRates.set(phone, recent);
        }
      }
    }, 5 * 60_000);
  }

  private extractMessageContent(msg: any): { text: string; inputType: 'text' | 'button' | 'list' | 'image' | 'audio' | 'document'; inputId?: string; imageCaption?: string; documentInfo?: { mimetype?: string; fileName?: string }; } {
    const message = msg.message;

    if (message?.buttonsResponseMessage) {
      return {
        text: message.buttonsResponseMessage.selectedDisplayText || '',
        inputType: 'button',
        inputId: message.buttonsResponseMessage.selectedButtonId,
      };
    }

    if (message?.listResponseMessage) {
      return {
        text: message.listResponseMessage.title || '',
        inputType: 'list',
        inputId: message.listResponseMessage.singleSelectReply?.selectedRowId,
      };
    }

    if (message?.templateButtonReplyMessage) {
      return {
        text: message.templateButtonReplyMessage.selectedDisplayText || '',
        inputType: 'button',
        inputId: message.templateButtonReplyMessage.selectedId,
      };
    }

    if (message?.imageMessage) {
      const caption = message.imageMessage.caption || '';
      return {
        text: caption || '📷 صورة',
        inputType: 'image',
        imageCaption: caption,
      };
    }

    if (message?.audioMessage || message?.pttMessage) {
      const audioMsg = message.audioMessage || message.pttMessage;
      const isPtt = !!message.pttMessage;
      const seconds = audioMsg?.seconds || 0;
      return {
        text: isPtt ? '🎤 رسالة صوتية' : '🎵 ملف صوتي',
        inputType: 'audio',
      };
    }

    if (message?.documentMessage) {
      const docMsg = message.documentMessage;
      const mimetype = docMsg?.mimetype || '';
      const fileName = docMsg?.fileName || docMsg?.title || '';
      const caption = docMsg?.caption || '';
      return {
        text: caption || `📄 مستند: ${fileName || 'ملف'}`,
        inputType: 'document',
        documentInfo: { mimetype, fileName },
      };
    }

    const text = message?.conversation ||
                 message?.extendedTextMessage?.text ||
                 '';

    return { text, inputType: 'text' };
  }

  async disconnect(): Promise<void> {
    this.cancelReconnect();
    if (this.sock) {
      try {
        this.sock.ev?.removeAllListeners?.('connection.update');
        this.sock.ev?.removeAllListeners?.('creds.update');
        this.sock.ev?.removeAllListeners?.('messages.upsert');
        await this.sock.end(undefined);
      } catch (e) {
        console.warn('[WhatsAppBot] Error during graceful disconnect:', e);
      }
    }
    this.sock = null;
    this.status = "close";
    this.qr = null;
    this.pairingCode = null;
    this.lastError = "تم إيقاف الاتصال مؤقتاً (الجلسة محفوظة)";
    console.log('[WhatsAppBot] Disconnected gracefully (session preserved)');
  }

  async forceLogout(): Promise<void> {
    this.cancelReconnect();
    if (this.sock) {
      try {
        this.sock.ev?.removeAllListeners?.('connection.update');
        this.sock.ev?.removeAllListeners?.('creds.update');
        this.sock.ev?.removeAllListeners?.('messages.upsert');
        await this.sock.logout();
      } catch (e) {
        try {
          await this.sock.end(undefined);
        } catch (e2) {}
      }
    }
    this.sock = null;
    this.clearAuthState();
    this.status = "close";
    this.qr = null;
    this.pairingCode = null;
    this.connectedAt = null;
    this.needsRelink = false;
    this.lastError = "تم تسجيل الخروج وإلغاء ربط الجهاز";
    console.log('[WhatsAppBot] Force logged out (session invalidated, auth cleared)');
  }

  async restart(phoneNumber?: string): Promise<void> {
    console.log(`[WhatsAppBot] Restart requested${phoneNumber ? ` with phone: ${phoneNumber}` : ''}`);
    this.cancelReconnect();
    await this.cleanupSocket();
    
    this.status = "idle";
    this.qr = null;
    this.pairingCode = null;
    this.reconnectAttempts = 0;
    this.lastError = null;
    this.needsRelink = false;
    this.pendingPhoneNumber = phoneNumber || null;

    if (phoneNumber) {
      this.clearAuthState();
      console.log('[WhatsAppBot] Auth cleared for fresh pairing code session');
    }

    return this.start(phoneNumber);
  }

  async resetAndRelink(): Promise<void> {
    console.log('[WhatsAppBot] Full session reset for re-linking');
    this.cancelReconnect();
    await this.cleanupSocket();
    this.clearAuthState();
    
    this.status = "idle";
    this.qr = null;
    this.pairingCode = null;
    this.reconnectAttempts = 0;
    this.lastError = null;
    this.needsRelink = false;
    this.connectedAt = null;
    this.pendingPhoneNumber = null;

    return this.start();
  }


  async sendInteractiveReply(jid: string, reply: BotReply): Promise<void> {
    if (!this.sock) return;
    await this.safeSendMessage(jid, { text: reply.body });
  }

  async start(phoneNumber?: string): Promise<void> {
    this.status = "connecting";
    this.lastError = null;
    
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    let version: WAVersion = [2, 3000, 1015901307];
    try {
      const { version: latestVersion, isLatest } = await fetchLatestBaileysVersion();
      version = latestVersion;
      console.log(`[WhatsAppBot] Using WA version v${version.join('.')}, isLatest: ${isLatest}`);
    } catch (err) {
      console.log(`[WhatsAppBot] Failed to fetch latest version, using fallback: ${version.join('.')}`);
    }

    const cleanPhone = phoneNumber ? phoneNumber.replace(/\D/g, '') : null;
    if (cleanPhone) {
      this.pendingPhoneNumber = cleanPhone;
    }
    const shouldRequestPairing = !!cleanPhone && !state.creds.registered;

    try {
      this.sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: false,
        logger,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        emitOwnEvents: true,
        retryRequestDelayMs: 5000,
        defaultQueryTimeoutMs: shouldRequestPairing ? undefined : 60000,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        markOnlineOnConnect: false,
      });

      if (shouldRequestPairing) {
        setTimeout(async () => {
          try {
            const code = await this.sock.requestPairingCode(cleanPhone!);
            this.pairingCode = code;
            this.lastError = null;
            console.log(`[WhatsAppBot] Pairing Code generated for ${cleanPhone}: ${code}`);
          } catch (err) {
            const errMsg = (err as Error).message;
            console.error('[WhatsAppBot] Error requesting pairing code:', errMsg);
            this.lastError = `فشل في إنشاء كود الربط: ${errMsg}`;
            this.pairingCode = null;
          }
        }, PAIRING_CODE_DELAY_MS);
      }
    } catch (err) {
      console.error('[WhatsAppBot] Critical error creating socket:', err);
      this.status = "close";
      this.lastError = `خطأ حرج في إنشاء الاتصال`;
      return;
    }

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ws.on('error', (err: Error) => {
      console.error('[WhatsAppBot] WebSocket error (non-fatal):', err.message);
    });

    if (this.baileysExceptionHandler) {
      process.removeListener('uncaughtException', this.baileysExceptionHandler);
    }
    this.baileysExceptionHandler = (err: Error) => {
      const isBaileysError = err.message?.includes('Unsupported state or unable to authenticate data') ||
          err.message?.includes('aesDecrypt') ||
          err.stack?.includes('noise-handler') ||
          err.stack?.includes('@whiskeysockets/baileys');

      if (isBaileysError) {
        console.error('[WhatsAppBot] Baileys crypto error caught (non-fatal), will reconnect:', err.message);
        this.status = 'close';
        this.lastError = 'خطأ تشفير مؤقت - جاري إعادة الاتصال';
        if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts++;
          const delay = Math.min(RECONNECT_BASE_DELAY * Math.pow(1.5, this.reconnectAttempts - 1), MAX_RECONNECT_DELAY);
          this.reconnectTimer = setTimeout(() => this.start(), delay);
        }
        return;
      }
    };
    process.on('uncaughtException', this.baileysExceptionHandler);

    this.sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        this.qr = qr;
        this.pairingCode = null;
        this.status = "connecting";
        console.log('[WhatsAppBot] New QR Code generated');
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const errorMsg = (lastDisconnect?.error as Boom)?.message || 'unknown';
        this.status = "close";
        this.qr = null;
        this.connectedAt = null;
        
        console.log(`[WhatsAppBot] Connection closed. Code: ${statusCode}, Reason: ${errorMsg}`);
        
        const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
        
        if (isLoggedOut) {
          this.pairingCode = null;
          this.clearAuthState();
          this.needsRelink = true;
          this.lastError = "انتهت جلسة واتساب — يرجى إعادة ربط الجهاز";
          console.log('[WhatsAppBot] Session expired (401/loggedOut). Auth cleared. Needs re-link.');
          return;
        }

        const isPairingInProgress = !!this.pendingPhoneNumber;
        
        if (statusCode === DisconnectReason.connectionReplaced) {
          const now = Date.now();
          this.conflictTimestamps.push(now);
          this.conflictTimestamps = this.conflictTimestamps.filter(
            (t: number) => now - t < WhatsAppBot.CONFLICT_WINDOW_MS
          );

          this.conflictReconnectCount++;

          if (this.conflictTimestamps.length >= WhatsAppBot.MAX_CONFLICTS_IN_WINDOW) {
            this.pairingCode = null;
            this.lastError = "تعارض متكرر مع جلسة أخرى - تم إيقاف إعادة الاتصال. أغلق الجلسة الأخرى وأعد التشغيل يدوياً";
            console.warn(`[WhatsAppBot] ${this.conflictTimestamps.length} conflicts in ${WhatsAppBot.CONFLICT_WINDOW_MS / 1000}s window. Halting reconnect permanently.`);
            return;
          }

          if (this.conflictReconnectCount > 3) {
            this.pairingCode = null;
            this.lastError = "جلسة أخرى نشطة - تم إيقاف إعادة الاتصال لتجنب التكرار";
            console.warn(`[WhatsAppBot] Connection replaced ${this.conflictReconnectCount} times consecutively. Stopping reconnect.`);
            return;
          }
          const conflictDelays = [5000, 15000, 30000];
          const delay = conflictDelays[this.conflictReconnectCount - 1] || 30000;
          console.log(`[WhatsAppBot] Connection replaced (440). Reconnecting in ${delay / 1000}s (attempt ${this.conflictReconnectCount}/3)`);
          this.pairingCode = null;
          this.reconnectTimer = setTimeout(() => this.start(), delay);
          return;
        }

        if (statusCode === DisconnectReason.restartRequired || 
            statusCode === DisconnectReason.connectionClosed) {
          console.log(`[WhatsAppBot] Server requested restart (code: ${statusCode}). Reconnecting...`);
          this.pairingCode = null;
          this.reconnectTimer = setTimeout(() => this.start(), 3000);
          return;
        }

        if (!isPairingInProgress) {
          this.pairingCode = null;
        }
        this.lastError = `انقطع الاتصال (كود: ${statusCode})`;

        const reconnectSettings = await botSettingsService.getSettings().catch(() => ({ autoReconnect: true }));
        if (reconnectSettings.autoReconnect && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts++;
          const delay = Math.min(
            RECONNECT_BASE_DELAY * Math.pow(1.5, this.reconnectAttempts - 1),
            MAX_RECONNECT_DELAY
          );
          const jitter = Math.floor(Math.random() * 2000);
          const totalDelay = delay + jitter;
          
          const reconnectPhone = isPairingInProgress ? this.pendingPhoneNumber : undefined;
          console.log(`[WhatsAppBot] Reconnecting in ${(totalDelay / 1000).toFixed(1)}s (attempt #${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}, pairing=${isPairingInProgress})`);
          this.reconnectTimer = setTimeout(() => this.start(reconnectPhone || undefined), totalDelay);
        } else if (!reconnectSettings.autoReconnect) {
          this.pairingCode = null;
          this.lastError = `انقطع الاتصال. إعادة الاتصال التلقائي معطّلة.`;
          console.log(`[WhatsAppBot] Auto-reconnect is disabled. Not reconnecting.`);
        } else {
          this.pairingCode = null;
          this.lastError = `فشل الاتصال بعد ${MAX_RECONNECT_ATTEMPTS} محاولات. يرجى إعادة التشغيل يدوياً.`;
          console.log(`[WhatsAppBot] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);
        }
      } else if (connection === 'open') {
        this.status = "open";
        this.qr = null;
        this.pairingCode = null;
        this.reconnectAttempts = 0;
        this.conflictReconnectCount = 0;
        this.connectedAt = new Date();
        this.lastError = null;
        this.needsRelink = false;
        this.pendingPhoneNumber = null;
        this.resetDailyCounter();
        this.startDedupCleanup();
        this.startRateMapsCleanup();
        console.log('[WhatsAppBot] Connection opened successfully');
        
        try {
          const { storage } = await import("../../storage");
          await storage.createAuditLog?.({
            user_id: null,
            action: "whatsapp_connection",
            meta: { module: "whatsapp", description: "تم ربط حساب واتساب بنجاح", status: "success" },
          });
        } catch (e) {
          console.error("Failed to log whatsapp connection:", e);
        }
      }
    });

    this.sock.ev.on('messages.upsert', async (m: any) => {
      const msg = m.messages[0];
      if (!msg.message || msg.key.fromMe) return;

      const messageId = msg.key.id;
      if (messageId && this.isDuplicate(messageId)) {
        console.log(`[WhatsAppBot] Duplicate message ignored: ${messageId}`);
        return;
      }

      const from = msg.key.remoteJid;
      if (!from) return;

      if (from.endsWith('@g.us') || from.endsWith('@broadcast') || from === 'status@broadcast') {
        return;
      }

      const { text, inputType, inputId, imageCaption, documentInfo } = this.extractMessageContent(msg);

      if (!text && !inputId) return;

      const rawId = from.split('@')[0];
      const isLid = from.endsWith('@lid');
      
      let cleanPhone = rawId;
      if (isLid) {
        const resolvedPhone = await this.resolveLidToPhone(rawId);
        if (resolvedPhone) {
          cleanPhone = resolvedPhone;
          console.log(`[WhatsAppBot] Resolved LID ${rawId} -> phone ${cleanPhone}`);
        } else {
          console.log(`[WhatsAppBot] Could not resolve LID ${rawId}, trying as-is`);
        }
      }

      const sendJid = isLid && cleanPhone !== rawId ? `${cleanPhone}@s.whatsapp.net` : from;

      const contentText = text || inputId || '';
      if (this.isContentDuplicate(cleanPhone, contentText, inputType)) {
        return;
      }
      if (isLid && cleanPhone === rawId) {
        for (const [key] of this.recentContentHashes.entries()) {
          if (key.endsWith(`:${inputType}:${contentText.substring(0, 100)}`) && !key.startsWith(rawId)) {
            console.log(`[WhatsAppBot] LID message already processed via phone JID, skipping`);
            return;
          }
        }
      }

      if (this.phoneProcessingLock.get(cleanPhone)) {
        console.log(`[WhatsAppBot] Phone ${cleanPhone} is already processing a message, skipping duplicate`);
        return;
      }
      this.phoneProcessingLock.set(cleanPhone, true);

      try {

      const isAllowed = await this.isPhoneAllowed(cleanPhone);
      if (!isAllowed && isLid) {
        const isAllowedRaw = await this.isPhoneAllowed(rawId);
        if (!isAllowedRaw) {
          console.log(`[WhatsAppBot] Blocked message from non-allowed LID: ${rawId} (resolved: ${cleanPhone})`);
          return;
        }
      } else if (!isAllowed) {
        console.log(`[WhatsAppBot] Blocked message from non-allowed number: ${cleanPhone}`);
        return;
      }

      const displayText = inputId ? `[${inputType}:${inputId}] ${text}` : text;
      console.log(`[WhatsAppBot] Message from ${cleanPhone}${isLid ? ` (LID: ${rawId})` : ''}: ${displayText}`);

      const botSettings = await botSettingsService.getSettings();

      if (!botSettings.botEnabled) {
        console.log(`[WhatsAppBot] Bot is disabled. Ignoring message from ${cleanPhone}`);
        return;
      }

      if (botSettings.maintenanceMode) {
        const maintenanceMsg = botSettings.maintenanceMessage || "🔧 البوت في وضع الصيانة حالياً.";
        await this.safeSendMessage(sendJid, { text: maintenanceMsg });
        return;
      }

      if (!botSettingsService.isWithinBusinessHours(botSettings)) {
        const outsideMsg = botSettingsService.getOutsideHoursMessage(botSettings);
        await this.safeSendMessage(sendJid, { text: outsideMsg });
        return;
      }

      if (this.dailyMessageCount >= botSettings.dailyMessageLimit) {
        console.warn(`[AntiBot] Daily message limit reached (${botSettings.dailyMessageLimit}). Ignoring message.`);
        return;
      }

      if (!this.checkUserDailyLimit(cleanPhone, botSettings.perUserDailyLimit)) {
        console.warn(`[AntiBot] Per-user daily limit reached for ${cleanPhone} (${botSettings.perUserDailyLimit})`);
        return;
      }

      if (!this.checkUserRateLimit(cleanPhone, botSettings.rateLimitPerMinute)) {
        console.warn(`[AntiBot] Rate limit exceeded for ${cleanPhone} (${botSettings.rateLimitPerMinute}/min)`);
        return;
      }

      if ((inputType === 'image' || inputType === 'audio' || inputType === 'document') && !botSettings.mediaEnabled) {
        await this.safeSendMessage(sendJid, { text: "عذراً، استقبال الوسائط معطّل حالياً." });
        return;
      }

        const whatsappAIService = getWhatsAppAIService();

        if (this.sock && text && text.length > 20) {
          try {
            await this.sock.sendPresenceUpdate('composing', sendJid);
          } catch (_) {}
        }

        let msgMetadata: Record<string, any> | undefined;
        if (inputType === 'image') {
          msgMetadata = { type: 'image' };
          try {
            const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            if (buffer) {
              msgMetadata.imageBase64 = `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`;
            }
          } catch (dlErr) {
            console.warn('[WhatsAppBot] Failed to download image:', dlErr);
          }
        } else if (inputType === 'audio') {
          msgMetadata = { type: 'audio' };
          try {
            const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            if (buffer) {
              msgMetadata.audioBase64 = Buffer.from(buffer).toString('base64');
              msgMetadata.audioMimetype = msg.message?.audioMessage?.mimetype || msg.message?.pttMessage?.mimetype || 'audio/ogg';
              msgMetadata.audioDuration = msg.message?.audioMessage?.seconds || msg.message?.pttMessage?.seconds || 0;
              msgMetadata.isPtt = !!msg.message?.pttMessage;
            }
          } catch (dlErr) {
            console.warn('[WhatsAppBot] Failed to download audio:', dlErr);
          }
        } else if (inputType === 'document') {
          msgMetadata = { type: 'document', ...documentInfo };
          try {
            const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            if (buffer) {
              msgMetadata.documentBase64 = Buffer.from(buffer).toString('base64');
              msgMetadata.documentSize = buffer.length;
            }
          } catch (dlErr) {
            console.warn('[WhatsAppBot] Failed to download document:', dlErr);
          }
        }

        let retries = 0;
        const maxRetries = botSettings.maxRetries || 3;
        let reply: any = null;

        while (retries <= maxRetries) {
          try {
            reply = await whatsappAIService.handleIncomingMessage(
              cleanPhone,
              text || inputId || '',
              inputType,
              inputId,
              msgMetadata
            );
            break;
          } catch (retryErr) {
            retries++;
            if (retries > maxRetries) {
              console.error(`[WhatsAppBot] Max retries (${maxRetries}) exceeded for message from ${cleanPhone}`);
              throw retryErr;
            }
            console.warn(`[WhatsAppBot] Retry ${retries}/${maxRetries} for message from ${cleanPhone}`);
            await new Promise(r => setTimeout(r, 1000 * retries));
          }
        }

        if (reply) {
          if (typeof reply === 'string') {
            const trimmedReply = botSettings.maxMessageLength && reply.length > botSettings.maxMessageLength
              ? reply.substring(0, botSettings.maxMessageLength) + "\n\n... (تم اختصار الرسالة)"
              : reply;
            await this.safeSendMessage(sendJid, { text: trimmedReply });
          } else {
            await this.sendInteractiveReply(sendJid, reply);
          }
          this.dailyMessageCount++;
        }

        this.createWhatsAppNotification(cleanPhone, displayText, inputType).catch(err => {
          console.warn('[WhatsAppBot] Failed to create notification:', err.message);
        });
      } catch (error) {
        console.error('[WhatsAppBot] Error processing message:', error);
      } finally {
        setTimeout(() => {
          this.phoneProcessingLock.delete(cleanPhone);
        }, 15000);
      }
    });
  }

  private async createWhatsAppNotification(phone: string, messageText: string, inputType: string): Promise<void> {
    try {
      const settings = await botSettingsService.getSettings();
      if (!settings.notifyNewMessage) return;

      const truncatedMsg = messageText && messageText.length > 100 
        ? messageText.substring(0, 100) + '...' 
        : (messageText || '');

      const mediaLabel = inputType === 'image' ? '📷 صورة' : 
                         inputType === 'audio' ? '🎵 صوت' : 
                         inputType === 'video' ? '🎥 فيديو' : 
                         inputType === 'document' ? '📄 مستند' : '';

      const bodyText = mediaLabel 
        ? `${mediaLabel}${truncatedMsg ? ' - ' + truncatedMsg : ''}` 
        : truncatedMsg;

      const notification = await this.notificationService.createNotification({
        type: 'whatsapp',
        title: `💬 رسالة واتساب من ${phone}`,
        body: bodyText || 'رسالة جديدة',
        priority: 3,
        recipients: ['admin'],
        payload: {
          source: 'whatsapp',
          phone,
          inputType,
          action: 'open_whatsapp',
        },
      });

      const io = (globalThis as Record<string, unknown>).io as { to: (room: string) => { emit: (event: string, data: unknown) => void } } | undefined;
      if (io) {
        io.to('admin').emit('notification:new', {
          id: notification.id,
          type: 'whatsapp',
          title: `رسالة واتساب جديدة`,
          body: bodyText || 'رسالة جديدة',
          priority: 3,
          createdAt: notification.created_at,
        });
        io.to('admin').emit('entity:update', { entity: 'notifications', type: 'NEW' });
      }

      console.log(`🔔 [WhatsAppBot] تم إنشاء إشعار لرسالة واتساب من ${phone}`);
    } catch (err: any) {
      console.warn(`⚠️ [WhatsAppBot] فشل إنشاء إشعار واتساب: ${err.message}`);
    }
  }

  private async resolveLidToPhone(lid: string): Promise<string | null> {
    try {
      const authDir = path.join(process.cwd(), AUTH_DIR);
      const reverseFile = path.join(authDir, `lid-mapping-${lid}_reverse.json`);
      if (fs.existsSync(reverseFile)) {
        const content = fs.readFileSync(reverseFile, 'utf-8').trim();
        const phone = JSON.parse(content);
        if (typeof phone === 'string' && phone.length > 5) {
          return phone;
        }
      }
      
      const files = fs.readdirSync(authDir).filter(f => 
        f.startsWith('lid-mapping-') && !f.includes('_reverse') && f.endsWith('.json')
      );
      for (const file of files) {
        const content = fs.readFileSync(path.join(authDir, file), 'utf-8').trim();
        const mappedLid = JSON.parse(content);
        if (typeof mappedLid === 'string' && mappedLid === lid) {
          const phone = file.replace('lid-mapping-', '').replace('.json', '');
          return phone;
        }
      }
      
      if (this.sock?.store?.contacts) {
        for (const [jid, contact] of Object.entries(this.sock.store.contacts as Record<string, any>)) {
          if (contact?.lid === `${lid}@lid` || contact?.lid === lid) {
            return jid.split('@')[0];
          }
        }
      }
    } catch (err) {
      console.error(`[WhatsAppBot] Error resolving LID ${lid}:`, err);
    }
    return null;
  }

  async isPhoneAllowed(phone: string): Promise<boolean> {
    try {
      const now = Date.now();
      if (now - this.allowedCacheTime < WhatsAppBot.CACHE_TTL && this.allowedNumbersCache.size > 0) {
        const allowed = this.allowedNumbersCache.has(phone);
        if (!allowed) {
          this.logSecurityEvent(phone, null, "whitelist_rejected", "الرقم غير موجود في القائمة المسموحة");
        }
        return allowed;
      }
      const rows = await db.select({ phoneNumber: whatsappAllowedNumbers.phoneNumber })
        .from(whatsappAllowedNumbers)
        .where(eq(whatsappAllowedNumbers.isActive, true));

      if (rows.length === 0) {
        this.logSecurityEvent(phone, null, "whitelist_rejected", "القائمة المسموحة فارغة - رفض الكل (fail-closed)");
        return false;
      }

      this.allowedNumbersCache = new Set(rows.map((r: any) => r.phoneNumber));
      this.allowedCacheTime = now;
      const allowed = this.allowedNumbersCache.has(phone);
      if (!allowed) {
        this.logSecurityEvent(phone, null, "whitelist_rejected", "الرقم غير موجود في القائمة المسموحة");
      }
      return allowed;
    } catch (error) {
      console.error('[WhatsAppBot] Error checking allowed numbers:', error);
      this.logSecurityEvent(phone, null, "blocked", "خطأ في التحقق من القائمة المسموحة - رفض احترازي");
      return false;
    }
  }

  private async logSecurityEvent(
    phoneNumber: string,
    userId: string | null,
    eventType: string,
    reason: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await db.insert(whatsappSecurityEvents).values({
        phone_number: phoneNumber,
        user_id: userId,
        event_type: eventType,
        reason,
        metadata: metadata || null,
      });

      try {
        const { CentralLogService } = await import('../CentralLogService');
        CentralLogService.getInstance().log({
          level: 'warn',
          source: 'whatsapp',
          module: 'أمان',
          action: eventType,
          status: 'failed',
          actorUserId: userId || undefined,
          message: `حدث أمني واتساب: ${eventType} - ${reason}`,
          details: { phone_number: phoneNumber, event_type: eventType, reason, metadata },
        });
      } catch {}
    } catch (err) {
      console.error('[WhatsAppBot] Failed to log security event:', err);
    }
  }

  private checkUserDailyLimit(phone: string, limit: number): boolean {
    const now = Date.now();
    const entry = this.userMessageCounts.get(phone);
    if (!entry || now > entry.resetAt) {
      this.userMessageCounts.set(phone, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 });
      return true;
    }
    if (entry.count >= limit) return false;
    entry.count++;
    return true;
  }

  private checkUserRateLimit(phone: string, maxPerMinute: number): boolean {
    const now = Date.now();
    const timestamps = this.userMinuteRates.get(phone) || [];
    const recent = timestamps.filter(t => now - t < 60_000);
    if (recent.length >= maxPerMinute) return false;
    recent.push(now);
    this.userMinuteRates.set(phone, recent);
    return true;
  }

  clearAllowedCache(): void {
    this.allowedCacheTime = 0;
    this.allowedNumbersCache.clear();
  }

  private async deletePreviousBotMessages(jid: string): Promise<void> {
    if (!this.sock) {
      console.log(`[WhatsAppBot][Delete] لا يوجد socket، تخطي الحذف`);
      return;
    }
    const prevMessages = this.lastSentMessages.get(jid);
    if (!prevMessages || prevMessages.length === 0) {
      console.log(`[WhatsAppBot][Delete] لا توجد رسائل سابقة مسجلة لـ ${jid}`);
      return;
    }

    console.log(`[WhatsAppBot][Delete] حذف ${prevMessages.length} رسالة سابقة من ${jid}`);
    for (const msg of prevMessages) {
      try {
        console.log(`[WhatsAppBot][Delete] حذف رسالة: ${JSON.stringify(msg.key)}`);
        await this.sock.sendMessage(jid, { delete: msg.key });
        console.log(`[WhatsAppBot][Delete] ✅ تم حذف الرسالة بنجاح`);
      } catch (e: any) {
        console.error(`[WhatsAppBot][Delete] ❌ فشل حذف رسالة في ${jid}:`, e?.message || e);
      }
    }
    this.lastSentMessages.delete(jid);
  }

  private trackSentMessage(jid: string, sentResult: any): void {
    if (!sentResult?.key) {
      console.warn(`[WhatsAppBot][Track] لم يتم تتبع الرسالة - لا يوجد key في النتيجة`);
      return;
    }
    const existing = this.lastSentMessages.get(jid) || [];
    existing.push({ key: sentResult.key, timestamp: Date.now() });
    if (existing.length > 10) {
      existing.splice(0, existing.length - 10);
    }
    this.lastSentMessages.set(jid, existing);
    console.log(`[WhatsAppBot][Track] تم تتبع رسالة لـ ${jid} (المجموع: ${existing.length}), key: ${JSON.stringify(sentResult.key)}`);
  }

  async safeSendMessage(jid: string, content: any): Promise<any> {
    if (!this.sock) return;

    const settings = await botSettingsService.getSettings();
    const minDelay = settings.responseDelayMin;
    const maxDelay = settings.responseDelayMax;
    
    const now = Date.now();
    const timeSinceLastMessage = now - this.lastMessageTime;
    if (timeSinceLastMessage < minDelay) {
      const extraWait = minDelay - timeSinceLastMessage;
      await new Promise(resolve => setTimeout(resolve, extraWait));
    }

    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const scKey = `${jid}:${(content?.text || '').substring(0, 100)}`;
    const scNow = Date.now();
    const scLast = this.sentContentGuard.get(scKey);
    if (scLast && scNow - scLast < 30000) {
      console.log(`[SafeSend] BLOCKED duplicate send to ${jid} (same content within 30s)`);
      return null;
    }
    this.sentContentGuard.set(scKey, scNow);
    if (this.sentContentGuard.size > 200) {
      for (const [k, v] of this.sentContentGuard) {
        if (scNow - v > 60000) this.sentContentGuard.delete(k);
      }
    }

    if (content.text && typeof content.text === 'string') {
      const zeroWidthChars = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
      const numChars = Math.floor(Math.random() * 3) + 1;
      let suffix = '';
      for (let i = 0; i < numChars; i++) {
        suffix += zeroWidthChars[Math.floor(Math.random() * zeroWidthChars.length)];
      }
      content.text = content.text + suffix;
    }

    if (settings.deletePreviousMessages) {
      console.log(`[WhatsAppBot][SafeSend] deletePreviousMessages مفعّل، بدء حذف الرسائل السابقة لـ ${jid}`);
      await this.deletePreviousBotMessages(jid);
    }

    this.lastMessageTime = Date.now();
    
    if (settings.typingIndicator) {
      try {
        await this.sock.sendPresenceUpdate('composing', jid);
        const typingDelay = Math.floor(Math.random() * 1500) + 500;
        await new Promise(resolve => setTimeout(resolve, typingDelay));
        await this.sock.sendPresenceUpdate('paused', jid);
      } catch (e) {}
    }

    const result = await this.sock.sendMessage(jid, content);
    this.trackSentMessage(jid, result);
    return result;
  }
}

let botInstance: WhatsAppBot | null = null;
export function getWhatsAppBot() {
  if (!botInstance) botInstance = new WhatsAppBot();
  return botInstance;
}
