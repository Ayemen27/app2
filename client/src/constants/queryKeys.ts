export const QUERY_KEYS = {
  projects: ["/api/projects"] as const,
  projectsWithStats: ["/api/projects/with-stats"] as const,
  projectTypes: ["/api/project-types"] as const,
  materials: ["/api/materials"] as const,
  suppliers: ["/api/suppliers"] as const,
  workers: ["/api/workers"] as const,
  workerTypes: ["/api/worker-types"] as const,
  notifications: ["/api/notifications"] as const,
  autocomplete: ["/api/autocomplete"] as const,
  tasks: ["/api/tasks"] as const,
  transportationExpenses: ["/api/transportation-expenses"] as const,
  workerMiscExpenses: ["/api/worker-misc-expenses"] as const,
  financialSummary: ["/api/financial-summary"] as const,
  healthStats: ["/api/health/stats"] as const,
  users: ["/api/users"] as const,
  usersList: ["/api/users/list"] as const,
  aiSessions: ["/api/ai/sessions"] as const,
  backupsStatus: ["/api/backups/status"] as const,
  backupsLogs: ["/api/backups/logs"] as const,
  backupsDatabases: ["/api/backups/databases"] as const,
  equipment: ["equipment"] as const,
  equipmentMovements: ["equipment-movements"] as const,
  wells: ["wells"] as const,
  recentActivities: ["/api/recent-activities"] as const,
  recentActivitiesByProject: (projectId: string) =>
    ["/api/recent-activities", projectId] as const,
  healthFull: ["/api/health/full"] as const,
  incidents: ["/api/incidents"] as const,
  metricsSummary: ["/api/metrics/summary"] as const,
  aiAccess: ["/api/ai/access"] as const,
  dbConnections: ["/api/db/connections"] as const,
  dbStats: ["/api/stats"] as const,
  adminDataHealth: ["/api/admin/data-health"] as const,
  autocompleteTransportCategories: ["/api/autocomplete/transport-categories"] as const,
  autocompleteTransactionCategories: ["/api/autocomplete/transaction-categories"] as const,
  syncProjects: ["/api/projects"] as const,
  syncAuditLogs: ["/api/sync-audit/logs"] as const,
  syncAuditStats: ["/api/sync-audit/stats"] as const,
  syncAuditModules: ["/api/sync-audit/modules"] as const,
  syncAuditLogsFiltered: (params: Record<string, any>) =>
    ["/api/sync-audit/logs", params] as const,

  projectTransportation: (projectId: string, date?: string, dateRange?: string) =>
    ["/api/projects", projectId, "transportation", date, dateRange].filter(Boolean) as string[],

  projectFundTransfersFiltered: (projectId: string, isAllProjects?: boolean) =>
    ["/api/projects", projectId, "fund-transfers", isAllProjects].filter(v => v !== undefined) as any[],
  projectFundTransfersIncoming: (projectId: string, isAllProjects?: boolean) =>
    ["/api/projects", projectId, "fund-transfers", "incoming", isAllProjects].filter(v => v !== undefined) as any[],
  projectFundTransfersOutgoing: (projectId: string, isAllProjects?: boolean) =>
    ["/api/projects", projectId, "fund-transfers", "outgoing", isAllProjects].filter(v => v !== undefined) as any[],
  projectWorkerAttendanceFiltered: (projectId: string, isAllProjects?: boolean) =>
    ["/api/projects", projectId, "worker-attendance", isAllProjects].filter(v => v !== undefined) as any[],
  projectMaterialPurchasesFiltered: (projectId: string, isAllProjects?: boolean) =>
    ["/api/projects", projectId, "material-purchases", isAllProjects].filter(v => v !== undefined) as any[],
  transportationExpensesFiltered: (isAllProjects?: boolean, projectId?: string) =>
    ["/api/transportation-expenses", isAllProjects, projectId].filter(v => v !== undefined) as any[],
  workerMiscExpensesFiltered: (projectId?: string, date?: string) =>
    ["/api/worker-misc-expenses", projectId, date].filter(Boolean) as string[],
  workerTransfersFiltered: (projectId: string, isAllProjects?: boolean) =>
    ["/api/worker-transfers", projectId, isAllProjects].filter(v => v !== undefined) as any[],
  workerStats: (workerId: string, projectId?: string) =>
    ["/api/workers", workerId, "stats", projectId].filter(Boolean) as string[],
  projectAttendance: (projectId: string) =>
    ["/api/projects", projectId, "attendance"] as const,
  dailyExpensesComplex: (projectSelector: string, dateKey?: string, date?: string) =>
    ["/api/projects", projectSelector, dateKey, date].filter(Boolean) as string[],

  materialPurchases: (projectId: string, date?: string) =>
    ["/api/projects", projectId, "material-purchases", date].filter(Boolean) as string[],

  workerAttendance: (projectId: string, date?: string) =>
    ["/api/projects", projectId, "worker-attendance", date].filter(Boolean) as string[],

  workerAttendanceAll: (projectId: string) =>
    ["/api/projects", projectId, "worker-attendance"] as const,

  dailyExpenses: (projectId: string, date?: string) =>
    ["/api/projects", projectId, "daily-expenses", date].filter(Boolean) as string[],

  previousBalance: (projectId: string, date?: string) =>
    ["/api/projects", projectId, "previous-balance", date].filter(Boolean) as string[],

  dailySummary: (projectId: string, date?: string) =>
    ["/api/projects", projectId, "daily-summary", date].filter(Boolean) as string[],

  projectStats: (projectId: string) =>
    ["/api/projects", projectId, "stats"] as const,

  workerTransfers: (projectId: string) =>
    ["/api/worker-transfers", projectId] as const,

  projectFundTransfers: ["/api/project-fund-transfers"] as const,
  allFundTransfers: ["/api/projects/all/fund-transfers"] as const,

  supplierStatistics: ["/api/suppliers/statistics"] as const,
  supplierStatisticsFiltered: (...params: string[]) =>
    ["/api/suppliers/statistics", ...params] as const,

  materialPurchasesDateRange: ["/api/material-purchases/date-range"] as const,
  materialPurchasesFiltered: (...params: string[]) =>
    ["/api/material-purchases", ...params] as const,

  dailyProjectTransfers: (projectId: string, date?: string) =>
    ["/api/daily-project-transfers", projectId, date].filter(Boolean) as string[],

  dailyExpenseSummaries: ["/api/daily-expense-summaries"] as const,

  wellTasks: (wellId: string) =>
    ["well-tasks", wellId] as const,
  wellExpenses: (wellId: string) =>
    ["well-expenses", wellId] as const,
  wellCostReport: (wellId: string) =>
    ["well-cost-report", wellId] as const,
  wellById: (wellId: string) =>
    ["well", wellId] as const,
  wellsByProject: (projectId: string) =>
    ["wells", projectId] as const,

  autocompleteCategory: (category: string) =>
    ["autocomplete", category] as const,
  autocompleteOwnerNames: (projectId: string) =>
    ["autocomplete/ownerNames", projectId] as const,
  autocompleteFanTypes: (projectId: string) =>
    ["autocomplete/fanTypes", projectId] as const,
  autocompletePumpPowers: (projectId: string) =>
    ["autocomplete/pumpPowers", projectId] as const,
  autocompleteTaskDescriptions: (projectId: string) =>
    ["autocomplete/taskDescriptions", projectId] as const,

  notificationsByUser: (userId: string) =>
    ["/api/notifications", userId] as const,

  adminNotifications: (...params: any[]) =>
    ["admin-notifications", ...params] as const,
  userActivity: ["user-activity"] as const,

  metrics: ["/api/metrics/current"] as const,
  diagnostics: ["/api/diagnostics/checks"] as const,

  workerAttendanceEdit: (editId: string) =>
    ["/api/worker-attendance", editId] as const,

  materialPurchaseEdit: (editId: string) =>
    ["/api/material-purchases", editId] as const,

  reportsWorkerStatement: (...params: any[]) =>
    ["/api/reports/worker-statement", ...params] as const,
  reportsDashboardKpis: (...params: any[]) =>
    ["/api/reports/dashboard-kpis", ...params] as const,

  securityPolicies: ["/api/security/policies"] as const,
  securityViolations: ["/api/security/violations"] as const,
  securitySuggestions: ["/api/security/suggestions"] as const,

  projectCosts: (projectId: string) =>
    ["project-costs", projectId] as const,

  errorLogs: ["/api/error-logs"] as const,
  usersWithRoles: ["/api/users", "with-roles"] as const,
  workerStatsSimple: (workerId: string) =>
    ["/api/workers", workerId, "stats"] as const,

  equipmentFiltered: (...params: any[]) =>
    ["equipment", ...params] as const,
  equipmentMovementsById: (equipmentId: string) =>
    ["equipment-movements", equipmentId] as const,
  autocompleteAdmin: (...params: string[]) =>
    ["autocomplete-admin", ...params] as const,

  autocompleteFanTypesPrefix: ["autocomplete/fanTypes"] as const,
  autocompletePumpPowersPrefix: ["autocomplete/pumpPowers"] as const,
  autocompleteOwnerNamesPrefix: ["autocomplete/ownerNames"] as const,
} as const;
