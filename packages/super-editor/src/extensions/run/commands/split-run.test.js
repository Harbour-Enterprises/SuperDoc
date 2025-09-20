import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { TextSelection, EditorState } from 'prosemirror-state';
import { initTestEditor } from '@tests/helpers/helpers.js';

vi.mock('prosemirror-commands', () => ({
  splitBlock: vi.fn(),
}));

let splitRun;
let splitBlock;

beforeAll(async () => {
  splitBlock = (await import('prosemirror-commands')).splitBlock;
  ({ splitRun } = await import('@extensions/run/commands/split-run.js'));
});

const RUN_DOC = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'run',
          content: [{ type: 'text', text: 'Hello' }],
        },
      ],
    },
  ],
};

const PLAIN_PARAGRAPH_DOC = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Plain' }],
    },
  ],
};

describe('splitRun command', () => {
  let editor;
  let originalMatchMedia;

  const loadDoc = (json) => {
    const docNode = editor.schema.nodeFromJSON(json);
    const state = EditorState.create({ schema: editor.schema, doc: docNode });
    editor.view.updateState(state);
  };

  const updateSelection = (from, to = from) => {
    const { view } = editor;
    const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to));
    view.dispatch(tr);
  };

  const findTextPos = (text) => {
    let pos = null;
    editor.view.state.doc.descendants((node, position) => {
      if (node.type.name === 'text' && node.text === text) {
        pos = position;
        return false;
      }
      return true;
    });
    return pos;
  };

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    if (!originalMatchMedia) {
      window.matchMedia = vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
    }
    ({ editor } = initTestEditor());
    splitBlock.mockReset();
  });

  afterEach(() => {
    editor.destroy();
    if (originalMatchMedia === undefined) {
      delete window.matchMedia;
    } else {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('returns false when selection is not empty', () => {
    loadDoc(RUN_DOC);

    const start = findTextPos('Hello');
    expect(start).not.toBeNull();
    updateSelection((start ?? 0) + 1, (start ?? 0) + 3);

    const dispatch = vi.fn();
    const handled = splitRun()({ state: editor.view.state, dispatch });

    expect(handled).toBe(false);
    expect(splitBlock).not.toHaveBeenCalled();
  });

  it('returns false when cursor is not inside a run node', () => {
    loadDoc(PLAIN_PARAGRAPH_DOC);

    updateSelection(1);

    const dispatch = vi.fn();
    const handled = splitRun()({ state: editor.view.state, dispatch });

    expect(handled).toBe(false);
    expect(splitBlock).not.toHaveBeenCalled();
  });

  it('delegates to splitBlock when cursor is inside a run', () => {
    loadDoc(RUN_DOC);

    const start = findTextPos('Hello');
    expect(start).not.toBeNull();
    updateSelection((start ?? 0) + 2);

    splitBlock.mockReturnValue('split-block-result');
    const dispatch = vi.fn();
    const handled = splitRun()({ state: editor.view.state, dispatch });

    expect(splitBlock).toHaveBeenCalledTimes(1);
    expect(splitBlock).toHaveBeenCalledWith(editor.view.state, dispatch);
    expect(handled).toBe('split-block-result');
  });
});
