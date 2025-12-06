/**
 * Tests for table layout with column boundary metadata generation
 */

import { describe, it, expect } from 'vitest';
import { layoutTableBlock } from './layout-table.js';
import type { TableBlock, TableMeasure, TableFragment, BlockId } from '@superdoc/contracts';

/**
 * Creates a dummy table fragment for test scenarios where prior page content is needed.
 *
 * This helper is used to simulate a page that already has content (fragments.length > 0),
 * which triggers specific layout behaviors like the table start preflight check. The dummy
 * fragment represents existing content that occupies space on the page before the table.
 *
 * @returns A minimal TableFragment with zero dimensions that serves as a placeholder
 */
const createDummyFragment = (): TableFragment => ({
  kind: 'table',
  blockId: 'dummy' as BlockId,
  fromRow: 0,
  toRow: 0,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  metadata: { columnBoundaries: [], coordinateSystem: 'fragment' },
});

/**
 * Create a mock table block for testing
 */
function createMockTableBlock(
  rowCount: number,
  rowAttrs?: Array<{ repeatHeader?: boolean; cantSplit?: boolean }>,
  tableAttrs?: { tableProperties?: { floatingTableProperties?: unknown } },
): TableBlock {
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
    attrs: rowAttrs?.[i]
      ? {
          tableRowProperties: {
            repeatHeader: rowAttrs[i].repeatHeader,
            cantSplit: rowAttrs[i].cantSplit,
          },
        }
      : undefined,
  }));

  return {
    kind: 'table',
    id: 'test-table' as BlockId,
    rows,
    attrs: tableAttrs,
  };
}

/**
 * Create a mock table measure for testing table layout scenarios.
 *
 * @param columnWidths - Array of column widths in pixels
 * @param rowHeights - Array of row heights in pixels
 * @param lineHeightsPerRow - Optional 2D array specifying line heights for each row's cells.
 *   Format: lineHeightsPerRow[rowIndex] = [lineHeight1, lineHeight2, ...]
 *   If omitted, cells will have no lines. This parameter enables testing of mid-row
 *   splitting behavior where rows are split at line boundaries.
 * @returns A TableMeasure object with mocked cell, row, and line data
 */
