import { db } from "../../db.js";
import {
  waRawMessages, waExtractionCandidates, waTransactionEvidenceLinks,
  waProjectHypotheses, waMediaAssets, waImportBatches, waCanonicalTransactions
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";

import { tryParseTransferReceipt, tryParseTransferReceiptAsync, transferCompanyRegistry } from './TransferReceiptParsers.js';
import { extractExpenses } from './ExpenseExtractors.js';
import { isNonTransaction, isRunningTotal, isStickerMessage, findDuplicateTextBlocks, validateInlineDate, isWorkConversation } from './MessageFilters.js';
import { clusterMessages, type RawMessageForClustering } from './ContextClusteringEngine.js';
import { inferProject, getBestProjectHypothesis, loadProjectKeywords, type ProjectKeywordMap } from './ProjectInferenceEngine.js';
import { detectSpecialTransaction, loadCustodianNames } from './SpecialTransactionDetectors.js';
import { computeConfidence, categorizeExpense, categorizeTransferReceipt, type ScoringContext } from './ScoringAndCategorization.js';
import { waAliasService } from './WhatsAppAliasService.js';

export interface ExtractionResult {
  batchId: number;
  totalMessages: number;
  candidatesCreated: number;
  excluded: number;
  duplicateTextBlocks: number;
  clustersFormed: number;
  errors: string[];
}

export class WhatsAppExtractionService {
  async extractFromBatch(batchId: number): Promise<ExtractionResult> {
    const result: ExtractionResult = {
      batchId,
      totalMessages: 0,
      candidatesCreated: 0,
      excluded: 0,
      duplicateTextBlocks: 0,
      clustersFormed: 0,
      errors: [],
    };

    const batch = await db.select().from(waImportBatches).where(eq(waImportBatches.id, batchId)).limit(1);
    if (batch.length === 0) {
      throw new Error(`Batch ${batchId} not found`);
    }
    const chatSource = batch[0].chatSource || 'other';

    const projectKeywords = await loadProjectKeywords();
    await loadCustodianNames();
    await waAliasService.loadCache();
    await transferCompanyRegistry.loadCompanies();

    const existingCandidates = await db.select()
      .from(waExtractionCandidates)
      .where(eq(waExtractionCandidates.batchId, batchId))
      .limit(1);

    if (existingCandidates.length > 0) {
      throw new Error(`Batch ${batchId} already has extraction candidates. Delete existing candidates before re-extracting.`);
    }

    const messages = await db.select()
      .from(waRawMessages)
      .where(eq(waRawMessages.batchId, batchId))
      .orderBy(waRawMessages.messageOrder);

    result.totalMessages = messages.length;

    for (const msg of messages) {
      try {
        const dateValidation = validateInlineDate(msg.messageText || '', new Date(msg.waTimestamp), chatSource);
        if (dateValidation.inlineClaimedDate || dateValidation.dateMismatchReason) {
          await db.update(waRawMessages)
            .set({
              inlineClaimedDate: dateValidation.inlineClaimedDate,
              dateMismatchReason: dateValidation.dateMismatchReason,
            })
            .where(eq(waRawMessages.id, msg.id));
        }
      } catch (_err) {
      }
    }

    const mediaAssets = await db.select()
      .from(waMediaAssets)
      .where(eq(waMediaAssets.batchId, batchId));

    const mediaByMessageId = new Map<number, number[]>();
    const ocrTextByMessageId = new Map<number, string>();
    for (const asset of mediaAssets) {
      if (asset.messageId) {
        const existing = mediaByMessageId.get(asset.messageId) || [];
        existing.push(asset.id);
        mediaByMessageId.set(asset.messageId, existing);

        if (asset.ocrText && !ocrTextByMessageId.has(asset.messageId)) {
          ocrTextByMessageId.set(asset.messageId, asset.ocrText);
        }
      }
    }

    const duplicates = findDuplicateTextBlocks(
      messages.map((m: { id: number; messageText: string; sender: string }) => ({ id: m.id, messageText: m.messageText, sender: m.sender }))
    );
    result.duplicateTextBlocks = duplicates.size;

    const clusterInput: RawMessageForClustering[] = messages.map((m: typeof messages[0]) => ({
      id: m.id,
      waTimestamp: new Date(m.waTimestamp),
      sender: m.sender,
      messageText: m.messageText,
      attachmentRef: m.attachmentRef,
      messageOrder: m.messageOrder,
    }));
    const clusters = clusterMessages(clusterInput);
    result.clustersFormed = clusters.length;

    const clusteredMessageIds = new Set<number>();
    for (const cluster of clusters) {
      for (const id of cluster.memberMessageIds) {
        clusteredMessageIds.add(id);
      }
    }

    for (const cluster of clusters) {
      try {
        await this.processCluster(cluster.anchorMessageId, cluster.mergedText, cluster.memberMessageIds, cluster.mediaMessageIds, batchId, chatSource, mediaByMessageId, messages, result, projectKeywords, ocrTextByMessageId);
      } catch (err: any) {
        result.errors.push(`Cluster ${cluster.anchorMessageId}: ${err.message}`);
        for (const memberId of cluster.memberMessageIds) {
          clusteredMessageIds.delete(memberId);
        }
      }
    }

    for (const msg of messages) {
      if (clusteredMessageIds.has(msg.id)) continue;

      try {
        await this.processMessage(msg, batchId, chatSource, duplicates, mediaByMessageId, result, projectKeywords, ocrTextByMessageId);
      } catch (err: any) {
        result.errors.push(`Message ${msg.id}: ${err.message}`);
      }
    }

    return result;
  }

  private async processCluster(
    anchorId: number,
    mergedText: string,
    memberIds: number[],
    mediaIds: number[],
    batchId: number,
    chatSource: string,
    mediaByMessageId: Map<number, number[]>,
    allMessages: any[],
    result: ExtractionResult,
    projectKeywords: ProjectKeywordMap[],
    ocrTextByMessageId: Map<number, string>
  ) {
    const anchorMsg = allMessages.find(m => m.id === anchorId);
    if (!anchorMsg) return;

    let textToAnalyze = mergedText || anchorMsg.messageText || '';

    const ocrTextsAdded = new Set<string>();
    for (const memberId of memberIds) {
      const ocrText = getOcrTextForMessage(memberId, ocrTextByMessageId);
      if (ocrText && !ocrTextsAdded.has(ocrText)) {
        const hasFinancialData = /\d{3,}/.test(ocrText) || /ريال|حوالة|تحويل|مبلغ/.test(ocrText);
        if (hasFinancialData && !textToAnalyze.includes(ocrText.slice(0, 50))) {
          textToAnalyze = textToAnalyze + ' ' + ocrText;
          ocrTextsAdded.add(ocrText);
        }
      }
    }

    const transferResult = await tryParseTransferReceiptAsync(textToAnalyze);
    if (transferResult) {
      await this.createTransferCandidate(transferResult, anchorMsg, batchId, chatSource, memberIds, mediaIds, mediaByMessageId, true, result, projectKeywords);
      return;
    }

    const specialResult = detectSpecialTransaction(textToAnalyze);
    if (specialResult) {
      await this.createSpecialCandidate(specialResult, anchorMsg, batchId, chatSource, memberIds, mediaIds, mediaByMessageId, true, result, projectKeywords);
      return;
    }

    const expenses = extractExpenses(textToAnalyze);
    if (expenses.length > 0) {
      for (const expense of expenses) {
        await this.createExpenseCandidate(expense, anchorMsg, batchId, chatSource, memberIds, mediaIds, mediaByMessageId, expenses.length > 1, true, result, projectKeywords);
      }
      return;
    }
  }

  private async processMessage(
    msg: any,
    batchId: number,
    chatSource: string,
    duplicates: Map<number, number>,
    mediaByMessageId: Map<number, number[]>,
    result: ExtractionResult,
    projectKeywords: ProjectKeywordMap[],
    ocrTextByMessageId: Map<number, string>
  ) {
    if (isStickerMessage(msg.attachmentRef)) {
      result.excluded++;
      return;
    }

    const rawText = (msg.messageText || '').trim();
    const isAttachmentOnly = /^\(الملف مرفق\)$|^<الوسائط غير مدرجة>$|^\(file attached\)$/i.test(rawText);

    let text = rawText;
    if (isAttachmentOnly && msg.attachmentRef) {
      const ocrText = getOcrTextForMessage(msg.id, ocrTextByMessageId);
      if (ocrText) {
        text = ocrText;
      } else {
        result.excluded++;
        return;
      }
    }

    const filterResult = isNonTransaction(text);
    if (filterResult.excluded) {
      result.excluded++;
      return;
    }

    if (duplicates.has(msg.id)) {
      result.excluded++;
      return;
    }

    if (isRunningTotal(text)) {
      result.excluded++;
      return;
    }

    if (isWorkConversation(text)) {
      result.excluded++;
      return;
    }

    const ocrText = isAttachmentOnly ? null : getOcrTextForMessage(msg.id, ocrTextByMessageId);

    const transferResult = await tryParseTransferReceiptAsync(text);
    if (transferResult) {
      if (ocrText && !transferResult.transferNumber) {
        const ocrTransferNum = ocrText.match(/(\d{6,})/);
        if (ocrTransferNum) transferResult.transferNumber = ocrTransferNum[1];
      }
      if (ocrText && !transferResult.recipient) {
        const ocrRecipient = ocrText.match(/(?:المستلم|إلى|الى)\s*:?\s*([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]{3,30})/);
        if (ocrRecipient) transferResult.recipient = ocrRecipient[1].trim();
      }
      await this.createTransferCandidate(transferResult, msg, batchId, chatSource, [msg.id], [], mediaByMessageId, false, result, projectKeywords);
      return;
    }

    const specialResult = detectSpecialTransaction(text);
    if (specialResult) {
      if (ocrText) {
        specialResult.description = `${specialResult.description} [OCR: ${ocrText.substring(0, 100)}]`;
      }
      await this.createSpecialCandidate(specialResult, msg, batchId, chatSource, [msg.id], [], mediaByMessageId, false, result, projectKeywords);
      return;
    }

    const expenses = extractExpenses(text);
    if (expenses.length > 0) {
      for (const expense of expenses) {
        if (ocrText && expenses.length === 1) {
          const ocrAmounts = ocrText.match(/\d[\d,.]+/g);
          if (ocrAmounts) {
            expense.description = `${expense.description} [OCR: ${ocrText.substring(0, 100)}]`;
          }
        }
        await this.createExpenseCandidate(expense, msg, batchId, chatSource, [msg.id], [], mediaByMessageId, expenses.length > 1, false, result, projectKeywords);
      }
      return;
    }
  }

  private async createTransferCandidate(
    transfer: any,
    msg: any,
    batchId: number,
    chatSource: string,
    messageIds: number[],
    mediaIds: number[],
    mediaByMessageId: Map<number, number[]>,
    fromCluster: boolean,
    result: ExtractionResult,
    projectKeywords: ProjectKeywordMap[]
  ) {
    const hypotheses = inferProject(transfer.raw || msg.messageText || '', chatSource, projectKeywords);
    const bestProject = getBestProjectHypothesis(hypotheses);

    const scoringCtx: ScoringContext = {
      hasDate: !!msg.waTimestamp,
      hasProjectMention: !!bestProject,
      hasSupportingImage: mediaIds.length > 0 || (mediaByMessageId.get(msg.id)?.length ?? 0) > 0,
      hasTransferNumber: !!transfer.transferNumber,
      hasExplicitAmountWithCurrency: true,
      amountBelow1000: transfer.amount < 1000,
      ambiguousWorkerName: false,
    };

    const confidence = computeConfidence(transfer.patternType || 'structured_receipt', scoringCtx);
    const cat = categorizeTransferReceipt();

    const dateValidation = validateInlineDate(msg.messageText || '', new Date(msg.waTimestamp), chatSource);

    const [candidate] = await db.insert(waExtractionCandidates).values({
      batchId,
      sourceMessageId: msg.id,
      amount: transfer.amount.toString(),
      currency: 'YER',
      description: `${transfer.companyName} - ${transfer.transferNumber || 'بدون رقم'}${transfer.recipient ? ' - ' + transfer.recipient : ''}`,
      patternType: transfer.patternType || 'structured_receipt',
      confidence: confidence.finalScore.toString(),
      confidenceBreakdownJson: confidence,
      category: cat.category,
      candidateType: 'transfer',
      matchStatus: 'new_entry',
      reviewFlags: dateValidation.dateMismatchReason ? ['date_mismatch'] : [],
    }).returning();

    await this.createEvidenceLinks(candidate.id, messageIds, mediaIds, mediaByMessageId);

    if (hypotheses.length > 0) {
      await this.storeProjectHypotheses(candidate.id, hypotheses);
    }

    result.candidatesCreated++;
  }

  private async createSpecialCandidate(
    special: any,
    msg: any,
    batchId: number,
    chatSource: string,
    messageIds: number[],
    mediaIds: number[],
    mediaByMessageId: Map<number, number[]>,
    fromCluster: boolean,
    result: ExtractionResult,
    projectKeywords: ProjectKeywordMap[]
  ) {
    const hypotheses = inferProject(msg.messageText || '', chatSource, projectKeywords);
    const bestProject = getBestProjectHypothesis(hypotheses);

    const scoringCtx: ScoringContext = {
      hasDate: !!msg.waTimestamp,
      hasProjectMention: !!bestProject,
      hasSupportingImage: mediaIds.length > 0 || (mediaByMessageId.get(msg.id)?.length ?? 0) > 0,
      hasTransferNumber: false,
      hasExplicitAmountWithCurrency: false,
      amountBelow1000: special.amount < 1000,
      ambiguousWorkerName: false,
    };

    const workerResolution = await this.resolveWorkerFromText(msg.messageText || special.description || '');

    const confidence = computeConfidence(special.candidateType, scoringCtx);

    let description = special.description;
    if (workerResolution.workerId && workerResolution.workerAlias) {
      description = `${description} [عامل: ${workerResolution.workerAlias}]`;
    }

    const [candidate] = await db.insert(waExtractionCandidates).values({
      batchId,
      sourceMessageId: msg.id,
      amount: special.amount.toString(),
      currency: 'YER',
      description,
      patternType: special.candidateType,
      confidence: confidence.finalScore.toString(),
      confidenceBreakdownJson: confidence,
      category: special.candidateType,
      candidateType: special.candidateType,
      matchStatus: 'new_entry',
      reviewFlags: special.reviewFlags || [],
    }).returning();

    await this.createEvidenceLinks(candidate.id, messageIds, mediaIds, mediaByMessageId);

    if (hypotheses.length > 0) {
      await this.storeProjectHypotheses(candidate.id, hypotheses);
    }

    result.candidatesCreated++;
  }

  private async createExpenseCandidate(
    expense: any,
    msg: any,
    batchId: number,
    chatSource: string,
    messageIds: number[],
    mediaIds: number[],
    mediaByMessageId: Map<number, number[]>,
    isMultiline: boolean,
    fromCluster: boolean,
    result: ExtractionResult,
    projectKeywords: ProjectKeywordMap[]
  ) {
    const fullText = [msg.messageText, expense.description].filter(Boolean).join(' ');
    const hypotheses = inferProject(fullText || '', chatSource, projectKeywords);
    const bestProject = getBestProjectHypothesis(hypotheses);
    const cat = categorizeExpense(expense.description);

    const patternType = isMultiline ? 'multiline_list' : (fromCluster ? 'image_context' : 'inline_expense');

    const scoringCtx: ScoringContext = {
      hasDate: !!msg.waTimestamp,
      hasProjectMention: !!bestProject,
      hasSupportingImage: mediaIds.length > 0 || (mediaByMessageId.get(msg.id)?.length ?? 0) > 0,
      hasTransferNumber: false,
      hasExplicitAmountWithCurrency: /ريال/.test(expense.raw || ''),
      amountBelow1000: expense.amount < 1000,
      ambiguousWorkerName: false,
    };

    const workerResolution = await this.resolveWorkerFromText(expense.description || msg.messageText || '');
    if (workerResolution.workerId) {
      scoringCtx.ambiguousWorkerName = false;
    }

    const confidence = computeConfidence(patternType, scoringCtx);

    const dateValidation = validateInlineDate(msg.messageText || '', new Date(msg.waTimestamp), chatSource);
    const reviewFlags: string[] = [];
    if (dateValidation.dateMismatchReason) reviewFlags.push('date_mismatch');

    let description = expense.description;
    if (workerResolution.workerId && workerResolution.workerAlias) {
      description = `${description} [عامل: ${workerResolution.workerAlias}]`;
    }

    const [candidate] = await db.insert(waExtractionCandidates).values({
      batchId,
      sourceMessageId: msg.id,
      amount: expense.amount.toString(),
      currency: 'YER',
      description,
      patternType,
      confidence: confidence.finalScore.toString(),
      confidenceBreakdownJson: confidence,
      category: cat.category,
      candidateType: 'expense',
      matchStatus: 'new_entry',
      reviewFlags,
    }).returning();

    await this.createEvidenceLinks(candidate.id, messageIds, mediaIds, mediaByMessageId);

    if (hypotheses.length > 0) {
      await this.storeProjectHypotheses(candidate.id, hypotheses);
    }

    result.candidatesCreated++;
  }

  private async createEvidenceLinks(
    candidateId: number,
    messageIds: number[],
    mediaIds: number[],
    mediaByMessageId: Map<number, number[]>
  ) {
    for (const msgId of messageIds) {
      await db.insert(waTransactionEvidenceLinks).values({
        candidateId,
        rawMessageId: msgId,
        linkType: 'source',
      });

      const msgMediaIds = mediaByMessageId.get(msgId) || [];
      for (const mediaId of msgMediaIds) {
        await db.insert(waTransactionEvidenceLinks).values({
          candidateId,
          mediaAssetId: mediaId,
          linkType: 'supporting_media',
        });
      }
    }

    const resolvedMediaAssetIds = this.resolveMediaAssetIds(mediaIds, mediaByMessageId);
    for (const assetId of resolvedMediaAssetIds) {
      await db.insert(waTransactionEvidenceLinks).values({
        candidateId,
        mediaAssetId: assetId,
        linkType: 'cluster_media',
      });
    }
  }

  private resolveMediaAssetIds(mediaMessageIds: number[], mediaByMessageId: Map<number, number[]>): number[] {
    const assetIds: number[] = [];
    for (const msgId of mediaMessageIds) {
      const assets = mediaByMessageId.get(msgId);
      if (assets) {
        for (const assetId of assets) {
          assetIds.push(assetId);
        }
      }
    }
    return assetIds;
  }

  private async storeProjectHypotheses(
    candidateId: number,
    hypotheses: Array<{ projectId: string; confidence: number; evidenceKeywords: string[]; inferenceMethod: string }>
  ) {
    for (const h of hypotheses) {
      await db.insert(waProjectHypotheses).values({
        candidateId,
        projectId: h.projectId,
        confidence: h.confidence.toString(),
        evidenceKeywords: h.evidenceKeywords,
        inferenceMethod: h.inferenceMethod,
      });
    }
  }

  private async resolveWorkerFromText(text: string): Promise<{ workerId: string | null; workerAlias: string | null }> {
    const words = text.split(/\s+/).filter(w => w.length > 1);
    for (let len = 3; len >= 1; len--) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(' ');
        const entityId = await waAliasService.resolveAlias(phrase);
        if (entityId) {
          return { workerId: entityId, workerAlias: phrase };
        }
      }
    }
    return { workerId: null, workerAlias: null };
  }

  async getExtractionCandidates(batchId: number) {
    const candidates = await db.select()
      .from(waExtractionCandidates)
      .where(eq(waExtractionCandidates.batchId, batchId))
      .orderBy(waExtractionCandidates.id);

    if (candidates.length === 0) return candidates;

    const canonicalIds = candidates
      .filter((c: { canonicalTransactionId: number | null }) => c.canonicalTransactionId !== null)
      .map((c: { canonicalTransactionId: number | null }) => c.canonicalTransactionId!);

    if (canonicalIds.length === 0) return candidates.map((c: typeof candidates[0]) => ({ ...c, canonicalStatus: null }));

    const canonicals = await db.select({ id: waCanonicalTransactions.id, status: waCanonicalTransactions.status })
      .from(waCanonicalTransactions)
      .where(sql`${waCanonicalTransactions.id} = ANY(${canonicalIds})`);

    const statusMap = new Map(canonicals.map((ct: { id: number; status: string | null }) => [ct.id, ct.status]));

    return candidates.map((c: typeof candidates[0]) => ({
      ...c,
      canonicalStatus: c.canonicalTransactionId ? statusMap.get(c.canonicalTransactionId) || null : null,
    }));
  }

  async getCandidateWithEvidence(candidateId: number) {
    const [candidate] = await db.select()
      .from(waExtractionCandidates)
      .where(eq(waExtractionCandidates.id, candidateId))
      .limit(1);

    if (!candidate) return null;

    const evidence = await db.select()
      .from(waTransactionEvidenceLinks)
      .where(eq(waTransactionEvidenceLinks.candidateId, candidateId));

    const hypotheses = await db.select()
      .from(waProjectHypotheses)
      .where(eq(waProjectHypotheses.candidateId, candidateId));

    return { candidate, evidence, hypotheses };
  }
}

function getOcrTextForMessage(msgId: number, ocrTextByMessageId: Map<number, string>): string | null {
  return ocrTextByMessageId.get(msgId) || null;
}

export const waExtractionService = new WhatsAppExtractionService();
