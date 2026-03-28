import { db } from "../../db.js";
import { waCustodianEntries, workers } from "@shared/schema";
import type { WaCustodianEntry, InsertWaCustodianEntry } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { safeParseNum } from '../../utils/safe-numbers.js';

export class WhatsAppCustodianService {
  async createEntry(data: InsertWaCustodianEntry): Promise<WaCustodianEntry> {
    const [entry] = await db.insert(waCustodianEntries).values(data).returning();
    return entry;
  }

  async getEntriesByCustodian(custodianWorkerId: string): Promise<WaCustodianEntry[]> {
    return db.select()
      .from(waCustodianEntries)
      .where(eq(waCustodianEntries.custodianWorkerId, custodianWorkerId))
      .orderBy(waCustodianEntries.createdAt);
  }

  async getCustodianSummary(custodianWorkerId: string) {
    const entries = await this.getEntriesByCustodian(custodianWorkerId);

    let totalReceived = 0;
    let totalDisbursed = 0;
    let totalSettled = 0;

    for (const entry of entries) {
      totalReceived += safeParseNum(entry.receivedAmount);
      totalDisbursed += safeParseNum(entry.disbursedAmount);
      totalSettled += safeParseNum(entry.settledAmount);
    }

    const unsettledBalance = totalReceived - totalDisbursed - totalSettled;

    return {
      custodianWorkerId,
      totalReceived,
      totalDisbursed,
      totalSettled,
      unsettledBalance,
      entryCount: entries.length,
    };
  }

  async getAllCustodianSummaries() {
    const custodianIds = await db.selectDistinct({ id: waCustodianEntries.custodianWorkerId })
      .from(waCustodianEntries);

    const summaries = [];
    for (const { id } of custodianIds) {
      const summary = await this.getCustodianSummary(id);
      const [worker] = await db.select()
        .from(workers)
        .where(eq(workers.id, id))
        .limit(1);

      summaries.push({
        ...summary,
        workerName: worker?.name || 'Unknown',
      });
    }

    return summaries;
  }

  async getEntriesByBatch(batchId: number): Promise<WaCustodianEntry[]> {
    return db.select()
      .from(waCustodianEntries)
      .where(eq(waCustodianEntries.linkedBatchId, batchId));
  }
}

export const waCustodianService = new WhatsAppCustodianService();
