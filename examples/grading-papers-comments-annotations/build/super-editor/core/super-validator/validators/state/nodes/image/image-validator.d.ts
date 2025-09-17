/**
 * @typedef {import('prosemirror-model').Node} Node
 * @typedef {import('prosemirror-state').Transaction} Transaction
 * @typedef {import('../../../../types.js').ValidatorLogger} ValidatorLogger
 * @typedef {import('../../../../types.js').Editor} Editor
 * @typedef {import('../../../../types.js').ValidatorFunction} ValidatorFunction
 * @typedef {import('../../../../types.js').ElementInfo} ElementInfo
 */
/**
 * Image node validations
 *
 * 1. Ensure that every image node has a valid rId attribute.
 *
 * @param {{ editor: Editor, logger: ValidatorLogger }} ctx
 * @returns {ValidatorFunction}
 */
export function createImageNodeValidator({ editor, logger }: {
    editor: Editor;
    logger: ValidatorLogger;
}): ValidatorFunction;
export type Node = import("prosemirror-model").Node;
export type Transaction = import("prosemirror-state").Transaction;
export type ValidatorLogger = import("../../../../types.js").ValidatorLogger;
export type Editor = import("../../../../types.js").Editor;
export type ValidatorFunction = import("../../../../types.js").ValidatorFunction;
export type ElementInfo = import("../../../../types.js").ElementInfo;
//# sourceMappingURL=image-validator.d.ts.map