import { v4 as uuidv4 } from 'uuid';
import { smartPut, smartGet, smartGetAll, smartDelete } from './storage-factory';
import { queueForSync } from './offline';
import { runSilentSync } from './silent-sync';
import { recordAuditEntry } from './local-audit';

const ENDPOINT_TO_STORE: Record<string, string> = {
  '/api/fund-transfers': 'fundTransfers',
  '/api/worker-attendance': 'workerAttendance',
  '/api/transportation-expenses': 'transportationExpenses',
  '/api/material-purchases': 'materialPurchases',
  '/api/worker-transfers': 'workerTransfers',
  '/api/worker-misc-expenses': 'workerMiscExpenses',
  '/api/workers': 'workers',
  '/api/projects': 'projects',
  '/api/suppliers': 'suppliers',
  '/api/materials': 'materials',
  '/api/wells': 'wells',
  '/api/project-types': 'projectTypes',
  '/api/autocomplete': 'autocompleteData',
  '/api/autocomplete/worker-types': 'workerTypes',
  '/api/autocomplete/material-names': 'autocompleteData',
  '/api/autocomplete/supplier-names': 'autocompleteData',
  '/api/supplier-payments': 'supplierPayments',
  '/api/daily-expense-summaries': 'dailyExpenseSummaries',
  '/api/worker-balances': 'workerBalances',
  '/api/notifications': 'notifications',
};

