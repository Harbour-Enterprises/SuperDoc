import type { Line, ParagraphBlock, ParagraphMeasure } from '@superdoc/contracts';

export function normalizeLines(measure: ParagraphMeasure): ParagraphMeasure['lines'] {
  if (measure.lines.length > 0) {
    return measure.lines;
  }
  return [
    {
      fromRun: 0,
      fromChar: 0,
      toRun: 0,
      toChar: 0,
      width: 0,
      ascent: 0,
      descent: 0,
      lineHeight: measure.totalHeight || 0,
    },
  ];
}

export function sliceLines(
  lines: ParagraphMeasure['lines'],
  startIndex: number,
  availableHeight: number,
): { toLine: number; height: number } {
  let height = 0;
  let index = startIndex;

  while (index < lines.length) {
    const lineHeight = lines[index].lineHeight || 0;
    if (height > 0 && height + lineHeight > availableHeight) {
      break;
    }
    height += lineHeight;
    index += 1;
  }

  if (index === startIndex) {
    height = lines[startIndex].lineHeight || 0;
    index += 1;
  }

  return {
    toLine: index,
    height,
  };
}

export type LinePmRange = { pmStart?: number; pmEnd?: number };

export const computeFragmentPmRange = (
  block: ParagraphBlock,
  lines: ParagraphMeasure['lines'],
  fromLine: number,
  toLine: number,
): LinePmRange => {
  let pmStart: number | undefined;
  let pmEnd: number | undefined;

  for (let index = fromLine; index < toLine; index += 1) {
    const range = computeLinePmRange(block, lines[index]);
    if (range.pmStart != null && pmStart == null) {
      pmStart = range.pmStart;
    }
    if (range.pmEnd != null) {
      pmEnd = range.pmEnd;
    }
  }

  return { pmStart, pmEnd };
};

/**
 * Computes the ProseMirror position range for a single line within a paragraph block.
 *
 * This function calculates the absolute ProseMirror positions (pmStart/pmEnd) that correspond
 * to the content of a specific line. It handles different run types (text, images) and accounts
 * for line breaks across multiple runs.
 *
 * **Critical Fix for Stale pmEnd Values:**
 * This implementation calculates the effective pmEnd from the run's text length rather than
 * using the potentially stale pmEnd stored on the run. When ProseMirror transactions modify
 * text content (e.g., during typing in tables), the run's pmEnd can become outdated, leading
 * to content truncation. By computing pmEnd as `pmStart + text.length`, we ensure accuracy
 * based on the current text content.
 *
 * **Run Type Handling:**
 * - **Text runs**: Position is calculated from pmStart + character offsets (fromChar/toChar).
 *   The effective pmEnd is derived from text length to handle stale values.
 * - **Image runs**: Treated as single units (length = 1). Uses the run's pmStart/pmEnd directly
 *   since images don't have character-level granularity.
 * - **Other runs**: Handled via type assertion to extract text and PM positions.
 *
 * @param block - The paragraph block containing the runs
 * @param line - The line descriptor with fromRun/toRun and fromChar/toChar offsets
 * @returns Object containing pmStart (inclusive) and pmEnd (exclusive) positions, or undefined values if positions cannot be determined
 *
 * @example
 * ```typescript
 * const line = { fromRun: 0, fromChar: 5, toRun: 1, toChar: 10, ... };
 * const range = computeLinePmRange(paragraphBlock, line);
 * // range: { pmStart: 15, pmEnd: 35 }
 * ```
 */
export const computeLinePmRange = (block: ParagraphBlock, line: Line): LinePmRange => {
  let pmStart: number | undefined;
  let pmEnd: number | undefined;

  for (let runIndex = line.fromRun; runIndex <= line.toRun; runIndex += 1) {
    const run = block.runs[runIndex];
    if (!run) continue;

    // FIXED: ImageRun handling - images are treated as single units (length = 1)
    if (run.kind === 'image') {
      const runPmStart = run.pmStart ?? undefined;
      const runPmEnd = run.pmEnd ?? undefined;

      if (runPmStart == null || runPmEnd == null) {
        continue;
      }

      if (pmStart == null) {
        pmStart = runPmStart;
      }
      pmEnd = runPmEnd;
      continue;
    }

    // Type assertion: runs should have text and PM positions
    const runWithPm = run as { text?: string; pmStart?: number; pmEnd?: number };
    const text = runWithPm.text ?? '';
    const runLength = text.length;
    const runPmStart = runWithPm.pmStart != null ? runWithPm.pmStart : undefined;

    // FIX: Always calculate effectivePmEnd from text length, not from potentially stale pmEnd.
    // The run's pmEnd can become stale after PM transactions modify text content,
    // causing content truncation when Math.min caps the range.
    // Text length is the source of truth for PM position calculations.
    const effectivePmEnd = runPmStart != null ? runPmStart + runLength : undefined;

    if (runPmStart == null || effectivePmEnd == null) {
      continue;
    }

    const isFirstRun = runIndex === line.fromRun;
    const isLastRun = runIndex === line.toRun;
    const startOffset = isFirstRun ? line.fromChar : 0;
    const endOffset = isLastRun ? line.toChar : runLength;

    const sliceStart = runPmStart + startOffset;
    // FIX: Removed Math.min cap that was causing truncation with stale pmEnd values.
    // Since effectivePmEnd is now calculated from text length, runPmStart + endOffset
    // should always be <= effectivePmEnd (endOffset comes from line.toChar which is
    // bounded by runLength).
    const sliceEnd = runPmStart + endOffset;

    if (pmStart == null) {
      pmStart = sliceStart;
    }
    pmEnd = sliceEnd;
  }

  return { pmStart, pmEnd };
};

export const extractBlockPmRange = (block: { attrs?: Record<string, unknown> } | null | undefined): LinePmRange => {
  if (!block || !block.attrs) {
    return {};
  }
  const attrs = block.attrs as Record<string, unknown>;
  const start = typeof attrs.pmStart === 'number' ? attrs.pmStart : undefined;
  const end = typeof attrs.pmEnd === 'number' ? attrs.pmEnd : undefined;
  return {
    pmStart: start,
    pmEnd: end ?? (start != null ? start + 1 : undefined),
  };
};
