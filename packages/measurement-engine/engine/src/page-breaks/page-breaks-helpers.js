import {
  normalizeVerticalBounds,
  isTableNode,
  findBreakPosInTable,
  isTableRowNode,
  findBreakPosInTableRow,
  findBreakPosInBlock,
} from './helpers/index.js';
import { isHtmlFieldNode } from '../core/field-annotations-measurements/index.js';

/**
 * Normalize a break point to a raw document position.
 *
 * @param {{pos?:number,primary?:{pos:number}}|null} point Break structure emitted by pagination helpers.
 * @returns {number|null} Document position or null when unavailable.
 */
export function resolveBreakPos(point) {
  if (!point) return null;
  if (typeof point.pos === 'number') return point.pos;
  if ('primary' in point && point.primary && typeof point.primary.pos === 'number') {
    return point.primary.pos;
  }
  return null;
}

/**
 * Clamp overflow bounds so they remain within the current page limit.
 *
 * @param {{pageBottomLimitY?:number,pageBottomY?:number}} overflow Overflow metadata.
 * @param {number} pageBottomLimit Page bottom in pixels.
 * @returns {{top:number,bottom:number}} Safe vertical bounds.
 */
export function getSafeBounds(overflow, pageBottomLimit) {
  const rawTop = Number.isFinite(overflow.pageBottomLimitY) ? overflow.pageBottomLimitY : pageBottomLimit;
  const rawBottom = Number.isFinite(overflow.pageBottomY) ? overflow.pageBottomY : pageBottomLimit;

  const top = Number.isFinite(rawTop) ? rawTop : pageBottomLimit;
  const bottom = Number.isFinite(rawBottom) ? Math.max(top, rawBottom) : top;

  return { top, bottom };
}

/**
 * Build a break definition for an overflowing HTML field node.
 *
 * @param {{pageBottomLimitY?:number,pageBottomY?:number,rect?:DOMRect|null}} overflow Overflow metadata.
 * @param {number} pos Document position where the node begins.
 * @param {{nodeSize:number}} node HTML field node.
 * @param {number} pageBottomLimit Page bottom in pixels.
 * @param {number} startPos Pagination start position.
 * @param {number} docSize Document size in positions.
 * @returns {{breakPoint:{pos:number,top:number,bottom:number},overflowBlock:{node:any,pos:number,rect:Object}}|null} Break data when an overflow occurs.
 */
export function createHtmlFieldBreakPoint(overflow, pos, node, pageBottomLimit, startPos, docSize) {
  const breakPos = Math.min(docSize, pos + node.nodeSize);
  if (breakPos <= startPos) return null;

  const { top: safeTop, bottom: safeBottom } = getSafeBounds(overflow, pageBottomLimit);
  const { rect } = overflow;

  return {
    breakPoint: {
      pos: breakPos,
      top: safeTop,
      bottom: safeBottom,
    },
    overflowBlock: {
      node,
      pos,
      rect: rect
        ? {
            ...rect,
            bottom: Math.min(rect.bottom ?? safeBottom, safeBottom),
            height: Math.max(0, Math.min(rect.bottom ?? safeBottom, safeBottom) - (rect.top ?? safeTop)),
          }
        : {
            top: safeTop,
            bottom: safeBottom,
            left: 0,
            right: 0,
            width: 0,
            height: Math.max(0, safeBottom - safeTop),
          },
    },
  };
}

/**
 * Derive an appropriate break point from an overflow block.
 *
 * @param {import('prosemirror-view').EditorView} view Measurement editor view.
 * @param {{node:import('prosemirror-model').Node,pos:number,rect:DOMRect|null}|null} overflow Overflow metadata to evaluate.
 * @param {number} pageBottomLimit Page bottom in pixels.
 * @param {number} startPos Pagination start position.
 * @param {number} docSize Document size in positions.
 * @returns {{breakPoint:{pos:number,top?:number,bottom?:number}|null,overflowBlock:{node:any,pos:number,rect:DOMRect|null}|null}} Calculated break information.
 */
export function findOverflowBreakPoint(view, overflow, pageBottomLimit, startPos, docSize) {
  if (!overflow) return { breakPoint: null, overflowBlock: null };

  const { node, pos, rect } = overflow;

  if (isHtmlFieldNode(node)) {
    return (
      createHtmlFieldBreakPoint(overflow, pos, node, pageBottomLimit, startPos, docSize) ?? {
        breakPoint: null,
        overflowBlock: null,
      }
    );
  }

  let breakPoint = null;

  if (isTableNode(node)) {
    breakPoint = findBreakPosInTable(view, pos, node, pageBottomLimit, startPos);
  } else if (isTableRowNode(node)) {
    breakPoint = findBreakPosInTableRow(view, pos, node, pageBottomLimit, startPos);
  }

  if (!breakPoint) {
    breakPoint = findBreakPosInBlock(view, pos, node, pageBottomLimit, startPos);
  }

  return {
    breakPoint,
    overflowBlock: breakPoint ? { node, pos, rect } : null,
  };
}

