import { createParagraphNear as originalCreateParagraphNear } from 'prosemirror-commands';
import type { Command } from '../types/ChainedCommands.js';

/**
 * Create a paragraph nearby.
 */
//prettier-ignore
export const createParagraphNear = (): Command => ({ state, dispatch }) => {
  return originalCreateParagraphNear(state, dispatch);
};
