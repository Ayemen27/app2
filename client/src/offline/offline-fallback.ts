import { endpointToStore } from './store-registry';
import { smartGetAll, smartSave } from './storage-factory';

const LOG_TAG = '[OfflineFallback]';

export function pathFromUrl(url: string): string {
  try {
    if (url.startsWith('http')) {
      const u = new URL(url);
      return u.pathname;
    }
    return url.split('?')[0];
  } catch {
    return url.split('?')[0];
  }
}

export function isGetMethod(method?: string): boolean {
  return (method || 'GET').toUpperCase() === 'GET';
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  const msg = String((err as any)?.message ?? err ?? '');
  return /Failed to fetch|NetworkError|Network request failed|net::ERR|Failed to connect/i.test(msg);
}

export interface OfflineEnvelope {
  success: true;
  data: any[];
  isOffline: true;
  source: 'local-cache';
  count: number;
}

export async function getLocalFallbackPayload(url: string): Promise<OfflineEnvelope | null> {
  const path = pathFromUrl(url);
  const storeName = endpointToStore(path);
  if (!storeName) return null;

  try {
    const localData = await smartGetAll(storeName);
    if (!Array.isArray(localData) || localData.length === 0) return null;

    return {
      success: true,
      data: localData,
      isOffline: true,
      source: 'local-cache',
      count: localData.length,
    };
  } catch (err: any) {
    console.warn(`${LOG_TAG} read from local store failed for ${path}:`, err?.message ?? err);
    return null;
  }
}

export async function buildOfflineResponse(url: string): Promise<Response | null> {
  const payload = await getLocalFallbackPayload(url);
  if (!payload) return null;

  return new Response(JSON.stringify(payload), {
    status: 200,
    statusText: 'OK (local-cache)',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Source': 'local-cache',
    },
  });
}

function extractRecords(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.notifications)) return data.notifications;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function normalizeRecord(r: any): any | null {
  if (!r || typeof r !== 'object') return null;
  if (r.id != null) return r;
  if (r.key != null) return { ...r, id: String(r.key) };
  if (r.value !== undefined) return { ...r, id: String(r.value) };
  return null;
}

export async function cacheGetResponseFromJson(url: string, data: any): Promise<void> {
  try {
    const path = pathFromUrl(url);
    const storeName = endpointToStore(path);
    if (!storeName) return;

    const records = extractRecords(data).map(normalizeRecord).filter(Boolean) as any[];
    if (records.length === 0) return;

    smartSave(storeName, records).catch((err) => {
      console.warn(`${LOG_TAG} silent save failed for ${storeName}:`, err?.message ?? err);
    });
  } catch (err: any) {
    console.warn(`${LOG_TAG} cache helper crashed:`, err?.message ?? err);
  }
}

export async function cacheGetResponse(url: string, response: Response): Promise<void> {
  try {
    const cloned = response.clone();
    const data = await cloned.json().catch(() => null);
    if (!data) return;
    await cacheGetResponseFromJson(url, data);
  } catch {
    // never throw from cache layer
  }
}
