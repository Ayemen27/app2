import type { Pool } from 'pg';

function normalizePgTextArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value !== 'string') return [];
  const s = value.trim();
  if (!s || s === '{}') return [];
  if (!(s.startsWith('{') && s.endsWith('}'))) return [s];
  const inner = s.slice(1, -1);
  if (!inner) return [];
  return inner.split(',').map((v) => v.replace(/^"|"$/g, '').trim()).filter(Boolean);
}

interface ColumnDef {
  column_name: string;
  data_type: string;
  character_maximum_length: number | null;
  column_default: string | null;
  is_nullable: string;
  udt_name: string;
  numeric_precision: number | null;
  numeric_scale: number | null;
}

interface ConstraintDef {
  constraint_name: string;
  constraint_type: string;
  definition: string;
  columns: string[];
  foreign_table?: string;
  foreign_columns?: string[];
  on_update?: string;
  on_delete?: string;
}

interface IndexDef {
  indexname: string;
  indexdef: string;
}

interface SequenceDef {
  sequence_name: string;
  current_value: number;
  data_type: string;
  start_value: number;
  increment_by: number;
  min_value: number;
  max_value: string;
  owned_by: string | null;
}

function mapUdtToSql(col: ColumnDef): string {
  const udt = col.udt_name;

  if (udt === 'int4' || udt === 'int8' || udt === 'int2') {
    if (col.column_default?.startsWith('nextval(')) {
      return udt === 'int8' ? 'BIGSERIAL' : udt === 'int2' ? 'SMALLSERIAL' : 'SERIAL';
    }
    return udt === 'int8' ? 'BIGINT' : udt === 'int2' ? 'SMALLINT' : 'INTEGER';
  }
  if (udt === 'varchar') {
    return col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : 'VARCHAR';
  }
  if (udt === 'numeric' || udt === 'decimal') {
    return col.numeric_precision ? `NUMERIC(${col.numeric_precision},${col.numeric_scale || 0})` : 'NUMERIC';
  }
  if (udt === 'bool') return 'BOOLEAN';
  if (udt === 'text') return 'TEXT';
  if (udt === 'timestamp' || udt === 'timestamptz') return udt === 'timestamptz' ? 'TIMESTAMPTZ' : 'TIMESTAMP';
  if (udt === 'date') return 'DATE';
  if (udt === 'time' || udt === 'timetz') return udt === 'timetz' ? 'TIMETZ' : 'TIME';
  if (udt === 'float4' || udt === 'float8') return udt === 'float8' ? 'DOUBLE PRECISION' : 'REAL';
  if (udt === 'uuid') return 'UUID';
  if (udt === 'jsonb') return 'JSONB';
  if (udt === 'json') return 'JSON';
  if (udt === 'bytea') return 'BYTEA';
  if (udt === 'inet') return 'INET';
  if (udt === 'cidr') return 'CIDR';
  if (udt === 'macaddr') return 'MACADDR';
  if (udt === 'interval') return 'INTERVAL';
  if (udt === '_text') return 'TEXT[]';
  if (udt === '_int4') return 'INTEGER[]';
  if (udt === '_int8') return 'BIGINT[]';
  if (udt === '_float8') return 'DOUBLE PRECISION[]';
  if (udt === '_varchar') return 'VARCHAR[]';
  if (udt === '_bool') return 'BOOLEAN[]';
  if (udt === '_jsonb') return 'JSONB[]';
  if (udt === '_uuid') return 'UUID[]';
  if (udt.startsWith('_')) return `${col.data_type.toUpperCase()}[]`;
  return col.data_type.toUpperCase();
}

