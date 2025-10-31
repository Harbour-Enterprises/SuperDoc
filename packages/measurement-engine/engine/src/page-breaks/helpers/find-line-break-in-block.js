import { safeCoordsAtPos } from './safe-coords-at-pos.js';

export const RECT_GROUP_TOLERANCE = 2.5;
export const HORIZONTAL_POSITION_TOLERANCE = 8.0; // Tolerance for left edge matching (accounts for text indent, padding, etc)
export const LINE_SCAN_LIMIT = 160;
const WORD_BOUNDARY_PUNCTUATION = new Set(['.', ',', ';', ':', '!', '?', '-', '(', ')', '[', ']', '{', '}']);

/**
 * @typedef {object} RectLike
 * @property {number} [top]
 * @property {number} [bottom]
 * @property {number} [left]
 * @property {number} [right]
 * @property {number} [width]
 * @property {number} [height]
 */

/**
 * @typedef {object} NormalizedRect
 * @property {number} top
 * @property {number} bottom
 * @property {number} left
 * @property {number} right
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {NormalizedRect & {_count: number}} GroupedLineRect
 */

/**
 * @typedef {object} SamplePoint
 * @property {number} left
 * @property {number} top
 */

/**
 * Determine whether the supplied value is a finite number.
 *
 * @param {unknown} value Value to check.
 * @returns {boolean} True when the value is a finite number.
 */
export const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

/**
 * Normalize a DOMRect-like object into one that always has numeric bounds and dimensions.
 *
 * @param {RectLike|null|undefined} rect Rect data returned by the browser.
 * @returns {NormalizedRect|null} Normalized rectangle or null when the input is invalid.
 */
const normalizeRect = (rect) => {
  if (!rect) return null;
  const { top, bottom, left, right, width, height } = rect;
  if (!isFiniteNumber(top) || !isFiniteNumber(bottom)) return null;
  const resolvedWidth = isFiniteNumber(width)
    ? width
    : isFiniteNumber(right) && isFiniteNumber(left)
      ? right - left
      : null;
  const resolvedHeight = isFiniteNumber(height)
    ? height
    : isFiniteNumber(bottom) && isFiniteNumber(top)
      ? bottom - top
      : null;
  if (!isFiniteNumber(resolvedWidth) || resolvedWidth <= 0 || !isFiniteNumber(resolvedHeight) || resolvedHeight <= 0) {
    return null;
  }

  return {
    top,
    bottom,
    left: isFiniteNumber(left) ? left : right - resolvedWidth,
    right: isFiniteNumber(right) ? right : left + resolvedWidth,
    width: resolvedWidth,
    height: resolvedHeight,
  };
};

/**
 * Group individual rects that belong to the same visual line.
 *
 * @param {NormalizedRect[]} rects Rectangles describing text fragments.
 * @returns {GroupedLineRect[]} Rectangles merged per visual line.
 */
const groupLineRects = (rects) => {
  if (!Array.isArray(rects) || !rects.length) return [];
  const sorted = [...rects].sort((a, b) => (a.top === b.top ? a.left - b.left : a.top - b.top));
  const lines = [];

  for (const rect of sorted) {
    const current = lines[lines.length - 1];
    if (
      current &&
      Math.abs(current.top - rect.top) <= RECT_GROUP_TOLERANCE &&
      Math.abs(current.bottom - rect.bottom) <= RECT_GROUP_TOLERANCE
    ) {
      current.top = Math.min(current.top, rect.top);
      current.bottom = Math.max(current.bottom, rect.bottom);
      current.left = Math.min(current.left, rect.left);
      current.right = Math.max(current.right, rect.right);
      current.width = Math.max(current.right - current.left, current.width);
      current.height = Math.max(current.bottom - current.top, current.height);
      current._count += 1;
    } else {
      lines.push({
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
        _count: 1,
      });
    }
  }

  return lines;
};

/**
 * Collect and normalize all line rectangles inside an element.
 *
 * @param {HTMLElement} element DOM element containing the block content.
 * @returns {GroupedLineRect[]} Normalized per-line rectangles.
 */
