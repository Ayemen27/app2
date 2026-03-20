import type {
  DeploymentNotificationPayload,
  StepItem,
  TimelineEntry,
  NotificationAction,
} from "../types.js";
import {
  PIPELINE_LABELS,
  CRITICAL_STEPS,
  FAILURE_SUGGESTIONS,
  STEP_LABELS,
  formatDuration,
} from "../types.js";
import { db } from "../../../db.js";
import { buildDeployments, deploymentEvents } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

interface DeploymentConfig {
  pipeline: string;
  appType: "web" | "android";
  environment: "production" | "staging";
  branch?: string;
  commitMessage?: string;
  triggeredBy?: string;
  version?: string;
  buildTarget?: "server" | "local";
  originalPipeline?: string;
}

export class DeploymentPayloadBuilder {
  static buildConsoleUrl(deploymentId: string): string {
    const baseUrl =
      process.env.APP_BASE_URL ||
      (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null) ||
      "https://app2.binarjoinanelytic.info";
    return `${baseUrl}/deployment-console?id=${deploymentId}`;
  }

  static async buildStartedPayload(
    deploymentId: string,
    config: DeploymentConfig,
    pipelineSteps: string[],
    commitHash?: string,
    branch?: string
  ): Promise<DeploymentNotificationPayload> {
    const consoleUrl = this.buildConsoleUrl(deploymentId);
    const criticalSteps = CRITICAL_STEPS[config.pipeline] || [];

    let buildNumber = 0;
    try {
      const [dep] = await db.select().from(buildDeployments).where(eq(buildDeployments.id, deploymentId));
      if (dep) buildNumber = dep.buildNumber;
    } catch {}

    const items: StepItem[] = pipelineSteps.map((name) => ({
      name,
      nameAr: STEP_LABELS[name] || name,
      status: "pending" as const,
      critical: criticalSteps.includes(name),
    }));

    const actions: NotificationAction[] = [
      { type: "view_dashboard", label: "متابعة مباشرة", url: consoleUrl },
    ];

    return {
      eventType: "started",
      timestamp: new Date().toISOString(),
      deployment: {
        id: deploymentId,
        buildNumber,
        pipeline: config.pipeline,
        pipelineLabel: PIPELINE_LABELS[config.pipeline] || config.pipeline,
        environment: config.environment,
        consoleUrl,
        triggeredBy: config.triggeredBy,
        version: config.version || "0.0.0",
      },
      source: {
        commitHash,
        branch: branch || config.branch,
        commitMessage: config.commitMessage,
      },
      steps: {
        total: pipelineSteps.length,
        completed: 0,
        failed: 0,
        cancelled: 0,
        critical: criticalSteps,
        items,
      },
      timeline: [
        {
          at: new Date().toISOString(),
          event: "deployment_started",
          title: "بدأ النشر",
        },
      ],
      actions,
    };
  }

