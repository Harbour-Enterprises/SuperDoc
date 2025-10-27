// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { initTestEditor } from '@tests/helpers/helpers.js';
import { PaginationPluginKey } from '@extensions/pagination/pagination.js';

const TARGET_ROW_INDEX = 4;
const TARGET_CELL_INDEX = 1;

const buildTableDoc = (rows, columns, extraLines = 0) => ({
  type: 'doc',
  content: [
    {
      type: 'table',
      content: Array.from({ length: rows }, (_, rowIndex) => ({
        type: 'tableRow',
        content: Array.from({ length: columns }, (_, columnIndex) => ({
          type: 'tableCell',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: `Row ${rowIndex + 1} - Cell ${columnIndex + 1}`,
                },
                ...Array.from({ length: extraLines }, () => ({ type: 'hardBreak' })),
              ],
            },
          ],
        })),
      })),
    },
  ],
});

const waitFor = async (assertion, { timeout = 1000, interval = 10 } = {}) => {
  const start = Date.now();
  while (true) {
    try {
      const value = await assertion();
      return value;
    } catch (error) {
      if (Date.now() - start > timeout) {
        throw error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
};

beforeAll(() => {
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = () => ({
      matches: false,
      media: '',
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      onchange: null,
      dispatchEvent() {
        return false;
      },
    });
  }
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('pagination table row spacers', () => {
  it('mirrors page spacing widgets into every overflowing table cell', async () => {
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
        { timeout: 2000 },
      );

      await waitFor(() => {
        expect(editor.view.state.doc.childCount).toBeGreaterThan(0);
      });

      const docNode = editor.view.state.doc;
      let breakPos = null;
      docNode.descendants((node, pos) => {
        if (breakPos != null) {
          return false;
        }
        if (node.type?.name !== 'table') {
          return true;
        }
        if (TARGET_ROW_INDEX >= node.childCount) {
          return true;
        }
        let rowPos = pos + 1;
        for (let index = 0; index < TARGET_ROW_INDEX; index += 1) {
          rowPos += node.child(index).nodeSize;
        }
        const rowNode = node.child(TARGET_ROW_INDEX);
        if (!rowNode || TARGET_CELL_INDEX >= rowNode.childCount) {
          return true;
        }
        let cellPos = rowPos + 1;
        for (let index = 0; index < TARGET_CELL_INDEX; index += 1) {
          cellPos += rowNode.child(index).nodeSize;
        }
        breakPos = cellPos + 1;
        return false;
      });
      expect(breakPos).toBeTruthy();

      const paginationLayout = {
        pages: [
          {
            pageIndex: 0,
            break: { pos: breakPos },
            metrics: {
              footerHeightPx: 96,
              marginBottomPx: 96,
            },
            pageBottomSpacingPx: 0,
          },
          {
            pageIndex: 1,
            metrics: {
              headerHeightPx: 0,
              marginTopPx: 0,
              pageGapPx: 0,
            },
          },
        ],
      };
      editor.commands.updatePagination(paginationLayout);

      const expectedSpacingHeight = (() => {
        const currentPage = paginationLayout.pages[0] ?? {};
        const nextPage = paginationLayout.pages[1] ?? {};

        const currentMetrics = currentPage.metrics ?? {};
        const footerHeight = Number.isFinite(currentMetrics.footerHeightPx) ? currentMetrics.footerHeightPx : 0;
        const footerMargin = Number.isFinite(currentMetrics.marginBottomPx)
          ? currentMetrics.marginBottomPx
          : footerHeight;
        const footerReserved = Math.max(footerHeight, footerMargin, 0);
        const pageBottomSpacing = Number.isFinite(currentPage.pageBottomSpacingPx)
          ? currentPage.pageBottomSpacingPx
          : 0;

        const nextMetrics = nextPage.metrics ?? {};
        const nextHeaderHeight = Number.isFinite(nextMetrics.headerHeightPx) ? nextMetrics.headerHeightPx : 0;
        const nextHeaderMargin = Number.isFinite(nextMetrics.marginTopPx) ? nextMetrics.marginTopPx : nextHeaderHeight;
        const nextHeaderReserved = Math.max(nextHeaderHeight, nextHeaderMargin, 0);
        const nextPageGap = Number.isFinite(nextMetrics.pageGapPx) ? nextMetrics.pageGapPx : 0;

        return String(pageBottomSpacing + footerReserved + nextHeaderReserved + nextPageGap);
      })();

      await waitFor(
        () => {
          const pluginState = PaginationPluginKey.getState(editor.view.state);
          expect(pluginState?.decorations).toBeTruthy();
        },
        { timeout: 2000 },
      );

      const tableRows = Array.from(editor.view.dom.querySelectorAll('table tr'));
      const targetRow = tableRows[TARGET_ROW_INDEX];
      expect(targetRow).toBeTruthy();

      const highlightSelector = '.pagination-spacing-highlight[data-pagination-spacing-kind="page-spacing"]';
      const highlights = Array.from(targetRow.querySelectorAll(highlightSelector));

      const targetCells = Array.from(targetRow.querySelectorAll('td, th'));
      expect(targetCells.length).toBeGreaterThan(0);
      targetCells.forEach((cell) => {
        const cellHighlights = cell.querySelectorAll(highlightSelector);
        expect(cellHighlights.length).toBe(1);
      });
      expect(highlights.length).toBe(targetCells.length);

      const uniqueHeights = new Set(highlights.map((node) => node.dataset.paginationSpacingHeight));
      expect(uniqueHeights.size).toBe(1);
      const [heightValue] = Array.from(uniqueHeights);
      expect(heightValue).toBe(expectedSpacingHeight);
    } finally {
      editor.destroy();
    }
  });
});
