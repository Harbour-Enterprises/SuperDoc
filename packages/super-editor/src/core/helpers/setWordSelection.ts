import { findWordBounds } from './findWordBounds.js';
import { TextSelection } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

export const setWordSelection = (view: EditorView, pos: number): void => {
  const { state, dispatch } = view;
  const word = findWordBounds(state.doc, pos);
  if (!word) return;
  const tr = state.tr.setSelection(TextSelection.create(state.doc, word.from, word.to));
  dispatch(tr);
};
