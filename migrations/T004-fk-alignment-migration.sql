-- ============================================================================
-- T004: FK Constraint Alignment Migration
-- Generated from schema.ts vs live DB comparison
-- 
-- This script aligns the database FK onDelete policies with schema.ts definitions.
-- It uses ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT pattern for safety.
--
-- WARNING: Review carefully before executing. Some operations may fail if
-- there are orphaned rows that violate the new FK constraints.
--
-- RECOMMENDATION: Run within a transaction so it can be rolled back on error.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Fix onDelete policy drift on EXISTING constraints
-- These constraints exist in both schema.ts and DB but have wrong onDelete policy
-- Pattern: DROP old constraint, ADD new constraint with correct onDelete
-- ============================================================================

-- 1. daily_activity_logs.engineer_id: NO ACTION -> RESTRICT
ALTER TABLE daily_activity_logs DROP CONSTRAINT daily_activity_logs_engineer_id_fkey;
ALTER TABLE daily_activity_logs ADD CONSTRAINT daily_activity_logs_engineer_id_fkey
  FOREIGN KEY (engineer_id) REFERENCES users(id) ON DELETE RESTRICT;

-- 2. equipment.project_id: NO ACTION -> SET NULL
ALTER TABLE equipment DROP CONSTRAINT equipment_project_id_fkey;
ALTER TABLE equipment ADD CONSTRAINT equipment_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- 3. equipment_movements.equipment_id: NO ACTION -> CASCADE
ALTER TABLE equipment_movements DROP CONSTRAINT equipment_movements_equipment_id_fkey;
ALTER TABLE equipment_movements ADD CONSTRAINT equipment_movements_equipment_id_fkey
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE;

