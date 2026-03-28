/**
 * Model Manager - إدارة النماذج المتعددة مع تدوير المفاتيح
 * يدعم OpenAI و Google Gemini و Hugging Face و DeepSeek
 * كل مزود يدعم مفاتيح API متعددة مع التبديل التلقائي عند نفاد الحصة
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
  provider: "openai" | "gemini" | "huggingface" | "deepseek";
  tokensUsed?: number;
}

interface KeyState {
  key: string;
  isAvailable: boolean;
  lastError?: string;
  lastErrorTime?: Date;
  dailyUsage: number;
}

export interface ModelConfig {
  provider: "openai" | "gemini" | "huggingface" | "deepseek";
  model: string;
  priority: number;
  isAvailable: boolean;
  lastError?: string;
  lastErrorTime?: Date;
  dailyUsage: number;
  dailyLimit: number;
  apiEndpoint?: string;
  keys: KeyState[];
  currentKeyIndex: number;
}

const OPENAI_MODEL = "gpt-4o";
const GEMINI_MODEL = "gemini-2.0-flash";
const DEEPSEEK_MODEL = "deepseek-chat";

const HUGGINGFACE_ROUTER_BASE = "https://router.huggingface.co/v1/chat/completions";
const DEEPSEEK_API_BASE = "https://api.deepseek.com/v1/chat/completions";

const HUGGINGFACE_MODELS = {
  "llama3.1-8b": {
    modelId: "meta-llama/Llama-3.1-8B-Instruct",
    name: "Llama 3.1 8B",
    supportsArabic: true,
  },
  "qwen2.5-72b": {
    modelId: "Qwen/Qwen2.5-72B-Instruct",
    name: "Qwen 2.5 72B",
    supportsArabic: true,
  },
  "llama3.2-3b": {
    modelId: "meta-llama/Llama-3.2-3B-Instruct",
    name: "Llama 3.2 3B",
    supportsArabic: true,
  },
  "deepseek-r1": {
    modelId: "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B",
    name: "DeepSeek R1 32B",
    supportsArabic: true,
  },
  "gemma2-9b": {
    modelId: "google/gemma-2-9b-it",
    name: "Gemma 2 9B",
    supportsArabic: true,
  },
};

export type HuggingFaceModelKey = keyof typeof HUGGINGFACE_MODELS;

export function isValidHuggingFaceModel(key: string): key is HuggingFaceModelKey {
  return key in HUGGINGFACE_MODELS;
}

function parseKeys(envVar: string | undefined, singleEnvVar: string | undefined): string[] {
  const keys: string[] = [];
  if (envVar) {
    keys.push(...envVar.split(",").map(k => k.trim()).filter(Boolean));
  }
  if (singleEnvVar && !keys.includes(singleEnvVar.trim())) {
    keys.push(singleEnvVar.trim());
  }
  return keys;
}

function isRateLimitError(error: any): boolean {
  return error.status === 429 || error.status === 402 ||
    error.message?.includes("rate limit") ||
    error.message?.includes("quota") ||
    error.message?.includes("depleted") ||
    error.message?.includes("credits") ||
    error.message?.includes("insufficient");
}

export class ModelManager {
  private openaiClients: Map<string, OpenAI> = new Map();
  private geminiClients: Map<string, GoogleGenerativeAI> = new Map();
  private models: ModelConfig[] = [];
  private currentModelIndex: number = 0;
  private lastResetDate: string = new Date().toISOString().split("T")[0];

  constructor() {
    this.initializeModels();
  }

  private initializeModels() {
    const deepseekKeys = parseKeys(process.env.DEEPSEEK_API_KEYS, process.env.DEEPSEEK_API_KEY);
    if (deepseekKeys.length > 0) {
      this.models.push({
        provider: "deepseek",
        model: DEEPSEEK_MODEL,
        priority: 1,
        isAvailable: true,
        dailyUsage: 0,
        dailyLimit: 5000 * deepseekKeys.length,
        keys: deepseekKeys.map(k => ({ key: k, isAvailable: true, dailyUsage: 0 })),
        currentKeyIndex: 0,
      });
      console.log(`✅ [ModelManager] DeepSeek initialized with ${deepseekKeys.length} API keys`);
    }

    const hfKeys = parseKeys(process.env.HUGGINGFACE_API_KEYS, process.env.HUGGINGFACE_API_KEY);
    if (hfKeys.length > 0) {
      const defaultModel = (process.env.HUGGINGFACE_DEFAULT_MODEL || "llama3.1-8b") as HuggingFaceModelKey;
      const modelConfig = HUGGINGFACE_MODELS[defaultModel] || HUGGINGFACE_MODELS["llama3.1-8b"];
      this.models.push({
        provider: "huggingface",
        model: defaultModel,
        priority: 2,
        isAvailable: true,
        dailyUsage: 0,
        dailyLimit: 10000 * hfKeys.length,
        keys: hfKeys.map(k => ({ key: k, isAvailable: true, dailyUsage: 0 })),
        currentKeyIndex: 0,
      });
      console.log(`✅ [ModelManager] HuggingFace initialized with ${hfKeys.length} API keys (${modelConfig.name})`);
    }

    const geminiKeys = parseKeys(process.env.GEMINI_API_KEYS, process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    if (geminiKeys.length > 0) {
      for (const key of geminiKeys) {
        this.geminiClients.set(key, new GoogleGenerativeAI(key));
      }
      this.models.push({
        provider: "gemini",
        model: GEMINI_MODEL,
        priority: 3,
        isAvailable: true,
        dailyUsage: 0,
        dailyLimit: 1500 * geminiKeys.length,
        keys: geminiKeys.map(k => ({ key: k, isAvailable: true, dailyUsage: 0 })),
        currentKeyIndex: 0,
      });
      console.log(`✅ [ModelManager] Gemini initialized with ${geminiKeys.length} API keys`);
    }

    const openaiKeys = parseKeys(process.env.OPENAI_API_KEYS, process.env.OPENAI_API_KEY);
    if (openaiKeys.length > 0) {
      for (const key of openaiKeys) {
        this.openaiClients.set(key, new OpenAI({ apiKey: key }));
      }
      this.models.push({
        provider: "openai",
        model: OPENAI_MODEL,
        priority: 4,
        isAvailable: true,
        dailyUsage: 0,
        dailyLimit: 1000 * openaiKeys.length,
        keys: openaiKeys.map(k => ({ key: k, isAvailable: true, dailyUsage: 0 })),
        currentKeyIndex: 0,
      });
      console.log(`✅ [ModelManager] OpenAI initialized with ${openaiKeys.length} API keys`);
    }

    this.models.sort((a, b) => a.priority - b.priority);

    if (this.models.length === 0) {
      console.warn("⚠️ [ModelManager] No AI models configured!");
    } else {
      const totalKeys = this.models.reduce((sum, m) => sum + m.keys.length, 0);
      console.log(`🤖 [ModelManager] ${this.models.length} providers, ${totalKeys} total API keys`);
      console.log(`📊 [ModelManager] Priority: ${this.models.map(m => `${m.provider}(${m.keys.length}keys)`).join(" → ")}`);
    }
  }

  private getNextAvailableKey(model: ModelConfig): KeyState | null {
    const startIndex = model.currentKeyIndex;
    for (let i = 0; i < model.keys.length; i++) {
      const idx = (startIndex + i) % model.keys.length;
      const key = model.keys[idx];
      if (!key.isAvailable && key.lastErrorTime && Date.now() - key.lastErrorTime.getTime() > 5 * 60 * 1000) {
        key.isAvailable = true;
        key.lastError = undefined;
      }
      if (key.isAvailable) {
        model.currentKeyIndex = idx;
        return key;
      }
    }
    return null;
  }

  private rotateToNextKey(model: ModelConfig): KeyState | null {
    const failedIndex = model.currentKeyIndex;
    model.keys[failedIndex].isAvailable = false;
    model.keys[failedIndex].lastErrorTime = new Date();

    for (let i = 1; i < model.keys.length; i++) {
      const idx = (failedIndex + i) % model.keys.length;
      const key = model.keys[idx];
      if (!key.isAvailable && key.lastErrorTime && Date.now() - key.lastErrorTime.getTime() > 5 * 60 * 1000) {
        key.isAvailable = true;
        key.lastError = undefined;
      }
      if (key.isAvailable) {
        model.currentKeyIndex = idx;
        console.log(`🔑 [ModelManager] ${model.provider} rotated to key #${idx + 1}/${model.keys.length}`);
        return key;
      }
    }

    model.isAvailable = false;
    console.log(`❌ [ModelManager] ${model.provider} all ${model.keys.length} keys exhausted`);
    return null;
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

  private selectedProvider: string | null = null;

  setSelectedProvider(provider: string | null) {
    this.selectedProvider = provider;
    console.log(`🎯 [ModelManager] Selected provider: ${provider || 'auto'}`);
  }

  getSelectedProvider(): string | null {
    return this.selectedProvider;
  }

  getAllModels(): Array<{ key: string; name: string; provider: string; isAvailable: boolean }> {
    const allModels: Array<{ key: string; name: string; provider: string; isAvailable: boolean }> = [];
    
    for (const model of this.models) {
      if (model.provider === "huggingface") {
        for (const [key, value] of Object.entries(HUGGINGFACE_MODELS)) {
          allModels.push({
            key: `huggingface/${key}`,
            name: `${value.name}${value.supportsArabic ? ' (يدعم العربية)' : ''}`,
            provider: "huggingface",
            isAvailable: model.isAvailable,
          });
        }
      } else if (model.provider === "deepseek") {
        allModels.push({
          key: `deepseek/${DEEPSEEK_MODEL}`,
          name: `DeepSeek Chat (${model.keys.length} keys)`,
          provider: "deepseek",
          isAvailable: model.isAvailable,
        });
      } else {
        const availKeys = model.keys.filter(k => k.isAvailable).length;
        allModels.push({
          key: `${model.provider}/${model.model}`,
          name: model.provider === "openai" 
            ? `OpenAI GPT-4o (${availKeys}/${model.keys.length} keys)` 
            : `Google Gemini 2.0 Flash (${availKeys}/${model.keys.length} keys)`,
          provider: model.provider,
          isAvailable: model.isAvailable,
        });
      }
    }
    
    return allModels;
  }

  async chat(
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<ModelResponse> {
    if (this.models.length === 0) {
      throw new Error("لا يوجد نماذج ذكاء اصطناعي متاحة. يرجى إعداد مفاتيح API.");
    }

    this.checkAndResetDailyUsage();

    if (this.selectedProvider) {
      const [provider, modelName] = this.selectedProvider.split('/');
      
      if (provider === "huggingface" && modelName) {
        const hfModel = this.models.find(m => m.provider === "huggingface");
        if (hfModel && isValidHuggingFaceModel(modelName)) {
          hfModel.model = modelName;
          const result = await this.tryCallWithKeyRotation(hfModel, messages, systemPrompt);
          if (result) return result;
        }
      } else {
        const selectedModel = this.models.find(m => m.provider === provider);
        if (selectedModel) {
          const result = await this.tryCallWithKeyRotation(selectedModel, messages, systemPrompt);
          if (result) return result;
        }
      }
    }

    let lastError: Error | null = null;

    for (let i = 0; i < this.models.length; i++) {
      const modelIndex = (this.currentModelIndex + i) % this.models.length;
      const model = this.models[modelIndex];

      if (!this.checkDailyLimit(model)) {
        model.isAvailable = false;
        continue;
      }

      if (!model.isAvailable) {
        const anyKeyRecovered = model.keys.some(k => 
          !k.isAvailable && k.lastErrorTime && Date.now() - k.lastErrorTime.getTime() > 5 * 60 * 1000
        );
        if (anyKeyRecovered) {
          model.isAvailable = true;
        } else {
          continue;
        }
      }

      try {
        const result = await this.tryCallWithKeyRotation(model, messages, systemPrompt);
        if (result) {
          this.currentModelIndex = modelIndex;
          return result;
        }
      } catch (error: any) {
        lastError = error;
      }
    }

    throw lastError || new Error("فشل في الاتصال بجميع نماذج الذكاء الاصطناعي");
  }

  private async tryCallWithKeyRotation(
    model: ModelConfig,
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<ModelResponse | null> {
    let attempts = 0;
    const maxAttempts = model.keys.length;

    while (attempts < maxAttempts) {
      const keyState = this.getNextAvailableKey(model);
      if (!keyState) {
        model.isAvailable = false;
        return null;
      }

      try {
        const response = await this.callModel(model, keyState.key, messages, systemPrompt);
        model.dailyUsage++;
        keyState.dailyUsage++;
        return response;
      } catch (error: any) {
        console.error(`❌ [ModelManager] ${model.provider} key#${model.currentKeyIndex + 1} error:`, error.message?.substring(0, 100));
        keyState.lastError = error.message;
        
        if (isRateLimitError(error)) {
          keyState.isAvailable = false;
          keyState.lastErrorTime = new Date();
          console.log(`🔄 [ModelManager] ${model.provider} key#${model.currentKeyIndex + 1} rate-limited, trying next key...`);
          const nextKey = this.rotateToNextKey(model);
          if (!nextKey) {
            model.isAvailable = false;
            model.lastError = `All ${model.keys.length} keys exhausted`;
            model.lastErrorTime = new Date();
            throw error;
          }
          attempts++;
          continue;
        }
        
        throw error;
      }
    }
    return null;
  }

  private async callModel(
    modelConfig: ModelConfig,
    apiKey: string,
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<ModelResponse> {
    if (modelConfig.provider === "openai") {
      return this.callOpenAI(modelConfig.model, apiKey, messages, systemPrompt);
    } else if (modelConfig.provider === "gemini") {
      return this.callGemini(modelConfig.model, apiKey, messages, systemPrompt);
    } else if (modelConfig.provider === "huggingface") {
      return this.callHuggingFace(modelConfig, apiKey, messages, systemPrompt);
    } else if (modelConfig.provider === "deepseek") {
      return this.callDeepSeek(modelConfig, apiKey, messages, systemPrompt);
    }
    throw new Error(`Unknown provider: ${modelConfig.provider}`);
  }

  private async callOpenAI(
    model: string,
    apiKey: string,
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<ModelResponse> {
    let client = this.openaiClients.get(apiKey);
    if (!client) {
      client = new OpenAI({ apiKey });
      this.openaiClients.set(apiKey, client);
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

    const response = await client.chat.completions.create({
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
    apiKey: string,
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<ModelResponse> {
    let client = this.geminiClients.get(apiKey);
    if (!client) {
      client = new GoogleGenerativeAI(apiKey);
      this.geminiClients.set(apiKey, client);
    }

    const genModel = client.getGenerativeModel({ 
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
    apiKey: string,
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<ModelResponse> {
    const modelKey = modelConfig.model as HuggingFaceModelKey;
    const hfModel = HUGGINGFACE_MODELS[modelKey] || HUGGINGFACE_MODELS["llama3.1-8b"];
    const modelId = hfModel.modelId;
    
    const chatMessages: Array<{role: string; content: string}> = [];
    
    if (systemPrompt) {
      chatMessages.push({ role: "system", content: systemPrompt });
    }
    
    for (const msg of messages) {
      chatMessages.push({ role: msg.role, content: msg.content });
    }

    const response = await nodeFetch(HUGGINGFACE_ROUTER_BASE, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        messages: chatMessages,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      if (response.status === 503) {
        throw new Error(`Model is loading, please wait: ${errorText}`);
      }
      if (response.status === 429) {
        const err = new Error(`Rate limit exceeded (429): ${errorText}`);
        (err as any).status = 429;
        throw err;
      }
      if (response.status === 402) {
        const err = new Error(`Credits depleted (402): ${errorText}`);
        (err as any).status = 402;
        throw err;
      }
      throw new Error(`Hugging Face API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { total_tokens?: number } };
    
    const content = data.choices?.[0]?.message?.content || "لم أتمكن من توليد رد.";

    return {
      content,
      model: modelConfig.model,
      provider: "huggingface",
      tokensUsed: data.usage?.total_tokens,
    };
  }

  private async callDeepSeek(
    modelConfig: ModelConfig,
    apiKey: string,
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<ModelResponse> {
    const chatMessages: Array<{role: string; content: string}> = [];
    
    if (systemPrompt) {
      chatMessages.push({ role: "system", content: systemPrompt });
    }
    
    for (const msg of messages) {
      chatMessages.push({ role: msg.role, content: msg.content });
    }

    const response = await nodeFetch(DEEPSEEK_API_BASE, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: chatMessages,
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) {
        const err = new Error(`DeepSeek rate limit (429): ${errorText}`);
        (err as any).status = 429;
        throw err;
      }
      if (response.status === 402) {
        const err = new Error(`DeepSeek credits depleted (402): ${errorText}`);
        (err as any).status = 402;
        throw err;
      }
      throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { total_tokens?: number } };
    
    const content = data.choices?.[0]?.message?.content || "لم أتمكن من توليد رد.";

    return {
      content,
      model: DEEPSEEK_MODEL,
      provider: "deepseek",
      tokensUsed: data.usage?.total_tokens,
    };
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
      for (const key of model.keys) {
        key.dailyUsage = 0;
        key.isAvailable = true;
        key.lastError = undefined;
      }
    }
    console.log("🔄 [ModelManager] Daily usage reset for all keys");
  }

  hasAvailableModel(): boolean {
    this.checkAndResetDailyUsage();
    return this.models.some((m) => m.isAvailable && this.checkDailyLimit(m));
  }

  getModelsStatus(): Array<{
    provider: string;
    model: string;
    isAvailable: boolean;
    lastError?: string;
    dailyUsage: number;
    dailyLimit: number;
    totalKeys: number;
    availableKeys: number;
  }> {
    return this.models.map(m => ({
      provider: m.provider,
      model: m.model,
      isAvailable: m.isAvailable,
      lastError: m.lastError,
      dailyUsage: m.dailyUsage,
      dailyLimit: m.dailyLimit,
      totalKeys: m.keys.length,
      availableKeys: m.keys.filter(k => k.isAvailable).length,
    }));
  }
}

let modelManagerInstance: ModelManager | null = null;

export function getModelManager(): ModelManager {
  if (!modelManagerInstance) {
    modelManagerInstance = new ModelManager();
  }
  return modelManagerInstance;
}
