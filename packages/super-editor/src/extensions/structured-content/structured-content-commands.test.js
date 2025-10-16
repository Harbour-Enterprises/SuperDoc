import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EditorState } from 'prosemirror-state';
import { initTestEditor } from '@tests/helpers/helpers.js';
import { createTable } from '../table/tableHelpers/createTable.js';

const BLOCK_ID = 'structured-block-1';

/**
 * Locate the first table node within the provided document.
 * @param {import('prosemirror-model').Node} doc
 * @returns {import('prosemirror-model').Node|null}
 */
function findFirstTable(doc) {
  let found = null;
  doc.descendants((node) => {
    if (node.type.name === 'table') {
      found = node;
      return false;
    }
    return true;
  });
  return found;
}

describe('StructuredContentTableCommands', () => {
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
        const baselineBlock = schema.nodes.paragraph.create(null, schema.text('Baseline'));
        const firstCell = cellType.create(row.firstChild.attrs, styledBlock);
        const secondCell = cellType.create(row.lastChild.attrs, baselineBlock);
        rows.push(row.type.create(row.attrs, [firstCell, secondCell]));
      } else {
        rows.push(row);
      }
    });
    table = table.type.create(table.attrs, rows);

    const block = schema.nodes.structuredContentBlock.create({ id: BLOCK_ID }, table ? [table] : undefined);
    const doc = schema.nodes.doc.create(null, [block]);

    const nextState = EditorState.create({ schema, doc, plugins: editor.state.plugins });
    editor.view.updateState(nextState);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    editor?.destroy();
    editor = null;
    schema = null;
    templateMarkType = null;
    templateBlockType = null;
    templateBlockAttrs = null;
  });

  it('appends rows to the structured content table', () => {
    const initialTable = findFirstTable(editor.state.doc);
    expect(initialTable).not.toBeNull();
    const initialRowCount = initialTable.childCount;

    const didAppend = editor.commands.appendRowsToStructuredContentTable({
      id: BLOCK_ID,
      rows: [['Alpha', 'Beta']],
    });

    expect(didAppend).toBe(true);

    const updatedTable = findFirstTable(editor.state.doc);
    expect(updatedTable.childCount).toBe(initialRowCount + 1);

    const lastRow = updatedTable.lastChild;
    const cellTexts = lastRow.content.content.map((cell) => cell.textContent);
    expect(cellTexts).toEqual(['Alpha', 'Beta']);
  });

  it('copies template styling when copyRowStyle is true', () => {
    const didAppend = editor.commands.appendRowsToStructuredContentTable({
      id: BLOCK_ID,
      rows: [['Styled Copy', 'Value']],
      copyRowStyle: true,
    });

    expect(didAppend).toBe(true);

    const updatedTable = findFirstTable(editor.state.doc);
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
