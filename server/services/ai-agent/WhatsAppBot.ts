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
  private dedupCleanupTimer: NodeJS.Timeout | null = null;

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

  getProtectionStats(): BotProtectionStats {
    return {
      dailyMessageCount: this.dailyMessageCount,
      dailyLimit: DAILY_MESSAGE_LIMIT,
      reconnectAttempts: this.reconnectAttempts,
      connectedAt: this.connectedAt,
      lastError: this.lastError,
      minDelay: MIN_DELAY_MS,
      maxDelay: MAX_DELAY_MS,
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

  private extractMessageContent(msg: any): { text: string; inputType: 'text' | 'button' | 'list' | 'image'; inputId?: string; imageCaption?: string } {
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

    const text = message?.conversation ||
                 message?.extendedTextMessage?.text ||
                 '';

    return { text, inputType: 'text' };
  }

  async disconnect(): Promise<void> {
    this.cancelReconnect();
    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (e) {
        try {
          await this.sock.end(undefined);
        } catch (e2) {}
      }
    }
    this.sock = null;
    this.status = "close";
    this.qr = null;
    this.pairingCode = null;
    this.connectedAt = null;
    this.needsRelink = false;
    this.lastError = "تم فصل الاتصال يدوياً";
    console.log('[WhatsAppBot] Disconnected manually');
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
    const sent = await this.safeSendMessage(jid, { text: reply.body });
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
        
        if (statusCode === DisconnectReason.restartRequired || 
            statusCode === DisconnectReason.connectionClosed ||
            statusCode === DisconnectReason.connectionReplaced) {
          console.log(`[WhatsAppBot] Server requested restart (code: ${statusCode}). Reconnecting...`);
          this.pairingCode = null;
          this.reconnectTimer = setTimeout(() => this.start(), 3000);
          return;
        }

        if (!isPairingInProgress) {
          this.pairingCode = null;
        }
        this.lastError = `انقطع الاتصال (كود: ${statusCode})`;

        if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
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
        this.connectedAt = new Date();
        this.lastError = null;
        this.needsRelink = false;
        this.pendingPhoneNumber = null;
        this.resetDailyCounter();
        this.startDedupCleanup();
        console.log('[WhatsAppBot] Connection opened successfully');
        
        try {
          const { storage } = await import("../../storage");
          await storage.createAuditLog?.({
            userId: "system",
            action: "whatsapp_connection",
            module: "whatsapp",
            description: "تم ربط حساب واتساب بنجاح",
            status: "success"
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

      const { text, inputType, inputId, imageCaption } = this.extractMessageContent(msg);

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

      if (this.dailyMessageCount >= DAILY_MESSAGE_LIMIT) {
        console.warn(`[AntiBot] Daily message limit reached (${DAILY_MESSAGE_LIMIT}). Ignoring message.`);
        return;
      }

      try {
        const whatsappAIService = getWhatsAppAIService();

        let msgMetadata: Record<string, any> | undefined;
        if (inputType === 'image') {
          msgMetadata = { type: 'image' };
          try {
            const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            if (buffer) {
              const b64 = `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`;
              msgMetadata.imageBase64 = b64;
            }
          } catch (dlErr) {
            console.warn('[WhatsAppBot] Failed to download image:', dlErr);
          }
        }

        const reply = await whatsappAIService.handleIncomingMessage(
          cleanPhone,
          text || inputId || '',
          inputType,
          inputId,
          msgMetadata
        );

        if (reply) {
          if (typeof reply === 'string') {
            await this.safeSendMessage(from, { text: reply });
          } else {
            await this.sendInteractiveReply(from, reply);
          }
          this.dailyMessageCount++;
        }
      } catch (error) {
        console.error('[WhatsAppBot] Error processing message:', error);
      }
    });
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

      this.allowedNumbersCache = new Set(rows.map(r => r.phoneNumber));
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
    } catch (err) {
      console.error('[WhatsAppBot] Failed to log security event:', err);
    }
  }

  clearAllowedCache(): void {
    this.allowedCacheTime = 0;
    this.allowedNumbersCache.clear();
  }

  async safeSendMessage(jid: string, content: any): Promise<any> {
    if (!this.sock) return;
    
    const now = Date.now();
    const timeSinceLastMessage = now - this.lastMessageTime;
    const minGap = MIN_DELAY_MS;
    if (timeSinceLastMessage < minGap) {
      const extraWait = minGap - timeSinceLastMessage;
      await new Promise(resolve => setTimeout(resolve, extraWait));
    }

    const delay = Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    if (content.text && typeof content.text === 'string') {
      const zeroWidthChars = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
      const numChars = Math.floor(Math.random() * 3) + 1;
      let suffix = '';
      for (let i = 0; i < numChars; i++) {
        suffix += zeroWidthChars[Math.floor(Math.random() * zeroWidthChars.length)];
      }
      content.text = content.text + suffix;
    }

    this.lastMessageTime = Date.now();
    
    try {
      await this.sock.sendPresenceUpdate('composing', jid);
      const typingDelay = Math.floor(Math.random() * 1500) + 500;
      await new Promise(resolve => setTimeout(resolve, typingDelay));
      await this.sock.sendPresenceUpdate('paused', jid);
    } catch (e) {}

    return await this.sock.sendMessage(jid, content);
  }
}

let botInstance: WhatsAppBot | null = null;
export function getWhatsAppBot() {
  if (!botInstance) botInstance = new WhatsAppBot();
  return botInstance;
}
