import { TelegramService } from "../../TelegramService";
import {
  NotificationProvider,
  DeploymentNotificationPayload,
  PIPELINE_LABELS,
  STEP_LABELS,
  escapeHtml,
  formatDuration,
} from "../types";

export class TelegramDeploymentProvider implements NotificationProvider {
  readonly channel = "telegram";

  isEnabled(): boolean {
    return TelegramService.isEnabled();
  }

  async send(payload: DeploymentNotificationPayload): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    if (!this.isEnabled()) {
      return { ok: false, error: "Telegram service is not enabled" };
    }

    let text: string;
    switch (payload.eventType) {
      case "started":
        text = this.formatStarted(payload);
        break;
      case "success":
        text = this.formatSuccess(payload);
        break;
      case "failed":
        text = this.formatFailed(payload);
        break;
      case "cancelled":
        text = this.formatCancelled(payload);
        break;
      case "prebuild_gate_failed":
        text = this.formatPrebuildGateFailed(payload);
        break;
      default:
        return { ok: false, error: `Unknown event type: ${payload.eventType}` };
    }

    try {
      const result = await TelegramService.sendMessage({ text, parseMode: "HTML" });
      return { ok: result };
    } catch (error: any) {
      return { ok: false, error: error?.message || "Unknown Telegram error" };
    }
  }

  private formatStarted(payload: DeploymentNotificationPayload): string {
    const d = payload.deployment;
    const s = payload.source;
    const pipelineLabel = escapeHtml(PIPELINE_LABELS[d.pipeline] || d.pipelineLabel || d.pipeline);
    const version = escapeHtml(d.version);
    const pipeline = escapeHtml(d.pipeline);
    const environment = escapeHtml(d.environment);
    const triggeredBy = escapeHtml(d.triggeredBy || "غير محدد");
    const timestamp = new Date(payload.timestamp).toLocaleString("en-GB", { timeZone: "Asia/Riyadh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    const shortId = escapeHtml(d.id.substring(0, 8));
    const commitHash = s?.commitHash ? escapeHtml(s.commitHash.substring(0, 7)) : "—";
    const branch = s?.branch ? escapeHtml(s.branch) : "—";
    const total = payload.steps?.total ?? 0;
    const criticalSteps = (payload.steps?.critical || [])
      .map((step) => STEP_LABELS[step] || step)
      .map(escapeHtml)
      .join("، ");

    const lines = [
      `🚀 <b>نشر بدأ — ${pipelineLabel} v${version}</b>`,
      ``,
      `📦 المسار: ${pipeline}`,
      `🌍 البيئة: ${environment}`,
      `👤 بواسطة: ${triggeredBy}`,
      `🕒 وقت البدء: ${timestamp}`,
      `🆔 معرف: <code>${shortId}</code>`,
      ``,
      `🔍 معلومات أولية:`,
      `├ 🔗 Commit: <code>${commitHash}</code>`,
      `├ 🌿 Branch: ${branch}`,
      `├ 📋 الخطوات: ${total} خطوة`,
      `└ ⚡ حرجة: ${criticalSteps || "—"}`,
      ``,
      `🔗 <a href="${escapeHtml(d.consoleUrl)}">متابعة مباشرة ←</a>`,
      `🌐 ${escapeHtml(d.consoleUrl)}`,
    ];

    return lines.join("\n");
  }

  private formatSuccess(payload: DeploymentNotificationPayload): string {
    const d = payload.deployment;
    const pipelineLabel = escapeHtml(PIPELINE_LABELS[d.pipeline] || d.pipelineLabel || d.pipeline);
    const version = escapeHtml(d.version);
    const pipeline = escapeHtml(d.pipeline);
    const environment = escapeHtml(d.environment);
    const triggeredBy = escapeHtml(d.triggeredBy || "غير محدد");
    const duration = payload.duration?.totalMs ? formatDuration(payload.duration.totalMs) : payload.duration?.formatted || "—";
    const shortId = escapeHtml(d.id.substring(0, 8));

    const lines: string[] = [
      `✅ <b>نشر ناجح — ${pipelineLabel} v${version}</b>`,
      ``,
      `📦 ${pipeline} | 🌍 ${environment}`,
      `👤 ${triggeredBy} | ⏱️ ${duration}`,
      `🆔 <code>${shortId}</code>`,
      ``,
      `📊 <b>الخطوات (${payload.steps?.completed ?? 0}/${payload.steps?.total ?? 0}):</b>`,
    ];

    if (payload.steps?.items?.length) {
      for (const step of payload.steps.items) {
        const icon = step.status === "success" ? "✅" : step.status === "failed" ? "❌" : "⏭";
        const label = escapeHtml(STEP_LABELS[step.name] || step.nameAr || step.name);
        const dur = step.durationMs ? ` (${formatDuration(step.durationMs)})` : "";
        lines.push(`${icon} ${label}${dur}`);
      }
    }

    if (payload.checks) {
      lines.push(``);
      lines.push(`🔒 <b>فحوصات الأمان:</b>`);
      const cors = payload.checks.cors;
      const csp = payload.checks.csp;
      const ssl = payload.checks.ssl;
      const corsIcon = cors?.passed ? "✅" : "❌";
      const corsDetail = cors ? ` (${cors.passedCount ?? 0}/${cors.total ?? 0})` : "";
      lines.push(`├ CORS: ${corsIcon}${corsDetail}`);
      const cspIcon = csp?.passed ? "✅" : "❌";
      lines.push(`├ CSP: ${cspIcon}`);
      const sslIcon = ssl?.passed ? "✅" : "❌";
      const sslDetail = ssl?.daysUntilExpiry != null ? ` (${ssl.daysUntilExpiry} يوم)` : "";
      lines.push(`└ SSL: ${sslIcon}${sslDetail}`);
    }

    if (payload.artifact) {
      const a = payload.artifact;
      lines.push(``);
      lines.push(`📦 <b>Artifact:</b>`);
      lines.push(`├ 📁 ${escapeHtml(a.fileName || "—")} (${escapeHtml(a.size || "—")})`);
      const sha = a.sha256 ? escapeHtml(a.sha256.substring(0, 16)) : "—";
      lines.push(`├ 🔑 SHA-256: <code>${sha}</code>`);
      const sigIcon = a.signatureValid ? "✅" : "❌";
      lines.push(`└ ✍️ التوقيع: ${sigIcon}`);
    }

    if (payload.timeline?.length) {
      lines.push(``);
      lines.push(`⏳ <b>الجدول الزمني:</b>`);
      for (const entry of payload.timeline) {
        const time = new Date(entry.at).toLocaleTimeString("en-GB", { timeZone: "Asia/Riyadh", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
        lines.push(`🕐 ${time} — ${escapeHtml(entry.title)}`);
      }
    }

    lines.push(``);
    lines.push(`🌐 ${escapeHtml(d.consoleUrl)}`);

    return lines.join("\n");
  }

  private formatFailed(payload: DeploymentNotificationPayload): string {
    const d = payload.deployment;
    const s = payload.source;
    const pipelineLabel = escapeHtml(PIPELINE_LABELS[d.pipeline] || d.pipelineLabel || d.pipeline);
    const version = escapeHtml(d.version);
    const pipeline = escapeHtml(d.pipeline);
    const environment = escapeHtml(d.environment);
    const triggeredBy = escapeHtml(d.triggeredBy || "غير محدد");
    const duration = payload.duration?.totalMs ? formatDuration(payload.duration.totalMs) : payload.duration?.formatted || "—";
    const shortId = escapeHtml(d.id.substring(0, 8));

    const lines: string[] = [
      `❌ <b>نشر فشل — ${pipelineLabel} v${version}</b>`,
      ``,
      `📦 ${pipeline} | 🌍 ${environment}`,
      `👤 ${triggeredBy} | ⏱️ ${duration}`,
      `🆔 <code>${shortId}</code>`,
    ];

    if (payload.failure) {
      const failedStepLabel = payload.failure.failedStep
        ? escapeHtml(STEP_LABELS[payload.failure.failedStep] || payload.failure.failedStep)
        : undefined;

      lines.push(``);
      if (failedStepLabel) {
        lines.push(`🔴 <b>الخطوة الفاشلة:</b> ${failedStepLabel}`);
      }

      const rawReason = payload.failure.reason || "";
      const sanitizedReason = rawReason
        .replace(/ssh\s+-i\s+\S+/gi, "ssh -i [KEY]")
        .replace(/\/home\/\w+\/\.ssh\/\w+/g, "[SSH_KEY_PATH]")
        .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "[SERVER_IP]");
      const maxLen = 800;
      const truncatedReason = sanitizedReason.length > maxLen
        ? sanitizedReason.substring(0, maxLen) + "…"
        : sanitizedReason;
      lines.push(`💥 <b>سبب الفشل:</b>`);
      lines.push(escapeHtml(truncatedReason));

      if (payload.failure.failedCriticalSteps?.length) {
        lines.push(``);
        lines.push(`📋 <b>خطوات حرجة فشلت:</b>`);
        for (const step of payload.failure.failedCriticalSteps) {
          lines.push(`❌ ${escapeHtml(STEP_LABELS[step] || step)}`);
        }
      }

      if (payload.failure.suggestions?.length) {
        lines.push(``);
        lines.push(`🔄 <b>اقتراحات الإصلاح:</b>`);
        payload.failure.suggestions.forEach((suggestion, i) => {
          lines.push(`${i + 1}. ${escapeHtml(suggestion)}`);
        });
      }
    }

    const commitHash = s?.commitHash ? escapeHtml(s.commitHash.substring(0, 7)) : "—";
    const branch = s?.branch ? escapeHtml(s.branch) : "—";
    lines.push(``);
    lines.push(`🔗 Commit: <code>${commitHash}</code> | Branch: ${branch}`);
    lines.push(`🌐 ${escapeHtml(d.consoleUrl)}`);

    return lines.join("\n");
  }

  private formatCancelled(payload: DeploymentNotificationPayload): string {
    const d = payload.deployment;
    const s = payload.source;
    const pipelineLabel = escapeHtml(PIPELINE_LABELS[d.pipeline] || d.pipelineLabel || d.pipeline);
    const version = escapeHtml(d.version);
    const pipeline = escapeHtml(d.pipeline);
    const environment = escapeHtml(d.environment);
    const triggeredBy = escapeHtml(d.triggeredBy || "غير محدد");
    const duration = payload.duration?.totalMs ? formatDuration(payload.duration.totalMs) : payload.duration?.formatted || "—";
    const shortId = escapeHtml(d.id.substring(0, 8));

    const lines: string[] = [
      `⚠️ <b>نشر مُلغى — ${pipelineLabel} v${version}</b>`,
      ``,
      `📦 ${pipeline} | 🌍 ${environment}`,
      `👤 ${triggeredBy} | ⏱️ ${duration}`,
      `🆔 <code>${shortId}</code>`,
    ];

    if (payload.cancellation) {
      const reason = escapeHtml(payload.cancellation.reason || "غير محدد");
      lines.push(``);
      lines.push(`📝 <b>سبب الإلغاء:</b> ${reason}`);

      const completed = payload.cancellation.completedSteps || [];
      const pending = payload.cancellation.pendingSteps || [];
      const completedLabels = completed.map((s) => escapeHtml(STEP_LABELS[s] || s)).join("، ");
      const pendingLabels = pending.map((s) => escapeHtml(STEP_LABELS[s] || s)).join("، ");

      lines.push(``);
      lines.push(`📊 <b>حالة التنفيذ:</b>`);
      lines.push(`├ ✅ مكتملة: ${completed.length} (${completedLabels || "—"})`);
      lines.push(`└ ⏭ لم تُنفذ: ${pending.length} (${pendingLabels || "—"})`);
    }

    const commitHash = s?.commitHash ? escapeHtml(s.commitHash.substring(0, 7)) : "—";
    lines.push(``);
    lines.push(`🔗 Commit: <code>${commitHash}</code>`);
    lines.push(`🌐 ${escapeHtml(d.consoleUrl)}`);

    return lines.join("\n");
  }

  private formatPrebuildGateFailed(payload: DeploymentNotificationPayload): string {
    const d = payload.deployment;
    const pipelineLabel = escapeHtml(PIPELINE_LABELS[d.pipeline] || d.pipelineLabel || d.pipeline);
    const version = escapeHtml(d.version);
    const pipeline = escapeHtml(d.pipeline);
    const environment = escapeHtml(d.environment);
    const triggeredBy = escapeHtml(d.triggeredBy || "غير محدد");
    const shortId = escapeHtml(d.id.substring(0, 8));

    const lines: string[] = [
      `🚫 <b>بوابة ما قبل البناء فشلت — ${pipelineLabel} v${version}</b>`,
      ``,
      `📦 ${pipeline} | 🌍 ${environment}`,
      `👤 ${triggeredBy}`,
      `🆔 <code>${shortId}</code>`,
    ];

    if (payload.prebuildGate) {
      const g = payload.prebuildGate;
      lines.push(``);
      lines.push(`💥 <b>أسباب الحظر:</b>`);

      if (g.failedRoutes?.length) {
        lines.push(`❌ مسارات API: ${g.failedRoutes.length} فاشلة`);
        const shown = g.failedRoutes.slice(0, 3);
        for (const route of shown) {
          lines.push(`  • ${escapeHtml(route.method)} ${escapeHtml(route.path)} — ${escapeHtml(route.error)}`);
        }
        if (g.failedRoutes.length > 3) {
          lines.push(`  ... و ${g.failedRoutes.length - 3} أخرى`);
        }
      }

      if (g.corsIssues?.length) {
        lines.push(`❌ CORS: ${g.corsIssues.length} مشكلة`);
        for (const issue of g.corsIssues.slice(0, 3)) {
          lines.push(`  • ${escapeHtml(issue.origin)} → ${escapeHtml(issue.path)} — ${escapeHtml(issue.error)}`);
        }
      }

      if (g.sslError) {
        lines.push(`❌ SSL: ${escapeHtml(g.sslError)}`);
      }

      if (g.cspError) {
        lines.push(`❌ CSP: ${escapeHtml(g.cspError)}`);
      }
    }

    lines.push(``);
    lines.push(`🔄 <b>خطوات مقترحة:</b>`);
    lines.push(`1. أصلح مسارات API الحرجة`);
    lines.push(`2. تحقق من إعدادات CORS`);
    lines.push(`3. تأكد من صلاحية SSL`);
    lines.push(`4. راجع CSP headers`);
    lines.push(`5. أعد النشر بعد التصحيح`);

    return lines.join("\n");
  }
}
