import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { attachAccessibleProjects, ProjectAccessRequest } from '../../middleware/projectAccess.js';
import { InventoryService } from '../../services/InventoryService.js';

const inventoryRouter = Router();

inventoryRouter.use(requireAuth);
inventoryRouter.use(attachAccessibleProjects);

inventoryRouter.get('/stats', async (req, res) => {
  try {
    const { projectId } = req.query;
    const stats = await InventoryService.getInventoryStats(projectId as string);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('❌ خطأ في إحصائيات المخزن:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

inventoryRouter.get('/stock', async (req, res) => {
  try {
    const { category, search, projectId } = req.query;
    const stock = await InventoryService.getCurrentStock({
      category: category as string,
      search: search as string,
      projectId: projectId as string,
    });
    res.json({ success: true, data: stock });
  } catch (error: any) {
    console.error('❌ خطأ في جلب المخزون:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

inventoryRouter.get('/categories', async (req, res) => {
  try {
    const categories = await InventoryService.getCategories();
    res.json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

inventoryRouter.get('/transactions', async (req, res) => {
  try {
    const { type, dateFrom, dateTo, projectId, supplierId } = req.query;
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
    res.status(500).json({ success: false, message: error.message });
  }
});

inventoryRouter.get('/items/:id/available', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const available = await InventoryService.getItemAvailableQty(itemId);
    res.json({ success: true, data: { available } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

inventoryRouter.get('/items/:id/transactions', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const { type, dateFrom, dateTo, projectId } = req.query;
    const transactions = await InventoryService.getItemTransactions(itemId, {
      type: type as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      projectId: projectId as string,
    });
    res.json({ success: true, data: transactions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

inventoryRouter.get('/items/:id/lots', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const lots = await InventoryService.getItemLots(itemId);
    res.json({ success: true, data: lots });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

inventoryRouter.post('/issue', async (req, res) => {
  try {
    const { itemId, quantity, toProjectId, transactionDate, performedBy, notes } = req.body;

    if (!itemId || !quantity || !toProjectId || !transactionDate) {
      return res.status(400).json({ success: false, message: 'البيانات ناقصة: المادة، الكمية، المشروع، التاريخ مطلوبة' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ success: false, message: 'الكمية يجب أن تكون أكبر من صفر' });
    }

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
    res.status(400).json({ success: false, message: error.message });
  }
});

inventoryRouter.post('/receive', async (req, res) => {
  try {
    const { itemName, category, unit, quantity, unitCost, receiptDate, supplierId, projectId, notes } = req.body;

    if (!itemName || !category?.trim() || !unit || !quantity || !receiptDate) {
      return res.status(400).json({ success: false, message: !category?.trim() ? 'يرجى تحديد فئة المادة' : 'البيانات ناقصة' });
    }

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
    res.status(400).json({ success: false, message: error.message });
  }
});

inventoryRouter.post('/return', async (req, res) => {
  try {
    const { itemId, quantity, fromProjectId, transactionDate, performedBy, notes } = req.body;

    if (!itemId || !quantity || !fromProjectId || !transactionDate) {
      return res.status(400).json({ success: false, message: 'البيانات ناقصة: المادة والكمية والمشروع والتاريخ مطلوبة' });
    }

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
    res.status(400).json({ success: false, message: error.message });
  }
});

inventoryRouter.post('/adjust', async (req, res) => {
  try {
    const { itemId, quantity, type, transactionDate, performedBy, notes } = req.body;

    if (!itemId || !quantity || !type || !transactionDate) {
      return res.status(400).json({ success: false, message: 'البيانات ناقصة' });
    }

    if (!['ADJUSTMENT_IN', 'ADJUSTMENT_OUT'].includes(type)) {
      return res.status(400).json({ success: false, message: 'نوع التسوية غير صالح. يجب أن يكون ADJUSTMENT_IN أو ADJUSTMENT_OUT' });
    }

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
    res.status(400).json({ success: false, message: error.message });
  }
});

inventoryRouter.put('/items/:id', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const { name, category, unit, min_quantity, adjustment_quantity } = req.body;
    if (!name || !unit) {
      return res.status(400).json({ success: false, message: 'اسم المادة والوحدة مطلوبان' });
    }
    const updateData: any = { name, category, unit, min_quantity: parseFloat(min_quantity || '0') };
    if (adjustment_quantity !== undefined && adjustment_quantity !== null && adjustment_quantity !== '') {
      updateData.adjustment_quantity = parseFloat(adjustment_quantity);
    }
    await InventoryService.updateItem(itemId, updateData);
    res.json({ success: true, message: 'تم تحديث المادة بنجاح' });
  } catch (error: any) {
    console.error('❌ خطأ في تحديث المادة:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

inventoryRouter.delete('/items/:id', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    await InventoryService.deleteItem(itemId);
    res.json({ success: true, message: 'تم حذف المادة بنجاح' });
  } catch (error: any) {
    console.error('❌ خطأ في حذف المادة:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

inventoryRouter.delete('/transactions/:id', async (req, res) => {
  try {
    const txId = parseInt(req.params.id);
    await InventoryService.deleteTransaction(txId);
    res.json({ success: true, message: 'تم حذف المعاملة بنجاح' });
  } catch (error: any) {
    console.error('❌ خطأ في حذف المعاملة:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

inventoryRouter.get('/reports', async (req, res) => {
  try {
    const { groupBy, dateFrom, dateTo, supplierId, projectId, category } = req.query;
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
    res.status(500).json({ success: false, message: error.message });
  }
});

export default inventoryRouter;
