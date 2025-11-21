import { translateChildNodes } from '@converter/v2/exporter/helpers/index.js';
import { generateParagraphProperties } from './generate-paragraph-properties.js';

/**
 * Translate a paragraph node
 *
 * @param {ExportParams} node A prose mirror paragraph node
 * @returns {XmlReadyNode} JSON of the XML-ready paragraph node
 */
export function translateParagraphNode(params) {
  const elements = translateChildNodes(params);

  // Replace current paragraph with content of html annotation
  const htmlAnnotationChild = elements.find((element) => element.name === 'htmlAnnotation');
  if (htmlAnnotationChild) {
    return htmlAnnotationChild.elements;
  }

  // Insert paragraph properties at the beginning of the elements array
  const pPr = generateParagraphProperties(params);
  if (pPr) elements.unshift(pPr);

  let attributes = {};
  if (params.node.attrs?.rsidRDefault) {
    attributes['w:rsidRDefault'] = params.node.attrs.rsidRDefault;
  }

  const result = {
    name: 'w:p',
    elements,
    attributes,
  };

  return result;
}
