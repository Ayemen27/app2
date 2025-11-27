# نظام إدارة الصلاحيات - Permissions Management System

## نظرة عامة
نظام متكامل لإدارة صلاحيات المستخدمين وربطهم بالمشاريع، مبني وفق أفضل المعايير العالمية.

## المعايير المتبعة
- **RBAC**: Role-Based Access Control
- **OWASP ASVS 4.0**: معايير أمان التطبيقات
- **ISO 27001 Annex A.9**: إدارة التحكم في الوصول
- **GDPR Art. 5(1)(f) & 32**: حماية البيانات الشخصية

## هيكل المجلد
```
permissions-system/
├── migrations/          # ملفات ترحيل قاعدة البيانات
├── services/           # خدمات النظام الأساسية
│   ├── access-control.service.ts    # خدمة التحكم في الوصول
│   └── audit-log.service.ts         # خدمة سجل التغييرات
├── routes/             # مسارات API
│   └── permissionsRoutes.ts         # مسارات إدارة الصلاحيات
├── ui/                 # مكونات الواجهة
│   └── admin-permissions.page.tsx   # صفحة إدارة الصلاحيات
├── docs/               # التوثيق
│   └── operational-runbook.md       # دليل التشغيل
├── tests/              # الاختبارات
│   └── access-control.spec.ts       # اختبارات التحكم في الوصول
└── README.md           # هذا الملف
```

## الميزات الرئيسية

### 1. ربط المستخدمين بالمشاريع
- إمكانية ربط أي مستخدم بأي مشروع
- تحديد صلاحيات دقيقة لكل ربط (CRUD)
- دعم عمليات الربط المجمعة

### 2. مستويات الصلاحيات
| الدور | الوصف |
|-------|-------|
| `super_admin` | صلاحيات كاملة على جميع البيانات |
| `admin` | إدارة المشاريع المرتبط بها |
| `user` | صلاحيات محدودة حسب التعيين |

### 3. صلاحيات المشروع (CRUD)
| الصلاحية | الوصف |
|----------|-------|
| `can_view` | عرض بيانات المشروع |
| `can_add` | إضافة بيانات جديدة |
| `can_edit` | تعديل البيانات الموجودة |
| `can_delete` | حذف البيانات |

### 4. سجل التغييرات (Audit Trail)
- تسجيل جميع عمليات الربط والفصل
- تتبع تغييرات الصلاحيات
- حفظ تاريخ كامل للعمليات

### 5. نظام الإشعارات
- إشعار المستخدم عند ربطه بمشروع
- إشعار عند فصله من مشروع
- إشعار عند تغيير صلاحياته

## جداول قاعدة البيانات

### user_project_permissions
```sql
CREATE TABLE user_project_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  project_id VARCHAR NOT NULL REFERENCES projects(id),
  can_view BOOLEAN DEFAULT true,
  can_add BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  assigned_by VARCHAR REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);
```

### permission_audit_logs
```sql
CREATE TABLE permission_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR NOT NULL,
  actor_id VARCHAR NOT NULL REFERENCES users(id),
  target_user_id VARCHAR REFERENCES users(id),
  project_id VARCHAR REFERENCES projects(id),
  old_permissions JSONB,
  new_permissions JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## واجهات API

### إدارة الصلاحيات (للمدير فقط)
| المسار | الطريقة | الوصف |
|--------|---------|-------|
| `/api/admin/users` | GET | قائمة المستخدمين |
| `/api/admin/user-permissions/:userId` | GET | صلاحيات مستخدم |
| `/api/admin/assign-project` | POST | ربط مستخدم بمشروع |
| `/api/admin/unassign-project` | DELETE | فصل مستخدم من مشروع |
| `/api/admin/update-permissions` | PUT | تحديث صلاحيات |
| `/api/admin/bulk-assign` | POST | ربط مجمع |
| `/api/admin/audit-logs` | GET | سجل التغييرات |

### للمستخدم العادي
| المسار | الطريقة | الوصف |
|--------|---------|-------|
| `/api/my-projects` | GET | مشاريعي المرتبط بها |
| `/api/my-permissions` | GET | صلاحياتي الحالية |

## معايير الأداء
- استعلام قاعدة البيانات: < 100ms
- تحميل صفحة الإدارة: < 2 ثانية
- عمليات مجمعة: 500 عملية/ثانية

## معايير الأمان
- Least Privilege: أقل صلاحيات ممكنة
- Audit Trail: تسجيل كل تغيير
- Secure Defaults: صلاحيات افتراضية محدودة
- Input Validation: التحقق من جميع المدخلات

## التوافق
- Mobile-first: دعم شاشات من 360px
- RTL: دعم كامل للعربية
- Cross-browser: Chrome, Firefox, Safari, Edge
- Dark Mode: دعم الوضع الليلي

## الإصدار
- الإصدار: 1.0.0
- تاريخ الإنشاء: 2025-11-27
- المطور: فريق التطوير
