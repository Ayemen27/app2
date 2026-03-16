-- T005 Phase B: Safe FK Migration (SET NULL and RESTRICT policies only)
-- These are SAFE because:
--   SET NULL: if parent is deleted, child column becomes NULL (no data loss)
--   RESTRICT: prevents deletion of parent if children exist (no data loss)
--
-- PREREQUISITES:
--   1. Run Phase A orphan detection queries and resolve ALL orphans first
--   2. Take a database backup before running this script
--
-- PATTERN: ADD CONSTRAINT ... NOT VALID, then VALIDATE separately
-- This avoids holding ACCESS EXCLUSIVE locks during validation on large tables.

BEGIN;

-- ============================================================
-- PART 1: Fix existing FK onDelete drift (drop + recreate with correct policy)
-- These FKs exist in DB as NO ACTION but should be SET NULL or RESTRICT
-- ============================================================

-- audit_logs.user_id -> SKIPPED
-- NOTE: audit_logs.user_id is integer but users.id is varchar (UUID).
-- These types are incompatible for a direct FK constraint.
-- Options: (a) keep without FK and use application-level validation,
-- or (b) migrate audit_logs.user_id to varchar to match users.id.
-- Decision deferred — do NOT add this FK without resolving the type mismatch first.

-- equipment.project_id -> SET NULL
ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_project_id_fkey;
ALTER TABLE equipment ADD CONSTRAINT equipment_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL NOT VALID;

-- equipment_movements.from_project_id -> SET NULL
ALTER TABLE equipment_movements DROP CONSTRAINT IF EXISTS equipment_movements_from_project_id_fkey;
ALTER TABLE equipment_movements ADD CONSTRAINT equipment_movements_from_project_id_fkey FOREIGN KEY (from_project_id) REFERENCES projects(id) ON DELETE SET NULL NOT VALID;

-- equipment_movements.to_project_id -> SET NULL
ALTER TABLE equipment_movements DROP CONSTRAINT IF EXISTS equipment_movements_to_project_id_fkey;
ALTER TABLE equipment_movements ADD CONSTRAINT equipment_movements_to_project_id_fkey FOREIGN KEY (to_project_id) REFERENCES projects(id) ON DELETE SET NULL NOT VALID;

-- financial_audit_log.project_id -> SET NULL
ALTER TABLE financial_audit_log DROP CONSTRAINT IF EXISTS financial_audit_log_project_id_fkey;
ALTER TABLE financial_audit_log ADD CONSTRAINT financial_audit_log_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL NOT VALID;

-- financial_audit_log.user_id -> SET NULL
ALTER TABLE financial_audit_log DROP CONSTRAINT IF EXISTS financial_audit_log_user_id_fkey;
ALTER TABLE financial_audit_log ADD CONSTRAINT financial_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL NOT VALID;

-- journal_entries.created_by -> SET NULL
ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_created_by_fkey;
ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL NOT VALID;

-- journal_entries.project_id -> SET NULL
ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_project_id_fkey;
ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL NOT VALID;

-- notifications.user_id -> SET NULL
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL NOT VALID;

-- reconciliation_records.resolved_by -> SET NULL
ALTER TABLE reconciliation_records DROP CONSTRAINT IF EXISTS reconciliation_records_resolved_by_fkey;
ALTER TABLE reconciliation_records ADD CONSTRAINT reconciliation_records_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL NOT VALID;

-- suppliers.created_by -> SET NULL
ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS suppliers_created_by_fkey;
ALTER TABLE suppliers ADD CONSTRAINT suppliers_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL NOT VALID;

-- sync_audit_logs.project_id -> SET NULL
ALTER TABLE sync_audit_logs DROP CONSTRAINT IF EXISTS sync_audit_logs_project_id_fkey;
ALTER TABLE sync_audit_logs ADD CONSTRAINT sync_audit_logs_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL NOT VALID;

-- sync_audit_logs.user_id -> SET NULL
ALTER TABLE sync_audit_logs DROP CONSTRAINT IF EXISTS sync_audit_logs_user_id_fkey;
ALTER TABLE sync_audit_logs ADD CONSTRAINT sync_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL NOT VALID;

-- well_receptions.created_by -> SET NULL
ALTER TABLE well_receptions DROP CONSTRAINT IF EXISTS well_receptions_created_by_fkey;
ALTER TABLE well_receptions ADD CONSTRAINT well_receptions_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL NOT VALID;

-- well_receptions.received_by -> SET NULL
ALTER TABLE well_receptions DROP CONSTRAINT IF EXISTS well_receptions_received_by_fkey;
ALTER TABLE well_receptions ADD CONSTRAINT well_receptions_received_by_fkey FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL NOT VALID;

-- well_solar_components.created_by -> SET NULL
ALTER TABLE well_solar_components DROP CONSTRAINT IF EXISTS well_solar_components_created_by_fkey;
ALTER TABLE well_solar_components ADD CONSTRAINT well_solar_components_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL NOT VALID;

-- well_transport_details.created_by -> SET NULL
ALTER TABLE well_transport_details DROP CONSTRAINT IF EXISTS well_transport_details_created_by_fkey;
ALTER TABLE well_transport_details ADD CONSTRAINT well_transport_details_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL NOT VALID;

-- well_work_crews.created_by -> SET NULL
ALTER TABLE well_work_crews DROP CONSTRAINT IF EXISTS well_work_crews_created_by_fkey;
ALTER TABLE well_work_crews ADD CONSTRAINT well_work_crews_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL NOT VALID;

-- worker_project_wages.created_by -> SET NULL
ALTER TABLE worker_project_wages DROP CONSTRAINT IF EXISTS worker_project_wages_created_by_fkey;
ALTER TABLE worker_project_wages ADD CONSTRAINT worker_project_wages_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL NOT VALID;

