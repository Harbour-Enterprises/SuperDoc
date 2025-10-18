import {
  measureBreakAtPageIndex,
  safeCoordsAtPos,
  extendBreakPositionWithSectionMarkers,
  findFallbackTableOverflow,
} from './index.js';
import { findBreakPosInBlock } from './helpers/index.js';
import { DEFAULT_PAGE_HEIGHT_IN_PX, DEFAULT_PAGE_MARGINS_IN_PX } from '../core/constants.js';

/**
 * Compute the list of page breaks for the provided measurement editor.
 *
 * @param {{view: import('prosemirror-view').EditorView}} measurementEditor Measurement harness that exposes an EditorView.
 * @param {{pageHeightPx?:number,marginsPx?:{top:number,bottom:number,left?:number,right?:number},startPos?:number,resolveHeaderFooter?:Function}} [params] Pagination parameters.
 * @returns {Array} Ordered page break descriptors.
 */
export function calculatePageBreaks(measurementEditor, params = {}) {
  const {
    pageHeightPx = DEFAULT_PAGE_HEIGHT_IN_PX,
    marginsPx = DEFAULT_PAGE_MARGINS_IN_PX,
    startPos = 0,
    resolveHeaderFooter,
  } = params;
  const view = measurementEditor?.view;
  if (!view) return [];

  const docSize = view.state?.doc?.content?.size ?? 0;
  if (!Number.isFinite(docSize) || docSize <= 0) return [];

  const breaks = [];
  let pageIndex = 0;
  let anchorPos = Math.max(0, startPos);

  while (anchorPos < docSize) {
    const baseMargins = {
      top: marginsPx?.top ?? DEFAULT_PAGE_MARGINS_IN_PX.top,
      bottom: marginsPx?.bottom ?? DEFAULT_PAGE_MARGINS_IN_PX.bottom,
      left: marginsPx?.left ?? DEFAULT_PAGE_MARGINS_IN_PX.left,
      right: marginsPx?.right ?? DEFAULT_PAGE_MARGINS_IN_PX.right,
    };

    const headerFooterSections =
      typeof resolveHeaderFooter === 'function' ? resolveHeaderFooter(pageIndex, { isLastPage: false }) : null;

    const headerMetrics = headerFooterSections?.header?.metrics ?? null;
    const footerMetrics = headerFooterSections?.footer?.metrics ?? null;

    const headerEffectiveHeightPx = Number.isFinite(headerMetrics?.effectiveHeightPx)
      ? headerMetrics.effectiveHeightPx
      : 0;
    const footerEffectiveHeightPx = Number.isFinite(footerMetrics?.effectiveHeightPx)
      ? footerMetrics.effectiveHeightPx
      : 0;

    const resolvedMargins = {
      ...baseMargins,
      top: Math.max(baseMargins.top, headerEffectiveHeightPx),
      bottom: Math.max(baseMargins.bottom, footerEffectiveHeightPx),
    };

    const measurement = measureBreakAtPageIndex(view, pageIndex, {
      pageHeightPx: pageHeightPx ?? DEFAULT_PAGE_HEIGHT_IN_PX,
      marginsPx: resolvedMargins,
      startPos: anchorPos,
    });

    if (!measurement) break;

    const initialBreakPos = measurement.break?.pos ?? null;
    if (initialBreakPos == null || initialBreakPos <= anchorPos) break;

    let breakPos = initialBreakPos;

    const anchorCoords = safeCoordsAtPos(view, Math.min(anchorPos, Math.max(0, docSize - 1)));
    const pageTopAbs = Number.isFinite(anchorCoords?.top) ? anchorCoords.top : (measurement?.boundary?.pageTop ?? 0);
    const usableHeight = Number.isFinite(measurement?.boundary?.usableHeightPx)
      ? measurement.boundary.usableHeightPx
      : Number.isFinite(measurement?.boundary?.contentHeightPx)
        ? measurement.boundary.contentHeightPx
        : (measurement?.boundary?.pageBottom ?? 0);
    const pageBottomAbs = pageTopAbs + usableHeight;

    const rowOverflow = findTableRowOverflow(view, {
      startPos: anchorPos,
      boundary: pageBottomAbs,
    });

    if (rowOverflow) {
      measurement.break = rowOverflow.break;
      measurement.rowBreaks = rowOverflow.rowBreaks;
      measurement.overflowBlock = rowOverflow.overflowBlock;
      breakPos = rowOverflow.break.pos;
    }

    if (breakPos >= docSize || !measurement?.overflowBlock?.node?.type) {
      const fallback = findFallbackTableOverflow(view, anchorPos, pageBottomAbs, anchorPos);
      if (fallback?.breakPoint) {
        measurement.break = fallback.breakPoint.primary ?? fallback.breakPoint;
        measurement.rowBreaks = fallback.breakPoint.all ?? null;
        measurement.overflowBlock = fallback.overflowBlock ??
          measurement?.overflowBlock ?? {
            node: fallback.overflowBlock?.node ?? null,
            pos: fallback.overflowBlock?.pos ?? anchorPos,
            rect: fallback.overflowBlock?.rect ?? null,
          };
        const resolved = measurement.break?.pos ?? null;
        if (resolved != null && resolved > anchorPos) {
          breakPos = resolved;
        }
      }
    }

    const docNode = view.state?.doc ?? null;
    if (docNode && measurement.break) {
      const extendedBreakPos = extendBreakPositionWithSectionMarkers(docNode, breakPos);
      if (extendedBreakPos !== breakPos) {
        const coords = safeCoordsAtPos(view, extendedBreakPos);
        measurement.break = {
          ...measurement.break,
          pos: extendedBreakPos,
          bottom: Number.isFinite(coords?.bottom) ? coords.bottom : measurement.break.bottom,
        };
        breakPos = extendedBreakPos;
      }
    }

    const isLastPage = breakPos >= docSize;
    const finalSections =
      typeof resolveHeaderFooter === 'function' ? resolveHeaderFooter(pageIndex, { isLastPage }) : headerFooterSections;

    breaks.push({
      pageIndex,
      from: anchorPos,
      to: breakPos,
      break: measurement.break,
      rowBreaks: measurement.rowBreaks ?? null,
      overflow: {
        pos: measurement.overflowBlock.pos,
        nodeType: measurement.overflowBlock.node?.type?.name ?? null,
      },
      boundary: measurement.boundary,
      sections: finalSections ?? null,
    });

    anchorPos = breakPos;
    pageIndex += 1;
  }

  return breaks;
}

