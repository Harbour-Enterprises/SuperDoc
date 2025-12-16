import { selectTextblockEnd as originalSelectTextblockEnd } from 'prosemirror-commands';
import type { Command } from '../types/ChainedCommands.js';

/**
 * Moves the cursor to the end of current text block.
 *
 * https://prosemirror.net/docs/ref/#commands.selectTextblockEnd
 */
//prettier-ignore
export const selectTextblockEnd = (): Command => ({ state, dispatch }) => originalSelectTextblockEnd(state, dispatch);
