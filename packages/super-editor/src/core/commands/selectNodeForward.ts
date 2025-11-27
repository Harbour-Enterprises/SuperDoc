import { selectNodeForward as originalSelectNodeForward } from 'prosemirror-commands';
import type { Command } from '../types/ChainedCommands.js';

/**
 * Select a node forward.
 *
 * https://prosemirror.net/docs/ref/#commands.selectNodeForward
 */
//prettier-ignore
export const selectNodeForward = (): Command => ({ state, dispatch }) => originalSelectNodeForward(state, dispatch);
