# تقرير الفحص الشامل — نظام AXION WhatsApp Bot
**تاريخ:** مارس 2026

---

## ملخص تنفيذي

تم فحص **7 ملفات رئيسية** بواسطة **4 وكلاء فرعيين** + مراجعة معمارية شاملة. النتيجة: **45 مشكلة** مكتشفة.

| الخطورة | العدد | الحالة |
|---------|-------|--------|
| حرج (Critical) | 8 | يتطلب إصلاح فوري |
| عالي (High) | 10 | يتطلب إصلاح قريب |
| متوسط (Medium) | 16 | مخطط للإصلاح |
| منخفض (Low) | 11 | تحسينات |

---

## المشاكل الحرجة (8)

### C1: `return` بدل `continue` في حلقة messages.upsert
- **الملف:** `WhatsAppBot.ts` سطور 668-685
- **الأثر:** فقدان رسائل كاملة عند وصول دفعة رسائل من Baileys
- **الحالة:** تم إصلاحه في آخر تحديث

### C2: Retry Mechanism يسبب ردود مكررة (مشكلة "3" = تقارير مرتين)
- **الملف:** `WhatsAppBot.ts` سطور 793-816
- **الأثر:** إذا حصل timeout بعد نجاح المعالجة الداخلية، يُعاد الطلب ويُرسل رد ثاني
- **الإصلاح:** إضافة idempotency key + تقليل retries لعملية واحدة أو إلغاؤها

### C3: Race Condition في phoneProcessingLock
- **الملف:** `WhatsAppBot.ts` سطور 679-687
- **الأثر:** رسالتان متزامنتان من نفس الرقم قد تُعالجان معاً
- **الإصلاح:** نقل `set(cleanPhone, true)` فوراً بعد فحص القفل

### C4: حقن OCR Text في System Prompt (Prompt Injection)
- **الملف:** `WhatsAppAIService.ts` سطور 511-516
- **الأثر:** صورة تحتوي `[ACTION:SQL_SELECT:...]` قد تُنفذ أوامر غير مصرح بها
- **الإصلاح:** تنظيف نص OCR من أنماط ACTION قبل الدمج

### C5: SQL Injection عبر التعليقات في AI-Generated Queries
- **الملف:** `DatabaseActions.ts` سطر 1312-1368
- **الأثر:** تجاوز فلترة الكلمات المحظورة عبر تعليقات SQL
- **الإصلاح:** تنفيذ `normalized` بدل `trimmed` + إضافة جداول WhatsApp للقائمة المحظورة

### C6: تسريب ذاكرة في pendingOperations
- **الملف:** `AIAgentService.ts` سطر 722
- **الأثر:** العمليات المعلقة تبقى في الذاكرة للأبد إذا لم تُنفذ
- **الإصلاح:** إضافة timeout تلقائي (30 دقيقة)

### C7: عدم وجود timeout على استدعاءات API الخارجية
- **الملف:** `ModelManager.ts` سطور 564, 625
- **الأثر:** طلب API معلّق يحجز الـ thread بلا حدود = تجمد البوت
- **الإصلاح:** إضافة AbortController مع timeout 30 ثانية

### C8: تحميل كامل تاريخ المحادثة بدون حد
- **الملف:** `AIAgentService.ts` سطر 558
- **الأثر:** استهلاك tokens هائل + تجاوز context window
- **الإصلاح:** تحديد آخر 20-30 رسالة

---

## المشاكل العالية (10)

