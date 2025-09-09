// @ts-check
import { NodeTranslator } from '../../../node-translator/index.js';

/** @type {import('../../../node-translator/index.js').XmlNodeName} */
const XML_NODE_NAME = 'w:tab';

/** @type {import('../../../node-translator/index.js').SuperDocNodeOrKeyName} */
const SD_NODE_NAME = 'tab';

/**
 * The <w:tab/> element does not define any OOXML attributes that need to be
 * translated. This empty array is kept for consistency with other
 * translators and future extension.
 * @type {import('../../../node-translator/index.js').AttributesHandlerList[]}
 */
const attributes = [];

/**
 * Encode a <w:tab/> element into a SuperDoc `tab` node.
 * @param {import('../../../node-translator/index.js').SCEncoderConfig} _
 * @param {import('../../../node-translator/index.js').EncodedAttributes} [encodedAttrs] - The already encoded attributes
 * @returns {import('../../../node-translator/index.js').SCEncoderResult}
 */
const encode = (_, encodedAttrs) => {
  const translated = { type: 'tab' };
  if (encodedAttrs && Object.keys(encodedAttrs).length > 0) {
    translated.attrs = { ...encodedAttrs };
  }
  return translated;
};

/**
 * Decode a SuperDoc `tab` node back into OOXML <w:tab/>.
 * @param {import('../../../node-translator/index.js').SCDecoderConfig} params
 * @param {import('../../../node-translator/index.js').DecodedAttributes} [decodedAttrs] - The already decoded attributes
 * @returns {import('../../../node-translator/index.js').SCDecoderResult}
 */
const decode = (params, decodedAttrs) => {
  const { node } = params;
  if (!node) return;

  const wTab = { name: 'w:tab' };

  if (decodedAttrs && Object.keys(decodedAttrs).length > 0) {
    wTab.attributes = { ...decodedAttrs };
  }

  /** tabs are wrapped in runs for Google Docs compatibility */
  return {
    name: 'w:r',
    elements: [wTab],
  };
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
