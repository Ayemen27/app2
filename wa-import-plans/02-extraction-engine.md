# WhatsApp Import — Financial Extraction Engine

## What & Why
Build the intelligent extraction engine that analyzes parsed WhatsApp messages and extracts financial transactions. This covers 6 specific patterns discovered in real data, plus 2 business-critical transaction types (inter-contractor loans and personal-account flags). Arabic NLP for amount/description parsing, context-based clustering, and a deterministic confidence scoring rubric per pattern.

## Done looks like
- 6 pattern extractors + 2 special transaction detectors working on parsed messages from Task #1:
  - Pattern 1: Structured transfer receipts (شركه رشاد بحير format) — confidence: 0.95. Uses رقم الحوالة as primary dedup key
  - Pattern 2: Inline cash expenses (10000بترول) — confidence: 0.80, penalties apply if no date context (-0.10) or ambiguous description (-0.05)
  - Pattern 3: Multi-line expense lists (each line = separate transaction) — confidence: 0.75, penalty if no project context (-0.10)
  - Pattern 4: Image+context clustering (receipt image + explanatory text within ±2 messages/15 min = ONE transaction) — confidence: 0.85
  - Pattern 5: Running total detector (اجمالي الحساب) — marks as excluded (non-transaction)
  - Pattern 6: Work conversation filter (construction planning without payment) — marks as excluded
  - Special Type A: Inter-contractor loan detector — detects money borrowed/lent between contractors, flags as candidate_type="loan" with mandatory review
  - Special Type B: Personal account flag — detects amounts recorded on عمار's personal account for another project, flags with candidate_type="personal_account"
  - Special Type C: Custodian fund receipt — detects amounts sent to ANY of the 3 custodians (عمار الشيعي, عدنان/ابو فارس, العباسي), flags with candidate_type="custodian_receipt"
  - Special Type D: Settlement message parser (تصفية) — detects settlement/reconciliation messages from custodians (especially العباسي's تصفية in chat), parses itemized disbursements, flags with candidate_type="settlement"
- Deterministic confidence scoring rubric (exact values, no ranges):
  - Base scores: Pattern1(structured_receipt)=0.95, Pattern2(inline_expense)=0.80, Pattern3(multiline_list)=0.75, Pattern4(image_context)=0.85, SpecialA(loan)=0.60, SpecialB(personal_account)=0.65, SpecialC(custodian_receipt)=0.85, SpecialD(settlement)=0.80
  - Penalties (boolean, applied if true): missing_date=-0.10, ambiguous_project=-0.10, amount_below_1000=-0.05, no_supporting_image=-0.05, ambiguous_worker_name=-0.05
  - Bonuses (boolean, applied if true): has_transfer_number=+0.05, has_supporting_image=+0.05, explicit_project_mention=+0.05, explicit_amount_with_currency=+0.03
  - Formula: final = clamp(base + sum(bonuses) - sum(penalties), 0.0, 1.0)
  - Score breakdown stored per candidate for auditability
- Each extracted candidate stored in wa_extraction_candidates with: amount, currency (always YER), description, confidence score, source pattern, linked evidence, category, candidate_type enum: expense/transfer/loan/personal_account/custodian_receipt/settlement
- Context clustering links messages and images into transaction groups via wa_transaction_evidence_links
- Project inference with 4-project disambiguation matrix:
  - "الجراحي" + contractor context → either "مشروع ابار الجراحي زين العابدين" (6c9d8a97) OR "ابار الجراحي المهندس محمد" (00735182)
  - "التحيتا/التحيتاء/الحوش" → either "مشروع ابار التحيتا زين العابدين" (7212655c) OR "ابار التحيتا المهندس محمد" (b23ad9a5)
  - Since this chat is WITH زين العابدين, default to his projects unless context explicitly mentions المهندس محمد's work (تركيب المنصة/الألواح)
  - Store inference evidence in wa_project_hypotheses with confidence and keywords used
- Worker name resolution using wa_worker_aliases → canonical worker_id
- Expense categorization mapping:
  - بترول/ديزل → fuel/transportation
  - سمنت → cement/materials
  - خرسان → concrete/materials
  - حديد → steel/materials
  - صبوح/غداء/عشاء/سحور → meals/daily_expenses
  - نجار/نجارين → carpentry/labor
  - حداد/ملحم → welding/labor
  - مواصلت/نقل → transport
  - كهرباء → electricity/utilities
  - جراوت/مبسط → construction_materials

## Out of scope
- OCR on invoice/receipt images (future enhancement — use text context only for now)
- Audio transcription (future)
- Posting to ERP tables (Task #3-#4)
- User review dashboard (Task #4)

## Tasks
1. **Build structured transfer receipt parser** — Regex-based parser for شركه رشاد بحير format. Extract: amount (مبلغ الحوالة), fee (خدمة تحويل), recipient (المستلم), sender (المرسل), transfer number (رقم الحوالة). Handle both رقم الحوالة:NNNN and الرقم العام:NNNN formats. Confidence: 0.95.

2. **Build inline expense parser** — Regex for patterns like "10000بترول" and "50الف ريال". Must handle: Eastern Arabic digits (٠-٩→0-9 conversion), Arabic thousands word (الف/آلاف), amounts with/without spaces, Yemeni currency terms. Apply confidence rubric.

3. **Build multi-line list splitter** — Detect when a single message contains multiple expense lines, split and parse each independently. Each line becomes a separate candidate.

4. **Build context clustering engine** — Group messages within temporal windows (same sender, ±2 messages or ≤15 minutes). Link image attachments to their explanatory text messages. Ensure receipt image + "قيمة خرسان 48متر للجراحي" = ONE transaction. Store links in wa_transaction_evidence_links.

5. **Build non-transaction filters** — Detect and exclude: running totals (اجمالي الحساب/لاهنا), work planning conversations, greetings, stickers (STK-*.webp), deleted messages (حذفت هذه الرسالة), system messages (مشفرة تمامًا). Also detect duplicate text blocks (العباسي sends same expense list twice via copy-paste) — count as ONE.

5b. **Build date validation engine (CRITICAL for العباسي chat)** — العباسي frequently writes WRONG inline dates/day-names in his expense reports. Rules:
   - WhatsApp message timestamp (system-generated) = AUTHORITATIVE date. Always prefer this.
   - العباسي's inline dates ("الخميس29/1", "الاثنين2/2") = SECONDARY evidence only.
   - Detect date mismatches: compare inline date vs WhatsApp timestamp. If difference > 0 days, flag with reason "date_mismatch_whatsapp_vs_inline" and use WhatsApp timestamp.
   - Detect wrong year (e.g., "5/2/2024" when WhatsApp timestamp says 2026) — auto-correct year, flag.
   - Detect wrong day-of-week (e.g., "الاثنين" but actual date is Wednesday) — ignore day name, use date.
   - Store both dates (wa_timestamp + inline_claimed_date) for audit trail.

6. **Build project inference engine with 4-project matrix** — Map transactions to the 4 existing project IDs using: keyword matching (الجراحي, التحيتا, الحوش, الست الابيار, قواعد, منصة, ألواح), contractor context (chat is with زين = default to his projects), work type context (صب/قواعد/خرسان = زين's projects, منصة/ألواح/تركيب = المهندس محمد's projects). Store evidence in wa_project_hypotheses.

7. **Build inter-contractor loan detector** — Identify messages about money borrowed/lent between contractors (e.g., "استلاف", "سلف", amounts moving between project accounts). Create candidates with type="loan" and mandatory review flag.

8. **Build personal account flag detector** — Identify amounts recorded on عمار's personal account for work on another project. Flag with candidate_type="personal_account" for separate tracking.

9. **Build custodian fund receipt detector** — Identify amounts sent to ANY of the 3 custodians: عمار الشيعي (all projects), عدنان/ابو فارس (الجراحي only), العباسي (temporary period with زين). For عدنان: if no details → candidate_type="custodian_receipt" routed to fund_transfer. Unsettled amounts → expense on his account with "pending settlement" note. For العباسي: detect his settlement (تصفية) message in chat and parse as itemized reconciliation.

10. **Build settlement message parser (تصفية)** — Parse structured settlement messages from custodians (العباسي sent one in chat). Extract: list of disbursements, amounts, dates, recipients. Create candidates with candidate_type="settlement" that reconcile against previously recorded custodian receipts.

11. **Build expense categorization engine** — Classify extracted transactions into categories matching existing material_purchases schema fields (material_category, material_name). Map to target ERP table: structured transfers → fund_transfers, materials → material_purchases, labor → worker expenses, misc → daily_expense_summaries.

12. **Implement deterministic confidence scoring** — Apply the rubric: base score per pattern, penalties for missing data, bonuses for supporting evidence. Log scoring breakdown for auditability.

## Relevant files
- `shared/schema.ts`
- `server/services/ai-agent/WhatsAppAIService.ts`
- `server/services/FinancialLedgerService.ts`
- `server/storage.ts`
- `server/utils/safe-numbers.ts`
