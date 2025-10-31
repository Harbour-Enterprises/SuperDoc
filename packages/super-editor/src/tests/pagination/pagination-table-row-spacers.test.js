// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { initTestEditor } from '@tests/helpers/helpers.js';
import { waitFor } from '@tests/helpers/async-helpers.js';
import { PaginationPluginKey } from '@extensions/pagination/pagination.js';
import {
  buildTableDoc,
  buildPaginationLayout,
  calculateExpectedSpacing,
  PAGE_DIMENSIONS,
} from './pagination-test-fixtures.js';
import { findTableCellPositions, setupMatchMediaMock } from './pagination-test-helpers.js';

/**
 * Test Configuration Constants
 *
 * These constants define the test scenario:
 * - We create a 6x3 table (6 rows, 3 columns) with extra line breaks to force pagination
 * - We target row 4 (index 4) which will span across a page break
 * - Cell 1 (index 1) in that row will be used as the break position marker
 * - This tests that spacing widgets are mirrored into all 3 cells of the broken row
 */
const TABLE_CONFIG = {
  rows: 6,
  columns: 3,
  extraLinesPerCell: 4,
};

const TARGET_ROW_INDEX = 4;
const TARGET_CELL_INDEX = 1;

// Validate test configuration
if (TARGET_ROW_INDEX >= TABLE_CONFIG.rows) {
  throw new Error(
    `Invalid test config: TARGET_ROW_INDEX (${TARGET_ROW_INDEX}) must be less than TABLE_CONFIG.rows (${TABLE_CONFIG.rows})`,
  );
}
if (TARGET_CELL_INDEX >= TABLE_CONFIG.columns) {
  throw new Error(
    `Invalid test config: TARGET_CELL_INDEX (${TARGET_CELL_INDEX}) must be less than TABLE_CONFIG.columns (${TABLE_CONFIG.columns})`,
  );
}

/**
 * Test timing constants
 */
const TEST_TIMEOUT_MS = 2000;

/**
 * Page break configuration for test scenario
 * - breakY is set at the content height (600px) where the break occurs
 * - Footer height is 1 inch (96px)
 * - Next page has no header (0px)
 */
const PAGE_BREAK_CONFIG = {
  breakY: 600, // Break at end of content area
  footerHeightPx: PAGE_DIMENSIONS.MARGIN_1_INCH_PX,
  nextHeaderHeightPx: 0,
};

