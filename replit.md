# AXION - نظام إدارة مشاريع المقاولات
نظام متكامل لإدارة مشاريع المقاولات مبني بـ Vite + React + Express + PostgreSQL

## هيكل المشروع
- **الواجهة**: Vite + React + shadcn/ui + TailwindCSS
- **الخادم**: Express.js + Socket.IO
- **قاعدة البيانات**: PostgreSQL + Drizzle ORM
- **المشترك**: نماذج البيانات والأنواع في `shared/schema.ts`

## الأنظمة الأساسية (54 جدول)
1. **المصادقة والأمان**: تسجيل دخول/خروج، JWT، صلاحيات، سجلات تدقيق
2. **إدارة المشاريع**: إنشاء/تعديل/حذف، أنواع مشاريع، تحويلات مالية
3. **إدارة العمال**: حضور، أجور، حوالات، نثريات، تسويات
4. **الموردين والمشتريات**: موردين، مواد، مشتريات، مدفوعات
5. **إدارة الآبار**: آبار، مهام، محاسبة، مصاريف، تدقيق
6. **المعدات المبسط**: معدات، حركات نقل بين مشاريع
7. **الإشعارات الموحد**: نظام إشعارات واحد مع حالات القراءة
8. **الذكاء الاصطناعي**: محادثات، رسائل، إحصائيات استخدام
9. **النسخ الاحتياطي**: نسخ يدوي/تلقائي، سجلات
10. **التقارير**: مسار واحد موحّد /reports
11. **دفتر الأستاذ (Ledger)**: قيد مزدوج، شجرة حسابات، تدقيق مالي، مطابقة تلقائية

## معايير تقنية
- اتبع إرشادات `fullstack_js`
- استخدم مكونات `shadcn/ui` للواجهة
- سمات `data-testid` موحدة للاختبار
- جميع الردود بالعربية فقط (تفضيل المستخدم)

## ميثاق عمل الوكيل المحترف (Professional Agent Charter)
1. **الدقة والصدق المطلق**: ممنوع المراوغة، التعميم، أو إعطاء إجابات غير مؤكدة. يتم التصريح الصريح عند عدم المعرفة.
2. **التفكير التحليلي العميق**: الالتزام بالتفكير خطوة بخطوة قبل أي إجابة أو تنفيذ برمي.
3. **الحلول الواقعية والذكية**: اختيار الحل الأكثر قابلية للتنفيذ، مع تقديم بدائل غير تقليدية وأقل كلفة عند فشل الحلول الشائعة.
4. **الشفافية والوضوح**: توضيح كافة الافتراضات قبل البناء عليها، وطلب المعلومات الناقصة بوضوح تام.
5. **منع الخداع والمجاملة**: تقديم الواقع التقني والعملي كما هو، حتى لو كان غير مريح للمستخدم. الحقيقة التقنية تتقدم على الإرضاء الزائف.
6. **منع التسرع**: تقييم كل خيار قبل اعتماده، وتجنب تقديم أول إجابة تخطر على الذهن.

## قواعد الحوكمة الصارمة (Governance Rules)
1. **سياسة المكون الموحد**: يمنع منعاً باتاً استخدام وسم `<textarea>` أو `<input>` الخام لأي إدخال نصي أو متعدد الأسطر في أي صفحة أو نموذج. يجب استخدام مكونات `Textarea` و `Input` الموحدة من `@/components/ui`.
2. **التحقق من السلوك**: أي حقل إدخال لا يدعم التوسع التلقائي (Auto-height) في حالة النصوص الطويلة أو يظهر شريط تمرير (Scrollbar) قبل الحد الأقصى يعتبر خللاً نظامياً (Systemic Bug).
3. **توحيد التجربة**: يجب أن تتطابق جميع حقول الإدخال في التطبيق من حيث السلوك، الإكمال، والاستجابة.
4. **منع الاستخدام المباشر**: أي كود يحتوي على `<textarea>` أو `<input type="text">` خارج مكتبة المكونات يعتبر مخالفة صريحة تمنع دمج الكود.
5. **الفحص الشامل**: تم إجراء فحص شامل بتاريخ 2026-02-10 للتأكد من خلو المشروع تماماً من أي عناصر إدخال خام. أي انحراف مستقبلي هو مسؤولية المطور.

