import type { FlowBlock, Line, Run, TabRun } from '@superdoc/contracts';

/**
 * Shared text measurement utility for accurate character positioning.
 * Uses a stateful Canvas context to avoid repeated allocation.
 *
 * This module provides the single source of truth for converting between:
 * - ProseMirror positions and X coordinates
 * - X coordinates and character offsets
 *
 * Used by both:
 * - Click-to-position mapping (layout-bridge)
 * - Caret rendering (demo-app selection-overlay)
 */

// Stateful canvas for text measurement
let measurementCanvas: HTMLCanvasElement | null = null;
let measurementCtx: CanvasRenderingContext2D | null = null;

const TAB_CHAR_LENGTH = 1;

const isTabRun = (run: Run): run is TabRun => run?.kind === 'tab';

/**
 * Get or create the measurement canvas context.
 * Lazy initialization to avoid creating canvas in non-browser environments.
 */
function getMeasurementContext(): CanvasRenderingContext2D | null {
  if (measurementCtx) return measurementCtx;

  if (typeof document === 'undefined') {
    // Only warn in non-test environments - Canvas fallback is expected in tests
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[text-measurement] Canvas not available (non-browser environment)');
    }
    return null;
  }

  measurementCanvas = document.createElement('canvas');
  measurementCtx = measurementCanvas.getContext('2d');

  if (!measurementCtx) {
    console.warn('[text-measurement] Failed to create 2D context');
  }

  return measurementCtx;
}

/**
 * Generates a CSS font string from a run's formatting properties.
 *
 * @param run - The text or tab run to generate font string for
 * @returns CSS font string (e.g., "italic bold 16px Arial")
 */
export function getRunFontString(run: Run): string {
  // TabRun, ImageRun, and LineBreakRun don't have styling properties, use defaults
  if (run.kind === 'tab' || run.kind === 'lineBreak' || 'src' in run) {
    return 'normal normal 16px Arial';
  }

  const style = run.italic ? 'italic' : 'normal';
  const weight = run.bold ? 'bold' : 'normal';
  const fontSize = run.fontSize ?? 16;
  const fontFamily = run.fontFamily ?? 'Arial';
  return `${style} ${weight} ${fontSize}px ${fontFamily}`;
}

/**
 * Extracts the subset of runs that appear in a specific line.
 * Handles partial runs that span multiple lines.
 *
 * @param block - The paragraph block containing the runs
 * @param line - The line to extract runs for
 * @returns Array of runs present in the line
 */
export function sliceRunsForLine(block: FlowBlock, line: Line): Run[] {
  const result: Run[] = [];
  if (block.kind !== 'paragraph') return result;

  for (let runIndex = line.fromRun; runIndex <= line.toRun; runIndex += 1) {
    const run = block.runs[runIndex];
    if (!run) continue;

    if (isTabRun(run)) {
      result.push(run);
      continue;
    }

    // FIXED: ImageRun handling - images are atomic units, no slicing needed
    if ('src' in run) {
      result.push(run);
      continue;
    }

    // LineBreakRun handling - line breaks are atomic units, no slicing needed
    if (run.kind === 'lineBreak') {
      result.push(run);
      continue;
    }

    const text = run.text ?? '';
    const isFirstRun = runIndex === line.fromRun;
    const isLastRun = runIndex === line.toRun;

    if (isFirstRun || isLastRun) {
      const start = isFirstRun ? line.fromChar : 0;
      const end = isLastRun ? line.toChar : text.length;
      const slice = text.slice(start, end);
      const pmStart =
        run.pmStart != null ? run.pmStart + start : run.pmEnd != null ? run.pmEnd - (text.length - start) : undefined;
      const pmEnd =
        run.pmStart != null ? run.pmStart + end : run.pmEnd != null ? run.pmEnd - (text.length - end) : undefined;
      result.push({
        ...run,
        text: slice,
        pmStart,
        pmEnd,
      });
    } else {
      result.push(run);
    }
  }

  return result;
}

/**
 * Measure the X position for a specific character offset within a line.
 * Uses Canvas measureText for pixel-perfect accuracy.
 *
 * @param block - The paragraph block containing the line
 * @param line - The line to measure within
 * @param charOffset - Character offset from the start of the line (0-based)
 * @returns The X coordinate (in pixels) from the start of the line
 */
