// @ts-check
import { NodeSelection, TextSelection, AllSelection } from 'prosemirror-state';
import { canSplit } from 'prosemirror-transform';
import { defaultBlockAt } from '@core/helpers/defaultBlockAt.js';

/**
 * Splits a run node at the current selection into two paragraphs.
 * @returns {import('@core/commands/types').Command}
 */
export const splitRunToParagraph = () => (props) => {
  const { state, view, tr } = props;
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

/**
 * Minimal copy of ProseMirror splitBlock logic that tolerates splitting runs.
 * @param {import('prosemirror-state').EditorState} state
 * @param {(tr: import('prosemirror-state').Transaction) => void} dispatch
 */
export function splitBlockPatch(state, dispatch) {
  let { $from } = state.selection;
  if (state.selection instanceof NodeSelection && state.selection.node.isBlock) {
    if (!$from.parentOffset || !canSplit(state.doc, $from.pos)) return false;
    if (dispatch) dispatch(state.tr.split($from.pos).scrollIntoView());
    return true;
  }

  if (!$from.depth) return false;
  let types = [];
  let splitDepth,
    deflt,
    atEnd = false,
    atStart = false;
  for (let d = $from.depth; ; d--) {
    let node = $from.node(d);
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

  let tr = state.tr;
  if (state.selection instanceof TextSelection || state.selection instanceof AllSelection) tr.deleteSelection();
  let splitPos = tr.mapping.map($from.pos);
  let can = canSplit(tr.doc, splitPos, types.length, types);
  if (!can) {
    types[0] = deflt ? { type: deflt } : null;
    can = canSplit(tr.doc, splitPos, types.length, types);
  }
  if (!can) return false;
  tr.split(splitPos, types.length, types);
  if (!atEnd && atStart && $from.node(splitDepth).type != deflt) {
    let first = tr.mapping.map($from.before(splitDepth)),
      $first = tr.doc.resolve(first);
    if (deflt && $from.node(splitDepth - 1).canReplaceWith($first.index(), $first.index() + 1, deflt))
      tr.setNodeMarkup(tr.mapping.map($from.before(splitDepth)), deflt);
  }
  if (dispatch) dispatch(tr.scrollIntoView());
  return true;
}

export const splitRunAtCursor = () => (props) => {
  let { state, dispatch, tr } = props;
  const sel = state.selection;
  if (!sel.empty) return false;

  const $pos = sel.$from;
  const runType = state.schema.nodes.run;
  if ($pos.parent.type !== runType) return false;

  const run = $pos.parent;
  const offset = $pos.parentOffset; // offset inside this run
  const runStart = $pos.before(); // position before the run
  const runEnd = runStart + run.nodeSize; // position after the run

  const leftFrag = run.content.cut(0, offset);
  const rightFrag = run.content.cut(offset);

  const leftRun = runType.create(run.attrs, leftFrag, run.marks);
  const rightRun = runType.create(run.attrs, rightFrag, run.marks);
  const gapPos = runStart + leftRun.nodeSize; // cursor between the two runs
  tr.replaceWith(runStart, runEnd, [leftRun, rightRun]).setSelection(TextSelection.create(tr.doc, gapPos));

  if (dispatch) {
    dispatch(tr);
  }
  return true;
};
