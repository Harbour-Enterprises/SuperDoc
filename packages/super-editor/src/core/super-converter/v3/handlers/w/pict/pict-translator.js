import { NodeTranslator } from '../../../node-translator/node-translator';
import { pictNodeTypeStrategy } from './helpers/pict-node-type-strategy';
import { translateShapeContainer } from './helpers/translate-shape-container';
import { translateShapeTextbox } from './helpers/translate-shape-textbox';
import { translateContentBlock } from './helpers/translate-content-block';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:pict';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_NODE_NAME = ['shapeContainer', 'contentBlock'];

/** @type {import('@translator').AttrConfig[]} */
const validXmlAttributes = []; // No attrs for "w:pict".

/**
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
function encode(params) {
  const { node, pNode } = params.extraParams;

  const { type: pictType, handler } = pictNodeTypeStrategy(node);

  if (!handler || pictType === 'unknown') {
    return undefined;
  }

  const result = handler({
    params,
    pNode,
    pict: node,
  });

  return result;
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

  const types = {
    shapeContainer: () => translateShapeContainer(params),
    shapeTextbox: () => translateShapeTextbox(params),
    contentBlock: () => translateContentBlock(params),
    default: () => null,
  };

  const decoder = types[node.type] ?? types.default;
  const result = decoder();
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
