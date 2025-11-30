# معرض المكونات الاحترافي
# Professional Component Gallery

## نظرة عامة | Overview

معرض مكونات احترافي ومُرقّم يعرض تصاميم متعددة لشريط البحث والفلترة والبطاقات المضغوطة.
متجاوب 100% (mobile-first) عبر كل المتصفحات والشاشات.

A professional, numbered component gallery showcasing multiple search/filter bar designs and compact cards.
100% responsive (mobile-first) across all browsers and screens.

---

## هيكل المجلدات | Folder Structure

```
component-gallery/
├── shared/                    # الملفات المشتركة
│   ├── design-tokens.ts       # توكنات التصميم (ألوان، مسافات، ظلال)
│   ├── types.ts               # أنواع TypeScript
│   ├── utils.ts               # دوال مساعدة
│   └── index.ts
│
├── hooks/                     # React Hooks مخصصة
│   ├── useGalleryCatalog.ts   # إدارة كتالوج المكونات
│   ├── useInspector.ts        # إدارة لوحة المفتش
│   ├── useGallerySettings.ts  # إعدادات المعرض
│   ├── useCopyCode.ts         # نسخ الكود
│   └── index.ts
│
├── layout/                    # مكونات التخطيط
│   ├── GalleryHeader.tsx      # رأس المعرض
│   ├── GalleryFooter.tsx      # تذييل المعرض
│   ├── InspectorPanel.tsx     # لوحة المفتش
│   ├── CategoryTabs.tsx       # تبويبات الفئات
│   ├── ComponentCard.tsx      # بطاقة المكون
│   ├── GalleryGrid.tsx        # شبكة العرض
│   └── index.ts
│
├── modules/
│   ├── search/                # تصاميم البحث والفلترة
│   │   ├── components/
│   │   │   ├── SearchDesign1.tsx  # Minimal Inline
│   │   │   ├── SearchDesign2.tsx  # Card Style
│   │   │   ├── SearchDesign3.tsx  # Sidebar Filters
│   │   │   ├── SearchDesign4.tsx  # Floating Bar
│   │   │   ├── SearchDesign5.tsx  # Multi-field
│   │   │   ├── SearchDesign6.tsx  # Advanced Modal
│   │   │   ├── SearchDesign7.tsx  # Tag-driven
│   │   │   ├── SearchDesign8.tsx  # Voice Search
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   └── cards/                 # تصاميم البطاقات
│       ├── components/
│       │   ├── CardDesign1.tsx    # Worker Card
│       │   ├── CardDesign2.tsx    # Expense Card
│       │   ├── CardDesign3.tsx    # Project Card
│       │   ├── CardDesign4.tsx    # Product Card
│       │   ├── CardDesign5.tsx    # Activity Card
│       │   ├── CardDesign6.tsx    # Info Card
│       │   └── index.ts
│       └── index.ts
│
├── data/
│   └── catalog.ts             # كتالوج المكونات
│
├── index.tsx                  # الصفحة الرئيسية
└── README.md                  # هذا الملف
```

---

## تصاميم البحث والفلترة | Search & Filter Designs

### Design #1 — Minimal Inline (بحث مضغوط مدمج)
شريط بحث بسيط مدمج مع زر فلترة، مثالي للمساحات الضيقة.

### Design #2 — Card Style (بحث بنمط البطاقة)
شريط بحث داخل بطاقة مع شرائح فلترة (chips) أسفله.

### Design #3 — Sidebar Filters (فلاتر جانبية)
شريط جانبي قابل للطي مع فلاتر متقدمة (تاريخ، مبلغ، حالة).

### Design #4 — Floating Filter Bar (شريط فلترة عائم)
شريط بحث ثابت يظهر عند التمرير مع عدد النتائج.

### Design #5 — Multi-field Search (بحث متعدد الحقول)
عدة حقول بحث (اسم، موقع، نطاق سعر) في صف واحد.

### Design #6 — Advanced Modal (بحث متقدم بنافذة)
بحث مع فلاتر متقدمة في نافذة منبثقة (تاريخ، تصنيفات، slider).

### Design #7 — Tag-driven (بحث بالتصنيفات)
واجهة تعتمد على اختيار tags سريعة مع إمكانية الإضافة.

### Design #8 — Voice Search (بحث صوتي)
بحث صوتي مع عمليات البحث الأخيرة والشائعة.

---

## تصاميم البطاقات | Card Designs

### Card #1 — Worker Card (بطاقة العامل)
بطاقة عامل مع الصورة والدور والأجر بالساعة وشريط التقدم.

### Card #2 — Expense Card (بطاقة المصروف)
بطاقة مصروف/دخل مع المبلغ والمورد والتاريخ والحالة.

### Card #3 — Project Card (بطاقة المشروع)
بطاقة مشروع مع التقدم وصور الفريق والموعد النهائي.

### Card #4 — Product Card (بطاقة المنتج)
بطاقة منتج مع الكود والمخزون والسعر وتنبيه المخزون المنخفض.

### Card #5 — Activity Card (بطاقة النشاط)
بطاقة مهمة مع تبديل الحالة والأولوية ومعلومات الوقت.

### Card #6 — Info Card (بطاقة معلومات)
بطاقة متعددة الاستخدام للنصائح والتحذيرات والنجاح والمعلومات.

---

## الميزات | Features

- ✅ Mobile-first responsive design
- ✅ RTL support (Arabic)
- ✅ Dark/Light theme toggle
- ✅ Grid/List view modes
- ✅ Code preview & copy functionality
- ✅ Inspector panel with props documentation
- ✅ State previews (hover, focus, selected, disabled, loading)
- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ ARIA accessibility attributes
- ✅ Search & filter components
- ✅ Export code (HTML, Tailwind, React)

---

## الاستخدام | Usage

### الوصول للمعرض
انتقل إلى `/component-gallery` في التطبيق.

### نسخ الكود
1. اضغط على أي مكون لفتح لوحة المفتش
2. اختر تبويب (HTML / Tailwind / React)
3. اضغط زر "نسخ"

### تغيير العرض
- استخدم أزرار الشبكة/القائمة لتغيير طريقة العرض
- استخدم زر السمة للتبديل بين الفاتح/المظلم
- استخدم زر اللغة للتبديل بين العربية/الإنجليزية

---

## الوصولية | Accessibility

- Color contrast >= 4.5:1 for body text
- All interactive elements keyboard-accessible
- ARIA roles for search, listbox, dialog
- aria-live for dynamic content
- prefers-reduced-motion support

---

## المتطلبات | Requirements

- React 18+
- Tailwind CSS 3+
- Lucide React icons
- shadcn/ui components

---

## الإصدار | Version

v1.0.0 - 2024

---

## الترخيص | License

MIT License
