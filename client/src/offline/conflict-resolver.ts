/**
 * أداة حل التضارعات عند المزامنة
 */

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
  
  const merged: any = { ...serverData };
  const newer = clientTimestamp > serverTimestamp ? 'client' : 'server';

  // حاول دمج الحقول المختلفة
  for (const key in clientData) {
    if (!(key in serverData)) {
      // حقل جديد في العميل، أضفه
      merged[key] = clientData[key];
    } else if (clientData[key] === serverData[key]) {
      // نفس القيمة، لا تضارع
      continue;
    } else {
      // تضارع في الحقل، اختر الأحدث
      if (newer === 'client') {
        merged[key] = clientData[key];
      } else {
        merged[key] = serverData[key];
      }
    }
  }

  return merged;
}

/**
 * اكتشف التضارع بين نسختين
 */
export function detectConflict(clientData: any, serverData: any): boolean {
  const clientKeys = Object.keys(clientData || {});
  const serverKeys = Object.keys(serverData || {});
  const allKeys = Array.from(new Set([...clientKeys, ...serverKeys]));
  
  for (const key of allKeys) {
    if (JSON.stringify(clientData?.[key]) !== JSON.stringify(serverData?.[key])) {
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
    if (JSON.stringify(clientData?.[key]) !== JSON.stringify(serverData?.[key])) {
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
}
