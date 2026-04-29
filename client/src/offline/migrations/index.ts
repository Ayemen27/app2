import type { Migration } from './types';
import { v001_initial } from './v001_initial';
import { v002_relational_indices } from './v002_relational_indices';

/**
 * 📋 سجل migrations - مرتّب حسب الإصدار.
 *
 * أضِف migration جديدة في النهاية فقط، لا تُعدّل أو تحذف القديمة.
 * استخدم رقم إصدار متزايد (v002, v003 …).
 */
export const ALL_MIGRATIONS: readonly Migration[] = [
  v001_initial,
  v002_relational_indices,
] as const;

export const LATEST_VERSION: number =
  ALL_MIGRATIONS.length > 0
    ? Math.max(...ALL_MIGRATIONS.map((m) => m.version))
    : 0;

export type { Migration } from './types';
