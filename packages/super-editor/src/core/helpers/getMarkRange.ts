import { objectIncludes } from '../utilities/objectIncludes.js';
import type { Mark, MarkType, ResolvedPos } from 'prosemirror-model';

/**
 * Get the range of a mark in a document
 */
function findMarkInSet(marks: Mark[], type: MarkType, attrs: Record<string, unknown> = {}): Mark | undefined {
  return marks.find((item) => {
    return item.type === type && objectIncludes(item.attrs, attrs);
  });
}

/**
 * Check if a mark is in a set of marks
 */
function isMarkInSet(marks: Mark[], type: MarkType, attrs: Record<string, unknown> = {}): boolean {
  return !!findMarkInSet(marks, type, attrs);
}

/**
 * Get the range of a mark in a document
 */
export function getMarkRange(
  $pos: ResolvedPos,
  type: MarkType,
  attrs: Record<string, unknown> = {},
): { from: number; to: number } | undefined {
  if (!$pos || !type) return;

  let start = $pos.parent.childAfter($pos.parentOffset);

  if ($pos.parentOffset === start.offset && start.offset !== 0) {
    start = $pos.parent.childBefore($pos.parentOffset);
  }

  if (!start.node) return;

  const mark = findMarkInSet([...start.node.marks], type, attrs);
  if (!mark) return;

  let startIndex = start.index;
  let startPos = $pos.start() + start.offset;
  let endIndex = startIndex + 1;
  let endPos = startPos + start.node.nodeSize;

  findMarkInSet([...start.node.marks], type, attrs);

  while (startIndex > 0 && mark.isInSet($pos.parent.child(startIndex - 1).marks)) {
    startIndex -= 1;
    startPos -= $pos.parent.child(startIndex).nodeSize;
  }

  while (endIndex < $pos.parent.childCount && isMarkInSet([...$pos.parent.child(endIndex).marks], type, attrs)) {
    endPos += $pos.parent.child(endIndex).nodeSize;
    endIndex += 1;
  }

  return { from: startPos, to: endPos };
}
