import { getSchema, loadSchemaSync } from './schema.js';

/**
 * @typedef {Object} SchemaOptions
 * @property {string} [schemaPath] - Path to schema file
 * @property {boolean} [cache] - Whether to cache schema
 */

/**
 * @typedef {Object} ElementDefinition
 * @property {string[]} [children] - Array of allowed child element qualified names
 * @property {Object} [attributes] - Allowed attributes for this element
 */

/**
 * @typedef {Object} Schema
 * @property {Object.<string, ElementDefinition>} elements - Map of qualified names to element definitions
 * @property {Object.<string, string>} namespaces - Map of namespace URIs to prefixes
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} ok - Whether validation passed
 * @property {string[]} invalid - Array of invalid child qualified names
 */

/**
 * @typedef {Object} SchemaStats
 * @property {number} totalElements - Total number of elements in schema
 * @property {number} elementsWithChildren - Number of elements that have children
 * @property {number} namespaces - Number of namespaces in schema
 * @property {Object.<string, number>} byNamespace - Count of elements by namespace prefix
 */

/**
 * @typedef {Object} AllTagsOptions
 * @property {string|null} [prefix=null] - Filter by namespace prefix
 * @property {boolean|null} [hasChildren=null] - Filter by whether elements have children
 */

/**
 * Extracts the namespace prefix from a qualified name.
 *
 * @param {string} qname - The qualified name (e.g., 'html:div' or 'svg:circle')
 * @returns {string} The namespace prefix, or empty string if no prefix exists
 *
 * @example
 * getPrefix('html:div'); // returns 'html'
 * getPrefix('div');      // returns ''
 */
export function getPrefix(qname) {
  const i = qname.indexOf(':');
  return i > 0 ? qname.slice(0, i) : '';
}

/**
 * Extracts the local name from a qualified name.
 *
 * @param {string} qname - The qualified name (e.g., 'html:div' or 'svg:circle')
 * @returns {string} The local name part of the qualified name
 *
 * @example
 * getLocalName('html:div'); // returns 'div'
 * getLocalName('div');      // returns 'div'
 */
export function getLocalName(qname) {
  const i = qname.indexOf(':');
  return i > 0 ? qname.slice(i + 1) : qname;
}

/**
 * Gets the list of allowed child elements for a given parent element.
 *
 * @param {string} qname - The qualified name of the parent element
 * @param {SchemaOptions} [opts] - Schema loading options
 * @returns {string[]} Array of qualified names of allowed child elements
 *
 * @example
 * allowedChildren('html:ul', opts); // returns ['html:li']
 */
export function allowedChildren(qname, opts) {
  const { elements } = getSchema(opts);
  const def = elements?.[qname];
  return def?.children ?? [];
}

/**
 * Checks if a child element is allowed under a parent element.
 *
 * @param {string} parent - The qualified name of the parent element
 * @param {string} child - The qualified name of the child element
 * @param {SchemaOptions} [opts] - Schema loading options
 * @returns {boolean} True if the child is allowed under the parent
 *
 * @example
 * isAllowedChild('html:ul', 'html:li', opts); // returns true
 * isAllowedChild('html:ul', 'html:div', opts); // returns false
 */
export function isAllowedChild(parent, child, opts) {
  const kids = allowedChildren(parent, opts);
  return kids.includes(child);
}

/**
 * Validates a list of child elements against a parent element's allowed children.
 * Performs a shallow validation check.
 *
 * @param {string} parent - The qualified name of the parent element
 * @param {string[]} childList - Array of qualified names of child elements to validate
 * @param {SchemaOptions} [opts] - Schema loading options
 * @returns {ValidationResult} Validation result with ok status and invalid children
 *
 * @example
 * validateChildren('html:ul', ['html:li', 'html:div'], opts);
 * // returns { ok: false, invalid: ['html:div'] }
 */
export function validateChildren(parent, childList, opts) {
  const allowed = new Set(allowedChildren(parent, opts));
  const invalid = childList.filter((c) => !allowed.has(c));
  return { ok: invalid.length === 0, invalid };
}

