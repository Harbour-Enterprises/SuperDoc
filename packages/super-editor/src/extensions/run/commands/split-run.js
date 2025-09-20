// @ts-check
import { splitBlock } from 'prosemirror-commands';

/**
 * Splits a run node at the current selection.
 * @returns {import('prosemirror-state').Command} A command handler.
 */
export const splitRun = () => (state, dispatch) => {
  const { $from, empty } = state.selection;
  if (!empty) return false;
  if ($from.parent.type.name !== 'run') return false;

  return splitBlock(state, dispatch);
};