beforeAll(() => {
  setupMatchMediaMock();
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('pagination table row spacers', () => {
  /**
   * Test: Table Row Spacing Widget Mirroring
   *
   * Scenario: When a table row spans across a page break, each cell in that row
   * should display a spacing widget showing the gap between pages (footer + header + gap).
   *
   * This test validates that:
   * 1. The pagination plugin correctly identifies cells in a broken row
   * 2. Each cell receives a spacing highlight decoration
   * 3. All spacing widgets show the same height value
   * 4. The height matches the calculated spacing (footer reserved + next header reserved + page gap)
   */
  it('mirrors page spacing widgets into every overflowing table cell', async () => {
    // Setup: Create a test editor instance with pagination enabled
    const mount = document.createElement('div');
    document.body.appendChild(mount);

    const { editor } = initTestEditor({
      element: mount,
      pagination: true,
      isHeadless: false,
      isNewFile: true,
    });

    try {
      // Step 1: Insert a test table into the editor
      const state = editor.view.state;
      const tableDoc = state.schema.nodeFromJSON(
        buildTableDoc(TABLE_CONFIG.rows, TABLE_CONFIG.columns, TABLE_CONFIG.extraLinesPerCell),
      );
      const tr = state.tr.replaceWith(0, state.doc.content.size, tableDoc.content);
      editor.view.dispatch(tr);

      // Step 2: Wait for pagination repository to initialize
      await waitFor(
        () => {
          expect(editor.storage?.pagination?.repository).toBeTruthy();
        },
        { timeout: TEST_TIMEOUT_MS },
      );

      // Step 3: Wait for document to be fully loaded
      await waitFor(() => {
        expect(editor.view.state.doc.childCount).toBeGreaterThan(0);
      });

      // Step 4: Find the positions of all cells in the target row
      const docNode = editor.view.state.doc;
      const { breakPos, cellPositions } = findTableCellPositions(docNode, TARGET_ROW_INDEX, TARGET_CELL_INDEX);

      expect(breakPos).toBeGreaterThan(0);
      expect(cellPositions.length).toBe(TABLE_CONFIG.columns);

      // Step 5: Build and apply a pagination layout that breaks at the target row
      const paginationLayout = buildPaginationLayout({
        breakPos,
        cellPositions,
        page0: {
          footerHeightPx: PAGE_BREAK_CONFIG.footerHeightPx,
          breakTop: PAGE_BREAK_CONFIG.breakY,
          breakBottom: PAGE_BREAK_CONFIG.breakY,
          breakY: PAGE_BREAK_CONFIG.breakY,
        },
        page1: {
          headerHeightPx: PAGE_BREAK_CONFIG.nextHeaderHeightPx,
        },
      });

      editor.commands.updatePagination(paginationLayout);

      // Step 6: Calculate the expected spacing height for assertions
      const expectedSpacingHeight = calculateExpectedSpacing(paginationLayout.pages[0], paginationLayout.pages[1]);

      // Step 7: Wait for pagination plugin to process the layout and create decorations
      await waitFor(
        () => {
          const pluginState = PaginationPluginKey.getState(editor.view.state);
          expect(pluginState?.decorations).toBeTruthy();
        },
        { timeout: TEST_TIMEOUT_MS },
      );

      // Step 8: Verify spacing widgets are rendered in the DOM
      const tableRows = Array.from(editor.view.dom.querySelectorAll('table tr'));
      expect(tableRows.length).toBeGreaterThanOrEqual(TABLE_CONFIG.rows);

      const targetRow = tableRows[TARGET_ROW_INDEX];
      expect(targetRow).toBeTruthy();

      // Step 9: Find all spacing highlight elements in the target row
      const highlightSelector = '.pagination-spacing-highlight[data-pagination-spacing-kind="page-spacing"]';
      const highlights = Array.from(targetRow.querySelectorAll(highlightSelector));

      // Step 10: Verify each cell has exactly one spacing widget
      const targetCells = Array.from(targetRow.querySelectorAll('td, th'));
      expect(targetCells.length).toBe(TABLE_CONFIG.columns);

      targetCells.forEach((cell, index) => {
        const cellHighlights = cell.querySelectorAll(highlightSelector);
        expect(cellHighlights.length, `Cell ${index} should have exactly 1 spacing widget`).toBe(1);
      });

      expect(highlights.length).toBe(targetCells.length);

      // Step 11: Verify all spacing widgets have the same height value
      const uniqueHeights = new Set(highlights.map((node) => node.dataset.paginationSpacingHeight));
      expect(uniqueHeights.size, 'All spacing widgets should have the same height').toBe(1);

      const [heightValue] = Array.from(uniqueHeights);
      expect(heightValue, `Expected spacing height to be ${expectedSpacingHeight}px`).toBe(expectedSpacingHeight);
    } finally {
      editor.destroy();
    }
  });

  /**
   * Test: First Row Spanning Page Break
   *
   * Scenario: Tests that spacing widgets work correctly when the first row
   * of the table spans across a page break.
   */
  it('handles first row spanning page break', async () => {
    const mount = document.createElement('div');
    document.body.appendChild(mount);

    const { editor } = initTestEditor({
      element: mount,
      pagination: true,
      isHeadless: false,
      isNewFile: true,
    });

    try {
      // Create a smaller table for first row test
      const state = editor.view.state;
      const tableDoc = state.schema.nodeFromJSON(buildTableDoc(3, 2, 5));
      const tr = state.tr.replaceWith(0, state.doc.content.size, tableDoc.content);
      editor.view.dispatch(tr);

      await waitFor(
        () => {
          expect(editor.storage?.pagination?.repository).toBeTruthy();
        },
        { timeout: TEST_TIMEOUT_MS },
      );

      const docNode = editor.view.state.doc;
      const { breakPos, cellPositions } = findTableCellPositions(docNode, 0, 0); // First row, first cell

      expect(breakPos).toBeGreaterThan(0);
      expect(cellPositions.length).toBe(2);

      const paginationLayout = buildPaginationLayout({
        breakPos,
        cellPositions,
        page0: {
          footerHeightPx: PAGE_BREAK_CONFIG.footerHeightPx,
          breakY: PAGE_BREAK_CONFIG.breakY,
        },
        page1: {
          headerHeightPx: PAGE_BREAK_CONFIG.nextHeaderHeightPx,
        },
      });

      editor.commands.updatePagination(paginationLayout);

      await waitFor(
        () => {
          const pluginState = PaginationPluginKey.getState(editor.view.state);
          expect(pluginState?.decorations).toBeTruthy();
        },
        { timeout: TEST_TIMEOUT_MS },
      );

      const highlightSelector = '.pagination-spacing-highlight[data-pagination-spacing-kind="page-spacing"]';
      const firstRow = editor.view.dom.querySelector('table tr');
      expect(firstRow).toBeTruthy();

      const highlights = Array.from(firstRow.querySelectorAll(highlightSelector));
      expect(highlights.length).toBe(2); // Both cells should have spacing widgets
    } finally {
      editor.destroy();
    }
  });

  /**
   * Test: Last Row Spanning Page Break
   *
   * Scenario: Tests that spacing widgets work correctly when the last row
   * of the table spans across a page break.
   */
  it('handles last row spanning page break', async () => {
    const mount = document.createElement('div');
    document.body.appendChild(mount);

    const { editor } = initTestEditor({
      element: mount,
      pagination: true,
      isHeadless: false,
      isNewFile: true,
    });

    try {
      const tableRows = 4;
      const tableCols = 3;
      const state = editor.view.state;
      const tableDoc = state.schema.nodeFromJSON(buildTableDoc(tableRows, tableCols, 4));
      const tr = state.tr.replaceWith(0, state.doc.content.size, tableDoc.content);
      editor.view.dispatch(tr);

      await waitFor(
        () => {
          expect(editor.storage?.pagination?.repository).toBeTruthy();
        },
        { timeout: TEST_TIMEOUT_MS },
      );

      const docNode = editor.view.state.doc;
      const lastRowIndex = tableRows - 1;
      const { breakPos, cellPositions } = findTableCellPositions(docNode, lastRowIndex, 0);

      expect(breakPos).toBeGreaterThan(0);
      expect(cellPositions.length).toBe(tableCols);

      const paginationLayout = buildPaginationLayout({
        breakPos,
        cellPositions,
        page0: {
          footerHeightPx: PAGE_BREAK_CONFIG.footerHeightPx,
          breakY: PAGE_BREAK_CONFIG.breakY,
        },
        page1: {
          headerHeightPx: PAGE_BREAK_CONFIG.nextHeaderHeightPx,
        },
      });

      editor.commands.updatePagination(paginationLayout);

      await waitFor(
        () => {
          const pluginState = PaginationPluginKey.getState(editor.view.state);
          expect(pluginState?.decorations).toBeTruthy();
        },
        { timeout: TEST_TIMEOUT_MS },
      );

      const highlightSelector = '.pagination-spacing-highlight[data-pagination-spacing-kind="page-spacing"]';
      const tableRowsInDom = Array.from(editor.view.dom.querySelectorAll('table tr'));
      const lastRow = tableRowsInDom[lastRowIndex];
      expect(lastRow).toBeTruthy();

      const highlights = Array.from(lastRow.querySelectorAll(highlightSelector));
      expect(highlights.length).toBe(tableCols);
    } finally {
      editor.destroy();
    }
  });

  /**
   * Test: Single Column Table
   *
   * Scenario: Tests that spacing widgets work correctly with single-column tables.
   * This is a minimal edge case.
   */
  it('handles single column table with page break', async () => {
    const mount = document.createElement('div');
    document.body.appendChild(mount);

    const { editor } = initTestEditor({
      element: mount,
      pagination: true,
      isHeadless: false,
      isNewFile: true,
    });

    try {
      const state = editor.view.state;
      const tableDoc = state.schema.nodeFromJSON(buildTableDoc(5, 1, 5)); // 5 rows, 1 column
      const tr = state.tr.replaceWith(0, state.doc.content.size, tableDoc.content);
      editor.view.dispatch(tr);

      await waitFor(
        () => {
          expect(editor.storage?.pagination?.repository).toBeTruthy();
        },
        { timeout: TEST_TIMEOUT_MS },
      );

      const docNode = editor.view.state.doc;
      const { breakPos, cellPositions } = findTableCellPositions(docNode, 2, 0); // Middle row, only cell

      expect(breakPos).toBeGreaterThan(0);
      expect(cellPositions.length).toBe(1);

      const paginationLayout = buildPaginationLayout({
        breakPos,
        cellPositions,
        page0: {
          footerHeightPx: PAGE_BREAK_CONFIG.footerHeightPx,
          breakY: PAGE_BREAK_CONFIG.breakY,
        },
        page1: {
          headerHeightPx: PAGE_BREAK_CONFIG.nextHeaderHeightPx,
        },
      });

      editor.commands.updatePagination(paginationLayout);

      await waitFor(
        () => {
          const pluginState = PaginationPluginKey.getState(editor.view.state);
          expect(pluginState?.decorations).toBeTruthy();
        },
        { timeout: TEST_TIMEOUT_MS },
      );

      const highlightSelector = '.pagination-spacing-highlight[data-pagination-spacing-kind="page-spacing"]';
      const tableRows = Array.from(editor.view.dom.querySelectorAll('table tr'));
      const targetRow = tableRows[2];
      expect(targetRow).toBeTruthy();

      const highlights = Array.from(targetRow.querySelectorAll(highlightSelector));
      expect(highlights.length).toBe(1);
    } finally {
      editor.destroy();
    }
  });

  /**
   * Test: Different Header/Footer Heights
   *
   * Scenario: Tests that spacing calculations are correct when using
   * different header and footer heights.
   */
  it('calculates spacing correctly with custom header and footer heights', async () => {
    const mount = document.createElement('div');
    document.body.appendChild(mount);

    const { editor } = initTestEditor({
      element: mount,
      pagination: true,
      isHeadless: false,
      isNewFile: true,
    });

    try {
      const state = editor.view.state;
      const tableDoc = state.schema.nodeFromJSON(buildTableDoc(6, 3, 4));
      const tr = state.tr.replaceWith(0, state.doc.content.size, tableDoc.content);
      editor.view.dispatch(tr);

      await waitFor(
        () => {
          expect(editor.storage?.pagination?.repository).toBeTruthy();
        },
        { timeout: TEST_TIMEOUT_MS },
      );

      const docNode = editor.view.state.doc;
      const { breakPos, cellPositions } = findTableCellPositions(docNode, 3, 1);

      // Use custom header and footer heights
      const customFooterHeight = 144; // 2 inches
      const customHeaderHeight = 72; // 1 inch

      const paginationLayout = buildPaginationLayout({
        breakPos,
        cellPositions,
        page0: {
          footerHeightPx: customFooterHeight,
          breakY: PAGE_BREAK_CONFIG.breakY,
        },
        page1: {
          headerHeightPx: customHeaderHeight,
        },
      });

      editor.commands.updatePagination(paginationLayout);

      const expectedSpacingHeight = calculateExpectedSpacing(paginationLayout.pages[0], paginationLayout.pages[1]);

      await waitFor(
        () => {
          const pluginState = PaginationPluginKey.getState(editor.view.state);
          expect(pluginState?.decorations).toBeTruthy();
        },
        { timeout: TEST_TIMEOUT_MS },
      );

      const highlightSelector = '.pagination-spacing-highlight[data-pagination-spacing-kind="page-spacing"]';
      const tableRows = Array.from(editor.view.dom.querySelectorAll('table tr'));
      const targetRow = tableRows[3];
      const highlights = Array.from(targetRow.querySelectorAll(highlightSelector));

      // Verify the calculated spacing matches expected (144 + 72 = 216)
      const uniqueHeights = new Set(highlights.map((node) => node.dataset.paginationSpacingHeight));
      expect(uniqueHeights.size).toBe(1);

      const [heightValue] = Array.from(uniqueHeights);
      expect(heightValue).toBe(expectedSpacingHeight);
      expect(Number(heightValue)).toBe(customFooterHeight + customHeaderHeight);
    } finally {
      editor.destroy();
    }
  });
});
