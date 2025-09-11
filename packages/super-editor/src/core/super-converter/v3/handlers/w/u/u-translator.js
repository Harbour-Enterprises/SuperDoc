// @ts-check
import { NodeTranslator } from '@translator';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:u';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_KEY = 'underline';

/**
 * Encode the w:u element.
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params) => {
  const { nodes } = params;
  const node = nodes[0];
  const value = node?.attributes?.['w:val'] || null;

  const attr = {
    type: 'attr',
    xmlName: XML_NODE_NAME,
    sdNodeOrKeyName: SD_ATTR_KEY,
    attributes: {
      'w:val': value,
    },
  };

  return attr;
};

/** @type {import('@translator').NodeTranslatorConfig} */
export const config = {
  xmlName: XML_NODE_NAME,
  sdNodeOrKeyName: SD_ATTR_KEY,
  type: NodeTranslator.translatorTypes.ATTRIBUTE,
  encode,
};

/**
 * The NodeTranslator instance for the w:u element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
