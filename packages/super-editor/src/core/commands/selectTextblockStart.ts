import { selectTextblockStart as originalSelectTextblockStart } from 'prosemirror-commands';
import type { Command } from '../types/ChainedCommands.js';

/**
 * Moves the cursor to the start of current text block.
 *
 * https://prosemirror.net/docs/ref/#commands.selectTextblockStart
 */
//prettier-ignore
export const selectTextblockStart = (): Command => ({ state, dispatch }) => originalSelectTextblockStart(state, dispatch);
