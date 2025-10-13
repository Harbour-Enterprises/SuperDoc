// @ts-check
import { NodeTranslator } from '@translator';
import validXmlAttributes from './attributes/index.js';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:rFonts';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_KEY = 'fontFamily';

/**
 * Encode the w:rFonts element.
 * - Preserve all provided attributes (e.g., w:eastAsia, w:ascii, w:hAnsi, w:cs) so export has full fidelity.
 * - If w:eastAsia is present and truthy, also map it to w:val as a convenience; otherwise omit w:val.
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params, encodedAttrs = {}) => {
  const { nodes } = params;
  const node = nodes?.[0];
  const sourceAttrs = node?.attributes || {};

  const attributes = {};

  const setAttr = (xmlName, sdName) => {
    if (encodedAttrs[sdName] !== undefined && encodedAttrs[sdName] !== null) {
      attributes[xmlName] = encodedAttrs[sdName];
    } else if (sourceAttrs[xmlName] !== undefined) {
      attributes[xmlName] = sourceAttrs[xmlName];
    }
  };

  setAttr('w:eastAsia', 'eastAsia');
  setAttr('w:ascii', 'ascii');
  setAttr('w:hAnsi', 'hAnsi');
  setAttr('w:cs', 'cs');
  setAttr('w:val', 'value');

  // Preserve any other existing attributes on the source node that we didn't explicitly manage
  Object.keys(sourceAttrs).forEach((key) => {
    if (attributes[key] === undefined) attributes[key] = sourceAttrs[key];
  });

  if (attributes['w:val'] === undefined && attributes['w:eastAsia']) {
    attributes['w:val'] = attributes['w:eastAsia'];
  }

  if (attributes['w:val'] === undefined) delete attributes['w:val'];

  if (params.inlineDocumentFonts) {
    // Right now we only support 'w:ascii'
    const font = attributes['w:ascii'];
    if (!params.inlineDocumentFonts.includes(font)) {
      params.inlineDocumentFonts.push(font);
    }
  }

  return {
    type: 'attr',
    xmlName: XML_NODE_NAME,
    sdNodeOrKeyName: SD_ATTR_KEY,
    attributes,
  };
};

/** @type {import('@translator').NodeTranslatorConfig} */
const config = {
  xmlName: XML_NODE_NAME,
  sdNodeOrKeyName: SD_ATTR_KEY,
  type: NodeTranslator.translatorTypes.ATTRIBUTE,
  encode,
  attributes: validXmlAttributes,
};

/**
 * The NodeTranslator instance for the w:rFonts element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
