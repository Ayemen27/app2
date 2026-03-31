/**
 * MemoryCacheService
 * ------------------
 * Unified in-memory cache with:
 * - TTL expiry per entry
 * - LRU eviction when maxSize is reached
 * - Tag-based invalidation (invalidate groups by tag)
 * - Hit/miss metrics
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  invalidations: number;
}

class MemoryCacheService {
  private store = new Map<string, CacheEntry<any>>();
  private tagIndex = new Map<string, Set<string>>();
  private metrics: CacheMetrics = { hits: 0, misses: 0, evictions: 0, invalidations: 0 };
  private maxSize: number;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
    setInterval(() => this.evictExpired(), 60_000);
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.metrics.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.metrics.misses++;
      return null;
    }
    this.metrics.hits++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number, tags: string[] = []): void {
    if (this.store.size >= this.maxSize) {
      this.evictOldest();
    }
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttlMs,
      tags,
    };
    this.store.set(key, entry);
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
      this.tagIndex.get(tag)!.add(key);
    }
  }

  invalidateKey(key: string): void {
    const entry = this.store.get(key);
    if (entry) {
      for (const tag of entry.tags) {
        this.tagIndex.get(tag)?.delete(key);
      }
      this.store.delete(key);
      this.metrics.invalidations++;
    }
  }

  invalidateByTag(tag: string): void {
    const keys = this.tagIndex.get(tag);
    if (!keys) return;
    for (const key of keys) {
      this.store.delete(key);
      this.metrics.invalidations++;
    }
    this.tagIndex.delete(tag);
  }

  invalidateByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.invalidateKey(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
    this.tagIndex.clear();
    this.metrics.invalidations++;
  }

  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      size: this.store.size,
      hitRate: total > 0 ? ((this.metrics.hits / total) * 100).toFixed(1) + '%' : 'N/A',
    };
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        for (const tag of entry.tags) {
          this.tagIndex.get(tag)?.delete(key);
        }
        this.metrics.evictions++;
      }
    }
  }

  private evictOldest(): void {
    const first = this.store.keys().next().value;
    if (first) {
      this.invalidateKey(first);
      this.metrics.evictions++;
    }
  }
}

export const appCache = new MemoryCacheService(1000);

export const CACHE_TTL = {
  PROJECT_STATS:    3 * 60_000,
  PROJECT_BALANCE:  2 * 60_000,
  REPORT:          10 * 60_000,
  USER_SESSION:    30 * 60_000,
} as const;

export const CACHE_TAGS = {
  PROJECT_STATS:   (id: string) => `project-stats:${id}`,
  ALL_STATS:       'all-project-stats',
  FINANCIALS:      (id: string) => `financials:${id}`,
  WORKERS:         (id: string) => `workers:${id}`,
} as const;

/**
 * Convenience helper: invalidate all cached stats for a project (or all projects).
 * Import this from any mutation route — no circular dependencies.
 */
export function invalidateProjectStats(projectId?: string): void {
  if (projectId) {
    appCache.invalidateByPrefix(`balance:${projectId}:`);
    appCache.invalidateByTag(CACHE_TAGS.PROJECT_STATS(projectId));
  }
  appCache.invalidateByTag(CACHE_TAGS.ALL_STATS);
  appCache.invalidateByPrefix('stats:');
}
