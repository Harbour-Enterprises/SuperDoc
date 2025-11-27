// @ts-check
import type { NodeType, Node as PmNode } from 'prosemirror-model';

export const createCell = (cellType: NodeType, cellContent: PmNode | null = null) => {
  if (cellContent) {
    return cellType.createChecked(null, cellContent);
  }
  return cellType.createAndFill();
};
