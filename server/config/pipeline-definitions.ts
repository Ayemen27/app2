export type Pipeline = "web-deploy" | "android-build" | "full-deploy" | "hotfix" | "android-build-test" | "git-push" | "git-android-build" | "rollback" | "health-check" | "server-cleanup" | "assets-export" | "assets-import";

export type BuildTarget = "server" | "local";

export type StepName =
  | "validate"
  | "preflight-check"
  | "sync-version"
  | "git-push"
  | "pull-server"
  | "install-deps"
  | "build-server"
  | "build-web"
  | "db-migrate"
  | "restart-pm2"
  | "post-deploy-smoke"
  | "verify"
  | "prebuild-gate"
  | "android-readiness"
  | "sync-capacitor"
  | "capture-plugin-manifest"
  | "detect-plugin-drift"
  | "bump-android-version"
  | "generate-icons"
  | "gradle-build"
  | "sign-apk"
  | "apk-integrity"
  | "apk-plugin-smoke"
  | "register-app-version"
  | "retrieve-artifact"
  | "firebase-test"
  | "transfer"
  | "deploy-server"
  | "hotfix-sync"
  | "hotfix-guard"
  | "rollback-server"
  | "hc-http"
  | "hc-pm2"
  | "hc-disk"
  | "hc-memory"
  | "hc-cpu"
  | "hc-db"
  | "hc-ssl"
  | "hc-runtime"
  | "hc-nginx"
  | "hc-network"
  | "hc-fd"
  | "hc-connections"
  | "hc-latency"
  | "hc-log-errors"
  | "hc-evaluate"
  | "cl-android"
  | "cl-tmp"
  | "cl-pm2-logs"
  | "cl-old-apk"
  | "cl-docker"
  | "cl-npm-cache"
  | "cl-journal"
  | "cl-old-logs"
  | "cl-git-gc"
  | "cl-orphans"
  | "cl-apt-cache"
  | "cl-summary"
  | "transfer-preflight"
  | "transfer-snapshot"
  | "transfer-pack-encrypt"
  | "transfer-upload"
  | "transfer-cleanup-old"
  | "transfer-download"
  | "transfer-decrypt-extract"
  | "transfer-apply-secrets";

export interface RetryPolicy {
  maxRetries: number;
  delayMs: number;
}

export interface StepDefinition {
  name: StepName;
  timeoutMs: number;
  retryPolicy?: RetryPolicy;
  condition?: StepCondition;
  parallelGroup?: string;
}

export type StepCondition =
  | { type: "buildTarget"; targets: BuildTarget[] }
  | { type: "pipeline"; pipelines: Pipeline[] }
  | { type: "appType"; appTypes: ("web" | "android")[] }
  | { type: "always" };

export interface PipelineDefinition {
  name: Pipeline;
  description: string;
  supportedTargets: BuildTarget[];
  steps: {
    server: StepName[];
    local: StepName[];
  };
}

export const PIPELINE_ALIASES: Record<string, Pipeline> = {
  "git-push": "web-deploy",
  "git-android-build": "android-build",
};

export function resolvePipeline(pipeline: string): Pipeline {
  return (PIPELINE_ALIASES[pipeline] as Pipeline) || (pipeline as Pipeline);
}

