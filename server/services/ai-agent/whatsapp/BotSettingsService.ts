import { db } from "../../../db";
import { whatsappBotSettings, WhatsappBotSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

const DEFAULT_SETTINGS: Omit<WhatsappBotSettings, "id" | "updatedAt" | "updatedBy"> = {
  botName: "مساعد إدارة المشاريع",
  botDescription: "بوت ذكي لإدارة المشاريع والمصروفات",
  language: "ar",
  timezone: "Asia/Riyadh",
  deletePreviousMessages: false,
  boldHeadings: true,
  useEmoji: true,
  welcomeMessage: "",
  unavailableMessage: "عذراً، الخدمة غير متاحة حالياً. حاول لاحقاً.",
  footerText: "*0* القائمة | *#* رجوع",
  menuMainTitle: "القائمة الرئيسية",
  menuExpensesTitle: "المصروفات",
  menuProjectsTitle: "المشاريع",
  menuReportsTitle: "التقارير",
  menuExportTitle: "تصدير الكشوفات",
  menuHelpTitle: "المساعدة",
  menuExpensesEmoji: "💰",
  menuProjectsEmoji: "🏗️",
  menuReportsEmoji: "📊",
  menuExportEmoji: "📤",
  menuHelpEmoji: "❓",
  botEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: "🔧 البوت في وضع الصيانة حالياً. سنعود قريباً.",
  businessHoursEnabled: false,
  businessHoursStart: "08:00",
  businessHoursEnd: "17:00",
  businessDays: "0,1,2,3,4",
  outsideHoursMessage: "⏰ عذراً، ساعات العمل من {start} إلى {end}. سنرد عليك في أقرب وقت.",
  smartGreeting: true,
  goodbyeMessage: "",
  waitingMessage: "⏳ جاري معالجة طلبك...",
  typingIndicator: true,
  sessionTimeoutMinutes: 30,
  maxMessageLength: 4000,
  perUserDailyLimit: 100,
  rateLimitPerMinute: 10,
  maxRetries: 3,
  adminNotifyPhone: "",
  mediaEnabled: true,
  protectionLevel: "balanced",
  responseDelayMin: 2000,
  responseDelayMax: 5000,
  dailyMessageLimit: 50,
  notifyNewMessage: false,
  notifyOnError: true,
  notifyOnDisconnect: true,
  debugMode: false,
  messageLogging: true,
  autoReconnect: true,
};

class BotSettingsService {
  private static instance: BotSettingsService;
  private cache: WhatsappBotSettings | null = null;

  private constructor() {}

  static getInstance(): BotSettingsService {
    if (!BotSettingsService.instance) {
      BotSettingsService.instance = new BotSettingsService();
    }
    return BotSettingsService.instance;
  }

  async getSettings(): Promise<WhatsappBotSettings> {
    if (this.cache) {
      return this.cache;
    }

    try {
      const rows = await db.select().from(whatsappBotSettings).where(eq(whatsappBotSettings.id, 1)).limit(1);

      if (rows.length > 0) {
        this.cache = rows[0];
        return this.cache!;
      }

      const [inserted] = await db.insert(whatsappBotSettings).values({
        ...DEFAULT_SETTINGS,
        updatedBy: null,
      }).returning();

      this.cache = inserted;
      return this.cache!;
    } catch (error: any) {
      console.error("[BotSettingsService] Error getting settings:", error?.message);
      return {
        id: 1,
        ...DEFAULT_SETTINGS,
        updatedAt: new Date(),
        updatedBy: null,
      } as WhatsappBotSettings;
    }
  }

  async updateSettings(partial: Partial<Omit<WhatsappBotSettings, "id" | "updatedAt">>, userId: string): Promise<WhatsappBotSettings> {
    await this.getSettings();

    const updateData = {
      ...partial,
      updatedAt: new Date(),
      updatedBy: userId,
    };

    const [updated] = await db.update(whatsappBotSettings)
      .set(updateData)
      .where(eq(whatsappBotSettings.id, 1))
      .returning();

    this.cache = updated;
    return this.cache!;
  }

  async resetSettings(userId: string): Promise<WhatsappBotSettings> {
    const resetData = {
      ...DEFAULT_SETTINGS,
      updatedAt: new Date(),
      updatedBy: userId,
    };

    const [updated] = await db.update(whatsappBotSettings)
      .set(resetData)
      .where(eq(whatsappBotSettings.id, 1))
      .returning();

    this.cache = updated;
    return this.cache!;
  }

  isWithinBusinessHours(settings: WhatsappBotSettings): boolean {
    if (!settings.businessHoursEnabled) return true;

    const tz = settings.timezone || "Asia/Riyadh";
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const dayFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
    });

    const timeParts = formatter.formatToParts(now);
    const hour = parseInt(timeParts.find((p: Intl.DateTimeFormatPart) => p.type === "hour")?.value || "0");
    const minute = parseInt(timeParts.find((p: Intl.DateTimeFormatPart) => p.type === "minute")?.value || "0");
    const currentMinutes = hour * 60 + minute;

    const dayStr = dayFormatter.format(now);
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const currentDay = dayMap[dayStr] ?? 0;

    const allowedDays = settings.businessDays.split(",").map((d: string) => parseInt(d.trim()));
    if (!allowedDays.includes(currentDay)) return false;

    const [startH, startM] = settings.businessHoursStart.split(":").map((v: string) => Number(v));
    const [endH, endM] = settings.businessHoursEnd.split(":").map((v: string) => Number(v));
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  getSmartGreeting(settings: WhatsappBotSettings): string {
    if (!settings.smartGreeting) return "";

    const tz = settings.timezone || "Asia/Riyadh";
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      hour12: false,
    });
    const hour = parseInt(formatter.format(now));

    if (hour >= 5 && hour < 12) return "صباح الخير ☀️";
    if (hour >= 12 && hour < 17) return "مساء الخير 🌤️";
    if (hour >= 17 && hour < 21) return "مساء النور 🌆";
    return "مساء الخير 🌙";
  }

  getOutsideHoursMessage(settings: WhatsappBotSettings): string {
    return (settings.outsideHoursMessage || "")
      .replace("{start}", settings.businessHoursStart)
      .replace("{end}", settings.businessHoursEnd);
  }

  invalidateCache(): void {
    this.cache = null;
  }
}

export const botSettingsService = BotSettingsService.getInstance();
