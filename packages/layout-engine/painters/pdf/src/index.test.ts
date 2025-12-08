import { describe, expect, it, vi } from 'vitest';
import type {
  FlowBlock,
  Layout,
  Measure,
  ParagraphMeasure,
  VectorShapeDrawing,
  ShapeGroupDrawing,
  ImageDrawing,
  DrawingMeasure,
} from '@superdoc/contracts';
import { createPdfPainter } from './index.js';
import { PdfPainter } from './renderer.js';

const block: FlowBlock = {
  kind: 'paragraph',
  id: 'block-1',
  runs: [
    {
      text: 'Hello world',
      fontFamily: 'Arial',
      fontSize: 16,
      bold: true,
    },
  ],
};

const measure: Measure = {
  kind: 'paragraph',
  lines: [
    {
      fromRun: 0,
      fromChar: 0,
      toRun: 0,
      toChar: 11,
      width: 120,
      ascent: 12,
      descent: 4,
      lineHeight: 20,
    },
  ],
  totalHeight: 20,
};

const layout: Layout = {
  pageSize: { w: 600, h: 800 },
  pages: [
    {
      number: 1,
      fragments: [
        {
          kind: 'para',
          blockId: 'block-1',
          fromLine: 0,
          toLine: 1,
          x: 72,
          y: 72,
          width: 456,
        },
      ],
    },
  ],
};

const buildSimpleParagraphMeasure = (textLength: number, width: number): ParagraphMeasure => ({
  kind: 'paragraph',
  lines: [
    {
      fromRun: 0,
      fromChar: 0,
      toRun: 0,
      toChar: textLength,
      width,
      ascent: 12,
      descent: 4,
      lineHeight: 20,
      segments: [
        {
          runIndex: 0,
          fromChar: 0,
          toChar: textLength,
          width,
        },
      ],
    },
  ],
  totalHeight: 20,
});

const buildSingleFragmentLayout = (blockId: string, width: number): Layout => ({
  pageSize: layout.pageSize,
  pages: [
    {
      number: 1,
      fragments: [
        {
          kind: 'para' as const,
          blockId,
          fromLine: 0,
          toLine: 1,
          x: 72,
          y: 72,
          width,
        },
      ],
    },
  ],
});

const hexToRgbTriplet = (value: string) => {
  const hex = value.replace('#', '');
  const r = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const g = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const b = Number.parseInt(hex.slice(4, 6), 16) / 255;
  return `${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)}`;
};

