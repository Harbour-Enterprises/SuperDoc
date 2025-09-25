import { describe, it, expect } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { schema, doc, p, em, strong } from 'prosemirror-test-builder';
import { getMarksFromSelection } from './getMarksFromSelection.js';

describe('getMarksFromSelection', () => {
  it('returns marks for a collapsed selection including stored marks', () => {
    const testDoc = doc(p(em('Hi')));
    const baseState = EditorState.create({ schema, doc: testDoc });
    const tr = baseState.tr.setSelection(TextSelection.create(testDoc, 2));
    tr.setStoredMarks([schema.marks.strong.create()]);
    const state = baseState.apply(tr);

    const result = getMarksFromSelection(state);

    expect(result.some((mark) => mark.type === schema.marks.strong)).toBe(true);
    expect(result.some((mark) => mark.type === schema.marks.em)).toBe(true);
  });

  it('collects marks across a range selection', () => {
    const testDoc = doc(p(em('Hi '), strong('there')));
    const state = EditorState.create({ schema, doc: testDoc });
    const rangeState = state.apply(state.tr.setSelection(TextSelection.create(testDoc, 1, testDoc.content.size - 1)));

    const result = getMarksFromSelection(rangeState);

    expect(result.filter((mark) => mark.type === schema.marks.em).length).toBeGreaterThan(0);
    expect(result.filter((mark) => mark.type === schema.marks.strong).length).toBeGreaterThan(0);
  });
});
