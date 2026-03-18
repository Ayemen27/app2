# تقرير تحليل أداء API - Performance Analysis Report
### التاريخ: 2026-03-18
### Axion v3.9.1

---

## الاكتشاف الرئيسي

**السبب الجذري للبطء ليس SQL — إنه الشبكة.**

| القياس | النتيجة |
|--------|---------|
| Network roundtrip للـ DB | **~2,200ms** (2.2 ثانية!) |
| أبطأ استعلام SQL (execution time) | **0.6ms** |
| أسرع استعلام SQL (execution time) | **0.15ms** |
| DB Host | `93.127.142.144` (سيرفر خارجي بعيد) |

> كل استعلام يكلف ~2.2 ثانية ذهاب-إياب شبكة، بغض النظر عن تعقيد الـ SQL.
> الفهارس موجودة وتعمل بشكل ممتاز — المشكلة 100% في latency الشبكة.

---

## A. تحليل كل Endpoint

### 1. `GET /api/financial-summary` — ~6-8 ثانية

**المسار:** `financialRoutes.ts` → `ExpenseLedgerService.getProjectFinancialSummary()`

**عند `project_id=all` (الحالة الافتراضية):**

```
الخطوة 1: SELECT projects (1 query)                    → ~2.2s
الخطوة 2: لكل مشروع (7 مشاريع):
  - SELECT project info (1 query)                       → ~2.2s
  - Promise.all(12 queries) بالتوازي                    → ~2.2s (query واحدة فقط لأنها متوازية)
  المجموع: ~4.4s لكل مشروع... 
  لكن المشاريع تُنفَّذ بالتوازي (Promise.all) ← ~4.4s
الإجمالي: 2.2 + 4.4 = ~6.6s
```

**عند `project_id` محدد:**
```
الخطوة 1: SELECT project info (1 query)                → ~2.2s
الخطوة 2: Promise.all(12 queries)                      → ~2.2s
الإجمالي: ~4.4s
```

**الاستعلامات (12 query لكل مشروع — كلها بالتوازي):**

| # | الجدول | الاستعلام | SQL Execution | ملاحظة |
|---|--------|-----------|---------------|--------|
| 1 | `material_purchases` | SUM cash purchases | 0.15ms | فهرس ✅ `idx_material_purchases_project_purchase_date` |
| 2 | `material_purchases` | SUM credit purchases | 0.15ms | نفس الفهرس ✅ |
| 3 | `material_purchases` | SUM storage purchases | 0.15ms | نفس الفهرس ✅ |
| 4 | `worker_attendance` | SUM wages + COUNT days | 0.3ms | فهرس ✅ `idx_worker_attendance_project_date` |
| 5 | `transportation_expenses` | SUM amount | 0.2ms | فهرس ✅ `idx_transport_expenses_project_date` |
| 6 | `worker_transfers` | SUM amount | 0.2ms | فهرس ✅ `idx_worker_transfers_project_date` |
| 7 | `worker_misc_expenses` | SUM amount | 0.2ms | فهرس ✅ `idx_worker_misc_expenses_project_date` |
| 8 | `fund_transfers` | SUM amount | 0.2ms | فهرس ✅ `idx_fund_transfers_project_date` |
| 9 | `project_fund_transfers` | SUM outgoing | 0.2ms | فهرس ✅ `idx_project_fund_transfers_from_project_date` |
| 10 | `project_fund_transfers` | SUM incoming | 0.2ms | فهرس ✅ `idx_project_fund_transfers_to_project_date` |
| 11 | `worker_attendance` + `workers` | COUNT DISTINCT workers (JOIN) | 0.58ms | فهرس ✅ |
| 12 | `supplier_payments` | SUM amount | 0.1ms | فهرس ✅ `idx_supplier_payments_supplier_id` |

**زمن SQL الفعلي لـ 12 query:** ~2.5ms
**زمن الشبكة لـ roundtrip واحد:** ~2,200ms
**النسبة:** SQL = 0.1% | الشبكة = 99.9%

---

### 2. `GET /api/recent-activities` — ~5-7 ثانية

**المسار:** `activityRoutes.ts`

**الاستعلامات (6 queries — تنفيذ متوالي ثم sort):**

