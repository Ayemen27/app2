/**
 * Model Manager - إدارة النماذج المتعددة
 * يدعم OpenAI و Google Gemini مع التبديل التلقائي
 */

import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

const OPENAI_MODEL = "gpt-4o";
const GEMINI_MODEL = "gemini-1.5-flash";

export class ModelManager {
  private openai: OpenAI | null = null;
  private gemini: GoogleGenerativeAI | null = null;
  private models: ModelConfig[] = [];
  private currentModelIndex: number = 0;
  private lastResetDate: string = new Date().toISOString().split("T")[0];

  constructor() {
    this.initializeModels();
  }

  private initializeModels() {
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

    if (process.env.GEMINI_API_KEY) {
      this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
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

    this.models.sort((a, b) => a.priority - b.priority);

    if (this.models.length === 0) {
      console.warn("⚠️ [ModelManager] No AI models configured! Please set OPENAI_API_KEY or GEMINI_API_KEY");
    } else {
      console.log(`🤖 [ModelManager] ${this.models.length} models available`);
    }
  }

  private checkAndResetDailyUsage() {
    const today = new Date().toISOString().split("T")[0];
    if (today !== this.lastResetDate) {
      this.resetDailyUsage();
      this.lastResetDate = today;
    }
  }

  private checkDailyLimit(model: ModelConfig): boolean {
    if (model.dailyUsage >= model.dailyLimit) {
      console.log(`⚠️ [ModelManager] ${model.provider} daily limit reached (${model.dailyUsage}/${model.dailyLimit})`);
      return false;
    }
    return true;
  }

  async chat(
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<ModelResponse> {
    if (this.models.length === 0) {
      throw new Error("لا يوجد نماذج ذكاء اصطناعي متاحة. يرجى إعداد مفاتيح API.");
    }

    this.checkAndResetDailyUsage();

    let lastError: Error | null = null;

    for (let i = 0; i < this.models.length; i++) {
      const modelIndex = (this.currentModelIndex + i) % this.models.length;
      const model = this.models[modelIndex];

      if (!this.checkDailyLimit(model)) {
        model.isAvailable = false;
        continue;
      }

      if (!model.isAvailable) {
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

        if (error.status === 429 || error.message?.includes("rate limit") || error.message?.includes("quota")) {
          model.isAvailable = false;
          console.log(`🔄 [ModelManager] Switching from ${model.provider} due to rate limit/quota`);
        }

        lastError = error;
      }
    }

    throw lastError || new Error("فشل في الاتصال بجميع نماذج الذكاء الاصطناعي");
  }

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

    const response = await this.openai.chat.completions.create({
      model,
      messages: allMessages,
      max_tokens: 4096,
    });

    return {
      content: response.choices[0].message.content || "",
      model,
      provider: "openai",
      tokensUsed: response.usage?.total_tokens,
    };
  }

  private async callGemini(
    model: string,
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<ModelResponse> {
    if (!this.gemini) {
      throw new Error("Gemini not initialized");
    }

    const genModel = this.gemini.getGenerativeModel({ 
      model,
      systemInstruction: systemPrompt 
    });

    const history = messages.slice(0, -1).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user" as const,
      parts: [{ text: msg.content }],
    }));

    const chat = genModel.startChat({ history });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;

    return {
      content: response.text() || "",
      model,
      provider: "gemini",
    };
  }

  getModelsStatus(): ModelConfig[] {
    return this.models.map((m) => ({ ...m }));
  }

  resetDailyUsage() {
    for (const model of this.models) {
      model.dailyUsage = 0;
      model.isAvailable = true;
      model.lastError = undefined;
    }
    console.log("🔄 [ModelManager] Daily usage reset");
  }

  hasAvailableModel(): boolean {
    this.checkAndResetDailyUsage();
    return this.models.some((m) => m.isAvailable && this.checkDailyLimit(m));
  }
}

let modelManagerInstance: ModelManager | null = null;

export function getModelManager(): ModelManager {
  if (!modelManagerInstance) {
    modelManagerInstance = new ModelManager();
  }
  return modelManagerInstance;
}
