import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import * as path from "path";
import { existsSync } from "fs";
import rateLimit from "express-rate-limit";
import { requireAuth, requireAdminOrEditor, requireRole, type AuthenticatedRequest } from "../../middleware/auth.js";
import { waIngestionService } from "../../services/whatsapp-import/WhatsAppIngestionService.js";
import { waAliasService } from "../../services/whatsapp-import/WhatsAppAliasService.js";
import { waCustodianService } from "../../services/whatsapp-import/WhatsAppCustodianService.js";
import { waExtractionService } from "../../services/whatsapp-import/WhatsAppExtractionService.js";
import { runReconciliation } from "../../services/whatsapp-import/ReconciliationService.js";
import {
  approveCandidate,
  rejectCandidate,
  bulkApprove,
  postApprovedTransaction,
  generatePostingPlan,
  updateCandidateFields,
  mergeCandidates,
  splitCandidate,
} from "../../services/whatsapp-import/WhatsAppPostingService.js";
import { reconcileAllCustodians } from "../../services/whatsapp-import/CustodianReconciliation.js";
import { processMediaForBatch } from "../../services/whatsapp-import/MediaProcessingService.js";
import { nameExtractionService, runNameExtractionMigration, normalizeForMatching } from "../../services/whatsapp-import/NameExtractionService.js";
import { autoLinkingService } from "../../services/whatsapp-import/AutoLinkingService.js";

const ALLOWED_MEDIA_ROOT = path.resolve("uploads/wa-import");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
});

const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req: any) => req.user?.user_id || req.ip,
  message: { error: "Too many upload requests. Please wait before trying again." },
  standardHeaders: true,
  legacyHeaders: false,
});

const extractReconcileRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req: any) => req.user?.user_id || req.ip,
  message: { error: "Too many requests. Please wait before trying again." },
  standardHeaders: true,
  legacyHeaders: false,
});

const approveRejectRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req: any) => req.user?.user_id || req.ip,
  message: { error: "Too many review requests. Please wait before trying again." },
  standardHeaders: true,
  legacyHeaders: false,
});

const idParamSchema = z.object({ id: z.string().regex(/^\d+$/) });
const candidateIdParamSchema = z.object({ candidateId: z.string().regex(/^\d+$/) });
const workerIdParamSchema = z.object({ workerId: z.string().min(1) });

async function verifyProjectAccess(userId: string, role: string, projectId: string): Promise<boolean> {
  if (role === 'admin') return true;
  const { db: database } = await import("../../db.js");
  const { userProjectPermissions } = await import("@shared/schema");
  const { eq, and } = await import("drizzle-orm");
  const perms = await database.select({ id: userProjectPermissions.id })
    .from(userProjectPermissions)
    .where(and(
      eq(userProjectPermissions.user_id, userId),
      eq(userProjectPermissions.project_id, projectId),
      eq(userProjectPermissions.canEdit, true)
    ))
    .limit(1);
  return perms.length > 0;
}

const paginationQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).optional(),
  offset: z.string().regex(/^\d+$/).optional(),
});

const searchQuerySchema = z.object({
  q: z.string().max(200).optional().default(''),
});

const createAliasSchema = z.object({
  aliasName: z.string().min(1).max(200),
  canonicalWorkerId: z.string().min(1),
});

const updateAliasSchema = z.object({
  aliasName: z.string().min(1).max(200).optional(),
  canonicalWorkerId: z.string().min(1).optional(),
});

const reconcileBodySchema = z.object({
  otherBatchIds: z.array(z.number().int().positive()).optional().default([]),
  tolerancePercent: z.number().min(0).max(100).optional().default(1),
});

const updateCandidateSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  description: z.string().max(1000).optional(),
  candidateType: z.enum(['expense', 'transfer', 'loan', 'custodian_receipt', 'settlement', 'salary', 'inline_expense', 'structured_receipt']).optional(),
  category: z.string().max(100).optional(),
}).refine(d => d.amount !== undefined || d.description !== undefined || d.candidateType !== undefined || d.category !== undefined, {
  message: "Provide at least one field to update",
});

const mergeBodySchema = z.object({
  candidateIds: z.array(z.number().int().positive()).min(2),
  projectId: z.string().min(1),
});

const splitBodySchema = z.object({
  projectId: z.string().min(1),
  splits: z.array(z.object({
    amount: z.string().regex(/^\d+(\.\d+)?$/),
    description: z.string().max(1000).optional(),
  })).min(2),
});

const approveBodySchema = z.object({
  projectId: z.string().min(1),
  notes: z.string().optional(),
});

const rejectBodySchema = z.object({
  reason: z.string().min(1),
});

const bulkApproveBodySchema = z.object({
  minConfidence: z.number().min(0).max(1).optional().default(0.95),
  projectId: z.string().min(1),
});

const batchIdParamSchema = z.object({ batchId: z.string().regex(/^\d+$/) });

const linkNameBodySchema = z.object({
  entityId: z.string().min(1),
  entityTable: z.string().min(1).optional(),
  reason: z.string().optional(),
});

const unlinkNameBodySchema = z.object({
  reason: z.string().optional(),
});

const bulkLinkBodySchema = z.object({
  links: z.array(z.object({
    aliasId: z.number().int().positive(),
    entityId: z.string().min(1),
    entityTable: z.string().min(1).optional(),
  })).min(1),
});

const entityAliasQuerySchema = z.object({
  entityType: z.string().optional(),
  isVerified: z.enum(['true', 'false']).optional(),
  batchId: z.string().regex(/^\d+$/).optional(),
});

const createEntityAliasSchema = z.object({
  aliasName: z.string().min(1).max(200),
  entityType: z.string().min(1).max(100).optional(),
  canonicalEntityId: z.string().optional(),
  entityTable: z.string().optional(),
  extractionMethod: z.string().optional(),
  confidence: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  context: z.string().max(1000).optional(),
});

const updateEntityAliasSchema = z.object({
  aliasName: z.string().min(1).max(200).optional(),
  entityType: z.string().min(1).max(100).optional(),
  canonicalEntityId: z.string().nullable().optional(),
  entityTable: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  confidence: z.string().regex(/^\d+(\.\d+)?$/).optional(),
});

const createTransferCompanySchema = z.object({
  code: z.string().min(1).max(100),
  displayName: z.string().min(1).max(200),
  keywords: z.array(z.string().min(1)).min(1),
  keywordsNormalized: z.array(z.string().min(1)).min(1),
});

const updateTransferCompanySchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  keywords: z.array(z.string().min(1)).min(1).optional(),
  keywordsNormalized: z.array(z.string().min(1)).min(1).optional(),
  isActive: z.boolean().optional(),
});

const waImportRouter = Router();

waImportRouter.post("/upload", requireAuth, requireAdminOrEditor, uploadRateLimit, upload.single("file"), async (req: AuthenticatedRequest, res) => {
  try {
    if (!(req as any).file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = (req as any).file;
    if (!file.originalname.toLowerCase().endsWith(".zip")) {
      return res.status(400).json({ error: "Only ZIP files are accepted" });
    }

    const batch = await waIngestionService.processZipUpload(
      file.buffer,
      file.originalname,
      req.user!.user_id
    );

    if (batch.status === 'failed') {
      return res.status(500).json({ error: batch.errorMessage || "Processing failed", batch });
    }

    res.json({ batch });
  } catch (error: any) {
    if (error.message?.includes("Duplicate ZIP")) {
      return res.status(409).json({ error: error.message });
    }
    if (error.message?.includes("No chat TXT")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("[WAImport] Upload error:", error);
    res.status(500).json({ error: "Failed to process upload" });
  }
});

waImportRouter.delete("/batches/:batchId", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const batchId = parseInt(req.params.batchId);
    if (isNaN(batchId)) return res.status(400).json({ error: "Invalid batch ID" });

    const { db: database } = await import("../../db.js");
    const {
      waImportBatches, waEntityAliases, waRawMessages, waMediaAssets,
      waExtractionCandidates, waTransactionEvidenceLinks, waCanonicalTransactions,
      waProjectHypotheses, waVerificationQueue, waPostingResults, waReviewActions,
      waDedupKeys, waCustodianEntries
    } = await import("@shared/schema");
    const { eq, inArray, sql } = await import("drizzle-orm");

    const batch = await database.select().from(waImportBatches).where(eq(waImportBatches.id, batchId)).limit(1);
    if (batch.length === 0) return res.status(404).json({ error: "Batch not found" });

    const candidateIds = (await database.select({ id: waExtractionCandidates.id })
      .from(waExtractionCandidates)
      .where(eq(waExtractionCandidates.batchId, batchId))
    ).map(c => c.id);

    const canonicalIds = candidateIds.length > 0
      ? (await database.select({ canonicalTransactionId: waExtractionCandidates.canonicalTransactionId })
          .from(waExtractionCandidates)
          .where(eq(waExtractionCandidates.batchId, batchId))
        ).map(c => c.canonicalTransactionId).filter(Boolean) as number[]
      : [];

    // Phase 1: Delete leaf tables referencing canonical transactions
    if (canonicalIds.length > 0) {
      await database.delete(waPostingResults).where(inArray(waPostingResults.canonicalTransactionId, canonicalIds));
      await database.delete(waVerificationQueue).where(inArray(waVerificationQueue.canonicalTransactionId, canonicalIds));
      await database.delete(waCustodianEntries).where(inArray(waCustodianEntries.canonicalTransactionId, canonicalIds));
    }

    // Phase 2: Delete leaf tables referencing candidates (includes reviewActions which has BOTH candidate + canonical FK)
    if (candidateIds.length > 0) {
      await database.delete(waReviewActions).where(inArray(waReviewActions.candidateId, candidateIds));
      await database.delete(waTransactionEvidenceLinks).where(inArray(waTransactionEvidenceLinks.candidateId, candidateIds));
      await database.delete(waVerificationQueue).where(inArray(waVerificationQueue.candidateId, candidateIds));
      await database.delete(waProjectHypotheses).where(inArray(waProjectHypotheses.candidateId, candidateIds));
      await database.delete(waDedupKeys).where(inArray(waDedupKeys.candidateId, candidateIds));
    }
    if (canonicalIds.length > 0) {
      await database.delete(waReviewActions).where(inArray(waReviewActions.canonicalTransactionId, canonicalIds));
    }

    // Phase 3: Delete candidates BEFORE canonical (candidates.canonical_transaction_id FK → canonical)
    await database.delete(waExtractionCandidates).where(eq(waExtractionCandidates.batchId, batchId));

    // Phase 4: Delete canonical transactions (now safe - no more FK references)
    if (canonicalIds.length > 0) {
      await database.delete(waCanonicalTransactions).where(inArray(waCanonicalTransactions.id, canonicalIds));
    }

    // Phase 5: Delete custodian entries linked to batch
    await database.delete(waCustodianEntries).where(eq(waCustodianEntries.linkedBatchId, batchId));

    // Phase 6: Delete entity aliases BEFORE raw messages (aliases.sourceMessageId FK → rawMessages)
    await database.delete(waEntityAliases).where(eq(waEntityAliases.sourceBatchId, batchId));

    // Phase 7: Delete raw messages and media
    await database.delete(waMediaAssets).where(eq(waMediaAssets.batchId, batchId));
    await database.delete(waRawMessages).where(eq(waRawMessages.batchId, batchId));

    // Phase 8: Delete the batch itself
    await database.delete(waImportBatches).where(eq(waImportBatches.id, batchId));

    console.log(`[WAImport] Batch #${batchId} fully deleted (${candidateIds.length} candidates, ${canonicalIds.length} canonical) by ${req.user?.email}`);
    res.json({ success: true, message: `تم حذف الدُفعة #${batchId} وجميع بياناتها` });
  } catch (error: any) {
    console.error("[WAImport] Delete batch error:", error);
    res.status(500).json({ error: error.message || "Failed to delete batch" });
  }
});

waImportRouter.get("/projects", requireAuth, requireAdminOrEditor, async (req: AuthenticatedRequest, res) => {
  try {
    const { db: database } = await import("../../db.js");
    const { projects, userProjectPermissions } = await import("@shared/schema");
    const { eq, and, inArray } = await import("drizzle-orm");

    const conditions: any[] = [eq(projects.is_active, true)];

    if (req.user?.role !== 'admin') {
      const userPerms = await database.select({ project_id: userProjectPermissions.project_id })
        .from(userProjectPermissions)
        .where(and(
          eq(userProjectPermissions.user_id, req.user!.user_id),
          eq(userProjectPermissions.canView, true)
        ));
      const allowedIds = userPerms.map(p => p.project_id);
      if (allowedIds.length > 0) {
        conditions.push(inArray(projects.id, allowedIds));
      } else {
        return res.json([]);
      }
    }

    const activeProjects = await database.select({
      id: projects.id,
      name: projects.name,
    })
      .from(projects)
      .where(and(...conditions));

    res.json(activeProjects);
  } catch (error) {
    console.error("[WAImport] Get projects error:", error);
    res.status(500).json({ error: "Failed to get projects" });
  }
});

