import { NodeTranslator } from '../../../node-translator/node-translator';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'mc:AlternateContent';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_NODE_NAME = [];

/** @type {import('@translator').AttrConfig[]} */
const validXmlAttributes = [];

/**
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
function encode(params) {
  const { nodeListHandler } = params;
  const { node } = params.extraParams;

  if (!node || !node.type) {
    return null;
  }

  const allowedNamespaces = ['wps', 'wp14', 'w14', 'w15'];
  const wpsNode = node.elements.find(
    (el) => el.name === 'mc:Choice' && allowedNamespaces.includes(el.attributes['Requires']),
  );

  if (!wpsNode) {
    return null;
  }

  const contents = wpsNode.elements;
  return nodeListHandler.handler({
    ...params,
    nodes: contents,
    path: [...(params.path || []), wpsNode],
  });
}

/**
 * @param {import('@translator').SCDecoderConfig} params
 * @returns {import('@translator').SCDecoderResult}
 */
function decode(params) {
  const { node } = params;
  const { drawingContent } = node.attrs;

  // Handle modern DrawingML content (existing logic)
  const drawing = {
    name: 'w:drawing',
    elements: [...(drawingContent ? [...(drawingContent.elements || [])] : [])],
  };

  const choice = {
    name: 'mc:Choice',
    attributes: { Requires: 'wps' },
    elements: [drawing],
  };

  return {
    name: 'mc:AlternateContent',
    elements: [choice],
  };
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
