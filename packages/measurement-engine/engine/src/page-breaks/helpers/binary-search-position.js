import { BINARY_BACKTRACK_STEPS, BREAK_TOLERANCE_PX } from '../../core/constants.js';
import { safeCoordsAtPos } from './index.js';
import { rewindToLineStart } from './find-line-break-in-block.js';

/**
 * Check if coordinates are valid and have finite bottom value.
 */
function hasValidCoords(coords) {
  return coords && Number.isFinite(coords.bottom);
}

/**
 * Check if two coordinates are on the same line within tolerance.
 */
function isOnSameLine(coords1, coords2, tolerance = BREAK_TOLERANCE_PX) {
  if (!hasValidCoords(coords1) || !hasValidCoords(coords2)) {
    return false;
  }
  return Math.abs(coords1.top - coords2.top) <= tolerance && Math.abs(coords1.bottom - coords2.bottom) <= tolerance;
}

/**
 * Locate the first document position that overflows the boundary using a binary search.
 *
 * @param {import('prosemirror-view').EditorView} view Measurement editor view.
 * @param {number} from Starting document position.
 * @param {number} to Ending document position (inclusive).
 * @param {number} boundaryY Allowed bottom coordinate in pixels.
 * @param {number} [maxIterations=22] Safety cap on the number of binary search iterations.
 * @returns {{pos:number,coords:DOMRect|null}|null} The start of the line containing the first overflowing position, if found.
 */
export function binarySearchPosition(view, from, to, boundaryY, maxIterations = 22) {
  // Phase 1: Binary search for approximate position
  let left = Math.max(0, from);
  let right = Math.max(left, to);
  let bestPos = null;
  let bestCoords = null;

  for (let i = 0; i < maxIterations && left <= right; i++) {
    const mid = left + Math.floor((right - left) / 2);
    const coords = safeCoordsAtPos(view, mid);

    if (!hasValidCoords(coords)) {
      // Skip invalid coordinates
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

  // Phase 2: Advance to the last position on the same line that fits within boundary
  // This ensures we find the complete line, not just a position in the middle of it
  // Track if we detected overflow so we know whether to advance in Phase 3
  let detectedOverflow = false;
  let overflowCoords = null;

  for (let i = 0; i < BINARY_BACKTRACK_STEPS && pos < to; i++) {
    const nextCoords = safeCoordsAtPos(view, pos + 1);
    if (!hasValidCoords(nextCoords)) break;

    if (nextCoords.bottom > boundaryY) {
      // Found overflow! Save this information for Phase 3
      detectedOverflow = true;
      overflowCoords = nextCoords;
      break;
    }

    if (!isOnSameLine(coords, nextCoords)) break;

    pos += 1;
    coords = nextCoords;
  }

  // Phase 3: Move to the first position that overflows and rewind to its line start
  // Check if there's overflow at nextPos (either detected in Phase 2 or check now)
  const nextPos = pos + 1;
  if (nextPos <= to) {
    // Use cached overflow coords from Phase 2 if available, otherwise fetch
    const nextCoords = overflowCoords ?? safeCoordsAtPos(view, nextPos);
    const fitsBoundaryExactly = hasValidCoords(coords) && Math.abs(coords.bottom - boundaryY) <= BREAK_TOLERANCE_PX;
    const lacksLineMetrics =
      !nextCoords ||
      !Number.isFinite(nextCoords.top) ||
      !Number.isFinite(nextCoords.bottom) ||
      !Number.isFinite(nextCoords.left);

    if (fitsBoundaryExactly && lacksLineMetrics) {
      return { pos, coords };
    }

    const isOverflow = hasValidCoords(nextCoords) && nextCoords.bottom > boundaryY;

    if (isOverflow) {
      // Use sophisticated rewinding logic that checks both vertical and horizontal position
      const lineStartPos = rewindToLineStart(view, nextPos, from, nextCoords.top, nextCoords.bottom, nextCoords.left);

      if (Number.isFinite(lineStartPos)) {
        pos = lineStartPos;
        // Only fetch new coords if we actually rewound to a different position
        coords = pos === nextPos ? nextCoords : (safeCoordsAtPos(view, pos) ?? nextCoords);
      } else {
        pos = nextPos;
        coords = nextCoords;
      }
    } else if (!hasValidCoords(nextCoords) && detectedOverflow) {
      // Phase 2 detected overflow but we can't get valid coords now
      // Still advance to it as the break position
      pos = nextPos;
      coords = null; // Signal to caller to use boundary fallback
    }
  }

  return { pos, coords };
}
