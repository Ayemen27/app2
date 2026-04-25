import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { sanitizeZodErrors } from '../../lib/error-utils';
import { attachAccessibleProjects, ProjectAccessRequest } from '../../middleware/projectAccess.js';
import { InventoryService } from '../../services/InventoryService.js';
import { isAdmin } from '../../internal/auth-user.js';
import { pool } from '../../db.js';

const inventoryRouter = Router();

function validateProjectAccess(req: ProjectAccessRequest, projectId: string | undefined): boolean {
  if (!projectId) return true;
  if (!req.accessibleProjectIds || req.accessibleProjectIds.length === 0) return false;
  return req.accessibleProjectIds.includes(projectId);
}

inventoryRouter.use(requireAuth);
inventoryRouter.use(attachAccessibleProjects);

inventoryRouter.get('/stats', async (req, res) => {
  try {
    const { projectId } = req.query;
    if (projectId && !validateProjectAccess(req as ProjectAccessRequest, projectId as string)) return res.status(403).json({ success: false, message: 'ليس لديك صلاحية الوصول لهذا المشروع' });
    const stats = await InventoryService.getInventoryStats(projectId as string);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('❌ خطأ في إحصائيات المخزن:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب إحصائيات المخزن' });
  }
});

inventoryRouter.get('/stock', async (req, res) => {
  try {
    const { category, search, projectId } = req.query;
    if (projectId && !validateProjectAccess(req as ProjectAccessRequest, projectId as string)) return res.status(403).json({ success: false, message: 'ليس لديك صلاحية الوصول لهذا المشروع' });
    const stock = await InventoryService.getCurrentStock({
      category: category as string,
      search: search as string,
      projectId: projectId as string,
    });
    res.json({ success: true, data: stock });
  } catch (error: any) {
    console.error('❌ خطأ في جلب المخزون:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب المخزون' });
  }
});

inventoryRouter.get('/categories', async (req, res) => {
  try {
    const categories = await InventoryService.getCategories();
    res.json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'فشل في جلب التصنيفات' });
  }
});

inventoryRouter.get('/transactions', async (req, res) => {
  try {
    const { type, dateFrom, dateTo, projectId, supplierId } = req.query;
    if (projectId && !validateProjectAccess(req as ProjectAccessRequest, projectId as string)) return res.status(403).json({ success: false, message: 'ليس لديك صلاحية الوصول لهذا المشروع' });
    const transactions = await InventoryService.getAllTransactions({
      type: type as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      projectId: projectId as string,
      supplierId: supplierId as string,
    });
    res.json({ success: true, data: transactions });
  } catch (error: any) {
    console.error('❌ خطأ في جلب الحركات:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب الحركات' });
  }
});

inventoryRouter.get('/items/:id/available', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const available = await InventoryService.getItemAvailableQty(itemId);
    res.json({ success: true, data: { available } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'فشل في جلب الكمية المتاحة' });
  }
});

inventoryRouter.get('/items/:id/transactions', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const { type, dateFrom, dateTo, projectId } = req.query;
    if (projectId && !validateProjectAccess(req as ProjectAccessRequest, projectId as string)) return res.status(403).json({ success: false, message: 'ليس لديك صلاحية الوصول لهذا المشروع' });
    const transactions = await InventoryService.getItemTransactions(itemId, {
      type: type as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      projectId: projectId as string,
    });
    res.json({ success: true, data: transactions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'فشل في جلب حركات المادة' });
  }
});

inventoryRouter.get('/items/:id/lots', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const lots = await InventoryService.getItemLots(itemId);
    res.json({ success: true, data: lots });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'فشل في جلب دفعات المادة' });
  }
});

