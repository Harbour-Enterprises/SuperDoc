import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EditorState } from 'prosemirror-state';
import { initTestEditor } from '@tests/helpers/helpers.js';
import { createTable } from './tableHelpers/createTable.js';

/**
 * Find the first table position within the provided document.
 * @param {import('prosemirror-model').Node} doc
 * @returns {number|null}
 */
function findTablePos(doc) {
  let tablePos = null;
  doc.descendants((node, pos) => {
    if (node.type.name === 'table') {
      tablePos = pos;
      return false;
    }
    return true;
  });
  return tablePos;
}

describe('Table commands', () => {
  let editor;
  let schema;
  let templateMarkType;
  let templateBlockType;
  let templateBlockAttrs;

  beforeEach(() => {
    ({ editor } = initTestEditor({ mode: 'text', content: '<p></p>' }));
    ({ schema } = editor);

    templateMarkType = schema.marks.bold || schema.marks.strong || null;
    templateBlockType = schema.nodes.heading || schema.nodes.paragraph;
    templateBlockAttrs = templateBlockType === schema.nodes.heading ? { level: 3 } : null;

    let table = createTable(schema, 2, 2, false);
    const rows = [];
    table.forEach((row, _offset, index) => {
      if (index === table.childCount - 1) {
        const cellType = schema.nodes.tableCell;
        const mark = templateMarkType ? templateMarkType.create() : null;
        const styledText = schema.text('Styled Template', mark ? [mark] : undefined);
        const styledBlock = templateBlockType.create(templateBlockAttrs, styledText);
        const secondBlock = schema.nodes.paragraph.create(null, schema.text('Baseline'));
        const firstCell = cellType.create(row.firstChild.attrs, styledBlock);
        const secondCell = cellType.create(row.lastChild.attrs, secondBlock);
        rows.push(row.type.create(row.attrs, [firstCell, secondCell]));
      } else {
        rows.push(row);
      }
    });
    table = table.type.create(table.attrs, rows);

    const doc = schema.nodes.doc.create(null, [table]);
    const nextState = EditorState.create({ schema, doc, plugins: editor.state.plugins });

    editor.view.updateState(nextState);
  });

  afterEach(() => {
    editor?.destroy();
    editor = null;
    schema = null;
    templateMarkType = null;
    templateBlockType = null;
    templateBlockAttrs = null;
  });

  it('appendRowsWithContent appends values as a new row at the end', () => {
    const tablePos = findTablePos(editor.state.doc);
    expect(tablePos).not.toBeNull();

    const didAppend = editor.commands.appendRowsWithContent({
      tablePos,
      valueRows: [['One', 'Two']],
    });

    expect(didAppend).toBe(true);

    const updatedTable = editor.state.doc.nodeAt(tablePos);
    expect(updatedTable?.type.name).toBe('table');
    expect(updatedTable.childCount).toBe(3);

    const lastRow = updatedTable.lastChild;
    const cellTexts = lastRow.content.content.map((cell) => cell.textContent);
    expect(cellTexts).toEqual(['One', 'Two']);
  });

  it('appendRowsWithContent copies template marks when copyRowStyle is true', () => {
    const tablePos = findTablePos(editor.state.doc);
    expect(tablePos).not.toBeNull();

    const didAppend = editor.commands.appendRowsWithContent({
      tablePos,
      valueRows: [['Styled Copy', 'Other']],
      copyRowStyle: true,
    });

    expect(didAppend).toBe(true);

    const updatedTable = editor.state.doc.nodeAt(tablePos);
    const newLastRow = updatedTable.lastChild;
    const firstCell = newLastRow.firstChild;
    const blockNode = firstCell.firstChild;
    const textNode = blockNode.firstChild;

    expect(blockNode.type).toBe(templateBlockType);
    if (templateBlockAttrs) {
      expect(blockNode.attrs).toMatchObject(templateBlockAttrs);
    }

    if (templateMarkType) {
      const hasMark = textNode.marks.some((mark) => mark.type === templateMarkType);
      expect(hasMark).toBe(true);
    }
  });
});
