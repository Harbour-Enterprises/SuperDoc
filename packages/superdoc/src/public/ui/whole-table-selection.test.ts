import { describe, expect, it, vi } from 'vite-plus/test';
import { createSuperDocUI } from './create-super-doc-ui.js';

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

describe('whole-table host selection subscription', () => {
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
