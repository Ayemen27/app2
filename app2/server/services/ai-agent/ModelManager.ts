/**
 * Model Manager - إدارة النماذج المتعددة
 * يدعم OpenAI و Google Gemini مع التبديل التلقائي
 */

import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ModelResponse {
  content: string;
  model: string;
  provider: "openai" | "gemini";
  tokensUsed?: number;
}

export interface ModelConfig {
  provider: "openai" | "gemini";
  model: string;
  priority: number;
  isAvailable: boolean;
  lastError?: string;
  lastErrorTime?: Date;
  dailyUsage: number;
  dailyLimit: number;
}

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const OPENAI_MODEL = "gpt-5";
// the newest Gemini model series is "gemini-2.5-flash"
const GEMINI_MODEL = "gemini-2.5-flash";

export class ModelManager {
  private openai: OpenAI | null = null;
  private gemini: GoogleGenAI | null = null;
  private models: ModelConfig[] = [];
  private currentModelIndex: number = 0;

  constructor() {
    this.initializeModels();
  }

  private initializeModels() {
    // تهيئة OpenAI إذا كان المفتاح متوفراً
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.models.push({
        provider: "openai",
        model: OPENAI_MODEL,
        priority: 1,
        isAvailable: true,
        dailyUsage: 0,
        dailyLimit: 1000,
      });
      console.log("✅ [ModelManager] OpenAI initialized");
    }

    // تهيئة Gemini إذا كان المفتاح متوفراً
    if (process.env.GEMINI_API_KEY) {
      this.gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      this.models.push({
        provider: "gemini",
        model: GEMINI_MODEL,
        priority: 2,
        isAvailable: true,
        dailyUsage: 0,
        dailyLimit: 1500,
      });
      console.log("✅ [ModelManager] Gemini initialized");
    }

    // ترتيب النماذج حسب الأولوية
    this.models.sort((a, b) => a.priority - b.priority);

    if (this.models.length === 0) {
      console.warn("⚠️ [ModelManager] No AI models configured! Please set OPENAI_API_KEY or GEMINI_API_KEY");
    } else {
      console.log(`🤖 [ModelManager] ${this.models.length} models available`);
    }
  }

  /**
   * إرسال رسالة وتلقي الرد مع التبديل التلقائي
   */
  async chat(
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<ModelResponse> {
    if (this.models.length === 0) {
      throw new Error("لا يوجد نماذج ذكاء اصطناعي متاحة. يرجى إعداد مفاتيح API.");
    }

    let lastError: Error | null = null;

    // محاولة استخدام النماذج بالترتيب
    for (let i = 0; i < this.models.length; i++) {
      const modelIndex = (this.currentModelIndex + i) % this.models.length;
      const model = this.models[modelIndex];

      if (!model.isAvailable) {
        // التحقق من إمكانية إعادة المحاولة (بعد 5 دقائق)
        if (model.lastErrorTime && Date.now() - model.lastErrorTime.getTime() > 5 * 60 * 1000) {
          model.isAvailable = true;
          model.lastError = undefined;
        } else {
          continue;
        }
      }

      try {
        const response = await this.callModel(model, messages, systemPrompt);
        model.dailyUsage++;
        this.currentModelIndex = modelIndex;
        return response;
      } catch (error: any) {
        console.error(`❌ [ModelManager] ${model.provider} error:`, error.message);
        model.lastError = error.message;
        model.lastErrorTime = new Date();

        // تعطيل النموذج مؤقتاً عند خطأ 429 (تجاوز الحد)
        if (error.status === 429 || error.message?.includes("rate limit")) {
          model.isAvailable = false;
          console.log(`🔄 [ModelManager] Switching from ${model.provider} due to rate limit`);
        }

        lastError = error;
      }
    }

    throw lastError || new Error("فشل في الاتصال بجميع نماذج الذكاء الاصطناعي");
  }

  /**
   * استدعاء نموذج محدد
   */
  private async callModel(
    modelConfig: ModelConfig,
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<ModelResponse> {
    if (modelConfig.provider === "openai") {
      return this.callOpenAI(modelConfig.model, messages, systemPrompt);
    } else if (modelConfig.provider === "gemini") {
      return this.callGemini(modelConfig.model, messages, systemPrompt);
    }
    throw new Error(`Unknown provider: ${modelConfig.provider}`);
  }

  /**
   * استدعاء OpenAI
   */
  private async callOpenAI(
    model: string,
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<ModelResponse> {
    if (!this.openai) {
      throw new Error("OpenAI not initialized");
    }

    const allMessages: OpenAI.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      allMessages.push({ role: "system", content: systemPrompt });
    }

    allMessages.push(
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }))
    );

    // gpt-5 doesn't support temperature parameter
    const response = await this.openai.chat.completions.create({
      model,
      messages: allMessages,
      max_completion_tokens: 8192,
    });

    return {
      content: response.choices[0].message.content || "",
      model,
      provider: "openai",
      tokensUsed: response.usage?.total_tokens,
    };
  }

  /**
   * استدعاء Gemini
   */
  private async callGemini(
    model: string,
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<ModelResponse> {
    if (!this.gemini) {
      throw new Error("Gemini not initialized");
    }

    // تحويل الرسائل إلى نص واحد
    let prompt = "";
    if (systemPrompt) {
      prompt += `System: ${systemPrompt}\n\n`;
    }

    for (const msg of messages) {
      const roleLabel = msg.role === "user" ? "User" : "Assistant";
      prompt += `${roleLabel}: ${msg.content}\n`;
    }

    const response = await this.gemini.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    return {
      content: response.text || "",
      model,
      provider: "gemini",
    };
  }

  /**
   * الحصول على حالة النماذج
   */
  getModelsStatus(): ModelConfig[] {
    return this.models.map((m) => ({ ...m }));
  }

  /**
   * إعادة تعيين إحصائيات الاستخدام اليومي
   */
  resetDailyUsage() {
    for (const model of this.models) {
      model.dailyUsage = 0;
      model.isAvailable = true;
      model.lastError = undefined;
    }
    console.log("🔄 [ModelManager] Daily usage reset");
  }

  /**
   * التحقق من توفر نموذج واحد على الأقل
   */
  hasAvailableModel(): boolean {
    return this.models.some((m) => m.isAvailable);
  }
}

// Singleton instance
let modelManagerInstance: ModelManager | null = null;

export function getModelManager(): ModelManager {
  if (!modelManagerInstance) {
    modelManagerInstance = new ModelManager();
  }
  return modelManagerInstance;
}