## معمارية React Query (مركزية مفاتيح الاستعلام)
- **الملف المركزي**: `client/src/constants/queryKeys.ts` - يحتوي جميع مفاتيح الاستعلام (~100+ مورد)
- **ملف نقاط النهاية**: `client/src/constants/api.ts` - يحتوي جميع مسارات API المركزية
- **القواعد**:
  1. يمنع استخدام مفاتيح استعلام نصية مباشرة في أي صفحة أو hook
  2. جميع المفاتيح تمر عبر `QUERY_KEYS.xxx` أو `QUERY_KEYS.xxx(param)`
  3. إبطال الكاش يكون محدد النطاق فقط: `invalidateQueries({ queryKey: QUERY_KEYS.specific, refetchType: 'active' })`
  4. يمنع استخدام `invalidateQueries()` بدون queryKey (إبطال شامل)
  5. المفاتيح الديناميكية تستخدم دوال محددة: `QUERY_KEYS.dailyExpenses(projectId, date)`
- **الملفات المرحّلة**: جميع ملفات `client/src/` بدون استثناء (pages + components + hooks + contexts + lib)
- **التغطية**: صفر مفاتيح نصية مباشرة متبقية في كامل المشروع (تم التحقق بـ grep)
- **نمط المفاتيح البادئة**: مفاتيح مثل `autocompleteFanTypesPrefix` تُستخدم لإبطال كاش جميع المفاتيح التي تبدأ بنفس البادئة (prefix-match invalidation)
- **تم حذفه**: `client/src/constants/api-endpoints.ts` (كان مكرراً)

## نظام Pull to Refresh
- **الملفات**: `client/src/hooks/use-pull-to-refresh.ts` + `client/src/components/ui/pull-to-refresh.tsx` + `client/src/constants/pullRefreshConfig.ts`
- **نقطة الدمج**: LayoutShell (عنصر `<main>` القابل للتمرير)
- **التكامل**: React Query `refetchQueries` لكل مفاتيح الصفحة
- **الصفحات المفعلة**: 27 صفحة (dashboard, projects, workers, suppliers, equipment, wells, notifications, reports, إلخ)
- **الصفحات المستثناة**: login, register, settings, security (لا تظهر في pullRefreshConfig)
- **الميزات**: منع التحديث المتوازي، حد أدنى 600ms للسبنر، toast عند الفشل، دعم RTL

