// ⚠️ [Absolute-Offline] تعطيل الاعتماد على PostgreSQL تماماً
// سيتم استخدام محاكاة بسيطة للسيرفر لخدمة الملفات والمزامنة في الخلفية
import * as schema from "@shared/schema";

export const pool = { 
  connect: async () => ({
    query: async () => ({ rows: [{ version: 'Offline Mode' }] }),
    release: () => {}
  }),
  on: () => {}
} as any;

// توفير نسخة محاكاة من db تدعم execute لتجنب أخطاء التشغيل
export const db = {
  execute: async () => ({ rows: [] }),
  select: () => ({ 
    from: () => ({ 
      where: () => ({ 
        orderBy: () => ({ 
          limit: () => [] 
        }),
        limit: () => [] // إضافة limit مباشرة بعد where
      }),
      limit: () => [] // إضافة limit مباشرة بعد from
    }) 
  }),
  insert: () => ({ values: () => ({ returning: () => [] }) }),
  update: () => ({ set: () => ({ where: () => [] }) }),
  delete: () => ({ where: () => [] }),
} as any;

export function getSmartDB() { return db; }
export function getSmartPool() { return pool; }
