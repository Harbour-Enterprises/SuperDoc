// @ts-check
import { NodeTranslator } from '@translator';
import validXmlAttributes from './attributes/index.js';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:b';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_KEY = 'bold';

/**
 * Encode the w:b element.
 * Always emit an attribute entry with `w:val` present:
 * - If provided, pass value through as-is (e.g., '1', '0').
 * - If missing or falsy, coalesce to null for consistency with other attribute translators.
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params, encodedAttrs = {}) => {
  const { nodes } = params;
  const node = nodes[0];
  if (!node) return undefined;

  // Normalize encoded boolean into OOXML attributes
  const val = encodedAttrs?.[SD_ATTR_KEY];
  let attributes;
  if (val === false) attributes = { 'w:val': '0' };
  else if (val === true)
    attributes = {}; // presence => on
  else attributes = node.attributes || {}; // fallback to raw

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
 * The NodeTranslator instance for the w:b element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
