import type { Node as PmNode } from 'prosemirror-model';

/**
 * Structured content node with its absolute position in the document.
 */
export type StructuredContentMatch = {
  node: PmNode;
  pos: number;
};
