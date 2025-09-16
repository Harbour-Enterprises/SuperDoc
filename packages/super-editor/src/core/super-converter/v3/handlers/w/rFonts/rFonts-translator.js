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
  const node = nodes[0] || {};
  const attributes = { ...(node.attributes || {}) };

  // Provide default w:val only when eastAsia is available
  const eastAsia = attributes['w:eastAsia'];
  if (eastAsia) {
    attributes['w:val'] = eastAsia;
  }

  const sdKey = SD_ATTR_KEY;
  return {
    type: 'attr',
    xmlName: XML_NODE_NAME,
    sdNodeOrKeyName: sdKey,
    attributes,
  };
};

/**
 * Decode font family to <w:rFonts>.
 * @param {import('@translator').SCDecoderConfig} params
 * @returns {import('@translator').SCDecoderResult}
 */
const decode = (params) => {
  const family = params?.node?.attrs?.fontFamily;
  if (!family) return undefined;
  const primary = String(family).split(',')[0].trim().replace(/["']/g, '');
  if (!primary) return undefined;
  return {
    name: XML_NODE_NAME,
    attributes: { 'w:ascii': primary, 'w:eastAsia': primary, 'w:hAnsi': primary, 'w:cs': primary },
  };
};

/** @type {import('@translator').NodeTranslatorConfig} */
const config = {
  xmlName: XML_NODE_NAME,
  sdNodeOrKeyName: SD_ATTR_KEY,
  type: NodeTranslator.translatorTypes.ATTRIBUTE,
  encode,
  decode,
  attributes: validXmlAttributes,
};

/**
 * The NodeTranslator instance for the w:rFonts element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
