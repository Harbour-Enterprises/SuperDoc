// @ts-check
import { NodeTranslator } from '@translator';
import validXmlAttributes from './attributes/index.js';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:szCs';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_KEY = 'fontSizeCs';

/**
 * Encode the w:szCs element (complex script font size, half-points).
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params, encodedAttrs = {}) => {
  const { nodes } = params;
  const node = nodes?.[0];
  const value = encodedAttrs.fontSizeCs ?? node?.attributes?.['w:val'];

  return {
    type: 'attr',
    xmlName: XML_NODE_NAME,
    sdNodeOrKeyName: SD_ATTR_KEY,
    attributes: { 'w:val': value ?? null },
  };
};

/** @type {import('@translator').NodeTranslatorConfig} */
export const config = {
  xmlName: XML_NODE_NAME,
  sdNodeOrKeyName: SD_ATTR_KEY,
  type: NodeTranslator.translatorTypes.ATTRIBUTE,
  encode,
  attributes: validXmlAttributes,
};

/** @type {import('@translator').NodeTranslator} */
export const translator = NodeTranslator.from(config);