## التغييرات الأخيرة
- 2026-02-16: **فحص وإغلاق الفجوات المحاسبية (6 مراحل)**: حذف calculateTotals المحلي (180+ سطر dead code) من daily-expenses.tsx واعتماد totalsValue 100% من financialSummary API — إصلاح toISOString→getLocalDateStr() في ExpenseLedgerService — إضافة runDailyReconciliation() cron يومي الساعة 2 صباحاً — تأكيد SQL SUM و invalidateSummaries مكتملان — التقييم النهائي: جميع المراحل PASS
- 2026-02-16: **اكتمال ربط القيد المزدوج بجميع المسارات المالية**: 27 استدعاء safeRecord عبر financialRoutes.ts (18) و workerRoutes.ts (9) — يغطي fund-transfers, material-purchases, transportation-expenses, worker-transfers, worker-misc-expenses, project-fund-transfers, worker-attendance — نمط موحّد: POST→record, PATCH→reverse+record, DELETE→reverse — safeRecord non-blocking (لا يفشل العملية الأصلية)
- 2026-02-16: توحيد جذري للمسارات والخدمات المالية: دمج ledgerRoutes + financialLedgerRoutes في Router واحد (/api/ledger)، حذف userRoutes المكرر + financialLedgerRoutes الميت، إضافة RouteGuard يكشف الملفات غير المسجلة عند التشغيل، توضيح أدوار الخدمات (FinancialLedgerService=كتابة قيد مزدوج، ExpenseLedgerService=قراءة تقارير فقط)
- 2026-02-16: إنشاء نظام دفتر أستاذ مزدوج: 6 جداول (account_types, journal_entries, journal_lines, financial_audit_log, reconciliation_records, summary_invalidations) + FinancialLedgerService + شجرة حسابات 14 حساب + API موحّد
- 2026-02-16: تحسين Pull to Refresh: إزالة زر التحديث العائم من SyncManagementPage، إضافة /admin/sync و /security-policies لـ pullRefreshConfig (29 صفحة)، تحسين الـ hook لدعم Android WebView (overscroll-behavior-y:none + cancelable check + willChange)
- 2026-02-16: إصلاح شامل لنظام المزامنة: منع التكرار (dedup + idempotency key)، معالجة أخطاء 409/400/422 بسلام، إيقاف الحذف الصامت للعمليات الفاشلة، إضافة syncHistory store، تصحيق تنسيق التواريخ، إعادة بناء SyncManagementPage بـ 4 تبويبات (معلقة/فاشلة/مكررة/سجل) مع إحصائيات حقيقية
- 2026-02-15: إصلاح eslint (9→8.57.1 pinned) + حماية Keystore من git clean (نُقل إلى ~/.axion-keystore) + سكربت بناء v32 مع إصدار ديناميكي + حذف ملف com.replit.agentforge القديم
- 2026-02-15: إصلاح جذري لتصدير الملفات في Android - السبب: downloadForBrowser كان يُرجع true بدون فعل شيء في WebView. الحل: على mobile يُرجع false عند فشل جميع الطرق + dynamic imports للإضافات + ترقية filesystem/share إلى v7 + إضافة @byteowls/capacitor-filesharer + بناء APK v1.0.38 (26MB)
- 2026-02-14: تأمين endpoint التنزيل المؤقت (requireAuth + userId binding + UUID validation + LRU eviction: 50 max/5 per user) + إصلاح جميع دوال التصدير لفحص نتيجة التنزيل قبل عرض رسالة النجاح (12+ ملف)
- 2026-02-14: إضافة Pull to Refresh موحّد لـ 27 صفحة - hook + indicator + config مركزي في LayoutShell
- 2026-02-13: إصلاح الشاشة البيضاء عند تصدير Excel/PDF في Android WebView - توحيد جميع مسارات التصدير (10 ملفات) عبر webview-download.ts + Capacitor Filesystem/Share + إزالة كاملة لـ file-saver/saveAs + حماية window.open بـ isMobileWebView()
- 2026-02-13: ترحيل كامل (100%) لجميع ملفات offline + pages لاستخدام storage-factory - إزالة getDB من sync.ts, silent-sync.ts, data-compression.ts, index.ts, SystemCheckPage.tsx, sync-comparison.tsx + singleton guard لـ silentSync + deprecation tag لـ getDB export
- 2026-02-13: بناء APK v1.0.30 (29MB) - إصلاح كشف Capacitor + إصلاح forceSyncTable (كان يستخدم IndexedDB transaction) + إزالة server section من capacitor.config
- 2026-02-13: بناء APK v1.0.29 بنجاح (27MB) - إصلاح capacitor.config.json (كان com.replit.agentforge) + إصلاح gradlew wrapper (كان يستخدم Gradle 4.4.1 النظام)
- 2026-02-13: تنظيف السيرفر الخارجي من ملفات قديمة وإصلاح npm dependency conflict (eslint)
- 2026-02-13: رفع الاختبارات إلى 156 اختبار (100% نجاح) - CRUD, Security, Matching, Offline
- 2026-02-13: إضافة 10 فهارس قاعدة بيانات للجداول الأكثر استعلاماً
- 2026-02-13: إعادة تفعيل generalRateLimit مع handler مخصص يضمن استجابة JSON (كان معطّلاً)
- 2026-02-13: إصلاح اختبارات offline (25 اختبار) - إعادة كتابة conflict/db/sync tests للعمل بدون IndexedDB
- 2026-02-12: بناء APK v1.0.28 بنجاح عبر السيرفر الخارجي (28MB) + 48 اختبار تلقائي (100% نجاح)
- 2026-02-12: اكتمال معمارية React Query المركزية - ترحيل 50+ ملف لاستخدام QUERY_KEYS (مراجعة PASS)

## البناء والنشر
- **سيرفر البناء:** 93.127.142.144 (SSH: administrator)
- **Android SDK:** /opt/android-sdk
- **Gradle:** 8.11.1 | **AGP:** 8.9.1 | **compileSdk:** 36 | **minSdk:** 24
- **أمر البناء:** `bash scripts/remote-build.sh` (v32 - إصدار ديناميكي)
- **أمر الاختبار:** `npx vitest run --config vitest.server.config.ts`
- **Keystore:** محفوظ في `~/.axion-keystore/axion-release.keystore` على السيرفر (خارج مجلد git لحمايته من git clean)
- **SHA256 Fingerprint:** `27:FE:C2:F2:C3:35:B1:98:19:EF:9D:C3:72:92:B8:39:E2:6B:9E:E3:D4:A7:9F:5A:0C:FB:C5:63:14:CF:87:11`

## تفضيلات المستخدم
- اللغة: العربية فقط - لا يفهم الإنجليزية
- النهج: احترافي مع مراجعة معمارية
- الأولوية: التنظيف والدمج قبل إضافة ميزات جديدة

## ملاحظات مهمة
- generalRateLimit مفعّل (5000 طلب/15 دقيقة، handler JSON مخصص)
- الملف server/modules/core/schema-backup.ts هو نسخة احتياطية مرجعية فقط
- المنفذ: 5000 (الواجهة والخادم معًا)
