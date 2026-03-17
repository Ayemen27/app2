import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable, PassThrough } from 'stream';
import type { Pool } from 'pg';
import { getFullTableDDL, getSequencesDDL } from './ddl-generator';

interface TableManifestEntry {
  rows: number;
  checksum: string;
  sizeBytes: number;
}

interface StreamingManifest {
  version: string;
  timestamp: string;
  tables: Record<string, TableManifestEntry>;
  totalRows: number;
  totalTables: number;
  durationMs: number;
  environment: string;
}

interface ExportOptions {
  batchSize?: number;
}

interface ExportReport {
  success: boolean;
  backupDir: string;
  manifest: StreamingManifest;
  durationMs: number;
  totalRows: number;
  totalSizeBytes: number;
}

export async function exportStreamingBackup(
  pool: Pool,
  backupDir: string,
  options?: ExportOptions
): Promise<ExportReport> {
  const startTime = Date.now();
  const batchSize = options?.batchSize || 500;

  const tablesDir = path.join(backupDir, 'tables');
  fs.mkdirSync(tablesDir, { recursive: true });

  const tablesResult = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  const tableNames: string[] = tablesResult.rows.map((r: any) => r.table_name);

  const tableManifest: Record<string, TableManifestEntry> = {};
  let totalRows = 0;
  let totalSizeBytes = 0;

  for (const tableName of tableNames) {
    const filePath = path.join(tablesDir, `${tableName}.ndjson.gz`);
    const hash = crypto.createHash('sha256');
    let rowCount = 0;

    const cursorClient = await pool.connect();
    try {
      await cursorClient.query('BEGIN');
      await cursorClient.query(`DECLARE table_cursor CURSOR FOR SELECT * FROM "${tableName}"`);

      const passThrough = new PassThrough();
      const gzip = createGzip({ level: 6 });
      const writeStream = fs.createWriteStream(filePath);

      const pipelinePromise = pipeline(passThrough, gzip, writeStream);

      while (true) {
        const batch = await cursorClient.query(`FETCH ${batchSize} FROM table_cursor`);
        if (batch.rows.length === 0) break;
        for (const row of batch.rows) {
          const line = JSON.stringify(row) + '\n';
          hash.update(line);
          const canContinue = passThrough.write(line);
          if (!canContinue) {
            await new Promise<void>(resolve => passThrough.once('drain', resolve));
          }
          rowCount++;
        }
      }

      passThrough.end();
      await pipelinePromise;

      await cursorClient.query('CLOSE table_cursor');
      await cursorClient.query('COMMIT');
    } catch (err) {
      try { await cursorClient.query('ROLLBACK'); } catch (_) {}
      throw err;
    } finally {
      cursorClient.release();
    }

    const fileStats = fs.statSync(filePath);
    const checksum = hash.digest('hex');

    tableManifest[tableName] = {
      rows: rowCount,
      checksum,
      sizeBytes: fileStats.size,
    };

    totalRows += rowCount;
    totalSizeBytes += fileStats.size;
  }

  const schemaParts: string[] = [];
  for (const tableName of tableNames) {
    try {
      const ddl = await getFullTableDDL(pool, tableName);
      if (ddl) {
        schemaParts.push(`-- Table: ${tableName}\n${ddl};\n`);
      }
    } catch (e: any) {
      console.warn(`[streaming-exporter] Failed DDL for ${tableName}: ${e.message}`);
    }
  }
  const schemaPath = path.join(backupDir, 'schema.sql');
  fs.writeFileSync(schemaPath, schemaParts.join('\n'), 'utf-8');
  totalSizeBytes += fs.statSync(schemaPath).size;

  let sequencesContent = '';
  try {
    const seqStatements = await getSequencesDDL(pool);
    sequencesContent = seqStatements.join('\n') + '\n';
  } catch (e: any) {
    console.warn(`[streaming-exporter] Failed sequences DDL: ${e.message}`);
  }
  const sequencesPath = path.join(backupDir, 'sequences.sql');
  fs.writeFileSync(sequencesPath, sequencesContent, 'utf-8');
  totalSizeBytes += fs.statSync(sequencesPath).size;

  const durationMs = Date.now() - startTime;

  const manifest: StreamingManifest = {
    version: '5.0',
    timestamp: new Date().toISOString(),
    tables: tableManifest,
    totalRows,
    totalTables: tableNames.length,
    durationMs,
    environment: process.env.NODE_ENV || 'development',
  };

  const manifestPath = path.join(backupDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  totalSizeBytes += fs.statSync(manifestPath).size;

  return {
    success: true,
    backupDir,
    manifest,
    durationMs,
    totalRows,
    totalSizeBytes,
  };
}
