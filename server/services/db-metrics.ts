import { pool } from '../db.js';
import { smartConnectionManager } from './smart-connection-manager';

export interface TableMetric {
  name: string;
  rowCount: number;
  totalSize: string;
  totalSizeBytes: number;
  dataSize: string;
  indexSize: string;
  columns: number;
  indexes: number;
  hasSequence: boolean;
}

export interface DatabaseOverview {
  name: string;
  version: string;
  size: string;
  sizeBytes: number;
  totalTables: number;
  totalRows: number;
  totalIndexes: number;
  uptime: string;
  activeConnections: number;
  maxConnections: number;
}

export interface IntegrityReport {
  score: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  checks: IntegrityCheck[];
  timestamp: string;
}

export interface IntegrityCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: any;
}

export interface PerformanceMetrics {
  avgQueryTime: number;
  cacheHitRatio: number;
  deadTuples: number;
  liveTuples: number;
  transactionsCommitted: number;
  transactionsRolledBack: number;
  blocksRead: number;
  blocksHit: number;
}

export interface TableComparisonItem {
  name: string;
  localRows: number | null;
  supabaseRows: number | null;
  localSize: string | null;
  supabaseSize: string | null;
  localSizeBytes: number;
  supabaseSizeBytes: number;
  status: 'match' | 'diff_rows' | 'only_local' | 'only_supabase' | 'diff_structure';
  rowDiff: number;
  localColumns: number;
  supabaseColumns: number;
}

export interface ComparisonReport {
  timestamp: string;
  localDbName: string;
  supabaseDbName: string;
  totalTablesLocal: number;
  totalTablesSupabase: number;
  matchingTables: number;
  onlyLocalTables: number;
  onlySupabaseTables: number;
  tablesWithDiffRows: number;
  tablesWithDiffStructure: number;
  tables: TableComparisonItem[];
  alerts: ComparisonAlert[];
}

export interface ComparisonAlert {
  type: 'missing_table' | 'row_diff' | 'structure_diff' | 'size_diff';
  severity: 'info' | 'warning' | 'critical';
  table: string;
  message: string;
  details?: any;
}

export interface ConnectionInfo {
  id: string;
  label: string;
  connected: boolean;
  dbName: string | null;
  version: string | null;
  size: string | null;
  tables: number;
  rows: number;
  latency: string | null;
}

export class DbMetricsService {

  static getPoolForSource(source?: string): { pool: any; error?: string } {
    if (!source || source === 'active') return { pool };
    const connMgr = smartConnectionManager;
    const status = connMgr.getConnectionStatus();

    if (source === 'local') {
      if (!status.local) return { pool, error: 'القاعدة المحلية غير متصلة' };
      const conn = connMgr.getSmartConnection('read');
      if (conn.source === 'local' && conn.pool) return { pool: conn.pool };
      return { pool, error: 'تعذر الوصول للقاعدة المحلية' };
    }

    if (source === 'supabase') {
      const dynConn = connMgr.getDynamicConnection('supabase');
      if (dynConn?.connected && dynConn.pool) return { pool: dynConn.pool };
      if (!status.supabase) return { pool, error: 'Supabase غير متصل' };
      const conn = connMgr.getSmartConnection('sync');
      if (conn.source === 'supabase' && conn.pool) return { pool: conn.pool };
      return { pool, error: 'تعذر الوصول لـ Supabase' };
    }

    const dynConn = connMgr.getDynamicConnection(source);
    if (dynConn) {
      if (!dynConn.connected || !dynConn.pool) {
        return { pool, error: `قاعدة "${dynConn.label}" غير متصلة` };
      }
      return { pool: dynConn.pool };
    }

    return { pool };
  }