export function measureCharacterX(block: FlowBlock, line: Line, charOffset: number): number {
  const ctx = getMeasurementContext();

  // Check if line has segment-based positioning (used for tab-aligned text)
  // When segments have explicit X positions, we must use segment-based calculation
  // to match the actual DOM positioning
  const hasExplicitPositioning = line.segments?.some((seg) => seg.x !== undefined);

  if (hasExplicitPositioning && line.segments && ctx) {
    return measureCharacterXSegmentBased(block, line, charOffset, ctx);
  }

  if (!ctx) {
    // Fallback to ratio-based calculation if Canvas unavailable
    const runs = sliceRunsForLine(block, line);
    const charsInLine = Math.max(
      1,
      runs.reduce((sum, run) => {
        if (isTabRun(run)) return sum + TAB_CHAR_LENGTH;
        if ('src' in run || run.kind === 'lineBreak') return sum;
        return sum + (run.text ?? '').length;
      }, 0),
    );
    return (charOffset / charsInLine) * line.width;
  }

  const runs = sliceRunsForLine(block, line);
  let currentX = 0;
  let currentCharOffset = 0;

  for (const run of runs) {
    if (isTabRun(run)) {
      const runLength = TAB_CHAR_LENGTH;
      const tabWidth = run.width ?? 0;
      if (currentCharOffset + runLength >= charOffset) {
        const offsetInRun = charOffset - currentCharOffset;
        return currentX + (offsetInRun <= 0 ? 0 : tabWidth);
      }
      currentX += tabWidth;
      currentCharOffset += runLength;
      continue;
    }

    const text = 'src' in run || run.kind === 'lineBreak' ? '' : (run.text ?? '');
    const runLength = text.length;

    // If target character is within this run
    if (currentCharOffset + runLength >= charOffset) {
      const offsetInRun = charOffset - currentCharOffset;
      ctx.font = getRunFontString(run);

      // Measure text up to the target character
      const textUpToTarget = text.slice(0, offsetInRun);

      const measured = ctx.measureText(textUpToTarget);
      const spacingWidth = computeLetterSpacingWidth(run, offsetInRun, runLength);
      return currentX + measured.width + spacingWidth;
    }

    // Measure entire run and advance
    ctx.font = getRunFontString(run);
    const measured = ctx.measureText(text);
    currentX += measured.width + computeLetterSpacingWidth(run, runLength, runLength);

    currentCharOffset += runLength;
  }

  // If we're past the end, return the total width
  return currentX;
}

/**
 * Measure character X position using segment-based calculation.
 * This is used when lines have tab-aligned segments with explicit X positions.
 * Must match the DOM positioning used in segment-based rendering.
 *
 * @param block - The paragraph block containing runs
 * @param line - The line with segments
 * @param charOffset - Character offset from start of line
 * @param ctx - Canvas rendering context for text measurement
 * @returns X coordinate for the character
 */
function measureCharacterXSegmentBased(
  block: FlowBlock,
  line: Line,
  charOffset: number,
  ctx: CanvasRenderingContext2D,
): number {
  if (block.kind !== 'paragraph' || !line.segments) return 0;

  // Build a map of cumulative character offsets per run
  // to translate line-relative charOffset to run-relative offsets
  let lineCharCount = 0;

  for (const segment of line.segments) {
    const run = block.runs[segment.runIndex];
    if (!run) continue;

    const segmentChars = segment.toChar - segment.fromChar;

    // Check if target character is within this segment
    if (lineCharCount + segmentChars >= charOffset) {
      const offsetInSegment = charOffset - lineCharCount;

      // Get the base X position for this segment
      // If segment has explicit X (tab-aligned), use it
      // Otherwise, we'd need to calculate cumulative width up to this point
      let segmentBaseX = segment.x;

      if (segmentBaseX === undefined) {
        // Calculate cumulative X by measuring previous segments
        segmentBaseX = 0;
        for (const prevSeg of line.segments) {
          if (prevSeg === segment) break;
          const prevRun = block.runs[prevSeg.runIndex];
          if (!prevRun) continue;

          if (prevSeg.x !== undefined) {
            // If previous segment has explicit X, use its X + width as base
            segmentBaseX = prevSeg.x + (prevSeg.width ?? 0);
          } else {
            segmentBaseX += prevSeg.width ?? 0;
          }
        }
      }

      // Handle tab runs
      if (isTabRun(run)) {
        // Tab counts as 1 character, position is at segment start or end
        return segmentBaseX + (offsetInSegment > 0 ? (segment.width ?? 0) : 0);
      }

      // Handle ImageRun and LineBreakRun - images are atomic, use segment width
      if ('src' in run || run.kind === 'lineBreak') {
        return segmentBaseX + (offsetInSegment >= segmentChars ? (segment.width ?? 0) : 0);
      }

      // For text runs, measure up to the target character
      const text = run.text ?? '';
      const segmentText = text.slice(segment.fromChar, segment.toChar);
      const textUpToTarget = segmentText.slice(0, offsetInSegment);

      ctx.font = getRunFontString(run);
      const measured = ctx.measureText(textUpToTarget);
      const spacingWidth = computeLetterSpacingWidth(run, offsetInSegment, segmentChars);

      return segmentBaseX + measured.width + spacingWidth;
    }

    lineCharCount += segmentChars;
  }

  // Past end of line, return total width
  return line.width;
}

