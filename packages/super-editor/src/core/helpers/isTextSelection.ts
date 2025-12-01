import { TextSelection } from 'prosemirror-state';

/**
 * Checks if value is a TextSelection.
 * @param value Any value.
 */
export const isTextSelection = (value: unknown): value is TextSelection => {
  return value instanceof TextSelection;
};
