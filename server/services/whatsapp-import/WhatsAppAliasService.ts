import { db } from "../../db.js";
import { waEntityAliases, workers } from "@shared/schema";
import type { WaEntityAlias } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { normalizeArabicText } from './ArabicAmountParser.js';

function normalizeAliasName(name: string): string {
  return normalizeArabicText(name.trim().replace(/[\u200F\u200E\u202A\u202B\u202C\u200B]/g, ''));
}

export class WhatsAppAliasService {
  private aliasCache: Map<string, string | null> | null = null;
  private cacheExpiry: number = 0;

  async loadCache(): Promise<Map<string, string | null>> {
    if (this.aliasCache && Date.now() < this.cacheExpiry) {
      return this.aliasCache;
    }
    const allAliases = await db.select().from(waEntityAliases)
      .where(and(
        eq(waEntityAliases.isVerified, true),
        eq(waEntityAliases.isActive, true)
      ));
    this.aliasCache = new Map<string, string | null>();
    for (const alias of allAliases) {
      this.aliasCache.set(normalizeAliasName(alias.aliasName), alias.canonicalEntityId);
    }
    this.cacheExpiry = Date.now() + 5 * 60 * 1000;
    return this.aliasCache;
  }

  clearCache(): void {
    this.aliasCache = null;
    this.cacheExpiry = 0;
  }

  async resolveAlias(name: string): Promise<string | null> {
    const cache = await this.loadCache();
    const normalized = normalizeAliasName(name);
    return cache.get(normalized) || null;
  }

  async resolveAnyAlias(name: string): Promise<WaEntityAlias | null> {
    const normalized = normalizeAliasName(name);
    const results = await db.select().from(waEntityAliases)
      .where(eq(waEntityAliases.aliasNameNormalized, normalized))
      .limit(1);
    return results[0] || null;
  }

  async getAliases(): Promise<WaEntityAlias[]> {
    return db.select().from(waEntityAliases).orderBy(waEntityAliases.aliasName);
  }

  async createAlias(data: {
    aliasName: string;
    entityType?: string;
    canonicalEntityId?: string;
    entityTable?: string;
    createdBy?: string | null;
  }): Promise<WaEntityAlias> {
    const [created] = await db.insert(waEntityAliases).values({
      aliasName: data.aliasName,
      aliasNameNormalized: normalizeAliasName(data.aliasName),
      entityType: data.entityType || 'عامل',
      canonicalEntityId: data.canonicalEntityId || null,
      entityTable: data.entityTable || 'workers',
      createdBy: data.createdBy || null,
    }).returning();
    this.clearCache();
    return created;
  }

  async updateAlias(id: number, data: Partial<{
    aliasName: string;
    entityType: string;
    canonicalEntityId: string | null;
    entityTable: string;
    isVerified: boolean;
    isActive: boolean;
    updatedBy: string;
  }>): Promise<WaEntityAlias | undefined> {
    const updateData: Record<string, any> = { ...data, updatedAt: new Date() };
    if (data.aliasName) {
      updateData.aliasNameNormalized = normalizeAliasName(data.aliasName);
    }
    const [updated] = await db.update(waEntityAliases)
      .set(updateData)
      .where(eq(waEntityAliases.id, id))
      .returning();
    this.clearCache();
    return updated;
  }

  async deleteAlias(id: number): Promise<void> {
    await db.delete(waEntityAliases).where(eq(waEntityAliases.id, id));
    this.clearCache();
  }
}

export const waAliasService = new WhatsAppAliasService();
