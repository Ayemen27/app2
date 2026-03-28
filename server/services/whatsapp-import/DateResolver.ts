import { db } from "../../db.js";
import { waRawMessages, waExtractionCandidates } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import { formatDateForFingerprint } from './FingerprintEngine.js';

export async function buildTransactionDateMap(
  candidateIds: number[]
): Promise<Map<number, string>> {
  if (candidateIds.length === 0) return new Map();

  const candidates = await db.select({
    id: waExtractionCandidates.id,
    sourceMessageId: waExtractionCandidates.sourceMessageId,
  })
    .from(waExtractionCandidates)
    .where(inArray(waExtractionCandidates.id, candidateIds));

  const messageIds = candidates
    .filter((c: { sourceMessageId: number | null }) => c.sourceMessageId !== null)
    .map((c: { sourceMessageId: number | null }) => c.sourceMessageId!);

  const messageTimestamps = new Map<number, Date>();

  if (messageIds.length > 0) {
    const messages = await db.select({
      id: waRawMessages.id,
      waTimestamp: waRawMessages.waTimestamp,
    })
      .from(waRawMessages)
      .where(inArray(waRawMessages.id, messageIds));

    for (const msg of messages) {
      messageTimestamps.set(msg.id, msg.waTimestamp);
    }
  }

  const dateMap = new Map<number, string>();

  for (const candidate of candidates) {
    if (candidate.sourceMessageId && messageTimestamps.has(candidate.sourceMessageId)) {
      const waDate = messageTimestamps.get(candidate.sourceMessageId)!;
      dateMap.set(candidate.id, formatDateForFingerprint(waDate));
    }
  }

  return dateMap;
}

export async function getTransactionDate(
  candidateId: number,
  sourceMessageId: number | null,
  fallbackCreatedAt: Date | null
): Promise<string> {
  if (sourceMessageId) {
    const msg = await db.select({ waTimestamp: waRawMessages.waTimestamp })
      .from(waRawMessages)
      .where(eq(waRawMessages.id, sourceMessageId))
      .limit(1);

    if (msg.length > 0) {
      return formatDateForFingerprint(msg[0].waTimestamp);
    }
  }

  if (fallbackCreatedAt) {
    return formatDateForFingerprint(fallbackCreatedAt);
  }

  return formatDateForFingerprint(new Date());
}
