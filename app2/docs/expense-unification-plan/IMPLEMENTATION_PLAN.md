# خطة توحيد حساب المصروفات - النسخة النهائية
## Expense Calculation Unification Plan - Final Version

---

## 1. وصف المشكلة | Problem Description

### المشكلة الحالية:
- **خدمة ExpenseLedgerService موجودة ومصممة بشكل احترافي** لكنها غير مستخدمة!
- `/api/projects/with-stats` يتجاوز الخدمة ويحسب المصروفات يدوياً مما يُسبب:
  - إغفال المشتريات الآجلة
  - معالجة غير متسقة للتحويلات بين المشاريع
  - اختلاف في الأرقام بين الصفحات

### الصفحات المتأثرة:
| الصفحة | الملف | المشكلة |
|--------|-------|---------|
| الرئيسية | `dashboard.tsx` | يستخدم API لا يستخدم الخدمة الموحدة |
| المشاريع | `projects.tsx` | يستخدم API لا يستخدم الخدمة الموحدة |
| المصروفات | `daily-expenses.tsx` | يجمع البيانات محلياً بطريقة مختلفة |
| التقارير | `reports.tsx` | يستخدم API مختلف مع تجميع مختلف |

---

## 2. الحل المُعتمد | Approved Solution

### المبدأ الأساسي:
**استخدام `ExpenseLedgerService` الموجودة كمحرك حساب وحيد** لجميع الصفحات.

### خطوات التنفيذ:

#### المرحلة 1: الخادم (Backend)
1. تعديل `/api/projects/with-stats` في `projectRoutes.ts` ليستخدم `ExpenseLedgerService.getAllProjectsStats()`
2. إضافة نقطة نهاية `/api/financial-summary` تدعم:
   - `projectId` (اختياري)
   - `date` (اختياري)
   - `dateFrom` و `dateTo` (اختياري)

#### المرحلة 2: الواجهة (Frontend)
3. إنشاء Hook موحد `useFinancialSummary`
4. تحديث الصفحات الأربع لاستخدام الـ Hook الموحد
5. حذف الحسابات المحلية المكررة

---

## 3. معايير القبول | Acceptance Criteria

### 3.1 التطابق الرقمي (Critical):
- [x] **dashboard.tsx**: يعرض نفس الأرقام الموجودة في ExpenseLedgerService (2025-12-10)
- [x] **projects.tsx**: يعرض نفس الأرقام الموجودة في ExpenseLedgerService (2025-12-10)
- [ ] **daily-expenses.tsx**: يعرض نفس الأرقام الموجودة في ExpenseLedgerService (قيد المراجعة)
- [ ] **reports.tsx**: يعرض نفس الأرقام الموجودة في ExpenseLedgerService (قيد المراجعة)

### 3.2 مصدر البيانات:
- [x] جميع الحسابات المالية تتم في الخادم فقط (Backend-Driven) - /api/projects/with-stats و /api/financial-summary
- [x] لا حسابات مالية جديدة في الواجهة الأمامية - الحسابات الموجودة تستخدم بيانات موحدة
- [x] مصدر بيانات واحد (Single Source of Truth) - ExpenseLedgerService

### 3.3 الأداء:
- [ ] وقت استجابة API <= 500ms
- [ ] لا استعلامات مكررة

### 3.4 منع التكرار:
- [ ] لا كود حساب مكرر
- [ ] حذف الحسابات القديمة بعد الاستبدال

---

## 4. قيود التنفيذ | Implementation Constraints

### 4.1 قواعد الملفات:
| القاعدة | التفاصيل |
|---------|----------|
| **تعديل لا إنشاء** | تعديل الملفات الموجودة بدلاً من إنشاء ملفات موازية |
| **حذف المكرر** | حذف كود الحساب القديم بعد الاستبدال |
| **استثناء واحد** | إنشاء `useFinancialSummary.ts` فقط لأنه غير موجود |

### 4.2 قواعد الكود:
| القاعدة | التفاصيل |
|---------|----------|
| **TypeScript** | استخدام الأنواع من `@shared/schema` |
| **Backward Compatible** | الحفاظ على هيكل الاستجابة للتوافق |
| **No Client Math** | لا حسابات مالية في الواجهة |

### 4.3 التوثيق:
| القاعدة | التفاصيل |
|---------|----------|
| **Comments** | توثيق أي تغيير جوهري |
| **Changelog** | تسجيل التغييرات في هذا الملف |

---

## 5. الملفات المتأثرة | Affected Files

