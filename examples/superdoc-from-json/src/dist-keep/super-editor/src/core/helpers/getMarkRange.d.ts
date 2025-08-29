/**
 * Get the range of a mark in a document
 * @param {import("prosemirror-model").ResolvedPos} $pos - The position in the document
 * @param {import("prosemirror-model").MarkType} type - The type of the mark
 * @param {Object} attrs - The attributes of the mark
 * @returns {Object} The range of the mark in the document
 */
export function getMarkRange($pos: import("prosemirror-model").ResolvedPos, type: import("prosemirror-model").MarkType, attrs?: any): any;
