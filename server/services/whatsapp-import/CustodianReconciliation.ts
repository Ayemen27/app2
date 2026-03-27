import { db } from "../../db.js";
import { waCustodianEntries } from "@shared/schema";
import { eq } from "drizzle-orm";

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

const REQUIRED_CUSTODIANS = [
  { workerId: 'w002', name: 'عمار الشيعي' },
  { workerId: 'w_adnan', name: 'عدنان محمد حسين حمدين (ابو فارس)' },
  { workerId: 'w_abbasi', name: 'عبداللة العباسي' },
];

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
    const received = parseFloat(entry.receivedAmount || '0');
    const disbursed = parseFloat(entry.disbursedAmount || '0');
    const settled = parseFloat(entry.settledAmount || '0');

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

  for (const custodian of REQUIRED_CUSTODIANS) {
    statements.push(await generateCustodianStatement(custodian.workerId, custodian.name));
  }

  const allEntries = await db.select()
    .from(waCustodianEntries);

  const knownIds = new Set(REQUIRED_CUSTODIANS.map(c => c.workerId));
  const additionalIds = new Set<string>();

  for (const entry of allEntries) {
    if (!knownIds.has(entry.custodianWorkerId)) {
      additionalIds.add(entry.custodianWorkerId);
    }
  }

  for (const wid of additionalIds) {
    statements.push(await generateCustodianStatement(wid, `Custodian ${wid}`));
  }

  return statements;
}
