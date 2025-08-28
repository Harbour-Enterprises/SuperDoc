/**
 * @typedef {Object} SchemaElement
 * @property {string[]} children - List of child element QNames
 * @property {Record<string, any>} attributes - Attributes keyed by QName
 * @property {string} [length] - The length of the element
 */

/**
 * @typedef {Object} BuiltSchema
 * @property {Record<string, string>} namespaces - Mapping of namespace URI → prefix
 * @property {Record<string, SchemaElement>} elements - Mapping of QName → schema element definition
 */

export {};
