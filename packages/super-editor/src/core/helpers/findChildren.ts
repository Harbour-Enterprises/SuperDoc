/**
 * Find children inside PM node that match a predicate.
 */
import type { Node as PmNode } from 'prosemirror-model';

export function findChildren(
  node: PmNode,
  predicate: (child: PmNode, pos: number, parent: PmNode | null) => boolean,
): Array<{ node: PmNode; pos: number }> {
  const nodesWithPos: Array<{ node: PmNode; pos: number }> = [];

  node.descendants((child, pos, parent) => {
    if (predicate(child, pos, parent)) {
      nodesWithPos.push({
        node: child,
        pos,
      });
    }
  });

  return nodesWithPos;
}
