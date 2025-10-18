import {
  PIXELS_PER_INCH,
  DEFAULT_PAGE_HEIGHT_IN_PX,
  DEFAULT_PAGE_WIDTH_IN_PX,
  DEFAULT_PAGE_MARGINS_IN_PX,
  DEFAULT_PAGE_BREAK_GAP_PX,
} from '../constants.js';
import { computeHtmlFieldSegments } from '../field-annotations-measurements/index.js';
import {
  findBreakPosInBlock,
  findBreakPosInTable,
  findBreakPosInTableRow,
  isTableNode,
  isTableRowNode,
  safeCoordsAtPos,
  extendBreakPositionWithSectionMarkers,
} from '../../page-breaks/helpers/index.js';

/**
 * Compute the next vertical offset for stacking page previews in the measurement viewport.
 * @param {number} currentTop - Current visual top value in pixels.
 * @param {number} pageHeightPx - Height of the page in pixels.
 * @param {number} gapPx - Gap to apply between pages in pixels.
 * @returns {number} Next visual offset in pixels.
 */
const computeNextVisualTop = (currentTop, pageHeightPx, gapPx) => {
  const safeTop = Number.isFinite(currentTop) ? currentTop : 0;
  const safeHeight = Number.isFinite(pageHeightPx) ? pageHeightPx : 0;
  const safeGap = Number.isFinite(gapPx) ? gapPx : 0;
  return safeTop + safeHeight + safeGap;
};

/**
 * Generate pagination metadata for the provided measurement editor.
 * @param {import('@core/Editor.js').Editor} measurementEditor - Active measurement editor instance.
 * @param {Object} [params={}] - Pagination configuration.
 * @param {number} [params.pageHeightPx] - Target page height in pixels.
 * @param {number|null} [params.pageWidthPx] - Target page width in pixels.
 * @param {Object} [params.marginsPx] - Page margins in pixels.
 * @param {Function} [params.resolveHeaderFooter] - Resolver for header/footer measurements per page.
 * @returns {{document:Object, units:{unit:string,dpi:number}, pages:Array, fieldSegments?:Array}} Pagination package.
 */
