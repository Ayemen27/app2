import crypto from 'crypto';
import fs from 'fs';
import { createGunzip } from 'zlib';

export function computeChecksum(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf-8').digest('hex');
}

export function verifyChecksum(data: string, expected: string): boolean {
  const actual = computeChecksum(data);
  return actual === expected;
}

export function validateBackupStructure(parsed: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!parsed || typeof parsed !== 'object') {
    errors.push('Parsed backup is not an object');
    return { valid: false, errors };
  }

  if (!('meta' in parsed)) {
    errors.push('Missing "meta" key');
  }

  if (!('schemas' in parsed)) {
    errors.push('Missing "schemas" key');
  }

  if (!('data' in parsed)) {
    errors.push('Missing "data" key');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  if (!parsed.meta.version) {
    errors.push('meta.version is missing');
  }

  const dataKeys = Object.keys(parsed.data);
  if (parsed.meta.tablesCount !== undefined && parsed.meta.tablesCount !== dataKeys.length) {
    errors.push(
      `meta.tablesCount (${parsed.meta.tablesCount}) does not match actual table count (${dataKeys.length})`
    );
  }

  for (const tableName of dataKeys) {
    if (!Array.isArray(parsed.data[tableName])) {
      errors.push(`data["${tableName}"] is not an array`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export async function validateDecompressedSize(
  compressedPath: string,
  maxSizeMB: number = 500
): Promise<boolean> {
  const maxBytes = maxSizeMB * 1024 * 1024;

  return new Promise<boolean>((resolve) => {
    let totalBytes = 0;
    const readStream = fs.createReadStream(compressedPath);
    const gunzip = createGunzip();

    gunzip.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        readStream.destroy();
        gunzip.destroy();
        resolve(false);
      }
    });

    gunzip.on('end', () => {
      resolve(totalBytes <= maxBytes);
    });

    gunzip.on('error', () => {
      resolve(false);
    });

    readStream.on('error', () => {
      resolve(false);
    });

    readStream.pipe(gunzip);
  });
}

export const SENSITIVE_COLUMNS: Record<string, string[]> = {
  users: ['password', 'totp_secret'],
  refresh_tokens: ['token_hash', 'parent_id'],
  sessions: ['token'],
};

export function redactSensitiveData(
  data: Record<string, any[]>,
  mode: 'full' | 'external'
): Record<string, any[]> {
  if (mode === 'full') {
    return data;
  }

  const redacted: Record<string, any[]> = {};

  for (const [tableName, rows] of Object.entries(data)) {
    const sensitiveColumns = SENSITIVE_COLUMNS[tableName];
    if (!sensitiveColumns || sensitiveColumns.length === 0) {
      redacted[tableName] = rows;
      continue;
    }

    redacted[tableName] = rows.map((row) => {
      const newRow = { ...row };
      for (const col of sensitiveColumns) {
        if (col in newRow) {
          newRow[col] = '[REDACTED]';
        }
      }
      return newRow;
    });
  }

  return redacted;
}