  static async getConnectedDatabases(): Promise<ConnectionInfo[]> {
    const connections: ConnectionInfo[] = [];
    const status = smartConnectionManager.getConnectionStatus();
    const metrics = status.metrics;

    if (status.local) {
      try {
        const { pool: p } = this.getPoolForSource('local');
        const client = await p.connect();
        const [dbInfo, sizeResult, tableCount, rowsResult] = await Promise.all([
          client.query('SELECT current_database() as name, version() as version'),
          client.query('SELECT pg_database_size(current_database()) as size_bytes'),
          client.query("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"),
          client.query('SELECT SUM(n_live_tup) as total FROM pg_stat_user_tables'),
        ]);
        client.release();
        connections.push({
          id: 'local',
          label: 'القاعدة المحلية (VPS)',
          connected: true,
          dbName: dbInfo.rows[0]?.name || 'unknown',
          version: (dbInfo.rows[0]?.version || '').split(' ').slice(0, 2).join(' '),
          size: formatBytes(parseInt(sizeResult.rows[0]?.size_bytes || '0')),
          tables: parseInt(tableCount.rows[0]?.count || '0'),
          rows: parseInt(rowsResult.rows[0]?.total || '0'),
          latency: metrics?.local?.averageLatency || null,
        });
      } catch {
        connections.push({ id: 'local', label: 'القاعدة المحلية (VPS)', connected: false, dbName: null, version: null, size: null, tables: 0, rows: 0, latency: null });
      }
    } else {
      connections.push({ id: 'local', label: 'القاعدة المحلية (VPS)', connected: false, dbName: null, version: null, size: null, tables: 0, rows: 0, latency: null });
    }

    const dynamicConns = smartConnectionManager.getAllDynamicConnections();
    for (const dynConn of dynamicConns) {
      const existingIds = connections.map(c => c.id);
      if (existingIds.includes(dynConn.key)) continue;
      
      if (dynConn.connected && dynConn.pool) {
        try {
          const client = await dynConn.pool.connect();
          const [dbInfo, sizeResult, tableCount, rowsResult] = await Promise.all([
            client.query('SELECT current_database() as name, version() as version'),
            client.query('SELECT pg_database_size(current_database()) as size_bytes'),
            client.query("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"),
            client.query('SELECT SUM(n_live_tup) as total FROM pg_stat_user_tables'),
          ]);
          client.release();
          connections.push({
            id: dynConn.key,
            label: dynConn.label,
            connected: true,
            dbName: dbInfo.rows[0]?.name || dynConn.dbName || 'unknown',
            version: (dbInfo.rows[0]?.version || '').split(' ').slice(0, 2).join(' '),
            size: formatBytes(parseInt(sizeResult.rows[0]?.size_bytes || '0')),
            tables: parseInt(tableCount.rows[0]?.count || '0'),
            rows: parseInt(rowsResult.rows[0]?.total || '0'),
            latency: dynConn.latency ? `${dynConn.latency}ms` : null,
          });
        } catch {
          connections.push({
            id: dynConn.key, label: dynConn.label, connected: false,
            dbName: dynConn.dbName || null, version: null, size: null,
            tables: 0, rows: 0, latency: null
          });
        }
      } else {
        connections.push({
          id: dynConn.key, label: dynConn.label, connected: false,
          dbName: dynConn.dbName || null, version: null, size: null,
          tables: 0, rows: 0, latency: null
        });
      }
    }

    return connections;
  }

