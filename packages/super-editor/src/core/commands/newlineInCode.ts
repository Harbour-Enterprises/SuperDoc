import { newlineInCode as originalNewlineInCode } from 'prosemirror-commands';
import type { Command } from '../types/ChainedCommands.js';

/**
 * Add a newline character in code.
 *
 * https://prosemirror.net/docs/ref/#commands.newlineInCode
 */
//prettier-ignore
export const newlineInCode = (): Command => ({ state, dispatch }) => originalNewlineInCode(state, dispatch);