waImportRouter.get("/batches", requireAuth, requireAdminOrEditor, async (_req, res) => {
  try {
    const batches = await waIngestionService.getBatches();
    res.json(batches);
  } catch (error) {
    console.error("[WAImport] Get batches error:", error);
    res.status(500).json({ error: "Failed to get batches" });
  }
});

waImportRouter.get("/batch/:id", requireAuth, requireAdminOrEditor, async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ error: "Invalid batch ID", details: params.error.issues });
    }
    const batch = await waIngestionService.getBatch(parseInt(params.data.id));
    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }
    res.json(batch);
  } catch (error) {
    console.error("[WAImport] Get batch error:", error);
    res.status(500).json({ error: "Failed to get batch" });
  }
});

waImportRouter.get("/batch/:id/messages", requireAuth, requireAdminOrEditor, async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ error: "Invalid batch ID", details: params.error.issues });
    }
    const query = paginationQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ error: "Invalid pagination params", details: query.error.issues });
    }
    const limit = query.data.limit ? parseInt(query.data.limit) : 100;
    const offset = query.data.offset ? parseInt(query.data.offset) : 0;
    const messages = await waIngestionService.getBatchMessages(
      parseInt(params.data.id),
      Math.min(limit, 500),
      offset
    );
    res.json(messages);
  } catch (error) {
    console.error("[WAImport] Get messages error:", error);
    res.status(500).json({ error: "Failed to get messages" });
  }
});

waImportRouter.get("/batch/:id/media", requireAuth, requireAdminOrEditor, async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ error: "Invalid batch ID", details: params.error.issues });
    }
    const media = await waIngestionService.getBatchMedia(parseInt(params.data.id));
    const enhanced = media.map((m: any) => ({
      ...m,
      fileAvailable: m.filePath ? existsSync(path.isAbsolute(m.filePath) ? m.filePath : path.resolve(m.filePath)) : false,
    }));
    res.json(enhanced);
  } catch (error) {
    console.error("[WAImport] Get media error:", error);
    res.status(500).json({ error: "Failed to get media" });
  }
});

const mediaIdParamSchema = z.object({ mediaId: z.string().regex(/^\d+$/) });

waImportRouter.get("/media/:mediaId/file", requireAuth, requireAdminOrEditor, async (req, res) => {
  try {
    const params = mediaIdParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ error: "Invalid media ID", details: params.error.issues });
    }
    const mediaId = parseInt(params.data.mediaId);
    const { db: database } = await import("../../db.js");
    const { waMediaAssets } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    const [asset] = await database.select()
      .from(waMediaAssets)
      .where(eq(waMediaAssets.id, mediaId))
      .limit(1);

    if (!asset) {
      return res.status(404).json({ error: "Media asset not found" });
    }

    const absolutePath = path.isAbsolute(asset.filePath) ? asset.filePath : path.resolve(asset.filePath);
    const resolvedRoot = path.resolve(ALLOWED_MEDIA_ROOT);

    if (!(absolutePath === resolvedRoot || absolutePath.startsWith(resolvedRoot + path.sep))) {
      console.warn(`[WAImport] LFI attempt blocked: ${asset.filePath} resolved to ${absolutePath}`);
      return res.status(403).json({ error: "Access denied: file path outside allowed directory" });
    }

    if (!existsSync(absolutePath)) {
      return res.status(404).json({ error: "File not found on disk" });
    }

    res.setHeader("Content-Type", asset.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(asset.originalFilename)}"`);
    res.sendFile(absolutePath);
  } catch (error) {
    console.error("[WAImport] Serve media file error:", error);
    res.status(500).json({ error: "Failed to serve media file" });
  }
});

waImportRouter.get("/aliases", requireAuth, requireAdminOrEditor, async (_req, res) => {
  try {
    const aliases = await waAliasService.getAliases();
    res.json(aliases);
  } catch (error) {
    console.error("[WAImport] Get aliases error:", error);
    res.status(500).json({ error: "Failed to get aliases" });
  }
});

waImportRouter.post("/aliases", requireAuth, requireAdminOrEditor, async (req: AuthenticatedRequest, res) => {
  try {
    const body = createAliasSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: "Invalid alias data", details: body.error.issues });
    }
    const alias = await waAliasService.createAlias({
      aliasName: body.data.aliasName,
      canonicalEntityId: body.data.canonicalWorkerId,
      entityTable: 'workers',
      createdBy: req.user!.user_id,
    });
    res.json(alias);
  } catch (error: any) {
    if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
      return res.status(409).json({ error: "This alias already exists" });
    }
    console.error("[WAImport] Create alias error:", error);
    res.status(500).json({ error: "Failed to create alias" });
  }
});

waImportRouter.put("/aliases/:id", requireAuth, requireAdminOrEditor, async (req: AuthenticatedRequest, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ error: "Invalid alias ID", details: params.error.issues });
    }
    const body = updateAliasSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: "Invalid alias data", details: body.error.issues });
    }
    const updateData: Record<string, any> = {};
    if (body.data.aliasName) updateData.aliasName = body.data.aliasName;
    if (body.data.canonicalWorkerId) updateData.canonicalEntityId = body.data.canonicalWorkerId;
    const alias = await waAliasService.updateAlias(parseInt(params.data.id), updateData);
    if (!alias) {
      return res.status(404).json({ error: "Alias not found" });
    }
    res.json(alias);
  } catch (error) {
    console.error("[WAImport] Update alias error:", error);
    res.status(500).json({ error: "Failed to update alias" });
  }
});

waImportRouter.delete("/aliases/:id", requireAuth, requireAdminOrEditor, async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ error: "Invalid alias ID", details: params.error.issues });
    }
    await waAliasService.deleteAlias(parseInt(params.data.id));
    res.json({ success: true });
  } catch (error) {
    console.error("[WAImport] Delete alias error:", error);
    res.status(500).json({ error: "Failed to delete alias" });
  }
});

waImportRouter.post("/seed-aliases", requireAuth, requireAdminOrEditor, async (_req: AuthenticatedRequest, res) => {
  res.status(410).json({ error: "Deprecated. Use POST /api/wa-import/run-migration instead." });
});

waImportRouter.post("/create-workers", requireAuth, requireAdminOrEditor, async (_req: AuthenticatedRequest, res) => {
  res.status(410).json({ error: "Deprecated. Workers are now managed through entity-aliases system." });
});

