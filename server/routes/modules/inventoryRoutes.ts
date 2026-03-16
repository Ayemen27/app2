import { Router } from 'express';
import { InventoryService } from '../../services/InventoryService.js';

const inventoryRouter = Router();

inventoryRouter.get('/stats', async (req, res) => {
  try {
    const stats = await InventoryService.getInventoryStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('❌ خطأ في إحصائيات المخزن:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

inventoryRouter.get('/stock', async (req, res) => {
  try {
    const { category, search } = req.query;
    const stock = await InventoryService.getCurrentStock({
      category: category as string,
      search: search as string,
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

    if (!itemName || !unit || !quantity || !receiptDate) {
      return res.status(400).json({ success: false, message: 'البيانات ناقصة' });
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

inventoryRouter.post('/adjust', async (req, res) => {
  try {
    const { itemId, quantity, type, transactionDate, performedBy, notes } = req.body;

    if (!itemId || !quantity || !type || !transactionDate) {
      return res.status(400).json({ success: false, message: 'البيانات ناقصة' });
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
