import { describe, it, expect, beforeEach, vi } from 'vitest';

const editorInstances = vi.hoisted(() => []);

vi.mock('../Editor.js', () => {
  const Editor = vi.fn(function EditorStub(options) {
    this.options = options;
    this.state = { tr: { setMeta: vi.fn() } };
    this.view = { dispatch: vi.fn() };
    editorInstances.push(this);
  });
  return { Editor };
});

import { Editor } from '../Editor.js';
import { createLinkedChildEditor } from './child-editor.js';

const createParentEditor = () => {
  const tr = { setMeta: vi.fn() };
  const dispatch = vi.fn();
  return {
    options: {
      isChildEditor: false,
      pagination: { showPageNumbers: true },
      documentId: 'parent-doc',
      onCreate: () => 'parent-on-create',
    },
    converter: { numbering: { current: 'original' } },
    state: { tr },
    view: { dispatch },
  };
};

describe('createLinkedChildEditor', () => {
  beforeEach(() => {
    editorInstances.length = 0;
    Editor.mockClear();
  });

  it('returns null when current editor is already a child editor', () => {
    const currentEditor = { options: { isChildEditor: true } };
    const result = createLinkedChildEditor(currentEditor);
    expect(result).toBeNull();
    expect(Editor).not.toHaveBeenCalled();
  });

  it('creates a child editor with default overrides applied', () => {
    const currentEditor = createParentEditor();
    const childEditor = createLinkedChildEditor(currentEditor, { mode: 'preview' });

    expect(Editor).toHaveBeenCalledTimes(1);
    expect(childEditor).toBeInstanceOf(Object);

    const options = Editor.mock.calls[0][0];
    expect(options).toMatchObject({
      pagination: false,
      suppressDefaultDocxStyles: true,
      ydoc: null,
      collaborationProvider: null,
      fileSource: null,
      initialState: null,
      documentId: null,
      isCommentsEnabled: false,
      isNewFile: false,
      fragment: false,
      onCreate: expect.any(Function),
      onListDefinitionsChange: expect.any(Function),
      mode: 'preview',
      isChildEditor: true,
      parentEditor: currentEditor,
    });

    expect(options.onCreate()).toBeNull();
    expect(childEditor.options.parentEditor).toBe(currentEditor);
  });

  it('links list definition changes back to the parent editor', () => {
    const currentEditor = createParentEditor();
    const childEditor = createLinkedChildEditor(currentEditor);
    const { onListDefinitionsChange } = childEditor.options;

    const newNumbering = { levels: 2 };
    onListDefinitionsChange({
      editor: childEditor,
      numbering: newNumbering,
    });

    expect(currentEditor.converter.numbering).toBe(newNumbering);
    expect(currentEditor.state.tr.setMeta).toHaveBeenCalledWith('updatedListItemNodeViews', true);
    expect(currentEditor.view.dispatch).toHaveBeenCalledWith(currentEditor.state.tr);
  });

  it('safely returns when the parent editor has no converter', () => {
    const parent = createParentEditor();
    parent.converter = null;

    const childEditor = createLinkedChildEditor(parent);
    const { onListDefinitionsChange } = childEditor.options;

    expect(() =>
      onListDefinitionsChange({
        editor: childEditor,
        numbering: { levels: 1 },
      }),
    ).not.toThrow();

    expect(parent.state.tr.setMeta).not.toHaveBeenCalled();
    expect(parent.view.dispatch).not.toHaveBeenCalled();
  });
});
