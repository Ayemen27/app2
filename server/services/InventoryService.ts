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

    const { rows: itemRows } = await queryFn(
      `INSERT INTO inventory_items (name, category, unit) VALUES ($1, $2, $3)
       ON CONFLICT (name, unit, COALESCE(category, '')) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [purchaseData.materialName, purchaseData.materialCategory || null, purchaseData.unit]
    );
    const itemId = itemRows[0].id;

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

  static async getCurrentStock(filters?: { category?: string; search?: string }): Promise<any[]> {
    let query = `
      SELECT 
        ii.id, ii.name, ii.category, ii.unit, ii.sku, ii.min_quantity, ii.is_active,
        COALESCE(SUM(il.received_qty), 0) as total_received,
        COALESCE(SUM(il.remaining_qty), 0) as total_remaining,
        COALESCE(SUM(il.received_qty), 0) - COALESCE(SUM(il.remaining_qty), 0) as total_issued,
        COALESCE(SUM(il.remaining_qty * il.unit_cost), 0) as stock_value,
        (SELECT COUNT(DISTINCT il2.supplier_id) FROM inventory_lots il2 WHERE il2.item_id = ii.id AND il2.supplier_id IS NOT NULL) as supplier_count,
        MAX(il.receipt_date) as last_receipt_date
      FROM inventory_items ii
      LEFT JOIN inventory_lots il ON il.item_id = ii.id
      WHERE ii.is_active = true
    `;
    const params: any[] = [];
    let paramIdx = 1;

    if (filters?.category) {
      query += ` AND ii.category = $${paramIdx++}`;
      params.push(filters.category);
    }
    if (filters?.search) {
      query += ` AND (ii.name ILIKE $${paramIdx++} OR ii.sku ILIKE $${paramIdx++})`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    query += ` GROUP BY ii.id ORDER BY ii.name ASC`;

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

  static async getInventoryStats(): Promise<any> {
    const { rows: stats } = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM inventory_items WHERE is_active = true) as total_items,
        (SELECT COUNT(*) FROM inventory_items WHERE is_active = true AND id IN (SELECT item_id FROM inventory_lots WHERE remaining_qty > 0)) as items_in_stock,
        (SELECT COALESCE(SUM(remaining_qty * unit_cost), 0) FROM inventory_lots WHERE remaining_qty > 0) as total_stock_value,
        (SELECT COUNT(*) FROM inventory_transactions WHERE type = 'IN') as total_receipts,
        (SELECT COUNT(*) FROM inventory_transactions WHERE type = 'OUT') as total_issues,
        (SELECT COUNT(*) FROM inventory_items WHERE is_active = true AND id NOT IN (SELECT DISTINCT item_id FROM inventory_lots WHERE remaining_qty > 0)) as out_of_stock_items,
        (SELECT COUNT(DISTINCT supplier_id) FROM inventory_lots WHERE supplier_id IS NOT NULL) as total_suppliers
    `);
    return stats[0] || {};
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