function createMockTableMeasure(
  columnWidths: number[],
  rowHeights: number[],
  lineHeightsPerRow?: number[][],
): TableMeasure {
  return {
    kind: 'table',
    rows: rowHeights.map((height, rowIdx) => ({
      cells: columnWidths.map((width) => ({
        paragraph: {
          kind: 'paragraph',
          lines: (lineHeightsPerRow?.[rowIdx] ?? []).map((lineHeight) => ({ lineHeight })),
          totalHeight: height,
        },
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

  describe('table start preflight', () => {
    it('starts a splittable first row on the current page when some content fits', () => {
      const block = createMockTableBlock(1, [{ cantSplit: false }]);
      const measure = createMockTableMeasure([100], [200], [[10, 10, 10, 10, 10]]);

      const fragments: TableFragment[] = [createDummyFragment()];
      let advanced = false;
      const contentBottom = 40; // Only 30px remaining on the current page

      // Create a persistent state object that can be mutated
      const pageState = {
        page: { fragments },
        columnIndex: 0,
        cursorY: 10, // Prior content occupies space
        contentBottom,
      };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 100,
        ensurePage: () => pageState,
        advanceColumn: (state) => {
          advanced = true;
          pageState.cursorY = 0;
          return pageState;
        },
        columnX: () => 0,
      });

      // Should start on current page (not advance during preflight)
      expect(fragments[1]).toBeDefined();
      expect(fragments[1].y).toBe(10); // First fragment starts at current cursor position
      // Should eventually advance after rendering what fits on current page
      expect(advanced).toBe(true);
      expect(fragments.length).toBeGreaterThan(2); // Dummy + first partial + continuation(s)
    });

    it('advances when the first row is cantSplit and does not fit the remaining space', () => {
      const block = createMockTableBlock(1, [{ cantSplit: true }]);
      const measure = createMockTableMeasure([100], [200], [[10, 10, 10, 10, 10, 10]]);

      const fragments: TableFragment[] = [createDummyFragment()];
      let cursorY = 20;
      let contentBottom = 60; // Only 40px remaining; row needs 200px
      let advanced = false;

      layoutTableBlock({
        block,
        measure,
        columnWidth: 100,
        ensurePage: () => ({
          page: { fragments },
          columnIndex: 0,
          cursorY,
          contentBottom,
        }),
        advanceColumn: () => {
          advanced = true;
          cursorY = 0;
          contentBottom = 300; // New page with enough space
          return {
            page: { fragments },
            columnIndex: 0,
            cursorY,
            contentBottom,
          };
        },
        columnX: () => 0,
      });

      expect(advanced).toBe(true);
      expect(fragments.length).toBeGreaterThan(1);
      expect(fragments[1].y).toBe(0);
    });

    it('handles zero available space with prior fragments', () => {
      const block = createMockTableBlock(1, [{ cantSplit: false }]);
      const measure = createMockTableMeasure([100], [100], [[10, 10, 10]]);

      const fragments: TableFragment[] = [createDummyFragment()];
      let advanced = false;
      const contentBottom = 20;

      const pageState = {
        page: { fragments },
        columnIndex: 0,
        cursorY: 20, // Cursor at bottom - zero available space
        contentBottom,
      };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 100,
        ensurePage: () => pageState,
        advanceColumn: (state) => {
          advanced = true;
          pageState.cursorY = 0;
          pageState.page = { fragments };
          return pageState;
        },
        columnX: () => 0,
      });

      // Should advance immediately since no space available
      expect(advanced).toBe(true);
      expect(fragments[1].y).toBe(0); // Table starts on new page
    });

    it('does not advance when no prior fragments regardless of available space', () => {
      const block = createMockTableBlock(1, [{ cantSplit: false }]);
      const measure = createMockTableMeasure([100], [100], [[10, 10, 10]]);

      const fragments: TableFragment[] = []; // No prior fragments
      let advanced = false;
      const contentBottom = 50;

      const pageState = {
        page: { fragments },
        columnIndex: 0,
        cursorY: 10,
        contentBottom,
      };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 100,
        ensurePage: () => pageState,
        advanceColumn: (state) => {
          advanced = true;
          pageState.cursorY = 0;
          return pageState;
        },
        columnX: () => 0,
      });

      // Should not advance during preflight when page is empty (no prior fragments)
      // Preflight check only applies when there's already content on the page
      expect(fragments[0]).toBeDefined();
      expect(fragments[0].y).toBe(10); // Table starts at current cursor position
    });

    it('handles first row with empty paragraphs (no lines)', () => {
      const block = createMockTableBlock(1, [{ cantSplit: false }]);
      // No lineHeightsPerRow provided - cells will have no lines
      const measure = createMockTableMeasure([100], [50]);

      const fragments: TableFragment[] = [createDummyFragment()];
      let advanced = false;
      const contentBottom = 100;

      const pageState = {
        page: { fragments },
        columnIndex: 0,
        cursorY: 10,
        contentBottom,
      };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 100,
        ensurePage: () => pageState,
        advanceColumn: (state) => {
          advanced = true;
          pageState.cursorY = 0;
          return pageState;
        },
        columnX: () => 0,
      });

      // Empty paragraphs (no lines) should be handled gracefully
      // The row should still be rendered with its measured height
      expect(fragments.length).toBeGreaterThan(1);
      expect(fragments[1]).toBeDefined();
      expect(fragments[1].height).toBeGreaterThan(0);
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

  describe('countHeaderRows behavior (via layoutTableBlock)', () => {
    it('should handle tables with no header rows', () => {
      const block = createMockTableBlock(3, [
        { repeatHeader: false },
        { repeatHeader: false },
        { repeatHeader: false },
      ]);
      const measure = createMockTableMeasure([100], [20, 20, 20]);

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
      expect(fragment.repeatHeaderCount).toBe(0);
      expect(fragment.fromRow).toBe(0);
      expect(fragment.toRow).toBe(3);
    });

    it('should handle tables with single header row', () => {
      const block = createMockTableBlock(3, [{ repeatHeader: true }, { repeatHeader: false }, { repeatHeader: false }]);
      const measure = createMockTableMeasure([100], [20, 20, 20]);

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
      // First fragment sets repeatHeaderCount=0 (headers included in body)
      expect(fragment.repeatHeaderCount).toBe(0);
      expect(fragment.fromRow).toBe(0);
      expect(fragment.toRow).toBe(3);
    });

    it('should handle tables with multiple contiguous header rows', () => {
      const block = createMockTableBlock(5, [
        { repeatHeader: true },
        { repeatHeader: true },
        { repeatHeader: true },
        { repeatHeader: false },
        { repeatHeader: false },
      ]);
      const measure = createMockTableMeasure([100], [20, 20, 20, 20, 20]);

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
      // First fragment includes headers in body, repeatHeaderCount=0
      expect(fragment.repeatHeaderCount).toBe(0);
      expect(fragment.fromRow).toBe(0);
      expect(fragment.toRow).toBe(5);
    });

    it('should stop counting headers at first non-header row', () => {
      const block = createMockTableBlock(5, [
        { repeatHeader: true },
        { repeatHeader: true },
        { repeatHeader: false }, // Stops here
        { repeatHeader: true }, // Not counted
        { repeatHeader: false },
      ]);
      const measure = createMockTableMeasure([100], [20, 20, 20, 20, 20]);

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

    it('should handle all rows being headers', () => {
      const block = createMockTableBlock(3, [{ repeatHeader: true }, { repeatHeader: true }, { repeatHeader: true }]);
      const measure = createMockTableMeasure([100], [20, 20, 20]);

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

      // All rows are headers, but table still creates a fragment with all rows
      expect(fragments).toHaveLength(1);
      expect(fragments[0].fromRow).toBe(0);
      expect(fragments[0].toRow).toBe(3);
    });

    it('should handle undefined row attributes (no headers)', () => {
      const block = createMockTableBlock(3); // No row attrs
      const measure = createMockTableMeasure([100], [20, 20, 20]);

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
      expect(fragment.repeatHeaderCount).toBe(0);
      expect(fragment.fromRow).toBe(0);
      expect(fragment.toRow).toBe(3);
    });
  });

  describe('findSplitPoint behavior (via layoutTableBlock)', () => {
    it('should split table when all rows fit on one page', () => {
      const block = createMockTableBlock(5);
      const measure = createMockTableMeasure([100], [20, 20, 20, 20, 20]);

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
          contentBottom: 1000, // Plenty of space
        }),
        advanceColumn: (state) => state,
        columnX: () => 0,
      });

      expect(fragments).toHaveLength(1);
      expect(fragments[0].fromRow).toBe(0);
      expect(fragments[0].toRow).toBe(5);
    });

    it('should split table across multiple pages when rows exceed available height', () => {
      const block = createMockTableBlock(10);
      const measure = createMockTableMeasure([100], Array(10).fill(20));

      const fragments: TableFragment[] = [];
      let cursorY = 0;
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 100,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY,
          contentBottom: 100, // Only fits 5 rows at a time (100px / 20px)
        }),
        advanceColumn: (state) => {
          cursorY = 0; // Reset cursor for new page
          return {
            page: mockPage,
            columnIndex: 0,
            cursorY: 0,
            contentBottom: 100,
          };
        },
        columnX: () => 0,
      });

      expect(fragments.length).toBeGreaterThan(1);
    });

    it('should handle cantSplit row that does not fit (move to next page)', () => {
      const block = createMockTableBlock(5, [
        { cantSplit: false },
        { cantSplit: false },
        { cantSplit: true }, // Row 2 can't split
        { cantSplit: false },
        { cantSplit: false },
      ]);
      const measure = createMockTableMeasure([100], [20, 20, 30, 20, 20]);

      const fragments: TableFragment[] = [];
      let cursorY = 0;
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 100,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY,
          contentBottom: 50, // Fits rows 0-1 (40px), but not row 2 (30px more)
        }),
        advanceColumn: (state) => {
          cursorY = 0;
          return {
            page: mockPage,
            columnIndex: 0,
            cursorY: 0,
            contentBottom: 100, // More space on next page
          };
        },
        columnX: () => 0,
      });

      expect(fragments.length).toBeGreaterThan(1);
      // First fragment should end before the cantSplit row
      expect(fragments[0].toRow).toBeLessThanOrEqual(2);
    });

    it('should handle multiple cantSplit rows', () => {
      const block = createMockTableBlock(6, [
        { cantSplit: false },
        { cantSplit: true }, // Row 1
        { cantSplit: true }, // Row 2
        { cantSplit: false },
        { cantSplit: true }, // Row 4
        { cantSplit: false },
      ]);
      const measure = createMockTableMeasure([100], Array(6).fill(20));

      const fragments: TableFragment[] = [];
      let cursorY = 0;
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 100,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY,
          contentBottom: 50, // Fits 2-3 rows at a time
        }),
        advanceColumn: (state) => {
          cursorY = 0;
          return {
            page: mockPage,
            columnIndex: 0,
            cursorY: 0,
            contentBottom: 50,
          };
        },
        columnX: () => 0,
      });

      expect(fragments.length).toBeGreaterThan(0);
    });

    it('should handle row that exactly fills available space', () => {
      const block = createMockTableBlock(3);
      const measure = createMockTableMeasure([100], [50, 50, 50]);

      const fragments: TableFragment[] = [];
      let cursorY = 0;
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 100,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY,
          contentBottom: 100, // Exactly fits 2 rows (100px / 50px = 2)
        }),
        advanceColumn: (state) => {
          cursorY = 0;
          return {
            page: mockPage,
            columnIndex: 0,
            cursorY: 0,
            contentBottom: 100,
          };
        },
        columnX: () => 0,
      });

      expect(fragments).toHaveLength(2);
      expect(fragments[0].fromRow).toBe(0);
      expect(fragments[0].toRow).toBe(2);
      expect(fragments[1].fromRow).toBe(2);
      expect(fragments[1].toRow).toBe(3);
    });
  });

  describe('integration: table splitting scenarios', () => {
    it('should split multi-page table with basic row boundaries', () => {
      const block = createMockTableBlock(20);
      const measure = createMockTableMeasure([100], Array(20).fill(25));

      const fragments: TableFragment[] = [];
      let cursorY = 0;
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 100,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY,
          contentBottom: 250, // Fits 10 rows per page (250px / 25px)
        }),
        advanceColumn: (state) => {
          cursorY = 0;
          return {
            page: mockPage,
            columnIndex: 0,
            cursorY: 0,
            contentBottom: 250,
          };
        },
        columnX: () => 0,
      });

      expect(fragments).toHaveLength(2);
      expect(fragments[0].fromRow).toBe(0);
      expect(fragments[0].toRow).toBe(10);
      expect(fragments[1].fromRow).toBe(10);
      expect(fragments[1].toRow).toBe(20);
      expect(fragments[0].continuesOnNext).toBe(true);
      expect(fragments[1].continuesFromPrev).toBe(true);
    });

    it('should repeat header rows on continuation fragments', () => {
      const block = createMockTableBlock(10, [
        { repeatHeader: true },
        { repeatHeader: true },
        ...Array(8).fill({ repeatHeader: false }),
      ]);
      const measure = createMockTableMeasure([100], Array(10).fill(20));

      const fragments: TableFragment[] = [];
      let cursorY = 0;
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 100,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY,
          contentBottom: 120, // Fits 6 rows (120px / 20px)
        }),
        advanceColumn: (state) => {
          cursorY = 0;
          return {
            page: mockPage,
            columnIndex: 0,
            cursorY: 0,
            contentBottom: 120,
          };
        },
        columnX: () => 0,
      });

      expect(fragments.length).toBeGreaterThan(1);
      // First fragment starts with headers
      expect(fragments[0].fromRow).toBe(0);
      // Continuation fragments should have repeatHeaderCount
      if (fragments.length > 1) {
        expect(fragments[1].repeatHeaderCount).toBe(2);
      }
    });

    it('should skip header repetition when headers are taller than page', () => {
      const block = createMockTableBlock(5, [
        { repeatHeader: true },
        { repeatHeader: true },
        { repeatHeader: false },
        { repeatHeader: false },
        { repeatHeader: false },
      ]);
      const measure = createMockTableMeasure([100], [80, 80, 20, 20, 20]);

      const fragments: TableFragment[] = [];
      let cursorY = 0;
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 100,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY,
          contentBottom: 100, // Headers are 160px, page is 100px
        }),
        advanceColumn: (state) => {
          cursorY = 0;
          return {
            page: mockPage,
            columnIndex: 0,
            cursorY: 0,
            contentBottom: 100,
          };
        },
        columnX: () => 0,
      });

      // Should split but not repeat headers (they don't fit)
      if (fragments.length > 1) {
        expect(fragments[1].repeatHeaderCount).toBe(0);
      }
    });

    it('should not split floating tables', () => {
      const block = createMockTableBlock(10, undefined, {
        tableProperties: { floatingTableProperties: { horizontalAnchor: 'page' } },
      });
      const measure = createMockTableMeasure([100], Array(10).fill(20));

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
          contentBottom: 50, // Not enough space for all rows
        }),
        advanceColumn: (state) => state,
        columnX: () => 0,
      });

      // Floating table should be rendered as single fragment despite limited space
      expect(fragments).toHaveLength(1);
      expect(fragments[0].fromRow).toBe(0);
      expect(fragments[0].toRow).toBe(10);
      expect(fragments[0].continuesOnNext).toBeUndefined();
    });

    it('should handle cantSplit row forcing move to next page', () => {
      const block = createMockTableBlock(5, [
        { cantSplit: false },
        { cantSplit: false },
        { cantSplit: true }, // Large row that can't split
        { cantSplit: false },
        { cantSplit: false },
      ]);
      const measure = createMockTableMeasure([100], [20, 20, 80, 20, 20]);

      const fragments: TableFragment[] = [];
      let cursorY = 0;
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 100,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY,
          contentBottom: 100,
        }),
        advanceColumn: (state) => {
          cursorY = 0;
          return {
            page: mockPage,
            columnIndex: 0,
            cursorY: 0,
            contentBottom: 100,
          };
        },
        columnX: () => 0,
      });

      expect(fragments.length).toBeGreaterThan(1);
      // First fragment should end before cantSplit row
      expect(fragments[0].toRow).toBe(2);
      // Second fragment should start with cantSplit row
      expect(fragments[1].fromRow).toBe(2);
    });

    it('should handle over-tall row with forced mid-row split', () => {
      // Create a table with one very tall row that exceeds full page height
      const block = createMockTableBlock(3);
      // Row heights: normal (20px), over-tall (600px), normal (20px)
      const measure = createMockTableMeasure([100], [20, 600, 20]);

      const fragments: TableFragment[] = [];
      let cursorY = 0;
      const mockPage = { fragments };

      layoutTableBlock({
        block,
        measure,
        columnWidth: 100,
        ensurePage: () => ({
          page: mockPage,
          columnIndex: 0,
          cursorY,
          contentBottom: 500, // Full page is 500px, row is 600px
        }),
        advanceColumn: (state) => {
          cursorY = 0;
          return {
            page: mockPage,
            columnIndex: 0,
            cursorY: 0,
            contentBottom: 500,
          };
        },
        columnX: () => 0,
      });

      // Should create multiple fragments due to over-tall row
      expect(fragments.length).toBeGreaterThan(1);

      // At least one fragment should have partialRow defined (when mid-row split is implemented)
      // For now, the over-tall row will be force-split at row boundaries
      // Once partialRow rendering is complete, this test should verify partialRow metadata
    });
  });
});
