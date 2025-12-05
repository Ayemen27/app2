# تطبيق إدارة مشاريع البناء - Android

تطبيق أندرويد احترافي لإدارة مشاريع البناء والإنشاءات، يعمل بشكل كامل Offline مع مزامنة ذكية.

## المميزات الرئيسية

- ✅ العمل بدون إنترنت (Offline First)
- 🔄 مزامنة ذكية مع حل التضارب
- 📷 الكاميرا لتصوير الفواتير
- 📍 GPS لتحديد المواقع
- 🔔 إشعارات Push
- 🌍 واجهة عربية كاملة RTL

## التقنيات المستخدمة

| التقنية | الغرض |
|---------|-------|
| Capacitor 6 | Native wrapper |
| React 18 | UI Framework |
| RxDB + SQLite | Local database |
| TypeScript | Type safety |
| Tailwind CSS | Styling |

## هيكل المشروع

```
mobile/
├── docs/                    # الوثائق
│   ├── vision.md           # الرؤية والأهداف
│   ├── requirements.md     # المتطلبات
│   ├── architecture.md     # الهندسة المعمارية
│   ├── sync-design.md      # تصميم المزامنة
│   ├── database-schema.md  # قاعدة البيانات
│   ├── qa-plan.md          # خطة الاختبار
│   ├── release-plan.md     # خطة النشر
│   └── work-plan.md        # خطة العمل
├── app/                     # كود التطبيق
│   ├── src/
│   │   ├── features/       # الشاشات
│   │   ├── services/       # الخدمات
│   │   ├── db/             # قاعدة البيانات
│   │   ├── hooks/          # React hooks
│   │   ├── ui/             # المكونات
│   │   └── i18n/           # الترجمات
│   ├── android/            # مشروع Android
│   ├── capacitor.config.ts # إعدادات Capacitor
│   └── package.json        # الحزم
└── scripts/                 # سكريبتات البناء
    ├── build-android.sh
    └── generate-keystore.sh
```

## البدء السريع

### المتطلبات

- Node.js 18+
- Android Studio
- Android SDK (API 24+)
- Java 17+

### التثبيت

```bash
cd mobile/app
npm install
```

### التطوير

```bash
npm run dev
```

### بناء APK

```bash
chmod +x ../scripts/build-android.sh
../scripts/build-android.sh debug
```

### بناء للنشر

```bash
../scripts/build-android.sh release
```

## خطة العمل

| المرحلة | المدة | الحالة |
|---------|-------|--------|
| التهيئة | أسبوع 1 | ⬜ |
| MVP | أسبوع 2-3 | ⬜ |
| المزامنة | أسبوع 4-5 | ⬜ |
| Native | أسبوع 6-7 | ⬜ |
| الإطلاق | أسبوع 8-10 | ⬜ |

## الوثائق

- [الرؤية والأهداف](docs/vision.md)
- [المتطلبات](docs/requirements.md)
- [الهندسة المعمارية](docs/architecture.md)
- [تصميم المزامنة](docs/sync-design.md)
- [قاعدة البيانات](docs/database-schema.md)
- [خطة الاختبار](docs/qa-plan.md)
- [خطة النشر](docs/release-plan.md)
- [خطة العمل](docs/work-plan.md)

## المساهمة

1. Fork المشروع
2. إنشاء branch للميزة
3. Commit التغييرات
4. فتح Pull Request

## الترخيص

MIT License

---

تم التطوير بواسطة فريق إدارة مشاريع البناء
ديسمبر 2025