  static async buildSuccessPayload(
    deploymentId: string,
    config: DeploymentConfig,
    duration: number
  ): Promise<DeploymentNotificationPayload> {
    const consoleUrl = this.buildConsoleUrl(deploymentId);

    let items: StepItem[] = [];
    let buildNumber = 0;
    let envSnapshot: any = null;
    let artifactUrl: string | null = null;
    let artifactSize: string | null = null;
    let depCommitHash: string | undefined;
    let depBranch: string | undefined;
    let depVersion: string | undefined;

    try {
      const [dep] = await db.select().from(buildDeployments).where(eq(buildDeployments.id, deploymentId));
      if (dep) {
        buildNumber = dep.buildNumber;
        envSnapshot = dep.environmentSnapshot as any;
        artifactUrl = dep.artifactUrl;
        artifactSize = dep.artifactSize;
        depCommitHash = dep.commitHash || undefined;
        depBranch = dep.branch || undefined;
        depVersion = dep.version;
        const dbSteps = (dep.steps as any[]) || [];
        items = dbSteps.map((s: any) => ({
          name: s.name,
          nameAr: STEP_LABELS[s.name] || s.name,
          status: s.status || "pending",
          durationMs: s.duration,
        }));
      }
    } catch {}

    let timeline: TimelineEntry[] = [];
    let allEvents: any[] = [];
    try {
      allEvents = await db.select().from(deploymentEvents)
        .where(eq(deploymentEvents.deploymentId, deploymentId))
        .orderBy(desc(deploymentEvents.timestamp));
      timeline = allEvents.slice(0, 20).map((e: any) => ({
        at: e.timestamp?.toISOString() || new Date().toISOString(),
        event: e.eventType,
        title: e.message,
        details: e.metadata ? JSON.stringify(e.metadata) : undefined,
      }));
    } catch {}

    let checks: DeploymentNotificationPayload["checks"] = undefined;
    try {
      const gateEvent = allEvents.find((e: any) => e.eventType === "prebuild_gate");
      if (gateEvent && gateEvent.metadata) {
        const meta = gateEvent.metadata as any;
        checks = {
          cors: {
            passed: meta.corsFailed === 0,
            passedCount: meta.corsPassed,
            failedCount: meta.corsFailed,
            total: (meta.corsPassed || 0) + (meta.corsFailed || 0),
          },
          csp: { passed: meta.cspValid === true },
          ssl: {
            passed: meta.sslValid === true,
            daysUntilExpiry: meta.sslDaysUntilExpiry,
          },
        };
      }
    } catch {}

    let artifact: DeploymentNotificationPayload["artifact"] = undefined;
    if (envSnapshot || artifactUrl || artifactSize) {
      artifact = {
        url: artifactUrl || undefined,
        size: artifactSize || undefined,
        sha256: envSnapshot?.sha256 || undefined,
        signatureValid: envSnapshot?.signatureValid,
      };
      if (artifactUrl) {
        const parts = artifactUrl.split("/");
        artifact.fileName = parts[parts.length - 1];
      }
    }

    const completed = items.filter((s) => s.status === "success").length;
    const failed = items.filter((s) => s.status === "failed").length;
    const cancelled = items.filter((s) => s.status === "cancelled").length;

    const actions: NotificationAction[] = [
      { type: "view_dashboard", label: "عرض التفاصيل", url: consoleUrl },
    ];

    return {
      eventType: "success",
      timestamp: new Date().toISOString(),
      deployment: {
        id: deploymentId,
        buildNumber,
        pipeline: config.pipeline,
        pipelineLabel: PIPELINE_LABELS[config.pipeline] || config.pipeline,
        environment: config.environment,
        consoleUrl,
        triggeredBy: config.triggeredBy,
        version: depVersion || config.version || "0.0.0",
      },
      source: {
        commitHash: depCommitHash,
        branch: depBranch || config.branch,
        commitMessage: config.commitMessage,
      },
      steps: {
        total: items.length,
        completed,
        failed,
        cancelled,
        critical: CRITICAL_STEPS[config.pipeline] || [],
        items,
      },
      timeline,
      checks,
      artifact,
      duration: {
        totalMs: duration,
        formatted: formatDuration(duration),
      },
      actions,
    };
  }

