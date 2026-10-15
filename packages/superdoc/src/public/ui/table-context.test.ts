import { describe, expect, it, vi } from 'vite-plus/test';
import { createSuperDocUI } from './create-super-doc-ui.js';

const context = (id: string, status = 'ready') => ({
  status,
  inTable: true,
  table: { nodeId: id, rows: 1, columns: 2 },
  row: { index: 0 },
  column: { index: 0 },
  cell: null,
  cellRange: { start: { rowIndex: 0, columnIndex: 0 }, end: { rowIndex: 0, columnIndex: 1 } },
  tableSelection: {
    kind: 'tableCells',
    type: 'table',
    tableId: id,
    selectionMode: 'cells',
    isRectangular: true,
    start: { rowIndex: 0, columnIndex: 0 },
    end: { rowIndex: 0, columnIndex: 1 },
    cells: [
      { nodeId: id + '/a', rowIndex: 0, columnIndex: 0, rowspan: 1, colspan: 1 },
      { nodeId: id + '/b', rowIndex: 0, columnIndex: 1, rowspan: 1, colspan: 1 },
    ],
  },
});

describe('public table context freshness', () => {
  it('hides previous IDs in a stale sync snapshot and resolves the cold async read without reading the document', async () => {
    const current = vi.fn(() => {
      throw new Error('Unexpected selection text read');
    });
    const host = { getTableContext: () => context('old', 'stale'), getTableContextAsync: async () => context('new') };
    const doc: Record<string, unknown> = {};
    const ui = createSuperDocUI({ superdoc: { activeEditor: { editorVersion: 2, host, doc } } as never });
    try {
      expect(ui.tables.getContext()).toMatchObject({
        status: 'stale',
        tableNodeId: null,
        tableSelection: null,
        cellRange: null,
      });
      // Add the sentinel after initialization; table context has no dependency on selection.current.
      doc.selection = { current };
      expect(await ui.tables.getContextAsync()).toMatchObject({
        status: 'ready',
        tableNodeId: 'new',
        tableSelection: context('new').tableSelection,
      });
      expect(current).not.toHaveBeenCalled();
    } finally {
      ui.destroy();
    }
  });

  it('discards a resolved context from a replaced host and reads its replacement', async () => {
    let settle!: (value: ReturnType<typeof context>) => void;
    const oldHost = {
      getTableContextAsync: () =>
        new Promise<ReturnType<typeof context>>((resolve) => {
          settle = resolve;
        }),
    };
    const editor = { editorVersion: 2, host: oldHost as unknown, doc: {} };
    const ui = createSuperDocUI({ superdoc: { activeEditor: editor } as never });
    try {
      const fresh = ui.tables.getContextAsync();
      editor.host = { getTableContextAsync: async () => context('replacement') };
      settle(context('old'));
      expect(await fresh).toMatchObject({
        status: 'ready',
        tableNodeId: 'replacement',
        tableSelection: context('replacement').tableSelection,
      });
    } finally {
      ui.destroy();
    }
  });
  it.each([
    { selectionMode: 'cells', isRectangular: false },
    { selectionMode: 'text', isRectangular: true },
  ])('disables rectangular merge for incompatible context: %j', async (markers) => {
    const mergeCells = vi.fn(() => ({ success: true }));
    const snapshot = context('table');
    const host = {
      getTableContext: () => ({ ...snapshot, tableSelection: { ...snapshot.tableSelection, ...markers } }),
    };
    const ui = createSuperDocUI({
      superdoc: { activeEditor: { editorVersion: 2, host, doc: { tables: { mergeCells } } } } as never,
    });
    try {
      expect(ui.commands.get('table-merge-cells').getState().enabled).toBe(false);
      expect(await ui.commands.executeAsync('table-merge-cells')).toBe(false);
      expect(mergeCells).not.toHaveBeenCalled();
    } finally {
      ui.destroy();
    }
  });
});