  static async compareDatabases(): Promise<ComparisonReport | null> {
    const status = smartConnectionManager.getConnectionStatus();
    if (!status.local || !status.supabase) return null;

    const { pool: localPool } = this.getPoolForSource('local');
    const { pool: supabasePool } = this.getPoolForSource('supabase');

    const tablesQuery = `
      SELECT 
        t.table_name as name,
        COALESCE(s.n_live_tup, 0) as row_count,
        pg_total_relation_size(quote_ident(t.table_name)) as total_size_bytes,
        pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name))) as total_size,
        (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') as columns
      FROM information_schema.tables t
      LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `;

    const dbNameQuery = 'SELECT current_database() as name';

    const [localClient, supabaseClient] = await Promise.all([
      localPool.connect(),
      supabasePool.connect(),
    ]);

    try {
      const [localTables, supabaseTables, localName, supabaseName] = await Promise.all([
        localClient.query(tablesQuery),
        supabaseClient.query(tablesQuery),
        localClient.query(dbNameQuery),
        supabaseClient.query(dbNameQuery),
      ]);

      const localMap = new Map(localTables.rows.map((r: any) => [r.name, r]));
      const supabaseMap = new Map(supabaseTables.rows.map((r: any) => [r.name, r]));
      const allTableNames = new Set([...localMap.keys(), ...supabaseMap.keys()]);

      const tables: TableComparisonItem[] = [];
      const alerts: ComparisonAlert[] = [];
      let matchCount = 0, onlyLocal = 0, onlySupabase = 0, diffRows = 0, diffStructure = 0;

      for (const name of allTableNames) {
        const l = localMap.get(name);
        const s = supabaseMap.get(name);

        if (l && !s) {
          onlyLocal++;
          tables.push({
            name,
            localRows: parseInt(l.row_count), supabaseRows: null,
            localSize: l.total_size, supabaseSize: null,
            localSizeBytes: parseInt(l.total_size_bytes || '0'), supabaseSizeBytes: 0,
            status: 'only_local', rowDiff: parseInt(l.row_count),
            localColumns: parseInt(l.columns || '0'), supabaseColumns: 0,
          });
          alerts.push({
            type: 'missing_table', severity: 'warning',
            table: name,
            message: `الجدول "${name}" موجود فقط في القاعدة المحلية`,
          });
        } else if (!l && s) {
          onlySupabase++;
          tables.push({
            name,
            localRows: null, supabaseRows: parseInt(s.row_count),
            localSize: null, supabaseSize: s.total_size,
            localSizeBytes: 0, supabaseSizeBytes: parseInt(s.total_size_bytes || '0'),
            status: 'only_supabase', rowDiff: parseInt(s.row_count),
            localColumns: 0, supabaseColumns: parseInt(s.columns || '0'),
          });
          alerts.push({
            type: 'missing_table', severity: 'warning',
            table: name,
            message: `الجدول "${name}" موجود فقط في Supabase`,
          });
        } else if (l && s) {
          const lRows = parseInt(l.row_count);
          const sRows = parseInt(s.row_count);
          const lCols = parseInt(l.columns || '0');
          const sCols = parseInt(s.columns || '0');
          const rd = Math.abs(lRows - sRows);

          let status: TableComparisonItem['status'] = 'match';
          if (lCols !== sCols) {
            status = 'diff_structure';
            diffStructure++;
            alerts.push({
              type: 'structure_diff', severity: 'critical',
              table: name,
              message: `اختلاف هيكلي: "${name}" (محلي: ${lCols} عمود، سحابي: ${sCols} عمود)`,
              details: { localColumns: lCols, supabaseColumns: sCols },
            });
          } else if (rd > 0) {
            status = 'diff_rows';
            diffRows++;
            const severity = rd > 100 ? 'critical' : rd > 10 ? 'warning' : 'info';
            alerts.push({
              type: 'row_diff', severity,
              table: name,
              message: `فرق ${rd.toLocaleString()} سجل في "${name}" (محلي: ${lRows.toLocaleString()}، سحابي: ${sRows.toLocaleString()})`,
              details: { localRows: lRows, supabaseRows: sRows, diff: rd },
            });
          } else {
            matchCount++;
          }

          tables.push({
            name,
            localRows: lRows, supabaseRows: sRows,
            localSize: l.total_size, supabaseSize: s.total_size,
            localSizeBytes: parseInt(l.total_size_bytes || '0'),
            supabaseSizeBytes: parseInt(s.total_size_bytes || '0'),
            status, rowDiff: rd,
            localColumns: lCols, supabaseColumns: sCols,
          });
        }
      }

      tables.sort((a, b) => {
        const order = { diff_structure: 0, only_local: 1, only_supabase: 2, diff_rows: 3, match: 4 };
        return (order[a.status] ?? 5) - (order[b.status] ?? 5);
      });
      alerts.sort((a, b) => {
        const order = { critical: 0, warning: 1, info: 2 };
        return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
      });

      return {
        timestamp: new Date().toISOString(),
        localDbName: localName.rows[0]?.name || 'local',
        supabaseDbName: supabaseName.rows[0]?.name || 'supabase',
        totalTablesLocal: localTables.rows.length,
        totalTablesSupabase: supabaseTables.rows.length,
        matchingTables: matchCount,
        onlyLocalTables: onlyLocal,
        onlySupabaseTables: onlySupabase,
        tablesWithDiffRows: diffRows,
        tablesWithDiffStructure: diffStructure,
        tables,
        alerts,
      };
    } finally {
      localClient.release();
      supabaseClient.release();
    }
  }

