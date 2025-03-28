import { deleteSelection as originalDeleteSelection } from 'prosemirror-commands';

/**
 * Delete the selection, if there is one.
 */
//prettier-ignore
export const deleteSelection = () => ({ state, dispatch }) => {
  return originalDeleteSelection(state, dispatch);
};
