import { exitCode as originalExitCode } from 'prosemirror-commands';
import type { Command } from '../types/ChainedCommands.js';

/**
 * Exit from a code block.
 */
//prettier-ignore
export const exitCode = (): Command => ({ state, dispatch }) => {
  return originalExitCode(state, dispatch);
};
