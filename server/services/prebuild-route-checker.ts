import { MOBILE_CRITICAL_ROUTES, CORS_CHECK_ROUTES, CORS_ORIGINS_TO_TEST, type RouteCheck } from "../config/mobile-critical-routes";
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
}

export interface CorsCheckResult {
  origin: string;
  path: string;
  passed: boolean;
  allowOrigin?: string;
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

export interface PrebuildReport {
  timestamp: string;
  baseUrl: string;
  routeChecks: CheckResult[];
  corsChecks: CorsCheckResult[];
  sslCheck: SslCheckResult;
  summary: {
    totalRoutes: number;
    passedRoutes: number;
    failedRoutes: number;
    totalCors: number;
    passedCors: number;
    failedCors: number;
    sslValid: boolean;
    overallPass: boolean;
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

async function loginForToken(baseUrl: string): Promise<string | null> {
  const email = process.env.PREBUILD_TEST_EMAIL || process.env.DEFAULT_ADMIN_EMAIL || "binarjoinanalytic@gmail.com";
  const password = process.env.PREBUILD_TEST_PASSWORD || process.env.DEFAULT_ADMIN_PASSWORD || "";

  if (!password) {
    return null;
  }

  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-client-platform": "native" },
      body: JSON.stringify({ email, password }),
      timeout: 15000,
    });

    if (!res.ok) return null;
    const data = await res.json() as any;
    return data?.token || data?.accessToken || null;
  } catch {
    return null;
  }
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
  };

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-client-platform": "native",
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

    if (route.requiresAuth && !authToken) {
      result.passed = res.status === 401;
      if (!result.passed) {
        result.error = "Expected 401 without auth token but got " + res.status;
      }
    } else {
      result.passed = route.expectedStatus.includes(res.status);
      if (!result.passed) {
        result.error = `Expected ${route.expectedStatus.join("|")} but got ${res.status}`;
      }
    }
  } catch (err: any) {
    result.latencyMs = Date.now() - start;
    result.error = err.name === "AbortError" ? "Timeout" : err.message;
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
    result.allowOrigin = allowOrigin || undefined;
    result.passed = allowOrigin === origin;

    if (!result.passed) {
      result.error = `Access-Control-Allow-Origin is "${allowOrigin}" instead of "${origin}"`;
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

export async function runPrebuildChecks(baseUrl: string): Promise<PrebuildReport> {
  const report: PrebuildReport = {
    timestamp: new Date().toISOString(),
    baseUrl,
    routeChecks: [],
    corsChecks: [],
    sslCheck: { passed: false },
    summary: {
      totalRoutes: 0,
      passedRoutes: 0,
      failedRoutes: 0,
      totalCors: 0,
      passedCors: 0,
      failedCors: 0,
      sslValid: false,
      overallPass: false,
    },
  };

  const hostname = new URL(baseUrl).hostname;
  report.sslCheck = await checkSsl(hostname);

  const authToken = await loginForToken(baseUrl);

  const routeResults = await Promise.all(
    MOBILE_CRITICAL_ROUTES.map((route) => checkRoute(baseUrl, route, authToken))
  );
  report.routeChecks = routeResults;

  const corsResults: CorsCheckResult[] = [];
  for (const origin of CORS_ORIGINS_TO_TEST) {
    for (const path of CORS_CHECK_ROUTES) {
      corsResults.push(await checkCors(baseUrl, path, origin));
    }
  }
  report.corsChecks = corsResults;

  report.summary = {
    totalRoutes: routeResults.length,
    passedRoutes: routeResults.filter((r) => r.passed).length,
    failedRoutes: routeResults.filter((r) => !r.passed).length,
    totalCors: corsResults.length,
    passedCors: corsResults.filter((r) => r.passed).length,
    failedCors: corsResults.filter((r) => !r.passed).length,
    sslValid: report.sslCheck.passed,
    overallPass:
      report.sslCheck.passed &&
      routeResults.every((r) => r.passed) &&
      corsResults.every((r) => r.passed),
  };

  return report;
}
