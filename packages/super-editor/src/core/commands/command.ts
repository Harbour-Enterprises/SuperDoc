import type { Command, CommandProps } from '../types/ChainedCommands.js';

/**
 * Define a command function inline.
 * @param fn Command function.
 */
export const command =
  (fn: Command) =>
  (props: CommandProps): boolean =>
    fn(props);