function resolveStoreName(endpoint: string): string | null {
  const clean = endpoint.split('?')[0];
  
  if (clean === '/api/autocomplete/worker-types' || clean.startsWith('/api/autocomplete/worker-types/')) {
    return 'workerTypes';
  }
  
  if (clean.startsWith('/api/projects/') && clean.includes('/')) {
    const subResource = clean.replace(/^\/api\/projects\/\d+\//, '');
    if (subResource.startsWith('fund-transfers')) return 'fundTransfers';
    if (subResource.startsWith('worker-attendance')) return 'workerAttendance';
    if (subResource.startsWith('material-purchases')) return 'materialPurchases';
    if (subResource.startsWith('transportation')) return 'transportationExpenses';
    if (subResource.startsWith('worker-transfers')) return 'workerTransfers';
    if (subResource.startsWith('worker-misc')) return 'workerMiscExpenses';
    if (subResource.startsWith('supplier-payments')) return 'supplierPayments';
    if (subResource.startsWith('daily-expenses') || subResource.startsWith('daily-expense-summaries')) return 'dailyExpenseSummaries';
    if (subResource.startsWith('workers')) return 'workers';
  }
  
  for (const [pattern, store] of Object.entries(ENDPOINT_TO_STORE)) {
    if (clean === pattern || clean.startsWith(pattern + '/')) {
      return store;
    }
  }
  
  return null;
}

function extractIdFromEndpoint(endpoint: string): string | null {
  const clean = endpoint.split('?')[0];
  const parts = clean.split('/').filter(Boolean);
  
  if (parts.length >= 4 && parts[0] === 'api' && parts[1] === 'projects') {
    const lastPart = parts[parts.length - 1];
    if (lastPart && !isNaN(Number(lastPart)) || (lastPart && lastPart.length > 8 && !['fund-transfers', 'worker-attendance', 'material-purchases', 'transportation', 'worker-transfers', 'worker-misc', 'supplier-payments', 'daily-expenses', 'workers'].includes(lastPart))) {
      return lastPart;
    }
    return null;
  }
  
  for (const [pattern] of Object.entries(ENDPOINT_TO_STORE)) {
    if (clean.startsWith(pattern + '/')) {
      const remainder = clean.substring(pattern.length + 1);
      const id = remainder.split('/')[0];
      if (id && id.length > 0) {
        return id;
      }
    }
  }
  
  return null;
}

export interface OfflineResult {
  success: boolean;
  data: any;
  isOffline: boolean;
  pendingSync: boolean;
}

export async function offlineApiInterceptor(
  endpoint: string,
  method: string,
  data?: any
): Promise<OfflineResult> {
  const storeName = resolveStoreName(endpoint);
  
  if (!storeName) {
    console.warn(`[Offline] لا يمكن معالجة ${endpoint} بدون اتصال`);
    return {
      success: false,
      data: { success: false, data: null, message: 'هذه العملية غير متاحة بدون اتصال' },
      isOffline: true,
      pendingSync: false,
    };
  }

  try {
    if (method === 'POST') {
      return await handleOfflineCreate(endpoint, storeName, data);
    } else if (method === 'PATCH' || method === 'PUT') {
      return await handleOfflineUpdate(endpoint, storeName, data);
    } else if (method === 'DELETE') {
      return await handleOfflineDelete(endpoint, storeName);
    } else if (method === 'GET') {
      return await handleOfflineRead(endpoint, storeName);
    }
  } catch (err) {
    console.error(`[Offline] خطأ أثناء معالجة ${method} ${endpoint}:`, err);
    return {
      success: false,
      data: { success: false, data: null, message: 'حدث خطأ أثناء الحفظ المحلي' },
      isOffline: true,
      pendingSync: false,
    };
  }
  
  return {
    success: false,
    data: { success: false, data: null, message: `العملية ${method} غير مدعومة بدون اتصال` },
    isOffline: true,
    pendingSync: false,
  };
}

async function handleOfflineCreate(
  endpoint: string,
  storeName: string,
  data: any
): Promise<OfflineResult> {
  const id = data?.id || uuidv4();
  const record = {
    ...data,
    id,
    _isLocal: true,
    _pendingSync: true,
    _offlineCreatedAt: Date.now(),
    created_at: data?.created_at || new Date().toISOString(),
  };

  await smartPut(storeName, record);
  await queueForSync('create', endpoint, record);

  recordAuditEntry('create', storeName, id, record).catch(err =>
    console.warn('[Audit] فشل التسجيل:', err)
  );

  return {
    success: true,
    data: { success: true, data: record, message: 'تم الحفظ محلياً' },
    isOffline: true,
    pendingSync: true,
  };
}

async function handleOfflineUpdate(
  endpoint: string,
  storeName: string,
  data: any
): Promise<OfflineResult> {
  const id = extractIdFromEndpoint(endpoint) || data?.id;
  
  if (!id) {
    throw new Error('[Offline] لا يمكن تحديد السجل للتعديل');
  }

  const existing = await smartGet(storeName, id);
  const updated = {
    ...(existing || {}),
    ...data,
    id,
    _pendingSync: true,
    _offlineUpdatedAt: Date.now(),
    updated_at: new Date().toISOString(),
  };

  await smartPut(storeName, updated);
  await queueForSync('update', endpoint, updated);

  recordAuditEntry('update', storeName, id, updated).catch(err =>
    console.warn('[Audit] فشل التسجيل:', err)
  );

  return {
    success: true,
    data: { success: true, data: updated, message: 'تم التعديل محلياً' },
    isOffline: true,
    pendingSync: true,
  };
}

async function handleOfflineDelete(
  endpoint: string,
  storeName: string
): Promise<OfflineResult> {
  const id = extractIdFromEndpoint(endpoint);
  
  if (!id) {
    throw new Error('[Offline] لا يمكن تحديد السجل للحذف');
  }

  await smartDelete(storeName, id);
  await queueForSync('delete', endpoint, { id });

  recordAuditEntry('delete', storeName, id, { id }).catch(err =>
    console.warn('[Audit] فشل التسجيل:', err)
  );

  return {
    success: true,
    data: { success: true, message: 'تم الحذف محلياً' },
    isOffline: true,
    pendingSync: true,
  };
}

async function handleOfflineRead(
  endpoint: string,
  storeName: string
): Promise<OfflineResult> {
  const id = extractIdFromEndpoint(endpoint);
  
  if (id) {
    const record = await smartGet(storeName, id);
    return {
      success: !!record,
      data: record ? { success: true, data: record } : { success: false, data: null },
      isOffline: true,
      pendingSync: false,
    };
  }

  const allRecords = await smartGetAll(storeName);
  return {
    success: true,
    data: { success: true, data: allRecords, count: allRecords.length },
    isOffline: true,
    pendingSync: false,
  };
}

export function isOfflineSupportedEndpoint(endpoint: string): boolean {
  return resolveStoreName(endpoint) !== null;
}

export function triggerBackgroundSync(): void {
  if (navigator.onLine) {
    runSilentSync().catch(err => 
      console.warn('⚠️ [OfflineInterceptor] فشل تشغيل المزامنة في الخلفية:', err)
    );
  }
}

export { ENDPOINT_TO_STORE, resolveStoreName };
