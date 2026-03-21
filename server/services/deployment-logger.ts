import { db } from "../db.js";
import { buildDeployments, deploymentEvents } from "@shared/schema";
import { eq, desc, sql, gte, and } from "drizzle-orm";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  traceId: string;
  step: string;
  message: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface StepTiming {
  step: string;
  startedAt: number;
  endedAt?: number;
  duration?: number;
  status: "running" | "success" | "failed" | "skipped";
}

export interface DORAMetrics {
  deploymentFrequency: number;
  leadTimeSeconds: number;
  mttrSeconds: number;
  changeFailureRate: number;
  periodDays: number;
}

export interface DeploymentSummary {
  deploymentId: string;
  buildNumber?: number;
  pipeline: string;
  environment: string;
  status: "success" | "failed" | "cancelled";
  totalDurationMs: number;
  stepTimings: StepTiming[];
  logCounts: Record<LogLevel, number>;
  startedAt: string;
  completedAt: string;
  triggeredBy?: string;
  version?: string;
  errorMessage?: string;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

export class DeploymentLogger {
  private traceId: string;
  private logs: StructuredLogEntry[] = [];
  private stepTimings: Map<string, StepTiming> = new Map();
  private deploymentStartTime: number;
  private minLevel: LogLevel;
  private currentStep: string = "init";

  constructor(deploymentId: string, options?: { minLevel?: LogLevel }) {
    this.traceId = deploymentId;
    this.deploymentStartTime = Date.now();
    this.minLevel = options?.minLevel || "debug";
  }

  getTraceId(): string {
    return this.traceId;
  }

  setCurrentStep(step: string): void {
    this.currentStep = step;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  private createEntry(level: LogLevel, message: string, step?: string, metadata?: Record<string, unknown>): StructuredLogEntry {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      traceId: this.traceId,
      step: step || this.currentStep,
      message,
    };
    if (metadata && Object.keys(metadata).length > 0) {
      entry.metadata = metadata;
    }
    return entry;
  }

  log(level: LogLevel, message: string, metadata?: Record<string, unknown>): StructuredLogEntry | null {
    if (!this.shouldLog(level)) return null;
    const entry = this.createEntry(level, message, undefined, metadata);
    this.logs.push(entry);
    if (LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY["warn"]) {
      console.error(JSON.stringify(entry));
    } else if (level === "info") {
      console.log(JSON.stringify(entry));
    }
    return entry;
  }

  debug(stepOrMessage: string, messageOrMetadata?: string | Record<string, unknown>, metadata?: Record<string, unknown>): StructuredLogEntry | null {
    return this._logWithOptionalStep("debug", stepOrMessage, messageOrMetadata, metadata);
  }

  info(stepOrMessage: string, messageOrMetadata?: string | Record<string, unknown>, metadata?: Record<string, unknown>): StructuredLogEntry | null {
    return this._logWithOptionalStep("info", stepOrMessage, messageOrMetadata, metadata);
  }

  warn(stepOrMessage: string, messageOrMetadata?: string | Record<string, unknown>, metadata?: Record<string, unknown>): StructuredLogEntry | null {
    return this._logWithOptionalStep("warn", stepOrMessage, messageOrMetadata, metadata);
  }

  error(stepOrMessage: string, messageOrMetadata?: string | Record<string, unknown>, metadata?: Record<string, unknown>): StructuredLogEntry | null {
    return this._logWithOptionalStep("error", stepOrMessage, messageOrMetadata, metadata);
  }

  fatal(stepOrMessage: string, messageOrMetadata?: string | Record<string, unknown>, metadata?: Record<string, unknown>): StructuredLogEntry | null {
    return this._logWithOptionalStep("fatal", stepOrMessage, messageOrMetadata, metadata);
  }

  private _logWithOptionalStep(
    level: LogLevel,
    stepOrMessage: string,
    messageOrMetadata?: string | Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): StructuredLogEntry | null {
    if (typeof messageOrMetadata === "string") {
      this.currentStep = stepOrMessage;
      return this.log(level, messageOrMetadata, metadata);
    }
    return this.log(level, stepOrMessage, messageOrMetadata as Record<string, unknown> | undefined);
  }

  stepStart(step: string, metadata?: Record<string, unknown>): void {
    this.currentStep = step;
    const timing: StepTiming = {
      step,
      startedAt: Date.now(),
      status: "running",
    };
    this.stepTimings.set(step, timing);
    this.info(`Step started: ${step}`, metadata);
  }

  stepEnd(step: string, status: "success" | "failed" | "skipped", metadata?: Record<string, unknown>): number {
    const timing = this.stepTimings.get(step);
    const now = Date.now();
    if (timing) {
      timing.endedAt = now;
      timing.duration = now - timing.startedAt;
      timing.status = status;
    } else {
      this.stepTimings.set(step, {
        step,
        startedAt: now,
        endedAt: now,
        duration: 0,
        status,
      });
    }
    const duration = timing?.duration || 0;
    const level: LogLevel = status === "failed" ? "error" : "info";
    this.log(level, `Step ${status}: ${step} (${duration}ms)`, { ...metadata, durationMs: duration });
    return duration;
  }