waImportRouter.get("/custodian-summaries", requireAuth, requireAdminOrEditor, async (_req, res) => {
  try {
    const summaries = await waCustodianService.getAllCustodianSummaries();
    res.json(summaries);
  } catch (error) {
    console.error("[WAImport] Get custodian summaries error:", error);
    res.status(500).json({ error: "Failed to get custodian summaries" });
  }
});

waImportRouter.get("/custodian/:workerId/entries", requireAuth, requireAdminOrEditor, async (req, res) => {
  try {
    const params = workerIdParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid worker ID", details: params.error.issues });
    const entries = await waCustodianService.getEntriesByCustodian(params.data.workerId);
    res.json(entries);
  } catch (error) {
    console.error("[WAImport] Get custodian entries error:", error);
    res.status(500).json({ error: "Failed to get custodian entries" });
  }
});

waImportRouter.post("/batch/:id/process-media", requireAuth, requireAdminOrEditor, extractReconcileRateLimit, async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid batch ID", details: params.error.issues });
    const batchId = parseInt(params.data.id);
    const batch = await waIngestionService.getBatch(batchId);
    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }
    if (batch.status !== 'completed') {
      return res.status(400).json({ error: `Batch status is '${batch.status}', must be 'completed' to process media` });
    }

    const result = await processMediaForBatch(batchId);
    res.json(result);
  } catch (error: any) {
    console.error("[WAImport] Media processing error:", error);
    res.status(500).json({ error: "فشل في معالجة الوسائط" });
  }
});

waImportRouter.post("/batch/:id/extract", requireAuth, requireAdminOrEditor, extractReconcileRateLimit, async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid batch ID", details: params.error.issues });
    const batchId = parseInt(params.data.id);
    const batch = await waIngestionService.getBatch(batchId);
    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }
    if (batch.status !== 'completed') {
      return res.status(400).json({ error: `Batch status is '${batch.status}', must be 'completed' to extract` });
    }

    try {
      await processMediaForBatch(batchId);
    } catch (ocrErr) {
      console.warn("[WAImport] OCR pre-processing failed (non-blocking):", ocrErr);
    }

    let linkingWarning: string | undefined;
    try {
      const linkingStatus = await nameExtractionService.checkLinkingReadiness(batchId);
      console.log(`[WAImport] Linking status for batch ${batchId}: ${linkingStatus.linked}/${linkingStatus.total} (${linkingStatus.linkedPercent}%)`);
      if (linkingStatus.linkedPercent < 50 && linkingStatus.total > 0) {
        linkingWarning = `Only ${linkingStatus.linkedPercent}% of discovered names are linked. Consider linking more names before extraction.`;
      }
    } catch (linkErr) {
      console.warn("[WAImport] Linking readiness check failed (non-blocking):", linkErr);
    }

    const result = await waExtractionService.extractFromBatch(batchId);
    res.json({ ...result, linkingWarning });
  } catch (error: any) {
    console.error("[WAImport] Extraction error:", error);
    res.status(500).json({ error: "Failed to extract from batch" });
  }
});

waImportRouter.get("/ai-status", requireAuth, async (_req, res) => {
  try {
    const { getAIModelsStatus } = await import("../../services/whatsapp-import/AIExtractionOrchestrator.js");
    res.json(getAIModelsStatus());
  } catch (error) {
    res.status(500).json({ available: false, models: [] });
  }
});

waImportRouter.get("/batch/:id/candidates", requireAuth, requireAdminOrEditor, async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid batch ID", details: params.error.issues });
    const candidates = await waExtractionService.getExtractionCandidates(parseInt(params.data.id));
    res.json(candidates);
  } catch (error) {
    console.error("[WAImport] Get candidates error:", error);
    res.status(500).json({ error: "Failed to get candidates" });
  }
});

waImportRouter.get("/candidate/:id", requireAuth, requireAdminOrEditor, async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid candidate ID", details: params.error.issues });
    const data = await waExtractionService.getCandidateWithEvidence(parseInt(params.data.id));
    if (!data) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    res.json(data);
  } catch (error) {
    console.error("[WAImport] Get candidate error:", error);
    res.status(500).json({ error: "Failed to get candidate" });
  }
});

waImportRouter.post("/batch/:id/reconcile", requireAuth, requireAdminOrEditor, extractReconcileRateLimit, async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ error: "Invalid batch ID", details: params.error.issues });
    }
    const body = reconcileBodySchema.safeParse(req.body || {});
    if (!body.success) {
      return res.status(400).json({ error: "Invalid reconciliation params", details: body.error.issues });
    }
    const batchId = parseInt(params.data.id);

    const report = await runReconciliation(batchId, body.data.otherBatchIds, body.data.tolerancePercent);
    res.json(report);
  } catch (error: any) {
    console.error("[WAImport] Reconciliation error:", error);
    if (error.message?.includes('No candidates found')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to reconcile batch" });
  }
});

waImportRouter.get("/batch/:id/verification-queue", requireAuth, requireAdminOrEditor, async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid batch ID", details: params.error.issues });
    const batchId = parseInt(params.data.id);
    const { db: database } = await import("../../db.js");
    const { waVerificationQueue, waExtractionCandidates } = await import("@shared/schema");
    const { eq, and } = await import("drizzle-orm");

    const items = await database.select()
      .from(waVerificationQueue)
      .innerJoin(waExtractionCandidates, eq(waVerificationQueue.candidateId, waExtractionCandidates.id))
      .where(eq(waExtractionCandidates.batchId, batchId));

    res.json(items);
  } catch (error) {
    console.error("[WAImport] Verification queue error:", error);
    res.status(500).json({ error: "Failed to get verification queue" });
  }
});

waImportRouter.post("/candidate/:id/approve", requireAuth, requireAdminOrEditor, approveRejectRateLimit, async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ error: "Invalid candidate ID", details: params.error.issues });
    }
    const body = approveBodySchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: "Invalid approval data", details: body.error.issues });
    }
    const reviewerId = (req as any).user?.user_id;
    const reviewerRole = (req as any).user?.role || '';
    if (!reviewerId) return res.status(401).json({ error: "Reviewer not identified" });

    if (body.data.projectId) {
      const hasAccess = await verifyProjectAccess(reviewerId, reviewerRole, body.data.projectId);
      if (!hasAccess) return res.status(403).json({ error: "ليس لديك صلاحية على هذا المشروع" });
    }

    const result = await approveCandidate(parseInt(params.data.id), reviewerId, body.data.projectId, body.data.notes);
    res.json(result);
  } catch (error: any) {
    console.error("[WAImport] Approve error:", error);
    res.status(500).json({ error: error.message || "Failed to approve candidate" });
  }
});

