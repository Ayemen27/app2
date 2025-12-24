# ✅ معايير القبول الصارمة - PWA + Capacitor

**المستند**: معايير قبول موحدة لجميع المهام
**الحد الأدنى للقبول**: جميع المعايير يجب أن تكون ✅
**المراجعة**: كل وكيل يجب أن يتحقق من هذا قبل الانتقال للمهمة التالية

---

## 🎯 معايير عامة (لكل مهمة)

### 1. جودة الكود
- ✅ **TypeScript سليم**: `npm run check` بدون أخطاء
- ✅ **بدون `any` types**: إلا بسبب واضح وموثق
- ✅ **Error Handling**: جميع العمليات غير المتزامنة لها try-catch
- ✅ **Naming Convention**: الأسماء واضحة وملتزمة بـ camelCase/PascalCase
- ✅ **Comments**: كود معقد له comments بالعربية أو الإنجليزية

### 2. الاختبار
- ✅ **التشغيل المحلي**: يجب أن يعمل بدون أخطاء
- ✅ **عدم وجود Console Errors**: فقط التحذيرات المقبولة
- ✅ **عدم وجود Console Logs**: إذا كانت هناك logs يجب أن تكون مشروطة بـ debug flag
- ✅ **استجابة التطبيق**: التطبيق يعمل بسلاسة بدون تجميد

### 3. التوثيق
- ✅ **README**: ملف توثيق داخل المجلد (إن أنشأت مجلد جديد)
- ✅ **Code Comments**: تشرح الأجزاء الحساسة
- ✅ **git commit واضح**: الرسالة تشرح ماذا تم تغييره ولماذا

### 4. التوافقية
- ✅ **مع الكود الموجود**: لا توجد تضاربات مع الملفات الموجودة
- ✅ **Backward Compatible**: التعديلات لا تكسر الوظائف السابقة
- ✅ **Package.json**: لا تعديلات بدون إذن المشروع

---

## 📋 معايير المرحلة 1: تحضير الويب PWA

### المهمة 1.1: manifest.json

#### معايير الملف
- ✅ الملف في: `public/manifest.json`
- ✅ صيغة JSON سليمة (بدون أخطاء)
- ✅ حجم الملف: < 2KB

#### معايير المحتوى
```json
MUST HAVE:
- "name": "BinarJoin Analytics"
- "short_name": "Analytics"
- "start_url": "/"
- "scope": "/"
- "display": "standalone"
- "orientation": "portrait-primary"
- "background_color": "#ffffff"
- "theme_color": "#3b82f6"
- "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
```

#### معايير الأيقونات
- ✅ أيقونة 192x192 بكسل موجودة
- ✅ أيقونة 512x512 بكسل موجودة
- ✅ كلا الأيقونتين في `public/` مع الأسماء الصحيحة
- ✅ صيغة PNG
- ✅ دقة عالية وواضحة

#### اختبار القبول
```bash
# شغّل التطبيق
npm run dev

# في متصفح:
# 1. F12 → Application → Manifest
# 2. يجب أن تشاهد الـ manifest محملاً بنجاح
# 3. في الـ install banner يجب أن ترى الاسم والأيقونة
```

---

### المهمة 1.2: Service Worker

#### معايير الملف
- ✅ الملف في: `public/sw.js`
- ✅ حجم الملف: < 5KB
- ✅ لا يحتوي على console.log في الإنتاج

#### معايير الوظائف
```javascript
MUST HAVE:
1. importScripts لـ Workbox CDN
2. skipWaiting() و clientsClaim()
3. استراتيجية Cache لـ Pages (NavigationRoute)
4. استراتيجية Cache لـ API Routes
5. استراتيجية Cache لـ Assets (Scripts, Styles, Images)
6. Offline Fallback (اختياري لكن مفضل)
```

#### معايير الأداء
- ✅ Service Worker يتم تسجيله بدون أخطاء
- ✅ Cache يُنشأ بدون أخطاء
- ✅ التطبيق يحمل بدون إنترنت (بعد الزيارة الأولى)

