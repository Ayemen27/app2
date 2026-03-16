-- T005 Phase A: Orphan Detection Queries
-- Run ALL these queries BEFORE applying any FK constraints.
-- Any query returning rows means there are orphan records that must be cleaned first.
-- DO NOT proceed with Phase B/C until all orphan counts are 0.

-- ============================================================
-- SECTION 1: FK Policy Drift (DB has NO ACTION, schema wants SET NULL/CASCADE)
-- These FKs EXIST in DB but have wrong onDelete behavior
-- ============================================================

-- audit_logs.user_id -> users.id (SKIPPED: type mismatch integer vs varchar/UUID - cannot create FK)
-- SELECT 'audit_logs.user_id' AS fk, COUNT(*) AS orphans FROM audit_logs a WHERE a.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = a.user_id::text);

-- equipment.project_id -> projects.id (schema wants SET NULL)
SELECT 'equipment.project_id' AS fk, COUNT(*) AS orphans FROM equipment e WHERE e.project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = e.project_id);

-- equipment_movements.equipment_id -> equipment.id (schema wants CASCADE)
SELECT 'equipment_movements.equipment_id' AS fk, COUNT(*) AS orphans FROM equipment_movements em WHERE NOT EXISTS (SELECT 1 FROM equipment e WHERE e.id = em.equipment_id);

-- equipment_movements.from_project_id -> projects.id (schema wants SET NULL)
SELECT 'equipment_movements.from_project_id' AS fk, COUNT(*) AS orphans FROM equipment_movements em WHERE em.from_project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = em.from_project_id);

-- equipment_movements.to_project_id -> projects.id (schema wants SET NULL)
SELECT 'equipment_movements.to_project_id' AS fk, COUNT(*) AS orphans FROM equipment_movements em WHERE em.to_project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = em.to_project_id);

-- financial_audit_log.project_id -> projects.id (schema wants SET NULL)
SELECT 'financial_audit_log.project_id' AS fk, COUNT(*) AS orphans FROM financial_audit_log f WHERE f.project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = f.project_id);

-- financial_audit_log.user_id -> users.id (schema wants SET NULL)
SELECT 'financial_audit_log.user_id' AS fk, COUNT(*) AS orphans FROM financial_audit_log f WHERE f.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = f.user_id);

-- journal_entries.created_by -> users.id (schema wants SET NULL)
SELECT 'journal_entries.created_by' AS fk, COUNT(*) AS orphans FROM journal_entries j WHERE j.created_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = j.created_by);

-- journal_entries.project_id -> projects.id (schema wants SET NULL)
SELECT 'journal_entries.project_id' AS fk, COUNT(*) AS orphans FROM journal_entries j WHERE j.project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = j.project_id);

-- journal_lines.journal_entry_id -> journal_entries.id (schema wants CASCADE)
SELECT 'journal_lines.journal_entry_id' AS fk, COUNT(*) AS orphans FROM journal_lines jl WHERE NOT EXISTS (SELECT 1 FROM journal_entries je WHERE je.id = jl.journal_entry_id);

-- notifications.user_id -> users.id (schema wants SET NULL)
SELECT 'notifications.user_id' AS fk, COUNT(*) AS orphans FROM notifications n WHERE n.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = n.user_id);

-- reconciliation_records.project_id -> projects.id (schema wants CASCADE)
SELECT 'reconciliation_records.project_id' AS fk, COUNT(*) AS orphans FROM reconciliation_records r WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = r.project_id);

-- reconciliation_records.resolved_by -> users.id (schema wants SET NULL)
SELECT 'reconciliation_records.resolved_by' AS fk, COUNT(*) AS orphans FROM reconciliation_records r WHERE r.resolved_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = r.resolved_by);

-- summary_invalidations.project_id -> projects.id (schema wants CASCADE)
SELECT 'summary_invalidations.project_id' AS fk, COUNT(*) AS orphans FROM summary_invalidations s WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = s.project_id);

-- suppliers.created_by -> users.id (schema wants SET NULL)
SELECT 'suppliers.created_by' AS fk, COUNT(*) AS orphans FROM suppliers s WHERE s.created_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s.created_by);

-- sync_audit_logs.project_id -> projects.id (schema wants SET NULL)
SELECT 'sync_audit_logs.project_id' AS fk, COUNT(*) AS orphans FROM sync_audit_logs s WHERE s.project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = s.project_id);

-- sync_audit_logs.user_id -> users.id (schema wants SET NULL)
SELECT 'sync_audit_logs.user_id' AS fk, COUNT(*) AS orphans FROM sync_audit_logs s WHERE s.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id);

