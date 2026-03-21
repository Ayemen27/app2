import { MOBILE_CRITICAL_ROUTES, CORS_CHECK_ROUTES, CORS_ORIGINS_TO_TEST, REQUIRED_CORS_HEADERS, REQUIRED_CORS_METHODS, type RouteCheck } from "../config/mobile-critical-routes";
import https from "https";
import tls from "tls";

export interface CheckResult {
  path: string;
  method: string;
  group: string;
  description: string;
  passed: boolean;
  statusCode?: number;
  expectedStatus: number[];
  latencyMs?: number;
  error?: string;
  isInfraFailure?: boolean;
  critical?: boolean;
}

export interface CorsCheckResult {
  origin: string;
  path: string;
  passed: boolean;
  allowOrigin?: string;
  allowHeaders?: string;
  allowMethods?: string;
  headerCheckPassed?: boolean;
  methodCheckPassed?: boolean;
  error?: string;
}

export interface SslCheckResult {
  passed: boolean;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
  daysUntilExpiry?: number;
  protocol?: string;
  error?: string;
}

export interface CspCheckResult {
  passed: boolean;
  connectSrc?: string;
  hasCapacitor: boolean;
  hasLocalhost: boolean;
  error?: string;
}

export interface PrebuildReport {
  timestamp: string;
  baseUrl: string;
  authTokenObtained: boolean;
  routeChecks: CheckResult[];
  corsChecks: CorsCheckResult[];
  sslCheck: SslCheckResult;
  cspCheck: CspCheckResult;
  summary: {
    totalRoutes: number;
    passedRoutes: number;
    failedRoutes: number;
    totalCors: number;
    passedCors: number;
    failedCors: number;
    sslValid: boolean;
    cspValid: boolean;
    overallPass: boolean;
    authWarning?: string;
    avgLatencyMs?: number;
    slowRoutes?: string[];
  };
}

async function fetchWithTimeout(url: string, options: RequestInit & { timeout?: number } = {}): Promise<Response> {
  const { timeout = 15000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function loginForToken(baseUrl: string): Promise<{ token: string | null; source?: string; error?: string }> {
  const credSources = [
    {
      name: "service",
      email: process.env.PREBUILD_SERVICE_EMAIL,
      password: process.env.PREBUILD_SERVICE_PASSWORD,
    },
    {
      name: "test",
      email: process.env.PREBUILD_TEST_EMAIL || process.env.DEFAULT_ADMIN_EMAIL,
      password: process.env.PREBUILD_TEST_PASSWORD || process.env.DEFAULT_ADMIN_PASSWORD,
    },
  ].filter(c => c.email && c.password) as { name: string; email: string; password: string }[];

  if (credSources.length === 0) {
    return {
      token: null,
      error: "NO_CREDENTIALS: Set PREBUILD_SERVICE_EMAIL/PASSWORD or PREBUILD_TEST_PASSWORD or DEFAULT_ADMIN_PASSWORD",
    };
  }

  const errors: string[] = [];
  for (const cred of credSources) {
    try {
      const res = await fetchWithTimeout(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-platform": "native",
          "Accept": "application/json",
        },
        body: JSON.stringify({ email: cred.email, password: cred.password }),
        timeout: 15000,
      });

      if (!res.ok) {
        errors.push(`[${cred.name}] LOGIN_FAILED: HTTP ${res.status}`);
        continue;
      }
      const data = await res.json() as any;
      const token = data?.token || data?.accessToken || null;
      if (!token) {
        errors.push(`[${cred.name}] LOGIN_NO_TOKEN: response has no token field`);
        continue;
      }
      return { token, source: cred.name };
    } catch (err: any) {
      errors.push(`[${cred.name}] LOGIN_ERROR: ${err.message}`);
    }
  }

  return { token: null, error: errors.join(" | ") };
}

async function checkRoute(baseUrl: string, route: RouteCheck, authToken: string | null): Promise<CheckResult> {
  const start = Date.now();
  const result: CheckResult = {
    path: route.path,
    method: route.method,
    group: route.group,
    description: route.description,
    passed: false,
    expectedStatus: route.expectedStatus,
    critical: route.critical,
  };

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-client-platform": "native",
      "Accept": "application/json",
    };

    if (route.requiresAuth && authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const fetchOptions: RequestInit & { timeout?: number } = {
      method: route.method,
      headers,
      timeout: route.timeout,
    };

    if (route.body && (route.method === "POST" || route.method === "PATCH")) {
      fetchOptions.body = JSON.stringify(route.body);
    }

    const res = await fetchWithTimeout(`${baseUrl}${route.path}`, fetchOptions);
    result.statusCode = res.status;
    result.latencyMs = Date.now() - start;

    const INFRA_CODES = [502, 503, 504, 520, 521, 522, 523, 524];
    if (INFRA_CODES.includes(res.status)) {
      result.isInfraFailure = true;
      result.error = `Infrastructure error: HTTP ${res.status} (server unreachable/restarting)`;
    } else if (route.requiresAuth && !authToken) {
      result.passed = false;
      result.error = "AUTH_REQUIRED: Cannot test — no auth token obtained (route requires authentication)";
    } else {
      result.passed = route.expectedStatus.includes(res.status);
      if (!result.passed) {
        result.error = `Expected ${route.expectedStatus.join("|")} but got ${res.status}`;
      }
    }
  } catch (err: any) {
    result.latencyMs = Date.now() - start;
    if (err.name === "AbortError") {
      result.isInfraFailure = true;
      result.error = "Timeout (server unreachable)";
    } else if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND" || err.code === "ETIMEDOUT") {
      result.isInfraFailure = true;
      result.error = `Network error: ${err.code} (${err.message})`;
    } else {
      result.isInfraFailure = true;
      result.error = err.message;
    }
  }

  return result;
}

