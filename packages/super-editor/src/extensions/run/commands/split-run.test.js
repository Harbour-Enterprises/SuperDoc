import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { TextSelection, EditorState } from 'prosemirror-state';
import { initTestEditor } from '@tests/helpers/helpers.js';

let splitRunToParagraph;

beforeAll(async () => {
  ({ splitRunToParagraph } = await import('@extensions/run/commands/split-run.js'));
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

const getParagraphTexts = (doc) => {
  const texts = [];
  doc.descendants((node) => {
    if (node.type.name === 'paragraph') {
      texts.push(node.textContent);
    }
  });
  return texts;
};

describe('splitRunToParagraph command', () => {
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

    const handled = editor.commands.splitRunToParagraph();

    expect(handled).toBe(false);
  });

  it('returns false when cursor is not inside a run node', () => {
    loadDoc(PLAIN_PARAGRAPH_DOC);

    updateSelection(1);

    const handled = editor.commands.splitRunToParagraph();

    expect(handled).toBe(false);
  });

  it('delegates to splitBlock when cursor is inside a run', () => {
    loadDoc(RUN_DOC);

    const start = findTextPos('Hello');
    expect(start).not.toBeNull();
    updateSelection((start ?? 0) + 2);

    expect(editor.view.state.selection.$from.parent.type.name).toBe('run');

    const handled = editor.commands.splitRunToParagraph();

    expect(handled).toBe(true);

    const paragraphTexts = getParagraphTexts(editor.view.state.doc);
    expect(paragraphTexts).toEqual(['He', 'llo']);
  });
});
