import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';

vi.mock('./list-helpers', () => ({
  isList: (node) => {
    const t = node?.type?.name;
    return t === 'orderedList' || t === 'bulletList';
  },
  findNodePosition: (doc, target) => {
    let found = null;
    doc.descendants((n, pos) => {
      if (n === target) {
        found = pos;
        return false;
      }
      return true;
    });
    return found;
  },
}));

vi.mock('./decreaseListIndent.js', () => {
  const fn = vi.fn(() => () => false);
  return { decreaseListIndent: fn };
});

let handleBackspaceNextToList;
let mockDecreaseListIndent;

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
    // IMPORTANT: include level so we can simulate outdent path
    listItem: {
      group: 'block',
      content: 'paragraph block*',
      defining: true,
      attrs: { level: { default: 0 } },
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

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // re-import mocked fn and SUT after reset
    mockDecreaseListIndent = (await import('./decreaseListIndent.js')).decreaseListIndent;
    handleBackspaceNextToList = (await import('./backspaceNextToList.js')).handleBackspaceNextToList;

    schema = makeSchema();
  });

  it('returns false if selection is not empty', () => {
    const doc = schema.node('doc', null, [schema.node('paragraph', null, schema.text('hello'))]);
    const sel = TextSelection.create(doc, 2, 4);
    const state = EditorState.create({ schema, doc, selection: sel });

    const cmd = handleBackspaceNextToList();
    const dispatch = vi.fn();

    const res = cmd({ state, dispatch, editor: {} });
    expect(res).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('returns false if not at start of a paragraph', () => {
    const doc = schema.node('doc', null, [schema.node('paragraph', null, schema.text('hello'))]);
    const sel = TextSelection.create(doc, 3, 3);
    const state = EditorState.create({ schema, doc, selection: sel });

    const cmd = handleBackspaceNextToList();
    const dispatch = vi.fn();

    const res = cmd({ state, dispatch, editor: {} });
    expect(res).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('inside a list: delegates to decreaseListIndent when it returns true (level > 0)', () => {
    // Make the outdent command succeed once
    mockDecreaseListIndent.mockImplementationOnce(() => () => true);

    const liPara = schema.node('paragraph', null, schema.text('item'));
    const list = schema.node('orderedList', null, [schema.node('listItem', { level: 1 }, [liPara])]);

    const doc = schema.node('doc', null, [list]);
    const paraPos = findNodePos(doc, (n) => n === liPara);
    const sel = TextSelection.create(doc, paraPos + 1, paraPos + 1); // start of paragraph
    const state = EditorState.create({ schema, doc, selection: sel });

    const cmd = handleBackspaceNextToList();
    const dispatch = vi.fn();

    const ok = cmd({ state, dispatch, editor: {} });
    expect(ok).toBe(true);
    expect(mockDecreaseListIndent).toHaveBeenCalledTimes(1);
  });

  it('inside a list: unwraps list when decreaseListIndent returns false (level 0)', () => {
    const liPara = schema.node('paragraph', null, schema.text('item'));
    const list = schema.node('orderedList', null, [schema.node('listItem', { level: 0 }, [liPara])]);
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
    expect(mockDecreaseListIndent).toHaveBeenCalledTimes(0);

    const outText = dispatched.doc.textBetween(0, dispatched.doc.content.size, ' ');
    expect(outText).toContain('item');
    expect(outText).toContain('after');

    const selPos = dispatched.selection.from;
    const $pos = dispatched.doc.resolve(selPos);
    expect($pos.parent.type.name).toBe('paragraph');
    expect($pos.parentOffset).toBe(0);
  });

  it('inside a list: backspace on an EMPTY item at level 0 unwraps to an empty paragraph', () => {
    const emptyPara = schema.node('paragraph', null, []); // empty
    const list = schema.node('bulletList', null, [schema.node('listItem', { level: 0 }, [emptyPara])]);
    const after = schema.node('paragraph', null, schema.text('after'));
    const doc = schema.node('doc', null, [list, after]);

    const paraPos = findNodePos(doc, (n) => n === emptyPara);
    const sel = TextSelection.create(doc, paraPos + 1, paraPos + 1);
    const state = EditorState.create({ schema, doc, selection: sel });

    const cmd = handleBackspaceNextToList();
    let dispatched = null;
    const dispatch = (tr) => (dispatched = tr);

    const ok = cmd({ state, dispatch, editor: {} });
    expect(ok).toBe(true);

    const firstBlock = dispatched.doc.child(0);
    const secondBlock = dispatched.doc.child(1);
    expect(firstBlock.type.name).toBe('paragraph');
    expect(firstBlock.textContent).toBe('');
    expect(secondBlock.type.name).toBe('paragraph');
    expect(secondBlock.textContent).toBe('after');

    expect(dispatched.selection.$from.parent).toBe(firstBlock);
    expect(dispatched.selection.$from.parentOffset).toBe(0);
  });

  it('outside a list with a previous sibling list: merges paragraph into last list item', () => {
    const li1 = schema.node('paragraph', null, schema.text('alpha'));
    const li2 = schema.node('paragraph', null, schema.text('beta'));
    const list = schema.node('bulletList', null, [
      schema.node('listItem', { level: 0 }, [li1]),
      schema.node('listItem', { level: 0 }, [li2]),
    ]);

    const followingPara = schema.node('paragraph', null, schema.text(' tail'));
    const doc = schema.node('doc', null, [list, followingPara]);

    const paraPos = findNodePos(doc, (n) => n === followingPara);
    const sel = TextSelection.create(doc, paraPos + 1, paraPos + 1);
    const state = EditorState.create({ schema, doc, selection: sel });

    const cmd = handleBackspaceNextToList();
    let dispatched = null;
    const dispatch = (tr) => (dispatched = tr);

    const ok = cmd({ state, dispatch, editor: {} });
    expect(ok).toBe(true);

    expect(dispatched.getMeta('updateListSync')).toBe(true);

    const outText = dispatched.doc.textBetween(0, dispatched.doc.content.size, ' ');
    expect(outText).toContain('alpha');
    expect(outText).toContain('beta tail');

    const selParent = dispatched.selection.$from.parent;
    expect(selParent.type.name).toBe('paragraph');
    const lastList = dispatched.doc.child(0);
    const lastItem = lastList.lastChild;
    const lastPara = lastItem.lastChild;
    expect(selParent).toBe(lastPara);
  });

  it('returns false when parent is not a paragraph', () => {
    const liPara = schema.node('paragraph', null, schema.text('x'));
    const list = schema.node('orderedList', null, [schema.node('listItem', { level: 0 }, [liPara])]);
    const doc = schema.node('doc', null, [list]);

    const listPos = findNodePos(doc, (n) => n === list);
    const sel = TextSelection.create(doc, listPos + 1, listPos + 1); // inside list container, not paragraph
    const state = EditorState.create({ schema, doc, selection: sel });

    const cmd = handleBackspaceNextToList();
    const dispatch = vi.fn();

    const res = cmd({ state, dispatch, editor: {} });
    expect(res).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