/**
 * Find the character offset and PM position at a given X coordinate within a line.
 * This is the inverse of measureCharacterX.
 *
 * @param block - The paragraph block containing the line
 * @param line - The line to search within
 * @param x - The X coordinate (in pixels) from the start of the line
 * @param pmStart - The ProseMirror position at the start of the line
 * @returns Object with charOffset (0-based from line start) and pmPosition
 */
export function findCharacterAtX(
  block: FlowBlock,
  line: Line,
  x: number,
  pmStart: number,
): { charOffset: number; pmPosition: number } {
  const ctx = getMeasurementContext();

  if (!ctx) {
    // Fallback to ratio-based calculation
    const runs = sliceRunsForLine(block, line);
    const charsInLine = Math.max(
      1,
      runs.reduce((sum, run) => {
        if (isTabRun(run)) return sum + TAB_CHAR_LENGTH;
        if ('src' in run || run.kind === 'lineBreak') return sum;
        return sum + (run.text ?? '').length;
      }, 0),
    );
    const ratio = Math.max(0, Math.min(1, x / line.width));
    const charOffset = Math.round(ratio * charsInLine);
    return {
      charOffset,
      pmPosition: pmStart + charOffset,
    };
  }

  const runs = sliceRunsForLine(block, line);
  const safeX = Math.max(0, Math.min(line.width, x));

  let currentX = 0;
  let currentCharOffset = 0;

  for (const run of runs) {
    if (isTabRun(run)) {
      const tabWidth = run.width ?? 0;
      const startX = currentX;
      const endX = currentX + tabWidth;
      if (safeX <= endX) {
        const midpoint = startX + tabWidth / 2;
        const offsetInRun = safeX < midpoint ? 0 : TAB_CHAR_LENGTH;
        const charOffset = currentCharOffset + offsetInRun;
        const pmBase = run.pmStart ?? pmStart + currentCharOffset;
        const pmPosition = pmBase + offsetInRun;
        return {
          charOffset,
          pmPosition,
        };
      }
      currentX = endX;
      currentCharOffset += TAB_CHAR_LENGTH;
      continue;
    }

    const text = 'src' in run || run.kind === 'lineBreak' ? '' : (run.text ?? '');
    const runLength = text.length;

    if (runLength === 0) continue;

    ctx.font = getRunFontString(run);

    // Measure each character in the run to find the closest boundary
    for (let i = 0; i <= runLength; i++) {
      const textUpToChar = text.slice(0, i);
      const measured = ctx.measureText(textUpToChar);
      const charX = currentX + measured.width + computeLetterSpacingWidth(run, i, runLength);

      // If we've passed the target X, return the previous character
      // or this one, whichever is closer
      if (charX >= safeX) {
        if (i === 0) {
          // First character, return this position
          return {
            charOffset: currentCharOffset,
            pmPosition: pmStart + currentCharOffset,
          };
        }

        // Check which boundary is closer
        const prevText = text.slice(0, i - 1);
        const prevMeasured = ctx.measureText(prevText);
        const prevX = currentX + prevMeasured.width + computeLetterSpacingWidth(run, i - 1, runLength);

        const distToPrev = Math.abs(safeX - prevX);
        const distToCurrent = Math.abs(safeX - charX);

        const charOffset = distToPrev < distToCurrent ? currentCharOffset + i - 1 : currentCharOffset + i;

        return {
          charOffset,
          pmPosition: pmStart + charOffset,
        };
      }
    }

    // Advance past this run
    const measured = ctx.measureText(text);
    currentX += measured.width + computeLetterSpacingWidth(run, runLength, runLength);
    currentCharOffset += runLength;
  }

  // If we're past all characters, return the end of the line
  return {
    charOffset: currentCharOffset,
    pmPosition: pmStart + currentCharOffset,
  };
}

const computeLetterSpacingWidth = (run: Run, precedingChars: number, runLength: number): number => {
  // Only text runs support letter spacing (older data may omit kind on text runs).
  if (isTabRun(run) || 'src' in run || !('letterSpacing' in run) || !run.letterSpacing) {
    return 0;
  }
  const maxGaps = Math.max(runLength - 1, 0);
  if (maxGaps === 0) {
    return 0;
  }
  const clamped = Math.min(Math.max(precedingChars, 0), maxGaps);
  return clamped * run.letterSpacing;
};
