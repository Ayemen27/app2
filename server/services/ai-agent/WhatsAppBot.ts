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

const logger = pino({ level: 'info' });

const DAILY_MESSAGE_LIMIT = 50;
const MIN_DELAY_MS = 2000;
const MAX_DELAY_MS = 5000;
const RECONNECT_BASE_DELAY = 5000;
const MAX_RECONNECT_DELAY = 120000;

export class WhatsAppBot {
  private sock: any;
  private qr: string | null = null;
  private pairingCode: string | null = null;
  private status: "idle" | "connecting" | "open" | "close" = "idle";
  private reconnectAttempts: number = 0;
  private dailyMessageCount: number = 0;
  private lastMessageTime: number = 0;
  private dailyResetTimer: NodeJS.Timeout | null = null;
  private connectedAt: Date | null = null;
  private lastError: string | null = null;

  getStatus() {
    return this.status;
  }

  getQR() {
    return this.qr;
  }

  getPairingCode() {
    return this.pairingCode;
  }

  getProtectionStats() {
    return {
      dailyMessageCount: this.dailyMessageCount,
      dailyLimit: DAILY_MESSAGE_LIMIT,
      reconnectAttempts: this.reconnectAttempts,
      connectedAt: this.connectedAt,
      lastError: this.lastError,
      minDelay: MIN_DELAY_MS,
      maxDelay: MAX_DELAY_MS,
    };
  }

  private resetDailyCounter() {
    if (this.dailyResetTimer) clearInterval(this.dailyResetTimer);
    this.dailyResetTimer = setInterval(() => {
      console.log(`🔄 [AntiBot] إعادة تعيين عداد الرسائل اليومي (كان: ${this.dailyMessageCount})`);
      this.dailyMessageCount = 0;
    }, 24 * 60 * 60 * 1000);
  }

  async disconnect() {
    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (e) {
        try {
          await this.sock.end(undefined);
        } catch (e2) {}
      }
    }
    this.status = "close";
    this.qr = null;
    this.pairingCode = null;
    this.connectedAt = null;
    this.lastError = "تم فصل الاتصال يدوياً";
    console.log('🔌 [WhatsAppBot] Disconnected manually');
  }

  async restart(phoneNumber?: string) {
    if (this.sock) {
      try {
        await this.sock.end(undefined);
      } catch (e) {}
    }
    this.status = "idle";
    this.qr = null;
    this.pairingCode = null;
    this.reconnectAttempts = 0;
    this.lastError = null;
    return this.start(phoneNumber);
  }

  async start(phoneNumber?: string) {
    this.status = "connecting";
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    let version: WAVersion = [2, 3000, 1015901307];
    try {
      const { version: latestVersion, isLatest } = await fetchLatestBaileysVersion();
      version = latestVersion;
      console.log(`📱 [WhatsAppBot] Using WA version v${version.join('.')}, isLatest: ${isLatest}`);
    } catch (err) {
      console.log(`⚠️ [WhatsAppBot] Failed to fetch latest version, using fallback: ${version.join('.')}`);
    }

    try {
      this.sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: !phoneNumber,
        logger,
        browser: ["BinarJoin", "Chrome", "121.0.0.0"],
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        emitOwnEvents: true,
        retryRequestDelayMs: 5000,
        defaultQueryTimeoutMs: 60000,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        markOnlineOnConnect: false,
      });

      if (phoneNumber && !state.creds.registered) {
        setTimeout(async () => {
          try {
            const code = await this.sock.requestPairingCode(phoneNumber);
            this.pairingCode = code;
            console.log(`🔢 [WhatsAppBot] Pairing Code generated: ${code}`);
          } catch (err) {
            console.error('❌ [WhatsAppBot] Error requesting pairing code:', err);
            this.lastError = `فشل في إنشاء كود الربط: ${(err as Error).message}`;
          }
        }, 5000);
      }
    } catch (err) {
      console.error('❌ [WhatsAppBot] Critical error creating socket:', err);
      this.status = "close";
      this.lastError = `خطأ حرج: ${(err as Error).message}`;
      return;
    }

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        this.qr = qr;
        this.status = "connecting";
        console.log('📸 [WhatsAppBot] New QR Code generated');
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        this.status = "close";
        this.qr = null;
        this.pairingCode = null;
        this.connectedAt = null;
        
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        this.lastError = `انقطع الاتصال (كود: ${statusCode})`;
        console.log(`🔌 [WhatsAppBot] Connection closed. Reason: ${statusCode}, Reconnecting: ${shouldReconnect}`);
        
        if (shouldReconnect) {
          this.reconnectAttempts++;
          const delay = Math.min(
            RECONNECT_BASE_DELAY * Math.pow(1.5, this.reconnectAttempts - 1),
            MAX_RECONNECT_DELAY
          );
          const jitter = Math.floor(Math.random() * 2000);
          const totalDelay = delay + jitter;
          
          console.log(`🔄 [WhatsAppBot] Reconnecting in ${(totalDelay / 1000).toFixed(1)}s (attempt #${this.reconnectAttempts})`);
          setTimeout(() => this.start(), totalDelay);
        }
      } else if (connection === 'open') {
        this.status = "open";
        this.qr = null;
        this.pairingCode = null;
        this.reconnectAttempts = 0;
        this.connectedAt = new Date();
        this.lastError = null;
        this.resetDailyCounter();
        console.log('✅ [WhatsAppBot] Connection opened successfully');
        
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

      const from = msg.key.remoteJid;
      if (!from) return;

      const text = msg.message.conversation || 
                   msg.message.extendedTextMessage?.text || 
                   '';

      if (!text) return;

      console.log(`📩 [WhatsAppBot] Message from ${from}: ${text}`);

      if (this.dailyMessageCount >= DAILY_MESSAGE_LIMIT) {
        console.warn(`⚠️ [AntiBot] Daily message limit reached (${DAILY_MESSAGE_LIMIT}). Ignoring message.`);
        return;
      }

      try {
        const whatsappAIService = getWhatsAppAIService();
        const cleanPhone = from.split('@')[0];

        const reply = await whatsappAIService.handleIncomingMessage(cleanPhone, text);

        if (reply) {
          await this.safeSendMessage(from, { text: reply });
          this.dailyMessageCount++;
        }
      } catch (error) {
        console.error('❌ [WhatsAppBot] Error processing message:', error);
      }
    });
  }

  async safeSendMessage(jid: string, content: any) {
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
    
    if (content.text) {
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
    } catch (e) {
      // Presence update failure is non-critical
    }

    return await this.sock.sendMessage(jid, content);
  }
}

let botInstance: WhatsAppBot | null = null;
export function getWhatsAppBot() {
  if (!botInstance) botInstance = new WhatsAppBot();
  return botInstance;
}
