import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./index.js', () => ({
  measureBreakAtPageIndex: vi.fn(),
  extendBreakPositionWithSectionMarkers: vi.fn((_doc, pos) => pos),
  safeCoordsAtPos: vi.fn(() => ({ top: 0, bottom: 0 })),
  findFallbackTableOverflow: vi.fn(() => null),
}));

import { measureBreakAtPageIndex } from './index.js';
import { calculatePageBreaks } from './calculate-page-breaks.js';

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
              type: { name: 'paragraph' },
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

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('calculatePageBreaks', () => {
  it('applies header/footer heights to margin calculations and annotates sections', () => {
    const editor = createMeasurementEditor();

    measureBreakAtPageIndex
      .mockReturnValueOnce({
        break: { pos: 60 },
        rowBreaks: null,
        overflowBlock: { pos: 59, node: { type: { name: 'paragraph' } } },
        boundary: { usableHeightPx: 700 },
      })
      .mockReturnValueOnce({
        break: { pos: 100 },
        rowBreaks: null,
        overflowBlock: { pos: 99, node: { type: { name: 'paragraph' } } },
        boundary: { usableHeightPx: 700 },
      });

    const resolveHeaderFooter = vi.fn((pageIndex) => {
      if (pageIndex === 0) {
        return {
          header: {
            id: 'hdr-default',
            metrics: { contentHeightPx: 120, distancePx: 72, effectiveHeightPx: 192 },
            heightPx: 192,
          },
          footer: {
            id: 'ftr-default',
            metrics: { contentHeightPx: 80, distancePx: 72, effectiveHeightPx: 152 },
            heightPx: 152,
          },
        };
      }
      return {
        header: {
          id: 'hdr-even',
          metrics: { contentHeightPx: 90, distancePx: 72, effectiveHeightPx: 162 },
          heightPx: 162,
        },
        footer: {
          id: 'ftr-default',
          metrics: { contentHeightPx: 80, distancePx: 72, effectiveHeightPx: 152 },
          heightPx: 152,
        },
      };
    });

    const breaks = calculatePageBreaks(editor, {
      pageHeightPx: 900,
      marginsPx: { top: 72, bottom: 72 },
      resolveHeaderFooter,
    });

    expect(measureBreakAtPageIndex).toHaveBeenNthCalledWith(
      1,
      editor.view,
      0,
      expect.objectContaining({
        marginsPx: expect.objectContaining({ top: 192, bottom: 152 }),
      }),
    );

    expect(measureBreakAtPageIndex).toHaveBeenNthCalledWith(
      2,
      editor.view,
      1,
      expect.objectContaining({
        marginsPx: expect.objectContaining({ top: 162, bottom: 152 }),
      }),
    );

    expect(resolveHeaderFooter).toHaveBeenLastCalledWith(1, { isLastPage: true });
    expect(breaks).toHaveLength(2);
    expect(breaks[0].sections.header.id).toBe('hdr-default');
    expect(breaks[0].sections.header.metrics.effectiveHeightPx).toBe(192);
    expect(breaks[1].sections.header.id).toBe('hdr-even');
  });
});