waImportRouter.post("/candidate/:id/reject", requireAuth, requireAdminOrEditor, approveRejectRateLimit, async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ error: "Invalid candidate ID", details: params.error.issues });
    }
    const body = rejectBodySchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: "Invalid rejection data", details: body.error.issues });
    }
    const reviewerId = (req as any).user?.user_id;
    if (!reviewerId) return res.status(401).json({ error: "Reviewer not identified" });

    await rejectCandidate(parseInt(params.data.id), reviewerId, body.data.reason);
    res.json({ success: true });
  } catch (error: any) {
    console.error("[WAImport] Reject error:", error);
    res.status(500).json({ error: error.message || "Failed to reject candidate" });
  }
});

waImportRouter.post("/batch/:id/bulk-approve", requireAuth, requireAdminOrEditor, approveRejectRateLimit, async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ error: "Invalid batch ID", details: params.error.issues });
    }
    const body = bulkApproveBodySchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: "Invalid bulk approve data", details: body.error.issues });
    }
    const reviewerId = (req as any).user?.user_id;
    const reviewerRole = (req as any).user?.role || '';
    if (!reviewerId) return res.status(401).json({ error: "Reviewer not identified" });

    if (body.data.projectId) {
      const hasAccess = await verifyProjectAccess(reviewerId, reviewerRole, body.data.projectId);
      if (!hasAccess) return res.status(403).json({ error: "ليس لديك صلاحية على هذا المشروع" });
    }

    const result = await bulkApprove(parseInt(params.data.id), reviewerId, body.data.minConfidence, body.data.projectId);
    res.json(result);
  } catch (error: any) {
    console.error("[WAImport] Bulk approve error:", error);
    res.status(500).json({ error: error.message || "Failed to bulk approve" });
  }
});

waImportRouter.post("/batch/:id/dry-run", requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid batch ID", details: params.error.issues });
    const batchId = parseInt(params.data.id);
    const plan = await generatePostingPlan(batchId);
    res.json({ dryRun: true, items: plan, totalAmount: plan.reduce((sum, p) => sum + p.amount, 0) });
  } catch (error: any) {
    console.error("[WAImport] Dry-run error:", error);
    res.status(500).json({ error: error.message || "Failed to generate posting plan" });
  }
});

waImportRouter.post("/canonical/:id/post", requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid canonical ID", details: params.error.issues });
    const canonicalId = parseInt(params.data.id);
    const postedBy = (req as any).user?.user_id;
    if (!postedBy) return res.status(401).json({ error: "User not identified" });

    const result = await postApprovedTransaction(canonicalId, postedBy);
    res.json(result);
  } catch (error: any) {
    console.error("[WAImport] Posting error:", error);
    res.status(500).json({ error: error.message || "Failed to post transaction" });
  }
});

waImportRouter.get("/custodian-statements", requireAuth, requireAdminOrEditor, async (_req, res) => {
  try {
    const statements = await reconcileAllCustodians();
    res.json(statements);
  } catch (error: any) {
    console.error("[WAImport] Custodian statements error:", error);
    res.status(500).json({ error: "Failed to get custodian statements" });
  }
});

waImportRouter.get("/review-actions/:candidateId", requireAuth, requireAdminOrEditor, async (req, res) => {
  try {
    const params = candidateIdParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid candidate ID", details: params.error.issues });
    const candidateId = parseInt(params.data.candidateId);
    const { db: database } = await import("../../db.js");
    const { waReviewActions } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    const actions = await database.select()
      .from(waReviewActions)
      .where(eq(waReviewActions.candidateId, candidateId));

    res.json(actions);
  } catch (error) {
    console.error("[WAImport] Review actions error:", error);
    res.status(500).json({ error: "Failed to get review actions" });
  }
});

waImportRouter.patch("/candidate/:id", requireAuth, requireAdminOrEditor, approveRejectRateLimit, async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid candidate ID", details: params.error.issues });
    const body = updateCandidateSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid update data", details: body.error.issues });
    const candidateId = parseInt(params.data.id);
    const reviewerId = (req as any).user?.user_id;
    if (!reviewerId) return res.status(401).json({ error: "User not identified" });

    const updated = await updateCandidateFields(candidateId, reviewerId, body.data);
    res.json(updated);
  } catch (error: any) {
    console.error("[WAImport] Update candidate error:", error);
    res.status(500).json({ error: error.message || "Failed to update candidate" });
  }
});

waImportRouter.post("/candidates/merge", requireAuth, requireAdminOrEditor, approveRejectRateLimit, async (req, res) => {
  try {
    const body = mergeBodySchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid merge data", details: body.error.issues });
    const reviewerId = (req as any).user?.user_id;
    const reviewerRole = (req as any).user?.role || '';
    if (!reviewerId) return res.status(401).json({ error: "User not identified" });

    if (body.data.projectId) {
      const hasAccess = await verifyProjectAccess(reviewerId, reviewerRole, body.data.projectId);
      if (!hasAccess) return res.status(403).json({ error: "ليس لديك صلاحية على هذا المشروع" });
    }

    const result = await mergeCandidates(body.data.candidateIds, reviewerId, body.data.projectId);
    res.json(result);
  } catch (error: any) {
    console.error("[WAImport] Merge candidates error:", error);
    res.status(500).json({ error: error.message || "Failed to merge candidates" });
  }
});

waImportRouter.post("/candidate/:id/split", requireAuth, requireAdminOrEditor, approveRejectRateLimit, async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid candidate ID", details: params.error.issues });
    const body = splitBodySchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid split data", details: body.error.issues });
    const candidateId = parseInt(params.data.id);
    const reviewerId = (req as any).user?.user_id;
    const reviewerRole = (req as any).user?.role || '';
    if (!reviewerId) return res.status(401).json({ error: "User not identified" });

    if (body.data.projectId) {
      const hasAccess = await verifyProjectAccess(reviewerId, reviewerRole, body.data.projectId);
      if (!hasAccess) return res.status(403).json({ error: "ليس لديك صلاحية على هذا المشروع" });
    }

    const result = await splitCandidate(candidateId, reviewerId, body.data.projectId, body.data.splits as { amount: string; description: string }[]);
    res.json(result);
  } catch (error: any) {
    console.error("[WAImport] Split candidate error:", error);
    res.status(500).json({ error: error.message || "Failed to split candidate" });
  }
});