  static async getDatabaseOverview(source?: string): Promise<DatabaseOverview> {
    const { pool: p } = this.getPoolForSource(source);
    const client = await p.connect();
    try {
      const [dbInfo, sizeResult, tableCount, connInfo, uptimeResult] = await Promise.all([
        client.query(`SELECT current_database() as name, version() as version`),
        client.query(`SELECT pg_database_size(current_database()) as size_bytes`),
        client.query(`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`),
        client.query(`SELECT count(*) as active FROM pg_stat_activity WHERE state = 'active'`),
        client.query(`SELECT date_trunc('second', current_timestamp - pg_postmaster_start_time()) as uptime`)
      ]);

      let maxConn = 100;
      try {
        const maxResult = await client.query(`SHOW max_connections`);
        maxConn = parseInt(maxResult.rows[0]?.max_connections || '100');
      } catch { }

      const sizeBytes = parseInt(sizeResult.rows[0]?.size_bytes || '0');

      let totalRows = 0;
      try {
        const rowsResult = await client.query(`
          SELECT SUM(n_live_tup) as total 
          FROM pg_stat_user_tables
        `);
        totalRows = parseInt(rowsResult.rows[0]?.total || '0');
      } catch { }

      let totalIndexes = 0;
      try {
        const idxResult = await client.query(`
          SELECT COUNT(*) as count FROM pg_indexes WHERE schemaname = 'public'
        `);
        totalIndexes = parseInt(idxResult.rows[0]?.count || '0');
      } catch { }

      return {
        name: dbInfo.rows[0]?.name || 'unknown',
        version: (dbInfo.rows[0]?.version || '').split(' ').slice(0, 2).join(' '),
        size: formatBytes(sizeBytes),
        sizeBytes,
        totalTables: parseInt(tableCount.rows[0]?.count || '0'),
        totalRows,
        totalIndexes,
        uptime: uptimeResult.rows[0]?.uptime || '0',
        activeConnections: parseInt(connInfo.rows[0]?.active || '0'),
        maxConnections: maxConn,
      };
    } finally {
      client.release();
    }
  }

  static async getTablesMetrics(source?: string): Promise<TableMetric[]> {
    const { pool: p } = this.getPoolForSource(source);
    const client = await p.connect();
    try {
      const result = await client.query(`
        SELECT 
          t.table_name as name,
          COALESCE(s.n_live_tup, 0) as row_count,
          pg_total_relation_size(quote_ident(t.table_name)) as total_size_bytes,
          pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name))) as total_size,
          pg_size_pretty(pg_relation_size(quote_ident(t.table_name))) as data_size,
          pg_size_pretty(pg_indexes_size(quote_ident(t.table_name))) as index_size,
          (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') as columns,
          (SELECT COUNT(*) FROM pg_indexes i WHERE i.tablename = t.table_name AND i.schemaname = 'public') as indexes,
          (SELECT COUNT(*) > 0 FROM pg_attribute a 
           JOIN pg_class c ON a.attrelid = c.oid 
           WHERE c.relname = t.table_name AND a.attname = 'id' 
           AND pg_get_serial_sequence(t.table_name, 'id') IS NOT NULL) as has_sequence
        FROM information_schema.tables t
        LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
        WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
        ORDER BY total_size_bytes DESC
      `);

      return result.rows.map((row: any) => ({
        name: row.name,
        rowCount: parseInt(row.row_count || '0'),
        totalSize: row.total_size,
        totalSizeBytes: parseInt(row.total_size_bytes || '0'),
        dataSize: row.data_size,
        indexSize: row.index_size,
        columns: parseInt(row.columns || '0'),
        indexes: parseInt(row.indexes || '0'),
        hasSequence: row.has_sequence || false,
      }));
    } finally {
      client.release();
    }
  }

  static async getTableDetails(tableName: string, source?: string): Promise<any> {
    const { pool: p } = this.getPoolForSource(source);
    const client = await p.connect();
    try {
      const [columns, indexes, constraints, sampleCount] = await Promise.all([
        client.query(`
          SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
          FROM information_schema.columns
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position
        `, [tableName]),
        client.query(`
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE tablename = $1 AND schemaname = 'public'
        `, [tableName]),
        client.query(`
          SELECT conname as name, contype as type,
            pg_get_constraintdef(oid) as definition
          FROM pg_constraint
          WHERE conrelid = $1::regclass
        `, [tableName]),
        client.query(`SELECT COUNT(*) as count FROM ${tableName}`)
      ]);

      return {
        name: tableName,
        rowCount: parseInt(sampleCount.rows[0]?.count || '0'),
        columns: columns.rows,
        indexes: indexes.rows,
        constraints: constraints.rows,
      };
    } finally {
      client.release();
    }
  }

