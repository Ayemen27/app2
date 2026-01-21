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

---
*تم تحديث هذا التوثيق بتاريخ 21 يناير 2026.*
