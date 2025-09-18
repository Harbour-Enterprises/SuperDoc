// @ts-check
import { NodeTranslator } from '@translator';
import { encodeProperties, decodeProperties } from '@converter/v3/handlers/utils.js';
import { translator as cantSplitTranslator } from '@converter/v3/handlers/w/cantSplit';
import { translator as cnfStyleTranslator } from '@converter/v3/handlers/w/cnfStyle';
import { translator as divIdTranslator } from '@converter/v3/handlers/w/divId';
import { translator as gridAfterTranslator } from '@converter/v3/handlers/w/gridAfter';
import { translator as gridBeforeTranslator } from '@converter/v3/handlers/w/gridBefore';
import { translator as hiddenTranslator } from '@converter/v3/handlers/w/hidden';
import { translator as jcTranslator } from '@converter/v3/handlers/w/jc';
import { translator as tblCellSpacingTranslator } from '@converter/v3/handlers/w/tblCellSpacing';
import { translator as tblHeaderTranslator } from '@converter/v3/handlers/w/tblHeader';
import { translator as trHeightTranslator } from '@converter/v3/handlers/w/trHeight';
import { translator as trWAfterTranslator } from '@converter/v3/handlers/w/wAfter';
import { translator as trWBeforeTranslator } from '@converter/v3/handlers/w/wBefore';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:trPr';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_KEY = 'tableRowProperties';

/**
 * Encode the w:trPr element.
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params) => {
  const { nodes } = params;
  const node = nodes[0];
  let attributes = {
    cantSplit: false,
    hidden: false,
    repeatHeader: false,
  };

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
 * Decode the tableRowProperties in the tableRow node back into OOXML <w:trPr>.
 * @param {import('@translator').SCDecoderConfig} params
 * @returns {import('@translator').SCDecoderResult}
 */
const decode = (params) => {
  const { tableRowProperties = {} } = params.node.attrs || {};

  // Process property translators
  const elements = decodeProperties(propertyTranslatorsBySdName, tableRowProperties);

  const newNode = {
    name: 'w:trPr',
    type: 'element',
    attributes: {},
    elements: elements,
  };

  return newNode;
};

// Property translators for w:trPr child elements
// Each translator handles a specific property of the table row
/** @type {import('@translator').NodeTranslatorConfig[]} */
const propertyTranslators = [
  cantSplitTranslator,
  cnfStyleTranslator,
  divIdTranslator,
  gridAfterTranslator,
  gridBeforeTranslator,
  hiddenTranslator,
  jcTranslator,
  tblCellSpacingTranslator,
  tblHeaderTranslator,
  trHeightTranslator,
  trWAfterTranslator,
  trWBeforeTranslator,
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
 * The NodeTranslator instance for the w:trPr element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
