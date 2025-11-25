// @ts-check
import { splitBlock as pmSplitBlock } from 'prosemirror-commands';

/**
 * Splits a run node at the current selection.
 * @returns {import('@core/commands/types').Command} A command handler.
 */
export const splitRun = () => (props) => {
  const { state, view, tr } = props;
  const { $from, empty } = state.selection;
  if (!empty) return false;
  if ($from.parent.type.name !== 'run') return false;

  const handled = pmSplitBlock(state, (transaction) => {
    view.dispatch(transaction);
  });

  if (handled) {
    tr.setMeta('preventDispatch', true);
  }

  return handled;
};
