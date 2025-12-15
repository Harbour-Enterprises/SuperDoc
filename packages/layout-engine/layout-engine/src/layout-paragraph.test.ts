import { describe, expect, it, vi } from 'vitest';
import type { ParagraphBlock, ParagraphMeasure, Line } from '@superdoc/contracts';
import { layoutParagraphBlock, type ParagraphLayoutContext } from './layout-paragraph.js';
import type { PageState } from './paginator.js';
import type { FloatingObjectManager } from './floating-objects.js';

/**
 * Helper to create a minimal line for testing.
 */
const makeLine = (width: number, lineHeight: number, maxWidth: number): Line => ({
  fromRun: 0,
  fromChar: 0,
  toRun: 0,
  toChar: 0,
  width,
  ascent: lineHeight * 0.8,
  descent: lineHeight * 0.2,
  lineHeight,
  maxWidth,
});

/**
 * Helper to create a minimal paragraph measure for testing.
 */
const makeMeasure = (
  lines: Array<{ width: number; lineHeight: number; maxWidth: number }>,
  marker?: {
    markerWidth?: number;
    markerTextWidth?: number;
    gutterWidth?: number;
  },
): ParagraphMeasure => ({
  kind: 'paragraph',
  lines: lines.map((l) => makeLine(l.width, l.lineHeight, l.maxWidth)),
  totalHeight: lines.reduce((sum, l) => sum + l.lineHeight, 0),
  marker,
});

/**
 * Helper to create a minimal page state for testing.
 */
const makePageState = (): PageState => ({
  page: {
    number: 1,
    fragments: [],
  },
  columnIndex: 0,
  cursorY: 50,
  topMargin: 50,
  contentBottom: 750,
  trailingSpacing: 0,
  lastParagraphStyleId: undefined,
});

/**
 * Helper to create a minimal floating object manager for testing.
 */
const makeFloatManager = (): FloatingObjectManager => ({
  registerDrawing: vi.fn(),
  computeAvailableWidth: vi.fn((lineY, lineHeight, columnWidth) => ({
    width: columnWidth,
    offsetX: 0,
  })),
  clear: vi.fn(),
  getDrawingsForPage: vi.fn(() => []),
});

