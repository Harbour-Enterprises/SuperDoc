import { CellSelection } from 'prosemirror-tables';
import type { Selection as PmSelection } from 'prosemirror-state';

/**
 * Check if selection is a cell selection
 * @private
 * @category Helper
 * @param {Selection} value - Selection to check
 * @returns {boolean} True if cell selection
 * @example
 * if (isCellSelection(editor.state.selection)) {
 *   // Handle cell selection
 * }
 */
export const isCellSelection = (value: PmSelection | null | undefined): value is CellSelection =>
  value instanceof CellSelection;
