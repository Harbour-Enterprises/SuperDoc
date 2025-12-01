import type { Node as PmNode } from 'prosemirror-model';
import { getResolvedParagraphProperties } from '@extensions/paragraph/resolvedPropertiesCache.js';

/**
 * Helper function to check if a node is a list.
 * @param node - The ProseMirror node to check.
 * @returns True if the node is an ordered or bullet list, false otherwise
 */
export const isList = (node: PmNode | null | undefined): boolean =>
  !!node &&
  node.type?.name === 'paragraph' &&
  !!getResolvedParagraphProperties(node)?.numberingProperties &&
  node.attrs?.listRendering;