/**
 * Gets all elements that belong to a specific namespace.
 *
 * @param {string} namespace - The namespace URI to filter by
 * @param {SchemaOptions} [opts] - Schema loading options
 * @returns {string[]} Array of local names (without prefix) of elements in the namespace
 *
 * @example
 * getElementsByNamespace('http://www.w3.org/1999/xhtml', opts);
 * // returns ['div', 'span', 'p', ...]
 */
export function getElementsByNamespace(namespace, opts) {
  const { elements, namespaces } = getSchema(opts);
  const prefix = namespaces[namespace];
  if (!prefix) return [];
  return Object.keys(elements)
    .filter((qn) => qn.startsWith(prefix + ':'))
    .map(getLocalName);
}

/**
 * Checks if an element exists in the schema.
 *
 * @param {string} qname - The qualified name of the element to check
 * @param {SchemaOptions} [opts] - Schema loading options
 * @returns {boolean} True if the element exists in the schema
 *
 * @example
 * hasElement('html:div', opts); // returns true
 * hasElement('fake:element', opts); // returns false
 */
export function hasElement(qname, opts) {
  const { elements } = getSchema(opts);
  return Object.prototype.hasOwnProperty.call(elements, qname);
}

/**
 * Generates statistics about the loaded schema.
 *
 * @param {SchemaOptions} [opts] - Schema loading options
 * @returns {SchemaStats} Object containing various statistics about the schema
 *
 * @example
 * getSchemaStats(opts);
 * // returns {
 * //   totalElements: 150,
 * //   elementsWithChildren: 75,
 * //   namespaces: 3,
 * //   byNamespace: { 'html': 120, 'svg': 25, 'math': 5 }
 * // }
 */
export function getSchemaStats(opts) {
  const { elements, namespaces } = getSchema(opts);
  const stats = {
    totalElements: Object.keys(elements).length,
    elementsWithChildren: 0,
    namespaces: Object.keys(namespaces).length,
    byNamespace: {},
  };

  for (const [qname, def] of Object.entries(elements)) {
    if ((def?.children?.length ?? 0) > 0) stats.elementsWithChildren++;
    const pfx = getPrefix(qname);
    if (pfx) stats.byNamespace[pfx] = (stats.byNamespace[pfx] || 0) + 1;
    // note: attributes available at def.attributes if you need them elsewhere
  }

  return stats;
}

/**
 * Gets the allowed child elements for a given element using synchronous schema loading.
 *
 * @param {string} qname - The qualified name of the parent element
 * @returns {string[]} Array of qualified names of allowed child elements
 *
 * @example
 * childrenOf('html:ul'); // returns ['html:li']
 */
export function childrenOf(qname) {
  const { elements } = loadSchemaSync();
  return elements?.[qname]?.children ?? [];
}

/**
 * Gets all element tags from the schema with optional filtering.
 * Uses synchronous schema loading.
 *
 * @param {AllTagsOptions} [options={}] - Filtering options
 * @param {string|null} [options.prefix=null] - Filter by namespace prefix (with or without colon)
 * @param {boolean|null} [options.hasChildren=null] - Filter by whether elements have children
 * @returns {string[]} Sorted array of qualified element names matching the filters
 *
 * @example
 * allTags(); // returns all tags
 * allTags({ prefix: 'html' }); // returns only HTML tags
 * allTags({ hasChildren: true }); // returns only tags that can have children
 * allTags({ prefix: 'svg', hasChildren: false }); // returns SVG leaf elements
 */
export function allTags({ prefix = null, hasChildren = null } = {}) {
  const { elements } = loadSchemaSync();
  let tags = Object.keys(elements).sort();

  if (prefix) {
    const p = prefix.endsWith(':') ? prefix : `${prefix}:`;
    tags = tags.filter((t) => t.startsWith(p));
  }

  if (hasChildren !== null) {
    tags = tags.filter((t) => {
      const n = elements[t]?.children?.length ?? 0;
      return hasChildren ? n > 0 : n === 0;
    });
  }

  return tags;
}

/**
 * Gets all namespace mappings from the schema.
 * Uses synchronous schema loading.
 *
 * @returns {Object.<string, string>} Object mapping namespace URIs to prefixes
 *
 * @example
 * namespaces();
 * // returns {
 * //   'http://www.w3.org/1999/xhtml': 'html',
 * //   'http://www.w3.org/2000/svg': 'svg'
 * // }
 */
export function namespaces() {
  return loadSchemaSync().namespaces;
}
