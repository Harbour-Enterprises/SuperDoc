import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('./index.js', () => ({
  measureBreakAtPageIndex: vi.fn(),
  extendBreakPositionWithSectionMarkers: vi.fn((_doc, pos) => pos),
  safeCoordsAtPos: vi.fn(() => ({ top: 0, bottom: 0 })),
  findFallbackTableOverflow: vi.fn(),
}));

import * as calculateModule from './calculate-page-breaks.js';
import { measureBreakAtPageIndex, findFallbackTableOverflow } from './index.js';

const { calculatePageBreaks } = calculateModule;

const createMeasurementEditor = () => ({
  view: {
    state: {
      doc: {
        content: {
          size: 100,
        },
        descendants: (callback) => {
          callback(
            {
              type: { name: 'doc' },
              nodeSize: 100,
              isBlock: true,
            },
            0,
          );
        },
      },
    },
  },
});

describe('calculatePageBreaks - forced break preservation', () => {
  let rowOverflowSpy;

  beforeEach(() => {
    measureBreakAtPageIndex.mockReset();
    findFallbackTableOverflow.mockReset();
    if (rowOverflowSpy) {
      rowOverflowSpy.mockRestore();
    }
    rowOverflowSpy = vi.spyOn(calculateModule, 'findTableRowOverflow').mockReturnValue(null);
  });

  afterEach(() => {
    rowOverflowSpy?.mockRestore();
    rowOverflowSpy = undefined;
  });

  it('keeps the forced break when the measurement already has an overflow node type', () => {
    const editor = createMeasurementEditor();

    measureBreakAtPageIndex.mockReturnValueOnce({
      break: { pos: 40, bottom: 0 },
      rowBreaks: null,
      overflowBlock: { pos: 35, node: { type: { name: 'hardBreak' } }, rect: null },
      boundary: { usableHeightPx: 720 },
    });

    measureBreakAtPageIndex.mockReturnValueOnce(null);

    findFallbackTableOverflow.mockReturnValue({
      breakPoint: { pos: 80, bottom: 0 },
      overflowBlock: { node: { type: { name: 'table' } }, pos: 70, rect: null },
    });

    const breaks = calculatePageBreaks(editor);

    expect(findFallbackTableOverflow).not.toHaveBeenCalled();
    expect(breaks).toHaveLength(1);
    expect(breaks[0].break.pos).toBe(40);
    expect(breaks[0].overflow.nodeType).toBe('hardBreak');
  });

  it('uses the fallback table overflow when the measurement lacks an overflow node type', () => {
    const editor = createMeasurementEditor();

    measureBreakAtPageIndex.mockReturnValueOnce({
      break: { pos: 40, bottom: 0 },
      rowBreaks: null,
      overflowBlock: { pos: 35, node: null, rect: null },
      boundary: { usableHeightPx: 720 },
    });

    measureBreakAtPageIndex.mockReturnValueOnce(null);

    findFallbackTableOverflow.mockReturnValue({
      breakPoint: { pos: 80, bottom: 0 },
      overflowBlock: { node: { type: { name: 'table' } }, pos: 70, rect: null },
    });

    const breaks = calculatePageBreaks(editor);

    expect(findFallbackTableOverflow).toHaveBeenCalledTimes(1);
    expect(breaks).toHaveLength(1);
    expect(breaks[0].break.pos).toBe(80);
    expect(breaks[0].overflow.nodeType).toBe('table');
  });
});
