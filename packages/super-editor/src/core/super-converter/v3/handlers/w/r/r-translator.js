// @ts-check
import { NodeTranslator } from '@translator';
import { translateChildNodes } from '../../../../v2/exporter/helpers/index.js';
import { generateRunPrTag, processNodeChildren, createTranslatedRun } from './helpers/index.js';
import validXmlAttributes from './attributes/index.js';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:r';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_NODE_NAME = 'run';

/**
 * Encode the w:r element.
 * @param {import('@translator').SCEncoderConfig} params
 * @param {import('@translator').EncodedAttributes} [encodedAttrs]
 * @returns {import('@translator').SCEncoderResult}
 */
function encode(params, encodedAttrs = {}) {
  const { nodeListHandler, nodes } = params;

  // Early return for empty nodes
  if (!nodes?.length) {
    return createTranslatedRun([], {}, encodedAttrs);
  }

  const node = nodes[0];
  const children = node.elements || [];

  // Process children and extract run properties
  const { runProperties, contentNodes } = processNodeChildren(children, params, nodeListHandler);

  // If marks were extracted (e.g., from w:rPrChange), attach them to all content nodes
  let finalContent = contentNodes;
  const marks = runProperties?.marks;
  const hasMarks = Array.isArray(marks) && marks.length > 0;
  if (hasMarks) {
    finalContent = contentNodes.map((cn) => {
      const existing = Array.isArray(cn.marks) ? cn.marks : [];
      return { ...cn, marks: [...existing, ...marks] };
    });
  }

  return createTranslatedRun(finalContent, runProperties, encodedAttrs);
}

/**
 * Decode the w:r element.
 * @param {import('@translator').SCDecoderConfig} params
 * @returns {import('@translator').SCDecoderResult}
 */
function decode(params) {
  const { node } = params || {};
  if (!node) return;

  const runElements = [];

  // Build run properties from node attrs
  const runPropsFromAttr = node?.attrs?.runProperties;
  let rPrTag = generateRunPrTag(runPropsFromAttr) || null;
  if (rPrTag) runElements.push(rPrTag);

  // Translate children to OOXML
  const translatedChildren = translateChildNodes(params) || [];

  // Flatten any nested runs (e.g., when a child like tab/lineBreak decodes to its own w:r)
  let parentHasRPr = !!rPrTag;
  translatedChildren.forEach((child) => {
    if (child && child.name === 'w:r' && Array.isArray(child.elements)) {
      child.elements.forEach((el) => {
        if (el?.name === 'w:rPr') {
          // Only keep a child rPr if parent doesn't already have one
          if (!parentHasRPr) {
            runElements.push(el);
            parentHasRPr = true;
          }
          return;
        }
        runElements.push(el);
      });
    } else if (child) {
      runElements.push(child);
    }
  });

  const translated = {
    name: 'w:r',
    elements: runElements,
  };

  return translated;
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
 * The NodeTranslator instance for the w:r element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