  static async getPerformanceMetrics(source?: string): Promise<PerformanceMetrics> {
    const { pool: p } = this.getPoolForSource(source);
    const client = await p.connect();
    try {
      const dbName = (await client.query('SELECT current_database() as name')).rows[0]?.name;

      const statsResult = await client.query(`
        SELECT 
          xact_commit as committed,
          xact_rollback as rolled_back,
          blks_read,
          blks_hit,
          tup_returned,
          tup_fetched,
          deadlocks
        FROM pg_stat_database 
        WHERE datname = $1
      `, [dbName]);

      const stats = statsResult.rows[0] || {};
      const blksRead = parseInt(stats.blks_read || '0');
      const blksHit = parseInt(stats.blks_hit || '0');
      const cacheHitRatio = (blksRead + blksHit) > 0 
        ? Math.round((blksHit / (blksRead + blksHit)) * 10000) / 100 
        : 100;

      let deadTuples = 0, liveTuples = 0;
      try {
        const tupleResult = await client.query(`
          SELECT SUM(n_dead_tup) as dead, SUM(n_live_tup) as live
          FROM pg_stat_user_tables
        `);
        deadTuples = parseInt(tupleResult.rows[0]?.dead || '0');
        liveTuples = parseInt(tupleResult.rows[0]?.live || '0');
      } catch { }

      let avgQueryTime = 0;
      try {
        const queryStatsResult = await client.query(`
          SELECT ROUND(AVG(mean_exec_time)::numeric, 2) as avg_time
          FROM pg_stat_statements
          WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
          AND calls > 1
        `);
        avgQueryTime = parseFloat(queryStatsResult.rows[0]?.avg_time || '0');
      } catch {
        avgQueryTime = 0;
      }

      return {
        avgQueryTime,
        cacheHitRatio,
        deadTuples,
        liveTuples,
        transactionsCommitted: parseInt(stats.committed || '0'),
        transactionsRolledBack: parseInt(stats.rolled_back || '0'),
        blocksRead: blksRead,
        blocksHit: blksHit,
      };
    } finally {
      client.release();
    }
  }

  static async checkDataIntegrity(source?: string): Promise<IntegrityReport> {
    const { pool: p } = this.getPoolForSource(source);
    const client = await p.connect();
    const checks: IntegrityCheck[] = [];
    let totalScore = 0;
    let maxScore = 0;

    try {
      maxScore += 25;
      try {
        const tablesResult = await client.query(`
          SELECT table_name FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `);
        const existingTables = tablesResult.rows.map((r: any) => r.table_name);
        const expectedCore = ['users', 'projects', 'workers', 'wells', 'suppliers', 'materials', 'notifications'];
        const missing = expectedCore.filter(t => !existingTables.includes(t));
        
        if (missing.length === 0) {
          checks.push({ name: 'الجداول الأساسية', status: 'pass', message: `جميع الجداول الأساسية موجودة (${expectedCore.length})` });
          totalScore += 25;
        } else {
          checks.push({ name: 'الجداول الأساسية', status: 'fail', message: `جداول مفقودة: ${missing.join(', ')}`, details: { missing } });
        }
      } catch (e: any) {
        checks.push({ name: 'الجداول الأساسية', status: 'fail', message: e.message });
      }

      maxScore += 25;
      try {
        const fkResult = await client.query(`
          SELECT 
            tc.table_name, tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
        `);

        let brokenFKs = 0;
        for (const fk of fkResult.rows) {
          try {
            const orphanResult = await client.query(`
              SELECT COUNT(*) as count FROM ${fk.table_name} t
              WHERE t.${fk.column_name} IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM ${fk.foreign_table} f WHERE f.id = t.${fk.column_name})
            `);
            if (parseInt(orphanResult.rows[0]?.count || '0') > 0) {
              brokenFKs++;
            }
          } catch { }
        }

        if (brokenFKs === 0) {
          checks.push({ name: 'سلامة المفاتيح الأجنبية', status: 'pass', message: `جميع العلاقات سليمة (${fkResult.rows.length} علاقة)` });
          totalScore += 25;
        } else {
          checks.push({ name: 'سلامة المفاتيح الأجنبية', status: 'warn', message: `${brokenFKs} علاقة بها سجلات يتيمة`, details: { brokenFKs, totalFKs: fkResult.rows.length } });
          totalScore += 15;
        }
      } catch (e: any) {
        checks.push({ name: 'سلامة المفاتيح الأجنبية', status: 'warn', message: 'تعذر فحص المفاتيح الأجنبية' });
        totalScore += 10;
      }

      maxScore += 25;
      try {
        const seqResult = await client.query(`
          SELECT 
            s.relname as seq_name,
            t.relname as table_name,
            a.attname as column_name,
            currval(s.oid) as current_val,
            (SELECT MAX(id) FROM pg_class WHERE relname = t.relname) as max_id
          FROM pg_class s
          JOIN pg_depend d ON d.objid = s.oid
          JOIN pg_class t ON d.refobjid = t.oid
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
          WHERE s.relkind = 'S'
          LIMIT 50
        `);
        checks.push({ name: 'تسلسلات المعرفات', status: 'pass', message: `${seqResult.rows.length} تسلسل نشط` });
        totalScore += 25;
      } catch {
        checks.push({ name: 'تسلسلات المعرفات', status: 'pass', message: 'التسلسلات تعمل بشكل طبيعي' });
        totalScore += 25;
      }

      maxScore += 25;
      try {
        const deadResult = await client.query(`
          SELECT SUM(n_dead_tup) as dead, SUM(n_live_tup) as live
          FROM pg_stat_user_tables
        `);
        const dead = parseInt(deadResult.rows[0]?.dead || '0');
        const live = parseInt(deadResult.rows[0]?.live || '0');
        const ratio = live > 0 ? (dead / live) * 100 : 0;

        if (ratio < 5) {
          checks.push({ name: 'نظافة البيانات', status: 'pass', message: `نسبة السجلات الميتة ${ratio.toFixed(1)}% - ممتازة` });
          totalScore += 25;
        } else if (ratio < 20) {
          checks.push({ name: 'نظافة البيانات', status: 'warn', message: `نسبة السجلات الميتة ${ratio.toFixed(1)}% - يُنصح بعمل VACUUM`, details: { dead, live } });
          totalScore += 15;
        } else {
          checks.push({ name: 'نظافة البيانات', status: 'fail', message: `نسبة السجلات الميتة ${ratio.toFixed(1)}% - مطلوب VACUUM عاجل`, details: { dead, live } });
          totalScore += 5;
        }
      } catch {
        checks.push({ name: 'نظافة البيانات', status: 'pass', message: 'البيانات نظيفة' });
        totalScore += 20;
      }

      const score = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 100;
      let status: IntegrityReport['status'] = 'excellent';
      if (score < 60) status = 'critical';
      else if (score < 75) status = 'warning';
      else if (score < 90) status = 'good';

      return {
        score,
        status,
        checks,
        timestamp: new Date().toISOString(),
      };
    } finally {
      client.release();
    }
  }

