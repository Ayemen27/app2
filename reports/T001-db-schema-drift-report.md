# T001: Database vs Schema.ts Structural Drift Report

Generated from live development database comparison against `shared/schema.ts`.

---

## 1. Tables in DB but NOT in schema.ts

**None** — All 83 database tables have corresponding definitions in schema.ts.

## 2. Tables in schema.ts but NOT in DB

**None** — All tables defined in schema.ts exist in the database.

---

## 3. Columns in DB but NOT in schema.ts (per table)

These columns exist in the live database but are **not defined** in the Drizzle schema. Most are sync fields (`is_local`, `synced`, `pending_sync`) and `updated_at`/`description` that were added to the DB but not reflected in schema.ts.

### Sync fields missing from schema.ts (DB has them, schema.ts does not)

The following tables have `is_local`, `synced`, `pending_sync` columns in the DB that are NOT in schema.ts:

| Table | Missing sync fields |
|-------|-------------------|
| ai_chat_messages | is_local, synced, pending_sync |
| ai_chat_sessions | is_local, synced, pending_sync |
| ai_usage_stats | is_local, synced, pending_sync |
| auth_user_sessions | is_local, synced, pending_sync |
| autocomplete_data | is_local, synced, pending_sync |
| build_deployments | is_local, synced, pending_sync |
| daily_expense_summaries | is_local, synced, pending_sync |
| email_verification_tokens | is_local, synced, pending_sync |
| fund_transfers | is_local, synced, pending_sync |
| material_categories | is_local, synced, pending_sync |
| material_purchases | is_local, synced, pending_sync |
| materials | is_local, synced, pending_sync |
| notification_read_states | is_local, synced, pending_sync |
| password_reset_tokens | is_local, synced, pending_sync |
| permission_audit_logs | is_local, synced, pending_sync |
| print_settings | is_local, synced, pending_sync |
| project_fund_transfers | is_local, synced, pending_sync |
| report_templates | is_local, synced, pending_sync |
| security_policies | is_local, synced, pending_sync |
| security_policy_implementations | is_local, synced, pending_sync |
| security_policy_suggestions | is_local, synced, pending_sync |
| security_policy_violations | is_local, synced, pending_sync |
| supplier_payments | is_local, synced, pending_sync |
| suppliers | is_local, synced, pending_sync |
| transportation_expenses | is_local, synced, pending_sync |
| user_project_permissions | is_local, synced, pending_sync |
| well_audit_logs | is_local, synced, pending_sync |
| well_expenses | is_local, synced, pending_sync |
| well_task_accounts | is_local, synced, pending_sync |
| well_tasks | is_local, synced, pending_sync |
| worker_attendance | is_local, synced, pending_sync |
| worker_balances | is_local, synced, pending_sync |
| worker_misc_expenses | is_local, synced, pending_sync |
| worker_transfers | is_local, synced, pending_sync |
| worker_types | is_local, synced, pending_sync |

### Additional columns in DB but NOT in schema.ts

| Table | Column(s) in DB only | Notes |
|-------|---------------------|-------|
| audit_logs | entity_name, entity_id, old_data, new_data, timestamp | DB has 5 extra columns not in schema |
| crashes | created_at | DB has a separate `created_at` column alongside `timestamp` |
| daily_expense_summaries | description | Extra text column |
| fund_transfers | updated_at | Timestamp column |
| material_purchases | description, updated_at | Extra text + timestamp |
| materials | updated_at | Timestamp column |
| refresh_tokens | parent_id | UUID self-referencing FK |
| suppliers | updated_at | Timestamp column |
| transportation_expenses | updated_at | Timestamp column |
| whatsapp_stats | metadata | JSONB column |
| worker_attendance | description, updated_at | Extra text + timestamp |
| worker_misc_expenses | updated_at | Timestamp column |
| worker_transfers | description, updated_at | Extra text + timestamp |
| workers | updated_at | Timestamp column |

---

## 4. Columns in schema.ts but NOT in DB (per table)

| Table | Column(s) in schema only | Notes |
|-------|-------------------------|-------|
| daily_activity_logs | temperature, humidity, well_id | 3 columns defined in schema but never created in DB |
| metrics | value | Schema uses `value` (decimal), DB uses `metric_value` (float8) — name mismatch |
| monitoring_data | metric_name, metric_value, metadata | Schema has different column names than DB (`type`, `value`, `context`) |
| system_logs | source, details | Schema has different column names than DB (`context`) |
| backup_settings | auto_backup_enabled, interval_minutes, telegram_notifications_enabled, gdrive_enabled, retention_days | DB uses key/value store pattern instead |

