import { NodeTranslator } from '../../../node-translator/node-translator';
import { translator as wpAnchorTranslator } from '@converter/v3/handlers/wp/anchor/anchor-translator.js';
import { translator as wpInlineTranslator } from '@converter/v3/handlers/wp/inline/inline-translator.js';
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

  const translatorByChildName = {
    'wp:anchor': wpAnchorTranslator,
    'wp:inline': wpInlineTranslator,
  };

  return node.elements.reduce((acc, child) => {
    if (acc) return acc;
    const translator = translatorByChildName[child.name];
    if (!translator) return acc;

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

  const childTranslator = node.attrs.isAnchor ? wpAnchorTranslator : wpInlineTranslator;
  const resultNode = childTranslator.decode(params);

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
