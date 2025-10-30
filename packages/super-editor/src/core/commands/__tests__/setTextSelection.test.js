import { describe, it, expect, vi } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';

import { setTextSelection } from '../setTextSelection.js';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    text: { group: 'inline' },
  },
});

const createState = () => {
  const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('Hello world')])]);
  return EditorState.create({
    doc,
    schema,
    selection: TextSelection.create(doc, 1),
  });
};

describe('setTextSelection', () => {
  it('dispatches a transaction with the provided range', () => {
    const state = createState();
    const dispatch = vi.fn();
    const focus = vi.fn();

    const command = setTextSelection({ from: 2, to: 5 });
    const result = command({
      state,
      tr: state.tr,
      dispatch,
      editor: { view: { focus } },
    });

    expect(result).toBe(true);
    expect(dispatch).toHaveBeenCalledTimes(1);
    const dispatchedTr = dispatch.mock.calls[0][0];
    expect(dispatchedTr.selection.from).toBe(2);
    expect(dispatchedTr.selection.to).toBe(5);
    expect(focus).toHaveBeenCalled();
  });

  it('clamps selection into document bounds and swaps when from > to', () => {
    const state = createState();
    const dispatch = vi.fn();

    setTextSelection({ from: 50, to: 3 })({ state, tr: state.tr, dispatch });

    const tr = dispatch.mock.calls[0][0];
    expect(tr.selection.from).toBeGreaterThanOrEqual(0);
    expect(tr.selection.to).toBeGreaterThanOrEqual(tr.selection.from);
    const docSize = state.doc.content.size;
    expect(tr.selection.to).toBeLessThanOrEqual(docSize);
  });

  it('returns false when no positions are provided', () => {
    const state = createState();
    const dispatch = vi.fn();

    const result = setTextSelection({})({ state, tr: state.tr, dispatch });
    expect(result).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
