import { db } from "../../db.js";
import { waCustodianEntries, workers, waWorkerAliases } from "@shared/schema";
import { eq, or, ilike } from "drizzle-orm";
import { safeParseNum } from '../../utils/safe-numbers.js';

export interface CustodianStatement {
  custodianWorkerId: string;
  custodianName: string;
  totalReceived: number;
  totalDisbursed: number;
  totalSettled: number;
  unsettledBalance: number;
  personalAccountTotal: number;
  pendingSettlementTotal: number;
  entries: CustodianEntryDetail[];
}

export interface CustodianEntryDetail {
  id: number;
  entryType: string;
  receivedAmount: number;
  disbursedAmount: number;
  settledAmount: number;
  description: string | null;
  isPersonalAccount: boolean;
  pendingSettlement: boolean;
}

const REQUIRED_CUSTODIAN_NAMES = [
  { searchNames: ['عمار الشيعي'], displayName: 'عمار الشيعي' },
  { searchNames: ['عدنان محمد حسين حمدين', 'ابو فارس'], displayName: 'عدنان محمد حسين حمدين (ابو فارس)' },
  { searchNames: ['عبداللة العباسي', 'العباسي'], displayName: 'عبداللة العباسي' },
];

async function resolveCustodianWorkerId(searchNames: string[]): Promise<string | null> {
  for (const name of searchNames) {
    const workerMatch = await db.select({ id: workers.id })
      .from(workers)
      .where(eq(workers.name, name))
      .limit(1);
    if (workerMatch.length > 0) return workerMatch[0].id;

    const aliasMatch = await db.select({ canonicalWorkerId: waWorkerAliases.canonicalWorkerId })
      .from(waWorkerAliases)
      .where(eq(waWorkerAliases.aliasName, name))
      .limit(1);
    if (aliasMatch.length > 0) return aliasMatch[0].canonicalWorkerId;
  }
  return null;
}

async function resolveRequiredCustodians(): Promise<Array<{ workerId: string; name: string }>> {
  const resolved: Array<{ workerId: string; name: string }> = [];

  for (const custodian of REQUIRED_CUSTODIAN_NAMES) {
    const workerId = await resolveCustodianWorkerId(custodian.searchNames);
    if (workerId) {
      resolved.push({ workerId, name: custodian.displayName });
    } else {
      console.warn(`[CustodianReconciliation] Could not resolve worker ID for custodian: ${custodian.displayName}`);
    }
  }

  return resolved;
}

export async function generateCustodianStatement(
  custodianWorkerId: string,
  custodianName: string
): Promise<CustodianStatement> {
  const entries = await db.select()
    .from(waCustodianEntries)
    .where(eq(waCustodianEntries.custodianWorkerId, custodianWorkerId));

  let totalReceived = 0;
  let totalDisbursed = 0;
  let totalSettled = 0;
  let personalAccountTotal = 0;
  let pendingSettlementTotal = 0;

  const entryDetails: CustodianEntryDetail[] = [];

  for (const entry of entries) {
    const received = safeParseNum(entry.receivedAmount);
    const disbursed = safeParseNum(entry.disbursedAmount);
    const settled = safeParseNum(entry.settledAmount);

    totalReceived += received;
    totalDisbursed += disbursed;
    totalSettled += settled;

    if (entry.isPersonalAccount) {
      personalAccountTotal += disbursed;
    }

    if (entry.pendingSettlement) {
      pendingSettlementTotal += received - disbursed;
    }

    entryDetails.push({
      id: entry.id,
      entryType: entry.entryType,
      receivedAmount: received,
      disbursedAmount: disbursed,
      settledAmount: settled,
      description: entry.description,
      isPersonalAccount: entry.isPersonalAccount,
      pendingSettlement: entry.pendingSettlement,
    });
  }

  return {
    custodianWorkerId,
    custodianName,
    totalReceived,
    totalDisbursed,
    totalSettled,
    unsettledBalance: totalReceived - totalDisbursed - totalSettled,
    personalAccountTotal,
    pendingSettlementTotal,
    entries: entryDetails,
  };
}

export async function reconcileAllCustodians(): Promise<CustodianStatement[]> {
  const statements: CustodianStatement[] = [];

  const resolvedCustodians = await resolveRequiredCustodians();

  for (const custodian of resolvedCustodians) {
    statements.push(await generateCustodianStatement(custodian.workerId, custodian.name));
  }

  const allEntries = await db.select()
    .from(waCustodianEntries);

  const knownIds = new Set(resolvedCustodians.map(c => c.workerId));
  const additionalIds = new Set<string>();

  for (const entry of allEntries) {
    if (!knownIds.has(entry.custodianWorkerId)) {
      additionalIds.add(entry.custodianWorkerId);
    }
  }

  for (const wid of additionalIds) {
    const workerMatch = await db.select({ name: workers.name })
      .from(workers)
      .where(eq(workers.id, wid))
      .limit(1);
    const name = workerMatch.length > 0 ? workerMatch[0].name : `Custodian ${wid}`;
    statements.push(await generateCustodianStatement(wid, name));
  }

  return statements;
}
