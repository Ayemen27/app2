import { deflate, inflate } from 'pako';
import { smartGetAll, smartGet, smartPut, smartDelete } from './storage-factory';
import { EntityName } from './offline-queries';

export interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  ratio: number;
  savedBytes: number;
}

const COMPRESS_THRESHOLD_BYTES = 1024;
const COMPRESSED_MARKER = '__pako_z1__:';

export function calculateObjectSize(obj: any): number {
  return new Blob([JSON.stringify(obj)]).size;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize))
    );
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function compressString(text: string): string {
  if (!text) return text;
  if (text.length < COMPRESS_THRESHOLD_BYTES) return text;
  try {
    const bytes = deflate(text, { level: 6 });
    return COMPRESSED_MARKER + toBase64(bytes);
  } catch (e) {
    console.warn('[compression] deflate فشل، إرجاع النص كما هو:', e);
    return text;
  }
}

export function decompressString(value: string): string {
  if (!value || typeof value !== 'string') return value;
  if (!value.startsWith(COMPRESSED_MARKER)) return value;
  try {
    const b64 = value.slice(COMPRESSED_MARKER.length);
    const bytes = fromBase64(b64);
    return inflate(bytes, { to: 'string' });
  } catch (e) {
    console.error('[compression] inflate فشل:', e);
    return value;
  }
}

const HEAVY_FIELDS = new Set([
  'invoice_photo', 'invoicePhoto',
  'image_data', 'imageData',
  'attachment_base64', 'attachmentBase64',
  'photo_base64', 'photoBase64',
]);

export function compressRecord(record: any): any {
  if (!record || typeof record !== 'object') return record;
  const out: any = Array.isArray(record) ? [...record] : { ...record };
  for (const key of Object.keys(out)) {
    const v = out[key];
    if (typeof v === 'string' && HEAVY_FIELDS.has(key) && v.length >= COMPRESS_THRESHOLD_BYTES) {
      out[key] = compressString(v);
    }
  }
  return out;
}

export function decompressRecord(record: any): any {
  if (!record || typeof record !== 'object') return record;
  const out: any = Array.isArray(record) ? [...record] : { ...record };
  for (const key of Object.keys(out)) {
    const v = out[key];
    if (typeof v === 'string' && v.startsWith(COMPRESSED_MARKER)) {
      out[key] = decompressString(v);
    }
  }
  return out;
}

export async function getCompressionStats(entityName: EntityName): Promise<CompressionStats> {
  try {
    const records = await smartGetAll(entityName);
    let originalSize = 0;
    let compressedSize = 0;
    for (const r of records) {
      const orig = calculateObjectSize(r);
      const comp = calculateObjectSize(compressRecord(r));
      originalSize += orig;
      compressedSize += comp;
    }
    return {
      originalSize,
      compressedSize,
      ratio: originalSize > 0 ? (compressedSize / originalSize) * 100 : 0,
      savedBytes: originalSize - compressedSize,
    };
  } catch {
    return { originalSize: 0, compressedSize: 0, ratio: 0, savedBytes: 0 };
  }
}

export async function getTotalStorageSize(): Promise<{ used: number; percentage: number }> {
  try {
    const entities: EntityName[] = [
      'projects', 'workers', 'materials', 'suppliers',
      'workerAttendance', 'materialPurchases', 'transportationExpenses',
      'fundTransfers', 'workerTransfers', 'workerMiscExpenses', 'wells', 'projectTypes',
    ];
    let totalSize = 0;
    for (const entity of entities) {
      const stats = await getCompressionStats(entity);
      totalSize += stats.originalSize;
    }
    const dbQuota = 50 * 1024 * 1024;
    const percentage = (totalSize / dbQuota) * 100;
    return { used: totalSize, percentage: Math.round(percentage) };
  } catch {
    return { used: 0, percentage: 0 };
  }
}

export async function deduplicateData(entityName: EntityName): Promise<number> {
  try {
    const allRecords = await smartGetAll(entityName);
    const seen = new Set<string>();
    let duplicates = 0;
    for (const record of allRecords) {
      const key = JSON.stringify(record);
      if (seen.has(key)) {
        await smartDelete(entityName, record.id);
        duplicates++;
      } else {
        seen.add(key);
      }
    }
    return duplicates;
  } catch {
    return 0;
  }
}

export async function optimizeRecord(entityName: EntityName, id: string): Promise<boolean> {
  try {
    const record = await smartGet(entityName, id);
    if (!record) return false;
    const optimized = compressRecord(record);
    await smartPut(entityName, optimized);
    return true;
  } catch {
    return false;
  }
}