-- 4. equipment_movements.from_project_id: NO ACTION -> SET NULL
ALTER TABLE equipment_movements DROP CONSTRAINT equipment_movements_from_project_id_fkey;
ALTER TABLE equipment_movements ADD CONSTRAINT equipment_movements_from_project_id_fkey
  FOREIGN KEY (from_project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- 5. equipment_movements.to_project_id: NO ACTION -> SET NULL
ALTER TABLE equipment_movements DROP CONSTRAINT equipment_movements_to_project_id_fkey;
ALTER TABLE equipment_movements ADD CONSTRAINT equipment_movements_to_project_id_fkey
  FOREIGN KEY (to_project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- 6. financial_audit_log.project_id: NO ACTION -> SET NULL
ALTER TABLE financial_audit_log DROP CONSTRAINT financial_audit_log_project_id_fkey;
ALTER TABLE financial_audit_log ADD CONSTRAINT financial_audit_log_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- 7. financial_audit_log.user_id: NO ACTION -> SET NULL
ALTER TABLE financial_audit_log DROP CONSTRAINT financial_audit_log_user_id_fkey;
ALTER TABLE financial_audit_log ADD CONSTRAINT financial_audit_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- 8. journal_entries.created_by: NO ACTION -> SET NULL
ALTER TABLE journal_entries DROP CONSTRAINT journal_entries_created_by_fkey;
ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 9. journal_entries.project_id: NO ACTION -> SET NULL
ALTER TABLE journal_entries DROP CONSTRAINT journal_entries_project_id_fkey;
ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- 10. journal_lines.journal_entry_id: NO ACTION -> CASCADE
ALTER TABLE journal_lines DROP CONSTRAINT journal_lines_journal_entry_id_fkey;
ALTER TABLE journal_lines ADD CONSTRAINT journal_lines_journal_entry_id_fkey
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE;

-- 11. notifications.user_id: NO ACTION -> SET NULL
ALTER TABLE notifications DROP CONSTRAINT notifications_user_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- 12. reconciliation_records.project_id: NO ACTION -> CASCADE
ALTER TABLE reconciliation_records DROP CONSTRAINT reconciliation_records_project_id_fkey;
ALTER TABLE reconciliation_records ADD CONSTRAINT reconciliation_records_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- 13. reconciliation_records.resolved_by: NO ACTION -> SET NULL
ALTER TABLE reconciliation_records DROP CONSTRAINT reconciliation_records_resolved_by_fkey;
ALTER TABLE reconciliation_records ADD CONSTRAINT reconciliation_records_resolved_by_fkey
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL;

-- 14. summary_invalidations.project_id: NO ACTION -> CASCADE
ALTER TABLE summary_invalidations DROP CONSTRAINT summary_invalidations_project_id_fkey;
ALTER TABLE summary_invalidations ADD CONSTRAINT summary_invalidations_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- 15. suppliers.created_by: NO ACTION -> SET NULL
ALTER TABLE suppliers DROP CONSTRAINT suppliers_created_by_fkey;
ALTER TABLE suppliers ADD CONSTRAINT suppliers_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 16. sync_audit_logs.project_id: NO ACTION -> SET NULL
ALTER TABLE sync_audit_logs DROP CONSTRAINT sync_audit_logs_project_id_fkey;
ALTER TABLE sync_audit_logs ADD CONSTRAINT sync_audit_logs_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- 17. sync_audit_logs.user_id: NO ACTION -> SET NULL
ALTER TABLE sync_audit_logs DROP CONSTRAINT sync_audit_logs_user_id_fkey;
ALTER TABLE sync_audit_logs ADD CONSTRAINT sync_audit_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- 18. well_receptions.created_by: NO ACTION -> SET NULL
ALTER TABLE well_receptions DROP CONSTRAINT well_receptions_created_by_fkey;
ALTER TABLE well_receptions ADD CONSTRAINT well_receptions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 19. well_receptions.received_by: NO ACTION -> SET NULL
ALTER TABLE well_receptions DROP CONSTRAINT well_receptions_received_by_fkey;
ALTER TABLE well_receptions ADD CONSTRAINT well_receptions_received_by_fkey
  FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL;

-- 20. well_solar_components.created_by: NO ACTION -> SET NULL
ALTER TABLE well_solar_components DROP CONSTRAINT well_solar_components_created_by_fkey;
ALTER TABLE well_solar_components ADD CONSTRAINT well_solar_components_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 21. well_transport_details.created_by: NO ACTION -> SET NULL
ALTER TABLE well_transport_details DROP CONSTRAINT well_transport_details_created_by_fkey;
ALTER TABLE well_transport_details ADD CONSTRAINT well_transport_details_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 22. well_work_crews.created_by: NO ACTION -> SET NULL
ALTER TABLE well_work_crews DROP CONSTRAINT well_work_crews_created_by_fkey;
ALTER TABLE well_work_crews ADD CONSTRAINT well_work_crews_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 23. worker_project_wages.created_by: NO ACTION -> SET NULL
ALTER TABLE worker_project_wages DROP CONSTRAINT worker_project_wages_created_by_fkey;
ALTER TABLE worker_project_wages ADD CONSTRAINT worker_project_wages_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 24. workers.created_by: NO ACTION -> SET NULL
ALTER TABLE workers DROP CONSTRAINT workers_created_by_fkey;
ALTER TABLE workers ADD CONSTRAINT workers_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


-- ============================================================================
-- PART 2: Create MISSING FK constraints
-- These FKs are defined in schema.ts but have no constraint in the database.
-- Before adding, ensure no orphaned rows exist that would violate the constraint.
-- ============================================================================

-- notifications
ALTER TABLE notifications ADD CONSTRAINT notifications_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD CONSTRAINT notifications_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- worker_attendance
ALTER TABLE worker_attendance ADD CONSTRAINT worker_attendance_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE worker_attendance ADD CONSTRAINT worker_attendance_worker_id_fkey
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE;
ALTER TABLE worker_attendance ADD CONSTRAINT worker_attendance_well_id_fkey
  FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE SET NULL;

-- supplier_payments
ALTER TABLE supplier_payments ADD CONSTRAINT supplier_payments_supplier_id_fkey
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE;
ALTER TABLE supplier_payments ADD CONSTRAINT supplier_payments_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE supplier_payments ADD CONSTRAINT supplier_payments_purchase_id_fkey
  FOREIGN KEY (purchase_id) REFERENCES material_purchases(id) ON DELETE SET NULL;

-- transportation_expenses
ALTER TABLE transportation_expenses ADD CONSTRAINT transportation_expenses_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE transportation_expenses ADD CONSTRAINT transportation_expenses_worker_id_fkey
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE SET NULL;
ALTER TABLE transportation_expenses ADD CONSTRAINT transportation_expenses_well_id_fkey
  FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE SET NULL;

-- worker_transfers
ALTER TABLE worker_transfers ADD CONSTRAINT worker_transfers_worker_id_fkey
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE;
ALTER TABLE worker_transfers ADD CONSTRAINT worker_transfers_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- worker_balances
ALTER TABLE worker_balances ADD CONSTRAINT worker_balances_worker_id_fkey
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE;
ALTER TABLE worker_balances ADD CONSTRAINT worker_balances_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- daily_expense_summaries (project_id FK — note: the _fk suffix constraint exists for CASCADE match, 
-- but if it doesn't cover the onDelete, this adds it)
-- Check: daily_expense_summaries_project_id_projects_id_fk already exists with CASCADE — SKIP

-- worker_misc_expenses
ALTER TABLE worker_misc_expenses ADD CONSTRAINT worker_misc_expenses_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE worker_misc_expenses ADD CONSTRAINT worker_misc_expenses_well_id_fkey
  FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE SET NULL;

-- material_purchases (additional FKs beyond project_id and supplier_id which already exist)
ALTER TABLE material_purchases ADD CONSTRAINT material_purchases_material_id_fkey
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL;
ALTER TABLE material_purchases ADD CONSTRAINT material_purchases_well_id_fkey
  FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE SET NULL;

-- wells
ALTER TABLE wells ADD CONSTRAINT wells_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE wells ADD CONSTRAINT wells_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;

-- well_tasks
ALTER TABLE well_tasks ADD CONSTRAINT well_tasks_well_id_fkey
  FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE;
ALTER TABLE well_tasks ADD CONSTRAINT well_tasks_assigned_worker_id_fkey
  FOREIGN KEY (assigned_worker_id) REFERENCES workers(id) ON DELETE SET NULL;
ALTER TABLE well_tasks ADD CONSTRAINT well_tasks_completed_by_fkey
  FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE well_tasks ADD CONSTRAINT well_tasks_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- well_task_accounts
ALTER TABLE well_task_accounts ADD CONSTRAINT well_task_accounts_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES well_tasks(id) ON DELETE CASCADE;
ALTER TABLE well_task_accounts ADD CONSTRAINT well_task_accounts_accounted_by_fkey
  FOREIGN KEY (accounted_by) REFERENCES users(id) ON DELETE RESTRICT;

-- well_expenses
ALTER TABLE well_expenses ADD CONSTRAINT well_expenses_well_id_fkey
  FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE;
ALTER TABLE well_expenses ADD CONSTRAINT well_expenses_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;

-- well_audit_logs
ALTER TABLE well_audit_logs ADD CONSTRAINT well_audit_logs_well_id_fkey
  FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE SET NULL;
ALTER TABLE well_audit_logs ADD CONSTRAINT well_audit_logs_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES well_tasks(id) ON DELETE SET NULL;
ALTER TABLE well_audit_logs ADD CONSTRAINT well_audit_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

-- backup_logs
ALTER TABLE backup_logs ADD CONSTRAINT backup_logs_triggered_by_fkey
  FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL;

-- build_deployments
ALTER TABLE build_deployments ADD CONSTRAINT build_deployments_triggered_by_fkey
  FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL;

-- projects
ALTER TABLE projects ADD CONSTRAINT projects_project_type_id_fkey
  FOREIGN KEY (project_type_id) REFERENCES project_types(id) ON DELETE SET NULL;

-- user_project_permissions
ALTER TABLE user_project_permissions ADD CONSTRAINT user_project_permissions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_project_permissions ADD CONSTRAINT user_project_permissions_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE user_project_permissions ADD CONSTRAINT user_project_permissions_assigned_by_fkey
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;

-- permission_audit_logs
ALTER TABLE permission_audit_logs ADD CONSTRAINT permission_audit_logs_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE permission_audit_logs ADD CONSTRAINT permission_audit_logs_target_user_id_fkey
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE permission_audit_logs ADD CONSTRAINT permission_audit_logs_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- security_policy_suggestions
ALTER TABLE security_policy_suggestions ADD CONSTRAINT security_policy_suggestions_implemented_as_fkey
  FOREIGN KEY (implemented_as) REFERENCES security_policies(id) ON DELETE SET NULL;

-- security_policy_implementations
ALTER TABLE security_policy_implementations ADD CONSTRAINT security_policy_implementations_policy_id_fkey
  FOREIGN KEY (policy_id) REFERENCES security_policies(id) ON DELETE CASCADE;

-- security_policy_violations
ALTER TABLE security_policy_violations ADD CONSTRAINT security_policy_violations_policy_id_fkey
  FOREIGN KEY (policy_id) REFERENCES security_policies(id) ON DELETE CASCADE;

-- email_verification_tokens
ALTER TABLE email_verification_tokens ADD CONSTRAINT email_verification_tokens_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- password_reset_tokens
ALTER TABLE password_reset_tokens ADD CONSTRAINT password_reset_tokens_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- auth_user_sessions
ALTER TABLE auth_user_sessions ADD CONSTRAINT auth_user_sessions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- notification_read_states
ALTER TABLE notification_read_states ADD CONSTRAINT notification_read_states_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


-- ============================================================================
-- PART 3: Optional — Remove duplicate indexes
-- These are safe to drop as they are exact duplicates of other indexes.
-- Uncomment to execute.
-- ============================================================================

-- DROP INDEX IF EXISTS idx_daily_summaries_project_date;  -- duplicate of idx_daily_expense_summaries_project_date
-- DROP INDEX IF EXISTS idx_material_purchases_project_purchase_date;  -- duplicate of idx_material_purchases_project_date
-- DROP INDEX IF EXISTS idx_transportation_expenses_project_date;  -- duplicate of idx_transport_expenses_project_date
-- DROP INDEX IF EXISTS idx_project_fund_transfers_from_project_date;  -- duplicate of idx_project_fund_transfers_from_date
-- DROP INDEX IF EXISTS idx_project_fund_transfers_to_project_date;  -- duplicate of idx_project_fund_transfers_to_date


COMMIT;
