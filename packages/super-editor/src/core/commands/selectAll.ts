import { selectAll as originalSelectAll } from 'prosemirror-commands';
import type { Command } from '../types/ChainedCommands.js';

/**
 * Select the whole document.
 *
 * https://prosemirror.net/docs/ref/#commands.selectAll
 */
//prettier-ignore
export const selectAll = (): Command => ({ state, dispatch }) => originalSelectAll(state, dispatch);
