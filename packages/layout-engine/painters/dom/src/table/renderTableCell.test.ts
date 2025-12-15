import { describe, it, expect, beforeEach } from 'vitest';
import { renderTableCell } from './renderTableCell.js';
import type {
  ParagraphBlock,
  ParagraphMeasure,
  TableCell,
  TableCellMeasure,
  ImageBlock,
} from '@superdoc/contracts';

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
    renderLine: () => doc.createElement('div'),
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
});