async function checkCors(baseUrl: string, path: string, origin: string): Promise<CorsCheckResult> {
  const result: CorsCheckResult = { origin, path, passed: false };

  try {
    const res = await fetchWithTimeout(`${baseUrl}${path}`, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,authorization,x-client-platform",
      },
      timeout: 10000,
    });

    const allowOrigin = res.headers.get("access-control-allow-origin");
    const allowHeaders = res.headers.get("access-control-allow-headers") || "";
    const allowMethods = res.headers.get("access-control-allow-methods") || "";

    result.allowOrigin = allowOrigin || undefined;
    result.allowHeaders = allowHeaders || undefined;
    result.allowMethods = allowMethods || undefined;

    const originPassed = allowOrigin === origin || allowOrigin === "*";

    const lowerHeaders = allowHeaders.toLowerCase();
    const headersPassed = REQUIRED_CORS_HEADERS.every(h => lowerHeaders.includes(h.toLowerCase()));
    result.headerCheckPassed = headersPassed;

    const upperMethods = allowMethods.toUpperCase();
    const methodsPassed = REQUIRED_CORS_METHODS.every(m => upperMethods.includes(m));
    result.methodCheckPassed = methodsPassed;

    result.passed = originPassed && headersPassed && methodsPassed;

    if (!result.passed) {
      const issues: string[] = [];
      if (!originPassed) issues.push(`Origin: "${allowOrigin}" ≠ "${origin}"`);
      if (!headersPassed) {
        const missing = REQUIRED_CORS_HEADERS.filter(h => !lowerHeaders.includes(h.toLowerCase()));
        issues.push(`Missing headers: ${missing.join(", ")}`);
      }
      if (!methodsPassed) {
        const missing = REQUIRED_CORS_METHODS.filter(m => !upperMethods.includes(m));
        issues.push(`Missing methods: ${missing.join(", ")}`);
      }
      result.error = issues.join(" | ");
    }
  } catch (err: any) {
    result.error = err.message;
  }

  return result;
}

function checkSsl(hostname: string): Promise<SslCheckResult> {
  return new Promise((resolve) => {
    const result: SslCheckResult = { passed: false };

    try {
      const socket = tls.connect(
        { host: hostname, port: 443, servername: hostname, timeout: 10000 },
        () => {
          const cert = socket.getPeerCertificate();
          if (cert && cert.valid_to) {
            const expiry = new Date(cert.valid_to);
            const now = new Date();
            const daysLeft = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            result.issuer = cert.issuer?.O || cert.issuer?.CN || "Unknown";
            result.validFrom = cert.valid_from;
            result.validTo = cert.valid_to;
            result.daysUntilExpiry = daysLeft;
            result.protocol = socket.getProtocol() || undefined;
            result.passed = daysLeft > 7;

            if (!result.passed) {
              result.error = `SSL certificate expires in ${daysLeft} days`;
            }
          } else {
            result.error = "No certificate found";
          }
          socket.end();
          resolve(result);
        }
      );

      socket.on("error", (err) => {
        result.error = err.message;
        resolve(result);
      });

      socket.setTimeout(10000, () => {
        result.error = "SSL connection timeout";
        socket.destroy();
        resolve(result);
      });
    } catch (err: any) {
      result.error = err.message;
      resolve(result);
    }
  });
}