waImportRouter.get("/inter-contractor-loans", requireAuth, requireAdminOrEditor, async (_req, res) => {
  try {
    const { db: database } = await import("../../db.js");
    const { waExtractionCandidates } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    const loans = await database.select()
      .from(waExtractionCandidates)
      .where(eq(waExtractionCandidates.candidateType, 'loan'));

    res.json(loans);
  } catch (error) {
    console.error("[WAImport] Inter-contractor loans error:", error);
    res.status(500).json({ error: "Failed to get inter-contractor loans" });
  }
});

waImportRouter.get("/workers-search", requireAuth, requireAdminOrEditor, async (req, res) => {
  try {
    const query = searchQuerySchema.safeParse(req.query);
    if (!query.success) return res.status(400).json({ error: "Invalid search query", details: query.error.issues });
    const q = query.data.q;
    const { db: database } = await import("../../db.js");
    const { workers, projects, accountTypes } = await import("@shared/schema");
    const { ilike, eq, sql: sqlFn } = await import("drizzle-orm");

    const searchLimit = q ? 30 : 100;
    const condition = q ? ilike(workers.name, `%${q}%`) : undefined;

    const workerResults = await database.select({ id: workers.id, name: workers.name })
      .from(workers)
      .where(condition)
      .limit(searchLimit);

    const projectCondition = q ? ilike(projects.name, `%${q}%`) : eq(projects.is_active, true);
    const projectResults = await database.select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(projectCondition)
      .limit(30);

    let accountResults: { id: string; name: string }[] = [];
    try {
      const accountCondition = q ? ilike(accountTypes.nameAr, `%${q}%`) : undefined;
      const rawAccounts = await database.select({ id: accountTypes.id, name: accountTypes.nameAr })
        .from(accountTypes)
        .where(accountCondition)
        .limit(30);
      accountResults = rawAccounts.map(a => ({ id: String(a.id), name: a.name }));
    } catch (_err) {
      /* accountTypes table may not exist */
    }

    res.json({
      workers: workerResults.map(w => ({ ...w, entityTable: 'workers', entityLabel: 'عامل' })),
      projects: projectResults.map(p => ({ ...p, entityTable: 'projects', entityLabel: 'مشروع' })),
      accounts: accountResults.map(a => ({ ...a, entityTable: 'account_types', entityLabel: 'حساب' })),
      all: [
        ...workerResults.map(w => ({ ...w, entityTable: 'workers', entityLabel: 'عامل' })),
        ...projectResults.map(p => ({ ...p, entityTable: 'projects', entityLabel: 'مشروع' })),
        ...accountResults.map(a => ({ ...a, entityTable: 'account_types', entityLabel: 'حساب' })),
      ],
    });
  } catch (error) {
    console.error("[WAImport] Workers search error:", error);
    res.status(500).json({ error: "Failed to search workers" });
  }
});

waImportRouter.post("/batches/:batchId/extract-names", requireAuth, requireAdminOrEditor, extractReconcileRateLimit, async (req: AuthenticatedRequest, res) => {
  try {
    const params = batchIdParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid batch ID", details: params.error.issues });
    const batchId = parseInt(params.data.batchId);
    const batch = await waIngestionService.getBatch(batchId);
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const result = await nameExtractionService.extractNamesFromBatch(batchId);
    res.json(result);
  } catch (error: any) {
    console.error("[WAImport] Name extraction error:", error);
    res.status(500).json({ error: error.message || "Failed to extract names" });
  }
});

waImportRouter.get("/batches/:batchId/discovered-names", requireAuth, requireAdminOrEditor, async (req, res) => {
  try {
    const params = batchIdParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid batch ID", details: params.error.issues });
    const batchId = parseInt(params.data.batchId);
    const names = await nameExtractionService.getDiscoveredNames(batchId);
    res.json(names);
  } catch (error) {
    console.error("[WAImport] Get discovered names error:", error);
    res.status(500).json({ error: "Failed to get discovered names" });
  }
});

waImportRouter.get("/unlinked-names", requireAuth, requireAdminOrEditor, async (_req, res) => {
  try {
    const names = await nameExtractionService.getUnlinkedNames();
    res.json(names);
  } catch (error) {
    console.error("[WAImport] Get unlinked names error:", error);
    res.status(500).json({ error: "Failed to get unlinked names" });
  }
});

waImportRouter.post("/names/:id/link", requireAuth, requireAdminOrEditor, async (req: AuthenticatedRequest, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid alias ID", details: params.error.issues });
    const body = linkNameBodySchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid link data", details: body.error.issues });
    const aliasId = parseInt(params.data.id);
    const userId = req.user!.user_id;

    await nameExtractionService.linkNameToEntity(
      aliasId,
      body.data.entityId,
      body.data.entityTable || 'workers',
      userId,
      body.data.reason
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error("[WAImport] Link name error:", error);
    res.status(500).json({ error: error.message || "Failed to link name" });
  }
});

waImportRouter.post("/names/:id/unlink", requireAuth, requireAdminOrEditor, async (req: AuthenticatedRequest, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid alias ID", details: params.error.issues });
    const body = unlinkNameBodySchema.safeParse(req.body || {});
    if (!body.success) return res.status(400).json({ error: "Invalid unlink data", details: body.error.issues });
    const aliasId = parseInt(params.data.id);
    const userId = req.user!.user_id;

    await nameExtractionService.unlinkName(aliasId, userId, body.data.reason);
    res.json({ success: true });
  } catch (error: any) {
    console.error("[WAImport] Unlink name error:", error);
    res.status(500).json({ error: error.message || "Failed to unlink name" });
  }
});

waImportRouter.post("/names/:id/dismiss", requireAuth, requireAdminOrEditor, async (req: AuthenticatedRequest, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid alias ID", details: params.error.issues });
    const aliasId = parseInt(params.data.id);
    const { db: database } = await import("../../db.js");
    const { waEntityAliases } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    await database.update(waEntityAliases)
      .set({ isActive: false })
      .where(eq(waEntityAliases.id, aliasId));
    res.json({ success: true });
  } catch (error: any) {
    console.error("[WAImport] Dismiss name error:", error);
    res.status(500).json({ error: error.message || "Failed to dismiss name" });
  }
});

waImportRouter.post("/names/bulk-link", requireAuth, requireAdminOrEditor, async (req: AuthenticatedRequest, res) => {
  try {
    const body = bulkLinkBodySchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid bulk link data", details: body.error.issues });
    const userId = req.user!.user_id;

    await nameExtractionService.bulkLinkNames(body.data.links, userId);
    res.json({ success: true, linked: body.data.links.length });
  } catch (error: any) {
    console.error("[WAImport] Bulk link error:", error);
    res.status(500).json({ error: error.message || "Failed to bulk link names" });
  }
});