#### اختبار القبول
```bash
# 1. افتح DevTools
# F12 → Application → Service Workers
# يجب أن ترى: "rest-express sw.js Status: activated and running"

# 2. اختبر Offline
# F12 → Network tab → Offline (checkbox)
# أعد تحميل الصفحة
# يجب أن تحمل الصفحة من الـ Cache
```

---

### المهمة 1.3: تفعيل Service Worker

#### معايير التعديل
- ✅ في `public/index.html` أو `client/src/main.tsx`
- ✅ إضافة ربط manifest:
  ```html
  <link rel="manifest" href="/manifest.json">
  ```
- ✅ إضافة كود تسجيل SW:
  ```javascript
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js');
    });
  }
  ```

#### معايير الاختبار
- ✅ لا توجد أخطاء في Console
- ✅ Manifest ينتقل بدون 404
- ✅ Service Worker يسجل بدون أخطاء
- ✅ Application يمكن تثبيته (PWA Install Prompt يظهر)

---

## 📋 معايير المرحلة 2: IndexedDB

### المهمة 2.1: Database Setup

#### معايير الملف
- ✅ الملف في: `client/src/offline/db.ts`
- ✅ TypeScript سليم
- ✅ Exports واضحة

#### معايير الوظائف
```typescript
MUST EXPORT:
- dbPromise: Promise<IDBDatabase>
- Database Name: 'binarjoin-db'
- Version: 1
- Object Stores:
  - 'queue': للبيانات المنتظرة
  - 'userData': للبيانات الأساسية
```

#### معايير الاختبار
```typescript
// يجب أن ينجح:
import { dbPromise } from '@/offline/db'

const db = await dbPromise
const allQueued = await db.getAll('queue')
console.log(allQueued) // Array, قد يكون فارغ
```

---

### المهمة 2.2: Offline Functions

#### معايير الملف
- ✅ الملف في: `client/src/offline/offline.ts`
- ✅ TypeScript سليم

#### معايير الدوال
```typescript
MUST EXPORT:
1. saveOffline(data: any): Promise<void>
   - يحفظ البيانات في 'queue'
   - يعطي error واضح إذا فشل

2. getAllOfflineData(): Promise<any[]>
   - يرجع جميع البيانات من 'queue'
   - يرجع array فارغ إذا لم يوجد بيانات

3. clearOfflineData(): Promise<void>
   - يحذف جميع البيانات من 'queue'
   - لا error حتى لو كان فارغ

4. getOfflineCount(): Promise<number>
   - يرجع عدد العناصر المعلقة
```

#### معايير الاختبار
```typescript
// كل دالة يجب أن:
// 1. تعمل بدون أخطاء
// 2. لا تأثير على الـ DOM مباشرة
// 3. Promise-based
try {
  await saveOffline({ test: 'data' })
  const count = await getOfflineCount()
  console.log(count) // 1
} catch (e) {
  console.error(e)
}
```

---

## 📋 معايير المرحلة 3: Smart Sync

### المهمة 3.1: Sync Engine

#### معايير الملف
- ✅ الملف في: `client/src/offline/sync.ts`
- ✅ لا تعتمد على React (pure TypeScript)

#### معايير الوظائف
```typescript
MUST HAVE:
1. syncOfflineData(): Promise<void>
   - تأخذ بيانات من 'queue'
   - ترسل POST إلى /api/sync (أو endpoint واضح)
   - تحذف البيانات عند النجاح
   - تحاول مرة أخرى عند الفشل

2. window listener لـ 'online' event
   - يستدعي syncOfflineData عند العودة للإنترنت

3. Error handling:
   - معالجة أخطاء الشبكة
   - معالجة أخطاء API
   - logging مشروط
```

#### معايير الاختبار
```
1. اذهب للـ Offline (DevTools → Network → Offline)
2. أنشئ بيانات (يجب أن تُحفظ محليًا)
3. عُد للـ Online (أزل Offline checkbox)
4. يجب أن ترى POST إلى /api/sync في Network tab
5. يجب أن تُحذف البيانات من 'queue'
```

---

### المهمة 3.2: useSyncData Hook

