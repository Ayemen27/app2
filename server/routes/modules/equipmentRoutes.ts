import { Router, Request, Response } from 'express';
import { db } from '../../db.js';
import { equipment, equipmentMovements, projects } from '@shared/schema.js';
import { eq, and, ilike, sql, desc } from 'drizzle-orm';
import { requireAuth } from '../../middleware/auth.js';

const equipmentRouter = Router();
equipmentRouter.use(requireAuth);

equipmentRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { searchTerm, status, type, projectId } = req.query;

    let conditions: any[] = [];

    if (searchTerm && typeof searchTerm === 'string') {
      conditions.push(ilike(equipment.name, `%${searchTerm}%`));
    }
    if (status && typeof status === 'string' && status !== 'all') {
      conditions.push(eq(equipment.status, status));
    }
    if (type && typeof type === 'string' && type !== 'all') {
      conditions.push(eq(equipment.type, type));
    }
    if (typeof projectId === 'string') {
      if (projectId === '') {
        conditions.push(sql`${equipment.projectId} IS NULL`);
      } else {
        conditions.push(eq(equipment.projectId, projectId));
      }
    }

    const query = conditions.length > 0
      ? db.select().from(equipment).where(and(...conditions)).orderBy(desc(equipment.createdAt))
      : db.select().from(equipment).orderBy(desc(equipment.createdAt));

    const result = await query;

    res.json({
      success: true,
      data: result,
      message: `تم جلب ${result.length} معدة بنجاح`
    });
  } catch (error: any) {
    console.error('❌ خطأ في جلب المعدات:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب المعدات', error: error.message });
  }
});

equipmentRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'معرف غير صالح' });
    }

    const [item] = await db.select().from(equipment).where(eq(equipment.id, id));
    if (!item) {
      return res.status(404).json({ success: false, message: 'المعدة غير موجودة' });
    }

    res.json({ success: true, data: item });
  } catch (error: any) {
    console.error('❌ خطأ في جلب المعدة:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب المعدة', error: error.message });
  }
});

equipmentRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, sku, type, unit, quantity, status: eqStatus, condition, description, purchaseDate, purchasePrice, projectId, imageUrl } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'اسم المعدة مطلوب' });
    }

    const qty = parseInt(quantity) || 1;
    if (qty < 1) {
      return res.status(400).json({ success: false, message: 'العدد يجب أن يكون 1 على الأقل' });
    }

    const [newItem] = await db.insert(equipment).values({
      name,
      sku: sku || null,
      type: type || null,
      unit: unit || 'قطعة',
      quantity: qty,
      status: eqStatus || 'available',
      condition: condition || 'excellent',
      description: description || null,
      purchaseDate: purchaseDate || null,
      purchasePrice: purchasePrice || null,
      projectId: projectId || null,
      imageUrl: imageUrl || null,
    }).returning();

    console.log(`✅ [Equipment] تم إضافة معدة: ${name} (ID: ${newItem.id})`);

    res.status(201).json({
      success: true,
      data: newItem,
      message: 'تم إضافة المعدة بنجاح'
    });
  } catch (error: any) {
    console.error('❌ خطأ في إضافة المعدة:', error);
    res.status(500).json({ success: false, message: 'فشل في إضافة المعدة', error: error.message });
  }
});

equipmentRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'معرف غير صالح' });
    }

    const [existing] = await db.select().from(equipment).where(eq(equipment.id, id));
    if (!existing) {
      return res.status(404).json({ success: false, message: 'المعدة غير موجودة' });
    }

    const { name, sku, type, unit, quantity, status: eqStatus, condition, description, purchaseDate, purchasePrice, projectId, imageUrl } = req.body;

    const qty = quantity !== undefined ? (parseInt(quantity) || existing.quantity) : existing.quantity;

    const [updated] = await db.update(equipment)
      .set({
        name: name ?? existing.name,
        sku: sku !== undefined ? sku : existing.sku,
        type: type !== undefined ? type : existing.type,
        unit: unit !== undefined ? unit : existing.unit,
        quantity: qty,
        status: eqStatus !== undefined ? eqStatus : existing.status,
        condition: condition !== undefined ? condition : existing.condition,
        description: description !== undefined ? description : existing.description,
        purchaseDate: purchaseDate !== undefined ? purchaseDate : existing.purchaseDate,
        purchasePrice: purchasePrice !== undefined ? purchasePrice : existing.purchasePrice,
        projectId: projectId !== undefined ? projectId : existing.projectId,
        imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
      })
      .where(eq(equipment.id, id))
      .returning();

    console.log(`✅ [Equipment] تم تحديث معدة: ${updated.name} (ID: ${id})`);

    res.json({
      success: true,
      data: updated,
      message: 'تم تحديث المعدة بنجاح'
    });
  } catch (error: any) {
    console.error('❌ خطأ في تحديث المعدة:', error);
    res.status(500).json({ success: false, message: 'فشل في تحديث المعدة', error: error.message });
  }
});

equipmentRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'معرف غير صالح' });
    }

    const [existing] = await db.select().from(equipment).where(eq(equipment.id, id));
    if (!existing) {
      return res.status(404).json({ success: false, message: 'المعدة غير موجودة' });
    }

    await db.delete(equipmentMovements).where(eq(equipmentMovements.equipmentId, id));
    await db.delete(equipment).where(eq(equipment.id, id));

    console.log(`✅ [Equipment] تم حذف معدة: ${existing.name} (ID: ${id})`);

    res.json({
      success: true,
      message: 'تم حذف المعدة بنجاح'
    });
  } catch (error: any) {
    console.error('❌ خطأ في حذف المعدة:', error);
    res.status(500).json({ success: false, message: 'فشل في حذف المعدة', error: error.message });
  }
});

equipmentRouter.post('/:id/transfer', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'معرف غير صالح' });
    }

    const [item] = await db.select().from(equipment).where(eq(equipment.id, id));
    if (!item) {
      return res.status(404).json({ success: false, message: 'المعدة غير موجودة' });
    }

    const { toProjectId, reason, performedBy, notes, quantity: moveQty } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'سبب النقل مطلوب' });
    }

    const transferQty = parseInt(moveQty) || item.quantity;

    const [movement] = await db.insert(equipmentMovements).values({
      equipmentId: id,
      fromProjectId: item.projectId || null,
      toProjectId: toProjectId || null,
      quantity: transferQty,
      reason: reason || null,
      performedBy: performedBy || null,
      notes: notes || null,
    }).returning();

    await db.update(equipment)
      .set({ projectId: toProjectId || null })
      .where(eq(equipment.id, id));

    console.log(`✅ [Equipment] تم نقل معدة "${item.name}" من ${item.projectId || 'المخزن'} إلى ${toProjectId || 'المخزن'}`);

    res.status(201).json({
      success: true,
      data: movement,
      message: 'تم نقل المعدة بنجاح'
    });
  } catch (error: any) {
    console.error('❌ خطأ في نقل المعدة:', error);
    res.status(500).json({ success: false, message: 'فشل في نقل المعدة', error: error.message });
  }
});

equipmentRouter.get('/:id/movements', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'معرف غير صالح' });
    }

    const movements = await db.select()
      .from(equipmentMovements)
      .where(eq(equipmentMovements.equipmentId, id))
      .orderBy(desc(equipmentMovements.movementDate));

    res.json({
      success: true,
      data: movements,
      message: `تم جلب ${movements.length} حركة`
    });
  } catch (error: any) {
    console.error('❌ خطأ في جلب سجل الحركات:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب سجل الحركات', error: error.message });
  }
});

export default equipmentRouter;
