import { translateChildNodes } from '@converter/v2/exporter/helpers/translateChildNodes';

/**
 * @param {Object} params - The parameters for translation.
 * @returns {Object} The XML representation.
 */
export function translateStructuredContent(params) {
  const { node } = params;

  const childContent = translateChildNodes({ ...params, nodes: node.content });

  // We build the sdt node elements here, and re-add passthrough sdtPr node
  const sdtContent = { name: 'w:sdtContent', elements: childContent };
  const sdtPr = generateSdtPrTagForStructuredContent({ node });
  const nodeElements = [sdtPr, sdtContent];

  const result = {
    name: 'w:sdt',
    elements: nodeElements,
  };

  return result;
}

function generateSdtPrTagForStructuredContent({ node }) {
  const { attrs = {} } = node;

  const id = {
    name: 'w:id',
    type: 'element',
    attributes: { 'w:val': attrs.id },
  };
  const alias = {
    name: 'w:alias',
    type: 'element',
    attributes: { 'w:val': attrs.alias },
  };
  const tag = {
    name: 'w:tag',
    type: 'element',
    attributes: { 'w:val': attrs.tag },
  };

  const resultElements = [];
  if (attrs.id) resultElements.push(id);
  if (attrs.alias) resultElements.push(alias);
  if (attrs.tag) resultElements.push(tag);

  if (attrs.sdtPr) {
    const elements = attrs.sdtPr.elements || [];
    const elementsToExclude = ['w:id', 'w:alias', 'w:tag'];
    const restElements = elements.filter((el) => !elementsToExclude.includes(el.name));
    const result = {
      name: 'w:sdtPr',
      type: 'element',
      elements: [...resultElements, ...restElements],
    };
    return result;
  }

  const result = {
    name: 'w:sdtPr',
    type: 'element',
    elements: resultElements,
  };

  return result;
}
