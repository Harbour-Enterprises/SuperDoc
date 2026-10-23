import { describe, expect, it } from 'vite-plus/test';
import { createSuperDocUI } from './create-super-doc-ui.js';

class PrototypeHostSearch {
  #total = 0;
  #activeIndex = -1;

  setSession(query: unknown): unknown {
    this.#total = typeof query === 'string' && query.length > 0 ? 3 : 0;
    this.#activeIndex = this.#total > 0 ? 0 : -1;
    return this.getState();
  }

  getState(): unknown {
    return { total: this.#total, activeMatchIndex: this.#activeIndex, matches: Array.from({ length: this.#total }) };
  }

  next(): unknown {
    this.#activeIndex = (this.#activeIndex + 1) % Math.max(this.#total, 1);
    return this.getState();
  }

  clear(): unknown {
    this.#total = 0;
    this.#activeIndex = -1;
    return this.getState();
  }
}

class PrototypeEditCommandSearch {
  #total = 0;
  #activeIndex = -1;

  query(input: unknown): unknown {
    const query = (input as { query?: unknown })?.query;
    this.#total = typeof query === 'string' && query.length > 0 ? 3 : 0;
    this.#activeIndex = this.#total > 0 ? 0 : -1;
    return this.getState();
  }

  getState(): unknown {
    return { total: this.#total, activeMatchIndex: this.#activeIndex, matches: Array.from({ length: this.#total }) };
  }

  next(): unknown {
    this.#activeIndex = (this.#activeIndex + 1) % Math.max(this.#total, 1);
    return this.getState();
  }
}

describe('public search over a host that is not an object literal', () => {
  it('calls host search methods on their own prototype receiver', () => {
    const search = new PrototypeHostSearch();
    expect(Object.getPrototypeOf(search)).not.toBe(Object.prototype);

    const ui = createSuperDocUI({
      superdoc: { activeEditor: { editorVersion: 2, host: { search }, doc: {} } } as never,
    });
    try {
      expect(ui.search.getSnapshot()).toMatchObject({ available: true });
      ui.search.find('Trustee');
      expect(ui.search.getSnapshot()).toMatchObject({ total: 3, activeIndex: 0, reason: undefined });
      expect(ui.search.next()).toEqual({ ok: true });
      expect(ui.search.getSnapshot()).toMatchObject({ total: 3, activeIndex: 1 });
    } finally {
      ui.destroy();
    }
  });

  it('calls edit-command search methods on their own prototype receiver', () => {
    const search = new PrototypeEditCommandSearch();
    expect(Object.getPrototypeOf(search)).not.toBe(Object.prototype);

    const ui = createSuperDocUI({
      superdoc: {
        activeEditor: {
          editorVersion: 2,
          editCommands: { search, getSnapshot: () => ({ commands: {} }) },
          doc: {},
        },
      } as never,
    });
    try {
      expect(ui.search.getSnapshot()).toMatchObject({ available: true });
      ui.search.find('Trustee');
      expect(ui.search.getSnapshot()).toMatchObject({ total: 3, activeIndex: 0, reason: undefined });
      expect(ui.search.next()).toEqual({ ok: true });
      expect(ui.search.getSnapshot()).toMatchObject({ total: 3, activeIndex: 1 });
    } finally {
      ui.destroy();
    }
  });
});
