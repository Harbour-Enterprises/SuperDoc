// @ts-check
import { NodeTranslator } from '../../../node-translator/index.js';
import {
  tabSizeEncoder,
  tabSizeDecoder,
  tabPositionEncoder,
  tabPositionDecoder,
  tabLeaderEncoder,
  tabLeaderDecoder,
} from './attributes/index.js';

/** @type {import('../../../node-translator/index.js').XmlNodeName} */
const XML_NODE_NAME = 'w:tab';

/** @type {import('../../../node-translator/index.js').SuperDocNodeOrKeyName} */
const SD_NODE_NAME = 'tab';

/**
 * The attributes that can be mapped between OOXML and SuperDoc.
 * @type {import('../../../node-translator/index.js').AttributesHandlerList[]}
 */
const attributes = [
  { xmlName: 'w:val', sdName: 'tabSize', encode: tabSizeEncoder, decode: tabSizeDecoder },
  { xmlName: 'w:pos', sdName: 'tabPosition', encode: tabPositionEncoder, decode: tabPositionDecoder },
  { xmlName: 'w:leader', sdName: 'tabLeader', encode: tabLeaderEncoder, decode: tabLeaderDecoder },
];

/**
 * Encode a <w:tab> node as a SuperDoc tab node while preserving unknown attributes.
 * @param {import('../../../node-translator/index.js').SCEncoderConfig} params
 * @param {import('../../../node-translator/index.js').EncodedAttributes} [encodedAttrs] - The already encoded attributes
 * @returns {import('../../../node-translator/index.js').SCEncoderResult}
 */
const encode = (params, encodedAttrs = {}) => {
  const node = params?.nodes?.[0];
  const originalAttrs = { ...(node?.attributes || {}) };

  const translated = { type: 'tab' };

  const mergedAttrs = { ...originalAttrs };

  if (encodedAttrs && Object.keys(encodedAttrs).length) {
    Object.assign(mergedAttrs, encodedAttrs);
    attributes.forEach(({ xmlName, sdName }) => {
      if (encodedAttrs[sdName] !== undefined) {
        delete mergedAttrs[xmlName];
      }
    });
  }

  if (Object.keys(mergedAttrs).length) {
    translated.attrs = mergedAttrs;
  }

  return translated;
};

/**
 * Decode a SuperDoc tab node back into OOXML <w:tab> wrapped in a run.
 * @param {import('../../../node-translator/index.js').SCDecoderConfig} params
 * @param {import('../../../node-translator/index.js').DecodedAttributes} [decodedAttrs] - The already decoded attributes
 * @returns {import('../../../node-translator/index.js').SCDecoderResult}
 */
const decode = (params, decodedAttrs = {}) => {
  const { node } = params || {};
  if (!node) return;

  const superDocAttrs = { ...(node.attrs || {}) };

  const mergedAttrs = { ...superDocAttrs };
  if (decodedAttrs && Object.keys(decodedAttrs).length) {
    Object.assign(mergedAttrs, decodedAttrs);
    attributes.forEach(({ xmlName, sdName }) => {
      if (decodedAttrs[xmlName] !== undefined) {
        delete mergedAttrs[sdName];
      }
    });
  }

  const wTab = { name: 'w:tab' };
  if (Object.keys(mergedAttrs).length) {
    wTab.attributes = mergedAttrs;
  }

  const translated = {
    name: 'w:r',
    elements: [wTab],
  };

  return translated;
};

/** @type {import('../../../node-translator/index.js').NodeTranslatorConfig} */
export const config = {
  xmlName: XML_NODE_NAME,
  sdNodeOrKeyName: SD_NODE_NAME,
  type: NodeTranslator.translatorTypes.NODE,
  encode,
  decode,
  attributes,
};

/**
 * The NodeTranslator instance for the <w:tab> element.
 * @type {import('../../../node-translator/index.js').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
