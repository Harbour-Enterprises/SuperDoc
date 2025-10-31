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

  const insideCurrent = breakPos > currentStart && breakPos < currentEnd;
  const atCurrentStart = breakPos === currentStart;
  const advanceCurrent = insideCurrent || (atCurrentStart && isSectPrParagraph(currentNode));

  if (advanceCurrent) {
    adjusted = currentEnd;
  }

  let scanIndex;
  let scanPos;

  if (advanceCurrent) {
    scanIndex = index + 1;
    scanPos = currentEnd;
  } else if (adjusted >= currentEnd) {
    scanIndex = index + 1;
    scanPos = Math.max(adjusted, currentEnd);
  } else {
    scanIndex = index;
    scanPos = currentStart;
  }

  while (scanIndex < doc.childCount) {
    const candidate = doc.child(scanIndex);
    if (!isSectPrParagraph(candidate)) break;
    scanPos += candidate.nodeSize;
    adjusted = scanPos;
    scanIndex += 1;
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
