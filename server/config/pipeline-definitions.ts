export type Pipeline = "web-deploy" | "android-build" | "full-deploy" | "hotfix" | "android-build-test" | "git-push" | "git-android-build" | "rollback";

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
  | "generate-icons"
  | "gradle-build"
  | "sign-apk"
  | "apk-integrity"
  | "retrieve-artifact"
  | "firebase-test"
  | "transfer"
  | "deploy-server"
  | "hotfix-sync"
  | "hotfix-guard"
  | "rollback-server";

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
    timeoutMs: 60000,
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
  },
  "build-web": {
    name: "build-web",
    timeoutMs: 300000,
    condition: { type: "buildTarget", targets: ["local"] },
  },
  "db-migrate": {
    name: "db-migrate",
    timeoutMs: 120000,
  },
  "restart-pm2": {
    name: "restart-pm2",
    timeoutMs: 60000,
    retryPolicy: { maxRetries: 2, delayMs: 3000 },
  },
  "post-deploy-smoke": {
    name: "post-deploy-smoke",
    timeoutMs: 60000,
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
    condition: { type: "appType", appTypes: ["android"] },
  },
  "sync-capacitor": {
    name: "sync-capacitor",
    timeoutMs: 120000,
    condition: { type: "appType", appTypes: ["android"] },
  },
  "generate-icons": {
    name: "generate-icons",
    timeoutMs: 60000,
    condition: { type: "appType", appTypes: ["android"] },
  },
  "gradle-build": {
    name: "gradle-build",
    timeoutMs: 1200000,
    condition: { type: "appType", appTypes: ["android"] },
  },
  "sign-apk": {
    name: "sign-apk",
    timeoutMs: 60000,
    condition: { type: "appType", appTypes: ["android"] },
  },
  "apk-integrity": {
    name: "apk-integrity",
    timeoutMs: 60000,
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
};

export const PIPELINE_DEFINITIONS: Record<Pipeline, PipelineDefinition> = {
  "web-deploy": {
    name: "web-deploy",
    description: "Standard web deployment to production server",
    supportedTargets: ["server", "local"],
    steps: {
      server: ["validate", "preflight-check", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "db-migrate", "restart-pm2", "post-deploy-smoke", "verify"],
      local: ["validate", "preflight-check", "sync-version", "build-web", "transfer", "deploy-server", "db-migrate", "restart-pm2", "post-deploy-smoke", "verify"],
    },
  },
  "android-build": {
    name: "android-build",
    description: "Build Android APK on remote server",
    supportedTargets: ["server", "local"],
    steps: {
      server: ["validate", "preflight-check", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "restart-pm2", "prebuild-gate", "android-readiness", "sync-capacitor", "generate-icons", "gradle-build", "sign-apk", "apk-integrity", "retrieve-artifact", "verify"],
      local: ["validate", "preflight-check", "sync-version", "build-web", "git-push", "pull-server", "install-deps", "restart-pm2", "prebuild-gate", "android-readiness", "sync-capacitor", "generate-icons", "gradle-build", "sign-apk", "apk-integrity", "retrieve-artifact", "verify"],
    },
  },
  "full-deploy": {
    name: "full-deploy",
    description: "Full deployment: web + Android build",
    supportedTargets: ["server", "local"],
    steps: {
      server: ["validate", "preflight-check", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "db-migrate", "restart-pm2", "post-deploy-smoke", "prebuild-gate", "android-readiness", "sync-capacitor", "generate-icons", "gradle-build", "sign-apk", "apk-integrity", "retrieve-artifact", "verify"],
      local: ["validate", "preflight-check", "sync-version", "build-web", "transfer", "deploy-server", "db-migrate", "restart-pm2", "post-deploy-smoke", "prebuild-gate", "android-readiness", "sync-capacitor", "generate-icons", "gradle-build", "sign-apk", "apk-integrity", "retrieve-artifact", "verify"],
    },
  },
  "hotfix": {
    name: "hotfix",
    description: "Quick hotfix deployment with minimal steps",
    supportedTargets: ["server", "local"],
    steps: {
      server: ["validate", "hotfix-guard", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "restart-pm2", "post-deploy-smoke", "verify"],
      local: ["validate", "hotfix-guard", "sync-version", "build-web", "hotfix-sync", "restart-pm2", "post-deploy-smoke", "verify"],
    },
  },
  "android-build-test": {
    name: "android-build-test",
    description: "Android build with Firebase Test Lab integration",
    supportedTargets: ["server", "local"],
    steps: {
      server: ["validate", "preflight-check", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "restart-pm2", "prebuild-gate", "android-readiness", "sync-capacitor", "generate-icons", "gradle-build", "sign-apk", "apk-integrity", "firebase-test", "retrieve-artifact", "verify"],
      local: ["validate", "preflight-check", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "restart-pm2", "prebuild-gate", "android-readiness", "sync-capacitor", "generate-icons", "gradle-build", "sign-apk", "apk-integrity", "firebase-test", "retrieve-artifact", "verify"],
    },
  },
  "git-push": {
    name: "git-push",
    description: "Alias for web-deploy (git push workflow)",
    supportedTargets: ["server", "local"],
    steps: {
      server: ["validate", "preflight-check", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "db-migrate", "restart-pm2", "post-deploy-smoke", "verify"],
      local: ["validate", "preflight-check", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "db-migrate", "restart-pm2", "post-deploy-smoke", "verify"],
    },
  },
  "git-android-build": {
    name: "git-android-build",
    description: "Alias for android-build (git workflow)",
    supportedTargets: ["server", "local"],
    steps: {
      server: ["validate", "preflight-check", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "restart-pm2", "prebuild-gate", "android-readiness", "sync-capacitor", "generate-icons", "gradle-build", "sign-apk", "apk-integrity", "retrieve-artifact", "verify"],
      local: ["validate", "preflight-check", "sync-version", "git-push", "pull-server", "install-deps", "build-server", "restart-pm2", "prebuild-gate", "android-readiness", "sync-capacitor", "generate-icons", "gradle-build", "sign-apk", "apk-integrity", "retrieve-artifact", "verify"],
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
