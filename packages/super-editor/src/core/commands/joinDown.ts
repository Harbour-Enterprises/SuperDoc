import { joinDown as originalJoinDown } from 'prosemirror-commands';
import type { Command } from '../types/ChainedCommands.js';

/**
 * Join the selected block, or the closest ancestor of the selection
 * that can be joined, with the sibling after it.
 *
 * https://prosemirror.net/docs/ref/#commands.joinDown
 */
//prettier-ignore
export const joinDown = (): Command => ({ state, dispatch }) => originalJoinDown(state, dispatch);
