import type { PoolClient } from 'pg';

interface RestoreOptions {
  batchSize?: number;
  failFast?: boolean;
}

interface RestoreTableReport {
  table: string;
  rows: number;
  status: 'success' | 'empty' | 'failed' | 'skipped';
  error?: string;
}

interface RestoreReport {
  tablesProcessed: number;
  tablesCreated: number;
  totalRowsInserted: number;
  tableReports: RestoreTableReport[];
  durationMs: number;
}

export async function restoreData(
  client: PoolClient,
  data: Record<string, any[]>,
  schemas: Record<string, string>,
  options: RestoreOptions = {}
): Promise<RestoreReport> {
  const startTime = Date.now();
  const batchSize = options.batchSize ?? 100;
  const failFast = options.failFast ?? true;

  const backupTables = Object.keys(data);
  const tableReports: RestoreTableReport[] = [];
  let tablesCreated = 0;
  let totalRowsInserted = 0;

  for (const tableName of backupTables) {
    const tableNameLower = tableName.toLowerCase();
    const tableRes = await client.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)`,
      [tableNameLower]
    );

    if (!tableRes.rows[0].exists) {
      const ddl = schemas[tableName] || schemas[tableNameLower];
      if (ddl) {
        await client.query(ddl);
        tablesCreated++;
      } else {
        const rows = data[tableName];
        if (rows && rows.length > 0) {
          const sampleRow = rows[0];
          const colDefs = Object.keys(sampleRow).map(col => {
            const val = sampleRow[col];
            let pgType = 'TEXT';
            if (typeof val === 'number') pgType = Number.isInteger(val) ? 'INTEGER' : 'DOUBLE PRECISION';
            else if (typeof val === 'boolean') pgType = 'BOOLEAN';
            else if (val !== null && typeof val === 'object' && !Array.isArray(val)) pgType = 'JSONB';
            else if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) pgType = 'TIMESTAMPTZ';
            return `"${col}" ${pgType}`;
          }).join(', ');
          await client.query(`CREATE TABLE IF NOT EXISTS "${tableNameLower}" (${colDefs})`);
          tablesCreated++;
        } else {
          tableReports.push({ table: tableName, rows: 0, status: 'skipped', error: 'No DDL and no data to infer schema' });
          continue;
        }
      }
    }
  }

  await client.query(`SET session_replication_role = 'replica'`);

  for (const tableName of backupTables) {
    const tableNameLower = tableName.toLowerCase();
    const tableRes = await client.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)`,
      [tableNameLower]
    );
    if (tableRes.rows[0].exists) {
      await client.query(`TRUNCATE TABLE "${tableNameLower}" RESTART IDENTITY CASCADE`);
    }
  }

  try {
    for (const [tableName, rows] of Object.entries(data)) {
      const tableNameLower = tableName.toLowerCase();

      if (!rows || rows.length === 0) {
        tableReports.push({ table: tableName, rows: 0, status: 'empty' });
        continue;
      }

      const tableCheck = await client.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)`,
        [tableNameLower]
      );
      if (!tableCheck.rows[0].exists) {
        tableReports.push({ table: tableName, rows: 0, status: 'failed', error: 'Table does not exist' });
        if (failFast) {
          throw new Error(`Table "${tableName}" does not exist and could not be created`);
        }
        continue;
      }

      const columns = Object.keys(rows[0]);
      const colList = columns.map(c => `"${c}"`).join(', ');
      let insertedCount = 0;

      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
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
          `INSERT INTO "${tableNameLower}" (${colList}) VALUES ${valueParts.join(', ')} ON CONFLICT DO NOTHING`,
          allValues
        );
        insertedCount += result.rowCount ?? 0;
      }

      totalRowsInserted += insertedCount;
      const expectedRows = rows.length;
      if (insertedCount < expectedRows) {
        console.warn(`⚠️ [Restore] ${tableName}: تم إدراج ${insertedCount}/${expectedRows} صف (${expectedRows - insertedCount} مكرر أو مفقود)`);
      }
      tableReports.push({ table: tableName, rows: insertedCount, status: 'success', error: insertedCount < expectedRows ? `${expectedRows - insertedCount} صف لم يُدرج` : undefined });
    }
  } finally {
    await client.query(`SET session_replication_role = 'DEFAULT'`);
  }

  await fixAllSequences(client, backupTables);

  return {
    tablesProcessed: backupTables.length,
    tablesCreated,
    totalRowsInserted,
    tableReports,
    durationMs: Date.now() - startTime,
  };
}

export async function fixAllSequences(client: PoolClient, tables: string[]): Promise<void> {
  for (const tableName of tables) {
    const tableNameLower = tableName.toLowerCase();

    try {
      const tableCheck = await client.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)`,
        [tableNameLower]
      );
      if (!tableCheck.rows[0].exists) continue;

      const colsRes = await client.query(
        `SELECT column_name, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = $1
           AND column_default LIKE 'nextval(%'`,
        [tableNameLower]
      );

      for (const col of colsRes.rows) {
        const columnName = col.column_name;
        try {
          const seqRes = await client.query(
            `SELECT pg_get_serial_sequence($1, $2) as seq_name`,
            [tableNameLower, columnName]
          );

          const seqName = seqRes.rows[0]?.seq_name;
          if (!seqName) continue;

          const maxRes = await client.query(
            `SELECT COALESCE(MAX("${columnName}"), 0) as max_val FROM "${tableNameLower}"`
          );
          const maxVal = maxRes.rows[0]?.max_val || 0;

          if (maxVal > 0) {
            await client.query(`SELECT setval($1, $2, true)`, [seqName, maxVal]);
          }
        } catch (_) {
        }
      }
    } catch (_) {
    }
  }
}
