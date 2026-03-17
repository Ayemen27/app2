import fs, { createReadStream } from 'fs';
import path from 'path';
import { createGunzip } from 'zlib';
import * as readline from 'readline';
import crypto from 'crypto';
import type { Pool, PoolClient } from 'pg';

interface StreamingRestoreOptions {
  target?: string;
  tables?: string[];
  failFast?: boolean;
  batchSize?: number;
}

interface StreamingTableReport {
  table: string;
  rows: number;
  status: 'success' | 'empty' | 'failed' | 'skipped';
  error?: string;
  checksumVerified?: boolean;
}

interface StreamingRestoreReport {
  success: boolean;
  tablesRestored: number;
  totalRowsInserted: number;
  tableReports: StreamingTableReport[];
  durationMs: number;
  partialRestore: boolean;
}

interface StreamingManifest {
  version: string;
  timestamp: string;
  tables: Record<string, { rows: number; checksum: string; sizeBytes: number }>;
  totalRows: number;
  totalTables: number;
  durationMs: number;
  environment: string;
}

function computeRawNdjsonChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(filePath).pipe(createGunzip());
    stream.on('data', (chunk: Buffer) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function insertBatch(client: PoolClient, tableName: string, batch: any[]): Promise<number> {
  if (batch.length === 0) return 0;

  const columns = Object.keys(batch[0]);
  const colList = columns.map(c => `"${c}"`).join(', ');
  const valueParts: string[] = [];
  const allValues: any[] = [];
  let paramIdx = 1;

  for (const row of batch) {
    const placeholders = columns.map(() => `$${paramIdx++}`).join(', ');
    valueParts.push(`(${placeholders})`);
    for (const col of columns) {
      let val = row[col];
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        val = JSON.stringify(val);
      }
      allValues.push(val);
    }
  }

  const result = await client.query(
    `INSERT INTO "${tableName}" (${colList}) VALUES ${valueParts.join(', ')} ON CONFLICT DO NOTHING`,
    allValues
  );
  return result.rowCount ?? 0;
}

export async function restoreStreamingBackup(
  pool: Pool,
  backupDir: string,
  options: StreamingRestoreOptions = {}
): Promise<StreamingRestoreReport> {
  const startTime = Date.now();
  const batchSize = options.batchSize ?? 100;
  const failFast = options.failFast ?? true;
  const tableReports: StreamingTableReport[] = [];
  let totalRowsInserted = 0;
  const partialRestore = !!(options.tables && options.tables.length > 0);

  const manifestPath = path.join(backupDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('manifest.json not found in backup directory');
  }

  const manifest: StreamingManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  if (manifest.version !== '5.0') {
    throw new Error(`Unsupported streaming backup version: ${manifest.version}, expected 5.0`);
  }

  const tablesDir = path.join(backupDir, 'tables');
  if (!fs.existsSync(tablesDir)) {
    throw new Error('tables/ directory not found in backup directory');
  }

  const tableNames = Object.keys(manifest.tables);
  const tablesToRestore = partialRestore
    ? tableNames.filter(t => options.tables!.includes(t))
    : tableNames;

  for (const tableName of tablesToRestore) {
    const tableFile = path.join(tablesDir, `${tableName}.ndjson.gz`);
    if (!fs.existsSync(tableFile)) {
      tableReports.push({ table: tableName, rows: 0, status: 'skipped', error: 'File not found' });
      continue;
    }

    const expectedChecksum = manifest.tables[tableName]?.checksum;
    if (expectedChecksum) {
      const actualChecksum = await computeRawNdjsonChecksum(tableFile);
      if (actualChecksum !== expectedChecksum) {
        const msg = `Checksum mismatch for ${tableName}: expected ${expectedChecksum}, got ${actualChecksum}`;
        if (failFast) {
          throw new Error(msg);
        }
        tableReports.push({ table: tableName, rows: 0, status: 'failed', error: msg, checksumVerified: false });
        continue;
      }
    }
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const schemaPath = path.join(backupDir, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      const statements = schemaSql.split(/;\s*\n/).filter(s => s.trim());
      for (const stmt of statements) {
        const trimmed = stmt.trim();
        if (!trimmed || trimmed.startsWith('--')) continue;
        try {
          await client.query(trimmed);
        } catch (e: any) {
          if (!e.message.includes('already exists')) {
            console.warn(`[StreamingRestore] Schema statement warning: ${e.message}`);
          }
        }
      }
    }

    await client.query(`SET session_replication_role = 'replica'`);

    for (const tableName of tablesToRestore) {
      const tableFile = path.join(tablesDir, `${tableName}.ndjson.gz`);
      if (!fs.existsSync(tableFile)) continue;

      const alreadyFailed = tableReports.find(r => r.table === tableName && r.status === 'failed');
      if (alreadyFailed) continue;

      try {
        await client.query(`TRUNCATE "${tableName}" CASCADE`);

        const rl = readline.createInterface({
          input: createReadStream(tableFile).pipe(createGunzip()),
          crlfDelay: Infinity,
        });

        let batch: any[] = [];
        let rowCount = 0;

        for await (const line of rl) {
          if (!line.trim()) continue;
          batch.push(JSON.parse(line));
          if (batch.length >= batchSize) {
            rowCount += await insertBatch(client, tableName, batch);
            batch = [];
          }
        }
        if (batch.length > 0) {
          rowCount += await insertBatch(client, tableName, batch);
        }

        totalRowsInserted += rowCount;
        tableReports.push({
          table: tableName,
          rows: rowCount,
          status: rowCount > 0 ? 'success' : 'empty',
          checksumVerified: !!manifest.tables[tableName]?.checksum,
        });
      } catch (e: any) {
        if (failFast) {
          throw e;
        }
        tableReports.push({ table: tableName, rows: 0, status: 'failed', error: e.message });
      }
    }

    const sequencesPath = path.join(backupDir, 'sequences.sql');
    if (fs.existsSync(sequencesPath)) {
      const seqSql = fs.readFileSync(sequencesPath, 'utf-8');
      const seqStatements = seqSql.split(/;\s*\n/).filter(s => s.trim());
      for (const stmt of seqStatements) {
        const trimmed = stmt.trim();
        if (!trimmed || trimmed.startsWith('--')) continue;
        try {
          await client.query(trimmed);
        } catch (_) {}
      }
    }

    await client.query(`SET session_replication_role = 'origin'`);
    await client.query('COMMIT');

    const tablesRestored = tableReports.filter(r => r.status === 'success' || r.status === 'empty').length;

    return {
      success: true,
      tablesRestored,
      totalRowsInserted,
      tableReports,
      durationMs: Date.now() - startTime,
      partialRestore,
    };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
