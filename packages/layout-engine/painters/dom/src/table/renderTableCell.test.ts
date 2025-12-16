import { describe, it, expect, beforeEach } from 'vitest';
import { renderTableCell } from './renderTableCell.js';
import type { ParagraphBlock, ParagraphMeasure, TableCell, TableCellMeasure, ImageBlock } from '@superdoc/contracts';

describe('renderTableCell', () => {
  let doc: Document;

  beforeEach(() => {
    doc = document.implementation.createHTMLDocument('table-cell');
  });

  const paragraphBlock: ParagraphBlock = {
    kind: 'paragraph',
    id: 'para-1',
    runs: [{ text: '1', fontFamily: 'Arial', fontSize: 16 }],
  };

  const paragraphMeasure: ParagraphMeasure = {
    kind: 'paragraph',
    lines: [
      {
        fromRun: 0,
        fromChar: 0,
        toRun: 0,
        toChar: 1,
        width: 10,
        ascent: 12,
        descent: 4,
        lineHeight: 20,
      },
    ],
    totalHeight: 20,
  };

  const baseCellMeasure: TableCellMeasure = {
    blocks: [paragraphMeasure],
    width: 80,
    height: 20,
    gridColumnStart: 0,
    colSpan: 1,
    rowSpan: 1,
  };

  const baseCell: TableCell = {
    id: 'cell-1-1',
    blocks: [paragraphBlock],
    attrs: {},
  };

  const createBaseDeps = () => ({
    doc,
    x: 0,
    y: 0,
    rowHeight: 40,
    borders: undefined,
    useDefaultBorder: false,
    context: { sectionIndex: 0, pageIndex: 0, columnIndex: 0 },
    renderLine: (_block, _line, _ctx, _lineIndex, _isLastLine) => doc.createElement('div'),
    applySdtDataset: () => {
      // noop for tests
    },
  });

  it('centers content when verticalAlign is center', () => {
    const { cellElement } = renderTableCell({
      ...createBaseDeps(),
      cellMeasure: baseCellMeasure,
      cell: { ...baseCell, attrs: { verticalAlign: 'center' } },
    });

    // Content is now a child of cellElement
    const contentElement = cellElement.firstElementChild as HTMLElement;
    expect(contentElement).toBeTruthy();
    expect(contentElement?.style.justifyContent).toBe('center');
  });

  it('bottom-aligns content when verticalAlign is bottom', () => {
    const { cellElement } = renderTableCell({
      ...createBaseDeps(),
      cellMeasure: baseCellMeasure,
      cell: { ...baseCell, attrs: { verticalAlign: 'bottom' } },
    });

    // Content is now a child of cellElement
    const contentElement = cellElement.firstElementChild as HTMLElement;
    expect(contentElement).toBeTruthy();
    expect(contentElement?.style.justifyContent).toBe('flex-end');
  });

  it('applies padding directly to cell element', () => {
    const { cellElement } = renderTableCell({
      ...createBaseDeps(),
      cellMeasure: baseCellMeasure,
      cell: baseCell,
    });

    // Default padding is top: 2, left: 4, right: 4, bottom: 2
    expect(cellElement.style.paddingTop).toBe('2px');
    expect(cellElement.style.paddingLeft).toBe('4px');
    expect(cellElement.style.paddingRight).toBe('4px');
    expect(cellElement.style.paddingBottom).toBe('2px');
  });

  it('content fills cell with 100% width and height', () => {
    const { cellElement } = renderTableCell({
      ...createBaseDeps(),
      cellMeasure: baseCellMeasure,
      cell: baseCell,
    });

    // Content is now a child of cellElement
    const contentElement = cellElement.firstElementChild as HTMLElement;
    expect(contentElement?.style.width).toBe('100%');
    expect(contentElement?.style.height).toBe('100%');
  });

  it('cell uses overflow hidden to clip content', () => {
    const { cellElement } = renderTableCell({
      ...createBaseDeps(),
      cellMeasure: baseCellMeasure,
      cell: baseCell,
    });

    expect(cellElement.style.overflow).toBe('hidden');
  });

  it('renders image blocks inside table cells', () => {
    const imageBlock: ImageBlock = {
      kind: 'image',
      id: 'img-1',
      src: 'data:image/png;base64,AAA',
    };
    const imageMeasure = {
      kind: 'image' as const,
      width: 50,
      height: 40,
    };

    const cellMeasure: TableCellMeasure = {
      blocks: [imageMeasure],
      width: 80,
      height: 40,
      gridColumnStart: 0,
      colSpan: 1,
      rowSpan: 1,
    };

    const cell: TableCell = {
      id: 'cell-with-image',
      blocks: [imageBlock],
      attrs: {},
    };

    const { cellElement } = renderTableCell({
      ...createBaseDeps(),
      cellMeasure,
      cell,
    });

    const imgEl = cellElement.querySelector('img.superdoc-table-image') as HTMLImageElement | null;
    expect(imgEl).toBeTruthy();
    expect(imgEl?.parentElement?.style.height).toBe('40px');
  });

  describe('spacing.after margin-bottom rendering', () => {
    it('should apply margin-bottom for spacing.after on paragraphs', () => {
      const para1: ParagraphBlock = {
        kind: 'paragraph',
        id: 'para-1',
        runs: [{ text: 'First paragraph', fontFamily: 'Arial', fontSize: 16 }],
        attrs: { spacing: { after: 10 } },
      };

      const para2: ParagraphBlock = {
        kind: 'paragraph',
        id: 'para-2',
        runs: [{ text: 'Second paragraph', fontFamily: 'Arial', fontSize: 16 }],
        attrs: { spacing: { after: 20 } },
      };

      const measure1: ParagraphMeasure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 15,
            width: 100,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
        ],
        totalHeight: 20,
      };

      const measure2: ParagraphMeasure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 16,
            width: 100,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
        ],
        totalHeight: 20,
      };

      const cellMeasure: TableCellMeasure = {
        blocks: [measure1, measure2],
        width: 120,
        height: 60,
        gridColumnStart: 0,
        colSpan: 1,
        rowSpan: 1,
      };

      const cell: TableCell = {
        id: 'cell-spacing',
        blocks: [para1, para2],
        attrs: {},
      };

      const { cellElement } = renderTableCell({
        ...createBaseDeps(),
        cellMeasure,
        cell,
      });

      const contentElement = cellElement.firstElementChild as HTMLElement;
      expect(contentElement).toBeTruthy();

      // Get paragraph wrappers
      const paraWrappers = contentElement.children;
      expect(paraWrappers.length).toBe(2);

      const firstParaWrapper = paraWrappers[0] as HTMLElement;
      const secondParaWrapper = paraWrappers[1] as HTMLElement;

      // Both paragraphs should have margin-bottom for spacing.after
      expect(firstParaWrapper.style.marginBottom).toBe('10px');
      expect(secondParaWrapper.style.marginBottom).toBe('20px');
    });

    it('should apply spacing.after even to the last paragraph', () => {
      const lastPara: ParagraphBlock = {
        kind: 'paragraph',
        id: 'para-last',
        runs: [{ text: 'Last paragraph', fontFamily: 'Arial', fontSize: 16 }],
        attrs: { spacing: { after: 15 } },
      };

      const measure: ParagraphMeasure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 14,
            width: 100,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
        ],
        totalHeight: 20,
      };

      const cellMeasure: TableCellMeasure = {
        blocks: [measure],
        width: 120,
        height: 40,
        gridColumnStart: 0,
        colSpan: 1,
        rowSpan: 1,
      };

      const cell: TableCell = {
        id: 'cell-last',
        blocks: [lastPara],
        attrs: {},
      };

      const { cellElement } = renderTableCell({
        ...createBaseDeps(),
        cellMeasure,
        cell,
      });

      const contentElement = cellElement.firstElementChild as HTMLElement;
      const paraWrapper = contentElement.firstElementChild as HTMLElement;

      // Last paragraph should still have margin-bottom applied
      // This matches Word's behavior
      expect(paraWrapper.style.marginBottom).toBe('15px');
    });

    it('should only apply margin-bottom when spacing.after > 0', () => {
      const para1: ParagraphBlock = {
        kind: 'paragraph',
        id: 'para-1',
        runs: [{ text: 'Zero spacing', fontFamily: 'Arial', fontSize: 16 }],
        attrs: { spacing: { after: 0 } },
      };

      const para2: ParagraphBlock = {
        kind: 'paragraph',
        id: 'para-2',
        runs: [{ text: 'Negative spacing', fontFamily: 'Arial', fontSize: 16 }],
        attrs: { spacing: { after: -5 } },
      };

      const para3: ParagraphBlock = {
        kind: 'paragraph',
        id: 'para-3',
        runs: [{ text: 'Positive spacing', fontFamily: 'Arial', fontSize: 16 }],
        attrs: { spacing: { after: 10 } },
      };

      const measure: ParagraphMeasure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 10,
            width: 100,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
        ],
        totalHeight: 20,
      };

      const cellMeasure: TableCellMeasure = {
        blocks: [measure, measure, measure],
        width: 120,
        height: 80,
        gridColumnStart: 0,
        colSpan: 1,
        rowSpan: 1,
      };

      const cell: TableCell = {
        id: 'cell-conditional',
        blocks: [para1, para2, para3],
        attrs: {},
      };

      const { cellElement } = renderTableCell({
        ...createBaseDeps(),
        cellMeasure,
        cell,
      });

      const contentElement = cellElement.firstElementChild as HTMLElement;
      const paraWrappers = contentElement.children;

      const wrapper1 = paraWrappers[0] as HTMLElement;
      const wrapper2 = paraWrappers[1] as HTMLElement;
      const wrapper3 = paraWrappers[2] as HTMLElement;

      // Zero and negative spacing should not result in margin-bottom
      expect(wrapper1.style.marginBottom).toBe('');
      expect(wrapper2.style.marginBottom).toBe('');

      // Positive spacing should have margin-bottom
      expect(wrapper3.style.marginBottom).toBe('10px');
    });

    it('should handle paragraphs without spacing.after attribute', () => {
      const para: ParagraphBlock = {
        kind: 'paragraph',
        id: 'para-no-spacing',
        runs: [{ text: 'No spacing attr', fontFamily: 'Arial', fontSize: 16 }],
        attrs: {},
      };

      const measure: ParagraphMeasure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 15,
            width: 100,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
        ],
        totalHeight: 20,
      };

      const cellMeasure: TableCellMeasure = {
        blocks: [measure],
        width: 120,
        height: 40,
        gridColumnStart: 0,
        colSpan: 1,
        rowSpan: 1,
      };

      const cell: TableCell = {
        id: 'cell-no-attr',
        blocks: [para],
        attrs: {},
      };

      const { cellElement } = renderTableCell({
        ...createBaseDeps(),
        cellMeasure,
        cell,
      });

      const contentElement = cellElement.firstElementChild as HTMLElement;
      const paraWrapper = contentElement.firstElementChild as HTMLElement;

      // Should not have margin-bottom when no spacing.after
      expect(paraWrapper.style.marginBottom).toBe('');
    });

    it('should handle type safety for spacing.after', () => {
      const para1: ParagraphBlock = {
        kind: 'paragraph',
        id: 'para-1',
        runs: [{ text: 'Valid number', fontFamily: 'Arial', fontSize: 16 }],
        attrs: { spacing: { after: 10 } },
      };

      const para2: ParagraphBlock = {
        kind: 'paragraph',
        id: 'para-2',
        runs: [{ text: 'Invalid type', fontFamily: 'Arial', fontSize: 16 }],
        attrs: { spacing: { after: '15' as unknown as number } },
      };

      const measure: ParagraphMeasure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 10,
            width: 100,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
        ],
        totalHeight: 20,
      };

      const cellMeasure: TableCellMeasure = {
        blocks: [measure, measure],
        width: 120,
        height: 60,
        gridColumnStart: 0,
        colSpan: 1,
        rowSpan: 1,
      };

      const cell: TableCell = {
        id: 'cell-type-safety',
        blocks: [para1, para2],
        attrs: {},
      };

      const { cellElement } = renderTableCell({
        ...createBaseDeps(),
        cellMeasure,
        cell,
      });

      const contentElement = cellElement.firstElementChild as HTMLElement;
      const paraWrappers = contentElement.children;

      const wrapper1 = paraWrappers[0] as HTMLElement;
      const wrapper2 = paraWrappers[1] as HTMLElement;

      // Valid number should apply margin-bottom
      expect(wrapper1.style.marginBottom).toBe('10px');

      // Invalid type (string) should not apply margin-bottom
      expect(wrapper2.style.marginBottom).toBe('');
    });

    it('should only apply spacing when rendering entire block (not partial)', () => {
      const para: ParagraphBlock = {
        kind: 'paragraph',
        id: 'para-partial',
        runs: [{ text: 'Partial render test', fontFamily: 'Arial', fontSize: 16 }],
        attrs: { spacing: { after: 15 } },
      };

      const measure: ParagraphMeasure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 10,
            width: 100,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
          {
            fromRun: 0,
            fromChar: 10,
            toRun: 0,
            toChar: 19,
            width: 100,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
        ],
        totalHeight: 40,
      };

      const cellMeasure: TableCellMeasure = {
        blocks: [measure],
        width: 120,
        height: 60,
        gridColumnStart: 0,
        colSpan: 1,
        rowSpan: 1,
      };

      const cell: TableCell = {
        id: 'cell-partial',
        blocks: [para],
        attrs: {},
      };

      // Render only first line (partial)
      const { cellElement: partialCell } = renderTableCell({
        ...createBaseDeps(),
        cellMeasure,
        cell,
        fromLine: 0,
        toLine: 1,
      });

      const partialContent = partialCell.firstElementChild as HTMLElement;
      const partialWrapper = partialContent.firstElementChild as HTMLElement;

      // Partial render should NOT apply spacing.after
      expect(partialWrapper.style.marginBottom).toBe('');

      // Render entire block
      const { cellElement: fullCell } = renderTableCell({
        ...createBaseDeps(),
        cellMeasure,
        cell,
      });

      const fullContent = fullCell.firstElementChild as HTMLElement;
      const fullWrapper = fullContent.firstElementChild as HTMLElement;

      // Full render SHOULD apply spacing.after
      expect(fullWrapper.style.marginBottom).toBe('15px');
    });
  });

  describe('list marker rendering', () => {
    const createParagraphWithMarker = (markerText: string, markerWidth = 20, gutterWidth = 8, indentLeft = 30) => {
      const para: ParagraphBlock = {
        kind: 'paragraph',
        id: 'para-list',
        runs: [{ text: 'List item text', fontFamily: 'Arial', fontSize: 16 }],
        attrs: {
          wordLayout: {
            marker: {
              markerText,
              markerBoxWidthPx: markerWidth,
              gutterWidthPx: gutterWidth,
              justification: 'left' as const,
              run: {
                fontFamily: 'Arial',
                fontSize: 14,
                bold: false,
                italic: false,
                color: '#000000',
              },
            },
            indentLeftPx: indentLeft,
          },
        },
      };

      const measure: ParagraphMeasure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 14,
            width: 100,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
        ],
        totalHeight: 20,
        marker: {
          markerWidth,
          gutterWidth,
          indentLeft,
        },
      };

      return { para, measure };
    };

    it('should render bullet list marker with correct positioning', () => {
      const { para, measure } = createParagraphWithMarker('•');

      const cellMeasure: TableCellMeasure = {
        blocks: [measure],
        width: 120,
        height: 40,
        gridColumnStart: 0,
        colSpan: 1,
        rowSpan: 1,
      };

      const cell: TableCell = {
        id: 'cell-bullet-list',
        blocks: [para],
        attrs: {},
      };

      const { cellElement } = renderTableCell({
        ...createBaseDeps(),
        cellMeasure,
        cell,
      });

      const contentElement = cellElement.firstElementChild as HTMLElement;
      const paraWrapper = contentElement.firstElementChild as HTMLElement;
      const lineContainer = paraWrapper.firstElementChild as HTMLElement;

      // Marker should be in a positioned container
      expect(lineContainer.style.position).toBe('relative');

      const markerEl = lineContainer.querySelector('.superdoc-paragraph-marker') as HTMLElement;
      expect(markerEl).toBeTruthy();
      expect(markerEl.textContent).toBe('•');
      expect(markerEl.style.position).toBe('absolute');
    });

    it('should render numbered list marker with correct text', () => {
      const { para, measure } = createParagraphWithMarker('1.');

      const cellMeasure: TableCellMeasure = {
        blocks: [measure],
        width: 120,
        height: 40,
        gridColumnStart: 0,
        colSpan: 1,
        rowSpan: 1,
      };

      const cell: TableCell = {
        id: 'cell-numbered-list',
        blocks: [para],
        attrs: {},
      };

      const { cellElement } = renderTableCell({
        ...createBaseDeps(),
        cellMeasure,
        cell,
      });

      const contentElement = cellElement.firstElementChild as HTMLElement;
      const paraWrapper = contentElement.firstElementChild as HTMLElement;
      const lineContainer = paraWrapper.firstElementChild as HTMLElement;
      const markerEl = lineContainer.querySelector('.superdoc-paragraph-marker') as HTMLElement;

      expect(markerEl).toBeTruthy();
      expect(markerEl.textContent).toBe('1.');
    });

    it('should apply marker styling (font, color, bold, italic)', () => {
      const { para, measure } = createParagraphWithMarker('a)');
      if (para.attrs?.wordLayout?.marker) {
        para.attrs.wordLayout.marker.run = {
          fontFamily: 'Times New Roman',
          fontSize: 18,
          bold: true,
          italic: true,
          color: '#FF0000',
          letterSpacing: 2,
        };
      }

      const cellMeasure: TableCellMeasure = {
        blocks: [measure],
        width: 120,
        height: 40,
        gridColumnStart: 0,
        colSpan: 1,
        rowSpan: 1,
      };

      const cell: TableCell = {
        id: 'cell-styled-marker',
        blocks: [para],
        attrs: {},
      };

      const { cellElement } = renderTableCell({
        ...createBaseDeps(),
        cellMeasure,
        cell,
      });

      const contentElement = cellElement.firstElementChild as HTMLElement;
      const paraWrapper = contentElement.firstElementChild as HTMLElement;
      const lineContainer = paraWrapper.firstElementChild as HTMLElement;
      const markerEl = lineContainer.querySelector('.superdoc-paragraph-marker') as HTMLElement;

      expect(markerEl.style.fontFamily).toBe('Times New Roman, sans-serif');
      expect(markerEl.style.fontSize).toBe('18px');
      expect(markerEl.style.fontWeight).toBe('bold');
      expect(markerEl.style.fontStyle).toBe('italic');
      expect(markerEl.style.color).toBe('rgb(255, 0, 0)');
      expect(markerEl.style.letterSpacing).toBe('2px');
    });

    it('should handle marker justification (left, center, right)', () => {
      const testCases: Array<{ justification: 'left' | 'center' | 'right'; expectedAlign: string }> = [
        { justification: 'left', expectedAlign: 'left' },
        { justification: 'center', expectedAlign: 'center' },
        { justification: 'right', expectedAlign: 'right' },
      ];

      testCases.forEach(({ justification, expectedAlign }) => {
        const { para, measure } = createParagraphWithMarker('•');
        if (para.attrs?.wordLayout?.marker) {
          para.attrs.wordLayout.marker.justification = justification;
        }

        const cellMeasure: TableCellMeasure = {
          blocks: [measure],
          width: 120,
          height: 40,
          gridColumnStart: 0,
          colSpan: 1,
          rowSpan: 1,
        };

        const cell: TableCell = {
          id: `cell-marker-${justification}`,
          blocks: [para],
          attrs: {},
        };

        const { cellElement } = renderTableCell({
          ...createBaseDeps(),
          cellMeasure,
          cell,
        });

        const contentElement = cellElement.firstElementChild as HTMLElement;
        const paraWrapper = contentElement.firstElementChild as HTMLElement;
        const lineContainer = paraWrapper.firstElementChild as HTMLElement;
        const markerEl = lineContainer.querySelector('.superdoc-paragraph-marker') as HTMLElement;

        expect(markerEl.style.textAlign).toBe(expectedAlign);
      });
    });

    it('should apply proper indentation when marker is present', () => {
      const indentLeft = 50;
      const { para, measure } = createParagraphWithMarker('1.', 20, 8, indentLeft);

      const cellMeasure: TableCellMeasure = {
        blocks: [measure],
        width: 120,
        height: 40,
        gridColumnStart: 0,
        colSpan: 1,
        rowSpan: 1,
      };

      const cell: TableCell = {
        id: 'cell-indented-marker',
        blocks: [para],
        attrs: {},
      };

      const { cellElement } = renderTableCell({
        ...createBaseDeps(),
        cellMeasure,
        cell,
      });

      const contentElement = cellElement.firstElementChild as HTMLElement;
      const paraWrapper = contentElement.firstElementChild as HTMLElement;
      const lineContainer = paraWrapper.firstElementChild as HTMLElement;
      const lineEl = lineContainer.querySelector('div:not(.superdoc-paragraph-marker)') as HTMLElement;

      // Text should have padding equal to indentLeft
      expect(lineEl.style.paddingLeft).toBe(`${indentLeft}px`);
    });

    it('should only render marker on first line of paragraph', () => {
      const { para, measure } = createParagraphWithMarker('•');

      // Add a second line
      const measureWith2Lines: ParagraphMeasure = {
        ...measure,
        lines: [
          ...(measure.lines ?? []),
          {
            fromRun: 0,
            fromChar: 14,
            toRun: 0,
            toChar: 28,
            width: 100,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
        ],
        totalHeight: 40,
      };

      const cellMeasure: TableCellMeasure = {
        blocks: [measureWith2Lines],
        width: 120,
        height: 60,
        gridColumnStart: 0,
        colSpan: 1,
        rowSpan: 1,
      };

      const cell: TableCell = {
        id: 'cell-multiline-list',
        blocks: [para],
        attrs: {},
      };

      const { cellElement } = renderTableCell({
        ...createBaseDeps(),
        cellMeasure,
        cell,
      });

      const contentElement = cellElement.firstElementChild as HTMLElement;
      const paraWrapper = contentElement.firstElementChild as HTMLElement;

      // First child should be a container with marker
      const firstLineContainer = paraWrapper.children[0] as HTMLElement;
      const firstMarker = firstLineContainer.querySelector('.superdoc-paragraph-marker');
      expect(firstMarker).toBeTruthy();

      // Second child should be just a line element without marker
      const secondLine = paraWrapper.children[1] as HTMLElement;
      const secondMarker = secondLine.querySelector('.superdoc-paragraph-marker');
      expect(secondMarker).toBeNull();
    });

    it('should handle missing markerLayout gracefully', () => {
      const para: ParagraphBlock = {
        kind: 'paragraph',
        id: 'para-no-marker',
        runs: [{ text: 'Regular paragraph', fontFamily: 'Arial', fontSize: 16 }],
        attrs: {},
      };

      const measure: ParagraphMeasure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 17,
            width: 100,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
        ],
        totalHeight: 20,
      };

      const cellMeasure: TableCellMeasure = {
        blocks: [measure],
        width: 120,
        height: 40,
        gridColumnStart: 0,
        colSpan: 1,
        rowSpan: 1,
      };

      const cell: TableCell = {
        id: 'cell-no-marker',
        blocks: [para],
        attrs: {},
      };

      const { cellElement } = renderTableCell({
        ...createBaseDeps(),
        cellMeasure,
        cell,
      });

      const contentElement = cellElement.firstElementChild as HTMLElement;
      const paraWrapper = contentElement.firstElementChild as HTMLElement;
      const markerEl = paraWrapper.querySelector('.superdoc-paragraph-marker');

      expect(markerEl).toBeNull();
    });

    it('should handle paragraphs with markerLayout but zero markerWidth', () => {
      const { para, measure } = createParagraphWithMarker('', 0, 8, 30);

      const cellMeasure: TableCellMeasure = {
        blocks: [measure],
        width: 120,
        height: 40,
        gridColumnStart: 0,
        colSpan: 1,
        rowSpan: 1,
      };

      const cell: TableCell = {
        id: 'cell-zero-width-marker',
        blocks: [para],
        attrs: {},
      };

      const { cellElement } = renderTableCell({
        ...createBaseDeps(),
        cellMeasure,
        cell,
      });

      const contentElement = cellElement.firstElementChild as HTMLElement;
      const paraWrapper = contentElement.firstElementChild as HTMLElement;
      const markerEl = paraWrapper.querySelector('.superdoc-paragraph-marker');

      // Marker should not be rendered when markerWidth is 0
      expect(markerEl).toBeNull();
    });

    it('should handle partial line rendering without marker on continuation', () => {
      const { para, measure } = createParagraphWithMarker('1.');

      const measureWith2Lines: ParagraphMeasure = {
        ...measure,
        lines: [
          ...(measure.lines ?? []),
          {
            fromRun: 0,
            fromChar: 14,
            toRun: 0,
            toChar: 28,
            width: 100,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
        ],
        totalHeight: 40,
      };

      const cellMeasure: TableCellMeasure = {
        blocks: [measureWith2Lines],
        width: 120,
        height: 60,
        gridColumnStart: 0,
        colSpan: 1,
        rowSpan: 1,
      };

      const cell: TableCell = {
        id: 'cell-partial-render',
        blocks: [para],
        attrs: {},
      };

      // Render only the second line (skip first line with marker)
      const { cellElement } = renderTableCell({
        ...createBaseDeps(),
        cellMeasure,
        cell,
        fromLine: 1,
        toLine: 2,
      });

      const contentElement = cellElement.firstElementChild as HTMLElement;
      const paraWrapper = contentElement.firstElementChild as HTMLElement;
      const markerEl = paraWrapper.querySelector('.superdoc-paragraph-marker');

      // Marker should not be rendered when starting from line > 0
      expect(markerEl).toBeNull();
    });
  });

  describe('renderDrawingContent callback', () => {
    it('should render ShapeGroup drawing blocks via callback', () => {
      const shapeGroupBlock = {
        kind: 'drawing' as const,
        id: 'drawing-1',
        drawingKind: 'shapeGroup' as const,
        geometry: { width: 200, height: 150, rotation: 0, flipH: false, flipV: false },
        shapes: [
          {
            shapeType: 'image',
            attrs: {
              x: 0,
              y: 0,
              width: 100,
              height: 100,
              src: 'data:image/png;base64,test',
            },
          },
        ],
      };

      const drawingMeasure = {
        kind: 'drawing' as const,
        width: 200,
        height: 150,
      };

      const cellMeasure = {
        blocks: [drawingMeasure],
        width: 220,
        height: 170,
        gridColumnStart: 0,
        colSpan: 1,
        rowSpan: 1,
      };

      const cell = {
        id: 'cell-with-shapegroup',
        blocks: [shapeGroupBlock],
        attrs: {},
      };

      const mockRenderDrawingContent = (block: any): HTMLElement => {
        const div = doc.createElement('div');
        div.classList.add('mock-shapegroup');
        div.setAttribute('data-drawing-id', block.id);
        div.setAttribute('data-drawing-kind', block.drawingKind);
        return div;
      };

      const { cellElement } = renderTableCell({
        ...createBaseDeps(),
        cellMeasure,
        cell,
        renderDrawingContent: mockRenderDrawingContent,
      });

      const shapeGroupEl = cellElement.querySelector('.mock-shapegroup') as HTMLElement;
      expect(shapeGroupEl).toBeTruthy();
      expect(shapeGroupEl.getAttribute('data-drawing-id')).toBe('drawing-1');
      expect(shapeGroupEl.getAttribute('data-drawing-kind')).toBe('shapeGroup');
      expect(shapeGroupEl.style.width).toBe('100%');
      expect(shapeGroupEl.style.height).toBe('100%');
    });

    it('should render VectorShape drawing blocks via callback', () => {
      const vectorShapeBlock = {
        kind: 'drawing' as const,
        id: 'drawing-2',
        drawingKind: 'vectorShape' as const,
        geometry: { width: 100, height: 100, rotation: 0, flipH: false, flipV: false },
        shapeKind: 'rect' as const,
      };

      const drawingMeasure = {
        kind: 'drawing' as const,
        width: 100,
        height: 100,
      };

      const cellMeasure = {
        blocks: [drawingMeasure],
        width: 120,
        height: 120,
        gridColumnStart: 0,
        colSpan: 1,
        rowSpan: 1,
      };

      const cell = {
        id: 'cell-with-vectorshape',
        blocks: [vectorShapeBlock],
        attrs: {},
      };

      const mockRenderDrawingContent = (block: any): HTMLElement => {
        const div = doc.createElement('div');
        div.classList.add('mock-vectorshape');
        div.setAttribute('data-shape-kind', block.shapeKind);
        return div;
      };

      const { cellElement } = renderTableCell({
        ...createBaseDeps(),
        cellMeasure,
        cell,
        renderDrawingContent: mockRenderDrawingContent,
      });

      const vectorShapeEl = cellElement.querySelector('.mock-vectorshape') as HTMLElement;
      expect(vectorShapeEl).toBeTruthy();
      expect(vectorShapeEl.getAttribute('data-shape-kind')).toBe('rect');
      expect(vectorShapeEl.style.width).toBe('100%');
      expect(vectorShapeEl.style.height).toBe('100%');
    });

    it('should use placeholder fallback when callback is undefined', () => {
      const shapeGroupBlock = {
        kind: 'drawing' as const,
        id: 'drawing-3',
        drawingKind: 'shapeGroup' as const,
        geometry: { width: 200, height: 150, rotation: 0, flipH: false, flipV: false },
        shapes: [],
      };

      const drawingMeasure = {
        kind: 'drawing' as const,
        width: 200,
        height: 150,
      };

      const cellMeasure = {
        blocks: [drawingMeasure],
        width: 220,
        height: 170,
        gridColumnStart: 0,
        colSpan: 1,
        rowSpan: 1,
      };

      const cell = {
        id: 'cell-no-callback',
        blocks: [shapeGroupBlock],
        attrs: {},
      };

      const { cellElement } = renderTableCell({
        ...createBaseDeps(),
        cellMeasure,
        cell,
        // renderDrawingContent is undefined
      });

      // Should render placeholder with diagonal stripes pattern
      const drawingWrapper = cellElement.querySelector('.superdoc-table-drawing') as HTMLElement;
      expect(drawingWrapper).toBeTruthy();

      const placeholder = drawingWrapper.firstChild as HTMLElement;
      expect(placeholder).toBeTruthy();
      expect(placeholder.style.background).toContain('repeating-linear-gradient');
      expect(placeholder.style.border).toContain('dashed');
    });

    it('should pass correct DrawingBlock parameter to callback', () => {
      const shapeGroupBlock = {
        kind: 'drawing' as const,
        id: 'drawing-4',
        drawingKind: 'shapeGroup' as const,
        geometry: { width: 300, height: 200, rotation: 45, flipH: true, flipV: false },
        shapes: [{ shapeType: 'image', attrs: { x: 0, y: 0, width: 100, height: 100, src: 'test.png' } }],
      };

      const drawingMeasure = {
        kind: 'drawing' as const,
        width: 300,
        height: 200,
      };

      const cellMeasure = {
        blocks: [drawingMeasure],
        width: 320,
        height: 220,
        gridColumnStart: 0,
        colSpan: 1,
        rowSpan: 1,
      };

      const cell = {
        id: 'cell-verify-params',
        blocks: [shapeGroupBlock],
        attrs: {},
      };

      let capturedBlock: any = null;

      const mockRenderDrawingContent = (block: any): HTMLElement => {
        capturedBlock = block;
        return doc.createElement('div');
      };

      renderTableCell({
        ...createBaseDeps(),
        cellMeasure,
        cell,
        renderDrawingContent: mockRenderDrawingContent,
      });

      // Verify the callback received the correct block
      expect(capturedBlock).toBeTruthy();
      expect(capturedBlock.kind).toBe('drawing');
      expect(capturedBlock.id).toBe('drawing-4');
      expect(capturedBlock.drawingKind).toBe('shapeGroup');
      expect(capturedBlock.geometry.width).toBe(300);
      expect(capturedBlock.geometry.height).toBe(200);
      expect(capturedBlock.geometry.rotation).toBe(45);
      expect(capturedBlock.geometry.flipH).toBe(true);
      expect(capturedBlock.shapes.length).toBe(1);
    });

    it('should apply width and height styles to returned element', () => {
      const vectorShapeBlock = {
        kind: 'drawing' as const,
        id: 'drawing-5',
        drawingKind: 'vectorShape' as const,
        geometry: { width: 150, height: 100, rotation: 0, flipH: false, flipV: false },
        shapeKind: 'ellipse' as const,
      };

      const drawingMeasure = {
        kind: 'drawing' as const,
        width: 150,
        height: 100,
      };

      const cellMeasure = {
        blocks: [drawingMeasure],
        width: 170,
        height: 120,
        gridColumnStart: 0,
        colSpan: 1,
        rowSpan: 1,
      };

      const cell = {
        id: 'cell-verify-styles',
        blocks: [vectorShapeBlock],
        attrs: {},
      };

      const mockRenderDrawingContent = (block: any): HTMLElement => {
        const div = doc.createElement('div');
        div.classList.add('test-drawing-element');
        // Initially has no width/height styles
        return div;
      };

      const { cellElement } = renderTableCell({
        ...createBaseDeps(),
        cellMeasure,
        cell,
        renderDrawingContent: mockRenderDrawingContent,
      });

      const drawingEl = cellElement.querySelector('.test-drawing-element') as HTMLElement;
      expect(drawingEl).toBeTruthy();

      // Verify that width and height styles were applied by renderTableCell
      expect(drawingEl.style.width).toBe('100%');
      expect(drawingEl.style.height).toBe('100%');
    });
  });
});