describe('layoutParagraphBlock - remeasurement with list markers', () => {
  describe('standard hanging indent mode', () => {
    it('remeasures with firstLineIndent=0 when firstLineIndentMode is not set', () => {
      const remeasureParagraph = vi.fn((block, maxWidth, firstLineIndent) => {
        // Verify that firstLineIndent is 0 for standard hanging indent
        expect(firstLineIndent).toBe(0);
        return makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }]);
      });

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          wordLayout: {
            marker: {
              markerBoxWidthPx: 20,
            },
            // firstLineIndentMode is NOT set - this is standard hanging indent
          },
        },
      };

      const measure = makeMeasure(
        [{ width: 100, lineHeight: 20, maxWidth: 200 }], // Measured at wider width
        { markerWidth: 18, gutterWidth: 6 },
      );

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150, // Narrower than measurement width
        ensurePage: vi.fn(() => makePageState()),
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager: makeFloatManager(),
        remeasureParagraph,
      };

      layoutParagraphBlock(ctx);

      expect(remeasureParagraph).toHaveBeenCalledWith(block, 150, 0);
    });

    it('remeasures with firstLineIndent=0 when marker is missing in measure', () => {
      const remeasureParagraph = vi.fn((block, maxWidth, firstLineIndent) => {
        expect(firstLineIndent).toBe(0);
        return makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }]);
      });

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          wordLayout: {
            marker: {
              markerBoxWidthPx: 20,
            },
            firstLineIndentMode: true,
          },
        },
      };

      const measure = makeMeasure(
        [{ width: 100, lineHeight: 20, maxWidth: 200 }],
        // No marker in measure
      );

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150,
        ensurePage: vi.fn(() => makePageState()),
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager: makeFloatManager(),
        remeasureParagraph,
      };

      layoutParagraphBlock(ctx);

      expect(remeasureParagraph).toHaveBeenCalledWith(block, 150, 0);
    });
  });

  describe('firstLineIndentMode', () => {
    it('remeasures with correct firstLineIndent when marker is inline', () => {
      const remeasureParagraph = vi.fn((block, maxWidth, firstLineIndent) => {
        // Verify that firstLineIndent is markerWidth + gutterWidth
        expect(firstLineIndent).toBe(24); // 18 + 6
        return makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }]);
      });

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          wordLayout: {
            marker: {
              markerBoxWidthPx: 20,
            },
            firstLineIndentMode: true,
          },
        },
      };

      const measure = makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 200 }], { markerWidth: 18, gutterWidth: 6 });

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150,
        ensurePage: vi.fn(() => makePageState()),
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager: makeFloatManager(),
        remeasureParagraph,
      };

      layoutParagraphBlock(ctx);

      expect(remeasureParagraph).toHaveBeenCalledWith(block, 150, 24);
    });

    it('uses fallback to markerBoxWidthPx when markerWidth is missing', () => {
      const remeasureParagraph = vi.fn((block, maxWidth, firstLineIndent) => {
        // Should use markerBoxWidthPx (20) + gutterWidth (6)
        expect(firstLineIndent).toBe(26);
        return makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }]);
      });

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          wordLayout: {
            marker: {
              markerBoxWidthPx: 20,
            },
            firstLineIndentMode: true,
          },
        },
      };

      const measure = makeMeasure(
        [{ width: 100, lineHeight: 20, maxWidth: 200 }],
        { gutterWidth: 6 }, // markerWidth is missing
      );

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150,
        ensurePage: vi.fn(() => makePageState()),
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager: makeFloatManager(),
        remeasureParagraph,
      };

      layoutParagraphBlock(ctx);

      expect(remeasureParagraph).toHaveBeenCalledWith(block, 150, 26);
    });

    it('uses fallback to 0 when both markerWidth and markerBoxWidthPx are missing', () => {
      const remeasureParagraph = vi.fn((block, maxWidth, firstLineIndent) => {
        // Should use 0 + gutterWidth (6)
        expect(firstLineIndent).toBe(6);
        return makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }]);
      });

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          wordLayout: {
            marker: {
              // markerBoxWidthPx is missing
            },
            firstLineIndentMode: true,
          },
        },
      };

      const measure = makeMeasure(
        [{ width: 100, lineHeight: 20, maxWidth: 200 }],
        { gutterWidth: 6 }, // markerWidth is missing
      );

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150,
        ensurePage: vi.fn(() => makePageState()),
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager: makeFloatManager(),
        remeasureParagraph,
      };

      layoutParagraphBlock(ctx);

      expect(remeasureParagraph).toHaveBeenCalledWith(block, 150, 6);
    });
  });

  describe('input validation', () => {
    it('handles NaN marker width gracefully', () => {
      const remeasureParagraph = vi.fn((block, maxWidth, firstLineIndent) => {
        // NaN should be treated as 0
        expect(firstLineIndent).toBe(6); // 0 + 6
        return makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }]);
      });

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          wordLayout: {
            marker: {
              markerBoxWidthPx: 20,
            },
            firstLineIndentMode: true,
          },
        },
      };

      const measure = makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 200 }], {
        markerWidth: NaN,
        gutterWidth: 6,
      });

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150,
        ensurePage: vi.fn(() => makePageState()),
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager: makeFloatManager(),
        remeasureParagraph,
      };

      layoutParagraphBlock(ctx);

      expect(remeasureParagraph).toHaveBeenCalledWith(block, 150, 6);
    });

    it('handles Infinity marker width gracefully', () => {
      const remeasureParagraph = vi.fn((block, maxWidth, firstLineIndent) => {
        // Infinity should be treated as 0
        expect(firstLineIndent).toBe(6); // 0 + 6
        return makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }]);
      });

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          wordLayout: {
            marker: {
              markerBoxWidthPx: 20,
            },
            firstLineIndentMode: true,
          },
        },
      };

      const measure = makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 200 }], {
        markerWidth: Infinity,
        gutterWidth: 6,
      });

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150,
        ensurePage: vi.fn(() => makePageState()),
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager: makeFloatManager(),
        remeasureParagraph,
      };

      layoutParagraphBlock(ctx);

      expect(remeasureParagraph).toHaveBeenCalledWith(block, 150, 6);
    });

    it('handles negative marker width gracefully', () => {
      const remeasureParagraph = vi.fn((block, maxWidth, firstLineIndent) => {
        // Negative values should be treated as 0
        expect(firstLineIndent).toBe(6); // 0 + 6
        return makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }]);
      });

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          wordLayout: {
            marker: {
              markerBoxWidthPx: 20,
            },
            firstLineIndentMode: true,
          },
        },
      };

      const measure = makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 200 }], {
        markerWidth: -10,
        gutterWidth: 6,
      });

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150,
        ensurePage: vi.fn(() => makePageState()),
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager: makeFloatManager(),
        remeasureParagraph,
      };

      layoutParagraphBlock(ctx);

      expect(remeasureParagraph).toHaveBeenCalledWith(block, 150, 6);
    });

    it('handles NaN gutter width gracefully', () => {
      const remeasureParagraph = vi.fn((block, maxWidth, firstLineIndent) => {
        // NaN gutter should be treated as 0
        expect(firstLineIndent).toBe(18); // 18 + 0
        return makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }]);
      });

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          wordLayout: {
            marker: {
              markerBoxWidthPx: 20,
            },
            firstLineIndentMode: true,
          },
        },
      };

      const measure = makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 200 }], {
        markerWidth: 18,
        gutterWidth: NaN,
      });

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150,
        ensurePage: vi.fn(() => makePageState()),
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager: makeFloatManager(),
        remeasureParagraph,
      };

      layoutParagraphBlock(ctx);

      expect(remeasureParagraph).toHaveBeenCalledWith(block, 150, 18);
    });

    it('handles negative gutter width gracefully', () => {
      const remeasureParagraph = vi.fn((block, maxWidth, firstLineIndent) => {
        // Negative gutter should be treated as 0
        expect(firstLineIndent).toBe(18); // 18 + 0
        return makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }]);
      });

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          wordLayout: {
            marker: {
              markerBoxWidthPx: 20,
            },
            firstLineIndentMode: true,
          },
        },
      };

      const measure = makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 200 }], {
        markerWidth: 18,
        gutterWidth: -5,
      });

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150,
        ensurePage: vi.fn(() => makePageState()),
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager: makeFloatManager(),
        remeasureParagraph,
      };

      layoutParagraphBlock(ctx);

      expect(remeasureParagraph).toHaveBeenCalledWith(block, 150, 18);
    });
  });

  describe('float remeasurement', () => {
    it('remeasures with correct firstLineIndent when narrower width is found due to floats', () => {
      const remeasureParagraph = vi.fn((block, maxWidth, firstLineIndent) => {
        if (maxWidth === 120) {
          // This is the float remeasurement - should include marker indent
          expect(firstLineIndent).toBe(24); // 18 + 6
        }
        return makeMeasure([{ width: 100, lineHeight: 20, maxWidth }]);
      });

      const floatManager = makeFloatManager();
      // Mock float manager to return narrower width
      floatManager.computeAvailableWidth = vi.fn(() => ({
        width: 120, // Narrower than column width
        offsetX: 10,
      }));

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          wordLayout: {
            marker: {
              markerBoxWidthPx: 20,
            },
            firstLineIndentMode: true,
          },
        },
      };

      const measure = makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }], { markerWidth: 18, gutterWidth: 6 });

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150,
        ensurePage: vi.fn(() => makePageState()),
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager,
        remeasureParagraph,
      };

      layoutParagraphBlock(ctx);

      expect(remeasureParagraph).toHaveBeenCalledWith(block, 120, 24);
    });
  });
});
