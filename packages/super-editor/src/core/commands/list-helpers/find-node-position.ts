import type { Node as PmNode } from 'prosemirror-model';

/**
 * Helper function to find the position of a target node in the document.
 * @param doc - The ProseMirror document to search in.
 * @param targetNode - The ProseMirror node to find the position of.
 * @returns The position of the target node in the document, or null
 */
export const findNodePosition = (doc: PmNode, targetNode: PmNode): number | null => {
  let nodePos = null;
  doc.descendants((node, pos) => {
    if (node === targetNode) {
      nodePos = pos;
      return false;
    }
    return true;
  });
  return nodePos;
};
