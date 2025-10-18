/**
 * Check whether the node is a table cell or header cell.
 *
 * @param {import('prosemirror-model').Node|null} node Node to inspect.
 * @returns {boolean} True when the node represents a table cell.
 */
export function isTableCellNode(node) {
  const name = node?.type?.name ?? '';
  const role = node?.type?.spec?.tableRole ?? '';
  return (
    name === 'tableCell' ||
    name === 'tableHeader' ||
    name === 'table_cell' ||
    name === 'table_header' ||
    role === 'cell' ||
    role === 'header_cell'
  );
}
