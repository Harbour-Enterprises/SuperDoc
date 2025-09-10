// @ts-check
import { NodeTranslator } from '@translator';
import { handleParagraphNode as legacyHandleParagraphNode } from './helpers/legacy-handle-paragraph-node.js';
import { translateParagraphNode } from '../../../../exporter.js';
import {
  w14ParaIdEncoder,
  w14ParaIdDecoder,
  w14TextIdEncoder,
  w14TextIdDecoder,
  wRsidREncoder,
  wRsidRDecoder,
  wRsidRDefaultEncoder,
  wRsidRDefaultDecoder,
  wRsidPEncoder,
  wRsidPDecoder,
  wRsidRPrEncoder,
  wRsidRPrDecoder,
  wRsidDelEncoder,
  wRsidDelDecoder,
} from './attributes/index.js';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:p';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_NODE_NAME = 'paragraph';

/**
 * The attributes that can be mapped between OOXML and SuperDoc.
 * Note: These are specifically OOXML valid attributes for a given node.
 * @type {import('@translator').AttributesHandlerList[]}
 */
const validXmlAttributes = [
  { xmlName: 'w14:paraId', sdName: 'paraId', encode: w14ParaIdEncoder, decode: w14ParaIdDecoder },
  { xmlName: 'w14:textId', sdName: 'textId', encode: w14TextIdEncoder, decode: w14TextIdDecoder },
  { xmlName: 'w:rsidR', sdName: 'rsidR', encode: wRsidREncoder, decode: wRsidRDecoder },
  { xmlName: 'w:rsidRDefault', sdName: 'rsidRDefault', encode: wRsidRDefaultEncoder, decode: wRsidRDefaultDecoder },
  { xmlName: 'w:rsidP', sdName: 'rsidP', encode: wRsidPEncoder, decode: wRsidPDecoder },
  { xmlName: 'w:rsidRPr', sdName: 'rsidRPr', encode: wRsidRPrEncoder, decode: wRsidRPrDecoder },
  { xmlName: 'w:rsidDel', sdName: 'rsidDel', encode: wRsidDelEncoder, decode: wRsidDelDecoder },
];

/**
 * Encode a <w:p> node as a SuperDoc paragraph node.
 * @param {import('@translator').SCEncoderConfig} params
 * @param {import('@translator').EncodedAttributes} [encodedAttrs]
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params, encodedAttrs = {}) => {
  // Use the legacy paragraph handler to avoid circular calls to this translator
  const node = legacyHandleParagraphNode(params);
  if (!node) return undefined;
  if (encodedAttrs && Object.keys(encodedAttrs).length) {
    node.attrs = { ...node.attrs, ...encodedAttrs };
  }
  return node;
};

/**
 * Decode a SuperDoc paragraph node back into OOXML <w:p>.
 * @param {import('@translator').SCDecoderConfig} params
 * @param {import('@translator').DecodedAttributes} [decodedAttrs]
 * @returns {import('@translator').SCDecoderResult}
 */
const decode = (params, decodedAttrs = {}) => {
  const translated = translateParagraphNode(params);
  if (!translated) return undefined;
  if (decodedAttrs && Object.keys(decodedAttrs).length) {
    translated.attributes = { ...(translated.attributes || {}), ...decodedAttrs };
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
 * The NodeTranslator instance for the <w:p> element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
