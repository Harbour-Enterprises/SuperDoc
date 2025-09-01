/**
 * Helper function to check if a node is a list.
 * @param {import("prosemirror-model").Node} n - The ProseMirror node to check.
 * @returns {boolean} True if the node is an ordered or bullet list, false otherwise
 */
export const isList = (n) => !!n && (n.type?.name === 'orderedList' || n.type?.name === 'bulletList');
