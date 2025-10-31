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

  const candidates = [];
  const { from, to } = state.selection;

  doc.nodesBetween(from, to, (node, pos) => {
    if (node.type === listItemType) {
      const size = typeof node.nodeSize === 'number' ? node.nodeSize : 0;
      candidates.push({ node, pos, end: pos + size });
    }
  });

  if (!candidates.length && typeof fallbackPos === 'number') {
    return [fallbackPos];
  }

  const filtered = candidates.filter(({ pos, end }) => {
    return !candidates.some((other) => other.pos > pos && other.pos < end);
  });

  const sorted = filtered.map(({ pos }) => pos).sort((a, b) => a - b);

  return sorted.filter((pos, index) => index === 0 || pos !== sorted[index - 1]);
};
