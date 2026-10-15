import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { isAllowed } from '../../core/collaboration/permissions.js';
import { createSuperDocUI } from './create-super-doc-ui.js';

const change = { id: 'tc-1', type: 'insert', author: 'Alice' };
const mounted: ReturnType<typeof createSuperDocUI>[] = [];
afterEach(() => mounted.splice(0).forEach((ui) => ui.destroy()));

function mount(
  list: () => unknown,
  ids = ['tc-1'],
  windowItems?: unknown[],
  user: { name: string; email?: string } = { name: 'Alice' },
) {
  const listeners = new Map<string, Set<(payload?: unknown) => void>>();
  const hostListeners = new Set<(event: unknown) => void>();
  const decide = vi.fn(() => ({ success: true }));
  const canPerformPermission = vi.fn(({ permission }: { permission: string }) => !permission.endsWith('_OWN'));
  const editor = {
    editorVersion: 2,
    host: {
      events: {
        subscribe(listener: (event: unknown) => void) {
          hostListeners.add(listener);
          return () => hostListeners.delete(listener);
        },
      },
    },
    ...(windowItems
      ? {
          reviewWindow: { getSnapshot: () => ({ status: 'ready', trackedChangeItems: windowItems, commentItems: [] }) },
        }
      : {}),
    doc: {
      selection: { current: () => ({ empty: false, activeChangeIds: ids, activeCommentIds: [], activeMarks: [] }) },
      trackChanges: { list: vi.fn(list), decide },
    },
  };
  const superdoc = {
    activeEditor: editor,
    config: { documentMode: 'editing', user },
    canPerformPermission,
    on(event: string, listener: (payload?: unknown) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener);
    },
    off(event: string, listener: (payload?: unknown) => void) {
      listeners.get(event)?.delete(listener);
    },
  };
  const ui = createSuperDocUI({ superdoc: superdoc as never });
  mounted.push(ui);
  const emit = (event: string, payload?: unknown) => listeners.get(event)?.forEach((listener) => listener(payload));
  return {
    ui,
    editor,
    superdoc,
    emit,
    setWindowItems: (items: unknown[]) => {
      windowItems = items;
    },
    emitMutation: () =>
      hostListeners.forEach((listener) => listener({ type: 'mutation:committed', origin: 'command' })),
    refresh: () => emit('document-mode-change'),
    list: editor.doc.trackChanges.list,
    decide,
    canPerformPermission,
  };
}
async function settle() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}
function pending() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('tracked-change permission reads (SD-5019)', () => {
  it('bounds pending catalog requests across selected IDs and repeated recomputes', () => {
    const read = pending();
    const h = mount(() => read.promise, ['tc-1', 'tc-2', 'tc-3']);
    for (let i = 0; i < 20; i++) h.refresh();
    // Current/all-story consumers may each request a catalog; permission
    // checks must not multiply those requests on the worker queue.
    expect(h.list.mock.calls.length).toBeGreaterThan(0);
    expect(h.list.mock.calls.length).toBeLessThanOrEqual(2);
    expect(h.decide).not.toHaveBeenCalled();
  });
  it('does not retry a settled catalog when a selected ID is absent', async () => {
    const h = mount(async () => ({ items: [] }));
    await settle();
    for (let i = 0; i < 20; i++) h.refresh();
    expect(h.list.mock.calls.length).toBeLessThanOrEqual(2);
    expect(h.decide).not.toHaveBeenCalled();
  });
  it.each([
    { label: 'visible', items: [change] },
    { label: 'missing', items: [] },
  ])('keeps $label page-window permission reads free of catalog requests', ({ items }) => {
    const h = mount(async () => ({ items: [change] }), ['tc-1'], items);
    for (let i = 0; i < 20; i++) h.refresh();
    expect(h.list).not.toHaveBeenCalled();
  });
  it('reads current window authorship on the first computation and after an update', () => {
    const items = [change];
    const h = mount(async () => ({ items: [] }), ['tc-1'], items);
    expect(h.ui.commands.get('track-changes-accept-selection').getState().enabled).toBe(false);
    h.setWindowItems([{ ...change, author: 'Bob' }]);
    h.refresh();
    expect(h.ui.commands.get('track-changes-accept-selection').getState().enabled).toBe(true);
    expect(h.list).not.toHaveBeenCalled();
  });
  it('uses an explicitly loaded off-window directory without repeated reads', async () => {
    const h = mount(async () => ({ items: [change] }), ['tc-1'], []);
    const unsubscribe = h.ui.trackChanges.observe(() => {});
    await settle();
    const callsAfterDirectoryLoad = h.list.mock.calls.length;
    expect(callsAfterDirectoryLoad).toBeGreaterThan(0);
    for (let i = 0; i < 20; i++) h.refresh();
    expect(h.ui.commands.get('track-changes-accept-selection').getState().enabled).toBe(false);
    expect(h.canPerformPermission).toHaveBeenCalledWith(
      expect.objectContaining({
        permission: 'RESOLVE_OWN',
        trackedChange: expect.objectContaining({ author: 'Alice' }),
      }),
    );
    expect(h.list).toHaveBeenCalledTimes(callsAfterDirectoryLoad);
    unsubscribe();
  });
  it('uses the new editor window immediately after switching editors', () => {
    const h = mount(async () => ({ items: [] }), ['tc-1'], [change]);
    expect(h.ui.commands.get('track-changes-accept-selection').getState().enabled).toBe(false);
    h.superdoc.activeEditor = {
      ...h.editor,
      reviewWindow: {
        getSnapshot: () => ({ status: 'ready', trackedChangeItems: [{ ...change, author: 'Bob' }], commentItems: [] }),
      },
    };
    h.emit('active-editor-change');
    expect(h.ui.commands.get('track-changes-accept-selection').getState().enabled).toBe(true);
    expect(h.list).not.toHaveBeenCalled();
  });
  it('handles a rejected catalog without launching a retry per permission check', async () => {
    const h = mount(() => Promise.reject(new Error('catalog unavailable')));
    await settle();
    for (let i = 0; i < 20; i++) h.refresh();
    expect(h.list.mock.calls.length).toBeLessThanOrEqual(2);
    expect(h.decide).not.toHaveBeenCalled();
  });
  it('uses settled asynchronous authorship to deny own-change decisions', async () => {
    const read = pending();
    const h = mount(() => read.promise);
    read.resolve({ items: [change] });
    await settle();
    h.refresh();
    expect(h.ui.commands.get('track-changes-accept-selection').getState().enabled).toBe(false);
    expect(h.canPerformPermission).toHaveBeenCalledWith(
      expect.objectContaining({
        permission: 'RESOLVE_OWN',
        trackedChange: expect.objectContaining({ author: 'Alice' }),
      }),
    );
    expect(await h.ui.toolbar.execute('track-changes-accept-selection')).toBe(false);
    expect(h.decide).not.toHaveBeenCalled();
  });
  it('retains synchronous own-change denial and other-change acceptance', async () => {
    const own = mount(() => ({ items: [change] }));
    expect(own.ui.commands.get('track-changes-accept-selection').getState().enabled).toBe(false);
    expect(await own.ui.toolbar.execute('track-changes-accept-selection')).toBe(false);
    expect(own.decide).not.toHaveBeenCalled();
    const other = mount(() => ({ items: [{ ...change, author: 'Bob' }] }));
    expect(other.ui.commands.get('track-changes-accept-selection').getState().enabled).toBe(true);
    expect(await other.ui.toolbar.execute('track-changes-accept-selection')).toEqual({ success: true });
    expect(other.decide).toHaveBeenCalledTimes(1);
  });
  it.each([false, true])('retains known ownership during refresh (window directory: %s)', async (windowDirectory) => {
    const own = { ...change, authorEmail: 'alice@example.test' };
    const h = mount(async () => ({ items: [own] }), ['tc-1'], windowDirectory ? [] : undefined, {
      name: 'Alice',
      email: 'alice@example.test',
    });
    const unsubscribe = windowDirectory ? h.ui.trackChanges.observe(() => {}) : () => {};
    await settle();
    h.refresh();
    expect(h.ui.commands.get('track-changes-accept-selection').getState().enabled).toBe(false);
    const refreshing = pending();
    h.list.mockImplementation(() => refreshing.promise);
    h.emitMutation();
    expect(h.ui.commands.get('track-changes-accept-selection').getState().enabled).toBe(false);
    expect(h.ui.trackChanges.accept('tc-1')).toBe(false);
    expect(await h.ui.toolbar.execute('track-changes-accept-selection')).toBe(false);
    expect(h.decide).not.toHaveBeenCalled();
    refreshing.resolve({ items: [{ ...change, author: 'Bob', authorEmail: 'bob@example.test' }] });
    await settle();
    h.refresh();
    expect(h.ui.commands.get('track-changes-accept-selection').getState().enabled).toBe(true);
    unsubscribe();
  });
  it('ignores an old catalog settling after document replacement', async () => {
    const old = pending();
    const h = mount(() => old.promise);
    h.list.mockImplementation(async () => ({ items: [{ ...change, author: 'Bob' }] }));
    h.emit('document-replaced', { editor: h.editor });
    await settle();
    old.resolve({ items: [change] });
    await settle();
    h.refresh();
    expect(h.ui.commands.get('track-changes-accept-selection').getState().enabled).toBe(true);
  });
});