const collectLineRects = (element) => {
  const ownerDocument = element?.ownerDocument ?? null;
  if (!ownerDocument || typeof ownerDocument.createRange !== 'function') return [];

  let range;
  try {
    range = ownerDocument.createRange();
    range.selectNodeContents(element);
  } catch {
    if (range && typeof range.detach === 'function') {
      range.detach();
    }
    return [];
  }

  const clientRects = Array.from(range.getClientRects?.() ?? []);
  if (typeof range.detach === 'function') {
    range.detach();
  }

  const normalizedRects = clientRects.map(normalizeRect).filter(Boolean);
  const groupedLines = groupLineRects(normalizedRects.map((rect) => ({ ...rect })));
  return groupedLines;
};

/**
 * Compute sample coordinates along a line to probe for document positions.
 *
 * @param {GroupedLineRect|null|undefined} line Target line information.
 * @returns {SamplePoint[]} Coordinate samples within the line.
 */
const resolveSamplePoints = (line) => {
  const samples = [];
  if (!line) return samples;

  const width = Math.max(line.width, 0.5);
  const height = Math.max(line.height, 0.5);
  const top = line.top;
  const bottom = line.bottom;

  const verticalCenter = top + height / 2;
  const safeTop = Math.min(Math.max(top + Math.min(1, height / 2), top + 0.25), bottom - 0.25);

  const edgeLeft = Math.min(Math.max(line.left + 1, line.left + 0.25), line.right - 0.25);
  samples.push({
    left: edgeLeft,
    top: safeTop,
  });

  const offsets = width >= 6 ? [0.1, 0.4, 0.7, 0.9] : width >= 3 ? [0.2, 0.5, 0.8] : [0.5];
  for (const ratio of offsets) {
    const sampleLeft = Math.min(Math.max(line.left + width * ratio, line.left + 0.25), line.right - 0.25);
    samples.push({
      left: sampleLeft,
      top: safeTop,
    });
  }
  samples.push({
    left: Math.min(Math.max(line.left + width / 2, line.left + 0.25), line.right - 0.25),
    top: Math.min(Math.max(verticalCenter, top + 0.25), bottom - 0.25),
  });

  return samples;
};

/**
 * Clamp a document position so it stays within the bounds of the given block node.
 *
 * @param {number} pos Target document position.
 * @param {number} blockPos Position where the block starts.
 * @param {import('prosemirror-model').Node|null|undefined} blockNode Block node instance.
 * @param {number} [minPos=0] Minimum allowed position.
 * @returns {number|null} Adjusted position, or null when the input position is not finite.
 */
const clampPosWithinBlock = (pos, blockPos, blockNode, minPos = 0) => {
  if (!Number.isFinite(pos)) return null;
  const blockSize = Math.max(0, blockNode?.nodeSize ?? 0);
  const blockStart = Math.max(blockPos + 1, minPos);
  const blockEnd = blockPos + blockSize - 1;
  const clampedLower = Math.max(blockStart, pos);
  if (!Number.isFinite(blockEnd)) return clampedLower;
  return Math.min(blockEnd, clampedLower);
};

/**
 * Rewind a document position back to the start of its visual line.
 *
 * @param {import('prosemirror-view').EditorView} view Measurement editor view.
 * @param {number} pos Initial document position within the line.
 * @param {number} minPos Minimum allowed position during the first pass.
 * @param {number} lineTop Visual top coordinate of the line.
 * @param {number} lineBottom Visual bottom coordinate of the line.
 * @param {number} lineLeft Visual left coordinate of the line.
 * @returns {number} Position representing the start of the visual line.
 */