---

## 5. Type Mismatches

| Table | Column | schema.ts type | DB type | Severity |
|-------|--------|---------------|---------|----------|
| audit_logs | user_id | varchar | int4 | **CRITICAL** — schema expects string FK, DB has integer |
| users | is_active | text (default "true") | bool (default true) | **HIGH** — fundamentally different types |
| fund_transfers | transfer_date | text | timestamp | **HIGH** — schema expects date string, DB has timestamp |
| metrics | value vs metric_value | decimal("value") | float8("metric_value") | **HIGH** — name AND type mismatch |
| monitoring_data | (all columns) | metric_name/metric_value/metadata | type/value/context | **HIGH** — entirely different structure |
| system_logs | (columns) | source+details | context | **HIGH** — different column names |
| backup_settings | (all columns) | individual typed columns | key+value KV store | **CRITICAL** — entirely different schema |
| well_work_crews | workers_count | integer | numeric | MEDIUM — could cause rounding issues |
| well_work_crews | masters_count | integer | numeric | MEDIUM — could cause rounding issues |
| backup_logs | triggered_by | varchar (FK to users.id) | uuid | MEDIUM — type mismatch on FK |
| refresh_tokens | user_id | varchar | text | LOW — compatible but inconsistent |
| refresh_tokens | created_at | timestamp NOT NULL | timestamptz NULL | MEDIUM — timezone + nullability |
| refresh_tokens | expires_at | timestamp NOT NULL | timestamptz NOT NULL | LOW — timezone difference |

---

## 6. Nullability Mismatches

| Table | Column | schema.ts | DB | Impact |
|-------|--------|-----------|-----|--------|
| crashes | device_id | NOT NULL | NULL | Inserts could fail if schema validates but DB allows nulls |
| crashes | stack_trace | NULL (no notNull) | NOT NULL | DB rejects nulls but schema allows them |
| metrics | device_id | NOT NULL | NULL | Schema validation stricter than DB |
| whatsapp_messages | wa_id | NULL (optional) | NOT NULL | DB rejects nulls but schema allows them |
| whatsapp_messages | content | NOT NULL | NULL | Schema stricter than DB |
| whatsapp_messages | status | NOT NULL | NULL | Schema stricter than DB |
| whatsapp_messages | timestamp | NULL (defaultNow) | NOT NULL | DB is stricter |
| notifications | priority | NULL (no notNull) | NOT NULL (default 3) | DB is stricter |

---

## 7. Default Value Mismatches

| Table | Column | schema.ts default | DB default |
|-------|--------|------------------|------------|
| equipment | status | "available" | "active" |
| build_deployments | status | "pending" | "running" |
| whatsapp_stats | status | "idle" | "disconnected" |

---

## 8. FK Constraint Drift (schema.ts onDelete vs DB)

The following FK constraints have different `onDelete` rules between schema.ts and the live DB:

| Table | Column | FK Target | schema.ts onDelete | DB onDelete | Status |
|-------|--------|-----------|--------------------|-------------|--------|
| audit_logs | user_id | users.id | set null | NO ACTION | DRIFT |
| crashes | device_id | devices.device_id | (none defined) | NO ACTION | N/A — schema has no FK |
| equipment | project_id | projects.id | set null | NO ACTION | DRIFT |
| equipment_movements | equipment_id | equipment.id | cascade | NO ACTION | DRIFT |
| equipment_movements | from_project_id | projects.id | set null | NO ACTION | DRIFT |
| equipment_movements | to_project_id | projects.id | set null | NO ACTION | DRIFT |
| financial_audit_log | project_id | projects.id | set null | NO ACTION | DRIFT |
| financial_audit_log | user_id | users.id | set null | NO ACTION | DRIFT |
| journal_entries | created_by | users.id | set null | NO ACTION | DRIFT |
| journal_entries | project_id | projects.id | set null | NO ACTION | DRIFT |
| journal_lines | journal_entry_id | journal_entries.id | cascade | NO ACTION | DRIFT |
| metrics | device_id | devices.device_id | (none defined) | NO ACTION | N/A — schema has no FK |
| notifications | user_id | users.id | set null | NO ACTION | DRIFT |
| reconciliation_records | project_id | projects.id | cascade | NO ACTION | DRIFT |
| reconciliation_records | resolved_by | users.id | set null | NO ACTION | DRIFT |
| summary_invalidations | project_id | projects.id | cascade | NO ACTION | DRIFT |
| suppliers | created_by | users.id | set null | NO ACTION | DRIFT |
| sync_audit_logs | project_id | projects.id | set null | NO ACTION | DRIFT |
| sync_audit_logs | user_id | users.id | set null | NO ACTION | DRIFT |
| well_receptions | created_by | users.id | set null | NO ACTION | DRIFT |
| well_receptions | received_by | users.id | set null | NO ACTION | DRIFT |
| well_solar_components | created_by | users.id | set null | NO ACTION | DRIFT |
| well_transport_details | created_by | users.id | set null | NO ACTION | DRIFT |
| well_work_crews | created_by | users.id | set null | NO ACTION | DRIFT |
| worker_project_wages | created_by | users.id | set null | NO ACTION | DRIFT |
| workers | created_by | users.id | set null | NO ACTION | DRIFT |

