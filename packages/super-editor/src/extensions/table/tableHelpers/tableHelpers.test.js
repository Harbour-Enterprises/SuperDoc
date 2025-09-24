import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { CellSelection } from 'prosemirror-tables';
import { initTestEditor } from '@tests/helpers/helpers.js';
import { createTable } from './createTable.js';
import { createCell } from './createCell.js';
import { createColGroup } from './createColGroup.js';
import { createTableBorders } from './createTableBorders.js';
import { getColStyleDeclaration } from './getColStyleDeclaration.js';
import { deleteTableWhenSelected } from './deleteTableWhenSelected.js';
import { isCellSelection } from './isCellSelection.js';
import { cellAround } from './cellAround.js';
import { cellWrapping } from './cellWrapping.js';

const cellMinWidth = 80;

describe('tableHelpers', () => {
  let editor;
  let schema;
  let basePlugins;

  beforeEach(() => {
    ({ editor } = initTestEditor({ mode: 'text', content: '<p></p>' }));
    schema = editor.schema;
    basePlugins = editor.state.plugins;
  });

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  const buildTableDoc = (rows = 2, cols = 2, withHeaderRow = false) => {
    const table = createTable(schema, rows, cols, withHeaderRow);
    const doc = schema.nodes.doc.create(null, [table]);
    const state = EditorState.create({ schema, doc, plugins: basePlugins });
    return { table, doc, state };
  };

  const getCellPositions = (doc) => {
    const positions = [];
    doc.descendants((node, pos) => {
      if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
        positions.push(pos);
      }
    });
    return positions;
  };

  it('cellAround resolves position inside a table cell', () => {
    const { doc } = buildTableDoc();
    const [firstCellPos] = getCellPositions(doc);
    const $insideCell = doc.resolve(firstCellPos + 1);

    const resolved = cellAround($insideCell);
    expect(resolved).toBeDefined();
    expect(resolved.pos).toBe(firstCellPos);

    const outside = cellAround(doc.resolve(doc.content.size));
    expect(outside).toBeNull();
  });

  it('cellWrapping returns the wrapping cell node when selection is inside', () => {
    const { doc } = buildTableDoc();
    const [firstCellPos] = getCellPositions(doc);
    const $insideCell = doc.resolve(firstCellPos + 1);

    const wrapping = cellWrapping($insideCell);
    expect(wrapping?.type.name).toBe('tableCell');

    const outside = cellWrapping(doc.resolve(0));
    expect(outside).toBeNull();
  });

  it('createCell produces cells with default or custom content', () => {
    const cellType = schema.nodes.tableCell;

    const emptyCell = createCell(cellType);
    expect(emptyCell.type.name).toBe('tableCell');
    expect(emptyCell.content.firstChild.type.name).toBe('paragraph');

    const customParagraph = schema.nodes.paragraph.create(null, schema.text('Hello'));
    const filledCell = createCell(cellType, customParagraph);
    expect(filledCell.content.firstChild.textContent).toBe('Hello');
  });

  const buildRowTable = (widths, overrideCol, overrideValue) => {
    const cellType = schema.nodes.tableCell;
    const rowType = schema.nodes.tableRow;
    const tableType = schema.nodes.table;

    const rowCells = widths.map((width, index) => {
      const attrs = {
        colspan: 1,
        rowspan: 1,
      };
      if (typeof width === 'number') {
        attrs.colwidth = [width];
      } else {
        attrs.colwidth = null;
      }
      const content = schema.nodes.paragraph.create(null, schema.text(String.fromCharCode(65 + index)));
      return cellType.create(attrs, content);
    });

    const row = rowType.create(null, rowCells);
    const table = tableType.create(null, [row]);
    return createColGroup(table, cellMinWidth, overrideCol, overrideValue);
  };

  it('createColGroup calculates widths when fixed widths are available', () => {
    const result = buildRowTable([120, 90, 110], null, null);
    expect(result.tableWidth).toBe('320px');
    expect(result.tableMinWidth).toBe('');
    expect(result.colgroup[0]).toBe('colgroup');
    expect(result.colgroupValues).toEqual([120, 90, 110]);
    const [, , firstCol] = result.colgroup;
    expect(firstCol[1].style).toBe('width: 120px');
  });

  it('createColGroup falls back to min-width and optional overrides when widths missing', () => {
    const result = buildRowTable([null, null], 1, 200);
    expect(result.tableWidth).toBe('');
    expect(result.tableMinWidth).toBe('280px');
    expect(result.colgroupValues).toEqual([cellMinWidth, 200]);
    const [, , firstCol, secondCol] = result.colgroup;
    expect(firstCol[1].style).toBe(`min-width: ${cellMinWidth}px`);
    expect(secondCol[1].style).toBe('width: 200px');
  });

  it('createTable builds tables with rows, optional header, and borders', () => {
    const table = createTable(schema, 2, 3, true);
    expect(table.type.name).toBe('table');
    expect(table.firstChild.childCount).toBe(3);
    expect(table.attrs.borders.top).toBeDefined();
    const headerCell = table.firstChild.firstChild;
    expect(headerCell.type.name).toBe('tableHeader');
  });

  it('createTableBorders assigns uniform border configuration', () => {
    const borders = createTableBorders({ size: 2, color: '#ccc' });
    expect(borders.top).toEqual({ size: 2, color: '#ccc' });
    expect(borders.insideV).toEqual({ size: 2, color: '#ccc' });
  });

  it('getColStyleDeclaration chooses width or min-width based on availability', () => {
    expect(getColStyleDeclaration(50, 120)).toEqual(['width', '120px']);
    expect(getColStyleDeclaration(50, null)).toEqual(['min-width', '50px']);
  });

  it('deleteTableWhenSelected removes entire table when all cells selected', () => {
    const { doc } = buildTableDoc(2, 2, false);
    const cellPositions = getCellPositions(doc);
    const selection = CellSelection.create(doc, cellPositions[0], cellPositions[cellPositions.length - 1]);

    const deleteTable = vi.fn();
    const result = deleteTableWhenSelected({ editor: { state: { selection }, commands: { deleteTable } } });

    expect(result).toBe(true);
    expect(deleteTable).toHaveBeenCalled();
  });

  it('deleteTableWhenSelected ignores partial cell selections', () => {
    const { doc } = buildTableDoc(2, 2, false);
    const cellPositions = getCellPositions(doc);
    const selection = CellSelection.create(doc, cellPositions[0], cellPositions[0]);

    const deleteTable = vi.fn();
    const result = deleteTableWhenSelected({ editor: { state: { selection }, commands: { deleteTable } } });

    expect(result).toBe(false);
    expect(deleteTable).not.toHaveBeenCalled();
  });

  it('deleteTableWhenSelected returns false for non-cell selections', () => {
    const { doc, state } = buildTableDoc(1, 1, false);
    const textSelection = TextSelection.atStart(state.doc);
    const deleteTable = vi.fn();
    const result = deleteTableWhenSelected({
      editor: { state: { selection: textSelection }, commands: { deleteTable } },
    });
    expect(result).toBe(false);
  });

  it('isCellSelection detects cell selections', () => {
    const { doc } = buildTableDoc(1, 1, false);
    const [firstCellPos] = getCellPositions(doc);
    const selection = CellSelection.create(doc, firstCellPos, firstCellPos);
    expect(isCellSelection(selection)).toBe(true);
    expect(isCellSelection(null)).toBe(false);
  });
});
