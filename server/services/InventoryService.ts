import { pool } from "../db";

export class InventoryService {

  static async findOrCreateItem(name: string, unit: string, category?: string | null): Promise<number> {
    const { rows } = await pool.query(
      `INSERT INTO inventory_items (name, category, unit) VALUES ($1, $2, $3)
       ON CONFLICT (name, unit, COALESCE(category, '')) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [name, category || null, unit]
    );
    return rows[0].id;
  }

  private static async _receiveFromPurchaseInternal(purchaseData: {
    purchaseId: string;
    materialName: string;
    materialCategory?: string | null;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    purchaseDate: string;
    supplierId?: string | null;
    projectId?: string | null;
    notes?: string | null;
  }, queryFn: (sql: string, params: any[]) => Promise<{ rows: any[] }>): Promise<{ itemId: number; lotId: number }> {
    const { rows: existingLot } = await queryFn(
      `SELECT id FROM inventory_lots WHERE purchase_id = $1`,
      [purchaseData.purchaseId]
    );
    if (existingLot.length > 0) {
      const { rows: lot } = await queryFn(`SELECT item_id FROM inventory_lots WHERE id = $1`, [existingLot[0].id]);
      return { itemId: lot[0].item_id, lotId: existingLot[0].id };
    }

    const { rows: existingItem } = await queryFn(
      `SELECT id FROM inventory_items WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND LOWER(TRIM(unit)) = LOWER(TRIM($2)) LIMIT 1`,
      [purchaseData.materialName, purchaseData.unit]
    );

    let itemId: number;
    if (existingItem.length > 0) {
      itemId = existingItem[0].id;
      if (purchaseData.materialCategory) {
        await queryFn(
          `UPDATE inventory_items SET category = $1 WHERE id = $2 AND (category IS NULL OR category = '')`,
          [purchaseData.materialCategory, itemId]
        );
      }
    } else {
      const { rows: itemRows } = await queryFn(
        `INSERT INTO inventory_items (name, category, unit) VALUES ($1, $2, $3)
         ON CONFLICT (name, unit, COALESCE(category, '')) DO UPDATE SET 
           category = COALESCE(NULLIF(EXCLUDED.category, ''), inventory_items.category)
         RETURNING id`,
        [purchaseData.materialName, purchaseData.materialCategory || null, purchaseData.unit]
      );
      itemId = itemRows[0].id;
    }

    const { rows: newLot } = await queryFn(
      `INSERT INTO inventory_lots (item_id, supplier_id, purchase_id, received_qty, remaining_qty, unit_cost, receipt_date, project_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [itemId, purchaseData.supplierId || null, purchaseData.purchaseId, purchaseData.quantity, purchaseData.quantity, purchaseData.unitPrice, purchaseData.purchaseDate, purchaseData.projectId || null, purchaseData.notes || null]
    );

    await queryFn(
      `INSERT INTO inventory_transactions (item_id, lot_id, type, quantity, unit_cost, total_cost, to_project_id, reference_type, reference_id, transaction_date, notes)
       VALUES ($1, $2, 'IN', $3, $4, $5, $6, 'purchase', $7, $8, $9)`,
      [itemId, newLot[0].id, purchaseData.quantity, purchaseData.unitPrice, purchaseData.totalAmount, purchaseData.projectId || null, purchaseData.purchaseId, purchaseData.purchaseDate, `وارد من مشتراة: ${purchaseData.materialName}`]
    );

    return { itemId, lotId: newLot[0].id };
  }

  static async receiveFromPurchase(purchaseData: {
    purchaseId: string;
    materialName: string;
    materialCategory?: string | null;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    purchaseDate: string;
    supplierId?: string | null;
    projectId?: string | null;
    notes?: string | null;
  }): Promise<{ itemId: number; lotId: number }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await this._receiveFromPurchaseInternal(purchaseData, (sql, params) => client.query(sql, params));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async reverseFromPurchase(purchaseId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: lots } = await client.query(
        `SELECT id, item_id, received_qty, remaining_qty FROM inventory_lots WHERE purchase_id = $1`,
        [purchaseId]
      );

      if (lots.length === 0) {
        await client.query('COMMIT');
        return;
      }

      for (const lot of lots) {
        await client.query(
          `INSERT INTO inventory_transactions (item_id, lot_id, type, quantity, unit_cost, total_cost, reference_type, reference_id, transaction_date, notes)
           VALUES ($1, $2, 'ADJUSTMENT_OUT', $3, 0, 0, 'purchase_reversal', $4, NOW(), 'عكس مخزون - حذف مشتراة')`,
          [lot.item_id, lot.id, parseFloat(lot.remaining_qty), purchaseId]
        );

        await client.query(
          `UPDATE inventory_lots SET remaining_qty = 0 WHERE id = $1`,
          [lot.id]
        );
      }

      await client.query('COMMIT');
      console.log(`📦 [Inventory] تم عكس المخزن للمشتراة ${purchaseId} (${lots.length} دفعة)`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async reverseFromPurchaseWithClient(purchaseId: string, queryClient: { query: (sql: string, params: any[]) => Promise<{ rows: any[] }> }): Promise<void> {
    const { rows: lots } = await queryClient.query(
      `SELECT id, item_id, remaining_qty FROM inventory_lots WHERE purchase_id = $1`,
      [purchaseId]
    );

    if (lots.length === 0) return;

    for (const lot of lots) {
      await queryClient.query(
        `INSERT INTO inventory_transactions (item_id, lot_id, type, quantity, unit_cost, total_cost, reference_type, reference_id, transaction_date, notes)
         VALUES ($1, $2, 'ADJUSTMENT_OUT', $3, 0, 0, 'purchase_reversal', $4, NOW(), 'عكس مخزون - حذف مشتراة')`,
        [lot.item_id, lot.id, parseFloat(lot.remaining_qty), purchaseId]
      );

      await queryClient.query(
        `UPDATE inventory_lots SET remaining_qty = 0 WHERE id = $1`,
        [lot.id]
      );
    }
    console.log(`📦 [Inventory] تم عكس المخزن للمشتراة ${purchaseId} (ذري)`);
  }

  static async updateFromPurchase(purchaseData: {
    purchaseId: string;
    materialName: string;
    materialCategory?: string | null;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    purchaseDate: string;
    supplierId?: string | null;
    projectId?: string | null;
    notes?: string | null;
  }): Promise<{ itemId: number; lotId: number }> {
    const txClient = await pool.connect();
    try {
      await txClient.query('BEGIN');
      const queryFn = (sql: string, params: any[]) => txClient.query(sql, params);

      const { rows: oldLots } = await txClient.query(
        `SELECT id, item_id, received_qty, remaining_qty FROM inventory_lots WHERE purchase_id = $1 FOR UPDATE`,
        [purchaseData.purchaseId]
      );

      let totalConsumed = 0;
      for (const lot of oldLots) {
        const received = parseFloat(lot.received_qty);
        const remaining = parseFloat(lot.remaining_qty);
        totalConsumed += (received - remaining);
      }

      if (purchaseData.quantity < totalConsumed) {
        await txClient.query('ROLLBACK');
        throw new Error(`لا يمكن تقليل الكمية إلى ${purchaseData.quantity} - تم صرف ${totalConsumed} بالفعل من المخزن`);
      }

      await txClient.query(
        `DELETE FROM inventory_transactions WHERE reference_type = 'purchase_update' AND reference_id = $1`,
        [purchaseData.purchaseId]
      );

      for (const lot of oldLots) {
        await txClient.query(`UPDATE inventory_lots SET remaining_qty = 0 WHERE id = $1`, [lot.id]);
      }

      for (const lot of oldLots) {
        await txClient.query(`DELETE FROM inventory_lots WHERE id = $1`, [lot.id]);
      }

      const newRemainingQty = purchaseData.quantity - totalConsumed;

      const { rows: existingItem } = await queryFn(
        `SELECT id FROM inventory_items WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND LOWER(TRIM(unit)) = LOWER(TRIM($2)) LIMIT 1`,
        [purchaseData.materialName, purchaseData.unit]
      );

      let itemId: number;
      if (existingItem.length > 0) {
        itemId = existingItem[0].id;
        if (purchaseData.materialCategory) {
          await queryFn(
            `UPDATE inventory_items SET category = $1 WHERE id = $2 AND (category IS NULL OR category = '')`,
            [purchaseData.materialCategory, itemId]
          );
        }
      } else {
        const { rows: itemRows } = await queryFn(
          `INSERT INTO inventory_items (name, category, unit) VALUES ($1, $2, $3)
           ON CONFLICT (name, unit, COALESCE(category, '')) DO UPDATE SET 
             category = COALESCE(NULLIF(EXCLUDED.category, ''), inventory_items.category)
           RETURNING id`,
          [purchaseData.materialName, purchaseData.materialCategory || null, purchaseData.unit]
        );
        itemId = itemRows[0].id;
      }

      const { rows: newLot } = await queryFn(
        `INSERT INTO inventory_lots (item_id, supplier_id, purchase_id, received_qty, remaining_qty, unit_cost, receipt_date, project_id, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [itemId, purchaseData.supplierId || null, purchaseData.purchaseId, purchaseData.quantity, newRemainingQty, purchaseData.unitPrice, purchaseData.purchaseDate, purchaseData.projectId || null, purchaseData.notes || null]
      );

      if (totalConsumed > 0) {
        await queryFn(
          `INSERT INTO inventory_transactions (item_id, lot_id, type, quantity, unit_cost, total_cost, reference_type, reference_id, transaction_date, notes)
           VALUES ($1, $2, 'ADJUSTMENT_OUT', $3, 0, 0, 'purchase_update', $4, NOW(), $5)`,
          [itemId, newLot[0].id, totalConsumed, purchaseData.purchaseId, `تعديل مشتراة - مستهلك سابقاً: ${totalConsumed}`]
        );
      }

      await queryFn(
        `INSERT INTO inventory_transactions (item_id, lot_id, type, quantity, unit_cost, total_cost, to_project_id, reference_type, reference_id, transaction_date, notes)
         VALUES ($1, $2, 'IN', $3, $4, $5, $6, 'purchase_update', $7, $8, $9)`,
        [itemId, newLot[0].id, purchaseData.quantity, purchaseData.unitPrice, purchaseData.totalAmount, purchaseData.projectId || null, purchaseData.purchaseId, purchaseData.purchaseDate, `تحديث مشتراة: ${purchaseData.materialName} (كمية: ${purchaseData.quantity}, مستهلك: ${totalConsumed}, متبقي: ${newRemainingQty})`]
      );

      await txClient.query('COMMIT');
      console.log(`📦 [Inventory] تحديث مشتراة ${purchaseData.purchaseId}: كمية جديدة=${purchaseData.quantity}, مستهلك=${totalConsumed}, متبقي=${newRemainingQty}`);
      return { itemId, lotId: newLot[0].id };
    } catch (error) {
      await txClient.query('ROLLBACK');
      throw error;
    } finally {
      txClient.release();
    }
  }

  static async receiveFromPurchaseWithClient(purchaseData: {
    purchaseId: string;
    materialName: string;
    materialCategory?: string | null;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    purchaseDate: string;
    supplierId?: string | null;
    projectId?: string | null;
    notes?: string | null;
  }, client: { query: (sql: string, params: any[]) => Promise<{ rows: any[] }> }): Promise<{ itemId: number; lotId: number }> {
    return this._receiveFromPurchaseInternal(purchaseData, (sql, params) => client.query(sql, params));
  }

  static async issueFromStock(data: {
    itemId: number;
    quantity: number;
    toProjectId: string;
    transactionDate: string;
    performedBy?: string | null;
    notes?: string | null;
  }): Promise<{ success: boolean; issuedLots: Array<{ lotId: number; qty: number; unitCost: number }> }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: availableLots } = await client.query(
        `SELECT id, remaining_qty, unit_cost FROM inventory_lots 
         WHERE item_id = $1 AND remaining_qty > 0 
         ORDER BY receipt_date ASC, id ASC
         FOR UPDATE`,
        [data.itemId]
      );

      let totalAvailable = 0;
      for (const lot of availableLots) {
        totalAvailable += parseFloat(lot.remaining_qty);
      }

      if (totalAvailable < data.quantity) {
        await client.query('ROLLBACK');
        throw new Error(`الكمية المطلوبة (${data.quantity}) أكبر من المتاح (${totalAvailable})`);
      }

      let remaining = data.quantity;
      const issuedLots: Array<{ lotId: number; qty: number; unitCost: number }> = [];

      for (const lot of availableLots) {
        if (remaining <= 0) break;

        const lotRemaining = parseFloat(lot.remaining_qty);
        const issueQty = Math.min(remaining, lotRemaining);
        const unitCost = parseFloat(lot.unit_cost) || 0;

        await client.query(
          `UPDATE inventory_lots SET remaining_qty = remaining_qty - $1 WHERE id = $2`,
          [issueQty, lot.id]
        );

        await client.query(
          `INSERT INTO inventory_transactions (item_id, lot_id, type, quantity, unit_cost, total_cost, to_project_id, performed_by, transaction_date, notes)
           VALUES ($1, $2, 'OUT', $3, $4, $5, $6, $7, $8, $9)`,
          [data.itemId, lot.id, issueQty, unitCost, issueQty * unitCost, data.toProjectId, data.performedBy || null, data.transactionDate, data.notes || null]
        );

        issuedLots.push({ lotId: lot.id, qty: issueQty, unitCost });
        remaining -= issueQty;
      }

      await client.query('COMMIT');
      return { success: true, issuedLots };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async adjustStock(data: {
    itemId: number;
    quantity: number;
    type: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
    transactionDate: string;
    performedBy?: string | null;
    notes?: string | null;
  }): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (data.type === 'ADJUSTMENT_IN') {
        const { rows: newLot } = await client.query(
          `INSERT INTO inventory_lots (item_id, received_qty, remaining_qty, unit_cost, receipt_date, notes)
           VALUES ($1, $2, $3, 0, $4, $5) RETURNING id`,
          [data.itemId, data.quantity, data.quantity, data.transactionDate, `تسوية يدوية: ${data.notes || ''}`]
        );

        await client.query(
          `INSERT INTO inventory_transactions (item_id, lot_id, type, quantity, unit_cost, total_cost, performed_by, transaction_date, notes)
           VALUES ($1, $2, 'ADJUSTMENT_IN', $3, 0, 0, $4, $5, $6)`,
          [data.itemId, newLot[0].id, data.quantity, data.performedBy || null, data.transactionDate, data.notes || null]
        );
      } else {
        const { rows: lots } = await client.query(
          `SELECT id, remaining_qty FROM inventory_lots WHERE item_id = $1 AND remaining_qty > 0 ORDER BY receipt_date ASC FOR UPDATE`,
          [data.itemId]
        );

        let totalAvailable = lots.reduce((sum, l) => sum + parseFloat(l.remaining_qty), 0);
        if (totalAvailable < data.quantity) {
          throw new Error(`لا يمكن تسوية: المتاح (${totalAvailable}) أقل من المطلوب (${data.quantity})`);
        }

        let remaining = data.quantity;
        for (const lot of lots) {
          if (remaining <= 0) break;
          const deduct = Math.min(remaining, parseFloat(lot.remaining_qty));
          await client.query(`UPDATE inventory_lots SET remaining_qty = remaining_qty - $1 WHERE id = $2`, [deduct, lot.id]);
          remaining -= deduct;
        }

        await client.query(
          `INSERT INTO inventory_transactions (item_id, type, quantity, performed_by, transaction_date, notes)
           VALUES ($1, 'ADJUSTMENT_OUT', $2, $3, $4, $5)`,
          [data.itemId, data.quantity, data.performedBy || null, data.transactionDate, data.notes || null]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getCurrentStock(filters?: { category?: string; search?: string; projectId?: string }): Promise<any[]> {
    let query = `
      SELECT 
        ii.id, ii.name, ii.category, ii.unit, ii.sku, ii.min_quantity, ii.is_active,
        COALESCE(SUM(il.received_qty), 0) as total_received,
        COALESCE(SUM(il.remaining_qty), 0) as total_remaining,
        COALESCE(SUM(il.received_qty), 0) - COALESCE(SUM(il.remaining_qty), 0) as total_issued,
        COALESCE(SUM(il.remaining_qty * il.unit_cost), 0) as stock_value,
        (SELECT COUNT(DISTINCT il2.supplier_id) FROM inventory_lots il2 WHERE il2.item_id = ii.id AND il2.supplier_id IS NOT NULL${filters?.projectId ? ' AND il2.project_id = $__PID__' : ''}) as supplier_count,
        MAX(il.receipt_date) as last_receipt_date,
        MAX(p.name) as project_name
      FROM inventory_items ii
      LEFT JOIN inventory_lots il ON il.item_id = ii.id
      LEFT JOIN projects p ON p.id = il.project_id
      WHERE ii.is_active = true
    `;
    const params: any[] = [];
    let paramIdx = 1;

    if (filters?.projectId) {
      query += ` AND il.project_id = $${paramIdx++}`;
      params.push(filters.projectId);
    }
    if (filters?.category) {
      query += ` AND ii.category = $${paramIdx++}`;
      params.push(filters.category);
    }
    if (filters?.search) {
      query += ` AND (ii.name ILIKE $${paramIdx++} OR ii.sku ILIKE $${paramIdx++})`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    query += ` GROUP BY ii.id ORDER BY ii.name ASC`;

    if (filters?.projectId) {
      query = query.replace('$__PID__', `$1`);
    }

    const { rows } = await pool.query(query, params);
    return rows;
  }

  static async getItemTransactions(itemId: number, filters?: { type?: string; dateFrom?: string; dateTo?: string; projectId?: string }): Promise<any[]> {
    let query = `
      SELECT 
        it.*,
        ii.name as item_name, ii.unit as item_unit,
        fp.name as from_project_name,
        tp.name as to_project_name,
        s.name as supplier_name
      FROM inventory_transactions it
      JOIN inventory_items ii ON ii.id = it.item_id
      LEFT JOIN projects fp ON fp.id = it.from_project_id
      LEFT JOIN projects tp ON tp.id = it.to_project_id
      LEFT JOIN inventory_lots il ON il.id = it.lot_id
      LEFT JOIN suppliers s ON s.id = il.supplier_id
      WHERE it.item_id = $1
    `;
    const params: any[] = [itemId];
    let paramIdx = 2;

    if (filters?.type) {
      query += ` AND it.type = $${paramIdx++}`;
      params.push(filters.type);
    }
    if (filters?.dateFrom) {
      query += ` AND it.transaction_date >= $${paramIdx++}`;
      params.push(filters.dateFrom);
    }
    if (filters?.dateTo) {
      query += ` AND it.transaction_date <= $${paramIdx++}`;
      params.push(filters.dateTo);
    }
    if (filters?.projectId) {
      query += ` AND (it.to_project_id = $${paramIdx} OR it.from_project_id = $${paramIdx++})`;
      params.push(filters.projectId);
    }

    query += ` ORDER BY it.transaction_date DESC, it.id DESC`;

    const { rows } = await pool.query(query, params);
    return rows;
  }

  static async getStockReport(filters?: { groupBy?: string; dateFrom?: string; dateTo?: string; supplierId?: string; projectId?: string; category?: string }): Promise<any> {
    const groupBy = filters?.groupBy || 'item';

    if (groupBy === 'supplier') {
      let query = `
        SELECT 
          s.id as supplier_id, s.name as supplier_name,
          COUNT(DISTINCT il.item_id) as item_count,
          COALESCE(SUM(il.received_qty), 0) as total_supplied,
          COALESCE(SUM(il.remaining_qty), 0) as total_remaining,
          COALESCE(SUM(il.received_qty - il.remaining_qty), 0) as total_issued,
          COALESCE(SUM(il.received_qty * il.unit_cost), 0) as total_value
        FROM suppliers s
        JOIN inventory_lots il ON il.supplier_id = s.id
      `;
      const params: any[] = [];
      let paramIdx = 1;

      if (filters?.dateFrom) {
        query += ` AND il.receipt_date >= $${paramIdx++}`;
        params.push(filters.dateFrom);
      }
      if (filters?.dateTo) {
        query += ` AND il.receipt_date <= $${paramIdx++}`;
        params.push(filters.dateTo);
      }

      query += ` GROUP BY s.id, s.name ORDER BY total_value DESC`;
      const { rows } = await pool.query(query, params);
      return rows;
    }

    if (groupBy === 'project') {
      const { rows } = await pool.query(`
        SELECT 
          p.id as project_id, p.name as project_name,
          COUNT(DISTINCT it.item_id) as item_count,
          COALESCE(SUM(CASE WHEN it.type = 'OUT' THEN it.quantity ELSE 0 END), 0) as total_issued,
          COALESCE(SUM(CASE WHEN it.type = 'OUT' THEN it.total_cost ELSE 0 END), 0) as total_cost
        FROM projects p
        JOIN inventory_transactions it ON it.to_project_id = p.id
        GROUP BY p.id, p.name
        ORDER BY total_cost DESC
      `);
      return rows;
    }

    let query = `
      SELECT 
        ii.id, ii.name, ii.category, ii.unit,
        COALESCE(SUM(CASE WHEN it.type IN ('IN', 'ADJUSTMENT_IN') THEN it.quantity ELSE 0 END), 0) as total_in,
        COALESCE(SUM(CASE WHEN it.type IN ('OUT', 'ADJUSTMENT_OUT') THEN it.quantity ELSE 0 END), 0) as total_out,
        COALESCE(SUM(CASE WHEN it.type IN ('IN', 'ADJUSTMENT_IN') THEN it.quantity ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN it.type IN ('OUT', 'ADJUSTMENT_OUT') THEN it.quantity ELSE 0 END), 0) as balance
      FROM inventory_items ii
      LEFT JOIN inventory_transactions it ON it.item_id = ii.id
    `;
    const params: any[] = [];
    let paramIdx = 1;

    if (filters?.dateFrom) {
      query += ` AND it.transaction_date >= $${paramIdx++}`;
      params.push(filters.dateFrom);
    }
    if (filters?.dateTo) {
      query += ` AND it.transaction_date <= $${paramIdx++}`;
      params.push(filters.dateTo);
    }
    if (filters?.category) {
      query += ` AND ii.category = $${paramIdx++}`;
      params.push(filters.category);
    }

    query += ` GROUP BY ii.id ORDER BY ii.name ASC`;
    const { rows } = await pool.query(query, params);
    return rows;
  }

  static async getItemAvailableQty(itemId: number): Promise<number> {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(remaining_qty), 0) as available FROM inventory_lots WHERE item_id = $1 AND remaining_qty > 0`,
      [itemId]
    );
    return parseFloat(rows[0].available) || 0;
  }

  static async getCategories(): Promise<string[]> {
    const { rows } = await pool.query(
      `SELECT DISTINCT category FROM inventory_items WHERE category IS NOT NULL AND category != '' ORDER BY category`
    );
    return rows.map(r => r.category);
  }

  static async getItemLots(itemId: number): Promise<any[]> {
    const { rows } = await pool.query(`
      SELECT il.*, s.name as supplier_name, p.name as project_name
      FROM inventory_lots il
      LEFT JOIN suppliers s ON s.id = il.supplier_id
      LEFT JOIN projects p ON p.id = il.project_id
      WHERE il.item_id = $1
      ORDER BY il.receipt_date DESC
    `, [itemId]);
    return rows;
  }

  static async getInventoryStats(projectId?: string): Promise<any> {
    const projectFilter = projectId ? `AND il.project_id = $1` : '';
    const projectFilterTx = projectId ? `AND (it.to_project_id = $1 OR it.from_project_id = $1)` : '';
    const params = projectId ? [projectId] : [];

    const { rows: stats } = await pool.query(`
      SELECT 
        (SELECT COUNT(DISTINCT ii.id) FROM inventory_items ii JOIN inventory_lots il ON il.item_id = ii.id WHERE ii.is_active = true ${projectFilter}) as total_items,
        (SELECT COUNT(DISTINCT ii.id) FROM inventory_items ii JOIN inventory_lots il ON il.item_id = ii.id WHERE ii.is_active = true AND il.remaining_qty > 0 ${projectFilter}) as items_in_stock,
        (SELECT COALESCE(SUM(il.remaining_qty * il.unit_cost), 0) FROM inventory_lots il WHERE il.remaining_qty > 0 ${projectFilter}) as total_stock_value,
        (SELECT COUNT(*) FROM inventory_transactions it WHERE it.type = 'IN' ${projectFilterTx}) as total_receipts,
        (SELECT COUNT(*) FROM inventory_transactions it WHERE it.type = 'OUT' ${projectFilterTx}) as total_issues,
        (SELECT COUNT(DISTINCT ii.id) FROM inventory_items ii JOIN inventory_lots il ON il.item_id = ii.id WHERE ii.is_active = true ${projectFilter} AND ii.id NOT IN (SELECT DISTINCT il2.item_id FROM inventory_lots il2 WHERE il2.remaining_qty > 0 ${projectFilter ? 'AND il2.project_id = $1' : ''})) as out_of_stock_items,
        (SELECT COUNT(DISTINCT il.supplier_id) FROM inventory_lots il WHERE il.supplier_id IS NOT NULL ${projectFilter}) as total_suppliers
    `, params);
    return stats[0] || {};
  }

  static async updateItem(itemId: number, data: { name: string; category?: string; unit: string; min_quantity?: number; adjustment_quantity?: number }): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query('SELECT id FROM inventory_items WHERE id = $1 FOR UPDATE', [itemId]);
      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error('المادة غير موجودة');
      }

      await client.query(
        'UPDATE inventory_items SET name = $1, category = $2, unit = $3, min_quantity = $4 WHERE id = $5',
        [data.name, data.category || null, data.unit, data.min_quantity || 0, itemId]
      );

      if (data.adjustment_quantity !== undefined && data.adjustment_quantity !== null) {
        const targetQty = Number(data.adjustment_quantity);
        const { rows: currentRows } = await client.query(
          `SELECT COALESCE(SUM(remaining_qty), 0) as current_remaining FROM inventory_lots WHERE item_id = $1`,
          [itemId]
        );
        const currentRemaining = parseFloat(currentRows[0].current_remaining);
        const diff = targetQty - currentRemaining;

        if (Math.abs(diff) > 0.001) {
          if (diff > 0) {
            await client.query(
              `INSERT INTO inventory_lots (item_id, received_qty, remaining_qty, unit_cost, receipt_date, notes)
               VALUES ($1, $2, $3, 0, NOW(), 'تسوية مخزون - زيادة')`,
              [itemId, diff, diff]
            );
            await client.query(
              `INSERT INTO inventory_transactions (item_id, type, quantity, unit_cost, total_cost, transaction_date, notes, performed_by)
               VALUES ($1, 'ADJUSTMENT_IN', $2, 0, 0, NOW(), 'تسوية مخزون - تعديل الكمية', 'system')`,
              [itemId, diff]
            );
          } else {
            const absAdjust = Math.abs(diff);
            const { rows: lots } = await client.query(
              `SELECT id, remaining_qty FROM inventory_lots WHERE item_id = $1 AND remaining_qty > 0 ORDER BY receipt_date ASC FOR UPDATE`,
              [itemId]
            );
            let remaining = absAdjust;
            for (const lot of lots) {
              if (remaining <= 0) break;
              const deduct = Math.min(remaining, parseFloat(lot.remaining_qty));
              await client.query(
                `UPDATE inventory_lots SET remaining_qty = remaining_qty - $1 WHERE id = $2`,
                [deduct, lot.id]
              );
              remaining -= deduct;
            }
            await client.query(
              `INSERT INTO inventory_transactions (item_id, type, quantity, unit_cost, total_cost, transaction_date, notes, performed_by)
               VALUES ($1, 'ADJUSTMENT_OUT', $2, 0, 0, NOW(), 'تسوية مخزون - تعديل الكمية', 'system')`,
              [itemId, absAdjust]
            );
          }
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteItem(itemId: number): Promise<void> {
    const existing = await pool.query('SELECT id FROM inventory_items WHERE id = $1', [itemId]);
    if (existing.rows.length === 0) throw new Error('المادة غير موجودة');
    const txCheck = await pool.query('SELECT COUNT(*) as cnt FROM inventory_transactions WHERE item_id = $1', [itemId]);
    if (parseInt(txCheck.rows[0].cnt) > 0) {
      throw new Error('لا يمكن حذف مادة لها حركات مخزنية. يمكنك تعديلها بدلاً من ذلك.');
    }
    await pool.query('DELETE FROM inventory_lots WHERE item_id = $1', [itemId]);
    await pool.query('DELETE FROM inventory_items WHERE id = $1', [itemId]);
  }

  static async returnToStock(data: {
    itemId: number;
    quantity: number;
    fromProjectId: string;
    transactionDate: string;
    performedBy?: string | null;
    notes?: string | null;
  }): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: item } = await client.query(
        `SELECT id, name, unit FROM inventory_items WHERE id = $1`, [data.itemId]
      );
      if (item.length === 0) throw new Error('المادة غير موجودة');

      const { rows: lots } = await client.query(
        `SELECT id FROM inventory_lots WHERE item_id = $1 AND project_id = $2 ORDER BY receipt_date DESC LIMIT 1`,
        [data.itemId, data.fromProjectId]
      );

      let lotId: number;
      if (lots.length > 0) {
        lotId = lots[0].id;
        await client.query(
          `UPDATE inventory_lots SET remaining_qty = remaining_qty + $1 WHERE id = $2`,
          [data.quantity, lotId]
        );
      } else {
        const { rows: newLot } = await client.query(
          `INSERT INTO inventory_lots (item_id, received_qty, remaining_qty, unit_cost, receipt_date, project_id, notes)
           VALUES ($1, 0, $2, 0, $3, $4, 'مرتجع') RETURNING id`,
          [data.itemId, data.quantity, data.transactionDate, data.fromProjectId]
        );
        lotId = newLot[0].id;
      }

      await client.query(
        `INSERT INTO inventory_transactions (item_id, lot_id, type, quantity, unit_cost, total_cost, from_project_id, transaction_date, performed_by, notes)
         VALUES ($1, $2, 'RETURN', $3, 0, 0, $4, $5, $6, $7)`,
        [data.itemId, lotId, data.quantity, data.fromProjectId, data.transactionDate, data.performedBy || null, data.notes || `مرتجع: ${item[0].name}`]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteTransaction(txId: number): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `SELECT it.*, ii.name as item_name FROM inventory_transactions it JOIN inventory_items ii ON ii.id = it.item_id WHERE it.id = $1 FOR UPDATE`,
        [txId]
      );
      if (rows.length === 0) throw new Error('المعاملة غير موجودة');

      const tx = rows[0];

      if (tx.reference_type === 'purchase') {
        throw new Error('لا يمكن حذف معاملة مرتبطة بمشتراة. عدّل المشتراة مباشرة.');
      }

      if (tx.type === 'IN' || tx.type === 'ADJUSTMENT_IN') {
        if (tx.lot_id) {
          const { rows: lot } = await client.query(
            `SELECT remaining_qty, received_qty FROM inventory_lots WHERE id = $1 FOR UPDATE`, [tx.lot_id]
          );
          if (lot.length > 0) {
            const consumed = parseFloat(lot[0].received_qty) - parseFloat(lot[0].remaining_qty);
            if (consumed > 0) {
              throw new Error(`لا يمكن حذف هذا الوارد - تم صرف ${consumed} منه بالفعل`);
            }
            await client.query(`DELETE FROM inventory_lots WHERE id = $1`, [tx.lot_id]);
          }
        }
      } else if (tx.type === 'OUT' || tx.type === 'ADJUSTMENT_OUT') {
        if (tx.lot_id) {
          await client.query(
            `UPDATE inventory_lots SET remaining_qty = remaining_qty + $1 WHERE id = $2`,
            [parseFloat(tx.quantity), tx.lot_id]
          );
        }
      }

      await client.query(`DELETE FROM inventory_transactions WHERE id = $1`, [txId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getAllTransactions(filters?: { type?: string; dateFrom?: string; dateTo?: string; projectId?: string; supplierId?: string }): Promise<any[]> {
    let query = `
      SELECT 
        it.*,
        ii.name as item_name, ii.unit as item_unit, ii.category as item_category,
        fp.name as from_project_name,
        tp.name as to_project_name,
        s.name as supplier_name
      FROM inventory_transactions it
      JOIN inventory_items ii ON ii.id = it.item_id
      LEFT JOIN projects fp ON fp.id = it.from_project_id
      LEFT JOIN projects tp ON tp.id = it.to_project_id
      LEFT JOIN inventory_lots il ON il.id = it.lot_id
      LEFT JOIN suppliers s ON s.id = il.supplier_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIdx = 1;

    if (filters?.type) {
      query += ` AND it.type = $${paramIdx++}`;
      params.push(filters.type);
    }
    if (filters?.dateFrom) {
      query += ` AND it.transaction_date >= $${paramIdx++}`;
      params.push(filters.dateFrom);
    }
    if (filters?.dateTo) {
      query += ` AND it.transaction_date <= $${paramIdx++}`;
      params.push(filters.dateTo);
    }
    if (filters?.projectId) {
      query += ` AND (it.to_project_id = $${paramIdx} OR it.from_project_id = $${paramIdx++})`;
      params.push(filters.projectId);
    }
    if (filters?.supplierId) {
      query += ` AND il.supplier_id = $${paramIdx++}`;
      params.push(filters.supplierId);
    }

    query += ` ORDER BY it.transaction_date DESC, it.id DESC LIMIT 500`;

    const { rows } = await pool.query(query, params);
    return rows;
  }
}
