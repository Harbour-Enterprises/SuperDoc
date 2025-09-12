//@ts-check
import { splitBlock } from 'prosemirror-commands';

/**
 * Splits a run node at the current text selection.
 * @returns {Function} A command function to be used in the editor.
 */
export const splitRun =
  () =>
  ({ state, dispatch }) => {
    const { $from, empty } = state.selection;
    if (!empty) return false;
    if ($from.parent.type.name !== 'run') return false;

    return splitBlock(state, dispatch);
  };
