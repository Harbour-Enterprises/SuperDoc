/**
 * @typedef {Object} CommandServiceOptions
 * @property {import('../../Editor.js').Editor} editor - The editor instance
 */

/**
 * Core editor commands available on all instances
 * @typedef {Object} CoreCommands
 * @property {() => boolean} focus - Focus the editor
 * @property {() => boolean} blur - Blur the editor
 */

/**
 * Commands added by extensions - will be populated by individual extensions
 * @typedef {Object} ExtensionCommands
 */

/**
 * All available editor commands
 * @typedef {CoreCommands & ExtensionCommands} EditorCommands
 */

/**
 * A chainable version of an editor command.
 * @callback ChainedCommand
 * @param {...any} args - Arguments for the command
 * @returns {ChainableCommandObject}
 */

/**
 * Chainable command object returned by `createChain`.
 * Has dynamic keys (one per command) and a `run()` method.
 * @typedef {{ run: () => boolean } & Record<string, ChainedCommand>} ChainableCommandObject
 */

/**
 * @typedef {(...args:any[]) => boolean} CanCommand
 */

/**
 * @typedef {Object<string, CanCommand>} CanCommands
 */

/**
 * Object returned by `createCan`: dynamic boolean commands + a `chain()` helper.
 * @typedef {Record<string, CanCommand> & { chain: () => ChainableCommandObject }} CanObject
 */

/**
 * Command props
 * @typedef {Object} CommandProps
 * @property {import('../../Editor.js').Editor} editor - The editor instance
 * @property {import('prosemirror-state').Transaction} tr - The ProseMirror transaction
 */

export {};