export const generatePageBreaks = (measurementEditor, params = {}) => {
  const { view } = measurementEditor ?? {};
  const { dom } = view ?? {};
  const documentSnapshot = snapshotMeasurementDocument(measurementEditor);
  const docNode = view?.state?.doc ?? null;
  const docContentSize = Number.isFinite(docNode?.content?.size) ? docNode.content.size : null;
  const units = {
    unit: 'px',
    dpi: PIXELS_PER_INCH,
  };

  if (!dom) {
    return {
      document: documentSnapshot,
      units,
      pages: [],
    };
  }

  const {
    pageHeightPx = DEFAULT_PAGE_HEIGHT_IN_PX,
    pageWidthPx: explicitPageWidthPx,
    marginsPx = DEFAULT_PAGE_MARGINS_IN_PX,
    resolveHeaderFooter,
  } = params;

  const baseMarginsPx = {
    top: Number.isFinite(marginsPx?.top) ? marginsPx.top : DEFAULT_PAGE_MARGINS_IN_PX.top,
    bottom: Number.isFinite(marginsPx?.bottom) ? marginsPx.bottom : DEFAULT_PAGE_MARGINS_IN_PX.bottom,
    left: Number.isFinite(marginsPx?.left) ? marginsPx.left : DEFAULT_PAGE_MARGINS_IN_PX.left,
    right: Number.isFinite(marginsPx?.right) ? marginsPx.right : DEFAULT_PAGE_MARGINS_IN_PX.right,
  };

  const containerRect =
    typeof dom.getBoundingClientRect === 'function' ? dom.getBoundingClientRect() : createFallbackRect(dom);

  const pageWidthPx = resolvePageWidthPx({
    explicitWidthPx: explicitPageWidthPx,
    containerRect,
    dom,
  });

  const contentWidthPx = resolveContentWidthPx({
    pageWidthPx,
    baseMarginsPx,
    containerRect,
  });

  const resolveLayout = (pageIndex, options) =>
    normalizeLayout({
      layout: resolvePageLayoutForIndex({
        pageIndex,
        options,
        resolveHeaderFooter,
        baseMarginsPx,
        pageHeightPx,
      }),
      baseMarginsPx,
      pageHeightPx,
    });

  const initialLayout = resolveLayout(0, { isLastPage: false });
  const pagination = {
    pages: [],
    pageStart: 0,
    pageIndex: 0,
    blockIndex: 0,
    lastBreakPos: 0,
    pageLayout: initialLayout,
    baseMarginsPx,
    pageHeightPx,
    pageWidthPx,
    contentWidthPx,
    pageGapPx: DEFAULT_PAGE_BREAK_GAP_PX,
    visualStackTop: 0,
    currentFittedBottomPx: null,
    docEndPos: docContentSize,
  };

  const firstPageEntry = createPageEntry({
    pagination,
    pageIndex: 0,
    layout: initialLayout,
    pageStartPx: pagination.pageStart,
    breakPos: -1,
    breakTop: null,
    visualTopPx: pagination.visualStackTop,
  });
  if (firstPageEntry) {
    pagination.pages.push(firstPageEntry);
    pagination.visualStackTop = computeNextVisualTop(
      firstPageEntry.pageTopOffsetPx,
      firstPageEntry.metrics?.pageHeightPx,
      firstPageEntry.pageGapPx,
    );
  }

  const hasUsableHeight = Number.isFinite(initialLayout?.usableHeightPx) && initialLayout.usableHeightPx > 0;
  if (hasUsableHeight) {
    const blocks = Array.from(dom.children || []);
    while (pagination.blockIndex < blocks.length) {
      const block = blocks[pagination.blockIndex];
      if (!block) {
        pagination.blockIndex += 1;
        continue;
      }

      const layout = pagination.pageLayout;
      if (!layout || !Number.isFinite(layout.usableHeightPx) || layout.usableHeightPx <= 0) {
        break;
      }

      const blockRect = block.getBoundingClientRect();
      const blockTop = blockRect.top - containerRect.top;
      const blockBottom = blockRect.bottom - containerRect.top;
      const pageLimit = pagination.pageStart + layout.usableHeightPx;

      if (block.tagName === 'TABLE') {
        let blockPos = null;
        try {
          blockPos = view.posAtDOM(block, 0);
        } catch {}

        if (Number.isFinite(blockPos)) {
          const absoluteBoundary = containerRect.top + pageLimit;
          const rowOverflow = findTableRowOverflow(view, {
            startPos: Math.max(blockPos + 1, (pagination.lastBreakPos ?? blockPos) + 1),
            boundary: absoluteBoundary,
          });

          if (rowOverflow) {
            const relativeBottom = rowOverflow.break.bottom - containerRect.top;
            const fittedBottom = Math.min(Math.max(relativeBottom, pagination.pageStart), pageLimit);
            const fittedTop = Math.min(
              Math.max(rowOverflow.break.top - containerRect.top, pagination.pageStart),
              fittedBottom,
            );
            recordBreak({
              pagination,
              breakTop: fittedBottom,
              breakBottom: fittedBottom,
              lastFitTop: fittedTop,
              breakPos: rowOverflow.break.pos,
              resolveLayout,
            });
            pagination.currentFittedBottomPx = null;
            continue;
          }
        }
      }
      if (blockBottom <= pagination.pageStart) {
        pagination.blockIndex += 1;
        continue;
      }

      const forcedBreak = checkForHardBreak(view, block, containerRect, pagination.pageStart, pageLimit);
      if (forcedBreak) {
        const forcedBottom = Number.isFinite(forcedBreak.bottom) ? forcedBreak.bottom : forcedBreak.top;
        if (Number.isFinite(forcedBottom)) {
          pagination.currentFittedBottomPx = forcedBottom;
        }
        recordBreak({
          pagination,
          breakTop: forcedBottom,
          breakBottom: forcedBottom,
          lastFitTop: Number.isFinite(forcedBreak.top) ? forcedBreak.top : forcedBottom,
          breakPos: forcedBreak.pos,
          resolveLayout,
        });
        pagination.currentFittedBottomPx = null;
      } else if (blockBottom > pageLimit) {
        const exactBreak = getExactBreakPosition({
          view,
          block,
          containerRect,
          pageLimit,
          pagination,
        });

        const fallbackBottom = blockTop > pagination.pageStart ? Math.min(blockTop, pageLimit) : pageLimit;
        const breakBottom = Number.isFinite(exactBreak?.fittedBottom) ? exactBreak.fittedBottom : fallbackBottom;
        const fittedTop = Number.isFinite(exactBreak?.fittedTop) ? exactBreak.fittedTop : breakBottom;
        const breakPos = Number.isFinite(exactBreak?.pos) ? exactBreak.pos : null;
        pagination.currentFittedBottomPx = breakBottom;
        recordBreak({
          pagination,
          breakTop: breakBottom,
          breakBottom,
          lastFitTop: fittedTop,
          breakPos,
          resolveLayout,
        });
        pagination.currentFittedBottomPx = null;
      } else {
        const fittedBottom = Math.min(blockBottom, pageLimit);
        if (Number.isFinite(fittedBottom)) {
          const current = Number.isFinite(pagination.currentFittedBottomPx)
            ? pagination.currentFittedBottomPx
            : pagination.pageStart;
          pagination.currentFittedBottomPx = Math.max(current, fittedBottom);
        }
      }

      pagination.blockIndex += 1;
    }
  }

  const trailingPage = pagination.pages[pagination.pages.length - 1] ?? null;
  if (trailingPage && Number.isFinite(pagination.currentFittedBottomPx)) {
    const fittedBottom = pagination.currentFittedBottomPx;
    trailingPage.break = {
      ...(trailingPage.break ?? {}),
      fittedBottom,
      bottom: Number.isFinite(trailingPage.break?.bottom) ? trailingPage.break.bottom : fittedBottom,
      top: Number.isFinite(trailingPage.break?.top) ? trailingPage.break.top : fittedBottom,
    };
    if (!Number.isFinite(trailingPage.break?.fittedTop)) {
      trailingPage.break.fittedTop = fittedBottom;
    }
  }

  const finalizedPages = finalizePages({
    pagination,
    resolveLayout,
  });

  const layoutPackage = {
    document: documentSnapshot,
    units,
    pages: finalizedPages,
  };

  const fieldSegments = computeHtmlFieldSegments({
    view,
    containerRect,
    pages: finalizedPages,
  });
  if (fieldSegments.length) {
    layoutPackage.fieldSegments = fieldSegments;
  }

  return layoutPackage;
};

