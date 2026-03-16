-- T005 Phase C: CASCADE FK Migration (Higher Risk)
-- CASCADE means: deleting a parent automatically deletes all children
-- REVIEW CAREFULLY before executing. Each CASCADE FK can cause bulk deletes.
--
-- PREREQUISITES:
--   1. Phase A orphan detection complete (0 orphans)
--   2. Phase B safe FKs applied and validated
--   3. Full database backup taken
--   4. Reviewed each CASCADE relationship below for business impact

BEGIN;

-- ============================================================
-- PART 1: Fix existing FK drift (NO ACTION -> CASCADE)
-- ============================================================

-- equipment_movements.equipment_id -> CASCADE
-- RISK: Deleting equipment deletes all movement history
ALTER TABLE equipment_movements DROP CONSTRAINT IF EXISTS equipment_movements_equipment_id_fkey;
ALTER TABLE equipment_movements ADD CONSTRAINT equipment_movements_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE NOT VALID;

-- journal_lines.journal_entry_id -> CASCADE
-- RISK: Deleting a journal entry deletes all its lines (expected accounting behavior)
ALTER TABLE journal_lines DROP CONSTRAINT IF EXISTS journal_lines_journal_entry_id_fkey;
ALTER TABLE journal_lines ADD CONSTRAINT journal_lines_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE NOT VALID;

-- reconciliation_records.project_id -> CASCADE
-- RISK: Deleting a project deletes reconciliation records
ALTER TABLE reconciliation_records DROP CONSTRAINT IF EXISTS reconciliation_records_project_id_fkey;
ALTER TABLE reconciliation_records ADD CONSTRAINT reconciliation_records_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE NOT VALID;

-- summary_invalidations.project_id -> CASCADE
-- RISK: Low - invalidations are cache metadata
ALTER TABLE summary_invalidations DROP CONSTRAINT IF EXISTS summary_invalidations_project_id_fkey;
ALTER TABLE summary_invalidations ADD CONSTRAINT summary_invalidations_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE NOT VALID;

-- ============================================================
-- PART 2: Add NEW CASCADE FK constraints
-- ============================================================

-- worker_attendance.project_id -> CASCADE
-- RISK: Deleting a project deletes all attendance records
ALTER TABLE worker_attendance ADD CONSTRAINT worker_attendance_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE NOT VALID;

-- worker_attendance.worker_id -> CASCADE
-- RISK: Deleting a worker deletes their attendance history
ALTER TABLE worker_attendance ADD CONSTRAINT worker_attendance_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE NOT VALID;

-- supplier_payments.supplier_id -> CASCADE
-- RISK: Deleting a supplier deletes all payment records
ALTER TABLE supplier_payments ADD CONSTRAINT supplier_payments_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE NOT VALID;

-- supplier_payments.project_id -> CASCADE
ALTER TABLE supplier_payments ADD CONSTRAINT supplier_payments_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE NOT VALID;

-- transportation_expenses.project_id -> CASCADE
ALTER TABLE transportation_expenses ADD CONSTRAINT transportation_expenses_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE NOT VALID;

-- worker_transfers.worker_id -> CASCADE
-- RISK: Deleting a worker deletes transfer history
ALTER TABLE worker_transfers ADD CONSTRAINT worker_transfers_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE NOT VALID;

-- worker_transfers.project_id -> CASCADE
ALTER TABLE worker_transfers ADD CONSTRAINT worker_transfers_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE NOT VALID;

-- worker_balances.worker_id -> CASCADE
-- RISK: Deleting a worker deletes balance records
ALTER TABLE worker_balances ADD CONSTRAINT worker_balances_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE NOT VALID;

-- worker_balances.project_id -> CASCADE
ALTER TABLE worker_balances ADD CONSTRAINT worker_balances_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE NOT VALID;

-- daily_expense_summaries.project_id -> CASCADE
-- SKIPPED: FK constraint 'daily_expense_summaries_project_id_projects_id_fk' already exists in DB
-- To change to CASCADE, first DROP the existing constraint then re-add:
-- ALTER TABLE daily_expense_summaries DROP CONSTRAINT daily_expense_summaries_project_id_projects_id_fk;
-- ALTER TABLE daily_expense_summaries ADD CONSTRAINT daily_expense_summaries_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE NOT VALID;

-- worker_misc_expenses.project_id -> CASCADE
ALTER TABLE worker_misc_expenses ADD CONSTRAINT worker_misc_expenses_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE NOT VALID;

-- wells.project_id -> CASCADE
-- RISK: Deleting a project deletes all wells and cascades further
ALTER TABLE wells ADD CONSTRAINT wells_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE NOT VALID;

-- well_tasks.well_id -> CASCADE
ALTER TABLE well_tasks ADD CONSTRAINT well_tasks_well_id_fkey FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE NOT VALID;

-- well_task_accounts.task_id -> CASCADE
ALTER TABLE well_task_accounts ADD CONSTRAINT well_task_accounts_task_id_fkey FOREIGN KEY (task_id) REFERENCES well_tasks(id) ON DELETE CASCADE NOT VALID;

-- well_expenses.well_id -> CASCADE
ALTER TABLE well_expenses ADD CONSTRAINT well_expenses_well_id_fkey FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE NOT VALID;

-- email_verification_tokens.user_id -> CASCADE
ALTER TABLE email_verification_tokens ADD CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

-- password_reset_tokens.user_id -> CASCADE
ALTER TABLE password_reset_tokens ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

-- auth_user_sessions.user_id -> CASCADE
ALTER TABLE auth_user_sessions ADD CONSTRAINT auth_user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

-- notification_read_states.user_id -> CASCADE
ALTER TABLE notification_read_states ADD CONSTRAINT notification_read_states_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

-- user_project_permissions.user_id -> CASCADE
ALTER TABLE user_project_permissions ADD CONSTRAINT user_project_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

-- user_project_permissions.project_id -> CASCADE
ALTER TABLE user_project_permissions ADD CONSTRAINT user_project_permissions_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE NOT VALID;

-- security_policy_implementations.policy_id -> CASCADE
ALTER TABLE security_policy_implementations ADD CONSTRAINT security_policy_implementations_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES security_policies(id) ON DELETE CASCADE NOT VALID;

-- security_policy_violations.policy_id -> CASCADE
ALTER TABLE security_policy_violations ADD CONSTRAINT security_policy_violations_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES security_policies(id) ON DELETE CASCADE NOT VALID;

COMMIT;
