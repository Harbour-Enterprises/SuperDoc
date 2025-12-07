import { describe, it, expect, beforeEach } from 'vitest';
import { MeasureCache } from '../src/cache';
import type { FlowBlock, ImageRun, TableBlock, TableCell } from '@superdoc/contracts';

const block = (id: string, text: string): FlowBlock => ({
  kind: 'paragraph',
  id,
  runs: [{ text, fontFamily: 'Arial', fontSize: 16 }],
});

const imageRun = (src: string, width: number, height: number): ImageRun => ({
  kind: 'image',
  src,
  width,
  height,
});

const blockWithImage = (id: string, imgRun: ImageRun): FlowBlock => ({
  kind: 'paragraph',
  id,
  runs: [imgRun],
});

/**
 * Creates a table block with specified cell content for testing.
 * Supports both new multi-block cells and legacy single paragraph cells.
 */
const tableBlock = (id: string, cellContents: string[][], useMultiBlock = false): TableBlock => ({
  kind: 'table',
  id,
  rows: cellContents.map((rowCells, rowIndex) => ({
    id: `${id}-row-${rowIndex}`,
    cells: rowCells.map((cellText, cellIndex) => {
      const cellId = `${id}-cell-${rowIndex}-${cellIndex}`;
      const paragraph = {
        kind: 'paragraph' as const,
        id: `${cellId}-para`,
        runs: [{ text: cellText, fontFamily: 'Arial', fontSize: 12 }],
      };

      const cell: TableCell = {
        id: cellId,
      };

      if (useMultiBlock) {
        cell.blocks = [paragraph];
      } else {
        cell.paragraph = paragraph;
      }

      return cell;
    }),
  })),
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

  describe('image run caching', () => {
    it('creates different cache keys for images with different dimensions', () => {
      const block1 = blockWithImage('p1', imageRun('data:image/png;base64,abc', 100, 50));
      const block2 = blockWithImage('p1', imageRun('data:image/png;base64,abc', 200, 100));

      cache.set(block1, 400, 600, { totalHeight: 20 });
      // Different dimensions should result in cache miss
      expect(cache.get(block2, 400, 600)).toBeUndefined();
    });

    it('creates cache hit for images with same dimensions', () => {
      const block1 = blockWithImage('p1', imageRun('data:image/png;base64,abc', 100, 50));
      const block2 = blockWithImage('p1', imageRun('data:image/png;base64,abc', 100, 50));

      cache.set(block1, 400, 600, { totalHeight: 20 });
      // Same dimensions should result in cache hit
      expect(cache.get(block2, 400, 600)).toEqual({ totalHeight: 20 });
    });

    it('creates different cache keys for images with different sources', () => {
      const block1 = blockWithImage('p1', imageRun('data:image/png;base64,abc', 100, 50));
      const block2 = blockWithImage('p1', imageRun('data:image/png;base64,xyz', 100, 50));

      cache.set(block1, 400, 600, { totalHeight: 20 });
      // Different src should result in cache miss
      expect(cache.get(block2, 400, 600)).toBeUndefined();
    });

    it('uses first 50 chars of src for hash (long sources)', () => {
      const longSrc1 = 'data:image/svg+xml;base64,' + 'A'.repeat(100);
      const longSrc2 = 'data:image/svg+xml;base64,' + 'A'.repeat(100);
      // These should match because first 50 chars are the same
      const block1 = blockWithImage('p1', imageRun(longSrc1, 100, 50));
      const block2 = blockWithImage('p1', imageRun(longSrc2, 100, 50));

      cache.set(block1, 400, 600, { totalHeight: 20 });
      expect(cache.get(block2, 400, 600)).toEqual({ totalHeight: 20 });
    });

    it('differentiates when first 50 chars differ (long sources)', () => {
      const longSrc1 = 'data:image/svg+xml;base64,AAAA' + 'X'.repeat(100);
      const longSrc2 = 'data:image/svg+xml;base64,BBBB' + 'X'.repeat(100);
      // First 50 chars differ, should be cache miss
      const block1 = blockWithImage('p1', imageRun(longSrc1, 100, 50));
      const block2 = blockWithImage('p1', imageRun(longSrc2, 100, 50));

      cache.set(block1, 400, 600, { totalHeight: 20 });
      expect(cache.get(block2, 400, 600)).toBeUndefined();
    });

    it('handles paragraphs with mixed text and image runs', () => {
      const mixedBlock1: FlowBlock = {
        kind: 'paragraph',
        id: 'p1',
        runs: [
          { text: 'Hello ', fontFamily: 'Arial', fontSize: 12 },
          imageRun('data:image/png;base64,abc', 100, 50),
          { text: ' World', fontFamily: 'Arial', fontSize: 12 },
        ],
      };
      const mixedBlock2: FlowBlock = {
        kind: 'paragraph',
        id: 'p1',
        runs: [
          { text: 'Hello ', fontFamily: 'Arial', fontSize: 12 },
          imageRun('data:image/png;base64,abc', 200, 100), // Different dimensions
          { text: ' World', fontFamily: 'Arial', fontSize: 12 },
        ],
      };

      cache.set(mixedBlock1, 400, 600, { totalHeight: 30 });
      // Image dimensions changed, should be cache miss
      expect(cache.get(mixedBlock2, 400, 600)).toBeUndefined();
    });

    it('handles paragraphs with multiple images', () => {
      const multiImageBlock1: FlowBlock = {
        kind: 'paragraph',
        id: 'p1',
        runs: [imageRun('img1.png', 100, 50), imageRun('img2.png', 80, 40)],
      };
      const multiImageBlock2: FlowBlock = {
        kind: 'paragraph',
        id: 'p1',
        runs: [
          imageRun('img1.png', 100, 50),
          imageRun('img2.png', 80, 60), // Second image height changed
        ],
      };

      cache.set(multiImageBlock1, 400, 600, { totalHeight: 25 });
      expect(cache.get(multiImageBlock2, 400, 600)).toBeUndefined();
    });

    it('invalidates image blocks by block id', () => {
      const imgBlock = blockWithImage('img-block', imageRun('test.png', 100, 100));
      cache.set(imgBlock, 400, 600, { totalHeight: 50 });

      cache.invalidate(['img-block']);
      expect(cache.get(imgBlock, 400, 600)).toBeUndefined();
    });
  });

  describe('table block caching', () => {
    it('invalidates cache when cell text changes', () => {
      const table1 = tableBlock('table-1', [
        ['Row 1 Cell 1', 'Row 1 Cell 2'],
        ['Row 2 Cell 1', 'Row 2 Cell 2'],
      ]);
      const table2 = tableBlock('table-1', [
        ['Row 1 Cell 1', 'Row 1 Cell 2 MODIFIED'],
        ['Row 2 Cell 1', 'Row 2 Cell 2'],
      ]);

      cache.set(table1, 800, 600, { totalHeight: 100 });
      // Different cell content should result in cache miss
      expect(cache.get(table2, 800, 600)).toBeUndefined();
    });

    it('creates cache hit when table content is identical', () => {
      const table1 = tableBlock('table-1', [
        ['Hello', 'World'],
        ['Foo', 'Bar'],
      ]);
      const table2 = tableBlock('table-1', [
        ['Hello', 'World'],
        ['Foo', 'Bar'],
      ]);

      cache.set(table1, 800, 600, { totalHeight: 100 });
      // Identical content should result in cache hit
      expect(cache.get(table2, 800, 600)).toEqual({ totalHeight: 100 });
    });

    it('handles multi-block cells (new format with blocks array)', () => {
      const table1 = tableBlock(
        'table-1',
        [
          ['Multi', 'Block'],
          ['Cell', 'Format'],
        ],
        true,
      );
      const table2 = tableBlock(
        'table-1',
        [
          ['Multi', 'Block'],
          ['Cell', 'Format'],
        ],
        true,
      );

      cache.set(table1, 800, 600, { totalHeight: 120 });
      // Multi-block format with identical content should cache hit
      expect(cache.get(table2, 800, 600)).toEqual({ totalHeight: 120 });
    });

    it('handles legacy single paragraph cells', () => {
      const table1 = tableBlock(
        'table-1',
        [
          ['Legacy', 'Format'],
          ['Test', 'Data'],
        ],
        false,
      );
      const table2 = tableBlock(
        'table-1',
        [
          ['Legacy', 'Format'],
          ['Test', 'Data'],
        ],
        false,
      );

      cache.set(table1, 800, 600, { totalHeight: 90 });
      // Legacy format with identical content should cache hit
      expect(cache.get(table2, 800, 600)).toEqual({ totalHeight: 90 });
    });

    it('handles empty tables', () => {
      const emptyTable1: TableBlock = {
        kind: 'table',
        id: 'empty-table',
        rows: [],
      };
      const emptyTable2: TableBlock = {
        kind: 'table',
        id: 'empty-table',
        rows: [],
      };

      cache.set(emptyTable1, 800, 600, { totalHeight: 0 });
      // Empty tables should cache hit
      expect(cache.get(emptyTable2, 800, 600)).toEqual({ totalHeight: 0 });
    });

    it('handles tables with no rows property', () => {
      const tableNoRows: TableBlock = {
        kind: 'table',
        id: 'table-no-rows',
        rows: undefined as unknown as TableBlock['rows'],
      };

      cache.set(tableNoRows, 800, 600, { totalHeight: 0 });
      // Should not throw and should cache the value
      expect(cache.get(tableNoRows, 800, 600)).toEqual({ totalHeight: 0 });
    });

    it('differentiates tables with different content', () => {
      const table1 = tableBlock('table-1', [
        ['A', 'B'],
        ['C', 'D'],
      ]);
      const table2 = tableBlock('table-1', [
        ['A', 'B'],
        ['C', 'E'], // Different content in last cell
      ]);

      cache.set(table1, 800, 600, { totalHeight: 100 });
      // Different content should result in cache miss
      expect(cache.get(table2, 800, 600)).toBeUndefined();
    });

    it('handles whitespace normalization in table cells', () => {
      const table1: TableBlock = {
        kind: 'table',
        id: 'table-whitespace',
        rows: [
          {
            id: 'row-0',
            cells: [
              {
                id: 'cell-0',
                paragraph: {
                  kind: 'paragraph',
                  id: 'para-0',
                  runs: [{ text: 'Hello   World', fontFamily: 'Arial', fontSize: 12 }],
                },
              },
            ],
          },
        ],
      };
      const table2: TableBlock = {
        kind: 'table',
        id: 'table-whitespace',
        rows: [
          {
            id: 'row-0',
            cells: [
              {
                id: 'cell-0',
                paragraph: {
                  kind: 'paragraph',
                  id: 'para-0',
                  runs: [{ text: 'Hello World', fontFamily: 'Arial', fontSize: 12 }],
                },
              },
            ],
          },
        ],
      };

      cache.set(table1, 800, 600, { totalHeight: 50 });
      // Whitespace normalization should treat these as the same
      expect(cache.get(table2, 800, 600)).toEqual({ totalHeight: 50 });
    });

    it('handles mixed multi-block and legacy cells', () => {
      const mixedTable: TableBlock = {
        kind: 'table',
        id: 'mixed-table',
        rows: [
          {
            id: 'row-0',
            cells: [
              // Multi-block cell
              {
                id: 'cell-0-0',
                blocks: [
                  {
                    kind: 'paragraph',
                    id: 'para-0',
                    runs: [{ text: 'Multi', fontFamily: 'Arial', fontSize: 12 }],
                  },
                ],
              },
              // Legacy cell
              {
                id: 'cell-0-1',
                paragraph: {
                  kind: 'paragraph',
                  id: 'para-1',
                  runs: [{ text: 'Legacy', fontFamily: 'Arial', fontSize: 12 }],
                },
              },
            ],
          },
        ],
      };

      cache.set(mixedTable, 800, 600, { totalHeight: 60 });
      expect(cache.get(mixedTable, 800, 600)).toEqual({ totalHeight: 60 });
    });

    it('handles cells with non-text runs (images)', () => {
      const tableWithImage: TableBlock = {
        kind: 'table',
        id: 'table-image',
        rows: [
          {
            id: 'row-0',
            cells: [
              {
                id: 'cell-0',
                paragraph: {
                  kind: 'paragraph',
                  id: 'para-0',
                  runs: [
                    { text: 'Text before ', fontFamily: 'Arial', fontSize: 12 },
                    { kind: 'image', src: 'data:image/png;base64,abc', width: 100, height: 50 },
                    { text: ' text after', fontFamily: 'Arial', fontSize: 12 },
                  ],
                },
              },
            ],
          },
        ],
      };

      cache.set(tableWithImage, 800, 600, { totalHeight: 80 });
      // Image runs should not break the hashing logic
      expect(cache.get(tableWithImage, 800, 600)).toEqual({ totalHeight: 80 });
    });

    it('invalidates table cache by block id', () => {
      const table = tableBlock('invalidate-table', [
        ['A', 'B'],
        ['C', 'D'],
      ]);

      cache.set(table, 800, 600, { totalHeight: 100 });
      cache.invalidate(['invalidate-table']);
      expect(cache.get(table, 800, 600)).toBeUndefined();
    });
  });
});
