// @ts-check
import { NodeTranslator } from '@translator';
import { createAttributeHandler } from '../../utils.js';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:caps';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_KEY = 'textTransform';

/**
 * Encode the w:caps element.
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params, encodedAttrs = {}) => {
  const { nodes } = params;
  const node = nodes[0];
  if (!node) return undefined;

  let result;
  if (!['false', '0'].includes(encodedAttrs.val)) {
    result = 'uppercase';
  } else {
    return undefined; // No need to output anything if not uppercase
  }

  return {
    type: 'attr',
    xmlName: XML_NODE_NAME,
    sdNodeOrKeyName: SD_ATTR_KEY,
    attributes: { [SD_ATTR_KEY]: result },
  };
};

/** @type {import('@translator').NodeTranslatorConfig} */
export const config = {
  xmlName: XML_NODE_NAME,
  sdNodeOrKeyName: SD_ATTR_KEY,
  type: NodeTranslator.translatorTypes.ATTRIBUTE,
  encode,
  attributes: [createAttributeHandler('w:val')],
};

/**
 * The NodeTranslator instance for the w:caps element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
