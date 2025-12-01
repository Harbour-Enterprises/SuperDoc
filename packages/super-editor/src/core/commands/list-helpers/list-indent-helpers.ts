import type { Node as PmNode, ResolvedPos } from 'prosemirror-model';

const LIST_NODE_NAMES = new Set(['orderedList', 'bulletList']);

export const parseLevel = (value: number | string | undefined): number => {
  if (typeof value === 'number') return value;
  const parsed = parseInt(value as string, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const resolveParentList = ($pos: ResolvedPos | null | undefined): PmNode | null => {
  if (!$pos) return null;

  for (let depth = $pos.depth; depth >= 0; depth--) {
    const node = $pos.node(depth);
    if (node?.type && LIST_NODE_NAMES.has(node.type.name)) {
      return node;
    }
  }

  return null;
};
