/**
 * Tests for table layout with column boundary metadata generation
 */

import { describe, it, expect } from 'vitest';
import { layoutTableBlock } from './layout-table.js';
import type { TableBlock, TableMeasure, TableFragment, BlockId } from '@superdoc/contracts';

/**
 * Create a mock table block for testing
 */
function createMockTableBlock(rowCount: number): TableBlock {
  const rows = Array.from({ length: rowCount }, (_, i) => ({
    id: `row-${i}` as BlockId,
    cells: [
      {
        id: `cell-${i}-0` as BlockId,
        paragraph: {
          kind: 'paragraph' as const,
          id: `para-${i}-0` as BlockId,
          runs: [],
        },
      },
      {
        id: `cell-${i}-1` as BlockId,
        paragraph: {
          kind: 'paragraph' as const,
          id: `para-${i}-1` as BlockId,
          runs: [],
        },
      },
    ],
  }));

  return {
    kind: 'table',
    id: 'test-table' as BlockId,
    rows,
  };
}

/**
 * Create a mock table measure
 */
function createMockTableMeasure(columnWidths: number[], rowHeights: number[]): TableMeasure {
  return {
    kind: 'table',
    rows: rowHeights.map((height) => ({
      cells: columnWidths.map((width) => ({
        paragraph: { kind: 'paragraph', lines: [], totalHeight: height },
        width,
        height,
      })),
      height,
    })),
    columnWidths,
    totalWidth: columnWidths.reduce((sum, w) => sum + w, 0),
    totalHeight: rowHeights.reduce((sum, h) => sum + h, 0),
  };
}

