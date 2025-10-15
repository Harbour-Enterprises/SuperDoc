// @ts-check
import { NodeTranslator } from '@translator';
import { encodeProperties } from '../../utils.js';
import { translator as headerTranslator } from '../header';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:headers';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_KEY = 'headers';

/**
 * Encode the w:headers element.
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params) => {
  const { nodes } = params;
  const node = nodes[0];

  // Process property translators
  const attributes = encodeProperties(node, { [headerTranslator.xmlName]: headerTranslator }, true);

  return {
    xmlName: XML_NODE_NAME,
    sdNodeOrKeyName: SD_ATTR_KEY,
    attributes,
  };
};

/**
 * Decode the headers in the node back into OOXML <w:headers>.
 * @param {import('@translator').SCDecoderConfig} params
 * @returns {import('@translator').SCDecoderResult}
 */
const decode = (params) => {
  const { headers = [] } = params.node.attrs || {};
  const newNode = {
    name: XML_NODE_NAME,
    attributes: {},
    elements: headers.map((header) =>
      headerTranslator.decode({
        node: { type: 'header', attrs: header },
      }),
    ),
  };

  return newNode;
};

/** @type {import('@translator').NodeTranslatorConfig} */
export const config = {
  xmlName: XML_NODE_NAME,
  sdNodeOrKeyName: SD_ATTR_KEY,
  encode,
  decode,
};

/**
 * The NodeTranslator instance for the w:headers element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
