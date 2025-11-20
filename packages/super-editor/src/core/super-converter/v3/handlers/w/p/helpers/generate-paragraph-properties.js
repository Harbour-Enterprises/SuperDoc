import { carbonCopy } from '@core/utilities/carbonCopy.js';
import { combineRunProperties, decodeRPrFromMarks } from '@converter/styles.js';
import { translator as wPPrNodeTranslator } from '../../pPr/pPr-translator.js';

/**
 * Generate the w:pPr props for a paragraph node
 *
 * @param {SchemaNode} node
 * @returns {XmlReadyNode} The paragraph properties node
 */
export function generateParagraphProperties(params) {
  const { node } = params;
  const { attrs = {} } = node;

  const paragraphProperties = carbonCopy(attrs.paragraphProperties || {});
  const pPr = wPPrNodeTranslator.decode({ node: { ...node, attrs: { paragraphProperties } } });
  const sectPr = node.attrs?.paragraphProperties?.sectPr;
  if (sectPr) {
    pPr.elements.push(sectPr);
  }
  return pPr;
}
