import { db } from "../../db.js";
import { waWorkerAliases, workers } from "@shared/schema";
import type { WaWorkerAlias, InsertWaWorkerAlias } from "@shared/schema";
import { eq } from "drizzle-orm";

const KNOWN_ALIASES: Array<{ alias: string; workerId: string }> = [
  { alias: 'النخرة', workerId: '6066edb5' },
  { alias: 'عمي احمد', workerId: '51165865' },
  { alias: 'الحج احمد', workerId: '51165865' },
  { alias: 'سعيد', workerId: 'w004-سعيد' },
  { alias: 'سعيد الحداد', workerId: 'w004-سعيد' },
  { alias: 'عبدالله الخلاطة', workerId: '47f0c37a' },
  { alias: 'عبدالله سواق الخلاطة', workerId: '47f0c37a' },
  { alias: 'عمال الحفر', workerId: '1389a5ea' },
  { alias: 'عمال حفر', workerId: '1389a5ea' },
  { alias: 'عمال الصبة', workerId: '2943956a' },
  { alias: 'نجار باجل', workerId: '78c1e5ab' },
  { alias: 'نجار من باجل', workerId: '78c1e5ab' },
  { alias: 'ناجي', workerId: '0350b938' },
  { alias: 'ناجي المساعد', workerId: '0350b938' },
  { alias: 'حسن النجار', workerId: 'd9f327e5' },
  { alias: 'حسن', workerId: 'd9f327e5' },
  { alias: 'محمد حسن نجار', workerId: 'd9f327e5' },
];

export class WhatsAppAliasService {
  private aliasCache: Map<string, string | null> | null = null;
  private cacheExpiry: number = 0;

  async loadCache(): Promise<Map<string, string | null>> {
    if (this.aliasCache && Date.now() < this.cacheExpiry) {
      return this.aliasCache;
    }
    const allAliases = await db.select().from(waWorkerAliases);
    this.aliasCache = new Map<string, string | null>();
    for (const alias of allAliases) {
      this.aliasCache.set(alias.aliasName, alias.canonicalWorkerId);
    }
    this.cacheExpiry = Date.now() + 5 * 60 * 1000;
    return this.aliasCache;
  }

  clearCache(): void {
    this.aliasCache = null;
    this.cacheExpiry = 0;
  }

  async seedAliases(createdBy?: string): Promise<{ seeded: number; skipped: number }> {
    let seeded = 0;
    let skipped = 0;

    for (const { alias, workerId } of KNOWN_ALIASES) {
      try {
        const existing = await db.select()
          .from(waWorkerAliases)
          .where(eq(waWorkerAliases.aliasName, alias))
          .limit(1);

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        const worker = await db.select()
          .from(workers)
          .where(eq(workers.id, workerId))
          .limit(1);

        if (worker.length === 0) {
          console.warn(`[WAAlias] Worker ${workerId} not found for alias "${alias}", skipping`);
          skipped++;
          continue;
        }

        await db.insert(waWorkerAliases).values({
          aliasName: alias,
          canonicalWorkerId: workerId,
          createdBy: createdBy || null,
        });
        seeded++;
      } catch (err: any) {
        console.warn(`[WAAlias] Failed to seed alias "${alias}": ${err.message}`);
        skipped++;
      }
    }

    return { seeded, skipped };
  }

  async createMissingWorkers(createdBy: string): Promise<string[]> {
    const createdIds: string[] = [];

    const newWorkers = [
      { name: 'عدنان محمد حسين حمدين', type: 'متطوع', dailyWage: '0' },
      { name: 'عبداللة العباسي', type: 'عامل', dailyWage: '0' },
    ];

    for (const w of newWorkers) {
      const existing = await db.select()
        .from(workers)
        .where(eq(workers.name, w.name))
        .limit(1);

      if (existing.length > 0) {
        createdIds.push(existing[0].id);
        continue;
      }

      const [created] = await db.insert(workers).values({
        name: w.name,
        type: w.type,
        dailyWage: w.dailyWage,
        created_by: createdBy,
      }).returning();

      createdIds.push(created.id);

      if (w.name === 'عدنان محمد حسين حمدين') {
        await db.insert(waWorkerAliases).values({
          aliasName: 'ابو فارس',
          canonicalWorkerId: created.id,
          createdBy,
        });
      }
    }

    return createdIds;
  }

  async resolveAlias(name: string): Promise<string | null> {
    const cache = await this.loadCache();
    return cache.get(name) || null;
  }

  async getAliases(): Promise<WaWorkerAlias[]> {
    return db.select().from(waWorkerAliases).orderBy(waWorkerAliases.aliasName);
  }

  async createAlias(data: InsertWaWorkerAlias): Promise<WaWorkerAlias> {
    const [created] = await db.insert(waWorkerAliases).values(data).returning();
    this.clearCache();
    return created;
  }

  async updateAlias(id: number, data: Partial<InsertWaWorkerAlias>): Promise<WaWorkerAlias | undefined> {
    const [updated] = await db.update(waWorkerAliases)
      .set(data)
      .where(eq(waWorkerAliases.id, id))
      .returning();
    this.clearCache();
    return updated;
  }

  async deleteAlias(id: number): Promise<void> {
    await db.delete(waWorkerAliases).where(eq(waWorkerAliases.id, id));
    this.clearCache();
  }
}

export const waAliasService = new WhatsAppAliasService();
