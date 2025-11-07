import type { Transaction, EditorState } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { Editor } from '../Editor.js';

/**
 * A chainable version of an editor command.
 */
export type ChainedCommand = (...args: any[]) => ChainableCommandObject;

/**
 * Chainable command object returned by `createChain`.
 * Has dynamic keys (one per command) and a `run()` method.
 */
export type ChainableCommandObject = {
  run: () => boolean;
} & Record<string, ChainedCommand>;

/**
 * A command that can be checked for availability
 */
export type CanCommand = (...args: any[]) => boolean;

/**
 * Map of commands that can be checked
 */
export type CanCommands = Record<string, CanCommand>;

/**
 * Object returned by `createCan`: dynamic boolean commands + a `chain()` helper.
 */
export type CanObject = Record<string, CanCommand> & {
  chain: () => ChainableCommandObject;
};

/**
 * Core editor commands available on all instances
 */
export interface CoreCommands {
  /** Focus the editor */
  focus: () => boolean;

  /** Blur the editor */
  blur: () => boolean;
}

/**
 * Commands added by extensions - will be populated by individual extensions
 */
export interface ExtensionCommands {
  [key: string]: (...args: any[]) => boolean;
}

/**
 * All available editor commands
 */
export type EditorCommands = CoreCommands & ExtensionCommands;

/**
 * Command props made available to every command handler.
 */
export interface CommandProps {
  /** The editor instance */
  editor: Editor;

  /** The ProseMirror transaction */
  tr: Transaction;

  /** The current editor state */
  state: EditorState;

  /** The active editor view */
  view: EditorView;

  /** Optional dispatcher */
  dispatch?: (tr: Transaction) => void;

  /** Helper to build command chains */
  chain: () => ChainableCommandObject;

  /** Helper to check command availability */
  can: () => CanObject;

  /** Lazy command map bound to current props */
  commands: EditorCommands;
}

/**
 * A command handler invoked by the command service.
 */
export type Command = (props: CommandProps) => boolean;

/**
 * Command service options
 */
export interface CommandServiceOptions {
  /** The editor instance */
  editor: Editor;
}
