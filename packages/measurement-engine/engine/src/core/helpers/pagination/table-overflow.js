import { findBreakPosInBlock, safeCoordsAtPos } from '../../../page-breaks/helpers/index.js';
import { clampToDoc } from './utils.js';

const TABLE_CELL_NODE_NAMES = new Set(['tableCell', 'tableHeader']);
const TABLE_ROW_NODE_NAMES = new Set(['tableRow', 'row']);

/**
 * Locate the first overflowing table row beyond a page boundary.
 * @param {import('prosemirror-view').EditorView} view - Measurement editor view.
 * @param {Object} options - Search configuration.
 * @param {number} [options.startPos=0] - Minimum document position to consider.
 * @param {number} options.boundary - Absolute Y pixel boundary.
 * @returns {Object|null} Overflow descriptor when found, otherwise null.
 */
export const findTableRowOverflow = (view, { startPos = 0, boundary }) => {
  const doc = view?.state?.doc;
  if (!view || !doc || !Number.isFinite(boundary)) return null;

  const maxDocPos = Math.max(0, doc.content.size - 1);
  let detected = null;

  let rowIndex = -1;

  doc.descendants((node, pos) => {
    if (detected) return false;

    const nodeEnd = pos + node.nodeSize;
    if (nodeEnd <= startPos) return true;

    const isRow =
      node?.type?.name === 'tableRow' || node?.type?.spec?.tableRole === 'row' || node?.type?.name === 'row';
    if (!isRow) return true;

    rowIndex += 1;

    const rowStart = Math.max(pos, startPos);
    const rowEnd = Math.max(rowStart, nodeEnd - 1);

    const bottomCoords = safeCoordsAtPos(view, Math.min(rowEnd, maxDocPos));
    const topCoords = safeCoordsAtPos(view, Math.min(rowStart, maxDocPos));

    let rowRect = null;
    try {
      const dom = view.nodeDOM(rowStart);
      if (dom && typeof dom.getBoundingClientRect === 'function') {
        rowRect = dom.getBoundingClientRect();
      }
    } catch {}

    const rowBottom = Number.isFinite(rowRect?.bottom)
      ? rowRect.bottom
      : Number.isFinite(bottomCoords?.bottom)
        ? bottomCoords.bottom
        : null;
    const rowTop = Number.isFinite(rowRect?.top) ? rowRect.top : Number.isFinite(topCoords?.top) ? topCoords.top : null;

    const sampleInfo = {
      index: rowIndex,
      pos,
      rowStart,
      rowEnd,
      rowTop,
      rowBottom,
      boundary,
      rectTop: rowRect?.top ?? null,
      rectBottom: rowRect?.bottom ?? null,
    };

    if (Array.isArray(globalThis.__paginationTableLogs)) {
      globalThis.__paginationTableLogs.push({ stage: 'row-sample', data: sampleInfo });
    }

    if (rowBottom == null || rowBottom <= boundary) {
      return true;
    }

    const breakEntry = {
      pos: rowStart,
      top: boundary,
      bottom: boundary,
    };

    const rowMinSearchPos = Math.max(startPos, pos + 1, rowStart);
    const rowMaxSearchPos = Math.max(rowStart, nodeEnd - 1, rowMinSearchPos);
    let refinedEntry = null;

    const attemptCellRefinement = () => {
      if (!node || !Number.isFinite(node.childCount) || node.childCount <= 0) return;
      let offset = 0;
      for (let cellIndex = 0; cellIndex < node.childCount; cellIndex += 1) {
        const cellNode = node.child(cellIndex);
        const rawCellPos = pos + 1 + offset;
        const rawCellEnd = rawCellPos + Math.max(0, cellNode.nodeSize - 1);
        offset += cellNode.nodeSize;

        const cellClampedStart = Math.max(rawCellPos, rowMinSearchPos, 0);
        const cellClampedEnd = Math.max(cellClampedStart, Math.min(rawCellEnd, maxDocPos));
        if (cellClampedEnd <= rowMinSearchPos) continue;

        let cellRect = null;
        try {
          const dom = view.nodeDOM(rawCellPos);
          if (dom && typeof dom.getBoundingClientRect === 'function') {
            cellRect = dom.getBoundingClientRect();
          }
        } catch {}

        const cellBottomCoords = safeCoordsAtPos(view, cellClampedEnd);
        const cellTopCoords = safeCoordsAtPos(view, Math.min(cellClampedStart, maxDocPos));
        const cellBottom = Number.isFinite(cellRect?.bottom)
          ? cellRect.bottom
          : Number.isFinite(cellBottomCoords?.bottom)
            ? cellBottomCoords.bottom
            : null;
        const cellTop = Number.isFinite(cellRect?.top)
          ? cellRect.top
          : Number.isFinite(cellTopCoords?.top)
            ? cellTopCoords.top
            : null;

        if (Array.isArray(globalThis.__paginationTableLogs)) {
          globalThis.__paginationTableLogs.push({
            stage: 'row-cell-sample',
            data: {
              rowIndex,
              cellIndex,
              rawCellPos,
              cellStart: cellClampedStart,
              cellEnd: cellClampedEnd,
              cellTop,
              cellBottom,
              boundary,
            },
          });
        }

        if (cellBottom == null || cellBottom <= boundary) {
          continue;
        }

        try {
          const refined = findBreakPosInBlock(view, rawCellPos, cellNode, boundary, cellClampedStart);
          if (refined && Number.isFinite(refined.pos)) {
            const constrainedPos = Math.max(cellClampedStart, Math.min(refined.pos, cellClampedEnd));
            const resolvedBottom = Number.isFinite(refined.bottom) ? Math.min(refined.bottom, boundary) : boundary;
            const resolvedTop = Number.isFinite(refined.top) ? Math.min(refined.top, resolvedBottom) : resolvedBottom;
            refinedEntry = {
              pos: constrainedPos,
              top: resolvedTop,
              bottom: resolvedBottom,
            };
            if (Array.isArray(globalThis.__paginationTableLogs)) {
              globalThis.__paginationTableLogs.push({
                stage: 'row-break-refined-cell',
                data: {
                  rowIndex,
                  cellIndex,
                  constrainedPos,
                  resolvedTop,
                  resolvedBottom,
                },
              });
            }
            return;
          }
        } catch {}

        const fallbackPos = Math.max(cellClampedStart, Math.min(cellClampedEnd, rowMaxSearchPos));
        refinedEntry = {
          pos: fallbackPos,
          top: boundary,
          bottom: boundary,
        };
        return;
      }
    };

    attemptCellRefinement();

    if (rowMinSearchPos <= rowMaxSearchPos) {
      try {
        const refined = findBreakPosInBlock(view, pos, node, boundary, rowMinSearchPos);
        if (refined && Number.isFinite(refined.pos)) {
          const constrainedPos = Math.max(rowMinSearchPos, Math.min(refined.pos, rowMaxSearchPos));
          const resolvedBottom = Number.isFinite(refined.bottom) ? Math.min(refined.bottom, boundary) : boundary;
          const resolvedTop = Number.isFinite(refined.top) ? Math.min(refined.top, resolvedBottom) : resolvedBottom;
          const rowRefinement = {
            pos: constrainedPos,
            top: resolvedTop,
            bottom: resolvedBottom,
          };
          if (!refinedEntry || constrainedPos < refinedEntry.pos) {
            refinedEntry = rowRefinement;
          }
          if (Array.isArray(globalThis.__paginationTableLogs)) {
            globalThis.__paginationTableLogs.push({
              stage: 'row-break-refined',
              data: {
                rowIndex,
                rowStart,
                rowEnd,
                constrainedPos,
                resolvedTop,
                resolvedBottom,
              },
            });
          }
        }
      } catch {}
    }

    if ((!refinedEntry || refinedEntry.pos <= rowStart) && rowMinSearchPos < rowMaxSearchPos) {
      const fallbackResult = binarySearchForYPosition(view, rowMinSearchPos, rowMaxSearchPos, boundary);
      const fallbackPos = fallbackResult?.pos;
      const clampedFallbackPos = Number.isFinite(fallbackPos)
        ? clampToDoc(Math.max(rowMinSearchPos, Math.min(fallbackPos, rowMaxSearchPos)), maxDocPos)
        : null;

      if (Number.isFinite(clampedFallbackPos) && clampedFallbackPos > rowStart) {
        // Use returned coords instead of re-sampling! This avoids the caret-before-first-char bug
        const fallbackCoords = fallbackResult?.coords ?? safeCoordsAtPos(view, clampedFallbackPos);
        const candidateBottom = Number.isFinite(fallbackCoords?.bottom) ? fallbackCoords.bottom : boundary;
        const resolvedBottom = Math.min(candidateBottom, boundary);
        const candidateTop = Number.isFinite(fallbackCoords?.top) ? fallbackCoords.top : resolvedBottom;
        const resolvedTop = Math.min(candidateTop, resolvedBottom);

        refinedEntry = {
          pos: clampedFallbackPos,
          top: resolvedTop,
          bottom: resolvedBottom,
        };

        if (Array.isArray(globalThis.__paginationTableLogs)) {
          globalThis.__paginationTableLogs.push({
            stage: 'row-break-binary-fallback',
            data: {
              rowIndex,
              fallbackPos: clampedFallbackPos,
              resolvedTop,
              resolvedBottom,
              usedCachedCoords: fallbackResult?.coords === fallbackCoords,
            },
          });
        }
      }
    }

    const finalBreak = refinedEntry ?? breakEntry;

    if (process.env.NODE_ENV === 'development') {
      console.warn('🧮 [table-overflow] resolved row break', {
        rowIndex,
        rowStart,
        rowEnd,
        rowTop,
        rowBottom,
        boundary,
        finalBreak,
        usedFallback: refinedEntry == null,
      });
    }

    let rect = null;
    try {
      const dom = view.nodeDOM(pos);
      if (dom && typeof dom.getBoundingClientRect === 'function') {
        rect = dom.getBoundingClientRect();
      }
    } catch {}

    detected = {
      break: finalBreak,
      rowBreaks: [finalBreak],
      overflowBlock: {
        node,
        pos,
        rect,
      },
      metrics: {
        rowTop,
        rowBottom,
        boundary,
        breakPos: finalBreak.pos,
      },
    };

    return false;
  });

  return detected;
};

