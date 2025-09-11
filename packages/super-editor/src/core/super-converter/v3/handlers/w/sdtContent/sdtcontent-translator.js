import { NodeTranslator } from '../../../node-translator/node-translator';
import { translateStructuredContent } from './helpers/translate-structured-content';
import { handleSdtContentNode } from './helpers/legacy-handle-sdt-content-node';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:sdtContent';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_NODE_NAME = 'structuredContent'; // + "structuredContentBlock"

/** @type {import('@translator').AttrConfig[]} */
const validXmlAttributes = []; // No attrs for "w:sdtContent".

/**
 * @param {import('@translator').SCEncoderConfig} params
 * @param {import('@translator').EncodedAttributes} [encodedAttrs]
 * @returns {import('@translator').SCEncoderResult}
 */
function encode(params, encodedAttrs) {
  const { node, sdtNode } = params.extraParams;

  const schemaNode = handleSdtContentNode({
    params,
    node,
    sdtNode,
  });

  if (encodedAttrs && Object.keys(encodedAttrs).length) {
    schemaNode.attrs = { ...schemaNode.attrs, ...encodedAttrs };
  }

  return schemaNode;
}

/**
 * @param {import('@translator').SCDecoderConfig} params
 * @param {import('@translator').DecodedAttributes} [decodedAttrs]
 * @returns {import('@translator').SCDecoderResult}
 */
function decode(params, decodedAttrs) {
  const translated = translateStructuredContent(params);
  if (decodedAttrs && Object.keys(decodedAttrs).length) {
    translated.attributes = { ...(translated.attributes || {}), ...decodedAttrs };
  }
  return translated;
}

/** @type {import('@translator').NodeTranslatorConfig} */
export const config = {
  xmlName: XML_NODE_NAME,
  // It's probably better to convert "sdNodeOrKeyName" property into an array,
  // since one XML node can be represented by several PM nodes.
  // Example: structuredContent and structuredContentBlock.
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
