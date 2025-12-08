// @ts-check
import { NodeTranslator } from '@translator';
import { createAttributeHandler } from '@converter/v3/handlers/utils.js';
import { translator as wDelTranslator } from '@converter/v3/handlers/w/del/index.js';
import { translator as wInsTranslator } from '@converter/v3/handlers/w/ins/index.js';
import { translator as wHyperlinkTranslator } from '@converter/v3/handlers/w/hyperlink/index.js';
import { getTextNodeForExport } from '@converter/v3/handlers/w/t/helpers/translate-text-node.js';

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
 * @param {import('@translator').SCEncoderConfig} params
 * @param {import('@translator').EncodedAttributes} [encodedAttrs] - The already encoded attributes
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params, encodedAttrs = {}) => {
  const { node } = params.extraParams;
  const { elements, type, attributes } = node;

  // Text nodes have no children. Only text, and there should only be one child
  let text;

  if (!elements) {
    return null;
  }

  if (elements.length === 1) {
    text = elements[0].text;
    const xmlSpace = encodedAttrs.xmlSpace ?? elements[0]?.attributes?.['xml:space'];
    if (xmlSpace !== 'preserve' && typeof text === 'string') {
      // Only trim regular ASCII whitespace, not NBSP (U+00A0) which is used intentionally for alignment
      text = text.replace(/^[ \t\n\r]+/, '').replace(/[ \t\n\r]+$/, '');
    }
    // Handle the removal of a temporary wrapper that we added to preserve empty spaces
    text = text.replace(/\[\[sdspace\]\]/g, '');
  } else if (!elements.length && encodedAttrs.xmlSpace === 'preserve') {
    // Word sometimes will have an empty text node with a space attribute, in that case it should be a space
    text = ' ';
  } else return null;

  return {
    type: 'text',
    text: text,
    attrs: { type, attributes: attributes || {} },
    marks: [],
  };
};

/**
 * Decode a SuperDoc text node back into OOXML <w:t> wrapped in a run.
 * @param {import('@translator').SCDecoderConfig} params
 * @returns {import('@translator').SCDecoderResult}
 */
const decode = (params) => {
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
 * The NodeTranslator instance for the <w:t> element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