| # | المشكلة | الملف | الإصلاح |
|---|---------|-------|---------|
| H1 | عدم إبطال الجلسة عند تغيير صلاحيات المستخدم | SecurityContext | فحص role عند كل رسالة |
| H2 | تسجيل أرقام هاتف ومحتوى الرسائل في logs | WhatsAppBot | تقنيع الأرقام |
| H3 | Race Condition في Auto-Link | SecurityContext | استخدام transaction |
| H4 | استبدال أرقام هاتف بدون إشعار | SecurityContext | تسجيل أمني + إشعار |
| H5 | `handleBalanceExportChoice` يستدعي `handleIncomingMessage` بشكل متكرر ويصطدم بالـ processingLock | WhatsAppAIService:1469 | استدعاء `_processMessage` مباشرة |
| H6 | الجلسات تضيع عند إعادة تشغيل السيرفر | WhatsAppAIService:117 | حفظ حالة الجلسات النشطة في DB |
| H7 | hasAvailableModel تستخدم cooldown خاطئ للمفاتيح المستنفدة | ModelManager:713 | استخدام getKeyCooldownMs |
| H8 | resetDailyUsage لا تُعيد isBalanceDepleted | ModelManager:692-705 | إضافة `isBalanceDepleted = false` |
| H9 | `sendInteractiveReply` يرسل نصاً فقط بدون أزرار | WhatsAppBot:406-409 | تنفيذ أزرار Baileys |
| H10 | LID resolution يستخدم `readFileSync` blocking | WhatsAppBot:895-930 | cache + async IO |

---

## المشاكل المتوسطة (16)

| # | المشكلة |
|---|---------|
| M1 | BotSettings cache بدون TTL |
| M2 | القائمة تعرض خيارات غير مصرح بها |
| M3 | Content dedup يعتمد أول 100 حرف فقط |
| M4 | عدم فحص حجم الصور قبل المعالجة (DoS) |
| M5 | Retry vs ProcessingLock تعارض |
| M6 | CONFIRM tag لا يُنظف من الردود |
| M7 | DeepSeek `<think>` tags تصل للمستخدم |
| M8 | System Prompt sanitization بـ `^` anchor فقط |
| M9 | Race condition في updateUsageStats |
| M10 | Audio/Document handling قبل تحميل session context |
| M11 | PDF extracted text يُهمل (returns null) |
| M12 | OCR text غير منظف من prompt injection |
| M13 | لا حد أقصى لأيام التقرير (999999 يوم) |
| M14 | LIKE wildcards غير مهربة في بحث العمال |
| M15 | prompts كبيرة من تراكم السياق |
| M16 | تأخير إطلاق القفل 3 ثوانٍ يفقد رسائل |

---

## خطة الإصلاح المقترحة (حسب الأولوية)

### المرحلة 1: إصلاحات فورية (جهد منخفض، أثر كبير)
1. إضافة idempotency للـ retry mechanism (C2)
2. نقل phoneProcessingLock.set فوراً بعد الفحص (C3)
3. تنظيف OCR text من أنماط ACTION (C4)
4. تنفيذ normalized SQL بدل trimmed (C5)
5. إضافة timeout للـ API calls (C7)
6. تنظيف `<think>` و `[CONFIRM]` من الردود (M6, M7)
7. إصلاح hasAvailableModel cooldown (H7)
8. إصلاح resetDailyUsage (H8)

### المرحلة 2: إصلاحات مهمة (جهد متوسط)
1. إضافة TTL + cleanup للجلسات والـ Maps (C6, H6)
2. تحديد حد الرسائل المرسلة للنموذج (C8)
3. فحص role عند كل رسالة (H1)
4. تقنيع البيانات في logs (H2)
5. Transaction في Auto-Link (H3)
6. إصلاح handleBalanceExportChoice (H5)

### المرحلة 3: تحسينات (جهد متنوع)
1. تنفيذ Interactive Buttons في Baileys (H9)
2. async LID resolution مع cache (H10)
3. فلترة القائمة حسب الصلاحيات (M2)
4. hash للـ content dedup بدل 100 حرف (M3)
5. فحص حجم الصور (M4)

---

## نقاط القوة الملاحظة

1. **Whitelist-based Access (Fail-Closed)** — ممتاز
2. **Multi-layer Rate Limiting** — شامل
3. **RBAC على AI Actions** — متين
4. **SQL Safety Layers** — READ ONLY + timeout + blocked tables
5. **Response Sanitization** — جيد مع مجال للتحسين
6. **Security Event Logging** — موجود ومفعّل
7. **Project Isolation** — يُطبّق على كل العمليات
