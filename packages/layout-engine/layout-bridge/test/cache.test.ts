import { describe, it, expect, beforeEach } from 'vitest';
import { MeasureCache } from '../src/cache';
import type { FlowBlock } from '@superdoc/contracts';

const block = (id: string, text: string): FlowBlock => ({
  kind: 'paragraph',
  id,
  runs: [{ text, fontFamily: 'Arial', fontSize: 16 }],
});

describe('MeasureCache', () => {
  let cache: MeasureCache<{ totalHeight: number }>;

  beforeEach(() => {
    cache = new MeasureCache();
  });

  it('stores and retrieves cached values', () => {
    const item = block('0-paragraph', 'hello');
    cache.set(item, 400, 600, { totalHeight: 20 });
    expect(cache.get(item, 400, 600)?.totalHeight).toBe(20);
    expect(cache.get(item, 300, 600)).toBeUndefined();
    expect(cache.get(item, 400, 500)).toBeUndefined();
  });

  it('invalidates entries by block id', () => {
    const item = block('0-paragraph', 'hello');
    cache.set(item, 400, 600, { totalHeight: 20 });
    cache.invalidate(['0-paragraph']);
    expect(cache.get(item, 400, 600)).toBeUndefined();
  });

  it('clears all entries', () => {
    const item = block('0-paragraph', 'hello');
    cache.set(item, 400, 600, { totalHeight: 20 });
    cache.clear();
    expect(cache.get(item, 400, 600)).toBeUndefined();
  });

  describe('edge cases', () => {
    it('handles null blocks in get()', () => {
      expect(cache.get(null as any, 100, 200)).toBeUndefined();
    });

    it('handles undefined blocks in get()', () => {
      expect(cache.get(undefined as any, 100, 200)).toBeUndefined();
    });

    it('handles blocks without ID', () => {
      const blockWithoutId = { kind: 'paragraph', runs: [] } as any;
      expect(cache.get(blockWithoutId, 100, 200)).toBeUndefined();
    });

    it('handles NaN dimensions', () => {
      const item = block('block1', 'test');
      cache.set(item, NaN, 200, { totalHeight: 10 });
      expect(cache.get(item, NaN, 200)).toEqual({ totalHeight: 10 });
      // NaN should be converted to 0
      expect(cache.get(item, 0, 200)).toEqual({ totalHeight: 10 });
    });

    it('handles Infinity dimensions', () => {
      const item = block('block1', 'test');
      cache.set(item, Infinity, 200, { totalHeight: 10 });
      expect(cache.get(item, Infinity, 200)).toEqual({ totalHeight: 10 });
      // Infinity should be converted to 0
      expect(cache.get(item, 0, 200)).toEqual({ totalHeight: 10 });
    });

    it('handles negative dimensions', () => {
      const item = block('block1', 'test');
      cache.set(item, -100, -200, { totalHeight: 10 });
      // Negative values should be clamped to 0
      expect(cache.get(item, 0, 0)).toEqual({ totalHeight: 10 });
    });

    it('handles extremely large dimension values', () => {
      const item = block('block1', 'test');
      cache.set(item, 10_000_000, 10_000_000, { totalHeight: 10 });
      // Values should be clamped to MAX_DIMENSION (1_000_000)
      expect(cache.get(item, 1_000_000, 1_000_000)).toEqual({ totalHeight: 10 });
    });

    it('invalidates with empty array', () => {
      const item = block('block1', 'test');
      cache.set(item, 100, 200, { totalHeight: 10 });
      cache.invalidate([]);
      expect(cache.get(item, 100, 200)).toEqual({ totalHeight: 10 });
    });

    it('invalidates with non-existent block IDs', () => {
      const item = block('block1', 'test');
      cache.set(item, 100, 200, { totalHeight: 10 });
      cache.invalidate(['nonexistent']);
      expect(cache.get(item, 100, 200)).toEqual({ totalHeight: 10 });
    });

    it('tracks stats correctly across operations', () => {
      const item = block('block1', 'test');

      cache.set(item, 100, 200, { totalHeight: 10 });
      let stats = cache.getStats();
      expect(stats.sets).toBe(1);

      cache.get(item, 100, 200); // hit
      cache.get(item, 200, 300); // miss

      stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.sets).toBe(1);
    });

    it('handles fractional dimensions by flooring', () => {
      const item = block('block1', 'test');
      cache.set(item, 100.7, 200.9, { totalHeight: 10 });
      // Fractional values should be floored
      expect(cache.get(item, 100, 200)).toEqual({ totalHeight: 10 });
      expect(cache.get(item, 100.3, 200.5)).toEqual({ totalHeight: 10 });
    });

    it('handles null blocks in set() gracefully', () => {
      expect(() => cache.set(null as any, 100, 200, { totalHeight: 10 })).not.toThrow();
      // Should not be retrievable
      expect(cache.get(null as any, 100, 200)).toBeUndefined();
    });

    it('handles undefined blocks in set() gracefully', () => {
      expect(() => cache.set(undefined as any, 100, 200, { totalHeight: 10 })).not.toThrow();
      // Should not be retrievable
      expect(cache.get(undefined as any, 100, 200)).toBeUndefined();
    });
  });
});