/**
 * Derive spacing segments for multi-cell tables that cross a page break.
 * Uses binary search to find optimal spacing positions in each cell of the row.
 * For cells extending past break Y: finds position at break Y.
 * For short cells: returns end position to push content to next page.
 *
 * @param {Object} options - Segment derivation configuration.
 * @param {import('prosemirror-view').EditorView} options.view - Measurement editor view.
 * @param {import('prosemirror-model').Node|null} options.doc - ProseMirror document.
 * @param {number} options.basePos - Base document position (where break occurs).
 * @param {number|null} [options.breakY] - Absolute Y coordinate of the break.
 * @param {number|null} options.docSize - Total document size for clamping.
 * @param {number} [options.pageHeightPx] - Page height in pixels.
 * @returns {Array<number>} Sorted document positions where spacing should be inserted.
 */
/**
 * Find document position closest to a target Y coordinate within a position range.
 * Uses binary search to locate the position whose visual Y coordinate is nearest to targetY.
 * Then rewinds to find the start of that line to avoid mid-line breaks.
 *
 * @param {import('prosemirror-view').EditorView} view - Measurement editor view.
 * @param {number} startPos - Start of position range (inclusive).
 * @param {number} endPos - End of position range (inclusive).
 * @param {number} targetY - Target Y coordinate to find.
 * @param {number} [maxIterations=22] - Maximum binary search iterations.
 * @returns {{pos:number,coords:DOMRect|null}|null} Position and coordinates closest to targetY (at line start), or null if not found.
 */
