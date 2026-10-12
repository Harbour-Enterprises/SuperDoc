/**
 * Footnote separator defaults: Word-compatible normal line and full-width continuation.
 *   - §17.11.23 w:separator — "a horizontal line which spans PART OF the width text extents"
 *   - §17.11.1  w:continuationSeparator — "a horizontal line which spans THE WIDTH of the main story's text extents"
 *
 * The normal separator uses Word's two-inch default, capped to the column width.
 * The continuation separator renders at full column.
 */
import { describe, it, expect, vi } from 'vite-plus/test';
import type { FlowBlock, Measure } from '@superdoc/contracts';
import { incrementalLayout } from '../src/incrementalLayout';

const makeParagraph = (id: string, text: string, pmStart = 0): FlowBlock => ({
  kind: 'paragraph',
  id,
  runs: [{ text, fontFamily: 'Arial', fontSize: 12, pmStart, pmEnd: pmStart + text.length }],
});

const makeMeasure = (lineHeight: number, lineCount: number): Measure => ({
  kind: 'paragraph',
  lines: Array.from({ length: lineCount }, (_, i) => ({
    fromRun: 0,
    fromChar: i,
    toRun: 0,
    toChar: i + 1,
    width: 200,
    ascent: lineHeight * 0.8,
    descent: lineHeight * 0.2,
    lineHeight,
  })),
  totalHeight: lineCount * lineHeight,
});

type Frag = { blockId: string; width: number };

const findSeparator = (page: { fragments: Frag[] }, kind: 'standard' | 'continuation') => {
  const needle = kind === 'continuation' ? 'footnote-continuation-separator' : 'footnote-separator';
  return page.fragments.find((f) => typeof f.blockId === 'string' && f.blockId.startsWith(needle));
};

describe('footnote separator widths', () => {
  it.each([624, 468, 120])('standard separator retains two-inch width within a %ipx column', async (contentWidth) => {
    const body = makeParagraph('body-1', 'Body referencing a footnote.', 0);
    const ft = makeParagraph('footnote-1-0-paragraph', 'Note.', 0);
    const margins = { top: 72, right: 72, bottom: 72, left: 72 };
    const pageW = contentWidth + margins.left + margins.right;

    const result = await incrementalLayout(
      [],
      null,
      [body],
      {
        pageSize: { w: pageW, h: 800 },
        margins,
        footnotes: {
          refs: [{ id: '1', pos: 1 }],
          blocksById: new Map([['1', [ft]]]),
          topPadding: 6,
          dividerHeight: 1,
        },
      },
      vi.fn(async (b) => (b.id.startsWith('footnote-') ? makeMeasure(12, 1) : makeMeasure(20, 1))),
    );

    const sep = findSeparator(result.layout.pages[0], 'standard');
    expect(sep).toBeDefined();
    expect(sep!.width).toBeCloseTo(Math.min(192, contentWidth), 5);
  });

  it('continuation separator spans the full column width', async () => {
    const LINE_H = 20;
    const FOOTNOTE_LINE_H = 12;
    const margins = { top: 72, right: 72, bottom: 72, left: 72 };
    const pageW = 612;
    const contentWidth = pageW - margins.left - margins.right;
    const blocks: FlowBlock[] = [];
    // Body content must naturally span ≥2 pages in the bodyMaxY-anchored
    // architecture (the planner does not synthesize standalone pages for
    // footnote continuation). 40 body paragraphs × 20px = 800px > 600px
    // region forces 2 body pages; the oversized footnote on page 1 then
    // requires a continuation separator on page 2.
    for (let i = 0; i < 40; i += 1) {
      blocks.push(makeParagraph(`body-${i}`, `Body line ${i + 1}.`, i * 20));
    }
    const ftBlock = makeParagraph('footnote-1-0-paragraph', 'Big footnote.', 0);

    const result = await incrementalLayout(
      [],
      null,
      blocks,
      {
        pageSize: { w: pageW, h: 600 + margins.top + margins.bottom },
        margins,
        footnotes: {
          refs: [{ id: '1', pos: 2 }],
          blocksById: new Map([['1', [ftBlock]]]),
          topPadding: 6,
          dividerHeight: 1,
        },
      },
      vi.fn(async (b) => (b.id.startsWith('footnote-') ? makeMeasure(FOOTNOTE_LINE_H, 60) : makeMeasure(LINE_H, 1))),
    );

    expect(result.layout.pages.length).toBeGreaterThanOrEqual(2);
    const page2 = result.layout.pages[1];
    const sep = findSeparator(page2, 'continuation');
    expect(sep).toBeDefined();
    expect(sep!.width).toBeCloseTo(contentWidth, 0);
  });
});