describe('layoutTableBlock', () => {
  describe('metadata generation', () => {
    it('should generate column boundary metadata for tables', () => {
      const block = createMockTableBlock(2);
      const measure = createMockTableMeasure([100, 150, 200], [20, 25]);

      const fragments: TableFragment[] = [];
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 450,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY: 0,
          contentBottom: 1000,
        }),
        advanceColumn: (state) => state,
        columnX: () => 0,
      });

      expect(fragments).toHaveLength(1);
      const fragment = fragments[0];

      expect(fragment.metadata).toBeDefined();
      expect(fragment.metadata?.columnBoundaries).toBeDefined();
      expect(fragment.metadata?.coordinateSystem).toBe('fragment');
    });

    it('should create correct number of column boundaries', () => {
      const block = createMockTableBlock(1);
      const measure = createMockTableMeasure([100, 150, 200], [20]);

      const fragments: TableFragment[] = [];
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 450,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY: 0,
          contentBottom: 1000,
        }),
        advanceColumn: (state) => state,
        columnX: () => 0,
      });

      const fragment = fragments[0];
      expect(fragment.metadata?.columnBoundaries).toHaveLength(3);
    });

    it('should set correct column boundary positions', () => {
      const block = createMockTableBlock(1);
      const measure = createMockTableMeasure([100, 150, 200], [20]);

      const fragments: TableFragment[] = [];
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 450,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY: 0,
          contentBottom: 1000,
        }),
        advanceColumn: (state) => state,
        columnX: () => 0,
      });

      const boundaries = fragments[0].metadata?.columnBoundaries;
      expect(boundaries).toBeDefined();

      // First column starts at x=0, width=100
      expect(boundaries![0]).toMatchObject({
        index: 0,
        x: 0,
        width: 100,
      });

      // Second column starts at x=100, width=150
      expect(boundaries![1]).toMatchObject({
        index: 1,
        x: 100,
        width: 150,
      });

      // Third column starts at x=250, width=200
      expect(boundaries![2]).toMatchObject({
        index: 2,
        x: 250,
        width: 200,
      });
    });

    it('should set minimum widths for columns', () => {
      const block = createMockTableBlock(1);
      const measure = createMockTableMeasure([100, 150, 200], [20]);

      const fragments: TableFragment[] = [];
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 450,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY: 0,
          contentBottom: 1000,
        }),
        advanceColumn: (state) => state,
        columnX: () => 0,
      });

      const boundaries = fragments[0].metadata?.columnBoundaries;
      expect(boundaries).toBeDefined();

      // All columns should have minWidth >= 25 (absolute minimum)
      boundaries?.forEach((boundary) => {
        expect(boundary.minWidth).toBeGreaterThanOrEqual(25);
      });
    });

    it('should mark all columns as resizable', () => {
      const block = createMockTableBlock(1);
      const measure = createMockTableMeasure([100, 150, 200], [20]);

      const fragments: TableFragment[] = [];
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 450,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY: 0,
          contentBottom: 1000,
        }),
        advanceColumn: (state) => state,
        columnX: () => 0,
      });

      const boundaries = fragments[0].metadata?.columnBoundaries;
      expect(boundaries).toBeDefined();

      boundaries?.forEach((boundary) => {
        expect(boundary.resizable).toBe(true);
      });
    });

    it('should handle single-column tables', () => {
      const block = createMockTableBlock(1);
      const measure = createMockTableMeasure([300], [20]);

      const fragments: TableFragment[] = [];
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 300,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY: 0,
          contentBottom: 1000,
        }),
        advanceColumn: (state) => state,
        columnX: () => 0,
      });

      const boundaries = fragments[0].metadata?.columnBoundaries;
      expect(boundaries).toHaveLength(1);
      expect(boundaries![0]).toMatchObject({
        index: 0,
        x: 0,
        width: 300,
      });
    });

    it('should not include rowBoundaries metadata (Phase 1 scope)', () => {
      const block = createMockTableBlock(3);
      const measure = createMockTableMeasure([100, 150], [20, 25, 30]);

      const fragments: TableFragment[] = [];
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 250,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY: 0,
          contentBottom: 1000,
        }),
        advanceColumn: (state) => state,
        columnX: () => 0,
      });

      const fragment = fragments[0];
      expect(fragment.metadata?.rowBoundaries).toBeUndefined();
    });
  });

  describe('calculateColumnMinWidth edge cases', () => {
    it('should handle out of bounds column index', () => {
      const block = createMockTableBlock(1);
      const measure = createMockTableMeasure([100, 150], [20]);

      const fragments: TableFragment[] = [];
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 250,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY: 0,
          contentBottom: 1000,
        }),
        advanceColumn: (state) => state,
        columnX: () => 0,
      });

      const boundaries = fragments[0].metadata?.columnBoundaries;
      expect(boundaries).toBeDefined();
      // Should only have 2 columns, not crash when accessing non-existent column 999
      expect(boundaries!.length).toBe(2);
    });

    it('should handle single column table', () => {
      const block = createMockTableBlock(1);
      const measure = createMockTableMeasure([300], [20]);

      const fragments: TableFragment[] = [];
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 300,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY: 0,
          contentBottom: 1000,
        }),
        advanceColumn: (state) => state,
        columnX: () => 0,
      });

      const boundaries = fragments[0].metadata?.columnBoundaries;
      expect(boundaries).toHaveLength(1);
      expect(boundaries![0].minWidth).toBeGreaterThanOrEqual(25);
      expect(boundaries![0].minWidth).toBeLessThanOrEqual(200);
    });

    it('should handle very wide column (> 200px)', () => {
      const block = createMockTableBlock(1);
      const measure = createMockTableMeasure([500], [20]);

      const fragments: TableFragment[] = [];
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 500,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY: 0,
          contentBottom: 1000,
        }),
        advanceColumn: (state) => state,
        columnX: () => 0,
      });

      const boundaries = fragments[0].metadata?.columnBoundaries;
      // Min width should be capped at 200px
      expect(boundaries![0].minWidth).toBe(200);
    });

    it('should handle very narrow column (< 25px)', () => {
      const block = createMockTableBlock(1);
      const measure = createMockTableMeasure([10], [20]);

      const fragments: TableFragment[] = [];
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 10,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY: 0,
          contentBottom: 1000,
        }),
        advanceColumn: (state) => state,
        columnX: () => 0,
      });

      const boundaries = fragments[0].metadata?.columnBoundaries;
      // Min width should be at least 25px
      expect(boundaries![0].minWidth).toBe(25);
    });

    it('should handle empty columnWidths array', () => {
      const block = createMockTableBlock(1);
      const measure = createMockTableMeasure([], [20]);

      const fragments: TableFragment[] = [];
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 100,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY: 0,
          contentBottom: 1000,
        }),
        advanceColumn: (state) => state,
        columnX: () => 0,
      });

      const boundaries = fragments[0].metadata?.columnBoundaries;
      // Should handle empty array gracefully
      expect(boundaries).toBeDefined();
      expect(boundaries!.length).toBe(0);
    });

    it('should handle negative measured width', () => {
      const block = createMockTableBlock(1);
      const measure = createMockTableMeasure([-50], [20]);

      const fragments: TableFragment[] = [];
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 100,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY: 0,
          contentBottom: 1000,
        }),
        advanceColumn: (state) => state,
        columnX: () => 0,
      });

      const boundaries = fragments[0].metadata?.columnBoundaries;
      // Should default to minimum 25px for negative widths
      expect(boundaries![0].minWidth).toBe(25);
    });

    it('should handle zero measured width', () => {
      const block = createMockTableBlock(1);
      const measure = createMockTableMeasure([0], [20]);

      const fragments: TableFragment[] = [];
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 100,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY: 0,
          contentBottom: 1000,
        }),
        advanceColumn: (state) => state,
        columnX: () => 0,
      });

      const boundaries = fragments[0].metadata?.columnBoundaries;
      // Should default to minimum 25px for zero width
      expect(boundaries![0].minWidth).toBe(25);
    });

    it('should handle multiple columns with varying widths', () => {
      const block = createMockTableBlock(1);
      // Test mix: very narrow (10), normal (100), very wide (500)
      const measure = createMockTableMeasure([10, 100, 500], [20]);

      const fragments: TableFragment[] = [];
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 610,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY: 0,
          contentBottom: 1000,
        }),
        advanceColumn: (state) => state,
        columnX: () => 0,
      });

      const boundaries = fragments[0].metadata?.columnBoundaries;
      // Column 0: 10px -> should be 25px (minimum)
      expect(boundaries![0].minWidth).toBe(25);
      // Column 1: 100px -> should be 100px (within range)
      expect(boundaries![1].minWidth).toBe(100);
      // Column 2: 500px -> should be 200px (capped)
      expect(boundaries![2].minWidth).toBe(200);
    });
  });

  describe('layout behavior', () => {
    it('should create table fragments with correct dimensions', () => {
      const block = createMockTableBlock(2);
      const measure = createMockTableMeasure([100, 150], [20, 25]);

      const fragments: TableFragment[] = [];
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 250,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY: 50,
          contentBottom: 1000,
        }),
        advanceColumn: (state) => state,
        columnX: () => 10,
      });

      expect(fragments).toHaveLength(1);
      const fragment = fragments[0];

      expect(fragment.kind).toBe('table');
      expect(fragment.blockId).toBe('test-table');
      expect(fragment.x).toBe(10);
      expect(fragment.y).toBe(50);
      expect(fragment.width).toBe(250); // totalWidth
      expect(fragment.height).toBe(45); // totalHeight (20 + 25)
    });

    it('should include all rows in fragment range', () => {
      const block = createMockTableBlock(5);
      const measure = createMockTableMeasure([100], Array(5).fill(20));

      const fragments: TableFragment[] = [];
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 100,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY: 0,
          contentBottom: 1000,
        }),
        advanceColumn: (state) => state,
        columnX: () => 0,
      });

      const fragment = fragments[0];
      expect(fragment.fromRow).toBe(0);
      expect(fragment.toRow).toBe(5);
    });
  });
});
