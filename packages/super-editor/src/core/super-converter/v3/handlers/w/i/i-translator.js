// @ts-check
import { NodeTranslator } from '@translator';
import validXmlAttributes from './attributes/index.js';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:i';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_KEY = 'italic';

/**
 * Encode the w:i element.
 * Mirrors w:b behavior for ST_OnOff values.
 * @param {import('@translator').SCEncoderConfig} params
 * @param {Record<string, any>} [encodedAttrs]
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
  else attributes = node.attributes || {};

  return {
    type: 'attr',
    xmlName: XML_NODE_NAME,
    sdNodeOrKeyName: SD_ATTR_KEY,
    attributes,
  };
};

/**
 * Decode italic boolean to <w:i> element (omit when false).
 * @param {import('@translator').SCDecoderConfig} params
 * @returns {import('@translator').SCDecoderResult}
 */
const decode = (params) => {
  const italic = params?.node?.attrs?.italic;
  const on = (() => {
    if (italic === undefined || italic === null) return false;
    if (typeof italic === 'boolean') return italic;
    if (typeof italic === 'number') return italic !== 0;
    const v = String(italic).trim().toLowerCase();
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
 * The NodeTranslator instance for the w:i element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
