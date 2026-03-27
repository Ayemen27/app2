const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL_CENTRAL, ssl: false });

async function safeQuery(label, sql, params) {
  try {
    const result = await pool.query(sql, params || []);
    return { label, rows: result.rows, count: result.rowCount, error: null };
  } catch (e) {
    return { label, rows: [], count: 0, error: e.message };
  }
}

function printSection(title) {
  console.log('\n' + '='.repeat(80));
  console.log('  ' + title);
  console.log('='.repeat(80));
}

function printResult(r) {
  if (r.error) {
    console.log('  [SKIPPED] ' + r.label + ': ' + r.error);
    return;
  }
  console.log('  ' + r.label + ': ' + r.count + ' row(s)');
  if (r.rows.length > 0) {
    console.table(r.rows.slice(0, 30));
  }
}

async function main() {
  console.log('================================================================');
  console.log('  AXION ERP - BUSINESS LOGIC INTEGRITY AUDIT (Phase 4)');
  console.log('================================================================');

  // 4A
  printSection('4A. WORKER WAGE RESOLUTION - Overlap/Gap Detection');

  const wageData = await safeQuery('Worker Project Wages',
    "SELECT wpw.worker_id, w.name, wpw.project_id, wpw.effective_from, wpw.effective_to, wpw.daily_wage FROM worker_project_wages wpw LEFT JOIN workers w ON w.id=wpw.worker_id ORDER BY wpw.worker_id, wpw.project_id, wpw.effective_from");

  if (wageData.error) {
    console.log('  [SKIPPED] Table worker_project_wages may not exist: ' + wageData.error);
  } else {
    console.log('  Total wage records: ' + wageData.count);
    if (wageData.rows.length > 0) console.table(wageData.rows.slice(0, 20));

    var grouped = {};
    for (var r of wageData.rows) {
      var key = r.worker_id + '||' + r.project_id;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    }
    var overlaps = [];
    for (var key of Object.keys(grouped)) {
      var records = grouped[key];
      for (var i = 0; i < records.length - 1; i++) {
        var curr = records[i];
        var next = records[i + 1];
        if (curr.effective_to && next.effective_from) {
          var currTo = new Date(curr.effective_to);
          var nextFrom = new Date(next.effective_from);
          if (currTo > nextFrom) {
            overlaps.push({ worker: curr.name, worker_id: curr.worker_id, project_id: curr.project_id, curr_to: String(curr.effective_to).slice(0,10), next_from: String(next.effective_from).slice(0,10), issue: 'OVERLAP' });
          } else if (currTo < nextFrom) {
            var diffDays = Math.round((nextFrom - currTo) / (1000*60*60*24));
            if (diffDays > 1) {
              overlaps.push({ worker: curr.name, worker_id: curr.worker_id, project_id: curr.project_id, curr_to: String(curr.effective_to).slice(0,10), next_from: String(next.effective_from).slice(0,10), gap_days: diffDays, issue: 'GAP' });
            }
          }
        }
      }
    }
    if (overlaps.length > 0) {
      console.log('  WARNING: Found ' + overlaps.length + ' overlap/gap issue(s):');
      console.table(overlaps.slice(0, 20));
    } else {
      console.log('  OK: No overlapping or gapped wage date ranges found.');
    }
  }

  // 4B
  printSection('4B. SETTLEMENT DUPLICATE EXECUTION GUARD');

  var dupSettlements = await safeQuery('Duplicate Settlements',
    "SELECT settlement_project_id, settlement_date, total_amount, COUNT(*) as cnt FROM worker_settlements GROUP BY 1,2,3 HAVING COUNT(*)>1");
  printResult(dupSettlements);
  if (!dupSettlements.error && dupSettlements.count === 0) console.log('  OK: No duplicate settlements found.');
  else if (!dupSettlements.error && dupSettlements.count > 0) console.log('  WARNING: DUPLICATE SETTLEMENTS DETECTED!');

  var dupSettlementTransfers = await safeQuery('Duplicate Settlement Transfers',
    "SELECT worker_id, project_id, amount, SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) as d, COUNT(*) as cnt FROM worker_transfers WHERE transfer_method='settlement' GROUP BY 1,2,3,4 HAVING COUNT(*)>1");
  printResult(dupSettlementTransfers);
  if (!dupSettlementTransfers.error && dupSettlementTransfers.count === 0) console.log('  OK: No duplicate settlement transfers found.');
  else if (!dupSettlementTransfers.error && dupSettlementTransfers.count > 0) console.log('  WARNING: DUPLICATE SETTLEMENT TRANSFERS DETECTED!');

  // 4C
  printSection('4C. OVERPAYMENT GUARD OUTCOMES');

  var overpayments = await safeQuery('Zero-WorkDays with Positive Payment',
    "SELECT wa.id, w.name, wa.paid_amount, wa.work_days, wa.actual_wage, wa.notes, COALESCE(NULLIF(wa.date,''),wa.attendance_date) as d FROM worker_attendance wa LEFT JOIN workers w ON w.id=wa.worker_id WHERE CAST(wa.work_days AS DECIMAL)=0 AND CAST(wa.paid_amount AS DECIMAL)>0 LIMIT 20");
  printResult(overpayments);
  if (!overpayments.error && overpayments.count === 0) console.log('  OK: No overpayment anomalies (work_days=0 with paid_amount>0).');
  else if (!overpayments.error && overpayments.count > 0) console.log('  WARNING: Found ' + overpayments.count + ' attendance record(s) with work_days=0 but paid_amount>0');

  var overpaymentTransfers = await safeQuery('Matching Transfers for Overpayment Records',
    "SELECT wa.id, wt.id as transfer_id, wt.amount, wt.notes FROM worker_attendance wa JOIN worker_transfers wt ON wt.worker_id=wa.worker_id AND wt.project_id=wa.project_id AND SUBSTRING(CAST(wt.transfer_date AS TEXT) FROM 1 FOR 10) = COALESCE(NULLIF(wa.date,''),wa.attendance_date) WHERE CAST(wa.work_days AS DECIMAL)=0 AND CAST(wa.paid_amount AS DECIMAL)>0");
  printResult(overpaymentTransfers);
  if (!overpaymentTransfers.error && overpaymentTransfers.count > 0) console.log('  WARNING: Some overpayment records have matching worker_transfers on the same date.');

  // 4D
  printSection('4D. NOTIFICATION CONSISTENCY');

  var dupReadStates = await safeQuery('Duplicate Notification Read States',
    "SELECT notification_id, user_id, COUNT(*) as cnt FROM notification_read_states GROUP BY 1,2 HAVING COUNT(*)>1");
  printResult(dupReadStates);
  if (!dupReadStates.error && dupReadStates.count === 0) console.log('  OK: No duplicate notification read states.');
  else if (!dupReadStates.error && dupReadStates.count > 0) console.log('  WARNING: DUPLICATE READ STATES DETECTED!');

  var unreadVerify = await safeQuery('Unread Count Verification (Sample 3 Users)',
    "WITH sample_users AS (SELECT DISTINCT user_id FROM notification_read_states LIMIT 3) SELECT su.user_id, (SELECT COUNT(*) FROM notifications n WHERE NOT EXISTS (SELECT 1 FROM notification_read_states nrs WHERE nrs.notification_id=n.id AND nrs.user_id=su.user_id AND nrs.is_read=true)) as computed_unread FROM sample_users su");
  printResult(unreadVerify);

  // 4E
  printSection('4E. PROJECT TOTAL RECONCILIATION');

  var reconciliation = await safeQuery('Daily Expense Summary Reconciliation',
    "SELECT des.project_id, p.name, SUM(CAST(des.total_fund_transfers AS DECIMAL)) as total_income_all_days, SUM(CAST(des.total_expenses AS DECIMAL)) as total_expenses_all_days, (SELECT CAST(remaining_balance AS DECIMAL) FROM daily_expense_summaries WHERE project_id=des.project_id ORDER BY date DESC LIMIT 1) as last_balance FROM daily_expense_summaries des LEFT JOIN projects p ON p.id=des.project_id GROUP BY des.project_id, p.name");

  if (reconciliation.error) {
    console.log('  [SKIPPED] ' + reconciliation.error);
  } else {
    console.log('  Projects analyzed: ' + reconciliation.count);
    var mismatches = [];
    var summary = [];
    for (var r of reconciliation.rows) {
      var income = parseFloat(r.total_income_all_days) || 0;
      var expenses = parseFloat(r.total_expenses_all_days) || 0;
      var lastBalance = parseFloat(r.last_balance) || 0;
      var expected = income - expenses;
      var diff = expected - lastBalance;
      var match = Math.abs(diff) <= 1 ? 'OK' : 'MISMATCH';
      summary.push({
        project: (r.name || r.project_id || '').substring(0, 30),
        income: income.toFixed(2),
        expenses: expenses.toFixed(2),
        expected_balance: expected.toFixed(2),
        actual_last_balance: lastBalance.toFixed(2),
        difference: diff.toFixed(2),
        status: match
      });
      if (Math.abs(diff) > 1) {
        mismatches.push(summary[summary.length - 1]);
      }
    }
    if (summary.length > 0) console.table(summary);
    if (mismatches.length > 0) {
      console.log('\n  WARNING: ' + mismatches.length + ' project(s) have reconciliation mismatches:');
      console.table(mismatches);
    } else {
      console.log('  OK: All projects reconcile correctly (income - expenses = last_balance).');
    }
  }

  // Summary
  printSection('AUDIT SUMMARY');
  var issues = [];
  if (wageData.error) issues.push('4A: worker_project_wages table not found (skipped)');
  if (!dupSettlements.error && dupSettlements.count > 0) issues.push('4B: ' + dupSettlements.count + ' duplicate settlement(s)');
  if (!dupSettlementTransfers.error && dupSettlementTransfers.count > 0) issues.push('4B: ' + dupSettlementTransfers.count + ' duplicate settlement transfer(s)');
  if (!overpayments.error && overpayments.count > 0) issues.push('4C: ' + overpayments.count + ' overpayment anomaly records');
  if (!overpaymentTransfers.error && overpaymentTransfers.count > 0) issues.push('4C: ' + overpaymentTransfers.count + ' matching transfers for overpayment records');
  if (!dupReadStates.error && dupReadStates.count > 0) issues.push('4D: ' + dupReadStates.count + ' duplicate notification read states');

  var reconIssue = false;
  if (!reconciliation.error) {
    for (var r of reconciliation.rows) {
      var income = parseFloat(r.total_income_all_days) || 0;
      var expenses = parseFloat(r.total_expenses_all_days) || 0;
      var lastBalance = parseFloat(r.last_balance) || 0;
      if (Math.abs((income - expenses) - lastBalance) > 1) { reconIssue = true; break; }
    }
  }
  if (reconIssue) issues.push('4E: Project reconciliation mismatches found');

  if (issues.length === 0) {
    console.log('  ALL CHECKS PASSED - No critical business logic issues detected.');
  } else {
    console.log('  ' + issues.length + ' issue(s) found:');
    issues.forEach(function(iss, i) { console.log('    ' + (i + 1) + '. ' + iss); });
  }

  await pool.end();
  console.log('\n  Audit complete.');
}

main().catch(function(e) { console.error('Fatal error:', e); process.exit(1); });
