import { db } from "./db";
import { 
  users, emergencyUsers, authUserSessions, emailVerificationTokens, passwordResetTokens,
  projectTypes, projects, workers, wells,
  fundTransfers, workerAttendance, suppliers, materials, materialPurchases,
  supplierPayments, transportationExpenses, workerTransfers, workerBalances,
  dailyExpenseSummaries, workerTypes, autocompleteData, workerMiscExpenses,
  backupLogs, backupSettings, printSettings, projectFundTransfers,
  securityPolicies, securityPolicySuggestions, securityPolicyImplementations, securityPolicyViolations,
  userProjectPermissions, permissionAuditLogs,
  reportTemplates, toolCategories, tools, toolStock, toolMovements,
  toolMaintenanceLogs, toolUsageAnalytics, toolPurchaseItems, maintenanceSchedules, maintenanceTasks,
  toolCostTracking, toolReservations, systemNotifications, notificationReadStates, buildDeployments,
  toolNotifications, approvals, channels, messages, actions, systemEvents,
  accounts, transactions, transactionLines, journals, financePayments, financeEvents, accountBalances,
  notifications, aiChatSessions, aiChatMessages, aiUsageStats,
  wellTasks, wellTaskAccounts, wellExpenses, wellAuditLogs, materialCategories
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export const ALL_SYNC_TABLES = [
  'users', 'emergencyUsers', 'authUserSessions', 'emailVerificationTokens', 'passwordResetTokens',
  'projectTypes', 'projects', 'workers', 'wells',
  'fundTransfers', 'workerAttendance', 'suppliers', 'materials', 'materialPurchases',
  'supplierPayments', 'transportationExpenses', 'workerTransfers', 'workerBalances',
  'dailyExpenseSummaries', 'workerTypes', 'autocompleteData', 'workerMiscExpenses',
  'backupLogs', 'backupSettings', 'printSettings', 'projectFundTransfers',
  'securityPolicies', 'securityPolicySuggestions', 'securityPolicyImplementations', 'securityPolicyViolations',
  'userProjectPermissions', 'permissionAuditLogs',
  'reportTemplates', 'toolCategories', 'tools', 'toolStock', 'toolMovements',
  'toolMaintenanceLogs', 'toolUsageAnalytics', 'toolPurchaseItems', 'maintenanceSchedules', 'maintenanceTasks',
  'toolCostTracking', 'toolReservations', 'systemNotifications', 'notificationReadStates', 'buildDeployments',
  'toolNotifications', 'approvals', 'channels', 'messages', 'actions', 'systemEvents',
  'accounts', 'transactions', 'transactionLines', 'journals', 'financePayments', 'financeEvents', 'accountBalances',
  'notifications', 'aiChatSessions', 'aiChatMessages', 'aiUsageStats',
  'wellTasks', 'wellTaskAccounts', 'wellExpenses', 'wellAuditLogs', 'materialCategories'
] as const;

export async function syncData(payload: any) {
  const { table, data } = payload;
  const targetTable = getTable(table);
  
  if (!targetTable) throw new Error("Table " + table + " not found");

  for (const item of data) {
    await db.insert(targetTable).values(item).onConflictDoUpdate({
      target: (targetTable as any).id,
      set: item
    });
  }
}

function getTable(name: string) {
  const tables: Record<string, any> = {
    users, emergencyUsers, authUserSessions, emailVerificationTokens, passwordResetTokens,
    projectTypes, projects, workers, wells,
    fundTransfers, workerAttendance, suppliers, materials, materialPurchases,
    supplierPayments, transportationExpenses, workerTransfers, workerBalances,
    dailyExpenseSummaries, workerTypes, autocompleteData, workerMiscExpenses,
    backupLogs, backupSettings, printSettings, projectFundTransfers,
    securityPolicies, securityPolicySuggestions, securityPolicyImplementations, securityPolicyViolations,
    userProjectPermissions, permissionAuditLogs,
    reportTemplates, toolCategories, tools, toolStock, toolMovements,
    toolMaintenanceLogs, toolUsageAnalytics, toolPurchaseItems, maintenanceSchedules, maintenanceTasks,
    toolCostTracking, toolReservations, systemNotifications, notificationReadStates, buildDeployments,
    toolNotifications, approvals, channels, messages, actions, systemEvents,
    accounts, transactions, transactionLines, journals, financePayments, financeEvents, accountBalances,
    notifications, aiChatSessions, aiChatMessages, aiUsageStats,
    wellTasks, wellTaskAccounts, wellExpenses, wellAuditLogs, materialCategories
  };
  return tables[name];
}

export async function getAllTablesData(): Promise<Record<string, any[]>> {
  const results: Record<string, any[]> = {};
  
  for (const tableName of ALL_SYNC_TABLES) {
    try {
      const table = getTable(tableName);
      if (table) {
        const data = await db.select().from(table);
        results[tableName] = data;
      }
    } catch (error) {
      console.warn(`⚠️ [Sync] تخطي جدول ${tableName}:`, error);
      results[tableName] = [];
    }
  }
  
  return results;
}

export async function getTableRecordCount(tableName: string): Promise<number> {
  try {
    const table = getTable(tableName);
    if (!table) return 0;
    const result = await db.select({ count: sql<number>`count(*)` }).from(table);
    return Number(result[0]?.count || 0);
  } catch {
    return 0;
  }
}

export async function verifySync(clientCounts: Record<string, number>): Promise<{
  isMatched: boolean;
  differences: Array<{ table: string; serverCount: number; clientCount: number; diff: number }>;
  summary: { totalServerRecords: number; totalClientRecords: number; matchedTables: number; mismatchedTables: number };
}> {
  const differences: Array<{ table: string; serverCount: number; clientCount: number; diff: number }> = [];
  let totalServerRecords = 0;
  let totalClientRecords = 0;
  let matchedTables = 0;
  let mismatchedTables = 0;

  for (const tableName of ALL_SYNC_TABLES) {
    const serverCount = await getTableRecordCount(tableName);
    const clientCount = clientCounts[tableName] || 0;
    
    totalServerRecords += serverCount;
    totalClientRecords += clientCount;
    
    if (serverCount !== clientCount) {
      mismatchedTables++;
      differences.push({
        table: tableName,
        serverCount,
        clientCount,
        diff: serverCount - clientCount
      });
    } else {
      matchedTables++;
    }
  }

  return {
    isMatched: differences.length === 0,
    differences,
    summary: {
      totalServerRecords,
      totalClientRecords,
      matchedTables,
      mismatchedTables
    }
  };
}
