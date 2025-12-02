import { describe, it, expect, beforeEach } from 'vitest';
import { renderTableCell } from './renderTableCell.js';
import type { ParagraphBlock, ParagraphMeasure, TableCell, TableCellMeasure } from '@superdoc/contracts';

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
    const { contentElement } = renderTableCell({
      ...createBaseDeps(),
      cellMeasure: baseCellMeasure,
      cell: { ...baseCell, attrs: { verticalAlign: 'center' } },
    });

    expect(contentElement).toBeTruthy();
    expect(contentElement?.style.justifyContent).toBe('center');
  });

  it('bottom-aligns content when verticalAlign is bottom', () => {
    const { contentElement } = renderTableCell({
      ...createBaseDeps(),
      cellMeasure: baseCellMeasure,
      cell: { ...baseCell, attrs: { verticalAlign: 'bottom' } },
    });

    expect(contentElement).toBeTruthy();
    expect(contentElement?.style.justifyContent).toBe('flex-end');
  });

  it('sizes content area to available height', () => {
    const { contentElement } = renderTableCell({
      ...createBaseDeps(),
      cellMeasure: baseCellMeasure,
      cell: baseCell,
    });

    // rowHeight 40px minus default padding (top/bottom 2px each) = 36px
    expect(contentElement?.style.height).toBe('36px');
  });
});