### FK constraints that DO match between schema.ts and DB

| Table | Column | FK Target | onDelete | Match |
|-------|--------|-----------|----------|-------|
| auth_request_nonces | user_id | users.id | CASCADE | OK |
| daily_activity_logs | project_id | projects.id | CASCADE | OK |
| daily_expense_summaries | project_id | projects.id | CASCADE | OK |
| deployment_events | deployment_id | build_deployments.id | CASCADE | OK |
| fund_transfers | project_id | projects.id | CASCADE | OK |
| material_purchases | project_id | projects.id | CASCADE | OK |
| material_purchases | supplier_id | suppliers.id | SET NULL | OK |
| refresh_tokens | user_id | users.id | CASCADE | OK |
| user_preferences | user_id | users.id | CASCADE | OK |
| well_crew_workers | crew_id | well_work_crews.id | CASCADE | OK |
| well_crew_workers | worker_id | workers.id | CASCADE | OK |
| well_receptions | well_id | wells.id | CASCADE | OK |
| well_solar_components | well_id | wells.id | CASCADE | OK |
| well_transport_details | well_id | wells.id | CASCADE | OK |
| well_work_crews | well_id | wells.id | CASCADE | OK |
| whatsapp_allowed_numbers | added_by | users.id | SET NULL | OK |
| whatsapp_bot_settings | updated_by | users.id | SET NULL | OK |
| whatsapp_link_projects | link_id | whatsapp_user_links.id | CASCADE | OK |
| whatsapp_link_projects | project_id | projects.id | CASCADE | OK |
| whatsapp_messages | project_id | projects.id | SET NULL | OK |
| whatsapp_messages | user_id | users.id | SET NULL | OK |
| whatsapp_security_events | user_id | users.id | SET NULL | OK |
| whatsapp_user_links | user_id | users.id | CASCADE | OK |
| worker_project_wages | project_id | projects.id | CASCADE | OK |
| worker_project_wages | worker_id | workers.id | CASCADE | OK |
| worker_settlement_lines | settlement_id | worker_settlements.id | CASCADE | OK |
| worker_settlement_lines | worker_id | workers.id | CASCADE | OK |
| worker_settlement_lines | from_project_id | projects.id | CASCADE | OK |
| worker_settlement_lines | to_project_id | projects.id | CASCADE | OK |
| worker_settlements | settlement_project_id | projects.id | CASCADE | OK |
| worker_settlements | created_by | users.id | SET NULL | OK |

### FKs in schema.ts that have NO corresponding DB constraint

