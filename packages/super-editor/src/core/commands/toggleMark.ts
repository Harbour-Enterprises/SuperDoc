import type { MarkType } from 'prosemirror-model';
import type { Command } from '../types/ChainedCommands.js';
import { getMarkType } from '../helpers/getMarkType.js';
import { isMarkActive } from '../helpers/isMarkActive.js';

/**
 * Toggle a mark on and off.
 * @param typeOrName Mark type or name.
 * @param attrs Mark attributes.
 * @param options.extendEmptyMarkRange Removes the mark even across the current selection.
 */
export const toggleMark =
  (
    typeOrName: string | MarkType,
    attrs: Record<string, unknown> = {},
    options: { extendEmptyMarkRange?: boolean } = {},
  ): Command =>
  ({ state, commands }) => {
    const { extendEmptyMarkRange = false } = options;
    const type = getMarkType(typeOrName, state.schema);
    const isActive = isMarkActive(state, type, attrs);
    if (isActive) return commands.unsetMark(type, { extendEmptyMarkRange });
    return commands.setMark(type, attrs);
  };
