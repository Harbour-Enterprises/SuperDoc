// @ts-check
import { NodeTranslator } from '../../../node-translator/index.js';
import { lineBreakTypeDecoder, lineBreakTypeEncoder } from './attributes/index.js';
import { wClearDecoder, wClearEncoder } from './attributes/index.js';

/** @type {import('../../../node-translator/index.js').XmlNodeName} */
const XML_NODE_NAME = 'w:br';

/** @type {import('../../../node-translator/index.js').SuperDocNodeOrKeyName} */
const SD_NODE_NAME = 'lineBreak';

/**
 * The attributes that can be mapped between OOXML and SuperDoc.
 * @type {import('../../../node-translator/index.js').AttributesHandlerList[]}
 */
const attributes = [
  { xmlName: 'w:type', sdName: 'lineBreakType', encode: lineBreakTypeEncoder, decode: lineBreakTypeDecoder },
  { xmlName: 'w:clear', sdName: 'clear', encode: wClearEncoder, decode: wClearDecoder },
];

/**
 * Encode an unhandled node as a passthrough node.
 * @param {import('../../../node-translator/index.js').SCEncoderConfig} _
 * @param {import('../../../node-translator/index.js').EncodedAttributes} [encodedAttrs] - The already encoded attributes
 * @returns {import('../../../node-translator/index.js').SCEncoderResult}
 */
const encode = (_, encodedAttrs) => {
  const isPageBreak = encodedAttrs?.lineBreakType === 'page';
  const translated = {
    type: isPageBreak ? 'hardBreak' : 'lineBreak',
  };

  if (encodedAttrs) {
    translated.attrs = { ...encodedAttrs };
  }

  return translated;
};

/**
 * Decode the lineBreak / hardBreak node back into OOXML <w:br>.
 * @param {import('../../../node-translator/index.js').SCDecoderConfig} params
 * @param {import('../../../node-translator/index.js').DecodedAttributes} [decodedAttrs] - The already decoded attributes
 * @returns {import('../../../node-translator/index.js').SCDecoderResult}
 */
const decode = (params, decodedAttrs) => {
  const { node } = params;
  if (!node) return;

  const attrs = { ...(decodedAttrs || {}) };

  // default to page break when exporting a hardBreak without an explicit lineBreakType
  if (node.type === 'hardBreak' && !('w:type' in attrs)) {
    attrs['w:type'] = 'page';
  }

  const wBreak = { name: 'w:br' };

  if (Object.keys(attrs).length > 0) {
    wBreak.attributes = attrs;
  }

  /** breaks are wrapped in runs for Google Docs compatibility */
  const translated = {
    name: 'w:r',
    elements: [wBreak],
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
 * The NodeTranslator instance for the passthrough element.
 * @type {import('../../../node-translator/index.js').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
