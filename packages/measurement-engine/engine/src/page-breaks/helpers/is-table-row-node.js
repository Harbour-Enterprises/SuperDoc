/**
 * Check whether the node represents a table row.
 *
 * @param {import('prosemirror-model').Node|null} node Node to inspect.
 * @returns {boolean} True when the node is a table row.
 */
export function isTableRowNode(node) {
  const name = node?.type?.name ?? '';
  const role = node?.type?.spec?.tableRole ?? '';
  return name === 'tableRow' || role === 'row' || name === 'table_row';
}
