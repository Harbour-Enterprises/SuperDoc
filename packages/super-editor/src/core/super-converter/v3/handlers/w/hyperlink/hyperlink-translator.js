// @ts-check
import { NodeTranslator } from '@translator';
import { generateDocxRandomId } from '@helpers/generateDocxRandomId.js';
import { exportSchemaToJson } from '@core/super-converter/exporter';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:hyperlink';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_NODE_NAME = 'link';

/**
 * Helper to create one-to-one attribute handlers.
 * @param {string} xmlName - The XML attribute name.
 * @param {string} sdName - The SuperDoc attribute name.
 * @returns {import('@translator').AttributesHandlerList} The attribute handler object.
 */
const _createAttributeHandler = (xmlName, sdName) => ({
  xmlName,
  sdName,
  encode: (attributes) => attributes[xmlName],
  decode: (attributes) => attributes[sdName],
});

/**
 * The attributes that can be mapped between OOXML and SuperDoc.
 * Note: These are specifically OOXML valid attributes for a given node.
 * @type {import('@translator').AttributesHandlerList[]}
 * @see {@link https://ecma-international.org/publications-and-standards/standards/ecma-376/} "Fundamentals And Markup Language Reference", page 1276
 */
const validXmlAttributes = [
  _createAttributeHandler('w:anchor', 'anchor'),
  _createAttributeHandler('w:docLocation', 'docLocation'),
  {
    xmlName: 'w:history',
    sdName: 'history',
    encode: (attributes) => attributes['w:history'] === '1' || attributes['w:history'] === 'true',
    decode: (attributes) => (attributes['history'] ? '1' : '0'),
  },
  _createAttributeHandler('w:tooltip', 'tooltip'),
  _createAttributeHandler('r:id', 'rId'),
  _createAttributeHandler('w:tgtFrame', 'target'),
];

/**
 * Encode a hyperlink element as a SuperDoc 'link' mark.
 * @param {import('@translator').SCEncoderConfig} [params]
 * @param {import('@translator').EncodedAttributes} [encodedAttrs] - The already encoded attributes
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params, encodedAttrs) => {
  const { nodes, docx, nodeListHandler } = params;
  const node = nodes[0];

  let href = _resolveHref(docx, encodedAttrs);

  // Add marks to the run nodes and process them
  const linkMark = { type: 'link', attrs: { ...encodedAttrs, href } };
  const runNodes = node.elements.filter((el) => el.name === 'w:r');
  runNodes.forEach((runNode) => {
    runNode.marks = [...(runNode.marks || []), linkMark];
  });

  const updatedNode = nodeListHandler.handler({
    ...params,
    nodes: runNodes,
    path: [...(params.path || []), node],
  });
  return updatedNode;
};

/**
 * Resolve the href from the relationship ID or anchor.
 * @param {Object} docx - The parsed DOCX object.
 * @param {import('@translator').EncodedAttributes} encodedAttrs - The encoded attributes containing rId or anchor.
 * @returns {string|undefined} The resolved href or undefined if not found.
 */
const _resolveHref = (docx, encodedAttrs) => {
  const rels = docx['word/_rels/document.xml.rels'];
  const relationships = rels.elements.find((el) => el.name === 'Relationships');
  const { elements } = relationships;

  const { rId, anchor } = encodedAttrs;
  let href;
  if (!rId && anchor) {
    href = `#${anchor}`;
  } else if (rId) {
    const rel = elements.find((el) => el.attributes['Id'] === rId) || {};
    const { attributes: relAttributes = {} } = rel;
    href = relAttributes['Target'];
  }
  return href;
};
