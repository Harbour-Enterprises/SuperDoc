import { safeCoordsAtPos } from './index.js';

/**
 * Resolve a DOMRect-like structure for a document node, optionally scanning its children.
 *
 * @param {import('prosemirror-view').EditorView} view Measurement editor view.
 * @param {number} pos Document position where the node starts.
 * @param {import('prosemirror-model').Node|null} node Node to measure.
 * @param {{scanChildren?:boolean}} [options] Additional measurement options.
 * @returns {{top:number,bottom:number,left:number,right:number,width:number,height:number}|null} Normalised rectangle or null when unavailable.
 */
export function getNodeRect(view, pos, node, options = {}) {
  const { scanChildren = true } = options;

  let rect = null;
  try {
    const dom = view.nodeDOM(pos);
    if (dom && dom.getBoundingClientRect) {
      rect = dom.getBoundingClientRect();
    }
  } catch {
    rect = null;
  }

  let childUnion = null;
  if (scanChildren && node?.childCount > 0) {
    childUnion = computeChildUnionRect(view, pos, node);
  }

  if (rect && childUnion && shouldPreferChildUnion(rect, childUnion)) {
    rect = childUnion;
  } else if (!rect && childUnion) {
    rect = childUnion;
  }

  if (rect) {
    return normaliseRect(rect);
  }

  if (!node || typeof node.nodeSize !== 'number') return null;
  const start = safeCoordsAtPos(view, pos);
  const end = safeCoordsAtPos(view, pos + node.nodeSize);
  if (!start || !end) return null;

  const top = Number.isFinite(start.top) ? start.top : 0;
  const bottom = Number.isFinite(end.bottom) ? end.bottom : top;
  const left = Math.min(start.left ?? 0, end.left ?? start.left ?? 0);
  const right = Math.max(start.right ?? left, end.right ?? left);

  return {
    top,
    bottom,
    left,
    right,
    height: bottom - top,
    width: right - left,
  };
}

/**
 * Compute the union rectangle for all child nodes of the provided node.
 *
 * @param {import('prosemirror-view').EditorView} view Measurement editor view.
 * @param {number} pos Document position where the parent node starts.
 * @param {import('prosemirror-model').Node|null} node Parent node to inspect.
 * @returns {{top:number,bottom:number,left:number,right:number,width:number,height:number}|null} Aggregated rectangle or null.
 */
function computeChildUnionRect(view, pos, node) {
  if (!node || typeof node.childCount !== 'number' || node.childCount === 0) return null;

  let minTop = Number.POSITIVE_INFINITY;
  let maxBottom = Number.NEGATIVE_INFINITY;
  let minLeft = Number.POSITIVE_INFINITY;
  let maxRight = Number.NEGATIVE_INFINITY;
  let offset = 0;
  let found = false;

  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    const childPos = pos + 1 + offset;
    offset += child.nodeSize;

    const childRect = getNodeRect(view, childPos, child, { scanChildren: false });
    if (!childRect) continue;

    found = true;
    minTop = Math.min(minTop, childRect.top);
    maxBottom = Math.max(maxBottom, childRect.bottom);
    minLeft = Math.min(minLeft, childRect.left);
    maxRight = Math.max(maxRight, childRect.right);
  }

  if (!found) return null;

  return {
    top: minTop,
    bottom: maxBottom,
    left: minLeft,
    right: maxRight,
    width: maxRight - minLeft,
    height: maxBottom - minTop,
  };
}

/**
 * Decide whether the child union rectangle provides a better measurement than the parent rect.
 *
 * @param {{height?:number,width?:number,bottom?:number,top?:number,right?:number,left?:number}} rect Primary rectangle.
 * @param {{height?:number,width?:number,bottom?:number,top?:number,right?:number,left?:number}|null} unionRect Child union rectangle.
 * @returns {boolean} True when the union rectangle should take precedence.
 */
function shouldPreferChildUnion(rect, unionRect) {
  if (!unionRect) return false;

  const rectHeight = extractDimension(rect.height, rect.bottom, rect.top);
  const unionHeight = extractDimension(unionRect.height, unionRect.bottom, unionRect.top);
  if (!Number.isFinite(unionHeight)) return false;
  if (!Number.isFinite(rectHeight)) return true;

  const rectWidth = extractDimension(rect.width, rect.right, rect.left);
  const unionWidth = extractDimension(unionRect.width, unionRect.right, unionRect.left);

  const heightGap = unionHeight - rectHeight;
  const widthGap = unionWidth - rectWidth;

  const HEIGHT_EPSILON = 1;
  const WIDTH_EPSILON = 1;

  return heightGap > HEIGHT_EPSILON || widthGap > WIDTH_EPSILON;
}

/**
 * Extract a consistent dimension value, falling back to max/min coordinates.
 *
 * @param {number} primary Primary dimension value.
 * @param {number} max Maximum coordinate.
 * @param {number} min Minimum coordinate.
 * @returns {number} Resolved dimension or NaN.
 */
function extractDimension(primary, max, min) {
  if (Number.isFinite(primary)) return primary;
  if (Number.isFinite(max) && Number.isFinite(min)) return Math.abs(max - min);
  return Number.NaN;
}

/**
 * Convert any DOMRect-like input into a plain object with numeric fields.
 *
 * @param {{top?:number,bottom?:number,left?:number,right?:number,width?:number,height?:number}} rect Rectangle candidate.
 * @returns {{top:number,bottom:number,left:number,right:number,width:number,height:number}} Normalised rectangle.
 */
function normaliseRect(rect) {
  const top = Number.isFinite(rect.top) ? rect.top : 0;
  const bottom = Number.isFinite(rect.bottom) ? rect.bottom : top;
  const left = Number.isFinite(rect.left) ? rect.left : 0;
  const right = Number.isFinite(rect.right) ? rect.right : left;
  return {
    top,
    bottom,
    left,
    right,
    width: Number.isFinite(rect.width) ? rect.width : right - left,
    height: Number.isFinite(rect.height) ? rect.height : bottom - top,
  };
}