const binarySearchForYPosition = (view, startPos, endPos, targetY, maxIterations = 22) => {
  if (!Number.isFinite(targetY) || startPos > endPos) return null;

  let left = Math.max(0, startPos);
  let right = Math.max(left, endPos);
  let bestPos = null;
  let bestDistance = Infinity;
  let bestCoords = null;

  for (let i = 0; i < maxIterations && left <= right; i++) {
    const mid = left + Math.floor((right - left) / 2);
    const coords = safeCoordsAtPos(view, mid);

    if (!coords || !Number.isFinite(coords.top)) {
      // Invalid coords - try adjusting search range
      if (mid <= left) {
        left += 1;
      } else {
        right -= 1;
      }
      continue;
    }

    // Use top coordinate for comparison
    const distance = Math.abs(coords.top - targetY);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestPos = mid;
      bestCoords = coords;
    }

    // Navigate binary search
    if (coords.top < targetY) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  if (bestPos === null) {
    return null;
  }

  // Cache the overflow coordinates BEFORE rewinding
  const cachedOverflowCoords = bestCoords;

  // Now rewind to find the line start to avoid breaking mid-line
  const sampledTop = bestCoords?.top;
  if (!Number.isFinite(sampledTop)) {
    return { pos: bestPos, coords: cachedOverflowCoords };
  }

  let lineStartPos = bestPos;

  // Rewind backwards until Y coordinate changes (we've moved to previous line)
  for (let checkPos = bestPos - 1; checkPos >= startPos && bestPos - checkPos < 500; checkPos--) {
    const checkCoords = safeCoordsAtPos(view, checkPos);
    const checkTop = checkCoords?.top;

    // If Y position changed significantly, we've moved to the previous line
    if (Number.isFinite(checkTop) && Math.abs(checkTop - sampledTop) > 5) {
      lineStartPos = checkPos + 1;
      break;
    }

    // If we reached the start, this is the line start
    if (checkPos === startPos) {
      lineStartPos = startPos;
      break;
    }
  }

  // CRITICAL: Use cached coords from binary search, not resampled coords
  // The cached coords represent the position closest to targetY (page boundary).
  // When we rewind to avoid mid-word breaks, we're changing the BREAK POSITION,
  // but the PAGE BOUNDARY (Y coordinate) remains at targetY.
  // Resampling at lineStartPos - 1 gives us coords somewhere in the previous line,
  // which is NOT at the page boundary - it's too high, causing lost spacing.

  // Only log in development when rewinding occurs (helps debug spacing issues)
  if (process.env.NODE_ENV === 'development' && bestPos !== lineStartPos) {
    console.log(`[binarySearchForYPosition] Rewound ${bestPos - lineStartPos} positions to avoid mid-line break`);
  }

  return { pos: lineStartPos, coords: cachedOverflowCoords };
};

