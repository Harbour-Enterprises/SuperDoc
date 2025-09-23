import { NodeTranslator } from '../../../node-translator/node-translator';
import { createAttributeHandler } from '@converter/v3/handlers/utils.js';
import { handleAnchorNode } from '@converter/v3/handlers/wp/anchor/helpers/handle-anchor-node.js';
import { translateAnchorNode } from '@converter/v3/handlers/wp/anchor/helpers/translate-anchor-node.js';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'wp:anchor';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_NODE_NAME = ['image'];

/** @type {import('@translator').AttrConfig[]} */
const validXmlAttributes = ['distT', 'distB', 'distL', 'distR'].map((xmlName) => createAttributeHandler(xmlName));
/**
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
function encode(params) {
  const { node } = params.extraParams;

  if (!node || !node.type) {
    return null;
  }

  return handleAnchorNode(params);
}

/**
 * @param {import('@translator').SCDecoderConfig} params
 * @returns {import('@translator').SCDecoderResult}
 */
function decode(params) {
  const { node } = params;

  if (!node || !node.type) {
    return null;
  }

  return translateAnchorNode(params);
}

/** @type {import('@translator').NodeTranslatorConfig} */
export const config = {
  xmlName: XML_NODE_NAME,
  sdNodeOrKeyName: SD_NODE_NAME,
  type: NodeTranslator.translatorTypes.NODE,
  encode,
  decode,
  attributes: validXmlAttributes,
};

/**
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