export const STEP_REGISTRY: Record<StepName, StepDefinition> = {
  "validate": {
    name: "validate",
    timeoutMs: 30000,
  },
  "preflight-check": {
    name: "preflight-check",
    timeoutMs: 180000,
  },
  "sync-version": {
    name: "sync-version",
    timeoutMs: 30000,
  },
  "git-push": {
    name: "git-push",
    timeoutMs: 120000,
    retryPolicy: { maxRetries: 2, delayMs: 5000 },
  },
  "pull-server": {
    name: "pull-server",
    timeoutMs: 60000,
    retryPolicy: { maxRetries: 2, delayMs: 5000 },
  },
  "install-deps": {
    name: "install-deps",
    timeoutMs: 180000,
    retryPolicy: { maxRetries: 2, delayMs: 10000 },
  },
  "build-server": {
    name: "build-server",
    timeoutMs: 600000,
    retryPolicy: { maxRetries: 2, delayMs: 15000 },
  },
  "build-web": {
    name: "build-web",
    timeoutMs: 300000,
    condition: { type: "buildTarget", targets: ["local"] },
  },
  "db-migrate": {
    name: "db-migrate",
    timeoutMs: 120000,
    retryPolicy: { maxRetries: 1, delayMs: 10000 },
  },
  "restart-pm2": {
    name: "restart-pm2",
    timeoutMs: 240000,
    retryPolicy: { maxRetries: 1, delayMs: 5000 },
  },
  "post-deploy-smoke": {
    name: "post-deploy-smoke",
    timeoutMs: 300000,
  },
  "verify": {
    name: "verify",
    timeoutMs: 60000,
    retryPolicy: { maxRetries: 3, delayMs: 5000 },
  },
  "prebuild-gate": {
    name: "prebuild-gate",
    timeoutMs: 120000,
  },
  "android-readiness": {
    name: "android-readiness",
    timeoutMs: 60000,
    retryPolicy: { maxRetries: 2, delayMs: 5000 },
    condition: { type: "appType", appTypes: ["android"] },
  },
  "sync-capacitor": {
    name: "sync-capacitor",
    timeoutMs: 120000,
    retryPolicy: { maxRetries: 3, delayMs: 5000 },
    condition: { type: "appType", appTypes: ["android"] },
  },
  "capture-plugin-manifest": {
    name: "capture-plugin-manifest",
    timeoutMs: 30000,
    retryPolicy: { maxRetries: 2, delayMs: 3000 },
    condition: { type: "appType", appTypes: ["android"] },
  },
  "detect-plugin-drift": {
    name: "detect-plugin-drift",
    timeoutMs: 30000,
    condition: { type: "pipeline", pipelines: ["web-deploy", "hotfix", "git-push"] },
  },
  "bump-android-version": {
    name: "bump-android-version",
    timeoutMs: 30000,
    retryPolicy: { maxRetries: 2, delayMs: 3000 },
    condition: { type: "appType", appTypes: ["android"] },
  },
  "generate-icons": {
    name: "generate-icons",
    timeoutMs: 60000,
    retryPolicy: { maxRetries: 2, delayMs: 5000 },
    condition: { type: "appType", appTypes: ["android"] },
  },
  "gradle-build": {
    name: "gradle-build",
    timeoutMs: 1200000,
    retryPolicy: { maxRetries: 2, delayMs: 10000 },
    condition: { type: "appType", appTypes: ["android"] },
  },
  "sign-apk": {
    name: "sign-apk",
    timeoutMs: 60000,
    retryPolicy: { maxRetries: 2, delayMs: 5000 },
    condition: { type: "appType", appTypes: ["android"] },
  },
  "apk-integrity": {
    name: "apk-integrity",
    timeoutMs: 60000,
    retryPolicy: { maxRetries: 2, delayMs: 5000 },
    condition: { type: "appType", appTypes: ["android"] },
  },
  "apk-plugin-smoke": {
    name: "apk-plugin-smoke",
    timeoutMs: 60000,
    retryPolicy: { maxRetries: 1, delayMs: 3000 },
    condition: { type: "appType", appTypes: ["android"] },
  },
  "register-app-version": {
    name: "register-app-version",
    timeoutMs: 30000,
    retryPolicy: { maxRetries: 2, delayMs: 3000 },
    condition: { type: "appType", appTypes: ["android"] },
  },
  "retrieve-artifact": {
    name: "retrieve-artifact",
    timeoutMs: 60000,
    retryPolicy: { maxRetries: 2, delayMs: 5000 },
    condition: { type: "appType", appTypes: ["android"] },
  },
  "firebase-test": {
    name: "firebase-test",
    timeoutMs: 600000,
    condition: { type: "pipeline", pipelines: ["android-build-test"] },
  },
  "transfer": {
    name: "transfer",
    timeoutMs: 600000,
    retryPolicy: { maxRetries: 2, delayMs: 5000 },
    condition: { type: "buildTarget", targets: ["local"] },
  },
  "deploy-server": {
    name: "deploy-server",
    timeoutMs: 120000,
    retryPolicy: { maxRetries: 1, delayMs: 10000 },
    condition: { type: "buildTarget", targets: ["local"] },
  },
  "hotfix-sync": {
    name: "hotfix-sync",
    timeoutMs: 120000,
    condition: { type: "pipeline", pipelines: ["hotfix"] },
  },
  "hotfix-guard": {
    name: "hotfix-guard",
    timeoutMs: 30000,
    condition: { type: "pipeline", pipelines: ["hotfix"] },
  },
  "rollback-server": {
    name: "rollback-server",
    timeoutMs: 60000,
    condition: { type: "pipeline", pipelines: ["rollback"] },
  },
  "hc-http": {
    name: "hc-http",
    timeoutMs: 20000,
    condition: { type: "pipeline", pipelines: ["health-check"] },
  },
  "hc-pm2": {
    name: "hc-pm2",
    timeoutMs: 15000,
    condition: { type: "pipeline", pipelines: ["health-check"] },
  },
  "hc-disk": {
    name: "hc-disk",
    timeoutMs: 15000,
    condition: { type: "pipeline", pipelines: ["health-check"] },
  },
  "hc-memory": {
    name: "hc-memory",
    timeoutMs: 15000,
    condition: { type: "pipeline", pipelines: ["health-check"] },
  },
  "hc-cpu": {
    name: "hc-cpu",
    timeoutMs: 15000,
    condition: { type: "pipeline", pipelines: ["health-check"] },
  },
  "hc-db": {
    name: "hc-db",
    timeoutMs: 20000,
    condition: { type: "pipeline", pipelines: ["health-check"] },
  },
  "hc-ssl": {
    name: "hc-ssl",
    timeoutMs: 15000,
    condition: { type: "pipeline", pipelines: ["health-check"] },
  },
  "hc-runtime": {
    name: "hc-runtime",
    timeoutMs: 15000,
    condition: { type: "pipeline", pipelines: ["health-check"] },
  },
  "hc-nginx": {
    name: "hc-nginx",
    timeoutMs: 15000,
    condition: { type: "pipeline", pipelines: ["health-check"] },
  },
  "hc-network": {
    name: "hc-network",
    timeoutMs: 20000,
    condition: { type: "pipeline", pipelines: ["health-check"] },
  },
  "hc-fd": {
    name: "hc-fd",
    timeoutMs: 10000,
    condition: { type: "pipeline", pipelines: ["health-check"] },
  },
  "hc-connections": {
    name: "hc-connections",
    timeoutMs: 15000,
    condition: { type: "pipeline", pipelines: ["health-check"] },
  },
  "hc-latency": {
    name: "hc-latency",
    timeoutMs: 30000,
    condition: { type: "pipeline", pipelines: ["health-check"] },
  },
  "hc-log-errors": {
    name: "hc-log-errors",
    timeoutMs: 15000,
    condition: { type: "pipeline", pipelines: ["health-check"] },
  },
  "hc-evaluate": {
    name: "hc-evaluate",
    timeoutMs: 10000,
    condition: { type: "pipeline", pipelines: ["health-check"] },
  },
  "cl-android": {
    name: "cl-android",
    timeoutMs: 30000,
    condition: { type: "pipeline", pipelines: ["server-cleanup"] },
  },
  "cl-tmp": {
    name: "cl-tmp",
    timeoutMs: 15000,
    condition: { type: "pipeline", pipelines: ["server-cleanup"] },
  },
  "cl-pm2-logs": {
    name: "cl-pm2-logs",
    timeoutMs: 15000,
    condition: { type: "pipeline", pipelines: ["server-cleanup"] },
  },
  "cl-old-apk": {
    name: "cl-old-apk",
    timeoutMs: 30000,
    condition: { type: "pipeline", pipelines: ["server-cleanup"] },
  },
  "cl-docker": {
    name: "cl-docker",
    timeoutMs: 30000,
    condition: { type: "pipeline", pipelines: ["server-cleanup"] },
  },
  "cl-npm-cache": {
    name: "cl-npm-cache",
    timeoutMs: 30000,
    condition: { type: "pipeline", pipelines: ["server-cleanup"] },
  },
  "cl-journal": {
    name: "cl-journal",
    timeoutMs: 20000,
    condition: { type: "pipeline", pipelines: ["server-cleanup"] },
  },
  "cl-old-logs": {
    name: "cl-old-logs",
    timeoutMs: 20000,
    condition: { type: "pipeline", pipelines: ["server-cleanup"] },
  },
  "cl-git-gc": {
    name: "cl-git-gc",
    timeoutMs: 60000,
    condition: { type: "pipeline", pipelines: ["server-cleanup"] },
  },
  "cl-orphans": {
    name: "cl-orphans",
    timeoutMs: 15000,
    condition: { type: "pipeline", pipelines: ["server-cleanup"] },
  },
  "cl-apt-cache": {
    name: "cl-apt-cache",
    timeoutMs: 30000,
    condition: { type: "pipeline", pipelines: ["server-cleanup"] },
  },
  "cl-summary": {
    name: "cl-summary",
    timeoutMs: 10000,
    condition: { type: "pipeline", pipelines: ["server-cleanup"] },
  },

  // ============================================================
  // خطوات أنبوب نقل الأصول والمتغيرات بين حسابات Replit
  // (تُنفَّذ عبر scripts/transfer/transfer.sh)
  // ============================================================
  "transfer-preflight": {
    name: "transfer-preflight",
    timeoutMs: 120000, // 2 دقيقة للتثبيت التلقائي عند الحاجة
    condition: { type: "pipeline", pipelines: ["assets-export", "assets-import"] },
  },
  "transfer-snapshot": {
    name: "transfer-snapshot",
    timeoutMs: 60000,
    condition: { type: "pipeline", pipelines: ["assets-export"] },
  },
  "transfer-pack-encrypt": {
    name: "transfer-pack-encrypt",
    timeoutMs: 600000, // 10 دقائق للحزم والتشفير لـ ~500MB
    condition: { type: "pipeline", pipelines: ["assets-export"] },
  },
  "transfer-upload": {
    name: "transfer-upload",
    timeoutMs: 1200000, // 20 دقيقة للرفع
    retryPolicy: { maxRetries: 2, delayMs: 10000 },
    condition: { type: "pipeline", pipelines: ["assets-export"] },
  },
  "transfer-cleanup-old": {
    name: "transfer-cleanup-old",
    timeoutMs: 60000,
    condition: { type: "pipeline", pipelines: ["assets-export"] },
  },
  "transfer-download": {
    name: "transfer-download",
    timeoutMs: 1200000, // 20 دقيقة للتنزيل
    retryPolicy: { maxRetries: 2, delayMs: 10000 },
    condition: { type: "pipeline", pipelines: ["assets-import"] },
  },
  "transfer-decrypt-extract": {
    name: "transfer-decrypt-extract",
    timeoutMs: 600000, // 10 دقائق لفك التشفير والاستخراج
    condition: { type: "pipeline", pipelines: ["assets-import"] },
  },
  "transfer-apply-secrets": {
    name: "transfer-apply-secrets",
    timeoutMs: 30000,
    condition: { type: "pipeline", pipelines: ["assets-import"] },
  },
};

