export interface RouteCheck {
  method: "GET" | "POST" | "PATCH" | "DELETE" | "OPTIONS";
  path: string;
  requiresAuth: boolean;
  body?: Record<string, any>;
  expectedStatus: number[];
  description: string;
  group: "public" | "auth" | "core" | "sync" | "cors";
  timeout: number;
}

export const MOBILE_CRITICAL_ROUTES: RouteCheck[] = [
  {
    method: "GET",
    path: "/api/health",
    requiresAuth: false,
    expectedStatus: [200],
    description: "Health check endpoint",
    group: "public",
    timeout: 10000,
  },
  {
    method: "POST",
    path: "/api/auth/login",
    requiresAuth: false,
    body: { email: "__prebuild_test__", password: "__prebuild_test__" },
    expectedStatus: [401, 400, 429],
    description: "Login endpoint reachable (expect auth rejection)",
    group: "auth",
    timeout: 15000,
  },
  {
    method: "POST",
    path: "/api/auth/refresh",
    requiresAuth: false,
    body: { refreshToken: "invalid_test_token" },
    expectedStatus: [401, 400, 403],
    description: "Refresh token endpoint reachable",
    group: "auth",
    timeout: 10000,
  },
  {
    method: "GET",
    path: "/api/auth/me",
    requiresAuth: true,
    expectedStatus: [200],
    description: "Current user endpoint (authenticated)",
    group: "auth",
    timeout: 10000,
  },
  {
    method: "GET",
    path: "/api/projects",
    requiresAuth: true,
    expectedStatus: [200],
    description: "Projects list",
    group: "core",
    timeout: 15000,
  },
  {
    method: "GET",
    path: "/api/workers",
    requiresAuth: true,
    expectedStatus: [200],
    description: "Workers list",
    group: "core",
    timeout: 15000,
  },
  {
    method: "GET",
    path: "/api/materials",
    requiresAuth: true,
    expectedStatus: [200],
    description: "Materials list",
    group: "core",
    timeout: 15000,
  },
  {
    method: "GET",
    path: "/api/notifications",
    requiresAuth: true,
    expectedStatus: [200],
    description: "Notifications list",
    group: "core",
    timeout: 10000,
  },
  {
    method: "GET",
    path: "/api/tasks",
    requiresAuth: true,
    expectedStatus: [200],
    description: "Tasks list",
    group: "core",
    timeout: 10000,
  },
  {
    method: "GET",
    path: "/api/wells",
    requiresAuth: true,
    expectedStatus: [200],
    description: "Wells list",
    group: "core",
    timeout: 10000,
  },
  {
    method: "GET",
    path: "/api/equipment",
    requiresAuth: true,
    expectedStatus: [200],
    description: "Equipment list",
    group: "core",
    timeout: 10000,
  },
];

export const CORS_CHECK_ROUTES = [
  "/api/auth/login",
  "/api/auth/me",
  "/api/health",
  "/api/projects",
];

export const CORS_ORIGINS_TO_TEST = [
  "capacitor://localhost",
  "https://localhost",
];