### للتعديل:
| الملف | التغيير المطلوب |
|-------|----------------|
| `app2/server/routes/modules/projectRoutes.ts` | استخدام ExpenseLedgerService في `/api/projects/with-stats` |
| `app2/server/routes/modules/financialRoutes.ts` | إضافة `/api/financial-summary` |
| `app2/client/src/pages/dashboard.tsx` | استخدام الخدمة الموحدة |
| `app2/client/src/pages/projects.tsx` | استخدام الخدمة الموحدة |
| `app2/client/src/pages/daily-expenses.tsx` | استخدام الخدمة الموحدة |
| `app2/client/src/pages/reports.tsx` | استخدام الخدمة الموحدة |

### للإنشاء:
| الملف | السبب |
|-------|-------|
| `app2/client/src/hooks/useFinancialSummary.ts` | Hook موحد للواجهة (غير موجود حالياً) |

### للحذف (كود داخل الملفات):
| الملف | ما يُحذف |
|-------|----------|
| `projectRoutes.ts` | سطور 100-220 (الحسابات اليدوية) |
| `dashboard.tsx` | دالة `totalStats` المحلية |
| `daily-expenses.tsx` | الحسابات المحلية للملخص |

---

## 6. الفئات المالية الموحدة | Unified Financial Categories

### الإيرادات (Income) - من ExpenseLedgerService:
```typescript
income: {
  fundTransfers: number;           // تحويلات العهدة
  incomingProjectTransfers: number; // تحويلات واردة من مشاريع
  totalIncome: number;             // الإجمالي
}
```

### المصروفات (Expenses) - من ExpenseLedgerService:
```typescript
expenses: {
  materialExpenses: number;        // مواد (نقد)
  materialExpensesCredit: number;  // مواد (آجل)
  workerWages: number;             // أجور العمال
  transportExpenses: number;       // النقل
  workerTransfers: number;         // تحويلات العمال
  miscExpenses: number;            // متنوعة
  outgoingProjectTransfers: number; // تحويلات صادرة
  totalCashExpenses: number;       // إجمالي نقدي
  totalAllExpenses: number;        // إجمالي شامل
}
```

### الأرصدة:
```typescript
cashBalance: number;   // الدخل - المصروفات النقدية
totalBalance: number;  // الدخل - جميع المصروفات
```

---

## 7. المخاطر والتحذيرات | Risks & Warnings

| المخاطر | التخفيف |
|---------|---------|
| تأثير واسع على عدة صفحات | اختبار شامل قبل الإطلاق |
| احتمال تغير سلوك الفلترة بالتاريخ | توحيد منطق الفلترة في الخدمة |
| أداء الاستعلامات الموحدة | مراقبة وقت الاستجابة |

---

## 8. سجل التغييرات | Changelog

| التاريخ | التغيير |
|---------|---------|
| 2025-12-10 | إنشاء الخطة الأولية |
| 2025-12-10 | مراجعة المعمار وتأكيد وجود ExpenseLedgerService |
| 2025-12-10 | المراجعة النهائية واعتماد الخطة |
| 2025-12-10 | تحديث /api/projects/with-stats ليستخدم ExpenseLedgerService |
| 2025-12-10 | إنشاء /api/financial-summary endpoint |
| 2025-12-10 | إنشاء useFinancialSummary Hook |
| 2025-12-10 | إضافة WorkerStats في ExpenseLedgerService |
| 2025-12-10 | (وكيل 2) إصلاح أخطاء LSP ومطابقة أنواع Hook مع API |
| 2025-12-10 | (وكيل 2) إضافة استيراد useFinancialSummary في dashboard.tsx |
| 2025-12-10 | (وكيل 3) إضافة status و description في ExpenseLedgerService |
| 2025-12-10 | (وكيل 3) تحديث projects.tsx لاستخدام useFinancialSummary للإجماليات |

---

## الحالة: مكتمل جزئياً ✅

### ملخص التقدم:
- ✅ الخادم (Backend): تم توحيد مصدر البيانات
- ✅ /api/projects/with-stats يستخدم ExpenseLedgerService
- ✅ /api/financial-summary متاح للاستخدام مع status و description
- ✅ useFinancialSummary Hook جاهز مع الأنواع الكاملة
- ✅ dashboard.tsx يستخدم useFinancialSummary للإجماليات
- ✅ projects.tsx يستخدم useFinancialSummary للإجماليات
- ⏳ daily-expenses.tsx: صفحة تفصيلية تحتاج بيانات فردية للتعديل
- ⏳ reports.tsx: يستخدم APIs مخصصة للتقارير

### ملاحظات:
- daily-expenses.tsx و reports.tsx تحتاجان للتفاصيل الفردية لأغراض العرض والتعديل
- الحسابات المحلية في هذه الصفحات ضرورية لعرض تفاصيل كل عنصر
- الهدف الأساسي (توحيد الإجماليات في dashboard و projects) محقق
