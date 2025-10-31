import { isTableRowNode } from './index.js';
import { safeCoordsAtPos, clamp } from './index.js';

/**
 * Return the first finite numeric candidate.
 *
 * @param {...number} candidates Candidate numeric values.
 * @returns {number|null} First finite value or null when none found.
 */
const pickFirstFinite = (...candidates) => {
  for (const value of candidates) {
    if (Number.isFinite(value)) return value;
  }
  return null;
};

/**
 * Measure the top/bottom bounds for a table row.
 *
 * @param {import('prosemirror-view').EditorView} view Measurement editor view.
 * @param {number} pos Document position for the row.
 * @param {import('prosemirror-model').Node|null} node Row node to measure.
 * @param {number} maxDocPos Maximum valid document position.
 * @returns {{top:number|null,bottom:number|null}} Resolved bounds.
 */
const resolveRowBounds = (view, pos, node, maxDocPos) => {
  if (!node) {
    return { top: null, bottom: null };
  }

  let rect = null;
  try {
    const dom = view?.nodeDOM?.(pos);
    if (dom && typeof dom.getBoundingClientRect === 'function') {
      rect = dom.getBoundingClientRect();
    }
  } catch {}

  const topCoords = safeCoordsAtPos(view, clamp(pos, 0, maxDocPos));
  const bottomCoords = safeCoordsAtPos(view, clamp(pos + node.nodeSize - 1, 0, maxDocPos));

  return {
    top: pickFirstFinite(rect?.top, topCoords?.top),
    bottom: pickFirstFinite(rect?.bottom, bottomCoords?.bottom),
  };
};

/**
 * Determine whether a table row should break across pages.
 *
 * @param {import('prosemirror-view').EditorView} view Measurement editor view.
 * @param {number} rowPos Document position of the row.
 * @param {import('prosemirror-model').Node|null} rowNode Row node.
 * @param {number} boundaryY Page boundary in pixels.
 * @param {number} [minPos=0] Minimum allowed break position.
 * @returns {{primary:{pos:number,top:number,bottom:number},all:Array<{pos:number,top:number,bottom:number}>}|null}
 */
export function findBreakPosInTableRow(view, rowPos, rowNode, boundaryY, minPos = 0) {
  if (!isTableRowNode(rowNode)) return null;
  if (rowNode?.attrs?.cantSplit) return null;

  const docSize = Math.max(0, view?.state?.doc?.content?.size ?? 0);
  const maxDocPos = Math.max(0, docSize - 1);
  const rowStart = clamp(rowPos, 0, maxDocPos);
  const rowEnd = clamp(rowStart + Math.max(0, rowNode.nodeSize - 1), 0, maxDocPos);

  if (rowEnd <= minPos) return null;

  const metrics = resolveRowBounds(view, rowStart, rowNode, maxDocPos);
  if (!Number.isFinite(metrics.bottom)) return null;
  if (metrics.bottom <= boundaryY) return null;

  const resolvedPos = clamp(rowStart, minPos, rowEnd);
  const topValue = pickFirstFinite(boundaryY, metrics.top, metrics.bottom) ?? boundaryY;

  return {
    primary: {
      pos: resolvedPos,
      top: topValue,
      bottom: boundaryY,
    },
    all: [
      {
        pos: resolvedPos,
        top: topValue,
        bottom: boundaryY,
      },
    ],
  };
}
