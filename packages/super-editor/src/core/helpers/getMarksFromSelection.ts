import type { EditorState } from 'prosemirror-state';
import type { Mark } from 'prosemirror-model';

export function getMarksFromSelection(state: EditorState): Mark[] {
  const { from, to, empty } = state.selection;
  const marks: Mark[] = [];

  if (empty) {
    if (state.storedMarks) {
      marks.push(...state.storedMarks);
    }

    marks.push(...state.selection.$head.marks());
  } else {
    state.doc.nodesBetween(from, to, (node) => {
      marks.push(...node.marks);
    });
  }
  return marks;
}