/**
 * Determine an exact break position for a DOM block that exceeds the current page boundary.
 * @param {Object} options - Options for calculating the break.
 * @param {import('prosemirror-view').EditorView} options.view - Measurement editor view.
 * @param {HTMLElement} options.block - DOM block under inspection.
 * @param {DOMRect} options.containerRect - Bounding rect of the measurement container.
 * @param {number} options.pageLimit - Current page lower boundary in pixels.
 * @param {Object} options.pagination - Pagination state accumulator.
 * @returns {{fittedTop:number, fittedBottom:number, pos:number}|null} Break metadata or null when unavailable.
 */
const getExactBreakPosition = ({ view, block, containerRect, pageLimit, pagination }) => {
  if (!view || !block) return null;

  let blockPos;
  try {
    blockPos = view.posAtDOM(block, 0);
  } catch {
    blockPos = null;
  }

  const blockRect = typeof block?.getBoundingClientRect === 'function' ? block.getBoundingClientRect() : null;

  const resolveFallback = () => {
    const coords = {
      left: (blockRect?.left ?? containerRect.left) + 1,
      top: containerRect.top + pageLimit - 1,
    };
    try {
      const fallbackPos = view.posAtCoords(coords)?.pos;
      if (Number.isFinite(fallbackPos)) {
        const fallbackCoords = safeCoordsAtPos(view, fallbackPos);
        const rawTop = Number.isFinite(fallbackCoords?.top)
          ? fallbackCoords.top - containerRect.top
          : pagination.pageStart;
        const rawBottom = Number.isFinite(fallbackCoords?.bottom)
          ? fallbackCoords.bottom - containerRect.top
          : Math.max(coords.top - containerRect.top, pagination.pageStart);
        const safeBottom = Math.min(Math.max(rawBottom, pagination.pageStart), pageLimit);
        const safeTop = Math.min(Math.max(rawTop, pagination.pageStart), safeBottom);
        return {
          fittedTop: safeTop,
          fittedBottom: safeBottom,
          pos: fallbackPos,
        };
      }
    } catch {}
    return null;
  };

  if (!Number.isFinite(blockPos)) {
    return resolveFallback();
  }

  const blockNode = view.state.doc.nodeAt(blockPos);
  if (!blockNode) {
    return resolveFallback();
  }

  const absoluteBoundary = containerRect.top + pageLimit;
  const lastBreakBase = Number.isFinite(pagination.lastBreakPos) ? pagination.lastBreakPos + 1 : blockPos + 1;
  let result = null;

  if (isTableNode(blockNode)) {
    const tableBreak = findBreakPosInTable(view, blockPos, blockNode, absoluteBoundary, lastBreakBase);
    if (tableBreak?.primary) {
      result = tableBreak.primary;
      if (Array.isArray(globalThis.__paginationTableLogs)) {
        globalThis.__paginationTableLogs.push({
          stage: 'table-break-detected',
          blockPos,
          breakPos: tableBreak.primary.pos,
        });
      }
    }
  } else if (isTableRowNode(blockNode)) {
    const rowBreak = findBreakPosInTableRow(view, blockPos, blockNode, absoluteBoundary, lastBreakBase);
    if (rowBreak?.primary) {
      result = rowBreak.primary;
      if (Array.isArray(globalThis.__paginationTableLogs)) {
        globalThis.__paginationTableLogs.push({
          stage: 'row-break-detected',
          blockPos,
          breakPos: rowBreak.primary.pos,
        });
      }
    }
  }

  if (!result) {
    result = findBreakPosInBlock(view, blockPos, blockNode, absoluteBoundary, lastBreakBase);
  }
  if (!result) {
    return resolveFallback();
  }

  const HTMLElementRef = typeof HTMLElement === 'undefined' ? null : HTMLElement;
  if (HTMLElementRef) {
    let domNode = null;
    if (typeof view.nodeDOM === 'function') {
      try {
        domNode = view.nodeDOM(result.pos);
      } catch {}
    }
    if (!domNode && typeof view.domAtPos === 'function') {
      try {
        const domResult = view.domAtPos(result.pos);
        domNode = domResult?.node ?? null;
      } catch {}
    }
    if (domNode instanceof HTMLElementRef) {
      const listItemNode = domNode.closest('.sd-editor-list-item-node-view');
      if (listItemNode && typeof listItemNode.getBoundingClientRect === 'function') {
        const rect = listItemNode.getBoundingClientRect();
        if (rect) {
          const adjustedPos = Math.max(blockPos + 1, lastBreakBase);
          let contentCoords = safeCoordsAtPos(view, adjustedPos);
          if (!contentCoords || !Number.isFinite(contentCoords.top)) {
            const elementsUnderPointer =
              typeof document !== 'undefined' && typeof document.elementsFromPoint === 'function'
                ? document.elementsFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
                : [];
            const contentDom =
              elementsUnderPointer.find(
                (el) => el && el.classList && el.classList.contains('sd-editor-list-item-content-dom'),
              ) || listItemNode.querySelector('.sd-editor-list-item-content-dom');
            if (contentDom && typeof view.posAtDOM === 'function') {
              try {
                const contentPos = view.posAtDOM(contentDom, 0);
                const fallbackCoords = safeCoordsAtPos(view, contentPos);
                if (fallbackCoords) {
                  contentCoords = fallbackCoords;
                }
              } catch {}
            }
          }
          result = {
            pos: blockPos,
            top: Number.isFinite(contentCoords?.top) ? contentCoords.top : rect.top,
            bottom: Math.min(Number.isFinite(contentCoords?.bottom) ? contentCoords.bottom : rect.bottom, rect.bottom),
          };
        }
      }
    }
  }

  const relativeTop = Number.isFinite(result.top) ? result.top - containerRect.top : pagination.pageStart;
  const relativeBottom = Number.isFinite(result.bottom) ? result.bottom - containerRect.top : relativeTop;
  const safeBottom = Math.min(Math.max(relativeBottom, pagination.pageStart), pageLimit);
  const safeTop = Math.min(Math.max(relativeTop, pagination.pageStart), safeBottom);

  return {
    fittedTop: safeTop,
    fittedBottom: safeBottom,
    pos: result.pos,
  };
};