inventoryRouter.post('/issue', async (req, res) => {
  try {
    const issueSchema = z.object({
      itemId: z.number().int().positive(),
      quantity: z.number().positive(),
      toProjectId: z.string().min(1),
      transactionDate: z.string().min(1),
      performedBy: z.string().optional(),
      notes: z.string().optional(),
    });
    const parsed = issueSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: sanitizeZodErrors(parsed.error), errors: parsed.error.issues });
    }

    const { itemId, quantity, toProjectId, transactionDate, performedBy, notes } = req.body;
    if (toProjectId && !validateProjectAccess(req as ProjectAccessRequest, toProjectId as string)) return res.status(403).json({ success: false, message: 'ليس لديك صلاحية الوصول لهذا المشروع' });

    const result = await InventoryService.issueFromStock({
      itemId,
      quantity: parseFloat(quantity),
      toProjectId,
      transactionDate,
      performedBy,
      notes,
    });

    res.json({ success: true, data: result, message: 'تم الصرف بنجاح' });
  } catch (error: any) {
    console.error('❌ خطأ في صرف المخزن:', error);
    res.status(400).json({ success: false, message: 'فشل في صرف المخزن' });
  }
});

inventoryRouter.post('/receive', async (req, res) => {
  try {
    const receiveSchema = z.object({
      itemName: z.string().min(1),
      category: z.string().min(1),
      unit: z.string().min(1),
      quantity: z.number().positive(),
      unitCost: z.union([z.string(), z.number()]).optional(),
      receiptDate: z.string().min(1),
      supplierId: z.string().optional(),
      projectId: z.string().optional(),
      notes: z.string().optional(),
    });
    const parsed = receiveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: sanitizeZodErrors(parsed.error), errors: parsed.error.issues });
    }

    const { itemName, category, unit, quantity, unitCost, receiptDate, supplierId, projectId, notes } = req.body;
    if (projectId && !validateProjectAccess(req as ProjectAccessRequest, projectId as string)) return res.status(403).json({ success: false, message: 'ليس لديك صلاحية الوصول لهذا المشروع' });

    const itemId = await InventoryService.findOrCreateItem(itemName, unit, category);
    
    const result = await InventoryService.receiveFromPurchase({
      purchaseId: `manual-${Date.now()}`,
      materialName: itemName,
      materialCategory: category,
      unit,
      quantity: parseFloat(quantity),
      unitPrice: parseFloat(unitCost) || 0,
      totalAmount: (parseFloat(quantity) || 0) * (parseFloat(unitCost) || 0),
      purchaseDate: receiptDate,
      supplierId,
      projectId,
      notes,
    });

    res.json({ success: true, data: result, message: 'تم الإضافة بنجاح' });
  } catch (error: any) {
    console.error('❌ خطأ في إضافة للمخزن:', error);
    res.status(400).json({ success: false, message: 'فشل في إضافة للمخزن' });
  }
});

inventoryRouter.post('/return', async (req, res) => {
  try {
    const returnSchema = z.object({
      itemId: z.union([z.number().int().positive(), z.string().min(1)]),
      quantity: z.number().positive(),
      fromProjectId: z.string().min(1),
      transactionDate: z.string().min(1),
      performedBy: z.string().optional(),
      notes: z.string().optional(),
    });
    const parsed = returnSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: sanitizeZodErrors(parsed.error), errors: parsed.error.issues });
    }

    const { itemId, quantity, fromProjectId, transactionDate, performedBy, notes } = req.body;
    if (fromProjectId && !validateProjectAccess(req as ProjectAccessRequest, fromProjectId as string)) return res.status(403).json({ success: false, message: 'ليس لديك صلاحية الوصول لهذا المشروع' });

    await InventoryService.returnToStock({
      itemId: parseInt(itemId),
      quantity: parseFloat(quantity),
      fromProjectId,
      transactionDate,
      performedBy,
      notes,
    });

    res.json({ success: true, message: 'تم إرجاع المادة بنجاح' });
  } catch (error: any) {
    console.error('❌ خطأ في إرجاع المادة:', error);
    res.status(400).json({ success: false, message: 'فشل في إرجاع المادة' });
  }
});

inventoryRouter.post('/adjust', async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const adjustSchema = z.object({
      itemId: z.number().int().positive(),
      quantity: z.number().positive(),
      type: z.enum(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT']),
      transactionDate: z.string().min(1),
      performedBy: z.string().optional(),
      notes: z.string().optional(),
    });
    const parsed = adjustSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: sanitizeZodErrors(parsed.error), errors: parsed.error.issues });
    }

    const { itemId, quantity, type, transactionDate, performedBy, notes } = req.body;

    await InventoryService.adjustStock({
      itemId,
      quantity: parseFloat(quantity),
      type,
      transactionDate,
      performedBy,
      notes,
    });

    res.json({ success: true, message: 'تم التسوية بنجاح' });
  } catch (error: any) {
    console.error('❌ خطأ في تسوية المخزن:', error);
    res.status(400).json({ success: false, message: 'فشل في تسوية المخزن' });
  }
});

