# معايير القبول والتقييم - Offline-First System

**الإصدار:** 1.0  
**آخر تحديث:** 2025-12-30

---

## المرحلة 1: التأسيس ✅ (الحالية)

### المعيار 1.1: نظام المزامنة الأساسي
```
✓ MUST: يوجد ملف sync.ts مع retry logic
✓ MUST: المزامنة تبدأ تلقائياً عند عودة الإنترنت
✓ MUST: logging شامل لكل عملية مزامنة
✓ MUST: معالجة أخطاء صحيحة (offline, network timeout, server error)
✓ SHOULD: الـ UI تعرض حالة المزامنة (syncing, failed, pending)
```

### المعيار 1.2: الحفظ المحلي للعمليات
```
✓ MUST: العمليات المعلقة تُحفظ في IndexedDB
✓ MUST: عند الفشل، البيانات تُحفظ محلياً تلقائياً
✓ MUST: الرسالة تخبر المستخدم "سيتم المزامنة عند الاتصال"
✓ SHOULD: عرض عدد العمليات المعلقة في الـ UI
```

### المعيار 1.3: معالجة الأخطاء
```
✓ MUST: فشل إرسال البيانات لا يؤدي لفقدانها
✓ MUST: الخطأ يُعرض للمستخدم بوضوح
✓ MUST: إعادة محاولة تلقائية (max 5 مرات)
✓ MUST: delay بين المحاولات (exponential backoff)
```

**تاريخ الانتهاء المتوقع:** 2025-12-31

---

## المرحلة 2: مرآة قاعدة البيانات 🔍

### المعيار 2.1: نقطة نهاية الـ Full Backup
```
✓ MUST: يوجد endpoint POST /api/sync/full-backup
✓ MUST: يرسل جميع البيانات (projects, workers, materials, etc)
✓ MUST: كل entity يحتوي على metadata (id, createdAt, updatedAt)
✓ MUST: يعمل بدون pagination (أو مع pagination محسّن)
✓ SHOULD: compressed data لتقليل حجم النقل
```

### المعيار 2.2: جداول محلية كاملة
```
✓ MUST: IndexedDB يحتوي على نفس جداول الخادم
✓ MUST: كل جدول له نفس الأعمدة (columns)
✓ MUST: البيانات محدثة تلقائياً من الخادم
✓ MUST: يوجد metadata store (lastSync timestamp)
```

### المعيار 2.3: نقل البيانات الأولي
```
✓ MUST: عند أول تحميل، تُحمّل جميع البيانات من الخادم
✓ MUST: يوجد progress indicator أثناء التحميل
✓ MUST: في حالة الفشل، تُحاول مجدداً
✓ SHOULD: حفظ timestamp آخر تحديث
```

**تاريخ الانتهاء المتوقع:** 2026-01-03

---

## المرحلة 3: الاستعلامات الذكية 🧠

### المعيار 3.1: QueryClient محسّن
```
✓ MUST: كل query تفحص الاتصال تلقائياً
✓ MUST: في حالة offline، تُرجع بيانات من IndexedDB
✓ MUST: عند العودة online، تُحدّث البيانات من الخادم
✓ MUST: معالجة الحالات الانتقالية (slow network)
```

### المعيار 3.2: Fallback Logic
```
✓ MUST: دالة getDataWithFallback() لكل entity
✓ MUST: إذا فشل الخادم، استخدم البيانات المحلية
✓ MUST: إذا كانت البيانات قديمة، عرّف للمستخدم
✓ SHOULD: cache invalidation ذكي
```

### المعيار 3.3: أنواع البيانات محدثة
```
✓ MUST: جميع Types محدثة لدعم local data
✓ MUST: لا توجد أخطاء TypeScript
✓ MUST: استعمال strict mode في TypeScript
```

**تاريخ الانتهاء المتوقع:** 2026-01-06

---

## المرحلة 4: التزامن ثنائي الاتجاه 🔄

### المعيار 4.1: Batch Sync Endpoint
```
✓ MUST: endpoint POST /api/sync/batch
✓ MUST: يقبل مصفوفة من العمليات (create, update, delete)
✓ MUST: يُرجع status لكل عملية (success/failed)
✓ MUST: معاملات (transactions) - إما الكل أو لا أحد
```

### المعيار 4.2: حل التضارعات
```
✓ MUST: اكتشاف التضارعات تلقائياً
✓ MUST: استراتيجية واضحة لحل التضارعات
   - Last-Write-Wins (LWW) للبيانات البسيطة
   - Custom merge للبيانات المعقدة
✓ MUST: تنبيه المستخدم عند وجود تضارع
✓ MUST: خيار للمستخدم لاختيار النسخة
```

