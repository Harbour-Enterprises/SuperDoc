export type Editor = import("../Editor.js").Editor;
export type SuperValidatorOptions = {
    /**
     * The editor instance to validate.
     */
    editor: Editor;
    /**
     * If true, the validator will not modify the document.
     */
    dryRun?: boolean;
    /**
     * If true, debug information will be logged to the console.
     */
    debug?: boolean;
};
export type ValidatorLogger = {
    /**
     * - Function to log debug messages.
     */
    debug: (arg0: string, ...args: any[]) => void;
    /**
     * - Function to create a new logger with an additional prefix.
     */
    withPrefix: (arg0: string) => ValidatorLogger;
};
export type StateValidator = Function;
export type ElementInfo = {
    node?: import("prosemirror-model").Node;
    pos: number;
    /**
     * - For marks
     */
    from?: number;
    /**
     * - For marks
     */
    to?: number;
    /**
     * - For marks
     */
    mark?: import("prosemirror-model").Mark;
};
export type DocumentAnalysis = Record<string, ElementInfo[]>;
export type ValidatorRequirements = {
    /**
     * - Node types this validator needs
     */
    nodes?: string[];
    /**
     * - Mark types this validator needs
     */
    marks?: string[];
};
export type ValidatorFn = (arg0: import("prosemirror-state").Transaction, arg1: DocumentAnalysis) => {
    modified: boolean;
    results: string[];
};
export type ValidatorFunction = ValidatorFn & {
    requiredElements?: ValidatorRequirements;
};
//# sourceMappingURL=types.d.ts.map