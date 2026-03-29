import { Router, Request, Response } from 'express';
import { db, withTransaction } from '../../db.js';
import { equipment, equipmentMovements, projects, insertEquipmentSchema } from '@shared/schema.js';
import { eq, and, ilike, sql, desc, inArray, or, isNull } from 'drizzle-orm';
import { requireAuth } from '../../middleware/auth.js';
import { attachAccessibleProjects, ProjectAccessRequest } from '../../middleware/projectAccess';
import { projectAccessService } from '../../services/ProjectAccessService';
import { safeErrorMessage } from '../../middleware/api-response';

const VALID_EQUIPMENT_TYPES = ['heavy_machinery', 'light_tool', 'vehicle', 'electrical', 'plumbing', 'safety', 'measuring', 'hand_tool', 'power_tool', 'other'] as const;
const DEFAULT_EQUIPMENT_STATUSES = ['available', 'assigned', 'maintenance', 'lost', 'consumed'] as const;
const VALID_EQUIPMENT_CONDITIONS = ['excellent', 'good', 'fair', 'poor', 'damaged'] as const;

const equipmentRouter = Router();
equipmentRouter.use(requireAuth);
equipmentRouter.use(attachAccessibleProjects);

function buildEquipmentCode(id: number): string {
  return `EQ-${String(id).padStart(5, '0')}`;
}

equipmentRouter.get('/statuses', async (req: Request, res: Response) => {
  try {
    const result = await db.selectDistinct({ status: equipment.status }).from(equipment).where(sql`${equipment.status} IS NOT NULL AND TRIM(${equipment.status}) != ''`);
    const dbStatuses = result.map((r: any) => r.status!).filter(Boolean);
    const defaults = [...DEFAULT_EQUIPMENT_STATUSES];
    const allStatuses = [...new Set([...defaults, ...dbStatuses])];
    res.json({ success: true, data: allStatuses });
  } catch (error: any) {
    console.error('❌ خطأ في جلب حالات المعدات:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب الحالات' });
  }
});

equipmentRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { searchTerm, status, type, project_id } = req.query;
    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');

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
    if (typeof project_id === 'string') {
      if (project_id === '') {
        conditions.push(isNull(equipment.project_id));
      } else {
        conditions.push(eq(equipment.project_id, project_id));
      }
    }

    if (!isAdminUser) {
      const ids = accessReq.accessibleProjectIds ?? [];

      if (project_id && typeof project_id === 'string' && project_id !== '') {
        if (!ids.includes(project_id)) {
          return res.json({ success: true, data: [], message: 'تم جلب 0 معدة بنجاح' });
        }
      }

      if (!project_id) {
        if (ids.length === 0) {
          conditions.push(isNull(equipment.project_id));
        } else {
          conditions.push(
            or(
              inArray(equipment.project_id, ids),
              isNull(equipment.project_id)
            )!
          );
        }
      }
    }

    const query = conditions.length > 0
      ? db.select().from(equipment).where(and(...conditions)).orderBy(desc(equipment.created_at))
      : db.select().from(equipment).orderBy(desc(equipment.created_at));

    const result = await query;

    res.json({
      success: true,
      data: result,
      message: `تم جلب ${result.length} معدة بنجاح`
    });
  } catch (error: any) {
    console.error('❌ خطأ في جلب المعدات:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب المعدات', error: safeErrorMessage(error, 'حدث خطأ داخلي') });
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

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    if (!isAdminUser && item.project_id) {
      const ids = accessReq.accessibleProjectIds ?? [];
      if (!ids.includes(item.project_id)) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية عرض هذه المعدة', code: 'PROJECT_ACCESS_DENIED' });
      }
    }

    res.json({ success: true, data: item });
  } catch (error: any) {
    console.error('❌ خطأ في جلب المعدة:', error);
    res.status(500).json({ success: false, message: 'فشل في جلب المعدة', error: safeErrorMessage(error, 'حدث خطأ داخلي') });
  }
});

