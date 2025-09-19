// @ts-check
import { NodeTranslator } from '@translator';
import validXmlAttributes from './attributes/index.js';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:sz';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_KEY = 'fontSize';

/**
 * Encode the w:sz element (font size in half-points).
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params, encodedAttrs = {}) => {
  const { nodes } = params;
  const node = nodes?.[0];
  const value = encodedAttrs.fontSize ?? node?.attributes?.['w:val'];

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
