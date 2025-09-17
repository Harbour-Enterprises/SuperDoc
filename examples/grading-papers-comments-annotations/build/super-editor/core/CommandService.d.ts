/**
 * CommandService is the main class to work with commands.
 */
export class CommandService {
    /**
     * Static method for creating a service.
     * @param args Arguments for the constructor.
     */
    static create(...args: any[]): CommandService;
    constructor(props: any);
    editor: any;
    rawCommands: any;
    /**
     * Get editor state.
     */
    get state(): any;
    /**
     * Get all commands with wrapped command method.
     */
    get commands(): any;
    /**
     * Create a chain of commands to call multiple commands at once.
     */
    get chain(): () => any;
    /**
     * Check if a command or a chain of commands can be executed. Without executing it.
     */
    get can(): () => {
        chain: () => any;
    };
    /**
     * Creates a chain of commands.
     * @param startTr Start transaction.
     * @param shouldDispatch Should dispatch or not.
     */
    createChain(startTr: any, shouldDispatch?: boolean): any;
    /**
     * Creates a can check for commands.
     * @param startTr Start transaction.
     */
    createCan(startTr: any): {
        chain: () => any;
    };
    /**
     * Creates default props for the command method.
     * @param {*} tr Transaction.
     * @param {*} shouldDispatch Check if should dispatch.
     * @returns Object with props.
     */
    createProps(tr: any, shouldDispatch?: any): {
        tr: any;
        editor: any;
        view: any;
        state: any;
        dispatch: () => any;
        chain: () => any;
        can: () => {
            chain: () => any;
        };
        readonly commands: {
            [k: string]: (...args: any[]) => any;
        };
    };
}
//# sourceMappingURL=CommandService.d.ts.map