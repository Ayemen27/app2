# تقرير حادثة تقنية: فشل بناء Vite بسبب تعارض OpenTelemetry

## وصف المشكلة
عند محاولة دمج `OpenTelemetry` في الواجهة الأمامية (Frontend) باستخدام `getWebAutoInstrumentations` من حزمة `@opentelemetry/auto-instrumentations-web` ، فشلت عملية البناء (Build) في Vite مع ظهور أخطاء `No matching export`.

## الأخطاء المرصودة
```
✘ [ERROR] No matching export in "node_modules/@opentelemetry/semantic-conventions/build/esm/index.js" for import "ATTR_URL_FULL"
✘ [ERROR] No matching export in "node_modules/@opentelemetry/semantic-conventions/build/esm/index.js" for import "ATTR_USER_AGENT_ORIGINAL"
```

## تحليل السبب الجذر (Root Cause Analysis)
المشكلة ناتجة عن تعارض في الإصدارات بين حزم `@opentelemetry/instrumentation-document-load` و `@opentelemetry/semantic-conventions`. 
تحاول حزمة التتبع التلقائي استيراد ثوابت (Constants) غير موجودة في نسخة `semantic-conventions` المثبتة، أو تم تغيير مسمياتها في الإصدارات الأحدث لـ ESM.

## الحل المنفذ (Action Taken)
تم الانتقال من "التهيئة التلقائية الكاملة" إلى "التهيئة اليدوية المختارة" (Selective Manual Instrumentation).
1. تم استبعاد `getWebAutoInstrumentations` التي تحاول تحميل جميع الملحقات تلقائياً.
2. تم استيراد وتفعيل `FetchInstrumentation` و `XMLHttpRequestInstrumentation` بشكل منفصل.
3. تم تعطيل الملحقات المسببة للمشكلة (`document-load` و `user-interaction`) مؤقتاً لضمان استقرار البناء.

## النتيجة
- تم استعادة استقرار التطبيق وعمله بنجاح.
- تفعيل تتبع الشبكة (Network Tracing) بنجاح.
- توثيق الحل لمنع تكرار المشكلة في المستقبل.
