// @ts-check
import { NodeTranslator } from '@translator';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:rPr';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_KEY = 'runProperties';

/**
 * Encode the w:rPr element.
 * Aggregates all child attribute translators into a single runProperties attribute
 * that the run translator will attach directly to the run node.
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params) => {
  const { nodes, nodeListHandler } = params;
  const node = nodes?.[0] || {};
  const contents = Array.isArray(node.elements) ? node.elements : [];

  // Translate rPr children through existing handlers (e.g., w:rFonts, w:b, etc)
  /** @type {any[]} */
  const translated = nodeListHandler.handler({ ...params, nodes: contents }) || [];

  // Only keep attribute-shaped entries and normalize to { xmlName, attributes }
  const runPropsArray = translated
    .filter((n) => n && n.type === 'attr')
    .map((n) => ({ xmlName: n.xmlName || n.name, attributes: n.attributes || {} }))
    .filter((e) => e.xmlName);

  return {
    type: 'attr',
    xmlName: 'w:rPr',
    sdNodeOrKeyName: 'runProperties',
    attributes: runPropsArray,
  };
};

/** @type {import('@translator').NodeTranslatorConfig} */
const config = {
  xmlName: XML_NODE_NAME,
  sdNodeOrKeyName: SD_ATTR_KEY,
  type: NodeTranslator.translatorTypes.ATTRIBUTE,
  encode,
};

/**
 * The NodeTranslator instance for the w:rPr element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