waImportRouter.post("/names/auto-link", requireAuth, requireAdminOrEditor, async (req, res) => {
  try {
    const batchId = req.body?.batchId ? parseInt(req.body.batchId) : undefined;
    const result = await nameExtractionService.autoLinkByExactMatch(batchId && !isNaN(batchId) ? batchId : undefined);
    res.json(result);
  } catch (error: any) {
    console.error("[WAImport] Auto-link error:", error);
    res.status(500).json({ error: error.message || "Failed to auto-link names" });
  }
});

waImportRouter.get("/batches/:batchId/linking-status", requireAuth, requireAdminOrEditor, async (req, res) => {
  try {
    const params = batchIdParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid batch ID", details: params.error.issues });
    const batchId = parseInt(params.data.batchId);
    const status = await nameExtractionService.checkLinkingReadiness(batchId);
    res.json(status);
  } catch (error) {
    console.error("[WAImport] Linking status error:", error);
    res.status(500).json({ error: "Failed to get linking status" });
  }
});

waImportRouter.get("/entity-aliases", requireAuth, requireAdminOrEditor, async (req, res) => {
  try {
    const query = entityAliasQuerySchema.safeParse(req.query);
    if (!query.success) return res.status(400).json({ error: "Invalid query params", details: query.error.issues });

    const { db: database } = await import("../../db.js");
    const { waEntityAliases } = await import("@shared/schema");
    const { eq, and } = await import("drizzle-orm");

    const conditions: any[] = [];
    if (query.data.entityType) {
      conditions.push(eq(waEntityAliases.entityType, query.data.entityType));
    }
    if (query.data.isVerified !== undefined) {
      conditions.push(eq(waEntityAliases.isVerified, query.data.isVerified === 'true'));
    }
    if (query.data.batchId) {
      conditions.push(eq(waEntityAliases.sourceBatchId, parseInt(query.data.batchId)));
    }

    let results;
    if (conditions.length > 0) {
      results = await database.select().from(waEntityAliases).where(and(...conditions)).orderBy(waEntityAliases.aliasName);
    } else {
      results = await database.select().from(waEntityAliases).orderBy(waEntityAliases.aliasName);
    }
    res.json(results);
  } catch (error) {
    console.error("[WAImport] Get entity aliases error:", error);
    res.status(500).json({ error: "Failed to get entity aliases" });
  }
});

waImportRouter.post("/entity-aliases", requireAuth, requireAdminOrEditor, async (req: AuthenticatedRequest, res) => {
  try {
    const body = createEntityAliasSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid entity alias data", details: body.error.issues });

    const { db: database } = await import("../../db.js");
    const { waEntityAliases } = await import("@shared/schema");

    const normalizedName = normalizeForMatching(body.data.aliasName);

    const [created] = await database.insert(waEntityAliases).values({
      aliasName: body.data.aliasName,
      aliasNameNormalized: normalizedName,
      entityType: body.data.entityType || 'عامل',
      canonicalEntityId: body.data.canonicalEntityId || null,
      entityTable: body.data.entityTable || 'workers',
      extractionMethod: body.data.extractionMethod || 'manual',
      confidence: body.data.confidence || '0',
      context: body.data.context || null,
      createdBy: req.user!.user_id,
      isVerified: !!body.data.canonicalEntityId,
    }).returning();

    res.json(created);
  } catch (error: any) {
    if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
      return res.status(409).json({ error: "This entity alias already exists" });
    }
    console.error("[WAImport] Create entity alias error:", error);
    res.status(500).json({ error: "Failed to create entity alias" });
  }
});

waImportRouter.put("/entity-aliases/:id", requireAuth, requireAdminOrEditor, async (req: AuthenticatedRequest, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid alias ID", details: params.error.issues });
    const body = updateEntityAliasSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid update data", details: body.error.issues });

    const { db: database } = await import("../../db.js");
    const { waEntityAliases } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    const aliasId = parseInt(params.data.id);
    const updateData: Record<string, any> = { ...body.data, updatedBy: req.user!.user_id };
    if (body.data.aliasName) {
      updateData.aliasNameNormalized = normalizeForMatching(body.data.aliasName);
    }

    const oldRecord = await database.select().from(waEntityAliases).where(eq(waEntityAliases.id, aliasId)).limit(1);

    const [updated] = await database.update(waEntityAliases)
      .set(updateData)
      .where(eq(waEntityAliases.id, aliasId))
      .returning();

    if (!updated) return res.status(404).json({ error: "Entity alias not found" });

    if (oldRecord[0] && body.data.canonicalEntityId !== undefined &&
        oldRecord[0].canonicalEntityId !== body.data.canonicalEntityId) {
      const { waEntityLinkAudit } = await import("@shared/schema");
      const action = body.data.canonicalEntityId ? 'link' : 'unlink';
      await database.insert(waEntityLinkAudit).values({
        entityAliasId: aliasId,
        action,
        newEntityId: body.data.canonicalEntityId || null,
        newEntityTable: body.data.entityTable || updated.entityTable,
        oldEntityId: oldRecord[0].canonicalEntityId || null,
        oldEntityTable: oldRecord[0].entityTable || null,
        performedBy: req.user!.user_id,
        reason: 'updated_via_entity_alias_endpoint',
      });
    }

    res.json(updated);
  } catch (error) {
    console.error("[WAImport] Update entity alias error:", error);
    res.status(500).json({ error: "Failed to update entity alias" });
  }
});

waImportRouter.delete("/entity-aliases/:id", requireAuth, requireAdminOrEditor, async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid alias ID", details: params.error.issues });

    const { db: database } = await import("../../db.js");
    const { waEntityAliases } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    await database.delete(waEntityAliases).where(eq(waEntityAliases.id, parseInt(params.data.id)));
    res.json({ success: true });
  } catch (error) {
    console.error("[WAImport] Delete entity alias error:", error);
    res.status(500).json({ error: "Failed to delete entity alias" });
  }
});

waImportRouter.get("/entity-aliases/:id/audit", requireAuth, requireAdminOrEditor, async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid alias ID", details: params.error.issues });

    const { db: database } = await import("../../db.js");
    const { waEntityLinkAudit } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    const auditEntries = await database.select()
      .from(waEntityLinkAudit)
      .where(eq(waEntityLinkAudit.entityAliasId, parseInt(params.data.id)))
      .orderBy(waEntityLinkAudit.performedAt);

    res.json(auditEntries);
  } catch (error) {
    console.error("[WAImport] Get alias audit error:", error);
    res.status(500).json({ error: "Failed to get alias audit trail" });
  }
});

