import { NodeTranslator } from '../../../node-translator/node-translator';
import { registeredHandlers } from '@converter/v3/handlers/index.js';
import { wrapTextInRun } from '@converter/exporter.js';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:drawing';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_NODE_NAME = [];

/** @type {import('@translator').AttrConfig[]} */
const validXmlAttributes = [];

/**
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
function encode(params) {
  const nodes = params.nodes;
  const node = nodes[0];

  const validChildTranslators = ['wp:anchor', 'wp:inline'];

  return node.elements.reduce((acc, child) => {
    if (acc) return acc;
    if (!validChildTranslators.includes(child.name)) return acc;
    const translator = registeredHandlers[child.name];

    return translator.encode({ ...params, extraParams: { node: child } }) || acc;
  }, null);
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

  const handlerName = node.attrs.isAnchor ? 'wp:anchor' : 'wp:inline';
  const resultNode = registeredHandlers[handlerName].decode(params);

  return wrapTextInRun(
    {
      name: 'w:drawing',
      elements: [resultNode],
    },
    [],
  );
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