/**
 * Locate the first overflowing table row beyond a page boundary.
 * @param {import('prosemirror-view').EditorView} view - Measurement editor view.
 * @param {Object} options - Search configuration.
 * @param {number} [options.startPos=0] - Minimum document position to consider.
 * @param {number} options.boundary - Absolute Y pixel boundary.
 * @returns {Object|null} Overflow descriptor when found, otherwise null.
 */
const findTableRowOverflow = (view, { startPos = 0, boundary }) => {
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

    return false;
  });

  return detected;
};

/**
 * Finalize the current page and open the next entry in the pagination state.
 * @param {Object} options - Break configuration.
 * @param {Object} options.pagination - Mutable pagination accumulator.
 * @param {number|null} options.breakTop - Calculated top value for the break.
 * @param {number|null} [options.breakBottom=null] - Calculated bottom value for the break.
 * @param {number|null} [options.breakPos=null] - Document position representing the break.
 * @param {Function} options.resolveLayout - Layout resolver function.
 * @param {number|null} [options.lastFitTop=null] - Last fitted top used for spacing calculations.
 * @returns {void}
 */
const recordBreak = ({
  pagination,
  breakTop,
  breakBottom = null,
  breakPos = null,
  resolveLayout,
  lastFitTop = null,
}) => {
  const safePageStart = pagination.pageStart;
  const rawBottom = Number.isFinite(breakBottom) ? breakBottom : Number.isFinite(breakTop) ? breakTop : safePageStart;
  let resolvedBreakBottom = Math.max(rawBottom, safePageStart);
  let safeBreakTop = Number.isFinite(lastFitTop) ? Math.min(lastFitTop, resolvedBreakBottom) : resolvedBreakBottom;
  const resolvedPos = Number.isFinite(breakPos) && breakPos >= 0 ? breakPos : (pagination.lastBreakPos ?? 0);
  const currentPage = pagination.pages[pagination.pageIndex];
  const currentLayout = pagination.pageLayout;
  const usableHeightPx = Number.isFinite(currentLayout?.usableHeightPx) ? currentLayout.usableHeightPx : null;
  const contentBottomBoundary = Number.isFinite(usableHeightPx) ? safePageStart + usableHeightPx : null;
  if (Number.isFinite(contentBottomBoundary)) {
    resolvedBreakBottom = Math.min(resolvedBreakBottom, contentBottomBoundary);
    safeBreakTop = Math.min(safeBreakTop, resolvedBreakBottom);
  }

  if (currentPage) {
    currentPage.break = {
      ...currentPage.break,
      startOffsetPx: safePageStart,
      pos: resolvedPos,
    };
    currentPage.break.top = safeBreakTop;
    currentPage.break.bottom = resolvedBreakBottom;
    currentPage.break.fittedTop = safeBreakTop;
    currentPage.break.fittedBottom = resolvedBreakBottom;
    if (Number.isFinite(contentBottomBoundary)) {
      currentPage.pageBottomSpacingPx = Math.max(contentBottomBoundary - safeBreakTop, 0);
    }
  }

  if (Number.isFinite(breakPos)) {
    pagination.lastBreakPos = breakPos;
  }

  pagination.pageStart = resolvedBreakBottom;
  pagination.pageIndex += 1;
  pagination.blockIndex -= 1;

  const nextLayoutCandidate =
    typeof resolveLayout === 'function'
      ? resolveLayout(pagination.pageIndex, { isLastPage: false })
      : normalizeLayout({
          layout: null,
          baseMarginsPx: pagination.baseMarginsPx,
          pageHeightPx: pagination.pageHeightPx,
        });

  pagination.pageLayout = nextLayoutCandidate;

  const nextPageEntry = createPageEntry({
    pagination,
    pageIndex: pagination.pageIndex,
    layout: nextLayoutCandidate,
    pageStartPx: pagination.pageStart,
    breakPos: -1,
    breakTop: null,
    visualTopPx: pagination.visualStackTop,
  });

  if (nextPageEntry) {
    pagination.pages.push(nextPageEntry);
    pagination.visualStackTop = computeNextVisualTop(
      nextPageEntry.pageTopOffsetPx,
      nextPageEntry.metrics?.pageHeightPx,
      nextPageEntry.pageGapPx,
    );
  }
  pagination.currentFittedBottomPx = null;
};

