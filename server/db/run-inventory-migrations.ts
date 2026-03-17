import { pool } from "../db";

export async function runInventoryMigrations() {
  console.log('🏗️ بدء تطبيق migrations نظام المخزن...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        unit TEXT NOT NULL DEFAULT 'قطعة',
        sku TEXT,
        min_quantity DECIMAL(10,3) DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(name)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_lots (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
        supplier_id VARCHAR REFERENCES suppliers(id) ON DELETE SET NULL,
        purchase_id VARCHAR REFERENCES material_purchases(id) ON DELETE SET NULL,
        received_qty DECIMAL(10,3) NOT NULL,
        remaining_qty DECIMAL(10,3) NOT NULL,
        unit_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
        receipt_date TEXT NOT NULL,
        project_id VARCHAR REFERENCES projects(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_inventory_lots_item_id ON inventory_lots(item_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_inventory_lots_supplier ON inventory_lots(supplier_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_inventory_lots_date ON inventory_lots(receipt_date)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
        lot_id INTEGER REFERENCES inventory_lots(id) ON DELETE SET NULL,
        type TEXT NOT NULL,
        quantity DECIMAL(10,3) NOT NULL,
        unit_cost DECIMAL(15,2) DEFAULT 0,
        total_cost DECIMAL(15,2) DEFAULT 0,
        from_project_id VARCHAR REFERENCES projects(id) ON DELETE SET NULL,
        to_project_id VARCHAR REFERENCES projects(id) ON DELETE SET NULL,
        reference_type TEXT,
        reference_id TEXT,
        performed_by TEXT,
        transaction_date TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_inventory_tx_item_date ON inventory_transactions(item_id, transaction_date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_inventory_tx_type ON inventory_transactions(type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_inventory_tx_to_project ON inventory_transactions(to_project_id)`);

    await client.query(`ALTER TABLE inventory_lots ADD COLUMN IF NOT EXISTS remaining_qty_check BOOLEAN GENERATED ALWAYS AS (remaining_qty >= 0) STORED`);

    await client.query(`
      DO $$ BEGIN
        ALTER TABLE inventory_lots ADD CONSTRAINT chk_remaining_qty_non_negative CHECK (remaining_qty >= 0);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE UNIQUE INDEX idx_inventory_items_name_unit_cat ON inventory_items(name, unit, COALESCE(category, ''));
      EXCEPTION WHEN duplicate_table THEN NULL;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE UNIQUE INDEX idx_inventory_lots_purchase_id_unique ON inventory_lots(purchase_id) WHERE purchase_id IS NOT NULL;
      EXCEPTION WHEN duplicate_table THEN NULL;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        ALTER TABLE inventory_transactions ADD CONSTRAINT chk_tx_type_valid 
          CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'TRANSFER', 'RETURN'));
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    const { rows: existingItems } = await client.query(`SELECT COUNT(*) as cnt FROM inventory_items`);
    if (parseInt(existingItems[0].cnt) === 0) {
      console.log('📦 بدء ترحيل البيانات التاريخية من المشتريات المخزنية...');

      const { rows: storagePurchases } = await client.query(`
        SELECT mp.id, mp.material_name, mp.material_category, mp.unit, mp.quantity, 
               mp.unit_price, mp.total_amount, mp.purchase_date, mp.supplier_id, mp.project_id,
               mp.supplier_name, mp.notes
        FROM material_purchases mp
        WHERE mp.purchase_type IN ('مخزن', 'مخزني', 'توريد')
        ORDER BY mp.purchase_date ASC, mp.created_at ASC
      `);

      console.log(`📦 وُجدت ${storagePurchases.length} مشتراة مخزنية للترحيل`);

      const itemMap = new Map<string, number>();

      for (const p of storagePurchases) {
        const itemKey = `${p.material_name}|${p.unit}|${p.material_category || ''}`;
        
        let itemId = itemMap.get(itemKey);
        if (!itemId) {
          const { rows: existingItem } = await client.query(
            `SELECT id FROM inventory_items WHERE name = $1 AND unit = $2 AND COALESCE(category, '') = $3`,
            [p.material_name, p.unit, p.material_category || '']
          );
          
          if (existingItem.length > 0) {
            itemId = existingItem[0].id;
          } else {
            const { rows: newItem } = await client.query(
              `INSERT INTO inventory_items (name, category, unit) VALUES ($1, $2, $3) RETURNING id`,
              [p.material_name, p.material_category || null, p.unit]
            );
            itemId = newItem[0].id;
          }
          itemMap.set(itemKey, itemId);
        }

        const qty = parseFloat(p.quantity) || 0;
        const unitCost = parseFloat(p.unit_price) || 0;

        const { rows: newLot } = await client.query(
          `INSERT INTO inventory_lots (item_id, supplier_id, purchase_id, received_qty, remaining_qty, unit_cost, receipt_date, project_id, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [itemId, p.supplier_id || null, p.id, qty, qty, unitCost, p.purchase_date, p.project_id || null, p.notes || null]
        );

        await client.query(
          `INSERT INTO inventory_transactions (item_id, lot_id, type, quantity, unit_cost, total_cost, to_project_id, reference_type, reference_id, transaction_date, notes)
           VALUES ($1, $2, 'IN', $3, $4, $5, $6, 'purchase', $7, $8, $9)`,
          [itemId, newLot[0].id, qty, unitCost, parseFloat(p.total_amount) || 0, p.project_id || null, p.id, p.purchase_date, `ترحيل تلقائي من مشتراة: ${p.material_name}`]
        );
      }

      console.log(`✅ تم ترحيل ${storagePurchases.length} مشتراة → ${itemMap.size} مادة مخزنية`);
    } else {
      console.log('ℹ️ المخزن يحتوي بيانات بالفعل - تخطي الترحيل');
    }

    await client.query('COMMIT');
    console.log('✅ تم إنشاء جداول المخزن بنجاح');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ فشل إنشاء جداول المخزن:', error);
    throw error;
  } finally {
    client.release();
  }
}
