import { changeListLevel } from './changeListLevel.js';

/**
 * Increases the indent level of the current list item.
 * Works for both ordered and bullet lists, including lists toggled from ordered→bullet.
 * @param {Array} [_targetPositions] - list item positions in selection collected with collectTargetListItemPositions
 */
export const increaseListIndent =
  (_targetPositions) =>
  ({ editor, tr }) => {
    return changeListLevel(1, editor, tr);
  };
