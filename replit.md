# مشروع Axion Management System

## نظرة عامة
نظام إدارة متكامل يعتمد على تقنيات JavaScript الحديثة لتوفير واجهة مستخدم سلسة وإدارة بيانات فعالة.

## التقنيات المستخدمة
- **Frontend**: React, Vite, Tailwind CSS, Shadcn UI.
- **Backend**: Node.js, Express.
- **Database**: PostgreSQL with Drizzle ORM.
- **State Management**: TanStack Query (React Query).
- **Routing**: Wouter.

## هيكلية المشروع
- `client/`: كود الواجهة الأمامية.
- `server/`: كود الواجهة الخلفية والخدمات.
- `shared/`: النماذج (Schemas) المشتركة بين الأمام والخلف.
- `www/`: ملفات العرض الثابتة.

## التفضيلات البرمجية
- الالتزام بمعايير Shadcn UI في التصميم.
- استخدام `data-testid` لجميع العناصر التفاعلية.
- تفضيل الحلول الواقعية والقابلة للتنفيذ.
