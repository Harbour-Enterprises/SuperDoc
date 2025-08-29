/**
 * @typedef {import('prosemirror-state').Transaction} Transaction
 * @typedef {import('./commands/types/index.js').ChainableCommandObject} ChainableCommandObject
 */
/**
 * CommandService is the main class to work with commands.
 */
export class CommandService {
    /**
     * Static method for creating a service.
     * @param {import('./commands/types/index.js').CommandServiceOptions} params for the constructor.
     * @returns {CommandService} New instance of CommandService
     */
    static create(params: import("./commands/types/index.js").CommandServiceOptions): CommandService;
    /**
     * @param {import('./commands/types/index.js').CommandServiceOptions} props
     */
    constructor(props: import("./commands/types/index.js").CommandServiceOptions);
    editor: import("./Editor.js").Editor;
    rawCommands: any;
    /**
     * Get editor state.
     * @returns {import("prosemirror-state").EditorState} Editor state
     */
    get state(): import("prosemirror-state").EditorState;
    /**
     * Get all editor commands
     * @returns {import('./commands/types/index.js').EditorCommands} Commands object
     */
    get commands(): import("./commands/types/index.js").EditorCommands;
    /**
     * Create a chain of commands to call multiple commands at once.
     * @returns {(startTr?: Transaction, shouldDispatch?: boolean) => ChainableCommandObject} Function that creates a command chain
     */
    get chain(): (startTr?: Transaction, shouldDispatch?: boolean) => ChainableCommandObject;
    /**
     * Check if a command or a chain of commands can be executed. Without executing it.
     * @returns {() => import('./commands/types/index.js').CanObject} Function that creates a can object
     */
    get can(): () => import("./commands/types/index.js").CanObject;
    /**
     * Creates a chain of commands.
     * @param {import("prosemirror-state").Transaction} [startTr] - Start transaction.
     * @param {boolean} [shouldDispatch=true] - Whether to dispatch the transaction.
     * @returns {import('./commands/types/index.js').ChainableCommandObject} The command chain.
     */
    createChain(startTr?: import("prosemirror-state").Transaction, shouldDispatch?: boolean): import("./commands/types/index.js").ChainableCommandObject;
    /**
     * Creates a can check for commands.
     * @param {import("prosemirror-state").Transaction} [startTr] - Start transaction.
     * @returns {import('./commands/types/index.js').CanObject} The can object.
     */
    createCan(startTr?: import("prosemirror-state").Transaction): import("./commands/types/index.js").CanObject;
    /**
     * Creates default props for the command method.
     * @param {import("prosemirror-state").Transaction} tr Transaction.
     * @param {boolean} shouldDispatch Check if should dispatch.
     * @returns {Object} Props object.
     */
    createProps(tr: import("prosemirror-state").Transaction, shouldDispatch?: boolean): any;
}
export type Transaction = import("prosemirror-state").Transaction;
export type ChainableCommandObject = import("./commands/types/index.js").ChainableCommandObject;
