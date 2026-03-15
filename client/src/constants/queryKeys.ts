export const QUERY_KEYS = {
  projects: ["/api/projects"] as const,
  projectsWithStats: ["/api/projects/with-stats"] as const,
  projectTypes: ["/api/autocomplete/project-types"] as const,
  materials: ["/api/materials"] as const,
  suppliers: ["/api/suppliers"] as const,
  workers: ["/api/workers"] as const,
  workerTypes: ["/api/autocomplete/worker-types"] as const,
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
  recentActivitiesByProject: (project_id: string) =>
    ["/api/recent-activities", project_id] as const,
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

  projectTransportation: (project_id: string, date?: string, dateRange?: string) =>
    ["/api/projects", project_id, "transportation", date, dateRange].filter(Boolean) as string[],

  projectFundTransfersFiltered: (project_id: string, isAllProjects?: boolean) =>
    ["/api/projects", project_id, "fund-transfers", isAllProjects].filter(v => v !== undefined) as any[],
  projectFundTransfersIncoming: (project_id: string, isAllProjects?: boolean) =>
    ["/api/projects", project_id, "fund-transfers", "incoming", isAllProjects].filter(v => v !== undefined) as any[],
  projectFundTransfersOutgoing: (project_id: string, isAllProjects?: boolean) =>
    ["/api/projects", project_id, "fund-transfers", "outgoing", isAllProjects].filter(v => v !== undefined) as any[],
  projectWorkerAttendanceFiltered: (project_id: string, isAllProjects?: boolean) =>
    ["/api/projects", project_id, "worker-attendance", isAllProjects].filter(v => v !== undefined) as any[],
  projectMaterialPurchasesFiltered: (project_id: string, isAllProjects?: boolean) =>
    ["/api/projects", project_id, "material-purchases", isAllProjects].filter(v => v !== undefined) as any[],
  transportationExpensesFiltered: (isAllProjects?: boolean, project_id?: string) =>
    ["/api/transportation-expenses", isAllProjects, project_id].filter(v => v !== undefined) as any[],
  workerMiscExpensesFiltered: (project_id?: string, date?: string) =>
    ["/api/worker-misc-expenses", project_id, date].filter(Boolean) as string[],
  workerTransfersFiltered: (project_id: string, isAllProjects?: boolean) =>
    ["/api/worker-transfers", project_id, isAllProjects].filter(v => v !== undefined) as any[],
  workerStats: (worker_id: string, project_id?: string) =>
    ["/api/workers", worker_id, "stats", project_id].filter(Boolean) as string[],
  projectAttendance: (project_id: string) =>
    ["/api/projects", project_id, "attendance"] as const,
  dailyExpensesComplex: (projectSelector: string, dateKey?: string, date?: string) =>
    ["/api/projects", projectSelector, dateKey, date].filter(Boolean) as string[],

  materialPurchases: (project_id: string, date?: string) =>
    ["/api/projects", project_id, "material-purchases", date].filter(Boolean) as string[],

  workerAttendance: (project_id: string, date?: string) =>
    ["/api/projects", project_id, "worker-attendance", date].filter(Boolean) as string[],

  workerAttendanceAll: (project_id: string) =>
    ["/api/projects", project_id, "worker-attendance"] as const,

  dailyExpenses: (project_id: string, date?: string) =>
    ["/api/projects", project_id, "daily-expenses", date].filter(Boolean) as string[],

  previousBalance: (project_id: string, date?: string) =>
    ["/api/projects", project_id, "previous-balance", date].filter(Boolean) as string[],

  dailySummary: (project_id: string, date?: string) =>
    ["/api/projects", project_id, "daily-summary", date].filter(Boolean) as string[],

  projectStats: (project_id: string) =>
    ["/api/projects", project_id, "stats"] as const,

  workerTransfers: (project_id: string) =>
    ["/api/worker-transfers", project_id] as const,

  projectFundTransfers: ["/api/project-fund-transfers"] as const,
  allFundTransfers: ["/api/projects/all/fund-transfers"] as const,

  supplierStatistics: ["/api/suppliers/statistics"] as const,
  supplierStatisticsFiltered: (...params: string[]) =>
    ["/api/suppliers/statistics", ...params] as const,

  materialPurchasesDateRange: ["/api/material-purchases/date-range"] as const,
  materialPurchasesFiltered: (...params: string[]) =>
    ["/api/material-purchases", ...params] as const,

  dailyProjectTransfers: (project_id: string, date?: string) =>
    ["/api/daily-project-transfers", project_id, date].filter(Boolean) as string[],

  dailyExpenseSummaries: ["/api/daily-expense-summaries"] as const,

  wellTasks: (well_id: string) =>
    ["well-tasks", well_id] as const,
  wellExpenses: (well_id: string) =>
    ["well-expenses", well_id] as const,
  wellCostReport: (well_id: string) =>
    ["well-cost-report", well_id] as const,
  wellById: (well_id: string) =>
    ["well", well_id] as const,
  wellsByProject: (project_id: string) =>
    ["wells", project_id] as const,
  wellsSummary: (project_id: string) =>
    ["wells-summary", project_id] as const,

  autocompleteCategory: (category: string) =>
    ["autocomplete", category] as const,
  autocompleteOwnerNames: (project_id: string) =>
    ["autocomplete/ownerNames", project_id] as const,
  autocompleteFanTypes: (project_id: string) =>
    ["autocomplete/fanTypes", project_id] as const,
  autocompletePumpPowers: (project_id: string) =>
    ["autocomplete/pumpPowers", project_id] as const,
  autocompleteTaskDescriptions: (project_id: string) =>
    ["autocomplete/taskDescriptions", project_id] as const,

  notificationsByUser: (user_id: string) =>
    ["/api/notifications", user_id] as const,

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

  projectCosts: (project_id: string) =>
    ["project-costs", project_id] as const,

  errorLogs: ["/api/error-logs"] as const,
  usersWithRoles: ["/api/users", "with-roles"] as const,
  workerStatsSimple: (worker_id: string) =>
    ["/api/workers", worker_id, "stats"] as const,

  equipmentFiltered: (...params: any[]) =>
    ["equipment", ...params] as const,
  equipmentMovementsById: (equipmentId: string) =>
    ["equipment-movements", equipmentId] as const,
  autocompleteAdmin: (...params: string[]) =>
    ["autocomplete-admin", ...params] as const,

  autocompleteFanTypesPrefix: ["autocomplete/fanTypes"] as const,
  autocompletePumpPowersPrefix: ["autocomplete/pumpPowers"] as const,
  autocompleteOwnerNamesPrefix: ["autocomplete/ownerNames"] as const,

  wellCrews: (well_id: string) =>
    ["well-crews", well_id] as const,
  wellSolarComponents: (well_id: string) =>
    ["well-solar-components", well_id] as const,
  wellTransportDetails: (well_id: string) =>
    ["well-transport-details", well_id] as const,
  wellReceptions: (well_id: string) =>
    ["well-receptions", well_id] as const,
  wellProgress: (well_id: string) =>
    ["well-progress", well_id] as const,
  wellPendingAccounting: (well_id: string) =>
    ["well-pending-accounting", well_id] as const,
} as const;
