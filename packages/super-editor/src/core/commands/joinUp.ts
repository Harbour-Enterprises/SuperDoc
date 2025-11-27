import { joinUp as originalJoinUp } from 'prosemirror-commands';
import type { Command } from '../types/ChainedCommands.js';

/**
 * Join the selected block or, if there is a text selection, the
 * closest ancestor block of the selection that can be joined, with
 * the sibling above it.
 *
 * https://prosemirror.net/docs/ref/#commands.joinUp
 */
//prettier-ignore
export const joinUp = (): Command => ({ state, dispatch }) => originalJoinUp(state, dispatch);
