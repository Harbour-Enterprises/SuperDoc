import { deleteSelection as originalDeleteSelection } from 'prosemirror-commands';

/**
 * Delete the selection, if there is one.
 */
//prettier-ignore
export const deleteSelection = () => ({ state, tr, dispatch }) => {
  const { from, to, empty } = state.selection;
  
  if (empty) {
    return originalDeleteSelection(state, dispatch);
  }

  let hasListContent = false;
  state.doc.nodesBetween(from, to, (node) => {
    if (node.type.name === 'orderedList' || 
        node.type.name === 'bulletList' ||
        node.type.name === 'listItem') {
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
