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
  it('keeps the ordered four-cell context when two applied selection paints catch up during the read', async () => {
    let publishSelection = (_snapshot: unknown) => {};
    let applied = context('old');
    const selected = context('current');
    selected.table.rows = 2;
    selected.tableSelection.type = 'cells';
    selected.tableSelection.end.rowIndex = 1;
    selected.cellRange.end.rowIndex = 1;
    selected.tableSelection.cells.push(
      { nodeId: 'current/c', rowIndex: 1, columnIndex: 0, rowspan: 1, colspan: 1 },
      { nodeId: 'current/d', rowIndex: 1, columnIndex: 1, rowspan: 1, colspan: 1 },
    );
    let reads = 0;
    const host = {
      getHandles: () => ({
        editing: {
          selection: {
            subscribe: (listener: typeof publishSelection) => {
              publishSelection = listener;
              return () => {};
            },
          },
        },
      }),
      getTableContext: () => applied,
      getTableContextAsync: async () => {
        if (++reads === 2) applied = selected;
        publishSelection(null);
        return selected;
      },
    };
    const doc: Record<string, unknown> = {};
    const ui = createSuperDocUI({ superdoc: { activeEditor: { editorVersion: 2, host, doc } } as never });
    const fullRead = vi.fn(() => {
      throw new Error('Unexpected full document read');
    });
    for (const name of ['getDocument', 'getDocumentContent', 'inspect', 'getJson', 'find', 'getText'])
      doc[name] = fullRead;
    try {
      expect(await ui.tables.getContextAsync()).toMatchObject({
        status: 'ready',
        tableSelection: selected.tableSelection,
      });
      expect(reads).toBe(2);
      expect(fullRead).not.toHaveBeenCalled();
    } finally {
      ui.destroy();
    }
  });

  it.each([
    'cell IDs',
    'story',
    'selection mode',
    'grid topology',
    'pending native input',
    'document',
    'editor',
    'content',
    'mode',
  ])('does not accept the previous context across changed %s', async (change) => {
    let publishSelection = (_snapshot: unknown) => {};
    let publishEvent = (_event: unknown) => {};
    const selected = {
      ...context('current'),
      tableSelection: { ...context('current').tableSelection, story: { kind: 'story', storyType: 'body' } },
    };
    const applied = structuredClone(selected);
    if (change === 'cell IDs') applied.tableSelection.cells[1].nodeId = 'different-cell';
    if (change === 'story') applied.tableSelection.story.storyType = 'header';
    if (change === 'selection mode') applied.tableSelection.selectionMode = 'text';
    if (change === 'grid topology') applied.tableSelection.cells[1].colspan = 2;
    if (change === 'pending native input') applied.status = 'pending';
    const host = {
      getHandles: () => ({
        editing: {
          selection: {
            subscribe: (listener: typeof publishSelection) => {
              publishSelection = listener;
              return () => {};
            },
          },
        },
      }),
      events: {
        subscribe: (listener: typeof publishEvent) => {
          publishEvent = listener;
          return () => {};
        },
      },
      getTableContext: () => applied,
      getTableContextAsync: async () => {
        if (change === 'document') superdoc.activeEditor.doc = {};
        if (change === 'editor') superdoc.activeEditor = { ...superdoc.activeEditor };
        if (change === 'content') publishEvent({ type: 'mutation:committed', origin: 'typing' });
        if (change === 'mode')
          superdoc.config.documentMode = superdoc.config.documentMode === 'editing' ? 'viewing' : 'editing';
        publishSelection(null);
        return selected;
      },
    };
    const superdoc = { config: { documentMode: 'editing' }, activeEditor: { editorVersion: 2, host, doc: {} } };
    const ui = createSuperDocUI({ superdoc: superdoc as never });
    try {
      expect(await ui.tables.getContextAsync()).toMatchObject({
        status: 'stale',
        tableSelection: null,
        tableNodeId: null,
      });
    } finally {
      ui.destroy();
    }
  });

  it('requires current host facts to validate an empty context across a selection paint', async () => {
    let publishSelection = (_snapshot: unknown) => {};
    const host = {
      getHandles: () => ({
        editing: {
          selection: {
            subscribe: (listener: typeof publishSelection) => {
              publishSelection = listener;
              return () => {};
            },
          },
        },
      }),
      getTableContext: () => null,
      getTableContextAsync: async () => {
        publishSelection(null);
        return { inTable: false, status: 'ready' };
      },
    };
    const ui = createSuperDocUI({ superdoc: { activeEditor: { editorVersion: 2, host, doc: {} } } as never });
    try {
      expect(await ui.tables.getContextAsync()).toMatchObject({ status: 'stale', tableSelection: null });
    } finally {
      ui.destroy();
    }
  });

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
  it('calls a prototype method on its own host and accepts a snapshot that is not an object literal', () => {
    class HostTableContext {}
    class ClassBasedHost {
      #context = context('class-host');
      getTableContext() {
        return Object.assign(new HostTableContext(), this.#context);
      }
    }
    const host = new ClassBasedHost();
    expect(Object.getPrototypeOf(host.getTableContext())).not.toBe(Object.prototype);

    const ui = createSuperDocUI({ superdoc: { activeEditor: { editorVersion: 2, host, doc: {} } } as never });
    try {
      expect(ui.tables.getContext()).toMatchObject({
        status: 'ready',
        tableNodeId: 'class-host',
        tableSelection: context('class-host').tableSelection,
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
