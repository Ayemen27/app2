# WhatsApp Import Pipeline — Schema Contract

All 13 tables created and verified in database.

## Tables

### 1. wa_import_batches
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| filename | TEXT | NOT NULL |
| zip_sha256 | TEXT | NOT NULL, UNIQUE |
| chat_source | TEXT | NOT NULL, DEFAULT 'other' (zain/abbasi/other) |
| status | TEXT | NOT NULL, DEFAULT 'pending' (pending/processing/completed/failed) |
| total_messages | INTEGER | DEFAULT 0 |
| total_media | INTEGER | DEFAULT 0 |
| error_message | TEXT | |
| uploaded_by | VARCHAR | NOT NULL, FK→users(id) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| completed_at | TIMESTAMPTZ | |

### 2. wa_raw_messages
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| batch_id | INTEGER | NOT NULL, FK→wa_import_batches(id) ON DELETE CASCADE |
| wa_timestamp | TIMESTAMPTZ | NOT NULL |
| sender | TEXT | NOT NULL |
| message_text | TEXT | |
| is_multiline | BOOLEAN | NOT NULL, DEFAULT false |
| attachment_ref | TEXT | |
| inline_claimed_date | TEXT | |
| date_mismatch_reason | TEXT | |
| chat_source | TEXT | NOT NULL, DEFAULT 'other' |
| message_order | INTEGER | NOT NULL |

### 3. wa_media_assets
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| batch_id | INTEGER | NOT NULL, FK→wa_import_batches(id) ON DELETE CASCADE |
| message_id | INTEGER | FK→wa_raw_messages(id) ON DELETE SET NULL |
| file_path | TEXT | NOT NULL |
| original_filename | TEXT | NOT NULL |
| sha256 | TEXT | NOT NULL |
| mime_type | TEXT | NOT NULL |
| file_size | INTEGER | NOT NULL |
| ocr_text | TEXT | |
| media_status | TEXT | NOT NULL, DEFAULT 'processed' (processed/skipped_too_large/skipped_unsupported/error) |
| skip_reason | TEXT | |

### 4. wa_canonical_transactions
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| status | TEXT | NOT NULL, DEFAULT 'unclassified' (confirmed/doubtful/duplicate/unclassified/excluded) |
| transaction_type | TEXT | |
| amount | DECIMAL(15,2) | |
| currency | TEXT | DEFAULT 'YER' |
| description | TEXT | |
| transaction_date | DATE | |
| project_id | VARCHAR | FK→projects(id) |
| worker_id | VARCHAR | FK→workers(id) |
| merged_from_candidates | INTEGER[] | |
| exclude_reason | TEXT | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

### 5. wa_extraction_candidates
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| batch_id | INTEGER | NOT NULL, FK→wa_import_batches(id) ON DELETE CASCADE |
| source_message_id | INTEGER | FK→wa_raw_messages(id) |
| amount | DECIMAL(15,2) | |
| currency | TEXT | DEFAULT 'YER' |
| description | TEXT | |
| pattern_type | TEXT | |
| confidence | DECIMAL(5,4) | |
| confidence_breakdown_json | JSONB | |
| project_hypothesis_id | INTEGER | |
| category | TEXT | |
| candidate_type | TEXT | NOT NULL, DEFAULT 'expense' (expense/transfer/loan/personal_account/custodian_receipt/settlement) |
| match_status | TEXT | NOT NULL, DEFAULT 'new_entry' (exact_match/near_match/conflict/new_entry) |
| review_flags | TEXT[] | |
| canonical_transaction_id | INTEGER | FK→wa_canonical_transactions(id) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

### 6. wa_transaction_evidence_links
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| candidate_id | INTEGER | NOT NULL, FK→wa_extraction_candidates(id) ON DELETE CASCADE |
| raw_message_id | INTEGER | FK→wa_raw_messages(id) |
| media_asset_id | INTEGER | FK→wa_media_assets(id) |
| link_type | TEXT | NOT NULL, DEFAULT 'source' |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