-- well_receptions.created_by -> users.id (schema wants SET NULL)
SELECT 'well_receptions.created_by' AS fk, COUNT(*) AS orphans FROM well_receptions w WHERE w.created_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = w.created_by);

-- well_receptions.received_by -> users.id (schema wants SET NULL)
SELECT 'well_receptions.received_by' AS fk, COUNT(*) AS orphans FROM well_receptions w WHERE w.received_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = w.received_by);

-- well_solar_components.created_by -> users.id (schema wants SET NULL)
SELECT 'well_solar_components.created_by' AS fk, COUNT(*) AS orphans FROM well_solar_components w WHERE w.created_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = w.created_by);

-- well_transport_details.created_by -> users.id (schema wants SET NULL)
SELECT 'well_transport_details.created_by' AS fk, COUNT(*) AS orphans FROM well_transport_details w WHERE w.created_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = w.created_by);

-- well_work_crews.created_by -> users.id (schema wants SET NULL)
SELECT 'well_work_crews.created_by' AS fk, COUNT(*) AS orphans FROM well_work_crews w WHERE w.created_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = w.created_by);

-- worker_project_wages.created_by -> users.id (schema wants SET NULL)
SELECT 'worker_project_wages.created_by' AS fk, COUNT(*) AS orphans FROM worker_project_wages w WHERE w.created_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = w.created_by);

-- workers.created_by -> users.id (schema wants SET NULL)
SELECT 'workers.created_by' AS fk, COUNT(*) AS orphans FROM workers w WHERE w.created_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = w.created_by);


-- ============================================================
-- SECTION 2: Missing FK Constraints (schema has FK, DB does not)
-- ============================================================

-- notifications.project_id -> projects.id
SELECT 'notifications.project_id' AS fk, COUNT(*) AS orphans FROM notifications n WHERE n.project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = n.project_id);

-- notifications.created_by -> users.id
SELECT 'notifications.created_by' AS fk, COUNT(*) AS orphans FROM notifications n WHERE n.created_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = n.created_by);

-- worker_attendance.project_id -> projects.id
SELECT 'worker_attendance.project_id' AS fk, COUNT(*) AS orphans FROM worker_attendance wa WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = wa.project_id);

-- worker_attendance.worker_id -> workers.id
SELECT 'worker_attendance.worker_id' AS fk, COUNT(*) AS orphans FROM worker_attendance wa WHERE NOT EXISTS (SELECT 1 FROM workers w WHERE w.id = wa.worker_id);

-- worker_attendance.well_id -> wells.id
SELECT 'worker_attendance.well_id' AS fk, COUNT(*) AS orphans FROM worker_attendance wa WHERE wa.well_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM wells w WHERE w.id = wa.well_id::int);

-- supplier_payments.supplier_id -> suppliers.id
SELECT 'supplier_payments.supplier_id' AS fk, COUNT(*) AS orphans FROM supplier_payments sp WHERE NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.id = sp.supplier_id);

-- supplier_payments.project_id -> projects.id
SELECT 'supplier_payments.project_id' AS fk, COUNT(*) AS orphans FROM supplier_payments sp WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = sp.project_id);

-- supplier_payments.purchase_id -> material_purchases.id
SELECT 'supplier_payments.purchase_id' AS fk, COUNT(*) AS orphans FROM supplier_payments sp WHERE sp.purchase_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM material_purchases mp WHERE mp.id = sp.purchase_id);

-- transportation_expenses.project_id -> projects.id
SELECT 'transportation_expenses.project_id' AS fk, COUNT(*) AS orphans FROM transportation_expenses te WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = te.project_id);

-- transportation_expenses.worker_id -> workers.id
SELECT 'transportation_expenses.worker_id' AS fk, COUNT(*) AS orphans FROM transportation_expenses te WHERE te.worker_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM workers w WHERE w.id = te.worker_id);

-- transportation_expenses.well_id -> wells.id
SELECT 'transportation_expenses.well_id' AS fk, COUNT(*) AS orphans FROM transportation_expenses te WHERE te.well_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM wells w WHERE w.id = te.well_id::int);

-- worker_transfers.worker_id -> workers.id
SELECT 'worker_transfers.worker_id' AS fk, COUNT(*) AS orphans FROM worker_transfers wt WHERE NOT EXISTS (SELECT 1 FROM workers w WHERE w.id = wt.worker_id);

-- worker_transfers.project_id -> projects.id
SELECT 'worker_transfers.project_id' AS fk, COUNT(*) AS orphans FROM worker_transfers wt WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = wt.project_id);

