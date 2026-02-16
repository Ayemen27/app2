import { v4 as uuidv4 } from 'uuid';
import { smartPut, smartGet, smartGetAll, smartDelete } from './storage-factory';
import { queueForSync } from './offline';
import { runSilentSync } from './silent-sync';

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
  '/api/supplier-payments': 'supplierPayments',
};

function resolveStoreName(endpoint: string): string | null {
  const clean = endpoint.split('?')[0];
  
  for (const [pattern, store] of Object.entries(ENDPOINT_TO_STORE)) {
    if (clean === pattern || clean.startsWith(pattern + '/')) {
      return store;
    }
  }
  
  if (clean.startsWith('/api/projects/') && clean.includes('/fund-transfers')) {
    return 'fundTransfers';
  }
  if (clean.startsWith('/api/projects/') && clean.includes('/worker-attendance')) {
    return 'workerAttendance';
  }
  if (clean.startsWith('/api/projects/') && clean.includes('/material-purchases')) {
    return 'materialPurchases';
  }
  if (clean.startsWith('/api/projects/') && clean.includes('/transportation')) {
    return 'transportationExpenses';
  }
  if (clean.startsWith('/api/projects/') && clean.includes('/daily-expenses')) {
    return null;
  }
  
  return null;
}

function extractIdFromEndpoint(endpoint: string): string | null {
  const clean = endpoint.split('?')[0];
  const parts = clean.split('/');
  
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
    throw new Error(`[Offline] لا يمكن معالجة ${endpoint} بدون اتصال`);
  }

  if (method === 'POST') {
    return handleOfflineCreate(endpoint, storeName, data);
  } else if (method === 'PATCH' || method === 'PUT') {
    return handleOfflineUpdate(endpoint, storeName, data);
  } else if (method === 'DELETE') {
    return handleOfflineDelete(endpoint, storeName);
  } else if (method === 'GET') {
    return handleOfflineRead(endpoint, storeName);
  }
  
  throw new Error(`[Offline] العملية ${method} غير مدعومة بدون اتصال`);
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
    createdAt: data?.createdAt || new Date().toISOString(),
  };

  await smartPut(storeName, record);
  await queueForSync('create', endpoint, record);

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
    updatedAt: new Date().toISOString(),
  };

  await smartPut(storeName, updated);
  await queueForSync('update', endpoint, updated);

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