  static async buildFailedPayload(
    deploymentId: string,
    config: DeploymentConfig,
    duration: number,
    errorMessage: string
  ): Promise<DeploymentNotificationPayload> {
    const consoleUrl = this.buildConsoleUrl(deploymentId);

    let items: StepItem[] = [];
    let buildNumber = 0;
    let depCommitHash: string | undefined;
    let depBranch: string | undefined;
    let depVersion: string | undefined;

    try {
      const [dep] = await db.select().from(buildDeployments).where(eq(buildDeployments.id, deploymentId));
      if (dep) {
        buildNumber = dep.buildNumber;
        depCommitHash = dep.commitHash || undefined;
        depBranch = dep.branch || undefined;
        depVersion = dep.version;
        const dbSteps = (dep.steps as any[]) || [];
        items = dbSteps.map((s: any) => ({
          name: s.name,
          nameAr: STEP_LABELS[s.name] || s.name,
          status: s.status || "pending",
          durationMs: s.duration,
        }));
      }
    } catch {}

    const failedStepItem = items.find((s) => s.status === "failed");
    const failedStep = failedStepItem?.name;
    const criticalSteps = CRITICAL_STEPS[config.pipeline] || [];
    const failedCriticalSteps = items
      .filter((s) => s.status === "failed" && criticalSteps.includes(s.name))
      .map((s) => s.name);

    const suggestions =
      (failedStep && FAILURE_SUGGESTIONS[failedStep]) ||
      ["راجع السجلات للتفاصيل", "حاول إعادة النشر", "تواصل مع فريق الدعم"];

    let timeline: TimelineEntry[] = [];
    try {
      const events = await db.select().from(deploymentEvents)
        .where(eq(deploymentEvents.deploymentId, deploymentId))
        .orderBy(desc(deploymentEvents.timestamp));
      timeline = events.slice(0, 20).map((e: any) => ({
        at: e.timestamp?.toISOString() || new Date().toISOString(),
        event: e.eventType,
        title: e.message,
        details: e.metadata ? JSON.stringify(e.metadata) : undefined,
      }));
    } catch {}

    const completed = items.filter((s) => s.status === "success").length;
    const failed = items.filter((s) => s.status === "failed").length;
    const cancelled = items.filter((s) => s.status === "cancelled").length;

    const actions: NotificationAction[] = [
      { type: "retry", label: "إعادة المحاولة" },
      { type: "rollback", label: "استرجاع" },
    ];

    return {
      eventType: "failed",
      timestamp: new Date().toISOString(),
      deployment: {
        id: deploymentId,
        buildNumber,
        pipeline: config.pipeline,
        pipelineLabel: PIPELINE_LABELS[config.pipeline] || config.pipeline,
        environment: config.environment,
        consoleUrl,
        triggeredBy: config.triggeredBy,
        version: depVersion || config.version || "0.0.0",
      },
      source: {
        commitHash: depCommitHash,
        branch: depBranch || config.branch,
        commitMessage: config.commitMessage,
      },
      steps: {
        total: items.length,
        completed,
        failed,
        cancelled,
        critical: criticalSteps,
        items,
      },
      timeline,
      failure: {
        reason: errorMessage,
        failedStep,
        failedCriticalSteps: failedCriticalSteps.length > 0 ? failedCriticalSteps : undefined,
        suggestions,
      },
      duration: {
        totalMs: duration,
        formatted: formatDuration(duration),
      },
      actions,
    };
  }

  static async buildCancelledPayload(
    deploymentId: string,
    config: DeploymentConfig,
    duration: number
  ): Promise<DeploymentNotificationPayload> {
    const consoleUrl = this.buildConsoleUrl(deploymentId);

    let items: StepItem[] = [];
    let buildNumber = 0;
    let depCommitHash: string | undefined;
    let depBranch: string | undefined;
    let depVersion: string | undefined;

    try {
      const [dep] = await db.select().from(buildDeployments).where(eq(buildDeployments.id, deploymentId));
      if (dep) {
        buildNumber = dep.buildNumber;
        depCommitHash = dep.commitHash || undefined;
        depBranch = dep.branch || undefined;
        depVersion = dep.version;
        const dbSteps = (dep.steps as any[]) || [];
        items = dbSteps.map((s: any) => ({
          name: s.name,
          nameAr: STEP_LABELS[s.name] || s.name,
          status: s.status || "pending",
          durationMs: s.duration,
        }));
      }
    } catch {}

    const completedSteps = items.filter((s) => s.status === "success").map((s) => s.name);
    const pendingSteps = items.filter((s) => s.status === "pending" || s.status === "cancelled").map((s) => s.name);
    const completed = items.filter((s) => s.status === "success").length;
    const failed = items.filter((s) => s.status === "failed").length;
    const cancelled = items.filter((s) => s.status === "cancelled").length;

    return {
      eventType: "cancelled",
      timestamp: new Date().toISOString(),
      deployment: {
        id: deploymentId,
        buildNumber,
        pipeline: config.pipeline,
        pipelineLabel: PIPELINE_LABELS[config.pipeline] || config.pipeline,
        environment: config.environment,
        consoleUrl,
        triggeredBy: config.triggeredBy,
        version: depVersion || config.version || "0.0.0",
      },
      source: {
        commitHash: depCommitHash,
        branch: depBranch || config.branch,
        commitMessage: config.commitMessage,
      },
      steps: {
        total: items.length,
        completed,
        failed,
        cancelled,
        critical: CRITICAL_STEPS[config.pipeline] || [],
        items,
      },
      timeline: [],
      cancellation: {
        reason: "تم الإلغاء بواسطة المستخدم",
        completedSteps,
        pendingSteps,
      },
      duration: {
        totalMs: duration,
        formatted: formatDuration(duration),
      },
    };
  }

