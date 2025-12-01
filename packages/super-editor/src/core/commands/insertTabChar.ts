import type { Command } from '../types/ChainedCommands.js';

//prettier-ignore
export const insertTabChar = (): Command => ({ tr }) => {
  tr.insertText('\t', tr.selection.from, tr.selection.to);

  return true;
};
