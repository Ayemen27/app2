const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_CENTRAL,
  ssl: process.env.DATABASE_URL_CENTRAL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
});

const toTwo = (v) => Math.round(parseFloat(v || '0') * 100) / 100;

async function auditA1_SummaryVsRaw() {
  console.log('\n' + '='.repeat(80));
  console.log('A1. SUMMARY vs RAW DATA PARITY CHECK');
  console.log('='.repeat(80));

  const summaries = await pool.query(`
    SELECT id, project_id, date, carried_forward_amount,
      total_fund_transfers, total_worker_wages, total_material_costs,
      total_transportation_costs, total_worker_transfers, total_worker_misc_expenses,
      total_income, total_expenses, remaining_balance
    FROM daily_expense_summaries
    ORDER BY project_id, date
  `);

  console.log(`Total summary rows to check: ${summaries.rows.length}`);
  const mismatches = [];

  for (const row of summaries.rows) {
    const pid = row.project_id;
    const d = typeof row.date === 'string' ? row.date.substring(0, 10) : row.date?.toISOString?.()?.substring(0, 10) || String(row.date);

    const raw = await pool.query(`
      WITH fund AS (
        SELECT COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0) as v
        FROM fund_transfers
        WHERE project_id = $1 AND SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) = $2
      ),
      incoming AS (
        SELECT COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0) as v
        FROM project_fund_transfers
        WHERE to_project_id = $1 AND SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) = $2
      ),
      outgoing AS (
        SELECT COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0) as v
        FROM project_fund_transfers
        WHERE from_project_id = $1 AND SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) = $2
      ),
      wages AS (
        SELECT COALESCE(SUM(CAST(paid_amount AS DECIMAL(15,2))), 0) as v
        FROM worker_attendance
        WHERE project_id = $1 AND COALESCE(NULLIF(date,''), attendance_date) = $2
          AND CAST(paid_amount AS DECIMAL) > 0
      ),
      materials AS (
        SELECT COALESCE(SUM(
          CASE WHEN CAST(paid_amount AS DECIMAL) > 0 THEN CAST(paid_amount AS DECIMAL(15,2))
               ELSE CAST(total_amount AS DECIMAL(15,2)) END
        ), 0) as v
        FROM material_purchases
        WHERE project_id = $1 AND (purchase_type = 'نقد' OR purchase_type = 'نقداً') AND purchase_date = $2
      ),
      transport AS (
        SELECT COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0) as v
        FROM transportation_expenses
        WHERE project_id = $1 AND date = $2
      ),
      wtransfers AS (
        SELECT COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0) as v
        FROM worker_transfers
        WHERE project_id = $1 AND SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) = $2
      ),
      misc AS (
        SELECT COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0) as v
        FROM worker_misc_expenses
        WHERE project_id = $1 AND date = $2
      ),
      suppay AS (
        SELECT COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0) as v
        FROM supplier_payments
        WHERE project_id = $1 AND payment_date = $2
      )
      SELECT
        (SELECT v FROM fund) as fund_transfers,
        (SELECT v FROM incoming) as incoming_transfers,
        (SELECT v FROM outgoing) as outgoing_transfers,
        (SELECT v FROM wages) as worker_wages,
        (SELECT v FROM materials) as material_costs,
        (SELECT v FROM transport) as transport_costs,
        (SELECT v FROM wtransfers) as worker_transfer_costs,
        (SELECT v FROM misc) as misc_costs,
        (SELECT v FROM suppay) as supplier_payments
    `, [pid, d]);

    const r = raw.rows[0];
    const fundTransfers = toTwo(r.fund_transfers);
    const incomingTransfers = toTwo(r.incoming_transfers);
    const outgoingTransfers = toTwo(r.outgoing_transfers);
    const workerWages = toTwo(r.worker_wages);
    const materialCosts = toTwo(r.material_costs);
    const transportCosts = toTwo(r.transport_costs);
    const workerTransferCosts = toTwo(r.worker_transfer_costs);
    const miscCosts = toTwo(r.misc_costs);
    const supplierPayments = toTwo(r.supplier_payments);

    const expectedTotalFundTransfers = toTwo(String(fundTransfers + incomingTransfers));
    const expectedTotalExpenses = toTwo(String(workerWages + materialCosts + transportCosts + workerTransferCosts + miscCosts + outgoingTransfers + supplierPayments));

    const carriedForward = toTwo(row.carried_forward_amount);
    const expectedTotalIncome = toTwo(String(carriedForward + expectedTotalFundTransfers));
    const expectedRemainingBalance = toTwo(String(expectedTotalIncome - expectedTotalExpenses));

    const checks = [
      { field: 'total_fund_transfers', actual: toTwo(row.total_fund_transfers), expected: expectedTotalFundTransfers },
      { field: 'total_worker_wages', actual: toTwo(row.total_worker_wages), expected: workerWages },
      { field: 'total_material_costs', actual: toTwo(row.total_material_costs), expected: materialCosts },
      { field: 'total_transportation_costs', actual: toTwo(row.total_transportation_costs), expected: transportCosts },
      { field: 'total_worker_transfers', actual: toTwo(row.total_worker_transfers), expected: workerTransferCosts },
      { field: 'total_worker_misc_expenses', actual: toTwo(row.total_worker_misc_expenses), expected: miscCosts },
      { field: 'total_expenses', actual: toTwo(row.total_expenses), expected: expectedTotalExpenses },
      { field: 'total_income', actual: toTwo(row.total_income), expected: expectedTotalIncome },
      { field: 'remaining_balance', actual: toTwo(row.remaining_balance), expected: expectedRemainingBalance },
    ];

    const rowMismatches = checks.filter(c => Math.abs(c.expected - c.actual) > 0.005);
    if (rowMismatches.length > 0) {
      mismatches.push({ project_id: pid, date: d, issues: rowMismatches });
    }
  }

  if (mismatches.length === 0) {
    console.log(`\n[PASS] All ${summaries.rows.length} summary rows match raw data exactly.`);
  } else {
    console.log(`\n[FAIL] ${mismatches.length} summary rows have mismatches:`);
    for (const m of mismatches.slice(0, 50)) {
      console.log(`  Project: ${m.project_id}, Date: ${m.date}`);
      for (const issue of m.issues) {
        console.log(`    ${issue.field}: actual=${issue.actual}, expected=${issue.expected}, diff=${toTwo(String(Math.abs(issue.expected - issue.actual)))}`);
      }
    }
    if (mismatches.length > 50) {
      console.log(`  ... and ${mismatches.length - 50} more mismatches`);
    }
  }

  return mismatches.length === 0;
}