  getStepDuration(step: string): number | undefined {
    return this.stepTimings.get(step)?.duration;
  }

  getStepTimings(): StepTiming[] {
    return Array.from(this.stepTimings.values());
  }

  getTotalDuration(): number {
    return Date.now() - this.deploymentStartTime;
  }

  getLogs(): StructuredLogEntry[] {
    return [...this.logs];
  }

  getLogsByLevel(level: LogLevel): StructuredLogEntry[] {
    return this.logs.filter(e => e.level === level);
  }

  getLogCounts(): Record<LogLevel, number> {
    const counts: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 };
    for (const entry of this.logs) {
      counts[entry.level]++;
    }
    return counts;
  }

  generateSummary(status: "success" | "failed" | "cancelled", errorMessage?: string): DeploymentSummary {
    const now = new Date().toISOString();
    return {
      deploymentId: this.traceId,
      pipeline: "",
      environment: "",
      status,
      totalDurationMs: this.getTotalDuration(),
      stepTimings: this.getStepTimings(),
      logCounts: this.getLogCounts(),
      startedAt: new Date(this.deploymentStartTime).toISOString(),
      completedAt: now,
      errorMessage,
    };
  }

  generateSummaryWithContext(
    status: "success" | "failed" | "cancelled",
    context: { pipeline: string; environment: string; buildNumber?: number; triggeredBy?: string; version?: string },
    errorMessage?: string
  ): DeploymentSummary {
    const summary = this.generateSummary(status, errorMessage);
    summary.pipeline = context.pipeline;
    summary.environment = context.environment;
    summary.buildNumber = context.buildNumber;
    summary.triggeredBy = context.triggeredBy;
    summary.version = context.version;
    return summary;
  }

  static async calculateDORAMetrics(periodDays: number = 30): Promise<DORAMetrics> {
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const allDeployments = await db
      .select()
      .from(buildDeployments)
      .where(gte(buildDeployments.created_at, since));

    const total = allDeployments.length;
    const successful = allDeployments.filter(d => d.status === "success");
    const failed = allDeployments.filter(d => d.status === "failed");

    const deploymentFrequency = total / Math.max(periodDays, 1);

    let leadTimeSeconds = 0;
    if (successful.length > 0) {
      const totalLeadTime = successful.reduce((sum, d) => {
        return sum + (d.duration || 0);
      }, 0);
      leadTimeSeconds = (totalLeadTime / successful.length) / 1000;
    }

    let mttrSeconds = 0;
    if (failed.length > 0) {
      const failedWithRecovery: number[] = [];
      for (const f of failed) {
        const recovery = successful.find(
          s => s.created_at > f.created_at && s.pipeline === f.pipeline
        );
        if (recovery && f.endTime) {
          const recoveryTime = new Date(recovery.created_at).getTime() - new Date(f.endTime).getTime();
          if (recoveryTime > 0) {
            failedWithRecovery.push(recoveryTime);
          }
        }
      }
      if (failedWithRecovery.length > 0) {
        mttrSeconds = failedWithRecovery.reduce((a, b) => a + b, 0) / failedWithRecovery.length / 1000;
      }
    }

    const changeFailureRate = total > 0 ? failed.length / total : 0;

    return {
      deploymentFrequency,
      leadTimeSeconds,
      mttrSeconds,
      changeFailureRate,
      periodDays,
    };
  }

  async persistSummary(summary: DeploymentSummary): Promise<void> {
    try {
      await db.insert(deploymentEvents).values({
        deploymentId: summary.deploymentId,
        eventType: "deployment_summary",
        message: `Deployment ${summary.status} in ${(summary.totalDurationMs / 1000).toFixed(1)}s`,
        metadata: {
          summary: {
            status: summary.status,
            totalDurationMs: summary.totalDurationMs,
            stepTimings: summary.stepTimings,
            logCounts: summary.logCounts,
            pipeline: summary.pipeline,
            environment: summary.environment,
            buildNumber: summary.buildNumber,
            version: summary.version,
            triggeredBy: summary.triggeredBy,
            errorMessage: summary.errorMessage,
          },
        },
      });
    } catch (err) {
      console.error("[DeploymentLogger] Failed to persist summary:", err);
    }
  }

  async persistStructuredLogs(): Promise<void> {
    if (this.logs.length === 0) return;
    try {
      await db.insert(deploymentEvents).values({
        deploymentId: this.traceId,
        eventType: "structured_logs",
        message: `${this.logs.length} structured log entries`,
        metadata: { entries: this.logs },
      });
    } catch (err) {
      console.error("[DeploymentLogger] Failed to persist structured logs:", err);
    }
  }
}
