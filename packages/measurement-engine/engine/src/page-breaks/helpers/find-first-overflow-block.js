import { DEFAULT_PAGE_HEIGHT_IN_PX, DEFAULT_PAGE_MARGINS_IN_PX, BREAK_TOLERANCE_PX } from '../../core/constants.js';
import {
  computePageWindow,
  getContainerTop,
  getNodeRect,
  clamp,
  safeCoordsAtPos,
  isTableNode,
  findBreakPosInTable,
} from './index.js';
import { isHtmlFieldNode } from '../../core/field-annotations-measurements/index.js';

/**
 * Identify the first block-level node whose geometry crosses the current boundary.
 *
 * @param {import('prosemirror-view').EditorView} view Measurement editor view.
 * @param {Object} options Search options.
 * @param {ReturnType<typeof computePageWindow>} [options.pageWindow] Pre-computed page window values.
 * @param {number} [options.pageHeightPx] Page height in pixels.
 * @param {number} [options.topMarginPx] Top margin in pixels.
 * @param {number} [options.bottomMarginPx] Bottom margin in pixels.
 * @param {number} [options.boundaryY] Explicit page boundary in pixels.
 * @param {number} [options.overflowAllowancePx] Extra allowance above the boundary.
 * @param {number} [options.startPos=0] Document position where the scan should begin.
 * @returns {{node:import('prosemirror-model').Node,pos:number,rect:DOMRect|null,containerTop:number,pageBottomY:number,pageBottomLimitY:number}|null}
 */
export function findFirstOverflowBlock(
  view,
  {
    pageWindow,
    pageHeightPx = DEFAULT_PAGE_HEIGHT_IN_PX,
    topMarginPx = DEFAULT_PAGE_MARGINS_IN_PX.top,
    bottomMarginPx = DEFAULT_PAGE_MARGINS_IN_PX.bottom,
    boundaryY,
    overflowAllowancePx,
    startPos = 0,
  } = {},
) {
  const doc = view?.state?.doc;
  if (!view || !doc) return null;

  const resolvedWindow = pageWindow ?? computePageWindow({ pageHeightPx, topMarginPx, bottomMarginPx });
  const containerTop = getContainerTop(view);
  const baselineTop = containerTop + resolvedWindow.safeTopMargin;
  const contentSpanPx =
    resolvedWindow.contentHeightPx > 0 ? resolvedWindow.contentHeightPx : resolvedWindow.printableHeightPx;
  const fallbackPageBottom = baselineTop + contentSpanPx;
  const baseBoundary = Number.isFinite(boundaryY) ? Math.max(containerTop, boundaryY) : fallbackPageBottom;
  const allowanceForOverflow =
    Number.isFinite(overflowAllowancePx) && overflowAllowancePx >= 0 ? overflowAllowancePx : resolvedWindow.allowancePx;
  const safeAllowancePx = Math.min(allowanceForOverflow, contentSpanPx);
  const effectiveBoundary = baseBoundary + Math.max(0, safeAllowancePx);
  const docSize = doc.content.size;

  let found = null;
  doc.descendants((node, pos) => {
    if (found) return false;
    const htmlField = isHtmlFieldNode(node);
    const treatAsBlock = node?.isBlock || isTableNode(node) || htmlField;
    if (!treatAsBlock) return true;

    const nodeEnd = pos + node.nodeSize;
    if (nodeEnd <= startPos) return true;

    if (isTableNode(node)) {
      const tableBreak = findBreakPosInTable(view, pos, node, baseBoundary, startPos);
      if (tableBreak?.primary) {
        const rect = getNodeRect(view, pos, node) ?? {
          top: baseBoundary,
          bottom: tableBreak.primary.bottom ?? baseBoundary,
        };
        found = {
          node,
          pos,
          rect,
          containerTop,
          pageBottomY: effectiveBoundary,
          pageBottomLimitY: baseBoundary,
        };
        return false;
      }
    }

    const rect = getNodeRect(view, pos, node);
    const topCoords = safeCoordsAtPos(view, clamp(pos, 0, Math.max(0, docSize - 1)));
    const bottomCoords = safeCoordsAtPos(view, clamp(nodeEnd - 1, 0, Math.max(0, docSize - 1)));

    const interiorStart = pos + 1;
    const interiorEnd = Math.max(interiorStart, nodeEnd - 1);
    const docClampMax = Math.max(interiorStart, Math.max(0, docSize - 1));
    const samplePos = clamp(interiorEnd, interiorStart, docClampMax);
    const interiorCoords = safeCoordsAtPos(view, samplePos);

    const tableBounds = isTableNode(node) ? computeTableBounds(view, pos, node, docSize) : null;

    const topCandidates = [rect?.top, topCoords?.top, tableBounds?.top].filter((value) => Number.isFinite(value));
    const bottomCandidates = [rect?.bottom, bottomCoords?.bottom, interiorCoords?.bottom, tableBounds?.bottom].filter(
      (value) => Number.isFinite(value),
    );

    if (!bottomCandidates.length) return true;

    const effectiveTop = topCandidates.length ? Math.min(...topCandidates) : null;
    let effectiveBottom = Math.max(...bottomCandidates);

    if (htmlField && Number.isFinite(effectiveBottom)) {
      effectiveBottom = Math.min(effectiveBottom, effectiveBoundary);
    }

    if (effectiveBottom <= effectiveBoundary + BREAK_TOLERANCE_PX) {
      return true;
    }

    const resolvedBottom =
      htmlField && Number.isFinite(effectiveBottom) ? Math.min(effectiveBottom, effectiveBoundary) : effectiveBottom;

    const resolvedRect = {
      top: Number.isFinite(effectiveTop) ? effectiveTop : Number.isFinite(rect?.top) ? rect.top : effectiveBoundary,
      bottom: resolvedBottom,
      left: Number.isFinite(rect?.left) ? rect.left : 0,
      right: Number.isFinite(rect?.right) ? rect.right : 0,
      width: Number.isFinite(rect?.width) ? rect.width : 0,
      height:
        Number.isFinite(rect?.height) && rect.height > 0 && !htmlField
          ? rect.height
          : Number.isFinite(effectiveTop)
            ? Math.max(0, resolvedBottom - effectiveTop)
            : 0,
    };

    found = {
      node,
      pos,
      rect: resolvedRect,
      containerTop,
      pageBottomY: effectiveBoundary,
      pageBottomLimitY: baseBoundary,
    };
    return false;
  });

  return found;
}