async function checkCsp(baseUrl: string): Promise<CspCheckResult> {
  const result: CspCheckResult = { passed: false, hasCapacitor: false, hasLocalhost: false };

  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/health`, {
      method: "GET",
      timeout: 10000,
    });

    const csp = res.headers.get("content-security-policy") || "";
    if (!csp) {
      result.error = "No Content-Security-Policy header found";
      return result;
    }

    const connectSrcMatch = csp.match(/connect-src\s+([^;]+)/);
    if (connectSrcMatch) {
      result.connectSrc = connectSrcMatch[1].trim();
      result.hasCapacitor = result.connectSrc.includes("capacitor://localhost");
      result.hasLocalhost = result.connectSrc.includes("https://localhost");
    } else {
      result.error = "connect-src directive not found in CSP";
      return result;
    }

    result.passed = result.hasCapacitor && result.hasLocalhost;
    if (!result.passed) {
      const missing: string[] = [];
      if (!result.hasCapacitor) missing.push("capacitor://localhost");
      if (!result.hasLocalhost) missing.push("https://localhost");
      result.error = `connect-src missing: ${missing.join(", ")}`;
    }
  } catch (err: any) {
    result.error = err.message;
  }

  return result;
}

export interface PrebuildOptions {
  deployerToken?: string;
  maxRetries?: number;
}

export async function runPrebuildChecks(baseUrl: string, optionsOrRetries?: PrebuildOptions | number): Promise<PrebuildReport> {
  const options: PrebuildOptions = typeof optionsOrRetries === "number"
    ? { maxRetries: optionsOrRetries }
    : optionsOrRetries || {};
  const maxRetries = options.maxRetries ?? 2;

  let lastReport: PrebuildReport | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const report: PrebuildReport = {
      timestamp: new Date().toISOString(),
      baseUrl,
      authTokenObtained: false,
      routeChecks: [],
      corsChecks: [],
      sslCheck: { passed: false },
      cspCheck: { passed: false, hasCapacitor: false, hasLocalhost: false },
      summary: {
        totalRoutes: 0,
        passedRoutes: 0,
        failedRoutes: 0,
        totalCors: 0,
        passedCors: 0,
        failedCors: 0,
        sslValid: false,
        cspValid: false,
        overallPass: false,
      },
    };

    const hostname = new URL(baseUrl).hostname;
    report.sslCheck = await checkSsl(hostname);

    const authResult = await loginForToken(baseUrl);
    let authToken = authResult.token;
    let authSource = authResult.source || "none";

    if (!authToken && options.deployerToken) {
      authToken = options.deployerToken;
      authSource = "deployer-fallback";
      console.log("[PrebuildChecker] Using deployer token as fallback (service credentials unavailable)");
    }

    report.authTokenObtained = !!authToken;

    if (!authToken) {
      report.summary.authWarning = authResult.error || "Failed to obtain auth token";
    } else {
      console.log(`[PrebuildChecker] Auth source: ${authSource}`);
    }

    const routeResults = await Promise.all(
      MOBILE_CRITICAL_ROUTES.map((route) => checkRoute(baseUrl, route, authToken))
    );
    report.routeChecks = routeResults;

    const infraCount = routeResults.filter((r) => r.isInfraFailure).length;
    const publicInfra = routeResults.filter((r) => r.isInfraFailure && (r.group === "public" || r.group === "auth"));
    const infraRatio = infraCount / routeResults.length;
    const isServerUnreachable = publicInfra.length > 0 && infraRatio >= 0.5;

    if (isServerUnreachable && attempt < maxRetries) {
      console.log(`[PrebuildChecker] Infrastructure failure detected (${infraCount}/${routeResults.length} routes, attempt ${attempt + 1}/${maxRetries + 1}) — retrying in 15s...`);
      await new Promise((r) => setTimeout(r, 15000));
      lastReport = report;
      continue;
    }

    if (isServerUnreachable) {
      report.corsChecks = CORS_ORIGINS_TO_TEST.flatMap((origin) =>
        CORS_CHECK_ROUTES.map((path) => ({
          origin,
          path,
          passed: false,
          error: "Skipped — server unreachable (infrastructure failure)",
        }))
      );
      report.cspCheck = {
        passed: false,
        hasCapacitor: false,
        hasLocalhost: false,
        error: "Skipped — server unreachable (infrastructure failure)",
      };
    } else {
      const corsResults: CorsCheckResult[] = [];
      for (const origin of CORS_ORIGINS_TO_TEST) {
        for (const path of CORS_CHECK_ROUTES) {
          corsResults.push(await checkCors(baseUrl, path, origin));
        }
      }
      report.corsChecks = corsResults;

      report.cspCheck = await checkCsp(baseUrl);
    }

    const latencies = routeResults.filter(r => r.latencyMs != null).map(r => r.latencyMs!);
    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : undefined;
    const slowRoutes = routeResults.filter(r => r.latencyMs != null && r.latencyMs > 3000).map(r => `${r.path} (${r.latencyMs}ms)`);

    const unauthRoutesFailed = !authToken ? routeResults.filter(r => r.requiresAuth && r.error?.includes("AUTH_REQUIRED")).length : 0;

    report.summary = {
      totalRoutes: routeResults.length,
      passedRoutes: routeResults.filter((r) => r.passed).length,
      failedRoutes: routeResults.filter((r) => !r.passed).length,
      totalCors: report.corsChecks.length,
      passedCors: report.corsChecks.filter((r) => r.passed).length,
      failedCors: report.corsChecks.filter((r) => !r.passed).length,
      sslValid: report.sslCheck.passed,
      cspValid: report.cspCheck.passed,
      overallPass:
        report.sslCheck.passed &&
        report.cspCheck.passed &&
        report.authTokenObtained &&
        routeResults.every((r) => r.passed) &&
        report.corsChecks.every((r) => r.passed),
      authWarning: report.summary.authWarning,
      avgLatencyMs: avgLatency,
      slowRoutes: slowRoutes.length > 0 ? slowRoutes : undefined,
    };

    return report;
  }

  return lastReport!;
}