equipmentRouter.post('/', async (req: Request, res: Response) => {
  try {
    const validationResult = insertEquipmentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'بيانات المعدة غير صحيحة',
        details: validationResult.error.flatten().fieldErrors
      });
    }

    const { name, sku, type, unit, quantity, status: eqStatus, condition, description, purchaseDate, purchasePrice, project_id, imageUrl } = validationResult.data;

    if (type && !VALID_EQUIPMENT_TYPES.includes(type as any)) {
      return res.status(400).json({ success: false, message: `نوع المعدة غير صالح. القيم المسموحة: ${VALID_EQUIPMENT_TYPES.join(', ')}` });
    }
    if (eqStatus && typeof eqStatus === 'string' && eqStatus.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'حالة المعدة لا يمكن أن تكون فارغة' });
    }
    if (condition && !VALID_EQUIPMENT_CONDITIONS.includes(condition as any)) {
      return res.status(400).json({ success: false, message: `حالة المعدة الفنية غير صالحة. القيم المسموحة: ${VALID_EQUIPMENT_CONDITIONS.join(', ')}` });
    }

    const qty = quantity ?? 1;
    if (qty < 1) {
      return res.status(400).json({ success: false, message: 'العدد يجب أن يكون 1 على الأقل' });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    if (!isAdminUser && project_id) {
      const ids = accessReq.accessibleProjectIds ?? [];
      if (!ids.includes(project_id)) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية إضافة معدات لهذا المشروع', code: 'PROJECT_ACCESS_DENIED' });
      }
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
      project_id: project_id || null,
      imageUrl: imageUrl || null,
    }).returning();

    const eqCode = buildEquipmentCode(newItem.id);
    const [updatedItem] = await db.update(equipment)
      .set({ code: eqCode })
      .where(eq(equipment.id, newItem.id))
      .returning();

    console.log(`✅ [Equipment] تم إضافة معدة: ${name} (ID: ${newItem.id}, كود: ${eqCode})`);

    res.status(201).json({
      success: true,
      data: updatedItem,
      message: 'تم إضافة المعدة بنجاح'
    });
  } catch (error: any) {
    console.error('❌ خطأ في إضافة المعدة:', error);
    res.status(500).json({ success: false, message: 'فشل في إضافة المعدة', error: safeErrorMessage(error, 'حدث خطأ داخلي') });
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

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    if (!isAdminUser && existing.project_id) {
      const ids = accessReq.accessibleProjectIds ?? [];
      if (!ids.includes(existing.project_id)) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية تعديل هذه المعدة', code: 'PROJECT_ACCESS_DENIED' });
      }
    }

    const validationResult = insertEquipmentSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'بيانات تحديث المعدة غير صحيحة',
        details: validationResult.error.flatten().fieldErrors
      });
    }

    const { name, sku, type, unit, quantity, status: eqStatus, condition, description, purchaseDate, purchasePrice, project_id, imageUrl } = validationResult.data;

    if (type !== undefined && type !== null && !VALID_EQUIPMENT_TYPES.includes(type as any)) {
      return res.status(400).json({ success: false, message: `نوع المعدة غير صالح. القيم المسموحة: ${VALID_EQUIPMENT_TYPES.join(', ')}` });
    }
    if (eqStatus !== undefined && eqStatus !== null && typeof eqStatus === 'string' && eqStatus.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'حالة المعدة لا يمكن أن تكون فارغة' });
    }
    if (condition !== undefined && condition !== null && !VALID_EQUIPMENT_CONDITIONS.includes(condition as any)) {
      return res.status(400).json({ success: false, message: `حالة المعدة الفنية غير صالحة. القيم المسموحة: ${VALID_EQUIPMENT_CONDITIONS.join(', ')}` });
    }

    if (!isAdminUser && project_id !== undefined && project_id !== null && project_id !== existing.project_id) {
      const ids = accessReq.accessibleProjectIds ?? [];
      if (!ids.includes(project_id)) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية نقل المعدة لهذا المشروع', code: 'PROJECT_ACCESS_DENIED' });
      }
    }

    let qty = existing.quantity;
    if (quantity !== undefined) {
      qty = quantity;
      if (qty < 1) {
        return res.status(400).json({ success: false, message: 'العدد يجب أن يكون 1 على الأقل' });
      }
    }

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
        project_id: project_id !== undefined ? project_id : existing.project_id,
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
    res.status(500).json({ success: false, message: 'فشل في تحديث المعدة', error: safeErrorMessage(error, 'حدث خطأ داخلي') });
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

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    if (!isAdminUser && existing.project_id) {
      const ids = accessReq.accessibleProjectIds ?? [];
      if (!ids.includes(existing.project_id)) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية حذف هذه المعدة', code: 'PROJECT_ACCESS_DENIED' });
      }
    }

    await withTransaction(async (client) => {
      await client.query('DELETE FROM equipment_movements WHERE equipment_id = $1', [id]);
      await client.query('DELETE FROM equipment WHERE id = $1', [id]);
    });

    console.log(`✅ [Equipment] تم حذف معدة: ${existing.name} (ID: ${id})`);

    res.json({
      success: true,
      message: 'تم حذف المعدة بنجاح'
    });
  } catch (error: any) {
    console.error('❌ خطأ في حذف المعدة:', error);
    res.status(500).json({ success: false, message: 'فشل في حذف المعدة', error: safeErrorMessage(error, 'حدث خطأ داخلي') });
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

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');
    if (!isAdminUser) {
      const ids = accessReq.accessibleProjectIds ?? [];
      if (item.project_id && !ids.includes(item.project_id)) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية نقل هذه المعدة', code: 'PROJECT_ACCESS_DENIED' });
      }
    }

    const { toProjectId, reason, performedBy, notes, quantity: moveQty } = req.body;

    if (!isAdminUser && toProjectId) {
      const ids = accessReq.accessibleProjectIds ?? [];
      if (!ids.includes(toProjectId)) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية نقل المعدة لهذا المشروع', code: 'PROJECT_ACCESS_DENIED' });
      }
    }

    if (!reason) {
      return res.status(400).json({ success: false, message: 'سبب النقل مطلوب' });
    }

    let transferQty = item.quantity;
    if (moveQty !== undefined) {
      transferQty = parseInt(moveQty);
      if (isNaN(transferQty) || transferQty < 1) {
        return res.status(400).json({ success: false, message: 'العدد المنقول يجب أن يكون 1 على الأقل' });
      }
      if (transferQty > item.quantity) {
        return res.status(400).json({ success: false, message: `العدد المنقول (${transferQty}) يتجاوز العدد المتاح (${item.quantity})` });
      }
    }

    const [movement] = await db.insert(equipmentMovements).values({
      equipmentId: id,
      fromProjectId: item.project_id || null,
      toProjectId: toProjectId || null,
      quantity: transferQty,
      reason: reason || null,
      performedBy: performedBy || null,
      notes: notes || null,
    }).returning();

    await db.update(equipment)
      .set({ project_id: toProjectId || null })
      .where(eq(equipment.id, id));

    console.log(`✅ [Equipment] تم نقل معدة "${item.name}" من ${item.project_id || 'المخزن'} إلى ${toProjectId || 'المخزن'}`);

    res.status(201).json({
      success: true,
      data: movement,
      message: 'تم نقل المعدة بنجاح'
    });
  } catch (error: any) {
    console.error('❌ خطأ في نقل المعدة:', error);
    res.status(500).json({ success: false, message: 'فشل في نقل المعدة', error: safeErrorMessage(error, 'حدث خطأ داخلي') });
  }
});

equipmentRouter.get('/:id/movements', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'معرف غير صالح' });
    }

    const accessReq = req as ProjectAccessRequest;
    const isAdminUser = projectAccessService.isAdmin(accessReq.user?.role || '');

    const [eqItem] = await db.select().from(equipment).where(eq(equipment.id, id));
    if (eqItem && !isAdminUser && eqItem.project_id) {
      const ids = accessReq.accessibleProjectIds ?? [];
      if (!ids.includes(eqItem.project_id)) {
        return res.status(403).json({ success: false, message: 'ليس لديك صلاحية عرض حركات هذه المعدة', code: 'PROJECT_ACCESS_DENIED' });
      }
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
    res.status(500).json({ success: false, message: 'فشل في جلب سجل الحركات', error: safeErrorMessage(error, 'حدث خطأ داخلي') });
  }
});

export default equipmentRouter;
