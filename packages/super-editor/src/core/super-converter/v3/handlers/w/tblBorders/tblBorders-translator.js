import { NodeTranslator } from '@translator';
import { encodeProperties, decodeProperties } from '../../utils.js';
import { translator as wBottomTranslator } from '../bottom';
import { translator as wEndTranslator } from '../end';
import { translator as wInsideHTranslator } from '../insideH';
import { translator as wInsideVTranslator } from '../insideV';
import { translator as wLeftTranslator } from '../left';
import { translator as wRightTranslator } from '../right';
import { translator as wStartTranslator } from '../start';
import { translator as wTopTranslator } from '../top';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:tblBorders';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_KEY = 'borders';

/**
 * Encode the w:tblBorders element.
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params) => {
  const { nodes } = params;
  const node = nodes[0];

  // Process property translators
  const attributes = encodeProperties(node, tblBordersTranslatorsByXmlName);

  return Object.keys(attributes).length > 0 ? attributes : undefined;
};

/**
 * Decode the borders key back into OOXML <w:tblBorders>.
 * @param {import('@translator').SCDecoderConfig} params
 * @returns {import('@translator').SCDecoderResult}
 */
const decode = (params) => {
  const { borders = {} } = params.node.attrs || {};

  // Process property translators
  const elements = decodeProperties(tblBordersTranslatorsBySdName, borders);

  const newNode = {
    name: 'w:tblBorders',
    type: 'element',
    attributes: {},
    elements: elements,
  };

  return newNode;
};

// Property translators for w:tblBorders child elements
// Each translator handles a specific border property of the table
/** @type {import('@translator').NodeTranslatorConfig[]} */
const propertyTranslators = [
  wBottomTranslator,
  wEndTranslator,
  wInsideHTranslator,
  wInsideVTranslator,
  wLeftTranslator,
  wRightTranslator,
  wStartTranslator,
  wTopTranslator,
];

// Index property translators by their XML names and SD names for quick lookup
const tblBordersTranslatorsByXmlName = {};
const tblBordersTranslatorsBySdName = {};
propertyTranslators.forEach((translator) => {
  tblBordersTranslatorsByXmlName[translator.xmlName] = translator;
  tblBordersTranslatorsBySdName[translator.sdNodeOrKeyName] = translator;
});

/**
 * The NodeTranslator instance for the tblBorders element.
 * @type {import('@translator').NodeTranslator}
 * @see {@link https://ecma-international.org/publications-and-standards/standards/ecma-376/} "Fundamentals And Markup Language Reference", page 422
 */
export const translator = NodeTranslator.from({
  xmlName: XML_NODE_NAME,
  sdNodeOrKeyName: SD_ATTR_KEY,
  type: NodeTranslator.translatorTypes.NODE,
  attributes: [],
  encode,
  decode,
});
