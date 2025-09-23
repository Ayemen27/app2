
import { db } from "./db";
import { materialPurchases, materials } from "@shared/schema";
import { eq, sql, isNull, or } from "drizzle-orm";

async function fixMissingMaterialCategories() {
  console.log('🔧 بدء إصلاح حقول فئة المادة الفارغة في مشتريات المواد...');
  
  try {
    // 1. البحث عن المشتريات التي لا تحتوي على فئة مادة
    console.log('🔍 البحث عن المشتريات بدون فئة مادة...');
    const purchasesWithoutCategory = await db
      .select({
        id: materialPurchases.id,
        materialName: materialPurchases.materialName,
        materialCategory: materialPurchases.materialCategory,
        materialUnit: materialPurchases.materialUnit,
        unit: materialPurchases.unit
      })
      .from(materialPurchases)
      .where(
        or(
          isNull(materialPurchases.materialCategory),
          eq(materialPurchases.materialCategory, ''),
          isNull(materialPurchases.materialUnit),
          eq(materialPurchases.materialUnit, '')
        )
      );

    console.log(`📊 تم العثور على ${purchasesWithoutCategory.length} مشترية تحتاج إصلاح`);

    if (purchasesWithoutCategory.length === 0) {
      console.log('✅ جميع المشتريات تحتوي على فئات المواد');
      return;
    }

    // 2. جلب جميع المواد المسجلة
    const allMaterials = await db.select().from(materials);
    console.log(`📦 تم جلب ${allMaterials.length} مادة من قاعدة البيانات`);

    let fixedCount = 0;
    let partiallyFixedCount = 0;
    let unfixedCount = 0;

    // 3. معالجة كل مشترية
    for (const purchase of purchasesWithoutCategory) {
      console.log(`🔍 معالجة المشترية: ${purchase.materialName}`);
      
      let foundMaterial = null;
      let finalCategory = purchase.materialCategory;
      let finalUnit = purchase.materialUnit || purchase.unit;
      
      if (purchase.materialName) {
        // البحث الدقيق أولاً
        foundMaterial = allMaterials.find(material => 
          material.name.toLowerCase().trim() === purchase.materialName.toLowerCase().trim()
        );
        
        // البحث الجزئي إذا لم نجد تطابق دقيق
        if (!foundMaterial) {
          foundMaterial = allMaterials.find(material => 
            material.name.toLowerCase().includes(purchase.materialName.toLowerCase().trim()) ||
            purchase.materialName.toLowerCase().includes(material.name.toLowerCase().trim())
          );
        }
        
        // البحث بالكلمة الأولى
        if (!foundMaterial) {
          const firstWord = purchase.materialName.split(' ')[0];
          if (firstWord.length > 2) {
            foundMaterial = allMaterials.find(material => 
              material.name.toLowerCase().startsWith(firstWord.toLowerCase())
            );
          }
        }
      }
      
      if (foundMaterial) {
        finalCategory = finalCategory || foundMaterial.category;
        finalUnit = finalUnit || foundMaterial.unit;
      }
      
      // تحديث المشترية إذا وُجدت بيانات جديدة
      const needsUpdate = (!purchase.materialCategory && finalCategory) || 
                          (!purchase.materialUnit && finalUnit);
      
      if (needsUpdate) {
        const updateData: any = {};
        if (!purchase.materialCategory && finalCategory) {
          updateData.materialCategory = finalCategory;
        }
        if (!purchase.materialUnit && finalUnit) {
          updateData.materialUnit = finalUnit;
        }
        
        await db
          .update(materialPurchases)
          .set(updateData)
          .where(eq(materialPurchases.id, purchase.id));
        
        if (updateData.materialCategory && updateData.materialUnit) {
          console.log(`✅ تم إصلاح المشترية "${purchase.materialName}" - الفئة: ${finalCategory}, الوحدة: ${finalUnit}`);
          fixedCount++;
        } else {
          console.log(`🔄 تم إصلاح جزئي للمشترية "${purchase.materialName}"`);
          partiallyFixedCount++;
        }
      } else {
        console.log(`⚠️ لم يتم العثور على بيانات كافية لإصلاح "${purchase.materialName}"`);
        unfixedCount++;
      }
    }

    console.log('🎉 تم الانتهاء من عملية الإصلاح!');
    console.log(`📊 الإحصائيات النهائية:
    - تم إصلاحها كاملة: ${fixedCount}
    - تم إصلاحها جزئياً: ${partiallyFixedCount} 
    - لم يتم إصلاحها: ${unfixedCount}
    - إجمالي المعالجة: ${purchasesWithoutCategory.length}`);

  } catch (error: any) {
    console.error('❌ خطأ في إصلاح فئات المواد:', error);
    throw error;
  }
}

// تشغيل الإصلاح
if (require.main === module) {
  fixMissingMaterialCategories()
    .then(() => {
      console.log('✅ تم إنجاز إصلاح فئات المواد بنجاح');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ فشل في إصلاح فئات المواد:', error);
      process.exit(1);
    });
}

export { fixMissingMaterialCategories };
