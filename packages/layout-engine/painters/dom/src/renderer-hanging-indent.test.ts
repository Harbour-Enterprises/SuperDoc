/**
 * Tests for hanging indent + tabs alignment in DomPainter
 *
 * Tests the special handling of paragraphs that have both:
 * 1. Hanging indents (w:ind w:left="X" w:hanging="Y")
 * 2. Tab characters (which create segments with explicit X positioning)
 *
 * The core issue: When segments have explicit X positions (from tabs), they use
 * absolute positioning and are NOT affected by CSS textIndent. Therefore, we must
 * adjust paddingLeft instead of using textIndent for proper alignment.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createDomPainter } from './index.js';
import type { FlowBlock, Measure, Layout, Line } from '@superdoc/contracts';

describe('DomPainter hanging indent with tabs', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  /**
   * Helper to create a block with specified indent values
   *
   * @param blockId - Unique block identifier
   * @param text - Text content for the paragraph
   * @param indent - Indent configuration
   * @returns FlowBlock with indent attributes
   */
  function createBlockWithIndent(
    blockId: string,
    text: string,
    indent: { left?: number; right?: number; firstLine?: number; hanging?: number },
  ): FlowBlock {
    return {
      kind: 'paragraph',
      id: blockId,
      runs: [{ text, fontFamily: 'Arial', fontSize: 12, pmStart: 0, pmEnd: text.length }],
      attrs: {
        indent,
      },
    };
  }

  /**
   * Helper to create a measure with optional explicit segment positioning
   *
   * @param textLength - Length of text
   * @param hasExplicitPositioning - Whether segments should have explicit X positions (simulating tabs)
   * @returns Measure with appropriate line configuration
   */
  function createMeasure(textLength: number, hasExplicitPositioning: boolean): Measure {
    const line: Line = {
      fromRun: 0,
      fromChar: 0,
      toRun: 0,
      toChar: textLength,
      width: 200,
      ascent: 12,
      descent: 4,
      lineHeight: 20,
    };

    if (hasExplicitPositioning) {
      // Simulate tab segments with explicit X positioning
      line.segments = [
        { runIndex: 0, fromChar: 0, toChar: 5, width: 50, x: 0 },
        { runIndex: 0, fromChar: 5, toChar: textLength, width: 150, x: 144 },
      ];
    }

    return {
      kind: 'paragraph',
      lines: [line],
      totalHeight: 20,
    };
  }

  /**
   * Helper to create a multi-line measure
   *
   * @param firstLineHasSegments - Whether first line has explicit positioning
   * @returns Measure with two lines
   */
  function createMultiLineMeasure(firstLineHasSegments: boolean): Measure {
    const firstLine: Line = {
      fromRun: 0,
      fromChar: 0,
      toRun: 0,
      toChar: 10,
      width: 200,
      ascent: 12,
      descent: 4,
      lineHeight: 20,
    };

    if (firstLineHasSegments) {
      firstLine.segments = [
        { runIndex: 0, fromChar: 0, toChar: 5, width: 50, x: 0 },
        { runIndex: 0, fromChar: 5, toChar: 10, width: 150, x: 144 },
      ];
    }

    const secondLine: Line = {
      fromRun: 0,
      fromChar: 10,
      toRun: 0,
      toChar: 20,
      width: 200,
      ascent: 12,
      descent: 4,
      lineHeight: 20,
    };

    return {
      kind: 'paragraph',
      lines: [firstLine, secondLine],
      totalHeight: 40,
    };
  }

  /**
   * Helper to create layout for a paragraph
   *
   * @param blockId - Block identifier
   * @param pmEnd - End position in paragraph model
   * @param continuesFromPrev - Whether fragment continues from previous page
   * @returns Layout configuration
   */
  function createLayout(blockId: string, pmEnd: number, continuesFromPrev = false): Layout {
    return {
      pageSize: { w: 400, h: 500 },
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId,
              fromLine: 0,
              toLine: 1,
              x: 30,
              y: 40,
              width: 300,
              pmStart: 0,
              pmEnd,
              continuesFromPrev,
            },
          ],
        },
      ],
    };
  }

  describe('First line with hanging indent AND tabs', () => {
    it('should adjust paddingLeft and skip textIndent when segments have explicit X positions', () => {
      const blockId = 'hanging-with-tabs';
      const block = createBlockWithIndent(blockId, 'Text\twith tab', {
        left: 360,
        hanging: 360,
      });
      const measure = createMeasure(13, true); // true = has explicit positioning
      const layout = createLayout(blockId, 13);

      const painter = createDomPainter({ blocks: [block], measures: [measure], container });
      painter.paint(layout, container);

      const lineEl = container.querySelector('.superdoc-line') as HTMLElement;
      expect(lineEl).toBeTruthy();

      // paddingLeft should be adjusted: left - hanging = 360 - 360 = 0
      expect(lineEl.style.paddingLeft).toBe('0px');

      // textIndent should NOT be applied (segments are absolutely positioned)
      expect(lineEl.style.textIndent).toBe('');
    });

    it('should handle non-zero adjusted padding (left > hanging)', () => {
      const blockId = 'partial-hanging-tabs';
      const block = createBlockWithIndent(blockId, 'Text\twith tab', {
        left: 720,
        hanging: 360,
      });
      const measure = createMeasure(13, true);
      const layout = createLayout(blockId, 13);

      const painter = createDomPainter({ blocks: [block], measures: [measure], container });
      painter.paint(layout, container);

      const lineEl = container.querySelector('.superdoc-line') as HTMLElement;
      expect(lineEl).toBeTruthy();

      // paddingLeft should be: 720 - 360 = 360
      expect(lineEl.style.paddingLeft).toBe('360px');

      // textIndent should NOT be applied
      expect(lineEl.style.textIndent).toBe('');
    });

    it('should handle edge case where hanging equals left indent', () => {
      const blockId = 'equal-hanging-tabs';
      const block = createBlockWithIndent(blockId, 'Tab\there', {
        left: 144,
        hanging: 144,
      });
      const measure = createMeasure(8, true);
      const layout = createLayout(blockId, 8);

      const painter = createDomPainter({ blocks: [block], measures: [measure], container });
      painter.paint(layout, container);

      const lineEl = container.querySelector('.superdoc-line') as HTMLElement;
      expect(lineEl).toBeTruthy();

      // paddingLeft should be 0 when left equals hanging
      expect(lineEl.style.paddingLeft).toBe('0px');
      expect(lineEl.style.textIndent).toBe('');
    });
  });

  describe('Hanging indent WITHOUT tabs (normal behavior)', () => {
    it('should use normal paddingLeft and textIndent when no explicit positioning', () => {
      const blockId = 'hanging-no-tabs';
      const block = createBlockWithIndent(blockId, 'Text without tabs', {
        left: 360,
        hanging: 360,
      });
      const measure = createMeasure(17, false); // false = no explicit positioning
      const layout = createLayout(blockId, 17);

      const painter = createDomPainter({ blocks: [block], measures: [measure], container });
      painter.paint(layout, container);

      const lineEl = container.querySelector('.superdoc-line') as HTMLElement;
      expect(lineEl).toBeTruthy();

      // Normal behavior: full paddingLeft
      expect(lineEl.style.paddingLeft).toBe('360px');

      // textIndent should be negative hanging: firstLine(0) - hanging(360) = -360
      expect(lineEl.style.textIndent).toBe('-360px');
    });

    it('should handle partial hanging indent without tabs', () => {
      const blockId = 'partial-hanging-no-tabs';
      const block = createBlockWithIndent(blockId, 'Regular text', {
        left: 720,
        hanging: 360,
      });
      const measure = createMeasure(12, false);
      const layout = createLayout(blockId, 12);

      const painter = createDomPainter({ blocks: [block], measures: [measure], container });
      painter.paint(layout, container);

      const lineEl = container.querySelector('.superdoc-line') as HTMLElement;
      expect(lineEl).toBeTruthy();

      expect(lineEl.style.paddingLeft).toBe('720px');
      // textIndent = firstLine(0) - hanging(360) = -360
      expect(lineEl.style.textIndent).toBe('-360px');
    });
  });

  describe('Tabs WITHOUT hanging indent', () => {
    it('should use normal paddingLeft with tabs but no hanging', () => {
      const blockId = 'tabs-no-hanging';
      const block = createBlockWithIndent(blockId, 'Tab\there', {
        left: 360,
      });
      const measure = createMeasure(8, true); // Has tabs
      const layout = createLayout(blockId, 8);

      const painter = createDomPainter({ blocks: [block], measures: [measure], container });
      painter.paint(layout, container);

      const lineEl = container.querySelector('.superdoc-line') as HTMLElement;
      expect(lineEl).toBeTruthy();

      // No hanging, so normal paddingLeft
      expect(lineEl.style.paddingLeft).toBe('360px');

      // No textIndent because explicit positioning
      expect(lineEl.style.textIndent).toBe('');
    });

    it('should handle firstLine indent with tabs', () => {
      const blockId = 'tabs-with-firstline';
      const block = createBlockWithIndent(blockId, 'Tab\there', {
        left: 360,
        firstLine: 720,
      });
      const measure = createMeasure(8, true);
      const layout = createLayout(blockId, 8);

      const painter = createDomPainter({ blocks: [block], measures: [measure], container });
      painter.paint(layout, container);

      const lineEl = container.querySelector('.superdoc-line') as HTMLElement;
      expect(lineEl).toBeTruthy();

      // With explicit positioning, paddingLeft includes firstLine offset: 360 + 720 = 1080
      // This is because absolutely positioned segments are not affected by textIndent,
      // so we must incorporate the firstLine offset into paddingLeft instead.
      expect(lineEl.style.paddingLeft).toBe('1080px');

      // With explicit positioning, textIndent is skipped (it doesn't affect absolute positioning)
      expect(lineEl.style.textIndent).toBe('');
    });
  });

  describe('Continuation lines', () => {
    it('should not adjust padding for continuation lines even with hanging + tabs', () => {
      const blockId = 'continuation-line';
      const block = createBlockWithIndent(blockId, 'First line text continues here', {
        left: 360,
        hanging: 360,
      });
      const measure = createMultiLineMeasure(true); // First line has segments
      const layout: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'para',
                blockId,
                fromLine: 0,
                toLine: 2,
                x: 30,
                y: 40,
                width: 300,
                pmStart: 0,
                pmEnd: 20,
              },
            ],
          },
        ],
      };

      const painter = createDomPainter({ blocks: [block], measures: [measure], container });
      painter.paint(layout, container);

      const lines = container.querySelectorAll('.superdoc-line');
      expect(lines.length).toBe(2);

      const firstLine = lines[0] as HTMLElement;
      const secondLine = lines[1] as HTMLElement;

      // First line: adjusted padding
      expect(firstLine.style.paddingLeft).toBe('0px');

      // Second line: normal left indent (no adjustment)
      expect(secondLine.style.paddingLeft).toBe('360px');
      expect(secondLine.style.textIndent).toBe('0px');
    });

    it('should handle fragments that continue from previous page', () => {
      const blockId = 'continues-from-prev';
      const block = createBlockWithIndent(blockId, 'Text\twith tab', {
        left: 360,
        hanging: 360,
      });
      const measure = createMeasure(13, true);
      const layout = createLayout(blockId, 13, true); // continuesFromPrev = true

      const painter = createDomPainter({ blocks: [block], measures: [measure], container });
      painter.paint(layout, container);

      const lineEl = container.querySelector('.superdoc-line') as HTMLElement;
      expect(lineEl).toBeTruthy();

      // When continuing from previous page, it's not the "first line" of the paragraph
      // so should use normal left indent
      expect(lineEl.style.paddingLeft).toBe('360px');
      expect(lineEl.style.textIndent).toBe('0px');
    });
  });

  describe('Edge cases', () => {
    it('should handle zero hanging indent', () => {
      const blockId = 'zero-hanging';
      const block = createBlockWithIndent(blockId, 'Tab\there', {
        left: 360,
        hanging: 0,
      });
      const measure = createMeasure(8, true);
      const layout = createLayout(blockId, 8);

      const painter = createDomPainter({ blocks: [block], measures: [measure], container });
      painter.paint(layout, container);

      const lineEl = container.querySelector('.superdoc-line') as HTMLElement;
      expect(lineEl).toBeTruthy();

      // Zero hanging = normal behavior
      expect(lineEl.style.paddingLeft).toBe('360px');
      expect(lineEl.style.textIndent).toBe('');
    });

    it('should handle undefined indent', () => {
      const blockId = 'no-indent';
      const block: FlowBlock = {
        kind: 'paragraph',
        id: blockId,
        runs: [{ text: 'Tab\there', fontFamily: 'Arial', fontSize: 12, pmStart: 0, pmEnd: 8 }],
        // No attrs.indent
      };
      const measure = createMeasure(8, true);
      const layout = createLayout(blockId, 8);

      const painter = createDomPainter({ blocks: [block], measures: [measure], container });
      painter.paint(layout, container);

      const lineEl = container.querySelector('.superdoc-line') as HTMLElement;
      expect(lineEl).toBeTruthy();

      // No indent values = no padding styles set
      expect(lineEl.style.paddingLeft).toBe('');
      expect(lineEl.style.textIndent).toBe('');
    });

    it('should handle undefined left indent with hanging', () => {
      const blockId = 'hanging-no-left';
      const block = createBlockWithIndent(blockId, 'Text\twith tab', {
        hanging: 360,
      });
      const measure = createMeasure(13, true);
      const layout = createLayout(blockId, 13);

      const painter = createDomPainter({ blocks: [block], measures: [measure], container });
      painter.paint(layout, container);

      const lineEl = container.querySelector('.superdoc-line') as HTMLElement;
      expect(lineEl).toBeTruthy();

      // No left indent means the padding adjustment logic doesn't run
      expect(lineEl.style.paddingLeft).toBe('');
      expect(lineEl.style.textIndent).toBe('');
    });

    it('should handle mixed segments (some with X, some without)', () => {
      const blockId = 'mixed-segments';
      const block = createBlockWithIndent(blockId, 'Mixed segments', {
        left: 360,
        hanging: 360,
      });

      // Create measure with mixed segments
      const measure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 14,
            width: 200,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
            segments: [
              { runIndex: 0, fromChar: 0, toChar: 5, width: 50, x: 0 },
              { runIndex: 0, fromChar: 5, toChar: 10, width: 75 }, // No X
              { runIndex: 0, fromChar: 10, toChar: 14, width: 75, x: 200 },
            ],
          },
        ],
        totalHeight: 20,
      };

      const layout = createLayout(blockId, 14);

      const painter = createDomPainter({ blocks: [block], measures: [measure], container });
      painter.paint(layout, container);

      const lineEl = container.querySelector('.superdoc-line') as HTMLElement;
      expect(lineEl).toBeTruthy();

      // If ANY segment has explicit X, treat as explicit positioning
      expect(lineEl.style.paddingLeft).toBe('0px');
      expect(lineEl.style.textIndent).toBe('');
    });

    it('should handle negative hanging (should not occur in practice but test defensive code)', () => {
      const blockId = 'negative-hanging';
      const block = createBlockWithIndent(blockId, 'Tab\there', {
        left: 360,
        hanging: -100,
      });
      const measure = createMeasure(8, true);
      const layout = createLayout(blockId, 8);

      const painter = createDomPainter({ blocks: [block], measures: [measure], container });
      painter.paint(layout, container);

      const lineEl = container.querySelector('.superdoc-line') as HTMLElement;
      expect(lineEl).toBeTruthy();

      // Negative hanging (-100) behaves like positive firstLine (+100).
      // firstLineOffset = firstLine(0) - hanging(-100) = 100
      // With explicit positioning: paddingLeft = left(360) + firstLineOffset(100) = 460
      expect(lineEl.style.paddingLeft).toBe('460px');
    });

    it('should handle very large indent values', () => {
      const blockId = 'large-indent';
      const block = createBlockWithIndent(blockId, 'Tab\there', {
        left: 9999,
        hanging: 5000,
      });
      const measure = createMeasure(8, true);
      const layout = createLayout(blockId, 8);

      const painter = createDomPainter({ blocks: [block], measures: [measure], container });
      painter.paint(layout, container);

      const lineEl = container.querySelector('.superdoc-line') as HTMLElement;
      expect(lineEl).toBeTruthy();

      // Should handle large values: 9999 - 5000 = 4999
      expect(lineEl.style.paddingLeft).toBe('4999px');
      expect(lineEl.style.textIndent).toBe('');
    });
  });

  describe('List first lines (should take precedence)', () => {
    it('should not apply hanging indent adjustment for list first lines', () => {
      const blockId = 'list-with-hanging';
      const block: FlowBlock = {
        kind: 'paragraph',
        id: blockId,
        runs: [{ text: 'List item\twith tab', fontFamily: 'Arial', fontSize: 12, pmStart: 0, pmEnd: 18 }],
        attrs: {
          indent: {
            left: 360,
            hanging: 360,
          },
          wordLayout: {
            marker: {
              markerText: '1.',
              justification: 'right',
              suffix: 'tab',
              run: {
                fontFamily: 'Arial',
                fontSize: 12,
                bold: false,
                italic: false,
              },
            },
            gutter: {
              widthPx: 24,
            },
          },
        },
      };

      const measure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 18,
            width: 200,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
            segments: [
              { runIndex: 0, fromChar: 0, toChar: 9, width: 80, x: 0 },
              { runIndex: 0, fromChar: 9, toChar: 18, width: 120, x: 144 },
            ],
          },
        ],
        totalHeight: 20,
      };

      const layout: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'para',
                blockId,
                fromLine: 0,
                toLine: 1,
                x: 30,
                y: 40,
                width: 300,
                pmStart: 0,
                pmEnd: 18,
                markerWidth: 24, // Indicates list item
              },
            ],
          },
        ],
      };

      const painter = createDomPainter({ blocks: [block], measures: [measure], container });
      painter.paint(layout, container);

      const lineEl = container.querySelector('.superdoc-line') as HTMLElement;
      expect(lineEl).toBeTruthy();

      // List first lines use special marker positioning logic, not indent adjustment
      // The paddingLeft should be set by list logic: left - hanging = 0
      expect(lineEl.style.paddingLeft).toBe('0px');

      // Should contain marker element
      const marker = lineEl.querySelector('.superdoc-paragraph-marker');
      expect(marker).toBeTruthy();
      expect(marker?.textContent).toBe('1.');
    });
  });

  describe('Right indent', () => {
    it('should apply right indent regardless of hanging + tabs interaction', () => {
      const blockId = 'with-right-indent';
      const block = createBlockWithIndent(blockId, 'Tab\there', {
        left: 360,
        hanging: 360,
        right: 180,
      });
      const measure = createMeasure(8, true);
      const layout = createLayout(blockId, 8);

      const painter = createDomPainter({ blocks: [block], measures: [measure], container });
      painter.paint(layout, container);

      const lineEl = container.querySelector('.superdoc-line') as HTMLElement;
      expect(lineEl).toBeTruthy();

      expect(lineEl.style.paddingLeft).toBe('0px');
      expect(lineEl.style.paddingRight).toBe('180px');
      expect(lineEl.style.textIndent).toBe('');
    });
  });
});
