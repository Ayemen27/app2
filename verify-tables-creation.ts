
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function verifyTablesCreation() {
  console.log('🔍 التحقق من الجداول المنشأة في قاعدة البيانات...\n');

  try {
    // الحصول على قائمة جميع الجداول
    const tablesQuery = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    // التأكد من أن النتيجة مصفوفة
    const tablesArray = Array.isArray(tablesQuery) ? tablesQuery : [];
    console.log(`📊 تم العثور على ${tablesArray.length} جدول:\n`);
    
    const expectedTables = [
      'accounts', 'actions', 'approvals', 'autocomplete_data', 'channels',
      'daily_expense_summaries', 'equipment', 'finance_events', 'finance_payments',
      'fund_transfers', 'journals', 'maintenance_schedules', 'maintenance_tasks',
      'material_purchases', 'materials', 'messages', 'notification_read_states',
      'print_settings', 'project_fund_transfers', 'projects', 'report_templates',
      'supplier_payments', 'suppliers', 'system_events', 'system_notifications',
      'tool_categories', 'tool_cost_tracking', 'tool_maintenance_logs',
      'tool_movements', 'tool_notifications', 'tool_purchase_items',
      'tool_reservations', 'tool_stock', 'tool_usage_analytics', 'tools',
      'transaction_lines', 'transactions', 'transportation_expenses',
      'users', 'worker_attendance', 'worker_balances', 'worker_misc_expenses',
      'worker_transfers', 'worker_types', 'workers'
    ];

    const existingTables = tablesArray.map((row: any) => row.table_name);
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    const extraTables = existingTables.filter(table => !expectedTables.includes(table));

    // عرض الجداول الموجودة
    console.log('✅ الجداول الموجودة:');
    existingTables.forEach(table => console.log(`   - ${table}`));

    if (missingTables.length > 0) {
      console.log(`\n❌ الجداول المفقودة (${missingTables.length}):`);
      missingTables.forEach(table => console.log(`   - ${table}`));
    }

    if (extraTables.length > 0) {
      console.log(`\n➕ جداول إضافية غير متوقعة (${extraTables.length}):`);
      extraTables.forEach(table => console.log(`   - ${table}`));
    }

    // التحقق من بعض الجداول المهمة
    console.log('\n🔍 التحقق من البيانات في الجداول المهمة:');
    
    const projectsCount = await db.execute(sql`SELECT COUNT(*) as count FROM projects`);
    console.log(`   - المشاريع: ${projectsCount[0]?.count || 0} مشروع`);

    const workersCount = await db.execute(sql`SELECT COUNT(*) as count FROM workers`);
    console.log(`   - العمال: ${workersCount[0]?.count || 0} عامل`);

    const usersCount = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
    console.log(`   - المستخدمين: ${usersCount[0]?.count || 0} مستخدم`);

    console.log(`\n📈 الخلاصة:`);
    console.log(`   - الجداول المطلوبة: ${expectedTables.length}`);
    console.log(`   - الجداول الموجودة: ${existingTables.length}`);
    console.log(`   - الجداول المفقودة: ${missingTables.length}`);
    
    if (missingTables.length === 0) {
      console.log('\n🎉 ممتاز! جميع الجداول المطلوبة موجودة في قاعدة البيانات');
    } else {
      console.log('\n⚠️ هناك جداول مفقودة تحتاج إلى تشغيل الهجرة');
    }

  } catch (error) {
    console.error('❌ خطأ في التحقق من الجداول:', error);
  }
}

// تشغيل التحقق
verifyTablesCreation()
  .then(() => {
    console.log('\n✅ انتهى التحقق من الجداول');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ فشل في التحقق:', error);
    process.exit(1);
  });