#### معايير الملف
- ✅ الملف في: `client/src/hooks/useSyncData.ts`
- ✅ React Hook مع TypeScript

#### معايير الوظائف
```typescript
MUST EXPORT:
- useSyncData(): { isSyncing: boolean, offlineCount: number }
  - يراقب اتصال الإنترنت
  - يعود isSyncing: true أثناء المزامنة
  - يعيد عدد العناصر المعلقة
```

#### معايير الاستخدام
```typescript
// في Component:
const { isSyncing, offlineCount } = useSyncData()
return (
  <div>
    {isSyncing && <p>جاري المزامنة...</p>}
    {offlineCount > 0 && <p>عناصر معلقة: {offlineCount}</p>}
  </div>
)
```

---

## 📋 معايير المرحلة 4: Push Notifications

### المهمة 4.1: Firebase Setup
- ✅ مشروع Firebase مُنشأ في Firebase Console
- ✅ Cloud Messaging مُفعّل
- ✅ `firebaseConfig` منسوخ
- ✅ `VAPID_KEY` منسوخ
- ✅ كلاهما محفوظ بآمان (في `.env` أو Secrets)

### المهمة 4.2: Firebase Module

#### معايير الملف
- ✅ الملف في: `client/src/services/firebase.ts`
- ✅ لا توجد مفاتيح مشفرة في الملف مباشرة

#### معايير الوظائف
```typescript
MUST EXPORT:
- initializeFirebase(): void
- messaging: Messaging instance
- getFirebaseToken(): Promise<string>
```

### المهمة 4.3: Web Push

#### معايير الملف
- ✅ الملف في: `client/src/hooks/usePush.ts`

#### معايير الوظائف
```typescript
MUST:
1. طلب إذن من المستخدم
2. الحصول على Token
3. إرسال Token إلى Backend (POST /api/push/token)
4. حفظ Token محليًا
5. معالجة الرسائل الواردة
```

### المهمة 4.4: Backend Push Endpoint

#### معايير الـ Endpoint
- ✅ Route: `POST /api/push/token`
- ✅ Authentication: يجب التحقق من الجلسة
- ✅ Validation: Token يجب أن يكون string
- ✅ Storage: Token يُحفظ في Database أو Memory

---

## 📋 معايير المرحلة 5-7

### Capacitor Initialization
- ✅ `capacitor.config.json` محدث بأسماء صحيحة
- ✅ مشروع Android موجود في `android/`
- ✅ `npm run build:client` ينجح

### Final Testing (قبل APK)
- ✅ تطبيق الويب يعمل بدون أخطاء
- ✅ Offline functionality يعمل
- ✅ Sync يحدث عند العودة
- ✅ Push Notifications تصل
- ✅ لا توجد console errors أو warnings غير ضرورية

---

## 🔍 عملية المراجعة

### قبل بدء المهمة
- [ ] اقرأ معايير المهمة
- [ ] افهم التبعيات
- [ ] استعد بالأدوات المطلوبة

### أثناء العمل
- [ ] أكتب الكود بنظافة
- [ ] أختبر كل دالة
- [ ] أتحقق من الأخطاء

### بعد الانتهاء
- [ ] تحقق من جميع معايير القبول
- [ ] اختبر التطبيق كاملاً
- [ ] أكتب commit واضح
- [ ] وثّق أي ملاحظات في `.work/NOTES.md`

### الموافقة النهائية
```
إذا اجتازت المهمة جميع المعايير = ✅ APPROVED
إذا فشلت في معيار واحد = ❌ NEEDS REVISION
```

---

## 🆘 في حالة المشاكل

1. **خطأ TypeScript**: راجع `npm run check` وصحّحه
2. **خطأ Runtime**: استخدم DevTools لفهم الخطأ
3. **سوء فهم المتطلبات**: اسأل في `.work/QUESTIONS.md`
4. **تضارب مع كود موجود**: وثّق المشكلة في `.work/BLOCKERS.md`

---

**آخر تحديث**: 24 ديسمبر 2025
**المراجع**: معايير عالمية من Google, Microsoft, Shopify
