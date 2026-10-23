import { describe, expect, it } from 'vite-plus/test';
import { createSuperDocUI } from './create-super-doc-ui.js';

class PrototypeSelectionTargets {
  #placed: unknown[] = [];

  apply(): unknown {
    return { ok: true };
  }

  placeAroundContentControl(input: unknown): unknown {
    this.#placed.push(input);
    return { ok: true };
  }

  get placed(): readonly unknown[] {
    return this.#placed;
  }
}

class ApplyOnlySelectionTargets {
  apply(): unknown {
    return { ok: true };
  }
}

function mount(selectionTargets: object) {
  const editor = {
    editorVersion: 2,
    doc: {},
    host: { getHandles: () => ({ editing: { selectionTargets } }) },
  };
  const ui = createSuperDocUI({ superdoc: { activeEditor: editor } as never });
  return ui;
}

describe('selection host reads over a helper that is not an object literal', () => {
  it('places around a content control on the helper as receiver', async () => {
    const helper = new PrototypeSelectionTargets();
    expect(Object.getPrototypeOf(helper)).not.toBe(Object.prototype);
    const ui = mount(helper);

    try {
      await expect(ui.selection.placeAroundContentControl({ id: 'cc-1' })).resolves.toEqual({ ok: true });
      expect(helper.placed).toEqual([{ id: 'cc-1' }]);
    } finally {
      ui.destroy();
    }
  });

  it('reports the capability unavailable when the helper has no placement method', async () => {
    const ui = mount(new ApplyOnlySelectionTargets());

    try {
      await expect(ui.selection.placeAroundContentControl({ id: 'cc-1' })).resolves.toEqual({
        ok: false,
        reason: 'host-capability-unavailable',
      });
    } finally {
      ui.destroy();
    }
  });
});
