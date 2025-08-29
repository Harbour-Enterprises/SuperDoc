/**
 * @typedef {import('./types.js').ElementInfo} ElementInfo
 * @typedef {import('./types.js').DocumentAnalysis} DocumentAnalysis
 * @typedef {import('./types.js').ValidatorFunction} ValidatorFunction
 * @typedef {import('./types.js').ValidatorRequirements} ValidatorRequirements
 * @typedef {import('./types.js').SuperValidatorOptions} SuperValidatorOptions
 * @typedef {import('./types.js').Editor} Editor
 * @typedef {import('./types.js').ValidatorLogger} ValidatorLogger
 * @typedef {import('./types.js').StateValidator} StateValidator
 * @typedef {import('prosemirror-model').Mark} Mark
 * @typedef {import('prosemirror-model').Node} Node
 */
/**
 * Main class for validating XML documents in the Super Editor.
 */
export class SuperValidator {
    /**
     * Create a SuperValidator instance.
     * @param {SuperValidatorOptions} options - Options for the validator.
     */
    constructor(options: SuperValidatorOptions);
    dryRun: boolean;
    debug: boolean;
    logger: import("./types.js").ValidatorLogger;
    /**
     * Validate the active document in the editor. Triggered automatically on editor initialization.
     * @returns {{ modified: boolean, results: Array<{ key: string, results: string[] }> }}
     */
    validateActiveDocument(): {
        modified: boolean;
        results: Array<{
            key: string;
            results: string[];
        }>;
    };
    #private;
}
export type ElementInfo = import("./types.js").ElementInfo;
export type DocumentAnalysis = import("./types.js").DocumentAnalysis;
export type ValidatorFunction = import("./types.js").ValidatorFunction;
export type ValidatorRequirements = import("./types.js").ValidatorRequirements;
export type SuperValidatorOptions = import("./types.js").SuperValidatorOptions;
export type Editor = import("./types.js").Editor;
export type ValidatorLogger = import("./types.js").ValidatorLogger;
export type StateValidator = import("./types.js").StateValidator;
export type Mark = import("prosemirror-model").Mark;
export type Node = import("prosemirror-model").Node;
