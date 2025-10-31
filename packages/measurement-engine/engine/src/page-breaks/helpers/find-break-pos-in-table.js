import { isTableNode, safeCoordsAtPos, clamp } from './index.js';

/**
 * Return the first numeric candidate that is finite.
 *
 * @param {...number} candidates Candidate numeric values.
 * @returns {number|null} The first finite value, or null otherwise.
 */
const pickFirstFinite = (...candidates) => {
  for (const value of candidates) {
    if (Number.isFinite(value)) return value;
  }
  return null;
};

/**
 * Collect top/bottom measurements for a table row.
 *
 * @param {import('prosemirror-view').EditorView} view Measurement editor view.
 * @param {number} pos Starting document position for the row.
 * @param {import('prosemirror-model').Node|null} node Row node to sample.
 * @param {number} maxDocPos Maximum valid document position.
 * @returns {{top:number|null,bottom:number|null}} Row bounds, if measurable.
 */
const resolveRowMetrics = (view, pos, node, maxDocPos) => {
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
 * Attempt to find a safe break position within a table before reaching the boundary.
 *
 * @param {import('prosemirror-view').EditorView} view Measurement editor view.
 * @param {number} tablePos Starting document position of the table.
 * @param {import('prosemirror-model').Node|null} tableNode Table node.
 * @param {number} boundaryY Page boundary in pixels.
 * @param {number} [minPos=0] Minimum document position allowed for the break.
 * @returns {{primary:{pos:number,top:number,bottom:number},all:Array<{pos:number,top:number,bottom:number}>,diagnostics:Array}|null}
 */
export function findBreakPosInTable(view, tablePos, tableNode, boundaryY, minPos = 0) {
  if (!isTableNode(tableNode)) return null;

  const docSize = Math.max(0, view?.state?.doc?.content?.size ?? 0);
  const maxDocPos = Math.max(0, docSize - 1);
  const breakdown = [];

  let offset = 0;
  for (let i = 0; i < tableNode.childCount; i++) {
    const row = tableNode.child(i);
    const rowStart = clamp(tablePos + 1 + offset, 0, maxDocPos);
    const rowEnd = clamp(rowStart + Math.max(0, row.nodeSize - 1), 0, maxDocPos);
    offset += row.nodeSize;

    if (rowEnd <= minPos) continue;

    const metrics = resolveRowMetrics(view, rowStart, row, maxDocPos);
    const entry = {
      index: i,
      rowStart,
      rowEnd,
      top: metrics.top,
      bottom: metrics.bottom,
      boundaryY,
    };
    breakdown.push(entry);
    if (Array.isArray(globalThis.__paginationTableLogs)) {
      globalThis.__paginationTableLogs.push({
        stage: 'row-metrics',
        tablePos,
        entry,
      });
    }
    if (metrics.bottom == null) continue;
    if (metrics.bottom <= boundaryY) continue;

    const resolvedPos = clamp(rowStart, minPos, rowEnd);
    const result = {
      primary: {
        pos: resolvedPos,
        top: pickFirstFinite(boundaryY, metrics.top, metrics.bottom) ?? boundaryY,
        bottom: boundaryY,
      },
      all: [
        {
          pos: resolvedPos,
          top: pickFirstFinite(boundaryY, metrics.top, metrics.bottom) ?? boundaryY,
          bottom: boundaryY,
        },
      ],
      diagnostics: breakdown,
    };
    if (Array.isArray(globalThis.__paginationTableLogs)) {
      globalThis.__paginationTableLogs.push({
        stage: 'row-overflow',
        tablePos,
        result,
      });
    }
    return result;
  }

  return null;
}
