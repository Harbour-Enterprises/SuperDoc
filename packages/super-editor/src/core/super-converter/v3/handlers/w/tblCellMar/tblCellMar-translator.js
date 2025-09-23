import { NodeTranslator } from '@translator';
import { encodeProperties, decodeProperties } from '../../utils.js';
import { marginBottomTranslator } from '../bottom/index.js';
import { marginEndTranslator } from '../end/index.js';
import { marginLeftTranslator } from '../left/index.js';
import { marginRightTranslator } from '../right/index.js';
import { marginStartTranslator } from '../start/index.js';
import { marginTopTranslator } from '../top/index.js';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:tblCellMar';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_KEY = 'cellMargins';

/**
 * Encode the w:tblCellMar element.
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params) => {
  const { nodes } = params;
  const node = nodes[0];

  // Process property translators
  const attributes = encodeProperties(node, propertyTranslatorsByXmlName);

  return Object.keys(attributes).length > 0 ? attributes : undefined;
};

/**
 * Decode the cellMargins key back into OOXML <w:tblBorders>.
 * @param {import('@translator').SCDecoderConfig} params
 * @returns {import('@translator').SCDecoderResult}
 */
const decode = (params) => {
  const { cellMargins = {} } = params.node.attrs || {};

  // Process property translators
  const elements = decodeProperties(propertyTranslatorsBySdName, cellMargins);

  const newNode = {
    name: XML_NODE_NAME,
    type: 'element',
    attributes: {},
    elements: elements,
  };

  return newNode;
};

const propertyTranslators = [
  marginBottomTranslator,
  marginEndTranslator,
  marginLeftTranslator,
  marginRightTranslator,
  marginStartTranslator,
  marginTopTranslator,
];

const propertyTranslatorsByXmlName = {};
const propertyTranslatorsBySdName = {};
propertyTranslators.forEach((translator) => {
  propertyTranslatorsByXmlName[translator.xmlName] = translator;
  propertyTranslatorsBySdName[translator.sdNodeOrKeyName] = translator;
});

export const translator = NodeTranslator.from({
  xmlName: XML_NODE_NAME,
  sdNodeOrKeyName: SD_ATTR_KEY,
  type: NodeTranslator.translatorTypes.NODE,
  attributes: [],
  encode,
  decode,
});