### 7. wa_worker_aliases
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| alias_name | TEXT | NOT NULL |
| canonical_worker_id | VARCHAR | NOT NULL, FK→workers(id) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| created_by | VARCHAR | FK→users(id) |
| | | UNIQUE(alias_name, canonical_worker_id) |

### 8. wa_custodian_entries
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| custodian_worker_id | VARCHAR | NOT NULL, FK→workers(id) |
| project_id | VARCHAR | FK→projects(id) |
| received_amount | DECIMAL(15,2) | DEFAULT 0 |
| disbursed_amount | DECIMAL(15,2) | DEFAULT 0 |
| settled_amount | DECIMAL(15,2) | DEFAULT 0 |
| settlement_date | DATE | |
| linked_batch_id | INTEGER | FK→wa_import_batches(id) |
| canonical_transaction_id | INTEGER | FK→wa_canonical_transactions(id) |
| entry_type | TEXT | NOT NULL, DEFAULT 'receipt' |
| description | TEXT | |
| is_personal_account | BOOLEAN | NOT NULL, DEFAULT false |
| pending_settlement | BOOLEAN | NOT NULL, DEFAULT false |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

### 9. wa_project_hypotheses
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| candidate_id | INTEGER | NOT NULL, FK→wa_extraction_candidates(id) ON DELETE CASCADE |
| project_id | VARCHAR | NOT NULL, FK→projects(id) |
| confidence | DECIMAL(5,4) | |
| evidence_keywords | TEXT[] | |
| inference_method | TEXT | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

### 10. wa_dedup_keys
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| candidate_id | INTEGER | NOT NULL, FK→wa_extraction_candidates(id) ON DELETE CASCADE |
| canonical_transaction_id | INTEGER | FK→wa_canonical_transactions(id) |
| fingerprint_hash | TEXT | NOT NULL, UNIQUE |
| fingerprint_components_json | JSONB | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

### 11. wa_verification_queue
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| candidate_id | INTEGER | NOT NULL, FK→wa_extraction_candidates(id) |
| canonical_transaction_id | INTEGER | FK→wa_canonical_transactions(id) |
| reason | TEXT | NOT NULL |
| priority | TEXT | NOT NULL, DEFAULT 'P4_low' (P1_critical/P2_high/P3_medium/P4_low) |
| reviewer_id | VARCHAR | FK→users(id) |
| reviewed_at | TIMESTAMPTZ | |
| decision | TEXT | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

### 12. wa_posting_results
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| canonical_transaction_id | INTEGER | NOT NULL, FK→wa_canonical_transactions(id) |
| target_table | TEXT | NOT NULL |
| target_record_id | TEXT | |
| posted_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| posted_by | VARCHAR | FK→users(id) |
| idempotency_key | TEXT | |
| posting_status | TEXT | NOT NULL, DEFAULT 'success' (success/failed/skipped_duplicate) |
| error_message | TEXT | |
| attempt_number | INTEGER | NOT NULL, DEFAULT 1 |
| | | PARTIAL UNIQUE (canonical_transaction_id) WHERE posting_status='success' |
| | | PARTIAL UNIQUE (idempotency_key) WHERE posting_status='success' |

### 13. wa_review_actions
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| action_type | TEXT | NOT NULL |
| canonical_transaction_id | INTEGER | FK→wa_canonical_transactions(id) |
| candidate_id | INTEGER | FK→wa_extraction_candidates(id) |
| reviewer_id | VARCHAR | NOT NULL, FK→users(id) |
| before_state | JSONB | |
| after_state | JSONB | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

## Partial Unique Indexes (Financial Safety)
- `idx_wa_posting_results_canonical_success`: UNIQUE on canonical_transaction_id WHERE posting_status='success'
- `idx_wa_posting_results_idempotency_success`: UNIQUE on idempotency_key WHERE posting_status='success'
