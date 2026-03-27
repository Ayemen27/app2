import { Router } from "express";
import multer from "multer";
import { requireAuth, requireAdminOrEditor, type AuthenticatedRequest } from "../../middleware/auth.js";
import { waIngestionService } from "../../services/whatsapp-import/WhatsAppIngestionService.js";
import { waAliasService } from "../../services/whatsapp-import/WhatsAppAliasService.js";
import { waCustodianService } from "../../services/whatsapp-import/WhatsAppCustodianService.js";
import { waExtractionService } from "../../services/whatsapp-import/WhatsAppExtractionService.js";
import { runReconciliation } from "../../services/whatsapp-import/ReconciliationService.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
});

const waImportRouter = Router();

waImportRouter.post("/upload", requireAuth, requireAdminOrEditor, upload.single("file"), async (req: AuthenticatedRequest, res) => {
  try {
    if (!(req as any).file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = (req as any).file;
    if (!file.originalname.endsWith(".zip")) {
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
    const batch = await waIngestionService.getBatch(parseInt(req.params.id));
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
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const messages = await waIngestionService.getBatchMessages(
      parseInt(req.params.id),
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
    const media = await waIngestionService.getBatchMedia(parseInt(req.params.id));
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
    const { aliasName, canonicalWorkerId } = req.body;
    if (!aliasName || !canonicalWorkerId) {
      return res.status(400).json({ error: "aliasName and canonicalWorkerId are required" });
    }
    const alias = await waAliasService.createAlias({
      aliasName,
      canonicalWorkerId,
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
    const alias = await waAliasService.updateAlias(parseInt(req.params.id), req.body);
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
    await waAliasService.deleteAlias(parseInt(req.params.id));
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
    const entries = await waCustodianService.getEntriesByCustodian(req.params.workerId);
    res.json(entries);
  } catch (error) {
    console.error("[WAImport] Get custodian entries error:", error);
    res.status(500).json({ error: "Failed to get custodian entries" });
  }
});

waImportRouter.post("/batch/:id/extract", requireAuth, requireAdminOrEditor, async (req, res) => {
  try {
    const batchId = parseInt(req.params.id);
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
    const candidates = await waExtractionService.getExtractionCandidates(parseInt(req.params.id));
    res.json(candidates);
  } catch (error) {
    console.error("[WAImport] Get candidates error:", error);
    res.status(500).json({ error: "Failed to get candidates" });
  }
});

waImportRouter.get("/candidate/:id", requireAuth, requireAdminOrEditor, async (req, res) => {
  try {
    const data = await waExtractionService.getCandidateWithEvidence(parseInt(req.params.id));
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
    const batchId = parseInt(req.params.id);
    const { otherBatchIds = [], tolerancePercent = 1 } = req.body || {};

    const report = await runReconciliation(batchId, otherBatchIds, tolerancePercent);
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
    const batchId = parseInt(req.params.id);
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

export default waImportRouter;
