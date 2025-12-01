import { NodeSelection, type EditorState, type Transaction } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

export const setImageNodeSelection = (view: EditorView, pos: number): boolean => {
  const { doc } = view.state as EditorState;
  const node = doc.nodeAt(pos);
  if (node && node.type.name === 'image') {
    const tr: Transaction = view.state.tr.setSelection(NodeSelection.create(doc, pos));
    view.dispatch(tr);
    return true;
  }
  return false;
};
