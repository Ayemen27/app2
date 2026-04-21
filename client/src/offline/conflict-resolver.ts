/**
 * أداة حل التضارعات عند المزامنة
 */

import { canonicalStringify } from './canonical-json';
import * as performanceMonitor from './performance-monitor';

export interface ConflictResolutionStrategy {
  strategy: 'last-write-wins' | 'server-wins' | 'client-wins' | 'merge';
  metadata?: Record<string, any>;
}

export interface ConflictData {
  clientVersion: any;
  serverVersion: any;
  clientTimestamp: number;
  serverTimestamp: number;
  field?: string;
}

/**
 * حل تضارع باستخدام Last-Write-Wins
 */
export function resolveConflictLWW(conflict: ConflictData): any {
  
  // النسخة الأحدث تفوز
  if (conflict.clientTimestamp > conflict.serverTimestamp) {
    return conflict.clientVersion;
  } else {
    return conflict.serverVersion;
  }
}

/**
 * حل تضارع بتفضيل الخادم
 */
export function resolveConflictServerWins(conflict: ConflictData): any {
  return conflict.serverVersion;
}

/**
 * حل تضارع بتفضيل العميل
 */
export function resolveConflictClientWins(conflict: ConflictData): any {
  return conflict.clientVersion;
}

/**
 * محاولة دمج التغييرات (للحقول المختلفة)
 */
export function resolveConflictMerge(
  clientData: any,
  serverData: any,
  clientTimestamp: number,
  serverTimestamp: number
): any {
  
  const newer = clientTimestamp > serverTimestamp ? 'client' : 'server';
  // الكائن "الأحدث" يفوز بالحقول المتعارضة، لكن نحافظ على البنية المتداخلة
  // (deep merge بدل shallow) — هذا يحلّ مشكلة استبدال كائنات متداخلة كاملة.
  if (newer === 'client') {
    return deepMergeConflict(serverData, clientData);
  }
  return deepMergeConflict(clientData, serverData);
}

function deepMergeConflict(base: any, winner: any): any {
  if (base === null || base === undefined) return winner;
  if (winner === null || winner === undefined) return base;
  if (typeof base !== 'object' || typeof winner !== 'object') return winner;
  if (Array.isArray(base) || Array.isArray(winner)) return winner;
  const out: any = { ...base };
  for (const key of Object.keys(winner)) {
    const wv = winner[key];
    if (wv === undefined) continue;
    const bv = base[key];
    if (bv && wv && typeof bv === 'object' && typeof wv === 'object'
        && !Array.isArray(bv) && !Array.isArray(wv)) {
      out[key] = deepMergeConflict(bv, wv);
    } else {
      out[key] = wv;
    }
  }
  return out;
}

/**
 * اكتشف التضارع بين نسختين
 */
export function detectConflict(clientData: any, serverData: any): boolean {
  const clientKeys = Object.keys(clientData || {});
  const serverKeys = Object.keys(serverData || {});
  const allKeys = Array.from(new Set([...clientKeys, ...serverKeys]));

  for (const key of allKeys) {
    if (canonicalStringify(clientData?.[key]) !== canonicalStringify(serverData?.[key])) {
      return true;
    }
  }

  return false;
}

/**
 * احصل على قائمة الحقول المتضاربة
 */
export function getConflictingFields(clientData: any, serverData: any): string[] {
  const conflicts: string[] = [];
  const clientKeys = Object.keys(clientData || {});
  const serverKeys = Object.keys(serverData || {});
  const allKeys = Array.from(new Set([...clientKeys, ...serverKeys]));

  for (const key of allKeys) {
    if (canonicalStringify(clientData?.[key]) !== canonicalStringify(serverData?.[key])) {
      conflicts.push(key);
    }
  }

  return conflicts;
}

/**
 * استراتيجية حل التضارع المدمجة مع معالجة السيناريوهات المعقدة
 */
export function resolveConflict(
  conflict: ConflictData,
  strategy: ConflictResolutionStrategy = { strategy: 'merge' } // التغيير الافتراضي إلى دمج لتقليل فقدان البيانات
): any {
  try {
    // سيناريو: بيانات تالفة أو مفقودة
    if (!conflict.clientVersion && !conflict.serverVersion) {
      return null;
    }
    
    if (!conflict.clientVersion) return conflict.serverVersion;
    if (!conflict.serverVersion) return conflict.clientVersion;

    switch (strategy.strategy) {
      case 'last-write-wins':
        return resolveConflictLWW(conflict);
      case 'server-wins':
        return resolveConflictServerWins(conflict);
      case 'client-wins':
        return resolveConflictClientWins(conflict);
      case 'merge':
        return resolveConflictMerge(
          conflict.clientVersion,
          conflict.serverVersion,
          conflict.clientTimestamp || Date.now(),
          conflict.serverTimestamp || 0
        );
      default:
        return resolveConflictMerge(
          conflict.clientVersion,
          conflict.serverVersion,
          conflict.clientTimestamp || Date.now(),
          0
        );
    }
  } catch (error) {
    return conflict.serverVersion; // الأمان: العودة لنسخة الخادم في حال الفشل الذريع
  }
}

/**
 * معالج الخطأ عند التضارع
 */
export class ConflictError extends Error {
  constructor(
    public field: string,
    public clientValue: any,
    public serverValue: any,
    public resolution: any
  ) {
    super(`تضارع في: ${field}`);
    this.name = 'ConflictError';
  }
}

/**
 * تسجيل التضارع للمراقبة
 */
export async function logConflict(
  operation: string,
  entityId: string,
  conflictData: ConflictData,
  resolution: any
): Promise<void> {
  const log = {
    timestamp: Date.now(),
    operation,
    entityId,
    conflictFields: getConflictingFields(conflictData.clientVersion, conflictData.serverVersion),
    resolution,
    clientTimestamp: conflictData.clientTimestamp,
    serverTimestamp: conflictData.serverTimestamp
  };

  
  // يمكن إرسال البيانات إلى خادم logging
  // await fetch('/api/logs/conflicts', { method: 'POST', body: JSON.stringify(log) });

  performanceMonitor.recordConflict(resolution);
}
