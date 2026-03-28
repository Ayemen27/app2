import { db } from "../../db.js";
import { pool } from "../../db.js";
import {
  waEntityAliases, waEntityLinkAudit, waTransferCompanies,
  waRawMessages, waWorkerAliases, workers, waMediaAssets,
} from "@shared/schema";
import type { WaEntityAlias } from "@shared/schema";
import { eq, sql, and, isNull } from "drizzle-orm";
import { normalizeArabicText } from './ArabicAmountParser.js';

export interface ExtractedName {
  name: string;
  entityType: string;
  confidence: number;
  context: string;
  extractionMethod: string;
}

export interface ExtractionBatchResult {
  totalNames: number;
  newNames: number;
  existingNames: number;
  unlinkedNames: number;
}

export interface LinkingReadiness {
  total: number;
  linked: number;
  unlinked: number;
  linkedPercent: number;
  isReady: boolean;
}

export function normalizeForMatching(text: string): string {
  return text
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[\u200F\u200E\u202A\u202B\u202C\u200B\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const ARABIC_NAME_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]{2,}/;

export async function runNameExtractionMigration(): Promise<{ success: boolean; details: string[] }> {
  const details: string[] = [];
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS wa_entity_aliases (
        id SERIAL PRIMARY KEY,
        alias_name TEXT NOT NULL,
        alias_name_normalized TEXT NOT NULL,
        entity_type TEXT NOT NULL DEFAULT 'عامل',
        canonical_entity_id VARCHAR,
        entity_table TEXT DEFAULT 'workers',
        source_batch_id INTEGER,
        source_message_id INTEGER,
        extraction_method TEXT DEFAULT 'auto',
        is_verified BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        confidence DECIMAL(5,4) DEFAULT 0,
        occurrence_count INTEGER NOT NULL DEFAULT 1,
        context TEXT,
        first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        verified_by VARCHAR,
        verified_at TIMESTAMPTZ,
        updated_by VARCHAR,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by VARCHAR,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    details.push('wa_entity_aliases table ensured');

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS wa_entity_aliases_name_type_unique
      ON wa_entity_aliases (alias_name_normalized, entity_type)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS wa_entity_link_audit (
        id SERIAL PRIMARY KEY,
        entity_alias_id INTEGER NOT NULL REFERENCES wa_entity_aliases(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        previous_entity_id VARCHAR,
        new_entity_id VARCHAR,
        previous_entity_type TEXT,
        new_entity_type TEXT,
        reason TEXT,
        performed_by VARCHAR,
        performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    details.push('wa_entity_link_audit table ensured');

    await client.query(`
      CREATE TABLE IF NOT EXISTS wa_transfer_companies (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        keywords TEXT[] NOT NULL,
        keywords_normalized TEXT[] NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by VARCHAR
      )
    `);
    details.push('wa_transfer_companies table ensured');

    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'wa_import_batches' AND column_name = 'pipeline_stage'
    `);
    if (colCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE wa_import_batches
        ADD COLUMN pipeline_stage TEXT DEFAULT 'ingested'
      `);
      details.push('Added pipeline_stage column to wa_import_batches');
    } else {
      details.push('pipeline_stage column already exists');
    }

    const seedCompanies = [
      {
        code: 'rashad_bahir',
        displayName: 'رشاد بحير',
        keywords: ['رشاد', 'بحير'],
        keywordsNormalized: ['رشاد', 'بحير'],
      },
      {
        code: 'houshabi',
        displayName: 'الحوشبي',
        keywords: ['الحوشبي', 'حوشبي'],
        keywordsNormalized: ['الحوشبي', 'حوشبي'],
      },
      {
        code: 'najm',
        displayName: 'النجم',
        keywords: ['النجم'],
        keywordsNormalized: ['النجم'],
      },
    ];

    for (const company of seedCompanies) {
      const existing = await client.query(
        'SELECT id FROM wa_transfer_companies WHERE code = $1',
        [company.code]
      );
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO wa_transfer_companies (code, display_name, keywords, keywords_normalized)
           VALUES ($1, $2, $3, $4)`,
          [company.code, company.displayName, company.keywords, company.keywordsNormalized]
        );
        details.push(`Seeded transfer company: ${company.code}`);
      } else {
        details.push(`Transfer company already exists: ${company.code}`);
      }
    }

    try {
      const oldAliases = await client.query('SELECT * FROM wa_worker_aliases');
      let migrated = 0;
      for (const alias of oldAliases.rows) {
        const normalized = normalizeForMatching(alias.alias_name);
        const existCheck = await client.query(
          `SELECT id FROM wa_entity_aliases WHERE alias_name_normalized = $1 AND entity_type = 'عامل'`,
          [normalized]
        );
        if (existCheck.rows.length === 0) {
          await client.query(
            `INSERT INTO wa_entity_aliases
             (alias_name, alias_name_normalized, entity_type, canonical_entity_id, entity_table,
              extraction_method, is_verified, confidence, created_by)
             VALUES ($1, $2, 'عامل', $3, 'workers', 'migrated_from_wa_worker_aliases', true, 0.9, $4)`,
            [alias.alias_name, normalized, alias.canonical_worker_id, alias.created_by]
          );
          migrated++;
        }
      }
      details.push(`Migrated ${migrated} aliases from wa_worker_aliases`);
    } catch (err: any) {
      console.warn(`[NameExtraction] wa_worker_aliases migration skipped:`, err.message);
      details.push(`wa_worker_aliases migration skipped: ${err.message}`);
    }

    return { success: true, details };
  } catch (err: any) {
    console.error(`[NameExtraction] Migration failed:`, err.message);
    details.push(`Migration error: ${err.message}`);
    return { success: false, details };
  } finally {
    client.release();
  }
}

export class NameExtractionService {
  async extractNamesFromBatch(batchId: number): Promise<ExtractionBatchResult> {
    const messages = await db.select()
      .from(waRawMessages)
      .where(eq(waRawMessages.batchId, batchId))
      .orderBy(waRawMessages.messageOrder);

    const ocrAssets = await db.select()
      .from(waMediaAssets)
      .where(and(eq(waMediaAssets.batchId, batchId), sql`${waMediaAssets.ocrText} IS NOT NULL AND ${waMediaAssets.ocrText} != ''`));
    const ocrByMessageId = new Map<number, string>();
    for (const asset of ocrAssets) {
      if (asset.messageId && asset.ocrText) {
        const existing = ocrByMessageId.get(asset.messageId) || '';
        ocrByMessageId.set(asset.messageId, existing ? existing + ' ' + asset.ocrText : asset.ocrText);
      }
    }

    let totalNames = 0;
    let newNames = 0;
    let existingNames = 0;

    for (const msg of messages) {
      let textToExtract = msg.messageText || '';
      const ocrText = ocrByMessageId.get(msg.id);
      if (ocrText) {
        textToExtract = textToExtract + ' ' + ocrText;
      }
      const extracted = this.extractNamesFromText(textToExtract, msg.sender);
      for (const name of extracted) {
        totalNames++;
        const normalized = normalizeForMatching(name.name);
        if (normalized.length < 2) continue;

        const existing = await db.select()
          .from(waEntityAliases)
          .where(
            and(
              eq(waEntityAliases.aliasNameNormalized, normalized),
              eq(waEntityAliases.entityType, name.entityType)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          existingNames++;
          await db.update(waEntityAliases)
            .set({
              occurrenceCount: sql`${waEntityAliases.occurrenceCount} + 1`,
              lastSeenAt: sql`NOW()`,
            })
            .where(eq(waEntityAliases.id, existing[0].id));
        } else {
          newNames++;
          try {
            await db.insert(waEntityAliases).values({
              aliasName: name.name,
              aliasNameNormalized: normalized,
              entityType: name.entityType,
              sourceBatchId: batchId,
              sourceMessageId: msg.id,
              extractionMethod: name.extractionMethod,
              confidence: name.confidence.toString(),
              context: name.context.substring(0, 500),
              occurrenceCount: 1,
            });
          } catch (err: any) {
            if (err.code === '23505') {
              existingNames++;
              newNames--;
            }
          }
        }
      }
    }

    try {
      await pool.query(
        `UPDATE wa_import_batches SET pipeline_stage = 'names_extracted' WHERE id = $1`,
        [batchId]
      );
    } catch (_err) {
    }

    const unlinkedResult = await db.select({ count: sql<number>`count(*)` })
      .from(waEntityAliases)
      .where(
        and(
          eq(waEntityAliases.sourceBatchId, batchId),
          isNull(waEntityAliases.canonicalEntityId)
        )
      );
    const unlinkedNames = Number(unlinkedResult[0]?.count ?? 0);

    return { totalNames, newNames, existingNames, unlinkedNames };
  }

  extractNamesFromText(text: string, sender?: string): ExtractedName[] {
    const results: ExtractedName[] = [];
    const seen = new Set<string>();
    const cleaned = normalizeArabicText(text);

    const addResult = (name: string, entityType: string, confidence: number, extractionMethod: string) => {
      const trimmed = name.trim();
      if (trimmed.length < 2 || !ARABIC_NAME_RE.test(trimmed)) return;
      const key = `${normalizeForMatching(trimmed)}::${entityType}`;
      if (seen.has(key)) return;
      seen.add(key);
      results.push({
        name: trimmed,
        entityType,
        confidence,
        context: cleaned.substring(0, 200),
        extractionMethod,
      });
    };

    const jobTitlePatterns: Array<{ patterns: RegExp[]; entityType: string }> = [
      { patterns: [/(?:نجار|نجاره)\s+([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]{2,30})/], entityType: 'نجار' },
      { patterns: [/(?:حداد|ملحم|لحام)\s+([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]{2,30})/], entityType: 'حداد' },
      { patterns: [/(?:سواق|سائق)\s+([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]{2,30})/], entityType: 'سواق' },
      { patterns: [/مهندس\s+([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]{2,30})/], entityType: 'مهندس' },
      { patterns: [/مشرف\s+([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]{2,30})/], entityType: 'مشرف' },
      { patterns: [/معلم\s+(?:مخاره|مخارة)\s+([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]{2,30})/], entityType: 'معلم_مخاره' },
      { patterns: [/معلم\s+(?:حداده|حدادة)\s+([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]{2,30})/], entityType: 'معلم_حدادة' },
      { patterns: [/معلم\s+([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]{2,30})/], entityType: 'معلم' },
      { patterns: [/مدير\s+([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]{2,30})/], entityType: 'مدير' },
    ];

    for (const { patterns, entityType } of jobTitlePatterns) {
      for (const pat of patterns) {
        const m = cleaned.match(pat);
        if (m && m[1]) {
          addResult(m[1], entityType, 0.85, 'job_title_pattern');
        }
      }
    }

    const companyPatterns: Array<{ re: RegExp; entityType: string }> = [
      { re: /(?:شركة|شركه|مؤسسة)\s+([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]{2,30})/, entityType: 'شركة' },
      { re: /(?:محل|معرض)\s+([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]{2,30})/, entityType: 'محل_مواد_بناء' },
      { re: /محطة\s+(?:بترول|بنزين)\s*([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]{2,30})?/, entityType: 'محطة_بترول' },
    ];

    for (const { re, entityType } of companyPatterns) {
      const m = cleaned.match(re);
      if (m && m[1]) {
        addResult(m[1], entityType, 0.80, 'company_pattern');
      } else if (m && entityType === 'محطة_بترول') {
        addResult('محطة بترول', entityType, 0.75, 'company_pattern');
      }
    }

    const paymentPatterns = [
      /(?:اجرة|أجرة|حق|مال|يومية)\s+([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]{3,30})/,
      /(?:المستلم|المرسل)\s+([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]{3,30})/,
    ];

    for (const pat of paymentPatterns) {
      const m = cleaned.match(pat);
      if (m && m[1]) {
        const name = m[1].replace(/\d+/g, '').trim();
        if (name.length >= 3) {
          addResult(name, 'عامل', 0.70, 'payment_recipient_pattern');
        }
      }
    }

    const custodianPatterns = [
      /حساب\s+([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]{2,30})/,
      /عند\s+([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]{2,30})/,
      /أمانة\s+([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]{2,30})/,
    ];

    for (const pat of custodianPatterns) {
      const m = cleaned.match(pat);
      if (m && m[1]) {
        addResult(m[1], 'أمين_عهدة', 0.75, 'custodian_pattern');
      }
    }

    const groupPatterns: Array<{ re: RegExp; entityType: string }> = [
      { re: /عمال\s+(?:حفر|الحفر)/, entityType: 'عمال_حفر' },
      { re: /عمال\s+(?:صبة|الصبة|صبه)/, entityType: 'عمال_صبة' },
      { re: /عمال\s+([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]{2,20})/, entityType: 'عمال' },
    ];

    for (const { re, entityType } of groupPatterns) {
      const m = cleaned.match(re);
      if (m) {
        const groupName = m[0].trim();
        addResult(groupName, entityType, 0.80, 'group_entity_pattern');
      }
    }

    const kunyaPatterns = [
      /(?:ابو|أبو)\s+([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]{2,15})/,
      /(?:الحاج|الحج)\s+([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]{2,20})/,
      /(?:ام|أم)\s+([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]{2,15})/,
    ];

    for (const pat of kunyaPatterns) {
      const m = cleaned.match(pat);
      if (m) {
        addResult(m[0].trim(), 'عامل', 0.65, 'kunya_pattern');
      }
    }

    if (sender && !/^\+?\d{7,}$/.test(sender.trim())) {
      const senderCleaned = normalizeArabicText(sender);
      if (ARABIC_NAME_RE.test(senderCleaned) && senderCleaned.length >= 2) {
        addResult(senderCleaned, 'مرسل', 0.60, 'sender_name');
      }
    }

    return results;
  }

  async getUnlinkedNames(batchId?: number): Promise<WaEntityAlias[]> {
    if (batchId) {
      return db.select()
        .from(waEntityAliases)
        .where(
          and(
            isNull(waEntityAliases.canonicalEntityId),
            eq(waEntityAliases.sourceBatchId, batchId)
          )
        )
        .orderBy(waEntityAliases.aliasName);
    }
    return db.select()
      .from(waEntityAliases)
      .where(isNull(waEntityAliases.canonicalEntityId))
      .orderBy(waEntityAliases.aliasName);
  }

  async getDiscoveredNames(batchId: number) {
    const results = await db.select({
      id: waEntityAliases.id,
      aliasName: waEntityAliases.aliasName,
      aliasNameNormalized: waEntityAliases.aliasNameNormalized,
      entityType: waEntityAliases.entityType,
      canonicalEntityId: waEntityAliases.canonicalEntityId,
      entityTable: waEntityAliases.entityTable,
      sourceBatchId: waEntityAliases.sourceBatchId,
      sourceMessageId: waEntityAliases.sourceMessageId,
      extractionMethod: waEntityAliases.extractionMethod,
      isVerified: waEntityAliases.isVerified,
      isActive: waEntityAliases.isActive,
      confidence: waEntityAliases.confidence,
      occurrenceCount: waEntityAliases.occurrenceCount,
      context: waEntityAliases.context,
      firstSeenAt: waEntityAliases.firstSeenAt,
      lastSeenAt: waEntityAliases.lastSeenAt,
      createdAt: waEntityAliases.createdAt,
      sourceMessageText: waRawMessages.messageText,
      sourceSender: waRawMessages.sender,
    })
      .from(waEntityAliases)
      .leftJoin(waRawMessages, eq(waEntityAliases.sourceMessageId, waRawMessages.id))
      .where(eq(waEntityAliases.sourceBatchId, batchId))
      .orderBy(waEntityAliases.aliasName);

    const linkedIds = results
      .filter(r => r.canonicalEntityId && r.entityTable)
      .map(r => ({ id: r.canonicalEntityId!, table: r.entityTable! }));

    const entityNameMap: Record<string, string> = {};
    if (linkedIds.length > 0) {
      try {
        const workerIds = linkedIds.filter(l => l.table === 'workers').map(l => l.id);
        const projectIds = linkedIds.filter(l => l.table === 'projects').map(l => l.id);
        const accountIds = linkedIds.filter(l => l.table === 'account_types').map(l => l.id);

        if (workerIds.length > 0) {
          const { rows } = await pool.query(
            `SELECT id::text, name FROM workers WHERE id::text = ANY($1)`,
            [workerIds]
          );
          for (const r of rows) entityNameMap[`workers:${r.id}`] = r.name;
        }
        if (projectIds.length > 0) {
          const { rows } = await pool.query(
            `SELECT id::text, name FROM projects WHERE id::text = ANY($1)`,
            [projectIds]
          );
          for (const r of rows) entityNameMap[`projects:${r.id}`] = r.name;
        }
        if (accountIds.length > 0) {
          const { rows } = await pool.query(
            `SELECT id::text, name FROM account_types WHERE id::text = ANY($1)`,
            [accountIds]
          );
          for (const r of rows) entityNameMap[`account_types:${r.id}`] = r.name;
        }
      } catch (err) {
        console.warn("[getDiscoveredNames] Failed to resolve entity names:", err);
      }
    }

    return results.map(r => ({
      ...r,
      linkedEntityName: r.canonicalEntityId && r.entityTable
        ? entityNameMap[`${r.entityTable}:${r.canonicalEntityId}`] || null
        : null,
    }));
  }

  async linkNameToEntity(
    aliasId: number,
    entityId: string,
    entityTable: string,
    userId: string,
    reason?: string
  ): Promise<void> {
    const [alias] = await db.select()
      .from(waEntityAliases)
      .where(eq(waEntityAliases.id, aliasId))
      .limit(1);

    if (!alias) throw new Error(`Alias ${aliasId} not found`);

    await db.update(waEntityAliases)
      .set({
        canonicalEntityId: entityId,
        entityTable,
        isVerified: true,
        verifiedBy: userId,
        verifiedAt: sql`NOW()`,
        updatedBy: userId,
        updatedAt: sql`NOW()`,
      })
      .where(eq(waEntityAliases.id, aliasId));

    await db.insert(waEntityLinkAudit).values({
      entityAliasId: aliasId,
      action: 'link',
      previousEntityId: alias.canonicalEntityId || null,
      newEntityId: entityId,
      previousEntityType: alias.entityTable || null,
      newEntityType: entityTable,
      reason: reason || null,
      performedBy: userId,
    });
  }

  async unlinkName(aliasId: number, userId: string, reason?: string): Promise<void> {
    const [alias] = await db.select()
      .from(waEntityAliases)
      .where(eq(waEntityAliases.id, aliasId))
      .limit(1);

    if (!alias) throw new Error(`Alias ${aliasId} not found`);

    const oldEntityId = alias.canonicalEntityId;
    const oldEntityTable = alias.entityTable;

    await db.update(waEntityAliases)
      .set({
        canonicalEntityId: null,
        isVerified: false,
        updatedBy: userId,
        updatedAt: sql`NOW()`,
      })
      .where(eq(waEntityAliases.id, aliasId));

    await db.insert(waEntityLinkAudit).values({
      entityAliasId: aliasId,
      action: 'unlink',
      previousEntityId: oldEntityId || null,
      newEntityId: null,
      previousEntityType: oldEntityTable || null,
      newEntityType: null,
      reason: reason || null,
      performedBy: userId,
    });
  }

  async bulkLinkNames(
    links: Array<{ aliasId: number; entityId: string; entityTable?: string }>,
    userId: string
  ): Promise<{ linked: number; errors: string[] }> {
    let linked = 0;
    const errors: string[] = [];

    for (const link of links) {
      try {
        await this.linkNameToEntity(
          link.aliasId,
          link.entityId,
          link.entityTable || 'workers',
          userId
        );
        linked++;
      } catch (err: any) {
        errors.push(`Alias ${link.aliasId}: ${err.message}`);
      }
    }

    return { linked, errors };
  }

  async autoLinkByExactMatch(batchId?: number): Promise<{ linked: number; partialMatches: number }> {
    const allWorkers = await db.select({
      id: workers.id,
      name: workers.name,
    }).from(workers).where(eq(workers.is_active, true));

    const conditions = [
      isNull(waEntityAliases.canonicalEntityId),
      eq(waEntityAliases.isActive, true),
    ];
    if (batchId) {
      conditions.push(eq(waEntityAliases.sourceBatchId, batchId));
    }
    const unlinked = await db.select()
      .from(waEntityAliases)
      .where(and(...conditions));

    let linked = 0;
    let partialMatches = 0;

    const workersByNormalized = new Map<string, { id: string; name: string }>();
    const workersByFirstName = new Map<string, { id: string; name: string }[]>();

    for (const w of allWorkers) {
      const normalized = normalizeForMatching(w.name);
      workersByNormalized.set(normalized, { id: w.id, name: w.name });

      const firstName = normalized.split(/\s+/)[0];
      if (firstName && firstName.length > 1) {
        const existing = workersByFirstName.get(firstName) || [];
        existing.push({ id: w.id, name: w.name });
        workersByFirstName.set(firstName, existing);
      }
    }

    for (const alias of unlinked) {
      const normalizedAlias = normalizeForMatching(alias.aliasName);

      const exactMatch = workersByNormalized.get(normalizedAlias);
      if (exactMatch) {
        try {
          await db.update(waEntityAliases)
            .set({
              canonicalEntityId: exactMatch.id,
              entityTable: 'workers',
              isVerified: true,
              extractionMethod: 'auto_exact_match',
              confidence: '0.9500',
              updatedAt: sql`NOW()`,
            })
            .where(eq(waEntityAliases.id, alias.id));

          await db.insert(waEntityLinkAudit).values({
            entityAliasId: alias.id,
            action: 'auto_link',
            newEntityId: exactMatch.id,
            newEntityType: 'workers',
            reason: `Exact match: "${alias.aliasName}" = "${exactMatch.name}"`,
          });

          linked++;
          continue;
        } catch (_err) {
        }
      }

      const aliasFirstName = normalizedAlias.split(/\s+/)[0];
      if (aliasFirstName && aliasFirstName.length > 2) {
        const candidates = workersByFirstName.get(aliasFirstName);
        if (candidates && candidates.length === 1) {
          try {
            await db.update(waEntityAliases)
              .set({
                canonicalEntityId: candidates[0].id,
                entityTable: 'workers',
                isVerified: false,
                extractionMethod: 'auto_partial_match',
                confidence: '0.6000',
                updatedAt: sql`NOW()`,
              })
              .where(eq(waEntityAliases.id, alias.id));

            await db.insert(waEntityLinkAudit).values({
              entityAliasId: alias.id,
              action: 'auto_partial_link',
              newEntityId: candidates[0].id,
              newEntityType: 'workers',
              reason: `Partial match (first name): "${aliasFirstName}" in "${candidates[0].name}"`,
            });

            partialMatches++;
          } catch (_err) {
          }
        }
      }
    }

    return { linked, partialMatches };
  }

  async checkLinkingReadiness(batchId: number): Promise<LinkingReadiness> {
    const totalResult = await db.select({ count: sql<number>`count(*)` })
      .from(waEntityAliases)
      .where(eq(waEntityAliases.sourceBatchId, batchId));

    const linkedResult = await db.select({ count: sql<number>`count(*)` })
      .from(waEntityAliases)
      .where(
        and(
          eq(waEntityAliases.sourceBatchId, batchId),
          sql`${waEntityAliases.canonicalEntityId} IS NOT NULL`
        )
      );

    const total = Number(totalResult[0]?.count ?? 0);
    const linked = Number(linkedResult[0]?.count ?? 0);
    const unlinked = total - linked;
    const linkedPercent = total > 0 ? Math.round((linked / total) * 100) : 0;

    return {
      total,
      linked,
      unlinked,
      linkedPercent,
      isReady: linkedPercent >= 90,
    };
  }
}

export const nameExtractionService = new NameExtractionService();
