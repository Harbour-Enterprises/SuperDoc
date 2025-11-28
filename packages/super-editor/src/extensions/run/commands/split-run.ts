import { NodeSelection, TextSelection, AllSelection } from 'prosemirror-state';
import type { Transaction, EditorState } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { canSplit } from 'prosemirror-transform';
import { defaultBlockAt } from '@core/helpers/defaultBlockAt.js';
import type { Command } from '@core/types/ChainedCommands.js';

/**
 * Splits a run node at the current selection.
 * @returns {import('@core/commands/types').Command} A command handler.
 */
export const splitRun =
  (): Command =>
  ({ state, view, tr }: { state: EditorState; view: EditorView; tr: Transaction }) => {
    const { $from, empty } = state.selection;
    if (!empty) return false;
    if ($from.parent.type.name !== 'run') return false;

    const handled = splitBlockPatch(state, (transaction) => {
      view.dispatch(transaction);
    });

    if (handled) {
      tr.setMeta('preventDispatch', true);
    }

    return handled;
  };

export function splitBlockPatch(state: EditorState, dispatch?: (tr: Transaction) => void) {
  const { $from } = state.selection;
  if (state.selection instanceof NodeSelection && state.selection.node.isBlock) {
    if (!$from.parentOffset || !canSplit(state.doc, $from.pos)) return false;
    if (dispatch) dispatch(state.tr.split($from.pos).scrollIntoView());
    return true;
  }

  if (!$from.depth) return false;
  const types = [];
  let splitDepth,
    deflt,
    atEnd = false,
    atStart = false;
  for (let d = $from.depth; ; d--) {
    const node = $from.node(d);
    if (node.isBlock) {
      atEnd = $from.end(d) == $from.pos + ($from.depth - d);
      atStart = $from.start(d) == $from.pos - ($from.depth - d);
      deflt = defaultBlockAt($from.node(d - 1).contentMatchAt($from.indexAfter(d - 1)));
      types.unshift(null); // changed
      splitDepth = d;
      break;
    } else {
      if (d == 1) return false;
      types.unshift(null);
    }
  }

  const tr = state.tr;
  if (state.selection instanceof TextSelection || state.selection instanceof AllSelection) tr.deleteSelection();
  const splitPos = tr.mapping.map($from.pos);
  let can = canSplit(tr.doc, splitPos, types.length, types);
  if (!can) {
    types[0] = deflt ? { type: deflt } : null;
    can = canSplit(tr.doc, splitPos, types.length, types);
  }
  if (!can) return false;
  tr.split(splitPos, types.length, types);
  if (!atEnd && atStart && $from.node(splitDepth).type != deflt) {
    const first = tr.mapping.map($from.before(splitDepth)),
      $first = tr.doc.resolve(first);
    if (deflt && $from.node(splitDepth - 1).canReplaceWith($first.index(), $first.index() + 1, deflt))
      tr.setNodeMarkup(tr.mapping.map($from.before(splitDepth)), deflt);
  }
  if (dispatch) dispatch(tr.scrollIntoView());
  return true;
}
