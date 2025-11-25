// @ts-check
import { NodeTranslator } from '@translator';
import validXmlAttributes from './attributes/index.js';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:strike';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_KEY = 'strike';

/**
 * Encode the w:strike element.
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params, encodedAttrs = {}) => {
  const { nodes } = params;
  const node = nodes?.[0];
  if (!node) return undefined;

  const val = encodedAttrs?.[SD_ATTR_KEY];
  let attributes;
  if (val === false) attributes = { 'w:val': '0' };
  else if (val === true) attributes = {};
  else attributes = { ...(node.attributes || {}) };

  if (attributes['w:val'] === undefined && val !== true) attributes['w:val'] = null;
  else if (val === true && attributes['w:val'] === undefined) delete attributes['w:val'];

  return {
    type: 'attr',
    xmlName: XML_NODE_NAME,
    sdNodeOrKeyName: SD_ATTR_KEY,
    attributes,
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

/**
 * The NodeTranslator instance for the w:strike element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
