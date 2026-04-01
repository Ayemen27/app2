export type LogEntry = {
  timestamp: string;
  message: string;
  type: "info" | "error" | "success" | "warn" | "step";
};

export type StepEntry = {
  name: string;
  status: "pending" | "running" | "success" | "failed" | "cancelled";
  duration?: number;
  startedAt?: string;
  subProgress?: number;
  subMessage?: string;
};

export class CancellationError extends Error {
  constructor(message = "تم إلغاء النشر بواسطة المستخدم") {
    super(message);
    this.name = "CancellationError";
  }
}

export interface DeploymentConfig {
  pipeline: string;
  appType: "web" | "android";
  environment: "production" | "staging";
  branch?: string;
  commitMessage?: string;
  triggeredBy?: string;
  version?: string;
  buildTarget?: "server" | "local";
  originalPipeline?: string;
  deployerToken?: string;
  releaseNotes?: string;
}
