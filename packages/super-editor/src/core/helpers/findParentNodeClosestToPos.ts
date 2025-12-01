import type { Node as PmNode, ResolvedPos } from 'prosemirror-model';

export type ParentNodeInfo = {
  pos: number;
  start: number;
  depth: number;
  node: PmNode;
};

/**
 * Finds the closest parent node to a resolved position that matches a predicate.
 *
 * https://github.com/atlassian/prosemirror-utils/blob/master/src/selection.ts#L57
 */
export const findParentNodeClosestToPos = (
  $pos: ResolvedPos,
  predicate: (node: PmNode) => boolean,
): ParentNodeInfo | null => {
  for (let i = $pos.depth; i > 0; i--) {
    const node = $pos.node(i);
    if (predicate(node)) {
      return {
        pos: i > 0 ? $pos.before(i) : 0,
        start: $pos.start(i),
        depth: i,
        node,
      };
    }
  }
  return null;
};
