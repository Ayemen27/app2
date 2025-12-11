/**
 * Model Manager - إدارة النماذج المتعددة
 * يدعم OpenAI و Google Gemini و Hugging Face مع التبديل التلقائي
 */

import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

const nodeFetch = globalThis.fetch || require("node-fetch");

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ModelResponse {
  content: string;
  model: string;
  provider: "openai" | "gemini" | "huggingface";
  tokensUsed?: number;
}

export interface ModelConfig {
  provider: "openai" | "gemini" | "huggingface";
  model: string;
  priority: number;
  isAvailable: boolean;
  lastError?: string;
  lastErrorTime?: Date;
  dailyUsage: number;
  dailyLimit: number;
  apiEndpoint?: string;
}

const OPENAI_MODEL = "gpt-4o";
const GEMINI_MODEL = "gemini-2.0-flash";

const HUGGINGFACE_MODELS = {
  "jais-chat": {
    endpoint: "https://api-inference.huggingface.co/models/inceptionai/jais-13b-chat",
    name: "Jais 13B Chat",
    supportsArabic: true,
  },
  "llama2-chat": {
    endpoint: "https://api-inference.huggingface.co/models/meta-llama/Llama-2-7b-chat-hf",
    name: "LLaMA 2 7B Chat",
    supportsArabic: false,
  },
  "falcon-7b": {
    endpoint: "https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct",
    name: "Falcon 7B Instruct",
    supportsArabic: false,
  },
  "mistral-7b": {
    endpoint: "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
    name: "Mistral 7B Instruct",
    supportsArabic: false,
  },
  "qwen2": {
    endpoint: "https://api-inference.huggingface.co/models/Qwen/Qwen2-7B-Instruct",
    name: "Qwen2 7B Instruct",
    supportsArabic: true,
  },
};

export type HuggingFaceModelKey = keyof typeof HUGGINGFACE_MODELS;

export function isValidHuggingFaceModel(key: string): key is HuggingFaceModelKey {
  return key in HUGGINGFACE_MODELS;
}

export class ModelManager {
  private openai: OpenAI | null = null;
  private gemini: GoogleGenerativeAI | null = null;
  private huggingfaceApiKey: string | null = null;
  private models: ModelConfig[] = [];
  private currentModelIndex: number = 0;
  private lastResetDate: string = new Date().toISOString().split("T")[0];

  constructor() {
    this.initializeModels();
  }

  private initializeModels() {
    // Initialize Hugging Face (مجاني وبدون حد يومي صارم)
    const hfKey = process.env.HUGGINGFACE_API_KEY;
    if (hfKey) {
      this.huggingfaceApiKey = hfKey;
      const defaultModel = (process.env.HUGGINGFACE_DEFAULT_MODEL || "jais-chat") as HuggingFaceModelKey;
      const modelConfig = HUGGINGFACE_MODELS[defaultModel] || HUGGINGFACE_MODELS["jais-chat"];
      
      this.models.push({
        provider: "huggingface",
        model: defaultModel,
        priority: 1,
        isAvailable: true,
        dailyUsage: 0,
        dailyLimit: 10000,
        apiEndpoint: modelConfig.endpoint,
      });
      console.log(`✅ [ModelManager] Hugging Face initialized with ${modelConfig.name}`);
    }

    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.models.push({
        provider: "openai",
        model: OPENAI_MODEL,
        priority: 2,
        isAvailable: true,
        dailyUsage: 0,
        dailyLimit: 1000,
      });
      console.log("✅ [ModelManager] OpenAI initialized");
    }

    // Initialize Gemini
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (geminiKey) {
      this.gemini = new GoogleGenerativeAI(geminiKey);
      this.models.push({
        provider: "gemini",
        model: GEMINI_MODEL,
        priority: 3,
        isAvailable: true,
        dailyUsage: 0,
        dailyLimit: 1500,
      });
      console.log("✅ [ModelManager] Gemini initialized");
    }

    this.models.sort((a, b) => a.priority - b.priority);

    if (this.models.length === 0) {
      console.warn("⚠️ [ModelManager] No AI models configured! Please set HUGGINGFACE_API_KEY, OPENAI_API_KEY or GEMINI_API_KEY");
    } else {
      console.log(`🤖 [ModelManager] ${this.models.length} models available`);
      console.log(`📊 [ModelManager] Priority order: ${this.models.map(m => `${m.provider}/${m.model}`).join(" → ")}`);
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
    } else if (modelConfig.provider === "huggingface") {
      return this.callHuggingFace(modelConfig, messages, systemPrompt);
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

  private async callHuggingFace(
    modelConfig: ModelConfig,
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<ModelResponse> {
    if (!this.huggingfaceApiKey) {
      throw new Error("Hugging Face API key not initialized");
    }

    const endpoint = modelConfig.apiEndpoint || HUGGINGFACE_MODELS["jais-chat"].endpoint;
    
    let prompt = "";
    if (systemPrompt) {
      prompt += `### System:\n${systemPrompt}\n\n`;
    }
    
    for (const msg of messages) {
      if (msg.role === "user") {
        prompt += `### User:\n${msg.content}\n\n`;
      } else if (msg.role === "assistant") {
        prompt += `### Assistant:\n${msg.content}\n\n`;
      }
    }
    prompt += "### Assistant:\n";

    const response = await nodeFetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.huggingfaceApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 2048,
          temperature: 0.7,
          top_p: 0.95,
          do_sample: true,
          return_full_text: false,
        },
        options: {
          wait_for_model: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      if (response.status === 503) {
        throw new Error(`Model is loading, please wait: ${errorText}`);
      }
      if (response.status === 429) {
        throw new Error(`Rate limit exceeded: ${errorText}`);
      }
      throw new Error(`Hugging Face API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    let content = "";
    if (Array.isArray(data)) {
      content = data[0]?.generated_text || "";
    } else if (data.generated_text) {
      content = data.generated_text;
    } else if (typeof data === "string") {
      content = data;
    }

    content = content.replace(/^### Assistant:\s*/i, "").trim();

    return {
      content: content || "لم أتمكن من توليد رد.",
      model: modelConfig.model,
      provider: "huggingface",
    };
  }

  getModelsStatus(): ModelConfig[] {
    return this.models.map((m) => ({ ...m }));
  }

  getAvailableHuggingFaceModels(): Array<{ key: string; name: string; supportsArabic: boolean }> {
    return Object.entries(HUGGINGFACE_MODELS).map(([key, value]) => ({
      key,
      name: value.name,
      supportsArabic: value.supportsArabic,
    }));
  }

  async switchHuggingFaceModel(modelKey: string): Promise<boolean> {
    if (!isValidHuggingFaceModel(modelKey)) {
      console.error(`❌ [ModelManager] Unknown Hugging Face model: ${modelKey}`);
      return false;
    }
    const modelConfig = HUGGINGFACE_MODELS[modelKey];

    const hfModelIndex = this.models.findIndex(m => m.provider === "huggingface");
    if (hfModelIndex >= 0) {
      this.models[hfModelIndex].model = modelKey;
      this.models[hfModelIndex].apiEndpoint = modelConfig.endpoint;
      this.models[hfModelIndex].isAvailable = true;
      this.models[hfModelIndex].lastError = undefined;
      console.log(`🔄 [ModelManager] Switched to Hugging Face model: ${modelConfig.name}`);
      return true;
    }
    return false;
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
