// @ts-check
import { NodeTranslator } from '@translator';
import { createAttributeHandler } from '@converter/v3/handlers/utils.js';
import { translator as wDelTranslator } from '@converter/v3/handlers/w/del/index.js';
import { translator as wInsTranslator } from '@converter/v3/handlers/w/ins/index.js';
import { translator as wHyperlinkTranslator } from '@converter/v3/handlers/w/hyperlink/index.js';
import { getTextNodeForExport } from '@converter/exporter.js';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:t';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_NODE_NAME = 'text';

/** @type {import('@translator').AttrConfig[]} */
const validXmlAttributes = [createAttributeHandler('xml:space', 'xmlSpace')];

/**
 * Translate a text node or link node.
 * Link nodes look the same as text nodes but with a link attr.
 * Also, tracked changes are text marks so those need to be separated here.
 * We need to check here and re-route as necessary
 * @param {import('@translator').SCEncoderConfig} _
 * @param {import('@translator').EncodedAttributes} [encodedAttrs] - The already encoded attributes
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params, encodedAttrs = {}) => {
  const { node } = params.extraParams;
  const { elements, type, attributes } = node;

  // Text nodes have no children. Only text, and there should only be one child
  let text;

  if (elements.length === 1) {
    text = elements[0].text;
    const xmlSpace = encodedAttrs.xmlSpace ?? elements[0]?.attributes?.['xml:space'];
    if (xmlSpace !== 'preserve' && typeof text === 'string') {
      text = text.replace(/^\s+/, '').replace(/\s+$/, '');
    }
    // Handle the removal of a temporary wrapper that we added to preserve empty spaces
    text = text.replace(/\[\[sdspace\]\]/g, '');
  }
  // Word sometimes will have an empty text node with a space attribute, in that case it should be a space
  else if (!elements.length && encodedAttrs.xmlSpace === 'preserve') {
    text = ' ';
  }

  // Ignore others - can catch other special cases here if necessary
  else return null;

  return {
    type: 'text',
    text: text,
    attrs: { type, attributes: attributes || {} },
    marks: [],
  };
};

/**
 * Decode a SuperDoc tab node back into OOXML <w:tab> wrapped in a run.
 * @param {import('@translator').SCDecoderConfig} params
 * @param {import('@translator').DecodedAttributes} [decodedAttrs] - The already decoded attributes
 * @returns {import('@translator').SCDecoderResult}
 */
const decode = (params, decodedAttrs = {}) => {
  const { node, extraParams } = params;

  if (!node || !node.type) {
    return null;
  }

  // Separate tracked changes from regular text
  const trackedMarks = ['trackDelete', 'trackInsert'];
  const trackedMark = node.marks?.find((m) => trackedMarks.includes(m.type));

  if (trackedMark) {
    switch (trackedMark.type) {
      case 'trackDelete':
        return wDelTranslator.decode(params);
      case 'trackInsert':
        return wInsTranslator.decode(params);
    }
  }

  // Separate links from regular text
  const isLinkNode = node.marks?.some((m) => m.type === 'link');
  if (isLinkNode && !extraParams?.linkProcessed) {
    return wHyperlinkTranslator.decode(params);
  }

  const { text, marks = [] } = node;
  return getTextNodeForExport(text, marks, params);
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