/**
 * Find the optimal position in a cell to insert spacing.
 * For cells that extend past targetY: finds position at targetY via binary search.
 * For cells shorter than targetY: returns end of cell (spacing will push content to next page).
 *
 * @param {import('prosemirror-view').EditorView} view - Measurement editor view.
 * @param {number} cellPos - Document position of the cell.
 * @param {import('prosemirror-model').Node} cellNode - The cell node.
 * @param {number} targetY - Target Y coordinate (from break).
 * @param {number} docSize - Total document size for clamping.
 * @returns {number|null} Position to insert spacing, or null if not found.
 */
const findCellSpacingPosition = (view, cellPos, cellNode, targetY, docSize) => {
  if (!cellNode || !Number.isFinite(targetY)) return null;

  // Get cell's content bounds (excluding cell wrapper)
  const cellStart = cellPos + 1; // After cell opening tag
  const cellEnd = Math.min(cellPos + cellNode.nodeSize - 1, docSize); // Before cell closing tag

  // Get cell's visual bounds
  const cellStartCoords = safeCoordsAtPos(view, cellStart);
  const cellEndCoords = safeCoordsAtPos(view, cellEnd);

  const cellTopY = cellStartCoords?.top;
  const cellBottomY = cellEndCoords?.bottom;

  // If we can't get coordinates, fallback to cell end
  if (!Number.isFinite(cellTopY) || !Number.isFinite(cellBottomY)) {
    return cellEnd;
  }

  // Case 1: Cell extends past targetY - find position at targetY using binary search
  if (cellBottomY >= targetY) {
    const result = binarySearchForYPosition(view, cellStart, cellEnd, targetY);
    const pos = result?.pos ?? null;
    return pos !== null ? pos : cellEnd;
  }

  // Case 2: Cell is shorter than targetY (short cell)
  // Return end of cell - spacing will push content to align with next page
  return cellEnd;
};

