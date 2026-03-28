export interface ExtractionMethodCount {
  ai: number;
  regex: number;
  hybrid: number;
}

export interface ConfidenceDistribution {
  high: number;
  medium: number;
  low: number;
}

export interface AICallMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
  errors: string[];
}

export interface BatchMetrics {
  batchId: number;
  totalMessages: number;
  candidatesCreated: number;
  excluded: number;
  aiHitCount: number;
  aiFallbackCount: number;
  aiHitRate: number;
  fallbackRate: number;
  extractionMethodCounts: ExtractionMethodCount;
  confidenceDistribution: ConfidenceDistribution;
  confidenceByType: Record<string, ConfidenceDistribution>;
  aiCallMetrics: AICallMetrics;
  timestamp: string;
}

class AIMetricsCollector {
  private aiHitCount = 0;
  private aiFallbackCount = 0;
  private extractionMethods: ExtractionMethodCount = { ai: 0, regex: 0, hybrid: 0 };
  private confidenceScores: Array<{ score: number; type: string }> = [];
  private aiCalls: Array<{ durationMs: number; success: boolean; error?: string }> = [];

  reset() {
    this.aiHitCount = 0;
    this.aiFallbackCount = 0;
    this.extractionMethods = { ai: 0, regex: 0, hybrid: 0 };
    this.confidenceScores = [];
    this.aiCalls = [];
  }

  recordAIHit() {
    this.aiHitCount++;
    this.extractionMethods.ai++;
  }

  recordRegexHit() {
    this.aiFallbackCount++;
    this.extractionMethods.regex++;
  }

  recordHybridHit() {
    this.extractionMethods.hybrid++;
  }

  recordConfidence(score: number, candidateType: string) {
    this.confidenceScores.push({ score, type: candidateType });
  }

  recordAICall(durationMs: number, success: boolean, error?: string) {
    this.aiCalls.push({ durationMs, success, error });
  }

  buildMetrics(batchId: number, totalMessages: number, candidatesCreated: number, excluded: number): BatchMetrics {
    const totalExtracted = this.aiHitCount + this.aiFallbackCount;
    const aiHitRate = totalExtracted > 0 ? this.aiHitCount / totalExtracted : 0;
    const fallbackRate = totalExtracted > 0 ? this.aiFallbackCount / totalExtracted : 0;

    const confidenceDistribution = this.computeConfidenceDistribution(this.confidenceScores.map(c => c.score));

    const byType: Record<string, number[]> = {};
    for (const entry of this.confidenceScores) {
      if (!byType[entry.type]) byType[entry.type] = [];
      byType[entry.type].push(entry.score);
    }
    const confidenceByType: Record<string, ConfidenceDistribution> = {};
    for (const [type, scores] of Object.entries(byType)) {
      confidenceByType[type] = this.computeConfidenceDistribution(scores);
    }

    const successfulCalls = this.aiCalls.filter(c => c.success).length;
    const failedCalls = this.aiCalls.filter(c => !c.success).length;
    const totalLatencyMs = this.aiCalls.reduce((sum, c) => sum + c.durationMs, 0);

    return {
      batchId,
      totalMessages,
      candidatesCreated,
      excluded,
      aiHitCount: this.aiHitCount,
      aiFallbackCount: this.aiFallbackCount,
      aiHitRate: Math.round(aiHitRate * 10000) / 10000,
      fallbackRate: Math.round(fallbackRate * 10000) / 10000,
      extractionMethodCounts: { ...this.extractionMethods },
      confidenceDistribution,
      confidenceByType,
      aiCallMetrics: {
        totalCalls: this.aiCalls.length,
        successfulCalls,
        failedCalls,
        totalLatencyMs,
        avgLatencyMs: this.aiCalls.length > 0 ? Math.round(totalLatencyMs / this.aiCalls.length) : 0,
        errors: this.aiCalls.filter(c => c.error).map(c => c.error!),
      },
      timestamp: new Date().toISOString(),
    };
  }

  private computeConfidenceDistribution(scores: number[]): ConfidenceDistribution {
    let high = 0, medium = 0, low = 0;
    for (const s of scores) {
      if (s >= 0.85) high++;
      else if (s >= 0.60) medium++;
      else low++;
    }
    return { high, medium, low };
  }
}

const metricsStore = new Map<number, BatchMetrics>();

export function createMetricsCollector(): AIMetricsCollector {
  return new AIMetricsCollector();
}

export function storeMetrics(batchId: number, metrics: BatchMetrics) {
  metricsStore.set(batchId, metrics);
}

export function getMetrics(batchId: number): BatchMetrics | null {
  return metricsStore.get(batchId) || null;
}
