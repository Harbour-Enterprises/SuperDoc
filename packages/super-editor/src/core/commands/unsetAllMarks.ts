import type { Command } from '../types/ChainedCommands.js';
import type { Selection } from 'prosemirror-state';

/**
 * Remove all marks in the current selection.
 */
//prettier-ignore
export const unsetAllMarks = (): Command => ({ tr, dispatch, editor }) => {
  let { selection } = tr;
  if (editor.options.isHeaderOrFooter) {
    selection = editor.options.lastSelection as Selection;
  }
  const { empty, ranges } = selection;

  if (empty) return true;

  if (dispatch) {
    ranges.forEach((range) => {
      tr.removeMark(range.$from.pos, range.$to.pos);
    });
  }

  return true;
};
