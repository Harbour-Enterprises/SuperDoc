import type { Command, CommandProps } from '../types/ChainedCommands.js';

/**
 * Runs commands and stops at the first one that returns true.
 * @param commands Commands to run.
 *
 * Example:
 * editor.commands.first(({ commands }) => [
 *  () => commands.deleteSelection(),
 *  () => commands.joinBackward(),
 *  () => commands.selectNodeBackward(),
 * ]);
 */
export const first =
  (commands: Command[] | ((props: CommandProps) => Command[])): Command =>
  (props) => {
    const items = typeof commands === 'function' ? commands(props) : commands;

    for (let i = 0; i < items.length; i += 1) {
      if (items[i](props)) return true;
    }

    return false;
  };
