/**
 * Check whether the given node behaves as a ProseMirror table.
 *
 * @param {import('prosemirror-model').Node|null} node Node to test.
 * @returns {boolean} True when the node is a table.
 */
export function isTableNode(node) {
  const name = node?.type?.name ?? '';
  const role = node?.type?.spec?.tableRole ?? '';
  return name === 'table' || role === 'table';
}
