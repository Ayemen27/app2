import { QUERY_KEYS } from "./queryKeys";

interface PageRefreshConfig {
  queryKeys: readonly (readonly string[])[];
}

export const PULL_REFRESH_CONFIG: Record<string, PageRefreshConfig> = {
  "/": {
    queryKeys: [
      QUERY_KEYS.projectsWithStats,
      QUERY_KEYS.notifications,
      QUERY_KEYS.recentActivities,
      QUERY_KEYS.financialSummary,
      QUERY_KEYS.healthStats,
    ],
  },
  "/projects": {
    queryKeys: [
      QUERY_KEYS.projects,
      QUERY_KEYS.projectsWithStats,
      QUERY_KEYS.projectTypes,
    ],
  },
  "/workers": {
    queryKeys: [
      QUERY_KEYS.workers,
      QUERY_KEYS.workerTypes,
    ],
  },
  "/worker-accounts": {
    queryKeys: [
      QUERY_KEYS.workers,
      QUERY_KEYS.workerTypes,
    ],
  },
  "/suppliers-pro": {
    queryKeys: [
      QUERY_KEYS.suppliers,
      QUERY_KEYS.supplierStatistics,
    ],
  },
  "/supplier-accounts": {
    queryKeys: [
      QUERY_KEYS.suppliers,
      QUERY_KEYS.supplierStatistics,
    ],
  },
  "/customers": {
    queryKeys: [
      QUERY_KEYS.suppliers,
    ],
  },
  "/equipment": {
    queryKeys: [
      QUERY_KEYS.equipment,
      QUERY_KEYS.equipmentMovements,
    ],
  },
  "/notifications": {
    queryKeys: [
      QUERY_KEYS.notifications,
    ],
  },
  "/admin-notifications": {
    queryKeys: [
      QUERY_KEYS.notifications,
    ],
  },
  "/wells": {
    queryKeys: [
      QUERY_KEYS.wells,
    ],
  },
  "/well-cost-report": {
    queryKeys: [
      QUERY_KEYS.wells,
    ],
  },
  "/well-accounting": {
    queryKeys: [
      QUERY_KEYS.wells,
    ],
  },
  "/tasks": {
    queryKeys: [
      QUERY_KEYS.tasks,
    ],
  },
  "/reports": {
    queryKeys: [
      QUERY_KEYS.projectsWithStats,
      QUERY_KEYS.workers,
      QUERY_KEYS.suppliers,
    ],
  },
  "/users-management": {
    queryKeys: [
      QUERY_KEYS.users,
      QUERY_KEYS.usersList,
      QUERY_KEYS.usersWithRoles,
    ],
  },
  "/ai-chat": {
    queryKeys: [
      QUERY_KEYS.aiSessions,
    ],
  },
  "/admin/backups": {
    queryKeys: [
      QUERY_KEYS.backupsStatus,
      QUERY_KEYS.backupsLogs,
      QUERY_KEYS.backupsDatabases,
    ],
  },
  "/admin/monitoring": {
    queryKeys: [
      QUERY_KEYS.metrics,
      QUERY_KEYS.diagnostics,
      QUERY_KEYS.healthFull,
    ],
  },
  "/smart-errors": {
    queryKeys: [
      QUERY_KEYS.errorLogs,
    ],
  },
  "/daily-expenses": {
    queryKeys: [
      QUERY_KEYS.dailyExpenseSummaries,
      QUERY_KEYS.materials,
    ],
  },
  "/worker-attendance": {
    queryKeys: [
      QUERY_KEYS.workers,
      QUERY_KEYS.workerTypes,
    ],
  },
  "/material-purchase": {
    queryKeys: [
      QUERY_KEYS.materials,
      QUERY_KEYS.suppliers,
    ],
  },
  "/transport-management": {
    queryKeys: [
      QUERY_KEYS.transportationExpenses,
    ],
  },
  "/project-transfers": {
    queryKeys: [
      QUERY_KEYS.projectFundTransfers,
      QUERY_KEYS.allFundTransfers,
    ],
  },
  "/project-transactions": {
    queryKeys: [
      QUERY_KEYS.projects,
    ],
  },
  "/project-fund-custody": {
    queryKeys: [
      QUERY_KEYS.projectFundTransfers,
    ],
  },
  "/autocomplete-admin": {
    queryKeys: [
      QUERY_KEYS.autocomplete,
    ],
  },
  "/admin/data-health": {
    queryKeys: [
      QUERY_KEYS.adminDataHealth,
    ],
  },
};
