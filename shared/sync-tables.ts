/**
 * 📚 المصدر الموحد لأسماء جداول/مخازن المزامنة
 * يُستورد في:
 *  - client/src/offline/store-registry.ts (IndexedDB)
 *  - client/src/offline/native-db.ts (SQLite عبر Capacitor)
 *  - أي مكان يحتاج التحقق من اسم جدول قابل للمزامنة
 *
 * الهدف: منع schema mismatch بين IndexedDB و SQLite (المشكلة #15 في تقرير المزامنة).
 * أي جدول جديد يُضاف هنا فقط، فيظهر تلقائياً في الطبقتين.
 */

export const ALL_SYNC_STORES = [
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

export type SyncStoreName = (typeof ALL_SYNC_STORES)[number];

export const SYNC_STORES_SET = new Set<string>(ALL_SYNC_STORES);

export function isSyncStore(name: string): name is SyncStoreName {
  return SYNC_STORES_SET.has(name);
}
