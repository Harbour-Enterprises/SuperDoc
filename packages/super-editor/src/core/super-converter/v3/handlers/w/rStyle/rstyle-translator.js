// @ts-check
import { NodeTranslator } from '@translator';
import validXmlAttributes from './attributes/index.js';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:rStyle';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_KEY = 'styleId';

/**
 * Encode the w:rStyle element.
 * Pass through attributes (typically { 'w:val': styleId }).
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params, encodedAttrs = {}) => {
  const { nodes } = params;
  const node = nodes?.[0] || {};
  const attributes = { ...(node.attributes || {}) };
  const override = encodedAttrs?.[SD_ATTR_KEY];
  if (override) attributes['w:val'] = override;

  return {
    type: 'attr',
    xmlName: XML_NODE_NAME,
    sdNodeOrKeyName: SD_ATTR_KEY,
    attributes,
  };
};

/**
 * Decode styleId to <w:rStyle>.
 * @param {import('@translator').SCDecoderConfig} params
 * @returns {import('@translator').SCDecoderResult}
 */
const decode = (params) => {
  const styleId = params?.node?.attrs?.styleId;
  if (!styleId) return undefined;
  return { name: XML_NODE_NAME, attributes: { 'w:val': String(styleId) } };
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
 * The NodeTranslator instance for the w:rStyle element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