-- worker_balances.worker_id -> workers.id
SELECT 'worker_balances.worker_id' AS fk, COUNT(*) AS orphans FROM worker_balances wb WHERE NOT EXISTS (SELECT 1 FROM workers w WHERE w.id = wb.worker_id);

-- worker_balances.project_id -> projects.id
SELECT 'worker_balances.project_id' AS fk, COUNT(*) AS orphans FROM worker_balances wb WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = wb.project_id);

-- daily_activity_logs.engineer_id -> users.id (RESTRICT)
SELECT 'daily_activity_logs.engineer_id' AS fk, COUNT(*) AS orphans FROM daily_activity_logs dal WHERE dal.engineer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = dal.engineer_id);

-- daily_expense_summaries.project_id -> projects.id
SELECT 'daily_expense_summaries.project_id' AS fk, COUNT(*) AS orphans FROM daily_expense_summaries des WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = des.project_id);

-- worker_misc_expenses.project_id -> projects.id
SELECT 'worker_misc_expenses.project_id' AS fk, COUNT(*) AS orphans FROM worker_misc_expenses wme WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = wme.project_id);

-- worker_misc_expenses.well_id -> wells.id
SELECT 'worker_misc_expenses.well_id' AS fk, COUNT(*) AS orphans FROM worker_misc_expenses wme WHERE wme.well_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM wells w WHERE w.id = wme.well_id::int);

-- material_purchases.material_id -> materials.id
SELECT 'material_purchases.material_id' AS fk, COUNT(*) AS orphans FROM material_purchases mp WHERE mp.material_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM materials m WHERE m.id = mp.material_id);

-- material_purchases.well_id -> wells.id
SELECT 'material_purchases.well_id' AS fk, COUNT(*) AS orphans FROM material_purchases mp WHERE mp.well_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM wells w WHERE w.id = mp.well_id::int);

-- wells.project_id -> projects.id
SELECT 'wells.project_id' AS fk, COUNT(*) AS orphans FROM wells w WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = w.project_id);

-- wells.created_by -> users.id (RESTRICT)
SELECT 'wells.created_by' AS fk, COUNT(*) AS orphans FROM wells w WHERE w.created_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = w.created_by);

-- well_tasks.well_id -> wells.id
SELECT 'well_tasks.well_id' AS fk, COUNT(*) AS orphans FROM well_tasks wt WHERE NOT EXISTS (SELECT 1 FROM wells w WHERE w.id = wt.well_id);

-- well_task_accounts.task_id -> well_tasks.id
SELECT 'well_task_accounts.task_id' AS fk, COUNT(*) AS orphans FROM well_task_accounts wta WHERE NOT EXISTS (SELECT 1 FROM well_tasks wt WHERE wt.id = wta.task_id);

-- well_expenses.well_id -> wells.id
SELECT 'well_expenses.well_id' AS fk, COUNT(*) AS orphans FROM well_expenses we WHERE NOT EXISTS (SELECT 1 FROM wells w WHERE w.id = we.well_id);

-- well_audit_logs.well_id -> wells.id
SELECT 'well_audit_logs.well_id' AS fk, COUNT(*) AS orphans FROM well_audit_logs wal WHERE wal.well_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM wells w WHERE w.id = wal.well_id);

-- email_verification_tokens.user_id -> users.id
SELECT 'email_verification_tokens.user_id' AS fk, COUNT(*) AS orphans FROM email_verification_tokens evt WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = evt.user_id);

-- password_reset_tokens.user_id -> users.id
SELECT 'password_reset_tokens.user_id' AS fk, COUNT(*) AS orphans FROM password_reset_tokens prt WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = prt.user_id);

-- auth_user_sessions.user_id -> users.id
SELECT 'auth_user_sessions.user_id' AS fk, COUNT(*) AS orphans FROM auth_user_sessions aus WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = aus.user_id);

-- notification_read_states.user_id -> users.id
SELECT 'notification_read_states.user_id' AS fk, COUNT(*) AS orphans FROM notification_read_states nrs WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = nrs.user_id);

-- projects.project_type_id -> project_types.id
SELECT 'projects.project_type_id' AS fk, COUNT(*) AS orphans FROM projects p WHERE p.project_type_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM project_types pt WHERE pt.id = p.project_type_id);

-- user_project_permissions.user_id -> users.id
SELECT 'user_project_permissions.user_id' AS fk, COUNT(*) AS orphans FROM user_project_permissions upp WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = upp.user_id);

-- user_project_permissions.project_id -> projects.id
SELECT 'user_project_permissions.project_id' AS fk, COUNT(*) AS orphans FROM user_project_permissions upp WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = upp.project_id);