/**
 * Prepare the finalized list of page entries after pagination completes.
 * @param {Object} options - Finalization configuration.
 * @param {Object} options.pagination - Current pagination accumulator.
 * @param {Function} options.resolveLayout - Layout resolver function.
 * @returns {Array} Array of normalized page entries.
 */
const finalizePages = ({ pagination, resolveLayout }) => {
  const pages = pagination.pages.filter(Boolean);
  if (!pages.length) {
    return pages;
  }

  const lastEntryIndex = pages.length - 1;
  const lastEntry = pages[lastEntryIndex] ?? null;
  const lastPageIndex = Number.isInteger(lastEntry?.pageIndex) ? lastEntry.pageIndex : lastEntryIndex;
  const lastLayoutCandidate =
    typeof resolveLayout === 'function'
      ? resolveLayout(lastPageIndex, { isLastPage: true })
      : normalizeLayout({
          layout: pagination.pageLayout,
          baseMarginsPx: pagination.baseMarginsPx,
          pageHeightPx: pagination.pageHeightPx,
        });

  const lastPageStartPx = getSafeNumber(
    lastEntry?.break?.startOffsetPx,
    lastPageIndex === 0 ? 0 : pagination.pageStart,
  );
  const fallbackDocEndPos = Number.isFinite(pagination.docEndPos) ? pagination.docEndPos : -1;
  const lastBreakPos =
    Number.isFinite(lastEntry?.break?.pos) && lastEntry.break.pos >= 0 ? lastEntry.break.pos : fallbackDocEndPos;
  const lastBreakTop = Number.isFinite(lastEntry?.break?.top) ? lastEntry.break.top : null;
  const lastBreakBottom = Number.isFinite(lastEntry?.break?.bottom) ? lastEntry.break.bottom : lastBreakTop;
  const lastBreakFittedTop = Number.isFinite(lastEntry?.break?.fittedTop) ? lastEntry.break.fittedTop : null;

  const refreshedLastEntry = createPageEntry({
    pagination,
    pageIndex: lastPageIndex,
    layout: lastLayoutCandidate,
    pageStartPx: lastPageStartPx,
    breakPos: lastBreakPos,
    breakTop: lastBreakTop,
    breakBottom: lastBreakBottom,
    breakFittedTop: lastBreakFittedTop,
    visualTopPx: Number.isFinite(lastEntry?.pageTopOffsetPx) ? lastEntry.pageTopOffsetPx : 0,
  });

  pages[lastEntryIndex] = refreshedLastEntry;
  pagination.pages = pages;
  return pages;
};

/**
 * Create a normalized page entry record containing metrics and header/footer regions.
 * @param {Object} options - Creation options.
 * @param {Object} options.pagination - Pagination accumulator.
 * @param {number} options.pageIndex - Index of the page being created.
 * @param {Object|null} options.layout - Layout information for the page.
 * @param {number} options.pageStartPx - Page start offset in pixels.
 * @param {number} options.breakPos - Document position at which the page breaks.
 * @param {number|null} options.breakTop - Break top coordinate.
 * @param {number|null} options.breakBottom - Break bottom coordinate.
 * @param {number|null} options.breakFittedTop - Fitted top coordinate.
 * @param {number|null} options.visualTopPx - Visual stacking offset in pixels.
 * @returns {Object} Page entry with metrics and layout metadata.
 */
