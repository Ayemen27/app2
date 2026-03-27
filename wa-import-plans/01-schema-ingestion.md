# WhatsApp Import — Schema & Ingestion Engine

## What & Why
Build the foundational database schema and ingestion service for importing WhatsApp exported chat archives (ZIP files containing TXT + media). This is the base layer that all subsequent import phases depend on. The system must handle Arabic text with Eastern numerals, RTL markers, and Yemeni dialect patterns. All 13 tables for the entire pipeline are defined here upfront to ensure consistency.

## Done looks like
- 13 new database tables created via Drizzle schema for the entire WhatsApp import pipeline
- A service that accepts a ZIP file, extracts it safely (ZIP-slip protection), parses the TXT chat file into structured message records
- Each message stored with: timestamp (normalized from Eastern Arabic numerals), sender, text, attachment references
- Media files (JPGs, audio, xlsx, PDFs) catalogued with SHA256 hashes for dedup, with MIME type validation and file size limits (max 50MB per file)
- Arabic date parser that handles format: ١٧‏/٤‏/٢٠٢٥، ٦:٠٤ م (with RTL markers U+200F stripped)
- Worker alias resolution table seeded with known aliases, linked to existing worker IDs (not just text-to-text)
- Import batch tracking with status (pending/processing/completed/failed)
- RBAC: only admin/editor roles can upload and manage imports
- All tables use the existing Drizzle ORM patterns and safe_numeric conventions

## Out of scope
- NLP extraction of financial amounts (Task #2)
- OCR on images (future)
- Dedup/matching/posting to ERP (Tasks #3-#4)
- Audio transcription and Excel parsing (future)

## Tasks
1. **Define Drizzle schema for all 13 import tables** — The complete table set for the entire pipeline:
   - `wa_import_batches` — batch tracking (source file, owner, status, stats, chat_source enum: zain/abbasi/other — identifies which WhatsApp conversation this batch is from)
   - `wa_raw_messages` — parsed chat messages (wa_timestamp, sender, text, is_multiline, attachment_ref, inline_claimed_date nullable, date_mismatch_reason nullable, chat_source enum: zain/abbasi/other)
   - `wa_media_assets` — media files (path, sha256, mime_type, size, ocr_text, linked_message_id)
   - `wa_extraction_candidates` — extracted financial items (amount, currency, description, pattern_type, confidence, project_hypothesis_id, category, candidate_type enum: expense/transfer/loan/personal_account/custodian_receipt/settlement)
   - `wa_canonical_transactions` — deduped final transactions (status: confirmed/doubtful/duplicate/unclassified/excluded, merged evidence)
   - `wa_transaction_evidence_links` — many-to-many linking candidates to raw messages and media
   - `wa_worker_aliases` — worker name mappings linked to workers.id (alias_name, canonical_worker_id)
   - `wa_custodian_entries` — custodian fund tracking (custodian_worker_id, received_amount, disbursed_amount, settled_amount, settlement_date, linked_batch_id)
   - `wa_project_hypotheses` — project inference results (candidate_id, project_id, confidence, evidence_keywords, inference_method)
   - `wa_dedup_keys` — fingerprint storage for cross-batch deduplication (candidate_id, fingerprint_hash, fingerprint_components_json, created_at)
   - `wa_verification_queue` — review tasks (candidate_id, reason, priority, reviewer_id, reviewed_at, decision, notes)
   - `wa_posting_results` — idempotent posting log (canonical_txn_id, target_table, target_record_id, posted_at, posted_by, idempotency_key)
   - `wa_review_actions` — immutable audit trail (action_type, candidate_id, reviewer_id, before_state, after_state, timestamp, notes)
   Follow existing schema patterns in shared/schema.ts. Use proper enums for statuses.

2. **Build WhatsApp TXT parser** — Parse the exported chat.txt format with Eastern Arabic date/time (١٢/٣/٢٠٢٦، ٨:١٩ م), Unicode RTL mark stripping (U+200F), sender name extraction, multi-line message grouping, and attachment reference detection (patterns like "IMG-20251212-WA0010.jpg (الملف مرفق)").

3. **Build ZIP ingestion service with security** — Accept uploaded ZIP, validate file size (max 500MB), defend against ZIP-slip (path traversal), extract to temp directory, validate MIME types of extracted files, identify chat TXT file, catalogue all media files with SHA256 hashes, store in wa_media_assets, link to parent messages by filename match. Clean up temp files after processing.

4. **Create missing workers and seed aliases** — First, create two workers that don't exist yet: (a) "عدنان محمد حسين حمدين" — volunteer supervisor الجراحي, alias: ابو فارس, (b) "عبداللة العباسي" — worker, temporary supervisor with زين (DIFFERENT person from عبدالله عمر يوسف). Then seed wa_worker_aliases with ALL known aliases linked to worker IDs:
   - النخرة → سمهرير (`6066edb5`)
   - عمي احمد → الحج احمد (`51165865`)
   - سعيد → سعيد الحداد (`w004-سعيد`)
   - عبدالله الخلاطة → عبدالله سواق الخلاطة (`47f0c37a`)
   - عمال الحفر → عمال حفر (`1389a5ea`)
   - عمال الصبة → عمال الصبة (`2943956a`)
   - نجار باجل → نجار من باجل (`78c1e5ab`)
   - ناجي / ناجي المساعد → ناجي مساعد نحار (`0350b938`)
   - حسن النجار / حسن → محمد حسن نجار (`d9f327e5`)
   - ابو فارس → عدنان محمد حسين حمدين (newly created)
   Include API to add/edit/delete aliases. Resolve aliases to canonical worker_id in all lookups.

5. **Build custodian ledger table and service** — wa_custodian_entries tracks funds for THREE custodians:
   (a) عمار الشيعي (worker_id=w002-عمار) — primary custodian for ALL projects
   (b) عدنان محمد حسين حمدين (newly created) — volunteer supervisor الجراحي ONLY. No salary. Undetailed amounts → fund_transfer. Unsettled amounts → expense on his account with "pending settlement" note and "بدون عمل" flag
   (c) العباسي (newly created) — temporary custodian during specific period with زين. Has settlement (تصفية) message in chat that must be parsed as final reconciliation
   Track: custodian_worker_id, received_amount, disbursed_amount, settled_amount, settlement_date, linked_batch_id, project_id. Include flags for "recorded on personal account" and "pending settlement".

6. **Create import API endpoints with RBAC** — POST /api/wa-import/upload (ZIP, admin/editor only), GET /api/wa-import/batches, GET /api/wa-import/batch/:id/messages, GET /api/wa-import/batch/:id/media. Protected by existing auth middleware with role checks. Input validation on all endpoints.

## MANDATORY: Post-Task Completion Checklist
Before marking this task complete, the agent MUST:
1. Update `wa-import-plans/PROGRESS.md` with completion entries for ALL 6 sub-tasks
2. Create `wa-import-plans/SCHEMA_CONTRACT.md` listing all 13 tables with columns and types
3. Verify the app compiles (`npm run dev` runs without errors)
4. Verify all 13 tables exist in the database (SQL query)
5. Verify API endpoints respond (curl test)
6. Call `architect()` for POST-TASK GATE REVIEW (see Rule 9 in 00-continuity-guide.md)
7. If architect PASS (≥8/10) → mark complete. If FAIL → fix issues and re-review (max 3 rounds)
8. Log architect review result in PROGRESS.md

## Relevant files
- `shared/schema.ts`
- `server/storage.ts`
- `server/db/startup-migration-coordinator.ts`
- `server/routes/modules/financialRoutes.ts`
- `server/utils/safe-numbers.ts`