export const PIPELINE_DEFINITIONS: Record<Pipeline, PipelineDefinition> = {
  "web-deploy": {
    name: "web-deploy",
    description: "Standard web deployment — يكشف Plugin Drift قبل النشر لمنع كسر APK المثبَّت",
    supportedTargets: ["server", "local"],
    steps: {
      server: ["validate", "preflight-check", "sync-version", "detect-plugin-drift", "git-push", "pull-server", "install-deps", "build-server", "db-migrate", "restart-pm2", "post-deploy-smoke", "verify"],
      local: ["validate", "preflight-check", "sync-version", "detect-plugin-drift", "git-push", "build-web", "transfer", "deploy-server", "db-migrate", "restart-pm2", "post-deploy-smoke", "verify"],
    },
  },
  "android-build": {
    name: "android-build",
    description: "Build Android APK — auto bump versionCode + plugin manifest tracking + smoke test",
    supportedTargets: ["server", "local"],
    steps: {
      server: ["validate", "preflight-check", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "restart-pm2", "prebuild-gate", "android-readiness", "sync-capacitor", "capture-plugin-manifest", "generate-icons", "bump-android-version", "gradle-build", "sign-apk", "apk-integrity", "apk-plugin-smoke", "register-app-version", "retrieve-artifact", "verify"],
      local: ["validate", "preflight-check", "sync-version", "build-web", "git-push", "pull-server", "install-deps", "build-server", "restart-pm2", "prebuild-gate", "android-readiness", "sync-capacitor", "capture-plugin-manifest", "generate-icons", "bump-android-version", "gradle-build", "sign-apk", "apk-integrity", "apk-plugin-smoke", "register-app-version", "retrieve-artifact", "verify"],
    },
  },
  "full-deploy": {
    name: "full-deploy",
    description: "Full deployment: web + Android build مع plugin drift safety",
    supportedTargets: ["server", "local"],
    steps: {
      server: ["validate", "preflight-check", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "db-migrate", "restart-pm2", "post-deploy-smoke", "prebuild-gate", "android-readiness", "sync-capacitor", "capture-plugin-manifest", "generate-icons", "bump-android-version", "gradle-build", "sign-apk", "apk-integrity", "apk-plugin-smoke", "register-app-version", "retrieve-artifact", "verify"],
      local: ["validate", "preflight-check", "sync-version", "build-web", "transfer", "deploy-server", "db-migrate", "restart-pm2", "post-deploy-smoke", "prebuild-gate", "android-readiness", "sync-capacitor", "capture-plugin-manifest", "generate-icons", "bump-android-version", "gradle-build", "sign-apk", "apk-integrity", "apk-plugin-smoke", "register-app-version", "retrieve-artifact", "verify"],
    },
  },
  "hotfix": {
    name: "hotfix",
    description: "Quick hotfix deployment — مع plugin drift detection",
    supportedTargets: ["server", "local"],
    steps: {
      server: ["validate", "hotfix-guard", "sync-version", "detect-plugin-drift", "git-push", "pull-server", "install-deps", "build-server", "restart-pm2", "post-deploy-smoke", "verify"],
      local: ["validate", "hotfix-guard", "sync-version", "detect-plugin-drift", "git-push", "pull-server", "install-deps", "build-server", "restart-pm2", "post-deploy-smoke", "verify"],
    },
  },
  "android-build-test": {
    name: "android-build-test",
    description: "Android build with Firebase Test Lab integration",
    supportedTargets: ["server", "local"],
    steps: {
      server: ["validate", "preflight-check", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "restart-pm2", "prebuild-gate", "android-readiness", "sync-capacitor", "capture-plugin-manifest", "generate-icons", "bump-android-version", "gradle-build", "sign-apk", "apk-integrity", "apk-plugin-smoke", "register-app-version", "firebase-test", "retrieve-artifact", "verify"],
      local: ["validate", "preflight-check", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "restart-pm2", "prebuild-gate", "android-readiness", "sync-capacitor", "capture-plugin-manifest", "generate-icons", "bump-android-version", "gradle-build", "sign-apk", "apk-integrity", "apk-plugin-smoke", "register-app-version", "firebase-test", "retrieve-artifact", "verify"],
    },
  },
  "git-push": {
    name: "git-push",
    description: "Alias for web-deploy (git push workflow) — مع drift detection",
    supportedTargets: ["server", "local"],
    steps: {
      server: ["validate", "preflight-check", "sync-version", "detect-plugin-drift", "git-push", "pull-server", "install-deps", "build-server", "db-migrate", "restart-pm2", "post-deploy-smoke", "verify"],
      local: ["validate", "preflight-check", "sync-version", "detect-plugin-drift", "git-push", "pull-server", "install-deps", "build-server", "db-migrate", "restart-pm2", "post-deploy-smoke", "verify"],
    },
  },
  "git-android-build": {
    name: "git-android-build",
    description: "Alias for android-build (git workflow) — مع plugin tracking كامل",
    supportedTargets: ["server", "local"],
    steps: {
      server: ["validate", "preflight-check", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "restart-pm2", "prebuild-gate", "android-readiness", "sync-capacitor", "capture-plugin-manifest", "generate-icons", "bump-android-version", "gradle-build", "sign-apk", "apk-integrity", "apk-plugin-smoke", "register-app-version", "retrieve-artifact", "verify"],
      local: ["validate", "preflight-check", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "restart-pm2", "prebuild-gate", "android-readiness", "sync-capacitor", "capture-plugin-manifest", "generate-icons", "bump-android-version", "gradle-build", "sign-apk", "apk-integrity", "apk-plugin-smoke", "register-app-version", "retrieve-artifact", "verify"],
    },
  },
  "rollback": {
    name: "rollback",
    description: "Rollback to previous deployment",
    supportedTargets: ["server", "local"],
    steps: {
      server: ["validate", "rollback-server", "restart-pm2", "verify"],
      local: ["validate", "rollback-server", "restart-pm2", "verify"],
    },
  },
  "health-check": {
    name: "health-check",
    description: "Comprehensive server health check — world-class diagnostics",
    supportedTargets: ["server"],
    steps: {
      server: ["hc-http", "hc-pm2", "hc-disk", "hc-memory", "hc-cpu", "hc-db", "hc-ssl", "hc-runtime", "hc-nginx", "hc-network", "hc-fd", "hc-connections", "hc-latency", "hc-log-errors", "hc-evaluate"],
      local: ["hc-http", "hc-pm2", "hc-disk", "hc-memory", "hc-cpu", "hc-db", "hc-ssl", "hc-runtime", "hc-nginx", "hc-network", "hc-fd", "hc-connections", "hc-latency", "hc-log-errors", "hc-evaluate"],
    },
  },
  "server-cleanup": {
    name: "server-cleanup",
    description: "Deep server cleanup with retention policies and resource reclamation",
    supportedTargets: ["server"],
    steps: {
      server: ["cl-android", "cl-tmp", "cl-pm2-logs", "cl-old-apk", "cl-docker", "cl-npm-cache", "cl-journal", "cl-old-logs", "cl-git-gc", "cl-orphans", "cl-apt-cache", "cl-summary"],
      local: ["cl-android", "cl-tmp", "cl-pm2-logs", "cl-old-apk", "cl-docker", "cl-npm-cache", "cl-journal", "cl-old-logs", "cl-git-gc", "cl-orphans", "cl-apt-cache", "cl-summary"],
    },
  },
  "assets-export": {
    name: "assets-export",
    description: "تصدير ملفات .gitignore فقط للسيرفر (الكود يُنقَل عبر GitHub، الأسرار عبر أداة Replit Secrets)",
    supportedTargets: ["local"],
    steps: {
      server: [],
      local: ["transfer-preflight", "transfer-snapshot", "transfer-pack-encrypt", "transfer-upload", "transfer-cleanup-old"],
    },
  },
  "assets-import": {
    name: "assets-import",
    description: "استيراد ملفات .gitignore من السيرفر (الكود يُستنسَخ من GitHub، الأسرار تُلصَق في أداة Replit Secrets)",
    supportedTargets: ["local"],
    steps: {
      server: [],
      local: ["transfer-preflight", "transfer-download", "transfer-decrypt-extract", "transfer-apply-secrets"],
    },
  },
};

