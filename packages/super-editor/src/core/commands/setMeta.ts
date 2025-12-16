import type { Command } from '../types/ChainedCommands.js';

//prettier-ignore
export const setMeta = (key: string, value: unknown): Command => ({ tr }) => {
  tr.setMeta(key, value);
  return true;
};
