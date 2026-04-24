/**
 * مُنفِّذ خطوات أنبوب نقل الأصول
 * ====================================
 * يربط بين تعريفات Pipeline في pipeline-definitions.ts والسكربتات
 * في scripts/transfer/. كل خطوة تُنفِّذ سكربت bash مقابل.
 *
 * الاستخدام البرمجي:
 *   import { runTransferStep, runTransferPipeline } from "./transfer-pipeline-runner.js";
 *   await runTransferPipeline("assets-export", { version: "v1.0.0" });
 *
 * أو من سطر الأوامر:
 *   tsx server/services/transfer-pipeline-runner.ts export
 *   tsx server/services/transfer-pipeline-runner.ts import v1.0.0
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { StepName, Pipeline } from "../config/pipeline-definitions.js";
import { getPipelineSteps, getStepTimeout } from "../config/pipeline-definitions.js";

const PROJECT_ROOT = resolve(process.cwd());
const TRANSFER_DIR = resolve(PROJECT_ROOT, "scripts/transfer");
const ORCHESTRATOR = resolve(TRANSFER_DIR, "transfer.sh");

export interface TransferStepOptions {
  version?: string;
  force?: boolean;
  noEncrypt?: boolean;
  noBackup?: boolean;
  noApplySecrets?: boolean;
  encryptPassphrase?: string;
}

export interface StepResult {
  stepName: StepName;
  success: boolean;
  durationMs: number;
  output?: string;
  error?: string;
}

/**
 * خريطة كل خطوة → الأمر الفعلي الذي يُنفَّذ
 */
function getStepCommand(stepName: StepName, opts: TransferStepOptions): { script: string; args: string[] } | null {
  const versionArg = opts.version ? [opts.version] : [];

  switch (stepName) {
    case "transfer-snapshot":
      return { script: "snapshot-secrets.sh", args: [] };

    case "transfer-pack-encrypt":
    case "transfer-upload":
      // pack-and-publish.sh يُنفِّذ الحزم + التشفير + الرفع في خطوة واحدة
      // نستدعيه مرة واحدة فقط (في transfer-pack-encrypt) ونتجاوز transfer-upload
      if (stepName === "transfer-upload") return null; // dummy — done by pack-encrypt
      return {
        script: "pack-and-publish.sh",
        args: [
          ...versionArg,
          ...(opts.force ? ["--force"] : []),
          ...(opts.noEncrypt ? ["--no-encrypt"] : []),
        ],
      };

    case "transfer-cleanup-old":
      // ينفَّذ تلقائياً ضمن pack-and-publish.sh (يحتفظ بآخر KEEP_LAST)
      return null; // no-op

    case "transfer-download":
    case "transfer-decrypt-extract":
      if (stepName === "transfer-decrypt-extract") return null; // مدمج في pull
      return {
        script: "pull-and-restore.sh",
        args: [
          ...versionArg,
          ...(opts.force ? ["--force"] : []),
          ...(opts.noBackup ? ["--no-backup"] : []),
        ],
      };

    case "transfer-apply-secrets":
      if (opts.noApplySecrets) return null;
      return {
        script: "apply-secrets.sh",
        args: opts.force ? ["--write-env"] : [],
      };

    default:
      return null;
  }
}

/**
 * تنفيذ خطوة واحدة من أنبوب النقل
 */