describe('SD-5713 unknown ownership', () => {
  it.each(['accept', 'reject'] as const)('allows %s when both ownership permissions allow', async (decision) => {
    const h = mount(async () => ({ items: [] }), ['tc-off-window'], []);
    h.canPerformPermission.mockImplementation(({ permission }) => isAllowed(permission, 'editor', false));
    h.refresh();
    expect(h.ui.commands.get(`track-changes-${decision}-selection`).getState().enabled).toBe(true);
    expect(await h.ui.toolbar.execute(`track-changes-${decision}-selection`)).toEqual({ success: true });
    expect(h.decide).toHaveBeenCalledTimes(1);
    const prefix = decision === 'accept' ? 'RESOLVE' : 'REJECT';
    expect(h.canPerformPermission).toHaveBeenCalledWith(expect.objectContaining({ permission: `${prefix}_OWN` }));
    expect(h.canPerformPermission).toHaveBeenCalledWith(expect.objectContaining({ permission: `${prefix}_OTHER` }));
    expect(h.list).not.toHaveBeenCalled();
  });
  it.each(['OWN', 'OTHER'])('keeps unknown ownership blocked when %s is denied', async (ownership) => {
    const h = mount(async () => ({ items: [] }), ['tc-off-window'], []);
    h.canPerformPermission.mockImplementation(({ permission }) => !permission.endsWith(`_${ownership}`));
    h.refresh();
    for (const decision of ['accept', 'reject']) {
      expect(h.ui.commands.get(`track-changes-${decision}-selection`).getState()).toMatchObject({
        enabled: false,
        reason: 'permission-denied',
      });
      expect(await h.ui.toolbar.execute(`track-changes-${decision}-selection`)).toBe(false);
    }
    expect(h.decide).not.toHaveBeenCalled();
    expect(h.list).not.toHaveBeenCalled();
  });
});

describe('SD-5713 unsupported range commands', () => {
  it.each([1, 2])('disables both decisions for an unsplittable selection over %s changes', async (count) => {
    const ids = ['tc-1', 'tc-2'].slice(0, count);
    const rows = ids.map((id) => ({
      ...change,
      id,
      type: 'insertion',
      grouping: 'standalone',
      insertedText: 'alpha omega',
    }));
    const h = mount(() => ({ items: rows }), ids, rows);
    h.canPerformPermission.mockImplementation(() => true);
    h.editor.doc.selection.current = () => ({
      empty: false,
      activeChangeIds: ids,
      activeCommentIds: [],
      activeMarks: [],
      text: 'al',
      selectionTarget: {
        kind: 'selection',
        start: { kind: 'text', blockId: 'P1', offset: 0 },
        end: { kind: 'text', blockId: 'P1', offset: 2 },
      },
      trackedChangeRangeDecisionSupported: false,
    });
    h.emitMutation();
    h.refresh();
    for (const decision of ['accept', 'reject']) {
      expect(h.ui.commands.get(`track-changes-${decision}-selection`).getState()).toMatchObject({
        enabled: false,
        reason: 'operation-unavailable',
      });
    }
    expect(h.decide).not.toHaveBeenCalled();
  });
});
