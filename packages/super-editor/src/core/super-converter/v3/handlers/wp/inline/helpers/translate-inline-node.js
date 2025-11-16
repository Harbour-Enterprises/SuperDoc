import { translateImageNode } from '@converter/v3/handlers/wp/helpers/decode-image-node-helpers.js';

/**
 * Translates inline image
 * 
 * Guard: ensure we only emit a valid inline drawing structure.
 * wp:inline must contain expected drawing children (like wp:extent).

 * @param {Object} params - The parameters for translation.
 * @returns {Object} The XML representation.
 */
export function translateInlineNode(params) {
  const nodeElements = translateImageNode(params);

  if (!nodeElements || nodeElements.name === 'w:r') {
    return nodeElements;
  }
  const hasExtent =
    Array.isArray(nodeElements.elements) && nodeElements.elements.some((el) => el?.name === 'wp:extent');
  if (!hasExtent) {
    return nodeElements;
  }

  return {
    name: 'wp:inline',
    attributes: nodeElements.attributes,
    elements: nodeElements.elements,
  };
}
