import {
  computeFragmentPmRange as computeFragmentPmRangeUnified,
  computeLinePmRange as computeLinePmRangeUnified,
} from '@superdoc/contracts';
import type { Line, ParagraphBlock, ParagraphMeasure, LinePmRange } from '@superdoc/contracts';

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

export type { LinePmRange };

export const computeFragmentPmRange = (
  block: ParagraphBlock,
  lines: ParagraphMeasure['lines'],
  fromLine: number,
  toLine: number,
): LinePmRange => computeFragmentPmRangeUnified(block, lines, fromLine, toLine);

export const computeLinePmRange = (block: ParagraphBlock, line: Line): LinePmRange =>
  computeLinePmRangeUnified(block, line);

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
