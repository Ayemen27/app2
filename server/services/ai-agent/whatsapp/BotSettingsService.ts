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
        return this.cache;
      }

      const [inserted] = await db.insert(whatsappBotSettings).values({
        ...DEFAULT_SETTINGS,
        updatedBy: null,
      }).returning();

      this.cache = inserted;
      return this.cache;
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
    return this.cache;
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
    return this.cache;
  }

  invalidateCache(): void {
    this.cache = null;
  }
}

export const botSettingsService = BotSettingsService.getInstance();
