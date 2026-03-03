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

export class WhatsAppBot {
  private sock: any;
  private qr: string | null = null;
  private pairingCode: string | null = null;
  private status: "idle" | "connecting" | "open" | "close" = "idle";

  getStatus() {
    return this.status;
  }

  getQR() {
    return this.qr;
  }

  getPairingCode() {
    return this.pairingCode;
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
      });

      if (phoneNumber && !state.creds.registered) {
        setTimeout(async () => {
          try {
            const code = await this.sock.requestPairingCode(phoneNumber);
            this.pairingCode = code;
            console.log(`🔢 [WhatsAppBot] Pairing Code generated: ${code}`);
          } catch (err) {
            console.error('❌ [WhatsAppBot] Error requesting pairing code:', err);
          }
        }, 5000);
      }
    } catch (err) {
      console.error('❌ [WhatsAppBot] Critical error creating socket:', err);
      this.status = "close";
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
        
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`🔌 [WhatsAppBot] Connection closed. Reason: ${statusCode}, Reconnecting: ${shouldReconnect}`);
        
        if (shouldReconnect) {
          setTimeout(() => {
            console.log('🔄 [WhatsAppBot] Attempting to reconnect...');
            this.start();
          }, 5000);
        }
      } else if (connection === 'open') {
        this.status = "open";
        this.qr = null;
        this.pairingCode = null;
        console.log('✅ [WhatsAppBot] Connection opened successfully');
        
        // تسجيل عملية الربط في سجل المزامنة
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

      try {
        const whatsappAIService = getWhatsAppAIService();
        const cleanPhone = from.split('@')[0];
        const allowedPhone = process.env.ALLOWED_WHATSAPP_PHONE || "00966500000000";

        const reply = await whatsappAIService.handleIncomingMessage(cleanPhone, text, allowedPhone);

        if (reply) {
          await this.safeSendMessage(from, { text: reply });
        }
      } catch (error) {
        console.error('❌ [WhatsAppBot] Error processing message:', error);
      }
    });
  }

  // دالة إرسال آمنة مع تأخير عشوائي لمحاكاة السلوك البشري
  async safeSendMessage(jid: string, content: any) {
    if (!this.sock) return;
    
    // تأخير عشوائي بين 2 إلى 5 ثوانٍ
    const delay = Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // إضافة حرف غير مرئي في نهاية النص لتنويع المحتوى (Anti-Detection)
    if (content.text) {
      const zeroWidthChars = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
      const randomChar = zeroWidthChars[Math.floor(Math.random() * zeroWidthChars.length)];
      content.text = content.text + randomChar;
    }

    return await this.sock.sendMessage(jid, content);
  }
}

let botInstance: WhatsAppBot | null = null;
export function getWhatsAppBot() {
  if (!botInstance) botInstance = new WhatsAppBot();
  return botInstance;
}
