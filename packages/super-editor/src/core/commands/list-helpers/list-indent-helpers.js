const LIST_NODE_NAMES = new Set(['orderedList', 'bulletList']);

export const parseLevel = (value) => {
  if (typeof value === 'number') return value;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const resolveParentList = ($pos) => {
  if (!$pos) return null;

  for (let depth = $pos.depth; depth >= 0; depth--) {
    const node = $pos.node(depth);
    if (node?.type && LIST_NODE_NAMES.has(node.type.name)) {
      return node;
    }
  }

  return null;
};

export const collectTargetListItemPositions = (state, fallbackPos) => {
  const doc = state?.doc;
  const listItemType = state?.schema?.nodes?.listItem;

  if (!doc || !listItemType) {
    return typeof fallbackPos === 'number' ? [fallbackPos] : [];
  }

  const positions = new Set();
  const { from, to } = state.selection;

  doc.nodesBetween(from, to, (node, pos) => {
    if (node.type === listItemType) {
      positions.add(pos);
      return false;
    }
    return true;
  });

  if (!positions.size && typeof fallbackPos === 'number') {
    positions.add(fallbackPos);
  }

  return Array.from(positions).sort((a, b) => a - b);
};
