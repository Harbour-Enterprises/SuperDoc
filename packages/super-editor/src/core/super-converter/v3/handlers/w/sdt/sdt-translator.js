import { NodeTranslator } from '../../../node-translator/node-translator';
import { sdtNodeTypeStrategy } from './helpers/sdt-node-type-strategy';
import { translateStructuredContent } from './helpers/translate-structured-content';
import { translateDocumentSection } from './helpers/translate-document-section';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:sdt';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_NODE_NAME = ''; // fieldAnnotation, structuredContent, structuredContentBlock, documentSection

/** @type {import('@translator').AttrConfig[]} */
const validXmlAttributes = []; // No attrs for "w:sdt".

/**
 * @param {import('@translator').SCEncoderConfig} params
 * @param {import('@translator').EncodedAttributes} [encodedAttrs]
 * @returns {import('@translator').SCEncoderResult}
 */
function encode(params, encodedAttrs) {
  const nodes = params.nodes;
  const node = nodes[0];

  const { type: sdtType, handler } = sdtNodeTypeStrategy(node);

  if (!handler || sdtType === 'unknown') {
    return undefined;
  }

  const result = handler(params); // TODO: check/fix for handleDocPartObj case.
  return result;
}

/**
 * @param {import('@translator').SCDecoderConfig} params
 * @param {import('@translator').DecodedAttributes} [decodedAttrs]
 * @returns {import('@translator').SCDecoderResult}
 */
function decode(params, decodedAttrs) {
  const { node } = params;

  if (!node || !node.type) {
    return null;
  }

  const types = {
    fieldAnnotation: () => {}, // TODO: move to translator.
    structuredContent: () => translateStructuredContent(params),
    structuredContentBlock: () => translateStructuredContent(params),
    documentSection: () => translateDocumentSection(params),
    default: () => null,
  };
  const decoder = types[node.type] ?? types.default;
  const result = decoder();

  console.log({
    t: node.type,
    decoder,
    result,
  });

  return result;
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
