import { describe, it, expect, vi } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { doc, p, schema, code_block } from 'prosemirror-test-builder';
import { setMark } from '../setMark.js';

const createStateWithSelection = (docNode, from, to = from) => {
  const baseState = EditorState.create({ schema, doc: docNode });
  const selection = TextSelection.create(baseState.doc, from, to);
  return baseState.apply(baseState.tr.setSelection(selection));
};

describe('setMark', () => {
  it('merges attributes when updating an existing mark in a range', () => {
    const linkMark = schema.marks.link.create({ href: 'https://example.com', target: '_self' });
    const docNode = doc(p(schema.text('Link', [linkMark])));
    const state = createStateWithSelection(docNode, 1, docNode.content.size - 1);
    const tr = state.tr;
    const dispatch = vi.fn();

    const result = setMark('link', { href: 'https://example.com', title: 'Updated' })({
      tr,
      state,
      dispatch,
      editor: { options: {} },
    });

    expect(result).toBe(true);
    expect(dispatch).not.toHaveBeenCalled();

    const nextState = state.apply(tr);
    const textNode = nextState.doc.nodeAt(1);
    const mark = textNode?.marks.find((item) => item.type === schema.marks.link);
    expect(mark?.attrs).toEqual({ href: 'https://example.com', title: 'Updated' });
  });

  it('merges stored mark attributes when selection is empty', () => {
    const stateWithoutSelection = createStateWithSelection(doc(p('Hello')), 1, 1);
    const storedLink = schema.marks.link.create({ href: 'https://example.com' });
    const state = stateWithoutSelection.apply(stateWithoutSelection.tr.addStoredMark(storedLink));
    const tr = state.tr;

    setMark('link', { title: 'New Title' })({
      tr,
      state,
      dispatch: vi.fn(),
      editor: { options: {} },
    });

    const storedMarks = tr.storedMarks ?? [];
    expect(storedMarks).toHaveLength(1);
    expect(storedMarks[0].attrs).toEqual({ href: 'https://example.com', title: 'New Title' });
  });

  it('returns false when the parent node disallows the mark', () => {
    const docNode = doc(code_block('No marks here'));
    const state = createStateWithSelection(docNode, 1, 5);
    const tr = state.tr;
    const dispatch = vi.fn();

    const result = setMark('link', { href: 'https://example.com' })({
      tr,
      state,
      dispatch,
      editor: { options: {} },
    });

    expect(result).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
    expect(tr.steps).toHaveLength(0);
  });
});
