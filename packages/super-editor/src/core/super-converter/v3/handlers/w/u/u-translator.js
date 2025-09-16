// @ts-check
import { NodeTranslator } from '@translator';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:u';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_KEY = 'underline';

/**
 * Encode the w:u element (underline) and preserve useful attributes.
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params) => {
  const { nodes } = params;
  const node = nodes[0];
  const value = node?.attributes?.['w:val'] ?? null;
  const color = node?.attributes?.['w:color'] ?? null;
  const themeColor = node?.attributes?.['w:themeColor'] ?? null;

  const attributes = {};
  attributes['w:val'] = value;
  if (color) attributes['w:color'] = color;
  if (themeColor) attributes['w:themeColor'] = themeColor;

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
};

/**
 * The NodeTranslator instance for the w:u element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
