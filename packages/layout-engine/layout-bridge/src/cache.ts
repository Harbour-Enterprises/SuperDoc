import type { FlowBlock } from '@superdoc/contracts';
import { hasTrackedChange, resolveTrackedChangesEnabled } from './tracked-changes-utils.js';

/**
 * Maximum cache size (number of entries)
 * Based on profiling: 500-page doc uses ~3,000 entries
 * 10K provides 3× safety margin while preventing unbounded growth
 */
const MAX_CACHE_SIZE = 10_000;

/**
 * Estimated memory per cache entry (bytes)
 * Used for memory usage reporting (rough estimate)
 */
const BYTES_PER_ENTRY_ESTIMATE = 5_000; // ~5KB per entry

const NORMALIZED_WHITESPACE = /\s+/g;
const normalizeText = (text: string) => text.replace(NORMALIZED_WHITESPACE, ' ');

const hashRuns = (block: FlowBlock): string => {
  if (block.kind !== 'paragraph') return block.id;
  const trackedMode =
    (block.attrs && 'trackedChangesMode' in block.attrs && block.attrs.trackedChangesMode) || 'review';
  const trackedEnabled = resolveTrackedChangesEnabled(block.attrs, true);
  const runsHash = block.runs
    .map((run) => {
      const text = normalizeText(run.kind === 'image' ? '' : (run.text ?? ''));
      const bold = 'bold' in run ? run.bold : false;
      const italic = 'italic' in run ? run.italic : false;
      const color = 'color' in run ? run.color : undefined;
      const marks = [bold ? 'b' : '', italic ? 'i' : '', color ?? ''].join('');

      // Include tracked change metadata in hash
      let trackedKey = '';
      if (hasTrackedChange(run)) {
        const tc = run.trackedChange;
        const beforeHash = tc.before ? JSON.stringify(tc.before) : '';
        const afterHash = tc.after ? JSON.stringify(tc.after) : '';
        trackedKey = `|tc:${tc.kind ?? ''}:${tc.id ?? ''}:${tc.author ?? ''}:${tc.date ?? ''}:${beforeHash}:${afterHash}`;
      }

      return `${text}:${marks}${trackedKey}`;
    })
    .join('|');
  return `${trackedMode}:${trackedEnabled ? 'on' : 'off'}|${runsHash}`;
};

/**
 * Cache statistics with LRU eviction tracking
 */
export type MeasureCacheStats = {
  hits: number;
  misses: number;
  sets: number;
  invalidations: number;
  clears: number;
  /**
   * Number of entries evicted due to LRU policy
   */
  evictions: number;
  /**
   * Current cache size (number of entries)
   */
  size: number;
  /**
   * Estimated memory usage (bytes)
   */
  memorySizeEstimate: number;
};

const createStats = (): MeasureCacheStats => ({
  hits: 0,
  misses: 0,
  sets: 0,
  invalidations: 0,
  clears: 0,
  evictions: 0,
  size: 0,
  memorySizeEstimate: 0,
});

/**
 * Maximum allowed dimension for cache keys.
 * Prevents memory exhaustion from pathological inputs.
 */
const MAX_DIMENSION = 1_000_000;

/**
 * LRU-enhanced MeasureCache
 *
 * Key improvements:
 * 1. Bounded size: max 10,000 entries
 * 2. LRU eviction: Evicts least recently used when full
 * 3. O(1) access and eviction using Map insertion order
 * 4. Memory usage estimation
 * 5. Eviction statistics
 *
 * Performance characteristics:
 * - get(): O(1) - Map lookup + delete + re-insert for LRU tracking
 * - set(): O(1) - eviction (delete first key) + insert
 * - invalidate(): O(n) - where n = number of keys matching blockId prefix
 * - Memory: Bounded at 10K entries ~= 50-100MB
 */
export class MeasureCache<T> {
  private cache = new Map<string, T>();
  private stats: MeasureCacheStats = createStats();

  /**
   * Retrieve a cached measure for the given block and dimensions.
   * Returns undefined if the block is null/undefined, lacks an ID, or if no cached value exists.
   *
   * @param block - The flow block to look up (may be null/undefined)
   * @param width - The width dimension for cache key
   * @param height - The height dimension for cache key
   * @returns The cached value or undefined
   */
  public get(block: FlowBlock | null | undefined, width: number, height: number): T | undefined {
    // Safety: Validate block exists and has required properties before accessing
    // This prevents invalid cache keys from null/undefined blocks
    if (!block || !block.id) {
      return undefined;
    }

    const key = this.composeKey(block, width, height);
    const value = this.cache.get(key);

    if (value !== undefined) {
      this.stats.hits += 1;

      // Move to end (most recently used)
      // JavaScript Map maintains insertion order, so delete + re-insert moves to end
      this.cache.delete(key);
      this.cache.set(key, value);

      return value;
    } else {
      this.stats.misses += 1;
      return undefined;
    }
  }

