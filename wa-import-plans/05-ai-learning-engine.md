# WhatsApp Import — AI Learning Engine (Intelligent Conversation Understanding)

## What & Why
Build an adaptive learning system that improves extraction accuracy over time by learning from human reviewer corrections and contractor communication patterns. Each contractor has unique abbreviations, writing styles, and amount formatting — the system must build per-contractor profiles that make subsequent batch processing faster and more accurate.

## Done looks like
- **Contractor profile system**: Per-contractor profiles storing learned patterns (abbreviations, material aliases, amount formats, common projects, writing style features)
- **Learning event capture**: Every reviewer correction (approve/edit/reject in Task #4 review dashboard) generates a learning event that updates the contractor's profile
- **Extraction enhancement**: The extraction engine (Task #2) reads contractor profiles to boost confidence scores and resolve ambiguities before falling back to generic patterns
- **Accuracy tracking**: Measurable improvement in extraction precision across batches for the same contractor — tracked metric per profile
- **Arabic NLP improvements**: Dialect-specific pattern learning (Yemeni dialect abbreviations, Eastern Arabic numeral variants, RTL text edge cases)

## Dependencies
- **Depends on**: Task #1 (schema), Task #2 (extraction engine), Task #4 (review dashboard — source of correction events)
- **Does NOT block**: Tasks 1-4 can be fully implemented without this. This is an enhancement layer.

## Schema additions (new tables)
- `wa_contractor_profiles` — per-contractor learned features (contractor_worker_id FK→workers, chat_source enum, known_abbreviations jsonb, material_aliases jsonb, amount_format_patterns jsonb, common_projects jsonb, writing_style_features jsonb, total_messages_processed integer, total_corrections_received integer, last_profile_update timestamp, confidence_boost_factor decimal default 0)
- `wa_learning_events` — immutable log of learning triggers (event_type enum: correction/new_alias/pattern_confirmed/pattern_invalidated, source_review_action_id FK→wa_review_actions, contractor_profile_id FK→wa_contractor_profiles, before_state jsonb, after_state jsonb, field_changed text, created_at timestamp)
- `wa_extraction_overrides` — deterministic override rules derived from profiles (contractor_profile_id FK→wa_contractor_profiles, pattern_regex text, override_type enum: alias_resolution/confidence_boost/project_assignment/category_mapping, override_value jsonb, priority integer, active boolean default true, created_at timestamp)

## Implementation sub-tasks

1. **Design and create schema** — Add 3 new tables to shared/schema.ts. Create insert schemas with drizzle-zod. Run db:push.

2. **Build contractor profile service** — `WhatsAppContractorProfileService` that manages profile CRUD. Initialize profiles from existing wa_worker_aliases + chat_source data. Profile stores learned patterns as structured JSON.

3. **Build learning event capture** — Hook into Task #4's review action flow. When a reviewer corrects an extraction (edits amount, changes project, fixes category): (a) Create wa_learning_events record with before/after state, (b) Update contractor profile with new pattern, (c) If pattern confirmed 3+ times → promote to wa_extraction_overrides as deterministic rule.

4. **Build extraction profile integration** — Modify Task #2's extraction engine to: (a) Load contractor profile at start of batch processing, (b) Apply wa_extraction_overrides deterministically BEFORE regex/heuristic extraction, (c) Use profile's confidence_boost_factor to adjust confidence scores, (d) Log profile-assisted extractions for accuracy tracking.

5. **Build abbreviation/alias learning** — When reviewer maps unknown text to known material/worker/project: (a) Add to contractor profile's known_abbreviations, (b) After 3 confirmations → create wa_extraction_overrides rule, (c) Example: مقاول writes "بلك" → reviewer maps to "بلوك سمنتي" → system learns for future batches.

6. **Build accuracy tracking dashboard** — Panel in review dashboard showing: per-contractor extraction accuracy over time, number of corrections trending down, most common correction types, profile completeness score.

7. **Build profile management UI** — Admin page to view/edit/deactivate contractor profiles and override rules. Shows: all learned patterns, override rules, accuracy metrics. Allows manual pattern addition.

8. **Test learning loop end-to-end** — Process batch → review with corrections → verify profile updated → process second batch → verify improved extraction accuracy for corrected patterns.

## Safety constraints
- Learning NEVER bypasses human approval — it only improves suggestions
- Override rules are deterministic (no black-box ML) — every rule is human-inspectable
- Profile changes are immutable-logged via wa_learning_events
- Confidence boost has a cap (max +0.15) to prevent over-trust
- All override rules can be deactivated by admin

## MANDATORY: Post-Task Completion Checklist
1. Update PROGRESS.md with completion entries
2. Verify all 3 new tables created and queryable
3. Verify learning events captured on review corrections
4. Verify extraction accuracy improvement measurable
5. Verify profile management UI functional
6. Call architect() for POST-TASK GATE REVIEW
7. If architect PASS (≥8/10) → mark complete
8. Log architect review result in PROGRESS.md

## Relevant files
- `shared/schema.ts`
- `server/services/WhatsAppExtractionService.ts` (from Task #2)
- `server/services/WhatsAppContractorProfileService.ts` (new)
- `client/src/pages/wa-import.tsx` (extend dashboard)
- `server/routes.ts`
- `server/storage.ts`
