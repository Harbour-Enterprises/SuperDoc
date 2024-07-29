import { joinBackward as originalJoinBackward } from 'prosemirror-commands';

/**
 * If the selection is empty and at the start of a textblock, try to
 * reduce the distance between that block and the one before it—if
 * there's a block directly before it that can be joined, join them.
 * If not, try to move the selected block closer to the next one in
 * the document structure by lifting it out of its parent or moving it
 * into a parent of the previous block. Will use the view for accurate
 * (bidi-aware) start-of-textblock detection if given.
 */
export const joinBackward = () => ({ state, dispatch }) => {
  return originalJoinBackward(state, dispatch);
};
