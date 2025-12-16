import { deleteSelection as originalDeleteSelection } from 'prosemirror-commands';

/**
 * Delete the selection, if there is one.
 */
export const deleteSelection =
  () =>
  ({ state, tr, dispatch }) => {
    const { from, to, empty } = state.selection;

    // Fix for SD-1013: when a single character is selected in the DOM (e.g., selecting right-to-left then typing),
    // ProseMirror can treat the replacement as a backspace. Skip delete in that case.
    if (typeof document !== 'undefined' && document.getSelection) {
      const currentDomSelection = document.getSelection();
      if (currentDomSelection?.baseNode?.data?.length === 1) {
        return false;
      }
    }

    if (empty) {
      return originalDeleteSelection(state, dispatch);
    }

    let hasListContent = false;
    state.doc.nodesBetween(from, to, (node) => {
      if (node.type.name === 'orderedList' || node.type.name === 'bulletList' || node.type.name === 'listItem') {
        hasListContent = true;
        return false;
      }
    });

    if (hasListContent) {
      const transaction = tr || state.tr;
      transaction.deleteRange(from, to);

      if (dispatch) {
        dispatch(transaction);
      }

      return true;
    }

    return originalDeleteSelection(state, dispatch);
  };
