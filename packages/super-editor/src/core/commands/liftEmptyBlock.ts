import { liftEmptyBlock as originalLiftEmptyBlock } from 'prosemirror-commands';
import type { Command } from '../types/ChainedCommands.js';

/**
 * If the cursor is in an empty textblock that can be lifted, lift the block.
 *
 * https://prosemirror.net/docs/ref/#commands.liftEmptyBlock
 */
//prettier-ignore
export const liftEmptyBlock = (): Command => ({ state, dispatch }) => originalLiftEmptyBlock(state, dispatch);