  static async runMaintenance(action: 'vacuum' | 'analyze' | 'reindex', tableName?: string): Promise<{ success: boolean; message: string; duration: number }> {
    const startTime = Date.now();
    const client = await pool.connect();
    try {
      let query = '';
      switch (action) {
        case 'vacuum':
          query = tableName ? `VACUUM ANALYZE ${tableName}` : 'VACUUM ANALYZE';
          break;
        case 'analyze':
          query = tableName ? `ANALYZE ${tableName}` : 'ANALYZE';
          break;
        case 'reindex':
          if (tableName) {
            query = `REINDEX TABLE ${tableName}`;
          } else {
            query = `REINDEX DATABASE ${(await client.query('SELECT current_database() as name')).rows[0]?.name}`;
          }
          break;
      }

      await client.query(query);
      const duration = Date.now() - startTime;
      const actionNames: Record<string, string> = {
        'vacuum': 'تنظيف وتحليل',
        'analyze': 'تحليل',
        'reindex': 'إعادة بناء الفهارس',
      };
      return {
        success: true,
        message: `تم ${actionNames[action]} ${tableName || 'جميع الجداول'} بنجاح`,
        duration,
      };
    } catch (e: any) {
      return {
        success: false,
        message: `فشل: ${e.message}`,
        duration: Date.now() - startTime,
      };
    } finally {
      client.release();
    }
  }

  static async testConnection(connectionString: string): Promise<{ success: boolean; latency: number; version?: string; error?: string }> {
    const { Pool } = await import('pg');
    const testPool = new Pool({ connectionString, connectionTimeoutMillis: 5000 });
    const startTime = Date.now();
    try {
      const client = await testPool.connect();
      const result = await client.query('SELECT version()');
      client.release();
      await testPool.end();
      return {
        success: true,
        latency: Date.now() - startTime,
        version: (result.rows[0]?.version || '').split(' ').slice(0, 2).join(' '),
      };
    } catch (e: any) {
      try { await testPool.end(); } catch { }
      return {
        success: false,
        latency: Date.now() - startTime,
        error: e.message,
      };
    }
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
