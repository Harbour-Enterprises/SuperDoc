import { describe, it, expect, vi } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { doc, p, schema } from 'prosemirror-test-builder';
import { getSelectionMarks } from '../getSelectionMarks.js';

const createStateWithSelection = (docNode, from, to = from) => {
  const baseState = EditorState.create({ schema, doc: docNode });
  const selection = TextSelection.create(baseState.doc, from, to);
  return baseState.apply(baseState.tr.setSelection(selection));
};

describe('getSelectionMarks', () => {
  it('returns unique marks for a collapsed selection with stored marks', () => {
    const docNode = doc(p(schema.text('Hello', [schema.marks.strong.create()])));
    const storedMark = schema.marks.strong.create();
    const stateWithSelection = createStateWithSelection(docNode, 1, 1);
    const state = stateWithSelection.apply(stateWithSelection.tr.addStoredMark(storedMark));
    const tr = state.tr;

    const dispatch = vi.fn();
    const marks = getSelectionMarks()({
      tr,
      state,
      dispatch,
      editor: {},
    });

    expect(dispatch).not.toHaveBeenCalled();
    expect(tr.getMeta('preventDispatch')).toBe(true);
    expect(marks).toHaveLength(1);
    expect(marks[0].type).toBe(schema.marks.strong);
  });

  it('deduplicates marks across range selections', () => {
    const docNode = doc(
      p(schema.text('Hi', [schema.marks.strong.create()]), schema.text(' there', [schema.marks.strong.create()])),
    );
    const state = createStateWithSelection(docNode, 1, docNode.content.size - 1);
    const tr = state.tr;

    const marks = getSelectionMarks()({
      tr,
      state,
      editor: {},
    });

    expect(tr.getMeta('preventDispatch')).toBe(true);
    expect(marks).toHaveLength(1);
    expect(marks[0].type).toBe(schema.marks.strong);
  });

  it('returns an empty array when no marks are present', () => {
    const state = createStateWithSelection(doc(p(schema.text('Plain'))), 1, 1);
    const tr = state.tr;

    const marks = getSelectionMarks()({
      tr,
      state,
      editor: {},
    });

    expect(tr.getMeta('preventDispatch')).toBe(true);
    expect(marks).toEqual([]);
  });
});
