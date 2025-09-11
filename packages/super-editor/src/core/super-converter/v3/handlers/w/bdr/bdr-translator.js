// @ts-check
import { NodeTranslator } from '@translator';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:bdr';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_KEY = 'border';

/**
 * Encode the w:bdr element.
 * Supported attributes: w:val, w:sz, w:space, w:color, w:themeColor, w:themeTint, w:themeShade
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params) => {
  const { nodes } = params;
  const node = nodes?.[0] || {};
  const a = node.attributes || {};

  const attr = {
    type: 'attr',
    xmlName: XML_NODE_NAME,
    sdNodeOrKeyName: SD_ATTR_KEY,
    attributes: {
      'w:val': a['w:val'] ?? null,
      'w:sz': a['w:sz'] ?? null,
      'w:space': a['w:space'] ?? null,
      'w:color': a['w:color'] ?? null,
      'w:themeColor': a['w:themeColor'] ?? null,
      'w:themeTint': a['w:themeTint'] ?? null,
      'w:themeShade': a['w:themeShade'] ?? null,
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
 * The NodeTranslator instance for the w:bdr element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
