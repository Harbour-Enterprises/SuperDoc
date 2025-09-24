import { translateChildNodes } from '@converter/v2/exporter/helpers/translateChildNodes';

/**
 * @param {Object} params - The parameters for translation.
 * @returns {Object} The XML representation.
 */
export function translateStructuredContent(params) {
  const { node } = params;
  const { attrs = {} } = node;

  const childContent = translateChildNodes({ ...params, nodes: node.content });

  // We build the sdt node elements here, and re-add passthrough sdtPr node
  const nodeElements = [
    {
      name: 'w:sdtContent',
      elements: childContent,
    },
  ];
  nodeElements.unshift(attrs.sdtPr);

  const result = {
    name: 'w:sdt',
    elements: nodeElements,
  };

  return result;
}
