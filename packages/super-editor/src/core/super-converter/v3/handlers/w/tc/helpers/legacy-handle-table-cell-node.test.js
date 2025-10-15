import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock table importer helpers used by the handler
vi.mock('@converter/v2/importer/tableImporter', () => ({
  getGridColumnWidths: vi.fn(() => [90, 100, 110]),
  getReferencedTableStyles: vi.fn(() => ({
    fontSize: '12pt',
    fonts: { ascii: 'Arial' },
    cellMargins: { marginLeft: 720, marginBottom: 240 },
  })),
}));

import { handleTableCellNode } from './legacy-handle-table-cell-node.js';

const createEditorStub = (typeConfig = {}) => {
  const nodes = {};

  Object.entries(typeConfig).forEach(([type, config]) => {
    const { isInline = undefined, group = 'inline' } = config || {};
    nodes[type] = {
      isInline,
      spec: { group },
    };
  });

  return {
    schema: {
      nodes,
    },
  };
};

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
      editor: createEditorStub(),
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
      allColumnWidths: [90, 100, 110],
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

  it('moves leading bookmark markers into the first block within the cell', () => {
    const bookmarkStart = { type: 'bookmarkStart', attrs: { id: '0', name: 'title' } };
    const bookmarkEnd = { type: 'bookmarkEnd', attrs: { id: '0' } };
    const paragraph = { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] };

    const cellNode = { name: 'w:tc', elements: [] };
    const row = { name: 'w:tr', elements: [cellNode] };
    const table = { name: 'w:tbl', elements: [row] };

    const params = {
      docx: {},
      nodeListHandler: { handler: vi.fn(() => [bookmarkStart, bookmarkEnd, paragraph]) },
      path: [],
      editor: createEditorStub({
        bookmarkStart: { isInline: true },
        bookmarkEnd: { isInline: true },
        text: { isInline: true },
      }),
    };

    const out = handleTableCellNode({
      params,
      node: cellNode,
      table,
      row,
      rowBorders: {},
      styleTag: null,
      columnIndex: 0,
      columnWidth: null,
      allColumnWidths: [],
    });

    expect(out.type).toBe('tableCell');
    expect(Array.isArray(out.content)).toBe(true);
    expect(out.content).toHaveLength(1);
    const firstBlock = out.content[0];
    expect(firstBlock.type).toBe('paragraph');
    expect(firstBlock.content?.[0]).toEqual(bookmarkStart);
    expect(firstBlock.content?.[1]).toEqual(bookmarkEnd);
    expect(firstBlock.content?.[2]).toEqual(paragraph.content[0]);
  });

  it('appends trailing inline nodes to the last block when no subsequent block exists', () => {
    const bookmarkEnd = { type: 'bookmarkEnd', attrs: { id: '9' } };
    const paragraph = { type: 'paragraph', content: [{ type: 'text', text: 'Row' }] };

    const cellNode = { name: 'w:tc', elements: [] };
    const row = { name: 'w:tr', elements: [cellNode] };
    const table = { name: 'w:tbl', elements: [row] };

    const params = {
      docx: {},
      nodeListHandler: { handler: vi.fn(() => [paragraph, bookmarkEnd]) },
      path: [],
      editor: createEditorStub({
        bookmarkStart: { isInline: true },
        bookmarkEnd: { isInline: true },
        text: { isInline: true },
      }),
    };

    const out = handleTableCellNode({
      params,
      node: cellNode,
      table,
      row,
      rowBorders: {},
      styleTag: null,
      columnIndex: 0,
      columnWidth: null,
      allColumnWidths: [],
    });

    expect(out.content).toHaveLength(1);
    const firstBlock = out.content[0];
    expect(firstBlock.content?.[firstBlock.content.length - 1]).toEqual(bookmarkEnd);
  });

  it('preserves bookmark ordering when the cell ends with bookmark markers', () => {
    const paragraph = { type: 'paragraph', content: [{ type: 'text', text: 'Cell text' }] };
    const bookmarkStart = { type: 'bookmarkStart', attrs: { id: '12', name: 'cellBookmark' } };
    const bookmarkEnd = { type: 'bookmarkEnd', attrs: { id: '12' } };

    const cellNode = { name: 'w:tc', elements: [] };
    const row = { name: 'w:tr', elements: [cellNode] };
    const table = { name: 'w:tbl', elements: [row] };

    const params = {
      docx: {},
      nodeListHandler: { handler: vi.fn(() => [paragraph, bookmarkStart, bookmarkEnd]) },
      path: [],
      editor: createEditorStub({
        bookmarkStart: { isInline: true },
        bookmarkEnd: { isInline: true },
        text: { isInline: true },
      }),
    };

    const out = handleTableCellNode({
      params,
      node: cellNode,
      table,
      row,
      rowBorders: {},
      styleTag: null,
      columnIndex: 0,
      columnWidth: null,
      allColumnWidths: [],
    });

    expect(out.content).toHaveLength(1);
    const firstBlock = out.content[0];
    expect(firstBlock.type).toBe('paragraph');
    expect(firstBlock.content?.slice(-2)).toEqual([bookmarkStart, bookmarkEnd]);
  });

  it('wraps purely inline content in a fallback paragraph when no blocks exist', () => {
    const bookmarkStart = { type: 'bookmarkStart', attrs: { id: '42' } };
    const textNode = { type: 'text', text: 'inline text' };
    const bookmarkEnd = { type: 'bookmarkEnd', attrs: { id: '42' } };

    const cellNode = { name: 'w:tc', elements: [] };
    const row = { name: 'w:tr', elements: [cellNode] };
    const table = { name: 'w:tbl', elements: [row] };

    const params = {
      docx: {},
      nodeListHandler: { handler: vi.fn(() => [bookmarkStart, textNode, bookmarkEnd]) },
      path: [],
      editor: createEditorStub({
        bookmarkStart: { isInline: true },
        bookmarkEnd: { isInline: true },
        text: { isInline: true },
      }),
    };

    const out = handleTableCellNode({
      params,
      node: cellNode,
      table,
      row,
      rowBorders: {},
      styleTag: null,
      columnIndex: 0,
      columnWidth: null,
      allColumnWidths: [],
    });

    expect(out.content).toHaveLength(1);
    const fallbackParagraph = out.content[0];
    expect(fallbackParagraph.type).toBe('paragraph');
    expect(fallbackParagraph.content).toEqual([bookmarkStart, textNode, bookmarkEnd]);
  });

  it('merges inline nodes detected via schema groups into the previous block', () => {
    const paragraph = { type: 'paragraph', content: [{ type: 'text', text: 'Intro' }] };
    const mention = { type: 'mention', attrs: { id: 'x' } };
    const nextParagraph = { type: 'paragraph', content: [{ type: 'text', text: 'Next' }] };

    const cellNode = { name: 'w:tc', elements: [] };
    const row = { name: 'w:tr', elements: [cellNode] };
    const table = { name: 'w:tbl', elements: [row] };

    const params = {
      docx: {},
      nodeListHandler: { handler: vi.fn(() => [paragraph, mention, nextParagraph]) },
      path: [],
      editor: createEditorStub({
        text: { isInline: true },
        mention: { group: 'inline custom-inline' },
      }),
    };

    const out = handleTableCellNode({
      params,
      node: cellNode,
      table,
      row,
      rowBorders: {},
      styleTag: null,
      columnIndex: 0,
      columnWidth: null,
      allColumnWidths: [],
    });

    expect(out.content).toHaveLength(2);
    const firstParagraph = out.content[0];
    expect(firstParagraph.content?.slice(-1)[0]).toEqual(mention);
    expect(out.content[1]).toEqual(nextParagraph);
  });

  it('treats nodes missing schema entries as blocks and prepends pending inline content', () => {
    const bookmarkStart = { type: 'bookmarkStart', attrs: { id: '7' } };
    const customBlock = { type: 'customBlock', content: [{ type: 'text', text: 'Block text' }] };

    const cellNode = { name: 'w:tc', elements: [] };
    const row = { name: 'w:tr', elements: [cellNode] };
    const table = { name: 'w:tbl', elements: [row] };

    const params = {
      docx: {},
      nodeListHandler: { handler: vi.fn(() => [bookmarkStart, customBlock]) },
      path: [],
      editor: createEditorStub({
        bookmarkStart: { isInline: true },
        text: { isInline: true },
      }),
    };

    const out = handleTableCellNode({
      params,
      node: cellNode,
      table,
      row,
      rowBorders: {},
      styleTag: null,
      columnIndex: 0,
      columnWidth: null,
      allColumnWidths: [],
    });

    expect(out.content).toHaveLength(1);
    const blockNode = out.content[0];
    expect(blockNode.type).toBe('customBlock');
    expect(blockNode.content?.[0]).toEqual(bookmarkStart);
  });
});
