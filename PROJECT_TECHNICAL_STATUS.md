# التوثيق التقني والهندسي للمشروع (Project Technical Status)

هذا الملف مرجع شامل للحالة التقنية الحالية للمشروع، تم إعداده لضمان استمرارية التطوير وفهم المعايير الهندسية المتبعة.

## 1. تنظيف الكود والاعتمادات (Dead Code & Dependencies)
تم إجراء مسح شامل وتطهير للكود من الملفات والاعتمادات غير المستخدمة:
- **الأدوات المستخدمة:** `depcheck`, `ts-unused-exports`, `eslint`.
- **الإجراء التقني:** 
  - حذف الحزم غير الضرورية من `package.json`.
  - تعطيل التصديرات (Exports) غير المستخدمة برمجياً.
- **الإنفاذ الآلي (Enforcement):** تم ضبط `eslint` مع `max-warnings 0` لمنع إضافة أي كود غير مستخدم في المستقبل، وربطه بسكربت `pre-publish`.

## 2. الحدود المعمارية (Architecture Boundaries)
تم فرض عزل صارم بين مكونات النظام الثلاثة (Client, Server, Shared):
- **الآلية:** استخدام `tsconfig.json paths` و `Vite aliases` لتعريف حدود واضحة.
- **Shared Folder:** محمي برمجياً ليكون **Environment-Agnostic** (لا يسمح باستيراد أي مكتبات Node.js أو UI libraries).
- **منع الكسر المتسلسل:** الحدود تضمن أن حذف أي ملف في أحد الأقسام لا يؤدي لكسر عشوائي في الأقسام الأخرى (Fail-fast at compile time).

## 3. نظام التصميم (Design System & UI Enforcement)
التطبيق يتبع نظام تصميم موحد وصارم:
- **المكونات:** استخدام مكونات `Shadcn` الموحدة في `client/src/components/ui`.
- **Tokens:** تم توحيد الألوان، الخطوط (Cairo)، والمسافات داخل `client/src/index.css`.
- **الإنفاذ التقني:** قاعدة ESLint (`import/no-restricted-paths`) تمنع استخدام مكتبات UI خام (مثل Radix) وتجبر على استخدام النظام الموحد.

## 4. نظام الاختبارات والحماية (CI/CD & Testing)
تم تفعيل "جهاز مناعة" تقني يمنع النشر في حال وجود أخطاء:
- **الاختبارات:** 
  - **Unit & Integration:** باستخدام `Vitest`.
  - **End-to-End (E2E):** باستخدام `Playwright`.
- **آلية المنع:** تم إعداد سكربت `pre-publish` داخل `package.json`:
  ```json
  "pre-publish": "npm run lint && npm run test"
  ```
- **قاعدة Fail-fast:** فشل أي اختبار أو قاعدة Lint يوقف عملية الـ Build والنشر تلقائياً.

## 5. ملفات الإعدادات الجوهرية (Configuration Reference)

### ESLint Configuration (`.eslintrc.json`)
```json
{
  "rules": {
    "import/no-restricted-paths": [
      "error",
      {
        "zones": [
          { "target": "./shared", "from": "./client", "message": "Cannot import from client into shared." },
          { "target": "./shared", "from": "./server", "message": "Cannot import from server into shared." }
        ]
      }
    ]
  }
}
```

### Design Tokens (`client/src/index.css`)
تستخدم الرموز (Tokens) نظام HSL الموحد لسهولة التخصيص ودعم الوضع المظلم:
```css
:root {
  --primary: 207 90% 54%;
  --radius: 0.75rem;
  --header-height: 64px;
}
```

## 6. التدقيق الأمني (Security Audit & Protection)

تم تنفيذ استراتيجية أمنية متعددة الطبقات لحماية النظام والبيانات:

### أ. فحص الثغرات (Vulnerability Scanning)
- **الأدوات:** تم استخدام \`npm audit\` لفحص تبعيات الطرف الثالث.
- **النتائج:** تم تحديد وإصلاح الثغرات الحرجة (مثل \`jspdf\` و \`nodemailer\`) عبر تحديث الإصدارات. تبقى بعض الثغرات في حزم الأدوات (مثل \`scp2\`) وهي تحت المراقبة لأنها لا تؤثر على بيئة الإنتاج مباشرة.

### ب. الحماية من الهجمات الشائعة (OWASP Top 10)
- **Rate Limiting:** مفعل عبر \`express-rate-limit\` في \`server/middleware/auth.ts\` (يحد من محاولات تسجيل الدخول والعمليات الحساسة).
- **Security Headers:** استخدام \`helmet\` لفرض سياسات أمان المتصفح (HSTS, CSP, XSS Protection).
- **SQL Injection:** يتم منعها تقنياً عبر استخدام **Drizzle ORM** الذي يقوم بمعالجة البيانات تلقائياً (Parameterization).
- **XSS & CSRF:** تم تفعيل \`securityHeaders\` middleware لفرض \`X-Content-Type-Options\` و \`X-Frame-Options\`.

### ج. إدارة الأسرار (Secrets Management)
- **الآلية:** يتم استخدام \`SecretsManager.ts\` لإدارة المفاتيح السرية (JWT, Encryption Keys).
- **التخزين:** تعتمد المنصة على **Environment Variables** (تُخزن مشفرة في Replit Secrets) ولا يتم تخزينها في الكود نهائياً.
- **المسارات المتأثرة:** \`server/services/SecretsManager.ts\`.

### د. نظام الصلاحيات (RBAC - Role Based Access Control)
- **التطبيق:** مُطبق عبر \`authenticate\` و \`requireAdmin\` middlewares في \`server/middleware/auth.ts\`.
- **السياسات:** يتم التحقق من دور المستخدم (\`admin\`, \`super_admin\`, \`user\`) في كل طلب محمي.
- **القراءة فقط:** ميزة \`checkWriteAccess\` تمنع المستخدمين العاديين من إجراء أي تعديلات (POST/PUT/DELETE).

## 7. توافق بيئة الإنتاج والـ Android (VPS & Capacitor Compatibility)

تم ضبط بيئة التطوير لضمان التوافق التام مع عمليات البناء على السيرفرات الخارجية (VPS) وتطبيقات الأندرويد:

### أ. توحيد مجلد الأصول (Web Assets Directory)
- **المجلد الناتج:** تم تغيير مسار البناء في \`vite.config.ts\` ليقوم بتوليد المجلد باسم \`www\` بدلاً من \`dist/public\`.
- **التوافق مع Capacitor:** تم إنشاء ملف \`capacitor.config.json\` وضبط \`webDir\` ليشير إلى مجلد \`www\`، مما يحل مشكلة الخطأ \`Could not find the web assets directory: ./www\`.

### ب. أتمتة عملية البناء (Build Automation)
- **الأمر الموحد:** تم تحديث سكربت \`npm run build:client\` ليقوم بـ:
    1. بناء ملفات الـ Client داخل مجلد \`www\`.
    2. مزامنة الملفات تلقائياً مع مجلد \`dist/public\` لضمان عمل السيرفر المحلي والإنتاج بنفس الكفاءة.
- **النتيجة:** عند سحب الكود (Git Pull) على أي VPS، ستكون الملفات النهائية جاهزة فوراً لعملية \`npx cap sync\` دون الحاجة لخطوات يدوية إضافية.

---
*تم تحديث هذا التوثيق بتاريخ 21 يناير 2026.*
