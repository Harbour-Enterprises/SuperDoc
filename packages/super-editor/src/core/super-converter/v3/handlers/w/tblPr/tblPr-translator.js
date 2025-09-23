// @ts-check
import { NodeTranslator } from '@translator';
import { encodeProperties, decodeProperties } from '../../utils.js';

import { translator as bidiVisualTranslator } from '../bidiVisual';
import { translator as jcTranslator } from '../jc';
import { translator as shdTranslator } from '../shd';
import { translator as tblCaptionTranslator } from '../tblCaption';
import { translator as tblCellSpacingTranslator } from '../tblCellSpacing';
import { translator as tblDescriptionTranslator } from '../tblDescription';
import { translator as tblIndTranslator } from '../tblInd';
import { translator as tblLayoutTranslator } from '../tblLayout';
import { translator as tblLookTranslator } from '../tblLook';
import { translator as tblOverlapTranslator } from '../tblOverlap';
import { translator as tblStyleTranslator } from '../tblStyle';
import { translator as tblStyleColBandSizeTranslator } from '../tblStyleColBandSize';
import { translator as tblStyleRowBandSizeTranslator } from '../tblStyleRowBandSize';
import { translator as tblWTranslator } from '../tblW';
import { translator as tblpPrTranslator } from '../tblpPr';
import { translator as tblBordersTranslator } from '../tblBorders';
import { translator as tblCellMarTranslator } from '../tblCellMar';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:tblPr';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_KEY = 'tableProperties';

/**
 * Encode the w:rPr element.
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params) => {
  const { nodes } = params;
  const node = nodes[0];

  // Process property translators
  const attributes = encodeProperties(node, propertyTranslatorsByXmlName);

  return {
    xmlName: XML_NODE_NAME,
    sdNodeOrKeyName: SD_ATTR_KEY,
    attributes,
  };
};

/**
 * Decode the tableProperties in the table node back into OOXML <w:tblPr>.
 * @param {import('@translator').SCDecoderConfig} params
 * @returns {import('@translator').SCDecoderResult}
 */
const decode = (params) => {
  const { tableProperties = {} } = params.node.attrs || {};

  // Process property translators
  const elements = decodeProperties(propertyTranslatorsBySdName, tableProperties);

  const newNode = {
    name: 'w:tblPr',
    type: 'element',
    attributes: {},
    elements: elements,
  };

  return newNode;
};

// Property translators for w:tblPr child elements
// Each translator handles a specific property of the table
/** @type {import('@translator').NodeTranslatorConfig[]} */
const propertyTranslators = [
  bidiVisualTranslator,
  jcTranslator,
  shdTranslator,
  tblCaptionTranslator,
  tblCellSpacingTranslator,
  tblDescriptionTranslator,
  tblIndTranslator,
  tblLayoutTranslator,
  tblLookTranslator,
  tblOverlapTranslator,
  tblStyleTranslator,
  tblStyleColBandSizeTranslator,
  tblStyleRowBandSizeTranslator,
  tblWTranslator,
  tblpPrTranslator,
  tblBordersTranslator,
  tblCellMarTranslator,
];

// Index property translators for quick lookup
const propertyTranslatorsByXmlName = {};
const propertyTranslatorsBySdName = {};
propertyTranslators.forEach((translator) => {
  propertyTranslatorsByXmlName[translator.xmlName] = translator;
  propertyTranslatorsBySdName[translator.sdNodeOrKeyName] = translator;
});

/** @type {import('@translator').NodeTranslatorConfig} */
const config = {
  xmlName: XML_NODE_NAME,
  sdNodeOrKeyName: SD_ATTR_KEY,
  encode,
  decode,
};

/**
 * The NodeTranslator instance for the w:tblPr element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