| Table | Column | Schema FK target | Schema onDelete |
|-------|--------|-----------------|-----------------|
| notifications | project_id | projects.id | set null |
| notifications | created_by | users.id | set null |
| worker_attendance | project_id | projects.id | cascade |
| worker_attendance | worker_id | workers.id | cascade |
| worker_attendance | well_id | wells.id | set null |
| supplier_payments | supplier_id | suppliers.id | cascade |
| supplier_payments | project_id | projects.id | cascade |
| supplier_payments | purchase_id | material_purchases.id | set null |
| transportation_expenses | project_id | projects.id | cascade |
| transportation_expenses | worker_id | workers.id | set null |
| transportation_expenses | well_id | wells.id | set null |
| worker_transfers | worker_id | workers.id | cascade |
| worker_transfers | project_id | projects.id | cascade |
| worker_balances | worker_id | workers.id | cascade |
| worker_balances | project_id | projects.id | cascade |
| daily_activity_logs | engineer_id | users.id | restrict |
| daily_expense_summaries | project_id | projects.id | cascade |
| worker_misc_expenses | project_id | projects.id | cascade |
| worker_misc_expenses | well_id | wells.id | set null |
| material_purchases | material_id | materials.id | set null |
| material_purchases | well_id | wells.id | set null |
| wells | project_id | projects.id | cascade |
| wells | created_by | users.id | restrict |
| well_tasks | well_id | wells.id | cascade |
| well_tasks | assigned_worker_id | workers.id | set null |
| well_tasks | completed_by | users.id | set null |
| well_tasks | created_by | users.id | set null |
| well_task_accounts | task_id | well_tasks.id | cascade |
| well_task_accounts | accounted_by | users.id | restrict |
| well_expenses | well_id | wells.id | cascade |
| well_expenses | created_by | users.id | restrict |
| well_audit_logs | well_id | wells.id | set null |
| well_audit_logs | task_id | well_tasks.id | set null |
| well_audit_logs | user_id | users.id | restrict |
| backup_logs | triggered_by | users.id | set null |
| build_deployments | triggered_by | users.id | set null |
| projects | project_type_id | project_types.id | set null |
| user_project_permissions | user_id | users.id | cascade |
| user_project_permissions | project_id | projects.id | cascade |
| user_project_permissions | assigned_by | users.id | set null |
| permission_audit_logs | actor_id | users.id | restrict |
| permission_audit_logs | target_user_id | users.id | set null |
| permission_audit_logs | project_id | projects.id | set null |
| security_policy_suggestions | implemented_as | security_policies.id | set null |
| security_policy_implementations | policy_id | security_policies.id | cascade |
| security_policy_violations | policy_id | security_policies.id | cascade |
| equipment | project_id | projects.id | set null |
| equipment_movements | equipment_id | equipment.id | cascade |
| equipment_movements | from_project_id | projects.id | set null |
| equipment_movements | to_project_id | projects.id | set null |
| journal_entries | project_id | projects.id | set null |
| journal_entries | created_by | users.id | set null |
| journal_lines | journal_entry_id | journal_entries.id | cascade |
| financial_audit_log | project_id | projects.id | set null |
| financial_audit_log | user_id | users.id | set null |
| reconciliation_records | project_id | projects.id | cascade |
| reconciliation_records | resolved_by | users.id | set null |
| summary_invalidations | project_id | projects.id | cascade |
| email_verification_tokens | user_id | users.id | cascade |
| password_reset_tokens | user_id | users.id | cascade |
| auth_user_sessions | user_id | users.id | cascade |
| notification_read_states | user_id | users.id | cascade |

---

## 9. Summary of Critical Issues

### CRITICAL (will cause runtime errors)
1. **audit_logs.user_id**: Schema defines `varchar`, DB has `int4` — type mismatch will cause Drizzle query failures
2. **backup_settings**: Entirely different table structure — schema defines individual columns, DB uses key/value store
3. **monitoring_data**: Entirely different column names — schema has `metric_name`/`metric_value`/`metadata`, DB has `type`/`value`/`context`
4. **system_logs**: Missing `source` column, has `context` instead of `details`

### HIGH (functional impact)
5. **users.is_active**: Schema says `text` (with default "true"), DB has `bool` (with default true) — boolean vs string comparison issues
6. **fund_transfers.transfer_date**: Schema says `text` (for YYYY-MM-DD string), DB has `timestamp` — format mismatch
7. **metrics**: Column name mismatch `value` vs `metric_value` + type mismatch `decimal` vs `float8`
8. **daily_activity_logs**: 3 columns in schema (`temperature`, `humidity`, `well_id`) do not exist in DB
9. **Many tables missing FK constraints in DB** that are defined in schema.ts
10. **26+ FK onDelete policy mismatches** — schema says CASCADE/SET NULL but DB says NO ACTION

### MEDIUM (data integrity risk)
11. **35+ tables** have sync fields (`is_local`, `synced`, `pending_sync`) in DB but NOT in schema.ts
12. **Multiple tables** have `updated_at` and `description` columns in DB but not in schema.ts
13. **Nullability mismatches** on 8+ columns across `crashes`, `metrics`, `whatsapp_messages`, `notifications`
14. **Default value mismatches** on `equipment.status`, `build_deployments.status`, `whatsapp_stats.status`
15. **refresh_tokens.parent_id** exists in DB but not in schema.ts (self-referencing FK)
