// @ts-check
import { NodeTranslator } from '@translator';
import { tabSizeEncoder, tabSizeDecoder } from './attributes/index.js';
import { generateRunProps, processOutputMarks } from '../../../../exporter.js';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:tab';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_NODE_NAME = 'tab';

/**
 * The attributes that can be mapped between OOXML and SuperDoc.
 * Note: These are specifically OOXML valid attributes for a given node.
 * @type {import('@translator').AttributesHandlerList[]}
 */
const validXmlAttributes = [{ xmlName: 'w:val', sdName: 'tabSize', encode: tabSizeEncoder, decode: tabSizeDecoder }];

/**
 * Encode a <w:tab> node as a SuperDoc tab node while preserving unknown attributes.
 * @param {import('@translator').SCEncoderConfig} params
 * @param {import('@translator').EncodedAttributes} [encodedAttrs] - The already encoded attributes
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params, encodedAttrs = {}) => {
  const node = params?.nodes?.[0];
  const originalAttrs = { ...(node?.attributes || {}) };

  const translated = { type: 'tab' };

  const mergedAttrs = { ...originalAttrs };

  if (encodedAttrs && Object.keys(encodedAttrs).length) {
    Object.assign(mergedAttrs, encodedAttrs);
    if (encodedAttrs.tabSize !== undefined) {
      delete mergedAttrs['w:val'];
    }
  }

  if (Object.keys(mergedAttrs).length) {
    translated.attrs = mergedAttrs;
  }

  return translated;
};

/**
 * Decode a SuperDoc tab node back into OOXML <w:tab> wrapped in a run.
 * @param {import('@translator').SCDecoderConfig} params
 * @param {import('@translator').DecodedAttributes} [decodedAttrs] - The already decoded attributes
 * @returns {import('@translator').SCDecoderResult}
 */
const decode = (params, decodedAttrs = {}) => {
  const { node } = params || {};
  if (!node) return;

  const superDocAttrs = { ...(node.attrs || {}) };

  const mergedAttrs = { ...superDocAttrs };
  if (decodedAttrs && Object.keys(decodedAttrs).length) {
    Object.assign(mergedAttrs, decodedAttrs);
    if (decodedAttrs['w:val'] !== undefined) {
      delete mergedAttrs.tabSize;
    }
  }

  const wTab = { name: 'w:tab' };
  if (Object.keys(mergedAttrs).length) {
    wTab.attributes = mergedAttrs;
  }

  const translated = {
    name: 'w:r',
    elements: [wTab],
  };

  // This is needed until we support w:r nodes
  // Later we will refactor this to not wrap the tab in a run and run those nodes separately
  const { marks: nodeMarks = [] } = node;
  const outputMarks = processOutputMarks(nodeMarks);
  if (outputMarks.length) {
    translated.elements.unshift(generateRunProps(outputMarks));
  }

  return translated;
};

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
 * The NodeTranslator instance for the <w:tab> element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
