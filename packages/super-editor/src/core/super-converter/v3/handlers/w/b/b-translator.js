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
  else if (val === true) attributes = {};
  else attributes = node.attributes || {};

  return {
    type: 'attr',
    xmlName: XML_NODE_NAME,
    sdNodeOrKeyName: SD_ATTR_KEY,
    attributes,
  };
};

/**
 * Decode bold boolean to <w:b> element (omit when false).
 * @param {import('@translator').SCDecoderConfig} params
 * @returns {import('@translator').SCDecoderResult}
 */
const decode = (params) => {
  const bold = params?.node?.attrs?.bold;
  // Treat only explicit truthy as on; falsy/undefined => no element
  const on = (() => {
    if (bold === undefined || bold === null) return false;
    if (typeof bold === 'boolean') return bold;
    if (typeof bold === 'number') return bold !== 0;
    const v = String(bold).trim().toLowerCase();
    if (v === '0' || v === 'false' || v === 'off') return false;
    if (v === '1' || v === 'true' || v === 'on') return true;
    return false;
  })();
  if (!on) return undefined;
  return { name: XML_NODE_NAME };
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
 * The NodeTranslator instance for the w:b element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
