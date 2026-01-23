import { db } from "./db";
import { projects, workers, fundTransfers, workerAttendance, materials, materialPurchases, transportationExpenses, dailyExpenseSummaries, workerTransfers, workerBalances, autocompleteData, workerTypes, workerMiscExpenses, users, suppliers, supplierPayments, printSettings, projectFundTransfers, reportTemplates, equipment, equipmentMovements, notifications, notificationReadStates } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export async function syncData(payload: any) {
  const { table, data } = payload;
  const targetTable = getTable(table);
  
  if (!targetTable) throw new Error(\`Table \${table} not found\`);

  for (const item of data) {
    await db.insert(targetTable).values(item).onConflictDoUpdate({
      target: (targetTable as any).id,
      set: item
    });
  }
}

function getTable(name: string) {
  const tables: any = {
    projects, workers, fundTransfers, workerAttendance, materials, materialPurchases, transportationExpenses, dailyExpenseSummaries, workerTransfers, workerBalances, autocompleteData, workerTypes, workerMiscExpenses, users, suppliers, supplierPayments, printSettings, projectFundTransfers, reportTemplates, equipment, equipmentMovements, notifications, notificationReadStates
  };
  return tables[name];
}
