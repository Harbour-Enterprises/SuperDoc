import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { Editor } from '@core/index.js';
import { getStarterExtensions } from '@extensions/index.js';
import { TextSelection } from 'prosemirror-state';

const VIEWING_MODE = 'viewing';

const docWithPermissionRange = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'permStart', attrs: { id: '1', edGrp: 'everyone' } },
        { type: 'text', text: 'Editable section. ' },
        { type: 'permEnd', attrs: { id: '1', edGrp: 'everyone' } },
        { type: 'text', text: 'Locked section.' },
      ],
    },
  ],
};

const docWithoutPermissionRange = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'No editable ranges.' }],
    },
  ],
};

const findTextPos = (doc, searchText) => {
  let found = null;
  doc.descendants((node, pos) => {
    if (node.isText && typeof node.text === 'string' && node.text.includes(searchText) && found == null) {
      found = pos;
      return false;
    }
    return undefined;
  });
  return found;
};

describe('PermissionRanges extension', () => {
  let editor;
  let originalMatchMedia;
  let debugSpy;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    window.matchMedia = window.matchMedia || vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn() });
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    editor?.destroy();
    editor = undefined;
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    } else {
      delete window.matchMedia;
    }
    debugSpy?.mockRestore();
  });

  const createEditor = (content) => {
    editor = new Editor({
      extensions: getStarterExtensions(),
      jsonOverride: content,
      loadFromSchema: true,
      documentMode: VIEWING_MODE,
    });
    return editor;
  };

  it('keeps viewing mode editable when the document contains an everyone range', () => {
    const instance = createEditor(docWithPermissionRange);
    expect(instance.options.documentMode).toBe(VIEWING_MODE);
    const storedRanges = instance.storage.permissionRanges?.ranges ?? [];
    expect(storedRanges.length).toBeGreaterThan(0);
    expect(instance.isEditable).toBe(true);
  });

  it('stays read-only when there are no approved ranges', () => {
    const instance = createEditor(docWithoutPermissionRange);
    expect(instance.options.documentMode).toBe(VIEWING_MODE);
    expect(instance.isEditable).toBe(false);
  });

  it('blocks edits outside the permission range but allows edits inside it', () => {
    const instance = createEditor(docWithPermissionRange);
    const initialJson = instance.state.doc.toJSON();

    const lockedPos = findTextPos(instance.state.doc, 'Locked');
    expect(lockedPos).toBeGreaterThan(0);
    const setLockedSelection = instance.state.tr.setSelection(TextSelection.create(instance.state.doc, lockedPos));
    instance.view.dispatch(setLockedSelection);
    const lockedTr = instance.state.tr.insertText('X', lockedPos, lockedPos);
    instance.view.dispatch(lockedTr);
    expect(instance.state.doc.toJSON()).toEqual(initialJson);

    const editablePos = findTextPos(instance.state.doc, 'Editable');
    expect(editablePos).toBeGreaterThan(0);
    const setEditableSelection = instance.state.tr.setSelection(TextSelection.create(instance.state.doc, editablePos));
    instance.view.dispatch(setEditableSelection);
    const allowedTr = instance.state.tr.insertText('Y', editablePos, editablePos);
    instance.view.dispatch(allowedTr);
    expect(instance.state.doc.textBetween(editablePos, editablePos + 2)).toContain('Y');
  });
});
