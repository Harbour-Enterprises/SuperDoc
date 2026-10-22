import { describe, expect, it, vi } from 'vite-plus/test';
import {
  createSuperDocUI,
  executeFirstPartyCommandAsync,
  registerFirstPartyCommandMutation,
} from './create-super-doc-ui.js';
import { SUPERDOC_UI_REASONS } from './reasons.js';

const target = {
  kind: 'selection',
  story: { kind: 'story', storyType: 'body' },
  start: { kind: 'text', blockId: 'first-cell', offset: 0 },
  end: { kind: 'text', blockId: 'last-cell', offset: 5 },
};
const empty = {
  empty: true,
  target: null,
  selectionTarget: null,
  activeMarks: [],
  activeCommentIds: [],
  activeChangeIds: [],
};
const table = { ...empty, empty: false, selectionTarget: target };

function heldTableFormatting() {
  const story = target.story;
  const segments = ['first-cell', 'middle-cell', 'last-cell'].map((blockId) => ({
    blockId,
    range: { start: 0, end: 5 },
  }));
  const selected = {
    ...table,
    target: { kind: 'text', story, segments },
    tableSelection: {
      kind: 'tableCells',
      type: 'table',
      selectionMode: 'cells',
      isRectangular: true,
      tableId: 'table',
      story,
      start: { rowIndex: 0, columnIndex: 0 },
      end: { rowIndex: 0, columnIndex: 2 },
      cells: segments.map(({ blockId }, columnIndex) => ({
        nodeId: blockId,
        rowIndex: 0,
        columnIndex,
        rowspan: 1,
        colspan: 1,
      })),
    },
  };
  let nodeId: string | null = null;
  let listener: ((nodeId: string | null) => void) | null = null;
  let hostSelection: object = {
    revision: 1,
    anchor: { blockId: 'first-cell', blockOffset: 0 },
    focus: { blockId: 'last-cell', blockOffset: 5 },
    story,
  };
  let mounted = {};
  let lifetime = new AbortController();
  let applied: unknown = selected;
  let foreground = { active: 0, pending: 0 };
  const reads: Array<(value: unknown) => void> = [];
  const events = new Map<string, (...args: unknown[]) => void>();
  let hostEvent: ((event: unknown) => void) | null = null;
  const alignments = new Map<string, string>();
  const setAlignment = vi.fn((input: { target: { nodeId: string }; alignment: string }) => {
    alignments.set(input.target.nodeId, input.alignment);
    return { success: true };
  });
  let selectionListener: ((snapshot: object) => void) | null = null;
  const selectionSource = {
    getSnapshot: () => hostSelection,
    subscribe: (next: typeof selectionListener) => {
      selectionListener = next;
      return () => {};
    },
  };
  const tableSource = {
    getWholeTableNodeId: () => nodeId,
    subscribeWholeTable: (next: typeof listener) => {
      listener = next;
      return () => {};
    },
  };
  const host = {
    getHandles: () => ({ editing: { selection: selectionSource }, selection: tableSource }),
    readLiveSelectionSyncSnapshot: () => (nodeId ? selected : empty),
    readAppliedSelectionPresentation: () => (applied ? { selection: applied } : null),
    getForegroundMutationState: () => foreground,
    getForegroundInteractionLifetime: () => lifetime.signal,
    getMountedHandle: () => mounted,
    getSnapshot: () => ({ state: 'editing-ready', documentMode: 'editing' }),
    events: {
      subscribe: (next: typeof hostEvent) => {
        hostEvent = next;
        return () => {};
      },
    },
  };
  const doc = {
    selection: { current: () => new Promise((resolve) => reads.push(resolve)) },
    format: { paragraph: { setAlignment } },
  };
  const superdoc = {
    activeEditor: { id: 'editor', editorVersion: 2, host, doc },
    config: { documentMode: 'editing' },
    on: (event: string, next: (...args: unknown[]) => void) => events.set(event, next),
    off: () => {},
  };
  registerFirstPartyCommandMutation(superdoc, host, {
    supports: (path) => path === 'format.paragraph.setAlignment',
    run: (_path, args) => setAlignment(args[0] as Parameters<typeof setAlignment>[0]),
    runListApply: async () => false,
  });
  const ui = createSuperDocUI({ superdoc } as never);
  const select = () => {
    nodeId = 'table';
    listener!('table');
  };
  return {
    ui,
    select,
    setAlignment,
    alignments,
    selected,
    publishRange: () => selectionListener?.(hostSelection),
    clear: () => {
      nodeId = null;
      listener!(null);
    },
    changeSelection: () => {
      hostSelection = {
        revision: 2,
        anchor: { blockId: 'first-cell', blockOffset: 0 },
        focus: { blockId: 'first-cell', blockOffset: 0 },
        story,
      };
    },
    retire: () => {
      lifetime.abort();
      lifetime = new AbortController();
    },
    remount: () => {
      mounted = {};
    },
    sourceChange: () => events.get('document-replaced')?.({ host }),
    mutateSource: () => hostEvent?.({ type: 'document:mutated' }),
    changeDocument: () => {
      superdoc.activeEditor.doc = { ...doc };
    },
    changeTable: () => {
      nodeId = 'other-table';
    },
    unpaint: () => {
      applied = null;
    },
    changeAppliedTarget: () => {
      applied = { ...selected, target: { ...selected.target, segments: segments.slice(1) } };
    },
    changeAppliedCells: () => {
      applied = {
        ...selected,
        tableSelection: { ...selected.tableSelection, cells: selected.tableSelection.cells.slice(1) },
      };
    },
    queueInput: () => {
      foreground = { active: 1, pending: 1 };
    },
    destroy: () => {
      ui.destroy();
      for (const resolve of reads) resolve(empty);
    },
  };
}

