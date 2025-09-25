import { describe, it, expect, vi } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';

import { restoreSelection } from '../restoreSelection.js';

const baseSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    text: { group: 'inline' },
  },
});

const createState = () => {
  const doc = baseSchema.node('doc', null, [baseSchema.node('paragraph', null, [baseSchema.text('Sample text')])]);
  return EditorState.create({ schema: baseSchema, doc, selection: TextSelection.create(doc, 1) });
};

describe('restoreSelection', () => {
  it('dispatches transaction when lastSelection is present', () => {
    const state = createState();
    const editor = {
      options: {
        lastSelection: { from: 2, to: 5 },
      },
      view: {
        dispatch: vi.fn((tr) => {
          expect(tr.selection.from).toBe(2);
          expect(tr.selection.to).toBe(5);
        }),
      },
    };

    restoreSelection()({ editor, state, tr: state.tr });

    expect(editor.view.dispatch).toHaveBeenCalled();
  });

  it('does nothing when lastSelection is missing', () => {
    const state = createState();
    const editor = {
      options: {},
      view: { dispatch: vi.fn() },
    };

    restoreSelection()({ editor, state, tr: state.tr });

    expect(editor.view.dispatch).not.toHaveBeenCalled();
  });
});