async function auditA2_CarriedForwardChain() {
  console.log('\n' + '='.repeat(80));
  console.log('A2. CARRIED FORWARD CHAIN CHECK');
  console.log('='.repeat(80));

  const result = await pool.query(`
    SELECT project_id, date, carried_forward_amount,
      LAG(remaining_balance) OVER (PARTITION BY project_id ORDER BY date) as prev_remaining,
      ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY date) as rn
    FROM daily_expense_summaries
    ORDER BY project_id, date
  `);

  const broken = result.rows.filter(r =>
    r.rn > 1 && r.prev_remaining !== null &&
    Math.abs(toTwo(r.carried_forward_amount) - toTwo(r.prev_remaining)) > 0.005
  );

  if (broken.length === 0) {
    console.log(`\n[PASS] All carried_forward chains are consistent (${result.rows.length} rows checked).`);
  } else {
    console.log(`\n[FAIL] ${broken.length} broken chain links found:`);
    for (const b of broken.slice(0, 50)) {
      const d = typeof b.date === 'string' ? b.date.substring(0, 10) : b.date?.toISOString?.()?.substring(0, 10) || String(b.date);
      console.log(`  Project: ${b.project_id}, Date: ${d}`);
      console.log(`    carried_forward=${toTwo(b.carried_forward_amount)}, prev_remaining_balance=${toTwo(b.prev_remaining)}, diff=${toTwo(String(Math.abs(toTwo(b.carried_forward_amount) - toTwo(b.prev_remaining))))}`);
    }
    if (broken.length > 50) {
      console.log(`  ... and ${broken.length - 50} more broken links`);
    }
  }

  return broken.length === 0;
}

async function auditA3_InterProjectTransferDualImpact() {
  console.log('\n' + '='.repeat(80));
  console.log('A3. INTER-PROJECT TRANSFER DUAL IMPACT CHECK');
  console.log('='.repeat(80));

  const transfers = await pool.query(`
    SELECT id, from_project_id, to_project_id, amount,
      SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) as transfer_date_str
    FROM project_fund_transfers
    WHERE transfer_date IS NOT NULL AND CAST(transfer_date AS TEXT) != ''
      AND CAST(transfer_date AS TEXT) ~ '^\\d{4}-\\d{2}-\\d{2}'
    ORDER BY transfer_date
  `);

  console.log(`Total inter-project transfers to check: ${transfers.rows.length}`);
  const issues = [];

  for (const t of transfers.rows) {
    const toSummary = await pool.query(`
      SELECT total_fund_transfers FROM daily_expense_summaries
      WHERE project_id = $1 AND date = $2
    `, [t.to_project_id, t.transfer_date_str]);

    const fromSummary = await pool.query(`
      SELECT total_expenses FROM daily_expense_summaries
      WHERE project_id = $1 AND date = $2
    `, [t.from_project_id, t.transfer_date_str]);

    const hasToSummary = toSummary.rows.length > 0;
    const hasFromSummary = fromSummary.rows.length > 0;

    if (!hasToSummary || !hasFromSummary) {
      issues.push({
        transfer_id: t.id,
        date: t.transfer_date_str,
        amount: toTwo(t.amount),
        from_project: t.from_project_id,
        to_project: t.to_project_id,
        missing_to_summary: !hasToSummary,
        missing_from_summary: !hasFromSummary,
      });
    }
  }

  if (issues.length === 0) {
    console.log(`\n[PASS] All ${transfers.rows.length} inter-project transfers have corresponding summaries on both sides.`);
  } else {
    console.log(`\n[FAIL] ${issues.length} inter-project transfers missing summary coverage:`);
    for (const i of issues.slice(0, 30)) {
      console.log(`  Transfer ${i.transfer_id}: ${i.from_project} -> ${i.to_project}, date=${i.date}, amount=${i.amount}`);
      if (i.missing_to_summary) console.log(`    Missing summary for TO project (${i.to_project})`);
      if (i.missing_from_summary) console.log(`    Missing summary for FROM project (${i.from_project})`);
    }
    if (issues.length > 30) {
      console.log(`  ... and ${issues.length - 30} more issues`);
    }
  }

  return issues.length === 0;
}