| # | الجدول | JOIN | الاستعلام | ملاحظة |
|---|--------|------|-----------|--------|
| 1 | `fund_transfers` | LEFT JOIN `projects` | ORDER BY created_at DESC LIMIT 20 | فهرس ✅ |
| 2 | `project_fund_transfers` | subquery for project name | ORDER BY created_at DESC LIMIT 20 | فهرس ✅ |
| 3 | `worker_misc_expenses` | LEFT JOIN `projects` | ORDER BY created_at DESC LIMIT 20 | فهرس ⚠️ لا يوجد على `created_at` |
| 4 | `material_purchases` | LEFT JOIN `projects` | ORDER BY created_at DESC LIMIT 20 | فهرس ⚠️ لا يوجد على `created_at` |
| 5 | `worker_transfers` | LEFT JOIN `projects` | ORDER BY created_at DESC LIMIT 20 | فهرس ⚠️ لا يوجد على `created_at` |
| 6 | `daily_activity_logs` | LEFT JOIN `projects` | ORDER BY created_at DESC LIMIT 20 | لا توجد بيانات (0 rows) |

**التنفيذ:**
```
6 queries × ~2.2s roundtrip = ~13.2s (لو تسلسلية)
لكنها متوازية (Promise.all)... لذلك = ~2.2s
+ auth middleware roundtrip = ~2.2s
+ أي استعلامات إضافية
الإجمالي: ~5-7s
```

---

### 3. `GET /api/db/connections` — ~6.5 ثانية

**المسار:** `healthRoutes.ts` → `DbMetricsService.getConnectedDatabases()`

**المشكلة الأساسية:** يفحص **15 قاعدة بيانات** (1 محلية + 14 ديناميكية)

**لكل DB يُنفّذ 4 استعلامات metadata:**

| # | الاستعلام | الهدف |
|---|-----------|-------|
| 1 | `SELECT current_database(), version()` | اسم وإصدار DB |
| 2 | `SELECT pg_database_size(current_database())` | حجم DB |
| 3 | `SELECT COUNT(*) FROM information_schema.tables` | عدد الجداول |
| 4 | `SELECT SUM(n_live_tup) FROM pg_stat_user_tables` | عدد الصفوف |

**الحساب:**
```
15 DB × 4 queries = 60 query
لكنها تُنفَّذ بالتوازي (Promise.all per DB)
= 15 × 1 roundtrip + network latency per DB
timeout per DB = 8 ثوانٍ
الإجمالي: max(latency_db1, latency_db2, ... latency_db15) + ~2.2s auth
```

**14 من 15 DB فارغة (0 tables)** — يُحتمل أنها اتصالات قديمة أو تجريبية.

---

## B. الجداول المستخدمة

| الجدول | عدد الصفوف | الحجم | مُستخدم في |
|--------|-----------|-------|------------|
| `worker_attendance` | 785 | 616 KB | financial-summary |
| `transportation_expenses` | 366 | 344 KB | financial-summary, recent-activities |
| `worker_misc_expenses` | 311 | 184 KB | financial-summary, recent-activities |
| `material_purchases` | 182 | 4,832 KB | financial-summary, recent-activities |
| `fund_transfers` | 156 | 160 KB | financial-summary, recent-activities |
| `worker_transfers` | 116 | 104 KB | financial-summary, recent-activities |
| `project_fund_transfers` | 52 | 160 KB | financial-summary, recent-activities |
| `workers` | 57 | 96 KB | financial-summary (JOIN) |
| `projects` | 7 | 96 KB | الكل (JOIN/lookup) |
| `supplier_payments` | 0 | 24 KB | financial-summary |
| `daily_activity_logs` | 0 | 16 KB | recent-activities |

---

## C. الفهارس الموجودة حالياً

### الفهارس المُستخدمة فعلياً (تعمل بشكل ممتاز) ✅

