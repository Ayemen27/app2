
# دليل حساب المصروفات الموحد
## Financial Calculations Guide

**التاريخ:** 2025-12-09  
**المالك:** عمار  
**الحالة:** نشط

---

## 📊 منطق الحساب الموحد

### 1. **إجمالي المصروفات (Total Expenses)**

يجب أن يشمل **جميع** أنواع المصروفات التالية:

```typescript
totalExpenses = 
  workerWages +              // الأجور المدفوعة فعلياً للعمال
  materialCosts +            // تكاليف المواد المشتراة
  transportExpenses +        // مصاريف النقل
  workerTransfers +          // حوالات العمال (المبالغ المحولة للأهل)
  miscExpenses +             // المصاريف المتنوعة (نثريات)
  outgoingProjectTransfers;  // التحويلات الصادرة إلى مشاريع أخرى
```

### 2. **إجمالي الدخل (Total Income)**

```typescript
totalIncome = 
  fundTransfers +            // تحويلات العهدة من العميل
  incomingProjectTransfers;  // التحويلات الواردة من مشاريع أخرى
```

### 3. **الرصيد الحالي (Current Balance)**

```typescript
currentBalance = totalIncome - totalExpenses;
```

---

## 🔍 نقاط مهمة

### ⚠️ الأخطاء الشائعة التي تم تصحيحها:

1. **عدم احتساب المصاريف المتنوعة (miscExpenses)**
   - كانت مفقودة في بعض الصفحات
   - الآن يتم احتسابها في جميع الصفحات

2. **عدم احتساب التحويلات بين المشاريع**
   - التحويلات الصادرة تُحسب كمصروف
   - التحويلات الواردة تُحسب كدخل

3. **استخدام الأجر اليومي بدلاً من المبلغ المدفوع**
   - الصحيح: استخدام `paidAmount` (المدفوع فعلياً)
   - الخطأ: استخدام `dailyWage * workDays` (المستحق الإجمالي)

---

## 📁 الملفات المحدثة

### Backend:
1. `server/routes/modules/projectRoutes.ts` - حساب stats للمشاريع
2. `server/routes/modules/reportRoutes.ts` - التقارير الاحترافية
3. `shared/financial-calculator.ts` - دالة موحدة للحسابات ✨ جديد

### Frontend:
1. `client/src/pages/projects.tsx` - صفحة المشاريع
2. `client/src/pages/dashboard.tsx` - الصفحة الرئيسية
3. `client/src/pages/professional-reports.tsx` - التقارير

---

## ✅ التحقق من صحة الحسابات

لتحقق من صحة الحسابات في مشروع معين:

```sql
-- إجمالي المصروفات
SELECT 
  -- الأجور المدفوعة
  (SELECT COALESCE(SUM(CAST(paid_amount AS DECIMAL)), 0) 
   FROM worker_attendance 
   WHERE project_id = 'PROJECT_ID') as wages,
  
  -- تكاليف المواد
  (SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) 
   FROM material_purchases 
   WHERE project_id = 'PROJECT_ID') as materials,
  
  -- مصاريف النقل
  (SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) 
   FROM transportation_expenses 
   WHERE project_id = 'PROJECT_ID') as transport,
  
  -- حوالات العمال
  (SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) 
   FROM worker_transfers 
   WHERE project_id = 'PROJECT_ID') as worker_transfers,
  
  -- المصاريف المتنوعة
  (SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) 
   FROM worker_misc_expenses 
   WHERE project_id = 'PROJECT_ID') as misc,
  
  -- التحويلات الصادرة
  (SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) 
   FROM project_fund_transfers 
   WHERE from_project_id = 'PROJECT_ID') as outgoing;
```

---

## 🎯 المعايير المطلوبة

✅ **جميع الصفحات يجب أن تظهر نفس الأرقام** لنفس المشروع  
✅ **استخدام الدالة الموحدة** `calculateProjectExpenses()` من `financial-calculator.ts`  
✅ **توثيق أي تغيير** في منطق الحساب في هذا الملف  

---

## 📞 للدعم

إذا واجهت اختلافاً في الأرقام:
1. تحقق من أن جميع الصفحات تستخدم نفس منطق الحساب
2. راجع console logs للتحقق من البيانات المسترجعة
3. قارن مع الاستعلام SQL أعلاه مباشرة على قاعدة البيانات