export function getStepTimeout(stepName: string): number {
  const def = STEP_REGISTRY[stepName as StepName];
  return def?.timeoutMs ?? 60000;
}

export function getStepRetryPolicy(stepName: string): RetryPolicy | undefined {
  const def = STEP_REGISTRY[stepName as StepName];
  return def?.retryPolicy;
}

export function getPipelineSteps(pipeline: Pipeline, buildTarget: BuildTarget = "server"): StepName[] {
  const resolved = resolvePipeline(pipeline);
  const def = PIPELINE_DEFINITIONS[resolved];
  if (!def) {
    throw new Error(`Unknown pipeline: ${pipeline}`);
  }
  return def.steps[buildTarget];
}

export function getStepTimeouts(pipeline: Pipeline, buildTarget: BuildTarget = "server"): Record<string, number> {
  const steps = getPipelineSteps(pipeline, buildTarget);
  const timeouts: Record<string, number> = {};
  for (const step of steps) {
    timeouts[step] = getStepTimeout(step);
  }
  return timeouts;
}

export function getStepRetryPolicies(pipeline: Pipeline, buildTarget: BuildTarget = "server"): Record<string, RetryPolicy> {
  const steps = getPipelineSteps(pipeline, buildTarget);
  const policies: Record<string, RetryPolicy> = {};
  for (const step of steps) {
    const policy = getStepRetryPolicy(step);
    if (policy) {
      policies[step] = policy;
    }
  }
  return policies;
}

