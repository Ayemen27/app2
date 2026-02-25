import { db } from "../db";
import { eq, desc, lte, gte, and, sql } from "drizzle-orm";
import { crashes, metrics, devices, auditLogs } from "@shared/schema";

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

export class BrainService {
  private static instance: BrainService;

  private constructor() {}

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
    
    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    const anomalies: Anomaly[] = [];

    try {
      // 1. Fetch recent crashes
      const recentCrashes = await db.select().from(crashes)
        .where(gte(crashes.timestamp, startTime))
        .orderBy(desc(crashes.timestamp))
        .limit(100);

      // Rule: Sudden spike in crashes
      if (recentCrashes.length > 10) {
        anomalies.push({
          id: `crash-spike-${Date.now()}`,
          type: "stability",
          severity: recentCrashes.length > 50 ? "critical" : "warning",
          message: `Detected ${recentCrashes.length} crashes in the last 24 hours.`,
          score: Math.min(recentCrashes.length * 2, 100),
          metadata: { count: recentCrashes.length },
          timestamp: new Date().toISOString()
        });
      }

      // 2. Fetch high-latency metrics
      const highLatencyMetrics = await db.select().from(metrics)
        .where(and(
          gte(metrics.timestamp, startTime),
          eq(metrics.metricName, "api_latency"),
          gte(metrics.value, "1000") // latency > 1000ms
        ))
        .limit(50);

      if (highLatencyMetrics.length > 5) {
        anomalies.push({
          id: `latency-spike-${Date.now()}`,
          type: "performance",
          severity: highLatencyMetrics.length > 20 ? "critical" : "warning",
          message: `High API latency detected in ${highLatencyMetrics.length} samples.`,
          score: Math.min(highLatencyMetrics.length * 5, 100),
          metadata: { samples: highLatencyMetrics.length },
          timestamp: new Date().toISOString()
        });
      }

      // 3. Security: Failed login spikes in audit logs
      const failedLogins = await db.select().from(auditLogs)
        .where(and(
          gte(auditLogs.createdAt, startTime),
          eq(auditLogs.action, "LOGIN_FAILED")
        ))
        .limit(100);

      if (failedLogins.length > 20) {
        anomalies.push({
          id: `brute-force-attempt-${Date.now()}`,
          type: "security",
          severity: "critical",
          message: `Detected ${failedLogins.length} failed login attempts. Potential brute force attack.`,
          score: Math.min(failedLogins.length * 4, 100),
          metadata: { count: failedLogins.length },
          timestamp: new Date().toISOString()
        });
      }

      // 4. Resource Exhaustion: High memory/CPU metrics
      const resourceIssues = await db.select().from(metrics)
        .where(and(
          gte(metrics.timestamp, startTime),
          sql`${metrics.metricName} IN ('memory_usage', 'cpu_usage')`,
          gte(metrics.value, "90") // > 90%
        ))
        .limit(50);

      if (resourceIssues.length > 0) {
        anomalies.push({
          id: `resource-exhaustion-${Date.now()}`,
          type: "performance",
          severity: "critical",
          message: `System resource usage (CPU/Memory) exceeded 90% threshold multiple times.`,
          score: 85,
          metadata: { occurrences: resourceIssues.length },
          timestamp: new Date().toISOString()
        });
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
