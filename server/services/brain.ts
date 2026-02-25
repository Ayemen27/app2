import { db } from "../db";
import { eq, desc, lte, gte, and, sql } from "drizzle-orm";
import { crashes, metrics, devices, auditLogs } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

export interface Anomaly {
  id: string;
  type: "performance" | "security" | "stability";
  severity: "critical" | "warning" | "info";
  message: string;
  score: number;
  metadata: any;
  timestamp: string;
}

export interface AnalysisResult {
  status: "healthy" | "degraded" | "critical";
  anomalies: Anomaly[];
  score: number;
  timestamp: string;
}

interface BrainRule {
  id: string;
  name: string;
  type: "performance" | "security" | "stability";
  table: "crashes" | "metrics" | "auditLogs";
  condition: {
    threshold?: number;
    criticalThreshold?: number;
    valueThreshold?: number;
    countThreshold?: number;
    criticalCountThreshold?: number;
    timeRangeHours: number;
    metricName?: string;
    metricNames?: string[];
    action?: string;
  };
  message: string;
  scoreMultiplier?: number;
  score?: number;
  defaultSeverity?: "critical" | "warning" | "info";
}

export class BrainService {
  private static instance: BrainService;
  private rules: BrainRule[] = [];

  private constructor() {
    this.loadRules();
  }

  private loadRules() {
    try {
      const configPath = path.resolve(process.cwd(), "server/config/brain_rules.json");
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        this.rules = config.rules;
        console.log(`[BrainService] Loaded ${this.rules.length} rules from config.`);
      } else {
        console.warn("[BrainService] Config file not found, using empty rules.");
      }
    } catch (error) {
      console.error("[BrainService] Failed to load rules:", error);
    }
  }

  public static getInstance(): BrainService {
    if (!BrainService.instance) {
      BrainService.instance = new BrainService();
    }
    return BrainService.instance;
  }

  /**
   * Analyzes recent system events to find correlations or anomalies.
   */
  async analyzeEvents(): Promise<AnalysisResult> {
    console.log("[BrainService] Starting event analysis...");
    const anomalies: Anomaly[] = [];

    try {
      for (const rule of this.rules) {
        const startTime = new Date(Date.now() - (rule.condition.timeRangeHours || 24) * 60 * 60 * 1000);

        if (rule.id === "crash_spike") {
          const recentCrashes = await db.select().from(crashes)
            .where(gte(crashes.timestamp, startTime))
            .orderBy(desc(crashes.timestamp))
            .limit(100);

          if (recentCrashes.length > (rule.condition.threshold || 0)) {
            anomalies.push({
              id: `${rule.id}-${Date.now()}`,
              type: rule.type,
              severity: recentCrashes.length > (rule.condition.criticalThreshold || 50) ? "critical" : "warning",
              message: rule.message.replace("{count}", recentCrashes.length.toString()),
              score: Math.min(recentCrashes.length * (rule.scoreMultiplier || 1), 100),
              metadata: { count: recentCrashes.length },
              timestamp: new Date().toISOString()
            });
          }
        } else if (rule.id === "latency_spike") {
          const highLatencyMetrics = await db.select().from(metrics)
            .where(and(
              gte(metrics.timestamp, startTime),
              eq(metrics.metricName, rule.condition.metricName || "api_latency"),
              gte(metrics.value, (rule.condition.valueThreshold || 1000).toString())
            ))
            .limit(50);

          if (highLatencyMetrics.length > (rule.condition.countThreshold || 0)) {
            anomalies.push({
              id: `${rule.id}-${Date.now()}`,
              type: rule.type,
              severity: highLatencyMetrics.length > (rule.condition.criticalCountThreshold || 20) ? "critical" : "warning",
              message: rule.message.replace("{count}", highLatencyMetrics.length.toString()),
              score: Math.min(highLatencyMetrics.length * (rule.scoreMultiplier || 1), 100),
              metadata: { samples: highLatencyMetrics.length },
              timestamp: new Date().toISOString()
            });
          }
        } else if (rule.id === "brute_force") {
          const failedLogins = await db.select().from(auditLogs)
            .where(and(
              gte(auditLogs.createdAt, startTime),
              eq(auditLogs.action, rule.condition.action || "LOGIN_FAILED")
            ))
            .limit(100);

          if (failedLogins.length > (rule.condition.threshold || 0)) {
            anomalies.push({
              id: `${rule.id}-${Date.now()}`,
              type: rule.type,
              severity: rule.defaultSeverity || "critical",
              message: rule.message.replace("{count}", failedLogins.length.toString()),
              score: Math.min(failedLogins.length * (rule.scoreMultiplier || 1), 100),
              metadata: { count: failedLogins.length },
              timestamp: new Date().toISOString()
            });
          }
        } else if (rule.id === "resource_exhaustion") {
          const metricNames = rule.condition.metricNames || [];
          const resourceIssues = await db.select().from(metrics)
            .where(and(
              gte(metrics.timestamp, startTime),
              sql`${metrics.metricName} IN (${sql.join(metricNames.map(m => sql.raw(`'${m}'`)), sql.raw(','))})`,
              gte(metrics.value, (rule.condition.valueThreshold || 90).toString())
            ))
            .limit(50);

          if (resourceIssues.length > 0) {
            anomalies.push({
              id: `${rule.id}-${Date.now()}`,
              type: rule.type,
              severity: rule.defaultSeverity || "critical",
              message: rule.message,
              score: rule.score || 85,
              metadata: { occurrences: resourceIssues.length },
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      const totalScore = anomalies.reduce((acc, curr) => acc + curr.score, 0);
      const avgScore = anomalies.length > 0 ? totalScore / anomalies.length : 0;

      return {
        status: avgScore > 70 ? "critical" : avgScore > 30 ? "degraded" : "healthy",
        anomalies,
        score: avgScore,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("[BrainService] Analysis failed:", error);
      return {
        status: "healthy",
        anomalies: [],
        score: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Suggests remediation actions based on analysis.
   */
  async suggestActions(analysisResult: AnalysisResult): Promise<string[]> {
    const actions: string[] = [];

    if (analysisResult.status === "healthy" && analysisResult.anomalies.length === 0) {
      return ["No action required"];
    }

    for (const anomaly of analysisResult.anomalies) {
      switch (anomaly.type) {
        case "stability":
          actions.push(`Investigate crash reports with high frequency. Check recent deployments.`);
          if (anomaly.severity === "critical") {
            actions.push("Rollback to the last stable version if a recent deployment occurred.");
          }
          break;
        case "performance":
          actions.push("Check service health logs and database connection pool status.");
          if (anomaly.message.includes("latency")) {
            actions.push("Consider increasing resource allocation or optimizing slow queries.");
          }
          break;
        case "security":
          actions.push("Enable temporary rate limiting and audit suspicious IP addresses.");
          actions.push("Notify administrators of potential security breach.");
          break;
      }
    }

    return [...new Set(actions)]; // Return unique actions
  }
}

export const brainService = BrainService.getInstance();
