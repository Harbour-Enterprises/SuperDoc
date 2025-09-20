// @ts-check
import { NodeTranslator } from '@translator';
import { runPropertyTranslators, rawRunPropertyXmlNames } from './run-property-translators.js';

const RAW_CHILD_NAME_SET = new Set(rawRunPropertyXmlNames);
const KNOWN_CHILD_XML_NAMES = new Set([...Object.keys(runPropertyTranslators), ...RAW_CHILD_NAME_SET]);

/**
 * Normalize an attribute translator payload into the runProperties entry shape.
 * @param {any} candidate
 * @returns {{ xmlName: string, attributes: Record<string, any> } | null}
 */
const toRunPropertyEntry = (candidate) => {
  if (!candidate || candidate.type !== 'attr') return null;
  const xmlName = candidate.xmlName || candidate.name;
  if (!xmlName) return null;
  return {
    xmlName,
    attributes: { ...(candidate.attributes || {}) },
  };
};

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:rPr';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_KEY = 'runProperties';

/**
 * Encode the w:rPr element.
 * Aggregates all child attribute translators into a single runProperties attribute
 * that the run translator will attach directly to the run node.
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params) => {
  const { nodes } = params;
  const node = nodes?.[0] || {};
  const contents = Array.isArray(node.elements) ? node.elements : [];

  // Translate specific child elements with their dedicated handlers and ignore unsupported nodes
  const runPropsArray = contents.reduce((acc, child) => {
    if (!child || typeof child !== 'object') return acc;
    const xmlName = child.name;
    if (!KNOWN_CHILD_XML_NAMES.has(xmlName)) return acc;

    const translator = runPropertyTranslators[xmlName];
    let entry = null;
    if (translator) {
      const encoded = translator.encode({ ...params, nodes: [child] }) || null;
      entry = toRunPropertyEntry(encoded);
    } else if (RAW_CHILD_NAME_SET.has(xmlName)) {
      entry = toRunPropertyEntry({
        type: 'attr',
        xmlName,
        attributes: { ...(child.attributes || {}) },
      });
    }

    if (entry) acc.push(entry);
    return acc;
  }, /** @type {{ xmlName: string, attributes: Record<string, any> }[]} */ ([]));

  return {
    type: 'attr',
    xmlName: 'w:rPr',
    sdNodeOrKeyName: 'runProperties',
    attributes: runPropsArray,
  };
};

/** @type {import('@translator').NodeTranslatorConfig} */
const config = {
  xmlName: XML_NODE_NAME,
  sdNodeOrKeyName: SD_ATTR_KEY,
  type: NodeTranslator.translatorTypes.ATTRIBUTE,
  encode,
};

/**
 * The NodeTranslator instance for the w:rPr element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
