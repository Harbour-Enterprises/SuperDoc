import { selectTextblockStart as originalSelectTextblockStart } from 'prosemirror-commands';

/**
 * Moves the cursor to the start of current text block.
 */
export const selectTextblockStart = () => ({ state, dispatch }) => {
  return originalSelectTextblockStart(state, dispatch);
};
