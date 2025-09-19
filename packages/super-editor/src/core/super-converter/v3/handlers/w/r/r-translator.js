// @ts-check
import { NodeTranslator } from '@translator';
import { exportSchemaToJson } from '../../../../exporter.js';
import {
  collectRunProperties,
  buildRunAttrs,
  applyRunMarks,
  deriveStyleMarks,
  mergeInlineMarkSets,
  mergeTextStyleAttrs,
  resolveRunElement,
  ensureRunPropertiesContainer,
  cloneMark,
} from './helpers/helpers.js';
import { splitRunProperties } from './helpers/split-run-properties.js';
import validXmlAttributes from './attributes/index.js';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:r';

/**
 * Represent OOXML <w:r> as a SuperDoc mark named 'run'.
 * Content within the run is annotated; no separate node is introduced.
 */
/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_KEY_NAME = 'run';

const encode = (params, encodedAttrs = {}) => {
  const { nodes = [], nodeListHandler } = params || {};
  const runNode = nodes[0];
  if (!runNode) return undefined;

  const elements = Array.isArray(runNode.elements) ? runNode.elements : [];
  const rPrNode = elements.find((child) => child?.name === 'w:rPr');
  const contentElements = rPrNode ? elements.filter((el) => el !== rPrNode) : elements;

  const { entries: runPropEntries, hadRPr, styleChangeMarks } = collectRunProperties(params, rPrNode);
  const { remainingProps, inlineMarks, textStyleAttrs, runStyleId } = splitRunProperties(runPropEntries, params?.docx);

  const styleMarks = deriveStyleMarks({
    docx: params?.docx,
    paragraphStyleId: params?.parentStyleId,
    runStyleId,
  });

  const mergedInlineMarks = mergeInlineMarkSets(styleMarks.inlineMarks, inlineMarks);
  let mergedTextStyleAttrs = mergeTextStyleAttrs(styleMarks.textStyleAttrs, textStyleAttrs);
  if (runStyleId) {
    mergedTextStyleAttrs = mergedTextStyleAttrs
      ? { ...mergedTextStyleAttrs, styleId: runStyleId }
      : { styleId: runStyleId };
  }

  const runAttrs = buildRunAttrs(encodedAttrs, hadRPr, remainingProps);
  let runLevelMarks = Array.isArray(runNode.marks) ? runNode.marks.map((mark) => cloneMark(mark)) : [];
  if (styleChangeMarks?.length) {
    runLevelMarks = [...runLevelMarks, ...styleChangeMarks.map((mark) => cloneMark(mark))];
  }

  const childParams = { ...params, nodes: contentElements };
  const content = nodeListHandler?.handler(childParams) || [];

  const contentWithRunMarks = content.map((child) => {
    if (!child || typeof child !== 'object') return child;
    const baseMarks = Array.isArray(child.marks) ? child.marks.map((mark) => cloneMark(mark)) : [];
    if (!runLevelMarks.length) return child;
    return { ...child, marks: [...baseMarks, ...runLevelMarks.map((mark) => cloneMark(mark))] };
  });

  const marked = contentWithRunMarks.map((child) =>
    applyRunMarks(child, runAttrs, mergedInlineMarks, mergedTextStyleAttrs),
  );

  const filtered = marked.filter(Boolean);
  if (!filtered.length) return [];
  if (filtered.length === 1) return filtered[0];
  return filtered;
};

const decode = (params, decodedAttrs = {}) => {
  const { node } = params || {};
  if (!node) return undefined;

  const marks = Array.isArray(node.marks) ? node.marks : [];
  const runMarkIndex = marks.findIndex((mark) => mark?.type === SD_KEY_NAME);
  const runMark = runMarkIndex >= 0 ? marks[runMarkIndex] : undefined;

  const strippedMarks = marks.filter((_, idx) => idx !== runMarkIndex);
  const exportNode = { ...node, marks: strippedMarks };
  const exportParams = { ...params, node: exportNode };
  if (!exportParams.editor) {
    exportParams.editor = { extensionService: { extensions: [] } };
  }
  const translated = exportSchemaToJson(exportParams);
  if (!translated) return undefined;

  const runElement = resolveRunElement(translated);
  if (!runElement) return translated;

  runElement.attributes = { ...(runElement.attributes || {}), ...decodedAttrs };

  const runProperties = Array.isArray(runMark?.attrs?.runProperties) ? runMark.attrs.runProperties : null;
  if (runProperties && runProperties.length) {
    const rPr = ensureRunPropertiesContainer(runElement);
    const existingNames = new Set((rPr.elements || []).map((el) => el.name));
    runProperties.forEach((entry) => {
      if (!entry || !entry.xmlName || entry.xmlName === 'w:b') return;
      if (existingNames.has(entry.xmlName)) return;
      rPr.elements.push({ name: entry.xmlName, attributes: { ...(entry.attributes || {}) } });
      existingNames.add(entry.xmlName);
    });
  }

  return translated;
};

/** @type {import('@translator').NodeTranslatorConfig} */
export const config = {
  xmlName: XML_NODE_NAME,
  sdNodeOrKeyName: SD_KEY_NAME,
  type: NodeTranslator.translatorTypes.NODE,
  encode,
  decode,
  attributes: validXmlAttributes,
};

/** @type {import('@translator').NodeTranslator} */
export const translator = NodeTranslator.from(config);
