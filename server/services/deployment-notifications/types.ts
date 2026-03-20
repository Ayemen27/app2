export type DeploymentEventType = "started" | "success" | "failed" | "cancelled" | "prebuild_gate_failed";

export interface DeploymentInfo {
  id: string;
  buildNumber: number;
  pipeline: string;
  pipelineLabel: string;
  environment: string;
  consoleUrl: string;
  triggeredBy?: string;
  version: string;
}

export interface SourceInfo {
  commitHash?: string;
  branch?: string;
  commitMessage?: string;
}

export interface StepItem {
  name: string;
  nameAr?: string;
  status: "pending" | "running" | "success" | "failed" | "cancelled";
  durationMs?: number;
  critical?: boolean;
  attempt?: number;
}

export interface StepsInfo {
  total: number;
  completed: number;
  failed: number;
  cancelled: number;
  critical: string[];
  items: StepItem[];
}

export interface TimelineEntry {
  at: string;
  event: string;
  title: string;
  details?: string;
}

export interface CheckResult {
  passed: boolean;
  total?: number;
  failed?: number;
  error?: string;
  details?: string;
}

export interface SecurityChecks {
  cors?: CheckResult & { passedCount?: number; failedCount?: number };
  csp?: CheckResult;
  ssl?: CheckResult & { daysUntilExpiry?: number };
}

export interface ArtifactInfo {
  url?: string;
  fileName?: string;
  size?: string;
  sha256?: string;
  signatureValid?: boolean;
}

export interface FailureInfo {
  reason: string;
  failedStep?: string;
  failedCriticalSteps?: string[];
  suggestions?: string[];
  errorDetails?: string;
}

export interface CancellationInfo {
  reason: string;
  completedSteps: string[];
  pendingSteps: string[];
}

export interface PrebuildGateInfo {
  failedRoutes?: Array<{ method: string; path: string; error: string; group?: string }>;
  corsIssues?: Array<{ origin: string; path: string; error: string }>;
  sslError?: string;
  cspError?: string;
  routesSummary?: string;
  corsSummary?: string;
}

export interface DurationInfo {
  totalMs: number;
  formatted: string;
}

export interface NotificationAction {
  type: "retry" | "rollback" | "view_dashboard";
  label: string;
  url?: string;
}

export interface DeploymentNotificationPayload {
  eventType: DeploymentEventType;
  timestamp: string;
  deployment: DeploymentInfo;
  source: SourceInfo;
  steps: StepsInfo;
  timeline: TimelineEntry[];
  checks?: SecurityChecks;
  artifact?: ArtifactInfo;
  failure?: FailureInfo;
  cancellation?: CancellationInfo;
  prebuildGate?: PrebuildGateInfo;
  duration?: DurationInfo;
  actions?: NotificationAction[];
}

export interface NotificationSendResult {
  channel: string;
  ok: boolean;
  messageId?: string;
  error?: string;
  durationMs: number;
}

export interface NotificationProvider {
  readonly channel: string;
  send(payload: DeploymentNotificationPayload): Promise<{ ok: boolean; messageId?: string; error?: string }>;
  isEnabled(): boolean;
}

export const PIPELINE_LABELS: Record<string, string> = {
  "web-deploy": "نشر الويب",
  "android-build": "بناء أندرويد",
  "full-deploy": "نشر كامل",
  "hotfix": "إصلاح سريع",
  "android-build-test": "بناء + اختبار",
  "git-push": "نشر Git",
  "git-android-build": "Git + أندرويد",
  "rollback": "استرجاع",
};

export const STEP_LABELS: Record<string, string> = {
  "validate": "التحقق",
  "preflight-check": "فحص أولي",
  "sync-version": "مزامنة الإصدار",
  "git-push": "دفع Git",
  "pull-server": "سحب السيرفر",
  "install-deps": "تثبيت المكتبات",
  "build-server": "بناء السيرفر",
  "build-web": "بناء الويب",
  "db-migrate": "ترحيل قاعدة البيانات",
  "restart-pm2": "إعادة تشغيل PM2",
  "post-deploy-smoke": "اختبار ما بعد النشر",
  "verify": "التحقق النهائي",
  "prebuild-gate": "بوابة ما قبل البناء",
  "android-readiness": "جاهزية أندرويد",
  "sync-capacitor": "مزامنة Capacitor",
  "generate-icons": "توليد الأيقونات",
  "gradle-build": "بناء Gradle",
  "sign-apk": "توقيع APK",
  "apk-integrity": "فحص سلامة APK",
  "retrieve-artifact": "استرجاع الملف",
  "firebase-test": "اختبار Firebase",
  "transfer": "نقل الملفات",
  "deploy-server": "نشر على السيرفر",
  "hotfix-guard": "حارس الإصلاح السريع",
  "hotfix-sync": "مزامنة الإصلاح",
  "rollback-server": "استرجاع السيرفر",
};

