import { v4 as uuidv4 } from 'uuid';
import { smartAdd, smartGetAll, smartCount } from './storage-factory';

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  payload: Record<string, any>;
  timestamp: number;
  sequence: number;
  hash: string;
  previousHash: string;
}

let _sequence = 0;
let _lastHash = '0';

async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function initAuditLog(): Promise<void> {
  const entries = await smartGetAll('localAuditLog');
  if (entries.length > 0) {
    const sorted = entries.sort((a: AuditEntry, b: AuditEntry) => b.sequence - a.sequence);
    _sequence = sorted[0].sequence;
    _lastHash = sorted[0].hash;
  }
}

export async function recordAuditEntry(
  action: string,
  entityType: string,
  entityId: string,
  payload: Record<string, any>
): Promise<void> {
  _sequence++;
  const previousHash = _lastHash;
  const now = Date.now();
  const dataToHash = `${_sequence}:${action}:${entityType}:${entityId}:${previousHash}:${now}`;
  const hash = await computeHash(dataToHash);

  const entry: AuditEntry = {
    id: uuidv4(),
    action,
    entityType,
    entityId,
    payload: { ...payload },
    timestamp: now,
    sequence: _sequence,
    hash,
    previousHash,
  };

  await smartAdd('localAuditLog', entry);
  _lastHash = hash;
}

export async function getAuditLog(limit = 100): Promise<AuditEntry[]> {
  const entries = await smartGetAll('localAuditLog');
  return entries
    .sort((a: AuditEntry, b: AuditEntry) => b.sequence - a.sequence)
    .slice(0, limit);
}

export async function verifyAuditChain(): Promise<{ valid: boolean; brokenAt?: number; reason?: string }> {
  const entries = await smartGetAll('localAuditLog');
  if (entries.length === 0) return { valid: true };

  const sorted = entries.sort((a: AuditEntry, b: AuditEntry) => a.sequence - b.sequence);

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];

    const expectedPrevHash = i === 0 ? '0' : sorted[i - 1].hash;
    if (entry.previousHash !== expectedPrevHash) {
      return { valid: false, brokenAt: entry.sequence, reason: 'previousHash mismatch' };
    }

    const dataToHash = `${entry.sequence}:${entry.action}:${entry.entityType}:${entry.entityId}:${entry.previousHash}:${entry.timestamp}`;
    const recomputedHash = await computeHash(dataToHash);
    if (recomputedHash !== entry.hash) {
      return { valid: false, brokenAt: entry.sequence, reason: 'hash tampered' };
    }
  }
  return { valid: true };
}

export async function getAuditCount(): Promise<number> {
  return await smartCount('localAuditLog');
}