  static async buildPrebuildGateFailedPayload(
    deploymentId: string,
    config: DeploymentConfig,
    report: any
  ): Promise<DeploymentNotificationPayload> {
    const consoleUrl = this.buildConsoleUrl(deploymentId);

    let buildNumber = 0;
    let depCommitHash: string | undefined;
    let depBranch: string | undefined;
    let depVersion: string | undefined;

    try {
      const [dep] = await db.select().from(buildDeployments).where(eq(buildDeployments.id, deploymentId));
      if (dep) {
        buildNumber = dep.buildNumber;
        depCommitHash = dep.commitHash || undefined;
        depBranch = dep.branch || undefined;
        depVersion = dep.version;
      }
    } catch {}

    const failedRoutes = report?.routeChecks?.filter((r: any) => !r.passed)?.map((r: any) => ({
      method: r.method || "GET",
      path: r.path || "",
      error: r.error || "unknown",
      group: r.group,
    })) || [];

    const corsIssues = report?.corsChecks?.filter((c: any) => !c.passed)?.map((c: any) => ({
      origin: c.origin || "",
      path: c.path || "",
      error: c.error || "unknown",
    })) || [];

    const suggestions = FAILURE_SUGGESTIONS["prebuild-gate"] || [
      "أصلح مسارات API الحرجة الفاشلة",
      "تحقق من إعدادات CORS للسيرفر",
      "تأكد من صلاحية شهادة SSL",
      "راجع إعدادات CSP headers",
    ];

    return {
      eventType: "prebuild_gate_failed",
      timestamp: new Date().toISOString(),
      deployment: {
        id: deploymentId,
        buildNumber,
        pipeline: config.pipeline,
        pipelineLabel: PIPELINE_LABELS[config.pipeline] || config.pipeline,
        environment: config.environment,
        consoleUrl,
        triggeredBy: config.triggeredBy,
        version: depVersion || config.version || "0.0.0",
      },
      source: {
        commitHash: depCommitHash,
        branch: depBranch || config.branch,
        commitMessage: config.commitMessage,
      },
      steps: {
        total: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        critical: CRITICAL_STEPS[config.pipeline] || [],
        items: [],
      },
      timeline: [],
      prebuildGate: {
        failedRoutes,
        corsIssues,
        sslError: report?.sslCheck?.error || undefined,
        cspError: report?.cspCheck?.error || undefined,
        routesSummary: report?.summary
          ? `${report.summary.passedRoutes}/${report.summary.totalRoutes} passed`
          : undefined,
        corsSummary: report?.summary
          ? `${report.summary.passedCors}/${report.summary.totalCors} passed`
          : undefined,
      },
      failure: {
        reason: "بوابة ما قبل البناء فشلت",
        failedStep: "prebuild-gate",
        suggestions,
      },
    };
  }
}
