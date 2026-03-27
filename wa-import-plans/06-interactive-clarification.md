# WhatsApp Import — Interactive Clarification via Existing Bot

## What & Why
When the extraction engine encounters ambiguous or incomplete financial data (amount without project, material without price, unrecognized abbreviation), the system generates polite Arabic questions and sends them to the contractor via the **existing WhatsApp bot (Baileys/@whiskeysockets/baileys)** — NOT WhatsApp Business API. Contractor replies feed back into the pipeline and update the linked candidate data. This reduces manual review effort and improves data completeness.

## Done looks like
- **Clarification thread system**: When an extraction candidate has low confidence or missing critical fields, the system creates a clarification thread linked to that candidate
- **Arabic question generator**: Generates polite, professional Arabic questions appropriate for contractor communication (Yemeni dialect awareness). Template-first approach with AI-assisted fallback for complex cases
- **Outbound via existing bot**: Questions sent through the existing `WhatsAppBot` (server/services/ai-agent/WhatsAppBot.ts) using its established Baileys connection, respecting all existing protections (daily message limit, delays, rate limiting, allowed numbers)
- **Inbound reply capture**: Contractor replies are captured by the existing bot's message handler, matched to open clarification threads, and routed back to the import pipeline
- **Candidate update flow**: Reply data updates the linked extraction candidate's fields (amount, project, category, etc.) — but NEVER bypasses human review before posting
- **Thread lifecycle**: open → awaiting_reply → replied → resolved / expired (auto-expire after 7 days)

## Dependencies
- **Depends on**: Task #1 (schema), Task #2 (extraction engine), Task #4 (review dashboard), Task #5 (contractor profiles — optional but enhances question quality)
- **Requires**: Existing WhatsApp bot connected and operational (server/services/ai-agent/WhatsAppBot.ts)
- **Does NOT modify**: Core bot connection logic, authentication, or protection mechanisms

## Schema additions (new tables)
- `wa_clarification_threads` — thread tracking (candidate_id FK→wa_extraction_candidates, canonical_transaction_id FK→wa_canonical_transactions nullable, contractor_jid text, question_type enum: missing_project/missing_amount/ambiguous_material/unrecognized_pattern/confirm_duplicate/other, status enum: draft/sent/awaiting_reply/replied/resolved/expired, created_at timestamp, sent_at timestamp nullable, replied_at timestamp nullable, resolved_at timestamp nullable, expires_at timestamp, created_by_user_id, notes text nullable)
- `wa_clarification_messages` — individual messages in thread (thread_id FK→wa_clarification_threads, direction enum: outbound/inbound, message_text text, wa_message_id text nullable, sent_at timestamp, delivered boolean default false, read boolean default false). Outbound = question from system, inbound = reply from contractor.

## Integration with existing WhatsApp bot

The existing bot architecture:
- `WhatsAppBot.ts` — Baileys connection management, message sending with delays/limits, allowed number checking
- `WhatsAppAIService.ts` — Message processing, context management, conversation flow
- `BotSettingsService.ts` — Bot configuration and settings
- `InteractiveMenu.ts` — Menu system and reply formatting
- `ArabicNormalizer.ts` — Arabic text normalization (reuse for question generation)

Integration approach:
- Add a new `ClarificationHandler` that plugs into the existing `WhatsAppAIService` message processing pipeline
- When an inbound message arrives, check if the sender has open clarification threads BEFORE normal bot processing
- If match found → route to clarification handler → update candidate → close thread
- If no match → normal bot flow continues unchanged
- Outbound questions use `WhatsAppBot.sendMessage()` respecting all existing protections (daily limit, delays, allowed numbers)

## Implementation sub-tasks

1. **Design and create schema** — Add 2 new tables to shared/schema.ts. Create insert schemas. Run db:push.

2. **Build clarification thread service** — `WhatsAppClarificationService` managing thread lifecycle: create → send → await → resolve/expire. Auto-expire threads after 7 days. Link threads to candidates and optionally to canonical transactions.