const createPageEntry = ({
  pagination,
  pageIndex,
  layout,
  pageStartPx,
  breakPos,
  breakTop,
  breakBottom,
  breakFittedTop,
  visualTopPx,
}) => {
  const normalizedLayout = normalizeLayout({
    layout,
    baseMarginsPx: pagination.baseMarginsPx,
    pageHeightPx: pagination.pageHeightPx,
  });

  const marginTopPx = getSafeNumber(normalizedLayout.margins.top, pagination.baseMarginsPx.top);
  const marginBottomPx = getSafeNumber(normalizedLayout.margins.bottom, pagination.baseMarginsPx.bottom);
  const pageGapPx = Number.isFinite(pagination.pageGapPx) ? pagination.pageGapPx : DEFAULT_PAGE_BREAK_GAP_PX;
  const pageTopOffsetPx = Number.isFinite(visualTopPx) ? visualTopPx : 0;

  const breakInfo = {
    startOffsetPx: getSafeNumber(pageStartPx, 0),
    pos: Number.isFinite(breakPos) ? breakPos : -1,
  };
  if (Number.isFinite(breakTop)) {
    breakInfo.top = breakTop;
  }
  if (Number.isFinite(breakBottom)) {
    breakInfo.bottom = breakBottom;
    breakInfo.fittedBottom = breakBottom;
  }
  if (Number.isFinite(breakFittedTop)) {
    breakInfo.fittedTop = breakFittedTop;
  }

  const contentStartPx = Number.isFinite(breakInfo.startOffsetPx) ? breakInfo.startOffsetPx : null;
  const usableHeightPx = Number.isFinite(normalizedLayout.usableHeightPx) ? normalizedLayout.usableHeightPx : null;
  const contentBottomBoundaryPx =
    Number.isFinite(contentStartPx) && Number.isFinite(usableHeightPx) ? contentStartPx + usableHeightPx : null;
  const fittedBottomPx = Number.isFinite(breakInfo.fittedBottom)
    ? breakInfo.fittedBottom
    : Number.isFinite(breakInfo.top)
      ? breakInfo.top
      : null;
  const resolvedFittedBottomPx =
    Number.isFinite(contentBottomBoundaryPx) && Number.isFinite(fittedBottomPx)
      ? Math.min(fittedBottomPx, contentBottomBoundaryPx)
      : fittedBottomPx;
  if (Number.isFinite(resolvedFittedBottomPx)) {
    breakInfo.fittedBottom = resolvedFittedBottomPx;
    if (Number.isFinite(breakInfo.bottom)) {
      breakInfo.bottom = Math.min(breakInfo.bottom, resolvedFittedBottomPx);
    }
  }
  const bottomCandidatePx = Number.isFinite(breakInfo.fittedBottom)
    ? breakInfo.fittedBottom
    : Number.isFinite(fittedBottomPx)
      ? fittedBottomPx
      : null;
  const pageBottomSpacingPx =
    Number.isFinite(contentBottomBoundaryPx) && Number.isFinite(bottomCandidatePx)
      ? Math.max(contentBottomBoundaryPx - bottomCandidatePx, 0)
      : null;

  const headerFooterAreas = createHeaderFooterAreas({
    sections: normalizedLayout.sections,
    marginTopPx,
    marginBottomPx,
  });

  const headerHeightPx = getSafeNumber(
    headerFooterAreas.header?.heightPx,
    headerFooterAreas.header?.metrics?.effectiveHeightPx,
    marginTopPx,
  );
  const footerHeightPx = getSafeNumber(
    headerFooterAreas.footer?.heightPx,
    headerFooterAreas.footer?.metrics?.effectiveHeightPx,
    marginBottomPx,
  );

  const page = {
    pageIndex,
    break: breakInfo,
    metrics: {
      pageHeightPx: getSafeNumber(pagination.pageHeightPx, DEFAULT_PAGE_HEIGHT_IN_PX),
      pageWidthPx: getSafeNumber(pagination.pageWidthPx, DEFAULT_PAGE_WIDTH_IN_PX),
      marginTopPx,
      marginBottomPx,
      marginLeftPx: getSafeNumber(pagination.baseMarginsPx.left, DEFAULT_PAGE_MARGINS_IN_PX.left),
      marginRightPx: getSafeNumber(pagination.baseMarginsPx.right, DEFAULT_PAGE_MARGINS_IN_PX.right),
      contentHeightPx: getSafeNumber(normalizedLayout.usableHeightPx, 0),
      contentWidthPx: getSafeNumber(pagination.contentWidthPx, 0),
      headerHeightPx,
      footerHeightPx,
      pageGapPx,
    },
    pageTopOffsetPx,
    pageGapPx,
    pageBottomSpacingPx,
    headerFooterAreas,
  };

  return page;
};

/**
 * Normalize layout data by resolving margins and usable height with sensible defaults.
 * @param {Object} options - Normalization options.
 * @param {Object|null} options.layout - Raw layout descriptor.
 * @param {Object} options.baseMarginsPx - Base margin values in pixels.
 * @param {number} options.pageHeightPx - Page height in pixels.
 * @returns {{sections:Object|null, margins:{top:number,bottom:number}, usableHeightPx:number}} Normalized layout object.
 */
const normalizeLayout = ({ layout, baseMarginsPx, pageHeightPx }) => {
  const marginTopPx = getSafeNumber(layout?.margins?.top, baseMarginsPx.top);
  const marginBottomPx = getSafeNumber(layout?.margins?.bottom, baseMarginsPx.bottom);
  const effectivePageHeight = getSafeNumber(pageHeightPx, DEFAULT_PAGE_HEIGHT_IN_PX);
  const usableHeightPx = Number.isFinite(layout?.usableHeightPx)
    ? layout.usableHeightPx
    : Math.max(effectivePageHeight - marginTopPx - marginBottomPx, 0);

  return {
    sections: layout?.sections ?? null,
    margins: {
      top: marginTopPx,
      bottom: marginBottomPx,
    },
    usableHeightPx,
  };
};

/**
 * Build header and footer area descriptors for a page.
 * @param {Object} options - Options describing sections and margins.
 * @param {Object|null} options.sections - Header/footer section summary.
 * @param {number} [options.marginTopPx=0] - Top margin in pixels.
 * @param {number} [options.marginBottomPx=0] - Bottom margin in pixels.
 * @returns {{header:Object, footer:Object}} Header/footer area metadata.
 */
const createHeaderFooterAreas = ({ sections, marginTopPx = 0, marginBottomPx = 0 }) => ({
  header: formatHeaderFooterArea(sections?.header ?? null, marginTopPx, 'header'),
  footer: formatHeaderFooterArea(sections?.footer ?? null, marginBottomPx, 'footer'),
});

