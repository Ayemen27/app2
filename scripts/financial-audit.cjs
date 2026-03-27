const { Client } = require('pg');

async function runAudit() {
  const client = new Client({ connectionString: process.env.DATABASE_URL_CENTRAL });
  await client.connect();
  
  const report = {};
  
  async function safeQuery(label, sql) {
    try {
      const result = await client.query(sql);
      return result.rows;
    } catch (err) {
      console.error(`[ERROR] ${label}: ${err.message}`);
      return { error: err.message };
    }
  }

  console.log('='.repeat(80));
  console.log('AXION ERP - FINANCIAL EDGE CASES & CALCULATION AUDIT');
  console.log('='.repeat(80));
  console.log(`Run at: ${new Date().toISOString()}\n`);

  // 2A. Negative Balances
  console.log('\n## 2A. NEGATIVE BALANCES');
  console.log('-'.repeat(40));
  const negBalances = await safeQuery('2A', `
    SELECT wb.worker_id, w.name, wb.project_id, p.name as project_name, wb.current_balance 
    FROM worker_balances wb 
    LEFT JOIN workers w ON w.id=wb.worker_id 
    LEFT JOIN projects p ON p.id=wb.project_id 
    WHERE wb.current_balance::numeric < 0 
    ORDER BY wb.current_balance::numeric ASC
  `);
  if (negBalances.error) {
    console.log(`Error: ${negBalances.error}`);
    report['2A'] = { status: 'ERROR', error: negBalances.error };
  } else {
    console.log(`Total negative balances: ${negBalances.length}`);
    console.log('Top 10 (most negative):');
    negBalances.slice(0, 10).forEach((r, i) => {
      console.log(`  ${i+1}. Worker: ${r.name || r.worker_id} | Project: ${r.project_name || r.project_id} | Balance: ${r.current_balance}`);
    });
    report['2A'] = { status: 'OK', count: negBalances.length, top10: negBalances.slice(0, 10) };
  }

  // 2B. Zero-Amount Records
  console.log('\n## 2B. ZERO-AMOUNT RECORDS (potentially invalid)');
  console.log('-'.repeat(40));
  const zeroAmounts = await safeQuery('2B', `
    SELECT COUNT(*)::int as cnt FROM worker_attendance 
    WHERE COALESCE(CAST(paid_amount AS DECIMAL),0)=0 
    AND COALESCE(CAST(work_days AS DECIMAL),0)=0
  `);
  if (zeroAmounts.error) {
    console.log(`Error: ${zeroAmounts.error}`);
    report['2B'] = { status: 'ERROR', error: zeroAmounts.error };
  } else {
    const cnt = zeroAmounts[0].cnt;
    console.log(`Zero paid_amount AND zero work_days records: ${cnt}`);
    report['2B'] = { status: 'OK', count: cnt };
  }

  // 2C. Large Transaction Anomalies (>500,000)
  console.log('\n## 2C. LARGE TRANSACTION ANOMALIES (>500,000)');
  console.log('-'.repeat(40));
  const largeTx = await safeQuery('2C', `
    SELECT 'fund_transfers' as tbl, id, amount FROM fund_transfers WHERE CAST(amount AS DECIMAL)>500000
    UNION ALL SELECT 'material_purchases', id, total_amount FROM material_purchases WHERE CAST(total_amount AS DECIMAL)>500000
    UNION ALL SELECT 'project_fund_transfers', id, amount FROM project_fund_transfers WHERE CAST(amount AS DECIMAL)>500000
    UNION ALL SELECT 'worker_transfers', id, amount FROM worker_transfers WHERE CAST(amount AS DECIMAL)>500000
  `);
  if (largeTx.error) {
    console.log(`Error: ${largeTx.error}`);
    report['2C'] = { status: 'ERROR', error: largeTx.error };
  } else {
    console.log(`Large transactions found: ${largeTx.length}`);
    largeTx.forEach((r, i) => {
      console.log(`  ${i+1}. Table: ${r.tbl} | ID: ${r.id} | Amount: ${r.amount}`);
    });
    report['2C'] = { status: 'OK', count: largeTx.length, records: largeTx };
  }

  // 2D. Date Anomalies - Future dates
  console.log('\n## 2D-1. DATE ANOMALIES - FUTURE DATES');
  console.log('-'.repeat(40));
  const futureDates = await safeQuery('2D-future', `
    SELECT 'worker_attendance' as tbl, id, COALESCE(NULLIF(date,''),attendance_date) as d FROM worker_attendance WHERE COALESCE(NULLIF(date,''),attendance_date)::date > CURRENT_DATE
    UNION ALL SELECT 'fund_transfers', id, SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10) FROM fund_transfers WHERE SUBSTRING(CAST(transfer_date AS TEXT) FROM 1 FOR 10)::date > CURRENT_DATE
    UNION ALL SELECT 'material_purchases', id, purchase_date FROM material_purchases WHERE purchase_date::date > CURRENT_DATE
  `);
  if (futureDates.error) {
    console.log(`Error: ${futureDates.error}`);
    report['2D_future'] = { status: 'ERROR', error: futureDates.error };
  } else {
    console.log(`Future-dated records: ${futureDates.length}`);
    futureDates.forEach((r, i) => {
      console.log(`  ${i+1}. Table: ${r.tbl} | ID: ${r.id} | Date: ${r.d}`);
    });
    report['2D_future'] = { status: 'OK', count: futureDates.length, records: futureDates };
  }

  // 2D. Date Anomalies - Very old dates
  console.log('\n## 2D-2. DATE ANOMALIES - VERY OLD DATES (before 2024)');
  console.log('-'.repeat(40));
  const oldDates = await safeQuery('2D-old', `
    SELECT 'worker_attendance' as tbl, id, COALESCE(NULLIF(date,''),attendance_date) as d 
    FROM worker_attendance 
    WHERE COALESCE(NULLIF(date,''),attendance_date) != '' 
    AND COALESCE(NULLIF(date,''),attendance_date)::date < '2024-01-01'::date
  `);
  if (oldDates.error) {
    console.log(`Error: ${oldDates.error}`);
    report['2D_old'] = { status: 'ERROR', error: oldDates.error };
  } else {
    console.log(`Records with dates before 2024: ${oldDates.length}`);
    oldDates.slice(0, 20).forEach((r, i) => {
      console.log(`  ${i+1}. Table: ${r.tbl} | ID: ${r.id} | Date: ${r.d}`);
    });
    if (oldDates.length > 20) console.log(`  ... and ${oldDates.length - 20} more`);
    report['2D_old'] = { status: 'OK', count: oldDates.length, sample: oldDates.slice(0, 20) };
  }

  // 2E. Overpayment Check
  console.log('\n## 2E. OVERPAYMENT CHECK (paid_amount > actual_wage)');
  console.log('-'.repeat(40));
  const overpayments = await safeQuery('2E', `
    SELECT wa.id, w.name, wa.paid_amount, wa.actual_wage, wa.project_id, COALESCE(NULLIF(wa.date,''),wa.attendance_date) as d
    FROM worker_attendance wa
    LEFT JOIN workers w ON w.id=wa.worker_id
    WHERE CAST(wa.paid_amount AS DECIMAL) > CAST(wa.actual_wage AS DECIMAL) 
    AND CAST(wa.paid_amount AS DECIMAL) > 0 
    AND CAST(wa.actual_wage AS DECIMAL) > 0
  `);
  if (overpayments.error) {
    console.log(`Error: ${overpayments.error}`);
    report['2E'] = { status: 'ERROR', error: overpayments.error };
  } else {
    console.log(`Overpayment records: ${overpayments.length}`);
    overpayments.slice(0, 15).forEach((r, i) => {
      console.log(`  ${i+1}. Worker: ${r.name || 'N/A'} | Paid: ${r.paid_amount} | Wage: ${r.actual_wage} | Date: ${r.d} | Project: ${r.project_id}`);
    });
    if (overpayments.length > 15) console.log(`  ... and ${overpayments.length - 15} more`);
    report['2E'] = { status: 'OK', count: overpayments.length, sample: overpayments.slice(0, 15) };
  }

  // 2F. Amount Format Issues - worker_attendance
  console.log('\n## 2F. AMOUNT FORMAT ISSUES');
  console.log('-'.repeat(40));
  const badAmountsWA = await safeQuery('2F-attendance', `
    SELECT COUNT(*)::int as bad_amounts FROM worker_attendance 
    WHERE paid_amount IS NOT NULL AND paid_amount::text != '' 
    AND paid_amount::text !~ '^[0-9]+(\\.[0-9]+)?$'
  `);
  if (badAmountsWA.error) {
    console.log(`Worker attendance bad amounts - Error: ${badAmountsWA.error}`);
    report['2F_attendance'] = { status: 'ERROR', error: badAmountsWA.error };
  } else {
    console.log(`Worker attendance - bad amount formats: ${badAmountsWA[0].bad_amounts}`);
    report['2F_attendance'] = { status: 'OK', count: badAmountsWA[0].bad_amounts };
  }

  const badAmountsFT = await safeQuery('2F-fund_transfers', `
    SELECT COUNT(*)::int as bad_amounts FROM fund_transfers 
    WHERE amount IS NOT NULL AND amount::text != '' 
    AND amount::text !~ '^[0-9]+(\\.[0-9]+)?$'
  `);
  if (badAmountsFT.error) {
    console.log(`Fund transfers bad amounts - Error: ${badAmountsFT.error}`);
    report['2F_fund_transfers'] = { status: 'ERROR', error: badAmountsFT.error };
  } else {
    console.log(`Fund transfers - bad amount formats: ${badAmountsFT[0].bad_amounts}`);
    report['2F_fund_transfers'] = { status: 'OK', count: badAmountsFT[0].bad_amounts };
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('AUDIT SUMMARY');
  console.log('='.repeat(80));
  console.log(JSON.stringify(report, null, 2));

  await client.end();
  console.log('\nAudit complete.');
}

runAudit().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