3. **Build Arabic question generator** — Template-based question generation for common scenarios:
   - Missing project: "السلام عليكم، بخصوص المبلغ [amount] بتاريخ [date] — لأي مشروع هذا؟ (الجراحي / التحيتا)"
   - Missing amount: "السلام عليكم، بخصوص [description] بتاريخ [date] — كم المبلغ؟"
   - Ambiguous material: "السلام عليكم، بخصوص [material_text] — هل تقصد [option1] أو [option2]؟"
   - Confirm duplicate: "السلام عليكم، وجدنا معاملة مشابهة بمبلغ [amount] بتاريخ [date]. هل هذه نفس المعاملة أم معاملة مختلفة؟"
   Templates use contractor profile (Task #5) for personalization if available.

4. **Build outbound sender** — Hook into existing `WhatsAppBot.sendMessage()`. Before sending: (a) verify contractor JID is in allowed numbers, (b) check daily message limit has room, (c) apply existing delay protections. Record wa_message_id for delivery tracking. Update thread status to 'sent' → 'awaiting_reply'.

5. **Build inbound reply matcher** — Add clarification check to WhatsAppAIService message processing: (a) On incoming message, query wa_clarification_threads WHERE contractor_jid = sender AND status = 'awaiting_reply' ORDER BY sent_at DESC, (b) If match found → extract reply content → create wa_clarification_messages record → update linked candidate fields → set thread status to 'replied', (c) If no match → pass to normal bot flow. Matching is by sender JID + thread status, not by message content.

6. **Build candidate update from reply** — Parse contractor reply to extract requested information. Update wa_extraction_candidates fields (amount, project_hypothesis, category). Create wa_review_actions audit record for the change. Set thread status to 'resolved'. Candidate STILL requires human review before posting — the reply only improves data quality, never auto-approves.

7. **Build clarification dashboard panel** — In review dashboard: show open clarification threads, sent/awaiting/replied counts, allow manual thread creation for any candidate, show conversation history per thread. Admin can manually send questions or close threads.

8. **Build auto-clarification trigger** — In extraction pipeline (Task #2 output): automatically create clarification threads for candidates with: (a) confidence < 0.6 AND missing critical field (project/amount), (b) match_status = 'conflict' AND contractor is reachable. Auto-created threads start as 'draft' — admin must approve before sending (batch approve supported).

9. **Test end-to-end clarification flow** — Create candidate with missing project → generate question → send via bot → simulate reply → verify candidate updated → verify still requires human review → verify audit trail complete.

## Safety constraints
- Clarification replies NEVER bypass human review — they improve candidate data quality only
- Questions are sent ONLY to allowed numbers (existing bot protection)
- Daily message limit respected (existing bot protection: 50/day)
- All questions start as 'draft' — admin approval required before first send to any contractor
- After initial approval per contractor, subsequent questions can auto-send (configurable)
- Thread auto-expires after 7 days to prevent stale threads
- No financial data exposed in questions beyond what the contractor already sent
- Full audit trail via wa_clarification_messages + wa_review_actions

## MANDATORY: Post-Task Completion Checklist
1. Update PROGRESS.md with completion entries
2. Verify both new tables created and queryable
3. Verify questions generated correctly in Arabic
4. Verify outbound sends respect all existing bot protections
5. Verify inbound replies matched and candidate updated
6. Verify human review still required after clarification
7. Verify clarification dashboard panel functional
8. Call architect() for POST-TASK GATE REVIEW
9. If architect PASS (≥8/10) → mark complete
10. Log architect review result in PROGRESS.md

## Relevant files
- `server/services/ai-agent/WhatsAppBot.ts` (existing — integrate, do NOT modify core)
- `server/services/ai-agent/WhatsAppAIService.ts` (existing — add clarification check to message handler)
- `server/services/ai-agent/whatsapp/ArabicNormalizer.ts` (existing — reuse)
- `server/services/WhatsAppClarificationService.ts` (new)
- `shared/schema.ts`
- `client/src/pages/wa-import.tsx` (extend dashboard)
- `server/routes.ts`
- `server/storage.ts`
