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
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params, encodedAttrs = {}) => {
  const { nodes } = params;
  const node = nodes?.[0];
  const sourceAttrs = node?.attributes || {};

  const value = encodedAttrs.color ?? sourceAttrs['w:val'];
  const themeColor = encodedAttrs.themeColor ?? sourceAttrs['w:themeColor'];
  const themeTint = encodedAttrs.themeTint ?? sourceAttrs['w:themeTint'];
  const themeShade = encodedAttrs.themeShade ?? sourceAttrs['w:themeShade'];

  const attributes = {};
  attributes['w:val'] = value ?? null;
  if (themeColor !== undefined && themeColor !== null) attributes['w:themeColor'] = themeColor;
  if (themeTint !== undefined && themeTint !== null) attributes['w:themeTint'] = themeTint;
  if (themeShade !== undefined && themeShade !== null) attributes['w:themeShade'] = themeShade;

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
 * The NodeTranslator instance for the w:color element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
