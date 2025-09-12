// @ts-check
import { NodeTranslator } from '@translator';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:tr';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_NODE_NAME = 'tableRow';

/**
 * The attributes that can be mapped between OOXML and SuperDoc.
 * Note: These are specifically OOXML valid attributes for a given node.
 * @type {import('@translator').AttrConfig[]}
 * @see {@link https://ecma-international.org/publications-and-standards/standards/ecma-376/} "Fundamentals And Markup Language Reference", page 472
 */
const validXmlAttributes = ['w:rsidDel', 'w:rsidR', 'w:rsidRPr', 'w:rsidTr'].map(_createAttributeHandler);
