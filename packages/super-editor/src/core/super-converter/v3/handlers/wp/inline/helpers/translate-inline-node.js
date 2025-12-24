import { translateImageNode } from '@converter/v3/handlers/wp/helpers/decode-image-node-helpers.js';
import { mergeDrawingChildren } from '@converter/v3/handlers/wp/helpers/merge-drawing-children.js';

/**
 * Translates inline image
 * 
 * Guard: ensure we only emit a valid inline drawing structure.
 * wp:inline must contain expected drawing children (like wp:extent).

 * @param {Object} params - The parameters for translation.
 * @returns {Object} The XML representation.
 */
export function translateInlineNode(params) {
  const { attrs } = params.node;
  const nodeElements = translateImageNode(params);

  if (!nodeElements || nodeElements.name === 'w:r') {
    return nodeElements;
  }
  const hasExtent =
    Array.isArray(nodeElements.elements) && nodeElements.elements.some((el) => el?.name === 'wp:extent');
  if (!hasExtent) {
    return nodeElements;
  }

  const inlineAttrs = {
    ...(attrs.originalAttributes || {}),
    ...(nodeElements.attributes || {}),
  };

  const generatedElements = nodeElements?.elements || [];
  const mergedElements = mergeDrawingChildren({
    order: params.node?.attrs?.drawingChildOrder || [],
    original: params.node?.attrs?.originalDrawingChildren || [],
    generated: generatedElements,
  });

  return {
    name: 'wp:inline',
    attributes: inlineAttrs,
    elements: mergedElements,
  };
}
