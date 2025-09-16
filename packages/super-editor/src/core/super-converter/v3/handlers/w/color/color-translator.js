// @ts-check
import { NodeTranslator } from '@translator';
import validXmlAttributes from './attributes/index.js';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:color';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_KEY = 'color';

/**
 * Encode the w:color element.
 * @param {import('@translator').SCEncoderConfig} params
 * @param {Record<string, any>} [encodedAttrs]
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params, encodedAttrs = {}) => {
  const { nodes } = params;
  const node = nodes[0];
  // Preserve all attributes (including themeColor) so runProperties can carry them through
  const attributes = { ...(node?.attributes || {}) };

  return {
    type: 'attr',
    xmlName: XML_NODE_NAME,
    sdNodeOrKeyName: SD_ATTR_KEY,
    attributes,
  };
};

/**
 * Decode color from node.attrs.color to <w:color> (hex only).
 * @param {import('@translator').SCDecoderConfig} params
 * @returns {import('@translator').SCDecoderResult}
 */
const decode = (params) => {
  const color = params?.node?.attrs?.color;
  if (!color || color === 'inherit' || color === 'transparent') return undefined;
  const hex = String(color).trim().replace(/^#/, '');
  if (!hex) return undefined;
  return { name: XML_NODE_NAME, attributes: { 'w:val': hex } };
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

/**
 * The NodeTranslator instance for the w:color element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
