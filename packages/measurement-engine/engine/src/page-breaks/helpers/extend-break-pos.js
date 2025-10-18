/**
 * Push a break position forward to include any trailing section marker paragraphs.
 *
 * @param {import('prosemirror-model').Node|null} doc ProseMirror document node.
 * @param {number} breakPos Original break position.
 * @returns {number} Adjusted break position that respects section markers.
 */
export function extendBreakPositionWithSectionMarkers(doc, breakPos) {
  if (!doc || typeof doc.content?.findIndex !== 'function') return breakPos;
  const docSize = doc.content?.size ?? breakPos;
  const { index, offset } = doc.content.findIndex(breakPos);
  if (index < 0) return breakPos;

  let adjusted = breakPos;
  const currentNode = doc.child(index);
  const currentStart = offset;
  const currentEnd = offset + currentNode.nodeSize;

  if (adjusted > currentStart && adjusted < currentEnd) {
    adjusted = currentEnd;
  }

  let nextIndex = index;
  let cursor = currentEnd;
  if (adjusted >= currentEnd) {
    nextIndex = index + 1;
  }

  while (nextIndex < doc.childCount) {
    const candidate = doc.child(nextIndex);
    if (!isSectPrParagraph(candidate)) break;
    cursor += candidate.nodeSize;
    adjusted = cursor;
    nextIndex += 1;
  }

  if (!Number.isFinite(adjusted)) return breakPos;
  return Math.min(Math.max(adjusted, breakPos), docSize);
}

/**
 * Determine whether the provided node is a section-property placeholder paragraph.
 *
 * @param {import('prosemirror-model').Node|null} node ProseMirror node to inspect.
 * @returns {boolean} True when the node marks section properties.
 */
function isSectPrParagraph(node) {
  if (!node || node.type?.name !== 'paragraph') return false;
  return node.attrs?.pageBreakSource === 'sectPr';
}
