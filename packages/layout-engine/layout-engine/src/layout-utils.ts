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

export const computeLinePmRange = (block: ParagraphBlock, line: Line): LinePmRange => {
  let pmStart: number | undefined;
  let pmEnd: number | undefined;

  for (let runIndex = line.fromRun; runIndex <= line.toRun; runIndex += 1) {
    const run = block.runs[runIndex];
    if (!run) continue;

    // Type assertion: runs should have text and PM positions
    const runWithPm = run as { text?: string; pmStart?: number; pmEnd?: number };
    const text = runWithPm.text ?? '';
    const runLength = text.length;
    const runPmStart = runWithPm.pmStart != null ? runWithPm.pmStart : undefined;
    const effectivePmEnd =
      runWithPm.pmEnd != null ? runWithPm.pmEnd : runPmStart != null ? runPmStart + runLength : undefined;

    if (runPmStart == null || effectivePmEnd == null) {
      continue;
    }

    const isFirstRun = runIndex === line.fromRun;
    const isLastRun = runIndex === line.toRun;
    const startOffset = isFirstRun ? line.fromChar : 0;
    const endOffset = isLastRun ? line.toChar : runLength;

    const sliceStart = runPmStart + startOffset;
    const sliceEnd = Math.min(runPmStart + endOffset, effectivePmEnd);

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