describe('PDF Painter', () => {
  it('renders a layout to a PDF blob', async () => {
    const painter = createPdfPainter({ blocks: [block], measures: [measure] });
    const blob = await painter.render(layout);

    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('creates pages matching the layout', async () => {
    const multiPageLayout: Layout = {
      pageSize: layout.pageSize,
      pages: [
        layout.pages[0],
        {
          number: 2,
          fragments: [
            {
              kind: 'para',
              blockId: 'block-1',
              fromLine: 0,
              toLine: 1,
              x: 72,
              y: 72,
              width: 456,
            },
          ],
        },
      ],
    };

    const painter = createPdfPainter({ blocks: [block], measures: [measure] });
    const blob = await painter.render(multiPageLayout);
    const text = await blob.text();

    const pageMatches = text.match(/\/Type \/Page(?!s)/g) ?? [];
    expect(pageMatches.length).toBe(2);
  });

  it('adds word spacing for justified lines (including last line)', async () => {
    const justifyBlock: FlowBlock = {
      kind: 'paragraph',
      id: 'justify-block',
      runs: [
        { text: 'a b', fontFamily: 'Arial', fontSize: 16 },
        { text: 'c d', fontFamily: 'Arial', fontSize: 16 },
      ],
      attrs: { alignment: 'justify' },
    };

    const justifyMeasure: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: 3,
          width: 60,
          maxWidth: 100,
          ascent: 12,
          descent: 4,
          lineHeight: 20,
        },
        {
          fromRun: 1,
          fromChar: 0,
          toRun: 1,
          toChar: 3,
          width: 50,
          maxWidth: 100,
          ascent: 12,
          descent: 4,
          lineHeight: 20,
        },
      ],
      totalHeight: 40,
    } as ParagraphMeasure;

    const justifyLayout: Layout = {
      pageSize: { w: 200, h: 200 },
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'justify-block',
              fromLine: 0,
              toLine: 2,
              x: 0,
              y: 0,
              width: 100,
            },
          ],
        },
      ],
    };

    const painter = createPdfPainter({ blocks: [justifyBlock], measures: [justifyMeasure] });
    const blob = await painter.render(justifyLayout);
    const text = await blob.text();

    expect(text).toMatch(/[1-9]\d*\.?\d*\sTw/);
  });

  it('embeds image fragments when data URLs are provided', async () => {
    const imageBlock: FlowBlock = {
      kind: 'image',
      id: 'img-1',
      src: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAAQABADASIAAhEBAxEB/8QAFwAAAwEAAAAAAAAAAAAAAAAAAQIDB//EABYBAQEBAAAAAAAAAAAAAAAAAAABAv/aAAwDAQACEAMQAAAB1gAAAAAAAAAB/8QAFhEAAwAAAAAAAAAAAAAAAAAAAAER/9oACAEBAAEFAk//xAAVEQEBAAAAAAAAAAAAAAAAAAABEP/aAAgBAwEBPwEf/8QAFBEBAAAAAAAAAAAAAAAAAAAAIP/aAAgBAgEBPwE//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJf/8QAGxABAAICAwAAAAAAAAAAAAAAAQAREgMQITH/2gAIAQEAAT8h0WNcMB4uL1hYVf/Z',
      width: 100,
      height: 60,
    };
    const imageMeasure: Measure = {
      kind: 'image',
      width: 100,
      height: 60,
    };
    const imageLayout: Layout = {
      pageSize: layout.pageSize,
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'image',
              blockId: 'img-1',
              x: 50,
              y: 60,
              width: 100,
              height: 60,
            },
          ],
        },
      ],
    };

    const painter = createPdfPainter({ blocks: [imageBlock], measures: [imageMeasure] });
    const blob = await painter.render(imageLayout);
    const text = await blob.text();
    expect(text).toContain('/Subtype /Image');
    expect(text).toContain('/XObject');
  });

  it('renders header decorations with resolved tokens', async () => {
    const headerBlock: FlowBlock = {
      kind: 'paragraph',
      id: 'header-block',
      runs: [
        { text: 'Page ', fontFamily: 'Arial', fontSize: 12 },
        { text: '0', fontFamily: 'Arial', fontSize: 12, token: 'pageNumber' },
        { text: ' of ', fontFamily: 'Arial', fontSize: 12 },
        { text: '0', fontFamily: 'Arial', fontSize: 12, token: 'totalPageCount' },
      ],
    };
    const headerMeasure: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 3,
          toChar: 1,
          width: 100,
          ascent: 10,
          descent: 4,
          lineHeight: 16,
        },
      ],
      totalHeight: 16,
    };
    const headerFragment = {
      kind: 'para' as const,
      blockId: 'header-block',
      fromLine: 0,
      toLine: 1,
      x: 72,
      y: 0,
      width: 200,
    };

    const painter = createPdfPainter({
      blocks: [block, headerBlock],
      measures: [measure, headerMeasure],
      headerProvider: () => ({ fragments: [headerFragment], height: 16, offset: 20 }),
    });

    const blob = await painter.render(layout);
    const text = await blob.text();
    expect(text).toContain('(Page ) Tj');
    expect(text).toContain('(1) Tj');
  });

  it('applies marginLeft translation for header fragments', async () => {
    const headerBlock: FlowBlock = {
      kind: 'paragraph',
      id: 'header-margin',
      runs: [{ text: 'Header', fontFamily: 'Arial', fontSize: 12 }],
    };
    const headerMeasure: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: 6,
          width: 48,
          ascent: 10,
          descent: 2,
          lineHeight: 14,
        },
      ],
      totalHeight: 14,
    } as ParagraphMeasure;
    const headerFragment = {
      kind: 'para' as const,
      blockId: 'header-margin',
      fromLine: 0,
      toLine: 1,
      x: 0,
      y: 0,
      width: 200,
    };

    // marginLeft = 48px -> 36pt translation
    const painter = createPdfPainter({
      blocks: [block, headerBlock],
      measures: [measure, headerMeasure],
      headerProvider: () => ({ fragments: [headerFragment], height: 14, offset: 0, marginLeft: 48 }),
    });

    const blob = await painter.render(layout);
    const text = await blob.text();
    // Ensure a text matrix with x=36.00 pt appears before our header text
    expect(text).toMatch(/36\.00\s+\d+\.\d+\s+Tm[\s\S]*\(Header\) Tj/);
  });

  it('aligns word-layout markers using paragraph indents', async () => {
    const markerBlock: FlowBlock = {
      kind: 'paragraph',
      id: 'pdf-marker',
      runs: [{ text: 'Numbered paragraph', fontFamily: 'Arial', fontSize: 14 }],
      attrs: {
        indent: { left: 48, hanging: 24 },
        numberingProperties: { numId: 2, ilvl: 0 },
        wordLayout: {
          indentLeftPx: 48,
          marker: {
            markerText: '-',
            glyphWidthPx: 8,
            markerBoxWidthPx: 20,
            markerX: 4,
            textStartX: 24,
            baselineOffsetPx: 0,
            justification: 'left',
            suffix: 'tab',
            run: { fontFamily: 'Arial', fontSize: 16 },
          },
        },
      },
    };
    const markerMeasure: ParagraphMeasure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: 18,
          width: 120,
          ascent: 11,
          descent: 3,
          lineHeight: 18,
        },
      ],
      totalHeight: 18,
      marker: {
        markerWidth: 20,
        markerTextWidth: 8,
        indentLeft: 48,
      },
    };
    const markerLayout: Layout = {
      pageSize: layout.pageSize,
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'pdf-marker',
              fromLine: 0,
              toLine: 1,
              x: 72,
              y: 100,
              width: 400,
              markerWidth: 20,
            },
          ],
        },
      ],
    };

    const painter = createPdfPainter({ blocks: [markerBlock], measures: [markerMeasure] });
    const blob = await painter.render(markerLayout);
    const pdfText = await blob.text();

    const indent = markerBlock.attrs?.indent ?? {};
    const textStart = (indent.left ?? 0) + ((indent.firstLine ?? 0) - (indent.hanging ?? 0));
    const fragmentX = markerLayout.pages[0].fragments[0].x ?? 0;
    const expectedMarkerPx = fragmentX + textStart - (markerMeasure.marker?.markerWidth ?? 0); // 72 + 24 - 20 = 76px
    const expectedMarkerPt = ((expectedMarkerPx * 72) / 96).toFixed(2);

    expect(pdfText).toContain(`1 0 0 1 ${expectedMarkerPt}`);
    expect(pdfText).toContain('(-) Tj');
  });

  it('renders highlight rectangles for tracked insertions in review mode', async () => {
    const trackedBlock: FlowBlock = {
      kind: 'paragraph',
      id: 'tracked-insert',
      runs: [
        {
          text: 'Inserted text',
          fontFamily: 'Arial',
          fontSize: 14,
          trackedChange: {
            kind: 'insert',
            id: 'change-1',
          },
        },
      ],
      attrs: {
        trackedChangesMode: 'review',
        trackedChangesEnabled: true,
      },
    };
    const width = 160;
    const trackedMeasure = buildSimpleParagraphMeasure(trackedBlock.runs[0].text.length, width);
    const painter = createPdfPainter({ blocks: [trackedBlock], measures: [trackedMeasure] });
    const blob = await painter.render(buildSingleFragmentLayout(trackedBlock.id, width));
    const pdfText = await blob.text();
    const highlightColor = hexToRgbTriplet('#e6f4ec');
    expect(pdfText).toContain(`${highlightColor} rg`);
  });

  it('draws strikethrough lines for tracked deletions in review mode', async () => {
    const trackedBlock: FlowBlock = {
      kind: 'paragraph',
      id: 'tracked-delete',
      runs: [
        {
          text: 'Deleted text',
          fontFamily: 'Arial',
          fontSize: 14,
          trackedChange: {
            kind: 'delete',
            id: 'change-2',
          },
        },
      ],
      attrs: {
        trackedChangesMode: 'review',
        trackedChangesEnabled: true,
      },
    };
    const width = 180;
    const trackedMeasure = buildSimpleParagraphMeasure(trackedBlock.runs[0].text.length, width);
    const painter = createPdfPainter({ blocks: [trackedBlock], measures: [trackedMeasure] });
    const blob = await painter.render(buildSingleFragmentLayout(trackedBlock.id, width));
    const pdfText = await blob.text();
    const strikeColor = hexToRgbTriplet('#cb0e47');
    expect(pdfText).toContain(`${strikeColor} RG`);
  });

  describe('token resolution tests', () => {
    it('renders footer with page numbers', async () => {
      const footerBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'footer-block',
        runs: [
          { text: 'Footer: ', fontFamily: 'Arial', fontSize: 10 },
          { text: '0', fontFamily: 'Arial', fontSize: 10, token: 'pageNumber' },
        ],
      };
      const footerMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 1,
            toChar: 1,
            width: 80,
            ascent: 8,
            descent: 2,
            lineHeight: 12,
          },
        ],
        totalHeight: 12,
      };
      const footerFragment = {
        kind: 'para' as const,
        blockId: 'footer-block',
        fromLine: 0,
        toLine: 1,
        x: 72,
        y: 0,
        width: 200,
      };

      const painter = createPdfPainter({
        blocks: [block, footerBlock],
        measures: [measure, footerMeasure],
        footerProvider: () => ({ fragments: [footerFragment], height: 12, offset: 10 }),
      });

      const blob = await painter.render(layout);
      const text = await blob.text();
      expect(text).toContain('(Footer: ) Tj');
      expect(text).toContain('(1) Tj');
    });

    it('bottom-aligns footer fragments using measured height when fragment height is missing', async () => {
      const pageHeight = 500;
      const footerHeight = 50;

      const footerBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'footer-block-measured',
        runs: [{ text: 'Footer', fontFamily: 'Arial', fontSize: 12 }],
      };

      const footerMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 6,
            width: 80,
            ascent: 9,
            descent: 3,
            lineHeight: 16,
          },
        ],
        totalHeight: 16,
      };

      const footerFragment = {
        kind: 'para' as const,
        blockId: 'footer-block-measured',
        fromLine: 0,
        toLine: 1,
        x: 20,
        y: 2,
        width: 200,
      };

      const painter = new PdfPainter([footerBlock], [footerMeasure], {
        footerProvider: () => ({ fragments: [footerFragment], height: footerHeight }),
      });

      const renderSpy = vi.spyOn(
        painter as unknown as Record<string, (...args: unknown[]) => unknown>,
        'renderParagraphFragment',
      );

      await painter.render({
        pageSize: { w: 400, h: pageHeight },
        pages: [{ number: 1, fragments: [] }],
      });

      expect(renderSpy).toHaveBeenCalled();
      const translatedFragment = (renderSpy.mock.calls[0][0] ?? null) as typeof footerFragment | null;
      expect(translatedFragment).not.toBeNull();

      // Expected Y: baseOffset (pageHeight - footerHeight) + fragment.y + (footerHeight - (fragment.y + contentHeight))
      const expectedYOffset = pageHeight - footerHeight; // default footer offset when none provided
      const expectedContentHeight = footerFragment.y + footerMeasure.totalHeight; // uses measure when fragment.height missing
      const expectedFooterYOffset = Math.max(0, footerHeight - expectedContentHeight);
      const expectedY = footerFragment.y + expectedYOffset + expectedFooterYOffset;

      expect(translatedFragment?.y).toBeCloseTo(expectedY);
    });

    it('resolves different page numbers across multi-page PDF', async () => {
      const headerBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'header-multi',
        runs: [{ text: '0', fontFamily: 'Arial', fontSize: 12, token: 'pageNumber' }],
      };
      const headerMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 1,
            width: 20,
            ascent: 10,
            descent: 2,
            lineHeight: 14,
          },
        ],
        totalHeight: 14,
      };
      const headerFragment = {
        kind: 'para' as const,
        blockId: 'header-multi',
        fromLine: 0,
        toLine: 1,
        x: 72,
        y: 0,
        width: 200,
      };

      const multiPageLayout: Layout = {
        pageSize: { w: 600, h: 800 },
        pages: [
          { number: 1, fragments: [] },
          { number: 2, fragments: [] },
          { number: 3, fragments: [] },
        ],
      };

      const painter = createPdfPainter({
        blocks: [block, headerBlock],
        measures: [measure, headerMeasure],
        headerProvider: () => ({ fragments: [headerFragment], height: 14, offset: 20 }),
      });

      const blob = await painter.render(multiPageLayout);
      const text = await blob.text();

      // PDF should contain page numbers 1, 2, and 3 in text commands
      expect(text).toContain('(1) Tj');
      expect(text).toContain('(2) Tj');
      expect(text).toContain('(3) Tj');
    });

    it('preserves bold styling on page number tokens in PDF', async () => {
      const headerBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'header-bold',
        runs: [
          { text: 'Page ', fontFamily: 'Arial', fontSize: 12 },
          { text: '0', fontFamily: 'Arial', fontSize: 12, bold: true, token: 'pageNumber' },
        ],
      };
      const headerMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 1,
            toChar: 1,
            width: 60,
            ascent: 10,
            descent: 2,
            lineHeight: 14,
          },
        ],
        totalHeight: 14,
      };
      const headerFragment = {
        kind: 'para' as const,
        blockId: 'header-bold',
        fromLine: 0,
        toLine: 1,
        x: 72,
        y: 0,
        width: 200,
      };

      const painter = createPdfPainter({
        blocks: [block, headerBlock],
        measures: [measure, headerMeasure],
        headerProvider: () => ({ fragments: [headerFragment], height: 14, offset: 20 }),
      });

      const blob = await painter.render(layout);
      const text = await blob.text();

      // PDF should contain both normal and bold text
      expect(text).toContain('(Page ) Tj');
      expect(text).toContain('(1) Tj');
      // Bold font reference should be present (Helvetica-Bold = F2)
      expect(text).toMatch(/\/F\d+\s+[\d.]+\s+Tf/); // Font selection command with size
    });

    it('renders totalPageCount token correctly in PDF', async () => {
      const headerBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'header-total',
        runs: [
          { text: 'Total: ', fontFamily: 'Arial', fontSize: 12 },
          { text: '0', fontFamily: 'Arial', fontSize: 12, token: 'totalPageCount' },
        ],
      };
      const headerMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 1,
            toChar: 1,
            width: 70,
            ascent: 10,
            descent: 2,
            lineHeight: 14,
          },
        ],
        totalHeight: 14,
      };
      const headerFragment = {
        kind: 'para' as const,
        blockId: 'header-total',
        fromLine: 0,
        toLine: 1,
        x: 72,
        y: 0,
        width: 200,
      };

      const fourPageLayout: Layout = {
        pageSize: { w: 600, h: 800 },
        pages: [
          { number: 1, fragments: [] },
          { number: 2, fragments: [] },
          { number: 3, fragments: [] },
          { number: 4, fragments: [] },
        ],
      };

      const painter = createPdfPainter({
        blocks: [block, headerBlock],
        measures: [measure, headerMeasure],
        headerProvider: () => ({ fragments: [headerFragment], height: 14, offset: 20 }),
      });

      const blob = await painter.render(fourPageLayout);
      const text = await blob.text();

      // All pages should show total count of 4
      expect(text).toContain('(Total: ) Tj');
      expect(text).toContain('(4) Tj');
    });
  });

  it('renders list markers and content', async () => {
    const listParagraph: FlowBlock = {
      kind: 'paragraph',
      id: 'item-paragraph',
      runs: [
        {
          text: 'List body',
          fontFamily: 'Arial',
          fontSize: 14,
        },
      ],
    };

    const listMeasure: Measure = {
      kind: 'list',
      items: [
        {
          itemId: 'item-1',
          markerWidth: 32,
          markerTextWidth: 20,
          indentLeft: 0,
          paragraph: {
            kind: 'paragraph',
            lines: [
              {
                fromRun: 0,
                fromChar: 0,
                toRun: 0,
                toChar: 9,
                width: 80,
                ascent: 11.2,
                descent: 2.8,
                lineHeight: 18,
              },
            ],
            totalHeight: 18,
          } satisfies ParagraphMeasure,
        },
      ],
      totalHeight: 18,
    };

    const listBlock: FlowBlock = {
      kind: 'list',
      id: 'list-1',
      listType: 'number',
      items: [
        {
          id: 'item-1',
          marker: { kind: 'number', text: '1.', level: 0, order: 1 },
          paragraph: listParagraph,
        },
      ],
    };

    const listLayout: Layout = {
      pageSize: layout.pageSize,
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'list-item',
              blockId: 'list-1',
              itemId: 'item-1',
              fromLine: 0,
              toLine: 1,
              x: 120,
              y: 90,
              width: 200,
              markerWidth: 32,
            },
          ],
        },
      ],
    };

    const painter = createPdfPainter({ blocks: [listBlock], measures: [listMeasure] });
    const blob = await painter.render(listLayout);
    const text = await blob.text();
    expect(text).toContain('(1.)');
    expect(text).toContain('(List body)');
  });

  it('strokes paragraph borders in the PDF output', async () => {
    const borderedBlock: FlowBlock = {
      ...block,
      id: 'bordered-block',
      attrs: {
        borders: {
          top: { style: 'solid', width: 2, color: '#0000ff' },
          left: { style: 'dotted', width: 1, color: '#00ff00' },
        },
      },
    };
    const painter = createPdfPainter({ blocks: [borderedBlock], measures: [measure] });
    const borderLayout: Layout = {
      pageSize: layout.pageSize,
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'bordered-block',
              fromLine: 0,
              toLine: 1,
              x: 72,
              y: 72,
              width: 456,
            },
          ],
        },
      ],
    };

    const blob = await painter.render(borderLayout);
    const pdfText = await blob.text();
    expect(pdfText).toContain('0.0000 0.0000 1.0000 RG');
    expect(pdfText).toMatch(/1\.50 w/);
  });

  it('fills paragraph shading before rendering text', async () => {
    const shadedBlock: FlowBlock = {
      ...block,
      id: 'shaded-block',
      attrs: {
        shading: {
          fill: '#FFCC00',
        },
      },
    };
    const painter = createPdfPainter({ blocks: [shadedBlock], measures: [measure] });
    const shadedLayout: Layout = {
      pageSize: layout.pageSize,
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'shaded-block',
              fromLine: 0,
              toLine: 1,
              x: 72,
              y: 72,
              width: 456,
            },
          ],
        },
      ],
    };

    const blob = await painter.render(shadedLayout);
    const pdfText = await blob.text();
    expect(pdfText).toContain('1.0000 0.8000 0.0000 rg');
    expect(pdfText).toContain('re');
  });

  describe('Drawing Fragments', () => {
    it('renders vector shape drawing with rectangle', async () => {
      const vectorShapeBlock: VectorShapeDrawing = {
        kind: 'drawing',
        id: 'shape-1',
        drawingKind: 'vectorShape',
        geometry: { width: 100, height: 80, rotation: 0, flipH: false, flipV: false },
        shapeKind: 'rect',
        fillColor: '#FF0000',
        strokeColor: '#000000',
        strokeWidth: 2,
      };

      const vectorMeasure: DrawingMeasure = {
        kind: 'drawing',
        drawingKind: 'vectorShape',
        width: 100,
        height: 80,
        scale: 1,
        naturalWidth: 100,
        naturalHeight: 80,
        geometry: { width: 100, height: 80, rotation: 0, flipH: false, flipV: false },
      };

      const vectorLayout: Layout = {
        pageSize: { w: 600, h: 800 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'drawing',
                blockId: 'shape-1',
                drawingKind: 'vectorShape',
                x: 100,
                y: 150,
                width: 100,
                height: 80,
                geometry: { width: 100, height: 80, rotation: 0, flipH: false, flipV: false },
                scale: 1,
              },
            ],
          },
        ],
      };

      const painter = createPdfPainter({ blocks: [vectorShapeBlock], measures: [vectorMeasure] });
      const blob = await painter.render(vectorLayout);
      const pdfText = await blob.text();

      // Check for rectangle drawing command
      expect(pdfText).toContain('re'); // rectangle command
      // Check for fill color (red: 1, 0, 0)
      expect(pdfText).toContain('1.0000 0.0000 0.0000 rg');
      // Check for stroke color (black: 0, 0, 0)
      expect(pdfText).toContain('0.0000 0.0000 0.0000 RG');
      // Check for fill and stroke command
      expect(pdfText).toContain('B'); // fill and stroke
    });

    it('renders vector shape with ellipse', async () => {
      const ellipseBlock: VectorShapeDrawing = {
        kind: 'drawing',
        id: 'shape-ellipse',
        drawingKind: 'vectorShape',
        geometry: { width: 120, height: 90, rotation: 0, flipH: false, flipV: false },
        shapeKind: 'ellipse',
        fillColor: '#00FF00',
      };

      const ellipseMeasure: DrawingMeasure = {
        kind: 'drawing',
        drawingKind: 'vectorShape',
        width: 120,
        height: 90,
        scale: 1,
        naturalWidth: 120,
        naturalHeight: 90,
        geometry: { width: 120, height: 90, rotation: 0, flipH: false, flipV: false },
      };

      const ellipseLayout: Layout = {
        pageSize: { w: 600, h: 800 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'drawing',
                blockId: 'shape-ellipse',
                drawingKind: 'vectorShape',
                x: 50,
                y: 100,
                width: 120,
                height: 90,
                geometry: { width: 120, height: 90, rotation: 0, flipH: false, flipV: false },
                scale: 1,
              },
            ],
          },
        ],
      };

      const painter = createPdfPainter({ blocks: [ellipseBlock], measures: [ellipseMeasure] });
      const blob = await painter.render(ellipseLayout);
      const pdfText = await blob.text();

      // Check for cubic bezier curves (ellipse rendering)
      expect(pdfText).toContain('c'); // cubic bezier command
      // Check for fill color (green: 0, 1, 0)
      expect(pdfText).toContain('0.0000 1.0000 0.0000 rg');
      // Check for fill command
      expect(pdfText).toContain('f');
    });

    it('applies rotation transform to vector shapes', async () => {
      const rotatedShape: VectorShapeDrawing = {
        kind: 'drawing',
        id: 'shape-rotated',
        drawingKind: 'vectorShape',
        geometry: { width: 100, height: 60, rotation: 45, flipH: false, flipV: false },
        shapeKind: 'rect',
        fillColor: '#0000FF',
      };

      const rotatedMeasure: DrawingMeasure = {
        kind: 'drawing',
        drawingKind: 'vectorShape',
        width: 100,
        height: 60,
        scale: 1,
        naturalWidth: 100,
        naturalHeight: 60,
        geometry: { width: 100, height: 60, rotation: 45, flipH: false, flipV: false },
      };

      const rotatedLayout: Layout = {
        pageSize: { w: 600, h: 800 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'drawing',
                blockId: 'shape-rotated',
                drawingKind: 'vectorShape',
                x: 200,
                y: 200,
                width: 100,
                height: 60,
                geometry: { width: 100, height: 60, rotation: 45, flipH: false, flipV: false },
                scale: 1,
              },
            ],
          },
        ],
      };

      const painter = createPdfPainter({ blocks: [rotatedShape], measures: [rotatedMeasure] });
      const blob = await painter.render(rotatedLayout);
      const pdfText = await blob.text();

      // Check for transformation matrix (rotation should produce cm commands)
      expect(pdfText).toContain('cm'); // transformation matrix
      // Should still render the shape
      expect(pdfText).toContain('re');
    });

    it('applies flip transforms to vector shapes', async () => {
      const flippedShape: VectorShapeDrawing = {
        kind: 'drawing',
        id: 'shape-flipped',
        drawingKind: 'vectorShape',
        geometry: { width: 80, height: 50, rotation: 0, flipH: true, flipV: true },
        shapeKind: 'rect',
        fillColor: '#FF00FF',
      };

      const flippedMeasure: DrawingMeasure = {
        kind: 'drawing',
        drawingKind: 'vectorShape',
        width: 80,
        height: 50,
        scale: 1,
        naturalWidth: 80,
        naturalHeight: 50,
        geometry: { width: 80, height: 50, rotation: 0, flipH: true, flipV: true },
      };

      const flippedLayout: Layout = {
        pageSize: { w: 600, h: 800 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'drawing',
                blockId: 'shape-flipped',
                drawingKind: 'vectorShape',
                x: 150,
                y: 300,
                width: 80,
                height: 50,
                geometry: { width: 80, height: 50, rotation: 0, flipH: true, flipV: true },
                scale: 1,
              },
            ],
          },
        ],
      };

      const painter = createPdfPainter({ blocks: [flippedShape], measures: [flippedMeasure] });
      const blob = await painter.render(flippedLayout);
      const pdfText = await blob.text();

      // Check for transformation matrix (flips produce scale transforms)
      expect(pdfText).toContain('-1 0 0 -1 0 0 cm');
    });

    it('renders shape groups with children', async () => {
      const shapeGroup: ShapeGroupDrawing = {
        kind: 'drawing',
        id: 'group-1',
        drawingKind: 'shapeGroup',
        geometry: { width: 200, height: 150, rotation: 0, flipH: false, flipV: false },
        shapes: [
          {
            shapeType: 'vectorShape',
            attrs: {
              x: 10,
              y: 20,
              width: 50,
              height: 40,
              fillColor: '#FF0000',
              strokeColor: '#000000',
              rotation: 0,
              flipH: false,
              flipV: false,
            },
          },
          {
            shapeType: 'vectorShape',
            attrs: {
              x: 70,
              y: 80,
              width: 60,
              height: 30,
              fillColor: '#00FF00',
              rotation: 0,
              flipH: false,
              flipV: false,
            },
          },
        ],
      };

      const groupMeasure: DrawingMeasure = {
        kind: 'drawing',
        drawingKind: 'shapeGroup',
        width: 200,
        height: 150,
        scale: 1,
        naturalWidth: 200,
        naturalHeight: 150,
        geometry: { width: 200, height: 150, rotation: 0, flipH: false, flipV: false },
      };

      const groupLayout: Layout = {
        pageSize: { w: 600, h: 800 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'drawing',
                blockId: 'group-1',
                drawingKind: 'shapeGroup',
                x: 100,
                y: 100,
                width: 200,
                height: 150,
                geometry: { width: 200, height: 150, rotation: 0, flipH: false, flipV: false },
                scale: 1,
              },
            ],
          },
        ],
      };

      const painter = createPdfPainter({ blocks: [shapeGroup], measures: [groupMeasure] });
      const blob = await painter.render(groupLayout);
      const pdfText = await blob.text();

      // Should contain multiple shapes (multiple q/Q pairs for children)
      const qMatches = (pdfText.match(/\bq\n/g) ?? []).length;
      expect(qMatches).toBeGreaterThan(2); // At least one for wrapper + 2 for children
      // Should have positioning for children
      expect(pdfText).toContain('cm'); // translation commands
    });

    it('renders image drawing', async () => {
      const imageDrawing: ImageDrawing = {
        kind: 'drawing',
        id: 'img-drawing-1',
        drawingKind: 'image',
        src: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAAQABADASIAAhEBAxEB/8QAFwAAAwEAAAAAAAAAAAAAAAAAAQIDB//EABYBAQEBAAAAAAAAAAAAAAAAAAABAv/aAAwDAQACEAMQAAAB1gAAAAAAAAAB/8QAFhEAAwAAAAAAAAAAAAAAAAAAAAER/9oACAEBAAEFAk//xAAVEQEBAAAAAAAAAAAAAAAAAAABEP/aAAgBAwEBPwEf/8QAFBEBAAAAAAAAAAAAAAAAAAAAIP/aAAgBAgEBPwE//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJf/8QAGxABAAICAwAAAAAAAAAAAAAAAQAREgMQITH/2gAIAQEAAT8h0WNcMB4uL1hYVf/Z',
        width: 100,
        height: 100,
      };

      const imageDrawingMeasure: DrawingMeasure = {
        kind: 'drawing',
        drawingKind: 'image',
        width: 100,
        height: 100,
        scale: 1,
        naturalWidth: 100,
        naturalHeight: 100,
        geometry: { width: 100, height: 100, rotation: 0, flipH: false, flipV: false },
      };

      const imageDrawingLayout: Layout = {
        pageSize: { w: 600, h: 800 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'drawing',
                blockId: 'img-drawing-1',
                drawingKind: 'image',
                x: 50,
                y: 50,
                width: 100,
                height: 100,
                geometry: { width: 100, height: 100, rotation: 0, flipH: false, flipV: false },
                scale: 1,
              },
            ],
          },
        ],
      };

      const painter = createPdfPainter({ blocks: [imageDrawing], measures: [imageDrawingMeasure] });
      const blob = await painter.render(imageDrawingLayout);
      const pdfText = await blob.text();

      // Should contain image XObject reference
      expect(pdfText).toContain('/XObject');
      expect(pdfText).toContain('Do'); // image display command
    });

    it('handles anchored drawings with z-index', async () => {
      const anchoredShape: VectorShapeDrawing = {
        kind: 'drawing',
        id: 'shape-anchored',
        drawingKind: 'vectorShape',
        geometry: { width: 60, height: 60, rotation: 0, flipH: false, flipV: false },
        shapeKind: 'rect',
        fillColor: '#FFFF00',
        anchor: {
          isAnchored: true,
          hRelativeFrom: 'page',
          vRelativeFrom: 'page',
          alignH: 'center',
          alignV: 'center',
        },
        zIndex: 10,
      };

      const anchoredMeasure: DrawingMeasure = {
        kind: 'drawing',
        drawingKind: 'vectorShape',
        width: 60,
        height: 60,
        scale: 1,
        naturalWidth: 60,
        naturalHeight: 60,
        geometry: { width: 60, height: 60, rotation: 0, flipH: false, flipV: false },
      };

      const anchoredLayout: Layout = {
        pageSize: { w: 600, h: 800 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'drawing',
                blockId: 'shape-anchored',
                drawingKind: 'vectorShape',
                x: 270,
                y: 370,
                width: 60,
                height: 60,
                isAnchored: true,
                zIndex: 10,
                geometry: { width: 60, height: 60, rotation: 0, flipH: false, flipV: false },
                scale: 1,
              },
            ],
          },
        ],
      };

      const painter = createPdfPainter({ blocks: [anchoredShape], measures: [anchoredMeasure] });
      const blob = await painter.render(anchoredLayout);
      const pdfText = await blob.text();

      // Should render the shape (anchoring doesn't affect PDF output, only positioning)
      expect(pdfText).toContain('re');
      expect(pdfText).toContain('1.0000 1.0000 0.0000 rg'); // yellow fill
    });

    it('handles missing drawing blocks gracefully', async () => {
      const missingLayout: Layout = {
        pageSize: { w: 600, h: 800 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'drawing',
                blockId: 'nonexistent',
                drawingKind: 'vectorShape',
                x: 100,
                y: 100,
                width: 50,
                height: 50,
                geometry: { width: 50, height: 50, rotation: 0, flipH: false, flipV: false },
                scale: 1,
              },
            ],
          },
        ],
      };

      const painter = createPdfPainter({ blocks: [], measures: [] });
      const blob = await painter.render(missingLayout);

      // Should not throw, should produce valid PDF
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(0);
    });
  });
});
