# 📖 دليل تشغيل نظام الصلاحيات
## Operational Runbook

---

## 🚀 البدء السريع

### 1. تشغيل Migration
```bash
cd app2 && npx drizzle-kit push
```

### 2. ربط المسارات بالخادم
أضف في `app2/server/index.ts`:
```typescript
import { permissionsRouter } from '../../permissions-system/routes/permissionsRoutes';
app.use('/api/permissions', permissionsRouter);
```

### 3. إعادة تشغيل الخادم
```bash
npm run dev
```

---

## 🔧 إصلاح أخطاء LSP

### المشكلة: مسارات الاستيراد
الملفات تستورد من مسارات نسبية قد تكون غير صحيحة.

### الحل:
تحديث مسارات الاستيراد في:
1. `permissions-system/services/access-control.service.ts`
2. `permissions-system/services/audit-log.service.ts`
3. `permissions-system/routes/permissionsRoutes.ts`

مثال التصحيح:
```typescript
// بدلاً من:
import { db } from '../../app2/server/db';

// استخدم (حسب الموقع الفعلي):
import { db } from '../../../app2/server/db';
```

---

## 📋 إنشاء مدير أول (Super Admin)

### الخيار 1: عبر قاعدة البيانات
```sql
UPDATE users SET role = 'super_admin' WHERE email = 'admin@example.com';
```

### الخيار 2: عبر API (يتطلب مدير أول موجود)
```bash
curl -X POST /api/permissions/make-super-admin \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"userId": "<user-id>"}'
```

---

## 🧪 اختبار APIs

### اختبار جلب المستخدمين
```bash
curl -X GET /api/permissions/users \
  -H "Authorization: Bearer <token>"
```

### اختبار ربط مستخدم بمشروع
```bash
curl -X POST /api/permissions/assign \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<user-id>",
    "projectId": "<project-id>",
    "canView": true,
    "canAdd": true,
    "canEdit": false,
    "canDelete": false
  }'
```

### اختبار فصل مستخدم
```bash
curl -X DELETE /api/permissions/unassign \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<user-id>",
    "projectId": "<project-id>"
  }'
```

---

## 🛠️ استكشاف الأخطاء

### الخطأ: "المستخدم غير مرتبط بهذا المشروع"
**السبب:** لا يوجد سجل في جدول `user_project_permissions`
**الحل:** استخدم API الربط أولاً

### الخطأ: "ليس لديك صلاحية"
**السبب:** المستخدم ليس `super_admin`
**الحل:** ترقية المستخدم أو تسجيل الدخول كمدير أول

### الخطأ: "الجدول غير موجود"
**السبب:** لم يتم تشغيل Migration
**الحل:** `npx drizzle-kit push`

---

## 📊 مراقبة السجلات

### عرض سجل التغييرات
```bash
curl -X GET "/api/permissions/audit-logs?limit=50" \
  -H "Authorization: Bearer <token>"
```

### تصفية حسب المستخدم
```bash
curl -X GET "/api/permissions/audit-logs?userId=<user-id>" \
  -H "Authorization: Bearer <token>"
```

### تصفية حسب المشروع
```bash
curl -X GET "/api/permissions/audit-logs?projectId=<project-id>" \
  -H "Authorization: Bearer <token>"
```