inventoryRouter.put('/items/:id', async (req, res) => {
  try {
    const updateItemSchema = z.object({
      name: z.string().min(1),
      category: z.string().optional(),
      unit: z.string().min(1),
      min_quantity: z.union([z.string(), z.number()]).optional(),
      adjustment_quantity: z.union([z.string(), z.number()]).optional(),
    });
    const parsed = updateItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: sanitizeZodErrors(parsed.error), errors: parsed.error.issues });
    }

    const itemId = parseInt(req.params.id);
    const { name, category, unit, min_quantity, adjustment_quantity } = req.body;
    const updateData: any = { name, category, unit, min_quantity: parseFloat(min_quantity || '0') };
    if (adjustment_quantity !== undefined && adjustment_quantity !== null && adjustment_quantity !== '') {
      updateData.adjustment_quantity = parseFloat(adjustment_quantity);
    }
    await InventoryService.updateItem(itemId, updateData);
    res.json({ success: true, message: 'تم تحديث المادة بنجاح' });
  } catch (error: any) {
    console.error('❌ خطأ في تحديث المادة:', error);
    const detail = error?.message || error?.detail || 'سبب غير معروف';
    res.status(400).json({ success: false, message: `فشل في تحديث المادة: ${detail}`, error: detail });
  }
});

inventoryRouter.delete('/items/:id', async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const itemId = parseInt(req.params.id);
    await InventoryService.deleteItem(itemId);
    res.json({ success: true, message: 'تم حذف المادة بنجاح' });
  } catch (error: any) {
    console.error('❌ خطأ في حذف المادة:', error);
    res.status(400).json({ success: false, message: 'فشل في حذف المادة' });
  }
});

inventoryRouter.patch('/transactions/:id', async (req, res) => {
  try {
    const updateTransactionSchema = z.object({
      quantity: z.number().positive().optional(),
      notes: z.string().optional(),
      transactionDate: z.string().optional(),
    });
    const parsed = updateTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: sanitizeZodErrors(parsed.error), errors: parsed.error.issues });
    }

    const txId = parseInt(req.params.id);

    const { rows } = await pool.query(
      `SELECT to_project_id, from_project_id FROM inventory_transactions WHERE id = $1`, [txId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المعاملة غير موجودة' });
    }
    const tx = rows[0];
    const projectId = tx.to_project_id || tx.from_project_id;
    if (projectId && !validateProjectAccess(req as ProjectAccessRequest, projectId as string)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية الوصول لهذا المشروع' });
    }

    const { quantity, notes, transactionDate } = req.body;
    await InventoryService.updateTransaction(txId, { quantity, notes, transactionDate });
    res.json({ success: true, message: 'تم تعديل المعاملة بنجاح' });
  } catch (error: any) {
    console.error('❌ خطأ في تعديل المعاملة:', error);
    res.status(400).json({ success: false, message: 'فشل في تعديل المعاملة' });
  }
});

inventoryRouter.delete('/transactions/:id', async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const txId = parseInt(req.params.id);
    await InventoryService.deleteTransaction(txId);
    res.json({ success: true, message: 'تم حذف المعاملة بنجاح' });
  } catch (error: any) {
    console.error('❌ خطأ في حذف المعاملة:', error);
    res.status(400).json({ success: false, message: 'فشل في حذف المعاملة' });
  }
});

inventoryRouter.get('/reports', async (req, res) => {
  try {
    const { groupBy, dateFrom, dateTo, supplierId, projectId, category } = req.query;
    if (projectId && !validateProjectAccess(req as ProjectAccessRequest, projectId as string)) return res.status(403).json({ success: false, message: 'ليس لديك صلاحية الوصول لهذا المشروع' });
    const report = await InventoryService.getStockReport({
      groupBy: groupBy as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      supplierId: supplierId as string,
      projectId: projectId as string,
      category: category as string,
    });
    res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('❌ خطأ في تقارير المخزن:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب تقارير المخزن' });
  }
});

export default inventoryRouter;