export async function getFullTableDDL(pool: Pool, tableName: string): Promise<string | null> {
  const colsRes = await pool.query(`
    SELECT 
      column_name, data_type, character_maximum_length,
      column_default, is_nullable, udt_name,
      numeric_precision, numeric_scale
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);

  if (colsRes.rows.length === 0) return null;

  const colDefs = colsRes.rows.map((col: ColumnDef) => {
    const typeDef = mapUdtToSql(col);
    let def = `"${col.column_name}" ${typeDef}`;
    if (col.is_nullable === 'NO') def += ' NOT NULL';
    if (col.column_default && !col.column_default.startsWith('nextval(')) {
      def += ` DEFAULT ${col.column_default}`;
    }
    return def;
  });

  const pkRes = await pool.query(`
    SELECT a.attname
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = $1::regclass AND i.indisprimary
    ORDER BY array_position(i.indkey, a.attnum)
  `, [`"${tableName}"`]);

  if (pkRes.rows.length > 0) {
    const pkCols = pkRes.rows.map((r: any) => `"${r.attname}"`).join(', ');
    colDefs.push(`PRIMARY KEY (${pkCols})`);
  }

  const fkRes = await pool.query(`
    SELECT
      con.conname AS constraint_name,
      array_agg(a.attname ORDER BY array_position(con.conkey, a.attnum)) AS columns,
      cls2.relname AS foreign_table,
      array_agg(af.attname ORDER BY array_position(con.confkey, af.attnum)) AS foreign_columns,
      CASE con.confupdtype
        WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT'
      END AS on_update,
      CASE con.confdeltype
        WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT'
      END AS on_delete
    FROM pg_constraint con
    JOIN pg_class cls ON cls.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
    JOIN pg_class cls2 ON cls2.oid = con.confrelid
    JOIN pg_attribute af ON af.attrelid = con.confrelid AND af.attnum = ANY(con.confkey)
    WHERE con.contype = 'f'
      AND nsp.nspname = 'public'
      AND cls.relname = $1
    GROUP BY con.conname, cls2.relname, con.confupdtype, con.confdeltype
  `, [tableName]);

  for (const fk of fkRes.rows) {
    const localCols = normalizePgTextArray(fk.columns).map((c: string) => `"${c}"`).join(', ');
    const foreignCols = normalizePgTextArray(fk.foreign_columns).map((c: string) => `"${c}"`).join(', ');
    let fkDef = `CONSTRAINT "${fk.constraint_name}" FOREIGN KEY (${localCols}) REFERENCES "${fk.foreign_table}" (${foreignCols})`;
    if (fk.on_update && fk.on_update !== 'NO ACTION') fkDef += ` ON UPDATE ${fk.on_update}`;
    if (fk.on_delete && fk.on_delete !== 'NO ACTION') fkDef += ` ON DELETE ${fk.on_delete}`;
    colDefs.push(fkDef);
  }

  const uqRes = await pool.query(`
    SELECT
      con.conname AS constraint_name,
      array_agg(a.attname ORDER BY array_position(con.conkey, a.attnum)) AS columns
    FROM pg_constraint con
    JOIN pg_class cls ON cls.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
    WHERE con.contype = 'u'
      AND nsp.nspname = 'public'
      AND cls.relname = $1
    GROUP BY con.conname
  `, [tableName]);

  for (const uq of uqRes.rows) {
    const uqCols = normalizePgTextArray(uq.columns).map((c: string) => `"${c}"`).join(', ');
    colDefs.push(`CONSTRAINT "${uq.constraint_name}" UNIQUE (${uqCols})`);
  }

  const chkRes = await pool.query(`
    SELECT
      con.conname AS constraint_name,
      pg_get_constraintdef(con.oid) AS definition
    FROM pg_constraint con
    JOIN pg_class cls ON cls.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
    WHERE con.contype = 'c'
      AND nsp.nspname = 'public'
      AND cls.relname = $1
  `, [tableName]);

  for (const chk of chkRes.rows) {
    colDefs.push(`CONSTRAINT "${chk.constraint_name}" ${chk.definition}`);
  }

  let ddl = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${colDefs.join(',\n  ')}\n)`;

  const idxRes = await pool.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = $1
      AND indexname NOT IN (
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class cls ON cls.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
        WHERE nsp.nspname = 'public'
          AND cls.relname = $1
          AND con.contype IN ('p', 'u')
      )
  `, [tableName]);

  if (idxRes.rows.length > 0) {
    const indexStatements = idxRes.rows.map((idx: IndexDef) => `${idx.indexdef};`);
    ddl += ';\n' + indexStatements.join('\n');
  }

  return ddl;
}

export async function getSequencesDDL(pool: Pool): Promise<string[]> {
  const seqRes = await pool.query(`
    SELECT
      s.sequencename AS sequence_name,
      s.data_type,
      s.start_value,
      s.increment_by,
      s.min_value,
      s.max_value::text AS max_value
    FROM pg_sequences s
    WHERE s.schemaname = 'public'
    ORDER BY s.sequencename
  `);

  const statements: string[] = [];

  for (const seq of seqRes.rows) {
    const valRes = await pool.query(`SELECT last_value, is_called FROM "${seq.sequence_name}"`);
    const lastValue = valRes.rows[0]?.last_value ?? 1;
    const isCalled = valRes.rows[0]?.is_called ?? false;

    statements.push(
      `CREATE SEQUENCE IF NOT EXISTS "${seq.sequence_name}" AS ${seq.data_type} INCREMENT BY ${seq.increment_by} MINVALUE ${seq.min_value} MAXVALUE ${seq.max_value} START WITH ${seq.start_value};`
    );
    statements.push(
      `SELECT setval('"${seq.sequence_name}"', ${lastValue}, ${isCalled});`
    );
  }

  return statements;
}

export async function getAllConstraints(pool: Pool, tableName: string): Promise<ConstraintDef[]> {
  const res = await pool.query(`
    SELECT
      con.conname AS constraint_name,
      CASE con.contype
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 'c' THEN 'CHECK'
        WHEN 'x' THEN 'EXCLUSION'
      END AS constraint_type,
      pg_get_constraintdef(con.oid) AS definition
    FROM pg_constraint con
    JOIN pg_class cls ON cls.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
    WHERE nsp.nspname = 'public'
      AND cls.relname = $1
    ORDER BY
      CASE con.contype
        WHEN 'p' THEN 1
        WHEN 'u' THEN 2
        WHEN 'c' THEN 3
        WHEN 'f' THEN 4
        WHEN 'x' THEN 5
      END
  `, [tableName]);

  return res.rows.map((row: any) => ({
    constraint_name: row.constraint_name,
    constraint_type: row.constraint_type,
    definition: row.definition,
    columns: [],
  }));
}