export interface PipelineValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validatePipeline(pipeline: Pipeline, buildTarget: BuildTarget = "server"): PipelineValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const def = PIPELINE_DEFINITIONS[pipeline];
  if (!def) {
    return { valid: false, errors: [`Unknown pipeline: ${pipeline}`], warnings: [] };
  }

  if (!def.supportedTargets.includes(buildTarget)) {
    errors.push(`Pipeline "${pipeline}" does not support build target "${buildTarget}". Supported: ${def.supportedTargets.join(", ")}`);
  }

  const steps = def.steps[buildTarget];
  if (!steps || steps.length === 0) {
    errors.push(`Pipeline "${pipeline}" has no steps defined for build target "${buildTarget}"`);
    return { valid: false, errors, warnings };
  }

  if (steps[0] !== "validate") {
    warnings.push(`Pipeline "${pipeline}" does not start with "validate" step`);
  }

  if (steps[steps.length - 1] !== "verify") {
    warnings.push(`Pipeline "${pipeline}" does not end with "verify" step`);
  }

  for (const step of steps) {
    if (!STEP_REGISTRY[step]) {
      errors.push(`Step "${step}" in pipeline "${pipeline}" is not registered in STEP_REGISTRY`);
    }
  }

  const seen = new Set<string>();
  for (const step of steps) {
    if (seen.has(step)) {
      warnings.push(`Duplicate step "${step}" in pipeline "${pipeline}" for target "${buildTarget}"`);
    }
    seen.add(step);
  }

  const androidSteps: StepName[] = ["android-readiness", "sync-capacitor", "generate-icons", "gradle-build", "sign-apk", "apk-integrity"];
  const hasAndroidSteps = steps.some(s => androidSteps.includes(s));
  const hasPrebuildGate = steps.includes("prebuild-gate");
  if (hasAndroidSteps && !hasPrebuildGate) {
    warnings.push(`Pipeline "${pipeline}" has Android steps but no "prebuild-gate" step`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateAllPipelines(): Record<string, PipelineValidationResult> {
  const results: Record<string, PipelineValidationResult> = {};
  for (const pipeline of Object.keys(PIPELINE_DEFINITIONS) as Pipeline[]) {
    for (const target of PIPELINE_DEFINITIONS[pipeline].supportedTargets) {
      const key = `${pipeline}:${target}`;
      results[key] = validatePipeline(pipeline, target);
    }
  }
  return results;
}

export function isPipelineSupported(pipeline: string): pipeline is Pipeline {
  return pipeline in PIPELINE_DEFINITIONS || pipeline in PIPELINE_ALIASES;
}

export function listAvailablePipelines(): { name: Pipeline; description: string; targets: BuildTarget[] }[] {
  return Object.values(PIPELINE_DEFINITIONS).map(def => ({
    name: def.name,
    description: def.description,
    targets: def.supportedTargets,
  }));
}