export const CRITICAL_STEPS: Record<string, string[]> = {
  "web-deploy": ["git-push", "build-server", "db-migrate", "restart-pm2"],
  "android-build": ["prebuild-gate", "gradle-build", "sign-apk", "apk-integrity"],
  "full-deploy": ["git-push", "build-server", "db-migrate", "restart-pm2", "prebuild-gate", "gradle-build", "sign-apk"],
  "hotfix": ["git-push", "build-server", "restart-pm2"],
  "android-build-test": ["prebuild-gate", "gradle-build", "sign-apk", "firebase-test"],
  "git-push": ["git-push", "build-server", "db-migrate", "restart-pm2"],
  "git-android-build": ["git-push", "build-server", "prebuild-gate", "gradle-build", "sign-apk"],
  "rollback": ["rollback-server", "restart-pm2"],
};

export const FAILURE_SUGGESTIONS: Record<string, string[]> = {
  "git-push": [
    "تأكد من عدم وجود تعارضات في الفرع",
    "تحقق من اتصال SSH بالسيرفر",
    "حاول git pull ثم أعد المحاولة",
  ],
  "pull-server": [
    "تحقق من اتصال SSH بالسيرفر",
    "تأكد من وجود الفرع على السيرفر",
  ],
  "install-deps": [
    "تحقق من package.json — ربما مكتبة غير موجودة",
    "حاول حذف node_modules وإعادة التثبيت",
    "تحقق من مساحة القرص على السيرفر",
  ],
  "build-server": [
    "راجع أخطاء TypeScript في الكود",
    "تأكد من وجود كل متغيرات البيئة المطلوبة",
    "تحقق من مساحة الذاكرة المتاحة",
  ],
  "build-web": [
    "راجع أخطاء TypeScript أو Vite في الكود",
    "تأكد من وجود كل الملفات المستوردة",
  ],
  "db-migrate": [
    "تحقق من اتصال قاعدة البيانات (DATABASE_URL)",
    "راجع ملفات الترحيل — ربما تعارض في المخطط",
    "تأكد من صلاحيات المستخدم على القاعدة",
  ],
  "restart-pm2": [
    "تحقق من أن PM2 يعمل على السيرفر",
    "راجع ecosystem.config.js",
    "تحقق من سجلات PM2: pm2 logs",
  ],
  "gradle-build": [
    "تأكد من إعداد Android SDK بشكل صحيح",
    "تحقق من ملف build.gradle — ربما مكتبة غير متوافقة",
    "حاول تنظيف المشروع: ./gradlew clean",
    "تحقق من مساحة القرص والذاكرة",
  ],
  "sign-apk": [
    "تأكد من وجود ملف keystore ومفاتيحه",
    "تحقق من متغيرات البيئة: KEYSTORE_PATH, KEYSTORE_PASSWORD",
  ],
  "prebuild-gate": [
    "أصلح مسارات API الحرجة الفاشلة",
    "تحقق من إعدادات CORS للسيرفر",
    "تأكد من صلاحية شهادة SSL",
    "راجع إعدادات CSP headers",
  ],
  "apk-integrity": [
    "تحقق من خطوة sign-apk السابقة",
    "تأكد من وجود APK في مسار releases",
  ],
  "firebase-test": [
    "تحقق من اتصال Firebase وصلاحيات المشروع",
    "راجع إعدادات Test Lab",
  ],
  "transfer": [
    "تحقق من اتصال SSH واستقرار الشبكة",
    "تأكد من مساحة القرص على السيرفر",
  ],
  "verify": [
    "تأكد من أن التطبيق يستجيب على المنفذ الصحيح",
    "راجع سجلات PM2 للأخطاء",
  ],
};

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}ث`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}د ${remainingSeconds}ث`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}س ${remainingMinutes}د`;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
