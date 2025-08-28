import { getSchema } from './index.js';

/**
 * Return attributes map for a QName (e.g. "w:p")
 * @param {string} qname
 */
export function getAttributes(qname) {
  const schema = getSchema();
  const entry = schema.elements[qname];
  if (!entry) return null;

  const attrs = entry.attributes || {};
  // stable sort for predictable CLI output
  return Object.fromEntries(Object.entries(attrs).sort(([a], [b]) => a.localeCompare(b)));
}
