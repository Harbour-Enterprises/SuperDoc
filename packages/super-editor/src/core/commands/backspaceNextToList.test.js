import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Schema, Fragment } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';

import { decreaseListIndent as mockDecreaseListIndent } from './decreaseListIndent.js';
import { handleBackspaceNextToList } from './backspaceNextToList.js';

vi.mock('./decreaseListIndent.js', () => ({
  decreaseListIndent: vi.fn(() => {
    // default mock: command that returns false (no outdent)
    return () => false;
  }),
}));

function makeSchema() {
  const nodes = {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'text*' },
    text: { group: 'inline' },

    orderedList: {
      group: 'block',
      content: 'listItem+',
      renderDOM: () => ['ol', 0],
      parseDOM: () => [{ tag: 'ol' }],
    },
    bulletList: {
      group: 'block',
      content: 'listItem+',
      renderDOM: () => ['ul', 0],
      parseDOM: () => [{ tag: 'ul' }],
    },
    listItem: {
      group: 'block',
      content: 'paragraph block*',
      defining: true,
      renderDOM: () => ['li', 0],
      parseDOM: () => [{ tag: 'li' }],
    },
  };
  return new Schema({ nodes });
}

function findNodePos(doc, predicate) {
  let found = null;
  doc.descendants((node, pos) => {
    if (predicate(node)) {
      found = pos;
      return false;
    }
    return true;
  });
  return found;
}

describe('handleBackspaceNextToList', () => {
  let schema;

  beforeEach(() => {
    vi.clearAllMocks();
    schema = makeSchema();
  });

  it('returns false if selection is not empty', () => {
    const doc = schema.node('doc', null, [schema.node('paragraph', null, schema.text('hello'))]);
    const sel = TextSelection.create(doc, 2, 4); // non-empty
    const state = EditorState.create({ schema, doc, selection: sel });

    const cmd = handleBackspaceNextToList();
    const dispatch = vi.fn();

    const res = cmd({ state, dispatch, editor: {} });
    expect(res).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('returns false if not at start of a paragraph', () => {
    const doc = schema.node('doc', null, [schema.node('paragraph', null, schema.text('hello'))]);
    const sel = TextSelection.create(doc, 3, 3); // inside paragraph, not at start
    const state = EditorState.create({ schema, doc, selection: sel });

    const cmd = handleBackspaceNextToList();
    const dispatch = vi.fn();

    const res = cmd({ state, dispatch, editor: {} });
    expect(res).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('inside a list: delegates to decreaseListIndent when it returns true', () => {
    // Make decreaseListIndent() return a command that returns true
    mockDecreaseListIndent.mockImplementationOnce(() => () => true);

    const liPara = schema.node('paragraph', null, schema.text('item'));
    const list = schema.node('orderedList', null, [schema.node('listItem', null, [liPara])]);

    const doc = schema.node('doc', null, [list]);
    // caret at start of the paragraph inside the list
    const paraPos = findNodePos(doc, (n) => n === liPara);
    const sel = TextSelection.create(doc, paraPos + 1, paraPos + 1);
    const state = EditorState.create({ schema, doc, selection: sel });

    const cmd = handleBackspaceNextToList();
    const dispatch = vi.fn();

    const ok = cmd({ state, dispatch, editor: {} });
    expect(ok).toBe(true);
    // decreaseListIndent should have been called once (outer function)
    expect(mockDecreaseListIndent).toHaveBeenCalledTimes(1);
    // We don't assert doc shape here; this path is delegated.
  });

  it('inside a list: unwraps list when decreaseListIndent returns false', () => {
    // default mock already returns false (no outdent)
    const liPara = schema.node('paragraph', null, schema.text('item'));
    const list = schema.node('orderedList', null, [schema.node('listItem', null, [liPara])]);
    const after = schema.node('paragraph', null, schema.text('after'));

    const doc = schema.node('doc', null, [list, after]);

    const paraPos = findNodePos(doc, (n) => n === liPara);
    const sel = TextSelection.create(doc, paraPos + 1, paraPos + 1);
    const state = EditorState.create({ schema, doc, selection: sel });

    const cmd = handleBackspaceNextToList();
    let dispatched = null;
    const dispatch = (tr) => (dispatched = tr);

    const ok = cmd({ state, dispatch, editor: {} });
    expect(ok).toBe(true);
    expect(mockDecreaseListIndent).toHaveBeenCalledTimes(1);

    // The list should be replaced by its listItem content ("item"), followed by "after"
    const outText = dispatched.doc.textBetween(0, dispatched.doc.content.size, ' ');
    expect(outText).toContain('item');
    expect(outText).toContain('after');

    // Selection should be at the start of the first inserted paragraph (near posBeforeList + 1)
    const selPos = dispatched.selection.from;
    // That should resolve to a paragraph
    const $pos = dispatched.doc.resolve(selPos);
    expect($pos.parent.type.name).toBe('paragraph');
    expect($pos.parentOffset).toBe(0);
  });

  it('outside a list with a previous sibling list: merges paragraph into last list item', () => {
    const li1 = schema.node('paragraph', null, schema.text('alpha'));
    const li2 = schema.node('paragraph', null, schema.text('beta'));
    const list = schema.node('bulletList', null, [
      schema.node('listItem', null, [li1]),
      schema.node('listItem', null, [li2]),
    ]);

    const followingPara = schema.node('paragraph', null, schema.text(' tail'));
    const doc = schema.node('doc', null, [list, followingPara]);

    // caret at start of the following paragraph
    const paraPos = findNodePos(doc, (n) => n === followingPara);
    const sel = TextSelection.create(doc, paraPos + 1, paraPos + 1);
    const state = EditorState.create({ schema, doc, selection: sel });

    const cmd = handleBackspaceNextToList();
    let dispatched = null;
    const dispatch = (tr) => (dispatched = tr);

    const ok = cmd({ state, dispatch, editor: {} });
    expect(ok).toBe(true);

    // Should have set meta updateListSync = true
    expect(dispatched.getMeta('updateListSync')).toBe(true);

    // The following paragraph is removed, its content appended to last list item's paragraph
    const outText = dispatched.doc.textBetween(0, dispatched.doc.content.size, ' ');
    // alpha (first li)
    expect(outText).toContain('alpha');
    // beta + tail merged
    expect(outText).toContain('beta tail');

    // Selection placed near the end of the inserted content in the last list paragraph
    const selParent = dispatched.selection.$from.parent;
    expect(selParent.type.name).toBe('paragraph');
    // It should be the last paragraph inside the last list item
    const lastList = dispatched.doc.child(0); // first block is the list
    const lastItem = lastList.lastChild;
    const lastPara = lastItem.lastChild;
    expect(selParent).toBe(lastPara);
  });

  it('returns false when parent is not a paragraph', () => {
    // caret at start of listItem (not paragraph)
    const liPara = schema.node('paragraph', null, schema.text('x'));
    const list = schema.node('orderedList', null, [schema.node('listItem', null, [liPara])]);
    const doc = schema.node('doc', null, [list]);

    // Place cursor at the very start of the list node (not valid paragraph start case)
    const listPos = findNodePos(doc, (n) => n === list);
    // Resolve to pos inside the list node (1 step in)
    const sel = TextSelection.create(doc, listPos + 1, listPos + 1);
    const state = EditorState.create({ schema, doc, selection: sel });

    const cmd = handleBackspaceNextToList();
    const dispatch = vi.fn();

    const res = cmd({ state, dispatch, editor: {} });
    expect(res).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
