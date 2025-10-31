import { binarySearchPosition, findLineBreakInBlock, safeCoordsAtPos } from './index.js';

/**
 * Find an appropriate break position inside a block-level node.
 *
 * @param {import('prosemirror-view').EditorView} view Measurement editor view.
 * @param {number} blockPos Document position where the block starts.
 * @param {import('prosemirror-model').Node|null} blockNode Block node to inspect.
 * @param {number} boundaryY Page bottom boundary in pixels.
 * @returns {{pos:number,top:number,bottom:number}|null} Break metadata, or null if the block fits the page.
 */
export function findBreakPosInBlock(view, blockPos, blockNode, boundaryY) {
  if (!blockNode) return null;

  const $pos = view.state.doc.resolve(blockPos);
  const start = $pos.start($pos.depth);
  const end = $pos.end($pos.depth);
  if (start > end) return null;

  // Fast path: explicit line break
  const lineBreak = findLineBreakInBlock(view, blockPos, blockNode, boundaryY, start);
  if (lineBreak && Number.isFinite(lineBreak.pos)) {
    return lineBreak;
  }

  // Need to find the position: binary search
  const match = binarySearchPosition(view, start, end, boundaryY);
  if (!match) {
    return null;
  }

  // Resolve DOM coordinates for the position; default to boundary if mapping fails.
  let pos = match.pos;
  let coords = match.coords ?? safeCoordsAtPos(view, pos);
  if (!coords) {
    return { pos, top: boundaryY, bottom: boundaryY };
  }

  // Return the found position and coordinates.
  const top = Number.isFinite(coords.top) ? coords.top : boundaryY;
  const bottom = Number.isFinite(coords.bottom) ? coords.bottom : top;
  return { pos, top, bottom };
}
