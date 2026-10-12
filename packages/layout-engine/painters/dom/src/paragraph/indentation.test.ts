import { describe, expect, it } from 'vite-plus/test';
import type { Line } from '@superdoc/contracts';
import { resolveAvailableWidthForLine } from './indentation.js';

describe('list first-line available width', () => {
  it.each([158, 58, undefined])('preserves measured width %s when the suffix tab precedes the indent', (maxWidth) => {
    const line: Line = {
      fromRun: 0,
      fromChar: 0,
      toRun: 0,
      toChar: 14,
      width: 48,
      ascent: 12,
      descent: 4,
      lineHeight: 20,
      maxWidth,
      segments: [{ runIndex: 0, fromChar: 0, toChar: 14, width: 48, x: maxWidth === 58 ? 100 : 0 }],
    };
    expect(
      resolveAvailableWidthForLine({
        containerWidth: 200,
        line,
        indentLeftPx: 90,
        indentRightPx: 0,
        firstLineOffset: -66,
        isFirstLine: true,
        isListFirstLine: true,
        resolvedListTextStartPx: 42,
      }),
    ).toBe(maxWidth ?? 158);
  });
});
