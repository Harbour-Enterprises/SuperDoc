import { Selection } from 'prosemirror-state';

/**
 * Backspaces a single character when the cursor sits adjacent to a run boundary.
 * Deletes the last character of the previous run (or the previous sibling run) without removing the whole run node.
 * @returns {import('@core/commands/types').Command}
 */
export const backspaceNextToRun =
  () =>
  ({ state, tr, dispatch }) => {
    const sel = state.selection;
    if (!sel.empty) return false;

    const runType = state.schema.nodes.run;
    const $pos = sel.$from;
    if ($pos.nodeBefore?.type !== runType && $pos.pos !== $pos.start()) return false;

    if ($pos.nodeBefore) {
      // Should delete the last character in the run before
      // and not the entire run.
      if ($pos.nodeBefore.content.size === 0) return false;

      tr.delete($pos.pos - 2, $pos.pos - 1).setSelection(Selection.near(tr.doc.resolve($pos.pos - 2)));
      if (dispatch) {
        dispatch(tr.scrollIntoView());
      }
    } else {
      const prevNode = state.doc.resolve($pos.start() - 1).nodeBefore;
      if (prevNode?.type !== runType || prevNode.content.size === 0) return false;
      tr.delete($pos.pos - 3, $pos.pos - 2).setSelection(Selection.near(tr.doc.resolve($pos.pos - 3)));
      if (dispatch) {
        dispatch(tr.scrollIntoView());
      }
    }
    return true;
  };
