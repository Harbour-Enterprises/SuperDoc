import { BINARY_BACKTRACK_STEPS } from '../../core/constants.js';
import { safeCoordsAtPos } from './index.js';

/**
 * Locate the last document position that still sits within the boundary using a binary search.
 *
 * @param {import('prosemirror-view').EditorView} view Measurement editor view.
 * @param {number} from Starting document position.
 * @param {number} to Ending document position (inclusive).
 * @param {number} boundaryY Allowed bottom coordinate in pixels.
 * @param {number} [maxIterations=22] Safety cap on the number of binary search iterations.
 * @returns {{pos:number,coords:DOMRect|null}|null} The highest valid position with cached coords, if found.
 */
export function binarySearchPosition(view, from, to, boundaryY, maxIterations = 22) {
  let left = Math.max(0, from);
  let right = Math.max(left, to);
  let bestPos = null;
  let bestCoords = null;

  for (let i = 0; i < maxIterations && left <= right; i++) {
    const mid = left + Math.floor((right - left) / 2);
    const coords = safeCoordsAtPos(view, mid);

    if (!coords || !Number.isFinite(coords.bottom)) {
      if (mid <= left) {
        left += 1;
      } else {
        right -= 1;
      }
      continue;
    }

    if (coords.bottom > boundaryY) {
      right = mid - 1;
    } else {
      bestPos = mid;
      bestCoords = coords;
      left = mid + 1;
    }
  }

  if (bestPos == null) return null;

  let pos = bestPos;
  let coords = bestCoords;
  for (let i = 0; i < BINARY_BACKTRACK_STEPS && pos < to; i++) {
    const nextCoords = safeCoordsAtPos(view, pos + 1);
    if (!nextCoords || !Number.isFinite(nextCoords.bottom)) break;
    if (nextCoords.bottom > boundaryY) break;
    pos += 1;
    coords = nextCoords;
  }

  return {
    pos,
    coords,
  };
}