waImportRouter.get("/transfer-companies", requireAuth, requireAdminOrEditor, async (_req, res) => {
  try {
    const { db: database } = await import("../../db.js");
    const { waTransferCompanies } = await import("@shared/schema");

    const companies = await database.select().from(waTransferCompanies).orderBy(waTransferCompanies.displayName);
    res.json(companies);
  } catch (error) {
    console.error("[WAImport] Get transfer companies error:", error);
    res.status(500).json({ error: "Failed to get transfer companies" });
  }
});

waImportRouter.post("/transfer-companies", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const body = createTransferCompanySchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid transfer company data", details: body.error.issues });

    const { db: database } = await import("../../db.js");
    const { waTransferCompanies } = await import("@shared/schema");

    const [created] = await database.insert(waTransferCompanies).values({
      code: body.data.code,
      displayName: body.data.displayName,
      keywords: body.data.keywords,
      keywordsNormalized: body.data.keywordsNormalized,
      createdBy: req.user!.user_id,
    }).returning();

    res.json(created);
  } catch (error: any) {
    if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
      return res.status(409).json({ error: "A transfer company with this code already exists" });
    }
    console.error("[WAImport] Create transfer company error:", error);
    res.status(500).json({ error: "Failed to create transfer company" });
  }
});

waImportRouter.put("/transfer-companies/:id", requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid company ID", details: params.error.issues });
    const body = updateTransferCompanySchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid update data", details: body.error.issues });

    const { db: database } = await import("../../db.js");
    const { waTransferCompanies } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    const [updated] = await database.update(waTransferCompanies)
      .set(body.data)
      .where(eq(waTransferCompanies.id, parseInt(params.data.id)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Transfer company not found" });
    res.json(updated);
  } catch (error) {
    console.error("[WAImport] Update transfer company error:", error);
    res.status(500).json({ error: "Failed to update transfer company" });
  }
});

waImportRouter.delete("/transfer-companies/:id", requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid company ID", details: params.error.issues });

    const { db: database } = await import("../../db.js");
    const { waTransferCompanies } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    await database.delete(waTransferCompanies).where(eq(waTransferCompanies.id, parseInt(params.data.id)));
    res.json({ success: true });
  } catch (error) {
    console.error("[WAImport] Delete transfer company error:", error);
    res.status(500).json({ error: "Failed to delete transfer company" });
  }
});

const verifyAutoLinkBodySchema = z.object({
  decision: z.enum(['accepted', 'rejected']),
});

const bulkVerifyAutoLinksBodySchema = z.object({
  minConfidence: z.number().min(0).max(1).optional().default(0.90),
});

waImportRouter.get("/batch/:id/auto-links", requireAuth, requireAdminOrEditor, async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid batch ID", details: params.error.issues });
    const batchId = parseInt(params.data.id);

    let links = autoLinkingService.getAutoLinks(batchId);
    if (links.length === 0) {
      links = await autoLinkingService.generateAutoLinks(batchId);
    }
    const summary = autoLinkingService.getAutoLinkSummary(batchId);
    res.json({ links, summary });
  } catch (error: any) {
    console.error("[WAImport] Get auto-links error:", error);
    res.status(500).json({ error: error.message || "Failed to get auto-links" });
  }
});

waImportRouter.post("/batch/:id/auto-links/generate", requireAuth, requireAdminOrEditor, extractReconcileRateLimit, async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid batch ID", details: params.error.issues });
    const batchId = parseInt(params.data.id);

    const links = await autoLinkingService.generateAutoLinks(batchId);
    const summary = autoLinkingService.getAutoLinkSummary(batchId);
    res.json({ links, summary });
  } catch (error: any) {
    console.error("[WAImport] Generate auto-links error:", error);
    res.status(500).json({ error: error.message || "Failed to generate auto-links" });
  }
});

waImportRouter.post("/auto-links/:id/verify", requireAuth, requireAdminOrEditor, approveRejectRateLimit, async (req: AuthenticatedRequest, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid link ID", details: params.error.issues });
    const body = verifyAutoLinkBodySchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid body", details: body.error.issues });

    const linkId = parseInt(params.data.id);
    const userId = req.user!.user_id;

    const batchIdParam = req.query.batchId ? parseInt(req.query.batchId as string) : null;
    if (!batchIdParam) {
      return res.status(400).json({ error: "batchId query parameter is required" });
    }

    const result = autoLinkingService.verifyLink(batchIdParam, linkId, body.data.decision, userId);
    if (!result) return res.status(404).json({ error: "Auto-link not found" });
    res.json(result);
  } catch (error: any) {
    console.error("[WAImport] Verify auto-link error:", error);
    res.status(500).json({ error: error.message || "Failed to verify auto-link" });
  }
});

waImportRouter.post("/batch/:id/auto-links/bulk-verify", requireAuth, requireAdminOrEditor, approveRejectRateLimit, async (req: AuthenticatedRequest, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid batch ID", details: params.error.issues });
    const body = bulkVerifyAutoLinksBodySchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid body", details: body.error.issues });

    const batchId = parseInt(params.data.id);
    const userId = req.user!.user_id;
    const result = autoLinkingService.bulkVerify(batchId, body.data.minConfidence, userId);
    const summary = autoLinkingService.getAutoLinkSummary(batchId);
    res.json({ ...result, summary });
  } catch (error: any) {
    console.error("[WAImport] Bulk verify auto-links error:", error);
    res.status(500).json({ error: error.message || "Failed to bulk verify auto-links" });
  }
});

waImportRouter.get("/batch/:id/metrics", requireAuth, requireAdminOrEditor, async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid batch ID", details: params.error.issues });
    const { getMetrics } = await import("../../services/whatsapp-import/AIMetricsService.js");
    const metrics = getMetrics(parseInt(params.data.id));
    if (!metrics) {
      return res.status(404).json({ error: "No metrics found for this batch. Run extraction first." });
    }
    res.json(metrics);
  } catch (error) {
    console.error("[WAImport] Get metrics error:", error);
    res.status(500).json({ error: "Failed to get batch metrics" });
  }
});

waImportRouter.post("/run-migration", requireAuth, requireRole('admin'), async (_req: AuthenticatedRequest, res) => {
  try {
    const result = await runNameExtractionMigration();
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error("[WAImport] Migration error:", error);
    res.status(500).json({ error: error.message || "Failed to run migration" });
  }
});

export default waImportRouter;