export async function runTransferStep(
  stepName: StepName,
  opts: TransferStepOptions = {},
): Promise<StepResult> {
  const startTime = Date.now();
  const cmd = getStepCommand(stepName, opts);

  if (!cmd) {
    return { stepName, success: true, durationMs: 0, output: "no-op (handled by another step)" };
  }

  const scriptPath = resolve(TRANSFER_DIR, cmd.script);
  if (!existsSync(scriptPath)) {
    return {
      stepName,
      success: false,
      durationMs: Date.now() - startTime,
      error: `Script not found: ${scriptPath}`,
    };
  }

  const timeoutMs = getStepTimeout(stepName);
  const env = { ...process.env };
  if (opts.encryptPassphrase) {
    env.ENCRYPT_PASSPHRASE = opts.encryptPassphrase;
  }
  // وضع غير تفاعلي للقذيفة
  env.NONINTERACTIVE = "1";

  return new Promise((resolveStep) => {
    const child = spawn("bash", [scriptPath, ...cmd.args], {
      cwd: PROJECT_ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => { stdout += d.toString(); });
    child.stderr?.on("data", (d) => { stderr += d.toString(); });

    const killTimer = setTimeout(() => {
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5000);
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(killTimer);
      const durationMs = Date.now() - startTime;
      if (code === 0) {
        resolveStep({ stepName, success: true, durationMs, output: stdout });
      } else {
        resolveStep({
          stepName,
          success: false,
          durationMs,
          output: stdout,
          error: stderr || `exit code ${code}`,
        });
      }
    });

    child.on("error", (err) => {
      clearTimeout(killTimer);
      resolveStep({
        stepName,
        success: false,
        durationMs: Date.now() - startTime,
        error: err.message,
      });
    });
  });
}

/**
 * تنفيذ أنبوب كامل (assets-export أو assets-import)
 */
export async function runTransferPipeline(
  pipeline: Pipeline,
  opts: TransferStepOptions = {},
): Promise<{ success: boolean; results: StepResult[] }> {
  if (pipeline !== "assets-export" && pipeline !== "assets-import") {
    throw new Error(`runTransferPipeline supports only assets-export/assets-import, got: ${pipeline}`);
  }

  const steps = getPipelineSteps(pipeline, "local");
  const results: StepResult[] = [];

  console.log(`\n🚀 تشغيل أنبوب: ${pipeline}`);
  console.log(`   الخطوات: ${steps.join(" → ")}\n`);

  for (const step of steps) {
    console.log(`▶ ${step}...`);
    const result = await runTransferStep(step, opts);
    results.push(result);

    const status = result.success ? "✅" : "❌";
    const dur = (result.durationMs / 1000).toFixed(1);
    console.log(`  ${status} ${step} (${dur}s)`);

    if (!result.success) {
      console.error(`     خطأ: ${result.error}`);
      return { success: false, results };
    }
  }

  console.log(`\n✅ اكتمل الأنبوب بنجاح\n`);
  return { success: true, results };
}

// ============================================================
// واجهة سطر الأوامر (CLI)
// ============================================================
async function main() {
  const [, , command, version] = process.argv;
  const opts: TransferStepOptions = {
    version,
    force: process.env.FORCE === "1" || process.argv.includes("--force"),
    encryptPassphrase: process.env.ENCRYPT_PASSPHRASE,
  };

  try {
    switch (command) {
      case "export": {
        const r = await runTransferPipeline("assets-export", opts);
        process.exit(r.success ? 0 : 1);
        break;
      }
      case "import": {
        const r = await runTransferPipeline("assets-import", opts);
        process.exit(r.success ? 0 : 1);
        break;
      }
      case "step": {
        const stepName = process.argv[3] as StepName;
        const r = await runTransferStep(stepName, opts);
        console.log(JSON.stringify(r, null, 2));
        process.exit(r.success ? 0 : 1);
        break;
      }
      default:
        console.log("الاستخدام:");
        console.log("  tsx server/services/transfer-pipeline-runner.ts export [version]");
        console.log("  tsx server/services/transfer-pipeline-runner.ts import [version]");
        console.log("  tsx server/services/transfer-pipeline-runner.ts step <stepName>");
        console.log("");
        console.log("أو الواجهة المباشرة:");
        console.log("  ./scripts/transfer/transfer.sh export");
        console.log("  ./scripts/transfer/transfer.sh import");
        process.exit(0);
    }
  } catch (err: any) {
    console.error(`❌ فشل: ${err?.message || err}`);
    process.exit(1);
  }
}

// تشغيل CLI فقط عند الاستدعاء المباشر
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}
