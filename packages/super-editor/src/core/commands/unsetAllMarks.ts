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

  if (dispatch) {
    if (!empty) {
      ranges.forEach((range) => {
        tr.removeMark(range.$from.pos, range.$to.pos);
      });
    }
    // Clear stored marks to prevent formatting from being inherited by newly typed content
    tr.setStoredMarks([]);
  }

  return true;
};