export const deriveSpacingSegments = ({ view, doc, basePos, breakY, docSize }) => {
  // Validate inputs
  if (!Number.isFinite(basePos) || basePos < 0) {
    return [];
  }

  // Default to just base position if no view/doc
  if (!view || !doc) {
    return [clampToDoc(basePos, docSize)];
  }

  // Resolve base position to check if it's in a table
  let resolvedPos;
  try {
    resolvedPos = doc.resolve(clampToDoc(basePos, docSize));
  } catch {
    return [clampToDoc(basePos, docSize)];
  }

  // Check if break is inside a table row
  const rowContext = resolveTableRowContext(resolvedPos);
  if (!rowContext) {
    // Not in a table - just return base position
    return [clampToDoc(basePos, docSize)];
  }

  // Use breakY if provided, otherwise try to get it from coordinates
  let targetY = breakY;
  if (!Number.isFinite(targetY)) {
    const viewCoords = typeof view.coordsAtPos === 'function' ? view.coordsAtPos(resolvedPos.pos) : null;
    targetY = viewCoords?.bottom ?? viewCoords?.top ?? null;
  }

  // If we still don't have a target Y, fallback to base position only
  if (!Number.isFinite(targetY)) {
    return [clampToDoc(basePos, docSize)];
  }

  // Find spacing position for each cell in the row
  const segments = [];
  let offset = rowContext.rowPos + 1; // Start after row opening tag

  for (let i = 0; i < rowContext.rowNode.childCount; i++) {
    const cellNode = rowContext.rowNode.child(i);
    const cellPos = offset;

    // Find optimal spacing position for this cell
    const spacingPos = findCellSpacingPosition(view, cellPos, cellNode, targetY, docSize);

    if (Number.isFinite(spacingPos)) {
      segments.push(clampToDoc(spacingPos, docSize));
    }

    offset += cellNode.nodeSize;
  }

  return segments.length > 0 ? segments.sort((a, b) => a - b) : [clampToDoc(basePos, docSize)];
};

const resolveTableRowContext = (resolvedPos) => {
  if (!resolvedPos) return null;

  let rowDepth = -1;
  let cellDepth = -1;

  for (let depth = resolvedPos.depth; depth >= 0; depth -= 1) {
    const node = resolvedPos.node(depth);
    const name = node?.type?.name ?? null;
    if (cellDepth === -1 && TABLE_CELL_NODE_NAMES.has(name)) {
      cellDepth = depth;
    }
    if (TABLE_ROW_NODE_NAMES.has(name)) {
      rowDepth = depth;
      if (cellDepth !== -1) {
        break;
      }
    }
  }

  if (rowDepth === -1 || cellDepth === -1 || cellDepth <= rowDepth) {
    return null;
  }

  const rowNode = resolvedPos.node(rowDepth);
  if (!rowNode) {
    return null;
  }

  const rowPos = rowDepth > 0 ? resolvedPos.before(rowDepth) : 0;
  return {
    rowNode,
    rowPos,
  };
};
