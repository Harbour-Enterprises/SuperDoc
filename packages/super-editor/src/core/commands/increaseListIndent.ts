import { changeListLevel } from './changeListLevel.js';
import type { Command } from '../types/ChainedCommands.js';

/**
 * Increases the indent level of the current list item.
 * Works for both ordered and bullet lists, including lists toggled from ordered→bullet.
 */
export const increaseListIndent =
  (): Command =>
  ({ editor, tr, dispatch }) => {
    const handled = changeListLevel(1, editor, tr);

    if (handled && dispatch) {
      dispatch(tr);
    }

    return handled;
  };