export const rewindToLineStart = (view, pos, minPos, lineTop, lineBottom, lineLeft) => {
  if (!Number.isFinite(pos)) return pos;
  const tolerance = RECT_GROUP_TOLERANCE;
  let result = pos;
  let current = pos;
  let lastCoords = null;

  // First pass: rewind while we're on the same line (by vertical coordinates)
  for (let i = 0; i < LINE_SCAN_LIMIT && current > minPos; i += 1) {
    const testPos = current - 1;
    if (testPos < minPos) break;
    const coords = safeCoordsAtPos(view, testPos);
    if (!coords || !isFiniteNumber(coords.top) || !isFiniteNumber(coords.bottom)) break;

    // Check if this position is on the same line by comparing top and bottom coordinates
    const topMatches = Math.abs(coords.top - lineTop) <= tolerance;
    const bottomMatches = Math.abs(coords.bottom - lineBottom) <= tolerance;
    const isOnSameLine = topMatches && bottomMatches && coords.bottom >= coords.top;

    if (!isOnSameLine) break;

    result = testPos;
    current = testPos;
    lastCoords = coords;
  }

  // Second pass: verify we're actually at the leftmost position
  // If our horizontal position is still far from the line's left edge, keep searching
  let finalCoords = lastCoords;
  if (!finalCoords) {
    if (isFiniteNumber(lineLeft) && isFiniteNumber(lineTop) && isFiniteNumber(lineBottom)) {
      finalCoords = { left: lineLeft, top: lineTop, bottom: lineBottom };
    } else {
      finalCoords = safeCoordsAtPos(view, result);
    }
  }
  let secondPassUsed = false;
  let secondPassConditionMet = false;

  if (finalCoords && isFiniteNumber(finalCoords.left) && isFiniteNumber(lineLeft)) {
    const leftDelta = finalCoords.left - lineLeft;
    const threshold = HORIZONTAL_POSITION_TOLERANCE;
    secondPassConditionMet = leftDelta > threshold;
  }

  if (secondPassConditionMet) {
    secondPassUsed = true;
    // We're not at the true line start yet - continue rewinding more aggressively
    // This time, don't check vertical coords, just keep going until we're close to lineLeft
    // NOTE: We ignore minPos in the second pass because the first pass may have stopped at minPos
    // but we need to go further back to find the true horizontal start of the line
    current = result;
    let previousLeft = finalCoords.left;
    let bestResult = result;
    let bestDistance = Math.abs(finalCoords.left - lineLeft);
    const secondPassSamples = [];
    let breakReason = null;
    const absoluteMinPos = 0; // Allow going all the way back if needed

    let consecutiveAwayMoves = 0;
    const MAX_CONSECUTIVE_AWAY_MOVES = 3; // Allow a few positions that move away before giving up

    for (let i = 0; i < LINE_SCAN_LIMIT && current > absoluteMinPos; i += 1) {
      const testPos = current - 1;
      if (testPos < absoluteMinPos) {
        breakReason = 'testPos-below-absoluteMin';
        secondPassSamples.push({ i, testPos, absoluteMinPos, reason: breakReason });
        break;
      }
      const coords = safeCoordsAtPos(view, testPos);
      if (!coords || !isFiniteNumber(coords.left)) {
        secondPassSamples.push({ testPos, reason: 'no-coords' });
        break;
      }

      // Check if we're getting closer to the target left position
      const currentDistance = Math.abs(coords.left - lineLeft);
      const previousDistance = Math.abs(previousLeft - lineLeft);
      const isGettingCloser = currentDistance < previousDistance;

      secondPassSamples.push({
        testPos,
        left: coords.left,
        distance: currentDistance,
        isBetter: currentDistance < bestDistance,
        isGettingCloser,
      });

      // Track the best (closest to lineLeft) position we've found
      if (currentDistance < bestDistance) {
        bestResult = testPos;
        bestDistance = currentDistance;
      }

      // If we're moving away, increment counter; otherwise reset it
      if (currentDistance > previousDistance + tolerance * 2) {
        consecutiveAwayMoves += 1;
        secondPassSamples.push({ testPos, consecutiveAwayMoves, reason: 'moving-away-increment' });

        // Only stop if we've been consistently moving away for several positions
        if (consecutiveAwayMoves >= MAX_CONSECUTIVE_AWAY_MOVES) {
          breakReason = 'persistent-moving-away';
          secondPassSamples.push({ testPos, reason: breakReason });
          break;
        }
      } else {
        consecutiveAwayMoves = 0; // Reset counter if we're making progress
      }

      current = testPos;
      previousLeft = coords.left;

      // Stop when we're close enough to the line's left edge
      if (currentDistance <= HORIZONTAL_POSITION_TOLERANCE) {
        result = testPos;
        breakReason = 'close-enough';
        secondPassSamples.push({ testPos, reason: breakReason });
        break;
      }
    }

    // Use the best result we found
    result = bestResult;
    finalCoords = safeCoordsAtPos(view, result);
  }

  // Important: If we used the second pass, we may have found a position before minPos.
  // This is intentional - the true line start might be before the block boundary.
  // Only enforce minPos constraint if we didn't use the second pass.
  const finalResult = secondPassUsed ? result : Math.max(minPos, result);

  return finalResult;
};

