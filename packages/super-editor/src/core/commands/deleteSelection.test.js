import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteSelection as pmDeleteSelection } from 'prosemirror-commands';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { deleteSelection } from './deleteSelection.js';

vi.mock('prosemirror-commands', () => ({
  deleteSelection: vi.fn(),
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

describe('deleteSelection', () => {
  let schema;

  beforeEach(() => {
    vi.clearAllMocks();
    schema = makeSchema();
  });

  it('delegates to original deleteSelection when selection is empty', () => {
    const doc = schema.node('doc', null, [schema.node('paragraph', null, schema.text('hello world'))]);
    const sel = TextSelection.create(doc, 2, 2);
    const state = EditorState.create({ schema, doc, selection: sel });

    pmDeleteSelection.mockReturnValueOnce('delegated');

    const cmd = deleteSelection();
    const dispatch = vi.fn();
    const res = cmd({ state, tr: state.tr, dispatch });

    expect(pmDeleteSelection).toHaveBeenCalledTimes(1);
    expect(pmDeleteSelection).toHaveBeenCalledWith(state, dispatch);
    expect(res).toBe('delegated');
  });

  it('hard-deletes when selection contains list content (orderedList)', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, schema.text('before')),
      schema.node('orderedList', null, [
        schema.node('listItem', null, [schema.node('paragraph', null, schema.text('one'))]),
        schema.node('listItem', null, [schema.node('paragraph', null, schema.text('two'))]),
      ]),
      schema.node('paragraph', null, schema.text('after')),
    ]);

    // select from inside "one" into the "after" paragraph
    const oneParaPos = findNodePos(doc, (n) => n.type.name === 'paragraph' && n.textContent === 'one');
    const afterParaPos = findNodePos(doc, (n) => n.type.name === 'paragraph' && n.textContent === 'after');
    const from = oneParaPos + 1; // start of "one"
    const to = afterParaPos + 3; // inside "aft"
    const sel = TextSelection.create(doc, from, to);
    const state = EditorState.create({ schema, doc, selection: sel });

    const tr = state.tr;
    const deleteSpy = vi.spyOn(tr, 'deleteRange');

    const cmd = deleteSelection();
    let dispatched = null;
    const dispatch = (t) => (dispatched = t);

    const ok = cmd({ state, tr, dispatch });
    expect(ok).toBe(true);
    expect(pmDeleteSelection).not.toHaveBeenCalled();
    expect(deleteSpy).toHaveBeenCalledWith(from, to);
    expect(dispatched).toBeTruthy();
  });

  it('delegates when non-empty selection has no list content', () => {
    const doc = schema.node('doc', null, [schema.node('paragraph', null, schema.text('abc def ghi'))]);
    const sel = TextSelection.create(doc, 2, 6); // "c de"
    const state = EditorState.create({ schema, doc, selection: sel });

    pmDeleteSelection.mockReturnValueOnce('delegated-non-empty');

    const cmd = deleteSelection();
    const dispatch = vi.fn();
    const res = cmd({ state, tr: state.tr, dispatch });

    expect(pmDeleteSelection).toHaveBeenCalledTimes(1);
    expect(res).toBe('delegated-non-empty');
  });

  it('returns true when dispatch is omitted (list content case)', () => {
    const para = schema.node('paragraph', null, schema.text('foo bar'));
    const doc = schema.node('doc', null, [schema.node('bulletList', null, [schema.node('listItem', null, [para])])]);
    const paraPos = findNodePos(doc, (n) => n === para);
    const sel = TextSelection.create(doc, paraPos + 1, paraPos + 4);
    const state = EditorState.create({ schema, doc, selection: sel });

    const cmd = deleteSelection();
    const ok = cmd({ state, tr: state.tr }); // no dispatch

    expect(ok).toBe(true);
    expect(pmDeleteSelection).not.toHaveBeenCalled();
  });
});
