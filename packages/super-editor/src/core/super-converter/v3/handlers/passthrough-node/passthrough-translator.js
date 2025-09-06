// @ts-check
import { NodeTranslator } from '../../node-translator/index.js';
import { classifyBlockOrInline } from '@superdoc-dev/ooxml-oracle';

/** @type {import('../../node-translator/index.js').XmlNodeName} */
const XML_NODE_NAME = 'passthrough';

/** @type {import('../../node-translator/index.js').SuperDocNodeOrKeyName} */
const SD_NODE_NAME = 'passthroughBlock';

/**
 * Encode an unhandled node as a passthrough node.
 * @param {import('../../node-translator/index.js').SCEncoderConfig} params
 * @returns {import('../../node-translator/index.js').SCEncoderResult}
 */
const encode = (params) => {
  const { nodes, ctx = {} } = params;
  const node = nodes[0];

  // We need to use different node types for block vs inline passthrough nodes
  const inlineOrBlock = classifyBlockOrInline(ctx.parent?.name);
  const passthroughType = inlineOrBlock === 'inline' ? 'passthroughInline' : 'passthroughBlock';

  // This node has no content, we simply store the payload for export later
  const translated = {
    type: passthroughType,
    content: [],
    attrs: {
      payload: node,
    },
  };

  return translated;
};

/**
 * Decode the passthrough node back to its original form.
 * @param {import('../../node-translator/index.js').SCDecoderConfig} params
 * @returns {import('../../node-translator/index.js').SCDecoderResult}
 */
const decode = (params) => {
  const { node } = params;
  const { attrs } = node || {};
  const { payload } = attrs || {};

  if (!payload) return;

  return payload;
};

/** @type {import('../../node-translator/index.js').NodeTranslatorConfig} */
export const config = {
  xmlName: XML_NODE_NAME,
  sdNodeOrKeyName: SD_NODE_NAME,
  type: NodeTranslator.translatorTypes.NODE,
  encode,
  decode,
};

/**
 * The NodeTranslator instance for the passthrough element.
 * @type {import('../../node-translator/index.js').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
