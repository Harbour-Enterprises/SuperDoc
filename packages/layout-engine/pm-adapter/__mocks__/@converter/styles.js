/**
 * Mock for @converter/styles.js
 * This module is part of super-editor and not available in pm-adapter tests
 *
 * @typedef {Object} ResolvedParagraphPropertiesExtended
 * @property {unknown} spacing
 * @property {unknown} indent
 * @property {unknown} borders
 * @property {unknown} shading
 * @property {unknown} justification
 * @property {unknown} tabStops
 * @property {boolean} keepLines
 * @property {boolean} keepNext
 * @property {unknown} numberingProperties
 */

/**
 * @param {unknown} _docxContext
 * @param {unknown} _inlineProps
 * @returns {ResolvedParagraphPropertiesExtended}
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
export const resolveParagraphProperties = (_docxContext, _inlineProps) => ({
  spacing: null,
  indent: null,
  borders: null,
  shading: null,
  justification: null,
  tabStops: null,
  keepLines: false,
  keepNext: false,
  numberingProperties: null,
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
export const resolveRunProperties = (_styleId, _context) => ({});
