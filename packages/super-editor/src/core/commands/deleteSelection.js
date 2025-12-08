import { deleteSelection as originalDeleteSelection } from 'prosemirror-commands';

/**
 * Delete the selection, if there is one.
 */
export const deleteSelection =
  () =>
  ({ state, tr, dispatch }) => {
    const { from, to, empty } = state.selection;

    // Fix for SD-1013
    // Docs that are loaded into SuperDoc, when user selects text from right to left and replace it with a single char:
    // Prosemirror will interpret this as a backspace operation, which will delete the character.
    // This is a workaround to prevent this from happening, by checking if the current DOM selection is a single character.
    const currentDomSelection = document.getSelection();
    // If the current DOM selection is a single character, we don't want to delete it.
    if (currentDomSelection?.baseNode?.data?.length == 1) {
      return false;
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