### المعيار 4.3: عمليات Offline كاملة
```
✓ MUST: إضافة مصروف offline يعمل تماماً
✓ MUST: تعديل مصروف offline يعمل تماماً
✓ MUST: حذف مصروف offline يعمل تماماً
✓ MUST: الحسابات صحيحة حتى offline
✓ MUST: عند المزامنة، كل شيء ينُقل صحيح
```

### المعيار 4.4: اختبار سيناريوهات معقدة
```
✓ MUST: offline + عمليات متعددة + reconnect
✓ MUST: offline + edits نفس البيانات + conflict
✓ MUST: offline + فشل الخادم + retry + success
✓ MUST: محاكاة network throttle وأخطاء
```

**تاريخ الانتهاء المتوقع:** 2026-01-10

---

## المرحلة 5: الأداء والأمان 🔐

### المعيار 5.1: الأداء
```
✓ MUST: التحميل الأول < 3 ثواني
✓ MUST: المزامنة 100 operation < 5 ثواني
✓ MUST: UI response time < 100ms
✓ MUST: استهلاك الذاكرة معقول (< 50MB)
```

### المعيار 5.2: الأمان
```
✓ MUST: البيانات الحساسة مشفرة محلياً
✓ MUST: JWT verification على كل عملية
✓ MUST: لا يوجد plain text passwords
✓ MUST: حذف البيانات عند logout
✓ MUST: HTTPS في الإنتاج
```

### المعيار 5.3: التنظيف والصيانة
```
✓ MUST: حذف البيانات القديمة تلقائياً (> 30 يوم)
✓ MUST: دالة cleanup للـ IndexedDB
✓ MUST: monitoring للـ storage usage
✓ SHOULD: compression للبيانات الكبيرة
```

**تاريخ الانتهاء المتوقع:** 2026-01-12

---

## المرحلة 6: الاختبار والنشر 🚀

### المعيار 6.1: الاختبار الشامل
```
✓ MUST: unit tests لـ sync functions
✓ MUST: integration tests للتدفق الكامل
✓ MUST: اختبارات على متصفحات مختلفة
✓ MUST: اختبارات على أجهزة مختلفة (mobile)
✓ MUST: اختبارات السيناريوهات الحدية
```

### المعيار 6.2: التوثيق
```
✓ MUST: توثيق الـ API الكامل
✓ MUST: شرح معمارية النظام
✓ MUST: أمثلة استخدام عملية
✓ MUST: استكشاف الأخطاء الشائعة
✓ SHOULD: فيديو توضيحي
```

### المعيار 6.3: المراقبة
```
✓ MUST: logging شامل في الإنتاج
✓ MUST: monitoring لمعدل نجاح المزامنة
✓ MUST: alerts للأخطاء المتكررة
✓ MUST: dashboard للإحصائيات
```

**تاريخ الانتهاء المتوقع:** 2026-01-14

---

## 🎓 معايير الكود العالمية

### Clean Code
- [ ] الدوال قصيرة (< 30 سطر)
- [ ] الأسماء واضحة ومعبرة
- [ ] DRY principle (لا تكرار)
- [ ] SOLID principles

### TypeScript
- [ ] strict mode مفعل
- [ ] جميع functions typed
- [ ] لا توجد `any` type
- [ ] error handling شامل

### Performance
- [ ] لا توجد memory leaks
- [ ] render optimization
- [ ] lazy loading
- [ ] caching strategies

### Testing
- [ ] > 80% code coverage
- [ ] integration tests شاملة
- [ ] edge cases مغطاة
- [ ] regression tests

---

## 📊 نموذج تقييم الجودة

| المعيار | الوزن | الحد الأدنى | المتوقع |
|--------|------|----------|--------|
| Functionality | 40% | 90% | 100% |
| Performance | 20% | 80% | 95% |
| Code Quality | 20% | 85% | 95% |
| Testing | 15% | 80% | 95% |
| Documentation | 5% | 80% | 100% |

**النتيجة النهائية المطلوبة: ≥ 90%**

---

## ✅ شروط الاكتمال

كل مرحلة تُعتبر مكتملة عندما:
1. ✓ جميع المعايير MUST مستوفاة
2. ✓ معظم معايير SHOULD مستوفاة (> 80%)
3. ✓ لا توجد أخطاء حرجة (critical bugs)
4. ✓ توثيق شامل متوفر
5. ✓ اختبارات تُثبت الاستيفاء
