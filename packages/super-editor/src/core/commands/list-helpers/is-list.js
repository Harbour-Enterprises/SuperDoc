/**
 * Helper function to check if a node is a list.
 * @param {import("prosemirror-model").Node} n - The ProseMirror node to check.
 * @returns {boolean} True if the node is an ordered or bullet list, false otherwise
 */
export const isList = (node) => {
  if (!node) return false;

  // Check paragraph-based list representation (newer schema)
  return node.type?.name === 'paragraph' && node.attrs?.numberingProperties && node.attrs?.listRendering;
};
