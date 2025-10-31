import { getNodeRect } from './get-node-rect.js';
import { safeCoordsAtPos } from './safe-coords-at-pos.js';
import { extendBreakPositionWithSectionMarkers } from './extend-break-pos.js';

/**
 * Report whether the node enforces a manual page break.
 *
 * @param {import('prosemirror-model').Node|null} node ProseMirror node under inspection.
 * @returns {boolean} True when the node represents a forced break.
 */
function isForcedBreakNode(node) {
  if (!node || !node.type) return false;
  const nodeName = node.type.name;
  if (nodeName === 'hardBreak') return true;

  const lineBreakType = node.attrs?.lineBreakType ?? node.attrs?.pageBreakType;
  if (lineBreakType === 'page') return true;

  return false;
}

/**
 * Clamp the break position produced from the forced break node within valid bounds.
 *
 * @param {number} pos Document position where the break node resides.
 * @param {number} nodeSize Size of the break node.
 * @param {number} startPos Pagination scan starting position.
 * @param {number} docSize Document size in positions.
 * @returns {number} Safe break position immediately after the forced break node.
 */
function clampBreakPosition(pos, nodeSize, startPos, docSize) {
  const baseSize = Math.max(1, typeof nodeSize === 'number' ? nodeSize : 1);
  const rawPos = pos + baseSize;
  const upperBound = Number.isFinite(docSize) ? Math.max(0, docSize) : rawPos;
  const clamped = Math.min(rawPos, upperBound);
  return Math.max(startPos + 1, clamped);
}

/**
 * Locate the next forced break in the document after the provided start position.
 *
 * @param {import('prosemirror-view').EditorView} view Measurement editor view.
 * @param {{startPos?:number}} [options] Search options.
 * @returns {{breakPoint:{pos:number,top:number|undefined,bottom:number|undefined},overflowBlock:{node:import('prosemirror-model').Node,pos:number,rect:DOMRect|null}}|null}
 */
export function findForcedBreak(view, { startPos = 0 } = {}) {
  const doc = view?.state?.doc;
  if (!view || !doc || typeof doc.descendants !== 'function') return null;

  const docSize = doc?.content?.size;
  const safeStart = Math.max(0, Number.isFinite(startPos) ? startPos : 0);

  let forcedBreak = null;

  doc.descendants((node, pos) => {
    if (forcedBreak) return false;
    if (!node) return true;

    const nodeSize = typeof node.nodeSize === 'number' ? node.nodeSize : 0;
    const nodeEnd = pos + nodeSize;
    if (nodeEnd <= safeStart) return true;

    if (!isForcedBreakNode(node)) return true;
    if (pos < safeStart) return true;

    let breakPos = clampBreakPosition(pos, nodeSize, safeStart, docSize);
    const rect = getNodeRect(view, pos, node);

    const docNode = view?.state?.doc ?? null;
    const extendedBreakPos = extendBreakPositionWithSectionMarkers(docNode, breakPos);

    let top = rect?.top;
    let bottom = rect?.bottom;

    if (!Number.isFinite(top) || !Number.isFinite(bottom)) {
      const startCoords = safeCoordsAtPos(view, pos);
      top = Number.isFinite(startCoords?.top) ? startCoords.top : 0;
    }

    if (extendedBreakPos !== breakPos) {
      const extendedCoords = safeCoordsAtPos(view, extendedBreakPos);
      if (Number.isFinite(extendedCoords?.bottom)) {
        bottom = extendedCoords.bottom;
      }
      breakPos = extendedBreakPos;
    } else if (!Number.isFinite(bottom)) {
      const endCoords = safeCoordsAtPos(view, breakPos);
      bottom = Number.isFinite(endCoords?.bottom) ? endCoords.bottom : top;
    }

    forcedBreak = {
      breakPoint: {
        pos: breakPos,
        top,
        bottom,
      },
      overflowBlock: {
        node,
        pos,
        rect: rect ?? null,
      },
    };

    return false;
  });

  return forcedBreak;
}
