/**
 * @typedef {import('prosemirror-state').Transaction} Transaction
 * @typedef {import('../../../../../types.js').ValidatorLogger} ValidatorLogger
 * @typedef {import('../../../../../types.js').Editor} Editor
 * @typedef {import('../../../../../types.js').ElementInfo} ElementInfo
 */
/**
 * Ensure all image nodes have a valid rId attribute.
 * @param {ElementInfo[]} images
 * @param {Editor} editor
 * @param {Transaction} tr
 * @param {ValidatorLogger} logger
 * @returns {{ modified: boolean, results: string[] }}
 */
export function ensureValidImageRID(images: ElementInfo[], editor: Editor, tr: Transaction, logger: ValidatorLogger): {
    modified: boolean;
    results: string[];
};
export type Transaction = import("prosemirror-state").Transaction;
export type ValidatorLogger = import("../../../../../types.js").ValidatorLogger;
export type Editor = import("../../../../../types.js").Editor;
export type ElementInfo = import("../../../../../types.js").ElementInfo;
//# sourceMappingURL=image-rid.d.ts.map