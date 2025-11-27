import type { EditorState } from 'prosemirror-state';

/**
 * Check if cursor is inside a table
 * @private
 * @category Helper
 * @param state - Editor state
 * @returns True if cursor is in table
 * @example
 * if (isInTable(state)) {
 *   // Enable table-specific commands
 * }
 */
export const isInTable = (state: EditorState): boolean => {
  const { $head } = state.selection;

  for (let d = $head.depth; d > 0; d -= 1) {
    if ($head.node(d).type?.spec?.tableRole === 'row') {
      return true;
    }
  }

  return false;
};