async function auditA4_PrecisionCheck() {
  console.log('\n' + '='.repeat(80));
  console.log('A4. PRECISION CHECK (>2 DECIMAL PLACES)');
  console.log('='.repeat(80));

  const result = await pool.query(`
    SELECT id, project_id, date,
      carried_forward_amount, total_fund_transfers, total_worker_wages,
      total_material_costs, total_transportation_costs, total_worker_transfers,
      total_worker_misc_expenses, total_income, total_expenses, remaining_balance
    FROM daily_expense_summaries
  `);

  const fields = [
    'carried_forward_amount', 'total_fund_transfers', 'total_worker_wages',
    'total_material_costs', 'total_transportation_costs', 'total_worker_transfers',
    'total_worker_misc_expenses', 'total_income', 'total_expenses', 'remaining_balance'
  ];

  const precisionIssues = [];

  for (const row of result.rows) {
    for (const f of fields) {
      const val = String(row[f] || '0');
      const dotIdx = val.indexOf('.');
      if (dotIdx >= 0) {
        const decimals = val.substring(dotIdx + 1).replace(/0+$/, '');
        if (decimals.length > 2) {
          const d = typeof row.date === 'string' ? row.date.substring(0, 10) : row.date?.toISOString?.()?.substring(0, 10) || String(row.date);
          precisionIssues.push({
            project_id: row.project_id,
            date: d,
            field: f,
            value: val,
            decimal_places: decimals.length,
          });
        }
      }
    }
  }

  if (precisionIssues.length === 0) {
    console.log(`\n[PASS] All ${result.rows.length} summary rows have values with <=2 decimal places.`);
  } else {
    console.log(`\n[FAIL] ${precisionIssues.length} values found with >2 decimal places:`);
    for (const p of precisionIssues.slice(0, 30)) {
      console.log(`  Project: ${p.project_id}, Date: ${p.date}, Field: ${p.field}, Value: ${p.value} (${p.decimal_places} decimals)`);
    }
    if (precisionIssues.length > 30) {
      console.log(`  ... and ${precisionIssues.length - 30} more issues`);
    }
  }

  return precisionIssues.length === 0;
}

async function main() {
  console.log('AXION ERP FINANCIAL SUMMARY DATA INTEGRITY AUDIT');
  console.log('='.repeat(80));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Database: ${process.env.DATABASE_URL_CENTRAL ? '(connected via DATABASE_URL_CENTRAL)' : 'NOT SET'}`);

  if (!process.env.DATABASE_URL_CENTRAL) {
    console.error('ERROR: DATABASE_URL_CENTRAL environment variable is not set.');
    process.exit(1);
  }

  try {
    await pool.query('SELECT 1');
    console.log('Database connection: OK');
  } catch (err) {
    console.error('Database connection FAILED:', err.message);
    process.exit(1);
  }

  const countResult = await pool.query('SELECT COUNT(*) as cnt FROM daily_expense_summaries');
  console.log(`Summary rows in database: ${countResult.rows[0].cnt}`);

  const results = {};

  results.A1 = await auditA1_SummaryVsRaw();
  results.A2 = await auditA2_CarriedForwardChain();
  results.A3 = await auditA3_InterProjectTransferDualImpact();
  results.A4 = await auditA4_PrecisionCheck();

  console.log('\n' + '='.repeat(80));
  console.log('AUDIT SUMMARY');
  console.log('='.repeat(80));
  console.log(`A1. Summary vs Raw Data Parity:        ${results.A1 ? '[PASS]' : '[FAIL]'}`);
  console.log(`A2. Carried Forward Chain:              ${results.A2 ? '[PASS]' : '[FAIL]'}`);
  console.log(`A3. Inter-Project Transfer Dual Impact: ${results.A3 ? '[PASS]' : '[FAIL]'}`);
  console.log(`A4. Precision Check:                    ${results.A4 ? '[PASS]' : '[FAIL]'}`);
  console.log('='.repeat(80));

  await pool.end();
}

main().catch(err => {
  console.error('Audit failed with error:', err);
  pool.end();
  process.exit(1);
});
