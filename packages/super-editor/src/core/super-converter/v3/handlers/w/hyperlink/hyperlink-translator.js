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
