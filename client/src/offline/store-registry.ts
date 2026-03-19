import { SERVER_TO_IDB_TABLE_MAP } from '@shared/schema';

export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

export const ALL_STORES = [
  'users', 'authUserSessions', 'emailVerificationTokens', 'passwordResetTokens',
  'projectTypes', 'projects', 'workers', 'wells', 'fundTransfers',
  'workerAttendance', 'suppliers', 'materials', 'materialPurchases',
  'supplierPayments', 'transportationExpenses', 'workerTransfers',
  'workerBalances', 'dailyExpenseSummaries', 'workerTypes', 'autocompleteData',
  'workerMiscExpenses', 'printSettings', 'projectFundTransfers',
  'securityPolicies', 'securityPolicyImplementations',
  'securityPolicySuggestions', 'securityPolicyViolations',
  'permissionAuditLogs', 'userProjectPermissions', 'materialCategories',
  'wellTasks', 'wellExpenses', 'wellAuditLogs',
  'wellTaskAccounts', 'notifications',
  'notificationReadStates',
  'aiChatSessions', 'aiChatMessages', 'aiUsageStats', 'buildDeployments',
  'reportTemplates', 'backupLogs', 'backupSettings',
  'equipment', 'equipmentMovements',
  'wellWorkCrews', 'wellCrewWorkers', 'wellSolarComponents',
  'wellTransportDetails', 'wellReceptions',
  'authRequestNonces', 'workerSettlements', 'workerSettlementLines',
  'emergencyUsers', 'syncQueue', 'syncMetadata', 'userData', 'syncHistory',
  'deadLetterQueue', 'localAuditLog',
] as const;

export type StoreName = (typeof ALL_STORES)[number];

const ENDPOINT_TO_STORE_MAP: Record<string, StoreName> = {
  '/api/fund-transfers': 'fundTransfers',
  '/api/worker-attendance': 'workerAttendance',
  '/api/transportation-expenses': 'transportationExpenses',
  '/api/material-purchases': 'materialPurchases',
  '/api/worker-transfers': 'workerTransfers',
  '/api/worker-misc-expenses': 'workerMiscExpenses',
  '/api/workers': 'workers',
  '/api/projects': 'projects',
  '/api/suppliers': 'suppliers',
  '/api/materials': 'materials',
  '/api/wells': 'wells',
  '/api/project-types': 'projectTypes',
  '/api/autocomplete': 'autocompleteData',
  '/api/autocomplete/worker-types': 'workerTypes',
  '/api/autocomplete/material-names': 'autocompleteData',
  '/api/autocomplete/supplier-names': 'autocompleteData',
  '/api/supplier-payments': 'supplierPayments',
  '/api/daily-expense-summaries': 'dailyExpenseSummaries',
  '/api/worker-balances': 'workerBalances',
  '/api/notifications': 'notifications',
  '/api/equipment': 'equipment',
  '/api/equipment-movements': 'equipmentMovements',
  '/api/project-fund-transfers': 'projectFundTransfers',
  '/api/users': 'users',
  '/api/well-tasks': 'wellTasks',
  '/api/well-expenses': 'wellExpenses',
  '/api/security/policies': 'securityPolicies',
  '/api/security/violations': 'securityPolicyViolations',
  '/api/security/suggestions': 'securityPolicySuggestions',
  '/api/ai/sessions': 'aiChatSessions',
  '/api/ai/messages': 'aiChatMessages',
  '/api/backups/logs': 'backupLogs',
  '/api/backups/settings': 'backupSettings',
  '/api/report-templates': 'reportTemplates',
};

const PROJECT_SCOPED_PATTERNS: Array<{ pattern: string; store: StoreName }> = [
  { pattern: 'fund-transfers', store: 'fundTransfers' },
  { pattern: 'worker-attendance', store: 'workerAttendance' },
  { pattern: 'material-purchases', store: 'materialPurchases' },
  { pattern: 'transportation', store: 'transportationExpenses' },
  { pattern: 'worker-transfers', store: 'workerTransfers' },
  { pattern: 'worker-misc', store: 'workerMiscExpenses' },
  { pattern: 'supplier-payments', store: 'supplierPayments' },
  { pattern: 'daily-expenses', store: 'dailyExpenseSummaries' },
  { pattern: 'daily-expense-summaries', store: 'dailyExpenseSummaries' },
  { pattern: 'workers', store: 'workers' },
  { pattern: 'equipment', store: 'equipment' },
  { pattern: 'equipment-movements', store: 'equipmentMovements' },
];