describe('whole-table host selection subscription', () => {
  it('aligns every current table paragraph after a range publication makes its held read stale', async () => {
    const h = heldTableFormatting();
    try {
      h.select();
      h.publishRange();
      expect(h.ui.selection.getSnapshot().status).toBe('stale');
      expect(h.ui.selection.getSnapshot().target?.segments).toHaveLength(3);
      void executeFirstPartyCommandAsync(h.ui, 'text-align', 'center').catch(() => {});
      await vi.waitFor(() => expect(h.setAlignment).toHaveBeenCalledTimes(3));
      expect([...h.alignments]).toEqual(['first-cell', 'middle-cell', 'last-cell'].map((id) => [id, 'center']));
    } finally {
      h.destroy();
    }
  });

  it.each([
    'clear',
    'changeSelection',
    'retire',
    'remount',
    'sourceChange',
    'mutateSource',
    'changeDocument',
    'changeTable',
    'unpaint',
    'changeAppliedTarget',
    'changeAppliedCells',
    'queueInput',
  ] as const)('does not reuse a stale table paragraph seed after %s', async (change) => {
    const h = heldTableFormatting();
    try {
      h.select();
      h.publishRange();
      h[change]();
      void executeFirstPartyCommandAsync(h.ui, 'text-align', 'center').catch(() => {});
      for (let i = 0; i < 8; i++) await Promise.resolve();
      expect(h.setAlignment).not.toHaveBeenCalled();
    } finally {
      h.destroy();
    }
  });

  it('seeds and clears the formatting target before held worker reads settle', async () => {
    let nodeId: string | null = null;
    let listener: ((nodeId: string | null) => void) | null = null;
    const detach = vi.fn(() => {
      listener = null;
    });
    const pending: Array<(info: unknown) => void> = [];
    const selectionSource = { subscribe: () => () => {} };
    const host = {
      getHandles: () => ({
        editing: { selection: selectionSource },
        selection: {
          getWholeTableNodeId: () => nodeId,
          subscribeWholeTable: (next: typeof listener) => {
            listener = next;
            return detach;
          },
        },
      }),
      readLiveSelectionSyncSnapshot: () => (nodeId ? table : empty),
    };
    const superdoc = {
      activeEditor: {
        id: 'editor',
        editorVersion: 2,
        host,
        doc: { selection: { current: () => new Promise((resolve) => pending.push(resolve)) } },
      },
      on: () => {},
      off: () => {},
    };
    const ui = createSuperDocUI({ superdoc } as never);
    nodeId = 'table';
    listener!('table');
    expect(ui.selection.getSnapshot()).toMatchObject({ empty: false, selectionTarget: target });
    const selectedTableRead = pending.at(-1);
    nodeId = null;
    listener!(null);
    expect(ui.selection.getSnapshot()).toMatchObject({ empty: true, selectionTarget: null });
    // A delayed read for the old selection must not re-enable table formatting.
    selectedTableRead?.(table);
    await Promise.resolve();
    expect(ui.selection.getSnapshot()).toMatchObject({ empty: true, selectionTarget: null });
    ui.destroy();
    expect(detach).toHaveBeenCalledOnce();
  });
});

describe('restoring a captured cell selection', () => {
  const mountRestoreHost = () => {
    const apply = vi.fn(() => ({ ok: true }));
    const host = { getHandles: () => ({ editing: { selectionTargets: { apply } } }) };
    const ui = createSuperDocUI({
      superdoc: { activeEditor: { editorVersion: 2, host, doc: {} } },
    } as never);
    return { ui, apply };
  };

  it('re-applies a well-formed captured cell target as a cell selection', () => {
    const { ui, apply } = mountRestoreHost();
    try {
      expect(ui.selection.restore({ _tableCellSelectionTarget: target } as never)).toMatchObject({
        ok: true,
        success: true,
      });
      expect(apply).toHaveBeenCalledWith(expect.objectContaining({ kind: 'selection' }), { tableCells: true });
    } finally {
      ui.destroy();
    }
  });

  it.each([
    { label: 'a non-object point', start: 'first-cell' },
    { label: 'a string offset', start: { kind: 'text', blockId: 'first-cell', offset: '0' } },
    { label: 'a negative offset', start: { kind: 'text', blockId: 'first-cell', offset: -1 } },
    { label: 'a fractional offset', start: { kind: 'text', blockId: 'first-cell', offset: 1.5 } },
    { label: 'an empty blockId', start: { kind: 'text', blockId: '', offset: 0 } },
  ])('rejects $label without throwing and without reaching the host', ({ start }) => {
    const { ui, apply } = mountRestoreHost();
    try {
      expect(ui.selection.restore({ _tableCellSelectionTarget: { ...target, start } } as never)).toMatchObject({
        ok: false,
        success: false,
        reason: SUPERDOC_UI_REASONS.targetUnresolved,
      });
      expect(apply).not.toHaveBeenCalled();
    } finally {
      ui.destroy();
    }
  });
});
