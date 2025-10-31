import { DEFAULT_PAGE_HEIGHT_IN_PX, DEFAULT_PAGE_MARGINS_IN_PX } from '../core/constants.js';
import { clamp, getContainerTop, normalizeBreakResult } from './helpers/index.js';
import {
  safeCoordsAtPos,
  computePageWindow,
  findFirstOverflowBlock,
  findForcedBreak,
  findFallbackTableOverflow,
} from './helpers/index.js';
import { findTableRowOverflow } from './calculate-page-breaks.js';
import {
  resolveBreakPos,
  findOverflowBreakPoint,
  shouldUseForcedBreak,
  selectBreakPoint,
  ensureOverflowBlock,
  buildBoundaryInfo,
} from './page-breaks-helpers.js';

/**
 * Measure and find a suitable page break position for a given page index.
 *
 * @param {Object} view - The ProseMirror editor view instance.
 * @param {number} pageIndex - The zero-based index of the page to measure.
 * @param {Object} [options] - Optional parameters for measurement.
 * @param {number} [options.pageHeightPx=DEFAULT_PAGE_HEIGHT_IN_PX] - The height of the page in pixels.
 * @param {Object} [options.marginsPx=DEFAULT_PAGE_MARGINS_IN_PX] - The page margins in pixels.
 * @param {number} [options.startPos=0] - The document position to start searching from.
 * @param {number} [options.columnIndex=0] - The zero-based index of the column (for multi-column layouts).
 * @param {number} [options.columnCount=1] - The total number of columns (for multi-column layouts).
 * @returns {Object|null} An object containing the break position, overflow block info, and boundary details, or null if no break found.
 */
export function measureBreakAtPageIndex(
  view,
  pageIndex,
  {
    pageHeightPx = DEFAULT_PAGE_HEIGHT_IN_PX,
    marginsPx = DEFAULT_PAGE_MARGINS_IN_PX,
    startPos = 0,
    columnIndex = 0,
    columnCount = 1,
  } = {},
) {
  // Normalize input parameters
  const containerTop = getContainerTop(view);
  const safeColumnCount = Math.max(1, Math.round(columnCount || 1));
  const safeColumnIndex = Math.min(safeColumnCount - 1, Math.max(0, Math.round(columnIndex || 0)));

  // Calculate page dimensions
  const safePageHeightPx = Math.max(0, pageHeightPx ?? DEFAULT_PAGE_HEIGHT_IN_PX);
  const pageWindow = computePageWindow({
    pageHeightPx: safePageHeightPx,
    topMarginPx: marginsPx.top,
    bottomMarginPx: marginsPx.bottom,
  });

  const printableHeightPx = pageWindow.printableHeightPx > 0 ? pageWindow.printableHeightPx : safePageHeightPx;
  const contentHeightPx = pageWindow.contentHeightPx > 0 ? pageWindow.contentHeightPx : printableHeightPx;
  const overflowAllowancePx = Math.min(pageWindow.allowancePx, contentHeightPx);
  const footerReservePx = pageWindow.safeBottomMargin;

  // Calculate document positions and page boundaries
  const docSize = view?.state?.doc?.content?.size ?? 0;
  const maxDocPos = Math.max(0, docSize - 1);
  const anchorProbePos = clamp(startPos, 0, maxDocPos);
  const anchorCoords = safeCoordsAtPos(view, anchorProbePos);

  const inferredPageTop = Number.isFinite(anchorCoords?.top) ? anchorCoords.top : null;
  const fallbackPageBase = containerTop + pageIndex * safePageHeightPx;
  const fallbackPageTop = fallbackPageBase + pageWindow.safeTopMargin;
  const pageTopY = inferredPageTop ?? fallbackPageTop;
  const pageBottomLimit = pageTopY + contentHeightPx;

  // Find overflow blocks
  let overflow = findFirstOverflowBlock(view, {
    boundaryY: pageBottomLimit,
    overflowAllowancePx,
    pageWindow,
    pageHeightPx: safePageHeightPx,
    topMarginPx: marginsPx.top,
    bottomMarginPx: marginsPx.bottom,
    startPos,
  });

  // Log initial overflow if found
  if (overflow) {
    const info = {
      pageIndex,
      nodeType: overflow?.node?.type?.name ?? null,
      pos: overflow?.pos ?? null,
      rect: overflow?.rect ?? null,
      boundary: pageBottomLimit,
    };
    if (Array.isArray(globalThis.__paginationOverflowLogs)) {
      globalThis.__paginationOverflowLogs.push({ stage: 'initial', info });
    }
  }

  // Try fallback table overflow if no overflow found
  if (!overflow) {
    const tableFallback = findFallbackTableOverflow(view, startPos, pageBottomLimit, startPos);
    if (tableFallback?.breakPoint && tableFallback?.overflowBlock) {
      const info = {
        pageIndex,
        startPos,
        boundary: pageBottomLimit,
      };
      if (Array.isArray(globalThis.__paginationOverflowLogs)) {
        globalThis.__paginationOverflowLogs.push({ stage: 'fallback', info });
      }
      overflow = tableFallback.overflowBlock;
    }
  }

  // Find natural break point from overflow
  const naturalBreak = findOverflowBreakPoint(view, overflow, pageBottomLimit, startPos, docSize);

  // Find forced break point
  const forcedBreak = findForcedBreak(view, { startPos });
  const forcedPos = resolveBreakPos(forcedBreak?.breakPoint);
  const naturalPos = resolveBreakPos(naturalBreak.breakPoint);

  // Select which break point to use
  const useForcedBreak = shouldUseForcedBreak(forcedPos, naturalPos, startPos);
  let { breakPoint, overflowBlock } = selectBreakPoint(
    { breakPoint: forcedBreak?.breakPoint, overflowBlock: forcedBreak?.overflowBlock },
    naturalBreak,
    useForcedBreak,
  );

  // Return null if no break point found
  if (!breakPoint) return null;

  // Ensure overflow block exists
  overflowBlock = ensureOverflowBlock(overflowBlock, breakPoint, forcedBreak?.overflowBlock, startPos);

  // Handle table row overflow
  if (overflowBlock?.node?.type?.name === 'table') {
    const rowOverflow = findTableRowOverflow(view, {
      startPos,
      boundary: pageBottomLimit,
    });
    if (rowOverflow) {
      breakPoint = {
        primary: rowOverflow.break,
        all: rowOverflow.rowBreaks,
      };
      overflowBlock = rowOverflow.overflowBlock;
    }
  }

  // Normalize and build final result
  const baselineOffset = pageTopY;
  const normalizedBreak = normalizeBreakResult(breakPoint, baselineOffset);

  const fallbackPrimary = 'primary' in breakPoint ? breakPoint.primary : breakPoint;
  const fallbackRows = 'all' in breakPoint && Array.isArray(breakPoint.all) ? breakPoint.all : null;
  const finalBreak = normalizedBreak.primary ?? fallbackPrimary ?? null;
  const finalRows = normalizedBreak.rows ?? fallbackRows;

  return {
    overflowBlock,
    break: finalBreak,
    rowBreaks: finalRows,
    boundary: buildBoundaryInfo({
      pageTopY,
      pageBottomLimit,
      safePageHeightPx,
      marginsPx,
      printableHeightPx,
      contentHeightPx,
      footerReservePx,
      safeColumnIndex,
      safeColumnCount,
      overflowAllowancePx,
      baselineOffset,
    }),
  };
}
