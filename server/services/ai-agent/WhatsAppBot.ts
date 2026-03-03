import sdk from '@adiwajshing/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { getWhatsAppAIService } from './WhatsAppAIService';

const { 
  default: makeWASocket,
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} = sdk as any;

const logger = pino({ level: 'info' });

export class WhatsAppBot {
  private sock: any;
  private state: any;
  private saveCreds: any;
  private qr: string | null = null;
  private status: "idle" | "connecting" | "open" | "close" = "idle";

  getStatus() {
    return this.status;
  }

  getQR() {
    return this.qr;
  }

  async restart() {
    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (e) {}
      this.sock.end(undefined);
    }
    this.status = "idle";
    this.qr = null;
    return this.start();
  }

  async start() {
    this.status = "connecting";
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    this.state = state;
    this.saveCreds = saveCreds;

    // Use a newer version if the automatic one is too old
    let { version, isLatest } = await fetchLatestBaileysVersion();
    if (version[0] < 2 || (version[0] === 2 && version[1] < 3000)) {
      console.log('⚠️ [WhatsAppBot] Detected very old WA version, forcing 2.3000.1015901307');
      version = [2, 3000, 1015901307];
    }
    console.log(`📱 [WhatsAppBot] Using WA version v${version.join('.')}, isLatest: ${isLatest}`);

    try {
      this.sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: true,
        logger,
        browser: ["BinarJoin", "Chrome", "121.0.0.0"],
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        emitOwnEvents: true,
        retryRequestDelayMs: 5000,
        defaultQueryTimeoutMs: 60000,
      });
    } catch (err) {
      console.error('❌ [WhatsAppBot] Critical error creating socket:', err);
      this.status = "close";
      return;
    }

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', async (update: any) => {
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
        
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`🔌 [WhatsAppBot] Connection closed. Reason: ${statusCode}, Reconnecting: ${shouldReconnect}`);
        
        if (shouldReconnect) {
          // محاولة إعادة الاتصال بعد 5 ثوانٍ لتجنب حلقة سريعة
          setTimeout(() => {
            console.log('🔄 [WhatsAppBot] Attempting to reconnect...');
            this.start();
          }, 5000);
        }
      } else if (connection === 'open') {
        this.status = "open";
        this.qr = null;
        console.log('✅ [WhatsAppBot] Connection opened successfully');
      }
    });

    this.sock.ev.on('messages.upsert', async (m: any) => {
      const msg = m.messages[0];
      if (!msg.message || msg.key.fromMe) return;

      const from = msg.key.remoteJid;
      const text = msg.message.conversation || 
                   msg.message.extendedTextMessage?.text || 
                   '';

      if (!text) return;

      console.log(`📩 [WhatsAppBot] Message from ${from}: ${text}`);

      try {
        const whatsappAIService = getWhatsAppAIService();
        // تنظيف رقم الهاتف من @s.whatsapp.net للمقارنة
        const cleanPhone = from.split('@')[0];
        const allowedPhone = process.env.ALLOWED_WHATSAPP_PHONE || "00966500000000";

        const reply = await whatsappAIService.handleIncomingMessage(cleanPhone, text, allowedPhone);

        if (reply) {
          await this.sock.sendMessage(from, { text: reply });
        }
      } catch (error) {
        console.error('❌ [WhatsAppBot] Error processing message:', error);
      }
    });
  }
}

let botInstance: WhatsAppBot | null = null;
export function getWhatsAppBot() {
  if (!botInstance) botInstance = new WhatsAppBot();
  return botInstance;
}
