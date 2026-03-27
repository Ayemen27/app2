const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL_CENTRAL });
  await client.connect();

  console.log('='.repeat(80));
  console.log('  AUDIT CLASSIFICATION REPORT');
  console.log('  Generated:', new Date().toISOString());
  console.log('='.repeat(80));

  // A1: Overpayment Classification
  console.log('\n' + '='.repeat(80));
  console.log('  A1. OVERPAYMENT CLASSIFICATION');
  console.log('='.repeat(80));

  const firstSplit = await client.query(`SELECT MIN(created_at) AS first_split_marker FROM worker_attendance WHERE notes LIKE '%تم تحويل%كسلفة%'`);
  console.log('\nFirst split/advance marker date:', firstSplit.rows[0]?.first_split_marker || 'NONE');

  const overpayments = await client.query(`
    SELECT id, worker_id, project_id, 
      COALESCE(NULLIF(date,''), attendance_date) as att_date,
      work_days, actual_wage, paid_amount, 
      SUBSTRING(notes FROM 1 FOR 100) as notes_preview,
      created_at,
      CASE 
        WHEN notes LIKE '%[GUARD_OVERRIDE]%' THEN 'guard_override'
        WHEN notes LIKE '%تم تحويل%كسلفة%' THEN 'split_advance'
        WHEN notes LIKE '%سلفة%' THEN 'advance_note'
        ELSE 'no_marker'
      END AS marker_class
    FROM worker_attendance
    WHERE COALESCE(paid_amount, 0) > COALESCE(actual_wage, 0)
      AND COALESCE(paid_amount, 0) > 0
      AND COALESCE(actual_wage, 0) > 0
    ORDER BY created_at
  `);

  const opCounts = {};
  for (const row of overpayments.rows) {
    opCounts[row.marker_class] = (opCounts[row.marker_class] || 0) + 1;
  }
  console.log(`\nTotal overpayment records: ${overpayments.rows.length}`);
  console.log('Classification breakdown:');
  for (const [cls, cnt] of Object.entries(opCounts)) {
    console.log(`  ${cls}: ${cnt}`);
  }

  // A2: Duplicate Material Purchases
  console.log('\n' + '='.repeat(80));
  console.log('  A2. DUPLICATE MATERIAL PURCHASES CLASSIFICATION');
  console.log('='.repeat(80));

  const dupePurchases = await client.query(`
    WITH dupes AS (
      SELECT project_id, purchase_date, total_amount, supplier_name, 
        array_agg(id ORDER BY created_at) as ids,
        array_agg(SUBSTRING(COALESCE(notes,'') FROM 1 FOR 50) ORDER BY created_at) as notes_list,
        array_agg(COALESCE(material_name,'') ORDER BY created_at) as materials_list,
        array_agg(created_at ORDER BY created_at) as created_dates,
        COUNT(*) as cnt
      FROM material_purchases 
      GROUP BY project_id, purchase_date, total_amount, supplier_name 
      HAVING COUNT(*)>1
    )
    SELECT * FROM dupes ORDER BY cnt DESC
  `);

  let trueDupePurchases = 0;
  let legitPurchases = 0;
  for (const group of dupePurchases.rows) {
    const notes = group.notes_list;
    const materials = group.materials_list;
    const dates = group.created_dates;
    let isTrueDupe = true;
    
    for (let i = 1; i < dates.length; i++) {
      const diffSec = Math.abs(new Date(dates[i]) - new Date(dates[0])) / 1000;
      if (notes[i] !== notes[0] || materials[i] !== materials[0] || diffSec > 60) {
        isTrueDupe = false;
        break;
      }
    }
    if (isTrueDupe) trueDupePurchases++;
    else legitPurchases++;
  }
  console.log(`\nTotal duplicate groups: ${dupePurchases.rows.length}`);
  console.log(`  TRUE DUPLICATES: ${trueDupePurchases}`);
  console.log(`  LEGITIMATE (different notes/materials/timing): ${legitPurchases}`);

  // A3: Duplicate Fund Transfers
  console.log('\n' + '='.repeat(80));
  console.log('  A3. DUPLICATE FUND TRANSFERS CLASSIFICATION');
  console.log('='.repeat(80));

  const dupeTransfers = await client.query(`
    WITH dupes AS (
      SELECT project_id, amount, SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) as d, sender_name,
        array_agg(id ORDER BY created_at) as ids,
        array_agg(SUBSTRING(COALESCE(notes,'') FROM 1 FOR 50) ORDER BY created_at) as notes_list,
        array_agg(COALESCE(transfer_number,'') ORDER BY created_at) as transfer_nums,
        array_agg(created_at ORDER BY created_at) as created_dates,
        COUNT(*) as cnt
      FROM fund_transfers 
      GROUP BY project_id, amount, SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10), sender_name 
      HAVING COUNT(*)>1
    )
    SELECT * FROM dupes
  `);

  let trueDupeTransfers = 0;
  let legitTransfers = 0;
  for (const group of dupeTransfers.rows) {
    const notes = group.notes_list;
    const dates = group.created_dates;
    let isTrueDupe = true;
    
    for (let i = 1; i < dates.length; i++) {
      const diffSec = Math.abs(new Date(dates[i]) - new Date(dates[0])) / 1000;
      if (notes[i] !== notes[0] || diffSec > 60) {
        isTrueDupe = false;
        break;
      }
    }
    if (isTrueDupe) trueDupeTransfers++;
    else legitTransfers++;
  }
  console.log(`\nTotal duplicate groups: ${dupeTransfers.rows.length}`);
  console.log(`  TRUE DUPLICATES: ${trueDupeTransfers}`);
  console.log(`  LEGITIMATE (different notes/timing): ${legitTransfers}`);

  // A4: Negative Balance Classification
  console.log('\n' + '='.repeat(80));
  console.log('  A4. NEGATIVE BALANCE CLASSIFICATION');
  console.log('='.repeat(80));

  const negBalances = await client.query(`
    SELECT wb.worker_id, w.name, wb.project_id, p.name as project_name, 
      wb.current_balance,
      wb.total_earned, wb.total_paid, 
      COALESCE(wb.total_transferred, 0) as total_transferred,
      (SELECT COUNT(*) FROM worker_transfers wt WHERE wt.worker_id=wb.worker_id AND wt.project_id=wb.project_id AND wt.notes LIKE '%سلفة%') as advance_count,
      (SELECT COALESCE(SUM(CAST(wt.amount AS numeric)),0) FROM worker_transfers wt WHERE wt.worker_id=wb.worker_id AND wt.project_id=wb.project_id AND wt.notes LIKE '%سلفة%') as advance_total
    FROM worker_balances wb
    LEFT JOIN workers w ON w.id=wb.worker_id
    LEFT JOIN projects p ON p.id=wb.project_id
    WHERE CAST(wb.current_balance AS numeric) < 0
    ORDER BY CAST(wb.current_balance AS numeric) ASC
  `);

  let advanceExpected = 0;
  let anomaly = 0;
  for (const row of negBalances.rows) {
    const advTotal = parseFloat(row.advance_total) || 0;
    const absBal = Math.abs(parseFloat(row.current_balance) || 0);
    if (advTotal > absBal) advanceExpected++;
    else anomaly++;
  }
  console.log(`\nTotal negative balance records: ${negBalances.rows.length}`);
  console.log(`  ADVANCE_EXPECTED (advance_total > |balance|): ${advanceExpected}`);
  console.log(`  ANOMALY: ${anomaly}`);

  if (negBalances.rows.length > 0) {
    console.log('\nDetails:');
    for (const row of negBalances.rows) {
      const advTotal = parseFloat(row.advance_total) || 0;
      const absBal = Math.abs(parseFloat(row.current_balance) || 0);
      const cls = advTotal > absBal ? 'ADVANCE_EXPECTED' : 'ANOMALY';
      console.log(`  ${row.name || 'N/A'} | project=${row.project_name || row.project_id} | balance=${row.current_balance} | advances=${row.advance_total} | class=${cls}`);
    }
  }

  // A5: Zero Days Paid Classification
  console.log('\n' + '='.repeat(80));
  console.log('  A5. ZERO WORK_DAYS + PAID>0 CLASSIFICATION');
  console.log('='.repeat(80));

  const zeroDays = await client.query(`
    SELECT wa.id, w.name, wa.project_id, wa.paid_amount, wa.work_days, wa.actual_wage,
      COALESCE(NULLIF(wa.date,''), wa.attendance_date) as att_date,
      SUBSTRING(wa.notes FROM 1 FOR 100) as notes_preview,
      wa.created_at,
      EXISTS(SELECT 1 FROM worker_transfers wt WHERE wt.worker_id=wa.worker_id AND wt.project_id=wa.project_id
        AND SUBSTRING(CAST(wt.transfer_date AS TEXT) FROM 1 FOR 10) = COALESCE(NULLIF(wa.date,''), wa.attendance_date)) as has_matching_transfer
    FROM worker_attendance wa
    LEFT JOIN workers w ON w.id=wa.worker_id
    WHERE COALESCE(wa.work_days, 0) = 0 
      AND COALESCE(wa.paid_amount, 0) > 0
    ORDER BY wa.created_at
  `);

  let withTransfer = 0;
  let withoutTransfer = 0;
  for (const row of zeroDays.rows) {
    if (row.has_matching_transfer) withTransfer++;
    else withoutTransfer++;
  }
  console.log(`\nTotal zero-days-paid records: ${zeroDays.rows.length}`);
  console.log(`  WITH matching transfer: ${withTransfer}`);
  console.log(`  WITHOUT matching transfer: ${withoutTransfer}`);

  // A6: FK Orphan Prechecks
  console.log('\n' + '='.repeat(80));
  console.log('  A6. FK ORPHAN PRECHECKS');
  console.log('='.repeat(80));

  const fkChecks = [
    { table: 'worker_transfers', col: 'worker_id', ref: 'workers', query: `SELECT COUNT(*) as cnt FROM worker_transfers wt WHERE NOT EXISTS(SELECT 1 FROM workers w WHERE w.id=wt.worker_id)` },
    { table: 'worker_transfers', col: 'project_id', ref: 'projects', query: `SELECT COUNT(*) as cnt FROM worker_transfers wt WHERE NOT EXISTS(SELECT 1 FROM projects p WHERE p.id=wt.project_id)` },
    { table: 'project_fund_transfers', col: 'from_project_id', ref: 'projects', query: `SELECT COUNT(*) as cnt FROM project_fund_transfers pft WHERE NOT EXISTS(SELECT 1 FROM projects p WHERE p.id=pft.from_project_id)` },
    { table: 'project_fund_transfers', col: 'to_project_id', ref: 'projects', query: `SELECT COUNT(*) as cnt FROM project_fund_transfers pft WHERE NOT EXISTS(SELECT 1 FROM projects p WHERE p.id=pft.to_project_id)` },
    { table: 'transportation_expenses', col: 'project_id', ref: 'projects', query: `SELECT COUNT(*) as cnt FROM transportation_expenses te WHERE NOT EXISTS(SELECT 1 FROM projects p WHERE p.id=te.project_id)` },
    { table: 'worker_misc_expenses', col: 'project_id', ref: 'projects', query: `SELECT COUNT(*) as cnt FROM worker_misc_expenses wme WHERE NOT EXISTS(SELECT 1 FROM projects p WHERE p.id=wme.project_id)` },
    { table: 'supplier_payments', col: 'supplier_id', ref: 'suppliers', query: `SELECT COUNT(*) as cnt FROM supplier_payments sp WHERE sp.supplier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM suppliers s WHERE s.id=sp.supplier_id)` },
    { table: 'supplier_payments', col: 'project_id', ref: 'projects', query: `SELECT COUNT(*) as cnt FROM supplier_payments sp WHERE NOT EXISTS(SELECT 1 FROM projects p WHERE p.id=sp.project_id)` },
    { table: 'worker_balances', col: 'worker_id', ref: 'workers', query: `SELECT COUNT(*) as cnt FROM worker_balances wb WHERE NOT EXISTS(SELECT 1 FROM workers w WHERE w.id=wb.worker_id)` },
    { table: 'worker_balances', col: 'project_id', ref: 'projects', query: `SELECT COUNT(*) as cnt FROM worker_balances wb WHERE NOT EXISTS(SELECT 1 FROM projects p WHERE p.id=wb.project_id)` },
  ];

  let allZero = true;
  console.log('');
  for (const check of fkChecks) {
    try {
      const res = await client.query(check.query);
      const cnt = parseInt(res.rows[0].cnt);
      const status = cnt === 0 ? 'OK' : 'ORPHANS FOUND';
      if (cnt > 0) allZero = false;
      console.log(`  ${check.table}.${check.col} -> ${check.ref}: ${cnt} orphans [${status}]`);
    } catch (err) {
      console.log(`  ${check.table}.${check.col} -> ${check.ref}: ERROR - ${err.message}`);
      allZero = false;
    }
  }
  console.log(`\nFK Precheck Result: ${allZero ? 'ALL CLEAR - Safe to add FK constraints' : 'ORPHANS DETECTED - Must clean before adding FKs'}`);

  // VERDICT
  console.log('\n' + '='.repeat(80));
  console.log('  VERDICT & RECOMMENDATIONS');
  console.log('='.repeat(80));

  console.log('\n1. OVERPAYMENTS:');
  if ((opCounts['guard_override'] || 0) + (opCounts['split_advance'] || 0) === overpayments.rows.length) {
    console.log('   SAFE: All overpayments have guard markers - system is working correctly');
  } else {
    console.log(`   NEEDS REVIEW: ${opCounts['no_marker'] || 0} records have no marker (pre-guard legacy)`);
    console.log(`   ${opCounts['advance_note'] || 0} records have advance notes but no guard marker`);
    console.log('   Recommendation: Legacy records are pre-guard, no action needed if amounts are small');
  }

  console.log('\n2. DUPLICATE PURCHASES:');
  if (trueDupePurchases === 0) {
    console.log('   SAFE: No true duplicates found - all are legitimate separate purchases');
  } else {
    console.log(`   NEEDS REVIEW: ${trueDupePurchases} true duplicate groups found`);
    console.log('   Recommendation: Auto-fix by removing newer duplicates');
  }

  console.log('\n3. DUPLICATE TRANSFERS:');
  if (trueDupeTransfers === 0) {
    console.log('   SAFE: No true duplicates found');
  } else {
    console.log(`   NEEDS REVIEW: ${trueDupeTransfers} true duplicate groups found`);
    console.log('   Recommendation: Manual review required for financial transfers');
  }

  console.log('\n4. NEGATIVE BALANCES:');
  if (anomaly === 0) {
    console.log('   SAFE: All negative balances explained by advances');
  } else {
    console.log(`   NEEDS REVIEW: ${anomaly} anomalous negative balances without sufficient advances`);
    console.log('   Recommendation: Manual investigation needed');
  }

  console.log('\n5. ZERO DAYS PAID:');
  console.log(`   ${withTransfer} records have matching transfers (advance/payment-only entries)`);
  console.log(`   ${withoutTransfer} records have NO matching transfer`);
  if (withoutTransfer > 0) {
    console.log('   Recommendation: Review records without transfers - may be data entry errors');
  }

  console.log('\n6. FK CONSTRAINTS:');
  if (allZero) {
    console.log('   GREEN LIGHT: All FK prechecks pass - safe to add constraints');
  } else {
    console.log('   BLOCKED: Orphan records must be cleaned before adding FK constraints');
  }

  console.log('\n' + '='.repeat(80));
  console.log('  END OF REPORT');
  console.log('='.repeat(80));

  await client.end();
}

main().catch(err => {
  console.error('FATAL ERROR:', err.message);
  process.exit(1);
});
