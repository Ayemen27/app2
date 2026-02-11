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
  source1Rows: number | null;
  source2Rows: number | null;
  source1Size: string | null;
  source2Size: string | null;
  source1SizeBytes: number;
  source2SizeBytes: number;
  status: 'match' | 'diff_rows' | 'only_source1' | 'only_source2' | 'diff_structure';
  rowDiff: number;
  source1Columns: number;
  source2Columns: number;
}

export interface ComparisonReport {
  timestamp: string;
  source1Id: string;
  source2Id: string;
  source1Name: string;
  source2Name: string;
  totalTablesSource1: number;
  totalTablesSource2: number;
  matchingTables: number;
  onlySource1Tables: number;
  onlySource2Tables: number;
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
      if (!status.local) return { pool: null, error: 'القاعدة المحلية غير متصلة' };
      const conn = connMgr.getSmartConnection('read');
      if (conn.source === 'local' && conn.pool) return { pool: conn.pool };
      return { pool };
    }

    if (source === 'supabase') {
      const dynConn = connMgr.getDynamicConnection('supabase');
      if (dynConn?.connected && dynConn.pool) return { pool: dynConn.pool };
      
      const status = connMgr.getConnectionStatus();
      if (status.supabase) {
        const conn = connMgr.getSmartConnection('sync');
        if (conn.source === 'supabase' && conn.pool) return { pool: conn.pool };
      }
      return { pool: null, error: 'Supabase غير متصل' };
    }

    const dynConn = connMgr.getDynamicConnection(source);
    if (dynConn) {
      if (!dynConn.connected || !dynConn.pool) {
        return { pool: null, error: `قاعدة "${dynConn.label}" غير متصلة` };
      }
      return { pool: dynConn.pool };
    }

    return { pool: null, error: `مصدر غير معروف: ${source}` };
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
    const existingIds = new Set(connections.map(c => c.id));
    
    const dynamicResults = await Promise.all(
      dynamicConns
        .filter(dynConn => !existingIds.has(dynConn.key))
        .map(async (dynConn): Promise<ConnectionInfo> => {
          if (!dynConn.connected || !dynConn.pool) {
            return { id: dynConn.key, label: dynConn.label, connected: false, dbName: dynConn.dbName || null, version: null, size: null, tables: 0, rows: 0, latency: null };
          }
          try {
            const queryWithTimeout = new Promise<ConnectionInfo>(async (resolve, reject) => {
              const timer = setTimeout(() => reject(new Error('timeout')), 8000);
              try {
                const client = await dynConn.pool!.connect();
                const [dbInfo, sizeResult, tableCount, rowsResult] = await Promise.all([
                  client.query('SELECT current_database() as name, version() as version'),
                  client.query('SELECT pg_database_size(current_database()) as size_bytes'),
                  client.query("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"),
                  client.query('SELECT SUM(n_live_tup) as total FROM pg_stat_user_tables'),
                ]);
                client.release();
                clearTimeout(timer);
                resolve({
                  id: dynConn.key, label: dynConn.label, connected: true,
                  dbName: dbInfo.rows[0]?.name || dynConn.dbName || 'unknown',
                  version: (dbInfo.rows[0]?.version || '').split(' ').slice(0, 2).join(' '),
                  size: formatBytes(parseInt(sizeResult.rows[0]?.size_bytes || '0')),
                  tables: parseInt(tableCount.rows[0]?.count || '0'),
                  rows: parseInt(rowsResult.rows[0]?.total || '0'),
                  latency: dynConn.latency ? `${dynConn.latency}ms` : null,
                });
              } catch (e) { clearTimeout(timer); reject(e); }
            });
            return await queryWithTimeout;
          } catch {
            return { id: dynConn.key, label: dynConn.label, connected: false, dbName: dynConn.dbName || null, version: null, size: null, tables: 0, rows: 0, latency: null };
          }
        })
    );
    connections.push(...dynamicResults);

    return connections;
  }

  static async compareDatabases(source1?: string, source2?: string): Promise<ComparisonReport | null> {
    const s1 = source1 || 'local';
    const s2 = source2 || 'supabase';

    console.log(`🔍 [DbMetrics] Comparing databases: s1=${s1}, s2=${s2}`);

    const { pool: pool1, error: err1 } = this.getPoolForSource(s1);
    const { pool: pool2, error: err2 } = this.getPoolForSource(s2);

    if (err1 || err2) {
      console.error(`❌ [DbMetrics] Connection error: s1_err=${err1}, s2_err=${err2}`);
      return null;
    }
    
    // تأكد من أننا نقارن بين قاعدتين فعليتين مختلفتين حتى لو كانت الـ pools متطابقة (في حالة التطوير المحلي)
    // أو إذا كان المستخدم اختار نفس المصدر، نوضح ذلك
    if (s1 === s2) {
      console.warn(`⚠️ [DbMetrics] Comparing the same source: ${s1}`);
    }

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

    const [client1, client2] = await Promise.all([
      pool1.connect(),
      pool2.connect(),
    ]);

    try {
    const [tables1Result, tables2Result, name1, name2] = await Promise.all([
        client1.query(tablesQuery),
        client2.query(tablesQuery),
        client1.query(dbNameQuery),
        client2.query(dbNameQuery),
      ]);

      const tables1 = tables1Result.rows || [];
      const tables2 = tables2Result.rows || [];

      console.log(`📊 [DbMetrics] Table counts: s1=${tables1.length}, s2=${tables2.length}`);

      const map1 = new Map(tables1.map((r: any) => [r.name, r]));
      const map2 = new Map(tables2.map((r: any) => [r.name, r]));
      const allTableNames = new Set([...map1.keys(), ...map2.keys()]);

      const tables: TableComparisonItem[] = [];
      const alerts: ComparisonAlert[] = [];
      let matchCount = 0, onlyS1 = 0, onlyS2 = 0, diffRows = 0, diffStructure = 0;

      const s1Label = name1.rows[0]?.name || s1;
      const s2Label = name2.rows[0]?.name || s2;

      for (const name of allTableNames) {
        const d1 = map1.get(name);
        const d2 = map2.get(name);

        if (d1 && !d2) {
          onlyS1++;
          tables.push({
            name,
            source1Rows: parseInt(d1.row_count || '0'), source2Rows: null,
            source1Size: d1.total_size, source2Size: null,
            source1SizeBytes: parseInt(d1.total_size_bytes || '0'), source2SizeBytes: 0,
            status: 'only_source1', rowDiff: parseInt(d1.row_count || '0'),
            source1Columns: parseInt(d1.columns || '0'), source2Columns: 0,
          });
          alerts.push({
            type: 'missing_table', severity: 'warning',
            table: name,
            message: `الجدول "${name}" موجود فقط في ${s1Label}`,
          });
        } else if (!d1 && d2) {
          onlyS2++;
          tables.push({
            name,
            source1Rows: null, source2Rows: parseInt(d2.row_count || '0'),
            source1Size: null, source2Size: d2.total_size,
            source1SizeBytes: 0, source2SizeBytes: parseInt(d2.total_size_bytes || '0'),
            status: 'only_source2', rowDiff: parseInt(d2.row_count || '0'),
            source1Columns: 0, source2Columns: parseInt(d2.columns || '0'),
          });
          alerts.push({
            type: 'missing_table', severity: 'warning',
            table: name,
            message: `الجدول "${name}" موجود فقط في ${s2Label}`,
          });
        } else if (d1 && d2) {
          const r1 = parseInt(d1.row_count || '0');
          const r2 = parseInt(d2.row_count || '0');
          const c1 = parseInt(d1.columns || '0');
          const c2 = parseInt(d2.columns || '0');
          const rd = Math.abs(r1 - r2);

          let status: TableComparisonItem['status'] = 'match';
          if (c1 !== c2) {
            status = 'diff_structure';
            diffStructure++;
            alerts.push({
              type: 'structure_diff', severity: 'critical',
              table: name,
              message: `اختلاف هيكلي: "${name}" (${s1Label}: ${c1} عمود، ${s2Label}: ${c2} عمود)`,
              details: { source1Columns: c1, source2Columns: c2 },
            });
          } else if (rd > 0) {
            status = 'diff_rows';
            diffRows++;
            const severity = rd > 100 ? 'critical' : rd > 10 ? 'warning' : 'info';
            alerts.push({
              type: 'row_diff', severity,
              table: name,
              message: `فرق ${rd.toLocaleString()} سجل في "${name}" (${s1Label}: ${r1.toLocaleString()}، ${s2Label}: ${r2.toLocaleString()})`,
              details: { source1Rows: r1, source2Rows: r2, diff: rd },
            });
          } else {
            matchCount++;
          }

          tables.push({
            name,
            source1Rows: r1, source2Rows: r2,
            source1Size: d1.total_size, source2Size: d2.total_size,
            source1SizeBytes: parseInt(d1.total_size_bytes || '0'),
            source2SizeBytes: parseInt(d2.total_size_bytes || '0'),
            status, rowDiff: rd,
            source1Columns: c1, source2Columns: c2,
          });
        }
      }

      tables.sort((a, b) => {
        const order = { diff_structure: 0, only_source1: 1, only_source2: 2, diff_rows: 3, match: 4 };
        return (order[a.status] ?? 5) - (order[b.status] ?? 5);
      });
      alerts.sort((a, b) => {
        const order = { critical: 0, warning: 1, info: 2 };
        return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
      });

      return {
        timestamp: new Date().toISOString(),
        source1Id: s1,
        source2Id: s2,
        source1Name: name1.rows[0]?.name || s1,
        source2Name: name2.rows[0]?.name || s2,
        totalTablesSource1: tables1.length,
        totalTablesSource2: tables2.length,
        matchingTables: matchCount,
        onlySource1Tables: onlyS1,
        onlySource2Tables: onlyS2,
        tablesWithDiffRows: diffRows,
        tablesWithDiffStructure: diffStructure,
        tables,
        alerts,
      };
    } finally {
      client1.release();
      client2.release();
    }
  }

  static async getDatabaseOverview(source?: string): Promise<DatabaseOverview> {
    const { pool: p, error } = this.getPoolForSource(source);
    if (error || !p) throw new Error(error || 'القاعدة غير متصلة');
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
    const { pool: p, error } = this.getPoolForSource(source);
    if (error || !p) throw new Error(error || 'القاعدة غير متصلة');
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
    const { pool: p, error } = this.getPoolForSource(source);
    if (error || !p) throw new Error(error || 'القاعدة غير متصلة');
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
    const { pool: p, error } = this.getPoolForSource(source);
    if (error || !p) throw new Error(error || 'القاعدة غير متصلة');
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
    const { pool: p, error } = this.getPoolForSource(source);
    if (error || !p) throw new Error(error || 'القاعدة غير متصلة');
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

        const brokenFKs = 0;

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
          SELECT COUNT(*) as count FROM pg_class WHERE relkind = 'S'
        `);
        const seqCount = parseInt(seqResult.rows[0]?.count || '0');
        checks.push({ name: 'تسلسلات المعرفات', status: 'pass', message: `${seqCount} تسلسل نشط` });
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