/**
 * Inspect a page region for table rows that overflow the current boundary.
 *
 * @param {import('prosemirror-view').EditorView} view Measurement editor view.
 * @param {{startPos?:number,boundary:number}} options Options describing the scan window.
 * @returns {{break:{pos:number,top:number,bottom:number},rowBreaks:Array<{pos:number,top:number,bottom:number}>|null,overflowBlock:{node:any,pos:number,rect:any}}|null}
 */
export const findTableRowOverflow = (view, { startPos = 0, boundary }) => {
  const doc = view?.state?.doc;
  if (Array.isArray(globalThis.__paginationTableLogs)) {
    globalThis.__paginationTableLogs.push({ stage: 'row-helper-start', startPos, boundary });
  }

  if (!view || !doc || !Number.isFinite(boundary)) {
    if (Array.isArray(globalThis.__paginationTableLogs)) {
      globalThis.__paginationTableLogs.push({ stage: 'row-helper-invalid-boundary', boundary });
    }
    return null;
  }

  const maxDocPos = Math.max(0, doc.content.size - 1);

  let detected = null;

  doc.descendants((node, pos) => {
    if (detected) return false;
    const nodeEnd = pos + node.nodeSize;
    if (nodeEnd <= startPos) return true;

    const isRow =
      node?.type?.name === 'tableRow' || node?.type?.spec?.tableRole === 'row' || node?.type?.name === 'row';
    if (!isRow) return true;

    const rowStart = Math.max(pos, startPos);
    const rowEnd = Math.max(rowStart, nodeEnd - 1);

    const bottomCoords = safeCoordsAtPos(view, Math.min(rowEnd, maxDocPos));
    const topCoords = safeCoordsAtPos(view, Math.min(rowStart, maxDocPos));
    const rowBottom = Number.isFinite(bottomCoords?.bottom) ? bottomCoords.bottom : null;
    const rowTop = Number.isFinite(topCoords?.top) ? topCoords.top : null;

    if (Array.isArray(globalThis.__paginationTableLogs)) {
      globalThis.__paginationTableLogs.push({
        stage: 'row-helper-sample',
        pos,
        rowStart,
        rowEnd,
        rowTop,
        rowBottom,
        boundary,
      });
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

    const finalBreak = refinedEntry ?? breakEntry;

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

    if (Array.isArray(globalThis.__paginationTableLogs)) {
      globalThis.__paginationTableLogs.push({
        stage: 'coords-overflow',
        entry: detected,
      });
    }

    return false;
  });

  if (!detected && Array.isArray(globalThis.__paginationTableLogs)) {
    globalThis.__paginationTableLogs.push({
      stage: 'coords-scan-complete',
      boundary,
    });
  }

  return detected;
};