-- workers.created_by -> SET NULL
ALTER TABLE workers DROP CONSTRAINT IF EXISTS workers_created_by_fkey;
ALTER TABLE workers ADD CONSTRAINT workers_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL NOT VALID;

-- ============================================================
-- PART 2: Add NEW FK constraints (SET NULL policy)
-- These FKs do NOT exist in DB at all
-- ============================================================

-- notifications.project_id -> SET NULL
ALTER TABLE notifications ADD CONSTRAINT notifications_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL NOT VALID;

-- notifications.created_by -> SET NULL
ALTER TABLE notifications ADD CONSTRAINT notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL NOT VALID;

-- worker_attendance.well_id -> SET NULL
ALTER TABLE worker_attendance ADD CONSTRAINT worker_attendance_well_id_fkey FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE SET NULL NOT VALID;

-- supplier_payments.purchase_id -> SET NULL
ALTER TABLE supplier_payments ADD CONSTRAINT supplier_payments_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES material_purchases(id) ON DELETE SET NULL NOT VALID;

-- transportation_expenses.worker_id -> SET NULL
ALTER TABLE transportation_expenses ADD CONSTRAINT transportation_expenses_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE SET NULL NOT VALID;

-- transportation_expenses.well_id -> SET NULL
ALTER TABLE transportation_expenses ADD CONSTRAINT transportation_expenses_well_id_fkey FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE SET NULL NOT VALID;

-- material_purchases.material_id -> SET NULL
ALTER TABLE material_purchases ADD CONSTRAINT material_purchases_material_id_fkey FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL NOT VALID;

-- material_purchases.well_id -> SET NULL
ALTER TABLE material_purchases ADD CONSTRAINT material_purchases_well_id_fkey FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE SET NULL NOT VALID;

-- well_tasks.assigned_worker_id -> SET NULL
ALTER TABLE well_tasks ADD CONSTRAINT well_tasks_assigned_worker_id_fkey FOREIGN KEY (assigned_worker_id) REFERENCES workers(id) ON DELETE SET NULL NOT VALID;

-- well_tasks.completed_by -> SET NULL
ALTER TABLE well_tasks ADD CONSTRAINT well_tasks_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL NOT VALID;

-- well_tasks.created_by -> SET NULL
ALTER TABLE well_tasks ADD CONSTRAINT well_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL NOT VALID;

-- well_audit_logs.well_id -> SET NULL
ALTER TABLE well_audit_logs ADD CONSTRAINT well_audit_logs_well_id_fkey FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE SET NULL NOT VALID;

-- well_audit_logs.task_id -> SET NULL
ALTER TABLE well_audit_logs ADD CONSTRAINT well_audit_logs_task_id_fkey FOREIGN KEY (task_id) REFERENCES well_tasks(id) ON DELETE SET NULL NOT VALID;

-- backup_logs.triggered_by -> SET NULL
ALTER TABLE backup_logs ADD CONSTRAINT backup_logs_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL NOT VALID;

-- build_deployments.triggered_by -> SET NULL
ALTER TABLE build_deployments ADD CONSTRAINT build_deployments_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL NOT VALID;

-- projects.project_type_id -> SET NULL
ALTER TABLE projects ADD CONSTRAINT projects_project_type_id_fkey FOREIGN KEY (project_type_id) REFERENCES project_types(id) ON DELETE SET NULL NOT VALID;

-- user_project_permissions.assigned_by -> SET NULL
ALTER TABLE user_project_permissions ADD CONSTRAINT user_project_permissions_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL NOT VALID;

-- permission_audit_logs.target_user_id -> SET NULL
ALTER TABLE permission_audit_logs ADD CONSTRAINT permission_audit_logs_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL NOT VALID;

-- permission_audit_logs.project_id -> SET NULL
ALTER TABLE permission_audit_logs ADD CONSTRAINT permission_audit_logs_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL NOT VALID;

-- security_policy_suggestions.implemented_as -> SET NULL
ALTER TABLE security_policy_suggestions ADD CONSTRAINT security_policy_suggestions_implemented_as_fkey FOREIGN KEY (implemented_as) REFERENCES security_policies(id) ON DELETE SET NULL NOT VALID;

-- worker_misc_expenses.well_id -> SET NULL
ALTER TABLE worker_misc_expenses ADD CONSTRAINT worker_misc_expenses_well_id_fkey FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE SET NULL NOT VALID;

-- ============================================================
-- PART 3: Add NEW FK constraints (RESTRICT policy)
-- RESTRICT prevents parent deletion when children exist - safe
-- ============================================================

-- daily_activity_logs.engineer_id -> RESTRICT
ALTER TABLE daily_activity_logs ADD CONSTRAINT daily_activity_logs_engineer_id_fkey FOREIGN KEY (engineer_id) REFERENCES users(id) ON DELETE RESTRICT NOT VALID;

-- wells.created_by -> RESTRICT
ALTER TABLE wells ADD CONSTRAINT wells_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT NOT VALID;

-- well_task_accounts.accounted_by -> RESTRICT
ALTER TABLE well_task_accounts ADD CONSTRAINT well_task_accounts_accounted_by_fkey FOREIGN KEY (accounted_by) REFERENCES users(id) ON DELETE RESTRICT NOT VALID;

-- well_expenses.created_by -> RESTRICT
ALTER TABLE well_expenses ADD CONSTRAINT well_expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT NOT VALID;

-- well_audit_logs.user_id -> RESTRICT
ALTER TABLE well_audit_logs ADD CONSTRAINT well_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT NOT VALID;

-- permission_audit_logs.actor_id -> RESTRICT
ALTER TABLE permission_audit_logs ADD CONSTRAINT permission_audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT NOT VALID;

COMMIT;
