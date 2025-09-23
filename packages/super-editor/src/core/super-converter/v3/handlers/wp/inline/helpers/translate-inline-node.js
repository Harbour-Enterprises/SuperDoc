import { translateImageNode } from '@converter/v3/handlers/wp/helpers/decode-image-node-helpers.js';

/**
 * Translates inline image
 * @param {Object} params - The parameters for translation.
 * @returns {Object} The XML representation.
 */
export function translateInlineNode(params) {
  const nodeElements = translateImageNode(params);

  return {
    name: 'wp:inline',
    attributes: nodeElements.attributes,
    elements: nodeElements.elements,
  };
}