/**
 * Format a header or footer section into a normalized area descriptor.
 * @param {Object|null} section - Section summary data.
 * @param {number} fallbackMarginPx - Margin fallback in pixels.
 * @param {'header'|'footer'} role - Section role.
 * @returns {{heightPx:number, metrics:{offsetPx:number,contentHeightPx:number,effectiveHeightPx:number}, id?:string, kind?:string, role?:string}} Area information.
 */
const formatHeaderFooterArea = (section, fallbackMarginPx, role) => {
  const metrics = section?.metrics ?? null;
  const offsetPx = getSafeNumber(metrics?.distancePx, fallbackMarginPx);
  const contentHeightPx = getSafeNumber(metrics?.contentHeightPx, 0);
  const effectiveHeightPx = getSafeNumber(
    metrics?.effectiveHeightPx,
    section?.heightPx,
    contentHeightPx + offsetPx,
    fallbackMarginPx,
  );
  const heightPx = getSafeNumber(section?.heightPx, effectiveHeightPx, fallbackMarginPx);

  const area = {
    heightPx,
    metrics: {
      offsetPx,
      contentHeightPx,
      effectiveHeightPx,
    },
  };

  if (section?.id) {
    area.id = section.id;
  }
  if (section?.kind) {
    area.kind = section.kind;
  }
  if (role) {
    area.role = role;
  }

  return area;
};

/**
 * Snapshot the measurement editor document into JSON, when possible.
 * @param {import('@core/Editor.js').Editor} measurementEditor - Measurement editor instance.
 * @returns {Object} JSON representation (or empty object when unavailable).
 */
const snapshotMeasurementDocument = (measurementEditor) => {
  const candidates = [measurementEditor?.state?.doc, measurementEditor?.view?.state?.doc];
  const doc = candidates.find((candidate) => candidate && typeof candidate.toJSON === 'function') ?? null;
  if (!doc) {
    return {};
  }

  try {
    return doc.toJSON();
  } catch {
    return {};
  }
};

/**
 * Create a fallback rectangle when DOM measurements are unavailable.
 * @param {HTMLElement|Object|null} element - Element providing offset information.
 * @returns {{top:number,bottom:number,left:number,right:number,width:number,height:number}} Synthetic rectangle.
 */
const createFallbackRect = (element) => {
  if (!element) {
    return {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      width: 0,
      height: 0,
    };
  }

  const top = Number.isFinite(element.offsetTop) ? element.offsetTop : 0;
  const left = Number.isFinite(element.offsetLeft) ? element.offsetLeft : 0;
  const width = Number.isFinite(element.offsetWidth) ? element.offsetWidth : 0;
  const height = Number.isFinite(element.offsetHeight) ? element.offsetHeight : 0;

  return {
    top,
    bottom: top + height,
    left,
    right: left + width,
    width,
    height,
  };
};

/**
 * Resolve page width in pixels using explicit configuration or DOM measurements.
 * @param {Object} options - Resolution options.
 * @param {number|null} options.explicitWidthPx - Explicit width override.
 * @param {DOMRect|Object} options.containerRect - Measurement container rect.
 * @param {HTMLElement|Object} options.dom - Root DOM element.
 * @returns {number} Page width in pixels.
 */
const resolvePageWidthPx = ({ explicitWidthPx, containerRect, dom }) => {
  if (Number.isFinite(explicitWidthPx) && explicitWidthPx > 0) {
    return explicitWidthPx;
  }

  const candidates = [containerRect?.width, dom?.offsetWidth, dom?.scrollWidth, dom?.clientWidth];

  for (const candidate of candidates) {
    if (Number.isFinite(candidate) && candidate > 0) {
      return candidate;
    }
  }

  return DEFAULT_PAGE_WIDTH_IN_PX;
};

/**
 * Resolve content width in pixels after subtracting margins.
 * @param {Object} options - Resolution options.
 * @param {number} options.pageWidthPx - Page width in pixels.
 * @param {Object} options.baseMarginsPx - Margins in pixels.
 * @param {DOMRect|Object} options.containerRect - Container rectangle.
 * @returns {number} Content width in pixels (never negative).
 */
const resolveContentWidthPx = ({ pageWidthPx, baseMarginsPx, containerRect }) => {
  const widthSource =
    Number.isFinite(pageWidthPx) && pageWidthPx > 0
      ? pageWidthPx
      : Number.isFinite(containerRect?.width) && containerRect.width > 0
        ? containerRect.width
        : DEFAULT_PAGE_WIDTH_IN_PX;

  const marginLeft = getSafeNumber(baseMarginsPx?.left, DEFAULT_PAGE_MARGINS_IN_PX.left);
  const marginRight = getSafeNumber(baseMarginsPx?.right, DEFAULT_PAGE_MARGINS_IN_PX.right);
  const contentWidth = widthSource - marginLeft - marginRight;
  return contentWidth > 0 ? contentWidth : 0;
};

/**
 * Return the first finite numeric value from a list.
 * @param {...number} values - Candidate numeric values.
 * @returns {number} First finite value or 0.
 */