const QUERY_KEY_TO_STORE_MAP: Record<string, StoreName> = {
  '/api/workers': 'workers',
  '/api/projects': 'projects',
  '/api/projects/with-stats': 'projects',
  '/api/suppliers': 'suppliers',
  '/api/materials': 'materials',
  '/api/fund-transfers': 'fundTransfers',
  '/api/worker-attendance': 'workerAttendance',
  '/api/material-purchases': 'materialPurchases',
  '/api/transportation-expenses': 'transportationExpenses',
  '/api/worker-transfers': 'workerTransfers',
  '/api/worker-misc-expenses': 'workerMiscExpenses',
  '/api/supplier-payments': 'supplierPayments',
  '/api/autocomplete': 'autocompleteData',
  '/api/autocomplete/worker-types': 'workerTypes',
  '/api/project-types': 'projectTypes',
  '/api/wells': 'wells',
  '/api/daily-expense-summaries': 'dailyExpenseSummaries',
  '/api/worker-balances': 'workerBalances',
  '/api/notifications': 'notifications',
  '/api/equipment': 'equipment',
  '/api/equipment-movements': 'equipmentMovements',
  '/api/project-fund-transfers': 'projectFundTransfers',
  '/api/users': 'users',
  '/api/security/policies': 'securityPolicies',
  '/api/security/violations': 'securityPolicyViolations',
  '/api/security/suggestions': 'securityPolicySuggestions',
};

const ENTITY_STORES: Record<string, StoreName> = {
  projects: 'projects',
  workers: 'workers',
  materials: 'materials',
  suppliers: 'suppliers',
  workerAttendance: 'workerAttendance',
  materialPurchases: 'materialPurchases',
  transportationExpenses: 'transportationExpenses',
  fundTransfers: 'fundTransfers',
  workerTransfers: 'workerTransfers',
  workerMiscExpenses: 'workerMiscExpenses',
  wells: 'wells',
  projectTypes: 'projectTypes',
  users: 'users',
  equipment: 'equipment',
  equipmentMovements: 'equipmentMovements',
  supplierPayments: 'supplierPayments',
  dailyExpenseSummaries: 'dailyExpenseSummaries',
  workerBalances: 'workerBalances',
  notifications: 'notifications',
  autocompleteData: 'autocompleteData',
  workerTypes: 'workerTypes',
};

export function endpointToStore(endpoint: string): string | null {
  const clean = endpoint.split('?')[0];

  if (clean === '/api/autocomplete/worker-types' || clean.startsWith('/api/autocomplete/worker-types/')) {
    return 'workerTypes';
  }

  if (clean.startsWith('/api/projects/') && clean.includes('/')) {
    const subResource = clean.replace(/^\/api\/projects\/[^/]+\//, '');
    if (subResource && subResource !== clean) {
      for (const { pattern, store } of PROJECT_SCOPED_PATTERNS) {
        if (subResource === pattern || subResource.startsWith(pattern + '/') || subResource.startsWith(pattern)) {
          return store;
        }
      }
    }
  }

  for (const [pattern, store] of Object.entries(ENDPOINT_TO_STORE_MAP)) {
    if (clean === pattern || clean.startsWith(pattern + '/')) {
      return store;
    }
  }

  return null;
}

export function queryKeyToStore(queryKey: readonly unknown[]): string | null {
  const fullPath = (queryKey as string[]).join('/');
  const cleanPath = fullPath.split('?')[0];

  if (cleanPath.includes('/autocomplete/worker-types')) return 'workerTypes';

  if (cleanPath.includes('/fund-transfers')) return 'fundTransfers';
  if (cleanPath.includes('/worker-attendance')) return 'workerAttendance';
  if (cleanPath.includes('/material-purchases')) return 'materialPurchases';
  if (cleanPath.includes('/transportation')) return 'transportationExpenses';
  if (cleanPath.includes('/worker-transfers')) return 'workerTransfers';
  if (cleanPath.includes('/worker-misc')) return 'workerMiscExpenses';
  if (cleanPath.includes('/supplier-payments')) return 'supplierPayments';
  if (cleanPath.includes('/daily-expenses') || cleanPath.includes('/daily-expense-summaries')) return 'dailyExpenseSummaries';

  for (const [pattern, store] of Object.entries(QUERY_KEY_TO_STORE_MAP)) {
    if (cleanPath === pattern || cleanPath.startsWith(pattern + '/')) {
      return store;
    }
  }

  return null;
}

export function serverTableToStore(serverTableName: string): string {
  const mapped = SERVER_TO_IDB_TABLE_MAP[serverTableName];
  if (mapped) return mapped;
  return kebabToCamel(serverTableName.replace(/_/g, '-'));
}

export { ENDPOINT_TO_STORE_MAP, QUERY_KEY_TO_STORE_MAP, PROJECT_SCOPED_PATTERNS, ENTITY_STORES };
