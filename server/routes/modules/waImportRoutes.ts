import { Router } from "express";
import multer from "multer";
import { z } from "zod";
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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
});

const idParamSchema = z.object({ id: z.string().regex(/^\d+$/) });
const candidateIdParamSchema = z.object({ candidateId: z.string().regex(/^\d+$/) });
const workerIdParamSchema = z.object({ workerId: z.string().min(1) });

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
}).refine(d => d.amount !== undefined || d.description !== undefined, {
  message: "Provide amount or description to update",
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

const waImportRouter = Router();

waImportRouter.post("/upload", requireAuth, requireAdminOrEditor, upload.single("file"), async (req: AuthenticatedRequest, res) => {
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
    res.json(media);
  } catch (error) {
    console.error("[WAImport] Get media error:", error);
    res.status(500).json({ error: "Failed to get media" });
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
      canonicalWorkerId: body.data.canonicalWorkerId,
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
    const alias = await waAliasService.updateAlias(parseInt(params.data.id), body.data);
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

waImportRouter.post("/seed-aliases", requireAuth, requireAdminOrEditor, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await waAliasService.seedAliases(req.user!.user_id);
    res.json(result);
  } catch (error) {
    console.error("[WAImport] Seed aliases error:", error);
    res.status(500).json({ error: "Failed to seed aliases" });
  }
});

waImportRouter.post("/create-workers", requireAuth, requireAdminOrEditor, async (req: AuthenticatedRequest, res) => {
  try {
    const ids = await waAliasService.createMissingWorkers(req.user!.user_id);
    res.json({ createdWorkerIds: ids });
  } catch (error) {
    console.error("[WAImport] Create workers error:", error);
    res.status(500).json({ error: "Failed to create workers" });
  }
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

waImportRouter.post("/batch/:id/extract", requireAuth, requireAdminOrEditor, async (req, res) => {
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

    const result = await waExtractionService.extractFromBatch(batchId);
    res.json(result);
  } catch (error: any) {
    if (error.message?.includes('already has extraction candidates')) {
      return res.status(409).json({ error: error.message });
    }
    console.error("[WAImport] Extraction error:", error);
    res.status(500).json({ error: "Failed to extract from batch" });
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

waImportRouter.post("/batch/:id/reconcile", requireAuth, requireAdminOrEditor, async (req, res) => {
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

waImportRouter.post("/candidate/:id/approve", requireAuth, requireAdminOrEditor, async (req, res) => {
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
    if (!reviewerId) return res.status(401).json({ error: "Reviewer not identified" });

    const result = await approveCandidate(parseInt(params.data.id), reviewerId, body.data.projectId, body.data.notes);
    res.json(result);
  } catch (error: any) {
    console.error("[WAImport] Approve error:", error);
    res.status(500).json({ error: error.message || "Failed to approve candidate" });
  }
});

waImportRouter.post("/candidate/:id/reject", requireAuth, requireAdminOrEditor, async (req, res) => {
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

waImportRouter.post("/batch/:id/bulk-approve", requireAuth, requireAdminOrEditor, async (req, res) => {
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
    if (!reviewerId) return res.status(401).json({ error: "Reviewer not identified" });

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

waImportRouter.get("/custodian-statements", requireAuth, requireAdminOrEditor, async (req, res) => {
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

waImportRouter.patch("/candidate/:id", requireAuth, requireAdminOrEditor, async (req, res) => {
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

waImportRouter.post("/candidates/merge", requireAuth, requireAdminOrEditor, async (req, res) => {
  try {
    const body = mergeBodySchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid merge data", details: body.error.issues });
    const reviewerId = (req as any).user?.user_id;
    if (!reviewerId) return res.status(401).json({ error: "User not identified" });

    const result = await mergeCandidates(body.data.candidateIds, reviewerId, body.data.projectId);
    res.json(result);
  } catch (error: any) {
    console.error("[WAImport] Merge candidates error:", error);
    res.status(500).json({ error: error.message || "Failed to merge candidates" });
  }
});

waImportRouter.post("/candidate/:id/split", requireAuth, requireAdminOrEditor, async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid candidate ID", details: params.error.issues });
    const body = splitBodySchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid split data", details: body.error.issues });
    const candidateId = parseInt(params.data.id);
    const reviewerId = (req as any).user?.user_id;
    if (!reviewerId) return res.status(401).json({ error: "User not identified" });

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
    const { workers } = await import("@shared/schema");
    const { ilike } = await import("drizzle-orm");

    let results;
    if (q) {
      results = await database.select({ id: workers.id, name: workers.name })
        .from(workers)
        .where(ilike(workers.name, `%${q}%`))
        .limit(20);
    } else {
      results = await database.select({ id: workers.id, name: workers.name })
        .from(workers)
        .limit(50);
    }
    res.json(results);
  } catch (error) {
    console.error("[WAImport] Workers search error:", error);
    res.status(500).json({ error: "Failed to search workers" });
  }
});

export default waImportRouter;
