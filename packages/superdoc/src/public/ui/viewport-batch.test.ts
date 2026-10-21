import { describe, expect, it, vi } from 'vite-plus/test';
import { createSuperDocUI } from './create-super-doc-ui.js';

function harness() {
  let generation = 1;
  const rect = { left: 1, right: 3, top: 2, bottom: 6, width: 2, height: 4 };
  const host = {
    getPageMetricsSnapshot: () => ({ documentId: 'doc', layoutGeneration: generation, renderEpoch: generation }),
    getLocalMutationRevision: () => generation,
    getTargetRects: vi.fn(() => ({ success: true, rects: [rect] })),
  };
  const superdoc = { activeEditor: { id: 'one', editorVersion: 2, host, editCommands: {} }, on() {}, off() {} };
  const ui = createSuperDocUI({ superdoc });
  return {
    ui,
    host,
    superdoc,
    change: () => {
      generation++;
    },
  };
}
const target = { kind: 'text' as const, blockId: 'one', range: { start: 0, end: 1 } };

describe('batch viewport geometry', () => {
  it('agrees with 500 single queries, preserves order and yields to input', async () => {
    const h = harness();
    const expected = h.ui.viewport.getRect({ target });
    let inputRan = false;
    const pending = h.ui.viewport.getRects({ targets: Array.from({ length: 500 }, () => target) });
    setTimeout(() => {
      inputRan = true;
    }, 0);
    const result = await pending;
    expect(inputRan).toBe(true);
    expect(result.status).toBe('complete');
    expect(result.results).toEqual(Array.from({ length: 500 }, () => expected));
    h.ui.destroy();
  });
  it.each(['metrics', 'observation', 'cleanup'] as const)('handles a failing host %s hook', async (hook) => {
    const h = harness();
    const fail = () => {
      throw new Error('retired host');
    };
    if (hook === 'metrics') h.host.getPageMetricsSnapshot = fail;
    Object.assign(h.host, { observeGeometry: hook === 'observation' ? fail : () => fail });
    const result = await h.ui.viewport.getRects({ targets: [target] });
    expect(result.status).toBe(hook === 'cleanup' ? 'complete' : 'stale');
    h.ui.destroy();
  });
  it.each(['mutation', 'replacement', 'dispose', 'cancel'] as const)(
    'invalidates the entire request after %s',
    async (action) => {
      const h = harness();
      const controller = new AbortController();
      const pending = h.ui.viewport.getRects({
        targets: Array.from({ length: 500 }, () => target),
        signal: controller.signal,
      });
      if (action === 'mutation') h.change();
      if (action === 'replacement') h.superdoc.activeEditor = { ...h.superdoc.activeEditor, id: 'two' };
      if (action === 'dispose') h.ui.destroy();
      if (action === 'cancel') controller.abort();
      const result = await pending;
      expect(result.status).toBe(action === 'dispose' ? 'disposed' : action === 'cancel' ? 'cancelled' : 'stale');
      expect(result.results).toHaveLength(500);
      expect(result.results.every((row) => !row.found)).toBe(true);
      h.ui.destroy();
    },
  );
});