  /**
   * Store a measure in the cache for the given block and dimensions.
   * Silently returns if the block is null/undefined or lacks an ID.
   *
   * @param block - The flow block to cache (may be null/undefined)
   * @param width - The width dimension for cache key
   * @param height - The height dimension for cache key
   * @param value - The value to cache
   */
  public set(block: FlowBlock | null | undefined, width: number, height: number, value: T): void {
    // Safety: Validate block exists and has required properties before caching
    // This prevents invalid cache keys and silent failures
    if (!block || !block.id) {
      return;
    }

    const key = this.composeKey(block, width, height);

    // If key already exists, delete it first (will be re-added at end)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Check if cache is full (before adding new entry)
    if (this.cache.size >= MAX_CACHE_SIZE) {
      // Evict oldest entry (first in Map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
        this.stats.evictions += 1;
      }
    }

    // Add new entry (goes to end of Map)
    this.cache.set(key, value);
    this.stats.sets += 1;

    // Update size stats
    this.updateSizeStats();
  }

  /**
   * Invalidates cached measurements for specific block IDs.
   * Removes all cache entries whose keys start with any of the provided block IDs.
   *
   * @param blockIds - Array of block IDs to invalidate from the cache
   *
   * @example
   * ```typescript
   * cache.invalidate(['block-123', 'block-456']);
   * ```
   */
  public invalidate(blockIds: string[]): void {
    let removed = 0;
    blockIds.forEach((id) => {
      for (const key of this.cache.keys()) {
        if (key.startsWith(id + '@')) {
          this.cache.delete(key);
          removed += 1;
        }
      }
    });
    this.stats.invalidations += removed;
    this.updateSizeStats();
  }

  /**
   * Clears all cached measurements and resets statistics.
   * Use when performing a full document re-layout.
   */
  public clear(): void {
    this.cache.clear();
    this.stats.clears += 1;
    this.updateSizeStats();
  }

  /**
   * Resets cache statistics (hits, misses, sets) to zero.
   * Does not clear cached values.
   */
  public resetStats(): void {
    const currentSize = this.cache.size;
    const currentMemory = currentSize * BYTES_PER_ENTRY_ESTIMATE;
    this.stats = createStats();
    this.stats.size = currentSize;
    this.stats.memorySizeEstimate = currentMemory;
  }

  /**
   * Returns current cache performance statistics.
   * Useful for monitoring cache effectiveness.
   *
   * @returns Object containing hits, misses, sets, and hit rate
   */
  public getStats(): MeasureCacheStats {
    return { ...this.stats };
  }

  /**
   * Get current cache size (number of entries)
   */
  public getSize(): number {
    return this.cache.size;
  }

  /**
   * Get maximum cache size
   */
  public getMaxSize(): number {
    return MAX_CACHE_SIZE;
  }

  /**
   * Check if cache is near capacity
   */
  public isNearCapacity(threshold = 0.9): boolean {
    return this.cache.size >= MAX_CACHE_SIZE * threshold;
  }

  /**
   * Update size statistics
   */
  private updateSizeStats(): void {
    this.stats.size = this.cache.size;
    this.stats.memorySizeEstimate = this.cache.size * BYTES_PER_ENTRY_ESTIMATE;
  }

  /**
   * Composes a cache key from block properties and dimensions.
   * Validates and clamps dimensions to prevent memory exhaustion.
   *
   * @param block - The flow block to create a key for
   * @param width - Width dimension (will be clamped to [0, MAX_DIMENSION])
   * @param height - Height dimension (will be clamped to [0, MAX_DIMENSION])
   * @returns Cache key string
   */
  private composeKey(block: FlowBlock, width: number, height: number): string {
    const safeWidth = Number.isFinite(width) ? Math.max(0, Math.min(Math.floor(width), MAX_DIMENSION)) : 0;
    const safeHeight = Number.isFinite(height) ? Math.max(0, Math.min(Math.floor(height), MAX_DIMENSION)) : 0;
    const hash = hashRuns(block);
    return `${block.id}@${safeWidth}x${safeHeight}:${hash}`;
  }
}
