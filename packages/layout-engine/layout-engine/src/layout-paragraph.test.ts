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

describe('layoutParagraphBlock - contextualSpacing', () => {
  describe('same-style paragraphs', () => {
    it('suppresses spacingBefore when same-style paragraphs are adjacent', () => {
      const pageState = makePageState();
      pageState.lastParagraphStyleId = 'Heading1';
      pageState.trailingSpacing = 20;
      pageState.cursorY = 100;

      const ensurePage = vi.fn(() => pageState);

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          styleId: 'Heading1',
          contextualSpacing: true,
          spacing: {
            before: 30,
            after: 20,
          },
        },
      };

      const measure = makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }]);

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150,
        ensurePage,
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager: makeFloatManager(),
      };

      layoutParagraphBlock(ctx);

      // When contextualSpacing is active and styles match:
      // 1. spacingBefore (30) is zeroed
      // 2. prevTrailing (20) is undone (cursorY -= 20)
      // 3. Line height (20) is added
      // 4. spacingAfter (20) is added at the end
      // Result: 100 - 20 + 20 + 20 = 120
      expect(pageState.cursorY).toBe(120);
    });

    it('undoes previous paragraph trailing spacing when contextualSpacing is active', () => {
      const pageState = makePageState();
      pageState.lastParagraphStyleId = 'Normal';
      pageState.trailingSpacing = 15;
      pageState.cursorY = 100;

      const ensurePage = vi.fn(() => pageState);

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          styleId: 'Normal',
          contextualSpacing: true,
          spacing: {
            before: 10,
            after: 10,
          },
        },
      };

      const measure = makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }]);

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150,
        ensurePage,
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager: makeFloatManager(),
      };

      layoutParagraphBlock(ctx);

      // When contextualSpacing is active and styles match:
      // 1. spacingBefore (10) is zeroed
      // 2. prevTrailing (15) is undone (cursorY -= 15)
      // 3. Line height (20) is added
      // 4. spacingAfter (10) is added at the end
      // Result: 100 - 15 + 20 + 10 = 115
      expect(pageState.cursorY).toBe(115);
      expect(pageState.trailingSpacing).toBe(10);
    });

    it('handles contextualSpacing when trailingSpacing is 0', () => {
      const pageState = makePageState();
      pageState.lastParagraphStyleId = 'Normal';
      pageState.trailingSpacing = 0;
      pageState.cursorY = 100;

      const ensurePage = vi.fn(() => pageState);

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          styleId: 'Normal',
          contextualSpacing: true,
          spacing: {
            before: 10,
            after: 10,
          },
        },
      };

      const measure = makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }]);

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150,
        ensurePage,
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager: makeFloatManager(),
      };

      layoutParagraphBlock(ctx);

      // When contextualSpacing is active and styles match:
      // 1. spacingBefore (10) is zeroed
      // 2. prevTrailing (0) is undone (no change)
      // 3. Line height (20) is added
      // 4. spacingAfter (10) is added at the end
      // Result: 100 + 20 + 10 = 130
      expect(pageState.cursorY).toBe(130);
      expect(pageState.trailingSpacing).toBe(10);
    });

    it('handles contextualSpacing when trailingSpacing is null', () => {
      const pageState = makePageState();
      pageState.lastParagraphStyleId = 'Normal';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (pageState.trailingSpacing as any) = null;
      pageState.cursorY = 100;

      const ensurePage = vi.fn(() => pageState);

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          styleId: 'Normal',
          contextualSpacing: true,
          spacing: {
            before: 10,
            after: 10,
          },
        },
      };

      const measure = makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }]);

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150,
        ensurePage,
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager: makeFloatManager(),
      };

      layoutParagraphBlock(ctx);

      // null trailingSpacing is treated as 0
      // Result: 100 + 20 + 10 = 130
      expect(pageState.cursorY).toBe(130);
    });

    it('handles contextualSpacing when trailingSpacing is undefined', () => {
      const pageState = makePageState();
      pageState.lastParagraphStyleId = 'Normal';
      pageState.trailingSpacing = undefined;
      pageState.cursorY = 100;

      const ensurePage = vi.fn(() => pageState);

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          styleId: 'Normal',
          contextualSpacing: true,
          spacing: {
            before: 10,
            after: 10,
          },
        },
      };

      const measure = makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }]);

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150,
        ensurePage,
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager: makeFloatManager(),
      };

      layoutParagraphBlock(ctx);

      // undefined trailingSpacing is treated as 0
      // Result: 100 + 20 + 10 = 130
      expect(pageState.cursorY).toBe(130);
    });
  });

  describe('different-style paragraphs', () => {
    it('does not apply contextualSpacing when style IDs differ', () => {
      const pageState = makePageState();
      pageState.lastParagraphStyleId = 'Heading1';
      pageState.trailingSpacing = 20;
      pageState.cursorY = 100;

      const ensurePage = vi.fn(() => pageState);

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          styleId: 'Normal',
          contextualSpacing: true,
          spacing: {
            before: 30,
            after: 20,
          },
        },
      };

      const measure = makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }]);

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150,
        ensurePage,
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager: makeFloatManager(),
      };

      layoutParagraphBlock(ctx);

      // Different styles: contextualSpacing should NOT suppress spacing
      // Normal spacing collapse applies:
      // 1. prevTrailing (20) remains in trailingSpacing (will be collapsed)
      // 2. spacingBefore (30) - prevTrailing (20) = 10 additional spacing
      // 3. Line height (20) is added
      // 4. spacingAfter (20) is added at the end
      // Result: 100 + 10 + 20 + 20 = 150
      expect(pageState.cursorY).toBe(150);
    });

    it('does not apply contextualSpacing when lastParagraphStyleId is undefined', () => {
      const pageState = makePageState();
      pageState.lastParagraphStyleId = undefined;
      pageState.trailingSpacing = 20;
      pageState.cursorY = 100;

      const ensurePage = vi.fn(() => pageState);

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          styleId: 'Normal',
          contextualSpacing: true,
          spacing: {
            before: 30,
            after: 20,
          },
        },
      };

      const measure = makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }]);

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150,
        ensurePage,
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager: makeFloatManager(),
      };

      layoutParagraphBlock(ctx);

      // No lastParagraphStyleId: contextualSpacing should NOT apply
      // Normal spacing collapse applies
      // Result: 100 + 10 + 20 + 20 = 150
      expect(pageState.cursorY).toBe(150);
    });

    it('does not apply contextualSpacing when current styleId is undefined', () => {
      const pageState = makePageState();
      pageState.lastParagraphStyleId = 'Normal';
      pageState.trailingSpacing = 20;
      pageState.cursorY = 100;

      const ensurePage = vi.fn(() => pageState);

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          // styleId is undefined
          contextualSpacing: true,
          spacing: {
            before: 30,
            after: 20,
          },
        },
      };

      const measure = makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }]);

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150,
        ensurePage,
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager: makeFloatManager(),
      };

      layoutParagraphBlock(ctx);

      // No current styleId: contextualSpacing should NOT apply
      // Normal spacing collapse applies
      // Result: 100 + 10 + 20 + 20 = 150
      expect(pageState.cursorY).toBe(150);
    });
  });

  describe('contextualSpacing disabled', () => {
    it('does not suppress spacing when contextualSpacing is false', () => {
      const pageState = makePageState();
      pageState.lastParagraphStyleId = 'Normal';
      pageState.trailingSpacing = 20;
      pageState.cursorY = 100;

      const ensurePage = vi.fn(() => pageState);

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          styleId: 'Normal',
          contextualSpacing: false,
          spacing: {
            before: 30,
            after: 20,
          },
        },
      };

      const measure = makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }]);

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150,
        ensurePage,
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager: makeFloatManager(),
      };

      layoutParagraphBlock(ctx);

      // contextualSpacing is false: normal spacing collapse should apply
      // Result: 100 + 10 + 20 + 20 = 150
      expect(pageState.cursorY).toBe(150);
    });

    it('does not suppress spacing when contextualSpacing is not set', () => {
      const pageState = makePageState();
      pageState.lastParagraphStyleId = 'Normal';
      pageState.trailingSpacing = 20;
      pageState.cursorY = 100;

      const ensurePage = vi.fn(() => pageState);

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          styleId: 'Normal',
          // contextualSpacing not set
          spacing: {
            before: 30,
            after: 20,
          },
        },
      };

      const measure = makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }]);

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150,
        ensurePage,
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager: makeFloatManager(),
      };

      layoutParagraphBlock(ctx);

      // contextualSpacing not set: normal spacing collapse should apply
      // Result: 100 + 10 + 20 + 20 = 150
      expect(pageState.cursorY).toBe(150);
    });
  });

  describe('edge cases', () => {
    it('handles NaN trailingSpacing gracefully', () => {
      const pageState = makePageState();
      pageState.lastParagraphStyleId = 'Normal';
      pageState.trailingSpacing = NaN;
      pageState.cursorY = 100;

      const ensurePage = vi.fn(() => pageState);

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          styleId: 'Normal',
          contextualSpacing: true,
          spacing: {
            before: 10,
            after: 10,
          },
        },
      };

      const measure = makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }]);

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150,
        ensurePage,
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager: makeFloatManager(),
      };

      layoutParagraphBlock(ctx);

      // NaN should be treated as 0
      // Result: 100 + 20 + 10 = 130
      expect(pageState.cursorY).toBe(130);
    });

    it('handles Infinity trailingSpacing gracefully', () => {
      const pageState = makePageState();
      pageState.lastParagraphStyleId = 'Normal';
      pageState.trailingSpacing = Infinity;
      pageState.cursorY = 100;

      const ensurePage = vi.fn(() => pageState);

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          styleId: 'Normal',
          contextualSpacing: true,
          spacing: {
            before: 10,
            after: 10,
          },
        },
      };

      const measure = makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }]);

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150,
        ensurePage,
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager: makeFloatManager(),
      };

      layoutParagraphBlock(ctx);

      // Infinity should be treated as 0
      // Result: 100 + 20 + 10 = 130
      expect(pageState.cursorY).toBe(130);
    });

    it('handles negative trailingSpacing gracefully', () => {
      const pageState = makePageState();
      pageState.lastParagraphStyleId = 'Normal';
      pageState.trailingSpacing = -10;
      pageState.cursorY = 100;

      const ensurePage = vi.fn(() => pageState);

      const block: ParagraphBlock = {
        kind: 'paragraph',
        id: 'test-block',
        runs: [{ text: 'Test', fontFamily: 'Arial', fontSize: 12 }],
        attrs: {
          styleId: 'Normal',
          contextualSpacing: true,
          spacing: {
            before: 10,
            after: 10,
          },
        },
      };

      const measure = makeMeasure([{ width: 100, lineHeight: 20, maxWidth: 150 }]);

      const ctx: ParagraphLayoutContext = {
        block,
        measure,
        columnWidth: 150,
        ensurePage,
        advanceColumn: vi.fn((state) => state),
        columnX: vi.fn(() => 50),
        floatManager: makeFloatManager(),
      };

      layoutParagraphBlock(ctx);

      // Negative should be treated as 0
      // Result: 100 + 20 + 10 = 130
      expect(pageState.cursorY).toBe(130);
    });
  });
});