/**
 * Compute aggregate bounds for a table by sampling each row.
 *
 * @param {import('prosemirror-view').EditorView} view Measurement editor view.
 * @param {number} tablePos Document position where the table starts.
 * @param {import('prosemirror-model').Node|null} tableNode Table node.
 * @param {number} docSize Document size in positions.
 * @returns {{top:number|null,bottom:number|null}} Aggregated table bounds.
 */
function computeTableBounds(view, tablePos, tableNode, docSize) {
  if (!tableNode || typeof tableNode.childCount !== 'number') {
    return { top: null, bottom: null };
  }

  let offset = 0;
  let top = null;
  let bottom = null;
  const maxDocPos = Math.max(0, docSize - 1);

  for (let i = 0; i < tableNode.childCount; i++) {
    const row = tableNode.child(i);
    const rowStart = tablePos + 1 + offset;
    const rowEnd = rowStart + row.nodeSize - 1;
    offset += row.nodeSize;

    const rowDom = view?.nodeDOM?.(rowStart);
    const rowRect =
      rowDom && typeof rowDom.getBoundingClientRect === 'function' ? rowDom.getBoundingClientRect() : null;

    const rowTopCoords = safeCoordsAtPos(view, clamp(rowStart, 0, maxDocPos));
    const rowBottomCoords = safeCoordsAtPos(view, clamp(rowEnd, 0, maxDocPos));
    const candidateTop = Number.isFinite(rowRect?.top) ? rowRect.top : rowTopCoords?.top;
    const candidateBottom = Number.isFinite(rowRect?.bottom) ? rowRect.bottom : rowBottomCoords?.bottom;
    if (Number.isFinite(candidateTop)) {
      top = top == null ? candidateTop : Math.min(top, candidateTop);
    }
    if (Number.isFinite(candidateBottom)) {
      bottom = bottom == null ? candidateBottom : Math.max(bottom, candidateBottom);
    }
  }

  return { top, bottom };
}
