import { selectNodeBackward as originalSelectNodeBackward } from 'prosemirror-commands';
import type { Command } from '../types/ChainedCommands.js';

/**
 * Select a node backward.
 *
 * https://prosemirror.net/docs/ref/#commands.selectNodeBackward
 */
export const selectNodeBackward =
  (): Command =>
  ({ state, dispatch }) => {
    return originalSelectNodeBackward(state, dispatch);
  };
