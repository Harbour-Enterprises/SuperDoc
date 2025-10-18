import { binarySearchPosition, safeCoordsAtPos } from './index.js';
import { isHtmlFieldNode } from '../../core/field-annotations-measurements/index.js';

/**
 * Find an appropriate break position inside a block-level node.
 *
 * @param {import('prosemirror-view').EditorView} view Measurement editor view.
 * @param {number} blockPos Document position where the block starts.
 * @param {import('prosemirror-model').Node|null} blockNode Block node to inspect.
 * @param {number} boundaryY Page bottom boundary in pixels.
 * @param {number} [minPos=0] Minimum allowed break position.
 * @returns {{pos:number,top:number,bottom:number}|null} Break metadata, or null if the block fits the page.
 */
export function findBreakPosInBlock(view, blockPos, blockNode, boundaryY, minPos = 0) {
  if (!blockNode) return null;
  const start = Math.max(blockPos + 1, minPos);
  const end = blockPos + blockNode.nodeSize - 1;
  if (start > end) return null;

  const match = binarySearchPosition(view, start, end, boundaryY);
  if (!match) return null;

  let pos = match.pos;
  let coords = match.coords ?? safeCoordsAtPos(view, pos);

  const htmlOverride = resolveHtmlFieldOverflow(view, blockPos, blockNode, boundaryY, start);
  if (htmlOverride && Number.isFinite(htmlOverride.pos) && htmlOverride.pos > pos) {
    pos = htmlOverride.pos;
    coords = htmlOverride.coords ?? safeCoordsAtPos(view, pos);
  }
  if (!coords) {
    return { pos, top: boundaryY, bottom: boundaryY };
  }

  const HTMLElementRef = typeof HTMLElement === 'undefined' ? null : HTMLElement;

  const returnResult = (resolvedPos, resolvedCoords) => {
    const top = Number.isFinite(resolvedCoords.top) ? resolvedCoords.top : boundaryY;
    const bottom = Number.isFinite(resolvedCoords.bottom) ? resolvedCoords.bottom : top;
    return { pos: resolvedPos, top, bottom };
  };

  let domNode = null;
  if (typeof view.nodeDOM === 'function') {
    try {
      domNode = view.nodeDOM(pos);
    } catch {}
  }

  if (!domNode && typeof view.domAtPos === 'function') {
    try {
      const domResult = view.domAtPos(pos);
      domNode = domResult?.node ?? null;
    } catch {}
  }

  /**
   * Report whether the DOM node represents a list item content wrapper from the editor.
   *
   * @param {HTMLElement|null} node DOM node under inspection.
   * @returns {boolean} True when the node stores list item content.
   */
  const isListItemContent = (node) => {
    if (!node || !(node instanceof HTMLElement)) return false;
    return node.classList.contains('sd-editor-list-item-content-dom');
  };

  if (HTMLElementRef && domNode instanceof HTMLElementRef && !isListItemContent(domNode)) {
    const parentContent = domNode.closest('.sd-editor-list-item-content-dom');
    if (parentContent) {
      domNode = parentContent;
    }
  }

  if (HTMLElementRef && domNode instanceof HTMLElementRef && domNode.closest('.sd-editor-list-item-node-view')) {
    if (typeof view.domAtPos === 'function') {
      try {
        const domResult = view.domAtPos(pos);
        if (domResult?.node && domResult.node instanceof HTMLElementRef) {
          domNode = domResult.node.closest('.sd-editor-list-item-content-dom') ?? domNode;
        }
      } catch {}
    }
    const adjustedPos = Math.max(start, blockPos + 1);

    const adjustedCoords = safeCoordsAtPos(view, adjustedPos) ?? coords;
    return returnResult(adjustedPos, adjustedCoords);
  }

  const top = Number.isFinite(coords.top) ? coords.top : boundaryY;
  const bottom = Number.isFinite(coords.bottom) ? coords.bottom : top;
  return { pos, top, bottom };
}

/**
 * Detect HTML field nodes within the block that extend beyond the current boundary.
 *
 * @param {import('prosemirror-view').EditorView} view Measurement editor view.
 * @param {number} blockPos Starting document position for the block node.
 * @param {import('prosemirror-model').Node|null} blockNode Parent block that may contain HTML fields.
 * @param {number} boundaryY Page boundary in pixels.
 * @param {number} minPos Minimum document position to consider for the break.
 * @returns {{pos:number,coords:{top?:number,bottom?:number,left?:number,right?:number}|null}|null}
 */
function resolveHtmlFieldOverflow(view, blockPos, blockNode, boundaryY, minPos) {
  const doc = view?.state?.doc;
  if (!doc || !Number.isFinite(boundaryY) || !blockNode || typeof blockNode.childCount !== 'number') return null;

  const tolerance = 0.5;
  const maxDocPos = Math.max(0, doc.content.size - 1);
  const HTMLElementRef = typeof HTMLElement === 'undefined' ? null : HTMLElement;

  let offset = 0;

  for (let i = 0; i < blockNode.childCount; i += 1) {
    const child = blockNode.child(i);
    const childSize = Math.max(1, child?.nodeSize ?? 1);
    const childPos = blockPos + 1 + offset;
    offset += childSize;

    if (!isHtmlFieldNode(child)) {
      continue;
    }

    let dom = null;
    try {
      dom = view?.nodeDOM?.(childPos);
    } catch {}

    if (!HTMLElementRef || !(dom instanceof HTMLElementRef)) {
      continue;
    }

    const rect = typeof dom.getBoundingClientRect === 'function' ? dom.getBoundingClientRect() : null;
    if (!rect || !Number.isFinite(rect.top) || !Number.isFinite(rect.bottom)) {
      continue;
    }

    if (rect.bottom <= boundaryY + tolerance) {
      continue;
    }

    if (rect.top >= boundaryY - tolerance) {
      continue;
    }

    const breakPos = Math.max(minPos, childPos + childSize);
    const clampedPos = Math.min(Math.max(0, breakPos), maxDocPos);
    const coords = safeCoordsAtPos(view, clampedPos);

    return {
      pos: breakPos,
      coords,
    };
  }

  return null;
}
