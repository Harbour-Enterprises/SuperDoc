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
  if (attrs.styleId !== paragraphProperties.styleId) {
    paragraphProperties.styleId = attrs.styleId;
  }

  // Check which properties have changed
  ['borders', 'styleId', 'indent', 'textAlign', 'keepLines', 'keepNext', 'spacing', 'tabStops'].forEach((key) => {
    let propKey = key === 'textAlign' ? 'justification' : key;
    if (JSON.stringify(paragraphProperties[propKey]) !== JSON.stringify(attrs[key])) {
      paragraphProperties[propKey] = attrs[key];
    }
  });

  const framePr = attrs.dropcap;
  if (framePr) {
    framePr.dropCap = framePr.type;
    delete framePr.type;
  }
  if (JSON.stringify(paragraphProperties.framePr) !== JSON.stringify(framePr)) {
    paragraphProperties.framePr = framePr;
  }

  // Get run properties from marksAttrs
  const marksProps = decodeRPrFromMarks(attrs.marksAttrs || []);
  const finalRunProps = combineRunProperties([paragraphProperties.runProperties || {}, marksProps]);
  paragraphProperties.runProperties = finalRunProps;

  const pPr = wPPrNodeTranslator.decode({ node: { ...node, attrs: { paragraphProperties } } });
  const sectPr = node.attrs?.paragraphProperties?.sectPr;
  if (sectPr) {
    pPr.elements.push(sectPr);
  }
  return pPr;
}