const getSafeNumber = (...values) => {
  for (const value of values) {
    if (Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
};

/**
 * Resolve header/footer layout data for a given page index.
 * @param {Object} options - Resolution options.
 * @param {number} options.pageIndex - Target page index.
 * @param {Object} options.options - Additional resolution flags.
 * @param {Function} options.resolveHeaderFooter - Resolver for header/footer measurements.
 * @param {Object} options.baseMarginsPx - Base margin values.
 * @param {number} options.pageHeightPx - Page height in pixels.
 * @returns {{sections:Object|null, margins:{top:number,bottom:number}, usableHeightPx:number}} Layout summary.
 */
const resolvePageLayoutForIndex = ({ pageIndex, options, resolveHeaderFooter, baseMarginsPx, pageHeightPx }) => {
  const { isLastPage = false } = options ?? {};
  const sections = typeof resolveHeaderFooter === 'function' ? resolveHeaderFooter(pageIndex, { isLastPage }) : null;

  const headerEffectiveHeightPx = Number.isFinite(sections?.header?.metrics?.effectiveHeightPx)
    ? sections.header.metrics.effectiveHeightPx
    : 0;
  const footerEffectiveHeightPx = Number.isFinite(sections?.footer?.metrics?.effectiveHeightPx)
    ? sections.footer.metrics.effectiveHeightPx
    : 0;

  const resolvedTopMarginPx = Math.max(baseMarginsPx.top, headerEffectiveHeightPx);
  const resolvedBottomMarginPx = Math.max(baseMarginsPx.bottom, footerEffectiveHeightPx);
  const usableHeightPx = Math.max(pageHeightPx - resolvedTopMarginPx - resolvedBottomMarginPx, 0);

  return {
    sections,
    margins: {
      top: resolvedTopMarginPx,
      bottom: resolvedBottomMarginPx,
    },
    usableHeightPx,
  };
};

/**
 * Detect explicit hard break markers within a DOM element.
 * @param {import('prosemirror-view').EditorView} view - Measurement editor view.
 * @param {HTMLElement} element - Host element being examined.
 * @param {DOMRect} containerRect - Container bounding rectangle.
 * @param {number} lowerBound - Lower page boundary in pixels.
 * @param {number} upperBound - Upper page boundary in pixels.
 * @returns {{top:number,bottom:number,pos:number}|null} Break metadata or null if none found.
 */
const checkForHardBreak = (view, element, containerRect, lowerBound, upperBound) => {
  if (!element || !view) return null;

  let nextBreak = null;

  const recordCandidate = (node, fallbackElement) => {
    if (!node || typeof node.getBoundingClientRect !== 'function') return;
    const rect = node.getBoundingClientRect();
    if (!rect) return;

    const relativeTop = rect.top - containerRect.top;
    const relativeBottom = rect.bottom - containerRect.top;
    if (!Number.isFinite(relativeTop) || relativeTop <= lowerBound || relativeTop > upperBound) {
      return;
    }

    let pos = null;
    try {
      pos = view.posAtDOM(node, 0);
    } catch {}

    if (Number.isFinite(pos)) {
      const docNode = view.state?.doc ?? null;
      if (docNode) {
        const extendedPos = extendBreakPositionWithSectionMarkers(docNode, pos);
        if (extendedPos !== pos) {
          pos = extendedPos;
        }
      }
    }

    let resolvedBottom = Number.isFinite(relativeBottom) && relativeBottom > relativeTop ? relativeBottom : null;
    if (!resolvedBottom && fallbackElement && typeof fallbackElement.getBoundingClientRect === 'function') {
      const fallbackRect = fallbackElement.getBoundingClientRect();
      if (fallbackRect) {
        const fallbackBottom = fallbackRect.bottom - containerRect.top;
        if (Number.isFinite(fallbackBottom) && fallbackBottom > relativeTop) {
          resolvedBottom = fallbackBottom;
        }
      }
    }
    if (!resolvedBottom) {
      resolvedBottom = relativeTop;
    }

    if (!nextBreak || relativeTop < nextBreak.top) {
      nextBreak = {
        top: relativeTop,
        bottom: resolvedBottom,
        pos,
      };
    }
  };

  const considerDescendantSpans = (hostElement) => {
    const spans = hostElement.getElementsByTagName('span');
    for (let i = 0, len = spans.length; i < len; i += 1) {
      const span = spans[i];
      if (span.getAttribute('linebreaktype') !== 'page') continue;
      recordCandidate(span, hostElement);
    }
  };

  if (element instanceof HTMLElement && element.getAttribute('linebreaktype') === 'page') {
    const fallbackElement =
      element.previousElementSibling instanceof HTMLElement ? element.previousElementSibling : null;
    recordCandidate(element, fallbackElement);
    return nextBreak;
  }

  considerDescendantSpans(element);
  return nextBreak;
};

export const ENGINE_PAGINATION_INTERNALS = {
  computeNextVisualTop,
  getExactBreakPosition,
  findTableRowOverflow,
  recordBreak,
  finalizePages,
  createPageEntry,
  normalizeLayout,
  createHeaderFooterAreas,
  formatHeaderFooterArea,
  snapshotMeasurementDocument,
  createFallbackRect,
  resolvePageWidthPx,
  resolveContentWidthPx,
  getSafeNumber,
  resolvePageLayoutForIndex,
  checkForHardBreak,
};