| الجدول | الفهرس | الأعمدة |
|--------|--------|---------|
| `material_purchases` | `idx_material_purchases_project_purchase_date` | `(project_id, purchase_date)` |
| `material_purchases` | `idx_material_purchases_project_date` | `(project_id, purchase_date)` |
| `worker_attendance` | `idx_worker_attendance_project_date` | `(project_id, attendance_date)` |
| `worker_attendance` | `idx_worker_attendance_worker_id` | `(worker_id)` |
| `transportation_expenses` | `idx_transport_expenses_project_date` | `(project_id, date)` |
| `worker_transfers` | `idx_worker_transfers_project_date` | `(project_id, transfer_date)` |
| `worker_misc_expenses` | `idx_worker_misc_expenses_project_date` | `(project_id, date)` |
| `fund_transfers` | `idx_fund_transfers_project_date` | `(project_id, transfer_date)` |
| `project_fund_transfers` | `idx_project_fund_transfers_from_project_date` | `(from_project_id, transfer_date)` |
| `project_fund_transfers` | `idx_project_fund_transfers_to_project_date` | `(to_project_id, transfer_date)` |
| `supplier_payments` | `idx_supplier_payments_supplier_id` | `(supplier_id)` |

### فهارس ناقصة ⚠️

| الجدول | مطلوب لـ | غير موجود |
|--------|---------|-----------|
| `worker_misc_expenses` | recent-activities | فهرس على `created_at` |
| `material_purchases` | recent-activities | فهرس على `created_at` |
| `worker_transfers` | recent-activities | فهرس على `created_at` |
| `fund_transfers` | recent-activities | فهرس على `created_at` |
| `project_fund_transfers` | recent-activities | فهرس على `created_at` |

---

## D. التوصيات (حسب التأثير)

### 🔴 تأثير عالي — تقليل الشبكة

| # | التوصية | التأثير المتوقع | الجهد |
|---|---------|----------------|-------|
| 1 | **financial-summary: دمج 12 query في استعلام واحد** باستخدام `UNION ALL` أو CTE يجمع كل الإحصائيات في query واحدة | من ~6.6s إلى **~2.5s** (roundtrip واحد بدل 3) | Medium |
| 2 | **financial-summary: إضافة cache (TTL 60s)** — البيانات المالية لا تتغير كل ثانية | من ~6.6s إلى **<100ms** للطلبات المتكررة | Low |
| 3 | **db/connections: حذف الاتصالات الفارغة** — 14 من 15 DB فارغة (0 tables) وتُبطئ بلا فائدة | من ~6.5s إلى **~2.5s** | Low |
| 4 | **recent-activities: دمج 6 queries في UNION ALL واحد** | من ~5s إلى **~2.5s** | Medium |

### 🟡 تأثير متوسط — فهارس

| # | الفهرس المقترح | الأثر |
|---|---------------|-------|
| 5 | `CREATE INDEX idx_worker_misc_expenses_created_at ON worker_misc_expenses(created_at DESC)` | تسريع ORDER BY في recent-activities |
| 6 | `CREATE INDEX idx_material_purchases_created_at ON material_purchases(created_at DESC)` | تسريع ORDER BY في recent-activities |
| 7 | `CREATE INDEX idx_worker_transfers_created_at ON worker_transfers(created_at DESC)` | تسريع ORDER BY في recent-activities |
| 8 | `CREATE INDEX idx_fund_transfers_created_at ON fund_transfers(created_at DESC)` | تسريع ORDER BY في recent-activities |
| 9 | `CREATE INDEX idx_project_fund_transfers_created_at ON project_fund_transfers(created_at DESC)` | تسريع ORDER BY في recent-activities |

### 🟢 تأثير طويل المدى

| # | التوصية | الأثر |
|---|---------|-------|
| 10 | **نقل قاعدة البيانات أقرب** (نفس المنطقة الجغرافية مثل السيرفر) | من 2,200ms roundtrip إلى **<10ms** — يحل كل المشاكل |
| 11 | **استخدام connection pooler** (PgBouncer) | تقليل overhead إنشاء الاتصال |

---

## ملخص

```
┌─────────────────────────┐
│ أين يُهدر الوقت؟        │
├─────────────────────────┤
│ 🔴 الشبكة: 99.9%        │ ← roundtrip 2.2 ثانية لكل query
│ 🟢 SQL:     0.1%        │ ← كل query < 1ms
│ 🟢 Node.js: ~0%         │ ← معالجة فورية
└─────────────────────────┘

الحل الأسرع: دمج الاستعلامات + cache
الحل الجذري: تقريب قاعدة البيانات جغرافياً
```
