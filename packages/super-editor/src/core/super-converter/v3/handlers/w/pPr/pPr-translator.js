// @ts-check
import { NodeTranslator } from '@translator';
import { encodeProperties, decodeProperties } from '@converter/v3/handlers/utils.js';
import { translator as spacingTranslator } from '@converter/v3/handlers/w/spacing';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:pPr';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_KEY = 'paragraphProperties';

/**
 * Encode the w:pPr element.
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params) => {
  const { nodes } = params;
  const node = nodes[0];
  let attributes = {};

  // Process property translators
  attributes = {
    ...attributes,
    ...encodeProperties(node, propertyTranslatorsByXmlName),
  };

  return {
    type: NodeTranslator.translatorTypes.ATTRIBUTE,
    xmlName: XML_NODE_NAME,
    sdNodeOrKeyName: SD_ATTR_KEY,
    attributes,
  };
};

/**
 * Decode the paragraphProperties in the paragraph node back into OOXML <w:pPr>.
 * @param {import('@translator').SCDecoderConfig} params
 * @returns {import('@translator').SCDecoderResult}
 */
const decode = (params) => {
  const { paragraphProperties = {} } = params.node.attrs || {};

  // Process property translators
  const elements = decodeProperties(propertyTranslatorsBySdName, paragraphProperties);

  const newNode = {
    name: 'w:pPr',
    type: 'element',
    attributes: {},
    elements: elements,
  };

  return newNode;
};

// Property translators for w:pPr child elements
// Each translator handles a specific property of the paragraph
/** @type {import('@translator').NodeTranslatorConfig[]} */
const propertyTranslators = [
  spacingTranslator,
  // TODO: Add other pPr property translators here as they are created
  // Examples: w:ind (indentation), w:jc (justification), w:keepNext, w:keepLines, etc.
];

// Index property translators by their XML names for quick lookup
const propertyTranslatorsByXmlName = {};
propertyTranslators.forEach((translator) => {
  propertyTranslatorsByXmlName[translator.xmlName] = translator;
});

// Index property translators by their SuperDoc key names for quick lookup
const propertyTranslatorsBySdName = {};
propertyTranslators.forEach((translator) => {
  propertyTranslatorsBySdName[translator.sdNodeOrKeyName] = translator;
});

/** @type {import('@translator').NodeTranslatorConfig} */
const config = {
  xmlName: XML_NODE_NAME,
  sdNodeOrKeyName: SD_ATTR_KEY,
  type: NodeTranslator.translatorTypes.ATTRIBUTE,
  encode,
  decode,
};

/**
 * The NodeTranslator instance for the w:pPr element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