/**
 * Attempt to locate a page break at the start of the first overflowing visual line inside a block.
 *
 * @param {import('prosemirror-view').EditorView} view Measurement editor view.
 * @param {number} blockPos Document position where the block starts.
 * @param {import('prosemirror-model').Node|null} blockNode Block node to inspect.
 * @param {number} boundaryY Absolute page boundary in pixels.
 * @param {number} [minPos=0] Minimum allowed break position.
 * @returns {{pos: number, top: number, bottom: number}|null} Break metadata, or null if no overflowing line was found.
 */
export function findLineBreakInBlock(view, blockPos, blockNode, boundaryY, minPos = 0) {
  if (!view || !Number.isFinite(boundaryY) || !blockNode) return null;
  const HTMLElementRef = typeof HTMLElement === 'undefined' ? null : HTMLElement;
  if (!HTMLElementRef || typeof view.nodeDOM !== 'function') return null;

  let dom = null;
  try {
    dom = view.nodeDOM(blockPos);
  } catch {
    dom = null;
  }

  if (!dom) return null;
  if (!(dom instanceof HTMLElementRef) && dom.parentElement instanceof HTMLElementRef) {
    dom = dom.parentElement;
  }
  if (!(dom instanceof HTMLElementRef)) return null;

  const lines = collectLineRects(dom);
  if (!lines.length) {
    return null;
  }

  const lastLine = lines[lines.length - 1];
  if (!lastLine || lastLine.bottom <= boundaryY + RECT_GROUP_TOLERANCE) {
    return null;
  }

  const overflowLine = lines.find((line) => line.bottom > boundaryY + RECT_GROUP_TOLERANCE);
  if (!overflowLine) {
    return null;
  }

  // Sample from the LEFT edge of the overflowing line to find the start position
  let pos = null;

  if (typeof view.posAtCoords === 'function') {
    // Try to get position at the very left edge of the overflowing line
    const leftEdgeSample = {
      left: overflowLine.left + 0.5,
      top: overflowLine.top + Math.max((overflowLine.bottom - overflowLine.top) / 2, 0.5),
    };

    const result = view.posAtCoords(leftEdgeSample);
    if (Number.isFinite(result?.pos)) {
      pos = result.pos;
    } else {
      // Fallback to other sample points if left edge fails
      const samples = resolveSamplePoints(overflowLine);
      for (const sample of samples) {
        const fallbackResult = view.posAtCoords(sample);
        if (Number.isFinite(fallbackResult?.pos)) {
          pos = fallbackResult.pos;
          break;
        }
      }
    }
  }

  if (!Number.isFinite(pos) && typeof view.domAtPos === 'function') {
    try {
      const resolved = view.domAtPos(Math.max(blockPos + 1, minPos));
      if (resolved?.node instanceof HTMLElementRef) {
        const retrySamples = resolveSamplePoints({
          left: resolved.node.getBoundingClientRect?.()?.left ?? overflowLine.left,
          right: resolved.node.getBoundingClientRect?.()?.right ?? overflowLine.right,
          top: overflowLine.top,
          bottom: overflowLine.bottom,
          width: overflowLine.width,
          height: overflowLine.height,
        });
        for (const sample of retrySamples) {
          const result = view.posAtCoords?.(sample);
          if (Number.isFinite(result?.pos)) {
            pos = result.pos;
            break;
          }
        }
      }
    } catch {}
  }

  if (!Number.isFinite(pos)) {
    return null;
  }

  const clampedPos = clampPosWithinBlock(pos, blockPos, blockNode, minPos);
  if (!Number.isFinite(clampedPos)) {
    return null;
  }

  const blockStart = Math.max(blockPos + 1, minPos);

  // Check what content is at the sampled position
  let contentAtPos = null;
  try {
    const $pos = view.state.doc.resolve(clampedPos);
    const node = $pos.parent;
    const offset = $pos.parentOffset;
    const textBefore = node.textContent.substring(Math.max(0, offset - 20), offset);
    const textAfter = node.textContent.substring(offset, Math.min(node.textContent.length, offset + 30));
    contentAtPos = {
      textBefore: `"${textBefore}"`,
      textAfter: `"${textAfter}"`,
      fullText: `"${textBefore}|${textAfter}"`,
    };
  } catch (e) {
    contentAtPos = { error: e.message };
  }

  // Check if the sampled position is mid-word
  // Mid-word means: letter before AND letter after (no space/punctuation boundary)
  const textBeforeContent = contentAtPos?.textBefore?.substring(1, contentAtPos.textBefore.length - 1) || '';
  const textAfterContent = contentAtPos?.textAfter?.substring(1, contentAtPos.textAfter.length - 1) || '';

  const lastCharBefore = textBeforeContent.slice(-1);
  const firstCharAfter = textAfterContent.charAt(0);

  // Mid-word if both sides are letters (no space/punctuation between them)
  const isMidWord = /[a-zA-Z]/.test(lastCharBefore) && /[a-zA-Z]/.test(firstCharAfter);

  // Now rewind backwards to find the actual START of this line (= END of previous line)
  // We need to go back until we find:
  // 1. A position on a different line (Y coordinate changes), OR
  // 2. If we're mid-word, a word boundary (space/punctuation before)
  const sampledCoords = safeCoordsAtPos(view, clampedPos);
  const sampledTop = sampledCoords?.top;

  let finalBreakPos = clampedPos;
  if (Number.isFinite(sampledTop)) {
    let checkPos = clampedPos;
    let foundLineStart = false;

    // Rewind backwards until Y coordinate changes OR we find a word boundary (if mid-word)
    for (let i = 0; i < 500 && checkPos > blockStart; i++) {
      checkPos--;
      const checkCoords = safeCoordsAtPos(view, checkPos);
      const checkTop = checkCoords?.top;

      // If Y position changed significantly, we've moved to the previous line
      // The position AFTER this one (checkPos + 1) is the start of our line
      if (Number.isFinite(checkTop) && Math.abs(checkTop - sampledTop) > 5) {
        finalBreakPos = checkPos + 1;
        foundLineStart = true;
        break;
      }

      // If we're mid-word, also check for word boundaries on the SAME line
      if (isMidWord) {
        try {
          const $checkPos = view.state.doc.resolve(checkPos);
          const node = $checkPos.parent;
          const offset = $checkPos.parentOffset;
          const charBefore = node.textContent.charAt(offset - 1);

          // Check if we're at a word boundary (space, punctuation before this position)
          const isWordBoundary =
            !charBefore || /\s/.test(charBefore) || WORD_BOUNDARY_PUNCTUATION.has(charBefore) || offset === 0;

          if (isWordBoundary) {
            finalBreakPos = checkPos;
            foundLineStart = true;
            break;
          }
        } catch {
          // Ignore errors while checking word boundaries
        }
      }

      // If we reached the start of the block, this is the line start
      if (checkPos <= blockStart) {
        finalBreakPos = blockStart;
        foundLineStart = true;
        break;
      }
    }

    if (!foundLineStart) {
      finalBreakPos = clampedPos;
    }
  }

  const finalCoords = safeCoordsAtPos(view, finalBreakPos);

  // IMPORTANT: Use finalCoords, not overflowLine coords!
  // We rewound to finalBreakPos which may be on a different line than overflowLine
  const returnTop = finalCoords?.top ?? overflowLine.top;
  const returnBottom = finalCoords?.bottom ?? overflowLine.bottom;

  return {
    pos: finalBreakPos,
    top: returnTop,
    bottom: returnBottom,
  };
}