/**
 * Decide whether a forced break should override the natural overflow break.
 *
 * @param {number|null} forcedPos Position of the forced break.
 * @param {number|null} naturalPos Position of the natural break.
 * @param {number} startPos Pagination start position.
 * @returns {boolean} True when the forced break should be used.
 */
export function shouldUseForcedBreak(forcedPos, naturalPos, startPos) {
  if (forcedPos == null || forcedPos <= startPos) return false;
  return !naturalPos || forcedPos <= naturalPos;
}

/**
 * Select the final break metadata based on the forced-break strategy.
 *
 * @param {{breakPoint:{pos:number,top?:number,bottom?:number}|null,overflowBlock?:Object}|null} forcedBreak Forced break metadata.
 * @param {{breakPoint:{pos:number,top?:number,bottom?:number}|null,overflowBlock?:Object}} naturalBreak Natural break metadata.
 * @param {boolean} useForcedBreak Whether the forced break should win.
 * @returns {{breakPoint:{pos:number,top?:number,bottom?:number}|null,overflowBlock?:Object}} Chosen break result.
 */
export function selectBreakPoint(forcedBreak, naturalBreak, useForcedBreak) {
  if (useForcedBreak) {
    return {
      breakPoint: forcedBreak.breakPoint,
      overflowBlock: forcedBreak.overflowBlock ?? naturalBreak.overflowBlock,
    };
  }
  return naturalBreak;
}

/**
 * Ensure the break result includes overflow block metadata.
 *
 * @param {{node:any,pos:number,rect:any}|null} overflowBlock Existing overflow block data.
 * @param {{pos:number,primary?:{pos:number}}} breakPoint Selected break point.
 * @param {{node:any,pos:number,rect:any}|null} forcedOverflowBlock Overflow data from the forced break.
 * @param {number} startPos Pagination start position.
 * @returns {{node:any,pos:number,rect:any}} Resolved overflow block metadata.
 */
export function ensureOverflowBlock(overflowBlock, breakPoint, forcedOverflowBlock, startPos) {
  if (overflowBlock) return overflowBlock;

  const fallbackPos = resolveBreakPos(breakPoint) ?? startPos;
  return {
    node: forcedOverflowBlock?.node ?? null,
    pos: forcedOverflowBlock?.pos ?? fallbackPos,
    rect: forcedOverflowBlock?.rect ?? null,
  };
}

/**
 * Construct the boundary metadata returned alongside break calculations.
 *
 * @param {Object} params Boundary parameters.
 * @param {number} params.pageTopY Absolute top coordinate of the page.
 * @param {number} params.pageBottomLimit Absolute bottom coordinate limit.
 * @param {number} params.safePageHeightPx Page height in pixels.
 * @param {{top:number,bottom:number}} params.marginsPx Page margins.
 * @param {number} params.printableHeightPx Printable height in pixels.
 * @param {number} params.contentHeightPx Content height in pixels.
 * @param {number} params.footerReservePx Footer reserve in pixels.
 * @param {number} params.safeColumnIndex Active column index.
 * @param {number} params.safeColumnCount Total number of columns.
 * @param {number} params.overflowAllowancePx Allowed overflow in pixels.
 * @param {number} params.baselineOffset Baseline offset used for normalization.
 * @returns {{pageTop:number,pageBottom:number,pageHeightPx:number,marginsPx:{top:number,bottom:number},printableHeightPx:number,contentHeightPx:number,usableHeightPx:number,footerReservePx:number,columnIndex:number,columnCount:number,allowancePx:number}}
 */
export function buildBoundaryInfo({
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
}) {
  return {
    pageTop: normalizeVerticalBounds(pageTopY, baselineOffset),
    pageBottom: normalizeVerticalBounds(pageBottomLimit, baselineOffset),
    pageHeightPx: safePageHeightPx,
    marginsPx,
    printableHeightPx,
    contentHeightPx,
    usableHeightPx: contentHeightPx,
    footerReservePx,
    columnIndex: safeColumnIndex,
    columnCount: safeColumnCount,
    allowancePx: overflowAllowancePx,
  };
}
