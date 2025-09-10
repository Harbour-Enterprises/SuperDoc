import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock table importer helpers used by the handler
vi.mock('@converter/v2/importer/tableImporter', () => ({
  getGridColumnWidths: vi.fn(() => [90, 100, 110]),
  getReferencedTableStyles: vi.fn(() => ({
    fontSize: '12pt',
    fonts: { ascii: { ascii: 'Arial' } },
    cellMargins: { marginLeft: 720, marginBottom: 240 },
  })),
}));

import { handleTableCellNode } from './legacy-handle-table-cell-node.js';

describe('legacy-handle-table-cell-node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds SuperDoc tableCell with attrs merged from tcPr, styles, borders, and vertical merge', () => {
    // tc with properties
    const cellNode = {
      name: 'w:tc',
      elements: [
        {
          name: 'w:tcPr',
          elements: [
            { name: 'w:tcW', attributes: { 'w:w': '1440', 'w:type': 'dxa' } }, // 1in => 96px
            { name: 'w:shd', attributes: { 'w:fill': '#ABCDEF' } },
            { name: 'w:gridSpan', attributes: { 'w:val': '2' } },
            {
              name: 'w:tcMar',
              elements: [
                { name: 'w:top', attributes: { 'w:w': '240' } }, // 12px
                { name: 'w:right', attributes: { 'w:w': '480' } }, // 24px
              ],
            },
            { name: 'w:vAlign', attributes: { 'w:val': 'center' } },
            { name: 'w:vMerge', attributes: { 'w:val': 'restart' } },
            {
              name: 'w:tcBorders',
              elements: [
                {
                  name: 'w:bottom',
                  attributes: { 'w:val': 'single', 'w:color': 'FF0000', 'w:sz': '24', 'w:space': '0' },
                },
                { name: 'w:left', attributes: { 'w:val': 'nil' } },
              ],
            },
          ],
        },
        { name: 'w:p' },
      ],
    };

    // row with our cell at index 1 in the tc-only filtered list
    const tcOther = { name: 'w:tc', elements: [] };
    const row1 = { name: 'w:tr', elements: [tcOther, cellNode] };
    // following rows contain continuation merges for the same cell position
    const row2 = {
      name: 'w:tr',
      elements: [
        { name: 'w:tc', elements: [] },
        { name: 'w:tc', elements: [{ name: 'w:tcPr', elements: [{ name: 'w:vMerge' }] }] },
      ],
    };
    const row3 = {
      name: 'w:tr',
      elements: [
        { name: 'w:tc', elements: [] },
        { name: 'w:tc', elements: [{ name: 'w:tcPr', elements: [{ name: 'w:vMerge' }] }] },
      ],
    };

    const table = { name: 'w:tbl', elements: [row1, row2, row3] };

    const rowBorders = {
      left: { color: '#00FF00', size: 1, space: 0 },
      right: { color: '#111111', size: 1, space: 1 },
    };

    const params = {
      docx: {},
      nodeListHandler: { handler: vi.fn(() => 'CONTENT') },
      path: [],
    };

    const out = handleTableCellNode({
      params,
      node: cellNode,
      table,
      row: row1,
      rowBorders,
      styleTag: { name: 'w:tblStyle', attributes: { 'w:val': 'TblGrid' } },
      columnIndex: 1,
      columnWidth: null,
    });

    expect(out.type).toBe('tableCell');
    expect(out.content).toBe('CONTENT');

    // width -> colwidth from column grid when colspan > 1
    expect(out.attrs.colwidth).toEqual([100, 110]);
    expect(out.attrs.widthUnit).toBe('px');
    expect(out.attrs.widthType).toBe('dxa');

    expect(out.attrs.colspan).toBe(2);
    expect(out.attrs.background).toEqual({ color: '#ABCDEF' });
    expect(out.attrs.verticalAlign).toBe('center');
    expect(out.attrs.fontSize).toBe('12pt');
    expect(out.attrs.fontFamily).toBe('Arial');

    // borders merged: inline bottom overrides; left set to none inherits from row with val=none
    expect(out.attrs.borders.bottom.color).toBe('#FF0000');
    expect(out.attrs.borders.bottom.size).toBeCloseTo(4, 3);
    expect(out.attrs.borders.left.val).toBe('none');
    // untouched right comes from rowBorders
    expect(out.attrs.borders.right).toEqual(rowBorders.right);

    // rowspan derived from vertical merge (restart + 2 continuations)
    expect(out.attrs.rowspan).toBe(3);
  });
});
