// @ts-check
import { NodeTranslator } from '@translator';
import validXmlAttributes from './attributes/index.js';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:highlight';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_KEY = 'highlight';

/**
 * Encode the w:highlight element.
 * Preserve attributes (e.g., w:val color keyword) for downstream mapping.
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params) => {
  const { nodes } = params;
  const node = nodes[0];
  const attributes = { ...(node?.attributes || {}) };

  return {
    type: 'attr',
    xmlName: XML_NODE_NAME,
    sdNodeOrKeyName: SD_ATTR_KEY,
    attributes,
  };
};

/**
 * Decode highlight from node.attrs.highlight (color) to <w:shd>.
 * @param {import('@translator').SCDecoderConfig} params
 * @returns {import('@translator').SCDecoderResult}
 */
const decode = (params) => {
  const color = params?.node?.attrs?.color;
  if (!color || color === 'inherit' || color === 'transparent') return undefined;
  const hex = String(color).trim().replace(/^#/, '');
  if (!hex) return undefined;
  return { name: 'w:shd', attributes: { 'w:fill': hex, 'w:color': 'auto', 'w:val': 'clear' } };
};

/** @type {import('@translator').NodeTranslatorConfig} */
export const config = {
  xmlName: XML_NODE_NAME,
  sdNodeOrKeyName: SD_ATTR_KEY,
  type: NodeTranslator.translatorTypes.ATTRIBUTE,
  encode,
  decode,
  attributes: validXmlAttributes,
};

/** @type {import('@translator').NodeTranslator} */
export const translator = NodeTranslator.from(config);
