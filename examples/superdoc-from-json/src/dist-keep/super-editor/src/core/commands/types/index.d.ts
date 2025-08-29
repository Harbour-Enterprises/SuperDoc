export type CommandServiceOptions = {
    /**
     * - The editor instance
     */
    editor: import("../../Editor.js").Editor;
};
/**
 * Core editor commands available on all instances
 */
export type CoreCommands = {
    /**
     * - Focus the editor
     */
    focus: () => boolean;
    /**
     * - Blur the editor
     */
    blur: () => boolean;
};
/**
 * Commands added by extensions - will be populated by individual extensions
 */
export type ExtensionCommands = any;
/**
 * All available editor commands
 */
export type EditorCommands = CoreCommands & ExtensionCommands;
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
export type CanCommand = (...args: any[]) => boolean;
export type CanCommands = {
    [x: string]: CanCommand;
};
/**
 * Object returned by `createCan`: dynamic boolean commands + a `chain()` helper.
 */
export type CanObject = Record<string, CanCommand> & {
    chain: () => ChainableCommandObject;
};
/**
 * Command props
 */
export type CommandProps = {
    /**
     * - The editor instance
     */
    editor: import("../../Editor.js").Editor;
    /**
     * - The ProseMirror transaction
     */
    tr: import("prosemirror-state").Transaction;
};
