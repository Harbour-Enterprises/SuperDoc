/**
 * Prepare table rows for vertical merge export by inserting merge placeholders.
 * @param {import('prosemirror-model').Node} table
 * @param {object} options
 */
export function preProcessVerticalMergeCells(table, { editorSchema }) {
  if (!table || !Array.isArray(table.content)) {
    return table;
  }

  const rows = table.content;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (!row) continue;

    if (!Array.isArray(row.content)) {
      row.content = [];
    }

    for (let cellIndex = 0; cellIndex < row.content.length; cellIndex++) {
      const cell = row.content[cellIndex];
      if (!cell) continue;

      const attrs = cell.attrs || {};
      if (!attrs.rowspan || attrs.rowspan <= 1) continue;

      const maxRowspan = Math.min(attrs.rowspan, rows.length - rowIndex);

      for (let offset = 1; offset < maxRowspan; offset++) {
        const rowToChange = rows[rowIndex + offset];
        if (!rowToChange) continue;

        if (!Array.isArray(rowToChange.content)) {
          rowToChange.content = [];
        }

        const existingCell = rowToChange.content[cellIndex];
        if (existingCell?.attrs?.continueMerge) continue;

        const mergedCell = {
          type: cell.type,
          content: [editorSchema.nodes.paragraph.createAndFill().toJSON()],
          attrs: {
            ...cell.attrs,
            rowspan: null,
            continueMerge: true,
          },
        };

        rowToChange.content.splice(cellIndex, 0, mergedCell);
      }
    }
  }

  return table;
}
