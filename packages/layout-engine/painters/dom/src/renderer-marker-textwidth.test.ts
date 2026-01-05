/**
 * Comprehensive tests for markerTextWidth feature in DomPainter
 *
 * Tests the behavior of markerTextWidth property including:
 * - Undefined/null fallback to markerBoxWidth
 * - Tab width calculation using markerTextWidth
 * - Edge cases: zero, negative, Infinity, NaN values
 * - Left-justified markers do NOT have fixed width set
 * - Right/center justified markers use markerBoxWidth for visual alignment
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createDomPainter } from './index.js';
import type { FlowBlock, Measure, Layout, WordParagraphLayoutOutput } from '@superdoc/contracts';

describe('DomPainter markerTextWidth feature', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  /**
   * Helper to create a list paragraph block with wordLayout
   */
  function createListBlock(
    blockId: string,
    markerText: string,
    justification: 'left' | 'right' | 'center' = 'left',
  ): FlowBlock {
    const wordLayout: WordParagraphLayoutOutput = {
      marker: {
        markerText,
        justification,
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
    };

    return {
      kind: 'paragraph',
      id: blockId,
      runs: [{ text: 'List item text', fontFamily: 'Arial', fontSize: 12, pmStart: 0, pmEnd: 14 }],
      attrs: {
        wordLayout,
        indent: {
          left: 48, // Standard indent
        },
      },
    };
  }

  /**
   * Helper to create measure for a list paragraph
   */
  function createListMeasure(): Measure {
    return {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: 14,
          width: 120,
          ascent: 12,
          descent: 4,
          lineHeight: 20,
        },
      ],
      totalHeight: 20,
    };
  }

  /**
   * Helper to create layout for a list paragraph with marker
   */
  function createListLayout(
    blockId: string,
    markerBoxWidth: number,
    markerTextWidth?: number,
    markerGutter?: number,
  ): Layout {
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
              x: 48,
              y: 40,
              width: 300,
              markerWidth: markerBoxWidth,
              markerTextWidth,
              markerGutter,
              continuesFromPrev: false,
            },
          ],
        },
      ],
    };
  }

  describe('fallback behavior when markerTextWidth is undefined/null', () => {
    it('should fallback to markerBoxWidth when markerTextWidth is undefined', () => {
      const blockId = 'list-undefined-textwidth';
      const block = createListBlock(blockId, '1.', 'left');
      const measure = createListMeasure();
      const markerBoxWidth = 24;
      // markerTextWidth is undefined
      const layout = createListLayout(blockId, markerBoxWidth, undefined);

      const painter = createDomPainter({
        blocks: [block],
        measures: [measure],
      });

      painter.paint(layout, container);

      // Verify marker is rendered
      const markerContainer = container.querySelector('.superdoc-paragraph-marker');
      expect(markerContainer).toBeTruthy();
      expect(markerContainer?.textContent).toBe('1.');

      // Verify tab element exists (confirms tab width calculation worked)
      const tabElement = container.querySelector('.superdoc-tab');
      expect(tabElement).toBeTruthy();
      expect(tabElement?.innerHTML).toBe('&nbsp;');
    });

    it('should fallback to markerBoxWidth when markerTextWidth is null', () => {
      const blockId = 'list-null-textwidth';
      const block = createListBlock(blockId, '2.', 'left');
      const measure = createListMeasure();
      const markerBoxWidth = 30;
      // @ts-expect-error Testing null case explicitly
      const layout = createListLayout(blockId, markerBoxWidth, null);

      const painter = createDomPainter({
        blocks: [block],
        measures: [measure],
      });

      painter.paint(layout, container);

      const markerContainer = container.querySelector('.superdoc-paragraph-marker');
      expect(markerContainer).toBeTruthy();

      const tabElement = container.querySelector('.superdoc-tab');
      expect(tabElement).toBeTruthy();
    });
  });

  describe('tab width calculation uses markerTextWidth', () => {
    it('should use markerTextWidth for left-justified marker tab calculation', () => {
      const blockId = 'list-left-textwidth';
      const block = createListBlock(blockId, 'a)', 'left');
      const measure = createListMeasure();
      const markerBoxWidth = 30; // Box width includes padding
      const markerTextWidth = 18; // Actual text is narrower
      const layout = createListLayout(blockId, markerBoxWidth, markerTextWidth);

      const painter = createDomPainter({
        blocks: [block],
        measures: [measure],
      });

      painter.paint(layout, container);

      const tabElement = container.querySelector('.superdoc-tab');
      expect(tabElement).toBeTruthy();

      // Tab should be calculated from markerTextWidth, not markerBoxWidth
      // With indent.left = 48, markerStartPos = 48, currentPos = 48 + 18 = 66
      // implicitTabStop = 48, so we're past it
      // Next default tab: 48 - (66 % 48) = 48 - 18 = 30
      const tabWidth = (tabElement as HTMLElement)?.style.width;
      expect(tabWidth).toBe('30px');
    });

    it('should calculate different tab width with markerTextWidth vs markerBoxWidth', () => {
      const blockId = 'list-textwidth-difference';
      const block = createListBlock(blockId, 'i.', 'left');
      const measure = createListMeasure();
      const markerBoxWidth = 40;
      const markerTextWidth = 15; // Significantly narrower than box
      const layout = createListLayout(blockId, markerBoxWidth, markerTextWidth);

      const painter = createDomPainter({
        blocks: [block],
        measures: [measure],
      });

      painter.paint(layout, container);

      const tabElement = container.querySelector('.superdoc-tab');
      expect(tabElement).toBeTruthy();

      // With markerTextWidth = 15:
      // markerStartPos = 48, currentPos = 48 + 15 = 63
      // implicitTabStop = 48, past it
      // Next tab: 48 - (63 % 48) = 48 - 15 = 33
      const tabWidth = (tabElement as HTMLElement)?.style.width;
      expect(tabWidth).toBe('33px');
    });

    it('should use markerTextWidth for right-justified markers in position calculation', () => {
      const blockId = 'list-right-textwidth';
      const block = createListBlock(blockId, '1.', 'right');
      const measure = createListMeasure();
      const markerBoxWidth = 36;
      const markerTextWidth = 20;
      const markerGutter = 12;
      const layout = createListLayout(blockId, markerBoxWidth, markerTextWidth, markerGutter);

      const painter = createDomPainter({
        blocks: [block],
        measures: [measure],
      });

      painter.paint(layout, container);

      // For right-justified, tab uses gutter width, not calculated from text width
      const tabElement = container.querySelector('.superdoc-tab');
      expect(tabElement).toBeTruthy();

      const tabWidth = (tabElement as HTMLElement)?.style.width;
      expect(tabWidth).toBe(`${markerGutter}px`);
    });
  });

  describe('edge case: markerTextWidth is 0', () => {
    it('should handle markerTextWidth of 0 for left-justified markers', () => {
      const blockId = 'list-zero-textwidth-left';
      const block = createListBlock(blockId, '', 'left'); // Empty marker
      const measure = createListMeasure();
      const markerBoxWidth = 20;
      const markerTextWidth = 0; // Zero width text
      const layout = createListLayout(blockId, markerBoxWidth, markerTextWidth);

      const painter = createDomPainter({
        blocks: [block],
        measures: [measure],
      });

      painter.paint(layout, container);

      const tabElement = container.querySelector('.superdoc-tab');
      expect(tabElement).toBeTruthy();

      // With markerTextWidth = 0:
      // markerStartPos = 48, currentPos = 48 + 0 = 48
      // implicitTabStop = 48, tabWidth = 48 - 48 = 0
      // Falls into tabWidth < 1 condition: DEFAULT_TAB_INTERVAL_PX - (48 % 48)
      // = 48 - 0 = 0, then gets set to DEFAULT_TAB_INTERVAL_PX = 48
      const tabWidth = (tabElement as HTMLElement)?.style.width;
      expect(tabWidth).toBe('48px');
    });

    it('should handle markerTextWidth of 0 for right-justified markers', () => {
      const blockId = 'list-zero-textwidth-right';
      const block = createListBlock(blockId, '', 'right');
      const measure = createListMeasure();
      const markerBoxWidth = 20;
      const markerTextWidth = 0;
      const markerGutter = 16;
      const layout = createListLayout(blockId, markerBoxWidth, markerTextWidth, markerGutter);

      const painter = createDomPainter({
        blocks: [block],
        measures: [measure],
      });

      painter.paint(layout, container);

      const tabElement = container.querySelector('.superdoc-tab');
      expect(tabElement).toBeTruthy();

      // Right-justified uses gutter, not text width
      const tabWidth = (tabElement as HTMLElement)?.style.width;
      expect(tabWidth).toBe(`${markerGutter}px`);
    });
  });

  describe('edge case: negative markerTextWidth', () => {
    it('should fallback to markerBoxWidth when markerTextWidth is negative', () => {
      const blockId = 'list-negative-textwidth';
      const block = createListBlock(blockId, 'A.', 'left');
      const measure = createListMeasure();
      const markerBoxWidth = 25;
      const markerTextWidth = -10; // Invalid negative value
      const layout = createListLayout(blockId, markerBoxWidth, markerTextWidth);

      const painter = createDomPainter({
        blocks: [block],
        measures: [measure],
      });

      painter.paint(layout, container);

      const tabElement = container.querySelector('.superdoc-tab');
      expect(tabElement).toBeTruthy();

      // Should use markerBoxWidth (25) instead of invalid -10
      // markerStartPos = 48, currentPos = 48 + 25 = 73
      // implicitTabStop = 48, past it
      // Next tab: 48 - (73 % 48) = 48 - 25 = 23
      const tabWidth = (tabElement as HTMLElement)?.style.width;
      expect(tabWidth).toBe('23px');
    });
  });

  describe('edge case: Infinity markerTextWidth', () => {
    it('should fallback to markerBoxWidth when markerTextWidth is Infinity', () => {
      const blockId = 'list-infinity-textwidth';
      const block = createListBlock(blockId, 'I.', 'left');
      const measure = createListMeasure();
      const markerBoxWidth = 28;
      const markerTextWidth = Infinity; // Invalid infinite value
      const layout = createListLayout(blockId, markerBoxWidth, markerTextWidth);

      const painter = createDomPainter({
        blocks: [block],
        measures: [measure],
      });

      painter.paint(layout, container);

      const tabElement = container.querySelector('.superdoc-tab');
      expect(tabElement).toBeTruthy();

      // Should use markerBoxWidth (28) instead of Infinity
      // markerStartPos = 48, currentPos = 48 + 28 = 76
      // implicitTabStop = 48, past it
      // Next tab: 48 - (76 % 48) = 48 - 28 = 20
      const tabWidth = (tabElement as HTMLElement)?.style.width;
      expect(tabWidth).toBe('20px');
    });
  });

  describe('edge case: NaN markerTextWidth', () => {
    it('should fallback to markerBoxWidth when markerTextWidth is NaN', () => {
      const blockId = 'list-nan-textwidth';
      const block = createListBlock(blockId, 'III.', 'left');
      const measure = createListMeasure();
      const markerBoxWidth = 32;
      const markerTextWidth = NaN; // Invalid NaN value
      const layout = createListLayout(blockId, markerBoxWidth, markerTextWidth);

      const painter = createDomPainter({
        blocks: [block],
        measures: [measure],
      });

      painter.paint(layout, container);

      const tabElement = container.querySelector('.superdoc-tab');
      expect(tabElement).toBeTruthy();

      // Should use markerBoxWidth (32) instead of NaN
      // markerStartPos = 48, currentPos = 48 + 32 = 80
      // implicitTabStop = 48, past it
      // Next tab: 48 - (80 % 48) = 48 - 32 = 16
      const tabWidth = (tabElement as HTMLElement)?.style.width;
      expect(tabWidth).toBe('16px');
    });
  });

  describe('left-justified markers should NOT have fixed width set', () => {
    it('should not set width style on left-justified marker element', () => {
      const blockId = 'list-left-no-width';
      const block = createListBlock(blockId, '1.', 'left');
      const measure = createListMeasure();
      const markerBoxWidth = 30;
      const markerTextWidth = 18;
      const layout = createListLayout(blockId, markerBoxWidth, markerTextWidth);

      const painter = createDomPainter({
        blocks: [block],
        measures: [measure],
      });

      painter.paint(layout, container);

      const markerEl = container.querySelector('.superdoc-paragraph-marker') as HTMLElement;
      expect(markerEl).toBeTruthy();

      // Left-justified markers should NOT have a fixed width
      expect(markerEl.style.width).toBe('');
    });

    it('should set width style on right-justified marker element', () => {
      const blockId = 'list-right-has-width';
      const block = createListBlock(blockId, '2.', 'right');
      const measure = createListMeasure();
      const markerBoxWidth = 30;
      const markerTextWidth = 18;
      const layout = createListLayout(blockId, markerBoxWidth, markerTextWidth);

      const painter = createDomPainter({
        blocks: [block],
        measures: [measure],
      });

      painter.paint(layout, container);

      const markerEl = container.querySelector('.superdoc-paragraph-marker') as HTMLElement;
      expect(markerEl).toBeTruthy();

      // Right-justified markers SHOULD have a fixed width (markerBoxWidth, not markerTextWidth)
      expect(markerEl.style.width).toBe(`${markerBoxWidth}px`);
      expect(markerEl.style.textAlign).toBe('right');
    });

    it('should set width style on center-justified marker element', () => {
      const blockId = 'list-center-has-width';
      const block = createListBlock(blockId, '3.', 'center');
      const measure = createListMeasure();
      const markerBoxWidth = 35;
      const markerTextWidth = 20;
      const layout = createListLayout(blockId, markerBoxWidth, markerTextWidth);

      const painter = createDomPainter({
        blocks: [block],
        measures: [measure],
      });

      painter.paint(layout, container);

      const markerEl = container.querySelector('.superdoc-paragraph-marker') as HTMLElement;
      expect(markerEl).toBeTruthy();

      // Center-justified markers SHOULD have a fixed width (markerBoxWidth, not markerTextWidth)
      expect(markerEl.style.width).toBe(`${markerBoxWidth}px`);
      expect(markerEl.style.textAlign).toBe('center');
    });
  });

  describe('integration test: markerTextWidth with various marker styles', () => {
    it('should handle long marker text with smaller textWidth', () => {
      const blockId = 'list-long-marker';
      const block = createListBlock(blockId, 'XXIV.', 'left');
      const measure = createListMeasure();
      const markerBoxWidth = 60; // Box is wide
      const markerTextWidth = 45; // Text is narrower
      const layout = createListLayout(blockId, markerBoxWidth, markerTextWidth);

      const painter = createDomPainter({
        blocks: [block],
        measures: [measure],
      });

      painter.paint(layout, container);

      const markerEl = container.querySelector('.superdoc-paragraph-marker');
      expect(markerEl).toBeTruthy();
      expect(markerEl?.textContent).toBe('XXIV.');

      const tabElement = container.querySelector('.superdoc-tab');
      expect(tabElement).toBeTruthy();

      // Tab should be calculated using markerTextWidth = 45
      // markerStartPos = 48, currentPos = 48 + 45 = 93
      // implicitTabStop = 48, past it
      // Next tab: 48 - (93 % 48) = 48 - 45 = 3
      const tabWidth = (tabElement as HTMLElement)?.style.width;
      expect(tabWidth).toBe('3px');
    });

    it('should handle small marker with markerTextWidth smaller than box', () => {
      const blockId = 'list-small-marker';
      const block = createListBlock(blockId, '•', 'left');
      const measure = createListMeasure();
      const markerBoxWidth = 20;
      const markerTextWidth = 8; // Bullet is very narrow
      const layout = createListLayout(blockId, markerBoxWidth, markerTextWidth);

      const painter = createDomPainter({
        blocks: [block],
        measures: [measure],
      });

      painter.paint(layout, container);

      const tabElement = container.querySelector('.superdoc-tab');
      expect(tabElement).toBeTruthy();

      // Tab calculation with markerTextWidth = 8
      // markerStartPos = 48, currentPos = 48 + 8 = 56
      // implicitTabStop = 48, past it
      // Next tab: 48 - (56 % 48) = 48 - 8 = 40
      const tabWidth = (tabElement as HTMLElement)?.style.width;
      expect(tabWidth).toBe('40px');
    });

    it('should handle markerTextWidth equal to markerBoxWidth', () => {
      const blockId = 'list-equal-widths';
      const block = createListBlock(blockId, 'a)', 'left');
      const measure = createListMeasure();
      const markerBoxWidth = 22;
      const markerTextWidth = 22; // Same as box width
      const layout = createListLayout(blockId, markerBoxWidth, markerTextWidth);

      const painter = createDomPainter({
        blocks: [block],
        measures: [measure],
      });

      painter.paint(layout, container);

      const tabElement = container.querySelector('.superdoc-tab');
      expect(tabElement).toBeTruthy();

      // Tab calculation with equal widths
      // markerStartPos = 48, currentPos = 48 + 22 = 70
      // implicitTabStop = 48, past it
      // Next tab: 48 - (70 % 48) = 48 - 22 = 26
      const tabWidth = (tabElement as HTMLElement)?.style.width;
      expect(tabWidth).toBe('26px');
    });
  });
});
