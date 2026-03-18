import { pool } from '../db';
import { FinancialLedgerService } from '../services/FinancialLedgerService';

const DRY_RUN = process.env.DRY_RUN === 'true';

interface OrphanRecord {
  id: string;
  project_id: string;
  amount: string;
  date: string;
  extra?: string;
}

interface BackfillResult {
  table: string;
  total: number;
  created: number;
  skipped: number;
  errors: number;
  errorDetails: string[];
}

async function findOrphans(sourceTable: string, dateColumn: string, amountColumn: string = 'amount'): Promise<OrphanRecord[]> {
  const result = await pool.query(`
    SELECT s.id, s.project_id, s.${amountColumn} as amount, s.${dateColumn} as date
    FROM ${sourceTable} s
    WHERE NOT EXISTS (
      SELECT 1 FROM journal_entries je 
      WHERE je.source_table = $1 AND je.source_id = s.id AND je.status = 'posted'
    )
    AND s.project_id IS NOT NULL
    ORDER BY s.${dateColumn}
  `, [sourceTable]);
  return result.rows;
}

async function findOrphanMaterialPurchases(): Promise<(OrphanRecord & { purchase_type: string })[]> {
  const result = await pool.query(`
    SELECT s.id, s.project_id, s.total_amount as amount, s.purchase_date as date, s.purchase_type
    FROM material_purchases s
    WHERE NOT EXISTS (
      SELECT 1 FROM journal_entries je 
      WHERE je.source_table = 'material_purchases' AND je.source_id = s.id AND je.status = 'posted'
    )
    AND s.project_id IS NOT NULL
    ORDER BY s.purchase_date
  `);
  return result.rows;
}

async function findOrphanWorkerAttendance(): Promise<OrphanRecord[]> {
  const result = await pool.query(`
    SELECT s.id, s.project_id, s.paid_amount as amount, s.attendance_date as date
    FROM worker_attendance s
    WHERE NOT EXISTS (
      SELECT 1 FROM journal_entries je 
      WHERE je.source_table = 'worker_attendance' AND je.source_id = s.id AND je.status = 'posted'
    )
    AND s.project_id IS NOT NULL
    AND CAST(COALESCE(NULLIF(s.paid_amount, ''), '0') AS DECIMAL) > 0
    ORDER BY s.attendance_date
  `);
  return result.rows;
}

async function backfillTable(
  tableName: string,
  orphans: OrphanRecord[],
  createEntry: (record: OrphanRecord) => Promise<string>
): Promise<BackfillResult> {
  const result: BackfillResult = {
    table: tableName,
    total: orphans.length,
    created: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
  };

  console.log(`\n📋 [Backfill] ${tableName}: ${orphans.length} سجل يتيم`);

  const BATCH_SIZE = 50;
  for (let i = 0; i < orphans.length; i += BATCH_SIZE) {
    const batch = orphans.slice(i, i + BATCH_SIZE);
    
    for (const record of batch) {
      try {
        const amount = parseFloat(record.amount || '0');
        if (amount <= 0) {
          result.skipped++;
          continue;
        }

        const existing = await pool.query(
          `SELECT id FROM journal_entries WHERE source_table = $1 AND source_id = $2 AND status = 'posted'`,
          [tableName, record.id]
        );
        if (existing.rows.length > 0) {
          result.skipped++;
          continue;
        }

        if (DRY_RUN) {
          console.log(`  [DRY-RUN] سيتم إنشاء قيد لـ ${tableName}/${record.id} بمبلغ ${amount}`);
          result.created++;
          continue;
        }

        await createEntry(record);
        result.created++;
      } catch (error: any) {
        result.errors++;
        result.errorDetails.push(`${record.id}: ${error.message}`);
        console.error(`  ❌ خطأ في ${tableName}/${record.id}:`, error.message);
      }
    }
    
    console.log(`  📊 تقدم ${tableName}: ${Math.min(i + BATCH_SIZE, orphans.length)}/${orphans.length}`);
  }

  return result;
}

async function main() {
  console.log('🔧 ══════════════════════════════════════════════');
  console.log(`🔧 Backfill Orphan Journal Entries ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);
  console.log('🔧 ══════════════════════════════════════════════');

  const results: BackfillResult[] = [];

  const fundOrphans = await findOrphans('fund_transfers', 'transfer_date');
  results.push(await backfillTable('fund_transfers', fundOrphans, async (r) => {
    return FinancialLedgerService.recordFundTransfer(r.project_id, parseFloat(r.amount), r.date, r.id, 'backfill-script');
  }));

  const transportOrphans = await findOrphans('transportation_expenses', 'date');
  results.push(await backfillTable('transportation_expenses', transportOrphans, async (r) => {
    return FinancialLedgerService.recordTransportExpense(r.project_id, parseFloat(r.amount), r.date, r.id, 'backfill-script');
  }));

  const workerTransferOrphans = await findOrphans('worker_transfers', 'transfer_date');
  results.push(await backfillTable('worker_transfers', workerTransferOrphans, async (r) => {
    return FinancialLedgerService.recordWorkerTransfer(r.project_id, parseFloat(r.amount), r.date, r.id, 'backfill-script');
  }));

  const miscOrphans = await findOrphans('worker_misc_expenses', 'date');
  results.push(await backfillTable('worker_misc_expenses', miscOrphans, async (r) => {
    return FinancialLedgerService.recordMiscExpense(r.project_id, parseFloat(r.amount), r.date, r.id, 'backfill-script');
  }));

  const materialOrphans = await findOrphanMaterialPurchases();
  results.push(await backfillTable('material_purchases', materialOrphans, async (r: any) => {
    return FinancialLedgerService.recordMaterialPurchase(r.project_id, parseFloat(r.amount), r.date, r.id, r.purchase_type || 'نقد', 'backfill-script');
  }));

  const attendanceOrphans = await findOrphanWorkerAttendance();
  results.push(await backfillTable('worker_attendance', attendanceOrphans, async (r) => {
    return FinancialLedgerService.recordWorkerWage(r.project_id, parseFloat(r.amount), r.date, r.id, 'backfill-script');
  }));

  console.log('\n\n═══════════════════════════════════════');
  console.log('📊 ملخص النتائج النهائية');
  console.log('═══════════════════════════════════════');
  
  let grandTotal = 0, grandCreated = 0, grandSkipped = 0, grandErrors = 0;
  
  for (const r of results) {
    console.log(`\n${r.table}:`);
    console.log(`  إجمالي: ${r.total} | تم إنشاؤها: ${r.created} | تم تخطيها: ${r.skipped} | أخطاء: ${r.errors}`);
    if (r.errorDetails.length > 0) {
      console.log(`  تفاصيل الأخطاء:`);
      r.errorDetails.slice(0, 5).forEach(e => console.log(`    - ${e}`));
      if (r.errorDetails.length > 5) console.log(`    ... و${r.errorDetails.length - 5} أخطاء إضافية`);
    }
    grandTotal += r.total;
    grandCreated += r.created;
    grandSkipped += r.skipped;
    grandErrors += r.errors;
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`📊 الإجمالي: ${grandTotal} | تم: ${grandCreated} | تخطي: ${grandSkipped} | أخطاء: ${grandErrors}`);
  console.log(`📊 الوضع: ${DRY_RUN ? 'DRY RUN — لم يتم إنشاء أي قيد فعلي' : 'LIVE — تم إنشاء القيود'}`);
  console.log('═══════════════════════════════════════');

  await pool.end();
  process.exit(grandErrors > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('❌ خطأ فادح:', err);
  process.exit(1);
});
